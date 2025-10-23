import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const expectInvalid = (fn: () => void, pattern: RegExp) => {
  try {
    fn();
    throw new Error('Expected validateConfig to throw');
  } catch (error: any) {
    expect(String(error.message)).toMatch(pattern);
  }
};

beforeEach(() => {
  vi.resetModules();
  vi.doMock('dotenv', () => ({ config: vi.fn() }));
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
  vi.restoreAllMocks();
  vi.doUnmock('dotenv');
});

describe('config module', () => {
  it('exposes sane defaults when validation is skipped', async () => {
    process.env = {
      SKIP_CONFIG_VALIDATION: 'true',
    } as NodeJS.ProcessEnv;

    const mod = await import('../src/config');
    expect(mod.serverConfig.port).toBeGreaterThan(0);
    expect(mod.auditConfig.maxPagesDefault).toBeGreaterThan(0);
    expect(mod.rateLimitConfig.windowMs).toBeGreaterThan(0);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mod.printConfig();
    expect(spy).toHaveBeenCalled();
  });

  it('validateConfig covers valid and invalid scenarios', async () => {
    process.env = {
      SKIP_CONFIG_VALIDATION: 'true',
      PORT: '3000',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '10',
      MAX_PAGES_DEFAULT: '5',
      MAX_PAGES_LIMIT: '100',
      CRAWL_TIMEOUT_MS: '60000',
      AUDIT_CONCURRENCY: '3',
    } as NodeJS.ProcessEnv;

    const { validateConfig } = await import('../src/config');

    validateConfig();

    process.env.PORT = '0';
    expectInvalid(() => validateConfig(), /Invalid PORT/);
    process.env.PORT = '3000';
    delete (process.env as any).PORT;
    validateConfig();
    process.env.PORT = '3000';

    process.env.PORT = '70000';
    expectInvalid(() => validateConfig(), /Invalid PORT/);
    process.env.PORT = '3000';

    process.env.PORT = 'abc';
    expectInvalid(() => validateConfig(), /Invalid PORT/);
    process.env.PORT = '3000';

    process.env.RATE_LIMIT_WINDOW_MS = '999';
    expectInvalid(() => validateConfig(), /RATE_LIMIT_WINDOW_MS/);
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    delete (process.env as any).RATE_LIMIT_WINDOW_MS;
    validateConfig();
    process.env.RATE_LIMIT_WINDOW_MS = '60000';

    process.env.RATE_LIMIT_WINDOW_MS = 'abc';
    expectInvalid(() => validateConfig(), /RATE_LIMIT_WINDOW_MS/);
    process.env.RATE_LIMIT_WINDOW_MS = '60000';

    process.env.RATE_LIMIT_MAX_REQUESTS = '0';
    expectInvalid(() => validateConfig(), /RATE_LIMIT_MAX_REQUESTS/);
    process.env.RATE_LIMIT_MAX_REQUESTS = '10';
    delete (process.env as any).RATE_LIMIT_MAX_REQUESTS;
    validateConfig();
    process.env.RATE_LIMIT_MAX_REQUESTS = '10';

    process.env.RATE_LIMIT_MAX_REQUESTS = 'abc';
    expectInvalid(() => validateConfig(), /RATE_LIMIT_MAX_REQUESTS/);
    process.env.RATE_LIMIT_MAX_REQUESTS = '10';

    process.env.MAX_PAGES_DEFAULT = '0';
    expectInvalid(() => validateConfig(), /MAX_PAGES_DEFAULT/);
    process.env.MAX_PAGES_DEFAULT = '5';

    process.env.MAX_PAGES_DEFAULT = '200';
    process.env.MAX_PAGES_LIMIT = '100';
    expectInvalid(() => validateConfig(), /MAX_PAGES_DEFAULT/);
    process.env.MAX_PAGES_DEFAULT = '5';

    process.env.MAX_PAGES_LIMIT = '1001';
    expectInvalid(() => validateConfig(), /MAX_PAGES_LIMIT/);
    process.env.MAX_PAGES_LIMIT = '100';
    delete (process.env as any).MAX_PAGES_DEFAULT;
    delete (process.env as any).MAX_PAGES_LIMIT;
    validateConfig();
    process.env.MAX_PAGES_DEFAULT = '5';
    process.env.MAX_PAGES_LIMIT = '100';

    process.env.MAX_PAGES_DEFAULT = 'abc';
    expectInvalid(() => validateConfig(), /MAX_PAGES_DEFAULT/);
    process.env.MAX_PAGES_DEFAULT = '5';

    process.env.MAX_PAGES_LIMIT = 'abc';
    expectInvalid(() => validateConfig(), /MAX_PAGES_LIMIT/);
    process.env.MAX_PAGES_LIMIT = '100';

    process.env.MAX_PAGES_LIMIT = '-1';
    expectInvalid(() => validateConfig(), /MAX_PAGES_LIMIT/);
    process.env.MAX_PAGES_LIMIT = '100';

    process.env.CRAWL_TIMEOUT_MS = '100';
    expectInvalid(() => validateConfig(), /CRAWL_TIMEOUT_MS/);
    process.env.CRAWL_TIMEOUT_MS = '60000';
    delete (process.env as any).CRAWL_TIMEOUT_MS;
    validateConfig();
    process.env.CRAWL_TIMEOUT_MS = '60000';

    process.env.CRAWL_TIMEOUT_MS = '400000';
    expectInvalid(() => validateConfig(), /CRAWL_TIMEOUT_MS/);
    process.env.CRAWL_TIMEOUT_MS = '60000';

    process.env.CRAWL_TIMEOUT_MS = 'abc';
    expectInvalid(() => validateConfig(), /CRAWL_TIMEOUT_MS/);
    process.env.CRAWL_TIMEOUT_MS = '60000';

    process.env.AUDIT_CONCURRENCY = '0';
    expectInvalid(() => validateConfig(), /AUDIT_CONCURRENCY/);
    process.env.AUDIT_CONCURRENCY = '3';
    delete (process.env as any).AUDIT_CONCURRENCY;
    validateConfig();
    process.env.AUDIT_CONCURRENCY = '11';
    expectInvalid(() => validateConfig(), /AUDIT_CONCURRENCY/);
    process.env.AUDIT_CONCURRENCY = 'abc';
    expectInvalid(() => validateConfig(), /AUDIT_CONCURRENCY/);

    Object.assign(process.env, {
      PORT: '3000',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '10',
      MAX_PAGES_DEFAULT: '5',
      MAX_PAGES_LIMIT: '100',
      CRAWL_TIMEOUT_MS: '60000',
      AUDIT_CONCURRENCY: '3',
    });
    validateConfig();
  });

  it('honors production defaults when LOG_LEVEL not set', async () => {
    process.env = {
      SKIP_CONFIG_VALIDATION: 'true',
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv;

    const { serverConfig, loggingConfig } = await import('../src/config');
    expect(serverConfig.isProduction).toBe(true);
    expect(serverConfig.isDevelopment).toBe(false);
    expect(loggingConfig.level).toBe('info');
  });

  it('handles environment overrides and fallbacks across reloads', async () => {
    process.env = {
      SKIP_CONFIG_VALIDATION: 'true',
      PORT: '3200',
      NODE_ENV: 'production',
      RATE_LIMIT_WINDOW_MS: '70000',
      RATE_LIMIT_MAX_REQUESTS: '12',
      MAX_PAGES_DEFAULT: '15',
      MAX_PAGES_LIMIT: '150',
      CRAWL_TIMEOUT_MS: '90000',
      AUDIT_CONCURRENCY: '4',
    } as NodeJS.ProcessEnv;

    let mod = await import('../src/config');
    expect(mod.serverConfig.port).toBe(3200);
    expect(mod.rateLimitConfig.maxRequests).toBe(12);
    expect(mod.auditConfig.maxPagesDefault).toBe(15);
    expect(mod.auditConfig.maxPagesLimit).toBe(150);

    vi.resetModules();

    process.env = {
      SKIP_CONFIG_VALIDATION: 'true',
    } as NodeJS.ProcessEnv;

    mod = await import('../src/config');
    expect(mod.serverConfig.port).toBe(3000);
    expect(mod.rateLimitConfig.maxRequests).toBe(10);
    expect(mod.auditConfig.maxPagesLimit).toBe(100);
  });

  it('runs validation on import when not skipped', async () => {
    process.env = {
      SKIP_CONFIG_VALIDATION: 'false',
      PORT: '3100',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '20',
      MAX_PAGES_DEFAULT: '10',
      MAX_PAGES_LIMIT: '100',
      CRAWL_TIMEOUT_MS: '60000',
      AUDIT_CONCURRENCY: '3',
    } as NodeJS.ProcessEnv;

    await expect(import('../src/config')).resolves.toBeDefined();
  });
});
