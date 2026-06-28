import type { VercelRequest, VercelResponse } from "@vercel/node";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: VercelRequest) => string; // Custom key generator (defaults to IP)
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

// In-memory store for rate limiting
// For production, consider using Redis (Vercel KV) for distributed rate limiting
const store = new Map<string, Array<number>>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    const recentTimestamps = timestamps.filter((ts) => now - ts < 60 * 60 * 1000); // Keep 1 hour
    if (recentTimestamps.length === 0) {
      store.delete(key);
    } else {
      store.set(key, recentTimestamps);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param config Rate limit configuration
 * @returns Middleware function
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => getClientIp(req),
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return (req: VercelRequest, res: VercelResponse): boolean => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get timestamps for this key
    const timestamps = store.get(key) || [];

    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (recentTimestamps.length >= maxRequests) {
      const retryAfter = Math.ceil((recentTimestamps[0] + windowMs - now) / 1000);

      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", "0");
      res.setHeader("RateLimit-Reset", new Date(recentTimestamps[0] + windowMs).toISOString());

      res.status(429).json({
        error: "Too many requests",
        retryAfter,
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
      });

      return false; // Request should not proceed
    }

    // Add current timestamp
    recentTimestamps.push(now);
    store.set(key, recentTimestamps);

    // Set rate limit headers
    res.setHeader("RateLimit-Limit", String(maxRequests));
    res.setHeader("RateLimit-Remaining", String(maxRequests - recentTimestamps.length));
    res.setHeader("RateLimit-Reset", new Date(recentTimestamps[0] + windowMs).toISOString());

    // Store for checking after response
    (res as any)._rateLimitKey = key;
    (res as any)._rateLimitTimestamps = recentTimestamps;

    return true; // Request can proceed
  };
}

/**
 * Get client IP from request
 */
function getClientIp(req: VercelRequest): string {
  return (
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ||
    req.headers["cf-connecting-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Rate limiter middleware with user-based key (for authenticated endpoints)
 */
export function createUserRateLimiter(config: Omit<RateLimitConfig, "keyGenerator">) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req) => {
      // Use user ID if available from auth token, otherwise fall back to IP
      const userId = (req as any).user?.id || (req as any).userId;
      if (userId) return `user:${userId}`;
      return `ip:${getClientIp(req)}`;
    },
  });
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Strict: 5 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },

  // Normal: 30 requests per minute
  normal: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },

  // Relaxed: 100 requests per minute
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },

  // Per hour: 1000 requests per hour
  hourly: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000,
  },

  // Auth endpoints: 10 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
  },

  // API endpoints: 60 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
};
