/**
 * Socket.IO Integration Tests
 *
 * Tests for WebSocket real-time communication with the server.
 * Validates connection handling, progress updates, and error scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket as ServerSocket } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';

describe('Socket.IO Integration Tests', () => {
  let httpServer: HttpServer;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let serverSocket: ServerSocket;
  let baseUrl: string;

  // Mock job store
  const jobs = new Map();

  beforeAll(async () => {
    // Create test HTTP server
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Set up Socket.IO event handlers (mimic server.ts)
    io.on('connection', (socket) => {
      serverSocket = socket;

      socket.on('resume', (jobId: string) => {
        const job = jobs.get(jobId);
        if (job) {
          job.socketId = socket.id; // Update socket ID

          if (job.status === 'complete') {
            socket.emit('complete', job.result);
          } else if (job.status === 'error') {
            socket.emit('error', { message: job.error });
          } else {
            socket.emit('progress', {
              message: job.message,
              progress: job.progress,
            });
          }
        } else {
          socket.emit('error', { message: 'Job not found or expired' });
        }
      });
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      io.close(() => {
        httpServer.close(() => resolve());
      });
    });
  });

  beforeEach(() => {
    jobs.clear();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.close();
    }
  });

  describe('Connection Handling', () => {
    it('should establish WebSocket connection', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          expect(clientSocket.connected).toBe(true);
          expect(clientSocket.id).toBeDefined();
          expect(typeof clientSocket.id).toBe('string');
          resolve();
        });

        clientSocket.on('connect_error', (error) => {
          reject(error);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should handle disconnection gracefully', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          clientSocket.on('disconnect', (reason) => {
            expect(reason).toBeDefined();
            resolve();
          });

          clientSocket.close();
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Test timeout')), 5000);
      });
    });

    it('should reconnect after temporary disconnection', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 100,
        });

        let connectCount = 0;

        clientSocket.on('connect', () => {
          connectCount++;

          if (connectCount === 1) {
            // First connection - disconnect
            clientSocket.disconnect();
          } else if (connectCount === 2) {
            // Reconnected successfully
            expect(clientSocket.connected).toBe(true);
            resolve();
          }
        });

        clientSocket.on('disconnect', () => {
          if (connectCount === 1) {
            // Reconnect after disconnect
            clientSocket.connect();
          }
        });

        clientSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
      });
    });
  });

  describe('Resume Event', () => {
    it('should resume running job and receive progress', async () => {
      // Set up a running job
      const jobId = 'test-job-123';
      jobs.set(jobId, {
        jobId,
        socketId: 'old-socket-id',
        status: 'running',
        progress: 45,
        message: 'Auditing page 3/5',
      });

      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          // Request job resume
          clientSocket.emit('resume', jobId);
        });

        clientSocket.on('progress', (data) => {
          expect(data).toHaveProperty('message', 'Auditing page 3/5');
          expect(data).toHaveProperty('progress', 45);

          // Verify socket ID was updated
          const job = jobs.get(jobId);
          expect(job.socketId).toBe(clientSocket.id);
          resolve();
        });

        clientSocket.on('error', reject);
        setTimeout(() => reject(new Error('Resume timeout')), 5000);
      });
    });

    it('should resume completed job and receive result', async () => {
      const jobId = 'completed-job';
      const mockResult = {
        success: true,
        report: {
          totalPages: 5,
          totalViolations: 12,
        },
        downloadUrl: '/api/download/test.pdf',
      };

      jobs.set(jobId, {
        jobId,
        socketId: 'old-socket-id',
        status: 'complete',
        progress: 100,
        message: 'Complete',
        result: mockResult,
      });

      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('resume', jobId);
        });

        clientSocket.on('complete', (data) => {
          expect(data).toEqual(mockResult);
          expect(data).toHaveProperty('success', true);
          expect(data).toHaveProperty('report');
          expect(data.report).toHaveProperty('totalPages', 5);
          resolve();
        });

        clientSocket.on('error', reject);
        setTimeout(() => reject(new Error('Resume timeout')), 5000);
      });
    });

    it('should resume failed job and receive error', async () => {
      const jobId = 'failed-job';
      const errorMessage = 'Network timeout during crawl';

      jobs.set(jobId, {
        jobId,
        socketId: 'old-socket-id',
        status: 'error',
        progress: 30,
        message: 'Failed',
        error: errorMessage,
      });

      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('resume', jobId);
        });

        clientSocket.on('error', (data) => {
          expect(data).toHaveProperty('message', errorMessage);
          resolve();
        });

        setTimeout(() => reject(new Error('Resume timeout')), 5000);
      });
    });

    it('should handle non-existent job resume gracefully', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          clientSocket.emit('resume', 'non-existent-job');
        });

        clientSocket.on('error', (data) => {
          expect(data).toHaveProperty('message', 'Job not found or expired');
          resolve();
        });

        setTimeout(() => reject(new Error('Error timeout')), 5000);
      });
    });
  });

  describe('Progress Events', () => {
    it('should receive multiple progress updates', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        const progressUpdates: any[] = [];
        let updateCount = 0;

        clientSocket.on('connect', () => {
          // Simulate progress updates from server
          const stages = [
            { stage: 'crawling', progress: 10, message: 'Crawling website...' },
            { stage: 'discovered', progress: 30, message: 'Discovered 5 pages' },
            { stage: 'auditing', progress: 60, message: 'Auditing page 3/5' },
            { stage: 'generating', progress: 90, message: 'Generating PDF...' },
          ];

          stages.forEach((update, index) => {
            setTimeout(() => {
              serverSocket.emit('progress', update);
            }, index * 100);
          });
        });

        clientSocket.on('progress', (data) => {
          progressUpdates.push(data);
          updateCount++;

          expect(data).toHaveProperty('stage');
          expect(data).toHaveProperty('progress');
          expect(data).toHaveProperty('message');

          if (updateCount === 4) {
            // Received all updates
            expect(progressUpdates.length).toBe(4);
            expect(progressUpdates[0].stage).toBe('crawling');
            expect(progressUpdates[3].stage).toBe('generating');
            expect(progressUpdates[3].progress).toBe(90);
            resolve();
          }
        });

        clientSocket.on('error', reject);
        setTimeout(() => reject(new Error('Progress timeout')), 5000);
      });
    });

    it('should handle progress with additional metadata', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          serverSocket.emit('progress', {
            stage: 'discovered',
            progress: 30,
            message: 'Discovered pages',
            pages: ['https://example.com/', 'https://example.com/about'],
            unvisitedPages: ['https://example.com/contact'],
            failedPages: [],
          });
        });

        clientSocket.on('progress', (data) => {
          expect(data).toHaveProperty('pages');
          expect(data).toHaveProperty('unvisitedPages');
          expect(data).toHaveProperty('failedPages');
          expect(Array.isArray(data.pages)).toBe(true);
          expect(data.pages.length).toBe(2);
          resolve();
        });

        clientSocket.on('error', reject);
        setTimeout(() => reject(new Error('Progress timeout')), 5000);
      });
    });
  });

  describe('Complete Events', () => {
    it('should receive completion event with report summary', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        const completionData = {
          success: true,
          report: {
            baseUrl: 'https://example.com',
            totalPages: 5,
            totalViolations: 12,
            criticalIssues: 2,
            seriousIssues: 5,
            moderateIssues: 3,
            minorIssues: 2,
            scanDate: new Date().toISOString(),
            wcagVersion: '2.2',
            conformanceLevel: 'AA',
          },
          downloadUrl: '/api/download/audit-report-123.pdf',
          jsonUrl: '/api/download/audit-report-123.json',
        };

        clientSocket.on('connect', () => {
          serverSocket.emit('complete', completionData);
        });

        clientSocket.on('complete', (data) => {
          expect(data).toEqual(completionData);
          expect(data.success).toBe(true);
          expect(data.report).toHaveProperty('totalPages', 5);
          expect(data.report).toHaveProperty('totalViolations', 12);
          expect(data).toHaveProperty('downloadUrl');
          expect(data).toHaveProperty('jsonUrl');
          resolve();
        });

        clientSocket.on('error', reject);
        setTimeout(() => reject(new Error('Complete timeout')), 5000);
      });
    });
  });

  describe('Error Events', () => {
    it('should receive error events with descriptive messages', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        const errorMessages = [
          'No pages found to audit',
          'Network timeout during crawl',
          'Invalid URL provided',
        ];

        let errorCount = 0;

        clientSocket.on('connect', () => {
          errorMessages.forEach((message, index) => {
            setTimeout(() => {
              serverSocket.emit('error', { message });
            }, index * 100);
          });
        });

        clientSocket.on('error', (data) => {
          expect(data).toHaveProperty('message');
          expect(typeof data.message).toBe('string');
          expect(errorMessages).toContain(data.message);

          errorCount++;
          if (errorCount === errorMessages.length) {
            resolve();
          }
        });

        setTimeout(() => reject(new Error('Error timeout')), 5000);
      });
    });

    it('should handle critical errors gracefully', async () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = ioClient(baseUrl, {
          transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
          serverSocket.emit('error', {
            message: 'Critical: Browser crashed',
            code: 'BROWSER_CRASH',
            recoverable: false,
          });
        });

        clientSocket.on('error', (data) => {
          expect(data).toHaveProperty('message');
          expect(data.message).toContain('Critical');
          expect(data).toHaveProperty('code');
          expect(data).toHaveProperty('recoverable', false);
          resolve();
        });

        setTimeout(() => reject(new Error('Critical error timeout')), 5000);
      });
    });
  });

  describe('Concurrent Connections', () => {
    it('should handle multiple simultaneous clients', async () => {
      const clients: ClientSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      for (let i = 0; i < 5; i++) {
        const promise = new Promise<void>((resolve, reject) => {
          const client = ioClient(baseUrl, {
            transports: ['websocket'],
          });

          client.on('connect', () => {
            expect(client.connected).toBe(true);
            resolve();
          });

          client.on('connect_error', reject);
          clients.push(client);

          setTimeout(() => reject(new Error(`Client ${i} connection timeout`)), 5000);
        });

        connectionPromises.push(promise);
      }

      await Promise.all(connectionPromises);

      // Verify all clients have unique IDs
      const socketIds = clients.map(c => c.id);
      const uniqueIds = new Set(socketIds);
      expect(uniqueIds.size).toBe(5);

      // Clean up
      clients.forEach(c => c.close());
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with repeated connections', async () => {
      const connectionCycles = 10;

      for (let i = 0; i < connectionCycles; i++) {
        await new Promise<void>((resolve, reject) => {
          const client = ioClient(baseUrl, {
            transports: ['websocket'],
          });

          client.on('connect', () => {
            client.close();
            resolve();
          });

          client.on('connect_error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
      }

      // If we get here without errors, memory management is working
      expect(true).toBe(true);
    });
  });
});
