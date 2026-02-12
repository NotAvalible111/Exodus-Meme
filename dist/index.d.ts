import { AxiosRequestConfig } from 'axios';

type MemeSource = 'reddit' | string;
type OutputFormat = 'json' | 'discord-embed';
type MediaType = 'image' | 'gif' | 'video' | 'any';
type Language = 'es' | 'en' | 'all';
interface Meme {
    id: string;
    title: string;
    url: string;
    sourceUrl: string;
    author: string;
    subreddit?: string;
    upvotes: number;
    nsfw: boolean;
    spoiler: boolean;
    mediaType: MediaType;
    createdAt: number;
    width?: number;
    height?: number;
    source: MemeSource;
}
interface MemeFilter {
    nsfw?: boolean;
    minUpvotes?: number;
    mediaType?: MediaType;
    subreddits?: string[];
    limit?: number;
    cache?: boolean;
    format?: OutputFormat;
    language?: Language;
}
interface FetchOptions extends MemeFilter {
    source?: MemeSource;
}
interface ISourceHandler {
    name: string;
    fetch(options: FetchOptions): Promise<Meme[]>;
}
interface DiscordEmbed {
    title: string;
    url: string;
    description?: string;
    color?: number;
    author?: {
        name: string;
        url?: string;
    };
    image?: {
        url: string;
    };
    footer?: {
        text: string;
    };
    timestamp?: string;
}

declare class MemeForge {
    constructor();
    registerSource(handler: ISourceHandler): void;
    fetch(options?: FetchOptions): Promise<Meme[] | DiscordEmbed[]>;
    fetchOne(options?: FetchOptions): Promise<Meme | DiscordEmbed | null>;
}
declare const memeForge: MemeForge;

declare class Fetcher {
    private sources;
    registerSource(handler: ISourceHandler): void;
    fetch(options: FetchOptions): Promise<Meme[]>;
}
declare const fetcher: Fetcher;

declare class Filter {
    static apply(memes: Meme[], filter: MemeFilter): Meme[];
    static paginate(memes: Meme[], limit?: number): Meme[];
}

interface CacheEntry<T> {
    data: T;
    expiry: number;
}
declare class Cache {
    private store;
    private defaultTTL;
    constructor(defaultTTLSeconds?: number);
    set<T>(key: string, data: T, ttlSeconds?: number): void;
    get<T>(key: string): T | null;
    delete(key: string): void;
    clear(): void;
    /**
     * Periodic cleanup of expired entries
     */
    prune(): void;
}
declare const cache: Cache;

declare class RateLimiter {
    private lastRequestTime;
    private minInterval;
    constructor(requestsPerSecond?: number);
    throttle(key: string): Promise<void>;
}
declare const rateLimiter: RateLimiter;

declare class MultiAPISource implements ISourceHandler {
    name: string;
    private recentMemeIds;
    private maxRecentIds;
    private memeCache;
    private lastFetchTime;
    private cacheDuration;
    fetch(options: FetchOptions): Promise<Meme[]>;
    private mapWantCatToMeme;
    private mapRedditAPIToMeme;
    private getMediaType;
}

declare class DiscordFormatter {
    /**
     * Converts a Meme object to a Discord embed object
     */
    static toEmbed(meme: Meme): DiscordEmbed;
    /**
     * Truncate strings to fit Discord's limits
     */
    private static truncate;
}

declare class HttpClient {
    private client;
    constructor(baseURL?: string);
    get<T>(url: string, config?: AxiosRequestConfig, retries?: number): Promise<T>;
    private isRetryable;
    private delay;
    private normalizeError;
}
declare const http: HttpClient;

declare function generateHash(input: string): string;
declare function isDuplicate(url1: string, url2: string): boolean;

declare function isNSFW(title: string, contentUrl: string, tags?: string[]): boolean;
declare function hasNSFWContent(meme: {
    title: string;
    url: string;
    nsfw: boolean;
    subreddit?: string;
}): boolean;

export { Cache, type CacheEntry, type DiscordEmbed, DiscordFormatter, type FetchOptions, Fetcher, Filter, HttpClient, type ISourceHandler, type Language, type MediaType, type Meme, type MemeFilter, MemeForge, type MemeSource, MultiAPISource, type OutputFormat, RateLimiter, cache, fetcher, generateHash, hasNSFWContent, http, isDuplicate, isNSFW, memeForge, rateLimiter };
