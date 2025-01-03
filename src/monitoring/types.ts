export interface MetricsLogger {
  name: string;
  value: number | string;
  type: 'counter' | 'gauge' | 'histogram';
  labels?: Record<string, string>;
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  metrics: string[];
}

export interface DeploymentConfig {
  mode: 'rolling' | 'blue-green';
  timeout: number;
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
    successThreshold: number;
  };
} 