import PDFDocument from 'pdfkit';
import { AuditReport, PageAuditResult, Violation } from './types';
import { createWriteStream } from 'fs';

/**
 * VIRTUS UMBRA - Professional Accessibility Report Generator
 *
 * Premium PDF reports with:
 * - Complete violation tracking (all errors, not just samples)
 * - Page-by-page detailed analysis
 * - Executive summary with accessibility score
 * - Professional dark aesthetic (royal, strong, mysterious)
 * - Production-ready for client delivery
 *
 * Design Philosophy: Dark, mysterious, royal, strong
 */
export class ExecutiveReportGenerator {
  private doc: PDFKit.PDFDocument;
  private pageWidth = 595;
  private pageHeight = 842;
  private margin = 50;
  private contentWidth = 495;
  private currentY = 0;

  // Virtus Umbra Color Palette - Dark, Royal, Mysterious
  private colors = {
    // Primary brand colors
    primary: '#6366f1',        // Royal indigo
    primaryDark: '#4338ca',    // Deep indigo
    secondary: '#8b5cf6',      // Royal purple
    accent: '#10b981',         // Success emerald

    // Status colors
    critical: '#ef4444',       // Critical red
    serious: '#f59e0b',        // Serious amber
    moderate: '#3b82f6',       // Moderate blue
    minor: '#6b7280',          // Minor gray

    // Neutral colors
    dark: '#0f172a',           // Deep dark background
    darkGray: '#1e293b',       // Dark gray
    mediumGray: '#334155',     // Medium gray
    lightGray: '#64748b',      // Light gray
    border: '#334155',         // Border gray

    // Text colors
    text: '#f1f5f9',           // Light text for dark bg
    textMuted: '#94a3b8',      // Muted text
    white: '#ffffff',          // Pure white

    // Background colors
    bgDark: '#0f172a',         // Dark background
    bgCard: '#1e293b',         // Card background
    bgLight: '#334155',        // Light overlay
  };

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.margin,
      info: {
        Title: 'Accessibility Audit Report - Virtus Umbra',
        Author: 'Virtus Umbra',
        Subject: 'WCAG 2.2 AA Accessibility Audit',
        Keywords: 'Accessibility, WCAG, Audit, Compliance'
      }
    });
    this.currentY = this.margin;
  }

  async generate(report: AuditReport, outputPath: string): Promise<string> {
    const stream = createWriteStream(outputPath);
    this.doc.pipe(stream);

    // 1. Premium Cover Page with Score
    this.addCoverPage(report);
    this.doc.addPage();
    this.drawPageBackground();

    // 2. Executive Summary Dashboard
    this.addExecutiveSummary(report);
    this.doc.addPage();
    this.drawPageBackground();

    // 3. Crawl Summary (discovered, audited, skipped, failed)
    this.addCrawlSummary(report);
    this.doc.addPage();
    this.drawPageBackground();

    // 4. Accessibility Score Breakdown
    this.addScoreBreakdown(report);
    // Note: Page-by-Page Analysis creates its own page, no addPage() here

    // 5. Page-by-Page Analysis (complete details for each page)
    this.addPageByPageAnalysis(report);

    // 6. Complete Violations List (ALL violations, grouped by severity)
    this.addCompleteViolationsList(report);
    this.doc.addPage();
    this.drawPageBackground();

    // 7. Quality Metrics Detail
    this.addQualityMetrics(report);
    this.doc.addPage();
    this.drawPageBackground();

    // 8. Business Impact & Recommendations
    this.addBusinessImpact(report);
    this.doc.addPage();
    this.drawPageBackground();

    // 9. Technical Summary
    this.addTechnicalSummary(report);
    this.doc.addPage();
    this.drawPageBackground();

    // 10. Glossary
    this.addGlossary();

    this.doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  //#region Cover Page
  private addCoverPage(report: AuditReport): void {
    // Dark gradient background
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight).fill(this.colors.bgDark);

    // Virtus Umbra branding
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('VIRTUS UMBRA', this.margin, 40);

    // Main title
    this.doc
      .fontSize(48)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Accessibility', this.margin, 100)
      .fontSize(36)
      .fillColor(this.colors.textMuted)
      .text('Audit Report', this.margin, 155);

    // Subtitle
    this.doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor(this.colors.textMuted)
      .text('WCAG 2.2 Level AA Compliance Analysis', this.margin, 210);

    this.currentY = 280;

    // Large Accessibility Score Display
    const score = report.accessibilityScore;
    const scoreColor = this.getScoreColor(score);

    // Score card
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 160)
      .fillAndStroke(this.colors.bgCard, this.colors.border)
      .lineWidth(2);

    // Score label
    this.doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor(this.colors.textMuted)
      .text('ACCESSIBILITY SCORE', this.margin + 20, this.currentY + 20, {
        align: 'center',
        width: this.contentWidth - 40
      });

    // Large score number
    this.doc
      .fontSize(96)
      .font('Helvetica-Bold')
      .fillColor(scoreColor)
      .text(`${score}`, this.margin + 20, this.currentY + 45, {
        align: 'center',
        width: this.contentWidth - 40
      });

    // Score rating
    const rating = this.getScoreRating(score);
    this.doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(scoreColor)
      .text(rating, this.margin + 20, this.currentY + 130, {
        align: 'center',
        width: this.contentWidth - 40
      });

    this.currentY += 200;

    // Website information
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 80)
      .fillAndStroke(this.colors.bgLight, this.colors.border);

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.textMuted)
      .text('WEBSITE', this.margin + 20, this.currentY + 15);

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text(this.truncateUrl(report.baseUrl, 50), this.margin + 20, this.currentY + 35, {
        width: this.contentWidth - 40
      });

    this.currentY += 100;

    // Key metrics grid
    const metrics = [
      { label: 'SEITEN GEPRÜFT', value: report.totalPages.toString(), color: this.colors.primary },
      { label: 'PROBLEME GEFUNDEN', value: report.totalViolations.toString(), color: report.totalViolations > 0 ? this.colors.critical : this.colors.accent },
      { label: 'KRITISCHE FEHLER', value: report.criticalIssues.toString(), color: report.criticalIssues > 0 ? this.colors.critical : this.colors.accent }
    ];

    const metricWidth = (this.contentWidth - 40) / 3;
    metrics.forEach((metric, index) => {
      const x = this.margin + (index * (metricWidth + 20));

      this.doc.rect(x, this.currentY, metricWidth, 90)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(metric.label, x + 10, this.currentY + 15, {
          width: metricWidth - 20,
          align: 'center'
        });

      this.doc
        .fontSize(32)
        .font('Helvetica-Bold')
        .fillColor(metric.color)
        .text(metric.value, x + 10, this.currentY + 40, {
          width: metricWidth - 20,
          align: 'center'
        });
    });

    // Report date
    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.textMuted)
      .text(`Erstellt am ${report.scanDate.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, this.margin, 750, {
        align: 'center',
        width: this.contentWidth
      });
  }
  //#endregion

  //#region Executive Summary
  private addExecutiveSummary(report: AuditReport): void {
    this.addSectionHeader('Executive Summary', 'Überblick für Entscheider');

    // Status badge
    const statusBadge = this.getStatusBadge(report);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 60)
      .fillAndStroke(statusBadge.bgColor, statusBadge.borderColor)
      .lineWidth(2);

    this.doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor(statusBadge.textColor)
      .text(statusBadge.label, this.margin + 20, this.currentY + 18, {
        width: this.contentWidth - 40,
        align: 'center'
      });

    this.currentY += 80;

    // Executive summary text
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 140)
      .fillAndStroke(this.colors.bgCard, this.colors.border);

    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('ZUSAMMENFASSUNG', this.margin + 20, this.currentY + 20);

    this.doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(this.getExecutiveSummaryText(report), this.margin + 20, this.currentY + 45, {
        width: this.contentWidth - 40,
        align: 'justify',
        lineGap: 4
      });

    this.currentY += 160;

    // Severity breakdown
    this.addSeverityBreakdown(report);

    this.currentY += 30;

    // Quick stats
    this.addQuickStats(report);
  }

  private addSeverityBreakdown(report: AuditReport): void {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('FEHLER NACH SCHWEREGRAD', this.margin, this.currentY);

    this.currentY += 25;

    const severities = [
      { label: 'Kritisch', count: report.criticalIssues, color: this.colors.critical, icon: '⚠' },
      { label: 'Ernsthaft', count: report.seriousIssues, color: this.colors.serious, icon: '◉' },
      { label: 'Moderat', count: report.moderateIssues, color: this.colors.moderate, icon: '○' },
      { label: 'Gering', count: report.minorIssues, color: this.colors.minor, icon: '·' }
    ];

    severities.forEach((severity, index) => {
      const y = this.currentY + (index * 35);
      const barWidth = this.contentWidth - 180;
      const percentage = report.totalViolations > 0
        ? (severity.count / report.totalViolations) * 100
        : 0;
      const fillWidth = (barWidth * percentage) / 100;

      // Severity label
      this.doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(severity.color)
        .text(`${severity.icon} ${severity.label}`, this.margin, y);

      // Background bar
      this.doc.rect(this.margin + 120, y, barWidth, 20)
        .fill(this.colors.bgLight);

      // Filled bar
      if (fillWidth > 0) {
        this.doc.rect(this.margin + 120, y, fillWidth, 20)
          .fill(severity.color);
      }

      // Count
      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(`${severity.count}`, this.margin + 120 + barWidth + 10, y + 3);
    });

    this.currentY += 150;
  }

  private addQuickStats(report: AuditReport): void {
    const stats = [
      { label: 'Unique Fehlertypen', value: report.uniqueViolationTypes, icon: '◈' },
      { label: 'Durchschn. Fehler/Seite', value: Math.round(report.totalViolations / report.totalPages), icon: '≈' },
      { label: 'WCAG Konformität', value: `${report.scoreBreakdown.wcagCompliance}%`, icon: '✓' }
    ];

    const statWidth = (this.contentWidth - 40) / 3;
    stats.forEach((stat, index) => {
      const x = this.margin + (index * (statWidth + 20));

      this.doc.rect(x, this.currentY, statWidth, 70)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      this.doc
        .fontSize(20)
        .fillColor(this.colors.primary)
        .text(stat.icon, x + 10, this.currentY + 15);

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(stat.label, x + 10, this.currentY + 20, {
          width: statWidth - 20
        });

      this.doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(stat.value.toString(), x + 10, this.currentY + 40, {
          width: statWidth - 20
        });
    });

    this.currentY += 90;
  }
  //#endregion

  //#region Crawl Summary
  private addCrawlSummary(report: AuditReport): void {
    this.addSectionHeader('Crawl-Zusammenfassung', 'Übersicht der Seitenerfassung');

    if (!report.crawlMetadata) {
      this.doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text('Keine Crawl-Metadaten verfügbar.', this.margin, this.currentY);
      return;
    }

    const meta = report.crawlMetadata;

    // Overview cards
    const cards = [
      { label: 'ENTDECKT', value: meta.totalDiscovered, color: this.colors.primary, icon: '🔍' },
      { label: 'GEPRÜFT', value: meta.totalAudited, color: this.colors.accent, icon: '✓' },
      { label: 'ÜBERSPRUNGEN', value: meta.totalSkipped, color: this.colors.moderate, icon: '⏭' },
      { label: 'FEHLGESCHLAGEN', value: meta.totalFailed, color: this.colors.critical, icon: '✗' }
    ];

    const cardWidth = (this.contentWidth - 60) / 4;
    cards.forEach((card, index) => {
      const x = this.margin + (index * (cardWidth + 20));

      this.doc.rect(x, this.currentY, cardWidth, 100)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      this.doc
        .fontSize(24)
        .text(card.icon, x + 10, this.currentY + 15);

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(card.label, x + 10, this.currentY + 25, {
          width: cardWidth - 20
        });

      this.doc
        .fontSize(32)
        .font('Helvetica-Bold')
        .fillColor(card.color)
        .text(card.value.toString(), x + 10, this.currentY + 50, {
          width: cardWidth - 20
        });
    });

    this.currentY += 120;

    // Failed URLs section
    if (meta.totalFailed > 0 && report.deadLinks && report.deadLinks.length > 0) {
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.critical)
        .text('⚠ FEHLGESCHLAGENE SEITEN', this.margin, this.currentY);

      this.currentY += 25;

      report.deadLinks.slice(0, 10).forEach((link, index) => {
        if (this.currentY > 700) {
          this.doc.addPage();
          this.drawPageBackground();
          this.currentY = this.margin;
        }

        this.doc.rect(this.margin, this.currentY, this.contentWidth, 60)
          .fillAndStroke(this.colors.bgCard, this.colors.border);

        this.doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text(this.truncateUrl(link.url, 60), this.margin + 15, this.currentY + 12, {
            width: this.contentWidth - 30
          });

        this.doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textMuted)
          .text(`Fehler: ${this.truncateText(link.statusText, 70)}`, this.margin + 15, this.currentY + 32);

        if (link.statusCode > 0) {
          this.doc
            .fontSize(9)
            .fillColor(this.colors.critical)
            .text(`HTTP ${link.statusCode}`, this.margin + 15, this.currentY + 45);
        }

        this.currentY += 70;
      });

      if (report.deadLinks.length > 10) {
        this.doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textMuted)
          .text(`+ ${report.deadLinks.length - 10} weitere fehlgeschlagene URLs...`, this.margin, this.currentY);
        this.currentY += 20;
      }
    }

    // Skipped URLs section
    if (meta.totalSkipped > 0) {
      this.currentY += 20;

      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.moderate)
        .text('ℹ ÜBERSPRUNGENE SEITEN', this.margin, this.currentY);

      this.currentY += 20;

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(`${meta.totalSkipped} Seiten wurden gefunden, aber aufgrund des Seitenlimits nicht geprüft.`,
          this.margin, this.currentY, { width: this.contentWidth });

      if (meta.unvisitedUrls.length > 0) {
        this.currentY += 25;
        this.doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textMuted)
          .text('Beispiele:', this.margin, this.currentY);

        this.currentY += 15;
        meta.unvisitedUrls.slice(0, 5).forEach((url) => {
          this.doc
            .fontSize(8)
            .fillColor(this.colors.lightGray)
            .text(`• ${this.truncateUrl(url, 70)}`, this.margin + 10, this.currentY);
          this.currentY += 12;
        });

        if (meta.unvisitedUrls.length > 5) {
          this.doc
            .fontSize(8)
            .fillColor(this.colors.textMuted)
            .text(`... und ${meta.unvisitedUrls.length - 5} weitere`, this.margin + 10, this.currentY);
        }
      }
    }
  }
  //#endregion

  //#region Score Breakdown
  private addScoreBreakdown(report: AuditReport): void {
    this.addSectionHeader('Score-Analyse', 'Detaillierte Bewertung nach Kategorien');

    const breakdown = report.scoreBreakdown;
    const categories = [
      {
        label: 'WCAG Konformität',
        score: breakdown.wcagCompliance,
        icon: '✓',
        description: 'Einhaltung der WCAG 2.2 AA Richtlinien'
      },
      {
        label: 'Tastatur-Navigation',
        score: breakdown.keyboardAccessibility,
        icon: '⌨',
        description: 'Bedienbarkeit ohne Maus für motorisch eingeschränkte Nutzer'
      },
      {
        label: 'Screen Reader',
        score: breakdown.screenReaderCompatibility,
        icon: '🔊',
        description: 'Vorlesbarkeit für blinde und sehbehinderte Nutzer'
      },
      {
        label: 'Performance',
        score: breakdown.performanceScore,
        icon: '⚡',
        description: 'Ladezeiten und technische Performance'
      }
    ];

    categories.forEach((category, index) => {
      if (this.currentY > 650) {
        this.doc.addPage();
        this.drawPageBackground();
        this.currentY = this.margin;
      }

      const scoreColor = this.getScoreColor(category.score);

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 120)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      // Icon and label
      this.doc
        .fontSize(32)
        .text(category.icon, this.margin + 20, this.currentY + 15);

      this.doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(category.label, this.margin + 70, this.currentY + 20);

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(category.description, this.margin + 70, this.currentY + 42, {
          width: this.contentWidth - 300
        });

      // Score display
      this.doc
        .fontSize(56)
        .font('Helvetica-Bold')
        .fillColor(scoreColor)
        .text(`${category.score}`, this.margin + this.contentWidth - 120, this.currentY + 25);

      // Progress bar
      const barWidth = this.contentWidth - 90;
      const barY = this.currentY + 85;

      this.doc.rect(this.margin + 20, barY, barWidth, 15)
        .fill(this.colors.bgLight);

      const fillWidth = (barWidth * category.score) / 100;
      this.doc.rect(this.margin + 20, barY, fillWidth, 15)
        .fill(scoreColor);

      this.currentY += 135;
    });

    // Overall interpretation
    this.currentY += 10;
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 100)
      .fillAndStroke(this.colors.bgLight, this.colors.border);

    const overallScore = report.accessibilityScore;
    const interpretation = this.getScoreInterpretation(overallScore);

    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('GESAMTBEWERTUNG', this.margin + 20, this.currentY + 15);

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(interpretation, this.margin + 20, this.currentY + 38, {
        width: this.contentWidth - 40,
        align: 'justify',
        lineGap: 3
      });
  }
  //#endregion

  //#region Page-by-Page Analysis
  private addPageByPageAnalysis(report: AuditReport): void {
    this.doc.addPage();
    this.drawPageBackground();
    this.addSectionHeader('Seiten-Analyse', 'Detaillierte Prüfung jeder einzelnen Seite');

    report.pages.forEach((page, pageIndex) => {
      if (this.currentY > 650) {
        this.doc.addPage();
        this.drawPageBackground();
        this.currentY = this.margin;
      }

      const pageViolationCount = page.violations.length;
      const critical = page.violations.filter(v => v.impact === 'critical').length;
      const serious = page.violations.filter(v => v.impact === 'serious').length;
      const moderate = page.violations.filter(v => v.impact === 'moderate').length;
      const minor = page.violations.filter(v => v.impact === 'minor').length;

      // Page header card
      const headerHeight = 100;
      this.doc.rect(this.margin, this.currentY, this.contentWidth, headerHeight)
        .fillAndStroke(this.colors.bgCard, this.colors.border)
        .lineWidth(2);

      // Page number badge
      this.doc.rect(this.margin + 15, this.currentY + 15, 40, 30)
        .fill(this.colors.primary);

      this.doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.white)
        .text(`${pageIndex + 1}`, this.margin + 15, this.currentY + 21, {
          width: 40,
          align: 'center'
        });

      // Page URL
      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(this.truncateUrl(page.url, 60), this.margin + 65, this.currentY + 18, {
          width: this.contentWidth - 80
        });

      // Page title
      if (page.title) {
        this.doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textMuted)
          .text(this.truncateText(page.title, 70), this.margin + 65, this.currentY + 38, {
            width: this.contentWidth - 80
          });
      }

      // Violations summary
      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(pageViolationCount === 0 ? this.colors.accent : this.colors.critical)
        .text(`${pageViolationCount} Fehler`, this.margin + 65, this.currentY + 60);

      if (pageViolationCount > 0) {
        this.doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textMuted)
          .text(
            `${critical > 0 ? `${critical} kritisch` : ''}${serious > 0 ? ` · ${serious} ernsthaft` : ''}${moderate > 0 ? ` · ${moderate} moderat` : ''}${minor > 0 ? ` · ${minor} gering` : ''}`,
            this.margin + 65,
            this.currentY + 78
          );
      }

      this.currentY += headerHeight + 15;

      // Show violations for this page
      if (pageViolationCount > 0) {
        page.violations.slice(0, 10).forEach((violation, vIndex) => {
          if (this.currentY > 700) {
            this.doc.addPage();
            this.drawPageBackground();
            this.currentY = this.margin;
          }

          const impactColor = this.getImpactColor(violation.impact);

          this.doc.rect(this.margin + 20, this.currentY, this.contentWidth - 20, 70)
            .fillAndStroke(this.colors.bgLight, this.colors.border);

          // Impact badge
          this.doc.rect(this.margin + 30, this.currentY + 10, 70, 18)
            .fill(impactColor);

          this.doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor(this.colors.white)
            .text(violation.impact.toUpperCase(), this.margin + 30, this.currentY + 13, {
              width: 70,
              align: 'center'
            });

          // Violation description
          this.doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text(this.truncateText(violation.help, 80), this.margin + 110, this.currentY + 10, {
              width: this.contentWidth - 130
            });

          // Violation details
          this.doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(this.colors.textMuted)
            .text(this.truncateText(violation.description, 100), this.margin + 110, this.currentY + 28, {
              width: this.contentWidth - 130
            });

          // Affected elements count
          this.doc
            .fontSize(8)
            .fillColor(this.colors.lightGray)
            .text(`${violation.nodes.length} betroffene Element${violation.nodes.length > 1 ? 'e' : ''}`,
              this.margin + 110, this.currentY + 50);

          this.currentY += 80;
        });

        if (page.violations.length > 10) {
          this.doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(this.colors.textMuted)
            .text(`+ ${page.violations.length - 10} weitere Fehler auf dieser Seite...`,
              this.margin + 30, this.currentY);
          this.currentY += 25;
        }
      } else {
        // No violations on this page
        this.doc.rect(this.margin + 20, this.currentY, this.contentWidth - 20, 50)
          .fillAndStroke(this.colors.bgLight, this.colors.border);

        this.doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.accent)
          .text('✓ Keine Fehler gefunden', this.margin + 30, this.currentY + 18);

        this.currentY += 60;
      }

      this.currentY += 10;
    });
  }
  //#endregion

  //#region Complete Violations List
  private addCompleteViolationsList(report: AuditReport): void {
    this.doc.addPage();
    this.drawPageBackground();
    this.addSectionHeader('Vollständige Fehlerliste', 'Alle gefundenen Barrieren nach Schweregrad');

    if (report.totalViolations === 0) {
      this.doc.rect(this.margin, this.currentY, this.contentWidth, 100)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      this.doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(this.colors.accent)
        .text('✓ Keine Barrieren gefunden!', this.margin + 20, this.currentY + 20);

      this.doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Ihre Website erfüllt alle WCAG 2.2 AA Anforderungen.',
          this.margin + 20, this.currentY + 50, {
            width: this.contentWidth - 40
          });

      return;
    }

    // Group violations by severity and collect ALL instances
    const criticalViolations: Array<{ page: string, violation: Violation }> = [];
    const seriousViolations: Array<{ page: string, violation: Violation }> = [];
    const moderateViolations: Array<{ page: string, violation: Violation }> = [];
    const minorViolations: Array<{ page: string, violation: Violation }> = [];

    report.pages.forEach(page => {
      page.violations.forEach(v => {
        const entry = { page: page.url, violation: v };
        switch (v.impact) {
          case 'critical':
            criticalViolations.push(entry);
            break;
          case 'serious':
            seriousViolations.push(entry);
            break;
          case 'moderate':
            moderateViolations.push(entry);
            break;
          case 'minor':
            minorViolations.push(entry);
            break;
        }
      });
    });

    // Show ALL violations for each severity
    if (criticalViolations.length > 0) {
      this.addViolationSection('KRITISCH', criticalViolations, this.colors.critical);
    }

    if (seriousViolations.length > 0) {
      this.addViolationSection('ERNSTHAFT', seriousViolations, this.colors.serious);
    }

    if (moderateViolations.length > 0) {
      this.addViolationSection('MODERAT', moderateViolations, this.colors.moderate);
    }

    if (minorViolations.length > 0) {
      this.addViolationSection('GERING', minorViolations, this.colors.minor);
    }
  }

  private addViolationSection(
    severity: string,
    violations: Array<{ page: string, violation: Violation }>,
    color: string
  ): void {
    // Check if we need a new page
    if (this.currentY > 700) {
      this.doc.addPage();
      this.drawPageBackground();
      this.currentY = this.margin;
    }

    // Severity header
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 45)
      .fillAndStroke(color, color);

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(this.colors.white)
      .text(`${severity} (${violations.length})`, this.margin + 20, this.currentY + 14);

    this.currentY += 55;

    // Show ALL violations (no limit!)
    violations.forEach((entry, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.drawPageBackground();
        this.currentY = this.margin;
      }

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 90)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      // Violation number
      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(color)
        .text(`#${index + 1}`, this.margin + 15, this.currentY + 15);

      // Violation title
      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(this.truncateText(entry.violation.help, 100), this.margin + 50, this.currentY + 15, {
          width: this.contentWidth - 70
        });

      // Description
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(this.truncateText(entry.violation.description, 120),
          this.margin + 50, this.currentY + 35, {
            width: this.contentWidth - 70
          });

      // Page URL
      this.doc
        .fontSize(8)
        .fillColor(this.colors.lightGray)
        .text(`Seite: ${this.truncateUrl(entry.page, 60)}`,
          this.margin + 50, this.currentY + 58);

      // WCAG tags
      const wcagTags = entry.violation.tags
        .filter(t => t.startsWith('wcag'))
        .join(', ');
      if (wcagTags) {
        this.doc
          .fontSize(8)
          .fillColor(this.colors.primary)
          .text(`WCAG: ${wcagTags}`, this.margin + 50, this.currentY + 72);
      }

      this.currentY += 100;
    });

    this.currentY += 10;
  }
  //#endregion

  //#region Quality Metrics
  private addQualityMetrics(report: AuditReport): void {
    this.addSectionHeader('Qualitätsmetriken', 'Performance & Accessibility im Detail');

    // Calculate aggregate metrics
    const metrics = this.calculateAggregateMetrics(report);

    // Performance section
    if (metrics.hasPerformanceData) {
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text('⚡ PERFORMANCE', this.margin, this.currentY);

      this.currentY += 25;

      const perfMetrics = [
        { label: 'Durchschn. Ladezeit', value: metrics.avgLoadTime, ideal: '< 3s' },
        { label: 'First Contentful Paint', value: metrics.avgFCP, ideal: '< 1.8s' },
        { label: 'Largest Contentful Paint', value: metrics.avgLCP, ideal: '< 2.5s' }
      ];

      const metricWidth = (this.contentWidth - 40) / 3;
      perfMetrics.forEach((metric, index) => {
        const x = this.margin + (index * (metricWidth + 20));

        this.doc.rect(x, this.currentY, metricWidth, 80)
          .fillAndStroke(this.colors.bgCard, this.colors.border);

        this.doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(this.colors.textMuted)
          .text(metric.label, x + 10, this.currentY + 15, {
            width: metricWidth - 20
          });

        this.doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primary)
          .text(metric.value, x + 10, this.currentY + 35, {
            width: metricWidth - 20
          });

        this.doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(this.colors.lightGray)
          .text(metric.ideal, x + 10, this.currentY + 60, {
            width: metricWidth - 20
          });
      });

      this.currentY += 100;
    }

    // Keyboard navigation
    if (metrics.hasKeyboardData) {
      this.currentY += 20;

      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text('⌨ TASTATUR-NAVIGATION', this.margin, this.currentY);

      this.currentY += 25;

      const kbColor = metrics.keyboardScore >= 80 ? this.colors.accent :
                     metrics.keyboardScore >= 60 ? this.colors.moderate :
                     this.colors.critical;

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 80)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      this.doc
        .fontSize(48)
        .font('Helvetica-Bold')
        .fillColor(kbColor)
        .text(`${metrics.keyboardScore}%`, this.margin + 20, this.currentY + 15);

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(metrics.keyboardIssuesSummary, this.margin + 150, this.currentY + 35, {
          width: this.contentWidth - 170
        });

      this.currentY += 100;
    }

    // Screen reader
    if (metrics.hasScreenReaderData) {
      this.currentY += 20;

      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text('🔊 SCREEN READER-KOMPATIBILITÄT', this.margin, this.currentY);

      this.currentY += 25;

      const srColor = metrics.screenReaderScore >= 80 ? this.colors.accent :
                     metrics.screenReaderScore >= 60 ? this.colors.moderate :
                     this.colors.critical;

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 80)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      // Score bar
      const barWidth = this.contentWidth - 40;
      const fillWidth = (barWidth * metrics.screenReaderScore) / 100;

      this.doc.rect(this.margin + 20, this.currentY + 20, barWidth, 30)
        .fill(this.colors.bgLight);

      this.doc.rect(this.margin + 20, this.currentY + 20, fillWidth, 30)
        .fill(srColor);

      this.doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(this.colors.white)
        .text(`${metrics.screenReaderScore}%`, this.margin + 30, this.currentY + 26);

      // Details
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(
          `Überschriften: ${metrics.hasHeadings ? '✓' : '✗'} | ` +
          `ARIA-Labels: ${metrics.hasAriaLabels ? '✓' : '✗'} | ` +
          `Landmarks: ${metrics.hasLandmarks ? '✓' : '✗'}`,
          this.margin + 20, this.currentY + 60
        );

      this.currentY += 100;
    }
  }

  private calculateAggregateMetrics(report: AuditReport) {
    let totalLoadTime = 0, totalFCP = 0, totalLCP = 0;
    let loadTimeCount = 0, fcpCount = 0, lcpCount = 0;
    let keyboardIssues: string[] = [];
    let keyboardPassCount = 0, keyboardTotalCount = 0;
    let screenReaderScores: number[] = [];
    let hasHeadings = true, hasAriaLabels = true, hasLandmarks = true;

    report.pages.forEach(page => {
      if (page.performanceMetrics) {
        totalLoadTime += page.performanceMetrics.loadTime;
        loadTimeCount++;

        if (page.performanceMetrics.firstContentfulPaint) {
          totalFCP += page.performanceMetrics.firstContentfulPaint;
          fcpCount++;
        }

        if (page.performanceMetrics.largestContentfulPaint) {
          totalLCP += page.performanceMetrics.largestContentfulPaint;
          lcpCount++;
        }
      }

      if (page.keyboardAccessibility) {
        if (page.keyboardAccessibility.tabOrderCorrect) keyboardPassCount++;
        if (page.keyboardAccessibility.focusVisible) keyboardPassCount++;
        if (page.keyboardAccessibility.noKeyboardTraps) keyboardPassCount++;
        keyboardTotalCount += 3;
        keyboardIssues.push(...page.keyboardAccessibility.issues);
      }

      if (page.screenReaderCompatibility) {
        screenReaderScores.push(page.screenReaderCompatibility.score);
        if (!page.screenReaderCompatibility.hasProperHeadings) hasHeadings = false;
        if (!page.screenReaderCompatibility.hasAriaLabels) hasAriaLabels = false;
        if (!page.screenReaderCompatibility.hasLandmarks) hasLandmarks = false;
      }
    });

    const avgLoadTime = loadTimeCount > 0 ? Math.round(totalLoadTime / loadTimeCount) : 0;
    const avgFCP = fcpCount > 0 ? Math.round(totalFCP / fcpCount) : 0;
    const avgLCP = lcpCount > 0 ? Math.round(totalLCP / lcpCount) : 0;
    const keyboardScore = keyboardTotalCount > 0
      ? Math.round((keyboardPassCount / keyboardTotalCount) * 100)
      : 0;
    const screenReaderScore = screenReaderScores.length > 0
      ? Math.round(screenReaderScores.reduce((a, b) => a + b, 0) / screenReaderScores.length)
      : 0;

    const uniqueIssues = [...new Set(keyboardIssues)];
    const keyboardIssuesSummary = uniqueIssues.length === 0
      ? 'Keine Probleme gefunden'
      : `${uniqueIssues.length} Problem${uniqueIssues.length > 1 ? 'e' : ''} identifiziert`;

    return {
      hasPerformanceData: loadTimeCount > 0,
      avgLoadTime: this.formatTime(avgLoadTime),
      avgFCP: this.formatTime(avgFCP),
      avgLCP: this.formatTime(avgLCP),
      hasKeyboardData: keyboardTotalCount > 0,
      keyboardScore,
      keyboardIssuesSummary,
      hasScreenReaderData: screenReaderScores.length > 0,
      screenReaderScore,
      hasHeadings,
      hasAriaLabels,
      hasLandmarks
    };
  }
  //#endregion

  //#region Business Impact
  private addBusinessImpact(report: AuditReport): void {
    this.addSectionHeader('Business Impact', 'Auswirkungen auf Ihr Unternehmen');

    const impacts = [
      {
        title: 'Rechtliche Risiken',
        level: this.getLegalRisk(report),
        description: this.getLegalRiskDescription(report),
        icon: '⚖',
        color: report.criticalIssues > 0 ? this.colors.critical : this.colors.accent
      },
      {
        title: 'Wirtschaftliche Chancen',
        level: this.getEconomicImpact(report),
        description: this.getEconomicDescription(report),
        icon: '💰',
        color: this.colors.moderate
      },
      {
        title: 'Markenimage',
        level: this.getReputationImpact(report),
        description: this.getReputationDescription(report),
        icon: '✨',
        color: this.colors.primary
      }
    ];

    impacts.forEach((impact, index) => {
      if (this.currentY > 650) {
        this.doc.addPage();
        this.drawPageBackground();
        this.currentY = this.margin;
      }

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 130)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      this.doc
        .fontSize(32)
        .text(impact.icon, this.margin + 20, this.currentY + 20);

      this.doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(impact.title, this.margin + 70, this.currentY + 25);

      this.doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(impact.color)
        .text(impact.level, this.margin + 70, this.currentY + 50);

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(impact.description, this.margin + 20, this.currentY + 85, {
          width: this.contentWidth - 40,
          lineGap: 2
        });

      this.currentY += 145;
    });

    // ROI section
    this.currentY += 10;
    this.addROISection(report);
  }

  private addROISection(report: AuditReport): void {
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 150)
      .fillAndStroke(this.colors.bgCard, this.colors.border);

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.accent)
      .text('✓ ROI INVESTITION BARRIEREFREIHEIT', this.margin + 20, this.currentY + 20);

    const benefits = [
      '15-20% mehr erreichbare Nutzer',
      'Bessere SEO-Rankings durch technische Optimierung',
      'Reduzierung rechtlicher Risiken um 90%',
      'Stärkung des Markenimages als inklusives Unternehmen',
      '30-40% niedrigere Support-Kosten'
    ];

    benefits.forEach((benefit, index) => {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(`• ${benefit}`, this.margin + 30, this.currentY + 60 + (index * 16));
    });

    this.currentY += 165;
  }
  //#endregion

  //#region Technical Summary
  private addTechnicalSummary(report: AuditReport): void {
    this.addSectionHeader('Technische Zusammenfassung', 'Für Entwicklungsteams');

    const stats = [
      { label: 'Geprüfte Seiten', value: report.totalPages },
      { label: 'WCAG Version', value: `${report.wcagVersion} Level ${report.conformanceLevel}` },
      { label: 'Gesamtverletzungen', value: report.totalViolations },
      { label: 'Unique Fehlertypen', value: report.uniqueViolationTypes },
      { label: 'Kritische Verstöße', value: report.criticalIssues },
      { label: 'Ernste Verstöße', value: report.seriousIssues },
      { label: 'Moderate Verstöße', value: report.moderateIssues },
      { label: 'Geringe Verstöße', value: report.minorIssues }
    ];

    stats.forEach((stat, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = this.margin + (col * (this.contentWidth / 2 + 10));
      const y = this.currentY + (row * 70);

      this.doc.rect(x, y, this.contentWidth / 2 - 5, 60)
        .fillAndStroke(this.colors.bgCard, this.colors.border);

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(stat.label, x + 15, y + 15);

      this.doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(stat.value.toString(), x + 15, y + 32);
    });

    this.currentY += 300;

    // Top issues
    if (report.totalViolations > 0) {
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text('HÄUFIGSTE PROBLEME', this.margin, this.currentY);

      this.currentY += 25;

      const topIssues = this.getTopIssues(report);

      topIssues.forEach((issue, index) => {
        if (this.currentY > 700) {
          this.doc.addPage();
          this.drawPageBackground();
          this.currentY = this.margin;
        }

        this.doc.rect(this.margin, this.currentY, this.contentWidth, 50)
          .fillAndStroke(this.colors.bgCard, this.colors.border);

        this.doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.text)
          .text(`${index + 1}. ${issue.description}`, this.margin + 15, this.currentY + 12, {
            width: this.contentWidth - 100
          });

        this.doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor(this.colors.critical)
          .text(`${issue.count}×`, this.margin + this.contentWidth - 70, this.currentY + 15);

        this.currentY += 60;
      });
    }
  }

  private getTopIssues(report: AuditReport): { description: string, count: number }[] {
    const violationCounts = new Map<string, { description: string, count: number }>();

    report.pages.forEach(page => {
      page.violations.forEach(v => {
        const existing = violationCounts.get(v.id);
        if (existing) {
          existing.count++;
        } else {
          violationCounts.set(v.id, { description: v.help, count: 1 });
        }
      });
    });

    return Array.from(violationCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  //#endregion

  //#region Glossary
  private addGlossary(): void {
    this.addSectionHeader('Glossar', 'Begriffserklärungen');

    const terms = [
      {
        term: 'WCAG (Web Content Accessibility Guidelines)',
        definition: 'Internationaler Standard für barrierefreie Webseiten, entwickelt vom W3C.'
      },
      {
        term: 'Level AA',
        definition: 'Mittlerer Konformitäts-Level. Erfüllt die meisten rechtlichen Anforderungen.'
      },
      {
        term: 'Accessibility Score',
        definition: 'Gesamtbewertung der Barrierefreiheit (0-100 Punkte) basierend auf WCAG-Verstößen und Qualitätsmetriken.'
      },
      {
        term: 'Screen Reader',
        definition: 'Software, die Bildschirminhalte für blinde Menschen vorliest.'
      },
      {
        term: 'Keyboard Navigation',
        definition: 'Bedienung der Website nur mit Tastatur (ohne Maus). Wichtig für motorisch eingeschränkte Nutzer.'
      },
      {
        term: 'Alt-Text',
        definition: 'Textbeschreibung für Bilder, die von Screen Readern vorgelesen wird.'
      },
      {
        term: 'ARIA (Accessible Rich Internet Applications)',
        definition: 'Technologie zur Verbesserung der Barrierefreiheit dynamischer Webinhalte.'
      }
    ];

    terms.forEach(term => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.drawPageBackground();
        this.currentY = this.margin;
      }

      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(term.term, this.margin, this.currentY);

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(term.definition, this.margin, this.currentY + 18, {
          width: this.contentWidth,
          lineGap: 2
        });

      this.currentY += 50;
    });
  }
  //#endregion

  //#region Helper Methods
  private addSectionHeader(title: string, subtitle?: string): void {
    this.currentY = this.margin;

    this.doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text(title, this.margin, this.currentY);

    if (subtitle) {
      this.doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(subtitle, this.margin, this.currentY + 35);

      this.currentY += 65;
    } else {
      this.currentY += 45;
    }

    // Accent line
    this.doc
      .moveTo(this.margin, this.currentY)
      .lineTo(this.pageWidth - this.margin, this.currentY)
      .strokeColor(this.colors.primary)
      .lineWidth(2)
      .stroke();

    this.currentY += 20;
  }

  private drawPageBackground(): void {
    // Dark background for all pages
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight).fill(this.colors.bgDark);
  }

  private getScoreColor(score: number): string {
    if (score >= 80) return this.colors.accent;
    if (score >= 60) return this.colors.moderate;
    if (score >= 40) return this.colors.serious;
    return this.colors.critical;
  }

  private getScoreRating(score: number): string {
    if (score >= 90) return 'AUSGEZEICHNET';
    if (score >= 80) return 'GUT';
    if (score >= 60) return 'BEFRIEDIGEND';
    if (score >= 40) return 'VERBESSERUNGSBEDARF';
    return 'KRITISCH';
  }

  private getStatusBadge(report: AuditReport) {
    if (report.criticalIssues > 0) {
      return {
        label: 'KRITISCHER HANDLUNGSBEDARF',
        bgColor: this.colors.critical,
        borderColor: this.colors.critical,
        textColor: this.colors.white
      };
    }
    if (report.seriousIssues > 0) {
      return {
        label: 'VERBESSERUNG EMPFOHLEN',
        bgColor: this.colors.serious,
        borderColor: this.colors.serious,
        textColor: this.colors.white
      };
    }
    if (report.totalViolations === 0) {
      return {
        label: 'WCAG 2.2 AA KONFORM',
        bgColor: this.colors.accent,
        borderColor: this.colors.accent,
        textColor: this.colors.white
      };
    }
    return {
      label: 'KLEINERE OPTIMIERUNGEN MÖGLICH',
      bgColor: this.colors.moderate,
      borderColor: this.colors.moderate,
      textColor: this.colors.white
    };
  }

  private getExecutiveSummaryText(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return `Ihre Website hat ${report.criticalIssues} kritische Barrieren, die Menschen mit Behinderungen vom Zugang ausschließen. Mit einem Accessibility Score von ${report.accessibilityScore}/100 besteht dringender Handlungsbedarf. Dies stellt ein rechtliches Risiko dar (BFSG 2025) und schließt ca. 15-20% potentieller Nutzer aus.`;
    }
    if (report.seriousIssues > 0) {
      return `Ihre Website hat ${report.seriousIssues} ernsthafte Barrieren (Score: ${report.accessibilityScore}/100). Die Grundstruktur ist zugänglich, aber signifikante Probleme beeinträchtigen die Nutzererfahrung für Menschen mit Einschränkungen. Durch gezielte Verbesserungen erreichen Sie eine breitere Zielgruppe und erfüllen rechtliche Anforderungen.`;
    }
    if (report.totalViolations === 0) {
      return `Hervorragend! Ihre Website erfüllt die WCAG 2.2 AA Anforderungen mit einem Score von ${report.accessibilityScore}/100. Sie erreichen damit nicht nur rechtliche Compliance, sondern positionieren sich als inklusives, modernes Unternehmen. Empfehlung: Regelmäßige Re-Audits zur Qualitätssicherung.`;
    }
    return `Ihre Website hat ${report.totalViolations} kleinere Probleme (Score: ${report.accessibilityScore}/100). Diese beeinträchtigen die Barrierefreiheit nur geringfügig, sollten aber dennoch behoben werden, um bestmögliche Zugänglichkeit zu gewährleisten.`;
  }

  private getScoreInterpretation(score: number): string {
    if (score >= 90) {
      return 'Ihre Website erfüllt höchste Standards der Barrierefreiheit. Die wenigen verbleibenden Optimierungsmöglichkeiten dienen der Perfektion, nicht der Compliance.';
    }
    if (score >= 80) {
      return 'Gute Barrierefreiheit mit solider WCAG-Konformität. Einige Verbesserungen würden die Nutzererfahrung für Menschen mit Einschränkungen weiter optimieren.';
    }
    if (score >= 60) {
      return 'Grundlegende Barrierefreiheit ist gegeben, aber signifikante Verbesserungen sind notwendig, um alle Nutzergruppen optimal zu erreichen und rechtliche Anforderungen sicher zu erfüllen.';
    }
    if (score >= 40) {
      return 'Erhebliche Barrieren erschweren oder verhindern den Zugang für Menschen mit Behinderungen. Dringender Handlungsbedarf zur Risikominimierung und Verbesserung der Reichweite.';
    }
    return 'Kritische Barrieren verhindern den Zugang für große Teile der Zielgruppe. Sofortige Maßnahmen erforderlich, um rechtliche Risiken zu minimieren und Chancengleichheit herzustellen.';
  }

  private getImpactColor(impact: string): string {
    switch (impact) {
      case 'critical': return this.colors.critical;
      case 'serious': return this.colors.serious;
      case 'moderate': return this.colors.moderate;
      case 'minor': return this.colors.minor;
      default: return this.colors.lightGray;
    }
  }

  private getLegalRisk(report: AuditReport): string {
    if (report.criticalIssues > 0) return 'HOCH';
    if (report.seriousIssues > 0) return 'MITTEL';
    return 'NIEDRIG';
  }

  private getLegalRiskDescription(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return 'BFSG 2025: Verstöße können Bußgelder bis 100.000 EUR nach sich ziehen. Zusätzlich besteht Risiko von Abmahnungen und Klagen.';
    }
    if (report.seriousIssues > 0) {
      return 'Mögliche BFSG-Verstöße. Verbesserungen empfohlen, um rechtlichen Risiken vorzubeugen.';
    }
    return 'Rechtliche Mindestanforderungen erfüllt. Sie sind auf der sicheren Seite.';
  }

  private getEconomicImpact(report: AuditReport): string {
    if (report.criticalIssues > 0) return 'VERLUSTE';
    if (report.seriousIssues > 0) return 'POTENTIAL';
    return 'OPTIMAL';
  }

  private getEconomicDescription(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return 'Ca. 15-20% der Bevölkerung haben Einschränkungen. Barrieren führen zu Umsatzeinbußen, höheren Support-Kosten und schlechteren SEO-Rankings.';
    }
    return 'Barrierefreie Websites erreichen mehr Nutzer, haben bessere SEO-Rankings und niedrigere Support-Kosten.';
  }

  private getReputationImpact(report: AuditReport): string {
    if (report.criticalIssues > 0) return 'RISIKO';
    if (report.seriousIssues > 0) return 'CHANCE';
    return 'STÄRKE';
  }

  private getReputationDescription(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return 'Mangelnde Barrierefreiheit schadet dem Image. Kunden erwarten inklusive Angebote.';
    }
    return 'Barrierefreiheit stärkt Ihre Marke als verantwortungsbewusstes, modernes Unternehmen.';
  }

  private formatTime(ms: number): string {
    if (ms === 0) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private truncateUrl(url: string, maxLength: number = 60): string {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  //#endregion
}
