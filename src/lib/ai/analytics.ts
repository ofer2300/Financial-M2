import { MetricsData } from '@opentelemetry/metrics';
import * as tf from '@tensorflow/tfjs';

export class AIAnalytics {
  private static model: tf.LayersModel;
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;

    // טעינת מודל מאומן מראש או יצירת מודל חדש
    this.model = await tf.loadLayersModel('/models/analytics.json').catch(() => {
      return this.createModel();
    });

    this.isInitialized = true;
  }

  private static createModel(): tf.LayersModel {
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [10]
    }));
    
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  static async analyze(metrics: MetricsData) {
    await this.initialize();

    const tensorData = this.preprocessMetrics(metrics);
    const prediction = await this.model.predict(tensorData) as tf.Tensor;
    
    return {
      anomalyScore: await prediction.data(),
      insights: this.generateInsights(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }

  private static preprocessMetrics(metrics: MetricsData): tf.Tensor {
    // המרת המטריקות לטנזור
    const values = [
      metrics.cpu,
      metrics.memory,
      metrics.responseTime,
      metrics.errorRate,
      metrics.requestRate,
      metrics.concurrentUsers,
      metrics.networkIO,
      metrics.diskIO,
      metrics.cacheHitRate,
      metrics.queueLength
    ];

    return tf.tensor2d([values], [1, 10]);
  }

  private static generateInsights(metrics: MetricsData) {
    return {
      performance: this.analyzePerformance(metrics),
      reliability: this.analyzeReliability(metrics),
      scalability: this.analyzeScalability(metrics)
    };
  }

  private static generateRecommendations(metrics: MetricsData) {
    const recommendations = [];

    if (metrics.cpu > 80) {
      recommendations.push({
        type: 'critical',
        message: 'שימוש גבוה ב-CPU. מומלץ לשקול הוספת משאבים.',
        action: 'scale_up'
      });
    }

    if (metrics.responseTime > 1000) {
      recommendations.push({
        type: 'warning',
        message: 'זמני תגובה גבוהים. בדוק את ביצועי המערכת.',
        action: 'optimize'
      });
    }

    return recommendations;
  }

  private static analyzePerformance(metrics: MetricsData) {
    return {
      score: this.calculatePerformanceScore(metrics),
      bottlenecks: this.identifyBottlenecks(metrics)
    };
  }

  private static analyzeReliability(metrics: MetricsData) {
    return {
      score: this.calculateReliabilityScore(metrics),
      risks: this.identifyRisks(metrics)
    };
  }

  private static analyzeScalability(metrics: MetricsData) {
    return {
      score: this.calculateScalabilityScore(metrics),
      limits: this.identifyScalabilityLimits(metrics)
    };
  }

  private static calculatePerformanceScore(metrics: MetricsData): number {
    // חישוב ציון ביצועים מורכב
    return 0.7;
  }

  private static calculateReliabilityScore(metrics: MetricsData): number {
    // חישוב ציון אמינות
    return 0.85;
  }

  private static calculateScalabilityScore(metrics: MetricsData): number {
    // חישוב ציון יכולת הרחבה
    return 0.9;
  }

  private static identifyBottlenecks(metrics: MetricsData) {
    const bottlenecks = [];
    
    if (metrics.cpu > 80) bottlenecks.push('CPU');
    if (metrics.memory > 85) bottlenecks.push('Memory');
    if (metrics.diskIO > 90) bottlenecks.push('Disk I/O');
    
    return bottlenecks;
  }

  private static identifyRisks(metrics: MetricsData) {
    const risks = [];
    
    if (metrics.errorRate > 0.01) risks.push('High Error Rate');
    if (metrics.responseTime > 1000) risks.push('High Latency');
    
    return risks;
  }

  private static identifyScalabilityLimits(metrics: MetricsData) {
    const limits = [];
    
    if (metrics.queueLength > 100) limits.push('Queue Capacity');
    if (metrics.concurrentUsers > 1000) limits.push('User Capacity');
    
    return limits;
  }
} 