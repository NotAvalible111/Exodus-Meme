import { createHash } from 'crypto';

/**
 * Generates a simple SHA-256 hash for a given string (usually a URL or post ID)
 * This is used for basic duplicate detection in the cache.
 */
export function generateHash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

/**
 * Compares two URLs to see if they might be the same image, 
 * even if they have different subdomains or query params.
 */
export function isDuplicate(url1: string, url2: string): boolean {
    try {
        const u1 = new URL(url1);
        const u2 = new URL(url2);

        // Normalize by Removing query params and comparing pathname
        return u1.hostname.replace('i.', '') === u2.hostname.replace('i.', '') &&
            u1.pathname === u2.pathname;
    } catch {
        return url1 === url2;
    }
}
