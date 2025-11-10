import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { PageAuditResult, Violation, AuditReport } from './types';
import { join } from 'path';
import { waitForQuietPage, applyDeterministicContext } from './utils/stability';
import { auditConfig } from './config';

/**
 * Enhanced WCAG 2.2 Level AA Auditor
 *
 * Multi-layered accessibility testing with:
 * - axe-core (automated)
 * - Custom accessibility rules
 * - Keyboard navigation testing
 * - Screen reader compatibility checks
 * - Performance metrics
 * - SPA detection
 */
export class EnhancedWCAGAuditor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  private static readonly NAVIGATION_TIMEOUT = auditConfig.crawlTimeoutMs;
  private static readonly CONTENT_WAIT_TIME = auditConfig.contentWaitMs;
  private static readonly AXE_INIT_WAIT_TIME = auditConfig.axeInitWaitMs;
  private static readonly DEFAULT_CONCURRENCY = auditConfig.auditConcurrency;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });

    // Enable deterministic context and optional HAR support
    const harPathBase = `${auditConfig.harDir}/audit-${Date.now()}.har`;
    const recordHar = auditConfig.harMode === 'record' ? { path: harPathBase, content: 'embed' as const } : undefined;
    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36 A11yAuditor/1.0',
      recordHar,
    });

    if (auditConfig.harMode === 'replay') {
      // Best-effort: routeFromHAR requires a recorded file; users should set proper path in env
      try {
        await this.context.routeFromHAR(harPathBase, { notFound: 'fallback' });
      } catch {/* ignore */}
    }
  }

  async auditPage(url: string): Promise<PageAuditResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.context!.newPage();
    const startTime = Date.now();

    try {
      console.log(`🔍 Enhanced audit: ${url}`);

      // Navigate
      let navigationSucceeded = false;
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: EnhancedWCAGAuditor.NAVIGATION_TIMEOUT
        });
        navigationSucceeded = true;
      } catch (error: any) {
        console.warn(`Navigation timeout for ${url}, checking if page loaded anyway...`);
        await page.waitForTimeout(EnhancedWCAGAuditor.CONTENT_WAIT_TIME);

        const readyState = await page.evaluate(() => document.readyState).catch(() => null);
        const title = await page.title().catch(() => '');

        if (readyState === 'complete' || readyState === 'interactive' || title) {
          console.log(`✅ Page accessible (readyState: ${readyState})`);
          navigationSucceeded = true;
        } else {
          throw error;
        }
      }

      // Deterministic stabilization before audits
      await applyDeterministicContext(page);
      await waitForQuietPage(page, {
        timeoutMs: auditConfig.stabilityTimeoutMs,
        domQuietWindowMs: auditConfig.domQuietWindowMs,
        maxInflightRequests: auditConfig.inflightMax,
        extraWaitMs: 200,
      });

      // Detect framework/SPA
      const frameworkDetected = await this.detectFramework(page);
      const isJavaScriptHeavy = !!frameworkDetected;

      console.log(`Framework detected: ${frameworkDetected || 'Static HTML'}`);

      // === 1. RUN AXE-CORE ===
      console.log('Running axe-core audit...');
      const axeResults = await this.runAxeAudit(page, url);

      // === 2. PERFORMANCE METRICS ===
      console.log('Collecting performance metrics...');
      const performanceMetrics = await this.collectPerformanceMetrics(page, startTime);

      // === 3. KEYBOARD NAVIGATION ===
      console.log('Testing keyboard accessibility...');
      const keyboardAccessibility = await this.testKeyboardAccessibility(page);

      // === 4. SCREEN READER COMPATIBILITY ===
      console.log('Checking screen reader compatibility...');
      const screenReaderCompatibility = await this.checkScreenReaderCompatibility(page);

      // === 5. CUSTOM ACCESSIBILITY RULES ===
      console.log('Running custom accessibility rules...');
      const customViolations = await this.runCustomRules(page);

      // Combine all violations
      const allViolations = [...axeResults.violations, ...customViolations];

      const title = await page.title();
      const loadTime = Date.now() - startTime;

      return {
        url,
        title,
        violations: allViolations,
        passes: axeResults.passes,
        incomplete: axeResults.incomplete,
        timestamp: new Date(),
        loadTime,
        performanceMetrics,
        frameworkDetected,
        isJavaScriptHeavy,
        keyboardAccessibility,
        screenReaderCompatibility
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Run axe-core audit
   */
  private async runAxeAudit(page: Page, url: string): Promise<{
    violations: Violation[],
    passes: number,
    incomplete: number
  }> {
    const axePath = join(require.resolve('axe-core'), '..', 'axe.min.js');

    try {
      await page.addScriptTag({ path: axePath });
    } catch (error) {
      console.error(`Failed to inject axe-core for ${url}:`, error);
      throw new Error('Failed to inject accessibility testing library');
    }

    await page.waitForTimeout(EnhancedWCAGAuditor.AXE_INIT_WAIT_TIME);

    let results;
    try {
      results = await page.evaluate(async () => {
        const axeLib = (window as any).axe;
        if (typeof axeLib === 'undefined') {
          throw new Error('axe-core not available');
        }

        return await axeLib.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice']
          }
        });
      });
    } catch (error) {
      console.error(`Failed to run axe audit for ${url}:`, error);
      throw new Error(`Accessibility audit failed: ${error}`);
    }

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
      violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length
    };
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(page: Page, startTime: number) {
    try {
      const metrics = await page.evaluate(() => {
        const perfData = performance.timing;
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        const paint = performance.getEntriesByType('paint');

        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        const lcp = paint.find(entry => entry.name === 'largest-contentful-paint');

        const resources = performance.getEntriesByType('resource');
        const totalSize = resources.reduce((sum: number, r: any) => sum + (r.transferSize || 0), 0);

        return {
          loadTime: perfData.loadEventEnd - perfData.navigationStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
          firstContentfulPaint: fcp?.startTime,
          largestContentfulPaint: lcp?.startTime || navigation?.largestContentfulPaint,
          totalSize,
          requestCount: resources.length
        };
      });

      return metrics;
    } catch (error) {
      console.warn('Failed to collect performance metrics:', error);
      return {
        loadTime: Date.now() - startTime,
        domContentLoaded: 0,
        totalSize: 0,
        requestCount: 0
      };
    }
  }

  /**
   * Test keyboard navigation accessibility
   */
  private async testKeyboardAccessibility(page: Page) {
    try {
      const results = await page.evaluate(async () => {
        const issues: string[] = [];
        let tabOrderCorrect = true;
        let focusVisible = true;
        let noKeyboardTraps = true;

        // Check if focusable elements have visible focus
        const focusableElements = document.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        let previousTabIndex = -1;
        focusableElements.forEach((el: any, index) => {
          // Check tab order
          const tabIndex = parseInt(el.getAttribute('tabindex') || '0');
          if (tabIndex > 0 && tabIndex < previousTabIndex) {
            tabOrderCorrect = false;
            issues.push(`Tab order issue at element ${index}: ${el.tagName}`);
          }
          previousTabIndex = tabIndex;

          // Check focus styles
          const styles = window.getComputedStyle(el, ':focus');
          const outlineStyle = styles.outline;
          const outlineWidth = parseInt(styles.outlineWidth || '0');

          if (outlineStyle === 'none' || outlineWidth === 0) {
            // Check if there's alternative focus indication
            const boxShadow = styles.boxShadow;
            const border = styles.border;

            if (boxShadow === 'none' && border === 'none') {
              focusVisible = false;
              issues.push(`No focus indicator on: ${el.tagName}.${el.className}`);
            }
          }
        });

        // Check for skip links
        const skipLinks = document.querySelectorAll('a[href^="#"]');
        const hasSkipToMain = Array.from(skipLinks).some(link =>
          link.textContent?.toLowerCase().includes('skip')
        );

        if (!hasSkipToMain && focusableElements.length > 10) {
          issues.push('No "Skip to main content" link found');
        }

        // Check for keyboard traps (simplified check)
        const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
        modals.forEach((modal: any) => {
          if (modal.style.display !== 'none' && !modal.hasAttribute('aria-modal')) {
            noKeyboardTraps = false;
            issues.push('Modal without aria-modal attribute (potential keyboard trap)');
          }
        });

        return {
          tabOrderCorrect,
          focusVisible,
          noKeyboardTraps,
          issues
        };
      });

      return results;
    } catch (error) {
      console.warn('Failed to test keyboard accessibility:', error);
      return {
        tabOrderCorrect: false,
        focusVisible: false,
        noKeyboardTraps: false,
        issues: ['Failed to run keyboard accessibility test']
      };
    }
  }

  /**
   * Check screen reader compatibility
   */
  private async checkScreenReaderCompatibility(page: Page) {
    try {
      const results = await page.evaluate(() => {
        let score = 100;
        const issues: string[] = [];

        // Check heading hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let hasProperHeadings = true;

        if (headings.length === 0) {
          hasProperHeadings = false;
          score -= 20;
          issues.push('No headings found');
        } else {
          const h1Count = document.querySelectorAll('h1').length;
          if (h1Count === 0) {
            hasProperHeadings = false;
            score -= 15;
            issues.push('No H1 heading found');
          } else if (h1Count > 1) {
            hasProperHeadings = false;
            score -= 10;
            issues.push(`Multiple H1 headings found (${h1Count})`);
          }

          // Check for heading level skipping
          let previousLevel = 0;
          headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            if (level - previousLevel > 1) {
              hasProperHeadings = false;
              score -= 5;
              issues.push(`Heading level skip: ${previousLevel} to ${level}`);
            }
            previousLevel = level;
          });
        }

        // Check ARIA labels
        const interactiveElements = document.querySelectorAll(
          'button, a, input, select, textarea, [role="button"], [role="link"]'
        );

        let hasAriaLabels = true;
        let missingLabels = 0;

        interactiveElements.forEach((el: any) => {
          const hasLabel = el.getAttribute('aria-label') ||
                          el.getAttribute('aria-labelledby') ||
                          el.textContent?.trim() ||
                          el.alt ||
                          el.title;

          if (!hasLabel) {
            hasAriaLabels = false;
            missingLabels++;
          }
        });

        if (missingLabels > 0) {
          score -= Math.min(20, missingLabels * 2);
          issues.push(`${missingLabels} interactive elements without labels`);
        }

        // Check for landmarks
        const landmarks = document.querySelectorAll(
          'header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]'
        );

        const hasLandmarks = landmarks.length > 0;
        if (!hasLandmarks) {
          score -= 15;
          issues.push('No ARIA landmarks or semantic HTML5 elements found');
        }

        // Check images for alt text
        const images = document.querySelectorAll('img');
        let missingAlt = 0;
        images.forEach((img: HTMLImageElement) => {
          if (!img.alt && img.src && !img.hasAttribute('role')) {
            missingAlt++;
          }
        });

        if (missingAlt > 0) {
          score -= Math.min(15, missingAlt * 3);
          issues.push(`${missingAlt} images without alt text`);
        }

        // Check for language attribute
        const htmlLang = document.documentElement.lang;
        if (!htmlLang) {
          score -= 10;
          issues.push('No language attribute on <html> element');
        }

        return {
          hasProperHeadings,
          hasAriaLabels,
          hasLandmarks,
          score: Math.max(0, score)
        };
      });

      return results;
    } catch (error) {
      console.warn('Failed to check screen reader compatibility:', error);
      return {
        hasProperHeadings: false,
        hasAriaLabels: false,
        hasLandmarks: false,
        score: 0
      };
    }
  }

  /**
   * Run custom accessibility rules
   */
  private async runCustomRules(page: Page): Promise<Violation[]> {
    try {
      const customIssues = await page.evaluate(() => {
        const issues: any[] = [];

        // Rule 1: Check for empty links
        const links = document.querySelectorAll('a[href]');
        links.forEach((link: any) => {
          if (!link.textContent?.trim() && !link.getAttribute('aria-label') && !link.title) {
            issues.push({
              id: 'custom-empty-link',
              impact: 'serious',
              description: 'Empty link without accessible text',
              help: 'Links must have discernible text',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
              tags: ['custom', 'wcag2a', 'wcag244'],
              html: link.outerHTML
            });
          }
        });

        // Rule 2: Check for sufficient color contrast (simplified)
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, label, span, div');
        let contrastIssues = 0;
        textElements.forEach((el: any) => {
          if (el.textContent?.trim() && contrastIssues < 5) { // Limit to 5 examples
            const styles = window.getComputedStyle(el);
            const color = styles.color;
            const bgColor = styles.backgroundColor;
            const fontSize = parseInt(styles.fontSize);

            // Very simplified contrast check
            if (color.includes('rgb') && bgColor.includes('rgb')) {
              const colorMatch = color.match(/\d+/g);
              const bgMatch = bgColor.match(/\d+/g);

              if (colorMatch && bgMatch) {
                const colorLuminance = (parseInt(colorMatch[0]) + parseInt(colorMatch[1]) + parseInt(colorMatch[2])) / 3;
                const bgLuminance = (parseInt(bgMatch[0]) + parseInt(bgMatch[1]) + parseInt(bgMatch[2])) / 3;
                const contrast = Math.abs(colorLuminance - bgLuminance);

                // Rough threshold (real contrast calculation is more complex)
                const threshold = fontSize >= 18 ? 40 : 70;

                if (contrast < threshold) {
                  contrastIssues++;
                  issues.push({
                    id: 'custom-contrast',
                    impact: 'serious',
                    description: 'Insufficient color contrast ratio',
                    help: 'Elements must have sufficient color contrast',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
                    tags: ['custom', 'wcag2aa', 'wcag143'],
                    html: el.outerHTML.substring(0, 100)
                  });
                }
              }
            }
          }
        });

        // Rule 3: Check for form labels
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
        inputs.forEach((input: any) => {
          const hasLabel = input.labels?.length > 0 ||
                          input.getAttribute('aria-label') ||
                          input.getAttribute('aria-labelledby') ||
                          input.getAttribute('title');

          if (!hasLabel) {
            issues.push({
              id: 'custom-form-label',
              impact: 'critical',
              description: 'Form input without label',
              help: 'Form elements must have labels',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
              tags: ['custom', 'wcag2a', 'wcag332'],
              html: input.outerHTML
            });
          }
        });

        // Rule 4: Check for button text
        const buttons = document.querySelectorAll('button');
        buttons.forEach((button: any) => {
          if (!button.textContent?.trim() &&
              !button.getAttribute('aria-label') &&
              !button.getAttribute('aria-labelledby') &&
              !button.title) {
            issues.push({
              id: 'custom-button-text',
              impact: 'critical',
              description: 'Button without accessible text',
              help: 'Buttons must have text or accessible labels',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
              tags: ['custom', 'wcag2a', 'wcag412'],
              html: button.outerHTML
            });
          }
        });

        return issues;
      });

      // Convert to Violation format
      return customIssues.map(issue => ({
        id: issue.id,
        impact: issue.impact,
        description: issue.description,
        help: issue.help,
        helpUrl: issue.helpUrl,
        tags: issue.tags,
        nodes: [{
          html: issue.html,
          target: [],
          failureSummary: ''
        }]
      }));

    } catch (error) {
      console.warn('Failed to run custom rules:', error);
      return [];
    }
  }

  /**
   * Detect JavaScript framework
   */
  private async detectFramework(page: Page): Promise<string | undefined> {
    try {
      const framework = await page.evaluate(() => {
        if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
            document.querySelector('[data-reactroot], [data-reactid]')) {
          return 'React';
        }

        if ((window as any).__VUE__ ||
            document.querySelector('[data-v-]')) {
          return 'Vue';
        }

        if ((window as any).ng ||
            document.querySelector('[ng-version], [ng-app]')) {
          return 'Angular';
        }

        const scripts = document.querySelectorAll('script[src]');
        const hasLargeBundle = Array.from(scripts).some(s => {
          const src = (s as HTMLScriptElement).src;
          return src.includes('bundle') || src.includes('chunk') || src.includes('vendor');
        });

        if (hasLargeBundle) {
          return 'SPA (generic)';
        }

        return undefined;
      });

      return framework;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Audit multiple pages in parallel
   */
  async auditMultiplePages(
    urls: string[],
    progressCallback?: (current: number, total: number) => void
  ): Promise<AuditReport> {
    const baseUrl = urls[0];
    const CONCURRENCY = EnhancedWCAGAuditor.DEFAULT_CONCURRENCY;
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
          // Don't add as violation - handle separately
        }

        processedCount++;
        if (progressCallback) {
          progressCallback(processedCount, urls.length);
        }
      });
    }

    // Calculate violations WITHOUT deduplication
    // Each violation instance is counted separately across all pages
    let totalViolations = 0;
    let criticalIssues = 0;
    let seriousIssues = 0;
    let moderateIssues = 0;
    let minorIssues = 0;

    pageResults.forEach(page => {
      page.violations.forEach(v => {
        totalViolations++;
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
    });

    // Track unique violation TYPES (for reporting variety of issues)
    const uniqueViolationTypesSet = new Set<string>();
    pageResults.forEach(page => {
      page.violations.forEach(v => {
        uniqueViolationTypesSet.add(v.id);
      });
    });
    const uniqueViolationTypes = uniqueViolationTypesSet.size;

    // Calculate accessibility score
    const accessibilityScore = this.calculateAccessibilityScore(pageResults, {
      totalViolations,
      criticalIssues,
      seriousIssues,
      moderateIssues,
      minorIssues
    });

    // Calculate score breakdown
    const scoreBreakdown = this.calculateScoreBreakdown(pageResults, {
      totalViolations,
      criticalIssues,
      seriousIssues,
      moderateIssues,
      minorIssues
    });

    return {
      baseUrl,
      totalPages: pageResults.length,
      totalViolations,
      uniqueViolationTypes,
      criticalIssues,
      seriousIssues,
      moderateIssues,
      minorIssues,
      pages: pageResults,
      scanDate: new Date(),
      wcagVersion: '2.2',
      conformanceLevel: 'AA',
      accessibilityScore,
      scoreBreakdown
    };
  }

  /**
   * Calculate overall accessibility score (0-100)
   * Weighted scoring algorithm based on violations and quality metrics
   */
  private calculateAccessibilityScore(
    pages: PageAuditResult[],
    violations: {
      totalViolations: number;
      criticalIssues: number;
      seriousIssues: number;
      moderateIssues: number;
      minorIssues: number;
    }
  ): number {
    // Start with perfect score
    let score = 100;

    // Deduct points for violations (weighted by severity)
    // Critical: -10 points each (severe impact)
    // Serious: -4 points each (significant impact)
    // Moderate: -1 point each (medium impact)
    // Minor: -0.2 points each (low impact)
    score -= violations.criticalIssues * 10;
    score -= violations.seriousIssues * 4;
    score -= violations.moderateIssues * 1;
    score -= violations.minorIssues * 0.2;

    // Consider quality metrics from pages
    const avgKeyboardScore = this.calculateAverageKeyboardScore(pages);
    const avgScreenReaderScore = this.calculateAverageScreenReaderScore(pages);
    const avgPerformanceScore = this.calculateAveragePerformanceScore(pages);

    // Weighted combination (50% violations, 20% keyboard, 20% screen reader, 10% performance)
    score = score * 0.5 + avgKeyboardScore * 0.2 + avgScreenReaderScore * 0.2 + avgPerformanceScore * 0.1;

    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate detailed score breakdown by category
   */
  private calculateScoreBreakdown(
    pages: PageAuditResult[],
    violations: {
      totalViolations: number;
      criticalIssues: number;
      seriousIssues: number;
      moderateIssues: number;
      minorIssues: number;
    }
  ): {
    wcagCompliance: number;
    keyboardAccessibility: number;
    screenReaderCompatibility: number;
    performanceScore: number;
  } {
    // WCAG Compliance score based on violations
    let wcagScore = 100;
    wcagScore -= violations.criticalIssues * 10;
    wcagScore -= violations.seriousIssues * 4;
    wcagScore -= violations.moderateIssues * 1;
    wcagScore -= violations.minorIssues * 0.2;
    wcagScore = Math.max(0, Math.min(100, Math.round(wcagScore)));

    return {
      wcagCompliance: wcagScore,
      keyboardAccessibility: this.calculateAverageKeyboardScore(pages),
      screenReaderCompatibility: this.calculateAverageScreenReaderScore(pages),
      performanceScore: this.calculateAveragePerformanceScore(pages)
    };
  }

  /**
   * Calculate average keyboard accessibility score across all pages
   */
  private calculateAverageKeyboardScore(pages: PageAuditResult[]): number {
    const pagesWithKeyboard = pages.filter(p => p.keyboardAccessibility);
    if (pagesWithKeyboard.length === 0) return 0;

    let totalScore = 0;
    pagesWithKeyboard.forEach(page => {
      const kb = page.keyboardAccessibility!;
      let score = 100;
      if (!kb.tabOrderCorrect) score -= 30;
      if (!kb.focusVisible) score -= 40;
      if (!kb.noKeyboardTraps) score -= 30;
      totalScore += Math.max(0, score);
    });

    return Math.round(totalScore / pagesWithKeyboard.length);
  }

  /**
   * Calculate average screen reader compatibility score across all pages
   */
  private calculateAverageScreenReaderScore(pages: PageAuditResult[]): number {
    const pagesWithScreenReader = pages.filter(p => p.screenReaderCompatibility);
    if (pagesWithScreenReader.length === 0) return 0;

    const totalScore = pagesWithScreenReader.reduce(
      (sum, page) => sum + page.screenReaderCompatibility!.score,
      0
    );

    return Math.round(totalScore / pagesWithScreenReader.length);
  }

  /**
   * Calculate average performance score based on load times
   * Scores based on Google's Core Web Vitals thresholds
   */
  private calculateAveragePerformanceScore(pages: PageAuditResult[]): number {
    const pagesWithMetrics = pages.filter(p => p.performanceMetrics);
    if (pagesWithMetrics.length === 0) return 100; // No data = no deduction

    let totalScore = 0;
    pagesWithMetrics.forEach(page => {
      const metrics = page.performanceMetrics!;
      let score = 100;

      // Load Time scoring (ideal: <3s)
      if (metrics.loadTime > 5000) score -= 30;
      else if (metrics.loadTime > 3000) score -= 15;

      // FCP scoring (ideal: <1.8s)
      if (metrics.firstContentfulPaint) {
        if (metrics.firstContentfulPaint > 3000) score -= 20;
        else if (metrics.firstContentfulPaint > 1800) score -= 10;
      }

      // LCP scoring (ideal: <2.5s)
      if (metrics.largestContentfulPaint) {
        if (metrics.largestContentfulPaint > 4000) score -= 20;
        else if (metrics.largestContentfulPaint > 2500) score -= 10;
      }

      totalScore += Math.max(0, score);
    });

    return Math.round(totalScore / pagesWithMetrics.length);
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
