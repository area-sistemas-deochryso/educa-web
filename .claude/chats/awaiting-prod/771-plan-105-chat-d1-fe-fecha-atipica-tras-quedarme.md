# 771 — FE: P105 D1 — «Quedarme» tras cambiar la fecha de asistencia pierde la confirmación de fecha atípica

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1 (derivado) · **Fase**: investigar → ejecutar · **Creado**: 2026-10-06 · **Estado**: ⏳ pendiente arrancar
> **Validación prod**: ⏳ pendiente desde 2026-10-06 — commit `8d9bbe48` en `chat/771-p105-d1-fecha-atipica-quedarme` (sin integrar ni pushear). Falta smoke «ver como» profesor en local (`UseTestEnv: true`): confirmar fecha atípica → elegir otra → «Quedarme» → sigue confirmada.
> **Hallazgo extra**: `puedeGuardar` era un `computed` cacheado sobre `selectedDate` (no signal); permitía guardar sin confirmar al pasar de fecha válida a atípica. Corregido en el mismo commit.
> **Origen**: cierre del brief 770 (commits `c3b03746`, `57aed2d4`, integrados en `main` local como `1ecbb6e8`; **sin push**); quedó como residual «menor» desde el 769 (`awaiting-prod/`, § `DERIVADOS / DEUDA`).
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso". Solo intención y decisiones.
> **depends_on**: brief 769 ✅ y 770 ✅ integrados en `main` local.
> **MODO SUGERIDO**: `/investigate` (corto: confirmar la causa con un test rojo) → `/execute` → `/validate`. Sin `/design`: 1 componente y su spec. Razón: la causa está localizada por lectura de código pero **no reproducida**; el 770 mostró que reproducir antes de arreglar evita construir sobre una premisa falsa.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `pages/profesor/cursos/components/attendance-registration-panel/attendance-registration-panel.component.{ts,html,spec.ts}`.
> **hot-paths**: ninguno conocido

## OBJETIVO
Que, con asistencia sin guardar en una **fecha atípica ya confirmada**, elegir otra fecha y responder «Quedarme» deje el panel **exactamente como estaba**, incluida la confirmación de fecha atípica. Hoy el profesor debe volver a confirmar.

## DECISIONES VALIDADAS (no re-preguntar)
- El aviso es el de 769: `UnsavedChangesPromptService.confirmProceed` (Guardar y salir / Salir sin guardar / Quedarme). No se toca.
- Solo FE. Sin cambios de BE.
- Sin ediciones, cambiar de fecha **sí** debe invalidar la confirmación (es otra fecha).

## PRE-WORK
- Leer `.claude/reference/unsaved-changes.md` (patrón y límites; esta deuda hay que **quitarla/anotarla** ahí al cerrar).
- Leer `.claude/rules/browsing.md` antes de cualquier smoke (prod = solo lectura; mutar solo en local con `UseTestEnv: true`).

## ALCANCE (re-verificar contra el código)

### Causa localizada (por lectura, **sin reproducir**)
`AttendanceRegistrationPanelComponent` (`pages/profesor/cursos/components/attendance-registration-panel/`):

- `confirmadoFechaAtipica` es un `signal<boolean>` local del panel. `puedeGuardar = !fechaFueraDeHorario() || confirmadoFechaAtipica()`.
- `onDateSelect()` hace `confirmadoFechaAtipica.set(false)` **antes** de `fechaChange.emit(fecha)`.
- El padre (`ProfesorCursoHubAsistenciaComponent.onFechaChange`) pregunta si hay ediciones. Con «Quedarme» (o X/ESC o guardado fallido) hace `fechaResetKey.update(n => n + 1)`; el `effect` del panel vuelve `selectedDate` a `initialFecha` pero **no restituye la confirmación**, ya reseteada.
- Resultado: misma fecha atípica, mismas ediciones, pero el botón de guardar vuelve a exigir «Confirmar fecha atípica».

### Hipótesis de arreglo (para validar, no es un blueprint)
Guardar **para qué fecha** se confirmó (`confirmedFor: string | null`, `yyyy-mm-dd`) en vez de un booleano, y derivar `puedeGuardar` de `confirmedFor === formatDate(selectedDate)`. Así volver a la fecha original restituye la confirmación sin tocar `onDateSelect`, y cambiar de fecha la invalida sola. Comprobar que no rompe: `irAFechaValida()`, el `effect` de `initialFecha`/`fechaResetKey`, y que `confirmadoFechaAtipica()` solo se lee en el `.html` (líneas ~44 y ~59) y en el spec del panel. Si hay una razón para preferir otra forma (p. ej. el padre conserva el estado), decidirlo con el usuario.

### Primero el test rojo
En `attendance-registration-panel.component.spec.ts` (y/o a nivel hub en `profesor-curso-hub-asistencia.component.spec.ts`, que ya cubre «Quedarme»): fecha atípica confirmada → elegir otra → rechazar → la confirmación sigue vigente. Debe fallar hoy.

## IMPLEMENTATION DETAIL (ADR-0006)
Observado en 770 para no re-investigar:

- `fechaResetKey` existe en **dos** niveles: `fechaResetKey` signal del hub-asistencia y `fechaResetKey` input del panel. Mismo patrón que `selectionResetKey` del shell (`CursoHubShellBase`).
- `AttendanceCourseFacade.canSaveOutsidePanel(diaSemana)` devuelve `false` en fecha atípica: «Guardar y salir» no se ofrece fuera del panel porque la confirmación vive dentro de él. **No cambiar** esa regla: sigue siendo correcta.
- **Tests con guard y `RouterTestingHarness`**: la navegación queda colgada del aviso; usar `vi.waitFor`, no `fixture.whenStable()` hasta responderlo.
- **Tests que dependen del reloj**: usar el `WalClockService` real con `vi.useFakeTimers({ toFake: ['Date'] })`; un mock plano (`adjustedNow: () => x`) oculta que en producción es un `computed` reactivo. Ver `profesor-curso-hub.floating-slot.spec.ts`.
- Ahora, sin `?horarioId=` y con ediciones, el shell **fija la franja en la URL** al primer cambio sucio (770). No interfiere con esto.

## APRENDIZAJES TRANSFERIBLES (de 770)
- **Reproducir antes de arreglar**: la premisa del 769 («el botón atrás cambia de franja») era falsa; el hueco real era otro (franja flotante por reloj/sondeo). Un test rojo escrito primero es la especificación.
- **Un valor derivado que puede cambiar bajo una edición hay que anclarlo**, no solo avisar en los handlers (`reference/unsaved-changes.md`).
- **Búsqueda por string** además de símbolo: rutas y query params se referencian como texto.
- **Entorno**: `bunx vitest run <ruta>` y `bun run lint` / `bun run build`. `bun install --frozen-lockfile` en segundo plano en el worktree (tarda ~3 min). Una regla de permisos bloquea `ls node_modules`: verificar con `Test-Path`.
- **Worktree**: ruta en `.claude/rules/worktrees.md` (`EducaWeb/WT/educa-web/<NNN>-<slug>`). `/wt-merge` deja la rama de integración; hay que promover a `main` con `--ff-only` **antes** de `/wt-clean`. Antes de limpiar, comprobar que no hay junctions dentro del worktree (`wt-clean` §3b).
- **Commits**: sin `Co-Authored-By` (regla del usuario manda sobre el pie sugerido por el sistema). Inglés, Conventional Commits.
- **Topes de buckets**: `open/` y `awaiting-prod/` ya **no tienen límite** (decisión 2026-10-06; `rules/backlog-hygiene.md`). Solo queda la edad crítica.

## FUERA DE ALCANCE
- Portar `EduConfirmation.alternate*`/`dismiss` a `educa-libs` (otro repo; **no existe junto a este en la máquina**, un re-sync de la vendorizada `shared/edu-ui` los pisaría y rompería el aviso).
- Guards de salida para otros formularios.
- Menús de asistencia (decidido en 768).
- El smoke manual de 769/770 (van por `/verify`).
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. Lint prohíbe `!` y `type X = {…}`. Overlays `edu-*` según `reference/eduui.md` y `reference/dialogs-sync.md`. a11y: botones con texto visible (`reference/a11y.md`).

## VALIDACIÓN FINAL
- [ ] Test rojo escrito primero y verde tras el arreglo (panel y/o hub).
- [ ] Casos: confirmada + «Quedarme» → sigue confirmada · confirmada + cambio aceptado → **no** confirmada · sin confirmación previa + «Quedarme» → sigue sin confirmar · `irAFechaValida()` no hereda una confirmación ajena.
- [ ] `bunx vitest run src/app/features/intranet src/app/core src/app/shared` con exit 0.
- [ ] `bun run lint` y `bun run build` en verde.
- [ ] `reference/unsaved-changes.md` y la deuda del 769 reflejan el cierre.
- [ ] Smoke local con «ver como» (profesor), BBDD de prueba (`rules/browsing.md`), **o** diferido a `/verify` con la razón escrita.

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`fix(intranet): P105 D1 — keep the atypical-date confirmation when the user stays on the current date`

## PENDIENTES HEREDADOS
- `/verify 769` y `/verify 770` (smoke manual con «ver como» profesor; en `awaiting-prod/`).
- `main` local está **25 commits por delante de `origin/main`**: push = deploy a prod, no sin autorización.
- Worktree `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: `/triage`.

## CIERRE
Pedir feedback con `/feedback`.
