export class RateLimiter {
    private lastRequestTime: Map<string, number> = new Map();
    private minInterval: number;

    constructor(requestsPerSecond = 0.5) {
        this.minInterval = 1000 / requestsPerSecond;
    }

    async throttle(key: string): Promise<void> {
        const now = Date.now();
        const lastTime = this.lastRequestTime.get(key) || 0;
        const timeSinceLastRequest = now - lastTime;

        if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime.set(key, Date.now());
    }
}

export const rateLimiter = new RateLimiter();