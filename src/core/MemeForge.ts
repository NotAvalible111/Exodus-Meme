import { FetchOptions, ISourceHandler, Meme, DiscordEmbed } from '../types';
import { fetcher } from './Fetcher';
import { MultiAPISource } from '../sources/multiapi';
import { DiscordFormatter } from '../discord/embed';

export class MemeForge {
    constructor() {
        this.registerSource(new MultiAPISource());
    }

    registerSource(handler: ISourceHandler): void {
        fetcher.registerSource(handler);
    }

    async fetch(options: FetchOptions = {}): Promise<Meme[] | DiscordEmbed[]> {
        if (!options.source) {
            options.source = 'multiapi';
        }

        const memes = await fetcher.fetch(options);

        if (options.format === 'discord-embed') {
            return memes.map(meme => DiscordFormatter.toEmbed(meme));
        }

        return memes;
    }

    async fetchOne(options: FetchOptions = {}): Promise<Meme | DiscordEmbed | null> {
        const results = await this.fetch({ ...options, limit: 1 });
        return results.length > 0 ? results[0] : null;
    }
}

export const memeForge = new MemeForge();