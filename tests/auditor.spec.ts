import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EnhancedWCAGAuditor } from '../src/auditor-enhanced';
import { startTestServer, TestServer } from './utils/testServer';
import { join } from 'path';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer(join(__dirname, 'fixtures/site'));
});

afterAll(async () => {
  await server.close();
});

describe('enhanced auditor', () => {
  it('finds expected accessibility issues on fixture page', async () => {
    const auditor = new EnhancedWCAGAuditor();
    await auditor.initialize();
    const url = server.url + '/index.html';
    const result = await auditor.auditPage(url);

    const violationIds = result.violations.map(v => v.id);
    // Expect custom rule violations present from our fixtures
    expect(violationIds).toEqual(expect.arrayContaining([
      'custom-button-text',
      'custom-form-label',
      'custom-empty-link',
    ]));
    await auditor.close();
  }, 60000);
});

