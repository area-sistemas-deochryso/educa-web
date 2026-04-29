# Plan 39 Chat A BE — Endpoints de monitoreo + service + caché + tests + índice SQL

> **Repo destino**: `Educa.API` (master)
> **Plan**: 39 · **Chat**: A · **Fase**: F2.Execute · **Estado**: ⏳ awaiting-prod desde 2026-04-29 — local commit `Educa.API@17099d1`
> **Creado**: 2026-04-29 · **Modo sugerido**: `/execute`
> **Pre-req duro**: ✅ SQL `plan39_chat2_AddDashboardIndex.sql` ejecutado en Azure (confirmado 2026-04-29 por usuario antes de empezar)
> **Cierre local**: 30 tests nuevos verdes (suite completa 1559/1559). Falta deploy del BE para `/verify`.

## CONTEXTO INMEDIATO

Cierre del design en chat 071 (Plan 39 Chat 1). Decisiones D1-D18 cerradas — sin debate adicional.

Chat 071 ahora vive en `chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md`. Plan completo en `.claude/plan/monitoreo-empirico-mejoras.md`.

## OBJETIVO

Implementar los 5 endpoints del dashboard de monitoreo de correos, con caché en memoria, fail-safe (INV-S07), y tests con seed reproducible del incidente del 2026-04-20→29.

## SCOPE

### Archivos nuevos

- `Controllers/Sistema/EmailMonitoreoController.cs` — 5 endpoints GET con `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]`.
- `Services/Notifications/EmailMonitoreoService.cs` + `Interfaces/Services/Notifications/IEmailMonitoreoService.cs`.
- `DTOs/Notifications/Monitoreo/`:
  - `DashboardSenderStatDto.cs`
  - `DashboardTopDestinatarioDto.cs`
  - `DashboardSerieTemporalPuntoDto.cs`
  - `DashboardDominioReceptorDto.cs`
  - `DashboardCandidatoBlacklistDto.cs`
- `DTOs/Notifications/Monitoreo/EmailMonitoreoQueryParams.cs` — binding tipado de query params (ventanaDias, limit, granularidad, umbralHits, ventanaHoras) con validación + clamps (D7).
- `Scripts/plan39_chat2_AddDashboardIndex.sql` — script idempotente del índice covering (D9 del brief 071).
- `Educa.API.Tests/Services/Notifications/EmailMonitoreoServiceTests.cs` — 8 tests (D15 #1-8).
- `Educa.API.Tests/Services/Notifications/EmailMonitoreoCacheTests.cs` — 1 test (D15 #11).
- `Educa.API.Tests/Controllers/Sistema/EmailMonitoreoControllerTests.cs` — 3 tests (D15 #6-8).
- `outputs/cpanel-fallos-historicos-2026-04-20-29.md` — snapshot del análisis manual (data del Plan 39 Chat 1).

### Archivos modificados

- `Program.cs` — registrar `IEmailMonitoreoService` + `IMemoryCache` (si no existe ya).
- `Constants/Notifications/EmailSettings.cs` — agregar `MonitoreoCacheSeconds*` (1 por método si los TTL no se hardcodean — preferible config).

### Endpoints (firmas finales — D10 del brief 071)

| Verbo | Path | Query | Cache TTL |
|---|---|---|---|
| GET | `/api/sistema/email-outbox/monitoreo/sender-stats` | `?ventanaDias=7` (cap 30) | 5min |
| GET | `/api/sistema/email-outbox/monitoreo/top-destinatarios` | `?ventanaDias=7&limit=10` (caps 30d, 50) | 5min |
| GET | `/api/sistema/email-outbox/monitoreo/serie-temporal` | `?granularidad=hour\|day` (default `hour`) | 60s / 10min |
| GET | `/api/sistema/email-outbox/monitoreo/dominios-receptores` | `?ventanaDias=7` (cap 30) | 10min |
| GET | `/api/sistema/email-outbox/monitoreo/candidatos-blacklist` | `?umbralHits=2&ventanaHoras=24` (defaults desde `EmailSettings`) | 30s |

Auth: `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]` a nivel controller.

### Caché

`IMemoryCache` keyed por `monitoreo:{metodo}:{paramsHash}`. Patrón:

```csharp
return await _cache.GetOrCreateAsync(key, entry =>
{
    entry.AbsoluteExpirationRelativeToNow = ttl;
    return _service.GetXAsync(...);
});
```

`paramsHash`: hash determinístico de los query params (ej: `(ventanaDias=7,limit=10).GetHashCode()`).

### SQL (referencias canónicas a brief 071)

Las 5 queries SQL están definidas en el brief 071 cerrado, sección **D7.1 → D7.5**. Implementar con LINQ to EF (preferible) o `_context.Database.SqlQuery<T>(...)` si LINQ es más complicado de leer (ej: `serie-temporal` con CTE).

Patrón heredado de `EmailDashboardDiaService.BuildResumenAsync`:

```csharp
var buckets = await _context.EmailOutbox.AsNoTracking()
    .Where(e => e.EO_FechaReg >= desde)
    .GroupBy(e => new { e.EO_Estado, e.EO_TipoFallo })
    .Select(g => new { g.Key.EO_Estado, g.Key.EO_TipoFallo, Count = g.Count() })
    .ToListAsync(ct);
```

### Fail-safe (INV-S07)

Cada método del service envuelto en try-catch. En error → log warning + retornar lista vacía. Patrón heredado de `EmailDashboardDiaService.GetDashboardDiaAsync`.

### Hub notifier NoOp

> ⚠️ **Compartido con Plan 38 Chat 2 (072)**: la implementación `NullEmailHubNotifier` se registra en este chat **solo si Plan 38 Chat 2 aún no la registró**. Si 072 ya está mergeado, este chat no toca la registration — solo agrega los nuevos métodos al interface si Plan 38 Chat 2 no los puso. Coordinación cerrada en D5/D13 del brief 071.

Si este chat se ejecuta antes que 072 (orden no garantizado):

- Crear `Interfaces/Notifications/IEmailHubNotifier.cs` con 3 métodos: `NotifyBlacklistEntryCreatedAsync`, `NotifyDeferFailStatusUpdatedAsync`, `NotifyCandidatoBlacklistDetectadoAsync`.
- Crear `Services/Notifications/NullEmailHubNotifier.cs` que loggea pero no pushea.
- Registrar `Scoped<IEmailHubNotifier, NullEmailHubNotifier>()` en `Program.cs`.

Si 072 ya lo hizo, no duplicar. Plan 39 Chat B (078) lo reemplazará por la implementación SignalR real.

### Tests (BE) — 8 + 1 + 3 = 12 tests

D15 del brief 071. Resumen:

1. `SenderStats_DesbalanceadoSistemas4` — seed con `sistemas4` 52% volumen.
2. `TopDestinatarios_KysaPrimeraEnDia2` — seed día 2 → kysa #1 con badge.
3. `SerieTemporal_DetectaSpike27Abr` — bucket 27-abr 169 vs base ~10.
4. `DominiosReceptores_GmailDomina` — gmail.com mayor volumen.
5. `CandidatosBlacklist_FiltraYaBlacklisteados` — eva no aparece, kysa sí.
6. `Auth_NoAdministrativos_Returns403`.
7. `Get_VentanaInvalida_Returns400`.
8. `Get_VentanaExcedeCap_SeClampea` — `?ventanaDias=99` → service usa 30.
9. `CandidatosBlacklist_UsaSettingsDelHandler` — D2 (defaults desde `EmailSettings`).
10. `SerieTemporal_HoraVsDia_VentanasFijas` — D7.3 (hora=24h, día=30d).
11. `SegundaLlamadaConMismosParametros_HitDeCache` — D14 (TTL respeta defaults).
12. `NullEmailHubNotifier_NoLanzaExcepcion` — D5 (handler no falla con NoOp).

Seed compartido: builder fixture que reproduce los 327 fallos del análisis del 2026-04-20→29 (output `outputs/cpanel-fallos-historicos-2026-04-20-29.md`).

## VERIFICACIÓN POST-DEPLOY

1. `GET /api/sistema/email-outbox/monitoreo/sender-stats?ventanaDias=7` retorna `sistemas4 52%` o equivalente actual.
2. `GET /api/sistema/email-outbox/monitoreo/candidatos-blacklist` con umbral 2 retorna lista (vacía si Plan 38 Chat 2 ya blacklisteó todos).
3. SQL: confirmar que `IX_EmailOutbox_FechaReg_Estado_TipoFallo` aparece en `sys.indexes` y los queries del dashboard la usan (`SET STATISTICS IO ON` en query analyzer).
4. Logs: `_logger.LogInformation` confirma estructura `[EmailMonitoreo] sender-stats — N senders, M total events`.

## OUTPUT ESPERADO

- 5 endpoints funcionando con caché.
- 12 tests verdes (incluyendo el del NoOp).
- Script SQL `plan39_chat2_AddDashboardIndex.sql` ejecutado en Azure pre-deploy.
- Snapshot `outputs/cpanel-fallos-historicos-2026-04-20-29.md` versionado en repo.
- Commit `feat(monitoreo): add EmailMonitoreoService + 5 dashboard endpoints (Plan 39 Chat A)`.

## DEPENDENCIAS

- ✅ Plan 38 Chat 2 (072) compatible (registración NoOp coordinada — D13).
- 🟢 Plan 39 Chat B (078) consume `IEmailHubNotifier` real — este chat solo prepara el interface + NoOp.
- 🟢 Plan 39 Chat C (079) FE consume estos 5 endpoints.

## REFERENCIAS

- Brief design: `.claude/chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md` (DECISIONES FINALES D1-D18).
- Plan: `.claude/plan/monitoreo-empirico-mejoras.md`.
- Reglas: `business-rules.md` §15.14 (INV-MAIL08), `backend.md` §300 (split de service).
- Patrón heredado: `Educa.API/Services/Notifications/EmailDashboardDiaService.cs` (Plan 30 Chat 1).
