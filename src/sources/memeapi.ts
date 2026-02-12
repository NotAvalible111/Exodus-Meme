import { ISourceHandler, FetchOptions, Meme, MediaType } from '../types';
import { http } from '../utils/http';
import { rateLimiter } from '../core/RateLimiter';

interface MemeAPIResponse {
    postLink?: string;
    subreddit?: string;
    title?: string;
    url?: string;
    nsfw?: boolean;
    spoiler?: boolean;
    author?: string;
    ups?: number;
    preview?: string[];
}

export class MemeAPISource implements ISourceHandler {
    name = 'memeapi';
    private recentMemeIds: Set<string> = new Set();
    private maxRecentIds = 200;
    private memeCache: Meme[] = [];
    private lastFetchTime = 0;
    private cacheDuration = 300000;

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const now = Date.now();
        
        if (this.memeCache.length > 10 && now - this.lastFetchTime < this.cacheDuration) {
            const cached = [...this.memeCache].sort(() => Math.random() - 0.5);
            return cached.slice(0, options.limit || 20);
        }

        await rateLimiter.throttle('memeapi');

        const apis = [
            'https://meme-api.com/gimme/50',
            'https://meme-api.com/gimme/memes/50',
            'https://meme-api.com/gimme/dankmemes/50'
        ];

        for (const apiUrl of apis) {
            try {
                const response = await http.get<{ memes: MemeAPIResponse[] }>(apiUrl, {
                    timeout: 8000
                });

                if (response?.memes && Array.isArray(response.memes) && response.memes.length > 0) {
                    const memes = response.memes
                        .map((item, index) => this.mapToMeme(item, index))
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
                console.error(`Error fetching from ${apiUrl}:`, error.message);
                continue;
            }
        }

        if (this.memeCache.length > 0) {
            return [...this.memeCache].sort(() => Math.random() - 0.5).slice(0, options.limit || 20);
        }

        return [];
    }

    private mapToMeme(item: MemeAPIResponse, index: number): Meme | null {
        if (!item.url || item.nsfw) {
            return null;
        }

        const mediaType = this.getMediaType(item.url);
        if (!mediaType || mediaType === 'video') {
            return null;
        }

        const id = item.postLink ? item.postLink.split('/').pop() || `meme_${Date.now()}_${index}` : `meme_${Date.now()}_${index}`;

        return {
            id,
            title: item.title || 'Meme',
            url: item.url,
            sourceUrl: item.postLink || 'https://reddit.com',
            author: item.author || 'unknown',
            subreddit: item.subreddit || 'memes',
            upvotes: item.ups || 0,
            nsfw: item.nsfw || false,
            spoiler: item.spoiler || false,
            mediaType,
            createdAt: Date.now(),
            source: 'reddit'
        };
    }

    private getMediaType(url: string): MediaType | null {
        if (url.match(/\.(jpg|jpeg|png|webp)/i) || url.includes('i.redd.it')) {
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
