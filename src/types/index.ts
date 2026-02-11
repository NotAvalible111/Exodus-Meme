export type MemeSource = 'reddit' | string;

export type OutputFormat = 'json' | 'discord-embed';

export type MediaType = 'image' | 'gif' | 'video' | 'any';

export type Language = 'es' | 'en' | 'all';

export interface Meme {
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

export interface MemeFilter {
    nsfw?: boolean;
    minUpvotes?: number;
    mediaType?: MediaType;
    subreddits?: string[];
    limit?: number;
    cache?: boolean;
    format?: OutputFormat;
    language?: Language;
}

export interface FetchOptions extends MemeFilter {
    source?: MemeSource;
}

export interface ISourceHandler {
    name: string;
    fetch(options: FetchOptions): Promise<Meme[]>;
}

export interface DiscordEmbed {
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