# 767 — FE: P105 D2 — Qué queda de «descomponer diálogos pesados» tras el hub

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D2 · **Fase**: investigación previa · **Creado**: 2026-10-05 · **Estado**: ✅ implementado, validación prod pendiente.
> **Origen**: cierre del brief 766 (F7, commit `8a28982a`), que completó D1 (hub de curso).
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "Subplanes de D" y tabla de D. Solo intención y decisiones.
> **depends_on**: D1 ✅ (F1a–F7 integrados en `main` local).
> **Validación prod**: ⏳ pendiente desde 2026-10-05 — smoke visual con «ver como» de `calificar-dialog` en modo individual, grupal y literal (el diálogo no tiene spec propio).
> **MODO SUGERIDO**: `/investigate` → (`/design` solo si queda algo que valga la pena) → `/execute` → `/validate`. Razón: el alcance original se encogió; hay que medir antes de planear.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: por determinar en la investigación (candidatos: `pages/profesor/cursos/components/*-dialog/`, `pages/estudiante/**/*-dialog/`).
> **hot-paths**: ninguno conocido

## OBJETIVO
D2 pedía descomponer `curso-content-readonly-dialog` y afines en subcomponentes, reutilizando la fila de archivos de G. Ese diálogo ya no existe. Determinar si queda algún diálogo pesado de curso que justifique descomponerlo, y decidir con datos si D2 se ejecuta, se reduce o se descarta.

## DECISIONES VALIDADAS (no re-preguntar)
- D2 fue diferido «hasta D1, porque el hub reordena esos diálogos». D1 ya cerró.
- El plan dice que el reemplazo del modal de curso por el hub «**absorbe D2 en lo que toca a los diálogos de curso**»: el alcance de D2 solo puede ser lo que NO absorbió el hub.
- G1 (fila de archivos unificada) está integrada; D2 la reutiliza, no la rehace.

## PRE-WORK
- Leer la tabla de D y «Subplanes de D» del plan. Ver si el brief 751 (G F2) sigue pendiente: la fila de archivos de G debe estar integrada antes de reutilizarla.
- Medir tamaños: `wc -l` de los `*-dialog.component.ts` de `pages/profesor/cursos/components`, `pages/estudiante/**` y los `.html`/`.scss` de cada uno.

## ALCANCE (re-verificar contra el código)
Estado observado al cierre de 766 (líneas del `.ts`; el `.html` y el `.scss` pueden pesar más): `calificar-dialog` 308, `tarea-dialog` 254, `estudiante-salon-dialog` 288, `evaluacion-form-dialog` 191, `justificar-inasistencia-dialog` 171, `semana-edit-dialog` 153. El tope del repo es ~300 líneas por archivo.
- Entregable de la investigación: tabla `diálogo | ln ts/html/scss | consumidores vivos | reutiliza fila de archivos (sí/no) | ¿descomponer?` con una recomendación por diálogo.
- Solo si la tabla justifica trabajo: `/design` corto y brief(s) de ejecución derivados. **No ejecutar descomposiciones en este chat sin diseño aprobado.**

## IMPLEMENTATION DETAIL (ADR-0006)
- **F6 (`ed53e1c2`)** borró `curso-content-dialog`, `curso-content-readonly-dialog` y `course-switcher`. **F7 (`8a28982a`)** retiró el estado de modal residual de los stores.
- El hub vive en `pages/{profesor,estudiante}/cursos/curso-hub/`. Quedan diálogos que el hub usa por dentro (`app-curso-builder-dialog`, `semana-edit-dialog`, `tarea-dialog`, `archivos-summary-dialog`, etc.): confirmar cuáles se abren desde el hub antes de tocarlos.
- Hay un comentario en `src/_tokens.scss:131` que aún menciona `curso-content-readonly-dialog` y `curso-content-dialog` (borrados). Si se toca ese archivo, limpiarlo.

## APRENDIZAJES TRANSFERIBLES (de 766)
- **No asumir que «abrir/cerrar» es solo un flag**: `closeContentDialog` del store de estudiante también limpiaba `contenido` y cachés, y `resetForHub()` dependía de eso (hoy es `resetContenido()`). Leer el cuerpo antes de borrar.
- **Buscar por ruta, no solo por símbolo**: `styleUrl`/`templateUrl` de otros componentes referencian SCSS de diálogos (en F6 aparecieron tres).
- **`sed` con CRLF**: los `.ts` pueden tener `\r`; para edición masiva usar Python con detección de `\r\n`.
- **Tests**: `bunx vitest run src/app/features/intranet/pages/profesor src/app/features/intranet/pages/estudiante src/app/features/intranet/shared` (~35 s, 744 verdes al cierre de 766). `bun run lint` y `bun run build` en paralelo.
- **Worktree**: `git worktree add -b chat/767-… ../../WT/educa-web/767-…`; `bun install --frozen-lockfile` en segundo plano.
- **Integrar**: `git merge --ff-only` directo a `main` y `git worktree remove` + `git branch -d`; no hizo falta rama de integración.
- **Cierre**: `awaiting-prod/` está en **23** (soft 20, duro 25). Hacer `/verify` en bloque antes de cerrar otro brief ahí.

## FUERA DE ALCANCE
- Cambios en el hub, sus pestañas o `curso-pair-card`.
- D3 (color por curso, cubierto por H F2), D4 (progreso en tarjetas) y D5 (móvil).
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. Cap ~300 ln por archivo. Lint prohíbe `!` y `type X = {…}` (usar `interface`). Estilos: leer `reference/design-system.md` antes de tocar `.scss`/`.html` bajo `features/intranet/**`.

## VALIDACIÓN FINAL
- [ ] Tabla de diálogos entregada con recomendación por cada uno.
- [ ] Si hubo ejecución: `bun run lint`, `bun run build` y Vitest de `pages/profesor`, `pages/estudiante` y `shared` en verde; smoke local con «ver como» (mutar solo en local con BBDD de prueba, `rules/browsing.md`).

## CRITERIOS DE CIERRE
- [ ] Decisión registrada (ejecutar / reducir / descartar D2) y reflejada en la tabla «Subplanes de D» del plan.
- [ ] Brief movido `running/` → `closed/` (o `awaiting-prod/` si hubo código) en el mismo commit.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`docs(plan): P105 D2 — record what is left of the heavy dialogs after the hub` (si solo hay investigación). Si hay código: `refactor(intranet): P105 D2 — split <dialog> into subcomponents`.

## PENDIENTES HEREDADOS
- Verificación en vivo de 757–766 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` local va por delante de `origin/main`.
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: revisar con `/triage`.

## CIERRE
Pedir feedback con `/feedback`.

## RESULTADO (cierre 2026-10-05)
- **Decisión**: D2 **reducido** a `calificar-dialog`. Los otros 5 diálogos medidos (`tarea`, `estudiante-salon`, `evaluacion-form`, `justificar-inasistencia`, `semana-edit`) quedan bajo el tope y no tocan archivos; G ya migró los sitios de archivos a `app-file-row`.
- **Hecho**: `calificar-dialog` partido en `calificar-individual-table` y `calificar-grupo-list` (bajo `components/`) + `clampNota`/`literalMidpoint`/`sanitizeObservacion` en helpers con spec. `.ts` 308→201, `.html` 345→146.
- **Validación**: lint 0 errores, build OK, Vitest profesor/estudiante/shared 744 verdes + 6 nuevos.
- **Aprendizaje**: Python en Windows abre con cp1252; al escribir texto con tildes usar `encoding='utf-8'` o edición binaria. El spec de helpers lo atrapó.
- **Pendiente**: actualizar «Subplanes de D» en el plan de `educa-coord` (D2 reducido y hecho en 767); aún no hecho.
