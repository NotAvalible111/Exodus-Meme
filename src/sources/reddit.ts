import { ISourceHandler, FetchOptions, Meme, MediaType } from '../types';
import { http } from '../utils/http';
import { rateLimiter } from '../core/RateLimiter';

const BEST_SUBREDDITS = [
    'memes',
    'dankmemes',
    'me_irl',
    'MAAU',
    'wholesomememes',
    'yo_elvr'
];

interface RedditPost {
    id: string;
    title: string;
    url: string;
    permalink: string;
    author: string;
    subreddit: string;
    ups: number;
    over_18: boolean;
    spoiler: boolean;
    is_self: boolean;
    is_video: boolean;
    created_utc: number;
    media?: {
        reddit_video?: {
            fallback_url?: string;
            width?: number;
            height?: number;
        };
    };
    preview?: {
        images?: Array<{
            source?: {
                url?: string;
                width?: number;
                height?: number;
            };
        }>;
    };
}

interface RedditResponse {
    data?: {
        children?: Array<{
            data: RedditPost;
        }>;
    };
}

export class RedditSource implements ISourceHandler {
    name = 'reddit';
    private recentMemeIds: Set<string> = new Set();
    private maxRecentIds = 300;
    private memeCache: Meme[] = [];
    private lastFetchTime = 0;
    private cacheDuration = 120000;

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const now = Date.now();
        
        if (this.memeCache.length > 20 && now - this.lastFetchTime < this.cacheDuration) {
            const cached = [...this.memeCache].sort(() => Math.random() - 0.5);
            return cached.slice(0, options.limit || 30);
        }

        const selectedSub = BEST_SUBREDDITS[Math.floor(Math.random() * BEST_SUBREDDITS.length)];
        
        await rateLimiter.throttle('reddit');

        const sortOptions = ['hot', 'top'];
        const sort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
        const timeParam = sort === 'top' ? '&t=week' : '';
        const url = `https://www.reddit.com/r/${selectedSub}/${sort}.json?limit=50${timeParam}`;

        try {
            const response = await http.get<RedditResponse>(url);

            if (response?.data?.children && response.data.children.length > 0) {
                const memes = response.data.children
                    .map((child) => this.mapToMeme(child.data))
                    .filter((meme): meme is Meme => meme !== null);

                if (memes.length > 0) {
                    this.memeCache = memes;
                    this.lastFetchTime = now;
                    
                    const uniqueMemes: Meme[] = [];
                    for (const meme of memes) {
                        if (!this.recentMemeIds.has(meme.id)) {
                            uniqueMemes.push(meme);
                            this.recentMemeIds.add(meme.id);

                            if (this.recentMemeIds.size > this.maxRecentIds) {
                                const firstId = this.recentMemeIds.values().next().value;
                                if (firstId) this.recentMemeIds.delete(firstId);
                            }
                        }
                    }

                    return uniqueMemes.sort(() => Math.random() - 0.5);
                }
            }
        } catch (error: any) {
            console.error(`Error fetching from r/${selectedSub}:`, error.message);
            
            if (this.memeCache.length > 0) {
                return [...this.memeCache].sort(() => Math.random() - 0.5).slice(0, options.limit || 30);
            }
        }

        return [];
    }

    private mapToMeme(post: RedditPost): Meme | null {
        if (!post.url || post.is_self) {
            return null;
        }

        let mediaUrl = post.url;
        let isRedditVideo = false;

        if (post.is_video && post.media?.reddit_video?.fallback_url) {
            mediaUrl = post.media.reddit_video.fallback_url;
            isRedditVideo = true;
        }

        const mediaType = isRedditVideo ? 'video' : this.getMediaType(mediaUrl);

        if (!mediaType) {
            return null;
        }

        return {
            id: post.id,
            title: post.title,
            url: mediaUrl,
            sourceUrl: `https://reddit.com${post.permalink}`,
            author: post.author,
            subreddit: post.subreddit,
            upvotes: post.ups,
            nsfw: post.over_18,
            spoiler: post.spoiler,
            mediaType,
            createdAt: post.created_utc * 1000,
            width: post.media?.reddit_video?.width || post.preview?.images?.[0]?.source?.width,
            height: post.media?.reddit_video?.height || post.preview?.images?.[0]?.source?.height,
            source: 'reddit'
        };
    }

    private getMediaType(url: string): MediaType | null {
        if (url.match(/\.(jpg|jpeg|png|webp)/i)) {
            return 'image';
        }
        if (url.match(/\.(gif|gifv)/i)) {
            return 'gif';
        }
        if (url.includes('v.redd.it') || url.match(/\.(mp4|webm|mov)/i)) {
            return 'video';
        }
        return null;
    }
}