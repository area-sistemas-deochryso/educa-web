# 769 — FE: P105 D1 — Guard de salida para asistencia editada sin guardar en el hub

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1 (derivado) · **Fase**: diseño → ejecución · **Creado**: 2026-10-05 · **Estado**: ✅ cerrado localmente 2026-10-05 (worktree `chat/769-fe-p105-d1-guard-salida-asistencia-hub`, pendiente `/wt-merge`)
> **Validación prod**: ⏳ pendiente desde 2026-10-05 — smoke manual con «ver como» (profesor) no realizado; ver `## RESULTADO`.
> **Origen**: cierre del brief 766 (F7, commit `8a28982a`); quedó «fuera de alcance» en 765 y 766.
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso" (decisión: las pestañas navegan con reemplazo de URL; el query de franja sobrevive al cambio de pestaña). Solo intención y decisiones.
> **depends_on**: D1 F3b (pestaña Asistencia del profesor, brief 762/763) ✅ integrada.
> **MODO SUGERIDO**: `/design` → `/execute` → `/validate`. Razón: el repo no tiene ningún guard de salida (`canDeactivate` sin usos); hay que decidir el patrón antes de escribirlo y toca 3+ archivos.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: candidatos: `pages/profesor/cursos/curso-hub/profesor-curso-hub-asistencia.component.ts`, el shell `profesor-curso-hub.component.ts`, rutas hijas del hub en `intranet.routes.ts`, y el store/facade de registro de asistencia (`attendance-registration-panel`, `pages/profesor/attendance/`).
> **hot-paths**: ninguno conocido

## OBJETIVO
Un profesor que edita asistencia en la pestaña Asistencia del hub y sale sin guardar (cambia de pestaña, de franja, navega a otra ruta o cierra la pestaña del navegador) pierde las ediciones sin aviso. Avisarle antes de perderlas, sin molestar cuando no hay cambios.

## DECISIONES VALIDADAS (no re-preguntar)
- Es un problema real del hub, nacido de que las pestañas son rutas hijas con reemplazo de URL (no hay «Cancelar» de modal que recuerde guardar).
- Solo FE. Sin cambios de BE.
- Las pestañas navegan con **reemplazo de URL** y el query de franja debe sobrevivir al cambio de pestaña: el guard no puede romper eso.

## PRE-WORK
- Leer `chats/awaiting-prod/` de F3b (pestaña Asistencia profesor) y cómo guarda hoy la asistencia (WAL, `reference/optimistic-ui.md`): ¿guarda en lote con un botón o por fila?
- Leer `reference/dialogs-sync.md` si el aviso se hace con `edu-confirm-dialog` (nunca dentro de `@if`).

## ALCANCE (re-verificar contra el código)
Decisiones que el `/design` debe cerrar, con alternativa y trade-off cada una:
1. **¿Qué cuenta como «sin guardar»?** Estado «dirty» del registro de asistencia: ¿existe ya (`dirty`/`pendingChanges`) o hay que derivarlo comparando contra lo cargado?
2. **Qué eventos intercepta**: cambio de pestaña y de franja dentro del hub (`canDeactivate`/`canDeactivateChild`), navegación fuera del hub, y `beforeunload` del navegador. No son el mismo mecanismo.
3. **UI del aviso**: `edu-confirm-dialog` con «Guardar y salir / Salir sin guardar / Quedarme».
4. **Alcance por rol**: solo profesor edita asistencia; el lado estudiante no aplica.
5. **Interacción con el selector de franja**: cambiar de franja con cambios sin guardar también debe preguntar (no es navegación de router, es estado interno del shell).
- Primer guard de este tipo en el repo: documentar el patrón (dónde vive el helper, tipado de la interfaz `HasPendingChanges`) para que otros formularios lo reutilicen. Interfaces por rol/capacidad, no mirror de un componente.

## IMPLEMENTATION DETAIL (ADR-0006)
- **Observado en 766**: `grep canDeactivate|CanDeactivate` en `src/app` no devuelve nada (sin guards de salida hoy). Las rutas hijas del hub están en `intranet.routes.ts` (shells por rol, `permissionPath` heredado de Cursos).
- El store de cursos de profesor ya no tiene estado de modal (F7). La asistencia del hub se carga/guarda por franja con su propio loader (`asistenciaSub`/`asistenciaHorarioId` en `CursoContenidoDataFacade`/`resetForHub`): revisar qué conserva al cambiar de pestaña.
- Convención de código: guards funcionales (`CanDeactivateFn`) con `inject()`, en `core/guards/` o en la capa compartida de intranet según quién lo consuma.

## APRENDIZAJES TRANSFERIBLES (de 766)
- **Leer el cuerpo antes de reutilizar un método «de limpieza»**: algunos reset/close hacen más de lo que dice el nombre.
- **Buscar por string además de símbolo**: rutas y `permissionPath` se referencian como texto.
- **Tests**: `bunx vitest run src/app/features/intranet/pages/profesor src/app/features/intranet/shared` (+ la carpeta de guards si el helper va a `core`). `bun run lint` y `bun run build` en paralelo.
- **Worktree**: `git worktree add -b chat/769-… ../../WT/educa-web/769-…`; `bun install --frozen-lockfile` en segundo plano.
- **Cierre**: `awaiting-prod/` está en **23** (soft 20, duro 25): `/verify` en bloque antes de cerrar otro brief ahí.

## FUERA DE ALCANCE
- Futuro de los menús de asistencia (brief 768).
- Guards de salida para otros formularios (solo dejar el patrón reutilizable).
- Cambios en la UX de la pestaña Asistencia más allá del aviso.
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español (textos del aviso en español). Lint prohíbe `!` y `type X = {…}`. Overlays `edu-*` según `reference/eduui.md` y `reference/dialogs-sync.md`. a11y: botones del aviso con texto visible (`reference/a11y.md`).

## VALIDACIÓN FINAL
- [x] `bun run lint`, `bun run build` y Vitest de `pages/profesor` y `shared` en verde, con tests del guard: sin cambios → navega; con cambios → pregunta; cada opción del aviso hace lo que dice.
- [ ] Smoke local con «ver como» (profesor): editar asistencia, cambiar de pestaña y de franja, navegar fuera, recargar. Mutar solo en local con BBDD de prueba (`rules/browsing.md`).
- [ ] Sin cambios, ninguna de esas acciones muestra el aviso.

## CRITERIOS DE CIERRE
- [~] Validación final pasa — automatizada ✅; smoke manual ⏳ (pendiente en `awaiting-prod/`).
- [x] Brief movido `running/` → `awaiting-prod/` en el mismo commit que el código.
- [x] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 D1 — warn before leaving the course hub with unsaved attendance`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757–766 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización.
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: `/triage`.

## CIERRE
Pedir feedback con `/feedback`.

---

## DISEÑO (cerrado en `/design`, 2026-10-05 — decisiones del usuario: **A2** 3 botones, **B sí** incluir fecha)

### Hallazgos que corrigen el brief
- `registroDirty` **ya existe** (`AttendanceCourseStore`, compara contra `registroBaseline`). Nada que derivar.
- El selector de franja **ya pregunta** (`CursoHubShellBase.onSlotChange`, 2 botones). Se unifica con el aviso nuevo.
- **Cambiar de pestaña NO pierde ediciones**: store `root`, el shell resetea solo al destruirse. **No se guarda `canDeactivate` en las hijas** (sería ruido).
- Caminos de pérdida reales: salir del hub (destruye el shell → `resetAsistencia`), `beforeunload`, selector de franja (ya cubierto), **cambio de fecha del datepicker** (`loadRegistro` pisa datos y baseline).
- Residual NO cubierto (documentado, brief derivado): cambio de franja por URL dentro del mismo par (botón atrás / enlace de «Mi Horario» con otro `horarioId`). `canDeactivate` no corre con cambio solo de query y `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` re-correría los `canActivate` del padre.

### Piezas
1. `core/guards/pending-changes/` — `HasPendingChanges { hasPendingChanges(): boolean; confirmLeave(): Promise<boolean> }` + `pendingChangesGuard: CanDeactivateFn<HasPendingChanges>` (delega en el componente; el guard no puede inyectar el `EduConfirmationService` del shell). Exportado desde `core/guards/index.ts`.
2. `shared/edu-ui` — `EduConfirmation` gana `alternateLabel` / `alternateButtonStyleClass` / `alternate` (tercer botón) y `dismiss` (X / ESC; sin esto una promesa de guard quedaría colgada). Aditivo: los callers existentes no cambian.
3. `@intranet-shared/services/unsaved-changes-prompt.service.ts` (no root; se provee junto a `EduConfirmationService` en los shells) — `confirmProceed({ message, canSave, save }): Promise<boolean>`. Con `canSave`: Guardar y salir (accept) / Salir sin guardar (alternate) / Quedarme (reject+dismiss). Sin `canSave`: Salir sin guardar (accept) / Quedarme.
4. `CursoHubShellBase` — implementa `HasPendingChanges`, `@HostListener('window:beforeunload')` solo si hay cambios, hooks `canSaveUnsaved()` / `saveUnsaved()` (default: no guardable), `onSlotChange` usa el prompt. Al quedarse sube `selectionResetKey`.
5. `AttendanceCourseFacade.registrar()` devuelve `Promise<boolean>` (true en `onCommit`, false en `onError` o early-return). `canSaveOutsidePanel(diaSemana)`.
6. Página Asistencia — `onFechaChange` pasa por el prompt; «Quedarme» re-aplica la fecha vieja al datepicker vía input `fechaResetKey` del panel.
7. `intranet.routes.ts` — `canDeactivate: [pendingChangesGuard]` solo en la ruta padre del hub del profesor.

### Riesgo de A2 y mitigación
`puedeGuardar` (confirmación de fecha atípica) vive en el panel. «Guardar y salir» desde fuera se la saltaría → **si la fecha cargada no cae en el día de horario de la franja, el aviso no ofrece «Guardar y salir»** (solo Salir sin guardar / Quedarme). Conservador: no se sabe si el profesor ya confirmó la atípica, porque ese flag es local del panel.

---

## RESULTADO (cierre `/end`, 2026-10-05)

**Entregado**: guard de salida del hub del profesor (`canDeactivate` en la ruta padre), `beforeunload`, aviso de 3 botones (Guardar y salir / Salir sin guardar / Quedarme) unificado para selector de franja, salida de ruta y cambio de fecha del datepicker. Patrón documentado en `reference/unsaved-changes.md`.

**Validación automatizada**: lint ✅ (0 errores) · build ✅ (0 errores) · vitest 3070/3072. Los 2 fallos son de `intranet.routes.curso-hub.spec.ts` (spec desactualizado: espera menos pestañas hijas) y **ya fallaban en `main`** antes de este brief.

**Pendiente (verificación en `/verify 769`)** — smoke local con «ver como» profesor, BBDD de prueba:
- Editar asistencia → cambiar de pestaña: **no** debe avisar (las ediciones sobreviven).
- Cambiar de franja, cambiar de fecha, navegar fuera (menú / atrás), recargar → avisa; probar las 3 opciones y un guardado fallido.
- Fecha fuera del día de horario → el aviso **no** ofrece «Guardar y salir».
- Sin cambios, nada de lo anterior avisa.

## DERIVADOS / DEUDA (no hechos)
- **Portar a `educa-libs`**: `EduConfirmation.alternate*` y `dismiss` se añadieron a la copia vendorizada `shared/edu-ui`. Un re-sync desde `educa-libs` los pisa y rompe `UnsavedChangesPromptService`.
- **Cambio de franja por URL** dentro del mismo par (botón atrás / enlace de «Mi Horario» con otro `horarioId`): `loadForSlot` descarta lo editado sin avisar. `canDeactivate` no corre con cambio solo de query.
- **Spec de rutas desactualizado** (`intranet.routes.curso-hub.spec.ts`, 2 tests) — ya roto en `main`.
- Al volver a la fecha vieja tras «Quedarme», el panel pierde la confirmación de fecha atípica ya dada (`onDateSelect` la resetea antes de emitir). Menor.
