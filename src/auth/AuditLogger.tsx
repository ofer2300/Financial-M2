import { createClient } from '@supabase/supabase-js';

interface AuditEvent {
  id: string;
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  metadata: {
    ip: string;
    userAgent: string;
    timestamp: string;
    sessionId: string;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'success' | 'failure';
  createdAt: string;
}

interface AuditLoggerConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionDays: number;
  batchSize: number;
  excludedActions?: string[];
  excludedResources?: string[];
  sensitiveFields?: string[];
  customMetadata?: Record<string, any>;
}

const defaultConfig: AuditLoggerConfig = {
  enabled: true,
  logLevel: 'info',
  retentionDays: 365,
  batchSize: 100,
  excludedActions: [],
  excludedResources: [],
  sensitiveFields: ['password', 'token', 'secret', 'key'],
  customMetadata: {},
};

export class AuditLogger {
  private config: AuditLoggerConfig;
  private supabase: any;
  private eventQueue: AuditEvent[] = [];
  private isProcessing: boolean = false;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<AuditLoggerConfig> = {}
  ) {
    this.config = {
      ...defaultConfig,
      ...config,
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // הפעלת מנגנון ניקוי אוטומטי
    this.setupRetentionCleaner();
  }

  async log(
    action: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any> = {},
    severity: AuditEvent['severity'] = 'info',
    status: AuditEvent['status'] = 'success'
  ): Promise<void> {
    if (!this.config.enabled) return;

    if (
      this.config.excludedActions?.includes(action) ||
      this.config.excludedResources?.includes(resourceType)
    ) {
      return;
    }

    const event: Omit<AuditEvent, 'id' | 'createdAt'> = {
      action,
      userId,
      resourceType,
      resourceId,
      details: this.sanitizeDetails(details),
      metadata: await this.collectMetadata(),
      severity,
      status,
    };

    this.eventQueue.push(event as AuditEvent);

    if (this.eventQueue.length >= this.config.batchSize) {
      await this.processQueue();
    }
  }

  async logBatch(events: Omit<AuditEvent, 'id' | 'createdAt'>[]): Promise<void> {
    if (!this.config.enabled) return;

    const sanitizedEvents = events
      .filter(event => 
        !this.config.excludedActions?.includes(event.action) &&
        !this.config.excludedResources?.includes(event.resourceType)
      )
      .map(event => ({
        ...event,
        details: this.sanitizeDetails(event.details),
        metadata: {
          ...event.metadata,
          ...this.config.customMetadata,
        },
      }));

    if (sanitizedEvents.length === 0) return;

    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert(sanitizedEvents.map(event => ({
          ...event,
          createdAt: new Date().toISOString(),
        })));

      if (error) throw error;
    } catch (error) {
      console.error('Error logging audit events batch:', error);
      throw error;
    }
  }

  async search(
    filters: {
      action?: string;
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      severity?: AuditEvent['severity'];
      status?: AuditEvent['status'];
      startDate?: string;
      endDate?: string;
    },
    pagination: {
      page: number;
      pageSize: number;
    } = { page: 1, pageSize: 50 }
  ): Promise<{ data: AuditEvent[]; total: number }> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.userId) {
      query = query.eq('userId', filters.userId);
    }

    if (filters.resourceType) {
      query = query.eq('resourceType', filters.resourceType);
    }

    if (filters.resourceId) {
      query = query.eq('resourceId', filters.resourceId);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.startDate) {
      query = query.gte('createdAt', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('createdAt', filters.endDate);
    }

    const { data, error, count } = await query
      .order('createdAt', { ascending: false })
      .range(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize - 1
      );

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
    };
  }

  async getStatistics(
    startDate: string,
    endDate: string
  ): Promise<{
    totalEvents: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .gte('createdAt', startDate)
      .lte('createdAt', endDate);

    if (error) throw error;

    const stats = {
      totalEvents: data.length,
      byAction: {},
      byResource: {},
      bySeverity: {},
      byStatus: {},
    };

    data.forEach((event: AuditEvent) => {
      // סטטיסטיקה לפי פעולה
      stats.byAction[event.action] = (stats.byAction[event.action] || 0) + 1;

      // סטטיסטיקה לפי משאב
      stats.byResource[event.resourceType] = (stats.byResource[event.resourceType] || 0) + 1;

      // סטטיסטיקה לפי חומרה
      stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;

      // סטטיסטיקה לפי סטטוס
      stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;
    });

    return stats;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    try {
      this.isProcessing = true;
      const events = this.eventQueue.splice(0, this.config.batchSize);
      await this.logBatch(events);
    } finally {
      this.isProcessing = false;
    }

    // בדיקה אם נשארו אירועים בתור
    if (this.eventQueue.length > 0) {
      await this.processQueue();
    }
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };

    const sanitizeValue = (value: any): any => {
      if (typeof value === 'object' && value !== null) {
        return this.sanitizeDetails(value);
      }
      return value;
    };

    for (const [key, value] of Object.entries(sanitized)) {
      if (this.config.sensitiveFields?.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(sanitizeValue);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      }
    }

    return sanitized;
  }

  private async collectMetadata(): Promise<AuditEvent['metadata']> {
    const clientIP = await fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => 'unknown');

    return {
      ip: clientIP,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString(),
      sessionId: 'session-' + Math.random().toString(36).substr(2, 9),
      ...this.config.customMetadata,
    };
  }

  private setupRetentionCleaner(): void {
    const cleanOldRecords = async () => {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.config.retentionDays);

      try {
        const { error } = await this.supabase
          .from('audit_logs')
          .delete()
          .lt('createdAt', retentionDate.toISOString());

        if (error) throw error;
      } catch (error) {
        console.error('Error cleaning old audit logs:', error);
      }
    };

    // הפעלת ניקוי אוטומטי כל 24 שעות
    setInterval(cleanOldRecords, 24 * 60 * 60 * 1000);
  }
} 