---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
  - src/app/app.config.ts
  - src/app/core/helpers/view-transition-guard.ts
  - src/app/features/intranet/pages/cross-role/ayuda/
  - src/app/features/intranet/shared/components/curso-hub-tabs/
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F5 (transiciones entre páginas más visibles).
> **Created**: 2026-11-18 · **Estado**: ✅ F5 cerrada localmente (commit en `chat/940-fe-f10-transiciones-entre-paginas-mas-visibles`).
> **Validación prod**: ⏳ pendiente desde 2026-11-18
> **MODO SUGERIDO**: `/design` (obligatorio: toca decisiones de arquitectura) → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

El usuario probó F1-F4 en local y dijo: «no veo que hayan suficientes transiciones/animaciones entre páginas aún». Hacer que cambiar de página se note, sumando las cuatro mejoras que eligió:

1. **Movimiento en la entrada**: `translateY(8px)` junto al fade de `page-enter`, fill `backwards`.
2. **Pestañas de los shells**: extender el fade a los outlets anidados (curso-hub, shells de admin/profesor) sin re-animar al cambiar un query param.
3. **Entrada escalonada de secciones**: header y bloques principales con stagger (`.motion-stagger-item`, `--motion-stagger`).
4. **Salida de la página**: crossfade real con View Transitions.

## POR QUÉ F2 NO SE NOTA (hechos verificados)

- `styles.scss`: `.intranet-content > router-outlet + * { animation: page-enter var(--motion-base) var(--ease-out); }`, solo opacity, 200 ms.
- Solo anima el componente de primer nivel; los outlets anidados no se re-animan.
- No hay salida: la página anterior se destruye al instante.
- El `transform` se descartó en F2: crea un containing block y desplaza los `position: fixed` (modales, FAB) mientras dura la animación. Con fill `backwards` no queda transform al terminar, pero durante los 200 ms sí. **Decidir en `/design` si es aceptable** (probar con un modal abierto durante la navegación).

## RIESGO CLAVE — View Transitions (punto 4)

- El router llama a `document.startViewTransition` en TODA navegación al activar `withViewTransitions()`, incluso de query params (`_router-chunk.mjs`, `createViewTransition`); una llamada nueva aborta la activa. `skipNextTransition` no es API pública y `onViewTransitionCreated` corre tarde.
- `ayuda-qa` (`ayuda-qa.component.ts` ~205-240) navega dentro de su propia `startViewTransition` (`.faq-vt`, elemento compartido `faq-q`): la del router la abortaría. Opciones a evaluar en `/design`: reescribir esa página para usar la del router; o `onViewTransitionCreated` con un flag; o descartar el punto 4 y quedarse con 1-3. **No decidir por defecto: consultar al usuario** si se elige reescribir `ayuda-qa`.
- La solución debe respetar reduced-motion (la regla global ya anula animaciones; las View Transitions se controlan aparte, ver `.faq-vt` en `styles.scss`).

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` y los briefs 936 (decisión de diseño de F2) y 938 (utilidades `motion-*`) en `awaiting-prod/`.
- Worktree en `EducaWeb/WT/educa-web/940-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree. Medir ms reales (Performance API), no por percepción.

## CRITERIO DE CIERRE

- Navegar entre páginas de primer nivel, cambiar de pestaña en un shell y navegar dentro de `ayuda` se perciben animados, sin regresión en `ayuda-qa` ni en modales/FAB abiertos.
- Un cambio de query param no dispara animación de página.
- Reduced-motion: sin animación.
- Lint 0 errores, build verde y specs de los componentes tocados pasando.

## DISEÑO (2026-11-18, `/design`)

Decisiones del usuario: salida con View Transitions **sin reescribir `ayuda-qa`**; el movimiento va en los hijos internos, no en el contenedor de página (los `position: fixed` no se desplazan).

Hechos verificados:
- `app.config.ts` hoy NO usa `withViewTransitions()`; solo `ayuda-qa` llama a `document.startViewTransition` (componente en `pages/cross-role/ayuda/sections/ayuda-qa/`, no `pages/ayuda/`).
- El router llama `startViewTransition` en TODA navegación y `onViewTransitionCreated` corre DESPUÉS de crearla (`_router-chunk.mjs`): no sirve de flag, la transición manual de `ayuda-qa` ya habría sido abortada. No hay API pública para saltarla (`skipNextTransition` es interno).

Diseño:
1. **Salida/crossfade**: `withViewTransitions()` en `app.config.ts` + un wrapper de `document.startViewTransition` (provider `provideAppInitializer`) que, si la navegación en curso (`router.currentNavigation()`) solo cambia query params respecto de `router.url`, ejecuta el callback sin crear transición. Cubre `ayuda-qa` (su `startViewTransition` manual queda intacta) y cualquier filtro por query param. Duración del crossfade `::view-transition-old/new(root)` = `--motion-base`; reduced-motion: `animation: none`.
2. **Fallback CSS** (navegadores sin View Transitions): la regla de fade actual se extiende de `.intranet-content > router-outlet + *` a `.intranet-content router-outlet + *` (cubre outlets anidados: curso-hub, ayuda, pagos, asistencias, monitoreo). Con View Transitions activas el fade lo da el crossfade del navegador (clase `has-vt` en `<html>`), para no duplicarlo.
3. **Movimiento + stagger**: `motion-rise` en los hijos directos del componente de página (`router-outlet + * > :not(router-outlet):not(router-outlet + *)`), con `--i` por `:nth-child` (hasta 6) y `--motion-stagger`. Sin transform en el contenedor.
4. Sin cambios en `ayuda-qa` ni en el router de rutas.

Riesgos a validar en vivo: hijos con `position: fixed` directos del componente; doble animación en shells (excluida por el `:not`); crossfade de `root` con modal abierto; ms reales con Performance API.

## RESULTADO

**Hecho**: `app.config.ts` (`withViewTransitions({ skipInitialTransition: true })` + `provideViewTransitionGuard()`), `core/helpers/view-transition-guard.ts` (+ spec, 4 tests, exportado por el barrel) y `styles.scss` (crossfade `::view-transition-*` con tokens, fade de respaldo solo en `html:not(.has-vt)` sobre `.intranet-content router-outlet + *`, `motion-rise` escalonado en los hijos directos de la página con `--i` por `:nth-child`, reduced-motion). `ayuda-qa` no se tocó. Decisiones del usuario: wrapper en vez de reescribir `ayuda-qa`; movimiento solo en hijos internos (los `position: fixed` no se desplazan).

**Verificado en vivo** (admin, local, `UseTestEnv=true`, worktree en :4202): `has-vt` en `<html>`; navegación entre rutas crea View Transition; cambio solo de query param NO crea transición ni recrea el componente; la FAQ de Ayuda mantiene su transición manual (`faq-vt` + transición activa); cambio de pestaña del shell de Ayuda crea transición; hijos con `motion-rise` y delays 0–0,15 s. ESLint 0 errores, build OK, 321 tests de helpers+ayuda pasan.

**No verificado**: ms reales (Chrome automatizado limita frames), reduced-motion real, crossfade con un modal abierto, Firefox (usa el fallback de fade), otras páginas con hijos `position: fixed` directos del componente.

## DEUDA CONOCIDA

- El wrapper reemplaza `document.startViewTransition` (monkey-patch acotado). Reemplazar por la API del router cuando exponga un skip público (`skipNextTransition` es interno).
- El fade de respaldo para navegadores sin View Transitions no se probó en vivo.
- El frontmatter original apuntaba a `pages/ayuda/`; la ruta real es `pages/cross-role/ayuda/` (corregida arriba).
