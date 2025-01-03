import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

interface MFAConfig {
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number;
  window: number;
}

const defaultConfig: MFAConfig = {
  issuer: 'FinancialMatchingSystem',
  algorithm: 'SHA256',
  digits: 6,
  period: 30,
  window: 1,
};

export class MFAManager {
  private config: MFAConfig;
  private supabase: any;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<MFAConfig> = {}
  ) {
    this.config = {
      ...defaultConfig,
      ...config,
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // הגדרת תצורת המאמת
    authenticator.options = {
      algorithm: this.config.algorithm,
      digits: this.config.digits,
      period: this.config.period,
      window: this.config.window,
    };
  }

  async enableMFA(userId: string, email: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    try {
      // יצירת סוד חדש
      const secret = authenticator.generateSecret();

      // יצירת קוד QR
      const otpauth = authenticator.keyuri(
        email,
        this.config.issuer,
        secret
      );

      const qrCode = await QRCode.toDataURL(otpauth);

      // יצירת קודי גיבוי
      const backupCodes = await this.generateBackupCodes();

      // שמירת המידע בבסיס הנתונים
      const { error } = await this.supabase
        .from('mfa_settings')
        .upsert({
          user_id: userId,
          secret,
          backup_codes: backupCodes,
          enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return {
        secret,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      console.error('Error enabling MFA:', error);
      throw error;
    }
  }

  async verifyAndActivate(userId: string, token: string): Promise<boolean> {
    try {
      // קבלת הגדרות MFA של המשתמש
      const { data: settings, error: settingsError } = await this.supabase
        .from('mfa_settings')
        .select('secret, enabled')
        .eq('user_id', userId)
        .single();

      if (settingsError) throw settingsError;
      if (!settings) throw new Error('MFA settings not found');
      if (settings.enabled) throw new Error('MFA is already enabled');

      // אימות הקוד
      const isValid = authenticator.verify({
        token,
        secret: settings.secret,
      });

      if (!isValid) {
        throw new Error('Invalid MFA token');
      }

      // הפעלת MFA
      const { error: updateError } = await this.supabase
        .from('mfa_settings')
        .update({
          enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // עדכון פרופיל המשתמש
      const { error: userError } = await this.supabase.auth.updateUser({
        data: {
          mfa_enabled: true,
        },
      });

      if (userError) throw userError;

      return true;
    } catch (error) {
      console.error('Error verifying and activating MFA:', error);
      throw error;
    }
  }

  async verify(userId: string, token: string): Promise<boolean> {
    try {
      // קבלת הגדרות MFA של המשתמש
      const { data: settings, error: settingsError } = await this.supabase
        .from('mfa_settings')
        .select('secret, enabled, backup_codes')
        .eq('user_id', userId)
        .single();

      if (settingsError) throw settingsError;
      if (!settings) throw new Error('MFA settings not found');
      if (!settings.enabled) throw new Error('MFA is not enabled');

      // בדיקה אם זה קוד גיבוי
      if (settings.backup_codes.includes(token)) {
        // הסרת הקוד שנוצל
        const updatedBackupCodes = settings.backup_codes.filter(code => code !== token);
        
        await this.supabase
          .from('mfa_settings')
          .update({
            backup_codes: updatedBackupCodes,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        return true;
      }

      // אימות הקוד
      return authenticator.verify({
        token,
        secret: settings.secret,
      });
    } catch (error) {
      console.error('Error verifying MFA:', error);
      throw error;
    }
  }

  async disable(userId: string): Promise<void> {
    try {
      // בדיקה אם MFA מופעל
      const { data: settings, error: settingsError } = await this.supabase
        .from('mfa_settings')
        .select('enabled')
        .eq('user_id', userId)
        .single();

      if (settingsError) throw settingsError;
      if (!settings?.enabled) throw new Error('MFA is not enabled');

      // מחיקת הגדרות MFA
      const { error: deleteError } = await this.supabase
        .from('mfa_settings')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // עדכון פרופיל המשתמש
      const { error: userError } = await this.supabase.auth.updateUser({
        data: {
          mfa_enabled: false,
        },
      });

      if (userError) throw userError;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = await this.generateBackupCodes();

      const { error } = await this.supabase
        .from('mfa_settings')
        .update({
          backup_codes: backupCodes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      return backupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  private async generateBackupCodes(count: number = 10): Promise<string[]> {
    const codes: string[] = [];
    const length = 10;
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < length; j++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        code += charset[randomIndex];
      }
      codes.push(code);
    }

    return codes;
  }

  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    remainingBackupCodes: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('mfa_settings')
        .select('enabled, backup_codes')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        enabled: data?.enabled || false,
        remainingBackupCodes: data?.backup_codes?.length || 0,
      };
    } catch (error) {
      console.error('Error getting MFA status:', error);
      throw error;
    }
  }
} 