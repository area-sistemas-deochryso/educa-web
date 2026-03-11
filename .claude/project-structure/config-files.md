# Archivos de Configuración

| Archivo | Propósito |
| --- | --- |
| `angular.json` | Angular CLI config |
| `tsconfig.json` | TypeScript con path aliases |
| `eslint.config.js` | ESLint 9 flat config |
| `vite.config.ts` | Vitest config |
| `src/app/config/environment*.ts` | Variables de entorno |
| `public/sw.js` | Service Worker (cache + offline) |
| `netlify.toml` | Headers de caché, proxies y SPA fallback para Netlify |
| `src/_redirects` | Reglas de redirección copiadas al build output (Netlify las combina con `netlify.toml`) |
| `src/loader.html` | Entry point real de la SPA (tiene `<app-root>` + spinner + `<script src="/main.js">`) |

## Netlify: Routing y Proxies

El deploy usa **dos fuentes de reglas** que Netlify combina:

1. **`netlify.toml`** — reglas con `force = true` para proxies, headers de caché
2. **`src/_redirects`** — se copia al build output root vía `angular.json` assets

> **CRÍTICO**: Netlify mezcla ambas pero el `/*` del `_redirects` puede capturar rutas antes de que los proxies del `netlify.toml` actúen. Por eso **todos los proxies deben estar en ambos archivos**.

### Proxies actuales (en `netlify.toml` Y en `src/_redirects`)

| Ruta | Destino |
| ---- | ------- |
| `/api/*` | `https://educa1.azurewebsites.net/api/:splat` |
| `/chathub` y `/chathub/*` | `https://educa1.azurewebsites.net/chathub/:splat` |
| `/asistenciahub` y `/asistenciahub/*` | `https://educa1.azurewebsites.net/asistenciahub/:splat` |
| `/*` (fallback SPA) | `/loader.html` |

### Entry points HTML

- **`src/index.html`** → Angular lo procesa como build index (meta tags PWA, títulos públicos). Va al build output como `index.html`.
- **`src/loader.html`** → Copiado tal cual al build output. Es el **fallback SPA real**: muestra un spinner mientras Angular arranca. Carga `/main.js` directamente.
- El fallback `/*` debe apuntar a `/loader.html` en ambos archivos de reglas.

### SignalR en Netlify

- Netlify **no soporta WebSocket upgrade ni SSE persistente** (timeout de proxy ~26s) → se usa **solo `LongPolling`** en producción.
- Configurado en `asistencia-signalr.service.ts` y `signalr.service.ts` con `environment.production`.
- Ambos hubs (`ChatHub`, `AsistenciaHub`) usan `[Authorize]`. El auth token es una HttpOnly cookie → `withCredentials: true` la envía automáticamente. No se necesita `accessTokenFactory`.
- El backend extrae el JWT del cookie `educa_auth` (prioridad 1) o del query param `?access_token=` (prioridad 3, para WS nativos). Ver `OnMessageReceived` en `Program.cs` ~línea 339.
- **CRÍTICO**: `AsistenciaHub` (y `ChatHub`) deben estar en `ExcludedPaths` del `CsrfValidationMiddleware` — el negotiate es un POST sin CSRF token.

## Path Aliases (tsconfig.json)

- `@app/*` → `src/app/*`
- `@core` / `@core/*` → `src/app/core`
- `@shared` / `@shared/*` → `src/app/shared`
- `@features/*` → `src/app/features/*`
- `@config` → `src/app/config`
- `@data/*` → `src/app/data/*`
