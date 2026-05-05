# Service Worker y Cache Offline

## Estrategia Única: Stale-While-Revalidate

El SW usa SWR para **todos** los requests cacheables, sin distinción de visita:

1. **Con cache** → Devuelve cache inmediatamente + revalida en background. Cuando llegan datos nuevos, `CACHE_UPDATED` notifica a la app.
2. **Sin cache (cache MISS)** → Va a la red directamente y guarda el resultado.
3. **Offline** → Devuelve cache si existe, 503 si no.

Esto garantiza que el usuario nunca espera más de lo necesario: siempre ve datos de inmediato y recibe datos frescos en ~1-2s vía el mecanismo de `cacheUpdated$`.

## Configuración

| Config | Valor |
|--------|-------|
| Ubicación | `public/sw.js` |
| Base de datos | IndexedDB (`educa-cache-db`) |
| Versión DB | `DB_VERSION` en sw.js |
| TTL del caché | 24 horas |
| URLs cacheadas | `/api/*` (excepto auth/permisos) |
| Network timeout | 5 segundos |

## Versionado y Cambios Breaking

### Cuándo incrementar DB_VERSION

**IMPORTANTE**: Cuando hay cambios breaking en el backend que afectan la estructura de los datos en cache, **DEBES** incrementar `DB_VERSION` en `public/sw.js`.

Esto forzará la recreación de toda la base de datos IndexedDB y limpiará automáticamente todo el cache al hacer deploy.

#### Ejemplos de cambios breaking:

- ✅ Cambiar estructura de DTOs (agregar/quitar/renombrar campos)
- ✅ Cambiar tipos de datos (string → number, null → object, etc.)
- ✅ Cambiar formato de fechas
- ✅ Cambiar códigos de estado (A/T/F → nuevos códigos)
- ❌ Agregar campos opcionales al final (no es breaking)
- ❌ Cambios solo de backend que no afectan el JSON de respuesta

```javascript
// public/sw.js
const DB_VERSION = 2; // ← Incrementar cuando hay cambios breaking
```

### Invalidación de cache

#### 1. Invalidar TODO el cache

```typescript
// Útil en logout o reset completo
const swService = inject(SwService);
await swService.clearCache();
```

#### 2. Invalidar URL específica

```typescript
// Cuando un endpoint específico cambió
await swService.invalidateCacheByUrl('https://api.example.com/api/usuarios');
```

#### 3. Invalidar por patrón

```typescript
// Cuando un conjunto de endpoints cambió
// Invalida todo lo que contenga "/api/ConsultaAsistencia"
const count = await swService.invalidateCacheByPattern('/api/ConsultaAsistencia');
console.log(`${count} entradas invalidadas`);
```

### Estrategia recomendada por tipo de cambio

| Tipo de cambio | Estrategia | Cuándo aplicar |
|----------------|------------|----------------|
| **Breaking en toda la API** | Incrementar `DB_VERSION` | Antes del deploy |
| **Breaking en módulo específico** | `invalidateCacheByPattern('/api/Modulo')` | En AppComponent o guard de módulo |
| **Breaking en 1 endpoint** | `invalidateCacheByUrl(url)` | En el service antes de llamar al endpoint |
| **Cambios no-breaking** | Nada | El TTL de 24h se encarga |

## Normalización de URLs

La normalización usa una **blocklist** de parámetros de cache-busting. Todos los demás query params se conservan automáticamente como parte de la cache key.

```javascript
// public/sw.js - parámetros que se ELIMINAN (cache-busting)
const PARAMS_TO_STRIP = ['_', 't', 'timestamp', 'cacheBust', 'nocache', 'cb', 'v'];
```

Los params se ordenan alfabéticamente para generar cache keys determinísticas. **No es necesario agregar params nuevos** — solo se eliminan los de cache-busting.

## SW activo en dev — bundle stale al iterar código

> **`SwService.registerServiceWorker()` registra el SW siempre que `location.pathname.startsWith('/intranet/')`, sin guard de modo desarrollo. Esto significa que `npm run start` (`ng serve --port=4201`) tiene el SW prod-style activo igual que prod, cacheando chunks JS agresivamente.**

### Síntoma típico

Tocás un archivo TS, esperás el hot-reload (`vite` muestra `connected`), refrescás el browser → **el código nuevo NO corre**. Logs nuevos no aparecen, breakpoints en líneas nuevas no disparan, comportamiento sigue como antes del cambio.

Indicios:

- `fetch()` directo del chunk (ej `chunk-XXXXX.js`) desde DevTools → tiene el código nuevo (porque `fetch()` directo bypasa el SW si la URL no está cacheada).
- El runtime sigue ejecutando un chunk con un hash distinto, cacheado por el SW desde la sesión anterior.
- En `Application → Service Workers` aparecen 1-2 SWs activos (scope `/` residuo de versión vieja + scope `/intranet/` actual).

### Causa

1. `public/sw.js` se sirve como asset estático por `ng serve` igual que en build de prod.
2. `SwService.registerServiceWorker()` en `core/services/sw/sw.service.ts:67-69` registra el SW sin distinguir entorno.
3. El SW cachea `/loader.html` (app shell) y los chunks JS. Al recargar, el SW devuelve el shell viejo que apunta a chunks viejos. Los chunks nuevos quedan en disco pero nadie los pide.
4. Múltiples scopes residuales sobreviven porque el SW viejo nunca se desregistró cuando se cambió el scope.

### Workaround para iterar código en dev

En cada tab que tenga sesión activa:

1. **F12 → Application → Service Workers** → para CADA worker activo (usualmente 2: scope `/` y scope `/intranet/`) clic **Unregister**.
2. **F12 → Application → Storage** → botón **Clear site data** con todas las opciones marcadas (Cookies + Cache Storage + IndexedDB + Service Workers).
3. Cerrar el tab. Reabrir con un tab limpio (no `Ctrl+R`, **abrir tab nuevo**).
4. Volver a loguearse.

Mientras estés iterando código, mantener marcadas:

- ✅ **Bypass for network** en panel Service Workers — fuerza al browser a saltar el SW para cada request.
- ✅ **Update on reload** — re-fetch del SW en cada reload (más lento pero detecta cambios).
- ✅ **Disable cache** en panel Network — saltea el HTTP cache del browser.

### Cuándo aparece este problema

| Caso | Aparece |
|---|---|
| Primer load del día (SW recién registrado) | ❌ No, todo fresco |
| Tras hot-reload de archivo TS | ✅ Sí — el SW sirve chunks viejos |
| Tras cambio de schema BD / DTO breaking | ✅ Sí — el cache vieja deserializa mal |
| Tras desplegar nuevo build a Netlify | ⚠️ Depende del `DB_VERSION` (ver sección anterior) |
| Tras cambio en `public/sw.js` | ⚠️ El browser detecta cambio en el archivo SW pero requiere reload |

### Por qué no se desactiva el SW en dev

Decisión del proyecto (no documentada explícitamente): mantener el SW activo en dev para reproducir bugs de cache invalidation, SWR, offline. Si bloquea el debug puntual, **NO desregistrar permanentemente** — usar el workaround temporal.

Si el costo de iterar con SW activo se vuelve alto, considerar agregar un guard en `SwService.registerServiceWorker()`:

```typescript
// Propuesta — NO aplicar sin discusión
if (!location.pathname.startsWith('/intranet/')) return;
if (location.hostname === 'localhost' && !environment.production) {
  logger.log('[SwService] SW skip en dev local');
  return;
}
```

Tradeoff: bugs de cache solo aparecen en prod si se hace eso. Hoy aceptamos el costo de "limpiar SW al iterar" a cambio de no enmascarar bugs reales.

## Auto-refresh en componentes (solo para SWR inicial)

El `CACHE_UPDATED` solo se emite en la primera visita (SWR). En navegación activa el componente ya recibe data fresca directamente del HTTP response.

```typescript
import { SwService } from '@core/services';

private swService = inject(SwService);

ngOnInit(): void {
  this.loadData();
  this.setupCacheRefresh();
}

private setupCacheRefresh(): void {
  this.swService.cacheUpdated$
    .pipe(
      filter((event) => event.url.includes('/mi-endpoint')),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe((event) => {
      this.miSignal.set(event.data as MiTipo[]);
    });
}
```

## SwService - API

```typescript
// Observables
swService.cacheUpdated$     // Datos nuevos del servidor (solo en SWR inicial)
swService.isOnline$         // Estado de conexión
swService.updateAvailable$  // Nueva versión del SW

// Métodos de limpieza
swService.clearCache()                            // Limpiar TODO el caché (usar en logout)
swService.invalidateCacheByUrl(url)               // Invalidar URL específica
swService.invalidateCacheByPattern(pattern)       // Invalidar por patrón (retorna count)
swService.update()                                // Actualizar SW y recargar
```

### Ejemplo: Invalidar cache después de cambio backend

```typescript
// En un guard o AppComponent después de deploy con cambios breaking
@Injectable({ providedIn: 'root' })
export class CacheVersionGuard implements CanActivate {
  private swService = inject(SwService);
  private cacheCleared = false;

  async canActivate(): Promise<boolean> {
    // Solo limpiar una vez por sesión
    if (!this.cacheCleared) {
      // Opción 1: Limpiar todo
      await this.swService.clearCache();

      // Opción 2: Limpiar solo módulo específico
      // await this.swService.invalidateCacheByPattern('/api/ConsultaAsistencia');

      this.cacheCleared = true;
      logger.log('[CacheVersionGuard] Cache invalidado por cambios backend');
    }
    return true;
  }
}
```
