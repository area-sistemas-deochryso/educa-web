---
exclusive: false
isolation: worktree
touches:
  - src/app/app.config.ts
  - src/styles.scss
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F2.
> **Created**: 2026-11-18 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Activar `withViewTransitions()` con fade entre páginas, sin romper la View Transition manual de `ayuda-qa` (`.faq-vt`). Depende de F1 (brief 935).

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` (decisiones: ≤200 ms, solo `transform`/`opacity`, reduced-motion obligatorio).
- Worktree en `EducaWeb/WT/educa-web/936-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree.

## CRITERIO DE CIERRE

- Fade visible entre rutas; reduced-motion lo desactiva.
- `ayuda-qa` conserva su transición propia sin regresión.
- Probado en iPhone real (PWA) y en navegador sin soporte (degrada sin error).
