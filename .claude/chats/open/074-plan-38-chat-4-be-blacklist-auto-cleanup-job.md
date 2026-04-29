> **Repo destino**: `Educa.API` (backend, branch `master`).
> **Plan**: 38 · **Chat**: 4 · **Fase**: F4.BE · **Modo sugerido**: `/execute`
> **Creado**: 2026-04-29 · **Estado**: ⏳ pendiente arrancar.
> **Pre-requisito**: Chat 2 (072) mergeado (motivo `BOUNCE_MAILBOX_FULL` válido en BD).

---

# Plan 38 Chat 4 BE — `BlacklistAutoCleanupJob` (Hangfire diario)

## CONTEXTO

Decisión D13 / `INV-MAIL06`: una entrada con motivo `BOUNCE_MAILBOX_FULL` y sin actividad en `EmailSettings.MailboxFullCleanupDays` (default 7) pasa a `EBL_Estado = false` automáticamente.

Otros motivos (`BOUNCE_5XX`, `MANUAL`, `BULK_IMPORT`, `FORMAT_INVALID`) **no** se despejan automáticamente.

## OBJETIVO

Job nocturno Hangfire que ejecuta el cleanup, configurable y observable.

## ARCHIVOS

### Nuevos

- `Educa.API/Services/Notifications/BlacklistAutoCleanupJob.cs` — implementación. Inyecta `ApplicationDbContext` + `IOptionsMonitor<EmailSettings>` + `ILogger`. Marca despejadas vía UPDATE batch.
- `Educa.API/Constants/Sistema/HangfireJobs.cs` — agregar `BlacklistAutoCleanup = "blacklist-auto-cleanup"`.

### Modificados

- `Educa.API/Repositories/Notifications/EmailBlacklistRepository.cs` — agregar `MarcarDespejadasPorAntiguedadAsync(string motivo, DateTime fechaUltimoFalloAntes, string usuarioMod, CancellationToken ct)` que retorna `int` con cantidad despejada.
- `Educa.API/Interfaces/Repositories/Notifications/IEmailBlacklistRepository.cs` — exponer.
- `Educa.API/Extensions/HangfireExtensions.cs` — registrar el job recurrente. Cron `0 3 * * *` (03:00 hora Perú diariamente). Patrón Plan 31 Chat 2b: leer `EmailSettings.BlacklistAutoCleanup.Enabled`, si `false` → `Cron.Never()` para rollback rápido.
- `Educa.API/Extensions/ServiceExtensions.cs` — registrar `BlacklistAutoCleanupJob` como `Scoped`.
- `Educa.API/Models/Notifications/EmailSettings.cs` — sub-clase `BlacklistAutoCleanupSettings { Enabled, CronOverride? }`.

### Tests (~6 tests)

- `BlacklistAutoCleanupJobTests.cs` (nuevo):
  1. `MarcaDespejadasTrasNDias` — fixture con 3 entradas `BOUNCE_MAILBOX_FULL` con `EBL_FechaUltimoFallo` `-8d / -6d / -10d` + `MailboxFullCleanupDays=7` → 2 despejadas (-8 y -10), 1 activa (-6).
  2. `NoTocaMotivosDistintosABounceMailboxFull` — entradas `BOUNCE_5XX` / `MANUAL` con fecha vieja → no se tocan.
  3. `NoTocaEntradasYaDespejadas` — `EBL_Estado = false` → idempotente, no re-despeja.
  4. `RespetaConfigCleanupDays_3d` — `MailboxFullCleanupDays=3` → entrada de -4d se despeja.
  5. `Disabled_NoEjecuta` — `BlacklistAutoCleanup.Enabled = false` → Hangfire registra `Cron.Never()`.
  6. `AuditUsuarioMod_BlacklistAutoCleanupJob` — `EBL_UsuarioMod = "blacklist-auto-cleanup"` constante.

- `HangfireExtensionsTests.cs` (extender):
  7. `JobRegistrado_CronCorrecto_3am` — verificar registro vs `EmailSettings`.

## VALIDACIÓN

```bash
dotnet build Educa.API/Educa.API/Educa.API.csproj
dotnet test --filter FullyQualifiedName~BlacklistAutoCleanupJob
```

## INVARIANTES

- ✅ `INV-MAIL06` (nuevo) — implementado en este chat.
- ✅ `INV-D02` (auditoría) — `EBL_UsuarioMod` + `EBL_FechaMod` actualizados.
- ✅ `INV-D03` (soft-delete) — UPDATE de `EBL_Estado`, no DELETE.
- ✅ `INV-S07` — try/catch global; un fallo del job NO debe romper el host.
- Cap 300 ln respetado.

## VERIFICACIÓN POST-DEPLOY

1. `/hangfire` muestra `blacklist-auto-cleanup` con próximo run a las 03:00 hora Perú.
2. Forzar ejecución manual: `RecurringJob.Trigger("blacklist-auto-cleanup")` → revisar logs.
3. Insertar fila de prueba con `EBL_FechaUltimoFallo = NOW() - 10 days, EBL_MotivoBloqueo = 'BOUNCE_MAILBOX_FULL', EBL_Estado = 1`. Disparar job → fila queda con `EBL_Estado = 0`, `EBL_UsuarioMod = 'blacklist-auto-cleanup'`.
4. Counter `EmailBlacklistAutoCleanup.JobRuns` y `JobMarkedRows` visibles en logs.

## OUT

- UI admin (Chat 5).
- Banner B9 + toast (Chat 6).

## ENTREGABLE AL CERRAR

Commit `feat(email): blacklist auto-cleanup job for BOUNCE_MAILBOX_FULL`. Brief a `awaiting-prod/`.
