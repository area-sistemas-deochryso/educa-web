# 772 — FE: P105 G F3 — migrar justificaciones y `attachments-modal` a `app-file-row` y retirar `getFileType`

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: G-F3 · **Fase**: F3 · **Creado**: 2026-10-06 · **Estado**: ✅ implementado (commit `355f6759` en `chat/772-p105-g-f3-archivos-justificaciones`, sin integrar a main)
> **Origen**: cierre del brief 771 (commit `8d9bbe48`, integrado en `main` local, **sin push**). D1 (hub de curso) y D2 quedaron cerradas; el siguiente tramo concreto de P105 sin bloqueo es G F3, anunciado como «fuera de alcance» en los briefs 751 y 747.
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → G (F3: "migrar justificaciones/horario"). Solo intención y decisiones.
> **depends_on**: brief 747 (G F1) ✅ y 751 (G F2) ✅ integrados en `main` local (ambos en `awaiting-prod/`).
> **MODO SUGERIDO**: `/investigate` (corto: inventariar los sitios y confirmar qué consume `getFileType`) → `/execute` → `/validate`. Sin `/design`: el patrón (`app-file-row`, `UPLOAD_*`, `validateUploadFile`) lo fijó F1 y F2 lo aplicó.
> **Validación prod**: ⏳ pendiente desde 2026-10-06 — smoke en local (`UseTestEnv: true`): justificar inasistencia con archivo válido y con uno rechazado (docx / >10 MB); abrir `attachments-modal` de un horario y abrir/eliminar cada fila.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches** (a re-verificar): `justificar-inasistencia-dialog`, `health-justification-dialog`, `attachments-modal` (horario), `BlobStorageService` (retiro del adaptador `getFileType`) y sus specs/scss.
> **hot-paths**: ninguno conocido

> ⚠️ **Frontmatter calculado automáticamente** (`exclusive: false`, `isolation: worktree`, un solo subsistema). Ajustalo antes de arrancar si querés otra cosa.

## OBJETIVO
Que los archivos de las **justificaciones de asistencia/salud** y del **`attachments-modal` del horario** usen la misma fila compartida (`app-file-row`), el mismo clasificador de tipo y el mismo formateador de tamaño que ya usa el módulo de cursos, y que la subida de esos sitios valide tipo/tamaño con `UPLOAD_LIMITS`/`validateUploadFile`. Al terminar se **retira** el adaptador `BlobStorageService.getFileType` (existía solo para no romper `attachments-modal`).

## DECISIONES VALIDADAS (no re-preguntar)
- G1: componente de fila único + un clasificador + un formateador de tamaño (plan 105, 2026-10-01).
- Preview = abrir en pestaña como hoy (`window.open`). **El visor in-app (F4) NO va aquí**: está condicionado por el brief 749 (URLs públicas del blob sin SAS) y por decisión del usuario.
- Solo FE. Sin cambios de BE.

## PRE-WORK
- Leer `.claude/chats/awaiting-prod/751-fe-p105-g-archivos-migrar-sitios-f2.md` (§ IMPLEMENTATION DETAIL: patrón de fila con acciones, limpieza de CSS, avisos de rechazo).
- Leer `.claude/chats/awaiting-prod/747-fe-p105-g-archivos-fila-compartida-f1.md` solo si hace falta el detalle de los helpers.
- Leer `.claude/reference/a11y.md` (botones con texto visible / `aria-label`) y `reference/dialogs-sync.md` si se tocan overlays.
- Leer `.claude/rules/browsing.md` antes de cualquier smoke (prod = solo lectura; mutar solo en local con `UseTestEnv: true`).
- `bun install --frozen-lockfile` en segundo plano en el worktree (~2-3 min).

## ALCANCE (re-verificar contra el código)
1. Buscar con **Grep por símbolo y por string**: `getFileType`, `getFileIcon`, `getFileIconClass`, `<input type="file"`, `formatFileSize`, y los nombres de los tres componentes. El brief lista los sitios que conocía el 751; pueden existir más o menos.
2. Migrar cada fila de archivo a `<app-file-row ...><span actions>…</span></app-file-row>`; borrar del `.scss` lo que quede sin uso.
3. Subida en justificaciones: aplicar `UPLOAD_ACCEPT` + `validateUploadFile`; avisos de rechazo con `ErrorHandlerService.showWarning` (**no** `EduMessageService`).
4. Retirar `BlobStorageService.getFileType` y su spec; verificar con Grep que nada más lo consume.
5. Specs: ajustar los existentes de los 3 componentes y agregar los mínimos para la validación de subida si no los tienen.

## TESTS MÍNIMOS
- Subida de un tipo no permitido → rechazada con aviso, no se adjunta.
- Subida de un archivo sobre el tope → rechazada con aviso.
- Archivo válido → aparece como `app-file-row` con ícono/tamaño correctos; «abrir» dispara `window.open`.
- Ningún consumidor queda usando `getFileType` (Grep = 0).

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@shared/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. Lint prohíbe `!` y `type X = {…}`. No tocar `shared/edu-ui/**`. Archivos del repo en **LF**: si editás con scripts en Windows, escribir con `newline=''` (en 771 un script Python dejó CRLF y git avisó).

## IMPLEMENTATION DETAIL (ADR-0006)
Observado en 747/751 y 771 para no re-investigar:
- Helpers de F1: `@core/helpers` → `classifyFile`, `getFileKindMeta`, `formatFileSize`, `FileKind`. `@shared/components` → `FileRowComponent` (`app-file-row`: `name`, `mimeType`, `sizeBytes`, `small`; output `open`; slot `[actions]`), `UPLOAD_LIMITS`, `UPLOAD_ACCEPT`, `validateUploadFile`.
- El `data-info-anchor` va en el host `app-file-row`.
- `BlobStorageService.getFileType` devuelve `'pdf' | 'doc' | 'image' | 'video' | 'link'` y solo lo mantenía vivo `attachments-modal`.
- **Esta vez no hay estado «pendiente de integrar»**: 747 y 751 ya están en `main`, así que el worktree parte con los helpers disponibles.

## APRENDIZAJES TRANSFERIBLES (de 771)
- **Reproducir antes de arreglar**: un test rojo escrito primero mostró un bug adicional (un `computed` cacheado sobre un campo que no era signal). En F3, si cambia el comportamiento de validación de subida, escribir primero el test.
- **`computed` sobre estado no-signal**: si un `computed` lee un campo plano (`selectedDate`, un input de formulario), queda cacheado. Derivarlo en un método o pasar el estado a signal.
- **Entorno**: `bunx vitest run <ruta>` (desde la raíz del repo/worktree, no desde `src/`), `bun run lint`, `bun run build`. Antes de `git worktree remove`, comprobar junctions (`wt-clean` §3b); en 771 `node_modules` era una instalación real, sin riesgo.
- **Worktree**: `EducaWeb/WT/educa-web/<NNN>-<slug>`. `/wt-merge` deja la rama de integración; promover a `main` con `--ff-only` **antes** de `/wt-clean`. Un brief solo existe en el main (untracked), no viaja en la rama del worktree.
- **Commits**: sin `Co-Authored-By` (la regla del usuario manda sobre el pie sugerido por el sistema). Inglés, Conventional Commits.
- **Topes de buckets**: `open/` y `awaiting-prod/` no tienen límite; solo edad crítica (`rules/backlog-hygiene.md`).

## FUERA DE ALCANCE
- **F4**: visor in-app de imagen/PDF (depende del brief 749 y de decisión del usuario).
- Seguridad de las URLs públicas del blob (SAS / URL firmada): trabajo de BE aparte.
- Mensajería y foro (no manejan archivos).
- Los smokes manuales pendientes de 747/751 (van por `/verify`).
- Cambios de BE.

## VALIDACIÓN FINAL
- [ ] `bunx eslint` sobre lo tocado, `bun run build`, `bunx vitest run src/app/features/intranet src/app/core src/app/shared` con exit 0.
- [ ] 0 resultados de Grep para `getFileType`, `getFileIcon`, `getFileIconClass` y `<input type="file"` nativo en los sitios migrados.
- [ ] Verificación en vivo (local, `UseTestEnv: true`): justificar una inasistencia con un archivo válido y con uno rechazado; abrir el `attachments-modal` de un horario y abrir cada fila. **O** diferido a `/verify` con la razón escrita.

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/`.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`refactor(intranet): P105 G F3 — migrate attendance-justification and schedule attachment files to app-file-row`

## PENDIENTES HEREDADOS
- `/verify 769`, `/verify 770` y `/verify 771` (smoke manual con «ver como» profesor; en `awaiting-prod/`).
- `main` local está **26 commits por delante de `origin/main`**: push = deploy a prod, no sin autorización.
- Worktree `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: `/triage`.
- Brief 771 sigue **untracked** en `awaiting-prod/` (no se versionó).

## CIERRE
Pedir feedback con `/feedback`.

## RESULTADO (cierre)
- Decisión con el usuario: las justificaciones usan `JUSTIFICATION_UPLOAD_LIMITS` (PDF/imagen, 10 MB, alineado al BE) vía `validateUploadFile(file, limits)`; el resto usa `UPLOAD_LIMITS`.
- Se retiraron `BlobStorageService.getFileType` y `formatFileSize` (sin consumidores) y `UI_ATTACHMENT_MESSAGES.fileTooLarge`.
- `attachments-modal`: se eliminó el botón «Descargar» (la fila ya abre en pestaña); tope de subida 50 → 100 MB.
- Validación: eslint, build y vitest (308 archivos / 3104 tests) en verde. Grep de `getFileType`/`getFileIcon`/`getFileIconClass` = 0.
- Pendiente: `/wt-merge` + promover a `main` con `--ff-only` + `/wt-clean`; `/verify 772`.
