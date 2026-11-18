---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/styles/tokens.css
  - src/app/shared/components/skeleton-loader/
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F4.
> **Created**: 2026-11-18 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Utilidades compartidas de hover/press, fade skeleton→contenido, stagger en listas cortas y feedback de guardado; aplicar primero a login, asistencia y calificaciones. Depende de F1 y F3 (briefs 935, 937).

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` (decisiones: ≤200 ms, solo `transform`/`opacity`, reduced-motion obligatorio).
- Worktree en `EducaWeb/WT/educa-web/938-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree.

## CRITERIO DE CIERRE

- Utilidades documentadas y aplicadas en los 3 módulos iniciales.
- Solo `transform`/`opacity`; tiempos medidos en ms reales (Performance API), no por screenshot.
- Lista de módulos pendientes para siguientes lotes.
