# WAL — Resiliencia y Degradación

> **"Funciona ≠ es resiliente. Si una pieza falla, el sistema debe degradar de forma observable, recuperable y nunca silenciosa."**

Este documento define los 4 mecanismos de resiliencia que extienden el WAL existente (ver [wal-write-ahead-log.md](wal-write-ahead-log.md)) y la cache SWR (ver [cache-swr.md](cache-swr.md)) para cubrir los modos de falla detectados en auditoría 2026-05-04.

Convive con los principios del WAL — **no los reemplaza**. El WAL sigue siendo optimista por default; lo que cambia es qué pasa cuando el flujo feliz no se cumple.

---

## Principios

1. **Falla observable**: ningún fallo silencioso. Si la red, la BD local o el SW dejan de funcionar, hay un signal en `WalStatusStore` y un indicador UI.
2. **Recuperable sin acción del usuario**: la mayoría de los degradados se autocorrigen al volver la condición normal (red, SW disponible, etc.).
3. **Sin estado huérfano**: si un cambio optimista quedó aplicado y los callbacks se perdieron, la próxima lectura reconcilia con el servidor.
4. **Última línea de defensa = TTL**: cuando todo lo demás falla, el TTL del cache (24h) garantiza convergencia eventual.

---

## Mapa de los 4 mecanismos

```
                         ┌─────────────────────────────────┐
                         │       WalStatusStore (UI)       │
                         │  pending · failed · degraded    │
                         │      circuit · mode · sync      │
                         └─────────────────────────────────┘
                                     ▲
                                     │
   ┌───────────────────┬─────────────┴─────────────┬───────────────────┐
   │                   │                           │                   │
┌──┴──┐             ┌──┴──┐                     ┌──┴──┐             ┌──┴──┐
│ M1  │             │ M2  │                     │ M3  │             │ M4  │
│recon│             │circ │                     │ idb │             │schma│
│cilia│             │brkr │                     │fbck │             │ fp  │
└─────┘             └─────┘                     └─────┘             └─────┘
   │                   │                           │                   │
   ▼                   ▼                           ▼                   ▼
WalSyncEngine      WalSyncEngine               WalDbService         sw.js
+ Cache            + Status                    + WalService          (SWR)
invalidation       store                       + WalMetrics
```

---

## M1 — Reconciliación post-reload

### Problema

El registro `callbacks: Map<entryId, {http$, onCommit, onError, rollback}>` vive **en memoria**. Si la app recarga (refresh, crash, deploy, navegación a otra origin) mientras una entry está `IN_FLIGHT` o `PENDING`:

1. El recovery (`WalSyncRecovery.run`) recupera la entry — bien.
2. El engine la procesa — bien.
3. El servidor confirma (200) — bien.
4. **`callbacks.get(entryId)` retorna undefined** — `onCommit` y rollback no corren.
5. El cache se invalida (eso ya funciona, ver `WalCacheInvalidator.invalidateForEntry`).
6. Pero **el componente que veía el estado optimista nunca se entera** de que el servidor confirmó. Si el componente está montado, sigue mostrando el snapshot que `apply` dejó. Si el usuario navega y vuelve, SWR sirve cache stale (la invalidación previa no garantiza que el siguiente render llegue *antes* del próximo cache hit en otra ruta relacionada).

### Diseño

El branch "sin callback" del engine ya invalida el cache. Lo que falta es **forzar un evento `cacheUpdated$` para que los componentes SWR montados se refresquen sin esperar a la próxima activación**.

```typescript
// En WalSyncEngine.processEntry, branch éxito:
if (!cb) {
  // Reconciliación silenciosa: la app recargó y perdimos los callbacks.
  // Notificamos a los componentes montados para que recarguen del servidor.
  await this.cacheInvalidator.invalidateForEntry(entry);
  await this.reconciler.notifyOrphanedCommit(entry);
}
```

Nuevo servicio `WalReconcilerService`:

```typescript
@Injectable({ providedIn: 'root' })
export class WalReconcilerService {
  private sw = inject(SwService);

  /**
   * Tras un commit sin callback (recuperado de sesión previa),
   * dispara cacheUpdated$ para los patrones del recurso.
   * Los componentes SWR montados re-fetcharán contra red.
   */
  async notifyOrphanedCommit(entry: WalEntry): Promise<void> {
    const patterns = WAL_CACHE_MAP[entry.resourceType] ?? [];
    for (const pattern of patterns) {
      await this.sw.refetchByPattern(pattern);
    }
  }
}
```

Nuevo método en `SwService`:

```typescript
/**
 * Re-fetch contra red para todas las URLs cacheadas que matchean el patrón.
 * Cuando llega la respuesta, emite cacheUpdated$ por cada URL.
 * No-op si SW no está registrado (ver M3 fallback).
 */
async refetchByPattern(pattern: string): Promise<number> { ... }
```

### Invariantes

| ID | Invariante |
|----|-----------|
| `INV-WAL-RES01` | Todo commit sin callback registrado **debe** disparar `refetchByPattern` para los patrones del `resourceType`. La única excepción es cuando el entry no está en `WAL_CACHE_MAP` y `extractPatternsFromEndpoint` retorna `[]`. |
| `INV-WAL-RES02` | `refetchByPattern` es no-op silencioso si el SW no está registrado. No falla la operación principal. |
| `INV-WAL-RES03` | El componente SWR debe estar suscrito a `sw.cacheUpdated$` filtrado por su URL para recibir el dato fresco. Esto **ya es la convención** documentada en `cache-swr.md` — la reconciliación reusa esa pipeline. |

### Test plan

1. **Unit**: `WalReconcilerService.notifyOrphanedCommit` invoca `sw.refetchByPattern` por cada patrón mapeado.
2. **Integración**: simular flujo "entry IN_FLIGHT → reload → recovery → process → no callback → reconcile". Verificar que `cacheUpdated$` emite con datos del servidor.
3. **Smoke manual**: editar un usuario en intranet → forzar reload mientras IN_FLIGHT → verificar que tras volver del servidor el dato visible es el del servidor, no el optimista.

---

## M2 — Circuit breaker + visibilidad de degradación

### Problema

Si el servidor empieza a rechazar consistentemente (5xx persistente, timeout de red prolongado), el WAL hace retry indefinido por entry hasta agotar `maxRetries`. Pero **no hay señal global** de que el subsistema está degradado:

- El usuario sigue editando, ve cambios optimistas, no se entera de que el servidor está caído.
- Cuando los `maxRetries` se agotan, ve N rollbacks de golpe en cascada.
- Los toasts de error son por-operación, no comunican el patrón sistémico.

### Diseño

Extender `WalStatusStore` con tres signals nuevos:

```typescript
// Modos del WAL
export type WalMode =
  | 'persistent'  // Default: IndexedDB ok, todo funciona
  | 'ephemeral'   // M3: in-memory fallback, sin persistencia
  | 'frozen';     // BD inicializada pero corrupta — ver M3

// Estado del circuit breaker
export type WalCircuitState = 'closed' | 'open' | 'half-open';

// En WalStatusStore:
private readonly _mode = signal<WalMode>('persistent');
private readonly _circuitState = signal<WalCircuitState>('closed');
private readonly _circuitOpenedAt = signal<number | null>(null);
private readonly _consecutiveFailures = signal(0);

readonly mode = this._mode.asReadonly();
readonly circuitState = this._circuitState.asReadonly();
readonly isDegraded = computed(() =>
  this._mode() !== 'persistent' || this._circuitState() === 'open'
);
```

### Reglas del circuit breaker

| Transición | Trigger | Efecto |
|------------|---------|--------|
| `closed → open` | 5 fallos retryable consecutivos en cualquier entry | Pausa procesamiento global. UI muestra banner "sincronización pausada". |
| `open → half-open` | 30 segundos transcurridos | Permite procesar **1 entry** como sonda. |
| `half-open → closed` | La sonda commitea exitosamente | Reanuda procesamiento normal. Reset contador. |
| `half-open → open` | La sonda falla | Vuelve a esperar 30 segundos. |

**No** se cuentan como fallos para el circuit:
- Errores 4xx permanentes (es problema del payload, no del servidor)
- 409 conflicts (problema de concurrencia)
- Errores cuando el navegador está offline (`!sw.isOnline`)

### Componente UI: `WalDegradedBanner`

Componente shared que se monta en `intranet-layout`. Lee `walStatusFacade.vm()` y renderiza solo cuando `isDegraded === true`:

```html
@if (vm().isDegraded) {
  <div class="wal-banner" [class.wal-banner--ephemeral]="vm().mode === 'ephemeral'">
    @switch (vm().bannerMessage) {
      @case ('circuit-open') {
        <i class="pi pi-pause-circle"></i>
        Sincronización pausada — reintentando en breve.
      }
      @case ('ephemeral') {
        <i class="pi pi-database"></i>
        Modo reducido: tus cambios se guardan en memoria. Si recargás antes de
        que se sincronicen, podrían perderse.
      }
    }
    <button pButton size="small" (click)="onForceRetry()">Reintentar ahora</button>
  </div>
}
```

### Invariantes

| ID | Invariante |
|----|-----------|
| `INV-WAL-RES04` | El circuit breaker solo cuenta fallos retryable (network, 5xx, timeout). 4xx y 409 NO disparan apertura. |
| `INV-WAL-RES05` | En estado `open`, el engine **no procesa** entries nuevas. Las que ya están en `IN_FLIGHT` completan su ciclo (commit o failure). |
| `INV-WAL-RES06` | El usuario puede forzar transición `open → half-open` con el botón "Reintentar ahora". |
| `INV-WAL-RES07` | El banner es no-bloqueante. El usuario puede seguir mutando — las entries se acumulan en `PENDING` hasta que el circuit cierre. |

### Test plan

1. **Unit**: simular 5 fallos retryable consecutivos → `circuitState() === 'open'`.
2. **Unit**: 4xx no incrementa contador.
3. **Unit**: tras 30s, half-open permite 1 entry.
4. **Integración**: con servidor mockeado retornando 503, verificar que el banner aparece a los ~5 retries y desaparece al primer 200 tras half-open.

---

## M3 — Fallback in-memory si IndexedDB no está disponible

### Problema

`WalDbService.initDB()` puede fallar por:

- Modo navegación privada en Firefox/Safari (IndexedDB rechaza writes).
- Cuota de almacenamiento llena.
- Permiso revocado por el usuario.
- Bug del navegador con bases corruptas.

Hoy, si `dbReady` resuelve `false`, **todas las operaciones del WAL son no-ops silenciosas**. El usuario edita → `apply` corre → la entry no se persiste → cuando el HTTP responde, el callback no encuentra entry asociada y los rollbacks fallan.

### Diseño

Convertir `WalDbService` en un **strategy pattern**: el contrato no cambia para los consumidores, pero internamente puede usar IndexedDB o un store en memoria.

```typescript
interface WalStorageStrategy {
  add(entry: WalEntry): Promise<void>;
  get(id: string): Promise<WalEntry | null>;
  getAll(): Promise<WalEntry[]>;
  getByStatus(status: WalEntryStatus): Promise<WalEntry[]>;
  update(id: string, patch: Partial<WalEntry>): Promise<WalEntry | null>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  readonly mode: WalMode;
}

class IndexedDBStrategy implements WalStorageStrategy { ... }
class InMemoryStrategy implements WalStorageStrategy { ... }
```

`WalDbService` pasa a ser una fachada que selecciona la strategy:

```typescript
@Injectable({ providedIn: 'root' })
export class WalDbService {
  private strategy: WalStorageStrategy;
  private statusStore = inject(WalStatusStore);

  constructor() {
    this.strategy = new IndexedDBStrategy();
    this.strategy.ready.then((ok) => {
      if (!ok) {
        logger.warn('[WAL-DB] IndexedDB unavailable, falling back to in-memory');
        this.strategy = new InMemoryStrategy();
        this.statusStore.setMode('ephemeral');
      }
    });
  }

  async add(entry: WalEntry): Promise<void> {
    return this.strategy.add(entry);
  }
  // ... resto delegan a this.strategy
}
```

### Reglas del modo ephemeral

- Las entries viven solo en memoria (`Map<string, WalEntry>`).
- Sobreviven a navegación SPA (mientras el `Injectable` global vive), **no** a reload.
- `WalSyncRecovery` se salta si el modo es `ephemeral` (no hay nada que recuperar).
- El banner UI muestra el aviso "Modo reducido" (ver M2).
- Métricas registran `mode: 'ephemeral'` en cada `recordProcessResult` para alertar en logs de prod.

### Detección de IndexedDB corrupto vs no disponible

```typescript
private async initIndexedDB(): Promise<boolean> {
  try {
    if (!('indexedDB' in window)) return false;
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    return new Promise((resolve) => {
      request.onerror = () => resolve(false);
      request.onsuccess = () => resolve(true);
      request.onblocked = () => resolve(false);  // BD bloqueada por otra tab
      // Timeout: si en 5s no resolvió, asumir no-disponible
      setTimeout(() => resolve(false), 5_000);
    });
  } catch {
    return false;
  }
}
```

### Invariantes

| ID | Invariante |
|----|-----------|
| `INV-WAL-RES08` | `WalDbService` **debe** seguir funcionando aunque IndexedDB esté indisponible. La degradación a `ephemeral` es transparente para los consumidores. |
| `INV-WAL-RES09` | En modo `ephemeral`, `WalStatusStore.mode === 'ephemeral'` y el banner UI lo refleja. |
| `INV-WAL-RES10` | El timeout de 5 segundos para inicialización de IndexedDB es duro: si no responde, se asume no-disponible. |

### Test plan

1. **Unit**: mockear `indexedDB.open` para fallar → strategy es `InMemoryStrategy`.
2. **Unit**: `add → get → update → delete` funciona idéntico en ambas strategies.
3. **Unit**: `WalStatusStore.mode === 'ephemeral'` tras fallo de init.
4. **Manual**: abrir intranet en Firefox modo privado → verificar banner "Modo reducido".

### Estado de implementación (chat 093, 2026-05-04)

- ✅ `storage/wal-storage.strategy.ts` — interface + `WAL_STORAGE_INIT_TIMEOUT_MS`.
- ✅ `storage/wal-storage-indexeddb.strategy.ts` — extracción de la lógica IndexedDB original.
- ✅ `storage/wal-storage-memory.strategy.ts` — `Map<string, WalEntry>` con `WAL_MEMORY_CAP = 500`. Al exceder, evicción FIFO con `logger.error`.
- ✅ `wal-db.service.ts` — fachada que arranca con la strategy memoria, intenta IndexedDB con `Promise.race(init, timeout 5s)`, swap a memory + `WalStatusStore.setMode('ephemeral')` ante cualquier falla.
- ✅ `wal-sync-recovery.service.ts` — corta temprano si `mode === 'ephemeral'` tras esperar a `db.isAvailable()` para asegurar que el modo esté settled.
- ✅ `wal-metrics.service.ts` + `WalMetrics` interface — incluyen `mode` en el snapshot.
- ✅ Specs de strategies + facade. La spec de IndexedDB cubre solo el init failure path porque jsdom no tiene IndexedDB; el contrato real está cubierto vía la spec de memoria + integración a través del facade.

Diferencia menor con el diseño original: el contrato estable del proyecto usa `put` (upsert) en lugar de `add` + `update` separados — heredado del API IndexedDB. El resto coincide.

---

## M4 — Schema fingerprint en cache

### Problema

`DB_VERSION` en `sw.js` invalida **todo el cache** cuando se incrementa. Pero hay dos escenarios donde esto no alcanza:

1. **Olvido de bump**: deploy con cambios breaking de DTO sin incrementar `DB_VERSION` → cache sirve estructura vieja → componentes reciben JSON inválido → errores en producción.
2. **Cambios incrementales**: un solo endpoint cambia, pero `DB_VERSION` invalida los 100 endpoints cacheados → mucha latencia en la primera carga post-deploy.

### Diseño

Cada entrada cacheada incluye un fingerprint del schema esperado. En lectura, si el fingerprint no coincide → discard + fetch fresh.

#### Generación del fingerprint

Dos opciones evaluadas:

| Opción | Pro | Contra |
|--------|-----|--------|
| **A — Versioning manual por endpoint** | Granular, controlable | El dev tiene que recordar bumpearlo |
| **B — Hash automático del schema TS** | Auto-detecta cambios | Requiere build step que genere el manifest |

**Decisión**: opción A para empezar (manual), porque opción B requiere un plugin de build que no tenemos. Si crece el costo, migrar a B.

```typescript
// frontend: shared/constants/api-schema-versions.ts
export const API_SCHEMA_VERSIONS: Record<string, number> = {
  '/api/sistema/usuarios': 3,
  '/api/horario': 2,
  '/api/Calificacion': 1,
  // ... resto
};
```

El `apiResponseInterceptor` agrega el header `X-Schema-Version` en cada response (lo lee del map por URL). El SW guarda este valor con la entrada cacheada.

#### Validación en lectura

```javascript
// sw.js
async function getCachedResponse(request) {
  const cached = await readFromIndexedDB(request.url);
  if (!cached) return null;

  const expectedVersion = SCHEMA_VERSIONS[normalizeUrl(request.url)];
  if (expectedVersion && cached.schemaVersion !== expectedVersion) {
    // Schema cambió: descartar y forzar fetch
    await deleteFromIndexedDB(request.url);
    return null;
  }

  return cached;
}
```

#### Sync entre frontend y SW

`SCHEMA_VERSIONS` se inyecta en `sw.js` por build (Angular build genera el archivo desde `api-schema-versions.ts`). Mientras tanto: hardcodear ambas (TODO de cleanup).

### Invariantes

| ID | Invariante |
|----|-----------|
| `INV-WAL-RES11` | Toda response de `/api/*` que se cachea **debe** llevar fingerprint de schema. Si el endpoint no está en `API_SCHEMA_VERSIONS`, no se cachea (fallback conservador). |
| `INV-WAL-RES12` | Cache miss por mismatch de schema **debe** loggear como `Information` en la consola del SW para diagnóstico de deploys. |
| `INV-WAL-RES13` | Bumpear el número en `API_SCHEMA_VERSIONS[endpoint]` es la única forma de invalidar selectivamente un endpoint. `DB_VERSION` sigue siendo el escape hatch nuclear. |

### Test plan

1. **Unit (sw.js)**: cache hit con schema match → retorna cached.
2. **Unit (sw.js)**: cache hit con schema mismatch → retorna null + delete.
3. **Manual**: bumpear versión de `/api/sistema/usuarios` → deploy → verificar que la primera carga hace network mientras el resto del cache sigue sirviendo.

---

## Roadmap de implementación

### Chat 086 — M1 + M2

**Por qué juntos**: ambos tocan `WalSyncEngine` y `WalStatusStore`. M2 da visibilidad UI a M1 (sin M2, los commits huérfanos pasan invisibles).

**Touch list**:

- `wal-sync-engine.service.ts` — branch sin callback → invocar reconciler; integrar circuit breaker
- `wal-status.store.ts` — agregar `mode`, `circuitState`, `consecutiveFailures`
- `wal-status.facade.ts` — exponer `forceRetry()`, `bannerMessage` computed
- `wal-reconciler.service.ts` — **nuevo**, `notifyOrphanedCommit`
- `sw.service.ts` — agregar `refetchByPattern`
- `wal-degraded-banner.component.ts` — **nuevo**, en `@shared/components/`
- `intranet-layout.component.html` — montar el banner
- Tests: 4 specs nuevos
- Doc: actualizar `wal-write-ahead-log.md` con referencias a INV-WAL-RES01-07

**Riesgo**: cambio en `WalSyncEngine.processEntry` puede romper entries en flight durante el deploy. Mitigación: el cambio es aditivo (agrega un branch sin callback que ya existía como caso silencioso).

### Chat 087 — M3

**Touch list**:

- `wal-storage-strategy.ts` — **nuevo**, interface
- `wal-storage-indexeddb.strategy.ts` — **nuevo**, extracted de WalDbService actual
- `wal-storage-memory.strategy.ts` — **nuevo**, in-memory
- `wal-db.service.ts` — refactor a fachada
- `wal-sync-recovery.service.ts` — skip si mode=ephemeral
- `wal-metrics.service.ts` — incluir `mode` en métricas
- Tests: strategies aisladas + selección automática

**Riesgo**: refactor de un servicio crítico. Mitigación: tests de regresión idéntico contrato + canary en navegador privado.

### Chat 088 — M4

**Touch list**:

- `shared/constants/api-schema-versions.ts` — **nuevo**, single source of truth
- `core/interceptors/api-response.interceptor.ts` — agregar `X-Schema-Version` request header
- `Educa.API/Middleware/SchemaVersionMiddleware.cs` — **nuevo**, agrega `X-Schema-Version` response header (BE)
- `public/sw.js` — leer + validar fingerprint
- Tests: 2 unit del SW

**Riesgo**: requiere coordinación FE+BE. Mitigación: el header es opcional — si BE no lo envía, FE asume version=1 y todo sigue funcionando.

### Orden recomendado

```
085 (split engine, ya activo) → 086 (M1+M2) → 087 (M3) → 088 (M4)
```

**Por qué este orden**:

1. M1+M2 primero porque resuelven el caso más frecuente (callback loss tras deploy/refresh).
2. M3 después porque toca infraestructura más profunda — mejor con M1+M2 ya estables.
3. M4 al final porque es el menos urgente (los breaking changes de schema son raros y el bump manual de `DB_VERSION` ya cubre el peor caso).

---

## Riesgos transversales

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Banner UI distrae al usuario | Medio | Solo se muestra cuando `isDegraded`. Auto-oculta al recuperar. |
| Circuit breaker abre en falso positivo (red intermitente) | Medio | Threshold de 5 fallos consecutivos + half-open con sonda. Usuario puede forzar retry. |
| Strategy in-memory acumula entries sin límite | Bajo | Cap duro de 500 entries; al exceder, descartar la más vieja con log de error. |
| Schema fingerprint desincroniza FE/BE | Medio | Header opcional con default version=1. CI test que verifica que `API_SCHEMA_VERSIONS` está sincronizado con DTOs. |
| Reconciler dispara N requests al volver online | Medio | `cacheInvalidator` ya rate-limita a través de `Promise.all` por patrón. M1 no agrega más requests que los que el cache invalidaría igual. |

---

## Métricas de éxito

Pasados 30 días post-deploy:

| Métrica | Meta |
|---------|------|
| Reportes de "datos viejos / no se actualizó" | -80% |
| `WAL_DEGRADED` minutos/día (en prod) | <5 min/día agregado |
| Entries IN_FLIGHT abandonadas (recovery diaria) | <0.1% del total |
| Cache hits con schema mismatch (post-deploy con bump) | 100% en primer hit, 0% después |

---

## Anti-patrones

| Anti-patrón | Por qué es malo | Solución |
|-------------|-----------------|----------|
| Reconciliar manualmente desde el componente (`facade.refetch()` tras commit) | Acopla cada feature a saber del WAL | Usar reconciler automático del WAL |
| Cerrar el banner manualmente con un dismiss | El usuario apaga la única señal real | Banner solo se cierra cuando la condición se resuelve |
| Hacer rollback automático cuando circuit abre | Confunde "servidor caído" con "operación rechazada" | Circuit pausa, no rolea — el rollback solo ocurre al exceder maxRetries |
| Usar `localStorage` como fallback en M3 | localStorage es síncrono y bloquea el render | `Map` en memoria; persistencia se sacrifica conscientemente |
| Mezclar `DB_VERSION` con schema fingerprint | Doble fuente de verdad | DB_VERSION es nuclear (todo); fingerprint es selectivo |

---

## Referencias

- [wal-write-ahead-log.md](wal-write-ahead-log.md) — principios base del WAL
- [cache-swr.md](cache-swr.md) — flujo SWR que M1 reusa
- [service-worker-scope.md](service-worker-scope.md) — qué intercepta el SW
- `@.claude/rules/optimistic-ui.md` — regla operativa para facades
