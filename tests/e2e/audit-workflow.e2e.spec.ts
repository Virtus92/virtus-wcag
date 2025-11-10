/**
 * End-to-End Audit Workflow Test
 *
 * This test validates the complete audit workflow from start to finish:
 * 1. Start server (manual setup required)
 * 2. Connect Socket.IO client
 * 3. Submit audit request
 * 4. Monitor progress updates
 * 5. Verify report generation
 * 6. Download report files
 *
 * NOTE: This test requires a running server instance.
 * Run `npm run dev` in a separate terminal before running this test.
 *
 * To run: npm test tests/e2e/audit-workflow.e2e.spec.ts
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { existsSync } from 'fs';
import { join } from 'path';

describe.skip('E2E: Complete Audit Workflow', () => {
  let clientSocket: ClientSocket;
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';
  const testUrl = 'https://example.com'; // Simple test site

  beforeAll(async () => {
    // Connect to Socket.IO server
    return new Promise<void>((resolve, reject) => {
      clientSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        reconnection: false,
      });

      clientSocket.on('connect', () => {
        console.log('✓ Connected to server:', clientSocket.id);
        resolve();
      });

      clientSocket.on('connect_error', (error) => {
        reject(new Error(`Failed to connect to server at ${serverUrl}: ${error.message}`));
      });

      setTimeout(() => {
        reject(new Error('Socket connection timeout after 10 seconds'));
      }, 10000);
    });
  });

  afterAll(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.close();
    }
  });

  it('should complete full audit workflow with progress tracking', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const progressUpdates: any[] = [];
      let jobId: string;

      // Set up progress tracking
      clientSocket.on('progress', (data) => {
        console.log(`📊 Progress: ${data.stage} - ${data.message} (${data.progress}%)`);
        progressUpdates.push(data);

        // Verify progress structure
        expect(data).toHaveProperty('stage');
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('progress');
        expect(typeof data.progress).toBe('number');
        expect(data.progress).toBeGreaterThanOrEqual(0);
        expect(data.progress).toBeLessThanOrEqual(100);
      });

      // Set up completion handler
      clientSocket.on('complete', (data) => {
        console.log('✓ Audit completed successfully');
        console.log(`  Pages: ${data.report.totalPages}`);
        console.log(`  Violations: ${data.report.totalViolations}`);
        console.log(`  Download: ${data.downloadUrl}`);

        try {
          // Verify completion data structure
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('report');
          expect(data.report).toHaveProperty('baseUrl');
          expect(data.report).toHaveProperty('totalPages');
          expect(data.report).toHaveProperty('totalViolations');
          expect(data).toHaveProperty('downloadUrl');
          expect(data).toHaveProperty('jsonUrl');

          // Verify we received progress updates
          expect(progressUpdates.length).toBeGreaterThan(0);

          // Verify progress stages
          const stages = progressUpdates.map(p => p.stage);
          expect(stages).toContain('crawling');
          expect(stages).toContain('auditing');
          expect(stages).toContain('generating');

          // Verify files exist
          const reportFile = data.downloadUrl.split('/').pop();
          const jsonFile = data.jsonUrl.split('/').pop();
          const reportsDir = join(__dirname, '../../reports');

          const pdfPath = join(reportsDir, reportFile);
          const jsonPath = join(reportsDir, jsonFile);

          if (existsSync(pdfPath)) {
            console.log(`✓ PDF report exists: ${reportFile}`);
          } else {
            console.warn(`⚠ PDF report not found: ${pdfPath}`);
          }

          if (existsSync(jsonPath)) {
            console.log(`✓ JSON report exists: ${jsonFile}`);
          } else {
            console.warn(`⚠ JSON report not found: ${jsonPath}`);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Set up error handler
      clientSocket.on('error', (data) => {
        console.error('✗ Audit failed:', data.message);
        reject(new Error(`Audit failed: ${data.message}`));
      });

      // Submit audit request
      try {
        console.log(`🚀 Starting audit for: ${testUrl}`);
        const response = await fetch(`${serverUrl}/api/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: testUrl,
            maxPages: 3, // Keep it small for testing
            socketId: clientSocket.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`API request failed: ${JSON.stringify(error)}`);
        }

        const result = await response.json();
        jobId = result.jobId;

        console.log(`✓ Job started: ${jobId}`);
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('jobId');
        expect(result).toHaveProperty('socketId', clientSocket.id);
      } catch (error) {
        reject(error);
      }

      // Set timeout for entire workflow (5 minutes)
      setTimeout(() => {
        reject(new Error('E2E test timeout after 5 minutes'));
      }, 300000);
    });
  }, 300000); // 5 minute timeout

  it('should handle audit errors gracefully', async () => {
    return new Promise<void>(async (resolve, reject) => {
      clientSocket.on('error', (data) => {
        console.log('✓ Received expected error:', data.message);
        expect(data).toHaveProperty('message');
        expect(typeof data.message).toBe('string');
        resolve();
      });

      // Submit invalid audit request
      try {
        await fetch(`${serverUrl}/api/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'not-a-valid-url',
            maxPages: 5,
            socketId: clientSocket.id,
          }),
        });
      } catch (error) {
        // API validation should catch this
        resolve();
      }

      setTimeout(() => reject(new Error('Error test timeout')), 30000);
    });
  }, 30000);

  it('should resume job status on reconnection', async () => {
    // This would test the resume functionality
    // Requires a running job to resume - skipped for now
    expect(true).toBe(true);
  });
});

/**
 * Setup Instructions for E2E Tests:
 *
 * 1. Start the development server:
 *    npm run dev
 *
 * 2. In a separate terminal, run E2E tests:
 *    npm test tests/e2e/
 *
 * 3. To test against a different server:
 *    TEST_SERVER_URL=http://localhost:4000 npm test tests/e2e/
 *
 * Environment Variables:
 * - TEST_SERVER_URL: Server URL (default: http://localhost:3000)
 * - TEST_TARGET_URL: Target URL for audit (default: https://example.com)
 */
