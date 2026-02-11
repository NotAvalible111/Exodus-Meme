import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const DEFAULT_USER_AGENT = 'MemeForge/1.0.0 (https://github.com/PhoenixUchiha/Meme-Forge)';

export class HttpClient {
    private client: AxiosInstance;

    constructor(baseURL?: string) {
        this.client = axios.create({
            baseURL,
            headers: {
                'User-Agent': DEFAULT_USER_AGENT,
            },
            timeout: 10000,
        });
    }

    async get<T>(url: string, config?: AxiosRequestConfig, retries = 3): Promise<T> {
        try {
            const response = await this.client.get<T>(url, config);
            return response.data;
        } catch (error: any) {
            if (retries > 0 && this.isRetryable(error)) {
                await this.delay(1000 * (4 - retries));
                return this.get<T>(url, config, retries - 1);
            }
            throw this.normalizeError(error);
        }
    }

    private isRetryable(error: any): boolean {
        return error.response?.status === 429 || error.response?.status >= 500 || !error.response;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private normalizeError(error: any): Error {
        if (error.response) {
            return new Error(`Request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }
        return error;
    }
}

export const http = new HttpClient();
