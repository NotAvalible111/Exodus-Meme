import { FetchOptions, ISourceHandler, Meme, DiscordEmbed } from '../types';
import { fetcher } from './Fetcher';
import { RedditSource } from '../sources/reddit';
import { DiscordFormatter } from '../discord/embed';

export class MemeForge {
    constructor() {
        // Register default sources
        this.registerSource(new RedditSource());
    }

    /**
     * Register a custom meme source
     */
    registerSource(handler: ISourceHandler): void {
        fetcher.registerSource(handler);
    }

    /**
     * Fetch memes based on options
     */
    async fetch(options: FetchOptions = {}): Promise<Meme[] | DiscordEmbed[]> {
        const memes = await fetcher.fetch(options);

        if (options.format === 'discord-embed') {
            return memes.map(meme => DiscordFormatter.toEmbed(meme));
        }

        return memes;
    }

    /**
     * Helper to fetch a single random meme
     */
    async fetchOne(options: FetchOptions = {}): Promise<Meme | DiscordEmbed | null> {
        const results = await this.fetch({ ...options, limit: 1 });
        return results.length > 0 ? results[0] : null;
    }
}

export const memeForge = new MemeForge();
