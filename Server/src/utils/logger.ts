import winston from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: LogContext;
  error?: string | Error;
  stack?: string;
}

/**
 * Create a Winston logger instance with structured logging
 */
const createLogger = (): winston.Logger => {
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();

  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: 'ridepool-backend' },
    transports: [
      // Console transport with colors
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, context, error }) => {
            const contextStr = context && Object.keys(context).length 
              ? ` ${JSON.stringify(context)}` 
              : '';
            const errorStr = error 
              ? `\n${typeof error === 'string' ? error : (error as Error).message}` 
              : '';
            return `${timestamp} [${service}] ${level}: ${message}${contextStr}${errorStr}`;
          })
        ),
      }),

      // File transport for errors
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),

      // File transport for all logs
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
    ],
  });
};

export const logger = createLogger();

/**
 * Structured logging helper functions
 */
export const loggerHelper = {
  info: (service: string, message: string, context?: LogContext) => {
    logger.info(message, { service, context });
  },

  error: (service: string, message: string, error?: Error | string, context?: LogContext) => {
    const errorMsg = typeof error === 'string' ? error : error?.message || '';
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error(message, { service, context, error: errorMsg, stack });
  },

  warn: (service: string, message: string, context?: LogContext) => {
    logger.warn(message, { service, context });
  },

  debug: (service: string, message: string, context?: LogContext) => {
    logger.debug(message, { service, context });
  },

  poolMatching: (message: string, context?: LogContext) => {
    loggerHelper.info('[PoolMatching]', message, context);
  },

  driverSearch: (message: string, context?: LogContext) => {
    loggerHelper.info('[DriverSearch]', message, context);
  },

  rideCreation: (message: string, context?: LogContext) => {
    loggerHelper.info('[RideCreation]', message, context);
  },

  h3Utils: (message: string, context?: LogContext) => {
    loggerHelper.debug('[H3Utils]', message, context);
  },
};
