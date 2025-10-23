import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { EventEmitter } from 'events';
import { waitForQuietPage, applyDeterministicContext } from '../src/utils/stability';
import { startTestServer, TestServer } from './utils/testServer';
import { join } from 'path';

let server: TestServer;
let browser: Browser;

beforeAll(async () => {
  server = await startTestServer(join(__dirname, 'fixtures/dynamic'));
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
  await server.close();
});

describe('stability utils (integration)', () => {
  it('waits for DOM + network quiet', async () => {
    const page: Page = await browser.newPage();
    await page.goto(server.url + '/index.html', { waitUntil: 'domcontentloaded' });
    await applyDeterministicContext(page);
    const start = Date.now();
    await waitForQuietPage(page, { timeoutMs: 5000, domQuietWindowMs: 300, maxInflightRequests: 2, extraWaitMs: 50 });
    const elapsed = Date.now() - start;
    // Should return within ~5s budget and after some waiting
    expect(elapsed).toBeLessThan(5000);
    await page.close();
  });
});

type MutationCallback = (records: unknown[], observer: unknown) => void;

class StubMutationObserver {
  private callback: MutationCallback;

  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  observe(): void {
    this.callback([], this);
  }

  disconnect(): void {}

  takeRecords(): unknown[] {
    return [];
  }
}

type FakeClock = {
  install: () => void;
  advance: (ms: number) => void;
  restore: () => void;
};

function createFakeClock(): FakeClock {
  const realNow = Date.now;
  let now = 0;
  return {
    install() {
      now = 0;
      Date.now = () => now;
    },
    advance(ms: number) {
      now += ms;
    },
    restore() {
      Date.now = realNow;
    },
  };
}

type FakePageOptions = {
  loadStateShouldThrow?: boolean;
  evaluateErrors?: boolean[];
};

class FakePage extends EventEmitter {
  public waitForTimeoutCalls: number[] = [];
  public setViewportSizeArgs?: unknown;
  public emulateMediaArgs?: unknown;
  public extraHeadersArgs?: unknown;
  private evaluateQueue: boolean[];

  constructor(private clock: FakeClock, private opts: FakePageOptions = {}) {
    super();
    this.evaluateQueue = [...(opts.evaluateErrors ?? [])];
  }

  async waitForLoadState(): Promise<void> {
    if (this.opts.loadStateShouldThrow) {
      throw new Error('load state failure');
    }
  }

  async evaluate(fn: unknown): Promise<unknown> {
    const shouldThrow = this.evaluateQueue.shift();
    if (shouldThrow) {
      throw new Error('evaluate failure');
    }
    if (typeof fn === 'function') {
      return await (fn as () => unknown)();
    }
    return undefined;
  }

  async waitForTimeout(ms: number): Promise<void> {
    this.waitForTimeoutCalls.push(ms);
    this.emit('request');
    this.emit('requestfinished');
    this.emit('requestfailed');
    this.clock.advance(ms);
  }

  async exposeFunction(name: string, fn: (...args: unknown[]) => unknown): Promise<void> {
    (globalThis as any)[name] = fn;
    const win = (globalThis as any).window;
    if (win && typeof win === 'object') {
      win[name] = fn;
    }
  }

  async setViewportSize(arg: unknown): Promise<void> {
    this.setViewportSizeArgs = arg;
  }

  async emulateMedia(arg: unknown): Promise<void> {
    this.emulateMediaArgs = arg;
  }

  async setExtraHTTPHeaders(arg: unknown): Promise<void> {
    this.extraHeadersArgs = arg;
  }
}

const ORIGINAL_GLOBALS = {
  document: globalThis.document,
  window: globalThis.window,
  MutationObserver: (globalThis as any).MutationObserver,
};

function setupDomGlobals() {
  (globalThis as any).document = {
    documentElement: {},
    fonts: {
      ready: Promise.resolve(),
    },
  };
  (globalThis as any).window = (globalThis as any).window ?? {};
  (globalThis as any).MutationObserver = StubMutationObserver;
}

function restoreDomGlobals() {
  if (ORIGINAL_GLOBALS.document === undefined) {
    delete (globalThis as any).document;
  } else {
    (globalThis as any).document = ORIGINAL_GLOBALS.document;
  }
  if (ORIGINAL_GLOBALS.window === undefined) {
    delete (globalThis as any).window;
  } else {
    (globalThis as any).window = ORIGINAL_GLOBALS.window;
  }
  if (ORIGINAL_GLOBALS.MutationObserver === undefined) {
    delete (globalThis as any).MutationObserver;
  } else {
    (globalThis as any).MutationObserver = ORIGINAL_GLOBALS.MutationObserver;
  }
}

describe('stability utils (unit)', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    restoreDomGlobals();
    delete (globalThis as any).__qa_markMutation;
  });

  it('waits for quiet state with deterministic clock', async () => {
    const clock = createFakeClock();
    clock.install();
    const page = new FakePage(clock);

    try {
      await waitForQuietPage(page as unknown as Page, {
        timeoutMs: 500,
        domQuietWindowMs: 200,
        maxInflightRequests: 2,
        extraWaitMs: 100,
      });
    } finally {
      clock.restore();
    }

    expect(page.waitForTimeoutCalls).toContain(100);
    expect(page.listenerCount('request')).toBe(0);
    expect(page.listenerCount('requestfinished')).toBe(0);
  });

  it('handles load and evaluate failures gracefully', async () => {
    const clock = createFakeClock();
    clock.install();
    const page = new FakePage(clock, { loadStateShouldThrow: true, evaluateErrors: [true, false] });

    try {
      await waitForQuietPage(page as unknown as Page, {
        timeoutMs: 0,
        domQuietWindowMs: 200,
        maxInflightRequests: 1,
        extraWaitMs: 0,
      });
    } finally {
      clock.restore();
    }

    expect(page.waitForTimeoutCalls.length).toBe(0);
  });

  it('applies deterministic context helpers', async () => {
    const clock = createFakeClock(); // Not used but keeps symmetry
    const page = new FakePage(clock);

    await applyDeterministicContext(page as unknown as Page);

    expect(page.setViewportSizeArgs).toEqual({ width: 1366, height: 768 });
    expect(page.emulateMediaArgs).toEqual({ reducedMotion: 'reduce' });
    expect(page.extraHeadersArgs).toEqual({ 'Accept-Language': 'en-US,en;q=0.9' });
  });
});
