import { MetricsClient } from '@opentelemetry/metrics';
import { AIAnalytics } from '@/lib/ai/analytics';

export const monitoringConfig = {
  realtime: {
    enabled: true,
    interval: 5000, // 5 seconds
    metrics: ['cpu', 'memory', 'network', 'errors', 'response_time']
  },

  ai: {
    enabled: true,
    anomalyDetection: {
      sensitivity: 'high',
      learningRate: 0.01,
      threshold: 0.95
    },
    predictiveAnalysis: {
      enabled: true,
      forecastWindow: '1h'
    }
  },

  alerts: {
    channels: ['email', 'slack', 'sms'],
    thresholds: {
      critical: {
        responseTime: 1000, // ms
        errorRate: 0.01, // 1%
        cpuUsage: 80, // %
        memoryUsage: 85 // %
      },
      warning: {
        responseTime: 500,
        errorRate: 0.005,
        cpuUsage: 70,
        memoryUsage: 75
      }
    }
  },

  reporting: {
    automated: true,
    schedule: '0 0 * * *', // daily
    retention: 90, // days
    format: ['pdf', 'json', 'csv']
  }
};

export const metricsCollector = {
  collect: async () => {
    // איסוף מטריקות בזמן אמת
    const metrics = await MetricsClient.collect();
    
    // ניתוח AI
    const analysis = await AIAnalytics.analyze(metrics);
    
    return {
      metrics,
      analysis,
      timestamp: new Date()
    };
  }
}; 