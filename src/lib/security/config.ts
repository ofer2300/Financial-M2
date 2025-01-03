import { createCipheriv, randomBytes } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

export const securityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    generateKey: () => randomBytes(32),
    ivLength: 16
  },
  
  authentication: {
    mfa: {
      enabled: true,
      methods: ['authenticator', 'sms', 'email'],
      biometric: {
        enabled: true,
        methods: ['fingerprint', 'face']
      }
    },
    
    rateLimit: {
      window: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      overloadProtection: {
        enabled: true,
        maxLoad: 500, // 500% capacity
        aiDetection: true
      }
    }
  },

  zeroTrust: {
    enabled: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    requireReauth: true,
    networkSecurity: {
      allowedIPs: [],
      vpnRequired: true
    }
  },

  penetrationTesting: {
    schedule: 'monthly',
    automated: true,
    reportRetention: 90 // days
  }
};

// מנגנון הצפנה מקצה לקצה
export const e2eEncryption = {
  encrypt: (data: string, key: Buffer) => {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { encrypted, iv, tag };
  }
}; 