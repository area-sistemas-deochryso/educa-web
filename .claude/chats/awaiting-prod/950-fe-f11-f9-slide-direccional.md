---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
  - src/app/app.config.ts
  - src/app/core/helpers/
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 8 · **Fase**: F9 · **Creado**: 2026-11-20 · **Estado**: ✅ implementado (commit `1684734d` en `chat/950-fe-f11-f9-slide-direccional`).
> **Validación prod**: ⏳ pendiente desde 2026-11-20 — verificación manual del usuario (desktop/móvil/reduced-motion en `/intranet/admin/cursos` y `/intranet/asistencia`) y `/wt-merge` previo.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate`.
> **modules**: `ui` (motion, router).

---

# F11 F9 — Slide direccional entre páginas (avance vs. retroceso)

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F9 (`depends_on: [F1]`). F1-F7 ✅ en `awaiting-prod/` (943-949; F7 commit `478f383e`). F8 (propagación de modales) sigue bloqueada por la medición del desenfoque y **no** es prerrequisito de F9: F9 no toca `edu-dialog`. El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

1. Avanzar y retroceder entre páginas se **distinguen visualmente**: la dirección se deriva de la **jerarquía de rutas**; la página nueva entra desde el lado y la anterior se desplaza menos y se oscurece.
2. Respetar el wrapper de **query params** (no animar navegaciones de solo query params) y los **elementos compartidos** de F10 F6 (la tarjeta que viaja no se rompe).
3. Sin View Transitions, el respaldo actual de F10 (`page-enter`, fade de entrada) sigue aplicando.

## MODO SUGERIDO

`/investigate` (qué es "avanzar"/"retroceder" en este router: jerarquía real de `intranet.routes.ts` y los hubs; qué da `onViewTransitionCreated` a mano; cómo conviven `root` y `*.shared-element`) → `/design` (toca 3+ archivos y decide cómo derivar la dirección) → `/execute` → `/validate`.

## PRE-WORK OBLIGATORIO

- Leer `src/styles.scss` ~líneas 94-119 (reglas actuales de `::view-transition-*`) y `src/_motion-expressive.scss` (tokens `--motion-*`, `--ease-spring`).
- Leer `src/app/app.config.ts` ~línea 63 (`withViewTransitions`), `core/helpers/view-transition-guard.ts` (+ spec) y `core/helpers/shared-element.service.ts` (+ spec).
- Referencia de patrón: `ayuda-qa.component.ts` (~205-240) pone una clase en `<html>` (`faq-vt`) para ajustar duraciones de una transición concreta.

## IMPLEMENTATION DETAIL (ADR-0006)

Hechos del código tal como estaba al 2026-11-20 (verificar, pueden cambiar):

- **Router**: `withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated: ({ transition }) => inject(SharedElementService).track(transition) })` en `app.config.ts`; luego `provideViewTransitionGuard()`.
- **Guard**: `withViewTransitions()` llama a `document.startViewTransition` en TODA navegación, incluso de solo query params; el guard parchea `startViewTransition` y omite esos casos. Cualquier clase de dirección que se ponga en `<html>` debe quitarse al terminar y **no** aplicarse cuando el guard omite.
- **CSS actual**: `::view-transition-old(root), ::view-transition-new(root)` solo hacen crossfade con `--motion-base`/`--ease-out`. `::view-transition-group(*.shared-element)` usa `--motion-slow`. El `@media (prefers-reduced-motion: reduce)` ya pone `animation: none` en `::view-transition-*`.
- **`onViewTransitionCreated`** recibe `{ transition, from, to }` (`ActivatedRouteSnapshot`): es el punto natural para calcular la dirección comparando `from`/`to`, sin tocar cada página.
- **Sin tocar aún**: nada de lo anterior se modificó en F1-F7.
- **Decisión abierta para `/design`**: cómo medir "más profundo = avanzar" (profundidad del path, `data` de la ruta, o pila de historial `navigation`). Documentar el caso de laterales (hermanos de un hub) y de `popstate`.

## HALLAZGOS Y DECISIONES DEL CHAT (2026-11-20, /investigate + /design)

- **Rutas planas, jerarquía en la URL**: todo cuelga del layout; `admin/cursos`, `profesor/cursos/:id/:salonId` (+ hijos tab hermanos). Dirección = **prefijo de segmentos del path** (destino extiende al origen → `forward`; origen extiende al destino → `back`). Sin `data.depth` ni pila de historial.
- **Decisión del usuario (A)**: navegación lateral entre hermanos (sin relación de prefijo) → **sin slide**, queda el crossfade actual. `popstate` no se trata distinto.
- **Punto de enganche**: wrapper de `document.startViewTransition` en `view-transition-guard.ts` (no `onViewTransitionCreated`): ya conoce destino y origen y decide si omite; la dirección se pone justo antes de `original(callback)` y se quita en `finished` (solo si sigue siendo la transición vigente).
- **`root` captura toda la página** (sidebar incluido): el slide va sobre `main.intranet-content` con `view-transition-name: page-content` puesto **solo durante** la transición (nombre permanente crearía containing block para `position: fixed`).
- Reduced-motion: no se marca dirección ni nombre. Login/logout (sin `.intranet-content`) quedan con el crossfade de `root`.
- `node_modules` está bloqueado por regla de denegación: la forma de `from`/`to` de `onViewTransitionCreated` no se verificó; el diseño no depende de ella.

## APRENDIZAJES TRANSFERIBLES (del chat 949)

- **`cmd.exe /c "..."` desde la herramienta Bash (Git Bash) no ejecuta nada**: abre una consola interactiva y termina con exit 0 o se cuelga. Typecheck y tests **solo con la herramienta PowerShell**: `cmd.exe /c "npm run test -- <ruta>"` y `cmd.exe /c "node node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit"`. Un "typecheck limpio" visto desde Bash no significa nada.
- Con `vi.useFakeTimers()`, lo que sigue a una promesa (p. ej. `waitForTransition().then(...)`) exige `await vi.advanceTimersByTimeAsync(...)`; el síncrono deja el estado a medias. jsdom no resuelve transiciones del SCSS: fijar `transition-duration` inline en el panel.
- Los estilos de pseudoelementos `::view-transition-*` y de nodos creados fuera del componente (backdrop de CDK) van en `src/styles.scss`, no en el SCSS del componente.
- Patrón de F4-F7: clase base = estado final, keyframes solo con `from`, fill-mode `backwards` (nunca `both`/`forwards`); sin ms ni curvas literales (tokens `--motion-*`, `--ease-out`).
- `window.matchMedia` en tests es `writable` (definido en `src/test-setup.ts`): se asigna directo y se restaura en `finally`.
- `eslint-config-guards.spec.ts` da timeout de 15 s dentro de una suite grande; pasa solo. Lint/build no corren con Node v20.19.6.
- El navegador automatizado (claude-in-chrome) se congela al capturar pantalla: para ver animaciones hace falta ventana visible o revisión manual.
- **Pendiente heredado de F7 (no bloquea F9)**: el usuario aún debe hacer la prueba manual de modales y medir el costo del desenfoque (`--edu-dialog-blur`); F8 no se aprueba sin eso.

## REGLAS OBLIGATORIAS

- Solo `transform` y `opacity` (y color); si se oscurece la página saliente, hacerlo con `opacity`/`filter` justificado, no con `backdrop-filter`. Tokens de F1 y fill-mode `backwards`.
- Reduced-motion: el global anula duración; con reduced-motion el contenido debe quedar en su sitio y legible, sin desplazamiento residual. El movimiento solo no comunica estado.
- No romper elementos compartidos (F10 F6) ni el guard de solo-query-params; sin soporte de View Transitions, el respaldo de F10 sigue igual.
- Cap 300 ln por archivo. Standalone, OnPush, signals, `inject()`. Código en inglés, UI en español, comentarios en español concisos.

## TESTS MÍNIMOS

- Spec de la utilidad que deriva la dirección: avance, retroceso, hermanos/lateral y solo-query-params (sin dirección).
- Verificar que la clase/atributo de dirección se limpia al terminar la transición y cuando el guard la omite.
- Verificación manual (desktop y móvil, y con `prefers-reduced-motion: reduce`): entrar a un detalle y volver, hub → página y volver, en `/intranet/admin/cursos` y `/intranet/asistencia`; confirmar que la tarjeta compartida sigue viajando.

## FUERA DE ALCANCE

- Revelado circular entre páginas (P2), barra de progreso de navegación (P3) y librerías externas de motion (descartados en el muestrario).
- Propagación de modales (F8) y cualquier cambio en `edu-dialog`.
- Reanimar lo que F10 ya anima con el mismo efecto; cambios de backend.

## VALIDACIÓN FINAL

- [x] Typecheck OK (PowerShell); tests de los helpers tocados en verde (23).
- [ ] Done-when del plan: avanzar y retroceder se distinguen visualmente; con reduced-motion el estado sigue legible.
- [ ] Verificación manual en `/intranet/admin/cursos` y `/intranet/asistencia`.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F9 ✅).
- [ ] Brief movido a `awaiting-prod/` o `closed/`.
- [ ] Commit final único con código, move del brief y maestro (sin `Co-Authored-By`).

## COMMIT MESSAGE sugerido

```
feat(ui): add directional page slide for forward and back navigation
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`.

## CIERRE

Pedir al usuario que navegue hacia adelante y hacia atrás (detalle y hub) en las páginas piloto, en desktop y móvil, y confirme que la dirección se lee y que la tarjeta compartida sigue viajando.
