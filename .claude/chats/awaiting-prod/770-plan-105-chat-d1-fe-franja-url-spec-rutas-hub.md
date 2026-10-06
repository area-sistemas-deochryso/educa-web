# 770 — FE: P105 D1 — Cambio de franja por URL con asistencia sin guardar + spec de rutas del hub desactualizado

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1 (derivado) · **Fase**: investigar → (diseño) → ejecución · **Creado**: 2026-10-05 · **Estado**: ✅ cerrado local 2026-10-06 → `awaiting-prod`
> **Validación prod**: ⏳ pendiente desde 2026-10-06 — smoke local «ver como» (profesor) sin hacer; confirmar en prod (solo lectura, `rules/browsing.md`) que con asistencia sin guardar y sin `?horarioId=` la URL fija la franja al editar. Cierre vía `/verify 770`.
> **Origen**: cierre del brief 769 (commit `8eef0ef5`); quedó «fuera de alcance / residual» en 769.
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso". Solo intención y decisiones.
> **depends_on**: brief 769 ✅ integrado en `main` local (`8eef0ef5`; **sin push**).
> **MODO SUGERIDO**: `/investigate` → (`/design` solo si la investigación confirma que el hueco es alcanzable) → `/execute` → `/validate`. Razón: **no está confirmado que el caso A ocurra en la práctica** (ver abajo); diseñar antes de saberlo sería construir sobre una premisa sin verificar.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `shared/components/curso-hub-shell/curso-hub-shell.base.ts`, `pages/profesor/cursos/curso-hub/profesor-curso-hub-asistencia.component.ts`, `intranet.routes.curso-hub.spec.ts`.
> **hot-paths**: ninguno conocido

## OBJETIVO
Dos cosas independientes, ambas del hub de curso del profesor:

- **A.** Decidir —con evidencia— si el cambio de franja **por URL** (sin pasar por el selector) con asistencia sin guardar es un hueco real, y si lo es, cerrarlo con el mismo aviso que ya existe.
- **B.** Dejar verde `intranet.routes.curso-hub.spec.ts` (2 tests ya rotos en `main` antes del 769).

## DECISIONES VALIDADAS (no re-preguntar)
- El aviso es el de 769: `UnsavedChangesPromptService.confirmProceed` (Guardar y salir / Salir sin guardar / Quedarme). No inventar otro.
- Solo FE. Sin cambios de BE.
- El guard de salida (`canDeactivate`) ya está en la ruta padre y **no** debe ir en las pestañas hijas (cambiar de pestaña no pierde ediciones).

## PRE-WORK
- Leer `.claude/reference/unsaved-changes.md` (patrón y límites de 769) y `.claude/chats/awaiting-prod/769-plan-105-chat-d1-fe-guard-salida-asistencia-hub.md` § `## DISEÑO` y `## RESULTADO`.
- Leer `.claude/rules/browsing.md` antes de cualquier smoke (prod = solo lectura; mutar solo en local con `UseTestEnv: true`).

## ALCANCE (re-verificar contra el código)

### A — Cambio de franja por URL
**Primero investigar, no diseñar.** Hechos de 769 que cambian la urgencia:

- El **selector** de franja navega con `replaceUrl: true` (`CursoHubShellBase.navigateToSlot`): no genera entradas de historial, así que el **botón atrás no recorre franjas** del mismo par. Mi estimación en 769 («botón atrás») probablemente **sobrestimó** el caso.
- Escribir la URL a mano y dar Enter es una **carga completa**: `beforeunload` ya avisa.
- Entrar al hub desde otra ruta (p. ej. el popover de «Mi Horario») pasa por `canDeactivate` del hub anterior.
- Lo que queda por confirmar: **¿qué puede navegar, dentro de la app y estando ya dentro del hub, a la misma ruta con otro `?horarioId=`?** Buscar enlaces/`router.navigate` que apunten al hub (por string, no solo por símbolo: `buildCursoHubCommands` y afines en `curso-hub-link.helpers`, popovers, FAB, notificaciones, `CursoHubSalonSummary`).

Salidas posibles de la investigación (decidir con el usuario):
1. **Nada lo alcanza** → documentar y cerrar A sin código (actualizar «Límites conocidos» de `reference/unsaved-changes.md`).
2. **Algo lo alcanza** → `/design`. Restricciones ya conocidas: `canDeactivate` no corre con cambio solo de query; `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` en el padre re-corre `viewAsGateGuard`/`permissionsGuard`/resolvers (descartado); el dato ya cambió cuando el shell lo ve, así que habría que **revertir la URL y preguntar**, o preguntar en el origen del enlace.

### B — Spec de rutas del hub
`intranet.routes.curso-hub.spec.ts` (describe «child tabs (P105 D1 F2)»):
- «profesor hub has Contenido, Calificaciones and Información as child routes»: espera `['', 'contenido', 'calificaciones', 'informacion']`; hoy son `['', 'contenido', 'calificaciones', 'asistencia', 'informacion', 'salon']`.
- «estudiante hub keeps only Contenido until its own tabs land»: espera `['', 'contenido']`; hoy tiene las cinco pestañas.
- Actualizar expectativas **y nombres** de los tests (el segundo ya no es verdad). Revisar también «lazy-loads each new tab component» por si su lista de paths quedó corta.
- Es la causa de que `vitest` global salga con exit 1: ver si algo más cuelga de ahí.

## IMPLEMENTATION DETAIL (ADR-0006)
Observado en 769 (commit `8eef0ef5`), para no re-investigar:

- **Dónde se pierde hoy lo editado en un cambio de franja por URL**: `ProfesorCursoHubAsistenciaComponent.loadForSlot(horarioId)` — si `registroData.horarioId !== horarioId` hace `facade.resetAsistencia()` y recarga; silencioso. Lo dispara un `effect` sobre `slotId` (derivado de `hubContext.slot()`).
- **`slot` del shell** sale de `resolveSlot(...)` sobre el query `horarioId` (`CursoHubShellBase`); `onSlotChange` (selector) es el único camino con aviso.
- **Aviso reutilizable**: `UnsavedChangesPromptService` se provee en el componente shell junto a `EduConfirmationService`; las pestañas hijas lo inyectan por la cadena del `router-outlet`. `canSaveOutsidePanel(diaSemana)` en `AttendanceCourseFacade` decide si se ofrece «Guardar y salir» (no en fecha atípica).
- **Guard**: `pendingChangesGuard` (`@core/guards`) + `HasPendingChanges`; implementado por `CursoHubShellBase`.
- **Tests con guard en `RouterTestingHarness`**: la navegación queda colgada del aviso, así que **no usar `fixture.whenStable()`** hasta responderlo; usar `vi.waitFor` (ver `profesor-curso-hub.component.spec.ts`, describe «salir del hub»).

## INVESTIGACIÓN A (2026-10-06) — hallazgos

**1. Ninguna navegación in-app cambia solo `?horarioId=` en el mismo par salvo el selector** (ya guardado por `onSlotChange`):
- Entradas al hub, todas desde fuera: `curso-pair-card` (`buildCursoHubLink`, con y sin `withSlot`), `profesor-horarios` L264-292 (popover), `profesor-salones` L85, `estudiante-horarios` L309, `estudiante-salones` L165, `curso-hub-legacy-redirect.helpers` L71. Ninguna está dentro del hub.
- `curso-hub-salon-summary` L92/L155 (enlace a otro curso del mismo salón): cambia `:cursoId` (path param) → el `runGuardsAndResolvers` por defecto (`paramsChange`; no hay otro en todo `src/`) **sí** corre `canDeactivate`. Cubierto.
- `curso-hub-tabs` usa `routerLink="{{tab.path}}"` + `queryParamsHandling="merge"`: **no** agrega `horarioId`. `buildCursoHubTabLink`/`tabTarget` solo se usan en enlaces internos de pestañas, no en la barra.
- `dropInvalidSlotQuery` y `redirectToList` navegan solos, pero solo ante URL inválida al llegar (sin ediciones) o par inexistente (sale del hub → `canDeactivate` corre).
- Notificaciones: las `actionUrl` del FE (`notifications.config`, `notifications-evento.catalog`, `smart-notification`) son estáticas y ninguna apunta al hub. El BE solo persiste lo que el admin tipea en `notificaciones-admin` (texto libre): sin generador de URLs de hub. Residual teórico, descartable.
- Botón atrás: el selector usa `replaceUrl`; ninguna entrada de historial del mismo par lleva otro `horarioId`. Premisa del 769 confirmada como **sobrestimada**.

**2. El hueco real no es por URL: es la franja *flotante* (sin `horarioId` en la URL).** Un hub abierto desde la tarjeta del par (`withSlot: false`) y navegado con la barra de pestañas nunca fija `horarioId`. La franja sale de `resolveSlot` y **cambia sin navegación**:
- (a) **Reloj**: `resolution` lee `clock.adjustedNow()`, un `computed(() => Date.now() + _skewMs())`. `ClockSyncInterceptor` llama `recordServerTime` en cada respuesta HTTP con `Date` (resolución 1 s) y `_skewMs.set(Math.round(EMA))` → el skew casi siempre cambia → `resolution` se recalcula con la hora real. Si el par tiene ≥2 franjas y la clase en curso termina (p. ej. dobles consecutivas 10:00-10:45 / 10:45-11:30), la próxima respuesta HTTP hace que `slot()` pase a la siguiente.
- (b) **Sondeo de contenido**: `probeContent` (≥2 franjas, sin `horarioId` válido) puede dejar «única franja con contenido» distinta de la preseleccionada.
- Efecto: `ProfesorCursoHubAsistenciaComponent` reacciona a `slotId` → `loadForSlot` → `facade.resetAsistencia()` → **descarta ediciones sin avisar**. Ni `canDeactivate` ni `beforeunload` ni `onSlotChange` participan (no hay navegación).
- **Reproducido (A1, 2026-10-06)** con `profesor-curso-hub.floating-slot.spec.ts` (worktree `chat/770-…`, `WalClockService` real + `Date` falseado; el spec del shell lo mockea con función plana y no lo ve): control sin ediciones sigue al reloj ✅ · `?horarioId=` explícito no flota ✅ · **reloj cruzando 09:30 con asistencia sucia: la franja pasa de 08:00-09:30 a 09:30-11:00 ❌** · **sondeo de contenido tardío con asistencia sucia: ídem ❌**. El hueco es real a nivel shell. El descarte final (`loadForSlot` → `resetAsistencia`) sigue siendo por lectura de código; no hay test del hijo.
- Efecto colateral: `hasUnsavedChanges()` del hub compara `registroData.horarioId === slot().id`; al flotar la franja deja de coincidir y el guard de salida/`beforeunload` **también** deja de avisar.

**Conclusión**: salida 1 («nada lo alcanza por URL») es cierta para URL, pero el hueco existe por otra vía (franja flotante).

## DISEÑO / IMPLEMENTACIÓN A (decisión del usuario 2026-10-06: **D1**)
Opciones evaluadas: D1 fijar la franja en la URL al primer cambio sucio (**elegida**) · D2 congelar la franja mientras haya ediciones · D3 dejar de reaccionar al reloj (más amplio, fuera de alcance).
- `CursoHubShellBase`: nuevo `effect` en el constructor — si hay franja, `requestedId() === null` y `hasUnsavedChanges()`, llama `navigateToSlot(slot.id)` (`merge` + `replaceUrl`, solo query → no corre `canDeactivate` ni resolvers). Idempotente: tras fijarla `requestedId` ya no es `null`. El estudiante no lo dispara (`hasUnsavedChanges()` por defecto `false`).
- `CursoHubContextService`: doc actualizada (el shell no escribe la franja salvo con ediciones sin guardar).
- Tests: `profesor-curso-hub.floating-slot.spec.ts` (7): control reloj ✅ · reloj+sucia ✅ · `?horarioId=` explícito ✅ · sondeo tardío+sucia ✅ · URL intacta sin ediciones ✅ · fija la URL con `replaceUrl` al primer cambio sucio ✅ · no reescribe si ya trae la franja ✅.
- Validación (worktree): `vitest` hub profesor + estudiante + shell = 15 archivos / 151 tests verdes · `bun run lint` 0 errores (4 warnings preexistentes ajenos) · `bun run build` exit 0.
- **B hecho** (`intranet.routes.curso-hub.spec.ts`, 15 tests ✅): ambos hubs esperan `['', contenido, calificaciones, asistencia, informacion, salon]`; nombres actualizados; lazy-load cubre las 5 pestañas de los 2 roles; nuevas invariantes: redirect `''→contenido`, tabs sin `canDeactivate`/guards, `pendingChangesGuard` solo en el padre del profesor.
- **Barrido final** (worktree): `vitest run src/app/features/intranet src/app/core src/app/shared` → **exit 0, 304 archivos / 3081 tests** (el exit 1 global era solo este spec) · `bun run lint` 0 errores · `bun run build` exit 0.
- **Doc**: `reference/unsaved-changes.md` — «Límites conocidos» corregido (el hueco por URL no existe; el real era la franja flotante) + fila nueva en la tabla de mecanismos.
- **Smoke local «ver como» (profesor): NO hecho** — los tests cubren el reloj y el sondeo, que no se reproducen a mano; pendiente decidir si se hace o se acepta el riesgo.
- **Archivos tocados (worktree `chat/770-p105-d1-franja-url-spec-rutas-hub`, sin commitear)**: `curso-hub-shell.base.ts`, `curso-hub-context.service.ts`, `intranet.routes.curso-hub.spec.ts`, `profesor-curso-hub.floating-slot.spec.ts` (nuevo), `.claude/reference/unsaved-changes.md`.

## APRENDIZAJES TRANSFERIBLES (de 769)
- **Medir el hueco antes de cerrarlo**: tres de las cinco premisas del brief 769 resultaron falsas o ya resueltas. Aquí la premisa «el botón atrás cambia de franja» probablemente también lo es.
- **Buscar por string además de símbolo**: rutas y query params se referencian como texto.
- **`shared/edu-ui` es vendorizada** (fuente en `educa-libs`): lo añadido en 769 (`alternate*`, `dismiss` en `EduConfirmation`) hay que **portarlo a `educa-libs`**; no es trabajo de este repo, pero un re-sync lo pisa y rompe el aviso. Si hay brief/bucket en `educa-libs`, registrarlo ahí.
- **Tests**: `bunx vitest run src/app/features/intranet` (el spec de rutas está en `intranet/`, fuera de `pages/profesor` y `shared`). `bun run lint` y `bun run build` en paralelo.
- **Worktree**: `git worktree add -b chat/770-… ../../WT/educa-web/770-…`; `bun install --frozen-lockfile` en segundo plano. Ruta concreta en `.claude/rules/worktrees.md`.
- **Cierre**: ~~`awaiting-prod/` está en 25 = hard cap~~ — **superado 2026-10-06**: el usuario quitó los topes de `open/` y `awaiting-prod/` (`rules/backlog-hygiene.md`); `/end` ya no se frena por el tamaño del bucket. `/verify` en bloque sigue siendo recomendable por edad (>14d), no obligatorio.

## FUERA DE ALCANCE
- Guards de salida para otros formularios.
- Menús de asistencia (decidido en 768).
- Portar `edu-ui` a `educa-libs` (otro repo).
- Que «Quedarme» tras cambiar fecha pierda la confirmación de fecha atípica ya dada (menor, anotado en el 769).
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. Lint prohíbe `!` y `type X = {…}`. Overlays `edu-*` según `reference/eduui.md` y `reference/dialogs-sync.md`. a11y: botones con texto visible (`reference/a11y.md`).

## VALIDACIÓN FINAL
- [x] **B**: `bunx vitest run src/app/features/intranet/intranet.routes.curso-hub.spec.ts` en verde (15); `vitest` de `src/app/features/intranet src/app/core src/app/shared` con exit 0 (304 archivos / 3081 tests).
- [x] **A**: investigación documentada (§ INVESTIGACIÓN A) y decisión registrada: **D1**. Variante respecto del criterio original: no «pregunta» porque no hay navegación que interceptar; la franja se **fija en la URL** al primer cambio sucio y los tests cubren sin cambios → URL intacta, con cambios → fija con `replaceUrl`, y URL ya fijada → no reescribe.
- [x] `bun run lint` (0 errores) y `bun run build` (exit 0) en verde.
- [ ] Si A se implementó: smoke local con «ver como» (profesor), BBDD de prueba (`rules/browsing.md`). **No hecho**, pasa a `/verify 770`.

## CRITERIOS DE CIERRE
- [x] Validación final pasa (salvo el smoke, diferido a `/verify`).
- [x] Brief movido `running/` → `awaiting-prod/` en el mismo commit que el código.
- [x] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`test(intranet): P105 D1 — refresh hub route expectations` (B) y, si A se implementa, otro commit `feat(intranet): P105 D1 — ask before an in-hub slot change by URL drops unsaved attendance`.

## PENDIENTES HEREDADOS
- Smoke manual de 769 (en `awaiting-prod/`, vía `/verify 769`).
- `main` local está **21 commits por delante de `origin/main`**: push = deploy a prod, no sin autorización.
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: `/triage`.

## CIERRE
Pedir feedback con `/feedback`.
