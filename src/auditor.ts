import { chromium, Browser } from 'playwright';
import { PageAuditResult, Violation, AuditReport } from './types';
import { join } from 'path';

/**
 * WCAG 2.2 Level AA Auditor using axe-core
 *
 * Performs accessibility audits on web pages according to WCAG 2.2 Level AA standards.
 * Uses Playwright browser automation and axe-core accessibility testing engine.
 *
 * @example
 * ```typescript
 * const auditor = new WCAGAuditor();
 * await auditor.initialize();
 * const result = await auditor.auditPage('https://example.com');
 * await auditor.close();
 * ```
 */
export class WCAGAuditor {
  private browser: Browser | null = null;

  /** Default timeout for page navigation in milliseconds */
  private static readonly NAVIGATION_TIMEOUT = 45000;

  /** Default wait time for dynamic content in milliseconds */
  private static readonly CONTENT_WAIT_TIME = 2000;

  /** Default wait time for axe-core initialization in milliseconds */
  private static readonly AXE_INIT_WAIT_TIME = 500;

  /** Default concurrency for parallel page audits */
  private static readonly DEFAULT_CONCURRENCY = 3;

  /**
   * Initializes the Playwright browser instance
   * @throws {Error} If browser launch fails
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });
  }

  /**
   * Audits a single web page for WCAG 2.2 Level AA compliance
   *
   * @param url - The URL of the page to audit
   * @returns PageAuditResult containing violations, passes, and metadata
   * @throws {Error} If page cannot be loaded or axe-core fails
   *
   * @example
   * ```typescript
   * const result = await auditor.auditPage('https://example.com');
   * console.log(`Found ${result.violations.length} violations`);
   * ```
   */
  async auditPage(url: string): Promise<PageAuditResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();

    try {
      console.log(`Auditing: ${url}`);

      // Try to navigate with timeout, fallback if it fails but page loads anyway
      let navigationSucceeded = false;
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: WCAGAuditor.NAVIGATION_TIMEOUT
        });
        navigationSucceeded = true;
      } catch (error: any) {
        console.warn(`Navigation timeout for ${url}, checking if page loaded anyway...`);

        // Wait for any pending navigation to settle
        await page.waitForTimeout(WCAGAuditor.CONTENT_WAIT_TIME);

        // Check if page actually loaded despite timeout
        try {
          const readyState = await page.evaluate(() => document.readyState).catch(() => null);
          const title = await page.title().catch(() => '');

          if (readyState === 'complete' || readyState === 'interactive' || title) {
            console.log(`✅ Page is accessible (readyState: ${readyState}, title: ${title})`);
            navigationSucceeded = true;
          } else {
            throw error; // Re-throw if page really didn't load
          }
        } catch {
          throw error; // Re-throw original error
        }
      }

      // Simple wait for dynamic content
      await page.waitForTimeout(WCAGAuditor.CONTENT_WAIT_TIME);

      // Inject axe-core from node_modules
      const axePath = join(require.resolve('axe-core'), '..', 'axe.min.js');

      try {
        await page.addScriptTag({
          path: axePath
        });
      } catch (error) {
        console.error(`Failed to inject axe-core for ${url}:`, error);
        throw new Error('Failed to inject accessibility testing library');
      }

      // Wait a moment for axe to initialize
      await page.waitForTimeout(WCAGAuditor.AXE_INIT_WAIT_TIME);

      // Run axe accessibility audit with error handling
      let results;
      try {
        results = await page.evaluate(async () => {
          // Access axe from window to avoid TypeScript errors
          const axeLib = (window as any).axe;

          if (typeof axeLib === 'undefined') {
            throw new Error('axe-core not available');
          }

          return await axeLib.run({
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag22aa']
            }
          });
        });
      } catch (error) {
        console.error(`Failed to run axe audit for ${url}:`, error);
        throw new Error(`Accessibility audit failed: ${error}`);
      }

      const title = await page.title();

      const violations: Violation[] = results.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact || 'minor',
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags,
        nodes: v.nodes.map((node: any) => ({
          html: node.html,
          target: node.target,
          failureSummary: node.failureSummary || ''
        }))
      }));

      return {
        url,
        title,
        violations,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        timestamp: new Date()
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Audits multiple web pages in parallel with concurrency control
   *
   * @param urls - Array of URLs to audit
   * @param progressCallback - Optional callback for progress updates
   * @returns AuditReport with aggregated results and deduplicated violations
   *
   * @example
   * ```typescript
   * const urls = ['https://example.com', 'https://example.com/about'];
   * const report = await auditor.auditMultiplePages(urls, (current, total) => {
   *   console.log(`Progress: ${current}/${total}`);
   * });
   * ```
   */
  async auditMultiplePages(urls: string[], progressCallback?: (current: number, total: number) => void): Promise<AuditReport> {
    const baseUrl = urls[0];

    // Parallel scanning with concurrency limit
    const CONCURRENCY = WCAGAuditor.DEFAULT_CONCURRENCY;
    const pageResults: PageAuditResult[] = [];
    let processedCount = 0;

    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.allSettled(
        batch.map(url => this.auditPage(url))
      );

      batchResults.forEach((result, index) => {
        const url = batch[index];

        if (result.status === 'fulfilled') {
          pageResults.push(result.value);
        } else {
          console.error(`Failed to audit ${url}:`, result.reason);
          // Add failed page with error info
          pageResults.push({
            url,
            title: 'Error',
            violations: [{
              id: 'page-error',
              impact: 'critical',
              description: `Failed to audit page: ${result.reason}`,
              help: 'Check if page is accessible',
              helpUrl: '',
              tags: ['error'],
              nodes: []
            }],
            passes: 0,
            incomplete: 0,
            timestamp: new Date()
          });
        }

        processedCount++;
        if (progressCallback) {
          progressCallback(processedCount, urls.length);
        }
      });
    }

    // Deduplicate violations across pages
    // A violation is considered unique by its id + first node's HTML
    const uniqueViolationsMap = new Map<string, Violation>();

    pageResults.forEach(page => {
      page.violations.forEach(v => {
        // Create unique key based on violation id and first node's HTML
        const firstNodeHtml = v.nodes[0]?.html || '';
        const uniqueKey = `${v.id}::${firstNodeHtml}`;

        // Only count this violation if we haven't seen it before
        if (!uniqueViolationsMap.has(uniqueKey)) {
          uniqueViolationsMap.set(uniqueKey, v);
        }
      });
    });

    // Calculate statistics from unique violations only
    const uniqueViolations = Array.from(uniqueViolationsMap.values());
    let totalViolations = uniqueViolations.length;
    let criticalIssues = 0;
    let seriousIssues = 0;
    let moderateIssues = 0;
    let minorIssues = 0;

    uniqueViolations.forEach(v => {
      switch (v.impact) {
        case 'critical':
          criticalIssues++;
          break;
        case 'serious':
          seriousIssues++;
          break;
        case 'moderate':
          moderateIssues++;
          break;
        case 'minor':
          minorIssues++;
          break;
      }
    });

    return {
      baseUrl,
      totalPages: pageResults.length,
      totalViolations,
      criticalIssues,
      seriousIssues,
      moderateIssues,
      minorIssues,
      pages: pageResults,
      scanDate: new Date(),
      wcagVersion: '2.2',
      conformanceLevel: 'AA'
    };
  }

  /**
   * Closes the browser instance and frees resources
   * @throws {Error} If browser close fails
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
