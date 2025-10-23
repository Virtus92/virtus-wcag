import { z } from 'zod';

// URL validation schema
export const auditRequestSchema = z.object({
  url: z.string()
    .url('Invalid URL format')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          // Only allow http and https protocols
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'Only HTTP and HTTPS protocols are allowed' }
    ),
  maxPages: z.number().min(1).max(100).optional().default(50),
  includeSubdomains: z.boolean().optional().default(true),
});

export type ValidatedAuditRequest = z.infer<typeof auditRequestSchema>;

/**
 * Sanitize URL to prevent injection attacks
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Reconstruct URL to ensure it's clean
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

/**
 * Check if URL is from the same hostname (exact match)
 * Example: example.com === example.com ✅
 *          example.com !== www.example.com ❌
 */
export function isSameDomain(baseUrl: string, targetUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const target = new URL(targetUrl);
    return base.hostname === target.hostname;
  } catch {
    return false;
  }
}

/**
 * Check if URL is from the same base domain (includes subdomains)
 * Example: example.com ↔ www.example.com ✅
 *          example.com ↔ blog.example.com ✅
 *          example.com ↔ facebook.com ❌
 */
export function isSameBaseDomain(baseUrl: string, targetUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const target = new URL(targetUrl);

    // Extract base domain (e.g., "example.com" from "blog.example.com")
    const getBaseDomain = (hostname: string): string => {
      const parts = hostname.split('.');

      // Handle edge cases
      if (parts.length < 2) {
        return hostname; // localhost, etc.
      }

      // Handle special TLDs (co.uk, com.au, etc.)
      if (parts.length >= 3 && ['co', 'com', 'org', 'gov', 'ac'].includes(parts[parts.length - 2])) {
        return parts.slice(-3).join('.');
      }

      // Standard case: take last 2 parts (example.com)
      return parts.slice(-2).join('.');
    };

    return getBaseDomain(base.hostname) === getBaseDomain(target.hostname);
  } catch {
    return false;
  }
}

/**
 * Normalize URL for deduplication
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
    // Sort query parameters
    parsed.searchParams.sort();
    // Remove fragment
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}
