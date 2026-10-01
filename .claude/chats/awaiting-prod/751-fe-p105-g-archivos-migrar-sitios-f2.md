# 751 — FE: P105 G F2 — migrar a `app-file-row` los sitios de archivos del módulo de cursos (profesor) y unificar su subida

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: G-F2 · **Fase**: F2 · **Creado**: 2026-10-01 · **Estado**: ✅ implementado, validación prod pendiente.
> **Origen**: brief 747 (P105 G F1) · commit `8ef429b1` · 2026-10-01
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → G (F2: "migrar cursos/entregas/resumen")
> **depends_on**: 747 (F1) — ya integrado en `main`
> **Validación prod**: ⏳ pendiente desde 2026-10-01 — falta verificar en vivo `student-task-submissions-dialog`, `student-files-dialog` (necesitan estudiantes asignados al horario 26) y `archivos-summary-dialog` (vista del estudiante).
> **MODO SUGERIDO**: `/design` (ver "Decisiones abiertas", ~10 min) → `/execute` → `/validate`
> **exclusive**: `false`
> **isolation**: `worktree`
> **modules**: `academic`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/profesor/cursos/components/{semanas-accordion,archivos-summary-dialog,student-task-submissions-dialog,student-files-dialog}/**`

## OBJETIVO

Terminar de migrar los sitios de cursos que todavía arman a mano la fila ícono + nombre + tamaño y que subían con `<input type=file>` nativo, usando lo que F1 dejó en `main`. Al terminar, el módulo de cursos no tiene copias de `getFileIcon`/`getFileIconClass` ni inputs nativos.

## PLAN FILE

Leer el plan solo por intención y decisiones (QUÉ y POR QUÉ). Rutas, firmas y conteos del plan pueden estar viejos: investigar el código actual.

## PRE-WORK OBLIGATORIO

- `.claude/reference/design-system.md` § **B14** (pauta de la fila de archivo y de la subida).
- Código de F1 como patrón: `src/app/shared/components/file-row/**` y el piloto `pages/estudiante/cursos/components/curso-content-readonly-dialog/**`.
- `.claude/reference/dialogs-sync.md` (los 3 dialogs de la lista no deben estar dentro de `@if`).

## ALCANCE (a confirmar con `/investigate` rápido, el código manda)

Estado medido al cerrar F1, rutas relativas a `pages/profesor/cursos/components/`:

| Sitio | Lo que tiene hoy |
|---|---|
| `semanas-accordion/` (`.ts` 191 ln, `.html` 345 ln) | 2 `getFileIcon`/`getFileIconClass` locales; 2 `<input type=file>` nativos (archivos de semana y de tarea, sin `accept` ni tope); filas de archivo de semana y de material de tarea (variante `small`); acciones eliminar |
| `archivos-summary-dialog/` | `getFileIcon`/`getFileIconClass` locales, `window.open` |
| `student-task-submissions-dialog/` y `student-files-dialog/` | ícono fijo `pi pi-file` + `formatFileSize`; son entregas del estudiante (el tipo real está en `archivo.tipoArchivo`) |

El profesor y el estudiante comparten la lógica de subida: `edu-file-upload` (`mode="basic"`, `customUpload`) + `UPLOAD_ACCEPT` + `UPLOAD_LIMITS.maxFileSizeBytes` + `validateUploadFile`, tal como quedó en el piloto.

## DECISIONES ABIERTAS (resolver en `/design`)

1. **Subida del profesor**: ¿un solo archivo por vez como el estudiante, o `multiple`? Hoy el input nativo es de 1 archivo. Confirmar con el comportamiento actual antes de cambiarlo.
2. **Trigger de subida**: en el piloto el botón de `edu-file-upload` quedó junto a la etiqueta "Mis Archivos" (más grande que el ícono `+` anterior). Para el profesor el "+" está en la cabecera de cada sección: decidir si se acepta el botón de `edu-file-upload` tal cual o si se extiende el componente con un slot de trigger. **Ojo**: `edu-ui` es vendorizado de `educa-libs`; extenderlo implica reflejarlo allá.
3. **Entregas** (`student-*-dialog`): si se pasa `mimeType` y `sizeBytes` a `app-file-row`, el ícono por tipo aparece gratis. Confirmar que esos DTOs traen `tipoArchivo`.

## TESTS MÍNIMOS

- Cada sitio migrado: spec de render que verifique que usa `app-file-row` y que `(open)` dispara la apertura (`window.open(url, '_blank')`).
- Subida del profesor: archivo no permitido y archivo de más de 100 MB muestran el mensaje; archivo válido llega al handler.

## REGLAS OBLIGATORIAS

- Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@shared/...`, logger de `@core/helpers`.
- No tocar `shared/edu-ui/**` salvo decisión explícita (ver Decisión abierta 2).
- **Código en inglés, UI en español.**

## IMPLEMENTATION DETAIL (ADR-0006)

- **Qué dejó F1 en `main`** (`8ef429b1`):
  - `@core/helpers` → `classifyFile`, `getFileKindMeta`, `formatFileSize`, tipo `FileKind` (`file-type.utils.ts`).
  - `@shared/components` → `FileRowComponent` (`app-file-row`: inputs `name`, `mimeType`, `sizeBytes`, `small`; output `open`; slot `[actions]`), `UPLOAD_LIMITS`, `UPLOAD_ACCEPT`, `validateUploadFile` (`upload-limits.ts`).
  - `FormatFileSizePipe` y `BlobStorageService.formatFileSize` delegan al helper. `BlobStorageService.getFileType` quedó como adaptador fino (`'pdf' | 'doc' | 'image' | 'video' | 'link'`) para no romper `attachments-modal`: se retira en F3, no acá.
- **Patrón de la fila con acciones**: `<app-file-row ...><span actions><edu-button .../></span></app-file-row>`. El `data-info-anchor` va en el host `app-file-row`.
- **CSS**: al migrar una fila, borrar del `.scss` del sitio `.content-row`/`.row-icon*`/`.row-info`/`.row-actions` si quedan sin uso (en el piloto se borraron ~130 líneas). `.row-icon.tarea` se queda: no es un archivo.
- **Avisos de rechazo de subida**: usar `ErrorHandlerService.showWarning(summary, detail)` de `@core/services`. **No** inyectar `EduMessageService`: `ToastContainerComponent` provee su propia instancia (`providers: [EduMessageService]`) y un toast enviado a la raíz nunca se ve. Este fue un bug real detectado solo en la verificación en vivo.
- **Finales de línea**: el repo es LF. Al editar con scripts en Windows, escribir con `newline=''` para no introducir CRLF.

## APRENDIZAJES TRANSFERIBLES (del chat 747)

- **Verificación en vivo requiere datos preparados.** En la BBDD de prueba ya existen, de la verificación de F1 (todos con prefijo `TEST-747`): horario **26** (Ciencia · 2DO PRIMARIA A, martes 10:00-11:00) con 12 estudiantes asignados; `MENDO CALDERON MARIELA` es tutora de ese salón y profesora del horario; contenido de 4 semanas con 2 archivos de profesor (un `.xlsx` con nombre larguísimo) y una tarea con un `.pptx` de 5 MB. Se pueden reutilizar tal cual para probar `semanas-accordion` como profesor. Si ya se limpiaron, recrear con esta receta: en un salón en modo **"Tutor pleno"** el horario necesita (1) "Asignar todos" los estudiantes (crea `HorarioEstudiante`, sin eso el estudiante no ve el curso), (2) tutor del salón (Usuarios → Asignaciones del profesor), (3) "Asignar Profesor" en el detalle del horario.
- **Sesión del navegador**: una sola cookie por host (`localhost`). Cambiar de rol exige que el usuario inicie sesión; **no** se tipean credenciales. Si el switcher guardado se pierde, hay que pedírselo al usuario.
- **Subir archivos en el navegador automatizado**: la herramienta `file_upload` solo acepta archivos que el usuario compartió. Alternativa válida: construir un `File` en la página y asignarlo al `<input type=file>` con `DataTransfer` + `dispatchEvent(new Event('change', { bubbles: true }))`.
- **Escrituras vía `fetch` desde la consola**: el BE exige CSRF (403 `CSRF_TOKEN_INVALID`). Hacer las mutaciones por la UI.
- **Dev server**: `bun run start` en background tiene un límite de 30 min por defecto; pasar `timeout` máximo si la verificación es larga. En Windows `bunx vitest` y `bunx ng build` corren en paralelo sin problema.
- Todos los salones de prueba están con periodo **CERRADO** y aun así la subida y eliminación del estudiante funcionan.

## FUERA DE ALCANCE

- **F3**: justificaciones de asistencia/salud (`justificar-inasistencia-dialog`, `health-justification-dialog`) y `attachments-modal` del horario; ahí se retira el adaptador `getFileType`.
- **F4**: visor in-app. Está condicionado por el brief **749** (`be-investigar-urls-publicas-blob-sin-sas`): un visor que incrusta una URL pública agrava el riesgo.
- Mensajería y foro (no manejan archivos).

## VALIDACIÓN FINAL

- [ ] `bunx eslint` sobre lo tocado, `bunx ng build`, `bunx vitest run` (todo verde).
- [ ] 0 copias de `getFileIcon`/`getFileIconClass` y 0 `<input type=file>` nativos en `pages/profesor/cursos/**`.
- [ ] Verificación en vivo (local, BBDD de prueba `UseTestEnv: true`): como profesor, subir un `.exe` (rechazado con toast), subir un PDF válido, abrir cada fila (`window.open`), eliminar. Como estudiante, abrir "Mis entregas".

## VERIFICACIÓN EN VIVO (2026-10-01, local, `UseTestEnv: true`, profesora MENDO MARIELA, horario 26)

- ✅ `semanas-accordion`: 3 filas `app-file-row` con ícono por tipo (pdf/excel/ppt), 2 `edu-file-upload` con `accept`, 0 `<input type=file>` nativos fuera de `edu-file-upload`.
- ✅ Subida: `.exe` rechazado con toast "Archivo no válido · Tipo de archivo no permitido." y sin llamada al BE; PDF válido (`TEST-751-subida.pdf`) subido y visible con ícono PDF.
- ✅ `(open)` dispara `window.open(url, '_blank')` en archivo de semana y en archivo de tarea.
- ✅ Eliminar por UI (confirmación → fila desaparece). El archivo de prueba quedó eliminado.
- ⚠️ No verificado en vivo: `student-task-submissions-dialog` y `student-files-dialog` (la BBDD de prueba devuelve `[]` en `archivos-estudiantes`: el horario 26 ya no tiene estudiantes asignados) y `archivos-summary-dialog` (solo alcanzable desde la vista del estudiante; no se pudo cambiar de rol sin login del usuario). Cubiertos por specs de render + `(open)`.
- Nota: `curso-content-dialog` (profesor) no se referencia desde ningún template. Posible código muerto, fuera de alcance.
- `edu-ui` no se tocó: nada que reflejar en `educa-libs`.
- Screenshots del navegador fallaban por timeout; la verificación se hizo por DOM.

## CRITERIOS DE CIERRE

- [ ] Los 4 sitios migrados; el módulo de cursos sin duplicados de clasificador ni inputs nativos.
- [ ] Specs de render y de subida.
- [ ] Verificación en vivo hecha y anotada en el brief.
- [ ] Maestro actualizado y brief movido `running/` → `closed/` en el mismo commit que el código.

## COMMIT MESSAGE sugerido

`refactor(intranet): migrate course file lists to app-file-row and unify uploads` (inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`).

## CIERRE

Al cerrar, dejar anotado si la Decisión abierta 2 (trigger de subida) requirió tocar `edu-ui`, para reflejarlo en `educa-libs`.
