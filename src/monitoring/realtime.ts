import { MetricsLogger } from './types';

class RealTimeMonitoring {
  private static instance: RealTimeMonitoring;
  private metricsBuffer: any[] = [];
  private readonly FLUSH_INTERVAL = 1000; // 1 second

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): RealTimeMonitoring {
    if (!RealTimeMonitoring.instance) {
      RealTimeMonitoring.instance = new RealTimeMonitoring();
    }
    return RealTimeMonitoring.instance;
  }

  private startMonitoring() {
    setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  public logMetric(metric: MetricsLogger) {
    this.metricsBuffer.push({
      ...metric,
      timestamp: Date.now(),
      priority: 'high'
    });
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    try {
      // כאן תוכל להוסיף את השירות שלך לשמירת המטריקות
      console.log('Flushing metrics:', this.metricsBuffer);
      this.metricsBuffer = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  public getMetrics() {
    return {
      bufferSize: this.metricsBuffer.length,
      lastFlush: new Date().toISOString(),
    };
  }
}

export const monitor = RealTimeMonitoring.getInstance(); 