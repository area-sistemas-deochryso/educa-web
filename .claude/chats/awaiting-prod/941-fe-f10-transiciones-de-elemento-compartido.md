---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
  - src/app/core/helpers/
  - src/app/shared/edu-ui/
  - src/app/features/intranet/pages/cross-role/ayuda/sections/ayuda-qa/
hot-paths: []
---

> **Repos afectados**: `educa-web` y `educa-libs` (fuente de `edu-ui`, hermano de `EducaWeb`, fuera de `WD/`).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F6 (transiciones de elemento compartido).
> **Created**: 2026-11-18 · **Estado**: ✅ cerrado localmente 2026-11-18.
> **Validación prod**: ⏳ pendiente desde 2026-11-18
> **MODO SUGERIDO**: `/design` (obligatorio: toca 3+ archivos y decide arquitectura en dos repos) → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Pedido del usuario tras probar F5: animaciones entre páginas «mejor hechas»; que el elemento que enlaza una página con otra, o con un modal, esté animado al abrir, cerrar o cambiar. Decisiones ya tomadas:

1. **Alcance de páginas**: ambas familias — lista → detalle (fila/tarjeta que se transforma en el encabezado del detalle) y menú/hub → página (tarjetas de módulos que se expanden). Con una directiva/utilidad reutilizable, no ad hoc por página.
2. **Modales**: el modal «nace del botón»: se abre escalando desde la posición del disparador y vuelve a él al cerrar. Requiere tocar `edu-dialog` en `educa-libs` (Angular 19: sin `animate.*`; CSS + estado + `animationend`/`waitForTransition`) y resincronizar la copia vendored. **Editar la fuente en `educa-libs`, nunca la copia de `src/app/shared/edu-ui`** (memoria `reference_educa-libs-and-eduui-vendored`).

## PUNTO DE PARTIDA (hechos de F5, brief 940)

- Hay `withViewTransitions({ skipInitialTransition: true })` y `provideViewTransitionGuard()` (`core/helpers/view-transition-guard.ts`) que omite la transición en navegaciones de solo query params.
- `ayuda-qa.component.ts` (~205-240) ya hace un elemento compartido manual: `view-transition-name: faq-q` asignado al origen antes de navegar y al destino en el callback, con la clase `faq-vt` en `<html>` para ajustar duraciones. Es la referencia de patrón; hoy usa su propia `startViewTransition` (el guard la deja pasar porque no hay navegación en curso).
- `view-transition-name` debe ser único en el documento en cada captura: con listas, solo el elemento clicado lo lleva.
- `edu-dialog`/`edu-popover` ya animan por `data-open` + transición 180/120 ms + `waitForTransition` en `edu-overlay-handle.ts`.

## DECISIONES A TOMAR EN `/design`

- API de la utilidad: directiva `[sharedElement]="id"` que marca el origen al click (antes de navegar) y el destino al montar; cómo se limpia el nombre tras `finished`; interacción con el guard (la navegación sí es cambio de path, así que el router crea la transición: basta con que el nombre esté puesto antes del `startViewTransition`).
- Modal desde el botón: cómo pasa `edu-dialog` el rect/elemento del disparador (opción de `open()`, `document.activeElement` o clic previo), animación con `transform` desde el rect (FLIP) o con View Transitions sobre el dialog; qué pasa si el disparador ya no está en pantalla al cerrar (fallback a la animación actual).
- `position: fixed` y containing block: el dialog ya es `fixed`; cuidado con transforms en ancestros.
- Reduced-motion: sin morph (la regla global y el bloque `::view-transition-*` ya anulan; verificar para el dialog).
- Lista de páginas/módulos con enlace lista→detalle y hub→página que entran en esta fase (inventariar con Grep de rutas hijas y `routerLink`); empezar por 2-3 y escalar.

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md`, brief 940 en `awaiting-prod/` (diseño de F5) y `ayuda-qa.component.ts`.
- Leer `edu-dialog.ts`, `edu-overlay-handle.ts` en `educa-libs` (y la copia vendored para comparar); verificar si `educa-libs` tiene cambios sin commitear ajenos (`edu-autocomplete.ts` los tenía) antes de editar.
- Worktree en `EducaWeb/WT/educa-web/941-...` con junction de `node_modules`; verificación en vivo en local con `UseTestEnv=true`, nunca en prod. Medir ms reales con Performance API.

## CRITERIO DE CIERRE

- Al navegar de una lista a su detalle y de un hub a su página, el elemento enlazado se transforma entre ambas; al volver, regresa.
- Un modal se abre desde su botón y se cierra hacia él; si el botón no está visible, cae a la animación actual.
- Sin regresión: FAQ de Ayuda, cambios de query param sin transición, modales/FAB, reduced-motion sin animación.
- Fuente en `educa-libs` y copia en `educa-web` coinciden; lint 0 errores, build verde, specs de lo tocado pasando.

## RESULTADO

**Decisión que cambió el brief**: la copia vendored de `edu-ui` está adelantada a `educa-libs` (el dialog vendored tiene `data-open`, confirmación de cambios sin guardar y `EduButton`; la fuente no). Resincronizar la habría pisado, así que por decisión del usuario F6 editó **solo la copia vendored** y `educa-libs` no se tocó.

**Hecho**:
- `core/helpers/shared-element.service.ts` (+ spec, 3 tests, exportado por el barrel): pone `view-transition-name` solo durante la navegación (click en origen, registro del destino, `NavigationStart` para la vuelta) y lo retira al terminar; se engancha con `onViewTransitionCreated` en `app.config.ts`.
- Directiva `[appSharedElement]` en `features/intranet/shared/directives/`; `data-shared-skip` excluye enlaces que van a otro sitio.
- Piloto: `curso-pair-card` → `curso-hub-header` (profesor y estudiante; `pairKey` del shell pasó a `protected`).
- `styles.scss`: grupo `*.shared-element` con `--motion-slow`; reduced-motion ya anulaba `::view-transition-*`.
- Modal que nace del botón: `EduOverlayHandle` (opción `originFromTrigger`, `syncOrigin` fija `--edu-origin`/`--edu-origin-scale` desde el foco previo al abrir y al cerrar) y `edu-dialog` (anima `scale`/`opacity` con tokens; ya no `transform`, que pisaba el arrastre).

**Verificado**: lint 0 errores (12 warnings previos), build OK, 4457 tests pasan. En vivo (worktree :4202, `UseTestEnv=true`): ida y vuelta curso→hub nombra origen y destino, grupo de 320 ms, sin nombres residuales; FAQ de Ayuda intacta; diálogo «Editar semana» abre con origen en el centro del botón (904px 326px), transición 0.2 s, Escape cierra y devuelve el foco.

**No verificado**: ms reales en Chrome normal, reduced-motion real, Firefox (fallback), modal con botón fuera de pantalla (fallback centrado, solo por código), hub→página del home.

## DEUDA CONOCIDA

- **Segundo piloto sin hacer** (severidad low): el brief pedía 2-3 enlaces; solo entró curso→hub. Falta un hub→página (p. ej. widgets del home) y otras listas→detalle; la API ya escala (`[appSharedElement]` con el mismo id en ambos extremos).
- **`educa-libs` desincronizada de la copia vendored de `edu-ui`** (severidad medium): la fuente carece de `data-open`/choreography del handle, confirmación de cierre en el dialog, etc. Ningún resync debe pisar la copia; hay que reconciliar `educa-libs` aparte. `educa-libs` además tiene un cambio ajeno sin commitear en `edu-autocomplete.ts`.
- El nombre de transición depende de que el origen sea un enlace (`a[href]`) dentro del host; botones que navegan por `router.navigate` no activan el morph.
