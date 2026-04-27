> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 6 · **Fase**: F6 (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: ⏳ pendiente arrancar.

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
