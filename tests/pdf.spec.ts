import { describe, it, expect, beforeAll } from 'vitest';
import { ExecutiveReportGenerator } from '../src/pdf-generator-executive';
import { AuditReport } from '../src/types';
import { promises as fs } from 'fs';
import { join } from 'path';

const reportsDir = join(__dirname, '..', 'reports');

beforeAll(async () => {
  await fs.mkdir(reportsDir, { recursive: true });
});

describe('PDF generator (executive)', () => {
  it('generates a PDF from a minimal report', async () => {
    const generator = new ExecutiveReportGenerator();
    const report: AuditReport = {
      baseUrl: 'http://example.local/',
      totalPages: 1,
      totalViolations: 2,
      uniqueViolationTypes: 2,
      criticalIssues: 1,
      seriousIssues: 1,
      moderateIssues: 0,
      minorIssues: 0,
      pages: [
        {
          url: 'http://example.local/index.html',
          title: 'Example',
          violations: [
            { id: 'custom-button-text', impact: 'critical', description: 'x', help: 'h', helpUrl: 'u', tags: [], nodes: [{ html: '<button></button>', target: [], failureSummary: '' }] },
            { id: 'custom-form-label', impact: 'serious', description: 'x', help: 'h', helpUrl: 'u', tags: [], nodes: [{ html: '<input/>', target: [], failureSummary: '' }] },
          ],
          passes: 0,
          incomplete: 0,
          timestamp: new Date(),
        }
      ],
      scanDate: new Date(),
      wcagVersion: '2.2',
      conformanceLevel: 'AA',
      accessibilityScore: 75,
      scoreBreakdown: {
        wcagCompliance: 70,
        keyboardAccessibility: 80,
        screenReaderCompatibility: 75,
        performanceScore: 90,
      },
    };

    const out = join(reportsDir, 'test-executive.pdf');
    await generator.generate(report, out);
    const stat = await fs.stat(out);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('generates report with multiple pages and violation severities', async () => {
    const generator = new ExecutiveReportGenerator();
    const report: AuditReport = {
      baseUrl: 'http://example.local/',
      totalPages: 3,
      totalViolations: 45,
      uniqueViolationTypes: 25,
      criticalIssues: 5,
      seriousIssues: 12,
      moderateIssues: 18,
      minorIssues: 10,
      pages: [
        {
          url: 'http://example.local/index.html',
          title: 'Home Page',
          violations: [
            { id: 'button-name', impact: 'critical', description: 'Button has no accessible name', help: 'Buttons must have text', helpUrl: 'https://dequeuniversity.com/rules', tags: ['wcag2a'], nodes: [{ html: '<button></button>', target: ['button'], failureSummary: 'Fix: Add text' }] },
            { id: 'color-contrast', impact: 'serious', description: 'Insufficient contrast', help: 'Ensure contrast', helpUrl: 'https://dequeuniversity.com/rules', tags: ['wcag2aa'], nodes: [{ html: '<p style="color:#aaa">text</p>', target: ['p'], failureSummary: 'Fix: Increase contrast' }] },
          ],
          passes: 28,
          incomplete: 2,
          timestamp: new Date(),
        },
        {
          url: 'http://example.local/about.html',
          title: 'About Page',
          violations: [
            { id: 'label', impact: 'serious', description: 'Form element missing label', help: 'Forms must have labels', helpUrl: 'https://dequeuniversity.com/rules', tags: ['wcag2a'], nodes: [{ html: '<input type="text">', target: ['input'], failureSummary: 'Fix: Add label' }] },
          ],
          passes: 30,
          incomplete: 1,
          timestamp: new Date(),
        },
        {
          url: 'http://example.local/contact.html',
          title: 'Contact Page',
          violations: [],
          passes: 32,
          incomplete: 0,
          timestamp: new Date(),
        },
      ],
      scanDate: new Date(),
      wcagVersion: '2.2',
      conformanceLevel: 'AA',
      accessibilityScore: 65,
      scoreBreakdown: {
        wcagCompliance: 60,
        keyboardAccessibility: 70,
        screenReaderCompatibility: 65,
        performanceScore: 75,
      },
    };

    const out = join(reportsDir, 'test-executive-comprehensive.pdf');
    await generator.generate(report, out);
    const stat = await fs.stat(out);
    expect(stat.size).toBeGreaterThan(5000); // Comprehensive report should be larger
  });
});
