/**
 * Centralized Configuration Module
 *
 * Manages all environment variables and application configuration.
 * Provides type-safe access to configuration values with defaults.
 */

import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

/**
 * Server configuration
 */
export const serverConfig = {
  /** Server port number */
  port: parseInt(process.env.PORT || '3000', 10),

  /** Node environment (development/production) */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Whether running in production mode */
  isProduction: process.env.NODE_ENV === 'production',

  /** Whether running in development mode */
  isDevelopment: process.env.NODE_ENV !== 'production',
} as const;

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  /** Time window for rate limiting in milliseconds (default: 15 minutes) */
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),

  /** Maximum requests per window per IP (default: 10) */
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
} as const;

/**
 * Audit configuration
 */
export const auditConfig = {
  /** Default maximum pages to scan */
  maxPagesDefault: parseInt(process.env.MAX_PAGES_DEFAULT || '50', 10),

  /** Absolute maximum pages allowed per scan */
  maxPagesLimit: parseInt(process.env.MAX_PAGES_LIMIT || '100', 10),

  /** Timeout for page navigation in milliseconds */
  crawlTimeoutMs: parseInt(process.env.CRAWL_TIMEOUT_MS || '45000', 10),

  /** Number of parallel page audits */
  auditConcurrency: parseInt(process.env.AUDIT_CONCURRENCY || '3', 10),

  /** Wait time for dynamic content in milliseconds */
  contentWaitMs: parseInt(process.env.CONTENT_WAIT_MS || '2000', 10),

  /** Wait time for axe-core initialization in milliseconds */
  axeInitWaitMs: parseInt(process.env.AXE_INIT_WAIT_MS || '500', 10),
} as const;

/**
 * Job management configuration
 */
export const jobConfig = {
  /** Interval for cleaning up old jobs in milliseconds (default: 10 minutes) */
  cleanupIntervalMs: parseInt(process.env.JOB_CLEANUP_INTERVAL_MS || '600000', 10),

  /** Maximum age of jobs before cleanup in milliseconds (default: 1 hour) */
  maxAgeMs: parseInt(process.env.JOB_MAX_AGE_MS || '3600000', 10),
} as const;

/**
 * Logging configuration
 */
export const loggingConfig = {
  /** Log level (debug/info/warn/error) */
  level: process.env.LOG_LEVEL || (serverConfig.isProduction ? 'info' : 'debug'),

  /** Whether to enable console logging */
  enableConsole: process.env.LOG_CONSOLE !== 'false',

  /** Whether to enable JSON formatted logs */
  enableJson: process.env.LOG_JSON === 'true',
} as const;

/**
 * Complete application configuration
 */
export const config = {
  server: serverConfig,
  rateLimit: rateLimitConfig,
  audit: auditConfig,
  job: jobConfig,
  logging: loggingConfig,
} as const;

/**
 * Validates configuration values
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate server config
  if (serverConfig.port < 1 || serverConfig.port > 65535) {
    errors.push(`Invalid PORT: ${serverConfig.port} (must be 1-65535)`);
  }

  // Validate rate limit config
  if (rateLimitConfig.windowMs < 1000) {
    errors.push(`Invalid RATE_LIMIT_WINDOW_MS: ${rateLimitConfig.windowMs} (must be >= 1000)`);
  }
  if (rateLimitConfig.maxRequests < 1) {
    errors.push(`Invalid RATE_LIMIT_MAX_REQUESTS: ${rateLimitConfig.maxRequests} (must be >= 1)`);
  }

  // Validate audit config
  if (auditConfig.maxPagesDefault < 1 || auditConfig.maxPagesDefault > auditConfig.maxPagesLimit) {
    errors.push(`Invalid MAX_PAGES_DEFAULT: ${auditConfig.maxPagesDefault} (must be 1-${auditConfig.maxPagesLimit})`);
  }
  if (auditConfig.maxPagesLimit < 1 || auditConfig.maxPagesLimit > 1000) {
    errors.push(`Invalid MAX_PAGES_LIMIT: ${auditConfig.maxPagesLimit} (must be 1-1000)`);
  }
  if (auditConfig.crawlTimeoutMs < 5000 || auditConfig.crawlTimeoutMs > 300000) {
    errors.push(`Invalid CRAWL_TIMEOUT_MS: ${auditConfig.crawlTimeoutMs} (must be 5000-300000)`);
  }
  if (auditConfig.auditConcurrency < 1 || auditConfig.auditConcurrency > 10) {
    errors.push(`Invalid AUDIT_CONCURRENCY: ${auditConfig.auditConcurrency} (must be 1-10)`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Prints current configuration (safe for logging - no secrets)
 */
export function printConfig(): void {
  console.log('='.repeat(60));
  console.log('Application Configuration');
  console.log('='.repeat(60));
  console.log(`Environment: ${serverConfig.nodeEnv}`);
  console.log(`Port: ${serverConfig.port}`);
  console.log(`Max Pages (Default): ${auditConfig.maxPagesDefault}`);
  console.log(`Max Pages (Limit): ${auditConfig.maxPagesLimit}`);
  console.log(`Audit Concurrency: ${auditConfig.auditConcurrency}`);
  console.log(`Rate Limit: ${rateLimitConfig.maxRequests} requests / ${rateLimitConfig.windowMs / 1000}s`);
  console.log(`Job Cleanup: Every ${jobConfig.cleanupIntervalMs / 60000} minutes`);
  console.log(`Log Level: ${loggingConfig.level}`);
  console.log('='.repeat(60));
}

// Validate configuration on module load
if (process.env.SKIP_CONFIG_VALIDATION !== 'true') {
  validateConfig();
}

export default config;
