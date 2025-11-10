/**
 * Test Server Utilities
 *
 * Helper functions for testing Express server and Socket.IO functionality.
 */

import express, { Express } from 'express';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';

export interface TestServerContext {
  app: Express;
  httpServer: HttpServer;
  io: SocketIOServer;
  port: number;
  baseUrl: string;
}

export interface TestSocketContext {
  clientSocket: ClientSocket;
  serverSocket: any;
}

/**
 * Create a test server instance
 */
export async function createTestServer(): Promise<TestServerContext> {
  const app = express();
  const httpServer = app.listen(0); // Random available port
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  await new Promise<void>((resolve) => {
    httpServer.once('listening', () => resolve());
  });

  const address = httpServer.address() as AddressInfo;
  const port = address.port;
  const baseUrl = `http://localhost:${port}`;

  return {
    app,
    httpServer,
    io,
    port,
    baseUrl,
  };
}

/**
 * Close test server
 */
export async function closeTestServer(context: TestServerContext): Promise<void> {
  return new Promise((resolve, reject) => {
    context.io.close(() => {
      context.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Create a test Socket.IO client connection
 */
export async function createTestSocketClient(
  serverUrl: string
): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(serverUrl, {
      transports: ['websocket'],
      reconnection: false,
    });

    client.on('connect', () => resolve(client));
    client.on('connect_error', (err) => reject(err));

    // Timeout after 5 seconds
    setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
  });
}

/**
 * Close test Socket.IO client
 */
export async function closeTestSocketClient(client: ClientSocket): Promise<void> {
  return new Promise((resolve) => {
    if (client.connected) {
      client.on('disconnect', () => resolve());
      client.close();
    } else {
      resolve();
    }
  });
}

/**
 * Wait for a specific Socket.IO event with timeout
 */
export async function waitForSocketEvent<T = any>(
  socket: ClientSocket,
  eventName: string,
  timeout: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    socket.once(eventName, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Create a mock HTTP request for testing
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
}) {
  return {
    method: options.method || 'GET',
    url: options.url || '/',
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    headers: options.headers || {},
    get: (header: string) => options.headers?.[header.toLowerCase()],
  };
}

/**
 * Create a mock HTTP response for testing
 */
export function createMockResponse() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status: function (code: number) {
      this.statusCode = code;
      return this;
    },
    json: function (data: any) {
      this.body = data;
      return this;
    },
    send: function (data: any) {
      this.body = data;
      return this;
    },
    setHeader: function (key: string, value: string) {
      this.headers[key] = value;
      return this;
    },
    getHeader: function (key: string) {
      return this.headers[key];
    },
    end: function () {
      return this;
    },
  };
  return res;
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Condition not met within timeout');
}

/**
 * Generate random port for testing
 */
export function getRandomPort(): number {
  return Math.floor(Math.random() * (65535 - 1024) + 1024);
}

/**
 * Create a temporary directory for test files
 */
export async function createTempDir(): Promise<string> {
  const { promises: fs } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  const tempPath = join(tmpdir(), `wcag-test-${Date.now()}`);
  await fs.mkdir(tempPath, { recursive: true });
  return tempPath;
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  const { promises: fs } = await import('fs');

  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors in tests
    console.warn(`Failed to cleanup temp dir: ${dirPath}`, error);
  }
}

/**
 * Mock HTTP request with custom headers
 */
export function mockRequestWithHeaders(headers: Record<string, string>) {
  return createMockRequest({ headers });
}

/**
 * Extract response body from mock response
 */
export function extractResponseBody(mockRes: any): any {
  return mockRes.body;
}

/**
 * Extract response status from mock response
 */
export function extractResponseStatus(mockRes: any): number {
  return mockRes.statusCode;
}
