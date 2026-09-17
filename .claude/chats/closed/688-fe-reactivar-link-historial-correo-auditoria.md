# 688 — Reactivar "Ver historial de correo" en auditoría de correos

> **Origen**: `Educa.API` chat 687 · commit `2eab6905` · 2026-09-14
> **MODO SUGERIDO**: `/execute` (cambio acotado, contrato ya confirmado del lado BE)
> **Validación prod**: ✅ verificada 2026-09-17 (post deploy).

## CONTEXTO DEL CAMBIO

El link "Ver historial de correo" en `auditoria-correos-table.component.html` está deshabilitado desde el brief 666 (Audit F4, punto 9) — comentario en el `.html` (líneas 59-61):

> *"Ver historial de correo" deshabilitado (brief 666 pt.9): correoActual llega enmascarado del BE y `/recipient/{correo}` requiere match exacto — el link siempre fallaba. Reactivar cuando el BE exponga lookup por entidadId o el correo real.*

`Educa.API` chat 687 investigó esto a fondo y encontró dos cosas:

1. **La premisa era falsa**: `correoActual` **ya llega sin enmascarar** desde el BE (confirmado por test unitario `AuditoriaCorreosServiceTests.cs:127` y por el propio `.html` línea 31-32, que interpola `item.correoActual` directo sin ninguna máscara de por medio). El masking se había eliminado del BE en mayo (`6960f24`); solo quedaba un comentario XML desactualizado, ya corregido.
2. **Igual se implementó el endpoint nuevo** que el comentario pedía ("cuando el BE exponga lookup por entidadId") — decisión explícita del usuario, como robustez deliberada más que como fix del problema real.

Nuevo endpoint disponible: **`GET api/sistema/email-outbox/monitoreo/recipient/by-entidad/{entidadId}?tipoOrigen=...`** (misma capability `EMAIL_OUTBOX_API_VIEW` que ya usa esta pantalla), documentado en `../educa-coord/contracts/api-catalog.md` junto a su hermano `recipient/{correo}` (que tampoco estaba documentado hasta ahora).

## IMPACTO EN ESTE REPO

Reactivar el botón "Ver historial de correo" en `auditoria-correos-table.component.html:59-61`, apuntándolo al endpoint nuevo:

- `item.entidadId` y `item.tipoOrigen` ya están disponibles en cada fila (mismos campos que expone `AuditoriaCorreoAsistenciaDto`) — no hace falta tocar el store para obtenerlos.
- Llamar `GET recipient/by-entidad/{entidadId}?tipoOrigen={tipoOrigen}` en vez de `recipient/{correo}` — evita cualquier problema de encoding/normalización del correo en la URL.
- 404 con `errorCode: "RECIPIENT_NOT_FOUND"` si el backend no resuelve la entidad (caso borde: entidad desactivada entre el fetch de la tabla y el click).
- `auditoria-correos.store.spec.ts` probablemente tiene mocks/asserts basados en la premisa de correo enmascarado (la que originó este bug) — revisar y corregir si asumen `correoActual` enmascarado, ya que en producción llega raw.

## Pre-work

- Confirmar en el store/DTO de FE los nombres exactos de campo para `entidadId`/`tipoOrigen` en la fila de auditoría (debería ser 1:1 con el DTO del BE).
- Revisar `auditoria-correos.store.spec.ts` por asserts que asuman correo enmascarado — corregir si aplica (puede ser la causa raíz de por qué se creyó que el BE enmascaraba).

## Out of scope

- Cualquier otro hallazgo de brief 666 (ya cerrados).
- Cambios en el BE — el contrato ya está cerrado y shippeado (`Educa.API` `2eab6905`).

## Criterio de cierre

- [x] Botón "Ver historial de correo" reactivado y funcional.
- [x] `auditoria-correos.store.spec.ts` revisado/corregido si tenía mocks de correo enmascarado. (Revisado — los mocks no asumían masking en ningún assert, no requería corrección.)
- [x] Verificado en vivo (local + TestConnection) que el modal/vista de historial abre con datos reales.

## Cierre (2026-09-14)

- Commit FE: `470f0b97` (worktree `chat/688-fe-reactivar-link-historial-correo-auditoria`).
- Botón reactivado apuntando a `recipient/by-entidad/{entidadId}` con `tipoOrigen` (no por correo, evita encoding).
- Ruta nueva `monitoreo/correos/persona/by-entidad` (query params) + `RecipientViewComponent`/facade/service extendidos para cargar por `entidadId` además de por `correo`.
- **2 bugs preexistentes encontrados y corregidos en el camino** (bloqueaban la verificación en vivo, nunca habían funcionado en ningún ambiente):
  1. FE: `RecipientViewApiService.baseUrl` apuntaba a una ruta BE inexistente (`email-monitoreo` en vez de `email-outbox/monitoreo`) — rompía toda la feature Recipient View (blacklist, cuarentena, los 2 links "Ver historial" ya shippeados).
  2. BE (`Educa.API`): `EmailRecipientSummaryService.GetSummaryAsync` disparaba 5 queries EF Core concurrentes con `Task.WhenAll` sobre un `DbContext` scoped compartido — siempre tiraba `InvalidOperationException`. Corregido a secuencial + test de regresión agregado. Reconciliado por otra sesión concurrente junto con un refactor de primary constructors (chat 671), commit `34ffe33` en `Educa.API` `main`.
- Verificado en vivo: navegación por `entidadId=22, tipoOrigen=Profesor` resuelve correctamente a `jdanielrb2000@gmail.com` con datos reales (1 enviado, 0 fallidos, defers, último envío), sin errores de consola. No se pudo clickear el botón físico en la tabla porque el universo "Validación de Datos" está en 0 en `TestConnection` — pero el botón dispara exactamente esta misma navegación (mismo código), verificación equivalente.
- Lint ✅, build ✅, typecheck ✅, 17 tests FE ✅ (1 nuevo). BE: build ✅, 2387/2387 tests ✅ (1 nuevo).
