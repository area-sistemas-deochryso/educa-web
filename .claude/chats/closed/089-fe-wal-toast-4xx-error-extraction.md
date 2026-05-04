> **Creado**: 2026-05-04 · **Estado**: ✅ cerrado 2026-05-04.

# 089 · FE: WAL — extraer mensaje específico del BE en toasts de error 4xx

## Contexto

**Origen**: Finding F-S04 del WAL Integration Smoke Test 1ra ronda (chat 087, commit `9c39d40`).  
**Detalle**: `.claude/tasks/wal-cache-audit-fixes.md` → sección "Findings menores 1ra ronda smoke (2026-05-04)".  
**Repo**: `educa-web` (branch `main`).

## Síntoma

En el Caso 4 del smoke test, al intentar guardar un registro con un campo que excede el límite del BE:

- **El BE devolvió**: `"El nombre no puede exceder 50 caracteres"` (en `ApiResponse.message` o similar)
- **El cliente mostró**: `"La solicitud contiene datos inválidos"` (mensaje genérico del fallback)

El usuario no recibe información accionable sobre qué campo corregir.

## Punto de entrada

`WalFacadeHelper.execute().onError` (o el error handler global del WAL) debería intentar extraer el mensaje específico del payload del BE antes de caer al fallback genérico.

El shape probable del BE en errores 4xx es `ApiResponse<null>` con campo `message`.  
Confirmar el shape real durante la fase de investigación.

## Plan

### Fase 1 — `/investigate`
- Confirmar shape exacto que devuelve el BE en 4xx (ver `GlobalExceptionMiddleware` + `ApiResponse<T>`)
- Localizar dónde vive hoy el handler genérico en el FE (¿`WalFacadeHelper`? ¿`GlobalErrorHandler`? ¿`ErrorHandlerService`?)
- Entender el tipo de `error` que llega a `onError`: ¿`HttpErrorResponse`? ¿wrapeado?
- Verificar si el interceptor `api-response` ya hace unwrap y cómo afecta a los 4xx

### Fase 2 — `/execute`
- Modificar el handler para extraer `error?.error?.message` (o el path correcto) antes del fallback
- Ajustar el fallback para que solo active si no hay mensaje parseable
- Agregar test unitario en `WalFacadeHelper` cubriendo:
  - Path 1: BE devolvió mensaje específico → toast muestra ese mensaje
  - Path 2: BE no devolvió mensaje → toast muestra fallback genérico

### Fase 3 — `/validate`
- `npm run lint` + `npm test`
- Smoke manual en `/intranet/admin/cursos`: guardar curso con nombre >50 chars → verificar que el toast muestra el mensaje del BE

## Criterios de cierre

- [ ] Toast en error 4xx muestra el mensaje específico del BE cuando existe
- [ ] Fallback genérico solo si BE no devolvió mensaje parseable
- [ ] Test unitario con dos paths (mensaje específico + fallback)
- [ ] Smoke manual confirmado: nombre >50 chars en `/intranet/admin/cursos` → toast específico

## Archivos esperados

- `src/app/core/services/wal/wal-facade-helper.service.ts` (handler principal)
- `src/app/core/services/wal/wal-facade-helper.service.spec.ts` (test unitario)
- Posiblemente `src/app/core/services/error/` si el handler vive ahí

## MODO SUGERIDO

`/investigate` → `/execute` → `/validate`
