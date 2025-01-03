import { createClient } from '@supabase/supabase-js';

interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventCommonPasswords: boolean;
    maxAge: number; // בימים
  };
  sessionPolicy: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // בדקות
    requireMFA: boolean;
    rememberMeMaxAge: number; // בימים
  };
  loginPolicy: {
    maxLoginAttempts: number;
    lockoutDuration: number; // בדקות
    requireCaptcha: boolean;
    allowedIPs: string[];
    blockedIPs: string[];
  };
  auditPolicy: {
    enableAuditLog: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    retentionPeriod: number; // בימים
    loggedActions: string[];
  };
}

export const defaultSecurityConfig: SecurityConfig = {
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    maxAge: 90,
  },
  sessionPolicy: {
    maxConcurrentSessions: 3,
    sessionTimeout: 60,
    requireMFA: true,
    rememberMeMaxAge: 30,
  },
  loginPolicy: {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    requireCaptcha: true,
    allowedIPs: [],
    blockedIPs: [],
  },
  auditPolicy: {
    enableAuditLog: true,
    logLevel: 'info',
    retentionPeriod: 365,
    loggedActions: [
      'login',
      'logout',
      'password_change',
      'profile_update',
      'role_change',
      'permission_change',
    ],
  },
};

export class SecurityManager {
  private config: SecurityConfig;
  private supabase: any;

  constructor(
    config: Partial<SecurityConfig> = {},
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.config = {
      ...defaultSecurityConfig,
      ...config,
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // בדיקת מדיניות סיסמה
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { passwordPolicy } = this.config;

    if (password.length < passwordPolicy.minLength) {
      errors.push(`הסיסמה חייבת להכיל לפחות ${passwordPolicy.minLength} תווים`);
    }

    if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות אות גדולה אחת');
    }

    if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות אות קטנה אחת');
    }

    if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות ספרה אחת');
    }

    if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות תו מיוחד אחד');
    }

    if (passwordPolicy.preventCommonPasswords) {
      // בדיקה מול רשימת סיסמאות נפוצות
      const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('הסיסמה נמצאת ברשימת הסיסמאות הנפוצות ואינה מאובטחת מספיק');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ניהול מדיניות הפעלה
  async manageSession(userId: string): Promise<void> {
    const { sessionPolicy } = this.config;

    // בדיקת מספר הפעלות מקבילות
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length >= sessionPolicy.maxConcurrentSessions) {
      // סגירת ההפעלה הישנה ביותר
      await this.terminateOldestSession(userId);
    }

    // הגדרת זמן תפוגה להפעלה
    await this.supabase.auth.updateUser({
      data: {
        session_timeout: sessionPolicy.sessionTimeout,
      },
    });
  }

  // ניהול ניסיונות התחברות
  async handleLoginAttempt(userId: string, ip: string): Promise<boolean> {
    const { loginPolicy } = this.config;

    // בדיקת כתובת IP
    if (loginPolicy.blockedIPs.includes(ip)) {
      throw new Error('כתובת ה-IP שלך חסומה');
    }

    if (loginPolicy.allowedIPs.length > 0 && !loginPolicy.allowedIPs.includes(ip)) {
      throw new Error('כתובת ה-IP שלך אינה מורשית');
    }

    // בדיקת ניסיונות התחברות כושלים
    const failedAttempts = await this.getFailedLoginAttempts(userId);
    if (failedAttempts >= loginPolicy.maxLoginAttempts) {
      // נעילת החשבון
      await this.lockAccount(userId, loginPolicy.lockoutDuration);
      throw new Error(`החשבון ננעל למשך ${loginPolicy.lockoutDuration} דקות`);
    }

    return true;
  }

  // רישום פעולות ביקורת
  async logAuditEvent(
    action: string,
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    const { auditPolicy } = this.config;

    if (!auditPolicy.enableAuditLog || !auditPolicy.loggedActions.includes(action)) {
      return;
    }

    const auditEvent = {
      action,
      userId,
      timestamp: new Date().toISOString(),
      details,
      logLevel: auditPolicy.logLevel,
    };

    await this.supabase
      .from('audit_logs')
      .insert(auditEvent);

    // ניקוי רשומות ישנות
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - auditPolicy.retentionPeriod);

    await this.supabase
      .from('audit_logs')
      .delete()
      .lt('timestamp', retentionDate.toISOString());
  }

  // פונקציות עזר פרטיות
  private async getActiveSessions(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    return data || [];
  }

  private async terminateOldestSession(userId: string): Promise<void> {
    const sessions = await this.getActiveSessions(userId);
    if (sessions.length > 0) {
      const oldestSession = sessions.reduce((prev, curr) => 
        prev.created_at < curr.created_at ? prev : curr
      );

      await this.supabase
        .from('sessions')
        .delete()
        .eq('id', oldestSession.id);
    }
  }

  private async getFailedLoginAttempts(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('login_attempts')
      .select('count')
      .eq('user_id', userId)
      .gt('timestamp', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .single();

    return data?.count || 0;
  }

  private async lockAccount(userId: string, duration: number): Promise<void> {
    await this.supabase.auth.updateUser({
      data: {
        locked_until: new Date(Date.now() + duration * 60 * 1000).toISOString(),
      },
    });
  }
} 