import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/gi,
  /--/g,
  /;/g,
  /\/\*/g,
  /\*\//g,
  /xp_/gi,
  /sp_/gi,
];

const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value;

  let sanitized = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
};

const containsDangerousContent = (value: string): boolean => {
  if (typeof value !== 'string') return false;

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(value)) {
      return true;
    }
  }
  return false;
};

const containsSQLInjection = (value: string): boolean => {
  if (typeof value !== 'string') return false;

  const normalizedValue = value.toUpperCase();
  const suspiciousCount = SQL_INJECTION_PATTERNS.reduce((count, pattern) => {
    const matches = normalizedValue.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);

  return suspiciousCount >= 2;
};

const sanitizeObject = (obj: any, depth: number = 0): any => {
  if (depth > 10) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }

  return obj;
};

export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  const checkAndLog = (location: string, obj: any): boolean => {
    const stringified = JSON.stringify(obj);

    if (containsDangerousContent(stringified)) {
      logger.warn('[InputSanitizer] Dangerous content detected', {
        location,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return true;
    }

    if (containsSQLInjection(stringified)) {
      logger.warn('[InputSanitizer] Potential SQL injection detected', {
        location,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return true;
    }

    return false;
  };

  if (req.body && Object.keys(req.body).length > 0) {
    if (checkAndLog('body', req.body)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Request contains invalid or potentially dangerous content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (req.query && Object.keys(req.query).length > 0) {
    if (checkAndLog('query', req.query)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Request contains invalid or potentially dangerous content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (req.params && Object.keys(req.params).length > 0) {
    if (checkAndLog('params', req.params)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Request contains invalid or potentially dangerous content',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

export const sanitizeOutput = <T>(data: T): T => {
  return sanitizeObject(data) as T;
};

export const stripNullBytes = (req: Request, res: Response, next: NextFunction) => {
  const stripNullsInPlace = (obj: any): void => {
    if (obj === null || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string') {
        obj[key] = value.replace(/\0/g, '');
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'string') {
            value[i] = value[i].replace(/\0/g, '');
          } else if (typeof value[i] === 'object') {
            stripNullsInPlace(value[i]);
          }
        }
      } else if (typeof value === 'object') {
        stripNullsInPlace(value);
      }
      
      const cleanKey = key.replace(/\0/g, '');
      if (cleanKey !== key) {
        obj[cleanKey] = obj[key];
        delete obj[key];
      }
    }
  };

  if (req.body) stripNullsInPlace(req.body);
  if (req.query) stripNullsInPlace(req.query as Record<string, any>);
  if (req.params) stripNullsInPlace(req.params);

  next();
};

export const limitPayloadSize = (maxSize: number = 10 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);

    if (contentLength > maxSize) {
      logger.warn('[InputSanitizer] Payload too large', {
        path: req.path,
        contentLength,
        maxSize,
        ip: req.ip,
      });

      return res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};
