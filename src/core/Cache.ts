export interface CacheEntry<T> {
    data: T;
    expiry: number;
}

export class Cache {
    private store: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL: number;

    constructor(defaultTTLSeconds = 3600) {
        this.defaultTTL = defaultTTLSeconds * 1000;
    }

    set<T>(key: string, data: T, ttlSeconds?: number): void {
        const ttl = (ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTTL);
        this.store.set(key, {
            data,
            expiry: Date.now() + ttl,
        });
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            return null;
        }

        return entry.data as T;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }

    /**
     * Periodic cleanup of expired entries
     */
    prune(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiry) {
                this.store.delete(key);
            }
        }
    }
}

export const cache = new Cache();
