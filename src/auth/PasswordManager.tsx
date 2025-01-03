import { createClient } from '@supabase/supabase-js';
import { hash, compare } from 'bcrypt';
import zxcvbn from 'zxcvbn';

interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventPersonalInfo: boolean;
  preventPreviousPasswords: number;
  maxAge: number; // בימים
  minScore: number; // 0-4 מתוך zxcvbn
}

interface PasswordHistory {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: string;
}

const defaultPolicy: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventPersonalInfo: true,
  preventPreviousPasswords: 5,
  maxAge: 90,
  minScore: 3,
};

export class PasswordManager {
  private policy: PasswordPolicy;
  private supabase: any;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    policy: Partial<PasswordPolicy> = {}
  ) {
    this.policy = {
      ...defaultPolicy,
      ...policy,
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async validatePassword(
    password: string,
    userInfo?: Record<string, string>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    score: number;
    feedback: string[];
  }> {
    const errors: string[] = [];
    const feedback: string[] = [];

    // בדיקת אורך
    if (password.length < this.policy.minLength) {
      errors.push(`הסיסמה חייבת להכיל לפחות ${this.policy.minLength} תווים`);
    }

    if (password.length > this.policy.maxLength) {
      errors.push(`הסיסמה לא יכולה להכיל יותר מ-${this.policy.maxLength} תווים`);
    }

    // בדיקת תווים נדרשים
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות אות גדולה אחת');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות אות קטנה אחת');
    }

    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות ספרה אחת');
    }

    if (this.policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('הסיסמה חייבת להכיל לפחות תו מיוחד אחד');
    }

    // בדיקת חוזק הסיסמה
    const result = zxcvbn(password, userInfo ? Object.values(userInfo) : undefined);
    const score = result.score;

    if (score < this.policy.minScore) {
      errors.push('הסיסמה חלשה מדי');
      feedback.push(...result.feedback.suggestions);
    }

    // בדיקת סיסמאות נפוצות
    if (this.policy.preventCommonPasswords && result.feedback.warning) {
      errors.push(result.feedback.warning);
    }

    // בדיקת מידע אישי
    if (this.policy.preventPersonalInfo && userInfo) {
      for (const value of Object.values(userInfo)) {
        if (password.toLowerCase().includes(value.toLowerCase())) {
          errors.push('הסיסמה לא יכולה להכיל מידע אישי');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      score,
      feedback,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }

  async changePassword(
    userId: string,
    newPassword: string,
    userInfo?: Record<string, string>
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // בדיקת תקינות הסיסמה
      const validation = await this.validatePassword(newPassword, userInfo);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors.join('\n'),
        };
      }

      // בדיקת היסטוריית סיסמאות
      if (this.policy.preventPreviousPasswords > 0) {
        const previousPasswords = await this.getPasswordHistory(userId);
        for (const prev of previousPasswords) {
          if (await this.verifyPassword(newPassword, prev.passwordHash)) {
            return {
              success: false,
              message: 'לא ניתן להשתמש בסיסמה שכבר השתמשת בה בעבר',
            };
          }
        }
      }

      // הצפנת הסיסמה החדשה
      const passwordHash = await this.hashPassword(newPassword);

      // עדכון הסיסמה
      const { error: updateError } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // שמירת הסיסמה בהיסטוריה
      await this.addToPasswordHistory(userId, passwordHash);

      return {
        success: true,
        message: 'הסיסמה שונתה בהצלחה',
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        message: 'אירעה שגיאה בשינוי הסיסמה',
      };
    }
  }

  async checkPasswordAge(userId: string): Promise<{
    shouldChange: boolean;
    daysUntilExpiration: number;
  }> {
    try {
      const { data: lastPassword, error } = await this.supabase
        .from('password_history')
        .select('createdAt')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (!lastPassword) {
        return {
          shouldChange: true,
          daysUntilExpiration: 0,
        };
      }

      const lastChange = new Date(lastPassword.createdAt);
      const now = new Date();
      const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilExpiration = this.policy.maxAge - daysSinceChange;

      return {
        shouldChange: daysSinceChange >= this.policy.maxAge,
        daysUntilExpiration: Math.max(0, daysUntilExpiration),
      };
    } catch (error) {
      console.error('Error checking password age:', error);
      return {
        shouldChange: false,
        daysUntilExpiration: this.policy.maxAge,
      };
    }
  }

  private async getPasswordHistory(userId: string): Promise<PasswordHistory[]> {
    try {
      const { data, error } = await this.supabase
        .from('password_history')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(this.policy.preventPreviousPasswords);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting password history:', error);
      return [];
    }
  }

  private async addToPasswordHistory(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    try {
      // הוספת הסיסמה החדשה להיסטוריה
      await this.supabase
        .from('password_history')
        .insert({
          userId,
          passwordHash,
          createdAt: new Date().toISOString(),
        });

      // מחיקת סיסמאות ישנות מעבר למגבלה
      const { data: oldPasswords } = await this.supabase
        .from('password_history')
        .select('id')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .range(this.policy.preventPreviousPasswords, undefined);

      if (oldPasswords && oldPasswords.length > 0) {
        const oldIds = oldPasswords.map(p => p.id);
        await this.supabase
          .from('password_history')
          .delete()
          .in('id', oldIds);
      }
    } catch (error) {
      console.error('Error adding to password history:', error);
      throw error;
    }
  }

  async generateSecurePassword(): Promise<string> {
    const length = Math.max(this.policy.minLength, 16);
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    let chars = '';

    if (this.policy.requireUppercase) chars += uppercaseChars;
    if (this.policy.requireLowercase) chars += lowercaseChars;
    if (this.policy.requireNumbers) chars += numberChars;
    if (this.policy.requireSpecialChars) chars += specialChars;

    // הוספת תו אחד לפחות מכל קטגוריה נדרשת
    if (this.policy.requireUppercase) {
      password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
    }
    if (this.policy.requireLowercase) {
      password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
    }
    if (this.policy.requireNumbers) {
      password += numberChars[Math.floor(Math.random() * numberChars.length)];
    }
    if (this.policy.requireSpecialChars) {
      password += specialChars[Math.floor(Math.random() * specialChars.length)];
    }

    // השלמה לאורך הנדרש
    while (password.length < length) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }

    // ערבוב התווים
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
} 