import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import os from 'os';

interface Room {
  id: string;
  router: mediasoupTypes.Router;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
}

export class MediaServer {
  private worker: mediasoupTypes.Worker | null = null;
  private rooms: Map<string, Room> = new Map();

  // הגדרות ברירת מחדל ל-mediasoup
  private readonly config = {
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn' as mediasoupTypes.WorkerLogLevel,
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
      ] as mediasoupTypes.WorkerLogTag[],
    },
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ] as mediasoupTypes.RtpCodecCapability[],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || this.getLocalIp(),
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      maxIncomingBitrate: 1500000,
    },
  };

  // אתחול ה-MediaServer
  async initialize() {
    try {
      this.worker = await mediasoup.createWorker(this.config.worker);

      this.worker.on('died', () => {
        console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', this.worker?.pid);
        setTimeout(() => process.exit(1), 2000);
      });

      console.log('mediasoup worker created [pid:%d]', this.worker.pid);
    } catch (error) {
      console.error('Failed to create mediasoup worker:', error);
      throw error;
    }
  }

  // יצירת חדר חדש
  async createRoom(roomId: string): Promise<Room> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    try {
      const router = await this.worker.createRouter(this.config.router);
      const room: Room = {
        id: roomId,
        router,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      };

      this.rooms.set(roomId, room);
      return room;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  // יצירת transport חדש
  async createWebRtcTransport(roomId: string, clientId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    try {
      const transport = await room.router.createWebRtcTransport(this.config.webRtcTransport);

      // מעקב אחר סגירת ה-transport
      transport.on('dtlsstatechange', (dtlsState: mediasoupTypes.DtlsState) => {
        if (dtlsState === 'closed') {
          transport.close();
        }
      });

      transport.observer.on('close', () => {
        console.log('transport closed');
      });

      room.transports.set(transport.id, transport);

      return {
        transport,
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          sctpParameters: transport.sctpParameters,
        },
      };
    } catch (error) {
      console.error('Failed to create WebRTC transport:', error);
      throw error;
    }
  }

  // חיבור transport
  async connectTransport(roomId: string, clientId: string, dtlsParameters: mediasoupTypes.DtlsParameters) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    try {
      const transport = room.transports.get(clientId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      await transport.connect({ dtlsParameters });
    } catch (error) {
      console.error('Failed to connect transport:', error);
      throw error;
    }
  }

  // יצירת producer חדש
  async produce(
    roomId: string,
    clientId: string,
    transportId: string,
    kind: mediasoupTypes.MediaKind,
    rtpParameters: mediasoupTypes.RtpParameters
  ) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    try {
      const transport = room.transports.get(transportId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      const producer = await transport.produce({ kind, rtpParameters });

      producer.on('transportclose', () => {
        producer.close();
      });

      room.producers.set(producer.id, producer);

      return producer.id;
    } catch (error) {
      console.error('Failed to produce:', error);
      throw error;
    }
  }

  // יצירת consumer חדש
  async consume(
    roomId: string,
    clientId: string,
    producerId: string,
    rtpCapabilities: mediasoupTypes.RtpCapabilities
  ) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    try {
      const producer = room.producers.get(producerId);
      if (!producer) {
        throw new Error('Producer not found');
      }

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error('Cannot consume');
      }

      const transport = room.transports.get(clientId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // צריך להפעיל ידנית
      });

      consumer.on('transportclose', () => {
        consumer.close();
      });

      consumer.on('producerclose', () => {
        consumer.close();
      });

      room.consumers.set(consumer.id, consumer);

      return {
        consumer,
        params: {
          producerId: producer.id,
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          producerPaused: consumer.producerPaused,
        },
      };
    } catch (error) {
      console.error('Failed to consume:', error);
      throw error;
    }
  }

  // ניקוי משאבים
  async cleanup() {
    try {
      for (const room of this.rooms.values()) {
        // סגירת כל ה-consumers
        for (const consumer of room.consumers.values()) {
          consumer.close();
        }
        room.consumers.clear();

        // סגירת כל ה-producers
        for (const producer of room.producers.values()) {
          producer.close();
        }
        room.producers.clear();

        // סגירת כל ה-transports
        for (const transport of room.transports.values()) {
          transport.close();
        }
        room.transports.clear();

        // סגירת ה-router
        room.router.close();
      }

      this.rooms.clear();

      // סגירת ה-worker
      if (this.worker) {
        await this.worker.close();
        this.worker = null;
      }
    } catch (error) {
      console.error('Error cleaning up MediaServer:', error);
      throw error;
    }
  }

  // קבלת כתובת ה-IP המקומית
  private getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          continue;
        }
        return iface.address;
      }
    }
    return '127.0.0.1';
  }
} 