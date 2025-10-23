import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebCrawler } from '../src/crawler';
import { startTestServer, TestServer } from './utils/testServer';
import { join } from 'path';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer(join(__dirname, 'fixtures/site'));
});

afterAll(async () => {
  await server.close();
});

describe('crawler', () => {
  it('discovers and visits linked pages within budgets', async () => {
    const crawler = new WebCrawler();
    await crawler.initialize();
    const start = server.url + '/index.html';

    const result = await crawler.crawl(start, 10, false, { maxDepth: 3, maxTimeMs: 30000, respectRobotsTxt: true });

    expect(result.failedUrls.length).toBe(0);
    // Should have visited at least the two pages
    expect(result.discoveredUrls).toEqual(expect.arrayContaining([start, server.url + '/page2.html']));
    await crawler.close();
  });
});

