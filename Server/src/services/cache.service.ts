import Redis from 'ioredis';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface CacheConfig {
  url: string;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelay: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
}

class CacheService {
  private client: Redis | null = null;
  private isConnected = false;
  private stats: CacheStats = { hits: 0, misses: 0, errors: 0 };
  private config: CacheConfig;

  constructor() {
    this.config = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'ridepool:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300', 10),
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  async connect(): Promise<void> {
    if (this.client && this.isConnected) return;

    try {
      this.client = new Redis(this.config.url, {
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times) => {
          if (times > this.config.maxRetries) return null;
          return Math.min(times * this.config.retryDelay, 5000);
        },
        lazyConnect: true,
        enableReadyCheck: true,
        connectTimeout: 10000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('[Cache] Redis connected');
      });

      this.client.on('error', (err) => {
        this.stats.errors++;
        logger.error('[Cache] Redis error:', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('[Cache] Redis connection closed');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('[Cache] Failed to connect to Redis:', error);
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('[Cache] Redis disconnected');
    }
  }

  private generateKey(key: string): string {
    return key;
  }

  private hashParams(params: Record<string, unknown>): string {
    const sorted = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('md5').update(sorted).digest('hex');
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      const data = await this.client.get(this.generateKey(key));
      if (data) {
        this.stats.hits++;
        return JSON.parse(data) as T;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      logger.error('[Cache] Get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const ttl = ttlSeconds || this.config.defaultTTL;
      await this.client.setex(this.generateKey(key), ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('[Cache] Set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.del(this.generateKey(key));
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('[Cache] Delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      const keys = await this.client.keys(`${this.config.keyPrefix}${pattern}`);
      if (keys.length === 0) return 0;
      const stripped = keys.map(k => k.replace(this.config.keyPrefix, ''));
      return await this.client.del(...stripped);
    } catch (error) {
      this.stats.errors++;
      logger.error('[Cache] DeletePattern error:', error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  poolSearchKey(params: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    gender_preference?: string;
  }): string {
    const rounded = {
      pickup_lat: Math.round(params.pickup_lat * 1000) / 1000,
      pickup_lng: Math.round(params.pickup_lng * 1000) / 1000,
      dropoff_lat: Math.round(params.dropoff_lat * 1000) / 1000,
      dropoff_lng: Math.round(params.dropoff_lng * 1000) / 1000,
      gender_preference: params.gender_preference || 'ANY',
    };
    return `pool:search:${this.hashParams(rounded)}`;
  }

  routeKey(originH3: string, destH3: string): string {
    return `route:${originH3}:${destH3}`;
  }

  userProfileKey(userId: string): string {
    return `user:profile:${userId}`;
  }

  driverLocationKey(driverId: string): string {
    return `driver:location:${driverId}`;
  }

  poolDetailsKey(poolId: string): string {
    return `pool:details:${poolId}`;
  }

  getStats(): CacheStats & { isConnected: boolean } {
    return {
      ...this.stats,
      isConnected: this.isConnected,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export const cacheService = new CacheService();
