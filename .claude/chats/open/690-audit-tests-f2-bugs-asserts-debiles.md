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

- [ ] Los 7 puntos corregidos.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F2 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~2h (7 fixes puntuales e independientes, ~15-20 min c/u).
