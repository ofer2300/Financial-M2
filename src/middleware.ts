import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RateLimiter } from './auth/RateLimiter';
import { Logger } from './utils/logger';
import { securityConfig } from './config/security';
import { performanceConfig, performanceMiddleware } from './config/performance';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();
  const logger = Logger.getInstance();

  try {
    // שיפורי ביצועים
    response = performanceMiddleware(request);

    // הוספת כותרות אבטחה
    Object.entries(securityConfig.security).forEach(([key, value]) => {
      if (typeof value === 'string') {
        response.headers.set(`X-${key}`, value);
      }
    });

    // הגדרת CSP
    response.headers.set(
      'Content-Security-Policy',
      Object.entries(securityConfig.contentSecurityPolicy.directives)
        .map(([key, value]) => `${key} ${value.join(' ')}`)
        .join('; ')
    );

    // בדיקת CORS
    const origin = request.headers.get('origin');
    if (origin && securityConfig.cors.origin.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', securityConfig.cors.methods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', securityConfig.cors.allowedHeaders.join(', '));
      if (securityConfig.cors.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    }

    // בדיקת Rate Limiting
    const ip = request.ip || 'unknown';
    const rateLimiter = new RateLimiter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const rateLimitInfo = await rateLimiter.checkLimit(
      ip,
      'ip',
      request.nextUrl.pathname
    );

    if (rateLimitInfo.blocked) {
      await logger.logSecurityEvent('rate_limit_exceeded', undefined, {
        ip,
        path: request.nextUrl.pathname,
      });

      return new NextResponse(null, {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Retry-After': rateLimitInfo.reset.toString(),
        },
      });
    }

    // רישום הבקשה
    await rateLimiter.recordRequest(ip, 'ip', request.nextUrl.pathname);
    await logger.logRequest(
      request.nextUrl.pathname,
      undefined,
      ip,
      {
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        responseTime: response.headers.get('Server-Timing'),
      }
    );

    // בדיקת אימות לנתיבים מוגנים
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        await logger.logSecurityEvent('unauthorized_access', undefined, {
          ip,
          path: request.nextUrl.pathname,
        });

        return new NextResponse(null, {
          status: 401,
          statusText: 'Unauthorized',
        });
      }

      response.headers.set('X-User-ID', session.user.id);
    }

    return response;
  } catch (error) {
    await logger.error('Middleware error', { error, path: request.nextUrl.pathname });
    return new NextResponse(null, { status: 500 });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 