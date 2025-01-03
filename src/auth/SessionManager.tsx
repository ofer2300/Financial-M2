import { createClient } from '@supabase/supabase-js';

interface Session {
  id: string;
  userId: string;
  token: string;
  device: {
    type: string;
    name: string;
    os: string;
    browser: string;
    ip: string;
  };
  metadata: Record<string, any>;
  expiresAt: string;
  createdAt: string;
  lastActiveAt: string;
}

interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeout: number; // בדקות
  extendOnActivity: boolean;
  rememberMeMaxAge: number; // בימים
  deviceTracking: boolean;
  geoTracking: boolean;
  activityTracking: boolean;
}

const defaultConfig: SessionConfig = {
  maxConcurrentSessions: 5,
  sessionTimeout: 60,
  extendOnActivity: true,
  rememberMeMaxAge: 30,
  deviceTracking: true,
  geoTracking: true,
  activityTracking: true,
};

export class SessionManager {
  private config: SessionConfig;
  private supabase: any;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<SessionConfig> = {}
  ) {
    this.config = {
      ...defaultConfig,
      ...config,
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createSession(
    userId: string,
    rememberMe: boolean = false
  ): Promise<Session> {
    try {
      // בדיקת מספר הפעלות מקבילות
      const activeSessions = await this.getActiveSessions(userId);
      if (activeSessions.length >= this.config.maxConcurrentSessions) {
        // סגירת ההפעלה הישנה ביותר
        await this.terminateOldestSession(userId);
      }

      // יצירת הפעלה חדשה
      const deviceInfo = await this.collectDeviceInfo();
      const expiresAt = this.calculateExpirationTime(rememberMe);

      const session: Omit<Session, 'id' | 'createdAt' | 'lastActiveAt'> = {
        userId,
        token: this.generateSessionToken(),
        device: deviceInfo,
        metadata: {},
        expiresAt,
      };

      const { data, error } = await this.supabase
        .from('sessions')
        .insert({
          ...session,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const { data: session, error } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!session) return false;

      // בדיקת תפוגה
      if (new Date(session.expiresAt) < new Date()) {
        await this.terminateSession(sessionId);
        return false;
      }

      // הארכת תוקף אם מוגדר
      if (this.config.extendOnActivity) {
        await this.extendSession(sessionId);
      }

      // עדכון זמן פעילות אחרונה
      if (this.config.activityTracking) {
        await this.updateLastActivity(sessionId);
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error terminating session:', error);
      throw error;
    }
  }

  async terminateAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    try {
      let query = this.supabase
        .from('sessions')
        .delete()
        .eq('userId', userId);

      if (exceptSessionId) {
        query = query.neq('id', exceptSessionId);
      }

      const { error } = await query;
      if (error) throw error;
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      throw error;
    }
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('userId', userId)
        .gt('expiresAt', new Date().toISOString())
        .order('lastActiveAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }

  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sessions')
        .update({
          metadata: metadata,
          lastActiveAt: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating session metadata:', error);
      throw error;
    }
  }

  private async terminateOldestSession(userId: string): Promise<void> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('userId', userId)
        .order('lastActiveAt', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (sessions && sessions.length > 0) {
        await this.terminateSession(sessions[0].id);
      }
    } catch (error) {
      console.error('Error terminating oldest session:', error);
      throw error;
    }
  }

  private async extendSession(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sessions')
        .update({
          expiresAt: this.calculateExpirationTime(false),
          lastActiveAt: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error extending session:', error);
      throw error;
    }
  }

  private async updateLastActivity(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sessions')
        .update({
          lastActiveAt: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating last activity:', error);
      throw error;
    }
  }

  private calculateExpirationTime(rememberMe: boolean): string {
    const now = new Date();
    if (rememberMe) {
      now.setDate(now.getDate() + this.config.rememberMeMaxAge);
    } else {
      now.setMinutes(now.getMinutes() + this.config.sessionTimeout);
    }
    return now.toISOString();
  }

  private generateSessionToken(): string {
    const length = 32;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      token += charset[randomIndex];
    }
    return token;
  }

  private async collectDeviceInfo(): Promise<Session['device']> {
    if (!this.config.deviceTracking) {
      return {
        type: 'unknown',
        name: 'unknown',
        os: 'unknown',
        browser: 'unknown',
        ip: 'unknown',
      };
    }

    try {
      // קבלת מידע על המכשיר
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown';
      const deviceInfo = {
        type: this.detectDeviceType(userAgent),
        name: this.detectDeviceName(userAgent),
        os: this.detectOS(userAgent),
        browser: this.detectBrowser(userAgent),
        ip: 'unknown',
      };

      // קבלת כתובת IP
      if (this.config.geoTracking) {
        deviceInfo.ip = await fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => data.ip)
          .catch(() => 'unknown');
      }

      return deviceInfo;
    } catch (error) {
      console.error('Error collecting device info:', error);
      return {
        type: 'unknown',
        name: 'unknown',
        os: 'unknown',
        browser: 'unknown',
        ip: 'unknown',
      };
    }
  }

  private detectDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private detectDeviceName(userAgent: string): string {
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android Device';
    if (/Windows Phone/i.test(userAgent)) return 'Windows Phone';
    if (/Mac/i.test(userAgent)) return 'Mac';
    if (/Windows/i.test(userAgent)) return 'Windows PC';
    if (/Linux/i.test(userAgent)) return 'Linux PC';
    return 'Unknown Device';
  }

  private detectOS(userAgent: string): string {
    if (/Windows NT 10/i.test(userAgent)) return 'Windows 10';
    if (/Windows NT 6.3/i.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6.2/i.test(userAgent)) return 'Windows 8';
    if (/Windows NT 6.1/i.test(userAgent)) return 'Windows 7';
    if (/Mac OS X/i.test(userAgent)) return 'macOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iOS/i.test(userAgent)) return 'iOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Unknown OS';
  }

  private detectBrowser(userAgent: string): string {
    if (/Chrome/i.test(userAgent)) return 'Chrome';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Safari/i.test(userAgent)) return 'Safari';
    if (/Edge/i.test(userAgent)) return 'Edge';
    if (/Opera|OPR/i.test(userAgent)) return 'Opera';
    if (/MSIE|Trident/i.test(userAgent)) return 'Internet Explorer';
    return 'Unknown Browser';
  }
} 