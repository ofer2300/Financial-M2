import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface RateLimit {
  key: string;
  maxRequests: number;
  windowSeconds: number;
  blockDuration: number; // בשניות
}

interface RateLimitConfig {
  enabled: boolean;
  defaultLimit: RateLimit;
  ipLimits: RateLimit[];
  userLimits: RateLimit[];
  endpointLimits: Record<string, RateLimit>;
  whitelistedIPs: string[];
  whitelistedUsers: string[];
}

interface RateLimitInfo {
  remaining: number;
  reset: number;
  blocked: boolean;
  blockExpires: number | null;
}

const defaultConfig: RateLimitConfig = {
  enabled: true,
  defaultLimit: {
    key: 'default',
    maxRequests: 100,
    windowSeconds: 60,
    blockDuration: 300,
  },
  ipLimits: [
    {
      key: 'ip_strict',
      maxRequests: 10,
      windowSeconds: 10,
      blockDuration: 300,
    },
    {
      key: 'ip_normal',
      maxRequests: 100,
      windowSeconds: 60,
      blockDuration: 600,
    },
  ],
  userLimits: [
    {
      key: 'user_strict',
      maxRequests: 20,
      windowSeconds: 10,
      blockDuration: 300,
    },
    {
      key: 'user_normal',
      maxRequests: 200,
      windowSeconds: 60,
      blockDuration: 600,
    },
  ],
  endpointLimits: {
    '/api/auth/login': {
      key: 'login',
      maxRequests: 5,
      windowSeconds: 300,
      blockDuration: 900,
    },
    '/api/auth/register': {
      key: 'register',
      maxRequests: 3,
      windowSeconds: 3600,
      blockDuration: 7200,
    },
  },
  whitelistedIPs: [],
  whitelistedUsers: [],
};

export class RateLimiter {
  private config: RateLimitConfig;
  private supabase: SupabaseClient;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<RateLimitConfig> = {}
  ) {
    this.config = {
      ...defaultConfig,
      ...config,
      endpointLimits: {
        ...defaultConfig.endpointLimits,
        ...config.endpointLimits,
      },
    };
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async checkLimit(
    identifier: string,
    type: 'ip' | 'user' | 'endpoint',
    endpoint?: string
  ): Promise<RateLimitInfo> {
    if (!this.config.enabled) {
      return {
        remaining: Infinity,
        reset: 0,
        blocked: false,
        blockExpires: null,
      };
    }

    // בדיקת רשימה לבנה
    if (
      (type === 'ip' && this.config.whitelistedIPs.includes(identifier)) ||
      (type === 'user' && this.config.whitelistedUsers.includes(identifier))
    ) {
      return {
        remaining: Infinity,
        reset: 0,
        blocked: false,
        blockExpires: null,
      };
    }

    // בחירת המגבלה המתאימה
    const limit = this.getLimit(type, endpoint);
    if (!limit) {
      return {
        remaining: Infinity,
        reset: 0,
        blocked: false,
        blockExpires: null,
      };
    }

    // בדיקת חסימה
    const blockKey = `${type}:${identifier}:blocked`;
    const { data: blockData } = await this.supabase
      .from('rate_limits')
      .select('expires_at')
      .eq('key', blockKey)
      .single();

    if (blockData && new Date(blockData.expires_at) > new Date()) {
      return {
        remaining: 0,
        reset: Math.floor((new Date(blockData.expires_at).getTime() - Date.now()) / 1000),
        blocked: true,
        blockExpires: new Date(blockData.expires_at).getTime(),
      };
    }

    // בדיקת מספר הבקשות
    const windowStart = new Date(Date.now() - limit.windowSeconds * 1000).toISOString();
    const key = `${type}:${identifier}:${limit.key}`;

    const { count } = await this.supabase
      .from('rate_limits')
      .select('*', { count: 'exact' })
      .eq('key', key)
      .gte('timestamp', windowStart);

    const remaining = Math.max(0, limit.maxRequests - count);
    const reset = Math.floor(limit.windowSeconds - (Date.now() % (limit.windowSeconds * 1000)) / 1000);

    // בדיקה אם צריך לחסום
    if (remaining === 0) {
      const blockExpires = new Date(Date.now() + limit.blockDuration * 1000).toISOString();
      await this.supabase
        .from('rate_limits')
        .insert({
          key: blockKey,
          expires_at: blockExpires,
          timestamp: new Date().toISOString(),
        });

      return {
        remaining: 0,
        reset: limit.blockDuration,
        blocked: true,
        blockExpires: new Date(blockExpires).getTime(),
      };
    }

    return {
      remaining,
      reset,
      blocked: false,
      blockExpires: null,
    };
  }

  async recordRequest(
    identifier: string,
    type: 'ip' | 'user' | 'endpoint',
    endpoint?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    const limit = this.getLimit(type, endpoint);
    if (!limit) return;

    const key = `${type}:${identifier}:${limit.key}`;
    const timestamp = new Date().toISOString();

    await this.supabase
      .from('rate_limits')
      .insert({
        key,
        timestamp,
      });

    // ניקוי רשומות ישנות
    const cleanupBefore = new Date(Date.now() - limit.windowSeconds * 1000).toISOString();
    await this.supabase
      .from('rate_limits')
      .delete()
      .eq('key', key)
      .lt('timestamp', cleanupBefore);
  }

  async resetLimits(identifier: string, type: 'ip' | 'user' | 'endpoint'): Promise<void> {
    if (!this.config.enabled) return;

    // מחיקת כל הרשומות עבור המזהה
    await this.supabase
      .from('rate_limits')
      .delete()
      .like('key', `${type}:${identifier}:%`);
  }

  private getLimit(type: 'ip' | 'user' | 'endpoint', endpoint?: string): RateLimit | null {
    if (type === 'endpoint' && endpoint && this.config.endpointLimits[endpoint]) {
      return this.config.endpointLimits[endpoint];
    }

    if (type === 'ip' && this.config.ipLimits.length > 0) {
      return this.config.ipLimits[0];
    }

    if (type === 'user' && this.config.userLimits.length > 0) {
      return this.config.userLimits[0];
    }

    return this.config.defaultLimit;
  }

  async cleanup(): Promise<void> {
    if (!this.config.enabled) return;

    const now = new Date().toISOString();

    // ניקוי חסימות שפג תוקפן
    await this.supabase
      .from('rate_limits')
      .delete()
      .like('key', '%:blocked')
      .lt('expires_at', now);

    // ניקוי רשומות בקשות ישנות
    const oldestPossibleRequest = new Date(
      Date.now() - Math.max(
        this.config.defaultLimit.windowSeconds,
        ...this.config.ipLimits.map(l => l.windowSeconds),
        ...this.config.userLimits.map(l => l.windowSeconds),
        ...Object.values(this.config.endpointLimits).map(l => l.windowSeconds)
      ) * 1000
    ).toISOString();

    await this.supabase
      .from('rate_limits')
      .delete()
      .not('key', 'like', '%:blocked')
      .lt('timestamp', oldestPossibleRequest);
  }

  async getMetrics(): Promise<{
    totalRequests: number;
    blockedRequests: number;
    activeBlocks: number;
    requestsByEndpoint: Record<string, number>;
    blocksByType: Record<string, number>;
  }> {
    if (!this.config.enabled) {
      return {
        totalRequests: 0,
        blockedRequests: 0,
        activeBlocks: 0,
        requestsByEndpoint: {},
        blocksByType: {},
      };
    }

    const now = new Date().toISOString();
    const { data: requests } = await this.supabase
      .from('rate_limits')
      .select('key')
      .not('key', 'like', '%:blocked');

    const { data: blocks } = await this.supabase
      .from('rate_limits')
      .select('key')
      .like('key', '%:blocked')
      .gte('expires_at', now);

    const metrics = {
      totalRequests: requests?.length || 0,
      blockedRequests: blocks?.length || 0,
      activeBlocks: blocks?.length || 0,
      requestsByEndpoint: {},
      blocksByType: {
        ip: 0,
        user: 0,
        endpoint: 0,
      },
    };

    // חישוב בקשות לפי נקודת קצה
    requests?.forEach((req: { key: string }) => {
      const [type, , limitKey] = req.key.split(':');
      if (type === 'endpoint') {
        metrics.requestsByEndpoint[limitKey] = (metrics.requestsByEndpoint[limitKey] || 0) + 1;
      }
    });

    // חישוב חסימות לפי סוג
    blocks?.forEach((block: { key: string }) => {
      const [type] = block.key.split(':');
      if (type in metrics.blocksByType) {
        metrics.blocksByType[type]++;
      }
    });

    return metrics;
  }
} 