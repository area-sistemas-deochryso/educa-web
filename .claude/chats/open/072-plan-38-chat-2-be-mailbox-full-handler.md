> **Repo destino**: `Educa.API` (backend, branch `master`).
> **Plan**: 38 · **Chat**: 2 · **Fase**: F2.BE · **Modo sugerido**: `/execute`
> **Creado**: 2026-04-29 · **Estado**: ⏳ pendiente arrancar.
> **Pre-requisito DURO**: ejecutar `Educa.API/Educa.API/Scripts/plan38_chat2_AddBounceMailboxFullMotivo.sql` en Azure SQL **antes** del deploy del binario nuevo.

---

# Plan 38 Chat 2 BE — `MailboxFullBlacklistHandler` + refactor de `EmailBounceBlacklistHandler` + nuevo motivo

## CONTEXTO

Cierre design en `chats/closed/070-plan-38-chat-1-blacklist-investigacion-design.md` (decisiones D1, D2, D3, D9, D10, D14, D15, D16). Plan en `.claude/plan/blacklist-detection-admin.md`.

Hallazgo del design: el handler existente cuenta `FAILED_MAILBOX_FULL` mezclado con bounces 5.x.x bajo umbral lifetime 3. La auto-blacklist NO disparó en el incidente 2026-04-29 porque Exim acepta con `250 OK` y reintenta externamente, sin generar nuevas filas en `EmailOutbox` (de ahí kysa con 1 sola fila pero 3 reintentos Exim externos).

## OBJETIVO

1. **Separar** la detección de 4.2.2 del handler de bounces 5.x.x permanentes (D2/D14).
2. **Detectar** patrón crónico 4.2.2 con ventana temporal 24h (D1/D15).
3. **Disparar** auto-blacklist con motivo distinto (`BOUNCE_MAILBOX_FULL`) y política de cleanup propia (Chat 4, Plan 38).

## ARCHIVOS

### Nuevos

- `Educa.API/Constants/Sistema/EmailBlacklistMotivos.cs` — agregar `BounceMailboxFull = "BOUNCE_MAILBOX_FULL"` al array `Validos` + `IsValid` + helper `GetLabel(motivo)` (D20).
- `Educa.API/Models/Notifications/EmailSettings.cs` (sub-clase) — agregar `MailboxFullThresholdHits` (default 2), `MailboxFullThresholdHours` (default 24), `MailboxFullCleanupDays` (default 7).
- `Educa.API/Services/Notifications/MailboxFullBlacklistHandler.cs` — handler nuevo con `HandleSyncFailureAsync` + `HandleBounceAsync` análogos al patrón existente. Inyecta `IOptionsMonitor<EmailSettings>` para umbrales hot-config.
- `Educa.API/Educa.API/Scripts/plan38_chat2_AddBounceMailboxFullMotivo.sql` — migración SQL D10 exacta.

### Modificados

- `Educa.API/Services/Notifications/EmailBounceBlacklistHandler.cs` — remover `SmtpErrorClassifier.FailedMailboxFull` del `HashSet TiposBouncePermanente` (D2). Mantener resto.
- `Educa.API/Services/Notifications/EmailOutboxWorker.cs` — invocar el nuevo handler **antes** del existente cuando `tipoFalloClassified == FailedMailboxFull`. Si dispara, cortocircuita.
- `Educa.API/Services/Notifications/BounceParserService.cs` (Plan 31 Chat 2) — agregar el dispatch al nuevo handler con `bounceSource = "async-imap"` cuando el código del NDR sea 4.2.2 / 5.2.2.
- `Educa.API/Extensions/ServiceExtensions.cs` — registrar `MailboxFullBlacklistHandler` como `Scoped`.
- `Educa.API/Repositories/Notifications/EmailBlacklistRepository.cs` — agregar `ContarHitsMailboxFullAsync(string correoNormalizado, DateTime desde, CancellationToken ct)`.
- `Educa.API/Interfaces/Repositories/Notifications/IEmailBlacklistRepository.cs` — exponer el nuevo método.

### Tests (nuevos, ~13 tests)

- `MailboxFullBlacklistHandlerTests.cs` (nuevo, en `Educa.API.Tests/Services/Notifications/`):
  1. `HitInicial_NoBlacklistea` — 1 hit no dispara, solo agrega telemetría.
  2. `SegundoHitEnVentana_Blacklistea` — 2 hits en 24h dispara con motivo `BOUNCE_MAILBOX_FULL`.
  3. `SegundoHitFueraDeVentana_NoBlacklistea` — el primer hit fuera de las 24h se ignora.
  4. `IncidenteReal_2026_04_29_Reproduce` — fixture con eva@gmail (4 hits) y kysa@gmail (3 hits) en ventana 24h → ambos blacklisted al 2º hit; 3º+4º hits no duplican.
  5. `HitAsyncImap_RespetaVentana` — fuente `async-imap` cuenta igual que sync.
  6. `RaceCondition_DosHitsConcurrentes_UsaUpsertIdempotente` — dos workers procesando bounces simultáneos.
  7. `Threshold_Configurable_3hits_NoBlacklisteaAl2` — `MailboxFullThresholdHits = 3` desde `IOptionsMonitor`.

- `EmailBounceBlacklistHandlerRegressionTests.cs` (nuevo, refactor D2):
  8. `FailedMailboxFull_NoCuentaHaciaBOUNCE_5XX` — destinatario con 3 hits 4.2.2 NO entra a blacklist por este handler.
  9. `FailedInvalidAddress_SigueBlacklisteandoAl3` — el flujo permanente 5.x.x sigue intacto.
  10. `Mix_Permanente5xx_Y_MailboxFull_HandlersIndependientes` — un destinatario con 2 hits 4.2.2 + 1 hit `FailedInvalidAddress` → blacklisted con `BOUNCE_MAILBOX_FULL` (handler nuevo gana porque dispara primero).

- `EmailOutboxWorkerSmokeTests.cs` (extender):
  11. `MailboxFullBlacklistHandler_InvocadoAntesQueBounceHandler` — validar orden de evaluación.

- `BounceParserServiceTests.cs` (extender, Plan 31):
  12. `Ndr422Async_DispatchaAMailboxFullHandler` — NDR con código 4.2.2 → handler nuevo, no el existente.

- `EmailBlacklistMotivosTests.cs` (nuevo o extender):
  13. `IsValid_BounceMailboxFull_True` + `GetLabel_BounceMailboxFull_BuzonLleno`.

## VALIDACIÓN

```bash
# Backend
dotnet build Educa.API/Educa.API/Educa.API.csproj   # 0 errores
dotnet test Educa.API/Educa.API.Tests/Educa.API.Tests.csproj --filter FullyQualifiedName~Notifications
# Esperado: ≥1525 tests verdes (1514 baseline + 13 nuevos).

# SQL (ejecutar en Azure SQL ANTES del deploy)
# Educa.API/Educa.API/Scripts/plan38_chat2_AddBounceMailboxFullMotivo.sql
SELECT name, definition FROM sys.check_constraints WHERE name = 'CK_EmailBlacklist_Motivo';
# Debe mostrar 5 motivos: BOUNCE_5XX, BOUNCE_MAILBOX_FULL, MANUAL, BULK_IMPORT, FORMAT_INVALID
```

## INVARIANTES

- ✅ `INV-MAIL02` editado (D14) — `FailedMailboxFull` ya no cuenta para `BOUNCE_5XX`.
- ✅ `INV-MAIL07` nuevo (D15) — handler nuevo con ventana 24h, umbral 2.
- ✅ `INV-S07` (fail-open) — try/catch global en el handler nuevo: cualquier fallo del handler NO debe bloquear el envío del correo actual ni romper el flujo del worker.
- ✅ `INV-D03` (soft-delete) — no se borra nada.
- Cap 300 ln respetado en todos los archivos modificados.

## OUT

- Endpoints `POST` / `GET` de blacklist (Chat 3).
- Job de cleanup automático (Chat 4).
- UI admin (Chat 5).
- Banner B9 + toast (Chat 6).

## VERIFICACIÓN POST-DEPLOY

1. SQL ejecutado en Azure: `SELECT definition FROM sys.check_constraints WHERE name = 'CK_EmailBlacklist_Motivo'` → 5 motivos.
2. Forzar 2 hits 4.2.2 en sandbox al mismo destinatario → fila en `EmailBlacklist` con `EBL_MotivoBloqueo = 'BOUNCE_MAILBOX_FULL'`, `EBL_IntentosFallidos = 2`.
3. Tras blacklist: nuevo `EnqueueAsync` al mismo correo se rechaza pre-encolado (`INV-MAIL01`).
4. Logs: `EmailBlacklistHits` counter incrementa con tags `motivo=BOUNCE_MAILBOX_FULL, origen=auto-handler`.

## ENTREGABLE AL CERRAR

- Commit con prefijo `feat(email):` + descripción de los handlers + scripts SQL ejecutados.
- Brief movido a `chats/awaiting-prod/072-plan-38-chat-2-be-mailbox-full-handler.md`.
- Maestro actualizado.
