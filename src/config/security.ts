import helmet from 'helmet';

export const securityConfig = {
  // CSP הגדרות
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.NEXT_PUBLIC_SUPABASE_URL!, "https://api.supabase.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },

  // הגדרות Rate Limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 דקות
    max: 100, // מקסימום בקשות לחלון זמן
    standardHeaders: true,
    legacyHeaders: false,
  },

  // הגדרות CORS
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },

  // הגדרות Session
  session: {
    cookieName: 'session',
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 שעות
    },
  },

  // הגדרות אבטחה נוספות
  security: {
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameGuard: {
      action: 'deny',
    },
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  },
};

// Middleware אבטחה
export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: securityConfig.contentSecurityPolicy,
    hidePoweredBy: securityConfig.security.hidePoweredBy,
    hsts: securityConfig.security.hsts,
    noSniff: securityConfig.security.noSniff,
    frameguard: securityConfig.security.frameGuard,
    xssFilter: securityConfig.security.xssFilter,
    referrerPolicy: securityConfig.security.referrerPolicy,
  }),
]; 