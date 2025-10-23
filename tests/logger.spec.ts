import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function importLogger() {
  const mod = await import('../src/utils/logger');
  return mod.logger;
}

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    SKIP_CONFIG_VALIDATION: 'true',
  } as NodeJS.ProcessEnv;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
  vi.restoreAllMocks();
});

describe('logger utility', () => {
  it('emits JSON formatted debug logs when enabled', async () => {
    Object.assign(process.env, {
      LOG_LEVEL: 'debug',
      LOG_JSON: 'true',
      LOG_CONSOLE: 'true',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = await importLogger();

    logger.debug('hello world', { feature: 'json' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0]);
    expect(payload.level).toBe('debug');
    expect(payload.message).toBe('hello world');
    expect(payload.context?.feature).toBe('json');
  });

  it('suppresses logs when console logging disabled', async () => {
    Object.assign(process.env, {
      LOG_LEVEL: 'debug',
      LOG_CONSOLE: 'false',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = await importLogger();

    logger.info('should not log');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('suppresses debug logs when level is higher', async () => {
    Object.assign(process.env, {
      LOG_LEVEL: 'error',
      LOG_CONSOLE: 'true',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = await importLogger();

    logger.debug('filtered');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs human-readable info and warn entries', async () => {
    Object.assign(process.env, {
      LOG_LEVEL: 'debug',
      LOG_JSON: 'false',
      LOG_CONSOLE: 'true',
    });

    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logger = await importLogger();

    logger.info('plain info', { code: 200 });
    logger.warn('plain warn', { code: 499 });
    logger.info('no context');

    expect(infoSpy).toHaveBeenCalled();
    expect(infoSpy.mock.calls[0][0]).toMatch(/INFO/);
    expect(infoSpy.mock.calls[0][0]).toContain('code');
    expect(infoSpy.mock.calls[infoSpy.mock.calls.length - 1][0]).toMatch(/INFO/);

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/WARN/);
  });

  it('logs error details with merged context', async () => {
    Object.assign(process.env, {
      LOG_LEVEL: 'debug',
      LOG_JSON: 'false',
      LOG_CONSOLE: 'true',
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = await importLogger();

    const err = new Error('boom');
    err.stack = 'stack';

    logger.error('failure', err, { feature: 'merge' });
    expect(errorSpy).toHaveBeenCalled();
    const payload = errorSpy.mock.calls[0][0];
    expect(payload).toContain('failure');
    expect(payload).toContain('merge');
    expect(payload).toContain('boom');
  });

  it('logs error message even without error object', async () => {
    Object.assign(process.env, {
      LOG_LEVEL: 'debug',
      LOG_JSON: 'true',
      LOG_CONSOLE: 'true',
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = await importLogger();

    logger.error('only message', undefined, { scope: 'test' });
    expect(errorSpy).toHaveBeenCalled();
    const payload = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(payload.level).toBe('error');
    expect(payload.message).toBe('only message');
    expect(payload.context).toBeDefined();
  });

  it('falls back to info level when log level is unknown', async () => {
    Object.assign(process.env, {
      LOG_LEVEL: 'verbose',
      LOG_JSON: 'false',
      LOG_CONSOLE: 'true',
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = await importLogger();

    logger.info('fallback level');
    expect(logSpy).toHaveBeenCalled();
  });
});
