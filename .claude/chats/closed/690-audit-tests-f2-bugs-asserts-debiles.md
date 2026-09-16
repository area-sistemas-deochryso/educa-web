# 690 — Audit Tests F2: bugs de aserción (tests que no verifican lo que prometen)

> **Repo destino**: `educa-web`
> **Plan**: [`audit-tests-frontend-2026-09-16.md`](../../plan/audit-tests-frontend-2026-09-16.md) (Fase F2)
> **Creado**: 2026-09-16 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**: 7 specs puntuales en `features/intranet/pages/admin/**` y `core/services/error/`

## Origen

Hallazgos de `/audit` (2026-09-16), categoría **Bug** — 7 hallazgos independientes de bajo esfuerzo cada uno pero alto valor: son tests cuyo nombre promete verificar algo que el `expect` real no cubre, por lo que no detectarían una regresión real en esa lógica.

## Scope

1. **`attendances-data.facade.spec.ts:173-177`** — "sets syncing to true before call completes" nunca lee `store.syncing()`, solo verifica que el mock fue llamado. Fix: usar un mock async controlado (`Subject` en vez de `of()` síncrono) para poder inspeccionar `syncing()===true` antes de resolver, y `false` después.
2. **`sync-range-dialog.component.spec.ts:95-100`** — el caso "366 días es válido" usa fechas (2026-01-01→2026-12-31) que dan 365 días exactos (el propio assert lo confirma). El borde real de 366 nunca se ejercita. Fix: corregir las fechas para dar exactamente 366, y agregar/confirmar el caso 367 como inválido si el guard lo distingue.
3. **`error-handler.service.spec.ts:200-207`** — "should deduplicate identical notifications within 5s" solo chequea el valor final de `currentNotification()`, sea cual sea el resultado de la dedup. Fix: disparar 2 notificaciones idénticas dentro de la ventana y verificar que solo aparece una; agregar caso con >5s de diferencia donde ambas deben aparecer.
4. **`permisos-roles.facade.spec.ts:137-146`** y **`vistas.facade.spec.ts:122-142`** — el assert de WAL solo chequea `operation: 'CREATE'/'UPDATE'`, nunca `resourceId`/`payload`. Un `rolId`/`vistaId` mal cableado (asignar capabilities al recurso equivocado) pasaría igual. Fix: agregar assert sobre el payload completo enviado a WAL.
5. **`eventos-calendario.facade.spec.ts:118-126`** y **`notificaciones-admin.facade.spec.ts:108-115`** — el test simula error con `throwError` pero solo verifica que la API fue llamada, no que `setError`/`errorHandler.showError` se ejecutaron. Fix: agregar assert sobre el estado de error del store tras el fallo.
6. **`admin-health-permissions.facade.spec.ts:177-183`** — test de error de `loadResumen` no verifica `store.loadError()`, solo `loading===false`. Fix: agregar el assert faltante.
7. **`rate-limit-events.facade.spec.ts:131-135`** — "exportarCsv con el filtro actual" nunca hace `toHaveBeenCalledWith(filter)`. Fix: agregar el assert de argumento.

## Pre-work

- Ninguno — los 7 puntos son fixes puntuales e independientes, sin dependencias entre sí. Pueden resolverse en cualquier orden.

## Out of scope

- Cobertura nueva de casos no mencionados aquí (eso es F3/F4/F5 según corresponda).
- No es una revisión general de esos archivos — solo los puntos listados.

## Criterio de cierre

- [x] Los 7 puntos corregidos.
- [x] Build + lint + tests OK (lint sin errores; 129/129 tests de los 9 specs tocados en verde; build sin errores).
- [x] Plan actualizado: F2 → ✅.
- [x] Maestro actualizado.

## Resultado

Los 7 hallazgos se corrigieron en el worktree `chat/690-audit-tests-f2-bugs-asserts-debiles`:

1. `attendances-data.facade.spec.ts` — reemplazado `of(...)` síncrono por `Subject` para poder verificar `syncing()===true` antes de resolver.
2. `sync-range-dialog.component.spec.ts` — corregido el caso "366 días" (usaba fechas que daban 365) con un año bisiesto real, y agregado el caso 367 inválido.
3. `error-handler.service.spec.ts` — usando `vi.useFakeTimers()`, se verifica que la segunda notificación idéntica dentro de 5s se dedupe y que después de 5s se vuelve a mostrar.
4. `permisos-roles.facade.spec.ts` y `vistas.facade.spec.ts` — agregado assert sobre `resourceId`/`payload` completo enviado a WAL (no solo `operation`).
5. `eventos-calendario.facade.spec.ts` y `notificaciones-admin.facade.spec.ts` — usando fake timers para avanzar el backoff de `withRetry`, se verifica que `errorHandler.showError` y `store.setError`/`store.error()` se ejecutan tras el fallo.
6. `admin-health-permissions.facade.spec.ts` — agregado assert de `store.loadError()===true` tras el error.
7. `rate-limit-events.facade.spec.ts` — agregado `toHaveBeenCalledWith(filter)` en `exportarCsv`.

Validación: lint verde, 129/129 tests (de los 9 specs tocados) en verde, build de producción sin errores.

## Tiempo estimado

~2h (7 fixes puntuales e independientes, ~15-20 min c/u).
