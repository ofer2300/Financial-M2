import compression from 'compression';
import responseTime from 'response-time';
import { NextResponse } from 'next/server';

export const performanceConfig = {
  // הגדרות דחיסה
  compression: {
    level: 6, // רמת דחיסה (1-9)
    threshold: 1024, // סף מינימלי לדחיסה (בבתים)
  },

  // הגדרות מטמון
  cache: {
    // כללי מטמון לפי סוג תוכן
    rules: [
      {
        match: /\.(css|js|jpg|jpeg|png|gif|ico|woff|woff2|ttf|eot)$/,
        maxAge: 7 * 24 * 60 * 60, // שבוע
      },
      {
        match: /\.(html|json)$/,
        maxAge: 60 * 60, // שעה
      }
    ],
    
    // הגדרות כלליות
    defaultMaxAge: 60 * 5, // 5 דקות
    revalidate: true,
    staleWhileRevalidate: true,
  },

  // הגדרות אופטימיזציה
  optimization: {
    // דחיית טעינת JavaScript
    scriptLoading: 'defer',
    
    // טעינה מקדימה של משאבים
    preload: [
      {
        type: 'font',
        href: '/fonts/main.woff2',
      },
      {
        type: 'style',
        href: '/styles/critical.css',
      }
    ],

    // אופטימיזציית תמונות
    images: {
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      formats: ['image/webp'],
    },
  },

  // הגדרות ניטור
  monitoring: {
    responseTime: {
      digits: 2, // דיוק המדידה
      suffix: false,
    },
    metrics: {
      enabled: true,
      interval: 60000, // מדידה כל דקה
      prefix: 'app_',
    },
  },
};

// Middleware ביצועים
export function performanceMiddleware(request: Request) {
  const response = NextResponse.next();
  const url = new URL(request.url);

  // הוספת כותרות מטמון
  for (const rule of performanceConfig.cache.rules) {
    if (rule.match.test(url.pathname)) {
      response.headers.set(
        'Cache-Control',
        `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.maxAge * 0.5}`
      );
      break;
    }
  }

  // הוספת כותרות דחיסה
  if (request.headers.get('accept-encoding')?.includes('gzip')) {
    response.headers.set('Content-Encoding', 'gzip');
    response.headers.set('Vary', 'Accept-Encoding');
  }

  // מדידת זמן תגובה
  const start = process.hrtime();
  response.headers.set('Server-Timing', `total;dur=${process.hrtime(start)[1] / 1000000}`);

  return response;
}

// פונקציית עזר לאופטימיזציית תמונות
export function getOptimizedImageUrl(src: string, width: number, quality = 75) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
} 