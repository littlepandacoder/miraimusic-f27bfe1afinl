/**
 * Simple rate limiter for authentication endpoints
 * Prevents brute force attacks on login/registration
 */

interface RateLimitEntry {
  attempts: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CONFIG = {
  AUTH: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

export function checkRateLimit(
  identifier: string,
  limitType: 'AUTH' | 'PASSWORD_RESET' = 'AUTH'
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const config = RATE_LIMIT_CONFIG[limitType];
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries
  if (entry && entry.resetTime < now) {
    rateLimitStore.delete(identifier);
    return { allowed: true, remaining: config.maxAttempts };
  }

  // First attempt for this identifier
  if (!entry) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxAttempts - 1 };
  }

  // Check if limit exceeded
  if (entry.attempts >= config.maxAttempts) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  // Increment and allow
  entry.attempts += 1;
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.attempts,
  };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// Cleanup old entries periodically (every hour)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);
