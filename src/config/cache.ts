import Redis, { RedisOptions } from 'ioredis';
import { CacheConfig, CacheEntry, CacheKey } from '../types/cache';
import { logger } from '../utils/logger';

// קבועים
const DEFAULT_TTL = 3600; // שעה
const CACHE_PREFIX = 'app:cache:';
const MAX_KEYS_PER_SCAN = 100;

// הגדרות Redis
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`ניסיון התחברות מחדש ל-Redis מספר ${times}. המתנה ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    logger.error(`שגיאת התחברות ל-Redis: ${err.message}`);
    return true;
  }
};

// יצירת חיבור Redis
const redis = new Redis(redisConfig);

redis.on('error', (error: Error) => {
  logger.error(`שגיאת Redis: ${error.message}`);
});

redis.on('connect', () => {
  logger.info('התחברות מוצלחת ל-Redis');
});

// הגדרות קאשינג
export const cacheConfig: CacheConfig = {
  // זמני תפוגה לסוגי נתונים שונים
  ttl: {
    user: 3600, // שעה
    meeting: 1800, // 30 דקות
    messages: 900, // 15 דקות
    files: 7200, // שעתיים
    default: DEFAULT_TTL
  },
  
  // פונקציות קאשינג
  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      const data = await redis.get(CACHE_PREFIX + key);
      if (!data) return null;
      
      const entry: CacheEntry<T> = JSON.parse(data);
      
      // בדיקת תפוגה
      if (entry.expiry && entry.expiry < Date.now()) {
        await this.del(key);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      logger.error(`שגיאה בקריאת נתונים מהקאש: ${error}`);
      return null;
    }
  },
  
  async set<T>(key: CacheKey, value: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data: value,
        expiry: ttl ? Date.now() + ttl * 1000 : undefined,
        timestamp: Date.now()
      };
      
      const serialized = JSON.stringify(entry);
      
      if (ttl) {
        await redis.setex(CACHE_PREFIX + key, ttl, serialized);
      } else {
        await redis.set(CACHE_PREFIX + key, serialized);
      }
    } catch (error) {
      logger.error(`שגיאה בשמירת נתונים בקאש: ${error}`);
    }
  },
  
  async del(key: CacheKey): Promise<void> {
    try {
      await redis.del(CACHE_PREFIX + key);
    } catch (error) {
      logger.error(`שגיאה במחיקת נתונים מהקאש: ${error}`);
    }
  },
  
  async flush(): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          CACHE_PREFIX + '*',
          'COUNT',
          MAX_KEYS_PER_SCAN
        );
        
        if (keys.length) {
          await redis.del(...keys);
        }
        
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (error) {
      logger.error(`שגיאה בניקוי הקאש: ${error}`);
    }
  }
};

// מידלוור קאשינג משופר
export const cacheMiddleware = (options: {
  ttl?: number;
  prefix?: string;
  exclude?: RegExp[];
}) => {
  return async (req: any, res: any, next: any) => {
    // בדיקה אם הנתיב צריך להיות מוחרג מקאשינג
    if (options.exclude?.some(pattern => pattern.test(req.path))) {
      return next();
    }
    
    const key = `${options.prefix || ''}:${req.method}:${req.originalUrl}`;
    
    try {
      const cachedData = await cacheConfig.get(key);
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // שמירת הפונקציה המקורית של res.json
      const originalJson = res.json;
      
      // החלפת הפונקציה כדי לתפוס את התשובה
      res.json = async function(data: any) {
        if (data && !res.statusCode.toString().startsWith('4')) {
          await cacheConfig.set(
            key,
            data,
            options.ttl || cacheConfig.ttl.default
          );
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error(`שגיאה במידלוור קאשינג: ${error}`);
      next(error);
    }
  };
};

// פונקציות עזר לקאשינג
export const cacheHelpers = {
  // יצירת מפתח קאשינג
  generateKey: (prefix: string, id: string): CacheKey => 
    `${prefix}:${id}`,
  
  // ניקוי קאש לפי תבנית
  async clearPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      const fullPattern = CACHE_PREFIX + pattern;
      
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          MAX_KEYS_PER_SCAN
        );
        
        if (keys.length) {
          await redis.del(...keys);
          logger.info(`נמחקו ${keys.length} מפתחות קאש לפי תבנית ${pattern}`);
        }
        
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (error) {
      logger.error(`שגיאה בניקוי קאש לפי תבנית: ${error}`);
    }
  },
  
  // רענון קאש
  async refresh<T>(
    key: CacheKey,
    getData: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      const data = await getData();
      await cacheConfig.set(key, data, ttl);
      return data;
    } catch (error) {
      logger.error(`שגיאה ברענון קאש: ${error}`);
      throw error;
    }
  },
  
  // בדיקת תקינות הקאש
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = `${CACHE_PREFIX}health`;
      await redis.set(testKey, 'OK', 'EX', 1);
      const result = await redis.get(testKey);
      return result === 'OK';
    } catch (error) {
      logger.error(`שגיאה בבדיקת תקינות הקאש: ${error}`);
      return false;
    }
  }
}; 