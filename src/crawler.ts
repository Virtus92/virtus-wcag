import { chromium, Browser, Page } from 'playwright';
import { CrawlResult } from './types';
import { isSameDomain, normalizeUrl } from './utils/validation';

export class WebCrawler {
  private browser: Browser | null = null;
  private discoveredUrls = new Set<string>();
  private visitedUrls = new Set<string>();
  private failedUrls: string[] = [];
  private retryCount = new Map<string, number>();
  private readonly MAX_RETRIES = 2;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });
  }

  async crawl(
    startUrl: string,
    maxPages: number = 50,
    followExternal: boolean = false
  ): Promise<CrawlResult> {
    if (!this.browser) {
      await this.initialize();
    }

    this.discoveredUrls.clear();
    this.visitedUrls.clear();
    this.failedUrls = [];
    this.retryCount.clear();

    const normalizedStart = normalizeUrl(startUrl);
    this.discoveredUrls.add(normalizedStart);

    const urlsToVisit = [normalizedStart];

    while (urlsToVisit.length > 0 && this.visitedUrls.size < maxPages) {
      const currentUrl = urlsToVisit.shift()!;

      if (this.visitedUrls.has(currentUrl)) {
        continue;
      }

      console.log(`Crawling: ${currentUrl} (${this.visitedUrls.size + 1}/${maxPages})`);

      try {
        const links = await this.extractLinks(currentUrl);
        this.visitedUrls.add(currentUrl);
        this.retryCount.delete(currentUrl); // Clear retry count on success

        for (const link of links) {
          const normalizedLink = normalizeUrl(link);

          if (this.visitedUrls.has(normalizedLink) || this.discoveredUrls.has(normalizedLink)) {
            continue;
          }

          // Check domain restriction
          if (!followExternal && !isSameDomain(startUrl, normalizedLink)) {
            continue;
          }

          this.discoveredUrls.add(normalizedLink);

          if (this.visitedUrls.size + urlsToVisit.length < maxPages) {
            urlsToVisit.push(normalizedLink);
          }
        }
      } catch (error) {
        const retries = this.retryCount.get(currentUrl) || 0;

        if (retries < this.MAX_RETRIES) {
          // Retry the page
          console.warn(`Retry ${retries + 1}/${this.MAX_RETRIES} for ${currentUrl}`);
          this.retryCount.set(currentUrl, retries + 1);
          urlsToVisit.push(currentUrl); // Add back to queue for retry
        } else {
          // Max retries reached
          console.error(`Failed to crawl ${currentUrl} after ${this.MAX_RETRIES} retries:`, error);
          this.failedUrls.push(currentUrl);
          this.visitedUrls.add(currentUrl); // Mark as visited to avoid infinite retry
        }
      }
    }

    // Return ALL discovered URLs (both visited and unvisited)
    // This ensures we audit all pages we found, even if we hit maxPages limit during crawling
    const allUrls = new Set([...this.visitedUrls, ...this.discoveredUrls]);

    return {
      discoveredUrls: Array.from(allUrls),
      failedUrls: this.failedUrls,
    };
  }

  private async extractLinks(url: string): Promise<string[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    const links: string[] = [];

    try {
      // Set realistic user agent to avoid bot detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
      });

      // Try to navigate, with fallback for timeout
      let response = null;
      let navigationError = null;

      try {
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });
      } catch (err: any) {
        navigationError = err;
        console.warn(`Navigation timeout for ${url}, checking if page loaded anyway...`);

        // Wait a bit for any pending navigation to settle
        await page.waitForTimeout(2000);

        // Check if page loaded despite timeout
        try {
          const readyState = await page.evaluate(() => document.readyState).catch(() => null);
          const title = await page.title().catch(() => '');

          if (readyState === 'complete' || readyState === 'interactive' || title) {
            console.log(`✅ Page accessible (readyState: ${readyState}, title: ${title})`);
            navigationError = null; // Clear error - page is accessible
          }
        } catch {
          // If we can't even check readyState, re-throw original error
          throw navigationError;
        }
      }

      // If navigation failed and page didn't load, throw error
      if (navigationError) {
        throw navigationError;
      }

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

      // Simple wait for JavaScript to load links (reduced from 9s to 2s)
      await page.waitForTimeout(2000);

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
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
