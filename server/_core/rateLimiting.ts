import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware for API security
 * Protects against DDoS, spam, and brute-force attacks
 */

// General API rate limiter: 100 requests per minute per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});

// Leaderboard submit rate limiter: 10 submissions per hour per IP
// Applied ONLY to /api/trpc/leaderboard.submit — NOT to list/qualifies reads
export const leaderboardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many score submissions. Please wait before submitting another score.',
  standardHeaders: true,
  legacyHeaders: false,
  // No custom keyGenerator — use default (req.ip) to avoid IPv6 issues
});

// Authentication rate limiter: 5 failed attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Analytics rate limiter: 1000 events per minute per IP
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many analytics events',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.includes('/analytics'),
});
