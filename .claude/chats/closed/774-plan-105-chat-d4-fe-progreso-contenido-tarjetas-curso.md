# 774 — FE: P105 D4 — progreso de contenido en las tarjetas «Mis Cursos»

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo. Si `/investigate` concluye que falta un dato agregado en BE, **parar y derivar** a un brief `Educa.API` (no editar BE desde acá).
> **Plan**: 105 · **Chat**: D4 · **Fase**: D4 · **Creado**: 2026-10-06 · **Estado**: ✅ cerrado 2026-10-06 (diseño + brief BE 775)
> **Origen**: elegido por el usuario al cierre de 773 (G F4). Cola del maestro vacía; D4 es el único subplan de D «sin investigar» que el plan marca como investigable ahora.
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § D (tabla de subplanes) y `educa-coord/plans/xrepo/080-099/xrepo-89-propuestas-rediseno-ux-horarios-cursos.md` § 5 (origen: P89 #5). Solo intención y decisiones.
> **depends_on**: ninguno bloqueante. Relacionado: D1 (hub por curso, F5a «tarjeta por par») puede haber cambiado la tarjeta o absorber el indicador.
> **MODO SUGERIDO**: `/investigate` (hechos de datos, ver preguntas) → `/design` (obligatorio si toca ≥3 archivos o hay endpoint) → `/execute` → `/validate`.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches** (a re-verificar): `src/app/features/intranet/pages/estudiante/cursos/estudiante-cursos.component.*`, `src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.*`, el facade/store/DTO que alimentan esas tarjetas; posible dato agregado en BE.
> **hot-paths**: ninguno conocido.

## OBJETIVO
Que la tarjeta de curso de «Mis Cursos» (estudiante y profesor) muestre un **indicador de progreso de contenido** (ej. «4/16 semanas con material»), hoy ausente: la tarjeta muestra solo nombre, salón, horario y cantidad de estudiantes. Decidir primero **qué dato es el progreso y de dónde sale**; recién después, cómo se dibuja.

## DECISIONES VALIDADAS (no re-preguntar)
- D se partió en subplanes; D4 = «progreso en tarjetas de curso» (usuario, 2026-10-01, decisión de no materializar D como brief único).
- Affordance de click de la tarjeta ya resuelta (brief 454): toda la tarjeta es clicable. No es parte de D4.
- Color por curso lo cubre H (745/750); no tocar color.
- **Aún sin decidir** (a cerrar en `/design`, con el usuario): qué significa «progreso» para cada rol (ver preguntas).

## PREGUNTAS ABIERTAS PARA `/investigate` (hechos, no decisiones)
1. **Estado actual de la tarjeta**: ¿D1 F5a (tarjeta por par curso+salón, selector de franja) ya se materializó? Leer la tarjeta vigente en `estudiante-cursos.component` y `profesor-cursos.component` antes de asumir lo que dice el plan P89 (que describe la tarjeta de 2026-0x).
2. **Dato disponible hoy**: ¿el DTO de horario/curso que llega a la lista ya trae algún agregado de contenido por curso (semanas con material, total de semanas, tareas)? El plan P89 dice que ese cálculo hoy vive solo dentro del diálogo de contenido (`CursoContenidoDataFacade`), que se carga al abrir el detalle.
3. **¿Se puede derivar en FE sin endpoint nuevo?** Costo de cargar el contenido de N cursos solo para pintar la lista (N+1 requests, rate limiting, cache SWR). Medir cuántas tarjetas ve un usuario típico (el plan midió en TEST: estudiante hasta 2 cursos por horarios del salón, hasta 9-20 por grado; verificar contra lo que la lista realmente muestra).
4. **Si hace falta BE**: forma mínima del agregado (por `cursoId`+salón / por horario), si vive en un endpoint existente o uno nuevo, e impacto en `educa-coord/contracts/api-catalog.md`. **No implementar**; solo describirlo para un brief BE.
5. **Semántica por rol**: estudiante («semanas con material publicado» ≠ progreso del alumno) vs profesor («semanas con contenido cargado» ≈ avance de preparación). ¿Hay una métrica más útil ya disponible (tareas por vencer, calificaciones por cerrar — widgets de Inicio, P105 F)?

## HALLAZGOS `/investigate` (2026-10-06)
1. **Tarjeta vigente**: D1 F5a ya está materializado. Ambas páginas (`estudiante-cursos.component.ts`, `profesor-cursos.component.ts`) usan `CursoPairCardComponent` (`features/intranet/shared/components/curso-pair-card/`), una tarjeta por par (curso, salón) con chips de franja. Recibe `CursoHubPairGroup` (`shared/helpers/curso-hub-pair.helpers.ts`) y tiene un único `<ng-content />` para la línea propia del rol (estudiante: profesores; profesor: cantidad de estudiantes). El indicador entraría ahí o como input nuevo.
2. **Dato hoy**: `HorarioProfesorDto` (`pages/profesor/models/profesor.models.ts:9`) no trae ningún agregado de contenido (solo id/franja/salón/curso/profesor/cantidadEstudiantes). Los endpoints de lista son `GET /api/estudiantecurso/mis-horarios` (`HorarioResponseDto`) y el de profesor vía `ProfesorFacade`. El contenido solo sale de `GET /api/CursoContenido/horario/{horarioId}` (profesor) y `GET /api/estudiantecurso/horario/{horarioId}/contenido` (estudiante), que devuelven `CursoContenidoDetalleDto` completo con `numeroSemanas` y `semanas[]` (archivos + tareas + archivos de tarea).
3. **Derivar en FE = N+1 pesado**: el hub ya hace un sondeo **por franja** (`curso-hub-shell.base.ts:297` `probeContent`, `forkJoin` de `probeContenido(slot.id)`), pero solo al entrar a un par. Hacerlo en la lista = (pares × franjas) GETs, cada uno con `ContenidoConIncludes()` (semanas+archivos+tareas, `CursoContenidoRepository.cs:53/166`). Estudiante con 9-20 cursos × ~2 franjas = 18-40 requests pesados al abrir «Mis Cursos». Límites: `global` reads 200/min por usuario (`rate-limiting.md`), `MAX_CONCURRENT = 10` en FE (`rate-limit.interceptor.ts:15`). Cabe en el cupo, pero es payload desproporcionado para pintar un número. `cursoContenido` está en `cache-versions.config.ts` (SWR), así que la segunda visita sería barata.
4. **Si hace falta BE**: agregado mínimo por horario `{ horarioId, numeroSemanas, semanasConMaterial }` (idealmente embebido en `mis-horarios` / el listado de horarios del profesor, no endpoint nuevo). Impacta `educa-coord/contracts/api-catalog.md` (líneas 121 y 137) y el DTO de lista.
5. **Restricción del plan 105 (D1, `xrepo-105…md` ~línea 143 y 177)**: contenido, calificaciones y asistencia **cuelgan del horario (franja)**, no del par; el hub «nunca agrega entre franjas». Una tarjeta es un **par** con N franjas → la métrica por tarjeta debe decidir: por franja (un indicador por chip) o resumen del par (contradice «no agregar»). Criterio actual de «semana con material» en el FE: `archivos.length > 0 || tareas.length > 0` (contadores en `estudiante-curso-hub-contenido.component.html:72-81`); título/descripción/mensajeDocente existen pero no cuentan hoy como material.
6. **Semántica por rol / alternativas ya disponibles**: Inicio ya tiene `mis-tareas-por-vencer` (estudiante, brief 728) y `calificacion/por-congelarse` (profesor), ambos con `horarioId`; podrían pintarse como badge en la tarjeta con costo cero extra (ya se piden en Inicio), pero miden urgencia, no «progreso de contenido».

## DISEÑO `/design` (validado por el usuario, 2026-10-06)
**Decisiones**: (a) fuente = agregado en BE (no N+1 en FE); (b) granularidad = un indicador por chip de franja (respeta D1 «no agregar entre franjas»). Brief BE derivado: `Educa.API/.claude/chats/open/775-be-p105-d4-resumen-contenido-por-horario-en-listas-horarios.md`.

**Contrato esperado (FE)**: `HorarioProfesorDto.contenidoResumen?: { numeroSemanas: number; semanasConMaterial: number } | null` en las dos listas que alimentan las tarjetas (`mis-horarios`, `horario/profesor/{id}`). «Semana con material» = `archivos > 0 || tareas > 0`.

**Métrica por rol**: igual dato, rótulo distinto. Estudiante: «N/M semanas con material» (material publicado, no avance del alumno). Profesor: «N/M semanas con contenido» (avance de preparación). No intercambiar rótulos.

**Representación (brief FE posterior)**: en `CursoPairCardComponent`, dentro de cada chip de franja (o bajo él), mini barra + texto `n/N`. a11y: `role="progressbar"`, `aria-valuemin=0`, `aria-valuenow`, `aria-valuemax`, `aria-label` con texto completo («Franja lunes 08:00: 4 de 16 semanas con material»); el texto `n/N` visible, no solo color. Tokens de `design-system.md` §7, sin hex.

**Estados**: `contenidoResumen == null` → «Sin contenido» (no «0/0», no barra); `semanasConMaterial == 0` con `numeroSemanas > 0` → «0/N» con barra vacía; campo ausente (BE viejo / SW cache previo) → no se pinta indicador, tarjeta intacta (degradación silenciosa, sin error de página).

**Impacto FE a re-verificar al ejecutar**: `HorarioProfesorDto` (modelo compartido), `groupHorariosByPair` (el resumen es por slot, ya viaja en `slots[]`), `curso-pair-card.component.ts`, specs de ambas páginas y de la tarjeta, bump de `cache-versions.config.ts` (horarios) si el SW cachea la forma vieja.

**Resultado del chat**: cierra en diseño + brief BE derivado (775). El brief FE consumidor se crea después del deploy/merge de 775 (depende de BE).

## PRE-WORK
- Leer el § D y § Decisiones del usuario del plan 105, y el § 5 de P89 (rutas arriba).
- Leer `.claude/reference/architecture.md` y `reference/state-management.md` (stores/facades) y, si se va a tocar template, `reference/design-system.md` (BIG) y `reference/a11y.md` (barra de progreso accesible: `role="progressbar"`, `aria-valuenow`, no solo color).
- Si la investigación apunta a un endpoint: `../educa-coord/contracts/api-catalog.md` y `rate-limiting.md`.
- `.claude/rules/browsing.md` antes de cualquier smoke (prod = solo lectura; mutar solo en local con `UseTestEnv: true`).
- `bun install --frozen-lockfile` en segundo plano en el worktree (~2-3 min).

## ALCANCE (punto de partida, no diseño)
1. `/investigate`: responder las 5 preguntas con hechos y evidencia de código.
2. `/design`: definir (a) métrica de progreso por rol, (b) fuente del dato (FE derivado vs agregado BE), (c) representación visual y su a11y, (d) estados vacío/cargando/sin contenido. Presentar alternativas con trade-off al usuario; no elegir por él si hay costo de BE.
3. `/execute` solo si el dato es derivable en FE. Si requiere BE, cerrar este chat con el diseño y un brief `Educa.API` derivado.

## TESTS MÍNIMOS (si se ejecuta)
- Tarjeta con contenido parcial → indicador con el valor correcto y `aria-valuenow`/`aria-valuemax`.
- Tarjeta sin contenido → estado vacío explícito (no «0/0» ni barra rota).
- Carga del agregado falla → la tarjeta sigue usable (degradación silenciosa del indicador, no error de página).
- Estudiante y profesor no ven métricas intercambiadas.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@shared/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. Lint prohíbe `!`, `type X = {…}` (usar `interface`) y `bypassSecurityTrust*` (salvo excepciones ya registradas). No tocar `shared/edu-ui/**`. `edu-dialog` jamás dentro de `@if`. Archivos del repo en **LF**; si editás con scripts en Windows usá `newline=''` y `encoding='utf-8'` explícito, o `PYTHONUTF8=1`. Sin hex literales: tokens de `design-system.md` §7.

## IMPLEMENTATION DETAIL (ADR-0006)
Observado en 773 para no re-investigar:
- Entorno: `bunx vitest run <ruta>` **desde la raíz** del repo/worktree, `bun run lint`, `bun run build`; validar lint + build + vitest en paralelo (~1 min). Suite amplia: `bunx vitest run src/app/features/intranet src/app/core src/app/shared` (310 archivos / 3138 tests al cierre de 773).
- `eslint` sobre lo tocado: `bunx eslint <archivos>`; un archivo nuevo de componente/servicio entra en alcance de las reglas `structure/*` y `max-lines` (300).
- La tarjeta y su facade pueden estar en cursos del hub (`curso-hub/`); el hub trae su propia implementación de Contenido (F1b de D1), así que **no asumir** que el cálculo de semanas en `curso-content-dialog` sigue siendo la única fuente.
- Estructura de `shared/components`: componentes compartidos nuevos van en carpeta propia con `index.ts` y se re-exportan desde `shared/components/index.ts` (ej. `file-row/`, `file-viewer/` de 772/773).
- **Worktree**: `EducaWeb/WT/educa-web/<NNN>-<slug>`. `/wt-merge` crea `integration/…`; promover a `main` con `--ff-only` **antes** de `/wt-clean`. El brief vive solo en main (untracked), no viaja en la rama. Revisar junctions antes de `git worktree remove` (en 772/773 `node_modules` era instalación real, sin junction).
- **Commits**: inglés, Conventional Commits, **sin `Co-Authored-By`** (la regla del usuario manda sobre el pie sugerido por el sistema).

## APRENDIZAJES TRANSFERIBLES (de 773)
- **Verificar la premisa del target antes de generar el brief**: «C F2» ya estaba hecho (brief 746 en `awaiting-prod/`); leer el estado real en `awaiting-prod/` evita briefs duplicados.
- **Reproducir antes de arreglar**; si el cambio altera comportamiento existente, escribir primero el test. Los specs viejos que asumían `window.open` fallaron al migrar: al cambiar un contrato compartido, correr la suite del subsistema completo, no solo los archivos propios.
- **Una regla de lint que bloquea es una decisión del usuario**, no del chat: parar y preguntar (en 773 fue `security/no-bypass-security-trust`; se resolvió con excepción puntual registrada en `eslint.config.js`).
- **Preguntar cuando el target es ambiguo** (cola vacía): ofrecer candidatos con repo y modo.

## FUERA DE ALCANCE
- Color por curso (H), affordance de click de la tarjeta (454), hub por curso (D1) y diálogos pesados (D2).
- D5 (móvil/responsive) y cualquier QA en dispositivo.
- Implementar BE desde este chat: si hace falta dato agregado, solo se describe y se deriva.
- Seguridad de URLs del blob (SAS / `INV-BLOB01`): trabajo BE aparte, sin brief todavía.

## VALIDACIÓN FINAL
- [ ] Si hubo código: `bunx eslint` sobre lo tocado, `bun run build`, `bunx vitest run src/app/features/intranet src/app/core src/app/shared` con exit 0.
- [ ] Las 5 preguntas de `/investigate` respondidas con evidencia (rutas/archivos) en el brief.
- [ ] Decisión de métrica y fuente validada por el usuario antes de ejecutar.
- [ ] Verificación en vivo (local, `UseTestEnv: true`) de la tarjeta de estudiante y de profesor, o diferida a `/verify` con la razón escrita.

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/`.
- [ ] Commit sin `Co-Authored-By`. Si el resultado es solo diseño/derivación, commit `docs` y brief BE derivado en `Educa.API/.claude/chats/open/`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 D4 — show content progress on course cards` (o `docs(plan): P105 D4 — design content-progress on course cards` si cierra en diseño).

## PENDIENTES HEREDADOS
- `/verify 746`, `/verify 769`–`/verify 773` (smoke manual; en `awaiting-prod/`). 773 verifica el visor de imagen/PDF y que `.docx` no abre visor.
- `main` local está **28 commits por delante de `origin/main`**: push = deploy a prod, no sin autorización.
- Worktree `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: `/triage`.
- Briefs 771, 772 y 773 siguen **untracked** en `awaiting-prod/` (no se versionaron).
- Sin brief BE para la seguridad del blob (hallazgo de 749).

## CIERRE
Pedir feedback con `/feedback`.
