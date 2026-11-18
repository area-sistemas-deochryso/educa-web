---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/components/toast-container/
  - src/app/features/intranet/shared/components/layout/intranet-layout/components/mobile-menu/
  - src/app/features/intranet/shared/components/layout/intranet-layout/components/module-selector/
  - src/app/features/intranet/shared/components/layout/intranet-layout/components/user-profile-menu/
  - src/app/features/intranet/shared/components/floating-notification-bell/components/notification-card/
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F3.
> **Created**: 2026-11-18 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Aplicar `animate.enter`/`animate.leave` a toasts, modales, mobile-menu, module-selector, user-profile-menu y notification-card con los tokens de F1. Depende de F1 (brief 935).

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` (decisiones: ≤200 ms, solo `transform`/`opacity`, reduced-motion obligatorio).
- Worktree en `EducaWeb/WT/educa-web/937-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree.

## CRITERIO DE CIERRE

- Cada overlay anima entrada y salida; el nodo se remueve al terminar.
- Specs ajustados donde esperaban remoción inmediata (con el motivo citado).
- Reduced-motion: sin animación, remoción inmediata.
