import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware for API security
 * Protects against DDoS, spam, and brute-force attacks
 */

// General API rate limiter: 100 requests per minute per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Leaderboard submit rate limiter: 10 submissions per hour per IP
// (stricter limit to prevent spam/abuse of leaderboard)
export const leaderboardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 score submissions per hour
  message: 'Too many score submissions. Please wait before submitting another score.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// Authentication rate limiter: 5 failed attempts per 15 minutes
// Protects against brute-force password attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Analytics rate limiter: 1000 events per minute per IP
// Analytics should be generous to not block legitimate gameplay
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 analytics events per minute
  message: 'Too many analytics events',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip limiting for non-analytics requests
    return !req.path.includes('/analytics');
  },
});

// API documentation notes:
// - Rate limits use IP address as identifier by default
// - For production with proxies (AWS, Heroku, Nginx), configure:
//   app.set('trust proxy', 1);
// - Consider implementing user-based rate limiting for authenticated endpoints
// - Store rate limit data in Redis for distributed systems
