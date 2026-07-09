import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import routes from './routes';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './middleware/errorHandler';
import { configureSecurityHeaders } from './middleware/securityHeaders';
import { apiLimiter, authLimiter, searchLimiter, paymentLimiter } from './middleware/rateLimiter';
import { inputSanitizer, stripNullBytes } from './middleware/inputSanitizer';
import { logger } from './utils/logger';
import { unifiedCacheService } from './services/unifiedCache.service';
import { gracefulShutdownService } from './services/gracefulShutdown.service';
import { config } from './config/env';

dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

configureSecurityHeaders(app);

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

app.use(cors({
  origin: isProduction 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://ridepool.app']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
  credentials: true,
  maxAge: 86400,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use(stripNullBytes);
app.use(inputSanitizer);

app.use(healthRoutes);

app.use('/api', apiLimiter);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use('/api/pools/search', searchLimiter);

app.use('/api/payments', paymentLimiter);
app.use('/api/wallet', paymentLimiter);

app.use('/api', routes);

app.use(errorHandler);

async function startServer() {
  try {
    await unifiedCacheService.connect();
    if (config.mvpMode) {
      logger.info('Running in MVP mode (in-memory cache, synchronous processing)');
    } else {
      logger.info('Redis cache connected');
    }
  } catch (error) {
    logger.warn('Cache unavailable, running without cache:', error);
  }

  const HOST = process.env.HOST || '0.0.0.0';
  const server = app.listen(PORT, HOST, () => {
    logger.info(`Server running on ${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`MVP Mode: ${config.mvpMode ? 'enabled' : 'disabled'}`);
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });

  gracefulShutdownService.register(server);
}

startServer();

export default app;
