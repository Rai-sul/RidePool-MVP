import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger';

type AsyncFunction<T> = (...args: unknown[]) => Promise<T>;

interface CircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
}

interface BreakerStats {
  name: string;
  state: string;
  stats: {
    fires: number;
    successes: number;
    failures: number;
    rejects: number;
    timeouts: number;
    fallbacks: number;
  };
}

const defaultConfig: CircuitBreakerConfig = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

class CircuitBreakerService {
  private breakers: Map<string, CircuitBreaker> = new Map();

  create<T>(
    name: string,
    action: AsyncFunction<T>,
    fallback?: AsyncFunction<T>,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (this.breakers.has(name)) {
      return this.breakers.get(name) as CircuitBreaker;
    }

    const options = {
      ...defaultConfig,
      ...config,
      name,
    };

    const breaker = new CircuitBreaker(action, options);

    breaker.on('open', () => {
      logger.warn(`[CircuitBreaker] ${name} opened - too many failures`);
    });

    breaker.on('halfOpen', () => {
      logger.info(`[CircuitBreaker] ${name} half-open - testing recovery`);
    });

    breaker.on('close', () => {
      logger.info(`[CircuitBreaker] ${name} closed - service recovered`);
    });

    breaker.on('fallback', () => {
      logger.debug(`[CircuitBreaker] ${name} fallback executed`);
    });

    breaker.on('timeout', () => {
      logger.warn(`[CircuitBreaker] ${name} timeout`);
    });

    breaker.on('reject', () => {
      logger.warn(`[CircuitBreaker] ${name} rejected - circuit open`);
    });

    if (fallback) {
      breaker.fallback(fallback);
    }

    this.breakers.set(name, breaker);
    return breaker;
  }

  async fire<T>(name: string, ...args: unknown[]): Promise<T> {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker '${name}' not found`);
    }
    return breaker.fire(...args) as Promise<T>;
  }

  getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getStats(name: string): BreakerStats | null {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;

    const stats = breaker.stats;
    return {
      name,
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      stats: {
        fires: stats.fires,
        successes: stats.successes,
        failures: stats.failures,
        rejects: stats.rejects,
        timeouts: stats.timeouts,
        fallbacks: stats.fallbacks,
      },
    };
  }

  getAllStats(): BreakerStats[] {
    const allStats: BreakerStats[] = [];
    for (const name of this.breakers.keys()) {
      const stats = this.getStats(name);
      if (stats) allStats.push(stats);
    }
    return allStats;
  }

  shutdown(): void {
    for (const breaker of this.breakers.values()) {
      breaker.shutdown();
    }
    this.breakers.clear();
    logger.info('[CircuitBreaker] All breakers shut down');
  }
}

export const circuitBreakerService = new CircuitBreakerService();

export function withCircuitBreaker<T>(
  name: string,
  action: AsyncFunction<T>,
  fallback?: AsyncFunction<T>,
  config?: Partial<CircuitBreakerConfig>
): AsyncFunction<T> {
  const breaker = circuitBreakerService.create(name, action, fallback, config);
  return (...args: unknown[]) => breaker.fire(...args) as Promise<T>;
}
