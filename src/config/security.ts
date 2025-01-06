import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { SecurityConfig } from '../types/security';

// קבועים
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// יצירת מפתח הצפנה בטוח
const generateSecureKey = (): Buffer => {
  return crypto.randomBytes(KEY_LENGTH);
};

// הגדרות הצפנה
export const encryptionConfig: SecurityConfig['encryption'] = {
  algorithm: ENCRYPTION_ALGORITHM,
  secretKey: process.env.ENCRYPTION_KEY 
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : generateSecureKey(),
  // יצירת IV חדש לכל הצפנה לאבטחה מקסימלית
  generateIV: () => crypto.randomBytes(IV_LENGTH)
};

// הגדרות CORS מתקדמות
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 שעות
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// הגדרות Rate Limiting מתקדמות
export const rateLimitConfig = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 100, // מקסימום בקשות לחלון זמן
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req) => {
    // דוגמה: לדלג על rate limiting עבור נתיבים ספציפיים
    return req.path.startsWith('/public');
  },
  keyGenerator: (req) => {
    // שימוש ב-IP ו-User Agent ליצירת מפתח ייחודי
    return `${req.ip}-${req.headers['user-agent']}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'חריגה ממגבלת הבקשות. נסה שוב מאוחר יותר.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// הגדרות Helmet מתקדמות
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'", 'blob:']
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  expectCt: { enforce: true, maxAge: 30 },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

// פונקציות הצפנה מתקדמות
export const cryptoUtils = {
  // הצפנה עם אימות
  encrypt: (text: string): { encryptedData: string; iv: string; authTag: string } => {
    const iv = encryptionConfig.generateIV();
    const cipher = crypto.createCipheriv(
      encryptionConfig.algorithm,
      encryptionConfig.secretKey,
      iv,
      { authTagLength: AUTH_TAG_LENGTH }
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  },

  // פענוח עם אימות
  decrypt: (encryptedData: string, iv: string, authTag: string): string => {
    const decipher = crypto.createDecipheriv(
      encryptionConfig.algorithm,
      encryptionConfig.secretKey,
      Buffer.from(iv, 'hex'),
      { authTagLength: AUTH_TAG_LENGTH }
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },

  // פונקציית גיבוב מאובטחת
  hash: (data: string): string => {
    return crypto
      .createHash('sha3-512')
      .update(data)
      .digest('hex');
  },

  // יצירת מפתח אקראי מאובטח
  generateSecureToken: (length: number = 32): string => {
    return crypto
      .randomBytes(length)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, length);
  }
}; 