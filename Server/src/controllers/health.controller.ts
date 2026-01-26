import { Request, Response, Router } from 'express';
import { supabase } from '../config/supabase';
import { unifiedCacheService } from '../services/unifiedCache.service';
import { gracefulShutdownService } from '../services/gracefulShutdown.service';
import { logger } from '../utils/logger';
import { config } from '../config/env';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  mvpMode: boolean;
  dependencies: {
    supabase: DependencyStatus;
    cache: DependencyStatus;
    googleMaps?: DependencyStatus;
  };
  metrics?: {
    activeConnections: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

interface DependencyStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency_ms?: number;
  message?: string;
}

const startTime = Date.now();

async function checkSupabase(): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error && !error.message.includes('no rows')) {
      return {
        status: 'unhealthy',
        latency_ms: Date.now() - start,
        message: error.message,
      };
    }

    return {
      status: 'healthy',
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

async function checkCache(): Promise<DependencyStatus> {
  const start = Date.now();

  if (!unifiedCacheService.isReady()) {
    return {
      status: 'degraded',
      message: config.mvpMode ? 'Memory cache not ready' : 'Redis not connected (caching disabled)',
    };
  }

  try {
    const testKey = 'health:ping';
    await unifiedCacheService.set(testKey, { timestamp: Date.now() }, 5);
    const result = await unifiedCacheService.get(testKey);

    if (result) {
      return {
        status: 'healthy',
        latency_ms: Date.now() - start,
        message: config.mvpMode ? 'In-memory cache (MVP mode)' : undefined,
      };
    }

    return {
      status: 'degraded',
      latency_ms: Date.now() - start,
      message: 'Cache read/write test failed',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Cache error',
    };
  }
}

function getOverallStatus(
  dependencies: HealthStatus['dependencies']
): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(dependencies).map((d) => d.status);

  if (statuses.includes('unhealthy')) {
    if (dependencies.supabase.status === 'unhealthy') {
      return 'unhealthy';
    }
    return 'degraded';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

export const healthController = {
  async liveness(req: Request, res: Response): Promise<void> {
    if (gracefulShutdownService.isShutdownInProgress()) {
      res.status(503).json({
        status: 'shutting_down',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  },

  async readiness(req: Request, res: Response): Promise<void> {
    if (gracefulShutdownService.isShutdownInProgress()) {
      res.status(503).json({
        status: 'shutting_down',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const [supabaseStatus, cacheStatus] = await Promise.all([
      checkSupabase(),
      checkCache(),
    ]);

    const dependencies = {
      supabase: supabaseStatus,
      cache: cacheStatus,
    };

    const overallStatus = getOverallStatus(dependencies);
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      dependencies,
    });
  },

  async detailed(req: Request, res: Response): Promise<void> {
    const [supabaseStatus, cacheStatus] = await Promise.all([
      checkSupabase(),
      checkCache(),
    ]);

    const dependencies = {
      supabase: supabaseStatus,
      cache: cacheStatus,
    };

    const overallStatus = getOverallStatus(dependencies);
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      mvpMode: config.mvpMode,
      dependencies,
      metrics: {
        activeConnections: gracefulShutdownService.getActiveConnections(),
        memoryUsage: process.memoryUsage(),
      },
    };

    if (overallStatus !== 'healthy') {
      logger.warn('[Health] Degraded health status:', {
        status: overallStatus,
        dependencies,
      });
    }

    res.status(statusCode).json(healthStatus);
  },

  async cacheStats(req: Request, res: Response): Promise<void> {
    const stats = unifiedCacheService.getStats();
    res.json({
      cache: stats,
      hitRate: stats.hits > 0 || stats.misses > 0
        ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) + '%'
        : 'N/A',
    });
  },
};

export const healthRoutes = Router();

healthRoutes.get('/health', healthController.readiness);
healthRoutes.get('/health/live', healthController.liveness);
healthRoutes.get('/health/ready', healthController.readiness);
healthRoutes.get('/health/detailed', healthController.detailed);
healthRoutes.get('/health/cache', healthController.cacheStats);
