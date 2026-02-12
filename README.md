# ExodusMeme 🚀

**Motor de memes de alto rendimiento para Node.js y Discord bots.**  
*Optimizado para Discord, diseñado para velocidad y extensibilidad.*

[![npm version](https://img.shields.io/npm/v/@abstract_/exodusmeme?color=cb3837&style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@abstract_/exodusmeme)
[![npm downloads](https://img.shields.io/npm/dm/@abstract_/exodusmeme?color=333&style=for-the-badge)](https://www.npmjs.com/package/@abstract_/exodusmeme)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 🧠 ¿Qué es ExodusMeme?

ExodusMeme no es solo otro fetcher de Reddit. Es un **motor completo de orquestación de memes** con múltiples fuentes integradas. Ya sea que estés construyendo un bot de Discord, una herramienta de automatización de redes sociales, o simplemente necesites un flujo constante de memes, ExodusMeme proporciona una API robusta, type-safe y con caché.

## ✨ Características Principales

- 🎯 **Rendimiento Extremo**: Capa de caché integrada (TTL) y throttling de peticiones
- 🔌 **Múltiples Fuentes**: Sistema multi-API que combina want.cat, Reddit APIs y más fuentes integradas
- 🌐 **Arquitectura Pluggable**: Añade fácilmente fuentes personalizadas de Reddit, Twitter o tus propias APIs
- 🛡️ **Filtros Inteligentes**: Detección NSFW avanzada, umbrales de upvotes y filtrado por tipo de media
- 🤖 **Nativo de Discord**: Soporte de primera clase para embeds de Discord con truncamiento y formato automático
- 🧬 **Type Safety**: Escrito desde cero en TypeScript para mejor experiencia de desarrollo
- 🚀 **Anti-Duplicados**: Sistema de deduplicación con Set para evitar memes repetidos
- ⚡ **Caché Inteligente**: Caché en memoria con duración de 3-5 minutos para máxima frescura

---

## 📦 Instalación
```bash
npm install @abstract_/exodusmeme
```

## 🚀 Inicio Rápido

> **Nota**: ExodusMeme usa por defecto la fuente `multiapi` que combina múltiples APIs para mayor variedad y disponibilidad.

### 1. Fetch Simple (CommonJS)
```javascript
const { memeForge } = require('@abstract_/exodusmeme');

async function getMemes() {
    const memes = await memeForge.fetch({
        limit: 5,
        minUpvotes: 500,
        nsfw: false
    });
    
    console.log(memes);
}

getMemes();
```

### 2. Fetch Simple (ES Modules)
```javascript
import { memeForge } from '@abstract_/exodusmeme';

const memes = await memeForge.fetch({
    limit: 5,
    minUpvotes: 500,
    nsfw: false
});

console.log(memes);
```

### 3. Bot de Discord con discord.js v14 (CommonJS)
```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { memeForge } = require('@abstract_/exodusmeme');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'meme') {
        await interaction.deferReply();
        
        const memes = await memeForge.fetch({
            limit: 1,
            minUpvotes: 500,
            nsfw: false,
            mediaType: 'image'
        });
        
        if (memes.length === 0) {
            await interaction.editReply('No se encontraron memes 😢');
            return;
        }
        
        const meme = memes[0];
        
        const embed = {
            title: meme.title,
            url: meme.sourceUrl,
            image: { url: meme.url },
            color: 0xff4500,
            footer: {
                text: `👍 ${meme.upvotes.toLocaleString()} • r/${meme.subreddit}`
            }
        };
        
        await interaction.editReply({ embeds: [embed] });
    }
});

client.login('YOUR_TOKEN');
```

### 4. Bot de Discord (ES Modules)
```javascript
import { Client, GatewayIntentBits } from 'discord.js';
import { memeForge } from '@abstract_/exodusmeme';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'meme') {
        await interaction.deferReply();
        
        const memes = await memeForge.fetch({
            limit: 1,
            minUpvotes: 500,
            nsfw: false,
            mediaType: 'image'
        });
        
        if (memes.length === 0) {
            await interaction.editReply('No se encontraron memes 😢');
            return;
        }
        
        const meme = memes[0];
        
        const embed = {
            title: meme.title,
            url: meme.sourceUrl,
            image: { url: meme.url },
            color: 0xff4500,
            footer: {
                text: `👍 ${meme.upvotes.toLocaleString()} • r/${meme.subreddit}`
            }
        };
        
        await interaction.editReply({ embeds: [embed] });
    }
});

client.login('YOUR_TOKEN');
```

### 5. Bot con Comandos de Prefijo (CommonJS)
```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { memeForge } = require('@abstract_/exodusmeme');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const prefix = '!';

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'meme') {
        const memes = await memeForge.fetch({
            limit: 1,
            minUpvotes: 500,
            nsfw: false,
            mediaType: 'image'
        });
        
        if (memes.length === 0) {
            await message.reply('No se encontraron memes 😢');
            return;
        }
        
        const meme = memes[0];
        
        const embed = {
            title: meme.title,
            url: meme.sourceUrl,
            image: { url: meme.url },
            color: 0xff4500,
            footer: {
                text: `👍 ${meme.upvotes.toLocaleString()} • r/${meme.subreddit}`
            }
        };
        
        await message.reply({ embeds: [embed] });
    }
});

client.login('YOUR_TOKEN');
```

### 6. Subreddits Personalizados
```javascript
const { memeForge } = require('@abstract_/exodusmeme');

const memes = await memeForge.fetch({
    subreddits: ['MAAU', 'yo_elvr', 'LatinoPeopleTwitter'],
    limit: 10,
    minUpvotes: 1000
});
```

---

## ⚙️ Configuración Avanzada

| Opción | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `source` | `string` | `'multiapi'` | Motor de fuente: `multiapi`, `reddit`, `memeapi` o personalizado |
| `subreddits` | `string[]` | - | Lista de subreddits (solo aplica para fuente `reddit`) |
| `limit` | `number` | `1` | Número de memes a obtener |
| `nsfw` | `boolean` | `true` | ¿Incluir contenido NSFW? |
| `minUpvotes`| `number` | `0` | Filtro de upvotes mínimos |
| `mediaType` | `string` | `'any'` | `image`, `gif`, `video`, o `any` |
| `format` | `string` | `'json'` | `json` o `discord-embed` |
| `cache` | `boolean` | `true` | Activar/Desactivar caché en memoria |

### 📡 Fuentes Disponibles

**MultiAPI (Default)** - Combina múltiples APIs para máxima variedad:
- want.cat API
- Reddit MAAU
- Reddit yo_elvr
- Reddit LatinoPeopleTwitter

**MemeAPI** - Fuente alternativa usando meme-api.com:
```javascript
const memes = await memeForge.fetch({
    source: 'memeapi',
    limit: 10
});
```

**Reddit** - Acceso directo a Reddit JSON:
```javascript
const memes = await memeForge.fetch({
    source: 'reddit',
    subreddits: ['memes', 'dankmemes'],
    limit: 10
});
```

---

## 🔄 Características Avanzadas

### Sistema Anti-Duplicados

ExodusMeme implementa un sistema de deduplicación que mantiene un Set de los últimos 150-300 IDs de memes vistos, dependiendo de la fuente. Esto garantiza que no veas el mismo meme repetidas veces:

```javascript
const memes = await memeForge.fetch({ limit: 20 });
```

### Caché Inteligente

Cada fuente implementa su propio sistema de caché con diferentes duraciones:
- **MultiAPI**: 3 minutos (180 segundos)
- **MemeAPI**: 5 minutos (300 segundos)
- **Reddit**: 2 minutos (120 segundos)

Esto asegura un balance entre frescura de contenido y eficiencia:

```javascript
const memes = await memeForge.fetch({ 
    limit: 10,
    cache: true
});
```

### Rate Limiting

Las fuentes implementan throttling automático para evitar sobrecarga de las APIs:

```javascript
const rateLimiter = new RateLimiter(0.5);
await rateLimiter.throttle('multiapi');
```

---

## 🆘 Soporte y Comunidad

¿Tienes problemas? ¡Estamos aquí para ayudar!

- 🐛 **¿Encontraste un bug?** Abre un [Issue](https://github.com/NotAvalible111/Exodus-Meme/issues)
- 💬 **¿Necesitas ayuda?** [Únete a nuestro Discord](https://discord.gg/A8WZwsx6cZ)
- 🛠️ **¿Error en la docs?** ¡Los pull requests son bienvenidos!

## 📜 Licencia


MIT © [NotAvalible111](https://github.com/NotAvalible111)
