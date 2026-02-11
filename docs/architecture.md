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
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Source  │  │ Source  │  │ Source  │
   │ Reddit  │  │ Custom1 │  │ Custom2 │
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼
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
        │   - Manejo de errores  │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │   Reddit API           │
        └────────────────────────┘
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

### 3. RedditSource (Fuente de Reddit)

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

### Ejemplo: Usuario solicita un meme

```
1. Bot recibe comando /meme
    ↓
2. Llama memeForge.fetch({
    limit: 100,
    minUpvotes: 300,
    mediaType: 'image',
    language: 'es',
    cache: false
})
    ↓
3. MemeForge → Fetcher.fetch()
    ↓
4. Fetcher genera cacheKey = sha256('reddit-{"limit":100,...}')
    ↓
5. cache.get(cacheKey) → null (cache: false)
    ↓
6. Fetcher obtiene handler 'reddit'
    ↓
7. RedditSource.fetch({...})
    ↓
8. Determinar subreddits → SPANISH_SUBREDDITS
    ↓
9. Shuffle subreddits → ['MAAU', 'yo_elvr', 'Mujico', ...]
    ↓
10. Seleccionar 3 → ['yo_elvr', 'MAAU', 'orslokx']
    ↓
11. Para 'yo_elvr':
    a. RateLimiter.throttle('reddit')
    b. sort = 'hot' (random)
    c. url = 'https://reddit.com/r/yo_elvr/hot.json?limit=50'
    d. http.get(url)
    e. Mapear 50 posts a Meme[]
    f. Agregar a allMemes
    ↓
12. Para 'MAAU':
    a. RateLimiter.throttle('reddit') → wait 500ms
    b. sort = 'top' (random)
    c. url = 'https://reddit.com/r/MAAU/top.json?limit=50&t=day'
    d. http.get(url)
    e. Mapear 50 posts a Meme[]
    f. Agregar a allMemes
    ↓
13. Para 'orslokx':
    a. RateLimiter.throttle('reddit') → wait 500ms
    b. sort = 'hot' (random)
    c. url = 'https://reddit.com/r/orslokx/hot.json?limit=50'
    d. http.get(url) → ERROR 404 banned
    e. console.warn('Subreddit r/orslokx no disponible')
    f. Continuar sin error
    ↓
14. allMemes = 100 memes (50 + 50)
    ↓
15. Filtrar duplicados:
    - recentMemeIds = Set(250 IDs)
    - Filtrar memes ya en Set
    - newMemes = 85 memes (15 eran duplicados)
    - Agregar nuevos 85 IDs al Set
    - Set ahora tiene 335 IDs
    ↓
16. Randomizar orden
    ↓
17. Retornar a Fetcher
    ↓
18. Filter.apply(memes, {minUpvotes: 300, mediaType: 'image'})
    - Filtrar memes con < 300 upvotes
    - Filtrar memes que no sean 'image'
    - Resultado: 60 memes
    ↓
19. Filter.paginate(memes, 100)
    - limit es 100, tenemos 60
    - Retornar 60 memes
    ↓
20. MemeForge recibe 60 memes
    ↓
21. format !== 'discord-embed'
    - Retornar memes directamente
    ↓
22. Bot recibe 60 Meme[]
    ↓
23. Bot selecciona meme aleatorio
    ↓
24. Bot verifica su propio recentMemes Set
    ↓
25. Bot envía meme al usuario
```

---

## 🎯 Decisiones de Diseño

### ¿Por qué múltiples subreddits?

**Problema:** Un subreddit solo tiene ~100 posts calientes
**Solución:** 3 subreddits = 150 posts únicos

**Ventajas:**
- Más variedad
- Menos repeticiones
- Mayor resiliencia (si uno falla, hay otros 2)

### ¿Por qué Set en lugar de Array?

**recentMemeIds** usa `Set<string>`:
- O(1) para verificar duplicados
- O(1) para agregar
- O(1) para eliminar

Con Array sería O(n) para búsquedas.

### ¿Por qué dos capas de anti-duplicados?

1. **Capa RedditSource (500 IDs):** Evita obtener memes ya vistos de Reddit
2. **Capa Bot (200 IDs):** Evita mostrar al usuario memes que ya vio

**Total:** 700 IDs únicos rastreados

### ¿Por qué cache: false en bots?

- Bots necesitan memes frescos cada vez
- Caché es útil para APIs que sirven a múltiples usuarios
- En bots, el anti-duplicados es más importante que caché

---

## 📊 Métricas de Rendimiento

### Memoria

```
Cache vacío: ~1MB
Cache con 100 entradas: ~5MB
recentMemeIds (500 IDs): ~50KB
```

### Tiempo de Respuesta

```
Caché hit: ~5ms
Caché miss (1 subreddit): ~800ms
Caché miss (3 subreddits): ~2500ms
```

### Rate Limiting

```
Peticiones/segundo: 2
Delay mínimo: 500ms
3 subreddits: ~1.5s total
```

---

## 🔧 Extensibilidad

### Agregar nueva fuente

```typescript
import { ISourceHandler, Meme, FetchOptions } from '@abstract/exodusmeme'

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

1. **Caché distribuido** (Redis)
2. **Paginación de Reddit** (obtener más de 100 posts)
3. **Prefetching** (obtener siguiente lote en background)
4. **ML para detección NSFW** mejorada
5. **Webhooks** para notificaciones de nuevos memes
6. **GraphQL API** como alternativa a REST

---

**Autor:** Abstract  
**Última actualización:** 2026