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
    };

    const out = join(reportsDir, 'test-executive.pdf');
    await generator.generate(report, out);
    const stat = await fs.stat(out);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('estimates remediation costs in realistic bundles', () => {
    const generator = new ExecutiveReportGenerator();
    const baseReport: AuditReport = {
      baseUrl: 'http://example.local/',
      totalPages: 2,
      totalViolations: 0,
      criticalIssues: 0,
      seriousIssues: 0,
      moderateIssues: 0,
      minorIssues: 0,
      pages: [],
      scanDate: new Date(),
      wcagVersion: '2.2',
      conformanceLevel: 'AA',
    };

    const estimateZero = (generator as any).estimateCosts(baseReport) as { total: { min: number; max: number } };
    expect(estimateZero.total.min).toBe(0);
    expect(estimateZero.total.max).toBe(0);

    const busyReport: AuditReport = {
      ...baseReport,
      totalViolations: 45,
      criticalIssues: 5,
      seriousIssues: 12,
      moderateIssues: 18,
      minorIssues: 10,
    };

    const estimate = (generator as any).estimateCosts(busyReport) as {
      bundleCount: number;
      perBundle: { min: number; max: number };
      total: { min: number; max: number };
      timelineWeeks: { min: number; max: number };
      severity: Record<string, { min: number; max: number }>;
    };

    expect(estimate.bundleCount).toBe(3);
    expect(estimate.perBundle.min).toBe(500);
    expect(estimate.perBundle.max).toBe(1000);
    expect(estimate.total).toEqual({ min: 1500, max: 3000 });
    expect(estimate.timelineWeeks).toEqual({ min: 3, max: 6 });

    const severityTotals = Object.values(estimate.severity).reduce(
      (acc, current) => ({
        min: acc.min + current.min,
        max: acc.max + current.max,
      }),
      { min: 0, max: 0 }
    );
    expect(severityTotals).toEqual(estimate.total);
  });
});
