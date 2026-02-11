export function isNSFW(title: string, contentUrl: string, tags: string[] = []): boolean {
    const nsfwKeywords = ['nsfw', 'porn', 'hentai', 'sexy', 'lewd', 'adult', 'xxx', '18+', 'nude'];
    const textToTest = `${title} ${contentUrl} ${tags.join(' ')}`.toLowerCase();

    return nsfwKeywords.some(keyword => textToTest.includes(keyword));
}

export function hasNSFWContent(meme: { title: string; url: string; nsfw: boolean; subreddit?: string }): boolean {
    if (meme.nsfw) return true;
    
    const nsfwSubreddits = ['nsfw', 'gonewild', 'rule34', 'hentai', 'porn'];
    if (meme.subreddit && nsfwSubreddits.some(sub => meme.subreddit?.toLowerCase().includes(sub))) {
        return true;
    }
    
    return isNSFW(meme.title, meme.url);
}