---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE). `educa-libs` no se tocó.
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F3b (resto de F3).
> **Created**: 2026-11-18 · **Estado**: ✅ F3b cerrada localmente (commit en `chat/939-fe-f10-edu-ui-overlays-motion`), con alcance reducido.
> **Validación prod**: ⏳ pendiente desde 2026-11-18
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Completar F3 (brief 937) con los overlays que viven en `edu-ui`, hoy sin ninguna animación: toast, popover (usado por `user-profile-menu`), dialog y confirm-dialog. Mismos criterios de 937: `animate.enter`/`animate.leave`, tokens de F1, solo `transform`/`opacity`, ≤200 ms, reduced-motion.

## RESULTADO (alcance real)

Al arrancar se descubrió que el brief partía de dos premisas falsas:

1. **`educa-libs` compila con Angular 19.2** (peer `>=19.0.0`); `animate.enter/leave` existe desde 20.2, así que no se puede usar en la librería. Decisión del usuario: solo entrada, en CSS desde `educa-web`, sin tocar `educa-libs` (que además tenía un cambio ajeno sin commitear en `edu-autocomplete.ts`).
2. **Dialog y popover ya tienen entrada y salida completas** en `edu-ui` (`data-open` + `transition` 180/120 ms + `waitForTransition` antes de `dispose`; ver `edu-overlay-handle.ts`). El diagnóstico previo solo buscó `@keyframes`/`animation:` y no `transition`. Solo el **toast** no animaba.

**Hecho**: `src/styles.scss` — `toast-enter-top`/`toast-enter-bottom` sobre `.edu-toast__item` (200 ms, opacity + translateY 8 px, fill `backwards`; el transform va en el item porque `.edu-toast` usa transform para centrarse).

**Verificado en vivo** (profesor de prueba, local, `UseTestEnv=true`): al guardar asistencia el toast «Éxito: Asistencia registrada exitosamente» aparece en `top-right` con `toast-enter-top` de 200 ms. No verificado: variante `bottom-*` y ms de frame (Chrome automatizado con frames lentos).

## DEUDA CONOCIDA

- **Salida animada del toast** (severidad: low): sigue inmediata porque el `@for` de `edu-toast` quita el nodo al expirar. Arreglarla exige editar `educa-libs` (flag de cierre + `animationend`, compatible con Angular 19) o subir la librería a Angular 20.2+ para usar `animate.leave`. Hay además un `edu-autocomplete.ts` modificado sin commitear en `educa-libs` ajeno a F10.
- Las duraciones de dialog (180 ms) y popover (120 ms) siguen hardcodeadas en la librería y no usan los tokens `--motion-*`.

## PRE-WORK OBLIGATORIO

- `edu-ui` está vendored desde `educa-libs` (hermano de `EducaWeb`, fuera de `WD/`): **editar la fuente en `educa-libs` y resincronizar**, nunca la copia de `src/app/shared/edu-ui` (la próxima sincronización la pisa). Ver memoria `reference_educa-libs-and-eduui-vendored`.
- Leer `edu-toast.ts`, `edu-popover.ts`, `edu-dialog.ts`, `edu-overlay-handle.ts`: el nodo lo crean estos componentes, no `toast-container` ni `user-profile-menu`.
- Los tokens `--motion-*` viven en `src/styles.scss` de `educa-web` (no en `edu-ui`): decidir si `edu-ui` los consume con fallback o los define.
- `edu-dialog.spec.ts` y `edu-confirm-dialog.spec.ts` pueden esperar remoción inmediata: ajustar citando el motivo.

## CRITERIO DE CIERRE

- Toast, popover y dialogs animan entrada y salida; el nodo se remueve al terminar.
- Reduced-motion: sin animación, remoción inmediata.
- Fuente en `educa-libs` y copia en `educa-web` coinciden tras el resync.
