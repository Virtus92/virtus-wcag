/**
 * Mock Data for Testing
 *
 * Centralized mock data for consistent testing across the application.
 * All data follows realistic patterns and WCAG 2.2 AA standards.
 */

import { AuditReport, PageAuditResult, Violation, AuditRequest } from '../../src/types';

/**
 * Mock WCAG Violations
 */
export const mockViolations = {
  critical: {
    id: 'button-name',
    impact: 'critical' as const,
    description: 'Buttons must have discernible text',
    help: 'Ensure buttons have accessible names',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/button-name',
    tags: ['wcag2a', 'wcag412', 'section508'],
    nodes: [
      {
        html: '<button id="submit"></button>',
        target: ['#submit'],
        failureSummary: 'Fix any of the following:\n  Element does not have inner text that is visible to screen readers\n  aria-label attribute does not exist or is empty',
      },
    ],
  },

  serious: {
    id: 'color-contrast',
    impact: 'serious' as const,
    description: 'Elements must have sufficient color contrast',
    help: 'Ensure contrast ratio is at least 4.5:1',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
    tags: ['wcag2aa', 'wcag143'],
    nodes: [
      {
        html: '<p style="color: #767676; background: #ffffff;">Low contrast text</p>',
        target: ['p:nth-child(2)'],
        failureSummary: 'Fix any of the following:\n  Element has insufficient color contrast of 3.9 (foreground color: #767676, background color: #ffffff)',
      },
    ],
  },

  moderate: {
    id: 'label',
    impact: 'moderate' as const,
    description: 'Form elements must have labels',
    help: 'Ensure every form element has a label',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/label',
    tags: ['wcag2a', 'wcag412'],
    nodes: [
      {
        html: '<input type="text" name="username">',
        target: ['input[name="username"]'],
        failureSummary: 'Fix any of the following:\n  Form element does not have an implicit (wrapped) <label>\n  Form element does not have an explicit <label>',
      },
    ],
  },

  minor: {
    id: 'region',
    impact: 'minor' as const,
    description: 'All page content should be contained by landmarks',
    help: 'Ensure all page content is contained by landmarks',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/region',
    tags: ['best-practice'],
    nodes: [
      {
        html: '<div>Content outside landmarks</div>',
        target: ['div:nth-child(5)'],
        failureSummary: 'Fix any of the following:\n  Some page content is not contained by landmarks',
      },
    ],
  },
};

/**
 * Mock Page Audit Results
 */
export const mockPageResults = {
  clean: (): PageAuditResult => ({
    url: 'https://example.com/clean',
    title: 'Clean Page - No Issues',
    violations: [],
    passes: 45,
    incomplete: 0,
    timestamp: new Date('2025-01-15T10:00:00Z'),
  }),

  singleIssue: (): PageAuditResult => ({
    url: 'https://example.com/single-issue',
    title: 'Page with Single Issue',
    violations: [mockViolations.critical],
    passes: 44,
    incomplete: 1,
    timestamp: new Date('2025-01-15T10:01:00Z'),
  }),

  multipleIssues: (): PageAuditResult => ({
    url: 'https://example.com/multiple-issues',
    title: 'Page with Multiple Issues',
    violations: [
      mockViolations.critical,
      mockViolations.serious,
      mockViolations.moderate,
      mockViolations.minor,
    ],
    passes: 41,
    incomplete: 3,
    timestamp: new Date('2025-01-15T10:02:00Z'),
  }),

  criticalOnly: (): PageAuditResult => ({
    url: 'https://example.com/critical',
    title: 'Page with Critical Issues Only',
    violations: [mockViolations.critical, { ...mockViolations.critical, id: 'image-alt' }],
    passes: 43,
    incomplete: 0,
    timestamp: new Date('2025-01-15T10:03:00Z'),
  }),
};

/**
 * Mock Audit Reports
 */
export const mockAuditReports = {
  minimal: (): AuditReport => ({
    baseUrl: 'https://example.com',
    totalPages: 1,
    totalViolations: 0,
    uniqueViolationTypes: 0,
    criticalIssues: 0,
    seriousIssues: 0,
    moderateIssues: 0,
    minorIssues: 0,
    pages: [mockPageResults.clean()],
    scanDate: new Date('2025-01-15T10:00:00Z'),
    wcagVersion: '2.2',
    conformanceLevel: 'AA',
    accessibilityScore: 100,
    scoreBreakdown: {
      wcagCompliance: 100,
      keyboardAccessibility: 100,
      screenReaderCompatibility: 100,
      performanceScore: 100,
    },
  }),

  typical: (): AuditReport => ({
    baseUrl: 'https://example.com',
    totalPages: 3,
    totalViolations: 12,
    uniqueViolationTypes: 4,
    criticalIssues: 2,
    seriousIssues: 4,
    moderateIssues: 4,
    minorIssues: 2,
    pages: [
      mockPageResults.multipleIssues(),
      mockPageResults.singleIssue(),
      mockPageResults.clean(),
    ],
    scanDate: new Date('2025-01-15T10:00:00Z'),
    wcagVersion: '2.2',
    conformanceLevel: 'AA',
    accessibilityScore: 72,
    scoreBreakdown: {
      wcagCompliance: 70,
      keyboardAccessibility: 75,
      screenReaderCompatibility: 72,
      performanceScore: 80,
    },
  }),

  comprehensive: (): AuditReport => ({
    baseUrl: 'https://example.com',
    totalPages: 10,
    totalViolations: 87,
    uniqueViolationTypes: 15,
    criticalIssues: 12,
    seriousIssues: 28,
    moderateIssues: 35,
    minorIssues: 12,
    pages: [
      mockPageResults.multipleIssues(),
      mockPageResults.criticalOnly(),
      mockPageResults.singleIssue(),
      mockPageResults.clean(),
      mockPageResults.multipleIssues(),
      mockPageResults.multipleIssues(),
      mockPageResults.singleIssue(),
      mockPageResults.clean(),
      mockPageResults.multipleIssues(),
      mockPageResults.singleIssue(),
    ],
    scanDate: new Date('2025-01-15T10:00:00Z'),
    wcagVersion: '2.2',
    conformanceLevel: 'AA',
    accessibilityScore: 45,
    scoreBreakdown: {
      wcagCompliance: 40,
      keyboardAccessibility: 50,
      screenReaderCompatibility: 45,
      performanceScore: 60,
    },
  }),

  failing: (): AuditReport => ({
    baseUrl: 'https://example.com',
    totalPages: 5,
    totalViolations: 156,
    uniqueViolationTypes: 25,
    criticalIssues: 45,
    seriousIssues: 67,
    moderateIssues: 32,
    minorIssues: 12,
    pages: [
      mockPageResults.criticalOnly(),
      mockPageResults.multipleIssues(),
      mockPageResults.criticalOnly(),
      mockPageResults.multipleIssues(),
      mockPageResults.criticalOnly(),
    ],
    scanDate: new Date('2025-01-15T10:00:00Z'),
    wcagVersion: '2.2',
    conformanceLevel: 'AA',
    accessibilityScore: 15,
    scoreBreakdown: {
      wcagCompliance: 12,
      keyboardAccessibility: 18,
      screenReaderCompatibility: 15,
      performanceScore: 25,
    },
  }),
};

/**
 * Mock Audit Requests
 */
export const mockAuditRequests = {
  valid: (): AuditRequest => ({
    url: 'https://example.com',
    maxPages: 10,
    socketId: 'test-socket-123',
  }),

  minimal: (): AuditRequest => ({
    url: 'https://example.com',
    maxPages: 1,
    socketId: 'test-socket-456',
  }),

  large: (): AuditRequest => ({
    url: 'https://example.com',
    maxPages: 100,
    socketId: 'test-socket-789',
  }),

  invalidUrl: (): Partial<AuditRequest> => ({
    url: 'not-a-url',
    maxPages: 10,
    socketId: 'test-socket-invalid',
  }),

  missingSocketId: (): Partial<AuditRequest> => ({
    url: 'https://example.com',
    maxPages: 10,
  }),

  exceedingLimit: (): AuditRequest => ({
    url: 'https://example.com',
    maxPages: 1000, // Exceeds MAX_PAGES_LIMIT
    socketId: 'test-socket-exceed',
  }),
};

/**
 * Mock Job Status
 */
export const mockJobStatus = {
  pending: (jobId: string) => ({
    jobId,
    status: 'pending' as const,
    progress: {
      stage: 'pending' as const,
      currentPage: 0,
      totalPages: 0,
      message: 'Job queued',
    },
    createdAt: new Date(),
  }),

  crawling: (jobId: string) => ({
    jobId,
    status: 'in_progress' as const,
    progress: {
      stage: 'crawling' as const,
      currentPage: 2,
      totalPages: 5,
      message: 'Discovering pages...',
    },
    createdAt: new Date(),
  }),

  auditing: (jobId: string) => ({
    jobId,
    status: 'in_progress' as const,
    progress: {
      stage: 'auditing' as const,
      currentPage: 3,
      totalPages: 5,
      message: 'Auditing page 3 of 5',
    },
    createdAt: new Date(),
  }),

  generating: (jobId: string) => ({
    jobId,
    status: 'in_progress' as const,
    progress: {
      stage: 'generating' as const,
      currentPage: 5,
      totalPages: 5,
      message: 'Generating PDF report...',
    },
    createdAt: new Date(),
  }),

  completed: (jobId: string) => ({
    jobId,
    status: 'completed' as const,
    progress: {
      stage: 'complete' as const,
      currentPage: 5,
      totalPages: 5,
      message: 'Audit complete',
    },
    createdAt: new Date(),
    completedAt: new Date(),
    report: mockAuditReports.typical(),
  }),

  failed: (jobId: string) => ({
    jobId,
    status: 'failed' as const,
    progress: {
      stage: 'error' as const,
      currentPage: 2,
      totalPages: 5,
      message: 'Audit failed: Network timeout',
    },
    createdAt: new Date(),
    error: 'Network timeout during crawl',
  }),
};

/**
 * Helper to generate unique IDs for testing
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper to create a deep copy of mock data
 */
export function cloneMockData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
