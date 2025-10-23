import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { CrawlResult, FailedUrl } from './types';
import { waitForQuietPage, applyDeterministicContext } from './utils/stability';
import { canonicalizeUrl, sameBaseDomain, sameHostname } from './utils/url';
import { auditConfig } from './config';

/**
 * Crawler options controlling scope and budgets.
 */
export interface CrawlerOptions {
  includeSubdomains?: boolean;
  maxPages?: number;
  maxDepth?: number;
  maxTimeMs?: number;
  respectRobotsTxt?: boolean;
}

/**
 * Deterministic frontier-based crawler with polite defaults and budgeted exploration.
 */
export class WebCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private discoveredUrls = new Set<string>();
  private visitedUrls = new Set<string>();
  private failedUrls: FailedUrl[] = [];
  private retryCount = new Map<string, number>();
  private readonly MAX_RETRIES = 1;
  private robotsDisallows: string[] = [];

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    });
    // Single context for deterministic headers/viewport and potential HAR later
    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36 A11yCrawler/1.0',
    });
  }

  async crawl(
    startUrl: string,
    maxPages: number = auditConfig.maxPagesDefault,
    includeSubdomains: boolean = true,
    options: CrawlerOptions = {}
  ): Promise<CrawlResult> {
    if (!this.browser) {
      await this.initialize();
    }

    this.discoveredUrls.clear();
    this.visitedUrls.clear();
    this.failedUrls = [];
    this.retryCount.clear();

    const canonicalStart = canonicalizeUrl(startUrl);
    this.discoveredUrls.add(canonicalStart);

    const cfg: Required<CrawlerOptions> = {
      includeSubdomains,
      maxPages,
      maxDepth: options.maxDepth ?? 4,
      maxTimeMs: options.maxTimeMs ?? 2 * 60 * 1000,
      respectRobotsTxt: options.respectRobotsTxt ?? true,
    };

    const startTime = Date.now();

    // Load robots.txt disallows (best-effort)
    if (cfg.respectRobotsTxt) {
      try {
        await this.loadRobots(canonicalStart);
      } catch {/* ignore */}
    }

    // Attempt to enqueue sitemap URLs early (best-effort)
    const frontier: Array<{ url: string; depth: number; referrer?: string }> = [{ url: canonicalStart, depth: 0 }];
    try {
      const sitemapUrls = await this.fetchSitemapUrls(canonicalStart);
      for (const u of sitemapUrls) {
        const cu = canonicalizeUrl(u);
        if (!this.discoveredUrls.has(cu)) {
          this.discoveredUrls.add(cu);
          frontier.push({ url: cu, depth: 1, referrer: canonicalStart });
        }
      }
    } catch {/* ignore */}

    while (frontier.length > 0 && this.visitedUrls.size < cfg.maxPages && Date.now() - startTime < cfg.maxTimeMs) {
      const next = frontier.shift()!;
      const currentUrl = next.url;

      if (this.visitedUrls.has(currentUrl)) {
        continue;
      }

      // Scope constraint: domain or base domain
      const inScope = cfg.includeSubdomains ? sameBaseDomain(canonicalStart, currentUrl) : sameHostname(canonicalStart, currentUrl);
      if (!inScope) continue;
      if (next.depth > cfg.maxDepth) continue;
      if (cfg.respectRobotsTxt && this.isDisallowedByRobots(currentUrl)) continue;

      console.log(`Crawling: ${currentUrl} (depth ${next.depth})`);

      try {
        const links = await this.extractLinks(currentUrl);
        this.visitedUrls.add(currentUrl);
        this.retryCount.delete(currentUrl); // Clear retry count on success

        console.log(`Found ${links.length} links on ${currentUrl}`);

        let addedCount = 0;
        let duplicateCount = 0;
        let scopeFilteredCount = 0;

        for (const link of links) {
          const cu = canonicalizeUrl(link);
          if (this.visitedUrls.has(cu) || this.discoveredUrls.has(cu)) {
            duplicateCount++;
            continue;
          }

          const scopeOk = cfg.includeSubdomains ? sameBaseDomain(canonicalStart, cu) : sameHostname(canonicalStart, cu);
          if (!scopeOk || (cfg.respectRobotsTxt && this.isDisallowedByRobots(cu))) {
            scopeFilteredCount++;
            continue;
          }

          this.discoveredUrls.add(cu);
          frontier.push({ url: cu, depth: next.depth + 1, referrer: currentUrl });
          addedCount++;
        }

        console.log(`  → Added ${addedCount} new URLs, ${duplicateCount} duplicates, ${scopeFilteredCount} filtered by scope/robots`);
        console.log(`  → Frontier size: ${frontier.length}, Visited: ${this.visitedUrls.size}/${cfg.maxPages}`);
      } catch (error) {
        const retries = this.retryCount.get(currentUrl) || 0;

        if (retries < this.MAX_RETRIES) {
          // Retry the page
          console.warn(`Retry ${retries + 1}/${this.MAX_RETRIES} for ${currentUrl}`);
          this.retryCount.set(currentUrl, retries + 1);
          frontier.push({ url: currentUrl, depth: next.depth, referrer: next.referrer });
        } else {
          // Max retries reached
          console.error(`Failed to crawl ${currentUrl} after ${this.MAX_RETRIES} retries:`, error);
          this.failedUrls.push({
            url: currentUrl,
            reason: error instanceof Error ? error.message : 'Unknown error',
            statusCode: undefined,
            retryCount: this.MAX_RETRIES
          });
          this.visitedUrls.add(currentUrl); // Mark as visited to avoid infinite retry
        }
      }
    }

    // Return ONLY visited URLs - these are the pages we actually crawled
    // Discovered but unvisited URLs are excluded to ensure accurate auditing
    const unvisitedUrls = Array.from(this.discoveredUrls).filter(
      url => !this.visitedUrls.has(url)
    );

    console.log(`Crawl complete: ${this.visitedUrls.size} visited, ${unvisitedUrls.length} discovered but not visited`);

    return {
      discoveredUrls: Array.from(this.visitedUrls),
      unvisitedUrls: unvisitedUrls,
      failedUrls: this.failedUrls,
    };
  }

  private async extractLinks(url: string): Promise<string[]> {
    if (!this.browser || !this.context) {
      throw new Error('Browser not initialized');
    }

    const page = await this.context.newPage();
    const links: string[] = [];

    try {
      // Set realistic user agent to avoid bot detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
      });

      // Deterministic navigation and stabilization
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: auditConfig.crawlTimeoutMs });
      await applyDeterministicContext(page);
      await waitForQuietPage(page, {
        timeoutMs: Math.max(5000, auditConfig.contentWaitMs + 3000),
        maxInflightRequests: 2,
        domQuietWindowMs: 800,
        extraWaitMs: 200,
      });

      // Check response status (if we got one)
      if (response && !response.ok()) {
        const status = response.status();

        if (status === 401 || status === 403) {
          console.log(`Auth required for ${url} (${status}), skipping`);
          throw new Error(`Authentication required (${status})`);
        }

        if (status === 404 || status === 410) {
          console.log(`Page not found ${url} (${status}), skipping`);
          throw new Error(`Page not found (${status})`);
        }

        if (status >= 500) {
          console.log(`Server error for ${url} (${status}), skipping`);
          throw new Error(`Server error (${status})`);
        }
      }

      // Detect redirect loops
      const finalUrl = page.url();
      if (response && finalUrl !== url && !finalUrl.startsWith(url)) {
        console.log(`Redirect detected: ${url} → ${finalUrl}`);
      }

      // Extract all links - filter out non-HTML resources
      const hrefs = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => {
            if (!href || (!href.startsWith('http://') && !href.startsWith('https://'))) {
              return false;
            }

            // Filter out common non-HTML file types that can't be crawled
            const fileExtensions = ['.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx',
                                   '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif',
                                   '.svg', '.mp4', '.mp3', '.avi', '.mov', '.zip',
                                   '.rar', '.tar', '.gz', '.exe', '.dmg'];

            const lowerHref = href.toLowerCase();
            return !fileExtensions.some(ext => lowerHref.endsWith(ext));
          });
      });

      links.push(...hrefs);
    } catch (error: any) {
      // Provide more context for different error types
      if (error.message?.includes('Timeout')) {
        console.warn(`Timeout loading ${url} - may have heavy JS or external dependencies`);
      } else if (error.message?.includes('net::')) {
        console.warn(`Network error loading ${url}: ${error.message}`);
      }
      throw error;
    } finally {
      await page.close();
    }

    return [...new Set(links)]; // Deduplicate
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

  /**
   * Load robots.txt and store Disallow rules for User-agent: * (naive parser).
   */
  private async loadRobots(fromUrl: string): Promise<void> {
    try {
      const base = new URL(fromUrl);
      const robotsUrl = `${base.origin}/robots.txt`;
      const res = await fetch(robotsUrl);
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.split(/\r?\n/);
      let applies = false;
      const disallows: string[] = [];
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const [key, value] = line.split(':').map(s => s.trim());
        if (!key || value == null) continue;
        if (/^user-agent$/i.test(key)) {
          applies = value === '*' || value.toLowerCase() === 'a11ycrawler';
        } else if (applies && /^disallow$/i.test(key)) {
          disallows.push(value);
        }
      }
      this.robotsDisallows = disallows.filter(Boolean);
    } catch {
      // ignore
    }
  }

  private isDisallowedByRobots(targetUrl: string): boolean {
    if (!this.robotsDisallows.length) return false;
    try {
      const u = new URL(targetUrl);
      const path = u.pathname || '/';
      return this.robotsDisallows.some(rule => rule !== '' && path.startsWith(rule));
    } catch {
      return false;
    }
  }

  /**
   * Best-effort extraction of URLs from a sitemap.xml at site root.
   */
  private async fetchSitemapUrls(fromUrl: string): Promise<string[]> {
    try {
      const base = new URL(fromUrl);
      const url = `${base.origin}/sitemap.xml`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return [];
      const xml = await res.text();
      const out: string[] = [];
      const re = /<loc>([^<]+)<\/loc>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml))) {
        out.push(m[1].trim());
        if (out.length > 1000) break; // safety
      }
      return out;
    } catch {
      return [];
    }
  }
}
