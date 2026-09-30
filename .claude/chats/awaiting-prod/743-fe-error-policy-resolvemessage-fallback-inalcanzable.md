# 743 — FE: `DEFAULT_ERROR_POLICY.resolveMessage` nunca usa el fallback del facade para `HttpErrorResponse`

> **Origen**: educa-web chat 742 · 2026-09-30
> **MODO SUGERIDO**: `/investigate` → `/execute`
> **Repo afectado**: `educa-web`

## Contexto del cambio

`DEFAULT_ERROR_POLICY.resolveMessage` (`core/helpers/error-policy.ts`) llama `extractErrorMessage(err, '')` y usa el resultado si es truthy. Para un `HttpErrorResponse`, `extractErrorMessage` termina en `err.message || fallback`, y Angular siempre setea `err.message` ("Http failure response for …"). El fallback del facade es inalcanzable: si el BE no manda `detail`, `errors` ni `errorCode` catalogado, el usuario ve el texto técnico de Angular.

El 742 dejó `extractErrorMessage` leyendo `detail` primero, pero mantuvo `err.message` como último recurso por compatibilidad (el spec existente lo asegura).

## Impacto en este repo

1. Decidir el contrato: que `resolveMessage` ignore `err.message` de Angular y use el fallback del facade cuando no hay mensaje curado del BE (opción sugerida: helper que devuelva `string | null` solo con mensajes del BE, y `extractErrorMessage` lo envuelva).
2. Revisar los consumidores de `extractErrorMessage` con fallback propio (`attachments-modal`, `user-info-dialog`, `ctest-k6`) para ver qué mensaje ven hoy.
3. Actualizar el test "returns non-empty string for HttpErrorResponse with no backend message" en `error.utils.spec.ts`, que documenta el comportamiento actual.

## Resultado (2026-09-30)

- Nuevo `extractBackendMessage(err): string | null` en `error.utils.ts` (solo mensajes curados del BE); `extractErrorMessage` lo envuelve y conserva `err.message` como último recurso.
- `DEFAULT_ERROR_POLICY.resolveMessage` usa `extractBackendMessage` → el fallback del facade es alcanzable.
- Migrados a `extractBackendMessage(err) ?? fallback`: `attachments-modal.facade`, `user-info-dialog`, `ctest-k6.facade`. Nota: para errores no-HTTP (`Error`, string) estos 3 ahora muestran su fallback en vez de `Error.message`.
- Tests: `error.utils.spec.ts` actualizado (+4), `error-policy.spec.ts` nuevo (3). Suite 2737/0, lint 0 errores, build OK.

> **Validación prod**: ⏳ pendiente desde 2026-09-30 — provocar un error HTTP sin `detail` (ej. 500 sin cuerpo) en un facade y confirmar que el toast muestra "No se pudo …" y no "Http failure response for …"; idem en cambio de contraseña (user-info-dialog).
