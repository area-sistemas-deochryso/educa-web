# 763 — FE: P105 D1 F5a — Tarjeta por par en Cursos y redirect del `?horarioId=` legacy

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F5a · **Fase**: F5a · **Creado**: 2026-10-03 · **Estado**: ✅ cerrado local 2026-10-05
> **Origen**: brief 762 (F4 Salón, commit `72dfdf54`, integrado en `main` local sin push) · diseño en briefs 753 y 755
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso" (fila F5a). El plan se lee solo por intención y decisiones.
> **depends_on**: F2 ✅ (758, 759), F3 ✅ (760, 761), F4 ✅ (762). Las tres integradas en `main` local; su verificación en vivo sigue en `awaiting-prod/`.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate`
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `pages/profesor/cursos/profesor-cursos.component.ts` y `pages/estudiante/cursos/estudiante-cursos.component.ts` (tarjeta por par, redirect del query legacy); `shared/helpers/**` (agrupar horarios por par, si hace falta un helper nuevo); sus specs. Lectura de `shared/components/curso-hub-shell/**`, `shared/helpers/curso-hub-*.ts`. **No toca** el hub, los modales de curso, ni los consumidores externos del query (eso es F5b).
> **hot-paths**: ninguno

## OBJETIVO
Hacer **alcanzable el hub** desde la UI: en «Mis Cursos» (profesor y estudiante) cada tarjeta pasa a representar un **par (curso, salón)** y entra al hub; y los enlaces viejos `…/cursos?horarioId=N` se **redirigen** al hub correspondiente en vez de abrir el modal. Hoy el hub solo se alcanza por URL: las tarjetas siguen abriendo los modales. Esta fase es el interruptor que lo enciende.

## DECISIONES VALIDADAS (no re-preguntar)
- **Una tarjeta por par.** Cada franja del par es un **chip clicable** que entra al hub con esa franja (`horarioId`). Se muestran **todos** los chips, sin tope.
- **Clic en el cuerpo** de la tarjeta entra al hub con la franja que resuelva la preselección (query válido → única con contenido → en curso → siguiente futura; nunca una ya terminada).
- **Enlaces por el helper único** de la capa compartida de intranet (`buildCursoHubLink`), no en el `@shared` global.
- Las pestañas navegan con **reemplazo de URL** («atrás» vuelve al origen).
- **Par o franja inválidos** ya los resuelve el shell (redirige a Cursos con aviso informativo / ignora la franja con advertencia). El hub no valida hasta que carguen los horarios.
- Solo FE. Los **modales de curso siguen en el código hasta F6**. El hub es solo para profesor y estudiante.
- **Fuera de D1**: el futuro del menú «Mi Asistencia» del estudiante y el del menú de asistencia del profesor.

## PRE-WORK
- Leer `chats/awaiting-prod/762-…md` (resumen de decisiones del hub y patrón de especificación), `761` y `760`.
- Leer `shared/helpers/curso-hub-link.helpers.ts` y `curso-hub-slot.helpers.ts` (`filterPairSlots`, `resolveSlot`) y `curso-hub-shell.base.ts` (cómo el shell valida el par y resuelve la franja).
- Leer las dos páginas de Cursos completas (253 y 193 líneas) y `reference/design-system.md` (tarjetas, tokens), `a11y.md` (los chips son controles interactivos), `reference/dialogs-sync.md` si se toca el montaje de los modales.

## DECISIÓN DE DISEÑO OBLIGATORIA
1. **Agrupar por par.** Hoy el `@for` itera `vm().horarios` con `track horario.id`. Definir dónde vive el agrupado (helper puro en `shared/helpers`, con spec) y su forma: par `(cursoId, salonId)` + franjas ordenadas (`filterPairSlots` ya ordena en orden semanal). Cuidar el `track` (por par).
2. **Clic en el cuerpo.** ¿Resolver la franja en la tarjeta o navegar al par **sin** `horarioId` y dejar que el shell la resuelva? `buildCursoHubLink(rol, ref, { withSlot: false })` ya existe para eso y evita duplicar `resolveSlot` (que además necesita la sonda de contenido que hoy corre el shell). Recomendado: dejar que el shell resuelva; confirmarlo contra el código.
3. **Redirect del query legacy.** Esperar a que carguen los horarios (mismo principio del shell: nunca validar ni redirigir con la lista vacía de un store que arranca sin carga), mapear `horarioId` → par y navegar al hub con `replaceUrl`. Definir qué pasa si el `horarioId` no existe (¿quedarse en la lista con aviso de advertencia, como el hub con una franja inválida?). Hoy el handler es `take(1)` + `router.navigate([], { queryParams: {} })`.
4. **`tab` y `returnTo`.** El handler profesor lee `tab` (nombre de pestaña del **modal**) y `returnTo` (`'horarios' | 'salones'`). Investigar: ¿algún productor pasa `tab`? (la búsqueda de hoy no encontró ninguno; re-verificar, incluidas notificaciones y enlaces del home). `returnTo` lo producen `profesor-salones` y `profesor-horarios`; con el redirect el modal ya no abre ni cierra, así que `onContentDialogClosed()` deja de volver. Verificar si basta el «atrás» del navegador (esas pantallas navegan con push y el redirect reemplaza la entrada de Cursos). Eliminar `returnTo` es **F5b**; acá solo decidir cómo se comporta el redirect.
5. **Modales en las páginas de Cursos.** Con las tarjetas apuntando al hub, `<app-curso-content-dialog>` / `<app-curso-content-readonly-dialog>` quedan sin disparador desde Cursos. ¿Se dejan montados hasta F6 o se retiran de la plantilla ahora? Revisar quién más los abre antes de decidir.
6. **Contenido de la tarjeta.** Hoy muestra día/hora y cantidad de estudiantes (profesor) o profesor (estudiante), por franja. En una tarjeta por par, esos datos pasan a los chips o se resumen; el conteo de estudiantes y el salón son del par. La franja «Hoy» del estudiante (`todayCourses`) sigue siendo por horario.
7. **Estados y accesibilidad.** Cargando, vacío y error con `app-empty-state` (ya existen). Los chips son enlaces reales (`routerLink`) con nombre accesible; el cuerpo de la tarjeta clicable no debe anidar enlaces de forma inválida (hoy la etiqueta de salón es un `<a>` dentro de un `div` clicable con `stopPropagation`).

## ALCANCE (estimado, re-verificar contra el código)
- Helper de agrupado por par + spec.
- Plantilla y lógica de las dos páginas de Cursos (tarjeta por par, chips, navegación al hub, redirect del query legacy) + sus specs (hoy no hay spec de las páginas; evaluar si agregarlos o testear el helper y la lógica de redirect aislada).
- Specs de las páginas/helpers que dependan de `vm().horarios`.
- Estimación del plan: F5 toca 10–12 archivos con 5 riesgos (de ahí la partición en F5a y F5b).

## IMPLEMENTATION DETAIL (ADR-0006)
- **Estado actual de `main`** (`72dfdf54`): el hub tiene las 5 pestañas (`contenido`, `calificaciones`, `asistencia`, `informacion`, `salon`) para profesor y estudiante, con rutas hijas y `permissionPath` heredado de `intranet/<rol>/cursos`.
- **`buildCursoHubLink`** hoy solo la consumen el propio hub (`CursoHubContextService`, `app-curso-hub-salon-summary`). F5a es el **primer consumidor externo**. Firma: `buildCursoHubLink(rol, { id, cursoId, salonId }, { withSlot })` → `{ commands, queryParams }`; con `withSlot: false` el `id` no se usa (los chips de otros cursos del resumen de Salón ya lo hacen con `id: 0`).
- **Páginas de Cursos**: `ProfesorCursosComponent` (253 ln) y `EstudianteCursosComponent` (193 ln). Ambas llaman `facade.loadData()` / `loadHorarios()` en `ngOnInit` y luego `handleHorarioQueryParam()`. Plantilla inline con `course-grid` / `course-card`, `colorMap` por `cursoId` (`buildCursoColorMap`), `eduTooltip="Ver contenido"` y `data-info-anchor` en cada control. El profesor tiene un gate de tooltips anti-glitch (`tooltipsReady`, 50 ms) que hay que conservar si se mantienen tooltips.
- **Quién llega a Cursos con query**: `profesor-salones` (`horarioId` + `returnTo: 'salones'`), `profesor-horarios` (`horarioId` + `returnTo: 'horarios'`), `estudiante-salones` y `estudiante-horarios` (solo `horarioId`). `plazos-widget` enlaza a `/intranet/<rol>/cursos` sin query. Todos esos consumidores son **F5b**.
- **Datos disponibles sin tocar BE**: `HorarioProfesorDto` trae `cursoId`, `salonId`, `salonDescripcion`, `cantidadEstudiantes`, `diaSemana(Descripcion)`, `horaInicio/Fin`, `profesorNombreCompleto`. Con un par de dos franjas hay dos horarios con el mismo `(cursoId, salonId)`.
- **Patrón de resolución del shell**: espera `settled` (carga observada) antes de validar; usa `filterPairSlots` + `resolveSlot` y una sonda de contenido (`probeContenido`) para elegir la franja cuando no viene `horarioId`. No duplicar eso en la tarjeta.

## APRENDIZAJES TRANSFERIBLES (de 762)
- **El hub no se ha visto en vivo.** 757–762 siguen en `awaiting-prod/`. F5a lo vuelve alcanzable para todos los profesores y estudiantes; conviene **verificar en local con «ver como»** (par multi-franja) antes de integrar y, sobre todo, antes de cualquier push.
- **Derivar sin re-emitir**: para valores del par que no deben cambiar con la franja, usar `computed(..., { equal })` con comparador estructural (patrón de `ProfesorCursoHubSalonComponent` y `isSameCursoHubSalonSummary`). Spec por identidad de referencia (`toBe`).
- **Specs**: mock del facade por `signal`, `CursoHubContextService` simulado, `overrideComponent` con template vacío y `NO_ERRORS_SCHEMA`. El lint prohíbe `type X = {…}` (usar `interface`). Un test que renderiza varias veces necesita `TestBed.resetTestingModule()` entre renders. `hasCapability` y los `computed` son perezosos: leer el valor **antes** de asertar la llamada.
- **Chips**: `app-curso-chip` toma el color solo de `cursoId`; el rol va en borde/ícono, nunca en el relleno (regla del brief 746). `app-kpi-stats` para números, tokens (`--surface-300`, `--accent-interactive`), sin hex.
- **Capabilities**: `UserPermissionsService.hasCapability(code)` (en `@core/services/permissions`); los códigos de Salones son `SALONES_PROFESOR_PAGE_VIEW` / `SALONES_ESTUDIANTE_PAGE_VIEW` (las tarjetas actuales enlazan a Salones sin chequearlo).
- **Worktree**: crear a mano (`git worktree add -b chat/763-… WT/educa-web/763-…`), registrar en `.claude/.locks/worktrees.json` (ignorado por git), copiar el brief a su `running/` y borrar el original sin trackear de `main`. `bun install --frozen-lockfile` tarda ~105 s: lanzarlo en segundo plano. Sin junctions (el `node_modules` es real). `.gitattributes` fuerza LF (`git ls-files --eol` lo confirma; un `grep -c $'\r'` en Git Bash da falsos positivos).
- **Validación**: `bun run lint` pasa con 4 warnings preexistentes ajenos (`correlation-request-section.spec`, `usuarios-data.facade` ×3). `bun run build` pasa. Vitest de `pages/profesor`, `pages/estudiante` y `shared` es el alcance mínimo (732 verdes al cierre de 762).
- **Cierre**: copiar el brief a `awaiting-prod/` dentro del worktree. `awaiting-prod/` está en **19** (límite blando 20, duro 25): cerrar este brief ahí lo deja en el límite blando → conviene `/verify` antes. Integrar con `/wt-merge` (rama de integración + promoción a `main`) y limpiar con `/wt-clean` (`git branch -d` exige que `main` ya tenga el merge). Commit sin `Co-Authored-By`.
- **Doc**: `.claude/context/domain.md` (líneas del hub) dice «en construcción… los modales siguen vigentes hasta F6»; revisar al cerrar F5a/F5b.

> **Validación prod**: ⏳ pendiente desde 2026-10-05 — verificar en local con «ver como» (par multi-franja) y el redirect `?horarioId=` (existente, inexistente, «atrás») antes de cualquier push.

## DISEÑO F5a (decidido en /design, 2026-10-05)
Hallazgos de `/investigate` contra `main` (`72dfdf54`):
- Ningún productor pasa `tab` (FE) y no hay `cursos?…` literal en el FE; BE sin verificar desde acá. `returnTo` solo lo producen `profesor-salones` y `profesor-horarios`. Los modales de curso y el builder de la página solo los abre la propia página de Cursos (el hub de profesor tiene su builder propio).
- Los dos facades ponen `loading: true` de forma síncrona en `loadData()`/`loadHorarios()`, y los stores arrancan con `loading: false` y `horarios: []` → el redirect no puede validar hasta observar una carga (mismo principio del shell).

Decisiones:
1. **Agrupado**: helper puro `groupHorariosByPair` en `shared/helpers/curso-hub-pair.helpers.ts` (orden de primera aparición; franjas con `filterPairSlots`). `track` por clave del par.
2. **Cuerpo de la tarjeta**: navega al par **sin** `horarioId` (`withSlot: false`) y el shell resuelve la franja. Los chips usan `buildCursoHubLink` con la franja.
3. **Componente compartido** `app-curso-pair-card` (`shared/components/curso-pair-card`): enlace estirado (título como `<a routerLink>` con `::after`) + chips y etiqueta de salón como enlaces hermanos elevados. Sin `<a>` anidados ni `stopPropagation`. Reemplaza la plantilla duplicada de las dos páginas.
4. **Tooltips**: se retiran («Ver contenido» ya no es cierto y la tarjeta tiene el «Ver curso →» visible); con ellos se va el gate anti-glitch del profesor. Se conservan los `data-info-anchor`.
5. **Redirect legacy**: función de inyección `setupCursoHubLegacyRedirect` (`shared/helpers/curso-hub-legacy-redirect.helpers.ts`, con spec) que reacciona a `queryParamMap`: si el `horarioId` está en la lista → `router.navigate` al hub con `replaceUrl`; si no está y ya se observó la carga → aviso «Franja no disponible» + limpiar el query (se queda en la lista, sin bucle); si la carga falló → solo limpiar el query. `tab` y `returnTo` se ignoran (el «atrás» del navegador vuelve al origen porque el redirect reemplaza la entrada). Mientras el redirect está pendiente la página muestra el spinner.
6. **Modales**: se retiran de las plantillas de Cursos (y el builder del profesor); los componentes y facades quedan en el código hasta F6.

## FUERA DE ALCANCE
- Migrar los consumidores externos del query al helper y **eliminar `returnTo`** (F5b).
- Retirar los modales de curso (F6).
- Cambios en el hub, en sus pestañas o en la página de Salones.
- Guard de salida (`canDeactivate`) para asistencia editada sin guardar: candidato a brief aparte (límite conocido de 761).
- Decidir el futuro de los menús de asistencia.
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, `takeUntilDestroyed`, sin `console.*`. UI en español, código en inglés. Archivos ≤ ~300 ln. `profesor/` no importa de `estudiante/` (lint de capas); los imports cross-role existentes llevan `eslint-disable` con razón. HTTP one-shots en services root con `firstValueFrom`, no `subscribe()` desnudo.

## VALIDACIÓN FINAL
- [ ] `bun run lint`, `bun run build` y `vitest run` de `pages/profesor`, `pages/estudiante` y `shared` en verde.
- [ ] Una tarjeta por par; un par de dos franjas muestra ambos chips; cada chip entra al hub con esa franja y el cuerpo entra con la franja preseleccionada.
- [ ] `…/cursos?horarioId=N` redirige al hub del par de ese horario (profesor y estudiante); un `horarioId` inexistente no deja la pantalla en blanco ni en bucle; el «atrás» del navegador vuelve al origen.
- [ ] Verificación en vivo con «ver como» (par multi-franja). En prod solo lectura; mutar solo en local con BBDD de prueba (`rules/browsing.md`).

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 D1 F5a — course card per pair and legacy horarioId redirect`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757, 758, 759, 760, 761 y 762 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` local va por delante de `origin/main` (14 commits al cierre de 762; el ref remoto puede estar desactualizado).
- Decidir el futuro de los menús de asistencia (estudiante y profesor) ahora que el hub tiene todas sus pestañas.
- Candidato a brief aparte: guard de salida (`canDeactivate`) para asistencia editada sin guardar.
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: revisar con `/triage`.
- Agregar el trabajo derivado (F5b, F6) al final de la cola del maestro si aplica (hoy la cola está vacía).

## CIERRE
Pedir feedback con `/feedback`.

## ⚠️ Docs flagged for review (skipped) <!-- doc-watch-skipped -->
| Doc | Disparador | Origen |
|---|---|---|
| reference/design-system.md | `shared/components/curso-pair-card/**` (tarjeta nueva) | local |

## RESULTADO F5a
Validación: lint ✅ · build ✅ · vitest 752/752 (pages/profesor, pages/estudiante, shared). Retirados tooltips «Ver contenido» y el gate `tooltipsReady`. Pendiente: verificación en vivo; F5b (consumidores externos + `returnTo`); F6 (retirar modales).
