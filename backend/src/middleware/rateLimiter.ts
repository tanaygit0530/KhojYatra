import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '@khojyatra/types';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private message: string;
  private keyGenerator: (req: Request) => string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.message = options.message || 'Too many requests. Please slow down and try again.';
    this.keyGenerator = options.keyGenerator || ((req: Request) => {
      // Key by userId, sessionId, or IP
      return (
        req.khojContext?.userId ||
        req.khojContext?.sessionId ||
        req.ip ||
        (req.headers['x-forwarded-for'] as string) ||
        'global'
      );
    });

    // Periodically clean up stale keys every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  public middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = this.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requests.get(key) || [];
    // Filter out timestamps outside current sliding window
    timestamps = timestamps.filter(ts => ts > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + this.windowMs - now) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');

      return res.status(429).json(
        createErrorResponse('RATE_LIMIT_EXCEEDED', this.message, {
          retryAfterSeconds,
          limit: this.maxRequests,
          windowMs: this.windowMs
        })
      );
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (this.maxRequests - timestamps.length).toString());

    return next();
  };

  public resetKey(key: string): void {
    this.requests.delete(key);
  }

  public resetAll(): void {
    this.requests.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const active = timestamps.filter(ts => ts > windowStart);
      if (active.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, active);
      }
    }
  }
}

// Preset Limiters
export const searchRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Search rate limit reached (60 requests/min). Please try again shortly.'
}).middleware;

export const bookingRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Booking request threshold exceeded (30 requests/min).'
}).middleware;

export const intakeRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Natural language parsing rate limit reached (30 requests/min).'
}).middleware;
