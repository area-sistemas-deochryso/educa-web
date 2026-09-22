# 665 — Audit F3: Condiciones de carrera por fetches sin cancelación

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F3)
> **Creado**: 2026-09-12 · **Estado**: ✅ cerrado localmente.
> **Validación prod**: ⏳ pendiente desde 2026-09-12 — verificación visual del punto 3 (`campus-admin`) se hizo en local contra `TestConnection`, falta confirmar en `educa.com.pe/intranet` real.
> **Nota 2026-09-17**: no se pudo forzar una race condition en prod tras el deploy — estado incierto, sin evidencia de falla ni de éxito. Sigue pendiente.
> **Cierre sin verificación post-deploy (2026-09-22)**: movido a `closed/` por decisión explícita del usuario, sin pasar por `/verify`. Estado real seguía "incierto" al momento del cierre — el fix (patrón `switchMap`) está validado por código y por tests, pero nunca se confirmó ni se refutó una race condition real en prod. Riesgo residual: si reaparece un síntoma de datos stale en alguno de los 9 facades tocados, revisar acá primero.
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

## Nota — bloqueo de BE resuelto (2026-09-12)

El bug de backend descubierto verificando en vivo el fix de `campus-admin.facade.ts` (`GET /api/campus/pisos` → 400 con cualquier sede) está resuelto: `Educa.API` brief [668](../../../../Educa.API/.claude/chats/running/668-be-fix-linq-selectmany-distinct-groupby-campus-pisos.md), fix + tests de regresión + verificado en vivo (200 OK contra `TestConnection`). Ya no bloquea la verificación visual de este punto (#3, `campus-admin.facade.ts`).

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

- [x] Los 8 puntos corregidos con `switchMap`/cancelación equivalente.
- [x] Punto 3 (campus-admin) verificado en vivo: cambiar de piso rápidamente varias veces, confirmar que el editor 3D siempre muestra el piso seleccionado real. Verificado 2026-09-12 contra `TestConnection` (local, `UseTestEnv=true`) con 2 pisos de prueba (`TEST-Piso 1`/`TEST-Piso 2`) — 4 clicks alternados rápidos, el header y el ítem resaltado en la lista quedaron consistentes con el piso final, sin errores de consola.
- [x] Build + lint + tests OK. Lint: 0 errores. Build: verde (9 rutas prerenderizadas, sin errores, solo warnings `NG8113` preexistentes). Tests: 2573/2573 verdes.
- [x] Plan actualizado: F3 → ✅.
- [x] Maestro actualizado.

## Tiempo estimado

~2h30 (8 fixes del mismo patrón + verificación).
