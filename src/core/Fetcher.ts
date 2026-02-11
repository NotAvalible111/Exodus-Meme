import { Meme, FetchOptions, ISourceHandler } from '../types';
import { Filter } from './Filter';
import { cache } from './Cache';
import { generateHash } from '../utils/hash';

export class Fetcher {
    private sources: Map<string, ISourceHandler> = new Map();

    registerSource(handler: ISourceHandler): void {
        this.sources.set(handler.name, handler);
    }

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const sourceName = options.source || 'reddit';
        const handler = this.sources.get(sourceName);

        if (!handler) {
            throw new Error(`Source handler for '${sourceName}' not found`);
        }

        const cacheKey = generateHash(`${sourceName}-${JSON.stringify(options)}`);

        if (options.cache !== false) {
            const cached = cache.get<Meme[]>(cacheKey);
            if (cached) return cached;
        }

        let memes = await handler.fetch(options);

        // Apply filters
        memes = Filter.apply(memes, options);

        // Limit results
        memes = Filter.paginate(memes, options.limit);

        if (options.cache !== false) {
            cache.set(cacheKey, memes);
        }

        return memes;
    }
}

export const fetcher = new Fetcher();
