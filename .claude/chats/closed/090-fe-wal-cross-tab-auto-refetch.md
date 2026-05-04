> **Creado**: 2026-05-04 · **Estado**: ⏳ activo (running) — promovido directo desde tasks vía `/go`.

# 090 · FE: WAL — refetch automático del follower cross-tab tras commit del leader

## Contexto

**Origen**: Finding F-S06 del WAL Integration Smoke Test 1ra ronda (chat 087, commit `9c39d40`).
**Detalle**: `.claude/tasks/wal-cache-audit-fixes.md` → sección "Findings menores 1ra ronda smoke (2026-05-04)".
**Repo**: `educa-web` (branch `main`).

## Síntoma

Caso 6 del smoke (cross-tab leader/follower):

- Tab A (leader) procesa el WAL queue y commitea una entry encolada por Tab B.
- El follower (Tab B) recibe el evento, invalida la SW cache vía `invalidateForCrossTab`.
- **Pero el store del componente del follower NO se refetcha**. La fila final aparece consistente solo cuando el follower hace un GET nuevo (refresh manual o navegación).

Decisión actual: by-design del facade. La invalidación de SW cache no implica refetch del estado del componente.

## Punto de entrada

Cablear el observable `entryCommittedByOtherTab$` del WAL (o equivalente que dispara el follower) a `silentRefreshAfterCrud` (o mecanismo equivalente) en el facade CRUD que lo necesite.

Confirmar nombre exacto del observable y del helper de refetch en la fase `/investigate`.

## Decisión clave (a resolver en `/design` ANTES de implementar)

| Opción | Qué implica |
|---|---|
| **(a) BaseCrudFacade global** | Wiring en la base class. Todos los CRUD admin cross-tab refetchean automático. Flag opt-out por facade para casos donde no aplica. |
| **(b) Opt-in por facade** | Cada facade que quiere UX cross-tab inmediata se subscribe explícitamente. Más boilerplate, control granular. |

**Sugerencia inicial**: (a) con flag opt-out — la mayoría de los CRUD admin se benefician de refetch cross-tab inmediato; las excepciones (listas pesadas, paginadas server-side) declaran opt-out.

Confirmar/refutar tras leer BaseCrudFacade y los consumers actuales del observable.

## Plan

### Fase 1 — `/investigate`
- Localizar el observable cross-tab en `@core/services/wal/` (probable: `WalSyncEngine` o `WalFacadeHelper`)
- Mapear consumers actuales de `entryCommittedByOtherTab$` (si los hay)
- Leer `BaseCrudFacade` (`@core/services/facades/base-crud.facade.ts`) y entender:
  - Hook actual de refresh post-CRUD (`silentRefreshAfterCrud` o similar)
  - Cómo se inyectan dependencias del WAL en la base
  - Costo de un refetch (¿es un GET completo? ¿paginado? ¿pesado?)
- Inventariar los CRUD facades concretos que extienden BaseCrudFacade

### Fase 2 — `/design`
- Decidir (a) vs (b) con justificación basada en el inventario de Fase 1
- Definir contrato: signature del flag opt-out (si va por a), o método público para opt-in (si va por b)
- Identificar dónde documentar: `rules/optimistic-ui.md` o `rules/crud-patterns.md`

### Fase 3 — `/execute`
- Implementar el wiring acordado
- Test unitario que cubra:
  - Tab follower recibe `entryCommittedByOtherTab$` → dispara refetch del store
  - Flag opt-out (si va por a) suprime el refetch
- Documentar la decisión en la regla acordada

### Fase 4 — `/validate`
- `npm run lint` + `npm test`
- Smoke manual: 2 tabs en `/intranet/admin/cursos`, crear curso desde Tab B, Tab A procesa la queue, **Tab B refresca solo sin acción manual**

## Criterios de cierre

- [ ] Caso 6 del WAL smoke pasa: Tab B sin acción manual ve la fila actualizada tras el commit del leader
- [ ] Test unitario que cubre el wiring del observable (al menos 2 paths: refetch disparado + opt-out si aplica)
- [ ] Decisión (a) vs (b) documentada en `rules/optimistic-ui.md` o `rules/crud-patterns.md`
- [ ] Smoke manual confirmado en `/intranet/admin/cursos`

## Archivos esperados

- `src/app/core/services/facades/base-crud.facade.ts` (si va por a)
- `src/app/core/services/facades/base-crud.facade.spec.ts` (test)
- `src/app/core/services/wal/wal-sync-engine.service.ts` (referencia, probablemente sin cambios)
- `.claude/rules/optimistic-ui.md` o `.claude/rules/crud-patterns.md` (documentación)

## MODO SUGERIDO

`/investigate` → `/design` → `/execute` → `/validate`

## Resultado final (2026-05-04)

Alcance ampliado mid-flow tras detectar que solo 2 facades extienden `BaseCrudFacade` pero hay 24 archivos que usan `wal.execute`. Decisión: opción **C** del usuario — helper genérico ahora, wiring masivo en chat siguiente.

**Entregado en este chat**:
- Helper genérico `WalCrossTabRefetchService` (`@core/services/wal/wal-cross-tab-refetch.service.ts`).
- `BaseCrudFacade.initCrossTabRefetch()` refactorizado para usar el helper.
- Cableado en los 2 facades que extienden `BaseCrudFacade`: `cursos`, `vistas`.
- Doc en `rules/optimistic-ui.md` § "Refetch cross-tab tras commit del leader" (incluye snippet copy-paste para facades que no extienden BaseCrudFacade).
- Tests cross-tab (3) en `cursos.facade.spec.ts`.
- Brief 091 con inventario completo y priorizado de los 16+5 facades restantes (wirear / skip).

**Handoff**: `chats/open/091-fe-wal-cross-tab-wire-remaining-facades.md`.
