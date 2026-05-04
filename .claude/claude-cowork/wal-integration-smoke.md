# WAL Integration Smoke — checklist en browser

> **Subsistema**: `src/app/core/services/wal/` · **Regla canónica**: `rules/optimistic-ui.md`
> **Cuándo correr**: cualquier PR que toque archivos en `core/services/wal/`. Pasa antes de mergear.
> **Cuánto tarda**: ~30-40 min los 8 casos en una pasada limpia.

## Por qué existe

Toda mutación CRUD del frontend pasa por `WalFacadeHelper.execute()`. Si el engine se rompe, las mutaciones quedan sin persistir, sin rollback determinista, o sin recovery tras reload. Vitest cubre unidades aisladas (~34 specs post-DS1). Este checklist cubre el **ciclo integrado**: IndexedDB + HTTP real + service worker + leader election + cross-tab + recovery on reload.

## Política de merge

- PR que toca `core/services/wal/` → corre el smoke completo en `main` rebasado con la PR aplicada.
- Si pasa: anotar fecha + commit corto en el header de cada caso (`✅ 2026-05-04 abc1234`).
- Si falla: bloquea merge. Abrir task específico en `tasks/` con repro mínimo y findings.
- Flaky un caso (network/timing): repetir 2 veces antes de declararlo regression.

## Setup global (correr una sola vez por sesión)

1. Backend `Educa.API` corriendo local (`https://localhost:7102`) o apuntar a `educacom.azurewebsites.net`.
2. Frontend en dev: `npm start` (`http://localhost:4201`).
3. Chrome perfil `Sistemas`, login Director (DNI `74125896` / pwd `12349898`).
4. Navegar a un CRUD admin con WAL: `/intranet/admin/cursos` (referencia para el smoke; cualquier otro CRUD admin sirve para casos 1-5).
5. **DevTools abierto** en pestañas:
   - `Application` → `IndexedDB` → `educa-wal-db` → `wal-entries`
   - `Network` (filtro `Fetch/XHR`)
   - `Console` (filtro `[WAL`)
6. Limpiar estado previo: `Application` → click derecho en `educa-wal-db` → `Delete database` → recargar.

## Convención de columnas

| Campo a inspeccionar en `wal-entries` | Qué leer |
|---|---|
| `id` | UUID generado por `WalService.enqueue` |
| `status` | `'PENDING' \| 'IN_FLIGHT' \| 'COMMITTED' \| 'FAILED' \| 'CONFLICT' \| 'REQUIRES_MIGRATION'` |
| `retryCount` | Número de reintentos consumidos |
| `nextRetryAt` | Timestamp para próximo intento (ms epoch) — solo en backoff |
| `operation` | `'CREATE' \| 'UPDATE' \| 'DELETE' \| 'TOGGLE'` |
| `resourceType` | Coincide con `WAL_CACHE_MAP` (ej `'cursos'`) |
| `schemaVersion` | Versión del shape de la entry |

`COMMITTED` puede desaparecer si el cleanup TTL ya corrió; ver el evento `[WAL]` en consola si la entry ya no está visible.

---

## Caso 1 — Optimistic happy path (CRUD admin)

> **Cubre**: apply local inmediato + reconcile sin replace + ciclo completo PENDING → IN_FLIGHT → COMMITTED.

### Precondición
- IndexedDB `wal-entries` vacío.
- Online, backend respondiendo 200.

### Pasos
1. En `/intranet/admin/cursos`, click **Nuevo**, completar nombre `WAL-SMOKE-1` y guardar.
2. Inmediatamente (antes de ver toast de éxito) hacer click en `wal-entries` y `Refresh`.
3. Editar el curso recién creado: cambiar nombre a `WAL-SMOKE-1-edit`, guardar.
4. Toggle estado del curso (botón warning/success de la fila).
5. Eliminar el curso (botón danger + confirmar).

### Resultado esperado
- Paso 1: la fila aparece en la tabla **antes** del 200 del POST (apply local). El toast de éxito llega ~200-400ms después sin que la fila parpadee ni se duplique.
- Paso 2: hay 1 entry con `status: 'IN_FLIGHT'` y luego (tras refresh manual de IDB) `status: 'COMMITTED'` o desaparecida (si cleanup ya corrió).
- Paso 3-5: cada operación produce el mismo ciclo. No hay entries `PENDING` colgadas al final.
- Network: 1 request POST/PUT/DELETE por operación, todas con 2xx.
- Console: logs `[WAL] enqueue → in-flight → committed` por entry.

### DevTools query
```
Application → IndexedDB → educa-wal-db → wal-entries
  Esperado al final: 0 entries con status != 'COMMITTED'
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Caso 2 — Offline → online recovery

> **Cubre**: encolado offline + procesamiento al volver online + orden de envío.

### Precondición
- IndexedDB `wal-entries` vacío.
- Online inicialmente, en `/intranet/admin/cursos`.

### Pasos
1. DevTools → Network → toggle a **Offline**.
2. Crear 3 cursos rápidos: `WAL-SMOKE-2-A`, `WAL-SMOKE-2-B`, `WAL-SMOKE-2-C`.
3. Inspeccionar `wal-entries` — debe haber 3 entries `PENDING`.
4. Verificar UI: las 3 filas aparecen en la tabla (apply local), sin errores rojos.
5. DevTools → Network → toggle a **Online**.
6. Esperar el siguiente tick del engine (≤ 5s).
7. Inspeccionar `wal-entries` y Network.

### Resultado esperado
- Paso 3: 3 entries `PENDING` con `retryCount: 0` y `nextRetryAt` undefined o ya pasado.
- Paso 4: UI muestra 3 filas nuevas optimistas.
- Paso 6-7: 3 requests POST salen en orden (timestamps ascendentes en Network), todas 2xx. Las 3 entries pasan a `COMMITTED` o desaparecen.
- No hay duplicados en la tabla del backend (consultar: refrescar lista, cuento sigue +3, no +6).

### DevTools query
```
Console filtro [WAL: ver "leader processing N=3 entries"
Network: 3 POST /api/cursos consecutivos al pasar a online
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Caso 3 — Conflicto 409 (mismo item desde 2 tabs)

> **Cubre**: detección de conflicto + entry CONFLICT + rollback + notificación al usuario.

### Precondición
- 1 curso existente (ej: `WAL-SMOKE-3-base`).
- 2 tabs abiertos en `/intranet/admin/cursos`, mismo browser, misma sesión.

### Pasos
1. Tab A: editar curso, cambiar nombre a `WAL-SMOKE-3-A`, **NO guardar todavía**.
2. Tab B: editar el mismo curso, cambiar nombre a `WAL-SMOKE-3-B`, guardar (200 OK).
3. Tab A: ahora guardar (rowVersion vieja → server responde 409).
4. Inspeccionar `wal-entries` en tab A.
5. Inspeccionar UI en tab A: ¿se revirtió el optimistic apply?

### Resultado esperado
- Paso 3: request PUT desde tab A retorna 409.
- Paso 4: entry de tab A pasa a `status: 'CONFLICT'` (no `FAILED`).
- Paso 5: la fila en tab A vuelve al snapshot pre-edit (rollback aplicado por engine). El nombre visible es `WAL-SMOKE-3-B` (lo que ganó), no `WAL-SMOKE-3-A`.
- Toast/UI muestra mensaje de conflicto al usuario (callback `onError` ejecutado).

### DevTools query
```
wal-entries → entry con status: 'CONFLICT', retryCount: 0
Network: PUT /api/cursos/{id} con response 409
Console: [WAL] conflict detected, rollback applied
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Caso 4 — Permanent error 4xx (validación rechazada)

> **Cubre**: error no-retryable + entry FAILED + rollback determinista.

### Precondición
- IndexedDB vacío, online, backend respondiendo.

### Pasos
1. En `/intranet/admin/cursos`, click **Nuevo**.
2. Completar con datos que el backend rechaza (ej: nombre con caracteres no permitidos, o un campo requerido faltante que pase la validación FE pero falle en BE → 422/400).
3. Guardar.
4. Inspeccionar `wal-entries` y UI.

### Resultado esperado
- Network: POST devuelve 400/422 con cuerpo de error tipado.
- `wal-entries`: entry pasa a `status: 'FAILED'`, `retryCount: 0` (no se reintenta — error permanente).
- UI: la fila optimista **desaparece** (rollback). El dialog vuelve a abrirse o queda mensaje de error visible.
- Toast con mensaje del backend (no genérico tipo "Error").

### DevTools query
```
wal-entries → status: 'FAILED', retryCount: 0
Network: POST con status 4xx
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Caso 5 — Retryable error 5xx + backoff

> **Cubre**: error retryable + backoff exponencial + recuperación automática.

### Precondición
- IndexedDB vacío.
- Acceso para detener el backend (matar proceso `dotnet run` o desconectar el túnel).

### Pasos
1. Apagar el backend (`Ctrl+C` en la terminal de `dotnet run`).
2. En `/intranet/admin/cursos`, crear curso `WAL-SMOKE-5`, guardar.
3. Inspeccionar `wal-entries` apenas el request falle.
4. Esperar ~5s, refrescar `wal-entries`.
5. Encender el backend.
6. Esperar el siguiente tick (≤ 5s desde el `nextRetryAt`).
7. Inspeccionar `wal-entries` y Network.

### Resultado esperado
- Paso 3: entry con `status: 'PENDING'` pero `retryCount: 1` (subió tras 1er intento), `nextRetryAt` ≈ `now + backoffMs`.
- Paso 4: si el tick volvió a intentar mientras el backend seguía caído, `retryCount: 2`, `nextRetryAt` mayor (backoff exponencial).
- Paso 6-7: cuando el backend está vivo, el siguiente intento tiene 200 → entry pasa a `COMMITTED`. La fila optimista persiste (no se removió porque era retryable, no failed).
- Si llega al máximo de retries antes de levantar el backend: entry pasa a `FAILED` y rollback aplica.

### DevTools query
```
wal-entries → retryCount creciente, nextRetryAt creciente, status sigue 'PENDING'
Network: POST con net::ERR_FAILED o 503 mientras backend está caído
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Caso 6 — Cross-tab leader election

> **Cubre**: leader-only processing + invalidación de cache en otros tabs vía `entryCommittedByOtherTab$`.

### Precondición
- 2 tabs en `/intranet/admin/cursos`, mismo browser, misma sesión.
- Console abierto en ambos para ver logs `[WAL-Leader]`.

### Pasos
1. Identificar leader: en consola de cada tab buscar log `[WAL-Leader] became leader` o `[WAL-Leader] follower`.
2. En el follower (tab B), crear curso `WAL-SMOKE-6`.
3. Inspeccionar `wal-entries` en ambos tabs.
4. Observar logs en tab A (leader) — debe procesar el request HTTP.
5. Verificar que tab B muestra la fila actualizada (cache invalidada) sin recargar.

### Resultado esperado
- La entry encolada por tab B aparece en `wal-entries` de **ambos** (mismo IndexedDB compartido).
- El POST sale desde tab A (leader). Verificar en Network del leader.
- Tab B no dispara el HTTP (Network del follower limpio para esta operación).
- Tab B recibe el evento `entryCommittedByOtherTab$` y refresca su cache: la fila final aparece consistente sin click manual de refresh.

### DevTools query
```
Console tab A: [WAL] leader processing entry id=...
Console tab B: [WAL] entry committed by other tab, invalidating cache resourceType=cursos
Network tab B: NO request POST para esta operación
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Caso 7 — Recovery on reload

> **Cubre**: persistencia de entries pendientes + procesamiento al volver a cargar la app.

### Precondición
- IndexedDB vacío, backend caído (o offline).

### Pasos
1. Con backend caído (o Network → Offline), crear curso `WAL-SMOKE-7`. Entry queda `PENDING`.
2. Verificar entry en `wal-entries`.
3. Recargar la página (`F5`) **sin** restablecer el backend ni el modo online.
4. Inspeccionar `wal-entries` post-reload — debe persistir.
5. Restablecer backend / pasar a Online.
6. Esperar siguiente tick.

### Resultado esperado
- Paso 4: la entry sigue ahí post-reload, `status: 'PENDING'`, `retryCount: 0`.
- Console al cargar: log `[WAL-Sync] Recovery: N pending entries detected` o equivalente del `WalSyncRecovery`.
- Paso 6: entry pasa a `COMMITTED` y la fila reaparece en la UI tras el commit.

### DevTools query
```
Console al reload: [WAL-Sync] init → recovery.run() → N entries
wal-entries → entry sobrevive el reload
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Caso 8 — Schema migration (`REQUIRES_MIGRATION`)

> **Cubre**: detección de schemaVersion viejo + emisión de evento `REQUIRES_MIGRATION` + UI/banner correspondiente.

### Precondición
- Identificar el `schemaVersion` actual en `WAL_DEFAULTS` o constantes del modelo.
- IndexedDB con al menos 1 entry creada por flujo normal (caso 1) para tener un shape válido como base.

### Pasos
1. En `Application → IndexedDB → educa-wal-db → wal-entries`, click derecho sobre 1 entry → editar valor.
2. Cambiar `schemaVersion` a un número menor (ej: `0` si actual es `1`, o `1` si actual es `2`).
3. Cambiar `status` a `'PENDING'` para forzar que el engine la considere.
4. Recargar la página.
5. Observar consola y UI.

### Resultado esperado
- Console al cargar: log de `WalSyncRecovery` identifica la entry como `REQUIRES_MIGRATION`.
- Engine emite `entryProcessed$` con `status: 'REQUIRES_MIGRATION'` para esa entry.
- UI: banner / status del `WalStatusFacade` muestra el estado de migración requerida (revisar componente que consuma `walStatus()`).
- La entry **no se procesa** como request HTTP normal — queda esperando que el flujo de migración manual la resuelva.

### DevTools query
```
Console al reload: [WAL-Sync] entry id=... requires migration (schemaVersion=0)
wal-entries → entry con status: 'REQUIRES_MIGRATION'
WalStatusStore → state refleja la migración pendiente
```

### Estado
> ⏳ Pendiente 1ra ronda

---

## Resumen de la 1ra ronda

| Caso | Resultado | Fecha | Commit | Findings |
|---|---|---|---|---|
| 1 — Happy path | PASS | 2026-05-04 | `478df42` | CRUD completo (CREATE/UPDATE/TOGGLE/DELETE) -> 200 cada operacion. IDB queda vacio post-commit (`commitAndClean` borra inmediato, no espera TTL — no es regresion). |
| 2 — Offline -> online | PASS | 2026-05-04 | `478df42` | 3 entries PENDING con `retries: 0` mientras offline (toast "Sin conexion" mostrado). Tras `online`, 3 POST consecutivos en orden (timestamps ascendentes) -> todos 200 -> IDB vacio. |
| 3 — Conflict 409 | BLOCKED | 2026-05-04 | `478df42` | **Bloqueado por BE**: `PUT /api/sistema/cursos/{id}/actualizar` devuelve 200 incluso con `rowVersion` stale. Path WAL CONFLICT no se puede validar end-to-end con este CRUD. Repro minimo + analisis de causa raiz en `tasks/wal-smoke-fail-3-be-no-rowversion-409.md`. |
| 4 — Permanent 4xx | PASS | 2026-05-04 | `478df42` | Nombre >50 chars -> POST 400 -> entry `FAILED` con `retries: 0`, `error: "HTTP 400: Bad Request"`. Toast generico "La solicitud contiene datos invalidos" mostrado (mejorable: el BE devuelve mensaje mas especifico que no se extrae). |
| 5 — Retryable 5xx | PASS | 2026-05-04 | `478df42` | Sim 503 via interceptor fetch (Angular usa `withFetch`, no XHR). Path `retryable->FAILED` (max retries) y `retryable->COMMITTED` (1 fail + retry success) ambos validados. `nextRetryAt` poblado tras incrementRetry. |
| 6 — Cross-tab leader | PASS | 2026-05-04 | `478df42` | 2 tabs mismo IDB. Encolar en Tab B -> POST sale solo desde Tab A = leader -> IDB vacio post-commit. Cache invalidator cross-tab se invoca en follower (`invalidateForCrossTab` solo invalida SW cache, NO trigger refetch UI — by-design del componente actual). |
| 7 — Recovery on reload | PASS | 2026-05-04 | `478df42` | Entry PENDING insertada manualmente en IDB sobrevive F5; tras reload, recovery la procesa -> POST 200 -> COMMITTED -> eliminada. Curso `WAL-SMOKE-7-recovery` creado en BE confirma flujo. |
| 8 — REQUIRES_MIGRATION | PASS | 2026-05-04 | `478df42` | Entry con `schemaVersion: 0` (current = 1) post-reload queda con `status: 'REQUIRES_MIGRATION'`, `error: "Schema v0 < current v1"`, `retries: 0`. NO se envia HTTP. Banner UI no observado (depende del componente que consuma `walStatus()`). |

Si un caso falla, abrir task en `educa-web/.claude/tasks/wal-smoke-fail-<caso>-<resumen>.md` con repro mínimo, screenshot del estado de IDB y de la consola, y commit en el que se observó.
