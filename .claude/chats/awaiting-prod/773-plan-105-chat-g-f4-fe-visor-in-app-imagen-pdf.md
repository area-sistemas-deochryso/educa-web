# 773 — FE: P105 G F4 — visor in-app de imagen y PDF para `app-file-row`

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Validación prod**: ⏳ pendiente desde 2026-10-06 — smoke en vivo de imagen/PDF/.docx (curso, attachments-modal, entrega). Commit `05719ff1` en `chat/773-p105-g-f4-visor-in-app-imagen-pdf`, sin push.
> **Plan**: 105 · **Chat**: G-F4 · **Fase**: F4 · **Creado**: 2026-10-06 · **Estado**: ✅ cerrado localmente 2026-10-06
> **Origen**: cierre del brief 772 (commit `355f6759`, integrado en `main` local, **sin push**). G F1-F3 terminaron: todos los sitios de archivos usan `app-file-row`. F4 es lo único que queda de G y el usuario lo dejó **firme** el 2026-10-01 (G2: «visor in-app: imagen y PDF inline; resto descarga»).
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → G, y § Decisiones del usuario (2026-10-01). Solo intención y decisiones.
> **depends_on**: brief 747 (F1) ✅, 751 (F2) ✅, 772 (F3) ✅ — los tres en `main` local y en `awaiting-prod/`. Brief 749 (BE, `closed`) aportó el hallazgo de seguridad que condiciona este trabajo (ver abajo).
> **MODO SUGERIDO**: `/investigate` (corto, 2 preguntas abiertas de abajo) → `/design` (obligatorio: componente nuevo + ≥3 archivos de consumo) → `/execute` → `/validate`.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches** (a re-verificar): `shared/components/file-row/**`, un componente nuevo de visor en `shared/components/`, y los consumidores de `(open)` de `app-file-row` (`semanas-accordion`, `estudiante-curso-hub-contenido`, `student-files-dialog`, `student-task-submissions-dialog`, `archivos-summary-dialog`, `attachments-modal`).
> **hot-paths**: ninguno conocido. No tocar `shared/edu-ui/**`.

## OBJETIVO
Que al abrir un archivo desde `app-file-row` las **imágenes y los PDF se vean dentro de la app** (modal con visor) en vez de salir a una pestaña nueva con `window.open`; el resto de tipos sigue bajando/abriéndose como hoy. El visor debe ser **una sola pieza compartida**, no una copia por consumidor (es el mismo problema que G resolvió para la fila).

## DECISIONES VALIDADAS (no re-preguntar)
- G1 + G2: fila única (hecho) + visor in-app. Visor = **imagen y PDF inline; el resto descarga** (usuario, 2026-10-01).
- Preview actual = `window.open(url, '_blank')` en cada consumidor; `app-file-row` solo emite `(open)` y deja decidir al consumidor — ese gancho existe para este trabajo.
- Solo FE. Sin cambios de BE.

## ⚠️ CONDICIONANTE DE SEGURIDAD (leer antes de diseñar)
El brief 749 (`Educa.API/.claude/chats/closed/749-be-investigar-urls-publicas-blob-sin-sas.md`) concluyó, **sobre código y sin consultar Azure**, que:
- Los contenedores se crean con `PublicAccessType.Blob` y el BE devuelve `blobClient.Uri` **sin SAS**: cualquiera con la URL accede, sin expiración. Afecta `justificaciones-salud` (severidad ALTA, datos de salud de menores), `justificaciones-asistencia` y `curso-contenido` (entregas de estudiantes).
- Recomendó opción A (SAS de vida corta emitido por endpoint autorizado) y la propuesta `INV-BLOB01`. **Nada de eso está implementado ni ratificado**: no hay brief BE derivado, ni ADR, ni INV en `educa-coord`.
- Un visor incrusta la URL pública (`<img>`/`<iframe>`/`<embed>`) y la deja más expuesta en el DOM, historial y capturas. 749 lo marca explícitamente como condicionante de F4.

Consecuencia para este chat: **F4 se puede construir hoy sobre las URLs actuales** (el visor solo recibe una `url` ya resuelta), pero hay que **diseñarlo para que el cambio a URLs firmadas no lo toque** (el visor no debe asumir que la URL es permanente ni derivar rutas del blob). Si el usuario quiere cerrar primero la seguridad, este brief espera.

## PREGUNTAS ABIERTAS PARA `/investigate` (hechos, no decisiones)
1. **Embebido real**: ¿qué respuesta devuelve hoy el blob para PDF e imagen? (`Content-Type`, `Content-Disposition`, `X-Frame-Options`/CSP del lado de Azure). El BE tiene lista `InlineSafeMimeTypes` (pdf/jpeg/png/webp/gif): confirmar que `<iframe>`/`<object>` de un PDF y `<img>` de esos tipos renderizan inline desde otro origen. Probar en local con un archivo real subido.
2. **CSP/headers del FE**: en este repo `netlify.toml`/`public/_headers` **no** definen `Content-Security-Policy` (grep 2026-10-06). Confirmar si el hosting o el BE inyectan alguna (`frame-src`, `img-src`) que bloquee el host del blob; si no hay, F4 no necesita tocar config de deploy.
3. **Contrato de apertura**: hoy hay `openArchivo(url)` duplicado en 5 componentes + `downloadAttachment` en el facade de `attachments-modal` (todos `window.open`). Inventariar con Grep (`window.open`, `(open)=`) y confirmar los sitios; puede haber más o menos.
4. **Pantalla pequeña/PWA/Capacitor**: ¿el modal del visor funciona en móvil y en la app nativa (Capacitor)? Un PDF en `<iframe>` móvil suele no paginar bien; decidir en `/design` si en móvil se cae a «abrir en pestaña».

## PRE-WORK
- Leer el § Diseños → G y § Decisiones del plan 105 (ruta arriba).
- Leer `.claude/reference/eduui.md` y `reference/dialogs-sync.md` (el visor es un `edu-dialog`: **nunca dentro de `@if`**, sync con `visible`), `reference/a11y.md` (botón de cerrar con `aria-label`, foco al abrir/cerrar, `alt` en imágenes).
- Leer `.claude/rules/browsing.md` antes de cualquier smoke (prod = solo lectura; mutar solo en local con `UseTestEnv: true`).
- Leer `src/app/shared/components/file-row/` (componente, spec, index) y `@core/helpers` `classifyFile` / `getFileKindMeta` / `FileKind` — el visor decide «visible inline» con el **mismo clasificador**, sin crear otro.
- `bun install --frozen-lockfile` en segundo plano en el worktree (~2-3 min).

## ALCANCE (re-verificar contra el código; es un punto de partida, no un diseño)
1. `/design`: forma del visor. Alternativa a evaluar con trade-off: (a) componente `app-file-viewer` standalone con `edu-dialog` + `<img>`/`<iframe>` + botón «Abrir en pestaña»/«Descargar»; (b) servicio (`FileViewerService`) que abre el diálogo por programación para que el consumidor solo llame `viewer.open({ name, url, mimeType })`. Decidir cuál evita repetir el `<app-file-viewer>` en 6 templates.
2. Reglas de qué se ve inline: imagen (`jpg/jpeg/png/webp/gif`; **svg fuera**: puede ejecutar contenido, decidirlo en `/design`) y PDF; todo lo demás conserva el comportamiento actual (abrir/descargar).
3. Migrar los consumidores de `(open)` al visor y retirar los `openArchivo` duplicados.
4. Specs: clasificación inline vs externo, apertura/cierre del diálogo, que un `docx` no abre visor, y que los consumidores migrados delegan.

## TESTS MÍNIMOS
- Imagen → visor con `<img>` y `alt` = nombre; PDF → visor con el frame del PDF.
- `.docx`/`.zip`/video → **no** abre visor; cae al comportamiento actual.
- Cerrar el visor devuelve el foco al elemento que lo abrió.
- Cada consumidor migrado, al emitir `(open)`, abre el visor con `name`, `url` y `mimeType` del archivo.
- Grep de `window.open` en los sitios migrados = 0 (salvo el «Abrir en pestaña» del propio visor).

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@shared/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. Lint prohíbe `!` y `type X = {…}` (usar `interface`). No tocar `shared/edu-ui/**`. Dialogs `edu-dialog` jamás dentro de `@if`. Archivos del repo en **LF**; si editás con scripts en Windows usá `newline=''` y `encoding='utf-8'` explícito (en 772 un script Python sin encoding dejó bytes cp1252 en las tildes; hay que correr con `PYTHONUTF8=1`).

## IMPLEMENTATION DETAIL (ADR-0006)
Observado en 747/751/772 para no re-investigar:
- `FileRowComponent` (`shared/components/file-row/`): inputs `name`, `mimeType`, `sizeBytes`, `small`; output `open` (`void`, **sin payload**); slot `[actions]`. El botón de info de la fila (`.file-row__info`) dispara `open`. Como `open` no lleva datos, el consumidor cierra sobre su `archivo` en el template (`(open)="openArchivo(archivo.urlArchivo)"`).
- Helpers en `@core/helpers`: `classifyFile`, `getFileKindMeta`, `formatFileSize`, `FileKind` (`pdf | image | video | word | excel | ppt | …`). Límites y validación en `@shared/components`: `UPLOAD_LIMITS`, `UPLOAD_ACCEPT`, `validateUploadFile(file, limits)`, `JUSTIFICATION_UPLOAD_LIMITS`.
- En 772 se **eliminaron** `BlobStorageService.getFileType` y `formatFileSize`; no los reintroduzcas.
- `attachments-modal` (horario) usa `Attachment { mimeType, sizeBytes, url? }` y `facade.downloadAttachment()` marca como leído **y** abre; el visor debe conservar el «marcar leído» (la fila ya llama `onDownloadAttachment`).
- Las justificaciones no tienen fila abrible: el archivo se muestra **antes** de subirse (es un `File` local, sin URL). Si F4 quiere previsualizarlo, haría falta `URL.createObjectURL` + revocación; está **fuera de alcance** salvo que `/design` lo pida explícitamente.
- Los registros de justificación ya enviados (listas `health-justification-list`, bandeja de justificaciones) muestran `DocumentoUrl`; verificar con Grep si abren con `window.open` y entran en el alcance.

## APRENDIZAJES TRANSFERIBLES (de 772)
- **Un solo número no basta para el límite**: el BE tiene límites distintos por flujo (justificaciones 10 MB y solo PDF/imagen vs 100 MB general). Resolverlo con un parámetro `limits` en el validador compartido, no con una constante global ni con `[maxFileSize]` del componente de subida (que descarta en silencio y evita el aviso).
- **Reproducir antes de arreglar**; si cambia el comportamiento de apertura, escribir primero el test.
- **`computed` sobre estado no-signal** queda cacheado: derivarlo en método o pasar el estado a signal.
- **Entorno**: `bunx vitest run <ruta>` **desde la raíz del repo/worktree** (no desde `src/`), `bun run lint`, `bun run build`. Validar en paralelo (lint + build + vitest) tarda ~1 min.
- **Worktree**: `EducaWeb/WT/educa-web/<NNN>-<slug>`. `/wt-merge` deja la rama de integración; promover a `main` con `--ff-only` **antes** de `/wt-clean`. Un brief solo vive en el main (untracked), no viaja en la rama del worktree. Antes de `git worktree remove`, revisar junctions (`wt-clean` §3b); en 772 `node_modules` era una instalación real.
- **Commits**: sin `Co-Authored-By` (la regla del usuario manda sobre el pie sugerido por el sistema). Inglés, Conventional Commits.
- **Topes de buckets**: `open/` y `awaiting-prod/` no tienen límite; solo edad crítica (`rules/backlog-hygiene.md`).

## FUERA DE ALCANCE
- **Seguridad de las URLs del blob** (SAS / URL firmada / contenedores privados / `INV-BLOB01`): trabajo de BE y decisión del usuario, aparte. F4 solo debe quedar **compatible** con ese cambio.
- Previsualizar el archivo local de las justificaciones antes de enviarlo.
- Mensajería y foro (no manejan archivos).
- Los smokes manuales pendientes de 747/751/772 (van por `/verify`).
- Cambios de BE.

## VALIDACIÓN FINAL
- [ ] `bunx eslint` sobre lo tocado, `bun run build`, `bunx vitest run src/app/features/intranet src/app/core src/app/shared` con exit 0.
- [ ] Grep: 0 `window.open` en los sitios migrados (salvo el del visor); 0 `openArchivo` duplicados.
- [ ] Verificación en vivo (local, `UseTestEnv: true`): abrir una imagen y un PDF desde un curso, desde el `attachments-modal` de un horario y desde una entrega; abrir un `.docx` y comprobar que no abre visor. **O** diferido a `/verify` con la razón escrita.

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/`.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 G F4 — open images and PDFs in a shared in-app file viewer`

## PENDIENTES HEREDADOS
- `/verify 769`, `/verify 770`, `/verify 771` y `/verify 772` (smoke manual; en `awaiting-prod/`). El 772 verifica justificaciones (válido/rechazado) y el `attachments-modal`.
- `main` local está **27 commits por delante de `origin/main`**: push = deploy a prod, no sin autorización.
- Worktree `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: `/triage`.
- Briefs 771 y 772 siguen **untracked** en `awaiting-prod/` (no se versionaron).
- Sin brief BE para la seguridad del blob (hallazgo de 749): decisión del usuario sobre si abrirlo antes o después de F4.

## CIERRE
Pedir feedback con `/feedback`.

## EJECUCIÓN (chat 773, 2026-10-06) — detalle descubierto
- **Worktree**: `EducaWeb/WT/educa-web/773-p105-g-f4-visor-in-app-imagen-pdf` · branch `chat/773-p105-g-f4-visor-in-app-imagen-pdf` (sin commit todavía).
- **Investigación**: blob sube PDF/jpeg/png/webp/gif con `Content-Disposition: inline` (`BlobStorageService.cs:95`, `InlineSafeMimeTypes`); el resto va como `attachment`. FE sin CSP (`netlify.toml` solo `X-Frame-Options: DENY`, que afecta el embebido *de* la app, no del blob). Embebido real en vivo **no probado** (diferido a `/verify`). `EduOverlayHandle` ya restaura el foco al cerrar (línea 140).
- **Diseño**: opción (b) servicio + host único. `FileViewerService` (`shared/components/file-viewer/`) con `open({name,url,mimeType})`, `openArchivo(dto)`, `openExternally(url)` (única salida a pestaña, rechaza no-http(s)), `close()`. `app-file-viewer` montado una vez en `intranet-layout`. Cae a pestaña nueva en Capacitor y en `max-width: 768px`.
- **Clasificador**: `classifyFile` marca SVG como `image`, por eso se agregó `resolveInlineViewKind` en `file-type.utils.ts` (espeja `InlineSafeMimeTypes`; SVG y bmp → null).
- **Migrados**: archivos-summary-dialog, student-files-dialog, student-task-submissions-dialog, semanas-accordion, estudiante-curso-hub-contenido, facade de attachments-modal (conserva «marcar leído»).
- **Decisión del usuario (2026-10-06)**: excepción puntual de `security/no-bypass-security-trust` en `eslint.config.js`, acotada a `file-viewer.component.ts`; la URL solo se valida http(s) (sin allowlist de host).
- **Validación**: eslint exit 0 · build exit 0 · vitest intranet+core+shared 310 archivos / 3138 tests verdes.
- **Pendiente**: smoke en vivo (imagen y PDF desde curso, attachments-modal y entrega; `.docx` no abre visor) → `/verify`. Fuera de alcance: `justificacion-asistencia-bandeja` usa `<a [href]="documentoUrl">`, no `app-file-row`.

## ⚠️ Docs flagged for review (skipped)
<!-- doc-watch-skipped -->
| Doc | Disparador |
|---|---|
| `reference/design-system.md`, `reference/lazy-rendering.md` | `src/app/shared/components/file-viewer/**`, layout de intranet |
| `reference/a11y.md` | `file-viewer.component.html` (img/iframe/botón) |
| `reference/dialogs-sync.md` | nuevo diálogo `app-file-viewer` |
| `reference/eslint.md`, `reference/enforcement-reglas.md` | excepción puntual `security/no-bypass-security-trust` en `eslint.config.js` |
