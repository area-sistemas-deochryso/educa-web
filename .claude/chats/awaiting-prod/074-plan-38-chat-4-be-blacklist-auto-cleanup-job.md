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

---

## CIERRE LOCAL — 2026-04-29

**Commit BE**: `d90bb72` en `Educa.API master` (sin push).

**Archivos**: 4 nuevos + 6 modificados.

- **Nuevos**:
  - `Services/Notifications/BlacklistAutoCleanupJob.cs` (78 ln) — wrapper Hangfire con try/catch global INV-S07. Constante `UsuarioMod = "blacklist-auto-cleanup"`.
  - `Models/Sistema/BlacklistAutoCleanupSettings.cs` (29 ln) — sub-clase `{ Enabled, CronOverride? }`.
  - `Tests/Services/Notifications/BlacklistAutoCleanupJobTests.cs` — 6 tests (1-4 + audit + INV-S07 con `ThrowingRepository`).
  - `Tests/Services/Notifications/HangfireExtensionsTests.cs` — 3 tests del helper `ResolveCleanupCron` (Disabled / default / CronOverride).
- **Modificados**:
  - `Constants/Sistema/HangfireJobs.cs` — `BlacklistAutoCleanup = "blacklist-auto-cleanup"`.
  - `Models/Sistema/EmailSettings.cs` — propiedad `BlacklistAutoCleanup`.
  - `Interfaces/Repositories/Notifications/IEmailBlacklistRepository.cs` + `Repositories/Notifications/EmailBlacklistRepository.cs` — `MarcarDespejadasPorAntiguedadAsync(motivo, fechaUltimoFalloAntes, usuarioMod, ct)` con UPDATE batch trackeado (mantiene auditoría INV-D02 vía `ApplyAuditFields`).
  - `Extensions/HangfireExtensions.cs` — registra el job con helper internal `ResolveCleanupCron` (default `"0 3 * * *"` Lima · Enabled=false → `Cron.Never()` · CronOverride toma precedencia).
  - `Extensions/ServiceExtensions.cs` — `services.AddScoped<BlacklistAutoCleanupJob>()`.

**Métricas**:

- Build BE: 0 errores · 19 warnings preexistentes.
- Tests del filtro: **9/9 verdes** (6 job + 3 extensions).
- Suite completa BE: **1582/1582 verdes** (+9 tests netos).
- Cap 300 ln respetado en todos los archivos producción (max: `EmailBlacklistRepository.cs` 220 ln, `HangfireExtensions.cs` 202 ln).

**Decisiones de implementación**:

1. **`ResolveCleanupCron` como `internal static`** en `HangfireExtensions` (no inline en `UseHangfireServices`) para testear sin montar storage de Hangfire. `InternalsVisibleTo("Educa.API.Tests")` ya estaba en el csproj.
2. **`MailboxFullCleanupDays` con guard `> 0 ? : 7`** — defensa por si la config llega a 0 o negativo desde appsettings.
3. **UPDATE trackeado vs `ExecuteUpdateAsync`** — uso `ToListAsync` + asignación in-memory + `SaveChangesAsync` para que `ApplyAuditFields` setee `EBL_FechaMod` automáticamente (mismo patrón que `DespejarAsync`). `ExecuteUpdateAsync` saltaría el interceptor de auditoría.
4. **Test 5 del brief reinterpretado**: el brief listaba "Disabled_NoEjecuta" bajo `BlacklistAutoCleanupJobTests.cs`, pero la decisión `Enabled = false` vive en `HangfireExtensions` (el job no chequea el flag — si Hangfire lo dispara, ejecuta). El test quedó en `HangfireExtensionsTests.cs` como `Disabled_NoEjecuta_DevuelveCronNever`. Total final: 6 + 3 = 9 (brief planteaba 6 + 1 = 7), +2 sobre el plan por agregar `CronOverride_TomaPrecedencia` y mover el de Disabled al test correcto.

**Aprendizaje transferible** (replicable en futuros jobs Hangfire):

- **`InternalsVisibleTo` + helper internal static** es el patrón canónico cuando una decisión vive embebida en una extension method de Hangfire/DI/Pipeline pero requiere test unitario sin levantar la infra del scheduler. Aplica directo a Plan 38 Chat 5+ y cualquier nuevo `RecurringJob.AddOrUpdate` que mezcle config + cron.

**Verificación pendiente post-deploy** (4 pasos del brief):

1. `/hangfire` muestra `blacklist-auto-cleanup` con próximo run a 03:00 Perú.
2. `RecurringJob.Trigger("blacklist-auto-cleanup")` manual + revisar logs.
3. Insertar fila prueba `EBL_FechaUltimoFallo = NOW() - 10 days, EBL_MotivoBloqueo = 'BOUNCE_MAILBOX_FULL', EBL_Estado = 1` → tras trigger queda `EBL_Estado = 0`, `EBL_UsuarioMod = 'blacklist-auto-cleanup'`.
4. Logs `BlacklistAutoCleanup: terminado JobRuns=1 JobMarkedRows=N` visibles.
