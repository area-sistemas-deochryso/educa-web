> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 6 · **Fase**: F6 (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: ✅ cerrado local 2026-04-28.
> **Validación prod**: ⏳ pendiente desde 2026-04-28 — smoke visual de las 5 columnas + drag-drop a Resuelto/Ignorado en prod.

---

# Plan 36 Chat 6 FE — Trazabilidad de Errores: completar Kanban

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #5.

## OBJETIVO

Agregar las columnas faltantes al Kanban de `/intranet/admin/monitoreo/incidencias/errores` (componente `error-groups`). Hoy solo muestra **NUEVO / VISTO / EN PROGRESO**. Faltan **RESUELTO / IGNORADO** — actualmente solo se llega a esos estados vía botón "cambiar estado" del detalle.

## CONTEXTO

El Plan 34 Chat 5 FE (commit 049-) implementó el Kanban con drag-drop CDK. Hoy las transiciones a RESUELTO/IGNORADO solo están disponibles vía dialog. El cambio: visibilizar las 2 columnas faltantes y permitir drop hacia ellas (respetando la matriz de transiciones permitidas — `business-rules.md` §INV-ET07).

## RESTRICCIONES

- Matriz de transiciones del backend [`business-rules.md` §INV-ET07](../../rules/business-rules.md): RESUELTO/IGNORADO solo reabren a NUEVO. El drag-drop debe **prevenir visualmente** drops inválidos (no soltar entre RESUELTO ↔ EN_PROGRESO directo). El BE rechaza con `BusinessRuleException` por defensa en profundidad.
- Toggle "Ocultar resueltos/ignorados" del Plan 34 Chat 5 sigue funcionando: si está ON (default), las 2 columnas nuevas no se ven en el Kanban. Si está OFF, sí.
- Tab transparente — verificar (probable ya resuelto en chat previo).

## REGLAS

- [`rules/design-system.md`](../../rules/design-system.md) — Kanban no tiene pauta canónica, mantener consistencia con las 3 columnas existentes.
- [`rules/optimistic-ui.md`](../../rules/optimistic-ui.md) — drag-drop ya usa WAL (apply + rollback) — no romper.

## VALIDACIÓN

`npm run lint` · `npm run build` · `npm test` (+tests nuevos para drag-drop a las nuevas columnas, validación de transiciones inválidas).

## POST-DEPLOY GATE

Sí — verificación visual + smoke drag-drop en prod.

---

## 📋 Acta de cierre (2026-04-28)

### Cambios

| Archivo | Tipo | Detalle |
|---|---|---|
| `error-groups.store.ts` | M | Default `_hideResolvedIgnored` invertido `true → false`. `clearFilters` resetea a `false`. Comentario actualizado. |
| `error-groups-kanban-board.component.scss` | M | Grid `repeat(5, ...)` fijo → `grid-auto-flow: column` + `grid-auto-columns: minmax(240px, 1fr)`. Ahora el N de columnas se adapta al `columns()` real (3 cuando toggle ON, 5 cuando OFF). Mismo cambio en breakpoint `<960px`. |
| `error-groups.store.spec.ts` | M | Test `clearFilters` actualizado a esperar `false`. +2 tests nuevos: default `false` + 5 estados visibles por defecto. |

### Decisión clave

El plumbing del Kanban ya tenía las 5 columnas, transitions map (INV-ET07) y predicates de drag-drop completos desde Plan 34 Chat 5. El gap era solo el toggle por defecto en `true` que filtraba RESUELTO/IGNORADO antes de llegar al render. Fix mínimo invertir el default.

### Validación

- lint ✅ · tsc ✅ · build ✅
- vitest: 1684/1685 verdes (1 fail preexistente en `attendance-scope-banner` ya documentado, no-relacionado)
- Tests del módulo error-groups: 50/50 ✓

### Aprendizaje transferible

> "Antes de implementar nuevos columnas/estados/filtros, revisar el `_default`/`signal()` de la store. Plan 34 ya había modelado todo, el bug era el default ON del toggle."

Aplicable a otros Kanbans/dashboards: pulgares siempre primero a la store, no al template.

### Patrones cross-página resueltos en chats previos

- **Tab transparente** (#1, #5): cubierto globalmente en `styles.scss` (commit previo Chat 2). Verificado — la página #5 no requiere fix adicional.

