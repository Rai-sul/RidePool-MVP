import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import type { core } from 'zod';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

const sanitizeErrorMessage = (message: string): string => {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /credential/i,
    /authorization/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return 'An error occurred while processing your request';
    }
  }

  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
    return 'Service temporarily unavailable';
  }

  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    return 'A record with this information already exists';
  }

  return message;
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ZodError) {
    const errors = err.issues.map((e: core.$ZodIssue) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { errors },
      },
      timestamp: new Date().toISOString(),
    });
  }

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const errorCode = err.code || 'INTERNAL_ERROR';
  const publicMessage =
    statusCode === 500
      ? 'Internal server error'
      : sanitizeErrorMessage(err.message || 'An error occurred');

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: publicMessage,
    },
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        originalMessage: err.message,
        stack: err.stack,
      },
    }),
  });
};