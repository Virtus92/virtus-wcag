import PDFDocument from 'pdfkit';
import { AuditReport, PageAuditResult, Violation } from './types';
import { createWriteStream } from 'fs';

export class EnterpriseReportGenerator {
  private doc: PDFKit.PDFDocument;
  private pageWidth = 595;
  private margin = 50;
  private contentWidth = 495;
  private currentY = 0;

  // Virtus Umbra color scheme
  private colors = {
    primary: '#a855f7',      // Purple
    secondary: '#9333ea',    // Dark Purple
    critical: '#dc2626',     // Critical red
    serious: '#ef4444',      // Serious red
    moderate: '#f59e0b',     // Warning orange
    minor: '#3b82f6',        // Info blue
    success: '#10b981',      // Success green
    text: '#1e293b',         // Dark text
    textLight: '#64748b',    // Muted text
    border: '#e5e7eb',       // Border
    background: '#f8fafc'    // Light background
  };

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.margin,
      info: {
        Title: 'WCAG 2.2 AA Accessibility Audit Report - Virtus Umbra',
        Author: 'Virtus Umbra',
        Subject: 'Web Accessibility Compliance Report',
        Keywords: 'WCAG, Accessibility, A11y, Compliance, Audit, Virtus Umbra'
      }
    });
    this.currentY = this.margin;
  }

  async generate(report: AuditReport, outputPath: string): Promise<string> {
    const stream = createWriteStream(outputPath);
    this.doc.pipe(stream);

    // Cover Page
    this.addCoverPage(report);
    this.doc.addPage();

    // Table of Contents
    this.addTableOfContents(report);
    this.doc.addPage();

    // Executive Summary
    this.addExecutiveSummary(report);
    this.doc.addPage();

    // Compliance Overview
    this.addComplianceOverview(report);
    this.doc.addPage();

    // Page Inventory
    this.addPageInventory(report);
    this.doc.addPage();

    // Critical Issues (if any)
    if (report.criticalIssues > 0) {
      this.addCriticalIssuesSection(report);
      this.doc.addPage();
    }

    // Detailed Findings by Page
    this.addDetailedFindings(report);

    // Dead Links (if any)
    if (report.deadLinks && report.deadLinks.length > 0) {
      this.doc.addPage();
      this.addDeadLinksSection(report);
    }

    // Recommendations
    this.doc.addPage();
    this.addRecommendations(report);

    // Appendix
    this.doc.addPage();
    this.addAppendix(report);

    this.doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  private addCoverPage(report: AuditReport): void {
    // Header bar
    this.doc.rect(0, 0, this.pageWidth, 120).fill(this.colors.primary);

    // Virtus Umbra logo
    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('◆ Virtus Umbra', this.margin, 25, { align: 'left' })
      .fontSize(36)
      .text('WCAG 2.2 AA', this.margin, 55, { align: 'left' })
      .fontSize(24)
      .text('Accessibility Audit Report', this.margin, 95, { align: 'left' });

    // Reset position
    this.currentY = 180;

    // Website Information Box
    this.doc
      .rect(this.margin, this.currentY, this.contentWidth, 120)
      .fillAndStroke(this.colors.background, this.colors.border);

    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('TARGET WEBSITE', this.margin + 20, this.currentY + 20)
      .fontSize(16)
      .font('Helvetica')
      .fillColor(this.colors.primary)
      .text(report.baseUrl, this.margin + 20, this.currentY + 45, {
        width: this.contentWidth - 40,
        ellipsis: true
      });

    this.currentY += 150;

    // Scan Details Grid
    const gridY = this.currentY;
    const col1X = this.margin;
    const col2X = this.margin + 247;

    this.addInfoBox('SCAN DATE', report.scanDate.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }), col1X, gridY);

    this.addInfoBox('PAGES SCANNED', `${report.totalPages} pages`, col2X, gridY);

    this.addInfoBox('WCAG VERSION', `WCAG ${report.wcagVersion} Level ${report.conformanceLevel}`, col1X, gridY + 100);

    this.addInfoBox('SCAN DURATION', report.scanDuration ? `${Math.round(report.scanDuration / 1000)}s` : 'N/A', col2X, gridY + 100);

    // Compliance Status Box
    this.currentY = gridY + 230;
    const statusColor = this.getComplianceColor(report.totalViolations);
    const statusText = this.getComplianceStatus(report.totalViolations);

    this.doc
      .rect(this.margin, this.currentY, this.contentWidth, 80)
      .fillAndStroke(statusColor, statusColor);

    this.doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(statusText, this.margin, this.currentY + 25, {
        width: this.contentWidth,
        align: 'center'
      });

    // Footer
    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(
        'Entwickelt von Virtus Umbra • 100% Open Source • DSGVO-konform',
        this.margin,
        700,
        { align: 'center', width: this.contentWidth }
      );
  }

  private addTableOfContents(report: AuditReport): void {
    this.addSectionHeader('Table of Contents', this.colors.primary);
    this.currentY += 30;

    const toc = [
      { title: '1. Executive Summary', page: 3 },
      { title: '2. Compliance Overview', page: 4 },
      { title: '3. Page Inventory', page: 5 },
    ];

    if (report.criticalIssues > 0) {
      toc.push({ title: '4. Critical Issues', page: 6 });
    }

    toc.push(
      { title: `${toc.length + 1}. Detailed Findings by Page`, page: toc.length + 2 },
      { title: `${toc.length + 2}. Recommendations`, page: toc.length + 8 },
      { title: `${toc.length + 3}. Appendix: WCAG Guidelines Reference`, page: toc.length + 9 }
    );

    toc.forEach(item => {
      this.doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(item.title, this.margin + 20, this.currentY, { continued: true })
        .text(`Page ${item.page}`, { align: 'right' });

      this.currentY += 25;
    });
  }

  private addExecutiveSummary(report: AuditReport): void {
    this.addSectionHeader('Executive Summary', this.colors.primary);
    this.currentY += 20;

    const duration = report.scanDuration ? `in ${Math.round(report.scanDuration / 1000)} seconds` : '';

    this.doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(
        `This comprehensive accessibility audit was conducted on ${report.scanDate.toLocaleDateString('de-DE')} ${duration} ` +
        `analyzing ${report.totalPages} pages of ${report.baseUrl} against WCAG ${report.wcagVersion} Level ${report.conformanceLevel} standards.`,
        this.margin,
        this.currentY,
        { width: this.contentWidth, align: 'justify' }
      );

    this.currentY = this.doc.y + 20;

    // Key Findings Box
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 180)
      .fillAndStroke(this.colors.background, this.colors.border);

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('KEY FINDINGS', this.margin + 20, this.currentY + 20);

    this.currentY += 50;

    const findings = [
      { label: 'Total Violations Identified', value: report.totalViolations, color: this.colors.critical },
      { label: 'Critical Issues Requiring Immediate Action', value: report.criticalIssues, color: this.colors.critical },
      { label: 'Serious Issues Impacting Accessibility', value: report.seriousIssues, color: this.colors.serious },
      { label: 'Moderate Issues for Improvement', value: report.moderateIssues, color: this.colors.moderate },
      { label: 'Minor Issues Detected', value: report.minorIssues, color: this.colors.minor },
    ];

    findings.forEach(finding => {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(`• ${finding.label}:`, this.margin + 30, this.currentY, { continued: true })
        .font('Helvetica-Bold')
        .fillColor(finding.color)
        .text(` ${finding.value}`);

      this.currentY += 22;
    });

    this.currentY += 40;

    // Impact Statement
    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Impact Assessment:', this.margin, this.currentY)
      .moveDown(0.5)
      .font('Helvetica')
      .text(this.getImpactStatement(report), {
        width: this.contentWidth,
        align: 'justify'
      });
  }

  private addComplianceOverview(report: AuditReport): void {
    this.addSectionHeader('Compliance Overview', this.colors.primary);
    this.currentY += 30;

    // Visual compliance chart (text-based)
    const totalChecks = report.criticalIssues + report.seriousIssues + report.moderateIssues + report.minorIssues;
    const passRate = totalChecks > 0 ? ((totalChecks - report.totalViolations) / totalChecks * 100) : 100;

    this.doc
      .fontSize(48)
      .font('Helvetica-Bold')
      .fillColor(passRate >= 90 ? this.colors.success : passRate >= 70 ? this.colors.moderate : this.colors.critical)
      .text(`${Math.round(passRate)}%`, this.margin, this.currentY, { align: 'center', width: this.contentWidth })
      .fontSize(14)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text('Estimated Compliance Score', this.margin, this.currentY + 60, { align: 'center', width: this.contentWidth });

    this.currentY += 120;

    // Violation breakdown chart
    this.addViolationBreakdownChart(report);
  }

  private addPageInventory(report: AuditReport): void {
    this.addSectionHeader('Page Inventory', this.colors.primary);
    this.currentY += 20;

    this.doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(
        `Complete list of ${report.totalPages} pages analyzed during this audit:`,
        this.margin,
        this.currentY
      );

    this.currentY += 30;

    // Table header
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 25)
      .fill(this.colors.primary);

    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('#', this.margin + 10, this.currentY + 8)
      .text('Page URL', this.margin + 40, this.currentY + 8)
      .text('Violations', this.margin + 380, this.currentY + 8)
      .text('Status', this.margin + 450, this.currentY + 8);

    this.currentY += 25;

    // Table rows
    report.pages.forEach((page, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      const bgColor = index % 2 === 0 ? '#ffffff' : this.colors.background;
      this.doc.rect(this.margin, this.currentY, this.contentWidth, 30)
        .fill(bgColor);

      const statusColor = page.violations.length === 0 ? this.colors.success : this.colors.critical;
      const statusText = page.violations.length === 0 ? '✓ OK' : '✗ Issues';

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(`${index + 1}`, this.margin + 10, this.currentY + 10)
        .text(this.truncateUrl(page.url), this.margin + 40, this.currentY + 10, { width: 330, ellipsis: true })
        .font('Helvetica-Bold')
        .fillColor(this.colors.critical)
        .text(page.violations.length.toString(), this.margin + 395, this.currentY + 10)
        .fillColor(statusColor)
        .text(statusText, this.margin + 450, this.currentY + 10);

      this.currentY += 30;
    });
  }

  private addCriticalIssuesSection(report: AuditReport): void {
    this.addSectionHeader('Critical Issues - Immediate Action Required', this.colors.critical);
    this.currentY += 20;

    this.doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(
        'The following critical accessibility issues were identified and require immediate attention:',
        this.margin,
        this.currentY
      );

    this.currentY += 30;

    let issueNumber = 1;

    report.pages.forEach(page => {
      const criticalViolations = page.violations.filter(v => v.impact === 'critical');

      criticalViolations.forEach(violation => {
        if (this.currentY > 650) {
          this.doc.addPage();
          this.currentY = this.margin;
        }

        this.addViolationDetail(violation, page, issueNumber++, true);
        this.currentY += 20;
      });
    });
  }

  private addDetailedFindings(report: AuditReport): void {
    this.addSectionHeader('Detailed Findings by Page', this.colors.primary);
    this.currentY += 30;

    report.pages.forEach((page, pageIndex) => {
      if (this.currentY > 650 || pageIndex > 0) {
        this.doc.addPage();
        this.currentY = this.margin + 40;
      }

      // Page header
      this.doc.rect(this.margin, this.currentY - 10, this.contentWidth, 50)
        .fillAndStroke(this.colors.secondary, this.colors.secondary);

      this.doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(`Page ${pageIndex + 1}: ${page.title}`, this.margin + 15, this.currentY + 5)
        .fontSize(9)
        .font('Helvetica')
        .text(page.url, this.margin + 15, this.currentY + 25, { width: this.contentWidth - 30, ellipsis: true });

      this.currentY += 60;

      // Page stats
      const stats = [
        `Load Time: ${page.loadTime ? page.loadTime + 'ms' : 'N/A'}`,
        `Violations: ${page.violations.length}`,
        `Passes: ${page.passes}`,
        `Status: ${page.statusCode || 'OK'}`
      ];

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(stats.join('  |  '), this.margin, this.currentY);

      this.currentY += 30;

      if (page.violations.length === 0) {
        this.doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(this.colors.success)
          .text('✓ No accessibility violations found on this page', this.margin + 20, this.currentY);

        this.currentY += 40;
      } else {
        // Group violations by impact
        const grouped = this.groupViolationsByImpact(page.violations);

        ['critical', 'serious', 'moderate', 'minor'].forEach(impact => {
          const violations = grouped[impact as keyof typeof grouped];
          if (violations && violations.length > 0) {
            this.addImpactGroup(impact as any, violations, page);
          }
        });
      }
    });
  }

  private addDeadLinksSection(report: AuditReport): void {
    if (!report.deadLinks || report.deadLinks.length === 0) return;

    this.addSectionHeader('Dead Links Report', this.colors.critical);
    this.currentY += 20;

    this.doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(
        `Found ${report.deadLinks.length} broken link(s) that need attention:`,
        this.margin,
        this.currentY
      );

    this.currentY += 30;

    report.deadLinks.forEach((link, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 60)
        .fillAndStroke(this.colors.background, this.colors.border);

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.critical)
        .text(`${index + 1}. ${link.statusCode} ${link.statusText}`, this.margin + 15, this.currentY + 10)
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(`URL: ${link.url}`, this.margin + 15, this.currentY + 28, { width: this.contentWidth - 30, ellipsis: true })
        .fillColor(this.colors.textLight)
        .text(`Found on: ${link.foundOn.join(', ')}`, this.margin + 15, this.currentY + 43, { width: this.contentWidth - 30, ellipsis: true });

      this.currentY += 70;
    });
  }

  private addRecommendations(report: AuditReport): void {
    this.addSectionHeader('Recommendations & Action Plan', this.colors.primary);
    this.currentY += 20;

    const recommendations = this.generateRecommendations(report);

    recommendations.forEach((rec, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(`${index + 1}. ${rec.title}`, this.margin, this.currentY)
        .moveDown(0.5)
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(rec.description, { width: this.contentWidth, align: 'justify' });

      if (rec.priority) {
        this.doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(rec.priority === 'High' ? this.colors.critical : this.colors.moderate)
          .text(`Priority: ${rec.priority}`, this.margin, this.doc.y + 5);
      }

      this.currentY = this.doc.y + 25;
    });
  }

  private addAppendix(report: AuditReport): void {
    this.addSectionHeader('Appendix: WCAG 2.2 Guidelines Reference', this.colors.primary);
    this.currentY += 20;

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(
        'The Web Content Accessibility Guidelines (WCAG) 2.2 Level AA includes the following principles:',
        this.margin,
        this.currentY
      );

    this.currentY += 30;

    const principles = [
      {
        title: '1. Perceivable',
        desc: 'Information and user interface components must be presentable to users in ways they can perceive.'
      },
      {
        title: '2. Operable',
        desc: 'User interface components and navigation must be operable.'
      },
      {
        title: '3. Understandable',
        desc: 'Information and the operation of user interface must be understandable.'
      },
      {
        title: '4. Robust',
        desc: 'Content must be robust enough that it can be interpreted by a wide variety of user agents.'
      }
    ];

    principles.forEach(principle => {
      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(principle.title, this.margin, this.currentY)
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(principle.desc, this.margin, this.currentY + 18, { width: this.contentWidth });

      this.currentY += 55;
    });

    this.currentY += 20;

    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(
        'For complete WCAG 2.2 documentation, visit: https://www.w3.org/WAI/WCAG22/quickref/',
        this.margin,
        this.currentY,
        { link: 'https://www.w3.org/WAI/WCAG22/quickref/', underline: true }
      );
  }

  // Helper methods
  private addSectionHeader(title: string, color: string): void {
    this.currentY = this.margin;

    this.doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(title, this.margin, this.currentY);

    this.doc
      .moveTo(this.margin, this.currentY + 28)
      .lineTo(this.pageWidth - this.margin, this.currentY + 28)
      .strokeColor(color)
      .lineWidth(2)
      .stroke();

    this.currentY += 35;
  }

  private addInfoBox(label: string, value: string, x: number, y: number): void {
    this.doc.rect(x, y, 247, 80)
      .fillAndStroke(this.colors.background, this.colors.border);

    this.doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textLight)
      .text(label, x + 15, y + 15)
      .fontSize(14)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(value, x + 15, y + 38, { width: 217, ellipsis: true });
  }

  private addViolationDetail(violation: Violation, page: PageAuditResult, number: number, isExpanded: boolean = false): void {
    const color = this.getImpactColor(violation.impact);

    this.doc.rect(this.margin, this.currentY, this.contentWidth, isExpanded ? 120 : 80)
      .fillAndStroke(this.colors.background, this.colors.border);

    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(`${number}. ${violation.help}`, this.margin + 15, this.currentY + 12)
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(violation.description, this.margin + 15, this.currentY + 30, { width: this.contentWidth - 30 });

    if (isExpanded) {
      this.doc
        .fontSize(8)
        .fillColor(this.colors.textLight)
        .text(`Affected elements: ${violation.nodes.length}`, this.margin + 15, this.currentY + 60)
        .text(`Page: ${this.truncateUrl(page.url)}`, this.margin + 15, this.currentY + 75, { width: this.contentWidth - 30, ellipsis: true })
        .text(`WCAG Reference: ${violation.helpUrl}`, this.margin + 15, this.currentY + 90, {
          width: this.contentWidth - 30,
          ellipsis: true,
          link: violation.helpUrl,
          underline: true
        });
    } else {
      this.doc
        .fontSize(8)
        .fillColor(this.colors.textLight)
        .text(`Elements: ${violation.nodes.length} | Page: ${page.title}`, this.margin + 15, this.currentY + 60);
    }

    this.currentY += isExpanded ? 130 : 90;
  }

  private addImpactGroup(impact: 'critical' | 'serious' | 'moderate' | 'minor', violations: Violation[], page: PageAuditResult): void {
    const color = this.getImpactColor(impact);

    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(`${impact.toUpperCase()} (${violations.length})`, this.margin, this.currentY);

    this.currentY += 25;

    violations.forEach((violation, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(`• ${violation.help}`, this.margin + 20, this.currentY)
        .fontSize(9)
        .font('Helvetica')
        .text(violation.description, this.margin + 20, this.currentY + 15, { width: this.contentWidth - 40 })
        .fontSize(8)
        .fillColor(this.colors.textLight)
        .text(`Affected: ${violation.nodes.length} element(s)`, this.margin + 20, this.currentY + 35);

      this.currentY += 55;
    });

    this.currentY += 10;
  }

  private addViolationBreakdownChart(report: AuditReport): void {
    const total = report.totalViolations || 1;
    const barWidth = this.contentWidth - 100;

    const items = [
      { label: 'Critical', count: report.criticalIssues, color: this.colors.critical },
      { label: 'Serious', count: report.seriousIssues, color: this.colors.serious },
      { label: 'Moderate', count: report.moderateIssues, color: this.colors.moderate },
      { label: 'Minor', count: report.minorIssues, color: this.colors.minor }
    ];

    items.forEach(item => {
      const percentage = (item.count / total) * 100;
      const width = (barWidth * percentage) / 100;

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(item.label, this.margin, this.currentY, { width: 80 });

      this.doc.rect(this.margin + 90, this.currentY + 2, width, 15)
        .fill(item.color);

      this.doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(`${item.count} (${Math.round(percentage)}%)`, this.margin + 100 + width, this.currentY);

      this.currentY += 30;
    });
  }

  private getComplianceColor(violations: number): string {
    if (violations === 0) return this.colors.success;
    if (violations <= 5) return this.colors.moderate;
    return this.colors.critical;
  }

  private getComplianceStatus(violations: number): string {
    if (violations === 0) return 'FULLY COMPLIANT';
    if (violations <= 5) return 'MINOR ISSUES';
    if (violations <= 20) return 'NEEDS IMPROVEMENT';
    return 'NON-COMPLIANT';
  }

  private getImpactColor(impact: string): string {
    const colors: Record<string, string> = {
      critical: this.colors.critical,
      serious: this.colors.serious,
      moderate: this.colors.moderate,
      minor: this.colors.minor
    };
    return colors[impact] || this.colors.text;
  }

  private getImpactStatement(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return `This website has ${report.criticalIssues} critical accessibility issue(s) that prevent users with disabilities from accessing content. Immediate remediation is required to ensure compliance and avoid potential legal risks.`;
    }
    if (report.seriousIssues > 0) {
      return `While no critical issues were found, ${report.seriousIssues} serious accessibility issue(s) significantly impact user experience for assistive technology users. These should be addressed as a high priority.`;
    }
    if (report.totalViolations === 0) {
      return `Excellent! No accessibility violations were detected. The website demonstrates strong commitment to inclusive design and WCAG compliance.`;
    }
    return `The website has ${report.totalViolations} accessibility issue(s) that should be addressed to improve compliance and user experience.`;
  }

  private groupViolationsByImpact(violations: Violation[]) {
    return {
      critical: violations.filter(v => v.impact === 'critical'),
      serious: violations.filter(v => v.impact === 'serious'),
      moderate: violations.filter(v => v.impact === 'moderate'),
      minor: violations.filter(v => v.impact === 'minor')
    };
  }

  private truncateUrl(url: string): string {
    if (url.length <= 60) return url;
    return url.substring(0, 57) + '...';
  }

  private generateRecommendations(report: AuditReport) {
    const recs = [];

    if (report.criticalIssues > 0) {
      recs.push({
        title: 'Address Critical Issues Immediately',
        description: 'Critical accessibility barriers prevent users with disabilities from accessing your content. Prioritize fixing these issues to ensure basic accessibility and legal compliance.',
        priority: 'High'
      });
    }

    if (report.seriousIssues > 0) {
      recs.push({
        title: 'Resolve Serious Accessibility Barriers',
        description: 'Serious issues significantly degrade the user experience for assistive technology users. These should be fixed within the next development sprint.',
        priority: 'High'
      });
    }

    recs.push({
      title: 'Implement Automated Testing',
      description: 'Integrate automated accessibility testing into your CI/CD pipeline to catch issues early. Use tools like axe-core, Pa11y, or Lighthouse in your build process.',
      priority: 'Medium'
    });

    recs.push({
      title: 'Conduct Manual Testing',
      description: 'Automated tools can only catch ~30-40% of accessibility issues. Conduct manual testing with screen readers (NVDA, JAWS, VoiceOver) and keyboard-only navigation.',
      priority: 'High'
    });

    if (report.totalViolations > 10) {
      recs.push({
        title: 'Provide Accessibility Training',
        description: 'Invest in accessibility training for your development and design teams to prevent issues from being introduced in future development.',
        priority: 'Medium'
      });
    }

    return recs;
  }
}
