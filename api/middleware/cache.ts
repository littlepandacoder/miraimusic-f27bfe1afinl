import type { VercelRequest, VercelResponse } from "@vercel/node";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache store
const cacheStore = new Map<string, CacheEntry<any>>();

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string; // Cache key
}

/**
 * Cache presets for common scenarios
 */
export const CachePresets = {
  // Short cache: 30 seconds
  short: { ttl: 30 * 1000 },

  // Medium cache: 5 minutes
  medium: { ttl: 5 * 60 * 1000 },

  // Long cache: 1 hour
  long: { ttl: 60 * 60 * 1000 },

  // Very long cache: 24 hours
  veryLong: { ttl: 24 * 60 * 60 * 1000 },
};

/**
 * Get value from cache
 */
export function getFromCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set value in cache
 */
export function setCache<T>(key: string, data: T, ttl: number): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Delete from cache
 */
export function deleteCache(key: string): void {
  cacheStore.delete(key);
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Get cache size
 */
export function getCacheSize(): number {
  return cacheStore.size;
}

/**
 * Cache management middleware
 * Usage: const cached = await withCache(key, ttl, async () => fetchData())
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  setCache(key, data, ttl);

  return data;
}

/**
 * Cache invalidation patterns
 * Useful for invalidating related cache entries
 */
export class CacheInvalidator {
  private patterns: Map<string, RegExp> = new Map();

  register(name: string, pattern: RegExp): void {
    this.patterns.set(name, pattern);
  }

  invalidate(name: string): number {
    const pattern = this.patterns.get(name);
    if (!pattern) return 0;

    let count = 0;
    for (const key of cacheStore.keys()) {
      if (pattern.test(key)) {
        cacheStore.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateAll(...names: string[]): number {
    let total = 0;
    for (const name of names) {
      total += this.invalidate(name);
    }
    return total;
  }
}

/**
 * Automatic cache cleanup
 * Runs every 5 minutes to remove expired entries
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of cacheStore.entries()) {
    if (now > entry.expiresAt) {
      cacheStore.delete(key);
      cleaned++;
    }
  }

  // Log cleanup stats in development
  if (process.env.NODE_ENV === "development" && cleaned > 0) {
    console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);

/**
 * Cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{
    key: string;
    expiresIn: number;
    ageMs: number;
  }>;
} {
  const entries: Array<{
    key: string;
    expiresIn: number;
    ageMs: number;
  }> = [];

  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    entries.push({
      key,
      expiresIn: entry.expiresAt - now,
      ageMs: now - entry.timestamp,
    });
  }

  return {
    size: cacheStore.size,
    entries: entries.sort((a, b) => b.ageMs - a.ageMs),
  };
}

/**
 * Cache middleware helper
 * Usage: const result = await cacheQuery(() => db.fetch(...), 'user:123', 5 * 60 * 1000)
 */
export async function cacheQuery<T>(
  query: () => Promise<T>,
  key: string,
  ttl: number
): Promise<T> {
  return withCache(key, ttl, query);
}
