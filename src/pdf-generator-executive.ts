import PDFDocument from 'pdfkit';
import { AuditReport, PageAuditResult, Violation } from './types';
import { createWriteStream } from 'fs';

type CostRange = { min: number; max: number };
interface CostEstimateSummary {
  bundleCount: number;
  bundleSize: number;
  perBundle: CostRange;
  total: CostRange;
  timelineWeeks: { min: number; max: number };
  severity: Record<'critical' | 'serious' | 'moderate' | 'minor', CostRange>;
}

/**
 * Executive-Friendly PDF Report Generator
 *
 * Designed for non-technical stakeholders (CEOs, managers)
 * Focus: Business impact, costs, risks, ROI, clear priorities
 */
export class ExecutiveReportGenerator {
  private doc: PDFKit.PDFDocument;
  private pageWidth = 595;
  private margin = 50;
  private contentWidth = 495;
  private currentY = 0;

  // Modern, professional color scheme
  private colors = {
    primary: '#a855f7',       // Purple brand
    secondary: '#9333ea',     // Dark purple
    accent: '#10b981',        // Success green
    critical: '#dc2626',      // High risk red
    high: '#ef4444',          // High priority
    medium: '#f59e0b',        // Medium priority
    low: '#3b82f6',           // Low priority
    neutral: '#64748b',       // Muted gray
    text: '#1e293b',          // Dark text
    textLight: '#64748b',     // Light text
    border: '#e2e8f0',        // Borders
    background: '#f8fafc',    // Light bg
    white: '#ffffff'
  };

  private formatCurrency(value: number): string {
    return `${value.toLocaleString('de-DE')} EUR`;
  }

  private formatRange(range: CostRange): string {
    if (range.min === range.max) {
      return this.formatCurrency(range.min);
    }
    return `${this.formatCurrency(range.min)} - ${this.formatCurrency(range.max)}`;
  }

  private describeTimeline(timeline: { min: number; max: number }): string {
    if (timeline.max === 0) {
      return 'Keine Massnahmen erforderlich';
    }
    if (timeline.min === timeline.max) {
      return `${timeline.min} Woche${timeline.min === 1 ? '' : 'n'}`;
    }
    return `${timeline.min}-${timeline.max} Wochen`;
  }

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.margin,
      info: {
        Title: 'Barrierefreiheits-Audit - Executive Report',
        Author: 'Virtus Umbra',
        Subject: 'Web-Accessibility Business Report',
        Keywords: 'Barrierefreiheit, Compliance, Business Report'
      }
    });
    this.currentY = this.margin;
  }

  async generate(report: AuditReport, outputPath: string): Promise<string> {
    const stream = createWriteStream(outputPath);
    this.doc.pipe(stream);

    // 1. Executive Cover Page
    this.addExecutiveCover(report);
    this.doc.addPage();

    // 2. Executive Dashboard (1-Seiten-Uebersicht)
    this.addExecutiveDashboard(report);
    this.doc.addPage();

    // 3. Qualitaetsmetriken (Performance & Accessibility)
    this.addQualityMetricsSection(report);
    this.doc.addPage();

    // 4. Business Impact & Risiken
    this.addBusinessImpactSection(report);
    this.doc.addPage();

    // 5. Priority Matrix (Quick Wins vs. Strategic)
    this.addPriorityMatrix(report);
    this.doc.addPage();

    // 6. Kosten & Zeit-Schaetzungen
    this.addCostTimeEstimates(report);
    this.doc.addPage();

    // 7. Handlungsempfehlungen (Executive Summary)
    this.addActionPlan(report);
    this.doc.addPage();

    // 8. Technische Details (optional, am Ende)
    this.addTechnicalOverview(report);
    this.doc.addPage();

    // 9. Glossar (Begriffserklaerungen)
    this.addGlossary();

    this.doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  //#region Cover Page
  private addExecutiveCover(report: AuditReport): void {
    // Premium header
    this.doc.rect(0, 0, this.pageWidth, 140).fill(this.colors.primary);

    this.doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor(this.colors.white)
      .text('Virtus Umbra', this.margin, 30);

    this.doc
      .fontSize(42)
      .font('Helvetica-Bold')
      .fillColor(this.colors.white)
      .text('Barrierefreiheit', this.margin, 60)
      .fontSize(24)
      .font('Helvetica')
      .text('Executive Report', this.margin, 110);

    this.currentY = 180;

    // Status Badge - Gross und prominent
    const status = this.getExecutiveStatus(report);
    const statusColor = status.color;

    this.doc.rect(this.margin, this.currentY, this.contentWidth, 100)
      .fillAndStroke(statusColor, statusColor);

    this.doc
      .fontSize(36)
      .font('Helvetica-Bold')
      .fillColor(this.colors.white)
      .text(status.label, this.margin, this.currentY + 30, {
        width: this.contentWidth,
        align: 'center'
      });

    this.currentY += 130;

    // Website Info
    this.addInfoPanel('Gepruefte Website', report.baseUrl, this.margin, this.currentY);
    this.currentY += 90;

    // Key Metrics Grid
    const gridY = this.currentY;
    this.addMetricBox('SEITEN GEPRUEFT', report.totalPages.toString(), this.colors.primary, this.margin, gridY);
    this.addMetricBox('PROBLEME GEFUNDEN', report.totalViolations.toString(),
      report.totalViolations > 0 ? this.colors.critical : this.colors.accent,
      this.margin + 165, gridY);
    this.addMetricBox('HANDLUNGSBEDARF',
      report.criticalIssues + report.seriousIssues > 0 ? 'HOCH' : 'NIEDRIG',
      report.criticalIssues + report.seriousIssues > 0 ? this.colors.critical : this.colors.accent,
      this.margin + 330, gridY);

    // Datum am unteren Rand
    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(`Erstellt am ${report.scanDate.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, this.margin, 720, { align: 'center', width: this.contentWidth });
  }
  //#endregion

  //#region Executive Dashboard
  private addExecutiveDashboard(report: AuditReport): void {
    this.addSectionHeader('Executive Dashboard', 'Uebersicht fuer Entscheider');

    // "Was bedeutet das fuer uns?" Box
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 140)
      .fillAndStroke(this.colors.background, this.colors.border);

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('Management Summary', this.margin + 20, this.currentY + 20);

    this.doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(this.getExecutiveSummary(report), this.margin + 20, this.currentY + 50, {
        width: this.contentWidth - 40,
        align: 'justify'
      });

    this.currentY += 160;

    // Risk Level Visualization
    const risk = this.calculateRiskLevel(report);
    this.addRiskIndicator(risk);

    this.currentY += 50;

    const estimate = this.estimateCosts(report);

    // Kosten-Nutzen Schnelluebersicht
    this.addCostBenefitOverview(report, estimate);

    this.currentY += 60;

    // Timeline Estimate
    this.addTimelineEstimate(report, estimate);
  }

  private addRiskIndicator(risk: { level: string, score: number, label: string, color: string }): void {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Risiko-Level:', this.margin, this.currentY);

    const barWidth = this.contentWidth - 200;
    const barHeight = 30;
    const barX = this.margin + 120;

    // Background bar
    this.doc.rect(barX, this.currentY, barWidth, barHeight)
      .fill(this.colors.background);

    // Filled bar (based on risk score)
    const fillWidth = (barWidth * risk.score) / 100;
    this.doc.rect(barX, this.currentY, fillWidth, barHeight)
      .fill(risk.color);

    // Label
    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(risk.color)
      .text(risk.label, barX + 10, this.currentY + 6);

    this.currentY += 40;
  }

  private addCostBenefitOverview(report: AuditReport, estimate: CostEstimateSummary): void {
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 80)
      .fillAndStroke('#fff7ed', '#fb923c');

    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Geschaetzter Investitionsrahmen', this.margin + 20, this.currentY + 15)
      .fontSize(20)
      .fillColor('#ea580c')
      .text(this.formatRange(estimate.total), this.margin + 20, this.currentY + 38)
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(`Basis: ${this.formatRange(estimate.perBundle)} pro ${estimate.bundleSize} Findings (${estimate.bundleCount} Pakete)`, this.margin + 20, this.currentY + 63);

    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Zeitaufwand:', this.margin + 270, this.currentY + 15)
      .fontSize(20)
      .fillColor(this.colors.primary)
      .text(this.describeTimeline(estimate.timelineWeeks), this.margin + 270, this.currentY + 38);
  }

  private addTimelineEstimate(report: AuditReport, estimate: CostEstimateSummary): void {
    const phases = this.buildTimelinePhases(report, estimate);

    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Umsetzungs-Timeline:', this.margin, this.currentY);

    this.currentY += 25;

    if (phases.length === 0) {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Keine offenen Findings. Empfohlen: Monitoring und regelmaessige Re-Audits alle 6-12 Monate.', this.margin, this.currentY);
      this.currentY += 30;
      return;
    }

    phases.forEach((phase, index) => {
      const y = this.currentY + (index * 45);

      // Phase box
      this.doc.rect(this.margin, y, 30, 25)
        .fillAndStroke(phase.color, phase.color);

      this.doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(this.colors.white)
        .text((index + 1).toString(), this.margin + 10, y + 5);

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(phase.name, this.margin + 40, y + 2)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(`${phase.duration} | ${phase.cost}`, this.margin + 40, y + 14, { continued: false });
    });

    this.currentY += phases.length * 45;
  }
  //#endregion

  //#region Quality Metrics Section
  private addQualityMetricsSection(report: AuditReport): void {
    this.addSectionHeader('Qualitaetsmetriken', 'Performance & Barrierefreiheit im Detail');

    // Calculate aggregate metrics
    const metrics = this.calculateAggregateMetrics(report);

    // Performance Metrics Box
    if (metrics.hasPerformanceData) {
      this.doc.rect(this.margin, this.currentY, this.contentWidth, 140)
        .fillAndStroke(this.colors.background, this.colors.border);

      this.doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('Performance-Qualitaet', this.margin + 20, this.currentY + 15);

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Schnelle Ladezeiten verbessern das Nutzererlebnis fuer alle Besucher:',
          this.margin + 20, this.currentY + 40, { width: this.contentWidth - 40 });

      // Performance metrics grid
      const metricsY = this.currentY + 65;
      const metricWidth = (this.contentWidth - 80) / 3;

      this.addPerformanceMetric('Ladezeit', metrics.avgLoadTime, '< 3s ideal',
        this.margin + 20, metricsY, metricWidth);
      this.addPerformanceMetric('First Paint', metrics.avgFCP, '< 1.8s ideal',
        this.margin + 20 + metricWidth + 20, metricsY, metricWidth);
      this.addPerformanceMetric('Largest Paint', metrics.avgLCP, '< 2.5s ideal',
        this.margin + 20 + (metricWidth + 20) * 2, metricsY, metricWidth);

      this.currentY += 160;
    }

    // Keyboard Navigation Box
    if (metrics.hasKeyboardData) {
      this.doc.rect(this.margin, this.currentY, this.contentWidth, 140)
        .fillAndStroke(this.colors.background, this.colors.border);

      this.doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('Tastatur-Navigation', this.margin + 20, this.currentY + 15);

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Bedienbarkeit ohne Maus (wichtig fuer motorisch eingeschraenkte Nutzer):',
          this.margin + 20, this.currentY + 40, { width: this.contentWidth - 40 });

      const kbY = this.currentY + 70;
      const statusColor = metrics.keyboardScore >= 80 ? this.colors.accent :
                         metrics.keyboardScore >= 60 ? this.colors.medium :
                         this.colors.critical;

      this.doc.rect(this.margin + 20, kbY, this.contentWidth - 40, 50)
        .fillAndStroke(this.colors.white, statusColor)
        .lineWidth(2);

      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(`Tastatur-Zugaenglichkeit: ${metrics.keyboardScore}%`,
          this.margin + 30, kbY + 10)
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(metrics.keyboardIssuesSummary, this.margin + 30, kbY + 30, {
          width: this.contentWidth - 60
        });

      this.currentY += 160;
    }

    // Screen Reader Compatibility Box
    if (metrics.hasScreenReaderData) {
      this.doc.rect(this.margin, this.currentY, this.contentWidth, 140)
        .fillAndStroke(this.colors.background, this.colors.border);

      this.doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text('Screen Reader-Kompatibilitaet', this.margin + 20, this.currentY + 15);

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Vorlesbarkeit fuer blinde und sehbehinderte Nutzer:',
          this.margin + 20, this.currentY + 40, { width: this.contentWidth - 40 });

      const srY = this.currentY + 70;
      const srColor = metrics.screenReaderScore >= 80 ? this.colors.accent :
                     metrics.screenReaderScore >= 60 ? this.colors.medium :
                     this.colors.critical;

      // Score gauge
      const gaugeWidth = this.contentWidth - 40;
      const gaugeHeight = 30;

      this.doc.rect(this.margin + 20, srY, gaugeWidth, gaugeHeight)
        .fill(this.colors.white);

      const fillWidth = (gaugeWidth * metrics.screenReaderScore) / 100;
      this.doc.rect(this.margin + 20, srY, fillWidth, gaugeHeight)
        .fill(srColor);

      this.doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(this.colors.white)
        .text(`${metrics.screenReaderScore}%`, this.margin + 30, srY + 6);

      // Details
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(`  Ueberschriften: ${metrics.hasHeadings ? 'Korrekt' : 'Fehler'}  |  ` +
              `  ARIA-Labels: ${metrics.hasAriaLabels ? 'Vorhanden' : 'Fehlen'}  |  ` +
              `  Landmarks: ${metrics.hasLandmarks ? 'Implementiert' : 'Fehlen'}`,
          this.margin + 20, srY + 45);

      this.currentY += 160;
    }

    // Framework Detection Info
    if (metrics.detectedFrameworks.length > 0) {
      this.doc.rect(this.margin, this.currentY, this.contentWidth, 80)
        .fillAndStroke('#f0f9ff', '#0ea5e9');

      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0369a1')
        .text('Erkannte Technologien', this.margin + 20, this.currentY + 15)
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(`Ihre Website nutzt: ${metrics.detectedFrameworks.join(', ')}`,
          this.margin + 20, this.currentY + 40)
        .fillColor(this.colors.textLight)
        .text(`Diese wurden speziell auf SPA-typische Barrierefreiheitsprobleme geprueft.`,
          this.margin + 20, this.currentY + 58);

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
    const frameworks = new Set<string>();

    report.pages.forEach(page => {
      // Performance metrics
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

      // Keyboard accessibility
      if (page.keyboardAccessibility) {
        if (page.keyboardAccessibility.tabOrderCorrect) keyboardPassCount++;
        if (page.keyboardAccessibility.focusVisible) keyboardPassCount++;
        if (page.keyboardAccessibility.noKeyboardTraps) keyboardPassCount++;
        keyboardTotalCount += 3;
        keyboardIssues.push(...page.keyboardAccessibility.issues);
      }

      // Screen reader compatibility
      if (page.screenReaderCompatibility) {
        screenReaderScores.push(page.screenReaderCompatibility.score);
        if (!page.screenReaderCompatibility.hasProperHeadings) hasHeadings = false;
        if (!page.screenReaderCompatibility.hasAriaLabels) hasAriaLabels = false;
        if (!page.screenReaderCompatibility.hasLandmarks) hasLandmarks = false;
      }

      // Framework detection
      if (page.frameworkDetected) {
        frameworks.add(page.frameworkDetected);
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
      : `${uniqueIssues.length} Problem${uniqueIssues.length > 1 ? 'e' : ''} gefunden`;

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
      hasLandmarks,
      detectedFrameworks: Array.from(frameworks)
    };
  }

  private formatTime(ms: number): string {
    if (ms === 0) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private addPerformanceMetric(label: string, value: string, ideal: string, x: number, y: number, width: number): void {
    this.doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textLight)
      .text(label, x, y)
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(value, x, y + 18)
      .fontSize(8)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(ideal, x, y + 42);
  }
  //#endregion

  //#region Business Impact
  private addBusinessImpactSection(report: AuditReport): void {
    this.addSectionHeader('Business Impact & Risiken', 'Auswirkungen auf Ihr Unternehmen');

    // 3 Saeulen: Rechtlich, Wirtschaftlich, Marke
    const impacts = [
      {
        icon: ' ',
        title: 'Rechtliche Risiken',
        risk: this.getLegalRisk(report),
        description: this.getLegalRiskDescription(report),
        color: this.colors.critical
      },
      {
        icon: ' ',
        title: 'Wirtschaftliche Auswirkungen',
        risk: this.getEconomicImpact(report),
        description: this.getEconomicDescription(report),
        color: this.colors.medium
      },
      {
        icon: ' ',
        title: 'Markenimage & Reputation',
        risk: this.getReputationImpact(report),
        description: this.getReputationDescription(report),
        color: this.colors.primary
      }
    ];

    impacts.forEach((impact, index) => {
      if (index > 0) {
        this.currentY += 20;
      }

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 120)
        .fillAndStroke(this.colors.background, this.colors.border);

      // Icon & Title
      this.doc
        .fontSize(24)
        .text(impact.icon, this.margin + 15, this.currentY + 15)
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(impact.title, this.margin + 55, this.currentY + 20);

      // Risk Level
      this.doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(impact.color)
        .text(impact.risk, this.margin + 15, this.currentY + 50);

      // Description
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(impact.description, this.margin + 15, this.currentY + 78, {
          width: this.contentWidth - 30
        });

      this.currentY += 130;
    });

    // ROI Kalkulation
    this.currentY += 10;
    this.addROICalculation(report);
  }

  private addROICalculation(report: AuditReport): void {
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 130)
      .fillAndStroke('#ecfdf5', '#10b981');

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#065f46')
      .text('Return on Investment (ROI)', this.margin + 20, this.currentY + 15);

    const roi = this.calculateROI(report);

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text('Investition in Barrierefreiheit zahlt sich aus:', this.margin + 20, this.currentY + 45)
      .text(`- Erreichung von ${roi.additionalUsers} zusaetzlichen Nutzern`, this.margin + 25, this.currentY + 65)
      .text(`- Reduzierung rechtlicher Risiken um ${roi.legalRiskReduction}`, this.margin + 25, this.currentY + 80)
      .text(`- Verbesserung der SEO-Rankings`, this.margin + 25, this.currentY + 95)
      .text(`- Staerkung des Markenimages als inklusives Unternehmen`, this.margin + 25, this.currentY + 110);
  }
  //#endregion

  //#region Priority Matrix
  private addPriorityMatrix(report: AuditReport): void {
    this.addSectionHeader('Prioritaeten-Matrix', 'Was zuerst, was spaeter?');

    // Matrix: Quick Wins vs. Strategic Investments
    const matrixY = this.currentY;
    const quadrantWidth = (this.contentWidth - 20) / 2;
    const quadrantHeight = 180;

    // Quadrant 1: Quick Wins (High Impact, Low Effort)
    this.addQuadrant(
      'Quick Wins',
      '  Sofort umsetzbar',
      this.getQuickWins(report),
      this.margin,
      matrixY,
      quadrantWidth,
      quadrantHeight,
      this.colors.accent
    );

    // Quadrant 2: Strategic (High Impact, High Effort)
    this.addQuadrant(
      'Strategisch',
      '  Mittelfristig planen',
      this.getStrategicItems(report),
      this.margin + quadrantWidth + 20,
      matrixY,
      quadrantWidth,
      quadrantHeight,
      this.colors.primary
    );

    this.currentY = matrixY + quadrantHeight + 20;

    // Quadrant 3: Fill-Ins (Low Impact, Low Effort)
    this.addQuadrant(
      'Nice-to-Have',
      '  Wenn Zeit uebrig',
      this.getFillInItems(report),
      this.margin,
      this.currentY,
      quadrantWidth,
      quadrantHeight,
      this.colors.low
    );

    // Quadrant 4: Reconsider (Low Impact, High Effort)
    this.addQuadrant(
      'Ueberdenken',
      '  Niedriger ROI',
      this.getReconsiderItems(report),
      this.margin + quadrantWidth + 20,
      this.currentY,
      quadrantWidth,
      quadrantHeight,
      this.colors.neutral
    );

    this.currentY += quadrantHeight + 20;

    // Legende
    this.addMatrixLegend();
  }

  private addQuadrant(
    title: string,
    subtitle: string,
    items: string[],
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    // Border
    this.doc.rect(x, y, width, height)
      .fillAndStroke(this.colors.white, color)
      .lineWidth(2);

    // Header
    this.doc.rect(x, y, width, 45)
      .fill(color);

    this.doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor(this.colors.white)
      .text(title, x + 10, y + 8)
      .fontSize(9)
      .font('Helvetica')
      .text(subtitle, x + 10, y + 28);

    // Items
    let itemY = y + 55;
    items.slice(0, 4).forEach(item => {
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(`- ${item}`, x + 10, itemY, { width: width - 20 });
      itemY += 22;
    });

    if (items.length > 4) {
      this.doc
        .fontSize(8)
        .fillColor(this.colors.textLight)
        .text(`+${items.length - 4} weitere...`, x + 10, itemY);
    }
  }

  private addMatrixLegend(): void {
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text('Impact = Auswirkung fuer Nutzer | Aufwand = Entwicklungszeit', this.margin, this.currentY, {
        align: 'center',
        width: this.contentWidth
      });
  }
  //#endregion


  //#region Cost & Time Estimates

  private addCostTimeEstimates(report: AuditReport): void {
    this.addSectionHeader('Kosten & Zeitplan', 'Budget-Planung');

    const estimate = this.estimateCosts(report);

    // Cost breakdown
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 215)
      .fillAndStroke(this.colors.background, this.colors.border);

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Geschaetzte Gesamtinvestition', this.margin + 20, this.currentY + 20);

    // Big number
    this.doc
      .fontSize(42)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(this.formatRange(estimate.total), this.margin + 20, this.currentY + 50)
      .fontSize(11)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(`Grundlage: ${this.formatRange(estimate.perBundle)} pro ${estimate.bundleSize} Findings (${estimate.bundleCount} Pakete)`, this.margin + 20, this.currentY + 100);

    // Breakdown
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Aufschluesselung:', this.margin + 20, this.currentY + 130)
      .font('Helvetica')
      .text(`- Kritische Findings (${report.criticalIssues}): ${this.formatRange(estimate.severity.critical)}`, this.margin + 25, this.currentY + 148)
      .text(`- Ernste Findings (${report.seriousIssues}): ${this.formatRange(estimate.severity.serious)}`, this.margin + 25, this.currentY + 163)
      .text(`- Moderate Findings (${report.moderateIssues}): ${this.formatRange(estimate.severity.moderate)}`, this.margin + 25, this.currentY + 178)
      .text(`- Geringe Findings (${report.minorIssues}): ${this.formatRange(estimate.severity.minor)}`, this.margin + 25, this.currentY + 193);

    this.currentY += 235;

    // Timeline
    this.addDetailedTimeline(report, estimate);
  }

  private addDetailedTimeline(report: AuditReport, estimate: CostEstimateSummary): void {
    this.doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Empfohlener Umsetzungs-Zeitplan', this.margin, this.currentY);

    this.currentY += 30;

    const phases = this.buildTimelinePhases(report, estimate);

    if (phases.length === 0) {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Keine offenen Findings. Empfohlen: Monitoring und regelmaessige Re-Audits alle 6-12 Monate.', this.margin, this.currentY);
      this.currentY += 30;
      return;
    }

    phases.forEach((phase, index) => {
      const bgColor = index % 2 === 0 ? this.colors.white : this.colors.background;

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 40)
        .fill(bgColor);

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(phase.name, this.margin + 10, this.currentY + 8)
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(`Zeit: ${phase.duration}`, this.margin + 10, this.currentY + 24)
        .fillColor(this.colors.primary)
        .text(`Budget: ${phase.cost}`, this.margin + 200, this.currentY + 24);

      this.currentY += 40;
    });

    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(`Gesamter Zeitraum: ${this.describeTimeline(estimate.timelineWeeks)}`, this.margin, this.currentY + 10);

    this.currentY += 30;
  }

  //#endregion
  //#region Action Plan
  private addActionPlan(report: AuditReport): void {
    this.addSectionHeader('Handlungsempfehlungen', 'Naechste Schritte');

    const estimate = this.estimateCosts(report);
    const actions = this.generateActionItems(report, estimate);

    actions.forEach((action, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 110)
        .fillAndStroke(this.colors.background, this.colors.border);

      // Priority badge
      const priorityColor = action.priority === 'Sofort' ? this.colors.critical :
                           action.priority === 'Kurzfristig' ? this.colors.high :
                           this.colors.medium;

      this.doc.rect(this.margin + 10, this.currentY + 10, 80, 25)
        .fillAndStroke(priorityColor, priorityColor);

      this.doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(this.colors.white)
        .text(action.priority, this.margin + 15, this.currentY + 16);

      // Title
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(`${index + 1}. ${action.title}`, this.margin + 100, this.currentY + 15);

      // Description
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(action.description, this.margin + 15, this.currentY + 45, {
          width: this.contentWidth - 30
        });

      // Cost & Time
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(`  ${action.cost}  |    ${action.time}`, this.margin + 15, this.currentY + 90);

      this.currentY += 120;
    });
  }
  //#endregion

  //#region Technical Overview
  private addTechnicalOverview(report: AuditReport): void {
    this.addSectionHeader('Technische Details', 'Fuer Entwickler');

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text('Dieser Abschnitt enthaelt technische Details fuer Ihr Entwicklungsteam.',
        this.margin, this.currentY);

    this.currentY += 30;

    // Summary stats
    const stats = [
      { label: 'Gepruefte Seiten', value: report.totalPages.toString() },
      { label: 'WCAG Version', value: `${report.wcagVersion} Level ${report.conformanceLevel}` },
      { label: 'Kritische Verstoesse', value: report.criticalIssues.toString() },
      { label: 'Ernste Verstoesse', value: report.seriousIssues.toString() },
      { label: 'Moderate Verstoesse', value: report.moderateIssues.toString() },
      { label: 'Geringfuegige Verstoesse', value: report.minorIssues.toString() }
    ];

    stats.forEach((stat, index) => {
      const x = this.margin + (index % 2 === 0 ? 0 : 250);
      const y = this.currentY + Math.floor(index / 2) * 50;

      this.doc.rect(x, y, 240, 40)
        .fillAndStroke(this.colors.background, this.colors.border);

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(stat.label, x + 10, y + 8)
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(stat.value, x + 10, y + 22);
    });

    this.currentY += 160;

    // Top issues list
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text)
      .text('Haeufigste Probleme:', this.margin, this.currentY);

    this.currentY += 25;

    const topIssues = this.getTopIssues(report);

    if (topIssues.length === 0) {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.accent)
        .text('Keine Probleme gefunden!', this.margin + 10, this.currentY);
      this.currentY += 30;
    } else {
      topIssues.forEach((issue, index) => {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(this.colors.text)
          .text(`${index + 1}. ${issue.description} (${issue.count}x)`, this.margin + 10, this.currentY);

        this.currentY += 20;
      });
    }

    // Add detailed violations breakdown
    this.currentY += 20;
    this.addDetailedViolations(report);
  }

  private addDetailedViolations(report: AuditReport): void {
    this.doc.addPage();
    this.addSectionHeader('Detaillierte Fehlerliste', 'Alle gefundenen Barrieren');

    if (report.totalViolations === 0) {
      this.doc.rect(this.margin, this.currentY, this.contentWidth, 100)
        .fillAndStroke('#ecfdf5', '#10b981');

      this.doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#065f46')
        .text('Keine Barrieren gefunden!', this.margin + 20, this.currentY + 20)
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Ihre Website erfuellt alle WCAG 2.2 AA Anforderungen.', this.margin + 20, this.currentY + 50);

      return;
    }

    // Group violations by severity
    const criticalViolations: Array<{ page: string, violation: any }> = [];
    const seriousViolations: Array<{ page: string, violation: any }> = [];
    const moderateViolations: Array<{ page: string, violation: any }> = [];
    const minorViolations: Array<{ page: string, violation: any }> = [];

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

    // Show critical first
    if (criticalViolations.length > 0) {
      this.addViolationSection('KRITISCH', criticalViolations, this.colors.critical);
    }

    if (seriousViolations.length > 0) {
      this.addViolationSection('ERNSTHAFT', seriousViolations, this.colors.high);
    }

    if (moderateViolations.length > 0) {
      this.addViolationSection('MODERAT', moderateViolations, this.colors.medium);
    }

    if (minorViolations.length > 0) {
      this.addViolationSection('GERINGFUeGIG', minorViolations, this.colors.low);
    }
  }

  private addViolationSection(severity: string, violations: Array<{ page: string, violation: any }>, color: string): void {
    // Check if we need a new page
    if (this.currentY > 600) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    this.doc.rect(this.margin, this.currentY, this.contentWidth, 40)
      .fillAndStroke(color, color);

    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.white)
      .text(`${severity} (${violations.length})`, this.margin + 15, this.currentY + 12);

    this.currentY += 50;

    // Show max 10 violations per severity
    violations.slice(0, 10).forEach((entry, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc.rect(this.margin, this.currentY, this.contentWidth, 80)
        .fillAndStroke(this.colors.background, this.colors.border);

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text(`${index + 1}. ${entry.violation.help}`, this.margin + 10, this.currentY + 10, {
          width: this.contentWidth - 20
        })
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(`Beschreibung: ${entry.violation.description}`, this.margin + 10, this.currentY + 30, {
          width: this.contentWidth - 20
        })
        .text(`Seite: ${this.truncateUrl(entry.page)}`, this.margin + 10, this.currentY + 50)
        .text(`WCAG: ${entry.violation.tags.filter((t: string) => t.startsWith('wcag')).join(', ')}`,
          this.margin + 10, this.currentY + 65);

      this.currentY += 90;
    });

    if (violations.length > 10) {
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(`+ ${violations.length - 10} weitere ${severity.toLowerCase()} Probleme...`,
          this.margin + 10, this.currentY);
      this.currentY += 30;
    }
  }

  private truncateUrl(url: string, maxLength: number = 60): string {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }
  //#endregion

  //#region Glossary
  private addGlossary(): void {
    this.addSectionHeader('Glossar', 'Begriffserklaerungen');

    const terms = [
      {
        term: 'WCAG (Web Content Accessibility Guidelines)',
        definition: 'Internationaler Standard fuer barrierefreie Webseiten, entwickelt vom W3C.'
      },
      {
        term: 'Level AA',
        definition: 'Mittlerer Konformitaets-Level. Erfuellt die meisten rechtlichen Anforderungen.'
      },
      {
        term: 'Barrierefreiheit',
        definition: 'Zugaenglichkeit von Webseiten fuer Menschen mit Behinderungen (z.B. Sehbehinderungen, motorische Einschraenkungen).'
      },
      {
        term: 'Screen Reader',
        definition: 'Software, die Bildschirminhalte fuer blinde Menschen vorliest.'
      },
      {
        term: 'Kontrast-Verhaeltnis',
        definition: 'Messwert fuer die Lesbarkeit von Text auf Hintergruenden. Minimum: 4.5:1'
      },
      {
        term: 'Alt-Text',
        definition: 'Textbeschreibung fuer Bilder, die von Screen Readern vorgelesen wird.'
      },
      {
        term: 'Keyboard Navigation',
        definition: 'Bedienung der Website nur mit Tastatur (ohne Maus). Wichtig fuer motorisch eingeschraenkte Nutzer.'
      }
    ];

    terms.forEach(term => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.colors.primary)
        .text(term.term, this.margin, this.currentY)
        .fontSize(10)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text(term.definition, this.margin, this.currentY + 18, {
          width: this.contentWidth
        });

      this.currentY += 50;
    });
  }
  //#endregion

  //#region Helper Methods
  private addSectionHeader(title: string, subtitle?: string): void {
    this.currentY = this.margin;

    this.doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(title, this.margin, this.currentY);

    if (subtitle) {
      this.doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(subtitle, this.margin, this.currentY + 30);

      this.currentY += 60;
    } else {
      this.currentY += 40;
    }

    // Divider line
    this.doc
      .moveTo(this.margin, this.currentY)
      .lineTo(this.pageWidth - this.margin, this.currentY)
      .strokeColor(this.colors.border)
      .lineWidth(1)
      .stroke();

    this.currentY += 20;
  }

  private addInfoPanel(label: string, value: string, x: number, y: number): void {
    this.doc.rect(x, y, this.contentWidth, 70)
      .fillAndStroke(this.colors.background, this.colors.border);

    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textLight)
      .text(label, x + 15, y + 15)
      .fontSize(14)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(value, x + 15, y + 35, { width: this.contentWidth - 30, ellipsis: true });
  }

  private addMetricBox(label: string, value: string, color: string, x: number, y: number): void {
    this.doc.rect(x, y, 155, 90)
      .fillAndStroke(this.colors.white, color)
      .lineWidth(2);

    this.doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textLight)
      .text(label, x + 10, y + 10)
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(value, x + 10, y + 35, { width: 135, align: 'center' });
  }

  private getExecutiveStatus(report: AuditReport): { label: string, color: string } {
    if (report.criticalIssues > 0) {
      return { label: 'HANDLUNGSBEDARF', color: this.colors.critical };
    }
    if (report.seriousIssues > 0) {
      return { label: 'VERBESSERUNG EMPFOHLEN', color: this.colors.medium };
    }
    if (report.totalViolations === 0) {
      return { label: 'KONFORM', color: this.colors.accent };
    }
    return { label: 'OPTIMIERUNG MOeGLICH', color: this.colors.low };
  }

  private getExecutiveSummary(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return `Ihre Website hat ${report.criticalIssues} kritische Barrieren, die Menschen mit Behinderungen vom Zugang ausschliessen. Dies stellt ein rechtliches und geschaeftliches Risiko dar. Wir empfehlen dringend zeitnahe Massnahmen.`;
    }
    if (report.seriousIssues > 0) {
      return `Ihre Website ist grundsaetzlich zugaenglich, hat aber ${report.seriousIssues} ernsthafte Probleme, die die Nutzererfahrung fuer Menschen mit Einschraenkungen beeintraechtigen. Durch Verbesserungen erreichen Sie eine breitere Zielgruppe.`;
    }
    if (report.totalViolations === 0) {
      return `Hervorragend! Ihre Website erfuellt die WCAG 2.2 AA Anforderungen. Sie erreichen damit nicht nur rechtliche Compliance, sondern positionieren sich auch als inklusives, modernes Unternehmen.`;
    }
    return `Ihre Website hat ${report.totalViolations} kleinere Probleme. Diese beeintraechtigen die Barrierefreiheit nur geringfuegig, sollten aber dennoch behoben werden, um bestmoegliche Zugaenglichkeit zu gewaehrleisten.`;
  }

  private calculateRiskLevel(report: AuditReport): { level: string, score: number, label: string, color: string } {
    const score = Math.min(100, (report.criticalIssues * 20) + (report.seriousIssues * 10) + (report.moderateIssues * 3));

    if (score >= 50) {
      return { level: 'Hoch', score, label: 'HOCH', color: this.colors.critical };
    }
    if (score >= 20) {
      return { level: 'Mittel', score, label: 'MITTEL', color: this.colors.medium };
    }
    return { level: 'Niedrig', score, label: 'NIEDRIG', color: this.colors.accent };
  }

  private estimateCosts(report: AuditReport): CostEstimateSummary {
    const counts = {
      critical: Math.max(0, report.criticalIssues),
      serious: Math.max(0, report.seriousIssues),
      moderate: Math.max(0, report.moderateIssues),
      minor: Math.max(0, report.minorIssues),
    };
    const totalFindings = counts.critical + counts.serious + counts.moderate + counts.minor;
    const bundleSize = 20;
    const perBundle: CostRange = { min: 500, max: 1000 };

    if (totalFindings === 0) {
      return {
        bundleCount: 0,
        bundleSize,
        perBundle,
        total: { min: 0, max: 0 },
        timelineWeeks: { min: 0, max: 0 },
        severity: {
          critical: { min: 0, max: 0 },
          serious: { min: 0, max: 0 },
          moderate: { min: 0, max: 0 },
          minor: { min: 0, max: 0 },
        },
      };
    }

    const bundleCount = Math.max(1, Math.ceil(totalFindings / bundleSize));
    const totalRange: CostRange = {
      min: bundleCount * perBundle.min,
      max: bundleCount * perBundle.max,
    };
    const timelineWeeks = {
      min: bundleCount,
      max: bundleCount * 2,
    };

    const keys: Array<'critical' | 'serious' | 'moderate' | 'minor'> = ['critical', 'serious', 'moderate', 'minor'];
    const severity: Record<'critical' | 'serious' | 'moderate' | 'minor', CostRange> = {
      critical: { min: 0, max: 0 },
      serious: { min: 0, max: 0 },
      moderate: { min: 0, max: 0 },
      minor: { min: 0, max: 0 },
    };

    const nonZeroKeys = keys.filter(key => counts[key] > 0);
    let remainingMin = totalRange.min;
    let remainingMax = totalRange.max;

    nonZeroKeys.forEach((key, index) => {
      if (index === nonZeroKeys.length - 1) {
        severity[key] = {
          min: Math.max(0, remainingMin),
          max: Math.max(0, remainingMax),
        };
        return;
      }

      const ratio = counts[key] / totalFindings;
      const minValue = Math.max(0, Math.min(remainingMin, Math.round(totalRange.min * ratio)));
      const maxValue = Math.max(0, Math.min(remainingMax, Math.round(totalRange.max * ratio)));

      severity[key] = { min: minValue, max: maxValue };
      remainingMin -= minValue;
      remainingMax -= maxValue;
    });

    return {
      bundleCount,
      bundleSize,
      perBundle,
      total: totalRange,
      timelineWeeks,
      severity,
    };
  }

  private buildTimelinePhases(
    report: AuditReport,
    estimate: CostEstimateSummary
  ): Array<{ name: string; cost: string; duration: string; color: string }> {
    const phases = [
      {
        name: 'Phase 1: Kritische Probleme priorisieren',
        issues: report.criticalIssues,
        cost: this.formatRange(estimate.severity.critical),
        duration: report.criticalIssues > 0 ? '1-2 Wochen' : '0 Wochen',
        color: this.colors.critical,
      },
      {
        name: 'Phase 2: Ernste Probleme stabilisieren',
        issues: report.seriousIssues,
        cost: this.formatRange(estimate.severity.serious),
        duration: report.seriousIssues > 0 ? '2-3 Wochen' : '0 Wochen',
        color: this.colors.high,
      },
      {
        name: 'Phase 3: Nutzerkomfort verbessern',
        issues: report.moderateIssues,
        cost: this.formatRange(estimate.severity.moderate),
        duration: report.moderateIssues > 0 ? '2-4 Wochen' : '0 Wochen',
        color: this.colors.medium,
      },
      {
        name: 'Phase 4: Feinschliff und Monitoring',
        issues: report.minorIssues,
        cost: this.formatRange(estimate.severity.minor),
        duration: report.minorIssues > 0 ? '2-4 Wochen' : '0 Wochen',
        color: this.colors.low,
      },
    ];

    return phases
      .filter(phase => phase.issues > 0)
      .map(phase => ({ name: phase.name, cost: phase.cost, duration: phase.duration, color: phase.color }));
  }

  private getLegalRisk(report: AuditReport): string {
    if (report.criticalIssues > 0) return 'HOCH';
    if (report.seriousIssues > 0) return 'MITTEL';
    return 'NIEDRIG';
  }

  private getLegalRiskDescription(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return 'In Deutschland besteht seit 2025 eine erweiterte Barrierefre iheitspflicht (BFSG). Bei Verstoessen drohen Bussgelder bis 100.000 EUR. Zusaetzlich besteht das Risiko von Abmahnungen und Klagen.';
    }
    if (report.seriousIssues > 0) {
      return 'Ihre Website koennte gegen das Barrierefreiheitsstaerkungsgesetz (BFSG) verstossen. Wir empfehlen Verbesserungen, um rechtlichen Risiken vorzubeugen.';
    }
    return 'Ihre Website erfuellt die rechtlichen Mindestanforderungen. Sie sind rechtlich auf der sicheren Seite.';
  }

  private getEconomicImpact(report: AuditReport): string {
    if (report.criticalIssues > 0) return 'VERLUSTE';
    if (report.seriousIssues > 0) return 'POTENTIAL';
    return 'OPTIMAL';
  }

  private getEconomicDescription(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return 'Ca. 15-20% der Bevoelkerung haben Einschraenkungen. Barrieren fuehren zu Umsatzeinbussen, hoeheren Support-Kosten und schlechteren SEO-Rankings.';
    }
    return 'Barrierefreie Websites erreichen mehr Nutzer, haben bessere SEO-Rankings und niedrigere Support-Kosten. Investitionen zahlen sich direkt aus.';
  }

  private getReputationImpact(report: AuditReport): string {
    if (report.criticalIssues > 0) return 'RISIKO';
    if (report.seriousIssues > 0) return 'CHANCE';
    return 'STAeRKE';
  }

  private getReputationDescription(report: AuditReport): string {
    if (report.criticalIssues > 0) {
      return 'Mangelnde Barrierefreiheit schadet Ihrem Image. Kunden erwarten inklusive Angebote. Negative Berichterstattung kann die Marke nachhaltig schaedigen.';
    }
    return 'Barrierefreiheit staerkt Ihre Marke als verantwortungsbewusstes, modernes Unternehmen. Sie zeigen, dass Ihnen alle Kunden wichtig sind.';
  }

  private calculateROI(report: AuditReport) {
    return {
      additionalUsers: '15-20% mehr',
      legalRiskReduction: '90%',
      supportCostReduction: '30-40%'
    };
  }

  private getQuickWins(report: AuditReport): string[] {
    return [
      'Alt-Texte fuer Bilder hinzufuegen',
      'Ueberschriften-Hierarchie korrigieren',
      'Link-Texte verbessern',
      'Farbkontraste anpassen'
    ];
  }

  private getStrategicItems(report: AuditReport): string[] {
    return [
      'Keyboard-Navigation optimieren',
      'Screen Reader-Kompatibilitaet verbessern',
      'ARIA-Labels implementieren',
      'Formulare barrierefrei gestalten'
    ];
  }

  private getFillInItems(report: AuditReport): string[] {
    return [
      'Zusaetzliche Sprach-Optionen',
      'Erweiterte Tastaturbefehle',
      'Lesemodus-Unterstuetzung',
      'Dunkler Modus'
    ];
  }

  private getReconsiderItems(report: AuditReport): string[] {
    return [
      'Vollstaendige Neugestaltung',
      'Multi-Device Kompatibilitaet',
      'Legacy Browser Support'
    ];
  }

  private generateActionItems(report: AuditReport, estimate: CostEstimateSummary) {
    const actions = [];

    if (report.criticalIssues > 0) {
      actions.push({
        priority: 'Sofort',
        title: 'Kritische Barrieren beheben',
        description: 'Diese Probleme verhindern den Zugang fuer Menschen mit Behinderungen vollstaendig. Rechtliches und geschaeftliches Risiko.',
        cost: this.formatRange(estimate.severity.critical),
        time: '1-2 Wochen'
      });
    }

    if (report.seriousIssues > 0) {
      actions.push({
        priority: 'Kurzfristig',
        title: 'Ernste Probleme beheben',
        description: 'Diese Probleme beeintraechtigen die Nutzererfahrung erheblich. Empfohlene Umsetzung innerhalb der naechsten 4 Wochen.',
        cost: this.formatRange(estimate.severity.serious),
        time: '2-3 Wochen'
      });
    }

    actions.push({
      priority: 'Mittelfristig',
      title: 'Automatisierte Tests einrichten',
      description: 'Integrieren Sie Barrierefreiheits-Tests in Ihren Entwicklungsprozess, um zukuenftige Probleme zu vermeiden.',
      cost: '2000 EUR - 4000 EUR',
      time: '1-2 Wochen'
    });

    actions.push({
      priority: 'Mittelfristig',
      title: 'Team-Schulung durchfuehren',
      description: 'Schulen Sie Ihr Entwicklungs- und Design-Team zu Barrierefreiheit, um nachhaltige Verbesserungen zu erzielen.',
      cost: '1500 EUR - 3000 EUR',
      time: '2-3 Tage'
    });

    return actions;
  }

  private getTopIssues(report: AuditReport): { description: string, count: number }[] {
    // Group violations by ID
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
      .slice(0, 5);
  }
  //#endregion
}
