---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/
hot-paths: []
---

> **Repos afectados**: `educa-libs` (fuente de `edu-ui`, `C:\Users\Asus Ryzen 9\educa-libs`, fuera de `WD/`) y `educa-web` (copia vendored `src/app/shared/edu-ui`).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · deuda abierta por F3b (939) y F6 (941).
> **Created**: 2026-11-18 · **Estado**: ✅ cerrado 2026-11-19 (opción A: `edu-ui` vendored = única fuente; `educa-libs` congelada, sin port).
> **MODO SUGERIDO**: `/investigate` (medir la divergencia real y clasificarla) → `/design` → `/execute` → `/validate`.
> **modules**: `ui` (edu-ui).

## OBJETIVO

Hoy la copia vendored de `edu-ui` en `educa-web` está **adelantada** a su fuente en `educa-libs`. Si alguien aplica la regla de la memoria `reference_educa-libs-and-eduui-vendored` («editar la fuente y resincronizar»), el resync **pisa** trabajo ya en `main`: la coreografía `data-open` del handle de overlays (F3b), la confirmación de cierre con cambios sin guardar del dialog, el origen del modal desde su botón (F6) y todo lo que contenga el resto de archivos divergentes. Reconciliar para que haya una sola verdad y el resync deje de ser una trampa.

## PUNTO DE PARTIDA (hechos medidos el 2026-11-18)

- Con `diff -rq --strip-trailing-cr -w` entre `educa-libs/packages/edu-ui/src` y `educa-web/src/app/shared/edu-ui`: **~50 archivos difieren** (aun ignorando espacios y fin de línea) y **8 existen solo en la copia vendored** (`edu-avatar-rol.ts` y su spec, más specs de confirm-dialog, datepicker, dialog, file-upload y password). Parte de la diferencia puede ser solo formato (la copia está pasada por Prettier del proyecto); hay que separar formato de comportamiento.
- Diferencias de comportamiento ya confirmadas en dialog/overlay: `edu-overlay-handle.ts` (coreografía `data-open`, `waitForTransition`, `close({ immediate })`, `trapFocus`, `originFromTrigger`/`syncOrigin`, `panelClass` como `string | string[]`), `edu-dialog.ts` (`dirty`, `dirtyMessage`, `confirmingClose`, `EduButton`, `$safeNavigationMigration`), `edu-dialog.scss` (`data-open`, `scale`/`opacity` con `--edu-origin*`, bloque `.edu-dialog-confirm`).
- `educa-libs` compila con **Angular 19.2** (peer `>=19.0.0`); `educa-web` está en 22.x. Código vendored que use APIs de Angular ≥20 (p. ej. `$safeNavigationMigration`, `animate.*`) **no compila en la librería**: hay que decidir qué hacer con cada caso.
- `educa-libs` tiene un cambio **ajeno sin commitear** en `packages/edu-ui/src/lib/autocomplete/edu-autocomplete.ts` (1 línea). No tocarlo sin preguntar al usuario.
- Último chat de `educa-libs`: 599 (P79 F9). Su manifest `.claude/.locks/worktrees.json` está vacío de activos; `educa-libs` tiene su propio git y buckets en `.claude/chats/`.

## DECISIONES A TOMAR (`/design`)

- **Dirección**: ¿se trae la copia vendored a `educa-libs` (la copia es la verdad hoy) o se declara la copia como fuente y se retira el vínculo con `educa-libs`? El proyecto la vendoreó porque solo la usa este repo; si `educa-libs` ya no se publica ni consume en otro lado, la opción barata puede ser retirarla y actualizar la memoria/AGENTS.
- **Compatibilidad Angular 19**: para lo que la copia hace con Angular ≥20, ¿portar a una forma compatible con 19.2 o subir el peer de la librería?
- **Estrategia de port**: por archivo con diff de comportamiento (no formato), con los specs vendored viajando junto a la fuente; criterio de «hecho»: `diff -rq -w` sin diferencias de comportamiento y el resync dry-run no cambia nada en `educa-web`.
- **Verificación**: la suite visual de `educa-libs` (`e2e/`) y los specs vendored deben pasar en ambos lados.

## PRE-WORK OBLIGATORIO

- Leer la memoria `reference_educa-libs-and-eduui-vendored` y el brief 601 (`resync-eduui-vendored-p79-f9`, precedente del resync) en `educa-libs`/`educa-web`.
- `git status` y `git log` de `educa-libs`: confirmar rama, el cambio ajeno en `edu-autocomplete.ts` y trabajar `educa-libs` en su propio worktree/rama (nunca `main` directo).
- Briefs de referencia en `awaiting-prod/`: 939 (F3b, overlays) y 941 (F6, modal desde el botón).
- Worktree en `EducaWeb/WT/educa-web/942-...` con junction de `node_modules`.

## CRITERIO DE CIERRE

- Una sola fuente de verdad de `edu-ui` declarada y documentada (memoria + `AGENTS.md`/reglas si cambia el flujo).
- Si se reconcilia: ningún archivo con diferencia de comportamiento entre `educa-libs` y la copia vendored; un resync de prueba no pisa F3b ni F6.
- Lint 0 errores, build verde, specs de `edu-ui` y de `educa-web` pasando; cambios de `educa-libs` en commits propios de ese repo (no se pushean `chat/*`).

## FUERA DE ALCANCE

- Nuevas animaciones (toast, drawer, popover) o más pilotos de elemento compartido.
- Subir Angular de `educa-libs` más allá de lo que la decisión de compatibilidad exija.


## RESULTADO (2026-11-19)

- Decisión: opción A. 52 archivos divergentes y 11 componentes con `$safeNavigationMigration` (no compila en Angular 19.2) hicieron inviable reconciliar hacia `educa-libs`, congelada desde 2026-08-27.
- Docs corregidos: `reference/eduui.md`, `plan/motion-system.md`, `public-api.ts` (comentario), coord `onboarding.md` y `pilot.md`, banner en `educa-libs/.claude/CLAUDE.md` (rama `chat/942-freeze-banner`, sin push), memoria.
- Sin código de comportamiento tocado; el cambio ajeno en `educa-libs` `edu-autocomplete.ts` quedó intacto.
