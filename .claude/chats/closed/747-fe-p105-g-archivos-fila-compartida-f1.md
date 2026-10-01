# 747 — FE: P105 G F1 — componente de archivo compartido, helpers únicos y subida unificada

> **Origen**: educa-coord chat de diseño P105 · 2026-10-01
> **Repo afectado**: `educa-web` (BE solo lectura)
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → G
> **Created**: 2026-10-01
> **MODO SUGERIDO**: `/design` (forma del componente, ~15 min) → `/execute` → `/validate`
> **exclusive**: `false`
> **modules**: `academic`, `infra`
> **touches**:
>   - `educa-web`: `src/app/shared/edu-ui/lib/file-upload/**` (y componente nuevo de fila/lista de archivo en `edu-ui`), `core/services/blob/blob-storage.service.ts` (`formatFileSize`, `getFileType`), `intranet/shared/pipes/format-file-size`, `pages/profesor/cursos/components/semanas-accordion/**`, `pages/estudiante/cursos/components/curso-content-readonly-dialog/**`, `pages/profesor/cursos/components/{archivos-summary-dialog,student-task-submissions-dialog,student-files-dialog}/**`

## Contexto

**Decisión del usuario (2026-10-01)**: opción G1 recomendada **más visor in-app (G2)**. Este brief es **F1** (la base); el visor y la migración de sitios son fases siguientes.

El problema ("desordenado") es, medido: la fila ícono+nombre+tamaño está repetida **4 veces** solo en `curso-content-readonly-dialog` y copiada en otros 4 sitios; `getFileIcon`/`getFileIconClass` duplicados (readonly-dialog, archivos-summary, semanas-accordion, probablemente student-files); **3 clasificadores de tipo** (por MIME, `BlobStorageService.getFileType` por extensión **sin xls/ppt**, y un mapa propio en `attachments-modal`); **2 formateadores de tamaño** (pipe "KB/MB" vs `formatFileSize` "Bytes/KB/MB"); truncado de nombre redefinido en 4 scss, algunos sin tooltip; entregas y salud con ícono fijo `pi-file`/`pi-file-pdf`; subida con `<input type=file>` nativo en cursos (sin `accept`, sin tope de tamaño en FE) vs `edu-file-upload` en 3 sitios. No hay componente compartido de lista ni de preview. Mensajería y foro **no** manejan archivos.

## Scope (F1)

1. **Un clasificador de tipo** (extensión + MIME, cubre pdf/doc/xls/ppt/imagen/video/audio/zip/otros) y **un formateador de tamaño**; borrar los duplicados.
2. **Componente compartido de fila de archivo** (nombre truncado con tooltip, ícono por tipo, tamaño, slot de acciones). Debe dejar listo el gancho para el visor de F4 (evento "abrir/previsualizar"), sin implementarlo.
3. **Subida unificada**: el módulo de cursos pasa de input nativo a `edu-file-upload`, con `accept` y tope de tamaño validados en FE (límites del BE: 100 MB, nombre ≤200 caracteres, lista blanca de MIME/extensiones en `FileUploadConfig.cs` — leerla, no duplicar a ciegas).
4. **Migrar 1 sitio piloto** (`curso-content-readonly-dialog`, el de 4 repeticiones) para validar el componente. El resto de sitios es F2/F3.

## Pre-work

- Leer `BlobStorageService.cs` y `FileUploadConfig.cs` (BE) para alinear FE con límites y `InlineSafeMimeTypes` (el visor solo podrá mostrar inline pdf/jpeg/png/webp/gif).
- Leer `educa-web/.claude/rules/` sobre componentes `edu-ui` y accesibilidad.
- Decidir en `/design` si el componente vive en `edu-ui` (genérico) o en `intranet/shared` (dominio cursos). Propuesta: `edu-ui`, porque lo usarán justificaciones, horario y entregas.

## Out of scope (derivados)

- **F2**: migrar semanas-accordion, archivos-summary, entregas y student-files.
- **F3**: migrar justificaciones (asistencia/salud) y attachments-modal del horario.
- **F4 (firme, decisión del usuario)**: **visor in-app** — imagen y PDF inline; resto descarga. Requiere decidir CSP/iframe/visor y accesibilidad de teclado. Brief propio.
- **Seguridad (no es G)**: las URLs de blob son públicas y permanentes (sin SAS ni URL firmada). Quien tenga el enlace de una entrega o certificado de salud accede sin autenticación. `/investigate` propio en `Educa.API`. **F4 puede quedar condicionado por ese hallazgo** (un visor que incrusta una URL pública agrava el riesgo).
- Mensajería y foro: sin adjuntos, fuera de alcance.

## Criterio de cierre

- [x] 1 clasificador y 1 formateador (`core/helpers/file-type.utils.ts`); 0 copias de `getFileIcon`/`getFileIconClass` en el piloto.
- [x] Componente `app-file-row` con spec de render (tipo, tamaño ausente, nombre largo, xls/ppt cubiertos).
- [x] Subida del piloto con `edu-file-upload`, `accept` y tope FE; mensaje claro si excede (verificado en vivo).
- [x] Sitio piloto migrado y verificado en vivo (local, BBDD de prueba, desde worktree); sin regresión de apertura (`window.open`).
- [x] lint + build + tests OK (2809 verdes).
- [ ] Briefs derivados F2, F3 y F4 materializados en `open/` — **pendiente: `/next-chat` tras este cierre**.

## Tiempo estimado

~90-120 min.

## Resultado (2026-10-01)

- Decisión de diseño: opción B. Los helpers viven en `core/helpers` (la regla de capas prohíbe que `core` importe de `shared`) y el componente en `shared/components/file-row`, no en `edu-ui` (vendorizado de `educa-libs`: un re-sync lo habría pisado). `edu-ui` no se tocó.
- `BlobStorageService.getFileType` queda como adaptador fino sobre `classifyFile` hasta F3 (`attachments-modal`).
- **Hallazgo de la verificación en vivo**: `ToastContainerComponent` provee su propia `EduMessageService`; un toast enviado al servicio raíz nunca se muestra. Para avisos usar `ErrorHandlerService.showWarning`. Documentado en `design-system.md` B14.
- Verificación en vivo: horario 26 (Ciencia · 2DO PRIMARIA A) con datos `TEST-747-*` en la BBDD de prueba. En un salón "Tutor pleno" el horario necesita 3 cosas para que el estudiante lo vea: `HorarioEstudiante` (acción "Asignar todos"), tutor del salón y profesor asignado al horario; crear el horario no genera ninguna.

## Notas para F2/F3/F4 (derivados)

- F2: `semanas-accordion` (profesor) sigue con `<input type=file>` nativo, sin `accept` ni tope. Migrar también archivos-summary, entregas y student-files.
- F3: justificaciones (asistencia/salud) y `attachments-modal` del horario; retirar el adaptador de `getFileType`.
- F4: visor in-app usando `(open)` de `app-file-row`; condicionado por el hallazgo de seguridad (URLs de blob públicas).
