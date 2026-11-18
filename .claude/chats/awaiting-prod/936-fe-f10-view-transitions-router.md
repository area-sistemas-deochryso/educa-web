---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F2.
> **Created**: 2026-11-18 · **Estado**: ✅ F2 cerrada localmente (commit en `chat/936-fe-f10-view-transitions-router`).
> **Validación prod**: ⏳ pendiente desde 2026-11-18
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Fade de entrada entre páginas, sin romper la View Transition manual de `ayuda-qa` (`.faq-vt`). Depende de F1 (brief 935).

> **Decisión de diseño (2026-11-18)**: se descartó `withViewTransitions()`. El router llama a `document.startViewTransition` en toda navegación, incluso de query params (`_router-chunk.mjs:3653`), y `ayuda-qa` navega dentro de su propia transición manual: la del router la abortaría. `skipNextTransition` no es API pública. Se eligió **fade de entrada en CSS puro** sobre `.intranet-content > router-outlet + *` (solo opacity; un transform movería los `position: fixed`).

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` (decisiones: ≤200 ms, solo `transform`/`opacity`, reduced-motion obligatorio).
- Worktree en `EducaWeb/WT/educa-web/936-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree.

## CRITERIO DE CIERRE

- Fade visible entre rutas; reduced-motion lo desactiva (regla global de F1).
- `ayuda-qa` conserva su transición propia sin regresión.
- Ya no aplica iPhone/Safari: es CSS `animation` estándar, sin View Transitions.

## ESTADO DE EJECUCIÓN (2026-11-18)

- ✅ `@keyframes page-enter` + `.intranet-content > router-outlet + *` en `styles.scss` (0.2 s, `--ease-out`, solo opacity).
- ✅ En vivo (admin de prueba, dev server del worktree): `page-enter` corre en cada componente nuevo al navegar y al volver (`getAnimations()`); `ayuda-qa`: 1 `startViewTransition` (la manual), `.faq-vt` aplicado, `finished` = ok, shell no recreado, sin `page-enter`.
- ⚠️ No observado: efecto real de reduced-motion (la automatización no activa la preferencia del SO) y cambio de pestaña dentro de un shell (verificado solo por estructura: el selector solo matchea hijo directo de `.intranet-content`).
- ✅ Lint 0 errores (12 warnings previos), 4450 tests OK, build OK; CSS compilado contiene `page-enter`.
- ⏳ Pendiente (awaiting-prod): reduced-motion a mano (DevTools > Rendering) y cambio de pestaña dentro de un shell (pagos/monitoreo) para confirmar que no se re-anima.
