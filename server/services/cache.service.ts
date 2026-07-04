import { logger } from "../utils/logger";

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  tags?: string[]; // Tags for group invalidation
}

/**
 * Enhanced Cache Service with Tags and Smart Invalidation
 */
export class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> Set of keys
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    invalidations: 0,
  };
  
  constructor() {
    // Cleanup expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Set cache item with TTL and optional tags
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300, tags?: string[]): void {
    const ttl = ttlSeconds * 1000; // Convert to milliseconds
    
    // Remove old tags if key exists
    const oldItem = this.cache.get(key);
    if (oldItem?.tags) {
      this.removeKeyFromTags(key, oldItem.tags);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    });
    
    // Index by tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
    
    this.stats.sets++;
    logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s, Tags: ${tags?.join(', ') || 'none'})`, "cache");
  }

  /**
   * Get cache item if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      this.stats.misses++;
      logger.debug(`Cache expired: ${key}`, "cache");
      return null;
    }
    
    this.stats.hits++;
    logger.debug(`Cache hit: ${key}`, "cache");
    return item.data as T;
  }

  /**
   * Delete cache item
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item?.tags) {
      this.removeKeyFromTags(key, item.tags);
    }
    
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      logger.debug(`Cache deleted: ${key}`, "cache");
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared: ${size} items removed`, "cache");
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    tagCount: number;
    hits: number;
    misses: number;
    hitRate: string;
    sets: number;
    deletes: number;
    invalidations: number;
    keys: string[];
    tags: string[];
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%';

    return {
      size: this.cache.size,
      tagCount: this.tagIndex.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      invalidations: this.stats.invalidations,
      keys: Array.from(this.cache.keys()),
      tags: Array.from(this.tagIndex.keys()),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
    };
    logger.info("Cache statistics reset", "cache");
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get or set pattern - if not in cache, execute function and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttlSeconds: number = 300,
    tags?: string[]
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch data
    logger.debug(`Cache miss: ${key} - fetching data`, "cache");
    const data = await fetchFunction();
    
    // Store in cache with tags
    this.set(key, data, ttlSeconds, tags);
    
    return data;
  }

  /**
   * Invalidate all cache entries with given tag
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) {
      return 0;
    }

    let count = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        count++;
      }
    }

    this.tagIndex.delete(tag);
    this.stats.invalidations += count;
    
    logger.info(`Cache invalidated by tag '${tag}': ${count} items removed`, "cache");
    return count;
  }

  /**
   * Invalidate all cache entries with multiple tags
   */
  invalidateByTags(tags: string[]): number {
    let totalCount = 0;
    for (const tag of tags) {
      totalCount += this.invalidateByTag(tag);
    }
    return totalCount;
  }

  /**
   * Invalidate cache by key pattern (supports wildcards)
   */
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    this.stats.invalidations += count;
    logger.info(`Cache invalidated by pattern '${pattern}': ${count} items removed`, "cache");
    return count;
  }

  /**
   * Remove key from tag index
   */
  private removeKeyFromTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug(`Cache cleanup: ${expiredCount} expired items removed`, "cache");
    }
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    logger.info("Cache service shutdown", "cache");
  }
}

// Export singleton instance
export const cacheService = new CacheService();
