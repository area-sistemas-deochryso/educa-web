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
`depends_on: [F1]` · briefs 937 y 939 · ✅ awaiting-prod

mobile-menu, module-selector y notification-card ✅ (enter+leave con tokens). Toasts, popover (user-profile-menu) y modales viven en `edu-ui` (vendored desde `educa-libs`, hoy sin animación) pasaron al brief 939: ahí se vio que dialog y popover ya animan entrada y salida por sí mismos (`data-open` + transition) y que `educa-libs` usa Angular 19 (sin `animate.*`), así que solo se agregó la entrada del toast desde `styles.scss`. La salida del toast queda como deuda (ver brief 939). Riesgo: `animate.leave` retrasa el borrado del nodo; ajustar specs que esperan remoción inmediata, citando el motivo.

### F4 — Micro-interacciones
`depends_on: [F1, F3]` · brief 938 · ✅ awaiting-prod

Utilidades `.motion-press`/`.motion-fade-in`/`.motion-stagger-item`/`.motion-saved` en `styles.scss`, aplicadas en login, asistencia y calificaciones (módulos pendientes listados en el brief). Diseño original:

Utilidades compartidas: hover/press en botones y cards, fade skeleton→contenido, stagger en listas cortas, feedback "guardado". Primero login, asistencia y calificaciones. Medir en ms reales (Performance API), no por percepción.

### F5 — Transiciones entre páginas más visibles
`depends_on: [F2, F4]` · brief 940 · ✅ awaiting-prod

Tras probar F1-F4 el usuario no notó suficiente movimiento entre páginas. `withViewTransitions()` (crossfade de salida/entrada) con un wrapper que omite la transición en navegaciones de solo query params (protege la manual de `ayuda-qa`), `motion-rise` escalonado en los hijos directos de cada página y fade de respaldo sin View Transitions. Supera la decisión de F2 de no usar View Transitions. Deuda: el wrapper monkey-patchea `document.startViewTransition`.

### F6 — Elementos compartidos (página↔página y modal)
`depends_on: [F5]` · brief 941 · ✅ awaiting-prod

Pedido tras probar F5: el elemento que enlaza una página con otra (o con un modal) debe animarse al abrir, cerrar o cambiar. Dos mecanismos, mismo principio (el elemento clicado «se convierte» en lo que abre):

1. **Páginas** — una directiva marca el origen al hacer click y el destino al montarse con el mismo identificador; el nombre de transición solo existe durante la navegación (único en el documento) y se retira al terminar. Cubre lista→detalle y hub→página, ida y vuelta. Piloto: tarjeta de curso → encabezado del hub (profesor y estudiante); el resto escala sin cambiar la API.
2. **Modales** — el diálogo nace del botón que lo abrió (el foco previo) y vuelve a él al cerrar; si el botón ya no está visible cae a la animación genérica actual. Se anima con propiedades individuales (`scale`, `opacity`) para no chocar con el `transform` inline del arrastre.

Decisiones: la copia vendored de `edu-ui` está adelantada a `educa-libs` (el diálogo vendored tiene `data-open`, confirmación de cambios sin guardar y `EduButton`; la fuente no), así que F6 edita **solo la copia vendored** y registra la divergencia como deuda; no se resincroniza. Reduced-motion: sin morph (reglas globales existentes). Fuera de alcance: drawer/popover/toast, barrido de todas las listas.

## Después

Evaluar **F** (librería de motion) solo si F1-F4 dejan casos que CSS/`animate.*` no resuelven. Opcional: regla stylelint que prohíba `transition: all`.
