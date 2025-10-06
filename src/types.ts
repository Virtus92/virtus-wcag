export interface AuditRequest {
  url: string;
  maxPages?: number;
  followExternal?: boolean;
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
  discoveredUrls: string[];
  failedUrls: string[];
}
