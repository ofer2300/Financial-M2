import * as mediasoupClient from 'mediasoup-client';
import { Device } from 'mediasoup-client';
import { Transport } from 'mediasoup-client/lib/Transport';
import { Producer } from 'mediasoup-client/lib/Producer';
import { Consumer } from 'mediasoup-client/lib/Consumer';

// קבועים לניהול ביצועים
const QUALITY_LEVELS = {
  HIGH: {
    maxBitrate: 2_500_000, // 2.5 Mbps
    scaleResolutionDownBy: 1,
    maxFramerate: 30
  },
  MEDIUM: {
    maxBitrate: 1_000_000, // 1 Mbps
    scaleResolutionDownBy: 2,
    maxFramerate: 24
  },
  LOW: {
    maxBitrate: 500_000, // 500 Kbps
    scaleResolutionDownBy: 4,
    maxFramerate: 15
  }
};

const PERFORMANCE_THRESHOLDS = {
  PACKET_LOSS_THRESHOLD: 0.1, // 10% packet loss
  BITRATE_THRESHOLD: 500_000, // 500 Kbps
  LATENCY_THRESHOLD: 150, // 150ms
};

interface StatsReport {
  type: string;
  bytesSent?: number;
  packetsSent?: number;
  packetsLost?: number;
  roundTripTime?: number;
}

export interface WebRTCConfig {
  routerRtpCapabilities: any;
  iceServers: RTCIceServer[];
  producerTransportOptions: any;
  consumerTransportOptions: any;
}

export interface StreamQuality {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

export class WebRTCError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'WebRTCError';
  }
}

export class WebRTCManager {
  private device: Device;
  private producerTransport: Transport | null = null;
  private consumerTransport: Transport | null = null;
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private currentQualityLevel: keyof typeof QUALITY_LEVELS = 'HIGH';
  private lastBitrateCheck = 0;
  private lastPacketLoss = 0;

  constructor(private config: WebRTCConfig) {
    this.device = new Device();
  }

  async initialize(): Promise<void> {
    try {
      await this.device.load({ routerRtpCapabilities: this.config.routerRtpCapabilities });
      console.log('Device loaded successfully');
      this.startPerformanceMonitoring();
    } catch (error) {
      console.error('Failed to load device:', error);
      throw new WebRTCError('Failed to load device', error);
    }
  }

  private startPerformanceMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = setInterval(async () => {
      try {
        await this.monitorPerformance();
      } catch (error) {
        console.error('Error monitoring performance:', error);
      }
    }, 5000); // בדיקה כל 5 שניות
  }

  private async monitorPerformance() {
    for (const [producerId, producer] of this.producers) {
      try {
        const rawStats = await producer.getStats();
        const stats: StatsReport[] = [];
        
        // המרת הסטטיסטיקות למבנה הנתונים שלנו
        rawStats.forEach((value) => {
          stats.push({
            type: value.type,
            bytesSent: value.bytesSent,
            packetsSent: value.packetsSent,
            packetsLost: value.packetsLost,
            roundTripTime: value.roundTripTime,
          });
        });

        const currentStats = this.analyzeStats(stats);
        
        if (this.shouldAdjustQuality(currentStats)) {
          await this.adjustStreamQuality(producer);
        }

        // שמירת הנתונים לבדיקה הבאה
        this.lastBitrateCheck = currentStats.bitrate;
        this.lastPacketLoss = currentStats.packetLoss;
      } catch (error) {
        console.error(`Error monitoring producer ${producerId}:`, error);
      }
    }
  }

  private analyzeStats(stats: StatsReport[]): { bitrate: number; packetLoss: number; latency: number } {
    let totalBytes = 0;
    let totalPackets = 0;
    let lostPackets = 0;
    let latency = 0;

    for (const stat of stats) {
      if (stat.type === 'outbound-rtp') {
        totalBytes += stat.bytesSent || 0;
        totalPackets += stat.packetsSent || 0;
        lostPackets += stat.packetsLost || 0;
      }
      if (stat.type === 'remote-inbound-rtp') {
        latency = stat.roundTripTime || 0;
      }
    }

    const packetLoss = totalPackets > 0 ? lostPackets / totalPackets : 0;
    const bitrate = (totalBytes * 8) / 1000; // kbps

    return { bitrate, packetLoss, latency };
  }

  private shouldAdjustQuality({ bitrate, packetLoss, latency }: { 
    bitrate: number; 
    packetLoss: number; 
    latency: number 
  }): boolean {
    return (
      packetLoss > PERFORMANCE_THRESHOLDS.PACKET_LOSS_THRESHOLD ||
      bitrate < PERFORMANCE_THRESHOLDS.BITRATE_THRESHOLD ||
      latency > PERFORMANCE_THRESHOLDS.LATENCY_THRESHOLD
    );
  }

  private async adjustStreamQuality(producer: Producer) {
    const currentLevel = QUALITY_LEVELS[this.currentQualityLevel];
    let newLevel: keyof typeof QUALITY_LEVELS;

    if (this.lastPacketLoss > PERFORMANCE_THRESHOLDS.PACKET_LOSS_THRESHOLD * 2) {
      newLevel = 'LOW';
    } else if (this.lastBitrateCheck < PERFORMANCE_THRESHOLDS.BITRATE_THRESHOLD) {
      newLevel = this.currentQualityLevel === 'HIGH' ? 'MEDIUM' : 'LOW';
    } else {
      newLevel = this.currentQualityLevel === 'LOW' ? 'MEDIUM' : 'HIGH';
    }

    if (newLevel !== this.currentQualityLevel) {
      const qualitySettings = QUALITY_LEVELS[newLevel];
      
      try {
        await producer.setMaxSpatialLayer(qualitySettings.scaleResolutionDownBy);
        await producer.setRtpEncodingParameters({
          maxBitrate: qualitySettings.maxBitrate,
          maxFramerate: qualitySettings.maxFramerate
        });
        
        this.currentQualityLevel = newLevel;
        console.log(`Quality adjusted to ${newLevel}`);
      } catch (error) {
        console.error('Failed to adjust stream quality:', error);
      }
    }
  }

  async createProducerTransport(): Promise<void> {
    try {
      this.producerTransport = await this.device.createSendTransport(
        this.config.producerTransportOptions
      );

      this.producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          // כאן יש להוסיף את הלוגיקה לחיבור מול השרת
          callback();
        } catch (error) {
          errback(new WebRTCError('Failed to connect producer transport', error));
        }
      });

      this.producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          // כאן יש להוסיף את הלוגיקה ליצירת producer בשרת
          const { id } = await this.requestProducerId(kind, rtpParameters);
          callback({ id });
        } catch (error) {
          errback(new WebRTCError('Failed to produce', error));
        }
      });

      console.log('Producer transport created successfully');
    } catch (error) {
      console.error('Failed to create producer transport:', error);
      throw new WebRTCError('Failed to create producer transport', error);
    }
  }

  async createConsumerTransport(): Promise<void> {
    try {
      this.consumerTransport = await this.device.createRecvTransport(
        this.config.consumerTransportOptions
      );

      this.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          // כאן יש להוסיף את הלוגיקה לחיבור מול השרת
          callback();
        } catch (error) {
          errback(new WebRTCError('Failed to connect consumer transport', error));
        }
      });

      console.log('Consumer transport created successfully');
    } catch (error) {
      console.error('Failed to create consumer transport:', error);
      throw new WebRTCError('Failed to create consumer transport', error);
    }
  }

  async produce(track: MediaStreamTrack): Promise<string> {
    if (!this.producerTransport) {
      throw new WebRTCError('Producer transport not created');
    }

    try {
      const producer = await this.producerTransport.produce({ 
        track,
        encodings: [
          { ...QUALITY_LEVELS.HIGH, priority: 'high' },
          { ...QUALITY_LEVELS.MEDIUM, priority: 'medium' },
          { ...QUALITY_LEVELS.LOW, priority: 'low' }
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000
        }
      });

      this.producers.set(producer.id, producer);

      producer.on('trackended', () => {
        console.log('Track ended');
        this.closeProducer(producer.id);
      });

      producer.on('transportclose', () => {
        console.log('Transport closed');
        this.producers.delete(producer.id);
      });

      return producer.id;
    } catch (error) {
      console.error('Failed to produce:', error);
      throw new WebRTCError('Failed to produce', error);
    }
  }

  async consume(producerId: string, remoteRtpParameters: any): Promise<MediaStreamTrack> {
    if (!this.consumerTransport) {
      throw new WebRTCError('Consumer transport not created');
    }

    try {
      const consumer = await this.consumerTransport.consume({
        id: producerId,
        producerId,
        kind: 'video',
        rtpParameters: remoteRtpParameters,
      });

      this.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        console.log('Transport closed');
        this.consumers.delete(consumer.id);
      });

      return consumer.track;
    } catch (error) {
      console.error('Failed to consume:', error);
      throw new WebRTCError('Failed to consume', error);
    }
  }

  closeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
    }
  }

  closeConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);
    }
  }

  close(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.producers.forEach(producer => producer.close());
    this.consumers.forEach(consumer => consumer.close());
    if (this.producerTransport) this.producerTransport.close();
    if (this.consumerTransport) this.consumerTransport.close();
  }

  private async requestProducerId(kind: string, rtpParameters: any): Promise<{ id: string }> {
    // כאן יש להוסיף את הלוגיקה לבקשת ID מהשרת
    return { id: `producer-${Date.now()}` };
  }
} 