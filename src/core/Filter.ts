import { Meme, MemeFilter } from '../types';
import { hasNSFWContent } from '../utils/nsfw';

export class Filter {
    static apply(memes: Meme[], filter: MemeFilter): Meme[] {
        return memes.filter((meme) => {
            if (filter.nsfw === false && (meme.nsfw || hasNSFWContent(meme))) {
                return false;
            }

            if (filter.minUpvotes && meme.upvotes < filter.minUpvotes) {
                return false;
            }

            if (filter.mediaType && filter.mediaType !== 'any' && meme.mediaType !== filter.mediaType) {
                return false;
            }

            if (filter.subreddits && filter.subreddits.length > 0 && meme.subreddit) {
                if (!filter.subreddits.map(s => s.toLowerCase()).includes(meme.subreddit.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });
    }

    static paginate(memes: Meme[], limit?: number): Meme[] {
        if (!limit || limit <= 0) return memes;
        return memes.slice(0, limit);
    }
}