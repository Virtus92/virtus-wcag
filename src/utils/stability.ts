/**
 * Page stabilization utilities
 *
 * Provides deterministic, budgeted waiting conditions to ensure that
 * dynamic pages (including SPAs) settle before running audits.
 */

import { Page } from 'playwright';

export interface QuietPageOptions {
  /**
   * Maximum time to wait for the page to become quiet (ms)
   */
  timeoutMs?: number;
  /**
   * Consider the network quiet when there are <= this many in-flight requests
   */
  maxInflightRequests?: number;
  /**
   * Minimum duration of DOM quiescence (ms) without mutations
   */
  domQuietWindowMs?: number;
  /**
   * Additional fixed wait after quiet state (ms)
   */
  extraWaitMs?: number;
}

const defaultOptions: Required<QuietPageOptions> = {
  timeoutMs: 30000,
  maxInflightRequests: 2,
  domQuietWindowMs: 800,
  extraWaitMs: 200,
};

/**
 * Waits until the page is considered "quiet" using a combination of:
 * - network quiet (based on in-flight request count)
 * - DOM quiet (no mutations for a window)
 * - fonts loaded (document.fonts.ready)
 *
 * This is best-effort and times out within the provided budget.
 */
export async function waitForQuietPage(page: Page, opts: QuietPageOptions = {}): Promise<void> {
  const options = { ...defaultOptions, ...opts };
  const start = Date.now();

  // Track in-flight requests on the page
  let inflight = 0;
  const onRequest = () => (inflight += 1);
  const onRequestFinished = () => (inflight = Math.max(0, inflight - 1));
  page.on('request', onRequest);
  page.on('requestfinished', onRequestFinished);
  page.on('requestfailed', onRequestFinished);

  try {
    // Phase 1: DOMContentLoaded or better
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: Math.min(8000, options.timeoutMs) });
    } catch {/* ignore */}

    // Phase 2: Fonts readiness (best-effort)
    try {
      await page.evaluate(async () => {
        // @ts-ignore
        if (document.fonts && typeof document.fonts.ready?.then === 'function') {
          // @ts-ignore
          await document.fonts.ready;
        }
      });
    } catch {/* ignore */}

    // Phase 3: Network quiet + DOM quiet window
    const domQuiet = await waitForDomQuiet(page, options);
    if (!domQuiet) {
      // If DOM never quieted within timeout window, we still proceed conservatively
    }

    // Small buffer wait for late microtasks
    if (options.extraWaitMs > 0) {
      await page.waitForTimeout(options.extraWaitMs);
    }
  } finally {
    // Cleanup listeners
    page.off('request', onRequest);
    page.off('requestfinished', onRequestFinished);
    page.off('requestfailed', onRequestFinished);
  }

  async function waitForDomQuiet(p: Page, { timeoutMs, maxInflightRequests, domQuietWindowMs }: Required<QuietPageOptions>): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let lastMutation = Date.now();

    // Install a mutation observer to track DOM changes
    await p.exposeFunction('__qa_markMutation', () => {
      lastMutation = Date.now();
    });

    await p.evaluate(() => {
      const cb = () => {
        // @ts-ignore
        window.__qa_markMutation?.();
      };
      const mo = new MutationObserver(cb);
      mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true, characterData: true });
      // Store observer on window for potential cleanup by GC
      // @ts-ignore
      (window as any).__qa_mo = mo;
    });

    // Wait loop: both network quiet and DOM quiet window reached
    while (Date.now() < deadline) {
      const domQuietFor = Date.now() - lastMutation;
      const networkQuiet = inflight <= maxInflightRequests;
      if (networkQuiet && domQuietFor >= domQuietWindowMs) {
        return true;
      }
      await p.waitForTimeout(100);
    }
    return false;
  }
}

/**
 * Utility to apply standard viewport and emulation to reduce flakiness.
 */
export async function applyDeterministicContext(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
}

