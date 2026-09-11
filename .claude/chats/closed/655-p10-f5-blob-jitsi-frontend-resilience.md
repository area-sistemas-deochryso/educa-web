# 655 — P10 F5: Blob Storage + Jitsi — resiliencia frontend

> **Origen**: `educa-coord` chat 653 (brief materializado a `closed/` directo — trabajo ya ejecutado en el chat de coord, ver §1.4 COORD.md).
> **Repos afectados**: `educa-web`
> **Creado**: 2026-09-11 · **Estado**: ✅ completo.
> **MODO**: `/execute`
> **Plan xrepo**: [`educa-coord/plans/xrepo/000-019/xrepo-10-flujos-alternos.md`](../../../educa-coord/plans/xrepo/000-019/xrepo-10-flujos-alternos.md) — DEP-7, DEP-9
> **touches**:
>   - `src/app/core/services/blob/blob-storage.service.ts`
>   - `src/app/shared/constants/ui-error-messages.ts`
>   - `src/app/features/intranet/pages/cross-role/videoconferencias/components/videoconferencia-sala/videoconferencia-sala.component.ts`
>   - `src/app/features/intranet/pages/cross-role/videoconferencias/services/videoconferencias.facade.ts`

## CONTEXTO

Diseño cerrado en `educa-coord` chat 645 (P10 F4). Contraparte frontend del BE (brief `Educa.API` 654): Blob Storage sin `withRetry` en la ruta de subida, sin mensaje diferenciado para el nuevo 503; y un gap de UX en la sala de videoconferencia Jitsi (DEP-9) — si Jitsi cargaba el script pero nunca emitía `videoConferenceJoined`, el fallback de 10s ocultaba el spinner en silencio, sin avisar al usuario.

## RESULTADO

- **`blob-storage.service.ts`**: `uploadFile()` ahora usa `withRetry({ tag: 'BlobStorageService:uploadFile' })`, mismo patrón que `videoconferencias.facade.ts`.
- **`ui-error-messages.ts`**: nueva entrada `BLOB_STORAGE_UNAVAILABLE` en `UI_ERROR_CODES`. El mensaje diferenciado llega gratis a través de `resolveErrorMessage` — `curso-contenido-crud.facade.ts` ya usaba ese helper, solo faltaba el código en el catálogo.
- **`videoconferencia-sala.component.ts:261`**: el fallback de 10s ahora setea `errorMsg` ("Videoconferencia no disponible temporalmente") si `connecting()` seguía `true` al vencer el timeout, en vez de solo apagar el spinner. Se recortaron 2 líneas redundantes en `initJitsi` (variables locales usadas una sola vez) para no romper el gate `max-lines` (300) del archivo, que ya estaba en el límite.
- **`videoconferencias.facade.ts`**: `getJaaSToken()` ahora usa `withRetry` (pre-work del diseño — mismo patrón que `loadCursos` en el mismo facade).

**Investigado, sin cambio de código** (hallazgos del pre-work del diseño):
- "Placeholder en vistas de archivo": las vistas que listan archivos adjuntos (`archivos-summary-dialog`, `semanas-accordion`, `student-files-dialog`, `student-task-submissions-dialog`) muestran ícono + nombre y abren el archivo en pestaña nueva — no hay ningún `<img>` ni preview inline. No existe una superficie de "error crudo" que reemplazar con un placeholder.
- Los formularios que suben archivos ya permiten guardar contenido sin archivo adjunto (`uploadArchivo` es una acción standalone, no bloquea el resto del flujo).

## VERIFICACIÓN

- `npx eslint` sobre los 4 archivos tocados — limpio.
- `ng build --configuration production` — build verde (warnings preexistentes de componentes no relacionados).

**Pendiente**: push a `origin` (decisión del usuario, no bloqueante).
