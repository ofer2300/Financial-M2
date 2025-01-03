import { createClient } from '@supabase/supabase-js';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, any>;
  timestamp: string;
  user_id?: string;
  ip_address?: string;
  request_path?: string;
}

export class Logger {
  private supabase;
  private static instance: Logger;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async log(entry: LogEntry) {
    try {
      const { error } = await this.supabase
        .from('system_logs')
        .insert([entry]);

      if (error) throw error;

      // שמירת לוגים קריטיים גם בקובץ מקומי
      if (entry.level === 'error') {
        console.error(JSON.stringify(entry, null, 2));
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  public async info(message: string, metadata: Record<string, any> = {}) {
    await this.log({
      level: 'info',
      message,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  public async warn(message: string, metadata: Record<string, any> = {}) {
    await this.log({
      level: 'warn',
      message,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  public async error(message: string, metadata: Record<string, any> = {}) {
    await this.log({
      level: 'error',
      message,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  public async logRequest(
    path: string,
    userId?: string,
    ipAddress?: string,
    metadata: Record<string, any> = {}
  ) {
    await this.log({
      level: 'info',
      message: `HTTP Request: ${path}`,
      metadata,
      timestamp: new Date().toISOString(),
      user_id: userId,
      ip_address: ipAddress,
      request_path: path
    });
  }

  public async logSecurityEvent(
    event: string,
    userId?: string,
    metadata: Record<string, any> = {}
  ) {
    await this.log({
      level: 'warn',
      message: `Security Event: ${event}`,
      metadata,
      timestamp: new Date().toISOString(),
      user_id: userId
    });
  }
} 