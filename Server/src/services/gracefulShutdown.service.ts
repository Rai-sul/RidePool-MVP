import { Server } from 'http';
import { unifiedCacheService } from './unifiedCache.service';
import { logger } from '../utils/logger';

interface ShutdownOptions {
  timeout: number;
  signals: NodeJS.Signals[];
}

type CleanupHandler = () => Promise<void>;

class GracefulShutdownService {
  private server: Server | null = null;
  private isShuttingDown = false;
  private cleanupHandlers: CleanupHandler[] = [];
  private options: ShutdownOptions;
  private activeConnections = new Set<unknown>();

  constructor() {
    this.options = {
      timeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10),
      signals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
    };
  }

  register(server: Server): void {
    this.server = server;

    server.on('connection', (connection) => {
      this.activeConnections.add(connection);
      connection.on('close', () => {
        this.activeConnections.delete(connection);
      });
    });

    for (const signal of this.options.signals) {
      process.on(signal, () => this.shutdown(signal));
    }

    process.on('uncaughtException', (error) => {
      logger.error('[Shutdown] Uncaught exception:', error);
      this.shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('[Shutdown] Unhandled rejection:', reason);
    });

    logger.info('[Shutdown] Graceful shutdown handlers registered');
  }

  addCleanupHandler(handler: CleanupHandler): void {
    this.cleanupHandlers.push(handler);
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('[Shutdown] Already shutting down, ignoring signal:', signal);
      return;
    }

    this.isShuttingDown = true;
    logger.info(`[Shutdown] ${signal} received, starting graceful shutdown`);

    const forceExitTimeout = setTimeout(() => {
      logger.error('[Shutdown] Forced shutdown after timeout');
      process.exit(1);
    }, this.options.timeout);

    try {
      if (this.server) {
        await this.closeServer();
      }

      await this.runCleanupHandlers();

      await this.closeCache();

      clearTimeout(forceExitTimeout);
      logger.info('[Shutdown] Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('[Shutdown] Error during shutdown:', error);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  }

  private closeServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      logger.info('[Shutdown] Stopping HTTP server...');
      logger.info(`[Shutdown] ${this.activeConnections.size} active connections`);

      this.server.close((err) => {
        if (err) {
          logger.error('[Shutdown] Error closing server:', err);
          reject(err);
        } else {
          logger.info('[Shutdown] HTTP server closed');
          resolve();
        }
      });

      const connectionTimeout = setTimeout(() => {
        logger.warn('[Shutdown] Force closing remaining connections');
        for (const connection of this.activeConnections) {
          (connection as { destroy?: () => void }).destroy?.();
        }
      }, 10000);

      this.server.on('close', () => clearTimeout(connectionTimeout));
    });
  }

  private async runCleanupHandlers(): Promise<void> {
    logger.info(`[Shutdown] Running ${this.cleanupHandlers.length} cleanup handlers`);

    for (const handler of this.cleanupHandlers) {
      try {
        await handler();
      } catch (error) {
        logger.error('[Shutdown] Cleanup handler error:', error);
      }
    }
  }

  private async closeCache(): Promise<void> {
    try {
      await unifiedCacheService.disconnect();
      logger.info('[Shutdown] Cache disconnected');
    } catch (error) {
      logger.error('[Shutdown] Error disconnecting cache:', error);
    }
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  getActiveConnections(): number {
    return this.activeConnections.size;
  }
}

export const gracefulShutdownService = new GracefulShutdownService();
