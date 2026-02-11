import { ISourceHandler, Meme, FetchOptions, MediaType } from '../types';
import { http } from '../utils/http';
import { rateLimiter } from '../core/RateLimiter';

const SPANISH_SUBREDDITS = ['yo_elvr', 'LatinoPeopleTwitter', 'MAAU', 'orslokx', 'DylanteroYT', 'Mujico', 'PeruMemes', 'PERU', 'espanol', 'MemesMexicanos'];
const ENGLISH_SUBREDDITS = ['memes', 'dankmemes', 'me_irl', 'wholesomememes', 'meirl', 'ProgrammerHumor', 'funny', 'meme'];

export class RedditSource implements ISourceHandler {
    name = 'reddit';
    private recentMemeIds: Set<string> = new Set();
    private maxRecentIds = 500;

    async fetch(options: FetchOptions): Promise<Meme[]> {
        let subreddits: string[];
        
        if (options.subreddits && options.subreddits.length > 0) {
            subreddits = options.subreddits;
        } else if (options.language === 'es') {
            subreddits = SPANISH_SUBREDDITS;
        } else if (options.language === 'en') {
            subreddits = ENGLISH_SUBREDDITS;
        } else {
            subreddits = [...SPANISH_SUBREDDITS, ...ENGLISH_SUBREDDITS];
        }

        const shuffledSubreddits = [...subreddits].sort(() => Math.random() - 0.5);
        const subredditsToFetch = shuffledSubreddits.slice(0, Math.min(3, shuffledSubreddits.length));

        const allMemes: Meme[] = [];

        for (const subreddit of subredditsToFetch) {
            await rateLimiter.throttle('reddit');

            const sortOptions = ['hot', 'top'];
            const sort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
            const timeParam = sort === 'top' ? '&t=day' : '';
            const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=50${timeParam}`;
            
            try {
                const data = await http.get<any>(url);

                if (data?.data?.children) {
                    const memes = data.data.children
                        .map((child: any) => this.mapToMeme(child.data))
                        .filter((meme: Meme | null) => meme !== null) as Meme[];
                    
                    allMemes.push(...memes);
                }
            } catch (error: any) {
                if (error.message?.includes('404') || error.message?.includes('banned')) {
                    //console.warn(`Subreddit r/${subreddit} no disponible, saltando...`);
                } else {
                    //console.error(`Error obteniendo de r/${subreddit}:`, error.message);
                }
            }
        }

        const newMemes: Meme[] = [];
        
        for (const meme of allMemes) {
            if (!this.recentMemeIds.has(meme.id)) {
                newMemes.push(meme);
                this.recentMemeIds.add(meme.id);
                
                if (this.recentMemeIds.size > this.maxRecentIds) {
                    const firstId = this.recentMemeIds.values().next().value;
                    if (firstId) {
                        this.recentMemeIds.delete(firstId);
                    }
                }
            }
        }

        return newMemes.sort(() => Math.random() - 0.5);
    }

    private mapToMeme(data: any): Meme | null {
        if (!data.url || data.is_self) return null;

        let finalUrl = data.url;
        let isVideo = false;

        if (data.is_video && data.media?.reddit_video?.fallback_url) {
            finalUrl = data.media.reddit_video.fallback_url;
            isVideo = true;
        }

        const mediaType = isVideo ? 'video' : this.getMediaType(finalUrl);
        if (!mediaType) return null;

        return {
            id: data.id,
            title: data.title,
            url: finalUrl,
            sourceUrl: `https://reddit.com${data.permalink}`,
            author: data.author,
            subreddit: data.subreddit,
            upvotes: data.ups,
            nsfw: data.over_18,
            spoiler: data.spoiler,
            mediaType,
            createdAt: data.created_utc * 1000,
            width: data.media?.reddit_video?.width || data.preview?.images?.[0]?.source?.width,
            height: data.media?.reddit_video?.height || data.preview?.images?.[0]?.source?.height,
            source: 'reddit',
        };
    }

    private getMediaType(url: string): MediaType | null {
        if (url.match(/\.(jpg|jpeg|png|webp)/i)) return 'image';
        if (url.match(/\.(gif|gifv)/i)) return 'gif';
        if (url.includes('v.redd.it') || url.match(/\.(mp4|webm|mov)/i)) return 'video';
        return null;
    }
}