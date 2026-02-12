import { ISourceHandler, FetchOptions, Meme, MediaType } from '../types';
import { http } from '../utils/http';
import { rateLimiter } from '../core/RateLimiter';

interface WantCatResponse {
    url: string;
    title?: string;
}

interface MemesAPIResponse {
    url: string;
    title?: string;
    author?: string;
}

export class MultiAPISource implements ISourceHandler {
    name = 'multiapi';
    private recentMemeIds: Set<string> = new Set();
    private maxRecentIds = 150;
    private memeCache: Meme[] = [];
    private lastFetchTime = 0;
    private cacheDuration = 180000;

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const now = Date.now();
        
        if (this.memeCache.length > 10 && now - this.lastFetchTime < this.cacheDuration) {
            const cached = [...this.memeCache].sort(() => Math.random() - 0.5);
            return cached.slice(0, options.limit || 20);
        }

        await rateLimiter.throttle('multiapi');

        const apis = [
            { 
                url: 'https://api.want.cat/api/memes',
                type: 'want',
                count: 1
            },
            { 
                url: 'https://meme-api.com/gimme/MAAU/20',
                type: 'reddit',
                count: 20
            },
            { 
                url: 'https://meme-api.com/gimme/yo_elvr/20',
                type: 'reddit',
                count: 20
            },
            { 
                url: 'https://meme-api.com/gimme/LatinoPeopleTwitter/20',
                type: 'reddit',
                count: 20
            }
        ];

        const allMemes: Meme[] = [];

        for (const api of apis) {
            try {
                if (api.type === 'want') {
                    for (let i = 0; i < 20; i++) {
                        const response = await http.get<WantCatResponse>(api.url, { timeout: 8000 });
                        if (response?.url) {
                            const meme = this.mapWantCatToMeme(response, i);
                            if (meme) allMemes.push(meme);
                        }
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                } else if (api.type === 'reddit') {
                    const response = await http.get<{ memes: any[] }>(api.url, { timeout: 10000 });
                    if (response?.memes && Array.isArray(response.memes)) {
                        const memes = response.memes
                            .map((item, idx) => this.mapRedditAPIToMeme(item, idx))
                            .filter((meme): meme is Meme => meme !== null);
                        allMemes.push(...memes);
                    }
                }
            } catch (error: any) {
                console.error(`Error fetching from ${api.url}:`, error.message);
                continue;
            }
        }

        if (allMemes.length > 0) {
            this.memeCache = allMemes;
            this.lastFetchTime = now;
            
            const uniqueMemes: Meme[] = [];
            for (const meme of allMemes) {
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

        if (this.memeCache.length > 0) {
            return [...this.memeCache].sort(() => Math.random() - 0.5).slice(0, options.limit || 20);
        }

        return [];
    }

    private mapWantCatToMeme(response: WantCatResponse, index: number): Meme | null {
        if (!response.url) return null;

        const id = `want_${Date.now()}_${index}_${response.url.split('/').pop()}`;

        return {
            id,
            title: response.title || 'Meme',
            url: response.url,
            sourceUrl: 'https://want.cat',
            author: 'want.cat',
            upvotes: 0,
            nsfw: false,
            spoiler: false,
            mediaType: 'image',
            createdAt: Date.now(),
            source: 'want'
        };
    }

    private mapRedditAPIToMeme(item: any, index: number): Meme | null {
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
            subreddit: item.subreddit,
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
