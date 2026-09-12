# 665 — Audit F3: Condiciones de carrera por fetches sin cancelación

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F3)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**:
>   - `src/app/features/intranet/pages/admin/correlation/services/correlation.facade.ts`
>   - `src/app/features/intranet/pages/admin/attendance-panel/services/attendance-panel.facade.ts`
>   - `src/app/features/intranet/pages/admin/campus/services/campus-admin.facade.ts`
>   - `src/app/features/intranet/pages/admin/ayuda-tickets/services/ticket-bandeja.facade.ts`
>   - `src/app/features/intranet/pages/cross-role/attendance-reports/services/attendance-reports.facade.ts`
>   - `src/app/features/intranet/pages/admin/events-calendar/eventos-calendario.facade.ts`
>   - `src/app/features/intranet/pages/admin/rate-limit-events/services/rate-limit-events.facade.ts`
>   - `src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/services/correos-dia.facade.ts`

## Origen

Hallazgo de `/audit` (2026-09-12), categoría "Bug"/"Riesgo" — patrón repetido en ~9 facades distintos: fetch disparado sin `switchMap`/cancelación del request anterior, permitiendo que una respuesta vieja (más lenta) pise una más nueva.

## Scope

Mismo patrón, distinta severidad según el facade:

1. **`correlation.facade.ts:23-62` (`loadSnapshot`)** — se dispara desde cambio de ruta, polling de 30s y `visibilitychange` simultáneamente, sin cancelación.
2. **`attendance-panel.facade.ts:54-105` (`loadData`)** — cada cambio de sede/rango dispara un `forkJoin` nuevo sin cancelar el anterior.
3. **`campus-admin.facade.ts:105-131` (`loadPisoCompleto`)** — **más grave**: la carga del segundo piso se descarta silenciosamente si el primero seguía en vuelo, dejando `selectedPisoId` apuntando a un piso distinto de los datos mostrados en el editor 3D (riesgo real de editar el piso equivocado).
4. **`ticket-bandeja.facade.ts:49-128`** — mismo patrón.
5. **`attendance-reports.facade.ts`** — `usuario-report` sin debounce/`switchMap` en búsqueda por tecla (líneas ~85-100 del componente asociado); `generarReporte` sin guardia de re-entrada.
6. **`eventos-calendario.facade.ts:53-76,283-286`** — cambiar de año dos veces rápido puede pisar datos con una respuesta vieja llegando después.
7. **`rate-limit-events.facade.ts:41-42,77`** — el guard `if (loading) return` descarta la request en curso sin reintentar; cambiar de filtro mientras hay un fetch en vuelo deja la UI mostrando datos del filtro viejo sin loading/error que lo indique.
8. **`correos-dia.facade.ts:33-63`** — cambio rápido de fecha/sede puede dejar dos `forkJoin` en vuelo.

## Pre-work

- Fix recomendado uniforme: introducir un `Subject`/trigger + `switchMap` (o `AbortController` si se migra a `fetch`/`httpResource()`) en cada facade, cancelando el request anterior antes de lanzar el nuevo.
- Priorizar el fix de **campus-admin** (punto 3) primero — es el único con impacto funcional directo verificable (editor 3D mostrando el piso equivocado); el resto es mayormente edge case de UI desincronizada.
- No es necesario unificar los 8 en un único PR — se pueden resolver incrementalmente, pero todos comparten el mismo patrón de fix, así que conviene hacerlos en la misma sesión para no repetir el research del patrón.

## Out of scope

- El resto de hallazgos del audit (ver plan).
- No introducir un helper/abstracción compartida para "fetch cancelable" salvo que al resolver los 8 casos surja naturalmente un patrón idéntico reutilizable — no diseñar la abstracción de antemano.

## Criterio de cierre

- [ ] Los 8 puntos corregidos con `switchMap`/cancelación equivalente.
- [ ] Punto 3 (campus-admin) verificado en vivo: cambiar de piso rápidamente varias veces, confirmar que el editor 3D siempre muestra el piso seleccionado real.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F3 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~2h30 (8 fixes del mismo patrón + verificación).
