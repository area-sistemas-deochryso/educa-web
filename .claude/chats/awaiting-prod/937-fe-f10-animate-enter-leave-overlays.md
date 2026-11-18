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
> **Created**: 2026-11-18 · **Estado**: ✅ F3 cerrada localmente (commit en `chat/937-fe-f10-animate-enter-leave-overlays`); alcance reducido, resto en brief 939.
> **Validación prod**: ⏳ pendiente desde 2026-11-18
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Aplicar `animate.enter`/`animate.leave` a toasts, modales, mobile-menu, module-selector, user-profile-menu y notification-card con los tokens de F1. Depende de F1 (brief 935).

> **Alcance real (2026-11-18)**: toast, popover (`user-profile-menu`) y dialogs son componentes de `edu-ui` (vendored desde `educa-libs`) y su nodo no lo crean los archivos de `touches`. Por decisión del usuario, F3 cubrió solo `mobile-menu`, `module-selector` y `notification-card`; el resto pasa al brief 939.
>
> **Hecho**: `animate.enter`/`animate.leave` con tokens en `mobile-menu` (overlay + drawer, slide 300→200 ms) y `module-selector` (backdrop + panel); `animate.leave` en `notification-card` (la entrada escalonada `slideInRight` se dejó). Sin specs que ajustar (los 3 componentes no tienen).
>
> **Verificación en vivo** (admin, `UseTestEnv=true`): clases `*-enter`/`*-leave` aplicadas, panel 200 ms, nodos removidos al terminar. No verificado: `notification-card`, reduced-motion real y ms exactos de salida (en el Chrome automatizado los frames se frenan hasta ~1 s y `animationend` llega tarde; revisar en Chrome normal).

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` (decisiones: ≤200 ms, solo `transform`/`opacity`, reduced-motion obligatorio).
- Worktree en `EducaWeb/WT/educa-web/937-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree.

## CRITERIO DE CIERRE

- Cada overlay anima entrada y salida; el nodo se remueve al terminar.
- Specs ajustados donde esperaban remoción inmediata (con el motivo citado).
- Reduced-motion: sin animación, remoción inmediata.
