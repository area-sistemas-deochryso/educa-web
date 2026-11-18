---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F1.
> **Created**: 2026-11-18 · **Estado**: ✅ F1 cerrada localmente (commit en `chat/935-fe-f10-tokens-reduced-motion`).
> **Validación prod**: ⏳ pendiente desde 2026-11-18
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Crear tokens de motion en `:root` de `src/styles.scss` (no en `edu-ui`: está vendorizado desde `educa-libs`), regla global `prefers-reduced-motion` y eliminar los `transition: all` de `styles.scss`.

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` (decisiones: ≤200 ms, solo `transform`/`opacity`, reduced-motion obligatorio).
- Worktree en `EducaWeb/WT/educa-web/935-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree.

## CRITERIO DE CIERRE

- `grep "transition: all" src/styles.scss` = 0.
- Con reduced-motion activo ninguna animación/transición corre (verificado en vivo).
- `bun run lint` y build verdes.

## ESTADO DE EJECUCIÓN (2026-11-18)

- ✅ Tokens `--motion-*` + reduced-motion global en `styles.scss`; 5 `transition: all` reemplazados por propiedades explícitas.
- ✅ `bun run build` verde; CSS compilado: 0 `transition:all`, tokens y regla reduced-motion presentes.
- ✅ En vivo (dev server del worktree, `/intranet/login`): `--motion-slow` = .32s; botón "Ingresar" con `transition-property` explícito (color, background-color, border-color, box-shadow, opacity, transform); hover aplica sin error.
- ⚠️ Reduced-motion: la regla está cargada en el CSSOM, pero no se pudo activar la preferencia del SO desde la automatización → no se observó su efecto real. Probar a mano (DevTools > Rendering > Emulate prefers-reduced-motion).
- ⚠️ No se revisaron botones de otras pantallas de la intranet (requieren login/BE); riesgo residual de componentes que dependían del `all` implícito.
- ✅ Lint: 54 errores previos en 7 specs corregidos en commit aparte (`test(lint)`); lint sin errores (quedan 12 warnings previos), 4450 tests OK.
- ⏳ Pendiente (awaiting-prod): probar reduced-motion a mano y revisar botones de la intranet con login; se cubre también en F2 (brief 936).
