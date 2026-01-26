import helmet from 'helmet';
import { Express } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

export const configureSecurityHeaders = (app: Express): void => {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.supabase.co', 'wss://realtime.supabase.co'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
        reportOnly: !isProduction,
      },
      strictTransportSecurity: isProduction
        ? {
            maxAge: 63072000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xFrameOptions: { action: 'deny' },
      xContentTypeOptions: true,
      xDnsPrefetchControl: { allow: false },
      xDownloadOptions: true,
      xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
      xPoweredBy: false,
      xXssProtection: false,
    })
  );

  app.use((req, res, next) => {
    res.setHeader('X-Request-Id', req.headers['x-request-id'] || generateRequestId());
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    if (isProduction) {
      res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
    }

    next();
  });
};

const generateRequestId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getRequestId = (req: { headers: { 'x-request-id'?: string } }): string => {
  return (req.headers['x-request-id'] as string) || 'unknown';
};
