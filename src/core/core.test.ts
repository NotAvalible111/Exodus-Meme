import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache } from './Cache';
import { Filter } from './Filter';
import { Meme } from '../types';

describe('Cache', () => {
    let cache: Cache;

    beforeEach(() => {
        cache = new Cache(1); // 1 second ttl
    });

    it('should set and get values', () => {
        cache.set('test', { foo: 'bar' });
        expect(cache.get('test')).toEqual({ foo: 'bar' });
    });

    it('should return null for expired values', async () => {
        cache.set('test', { foo: 'bar' }, 0.1); // 100ms
        await new Promise(r => setTimeout(r, 200));
        expect(cache.get('test')).toBeNull();
    });
});

describe('Filter', () => {
    const mockMemes: Meme[] = [
        { id: '1', title: 'Funny', url: 'img1.jpg', sourceUrl: '', author: 'a', upvotes: 1000, nsfw: false, spoiler: false, mediaType: 'image', createdAt: 0, source: 'reddit' },
        { id: '2', title: 'NSFW', url: 'img2.jpg', sourceUrl: '', author: 'b', upvotes: 500, nsfw: true, spoiler: false, mediaType: 'image', createdAt: 0, source: 'reddit' },
        { id: '3', title: 'Video', url: 'vid.mp4', sourceUrl: '', author: 'c', upvotes: 2000, nsfw: false, spoiler: false, mediaType: 'video', createdAt: 0, source: 'reddit' },
    ];

    it('should filter nsfw', () => {
        const filtered = Filter.apply(mockMemes, { nsfw: false });
        expect(filtered).toHaveLength(2);
        expect(filtered.find(m => m.nsfw)).toBeUndefined();
    });

    it('should filter by min upvotes', () => {
        const filtered = Filter.apply(mockMemes, { minUpvotes: 1500 });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('3');
    });

    it('should filter by media type', () => {
        const filtered = Filter.apply(mockMemes, { mediaType: 'video' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].mediaType).toBe('video');
    });
});
