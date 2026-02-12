# 🏗️ Arquitectura de ExodusMeme

## Visión General

ExodusMeme está diseñado con una arquitectura modular y extensible que separa las responsabilidades en capas distintas.

```
┌─────────────────────────────────────────────────────────┐
│                    Usuario / Bot                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   MemeForge (API)                        │
│  - Punto de entrada principal                           │
│  - Registro de fuentes                                  │
│  - Formateo de salida                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Fetcher                               │
│  - Orquestación de peticiones                           │
│  - Gestión de caché                                     │
│  - Selección de fuentes                                 │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │MultiAPI │  │ MemeAPI │  │ Reddit  │  │ Custom  │
   │(Default)│  │ Source  │  │ Source  │  │ Source  │
   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │            │
        └────────────┼────────────┼────────────┘
                     │            │
                     ▼            ▼
        ┌────────────────────────┐
        │   RateLimiter          │
        │   - Throttling         │
        │   - Control de tasa    │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │   HTTP Client          │
        │   - Reintentos         │
        │   - User-Agent rotativo│
        │   - Manejo de errores  │
        └────────┬───────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│want.cat  │ │Reddit    │ │meme-api  │
│   API    │ │JSON API  │ │   .com   │
└──────────┘ └──────────┘ └──────────┘
```

---

## 🔍 Componentes Principales

### 1. MemeForge (Orquestador)

**Ubicación:** `src/core/MemeForge.ts`

**Responsabilidades:**
- Punto de entrada principal de la API
- Registro de fuentes personalizadas
- Formateo de resultados
- Inicialización del sistema

**Métodos:**
```typescript
class MemeForge {
    registerSource(handler: ISourceHandler): void
    fetch(options: FetchOptions): Promise<Meme[] | DiscordEmbed[]>
    fetchOne(options: FetchOptions): Promise<Meme | DiscordEmbed | null>
}
```

**Flujo:**
```
Usuario → memeForge.fetch()
    ↓
Validar opciones
    ↓
Llamar a Fetcher
    ↓
¿Formato Discord?
    ↓ Sí          ↓ No
Formatear      Retornar
    ↓              ↓
Retornar ←────────┘
```

---

### 2. Fetcher (Motor de Obtención)

**Ubicación:** `src/core/Fetcher.ts`

**Responsabilidades:**
- Selección de fuente apropiada
- Gestión de caché
- Aplicación de filtros
- Paginación de resultados

**Flujo detallado:**
```
fetch(options)
    ↓
1. Determinar fuente (default: reddit)
    ↓
2. Generar clave de caché
    ↓
3. ¿Caché habilitado y datos válidos?
    ├─ Sí → Retornar de caché
    └─ No → Continuar
    ↓
4. Llamar handler.fetch()
    ↓
5. Aplicar filtros (Filter.apply)
    ↓
6. Paginar (Filter.paginate)
    ↓
7. Guardar en caché
    ↓
8. Retornar resultado
```

**Optimizaciones:**
- Caché por combinación única de opciones
- Hash SHA-256 para claves de caché
- TTL configurable

---

### 3. MultiAPISource (Fuente Multi-API)

**Ubicación:** `src/sources/multiapi.ts`

**Responsabilidades:**
- Agregación de múltiples fuentes de memes
- Obtención de memes de want.cat API
- Obtención de memes de Reddit vía meme-api.com
- Detección de duplicados (150 IDs)
- Caché inteligente con duración de 3 minutos
- Mapeo de datos de diferentes APIs a formato Meme

**Características principales:**

```typescript
class MultiAPISource {
    private recentMemeIds: Set<string> = new Set()
    private maxRecentIds = 150
    private memeCache: Meme[] = []
    private lastFetchTime = 0
    private cacheDuration = 180000
    
    async fetch(options: FetchOptions): Promise<Meme[]>
}
```

**APIs integradas:**

1. **want.cat API**: 20 llamadas individuales para máxima variedad
2. **Reddit API (MAAU)**: 20 memes del subreddit MAAU
3. **Reddit API (yo_elvr)**: 20 memes del subreddit yo_elvr
4. **Reddit API (LatinoPeopleTwitter)**: 20 memes del subreddit LatinoPeopleTwitter

**Algoritmo de obtención:**

```
1. Verificar caché
   ├─ ¿Caché válido (< 3 min) y > 10 memes? → Retornar aleatorio
   └─ No → Continuar
   
2. Throttle (RateLimiter)
   ↓
3. Para each API:
   ├─ want.cat: Loop 20 veces con delay 200ms
   ├─ Reddit MAAU: Obtener 20 memes
   ├─ Reddit yo_elvr: Obtener 20 memes
   └─ Reddit LatinoPeopleTwitter: Obtener 20 memes
   ↓
4. Combinar todos los memes (~80 total)
   ↓
5. Filtrar duplicados (recentMemeIds)
   ↓
6. Actualizar caché
   ↓
7. Randomizar orden
   ↓
8. Retornar memes únicos
```

**Sistema Anti-Duplicados:**

```typescript
const recentMemeIds = new Set<string>()

for (const meme of allMemes) {
    if (!this.recentMemeIds.has(meme.id)) {
        uniqueMemes.push(meme)
        this.recentMemeIds.add(meme.id)
        
        if (this.recentMemeIds.size > 150) {
            const firstId = this.recentMemeIds.values().next().value
            if (firstId) this.recentMemeIds.delete(firstId)
        }
    }
}
```

**Caché inteligente:**

```typescript
if (this.memeCache.length > 10 && 
    now - this.lastFetchTime < this.cacheDuration) {
    const cached = [...this.memeCache].sort(() => Math.random() - 0.5)
    return cached.slice(0, options.limit || 20)
}
```

---

### 4. MemeAPISource (Fuente MemeAPI)

**Ubicación:** `src/sources/memeapi.ts`

**Responsabilidades:**
- Obtención de memes desde meme-api.com
- Múltiples endpoints de respaldo
- Detección de duplicados (200 IDs)
- Caché con duración de 5 minutos
- Filtrado automático de NSFW y videos

**Características principales:**

```typescript
class MemeAPISource {
    private recentMemeIds: Set<string> = new Set()
    private maxRecentIds = 200
    private memeCache: Meme[] = []
    private lastFetchTime = 0
    private cacheDuration = 300000
    
    async fetch(options: FetchOptions): Promise<Meme[]>
}
```

**Endpoints de respaldo:**

```typescript
const apis = [
    'https://meme-api.com/gimme/50',
    'https://meme-api.com/gimme/memes/50',
    'https://meme-api.com/gimme/dankmemes/50'
]
```

**Algoritmo de obtención:**

```
1. Verificar caché
   ├─ ¿Caché válido (< 5 min) y > 10 memes? → Retornar aleatorio
   └─ No → Continuar
   
2. Throttle (RateLimiter)
   ↓
3. Intentar cada API en orden:
   ├─ /gimme/50 (general)
   ├─ /gimme/memes/50 (r/memes)
   └─ /gimme/dankmemes/50 (r/dankmemes)
   ↓
4. Si una API funciona → Usar esos memes
   ↓
5. Filtrar NSFW y videos automáticamente
   ↓
6. Mapear a formato Meme
   ↓
7. Filtrar duplicados
   ↓
8. Actualizar caché
   ↓
9. Randomizar y retornar
```

**Filtrado automático:**

```typescript
private mapToMeme(item: MemeAPIResponse, index: number): Meme | null {
    if (!item.url || item.nsfw) {
        return null;
    }

    const mediaType = this.getMediaType(item.url);
    if (!mediaType || mediaType === 'video') {
        return null;
    }
    
}
```

---

### 5. RedditSource (Fuente de Reddit)

**Ubicación:** `src/sources/reddit.ts`

**Responsabilidades:**
- Obtención de memes de Reddit
- Detección de duplicados (500 IDs)
- Selección inteligente de subreddits
- Mapeo de datos de Reddit a formato Meme

**Características principales:**

```typescript
class RedditSource {
    private recentMemeIds: Set<string> = new Set()
    private maxRecentIds = 500
    
    async fetch(options: FetchOptions): Promise<Meme[]>
}
```

**Algoritmo de obtención:**

```
1. Determinar subreddits
   ├─ ¿Especificados? → Usar especificados
   ├─ ¿Idioma ES? → Usar SPANISH_SUBREDDITS
   ├─ ¿Idioma EN? → Usar ENGLISH_SUBREDDITS
   └─ Default → Mezclar ambos

2. Seleccionar 3 subreddits aleatorios
   ↓
3. Para cada subreddit:
   ├─ Throttle (RateLimiter)
   ├─ Elegir aleatoriamente: 'hot' o 'top'
   ├─ Si es 'top' → Agregar &t=day
   ├─ Hacer petición HTTP
   ├─ Mapear respuesta a Meme[]
   └─ Manejar errores (skip si falla)
   ↓
4. Combinar todos los memes
   ↓
5. Filtrar duplicados (recentMemeIds)
   ↓
6. Agregar nuevos IDs al Set
   ↓
7. Limpiar Set si > 500 IDs
   ↓
8. Randomizar orden
   ↓
9. Retornar
```

**Sistema Anti-Duplicados:**

```typescript
const recentMemeIds = new Set<string>()

for (const meme of allMemes) {
    if (!this.recentMemeIds.has(meme.id)) {
        newMemes.push(meme)
        this.recentMemeIds.add(meme.id)
        
        if (this.recentMemeIds.size > 500) {
            const firstId = this.recentMemeIds.values().next().value
            this.recentMemeIds.delete(firstId)
        }
    }
}
```

**Manejo de errores:**
```typescript
try {
    const data = await http.get(url)
} catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('banned')) {
        console.warn(`Subreddit r/${subreddit} no disponible, saltando...`)
    } else {
        console.error(`Error obteniendo de r/${subreddit}:`, error.message)
    }
}
```

---

### 4. Filter (Sistema de Filtrado)

**Ubicación:** `src/core/Filter.ts`

**Responsabilidades:**
- Filtrado por NSFW
- Filtrado por upvotes
- Filtrado por tipo de media
- Filtrado por subreddits
- Paginación

**Lógica de filtrado:**

```typescript
static apply(memes: Meme[], filter: MemeFilter): Meme[] {
    return memes.filter((meme) => {
        if (filter.nsfw === false && (meme.nsfw || hasNSFWContent(meme))) {
            return false
        }

        if (filter.minUpvotes && meme.upvotes < filter.minUpvotes) {
            return false
        }

        if (filter.mediaType && filter.mediaType !== 'any' && meme.mediaType !== filter.mediaType) {
            return false
        }

        if (filter.subreddits && filter.subreddits.length > 0 && meme.subreddit) {
            if (!filter.subreddits.map(s => s.toLowerCase()).includes(meme.subreddit.toLowerCase())) {
                return false
            }
        }

        return true
    })
}
```

---

### 5. Cache (Sistema de Caché)

**Ubicación:** `src/core/Cache.ts`

**Estructura:**
```typescript
interface CacheEntry<T> {
    data: T
    expiry: number
}

class Cache {
    private store: Map<string, CacheEntry<any>>
    private defaultTTL: number
    
    set<T>(key: string, data: T, ttlSeconds?: number): void
    get<T>(key: string): T | null
    delete(key: string): void
    clear(): void
    prune(): void
}
```

**Funcionamiento:**
```
set(key, data, ttl)
    ↓
Calcular expiry = now + ttl
    ↓
store.set(key, { data, expiry })

get(key)
    ↓
entry = store.get(key)
    ↓
¿Existe entry?
    ├─ No → return null
    └─ Sí → ¿now > expiry?
        ├─ Sí → delete(key) → return null
        └─ No → return entry.data
```

**Limpieza automática:**
```typescript
prune(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiry) {
            this.store.delete(key)
        }
    }
}
```

---

### 6. RateLimiter (Control de Tasa)

**Ubicación:** `src/core/RateLimiter.ts`

**Propósito:** Evitar ban de Reddit limitando peticiones

**Implementación:**
```typescript
class RateLimiter {
    private lastRequestTime: Map<string, number>
    private minInterval: number
    
    constructor(requestsPerSecond = 2) {
        this.minInterval = 1000 / requestsPerSecond
    }
    
    async throttle(key: string): Promise<void> {
        const now = Date.now()
        const lastTime = this.lastRequestTime.get(key) || 0
        const timeSinceLastRequest = now - lastTime
        
        if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest
            await new Promise((resolve) => setTimeout(resolve, waitTime))
        }
        
        this.lastRequestTime.set(key, Date.now())
    }
}
```

**Configuración:**
- Default: 2 peticiones por segundo
- Intervalo mínimo: 500ms
- Por clave (permite múltiples fuentes)

---

### 7. HttpClient (Cliente HTTP)

**Ubicación:** `src/utils/http.ts`

**Características:**
- User-Agent personalizado
- Reintentos automáticos (3 intentos)
- Timeout de 10 segundos
- Manejo de errores normalizado

**Lógica de reintentos:**
```typescript
async get<T>(url: string, config?: AxiosRequestConfig, retries = 3): Promise<T> {
    try {
        const response = await this.client.get<T>(url, config)
        return response.data
    } catch (error: any) {
        if (retries > 0 && this.isRetryable(error)) {
            await this.delay(1000 * (4 - retries))
            return this.get<T>(url, config, retries - 1)
        }
        throw this.normalizeError(error)
    }
}

private isRetryable(error: any): boolean {
    return error.response?.status === 429 || 
           error.response?.status >= 500 || 
           !error.response
}
```

**Delays:**
- Intento 1 → 0ms
- Intento 2 → 1000ms (1s)
- Intento 3 → 2000ms (2s)
- Intento 4 → 3000ms (3s)

---

## 🔄 Flujo de Datos Completo

### Ejemplo: Usuario solicita un meme con MultiAPI

```
1. Bot recibe comando /meme
    ↓
2. Llama memeForge.fetch({
    limit: 10,
    minUpvotes: 0,
    mediaType: 'image',
    nsfw: false
})
    ↓
3. MemeForge → Fetcher.fetch()
    ↓
4. Fetcher genera cacheKey = hash('multiapi-{"limit":10,...}')
    ↓
5. cache.get(cacheKey) → null (primera vez)
    ↓
6. Fetcher obtiene handler 'multiapi' (default)
    ↓
7. MultiAPISource.fetch({...})
    ↓
8. Verificar caché interno de MultiAPI
    ├─ ¿Caché válido? → No (primera vez)
    └─ Continuar
    ↓
9. RateLimiter.throttle('multiapi')
    ↓
10. Obtener de want.cat:
    a. Loop 20 veces
    b. Para cada iteración:
       - Llamar https://api.want.cat/api/memes
       - Mapear respuesta a Meme
       - Delay 200ms
    c. ~20 memes obtenidos
    ↓
11. Obtener de Reddit MAAU:
    a. Llamar https://meme-api.com/gimme/MAAU/20
    b. Mapear 20 posts a Meme[]
    c. Filtrar NSFW y videos
    d. ~15 memes válidos
    ↓
12. Obtener de Reddit yo_elvr:
    a. Llamar https://meme-api.com/gimme/yo_elvr/20
    b. Mapear 20 posts a Meme[]
    c. Filtrar NSFW y videos
    d. ~18 memes válidos
    ↓
13. Obtener de Reddit LatinoPeopleTwitter:
    a. Llamar https://meme-api.com/gimme/LatinoPeopleTwitter/20
    b. Mapear 20 posts a Meme[]
    c. Filtrar NSFW y videos
    d. ~16 memes válidos
    ↓
14. allMemes = 69 memes total (20+15+18+16)
    ↓
15. Filtrar duplicados:
    - recentMemeIds = Set(50 IDs previos)
    - Filtrar memes ya en Set
    - uniqueMemes = 65 memes (4 eran duplicados)
    - Agregar nuevos 65 IDs al Set
    - Set ahora tiene 115 IDs
    ↓
16. Actualizar caché interno:
    - memeCache = uniqueMemes
    - lastFetchTime = now
    ↓
17. Randomizar orden
    ↓
18. Retornar a Fetcher
    ↓
19. Filter.apply(memes, {nsfw: false, mediaType: 'image'})
    - Ya filtrado en MultiAPI
    - Resultado: 65 memes
    ↓
20. Filter.paginate(memes, 10)
    - Tomar primeros 10
    - Resultado: 10 memes
    ↓
21. Guardar en caché global del Fetcher
    ↓
22. MemeForge recibe 10 memes
    ↓
23. format !== 'discord-embed'
    - Retornar memes directamente
    ↓
24. Bot recibe 10 Meme[]
    ↓
25. Bot selecciona meme aleatorio
    ↓
26. Bot envía meme al usuario
    ↓
27. [Segunda llamada 2 minutos después]
    ↓
28. MultiAPI retorna de caché interno
    - Caché válido (< 3 min)
    - Randomiza orden
    - Retorna diferentes 10 memes del caché
```

---

## 🎯 Decisiones de Diseño

### ¿Por qué MultiAPI como default?

**Problema:** Una sola fuente puede fallar o tener contenido limitado
**Solución:** Combinar múltiples fuentes = ~80 memes por fetch

**Ventajas:**
- Mayor variedad de contenido
- Resiliencia ante fallos (si want.cat falla, hay 3 fuentes más)
- Menos repeticiones
- Contenido en español e inglés

### ¿Por qué múltiples niveles de caché?

**Capa 1 - Caché del Source (3-5 min):**
- Cada source mantiene su propio caché
- Evita llamadas repetidas a las APIs
- Randomiza el orden en cada retorno

**Capa 2 - Caché del Fetcher (1 hora):**
- Caché global basado en opciones
- Útil para consultas idénticas
- Puede ser deshabilitado con `cache: false`

**Ventajas:**
- Memes frescos pero eficiente
- Reduce carga en APIs externas
- Balance entre variedad y performance

### ¿Por qué Set en lugar de Array?

**recentMemeIds** usa `Set<string>`:
- O(1) para verificar duplicados
- O(1) para agregar
- O(1) para eliminar

Con Array sería O(n) para búsquedas.

### ¿Por qué diferentes tamaños de Sets?

Cada fuente tiene diferente tamaño de Set anti-duplicados:

1. **MultiAPI (150 IDs):** Balance entre memoria y variedad
2. **MemeAPI (200 IDs):** Más IDs porque tiene menos variedad
3. **RedditSource (300 IDs):** Máximo porque es la fuente más grande

**Total posible:** ~650 IDs únicos rastreados

### ¿Por qué filtrado en la fuente?

MultiAPI y MemeAPI filtran NSFW y videos antes de retornar:

**Ventajas:**
- Reduce cantidad de datos procesados
- Filtro más temprano = más eficiente
- Menos lógica en Filter.apply()

**Desventaja:**
- Menos flexible para usuarios que quieren NSFW

### ¿Por qué randomización en múltiples niveles?

1. **Nivel Source:** Randomiza antes de retornar
2. **Nivel Fetcher:** Puede randomizar después de filtrar
3. **Nivel Bot:** Usuario puede randomizar al seleccionar

**Resultado:** Máxima variedad, baja repetición

---

## 📊 Métricas de Rendimiento

### Memoria

```
Cache vacío: ~1MB
Cache con 100 entradas: ~5MB
MultiAPI recentMemeIds (150 IDs): ~20KB
MemeAPI recentMemeIds (200 IDs): ~25KB
RedditSource recentMemeIds (300 IDs): ~40KB
Total Sets: ~85KB
```

### Tiempo de Respuesta

```
MultiAPI (caché hit): ~5ms
MultiAPI (caché miss): ~8-12s (20 llamadas a want.cat + 3 Reddit)
MemeAPI (caché hit): ~5ms
MemeAPI (caché miss): ~3-5s (1-3 llamadas a meme-api)
RedditSource (caché miss): ~2-3s (llamadas directas a Reddit)
```

### Rate Limiting

```
MultiAPI:
  - want.cat: 20 llamadas con 200ms delay = ~4s
  - Reddit APIs: 3 llamadas paralelas = ~1s
  - Total: ~5-8s primera vez

MemeAPI:
  - Peticiones/segundo: 0.5
  - Delay entre llamadas: 2s
  - Fallback automático entre 3 endpoints

RedditSource:
  - Peticiones/segundo: 2
  - Delay mínimo: 500ms
```

### Caché

```
MultiAPI: 3 minutos (180s)
MemeAPI: 5 minutos (300s)
RedditSource: 2 minutos (120s)
Fetcher global: 1 hora (3600s)
```

---

## 🔧 Extensibilidad

### Agregar nueva fuente

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract_/exodusmeme'

class TwitterSource implements ISourceHandler {
    name = 'twitter'
    
    async fetch(options: FetchOptions): Promise<Meme[]> {
        // Implementación
    }
}

memeForge.registerSource(new TwitterSource())
```

### Agregar nuevo filtro

Editar `src/core/Filter.ts`:

```typescript
if (filter.customFilter && !customCheck(meme)) {
    return false
}
```

### Agregar nueva fuente de caché

Extender `Cache.ts` para usar Redis, MongoDB, etc.

---

## 🚀 Optimizaciones Futuras

1. **Caché distribuido** (Redis) para compartir entre instancias
2. **Más fuentes integradas**: 9GAG, Imgur, Giphy
3. **Prefetching** (obtener siguiente lote en background)
4. **ML para detección NSFW** mejorada con TensorFlow
5. **Webhooks** para notificaciones de nuevos memes
6. **GraphQL API** como alternativa a REST
7. **Priorización inteligente** basada en engagement
8. **CDN integration** para servir imágenes más rápido
9. **Streaming API** para memes en tiempo real
10. **Analytics dashboard** para monitorear fuentes

---

**Autor:** Abstract  
**Última actualización:** 2026