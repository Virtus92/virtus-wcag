/**
 * URL utilities for canonicalization, deduplication, and domain checks.
 */

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'ref', 'referrer', 'yclid', 'dclid'
]);

/**
 * Returns a canonical, normalized representation of a URL suitable for
 * deduplication in the crawl frontier.
 */
export function canonicalizeUrl(input: string): string {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return input;
  }

  // Lowercase protocol and hostname
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();

  // Remove default ports
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
    u.port = '';
  }

  // Normalize pathname: collapse multiple slashes and remove trailing slash (except root)
  u.pathname = u.pathname.replace(/\/+/, '/');
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1);
  }

  // Remove hash
  u.hash = '';

  // Remove tracking params and sort remaining
  for (const key of Array.from(u.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key)) {
      u.searchParams.delete(key);
    }
  }
  u.searchParams.sort();

  return u.toString();
}

/**
 * True if both URLs share the same registrable base domain (incl. subdomains).
 */
export function sameBaseDomain(a: string, b: string): boolean {
  try {
    const ah = new URL(a).hostname;
    const bh = new URL(b).hostname;
    return getBaseDomain(ah) === getBaseDomain(bh);
  } catch {
    return false;
  }
}

/**
 * True if both URLs share the exact hostname.
 */
export function sameHostname(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.toLowerCase() === new URL(b).hostname.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Extract a base domain (rough heuristic without PSL).
 */
export function getBaseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return hostname.toLowerCase();
  const secondLast = parts[parts.length - 2];
  const tlds = new Set(['co', 'com', 'org', 'gov', 'ac', 'net', 'edu']);
  if (tlds.has(secondLast) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

