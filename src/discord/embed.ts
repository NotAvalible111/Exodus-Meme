import { Meme, DiscordEmbed } from '../types';

export class DiscordFormatter {
    /**
     * Converts a Meme object to a Discord embed object
     */
    static toEmbed(meme: Meme): DiscordEmbed {
        return {
            title: this.truncate(meme.title, 256),
            url: meme.sourceUrl,
            image: {
                url: meme.url,
            },
            color: 0xff4500, // Reddit Orange
            author: {
                name: `u/${meme.author}${meme.subreddit ? ` (r/${meme.subreddit})` : ''}`,
                url: `https://reddit.com/u/${meme.author}`,
            },
            footer: {
                text: `👍 ${meme.upvotes.toLocaleString()} • Source: ${meme.source}`,
            },
            timestamp: new Date(meme.createdAt).toISOString(),
        };
    }

    /**
     * Truncate strings to fit Discord's limits
     */
    private static truncate(str: string, limit: number): string {
        return str.length > limit ? str.substring(0, limit - 3) + '...' : str;
    }
}
