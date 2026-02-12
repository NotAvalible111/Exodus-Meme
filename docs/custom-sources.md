# 🔌 Guía de Fuentes Personalizadas

## Introducción

ExodusMeme incluye tres fuentes integradas por defecto:
- **MultiAPI**: Combina want.cat + Reddit APIs (fuente por defecto)
- **MemeAPI**: Usa meme-api.com con múltiples endpoints de respaldo
- **Reddit**: Acceso directo a Reddit JSON API

Esta guía te muestra cómo implementar tus propias fuentes personalizadas para expandir aún más las capacidades del motor.

---

## 🎯 Fuentes Integradas

### Usando MultiAPI (Default)

```typescript
import { memeForge } from '@abstract_/exodusmeme';

const memes = await memeForge.fetch({
    limit: 20,
    nsfw: false
});
```

### Usando MemeAPI

```typescript
const memes = await memeForge.fetch({
    source: 'memeapi',
    limit: 15,
    mediaType: 'image'
});
```

### Usando Reddit Direct

```typescript
const memes = await memeForge.fetch({
    source: 'reddit',
    subreddits: ['dankmemes', 'memes'],
    limit: 30,
    minUpvotes: 500
});
```

---

## 📋 Requisitos

### Interfaz ISourceHandler

Todas las fuentes deben implementar esta interfaz:

```typescript
interface ISourceHandler {
    name: string;
    fetch(options: FetchOptions): Promise<Meme[]>;
}
```

### Tipo Meme

Tu fuente debe retornar objetos que cumplan con esta estructura:

```typescript
interface Meme {
    id: string;              // Identificador único
    title: string;           // Título del meme
    url: string;             // URL de la imagen/video
    sourceUrl: string;       // URL del post original
    author: string;          // Creador del meme
    subreddit?: string;      // Opcional: comunidad/categoría
    upvotes: number;         // Likes/upvotes/puntos
    nsfw: boolean;           // ¿Contenido adulto?
    spoiler: boolean;        // ¿Contiene spoilers?
    mediaType: MediaType;    // 'image' | 'gif' | 'video'
    createdAt: number;       // Timestamp en milisegundos
    width?: number;          // Opcional: ancho en píxeles
    height?: number;         // Opcional: alto en píxeles
    source: string;          // Nombre de tu fuente
}
```

---

## 🚀 Ejemplo Básico: API Pública

### 1. Fuente Simple de imgflip.com

```typescript
import { ISourceHandler, Meme, FetchOptions, MediaType } from '@abstract_/exodusmeme';
import axios from 'axios';

export class ImgflipSource implements ISourceHandler {
    name = 'imgflip';

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const response = await axios.get('https://api.imgflip.com/get_memes');
        const data = response.data;

        if (!data.success || !data.data.memes) {
            return [];
        }

        return data.data.memes
            .slice(0, options.limit || 10)
            .map(meme => ({
                id: meme.id,
                title: meme.name,
                url: meme.url,
                sourceUrl: `https://imgflip.com/i/${meme.id}`,
                author: 'imgflip',
                upvotes: 0,
                nsfw: false,
                spoiler: false,
                mediaType: 'image' as MediaType,
                createdAt: Date.now(),
                width: meme.width,
                height: meme.height,
                source: 'imgflip'
            }));
    }
}
```

**Uso:**
```typescript
import { memeForge } from '@abstract_/exodusmeme';
import { ImgflipSource } from './ImgflipSource';

memeForge.registerSource(new ImgflipSource());

const memes = await memeForge.fetch({
    source: 'imgflip',
    limit: 20
});
```

---

## 💾 Ejemplo con Caché Local

### 2. Fuente con Sistema de Duplicados

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract_/exodusmeme';
import axios from 'axios';

export class CustomAPISource implements ISourceHandler {
    name = 'custom-api';
    private recentMemeIds: Set<string> = new Set();
    private maxRecentIds = 100;

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const response = await axios.get('https://mi-api.com/memes', {
            params: {
                limit: options.limit || 50,
                category: options.subreddits?.[0] || 'all'
            }
        });

        const allMemes = response.data.map(item => this.mapToMeme(item));
        const newMemes: Meme[] = [];

        for (const meme of allMemes) {
            if (!this.recentMemeIds.has(meme.id)) {
                newMemes.push(meme);
                this.recentMemeIds.add(meme.id);

                if (this.recentMemeIds.size > this.maxRecentIds) {
                    const firstId = this.recentMemeIds.values().next().value;
                    if (firstId) {
                        this.recentMemeIds.delete(firstId);
                    }
                }
            }
        }

        return newMemes;
    }

    private mapToMeme(data: any): Meme {
        return {
            id: data.id,
            title: data.title,
            url: data.imageUrl,
            sourceUrl: data.postUrl,
            author: data.creator,
            upvotes: data.likes,
            nsfw: data.isNSFW,
            spoiler: false,
            mediaType: this.detectMediaType(data.imageUrl),
            createdAt: new Date(data.timestamp).getTime(),
            source: 'custom-api'
        };
    }

    private detectMediaType(url: string): 'image' | 'gif' | 'video' {
        if (url.match(/\.gif$/i)) return 'gif';
        if (url.match(/\.(mp4|webm)$/i)) return 'video';
        return 'image';
    }
}
```

---

## 🔐 Ejemplo con Autenticación

### 3. Fuente con API Key

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract_/exodusmeme';
import axios from 'axios';

export class AuthenticatedSource implements ISourceHandler {
    name = 'auth-api';
    private apiKey: string;
    private baseURL = 'https://api.ejemplo.com/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async fetch(options: FetchOptions): Promise<Meme[]> {
        try {
            const response = await axios.get(`${this.baseURL}/memes`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    limit: options.limit,
                    minScore: options.minUpvotes,
                    nsfw: options.nsfw
                }
            });

            return response.data.items.map(item => ({
                id: item.id,
                title: item.title,
                url: item.media.url,
                sourceUrl: item.permalink,
                author: item.author.username,
                upvotes: item.score,
                nsfw: item.tags.includes('nsfw'),
                spoiler: item.tags.includes('spoiler'),
                mediaType: item.media.type,
                createdAt: new Date(item.createdAt).getTime(),
                source: this.name
            }));
        } catch (error) {
            console.error('Error fetching from authenticated API:', error);
            return [];
        }
    }
}
```

**Uso:**
```typescript
const source = new AuthenticatedSource(process.env.API_KEY!);
memeForge.registerSource(source);
```

---

## 🌐 Ejemplo Avanzado: Scraping Web

### 4. Fuente con Web Scraping

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract_/exodusmeme';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperSource implements ISourceHandler {
    name = 'scraper';

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const url = 'https://ejemplo.com/memes';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const memes: Meme[] = [];

        $('.meme-card').each((index, element) => {
            const $el = $(element);
            
            const meme: Meme = {
                id: $el.attr('data-id') || `meme-${index}`,
                title: $el.find('.title').text().trim(),
                url: $el.find('img').attr('src') || '',
                sourceUrl: `https://ejemplo.com/meme/${$el.attr('data-id')}`,
                author: $el.find('.author').text().trim(),
                upvotes: parseInt($el.find('.upvotes').text()) || 0,
                nsfw: $el.hasClass('nsfw'),
                spoiler: false,
                mediaType: 'image',
                createdAt: Date.now(),
                source: this.name
            };

            memes.push(meme);
        });

        return memes.slice(0, options.limit || 10);
    }
}
```

---

## 🔄 Ejemplo con Rate Limiting

### 5. Fuente con Control de Tasa

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract_/exodusmeme';
import { RateLimiter } from '@abstract_/exodusmeme';
import axios from 'axios';

export class RateLimitedSource implements ISourceHandler {
    name = 'rate-limited';
    private rateLimiter: RateLimiter;

    constructor() {
        this.rateLimiter = new RateLimiter(1);
    }

    async fetch(options: FetchOptions): Promise<Meme[]> {
        await this.rateLimiter.throttle(this.name);

        const response = await axios.get('https://api.ejemplo.com/memes', {
            params: { limit: options.limit }
        });

        return response.data.map(item => ({
            id: item.id,
            title: item.title,
            url: item.url,
            sourceUrl: item.link,
            author: item.user,
            upvotes: item.score,
            nsfw: false,
            spoiler: false,
            mediaType: 'image',
            createdAt: Date.now(),
            source: this.name
        }));
    }
}
```

---

## 🎨 Ejemplo Multi-Plataforma

### 6. Fuente Agregadora

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract_/exodusmeme';
import axios from 'axios';

export class AggregatorSource implements ISourceHandler {
    name = 'aggregator';

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const platforms = ['platform1', 'platform2', 'platform3'];
        const allMemes: Meme[] = [];

        for (const platform of platforms) {
            try {
                const memes = await this.fetchFromPlatform(platform, options);
                allMemes.push(...memes);
            } catch (error) {
                console.warn(`Failed to fetch from ${platform}:`, error);
            }
        }

        return allMemes
            .sort((a, b) => b.upvotes - a.upvotes)
            .slice(0, options.limit || 20);
    }

    private async fetchFromPlatform(platform: string, options: FetchOptions): Promise<Meme[]> {
        const response = await axios.get(`https://${platform}.com/api/memes`);
        
        return response.data.map((item: any) => ({
            id: `${platform}-${item.id}`,
            title: item.title,
            url: item.imageUrl,
            sourceUrl: item.url,
            author: item.author,
            upvotes: item.likes,
            nsfw: item.nsfw || false,
            spoiler: false,
            mediaType: 'image',
            createdAt: new Date(item.date).getTime(),
            source: platform
        }));
    }
}
```

---

## 🌟 Ejemplo Inspirado en MultiAPI

### 7. Fuente Agregadora Avanzada

Inspirado en cómo MultiAPI combina múltiples fuentes:

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract_/exodusmeme';
import { rateLimiter } from '@abstract_/exodusmeme';
import axios from 'axios';

export class AdvancedMultiSource implements ISourceHandler {
    name = 'advanced-multi';
    private recentMemeIds: Set<string> = new Set();
    private maxRecentIds = 200;
    private memeCache: Meme[] = [];
    private lastFetchTime = 0;
    private cacheDuration = 300000;

    async fetch(options: FetchOptions): Promise<Meme[]> {
        const now = Date.now();
        
        if (this.memeCache.length > 10 && 
            now - this.lastFetchTime < this.cacheDuration) {
            const cached = [...this.memeCache].sort(() => Math.random() - 0.5);
            return cached.slice(0, options.limit || 20);
        }

        await rateLimiter.throttle(this.name);

        const sources = [
            { 
                fetch: () => this.fetchFromAPI1(),
                name: 'api1'
            },
            { 
                fetch: () => this.fetchFromAPI2(),
                name: 'api2'
            },
            { 
                fetch: () => this.fetchFromAPI3(),
                name: 'api3'
            }
        ];

        const allMemes: Meme[] = [];

        for (const source of sources) {
            try {
                const memes = await source.fetch();
                allMemes.push(...memes);
            } catch (error) {
                console.error(`Error fetching from ${source.name}:`, error);
                continue;
            }
        }

        if (allMemes.length > 0) {
            this.memeCache = allMemes;
            this.lastFetchTime = now;
            
            const uniqueMemes: Meme[] = [];
            for (const meme of allMemes) {
                if (!this.recentMemeIds.has(meme.id)) {
                    uniqueMemes.push(meme);
                    this.recentMemeIds.add(meme.id);

                    if (this.recentMemeIds.size > this.maxRecentIds) {
                        const firstId = this.recentMemeIds.values().next().value;
                        if (firstId) this.recentMemeIds.delete(firstId);
                    }
                }
            }

            return uniqueMemes.sort(() => Math.random() - 0.5);
        }

        if (this.memeCache.length > 0) {
            return [...this.memeCache]
                .sort(() => Math.random() - 0.5)
                .slice(0, options.limit || 20);
        }

        return [];
    }

    private async fetchFromAPI1(): Promise<Meme[]> {
        const response = await axios.get('https://api1.com/memes');
        return response.data.map(this.mapToMeme);
    }

    private async fetchFromAPI2(): Promise<Meme[]> {
        const response = await axios.get('https://api2.com/memes');
        return response.data.map(this.mapToMeme);
    }

    private async fetchFromAPI3(): Promise<Meme[]> {
        const response = await axios.get('https://api3.com/memes');
        return response.data.map(this.mapToMeme);
    }

    private mapToMeme(data: any): Meme {
        return {
            id: data.id || `meme_${Date.now()}_${Math.random()}`,
            title: data.title || 'Meme',
            url: data.url,
            sourceUrl: data.link || data.url,
            author: data.author || 'unknown',
            upvotes: data.score || 0,
            nsfw: data.nsfw || false,
            spoiler: false,
            mediaType: this.detectMediaType(data.url),
            createdAt: Date.now(),
            source: this.name
        };
    }

    private detectMediaType(url: string): 'image' | 'gif' | 'video' {
        if (url.match(/\.gif$/i)) return 'gif';
        if (url.match(/\.(mp4|webm)$/i)) return 'video';
        return 'image';
    }
}
```

**Características clave:**
- ✅ Caché interno de 5 minutos
- ✅ Anti-duplicados con Set de 200 IDs
- ✅ Múltiples fuentes con fallback automático
- ✅ Randomización en cada retorno del caché
- ✅ Manejo robusto de errores
- ✅ Rate limiting integrado

---

## 🛠️ Utilidades Comunes

### Detección de Tipo de Media

```typescript
function detectMediaType(url: string): 'image' | 'gif' | 'video' | null {
    if (url.match(/\.(jpg|jpeg|png|webp)$/i)) return 'image';
    if (url.match(/\.gif$/i)) return 'gif';
    if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
    return null;
}
```

### Detección NSFW Simple

```typescript
function isNSFW(title: string, tags: string[]): boolean {
    const nsfwKeywords = ['nsfw', 'adult', '18+', 'porn'];
    const text = `${title} ${tags.join(' ')}`.toLowerCase();
    return nsfwKeywords.some(keyword => text.includes(keyword));
}
```

### Manejo de Errores HTTP

```typescript
async function safeFetch(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error: any) {
            if (i === retries - 1) throw error;
            if (error.response?.status === 429) {
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            }
        }
    }
}
```

---

## 📝 Mejores Prácticas

### 1. Manejo de Errores

```typescript
async fetch(options: FetchOptions): Promise<Meme[]> {
    try {
        const response = await axios.get(url);
        return this.parseMemes(response.data);
    } catch (error) {
        console.error(`Error in ${this.name}:`, error);
        return [];
    }
}
```

### 2. Validación de Datos

```typescript
private isValidMeme(data: any): boolean {
    return !!(
        data.id &&
        data.title &&
        data.url &&
        typeof data.upvotes === 'number'
    );
}
```

### 3. Normalización de URLs

```typescript
private normalizeURL(url: string): string {
    if (!url.startsWith('http')) {
        return `https://ejemplo.com${url}`;
    }
    return url;
}
```

### 4. Timeout en Peticiones

```typescript
const response = await axios.get(url, {
    timeout: 10000
});
```

### 5. Headers Apropiados

```typescript
const headers = {
    'User-Agent': 'ExodusMeme/1.0.0',
    'Accept': 'application/json',
    'Accept-Language': options.language === 'es' ? 'es-ES' : 'en-US'
};
```

---

## 🧪 Testing de tu Fuente

### Ejemplo de Test

```typescript
import { describe, it, expect } from 'vitest';
import { MyCustomSource } from './MyCustomSource';

describe('MyCustomSource', () => {
    it('should fetch memes successfully', async () => {
        const source = new MyCustomSource();
        const memes = await source.fetch({ limit: 10 });
        
        expect(memes).toHaveLength(10);
        expect(memes[0]).toHaveProperty('id');
        expect(memes[0]).toHaveProperty('url');
    });

    it('should handle errors gracefully', async () => {
        const source = new MyCustomSource();
        const memes = await source.fetch({ limit: 0 });
        
        expect(memes).toEqual([]);
    });
});
```

---

## 🎯 Checklist Pre-Publicación

- [ ] Implementa `ISourceHandler` correctamente
- [ ] Retorna objetos `Meme` válidos
- [ ] Maneja errores apropiadamente (try-catch en cada fuente)
- [ ] Respeta rate limits de la API
- [ ] Implementa caché interno para reducir llamadas
- [ ] Incluye documentación de uso
- [ ] Valida datos de entrada
- [ ] Normaliza URLs
- [ ] Detecta tipo de media correctamente
- [ ] Implementa anti-duplicados con Set
- [ ] Filtra NSFW si es apropiado
- [ ] Randomiza resultados del caché
- [ ] Define duración de caché apropiada
- [ ] Implementa fallback para cuando la API falla
- [ ] Escribe tests básicos
- [ ] Verifica que IDs sean únicos

---

## 📚 Recursos

- [Documentación de axios](https://axios-http.com/)
- [Cheerio para scraping](https://cheerio.js.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [API de Reddit](https://www.reddit.com/dev/api/)

---

## 💡 Ideas de Fuentes

### APIs Públicas
1. **9GAG**: Scraping de 9gag.com
2. **Imgur**: API de Imgur
3. **Giphy**: API de GIPHY para GIFs
4. **Tenor**: API de Tenor para GIFs
5. **Know Your Meme**: Base de datos de memes
6. **Meme Generator**: API de imgflip.com

### Redes Sociales
7. **Twitter/X**: API de Twitter/X para tweets de memes
8. **TikTok**: Scraping de memes de TikTok
9. **Instagram**: Scraping de cuentas de memes
10. **Pinterest**: API de Pinterest para pins de memes

### Fuentes Locales
11. **Local Filesystem**: Sistema de archivos local
12. **Database**: PostgreSQL/MongoDB con tus propios memes
13. **S3 Bucket**: AWS S3 o compatible
14. **Google Drive**: API de Google Drive

### Agregadores
15. **Multi-Platform**: Combinación de múltiples fuentes como MultiAPI
16. **Reddit Enhanced**: Reddit con más subreddits y mejor filtrado
17. **Meme API Hub**: Combina meme-api, imgflip, y otras APIs públicas

---

## 🤝 Contribuir

Si creas una fuente útil, ¡considera contribuirla al proyecto principal!

1. Fork el repositorio
2. Crea tu fuente en `src/sources/`
3. Agrega tests
4. Actualiza documentación
5. Abre un Pull Request

---

**Autor:** Abstract  
**Última actualización:** 2026