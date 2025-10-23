import { describe, it, expect } from 'vitest';
import { auditRequestSchema, isSameBaseDomain, isSameDomain, normalizeUrl, sanitizeUrl } from '../src/utils/validation';

describe('validation utils', () => {
  it('validates audit request schema and respects defaults', () => {
    const parsed = auditRequestSchema.parse({ url: 'https://example.com' });
    expect(parsed.maxPages).toBe(50);
    expect(parsed.includeSubdomains).toBe(true);
  });

  it('accepts explicit overrides and rejects non-http protocols', () => {
    const parsed = auditRequestSchema.parse({ url: 'https://example.com', maxPages: 10, includeSubdomains: false });
    expect(parsed.maxPages).toBe(10);
    expect(parsed.includeSubdomains).toBe(false);
    expect(() => auditRequestSchema.parse({ url: 'file:///etc/passwd' })).toThrow();
  });

  it('refine hook guards against URL constructor failures', () => {
    const OriginalURL = URL;
    let callCount = 0;

    class InterceptURL extends OriginalURL {
      constructor(input: string, base?: string | URL) {
        if (input === 'https://refine-failure.test') {
          callCount += 1;
          if (callCount === 2) {
            throw new Error('boom');
          }
        }
        super(input, base);
      }
    }

    // @ts-expect-error override for test
    global.URL = InterceptURL;

    try {
      const result = auditRequestSchema.safeParse({ url: 'https://refine-failure.test' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Only HTTP and HTTPS protocols are allowed');
      }
    } finally {
      // @ts-expect-error restore original URL
      global.URL = OriginalURL;
    }
  });

  it('sanitizes and normalizes URLs', () => {
    expect(sanitizeUrl('https://example.com/foo?b=2&a=1#x')).toBe('https://example.com/foo?b=2&a=1#x');
    expect(normalizeUrl('https://example.com/foo/?b=2&a=1#x')).toBe('https://example.com/foo?a=1&b=2');
    expect(normalizeUrl('https://example.com/#frag')).toBe('https://example.com/');
  });

  it('handles invalid URL inputs gracefully', () => {
    expect(() => sanitizeUrl('::::')).toThrow();
    expect(normalizeUrl('::::')).toBe('::::');
    expect(isSameDomain('::::', '::::')).toBe(false);
    expect(isSameBaseDomain('::::', '::::')).toBe(false);
  });

  it('domain comparators handle subdomains and single labels', () => {
    expect(isSameDomain('https://example.com', 'https://example.com/a')).toBe(true);
    expect(isSameDomain('https://example.com', 'https://www.example.com')).toBe(false);
    expect(isSameBaseDomain('https://example.com', 'https://www.example.com')).toBe(true);
    expect(isSameBaseDomain('https://example.co.uk', 'https://a.example.co.uk')).toBe(true);
    expect(isSameBaseDomain('http://localhost:3000', 'http://localhost/test')).toBe(true);
  });
});
