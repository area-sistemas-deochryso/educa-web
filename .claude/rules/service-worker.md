# Service Worker y Cache Offline

## Estrategia Híbrida: SWR + Network-first

El SW usa una estrategia híbrida según el contexto:

1. **Primera visita** (carga inicial) → **Stale-While-Revalidate**: devuelve cache inmediato, revalida en background y notifica si hay cambios
2. **Visitas posteriores** (navegación activa) → **Network-first**: va a la red primero (con timeout de 5s), cache solo como fallback si la red falla
3. **Sin cache** → Siempre va a la red

Esto garantiza que la carga inicial sea rápida (cache) pero que la navegación activa del usuario siempre muestre data fresca.

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
