import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

const createLimitHandler = (limitType: string) => {
  return (req: Request, res: Response) => {
    logger.warn(`[RateLimiter] ${limitType} limit exceeded`, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retry_after_seconds: 60,
      },
      timestamp: new Date().toISOString(),
    });
  };
};

export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 100 : 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  handler: createLimitHandler('API'),
  skip: (req) => req.path === '/health',
});

export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 5 : 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait before trying again.',
    },
  },
  handler: createLimitHandler('Auth'),
  skipSuccessfulRequests: false,
});

export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProduction ? 3 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts. Please try again in an hour.',
    },
  },
  handler: createLimitHandler('PasswordReset'),
});

export const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 30 : 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests. Please slow down.',
    },
  },
  handler: createLimitHandler('Search'),
});

export const paymentLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 10 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
      message: 'Too many payment attempts. Please wait.',
    },
  },
  handler: createLimitHandler('Payment'),
});

export const sosLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 5 : 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SOS_RATE_LIMIT_EXCEEDED',
      message: 'SOS request limit reached.',
    },
  },
  handler: createLimitHandler('SOS'),
});
