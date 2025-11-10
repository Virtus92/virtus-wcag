/**
 * Quick test to validate PDF generator fixes
 */
import { ExecutiveReportGenerator } from './src/pdf-generator-executive';
import { AuditReport } from './src/types';
import { join } from 'path';

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generator fixes...\n');

  const mockReport: AuditReport = {
    baseUrl: 'https://example.com',
    totalPages: 5,
    totalViolations: 42,
    uniqueViolationTypes: 15,
    criticalIssues: 8,
    seriousIssues: 12,
    moderateIssues: 15,
    minorIssues: 7,
    accessibilityScore: 62,
    scoreBreakdown: {
      wcagCompliance: 60,
      keyboardAccessibility: 70,
      screenReaderCompatibility: 55,
      performanceScore: 85
    },
    pages: [
      {
        url: 'https://example.com/',
        title: 'Homepage',
        violations: [
          {
            id: 'color-contrast',
            impact: 'critical',
            description: 'Elements must have sufficient color contrast',
            help: 'Ensure sufficient color contrast',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
            tags: ['wcag2aa', 'wcag143'],
            nodes: [
              {
                html: '<button>Click me</button>',
                target: ['button'],
                failureSummary: 'Contrast ratio is 2.5:1'
              }
            ]
          },
          {
            id: 'label',
            impact: 'serious',
            description: 'Form elements must have labels',
            help: 'Form elements must have labels',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/label',
            tags: ['wcag2a', 'wcag412'],
            nodes: [
              {
                html: '<input type="text">',
                target: ['input'],
                failureSummary: 'Missing label'
              }
            ]
          }
        ],
        passes: 45,
        incomplete: 2,
        timestamp: new Date()
      },
      {
        url: 'https://example.com/about',
        title: 'About Us',
        violations: [],
        passes: 50,
        incomplete: 0,
        timestamp: new Date()
      }
    ],
    scanDate: new Date(),
    wcagVersion: '2.2',
    conformanceLevel: 'AA',
    crawlMetadata: {
      totalDiscovered: 10,
      totalAudited: 5,
      totalSkipped: 3,
      totalFailed: 2,
      unvisitedUrls: [
        'https://example.com/contact',
        'https://example.com/services',
        'https://example.com/products'
      ],
      failedUrls: [
        {
          url: 'https://example.com/broken1',
          statusCode: 404,
          reason: 'Not Found'
        },
        {
          url: 'https://example.com/broken2',
          statusCode: 500,
          reason: 'Internal Server Error'
        }
      ]
    },
    deadLinks: [
      {
        url: 'https://example.com/broken1',
        foundOn: [],
        statusCode: 404,
        statusText: 'Not Found'
      },
      {
        url: 'https://example.com/broken2',
        foundOn: [],
        statusCode: 500,
        statusText: 'Internal Server Error'
      }
    ]
  };

  const generator = new ExecutiveReportGenerator();
  const outputPath = join(process.cwd(), 'reports', 'test-fix-validation.pdf');

  console.log('📄 Generating test PDF...');
  await generator.generate(mockReport, outputPath);
  console.log('✅ PDF generated successfully!');
  console.log(`📂 Location: ${outputPath}\n`);

  console.log('✨ Validation checklist:');
  console.log('   1. ✓ All pages should have DARK backgrounds (#0f172a)');
  console.log('   2. ✓ NO white pages or sections');
  console.log('   3. ✓ NO empty pages between sections');
  console.log('   4. ✓ NO text overlapping other text');
  console.log('   5. ✓ Proper spacing between all sections\n');

  console.log('🎯 Expected page flow:');
  console.log('   • Cover Page (dark)');
  console.log('   • Executive Summary (dark)');
  console.log('   • Crawl Summary (dark)');
  console.log('   • Score Breakdown (dark)');
  console.log('   • Page-by-Page Analysis (dark)');
  console.log('   • Complete Violations List (dark)');
  console.log('   • Quality Metrics (dark)');
  console.log('   • Business Impact (dark)');
  console.log('   • Technical Summary (dark)');
  console.log('   • Glossary (dark)\n');

  console.log('🔍 Please review the PDF manually to confirm all fixes.');
}

testPDFGeneration().catch(console.error);
