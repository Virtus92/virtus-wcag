import { describe, it, expect } from 'vitest';
import { canonicalizeUrl, sameBaseDomain, sameHostname } from '../src/utils/url';

describe('URL utilities', () => {
  it('canonicalizes tracking params, default ports, hash, trailing slash', () => {
    const input = 'https://EXAMPLE.com/a/b/?b=2&a=1&utm_source=x#frag';
    const out = canonicalizeUrl(input);
    expect(out).toBe('https://example.com/a/b?a=1&b=2');
  });

  it('removes explicit default ports', () => {
    const OriginalURL = URL;
    class CustomURL extends OriginalURL {}

    Object.defineProperty(CustomURL.prototype, 'port', {
      get(this: URL) {
        return this.protocol === 'https:' ? '443' : '80';
      },
      set(this: any, value: string) {
        return Reflect.set(OriginalURL.prototype, 'port', value, this);
      },
    });

    // @ts-expect-error override for test
    global.URL = CustomURL;
    try {
      const out = canonicalizeUrl('https://default-port.test:443/path/');
      expect(out).toBe('https://default-port.test/path');
    } finally {
      // @ts-expect-error restore original URL
      global.URL = OriginalURL;
    }
  });

  it('compares base domains with subdomains', () => {
    expect(sameBaseDomain('https://www.example.com', 'https://blog.example.com/x')).toBe(true);
    expect(sameBaseDomain('https://example.co.uk', 'https://a.example.co.uk')).toBe(true);
    expect(sameBaseDomain('https://example.com', 'https://example.org')).toBe(false);
  });

  it('compares hostnames strictly', () => {
    expect(sameHostname('https://www.example.com', 'https://www.example.com/a')).toBe(true);
    expect(sameHostname('https://www.example.com', 'https://example.com')).toBe(false);
  });

  it('handles invalid inputs gracefully', () => {
    expect(canonicalizeUrl('not a url')).toBe('not a url');
    expect(sameHostname('::::', '::::')).toBe(false);
    expect(sameBaseDomain('::::', '::::')).toBe(false);
  });
});
