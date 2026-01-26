import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger';

interface QueueConfig {
  connection: {
    host: string;
    port: number;
  };
  defaultJobOptions?: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: boolean | number;
    removeOnFail: boolean | number;
  };
}

type JobProcessor<T, R> = (job: Job<T>) => Promise<R>;

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

class MessageQueueService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private config: QueueConfig;
  private isInitialized = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    this.config = {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.createQueue('notifications');
      await this.createQueue('payments');
      await this.createQueue('analytics');
      await this.createQueue('driver-matching');

      this.isInitialized = true;
      logger.info('[MessageQueue] Initialized successfully');
    } catch (error) {
      logger.error('[MessageQueue] Failed to initialize:', error);
    }
  }

  async createQueue(name: string): Promise<Queue> {
    if (this.queues.has(name)) {
      return this.queues.get(name) as Queue;
    }

    const queue = new Queue(name, {
      connection: this.config.connection,
      defaultJobOptions: this.config.defaultJobOptions,
    });

    this.queues.set(name, queue);
    logger.info(`[MessageQueue] Queue '${name}' created`);

    return queue;
  }

  registerProcessor<T, R>(
    queueName: string,
    processor: JobProcessor<T, R>,
    concurrency = 5
  ): Worker {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName) as Worker;
    }

    const worker = new Worker<T, R>(
      queueName,
      async (job) => {
        logger.debug(`[MessageQueue] Processing job ${job.id} in ${queueName}`);
        return processor(job);
      },
      {
        connection: this.config.connection,
        concurrency,
      }
    );

    worker.on('completed', (job) => {
      logger.debug(`[MessageQueue] Job ${job.id} completed in ${queueName}`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`[MessageQueue] Job ${job?.id} failed in ${queueName}:`, error);
    });

    worker.on('error', (error) => {
      logger.error(`[MessageQueue] Worker error in ${queueName}:`, error);
    });

    this.workers.set(queueName, worker);
    logger.info(`[MessageQueue] Worker registered for '${queueName}'`);

    return worker;
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
  ): Promise<Job<T> | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      logger.error(`[MessageQueue] Queue '${queueName}' not found`);
      return null;
    }

    try {
      const job = await queue.add(jobName, data, {
        delay: options?.delay,
        priority: options?.priority,
        attempts: options?.attempts || this.config.defaultJobOptions?.attempts,
      });

      logger.debug(`[MessageQueue] Job ${job.id} added to ${queueName}`);
      return job;
    } catch (error) {
      logger.error(`[MessageQueue] Failed to add job to ${queueName}:`, error);
      return null;
    }
  }

  async getQueueStats(queueName: string): Promise<QueueStats | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async getAllStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];
    for (const name of this.queues.keys()) {
      const queueStats = await this.getQueueStats(name);
      if (queueStats) stats.push(queueStats);
    }
    return stats;
  }

  async shutdown(): Promise<void> {
    logger.info('[MessageQueue] Shutting down...');

    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.debug(`[MessageQueue] Worker '${name}' closed`);
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.debug(`[MessageQueue] Queue '${name}' closed`);
    }

    this.workers.clear();
    this.queues.clear();
    this.isInitialized = false;
    logger.info('[MessageQueue] Shutdown complete');
  }
}

export const messageQueueService = new MessageQueueService();

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
