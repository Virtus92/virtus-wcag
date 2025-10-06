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
  followExternal: z.boolean().optional().default(false),
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
 * Check if URL is from the same domain
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
