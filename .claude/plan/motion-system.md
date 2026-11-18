# F10 — Motion system (animaciones y transiciones)

> **Creado**: 2026-11-18 · **Scope**: solo FE (`educa-web`). Sin cambios de BE ni contratos.
> **Decisiones del usuario**: opciones A+B+C+D de la investigación; F (librería: `motion`/GSAP/Lottie) se evalúa **después** de cerrar estas cuatro. E (quitar `@angular/animations`) queda como deuda anotada, no incluida.

## Problema

Hoy la intranet casi no tiene motion sistémico: ~75 `@keyframes`/`transition:` sueltos por componente, 5 `transition: all` en `styles.scss`, sin tokens de duración/easing, `prefers-reduced-motion` en solo 3 sitios, y los ~1645 `@if` / ~406 `@for` entran y salen del DOM sin efecto. Solo existe una View Transition (manual, en `ayuda-qa`). `provideAnimationsAsync()` está cargado sin ningún `trigger(`.

## Decisiones

| Decision | Choice | Why |
|---|---|---|
| Estilo | Sutil: ≤200 ms, fades y desplazamientos ~8 px | Intranet de uso diario; móvil/PWA |
| Propiedades animables | Solo `transform` y `opacity` | Rendimiento en móvil; nunca `all`, `width`, `height` |
| Entrada/salida de nodos | `animate.enter` / `animate.leave` (API nativa) | Sin depender de `@angular/animations` (deprecado) |
| Navegación | Fade de entrada en CSS puro (`.intranet-content > router-outlet + *`), solo opacity | `withViewTransitions()` descartado: el router llama a `startViewTransition` en toda navegación y abortaría la transición manual de `ayuda-qa` (ver brief 936) |
| Alcance F4 | 2-3 módulos primero (login, asistencia, calificaciones) y luego escalar | Evita un barrido masivo sin evidencia |
| Reduced-motion | Obligatorio y global desde F1 | A11y; ver `reference/a11y.md` |
| `@angular/animations` | No se toca | Fuera de alcance (opción E no elegida) |

## Fases funcionales

### F1 — Tokens de motion + reduced-motion global
`depends_on: []` · brief 935

Tokens `--motion-fast` (120 ms), `--motion-base` (200 ms), `--motion-slow` (320 ms), `--ease-out`, `--ease-in-out` en `edu-ui`. Regla global `prefers-reduced-motion`. Reemplazo de los `transition: all` de `styles.scss` por propiedades explícitas. Cierre: `grep "transition: all"` = 0 en `styles.scss`; con reduced-motion ninguna animación corre.

### F2 — Fade de entrada entre páginas
`depends_on: [F1]` · brief 936 · ✅ awaiting-prod

`@keyframes page-enter` aplicado al componente que monta el router-outlet de primer nivel de `.intranet-content` (0.2 s, `--ease-out`, solo opacity). Reemplaza el plan original de `withViewTransitions()`: el router lanza una View Transition en toda navegación, incluso de query params, y abortaría la manual de `ayuda-qa`. Verificado en vivo, sin regresión en `ayuda-qa`.

### F3 — Entrada/salida de overlays con `animate.enter`/`animate.leave`
`depends_on: [F1]` · brief 937 · ✅ awaiting-prod (parcial) · resto: brief 939

mobile-menu, module-selector y notification-card ✅ (enter+leave con tokens). Toasts, popover (user-profile-menu) y modales viven en `edu-ui` (vendored desde `educa-libs`, hoy sin animación) y pasan al brief 939. Riesgo: `animate.leave` retrasa el borrado del nodo; ajustar specs que esperan remoción inmediata, citando el motivo.

### F4 — Micro-interacciones
`depends_on: [F1, F3]` · brief 938 · ✅ awaiting-prod

Utilidades `.motion-press`/`.motion-fade-in`/`.motion-stagger-item`/`.motion-saved` en `styles.scss`, aplicadas en login, asistencia y calificaciones (módulos pendientes listados en el brief). Diseño original:

Utilidades compartidas: hover/press en botones y cards, fade skeleton→contenido, stagger en listas cortas, feedback "guardado". Primero login, asistencia y calificaciones. Medir en ms reales (Performance API), no por percepción.

## Después

Evaluar **F** (librería de motion) solo si F1-F4 dejan casos que CSS/`animate.*` no resuelven. Opcional: regla stylelint que prohíba `transition: all`.
