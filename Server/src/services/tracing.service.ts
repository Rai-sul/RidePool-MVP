import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, unknown>;
  status: 'ok' | 'error' | 'unset';
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
}

const TRACE_HEADER = 'x-trace-id';
const SPAN_HEADER = 'x-span-id';
const PARENT_SPAN_HEADER = 'x-parent-span-id';

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function generateTraceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

class TracingService {
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];
  private maxCompletedSpans = 1000;
  private sampleRate: number;

  constructor() {
    this.sampleRate = parseFloat(process.env.TRACE_SAMPLE_RATE || '0.1');
  }

  extractContext(req: Request): TraceContext {
    const traceId = (req.headers[TRACE_HEADER] as string) || generateTraceId();
    const parentSpanId = req.headers[SPAN_HEADER] as string | undefined;
    const spanId = generateId();

    const sampled = Math.random() < this.sampleRate;

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled,
    };
  }

  injectContext(res: Response, context: TraceContext): void {
    res.setHeader(TRACE_HEADER, context.traceId);
    res.setHeader(SPAN_HEADER, context.spanId);
  }

  startSpan(name: string, context: TraceContext, attributes?: Record<string, unknown>): Span {
    const span: Span = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      name,
      startTime: Date.now(),
      attributes: attributes || {},
      status: 'unset',
      events: [],
    };

    this.activeSpans.set(span.spanId, span);
    return span;
  }

  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): Span | null {
    const span = this.activeSpans.get(spanId);
    if (!span) return null;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    if (this.completedSpans.length > this.maxCompletedSpans) {
      this.completedSpans.shift();
    }

    if (span.duration > 1000) {
      logger.warn(`[Tracing] Slow span: ${span.name} took ${span.duration}ms`, {
        traceId: span.traceId,
        spanId: span.spanId,
      });
    }

    return span;
  }

  addSpanEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  setSpanAttribute(spanId: string, key: string, value: unknown): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.attributes[key] = value;
  }

  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values());
  }

  getRecentSpans(limit = 100): Span[] {
    return this.completedSpans.slice(-limit);
  }

  getSpansByTraceId(traceId: string): Span[] {
    return this.completedSpans.filter((span) => span.traceId === traceId);
  }

  getStats(): {
    activeSpans: number;
    completedSpans: number;
    sampleRate: number;
    avgDuration: number;
    slowSpans: number;
  } {
    const durations = this.completedSpans
      .filter((s) => s.duration !== undefined)
      .map((s) => s.duration as number);

    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const slowSpans = durations.filter((d) => d > 1000).length;

    return {
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.length,
      sampleRate: this.sampleRate,
      avgDuration: Math.round(avgDuration),
      slowSpans,
    };
  }
}

export const tracingService = new TracingService();

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const context = tracingService.extractContext(req);

  (req as Request & { traceContext?: TraceContext }).traceContext = context;
  tracingService.injectContext(res, context);

  if (!context.sampled) {
    next();
    return;
  }

  const span = tracingService.startSpan(`${req.method} ${req.path}`, context, {
    'http.method': req.method,
    'http.url': req.originalUrl,
    'http.user_agent': req.get('User-Agent'),
    'http.client_ip': req.ip,
    'user.id': (req as unknown as { user?: { id: string } }).user?.id,
  });

  res.on('finish', () => {
    tracingService.setSpanAttribute(span.spanId, 'http.status_code', res.statusCode);
    tracingService.endSpan(span.spanId, res.statusCode >= 400 ? 'error' : 'ok');
  });

  next();
};

export function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  traceContext?: TraceContext
): Promise<T> {
  const context = traceContext || {
    traceId: generateTraceId(),
    spanId: generateId(),
    sampled: Math.random() < 0.1,
  };

  if (!context.sampled) {
    return fn();
  }

  const span = tracingService.startSpan(name, context);

  return fn()
    .then((result) => {
      tracingService.endSpan(span.spanId, 'ok');
      return result;
    })
    .catch((error) => {
      tracingService.setSpanAttribute(span.spanId, 'error.message', error.message);
      tracingService.endSpan(span.spanId, 'error');
      throw error;
    });
}
