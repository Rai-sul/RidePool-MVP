import { logger } from '../utils/logger';

type JobProcessor<T, R> = (job: { id: string; data: T }) => Promise<R>;

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface SyncJob {
  id: string;
  name: string;
  data: unknown;
  processor?: JobProcessor<unknown, unknown>;
}

class SyncMessageQueueService {
  private queues: Map<string, SyncJob[]> = new Map();
  private processors: Map<string, JobProcessor<unknown, unknown>> = new Map();
  private stats: Map<string, QueueStats> = new Map();
  private jobCounter = 0;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.createQueue('notifications');
    this.createQueue('payments');
    this.createQueue('analytics');
    this.createQueue('driver-matching');

    this.isInitialized = true;
    logger.info('[SyncQueue] Initialized (MVP synchronous mode)');
  }

  createQueue(name: string): void {
    if (this.queues.has(name)) return;

    this.queues.set(name, []);
    this.stats.set(name, {
      name,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    });
    logger.debug(`[SyncQueue] Queue '${name}' created`);
  }

  registerProcessor<T, R>(
    queueName: string,
    processor: JobProcessor<T, R>,
    _concurrency = 1
  ): void {
    this.processors.set(queueName, processor as JobProcessor<unknown, unknown>);
    logger.debug(`[SyncQueue] Processor registered for '${queueName}'`);
  }

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    }
  ): Promise<{ id: string; data: T } | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      logger.error(`[SyncQueue] Queue '${queueName}' not found`);
      return null;
    }

    this.jobCounter++;
    const jobId = `sync-${this.jobCounter}-${Date.now()}`;

    const job = { id: jobId, name: jobName, data };

    const processor = this.processors.get(queueName);
    if (processor) {
      const stats = this.stats.get(queueName);
      if (stats) stats.active++;

      try {
        if (options?.delay && options.delay > 0) {
          setTimeout(async () => {
            try {
              await processor({ id: jobId, data });
              if (stats) {
                stats.active--;
                stats.completed++;
              }
            } catch (error) {
              logger.error(`[SyncQueue] Job ${jobId} failed:`, error);
              if (stats) {
                stats.active--;
                stats.failed++;
              }
            }
          }, options.delay);
        } else {
          await processor({ id: jobId, data });
          if (stats) {
            stats.active--;
            stats.completed++;
          }
        }
      } catch (error) {
        logger.error(`[SyncQueue] Job ${jobId} failed:`, error);
        if (stats) {
          stats.active--;
          stats.failed++;
        }
      }
    } else {
      const stats = this.stats.get(queueName);
      if (stats) stats.waiting++;
      queue.push(job);
      logger.warn(`[SyncQueue] No processor for '${queueName}', job queued`);
    }

    logger.debug(`[SyncQueue] Job ${jobId} processed in ${queueName}`);
    return { id: jobId, data };
  }

  async getQueueStats(queueName: string): Promise<QueueStats | null> {
    return this.stats.get(queueName) || null;
  }

  async getAllStats(): Promise<QueueStats[]> {
    return Array.from(this.stats.values());
  }

  async shutdown(): Promise<void> {
    logger.info('[SyncQueue] Shutting down...');
    this.queues.clear();
    this.processors.clear();
    this.stats.clear();
    this.isInitialized = false;
    logger.info('[SyncQueue] Shutdown complete');
  }
}

export const syncMessageQueueService = new SyncMessageQueueService();

export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PaymentJob {
  paymentId: string;
  userId: string;
  amount: number;
  method: string;
  rideId: string;
}

export interface AnalyticsJob {
  event: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface DriverMatchingJob {
  poolId: string;
  location: { lat: number; lng: number };
  vehicleType: string;
  maxDistance: number;
}
