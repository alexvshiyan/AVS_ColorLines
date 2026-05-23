# Rate Limiting Guide

## Overview

Rate limiting protects the API from abuse, DDoS attacks, and spam by restricting the number of requests allowed from an IP address within a time window.

## Implementation

**File:** `server/_core/rateLimiting.ts`  
**Package:** `express-rate-limit`

## Rate Limit Tiers

### 1. General API Rate Limiter
- **Window:** 1 minute
- **Limit:** 100 requests per minute per IP
- **Use case:** Default protection for all API endpoints
- **Status:** Applied globally

### 2. Leaderboard Submission Rate Limiter
- **Window:** 1 hour
- **Limit:** 10 submissions per hour per IP
- **Use case:** Prevent score spam/abuse on leaderboard
- **Status:** Applied to `/api/trpc` with priority
- **Why stricter:** Leaderboard integrity is critical

### 3. Authentication Rate Limiter
- **Window:** 15 minutes
- **Limit:** 5 attempts per 15 minutes per IP
- **Use case:** Prevent brute-force password attacks
- **Status:** Ready to apply to `/auth` routes
- **Behavior:** Only counts failed requests (skipSuccessfulRequests: true)

### 4. Analytics Rate Limiter
- **Window:** 1 minute
- **Limit:** 1000 events per minute per IP
- **Use case:** Allow high-volume analytics without blocking gameplay
- **Status:** Applied to `/api/trpc`
- **Why generous:** Analytics is non-critical, should not block game

## Configuration

All rate limiters use IP address as the key by default.

### For Production with Proxies

If deploying behind a proxy (AWS ALB, Heroku, Nginx), ensure:

```typescript
app.set('trust proxy', 1);
```

This is already configured in `server/_core/index.ts`.

### For Distributed Systems

For multiple server instances, consider using Redis to share rate limit data:

```typescript
import RedisStore from "rate-limit-redis";
import redis from "redis";

const redisClient = redis.createClient();

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:",
  }),
  // ... other options
});
```

## Response Headers

All limiters return rate limit information in response headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1234567890
```

Clients can use these headers to adapt their request rate.

## Response When Limited

When rate limit is exceeded, API returns:

**Status Code:** 429 (Too Many Requests)

**Response:**
```json
{
  "error": "Too many requests from this IP, please try again later",
  "retryAfter": 60
}
```

## Monitoring & Alerts

### Metrics to Track

1. **Rate limit hits** - How often are limits being triggered?
2. **IP addresses** - Which IPs hit limits most?
3. **Endpoints** - Which endpoints get most hits?
4. **Time patterns** - When do limits get triggered?

### Implementation

Add to analytics system:

```typescript
app.use((req, res, next) => {
  const remaining = res.getHeader('RateLimit-Remaining');
  if (remaining <= 10) {
    track('rate_limit_near_threshold', {
      ip: req.ip,
      remaining,
      path: req.path,
    });
  }
  next();
});
```

## Testing

### Local Testing

```bash
# Hit endpoint 100+ times in quick succession
for i in {1..110}; do
  curl http://localhost:3000/api/trpc/leaderboard.list
done

# Should get 429 responses after 100 requests
```

### Stress Testing

```bash
# Using Apache Bench
ab -n 200 -c 10 http://localhost:3000/api/trpc/leaderboard.list
```

## Tuning

### If Rate Limits Are Too Strict

Increase the `max` value:
```typescript
max: 200, // was 100
```

Or increase the window:
```typescript
windowMs: 120 * 1000, // was 60 seconds, now 2 minutes
```

### If Rate Limits Are Too Lenient

Decrease the `max` value or window to tighten protection.

### Per-User Rate Limiting (Future)

For authenticated endpoints, rate limit by user instead of IP:

```typescript
keyGenerator: (req) => {
  return req.user?.id || req.ip;
},
```

## Deployment Checklist

- [ ] Rate limiting middleware installed
- [ ] Rate limits configured per endpoint
- [ ] Monitoring/alerts set up
- [ ] Tested with realistic traffic
- [ ] Proxy trust configured (if using proxies)
- [ ] Redis configured (if distributed)
- [ ] Documentation updated
- [ ] Team informed of limits

## References

- [express-rate-limit docs](https://github.com/nfriedly/express-rate-limit)
- [HTTP 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
