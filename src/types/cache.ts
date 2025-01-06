export interface CacheConfig {
  ttl: {
    user: number;
    meeting: number;
    messages: number;
    files: number;
    [key: string]: number;
  };
  
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
}

export interface CacheMiddlewareOptions {
  ttl?: number;
  prefix?: string;
  exclude?: string[];
}

export interface CacheHelpers {
  generateKey(prefix: string, id: string): string;
  clearPattern(pattern: string): Promise<void>;
  refresh(key: string, getData: () => Promise<any>, ttl?: number): Promise<any>;
} 