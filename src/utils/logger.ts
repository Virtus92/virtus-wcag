/**
 * Simple logging utility
 *
 * Provides structured logging with different log levels and optional JSON formatting.
 */

import { loggingConfig } from '../config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

function shouldLog(level: LogLevel): boolean {
  const currentLevel = LOG_LEVEL_MAP[loggingConfig.level] ?? LogLevel.INFO;
  return loggingConfig.enableConsole && currentLevel <= level;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
}

function formatLogEntry(level: string, message: string, context?: Record<string, any>): string {
  if (loggingConfig.enableJson) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };
    return JSON.stringify(entry);
  } else {
    const timestamp = new Date().toLocaleTimeString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${contextStr}`;
  }
}

export const logger = {
  /**
   * Logs debug messages (only in development)
   */
  debug(message: string, context?: Record<string, any>): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.log(formatLogEntry('debug', message, context));
    }
  },

  /**
   * Logs informational messages
   */
  info(message: string, context?: Record<string, any>): void {
    if (shouldLog(LogLevel.INFO)) {
      console.log(formatLogEntry('info', message, context));
    }
  },

  /**
   * Logs warning messages
   */
  warn(message: string, context?: Record<string, any>): void {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(formatLogEntry('warn', message, context));
    }
  },

  /**
   * Logs error messages
   */
  error(message: string, error?: Error | any, context?: Record<string, any>): void {
    if (shouldLog(LogLevel.ERROR)) {
      const errorContext = error
        ? {
            ...context,
            error: {
              message: error.message || error,
              stack: error.stack,
              ...error,
            },
          }
        : context;
      console.error(formatLogEntry('error', message, errorContext));
    }
  },
};

export default logger;
