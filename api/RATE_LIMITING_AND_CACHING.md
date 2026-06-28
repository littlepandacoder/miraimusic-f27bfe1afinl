# Rate Limiting & Caching Guide

This document explains the rate limiting and caching infrastructure implemented for your Vercel API endpoints.

## Rate Limiting

### Overview

Rate limiting protects your API from abuse and ensures fair usage across all users. It's implemented using an in-memory store that tracks requests by IP address or user ID.

### Default Configurations

#### Presets Available

```typescript
RateLimitPresets.strict    // 5 requests/minute
RateLimitPresets.normal    // 30 requests/minute (default for most endpoints)
RateLimitPresets.relaxed   // 100 requests/minute
RateLimitPresets.hourly    // 1000 requests/hour
RateLimitPresets.auth      // 10 attempts/15 minutes (login attempts)
RateLimitPresets.api       // 60 requests/minute
```

### Current Implementation

#### `/api/subscribe-push.ts`
- **Limit**: 30 requests/minute per IP
- **Use case**: Push notification subscriptions
- **Response**: `429 Too Many Requests` when exceeded

#### `/api/daily-reminder.ts`
- **Limit**: 10 requests/hour per endpoint (cron job)
- **Use case**: Scheduled daily reminder notifications
- **Response**: `429 Too Many Requests` when exceeded

### Adding Rate Limiting to New Endpoints

```typescript
import { createRateLimiter, RateLimitPresets } from "./middleware/rateLimiter";

const rateLimiter = createRateLimiter(RateLimitPresets.normal);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply rate limiting (must be first!)
  if (!rateLimiter(req, res)) {
    return; // Request blocked by rate limiter
  }

  // Your handler logic here
}
```

### Custom Rate Limiting

```typescript
import { createRateLimiter } from "./middleware/rateLimiter";

// Custom configuration
const rateLimiter = createRateLimiter({
  windowMs: 60 * 1000,        // 1 minute window
  maxRequests: 50,             // 50 requests max
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP
    return req.headers["x-user-id"] || req.socket.remoteAddress;
  },
});
```

### Rate Limit Headers

When rate limiting is applied, the response includes headers:

```
RateLimit-Limit: 30           // Max requests allowed
RateLimit-Remaining: 25       // Requests remaining
RateLimit-Reset: [ISO-8601]   // When limit resets
Retry-After: 45               // Seconds to wait before retrying
```

---

## Caching

### Overview

Caching reduces database load and improves response times by storing frequently accessed data in memory. It's especially important as you scale to thousands of users.

### Cache Presets

```typescript
CachePresets.short    // 30 seconds
CachePresets.medium   // 5 minutes
CachePresets.long     // 1 hour
CachePresets.veryLong // 24 hours
```

### Usage Examples

#### Basic Caching

```typescript
import { withCache, CachePresets } from "./middleware/cache";

const userData = await withCache(
  `user:${userId}`,
  CachePresets.medium.ttl, // 5 minutes
  async () => {
    return await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
  }
);
```

#### Caching Query Results

```typescript
import { cacheQuery } from "./middleware/cache";

const scoreData = await cacheQuery(
  () => supabase
    .from("game_scores")
    .select("*")
    .eq("user_id", userId)
    .limit(10),
  `scores:${userId}`,
  10 * 60 * 1000 // 10 minutes
);
```

#### Cache Invalidation

```typescript
import { deleteCache, clearCache } from "./middleware/cache";

// Invalidate single cache entry
deleteCache(`user:${userId}`);

// Clear entire cache
clearCache();
```

### Example: Caching User Profile Data

```typescript
import { withCache } from "./middleware/cache";
import { CachePresets } from "./middleware/cache";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = req.query.userId;

  const profile = await withCache(
    `user:profile:${userId}`,
    CachePresets.long.ttl, // 1 hour for profile data
    async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    }
  );

  return res.status(200).json(profile);
}
```

### Cache Invalidation Patterns

```typescript
import { CacheInvalidator } from "./middleware/cache";

const invalidator = new CacheInvalidator();

// Register patterns
invalidator.register("userQuizzes", /^quiz:user:\d+/);
invalidator.register("gameScores", /^scores:user:\d+/);

// Invalidate all user-related caches when profile changes
invalidator.invalidateAll("userQuizzes", "gameScores");
```

### Monitoring Cache Performance

```typescript
import { getCacheStats } from "./middleware/cache";

// Get cache statistics
const stats = getCacheStats();
console.log(`Cache entries: ${stats.size}`);
console.log("Entries:", stats.entries);
```

---

## Scalability: 1,000 to 10,000 Users

### Current Setup Analysis

✅ **What scales well:**
- Vercel Functions: Auto-scales horizontally
- Supabase Database: Handles thousands of concurrent connections
- In-memory rate limiting: Works for single function instances
- In-memory caching: Fast, no external dependencies

⚠️ **What needs improvement at scale:**
- In-memory rate limiting: Lost between cold starts
- In-memory cache: Each function instance has its own cache
- No distributed state: Rate limits and cache don't share across instances

### Recommended Improvements for 1,000+ Users

#### 1. **Switch to Redis-based Rate Limiting**

```typescript
// Use Vercel KV (Redis) instead of in-memory store
import { kv } from "@vercel/kv";

export async function redisRateLimiter(key: string, limit: number, windowMs: number) {
  const count = await kv.incr(key);
  
  if (count === 1) {
    await kv.expire(key, Math.ceil(windowMs / 1000));
  }
  
  return count <= limit;
}
```

#### 2. **Implement Vercel KV for Distributed Caching**

```typescript
import { kv } from "@vercel/kv";

export async function getCachedUserData(userId: string) {
  // Try cache first
  const cached = await kv.get(`user:${userId}`);
  if (cached) return cached;

  // Fetch from database
  const data = await fetchUserFromDB(userId);
  
  // Cache for 5 minutes
  await kv.setex(`user:${userId}`, 300, data);
  return data;
}
```

#### 3. **Database Query Optimization**

- Add database indexes on frequently queried columns
- Use Supabase connection pooling
- Implement query result pagination

#### 4. **CDN for Static Assets**

- Store game icons, images on Vercel CDN
- Reduce API requests for static content

### Migration Timeline

| Users | Action | Implementation |
|-------|--------|-----------------|
| < 100 | Current setup | In-memory cache + rate limiting |
| 100-500 | Monitor | Add basic logging & metrics |
| 500-1000 | Optimize | Database indexes, pagination |
| 1000-5000 | Upgrade | Switch to Vercel KV for caching |
| 5000-10000 | Scale | Implement Redis rate limiting + database replication |
| 10000+ | Enterprise | Database sharding, CDN edge functions |

### Configuration for Production Scaling

#### `.env.production`
```
# Rate limiting (strict for production)
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=20

# Caching
CACHE_TTL_SHORT=30000
CACHE_TTL_MEDIUM=300000
CACHE_TTL_LONG=3600000

# Database
SUPABASE_POOL_SIZE=10
SUPABASE_IDLE_TIMEOUT=30000
```

### Performance Targets

| Metric | < 1000 Users | 1000-5000 | 5000+ |
|--------|-------------|----------|-------|
| API Response Time | < 200ms | < 300ms | < 500ms |
| DB Query Time | < 50ms | < 100ms | < 200ms |
| Cache Hit Rate | 60-70% | 70-80% | 80%+ |
| Error Rate | < 0.1% | < 0.5% | < 1% |

### Monitoring Recommendations

1. **Set up logging** for rate limit hits and cache misses
2. **Monitor database** connection pool usage
3. **Track API response** times by endpoint
4. **Alert** on unusual traffic patterns

### Next Steps

1. ✅ Implement rate limiting (DONE)
2. ✅ Implement caching (DONE)
3. ⏳ Add monitoring & logging
4. ⏳ Switch to Vercel KV at 1,000 users
5. ⏳ Implement database indexing
6. ⏳ Add CDN for static assets

---

## Testing

### Test Rate Limiting

```bash
# Should work (within limit)
curl -X POST http://localhost:3000/api/subscribe-push \
  -H "Content-Type: application/json" \
  -d '{"subscription": {...}, "userId": "123"}'

# After hitting limit, should return 429
# Response headers:
# - Retry-After: 45
# - RateLimit-Remaining: 0
```

### Test Caching

```bash
# First request - hits database
curl http://localhost:3000/api/user-profile?userId=123

# Second request within TTL - hits cache (much faster!)
curl http://localhost:3000/api/user-profile?userId=123
```

---

## Troubleshooting

### Rate Limiting Not Working
- Check if middleware is called BEFORE other logic
- Verify IP headers are correctly extracted
- Check `process.env.NODE_ENV` for correct behavior

### Cache Not Persisting
- Ensure TTL is set correctly (in milliseconds, not seconds)
- Check for `deleteCache()` calls that might clear it prematurely
- Verify function instances aren't being recycled too frequently

### Performance Issues at Scale
- Monitor cache hit rate with `getCacheStats()`
- Check database connection pool saturation
- Review slow queries in Supabase logs
- Consider upgrading to Vercel KV

