export interface AuditRequest {
  url: string;
  maxPages?: number;
  includeSubdomains?: boolean; // Include subdomains (www, blog, etc.) in crawl
}

export interface PageAuditResult {
  url: string;
  title: string;
  violations: Violation[];
  passes: number;
  incomplete: number;
  timestamp: Date;
  loadTime?: number;
  statusCode?: number;
  // Performance metrics
  performanceMetrics?: {
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    totalSize?: number;
    requestCount?: number;
  };
  // SPA detection
  frameworkDetected?: string;
  isJavaScriptHeavy?: boolean;
  // Keyboard navigation
  keyboardAccessibility?: {
    tabOrderCorrect: boolean;
    focusVisible: boolean;
    noKeyboardTraps: boolean;
    issues: string[];
  };
  // Screen reader compatibility
  screenReaderCompatibility?: {
    hasProperHeadings: boolean;
    hasAriaLabels: boolean;
    hasLandmarks: boolean;
    score: number; // 0-100
  };
}

export interface Violation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: ViolationNode[];
  tags: string[];
}

export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export interface AuditReport {
  baseUrl: string;
  totalPages: number;
  totalViolations: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  pages: PageAuditResult[];
  scanDate: Date;
  wcagVersion: string;
  conformanceLevel: string;
  scanDuration?: number;
  deadLinks?: DeadLink[];
}

export interface DeadLink {
  url: string;
  foundOn: string[];
  statusCode: number;
  statusText: string;
}

export interface CrawlResult {
  discoveredUrls: string[]; // Actually visited and crawled URLs
  unvisitedUrls: string[]; // Discovered but not visited (hit maxPages limit)
  failedUrls: FailedUrl[]; // URLs that failed after max retries
}

export interface FailedUrl {
  url: string;
  reason: string;
  statusCode?: number;
  retryCount: number;
}
