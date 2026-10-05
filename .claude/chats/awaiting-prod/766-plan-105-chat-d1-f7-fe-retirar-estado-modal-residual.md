# 766 — FE: P105 D1 F7 — Retirar el estado de modal residual de stores y facades de curso

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F7 (limpieza derivada de F6) · **Creado**: 2026-10-05 · **Estado**: ✅ implementado (rama `chat/766-p105-d1-f7-retirar-estado-modal`)
> **Origen**: brief 765 (F6, commit `ed53e1c2`, ya en `main` local sin push; vive en `awaiting-prod/`)
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso". Solo intención y decisiones.
> **depends_on**: F6 ✅ (765).
> **Validación prod**: ⏳ pendiente desde 2026-10-05 — falta smoke local con «ver como» (hub → Contenido → crear desde el builder); sin push a `main`.
> **MODO SUGERIDO**: `/investigate` → `/execute` → `/validate`. Razón: borrado de código muerto con consumidores a re-verificar; sin decisión de diseño abierta.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `pages/profesor/cursos/services/{curso-contenido.store,curso-contenido-data.facade,curso-contenido-ui.facade}.ts`, `pages/estudiante/services/{estudiante-cursos.store,estudiante-cursos.facade}.ts` y sus specs.
> **hot-paths**: ninguno

## OBJETIVO
F6 retiró los modales de curso, pero dejó en los stores y facades el estado que existía para abrirlos. Retirarlo para que no quede código que parece vivo y no lo está.

## DECISIONES VALIDADAS (no re-preguntar)
- El hub es la única vía a un curso; los modales ya no existen (F6).
- Solo FE. Sin cambios de BE ni del hub.
- F6 dejó esto a propósito: quitarlo toca el diseño de los stores, por eso no entró en ese commit.

## PRE-WORK
- Leer `chats/awaiting-prod/765-…md`.
- `grep` de `contentDialogVisible`, `openContentDialog`, `closeContentDialog`, `builderDialogVisible`, `openBuilderDialog`, `closeBuilderDialog` antes de borrar cada uno.

## ALCANCE (re-verificar contra el código)
Candidatos, sin consumidor en componentes ni templates al cierre de F6 (solo los tocan services y specs):
- **Profesor** (`curso-contenido.store.ts`): `contentDialogVisible` y `builderDialogVisible` (estado, computed, entrada del `vm`), con `open/closeContentDialog` y `open/closeBuilderDialog`.
- **Profesor** (`curso-contenido-data.facade.ts`): las llamadas a `openContentDialog`, `closeContentDialog` y `openBuilderDialog` que quedan dentro de otros métodos (create/delete content), y el comentario de `loadContenidoForHub` que explica por qué no deja `contentDialogVisible` en `true`.
- **Profesor** (`curso-contenido-ui.facade.ts`): `closeContentDialog`.
- **Estudiante** (`estudiante-cursos.store.ts`): `contentDialogVisible`, `openContentDialog`, `closeContentDialog`. En `estudiante-cursos.facade.ts`: `closeContentDialog` y la llamada de otro método.
- Specs: los `expect(...contentDialogVisible()).toBe(false)` de los specs del hub y los bloques de `curso-contenido.store.spec.ts` y `estudiante-cursos.store.spec.ts` que prueban el estado retirado.
- **No** se borra nada que el hub use. Confirmar uno por uno: `builderDialogVisible` puede seguir vivo si `profesor-curso-hub-contenido` abre `app-curso-builder-dialog` por ese estado.

## IMPLEMENTATION DETAIL (ADR-0006)
- **F6 hizo** (`ed53e1c2`): borró `curso-content-dialog`, `curso-content-readonly-dialog` y `course-switcher`. Retiró `CursoContenidoDataFacade.loadContenido` y `switchCourse`, `initialTab` (estado, computed, `setInitialTab`, `clearInitialTab`) y `EstudianteCursosFacade.loadContenido`.
- **SCSS movido**: tres componentes del hub cargaban su `styleUrl` desde el SCSS de los modales. Ahora viven en `pages/{profesor,estudiante}/cursos/curso-hub/curso-hub-content.scss`.
- **Estado de `main`**: lint 0 errores (4 warnings preexistentes), build OK, Vitest de `pages/profesor`, `pages/estudiante` y `shared` = 747 verdes.
- Las constantes `loadContenido` de `ui-feature-messages.ts` siguen en uso por el hub: no tocarlas.

## APRENDIZAJES TRANSFERIBLES (de 765)
- **Revisar `styleUrl` y `templateUrl` de otros componentes antes de borrar**: el grep por nombre de símbolo no los encuentra. En F6 aparecieron tres referencias al SCSS de un modal solo al buscar la ruta del archivo.
- **`sed` con CRLF**: los `.ts` de este repo pueden tener `\r`. Para patrones de línea entera usar `\r\?$`.
- **`node_modules`**: una regla de permisos bloquea `ls` sobre `node_modules`. No listarlo; correr `bun run lint` directo y ver si falla.
- **Tests**: `bunx vitest run src/app/features/intranet/pages/profesor src/app/features/intranet/pages/estudiante src/app/features/intranet/shared` (~35 s). `bun run lint` y `bun run build` en paralelo.
- **Worktree**: `git worktree add -b chat/766-… ../../WT/educa-web/766-…`; registrar en `.claude/.locks/worktrees.json`; `bun install --frozen-lockfile` en segundo plano.
- **Integrar**: tras `/end`, F6 se integró con `git merge --ff-only` directo a `main` y se limpió con `git worktree remove`; no hizo falta rama de integración.
- **Cierre**: `awaiting-prod/` está en **22** (soft 20, duro 25). Hacer `/verify` en bloque antes de cerrar otro brief ahí.

## FUERA DE ALCANCE
- Cambios en el hub, sus pestañas o `curso-pair-card`.
- Guard de salida (`canDeactivate`) para asistencia editada sin guardar.
- Futuro de los menús de asistencia.
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. El lint prohíbe `!` y `type X = {…}` (usar `interface`). No borrar código con consumidores vivos: `grep` antes.

## VALIDACIÓN FINAL
- [ ] `bun run lint`, `bun run build` y `vitest run` de `pages/profesor`, `pages/estudiante` y `shared` en verde.
- [ ] `grep` de los símbolos retirados no devuelve nada fuera de lo intencional (incluir `.html` y rutas de `styleUrl`).
- [ ] Smoke en local con «ver como»: abrir el hub de un curso, la pestaña Contenido y crear contenido desde el builder sigue funcionando. Mutar solo en local con BBDD de prueba (`rules/browsing.md`).

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`refactor(intranet): P105 D1 F7 — drop leftover course modal state from stores`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757–765 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` local va por delante de `origin/main`.
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: revisar con `/triage`.

## CIERRE
Pedir feedback con `/feedback`.

## RESULTADO (2026-10-05)
- Profesor: retirados `contentDialogVisible`/`builderDialogVisible` (estado, computed, `vm`) y `open/close` de ambos en el store; `closeContentDialog`/`closeBuilderDialog` del ui facade; `crearContenido` y `eliminarContenido` del data facade (sin callers, solo contenían las llamadas a retirar).
- Estudiante: retirados `contentDialogVisible` y `openContentDialog`. `closeContentDialog` del store pasó a `resetContenido()` porque `resetForHub()` depende de que limpie `contenido` y cachés; el facade perdió `closeContentDialog`.
- Validación: lint 0 errores (4 warnings preexistentes) · build OK · Vitest 744 verdes (pages/profesor, pages/estudiante, shared).
- Queda un comentario en `src/_tokens.scss:131` que menciona los modales borrados (no tocado).
