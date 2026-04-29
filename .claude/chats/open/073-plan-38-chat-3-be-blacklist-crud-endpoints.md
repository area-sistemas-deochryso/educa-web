> **Repo destino**: `Educa.API` (backend, branch `master`).
> **Plan**: 38 · **Chat**: 3 · **Fase**: F3.BE · **Modo sugerido**: `/execute`
> **Creado**: 2026-04-29 · **Estado**: ⏳ pendiente arrancar.
> **Pre-requisito**: Chat 2 (072) mergeado en `master` y migración SQL ejecutada en Azure (motivo `BOUNCE_MAILBOX_FULL` válido).

---

# Plan 38 Chat 3 BE — `POST` + `GET` paginado + DTOs + tests controller

## CONTEXTO

Cierre design en `chats/closed/070-plan-38-chat-1-blacklist-investigacion-design.md` (decisiones D5, D6, D7, D11, D20). Hoy `EmailBlacklistController` solo expone `DELETE /api/sistema/email-blacklist/{correo}` — falta listar/buscar/agregar.

## OBJETIVO

1. Endpoint `POST` para agregar manualmente.
2. Endpoint `GET` paginado server-side (variante A wrapper, ver `rules/pagination.md`) con filtros `estado | motivo | q | page | pageSize`.
3. Exposición del label humano en el DTO (D20).

## ARCHIVOS

### Nuevos

- `Educa.API/DTOs/Notifications/CrearBlacklistRequest.cs` (D11).
- `Educa.API/DTOs/Notifications/EmailBlacklistListadoDto.cs` (D11).
- `Educa.API/DTOs/Notifications/EmailBlacklistFiltro.cs` (D11).

### Modificados

- `Educa.API/Controllers/Sistema/EmailBlacklistController.cs` — agregar `POST` + `GET`. Reusar `[Authorize(Roles = Roles.Administrativos)]` del scope.
- `Educa.API/Services/Notifications/EmailBlacklistService.cs` — agregar `CrearManualAsync(CrearBlacklistRequest, string usuarioReg, CancellationToken)` + `ListarPaginadoAsync(EmailBlacklistFiltro, CancellationToken)`. Validar motivo permitido (solo `MANUAL` o `BULK_IMPORT`), reutilizar `Repository.UpsertAsync` para idempotencia.
- `Educa.API/Repositories/Notifications/EmailBlacklistRepository.cs` — agregar `ListarPaginadoAsync` con filtro compuesto (estado/motivo/q LIKE) + `Total` count en una sola query con `Window` o 2 queries paralelas si más simple.
- `Educa.API/Interfaces/Services/Notifications/IEmailBlacklistService.cs` + `IEmailBlacklistRepository.cs` — exponer firmas nuevas.

### Tests (~10 tests)

- `EmailBlacklistControllerCrudTests.cs` (nuevo, en `Educa.API.Tests/Controllers/Sistema/`):
  1. `Post_AgregarManual_Idempotente` — POST mismo correo dos veces → 201 + 200 sin duplicar.
  2. `Post_MotivoInvalido_Returns400` — motivo `BOUNCE_5XX` o `BOUNCE_MAILBOX_FULL` → 400 (no permitidos en POST).
  3. `Post_CorreoFormatoInvalido_Returns400` — sin `@`.
  4. `Post_Reactivacion_DespejadoEntrada_VuelveActivo` — POST sobre correo con `EBL_Estado=false` → reactivado, audit en `EBL_UsuarioMod`.
  5. `Get_Paginado_FiltrosCombinados` — `estado=activa&motivo=MANUAL&q=gmail&page=2&pageSize=10`.
  6. `Get_PageSizeMayor100_Cap_100` — defensa contra DOS por pageSize gigante.
  7. `Get_OrdenPorFechaRegDesc` — orden default.
  8. `Auth_NoAdministrativos_Returns403` — Profesor / Estudiante → 403.

- `EmailBlacklistServiceCrudTests.cs` (nuevo):
  9. `CrearManual_NormalizaCorreo` — `APO@MAIL.COM` queda como `apo@mail.com` en `EBL_Correo`.
  10. `ListarPaginado_BusquedaQ_LIKE` — q=`gmail` matchea solo correos que contengan `gmail`.

## VALIDACIÓN

```bash
dotnet build Educa.API/Educa.API/Educa.API.csproj   # 0 errores
dotnet test --filter FullyQualifiedName~EmailBlacklist
# Esperado: ≥10 tests nuevos verdes + suite total sin regresiones.
```

## INVARIANTES

- ✅ `INV-D08` (`ApiResponse<T>` siempre).
- ✅ `INV-MAIL01` (validación `EmailValidator.Normalize` + check de motivo permitido).
- ✅ `INV-D03` (POST sobre despejado = upsert, no DELETE físico).
- ✅ `INV-D05` (`AsNoTracking()` en GET).
- ✅ `INV-S07` (fail-open) — `LogWarning` + lista vacía si la query falla.
- Cap 300 ln respetado.

## OUT

- Job de cleanup (Chat 4).
- UI admin (Chat 5).
- Banner B9 + toast (Chat 6).

## VERIFICACIÓN POST-DEPLOY

1. `POST /api/sistema/email-blacklist` con body `{ correo: "test@example.com", motivo: "MANUAL", observacion: "smoke" }` → 201 + DTO con id.
2. `GET /api/sistema/email-blacklist?estado=activa&q=test` → 200 con `data: [test@example.com]`, `total: 1`.
3. `GET ?pageSize=200` → cap a 100 sin error.
4. `DELETE /api/sistema/email-blacklist/test@example.com` → 200 (sigue funcionando).
5. `POST` con motivo `BOUNCE_5XX` → 400 con `code: MOTIVO_NO_PERMITIDO_MANUAL`.

## ENTREGABLE AL CERRAR

Commit `feat(email): expose blacklist CRUD endpoints (POST + paginated GET)`. Brief a `awaiting-prod/`.
