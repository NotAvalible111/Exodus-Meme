import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export class HttpClient {
    private client: AxiosInstance;

    constructor(baseURL?: string) {
        this.client = axios.create({
            baseURL,
            timeout: 15000,
            validateStatus: (status) => status < 500
        });
    }

    async get<T>(url: string, config?: AxiosRequestConfig, retries = 3): Promise<T> {
        const headers = {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            ...config?.headers
        };

        try {
            const response = await this.client.get<T>(url, {
                ...config,
                headers
            });
            
            if (response.status === 404 || response.status === 403 || response.status === 429) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            
            return response.data;
        } catch (error: any) {
            if (retries > 0 && this.isRetryable(error)) {
                const backoffTime = (4 - retries) * 3000;
                await this.delay(backoffTime);
                return this.get<T>(url, config, retries - 1);
            }
            throw this.normalizeError(error);
        }
    }

    private isRetryable(error: any): boolean {
        return (
            error.response?.status === 429 ||
            error.response?.status === 503 ||
            error.response?.status >= 500 ||
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNREFUSED' ||
            !error.response
        );
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private normalizeError(error: any): Error {
        if (error.response) {
            return new Error(
                `Request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
            );
        }
        if (error.code) {
            return new Error(`Network error: ${error.code} - ${error.message}`);
        }
        return error;
    }
}

export const http = new HttpClient();