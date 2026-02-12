export function generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export function isDuplicate(url1: string, url2: string): boolean {
    try {
        const u1 = new URL(url1);
        const u2 = new URL(url2);

        return u1.hostname.replace('i.', '') === u2.hostname.replace('i.', '') &&
            u1.pathname === u2.pathname;
    } catch {
        return url1 === url2;
    }
}