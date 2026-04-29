# Plan 39 Chat B BE — EmailHub SignalR + push de 3 eventos + invalidación de caché

> **Repo destino**: `Educa.API` (master)
> **Plan**: 39 · **Chat**: B · **Fase**: F2.Execute · **Estado**: ⏳ pendiente arrancar — prioridad alta
> **Creado**: 2026-04-29 · **Modo sugerido**: `/execute`
> **Pre-req**: Plan 38 Chat 2 (072) deployado (registra `IEmailHubNotifier` NoOp). Conviene también Chat A (077) deployado pero no es duro.

## CONTEXTO INMEDIATO

Cierre del design en chat 071 (Plan 39 Chat 1). D5 cerró el ownership del `EmailHub` server-side: este chat lo crea.

Plan 38 Chat 2 (072) registró `IEmailHubNotifier` con `NullEmailHubNotifier` (loggea, no pushea). Este chat **reemplaza** la registration por la implementación real `SignalREmailHubNotifier` que dispara push vía `IHubContext<EmailHub>`.

## OBJETIVO

Crear `EmailHub` server-side con autenticación de admin + grupo `email-alerts` + 3 eventos. Reemplazar la implementación NoOp del notifier. Invalidar caché de `defer-fail-status` antes de pushear.

## SCOPE

### Archivos nuevos

- `Hubs/EmailHub.cs` — hub SignalR con `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]`. Métodos: `JoinAlertsGroup` / `LeaveAlertsGroup` (cliente se suscribe explícito).
- `Services/Notifications/SignalREmailHubNotifier.cs` — implementa `IEmailHubNotifier` (creado en Chat A 077 o Plan 38 Chat 2 072). Usa `IHubContext<EmailHub>`.
- `Educa.API.Tests/Hubs/EmailHubTests.cs` — tests del push (D15 #12 + concurrencia).

### Archivos modificados

- `Program.cs`:
  - `services.AddSignalR()` (si no está).
  - Mapear `app.MapHub<EmailHub>("/hubs/email-alerts")`.
  - **Reemplazar** `services.AddScoped<IEmailHubNotifier, NullEmailHubNotifier>()` por `services.AddScoped<IEmailHubNotifier, SignalREmailHubNotifier>()`.
- `Services/Notifications/EmailMonitoreoService.cs` (creado en Chat A 077):
  - Inyectar `IEmailHubNotifier`.
  - Después de `MailboxFullBlacklistHandler` blacklistear (en Plan 38 Chat 2), pushear `BlacklistEntryCreated` — coordinar con el handler.
  - Endpoint `candidatos-blacklist`: cuando hay nuevos candidatos detectados, pushear `CandidatoBlacklistDetectado` (D5 brief 071).
- `Services/Notifications/RateLimitDeferFailStatusService.cs` (Plan 29 Chat 2.6):
  - Cuando el contador cambia de banda (OK→WARNING o WARNING→CRITICAL), invalidar caché de `defer-fail-status` y pushear `DeferFailStatusUpdated`.
  - Cache invalidation `_cache.Remove(key)` antes del push (D3 brief 071).

### Eventos del hub (D5 brief 071)

```csharp
// Hubs/EmailHub.cs
public interface IEmailHubClient
{
    Task BlacklistEntryCreated(BlacklistEntryCreatedDto dto);
    Task DeferFailStatusUpdated(DeferFailStatusUpdatedDto dto);
    Task CandidatoBlacklistDetectado(CandidatoBlacklistDetectadoDto dto);
}

[Authorize(Roles = Constants.Auth.Roles.Administrativos)]
public class EmailHub : Hub<IEmailHubClient>
{
    public async Task JoinAlertsGroup() => await Groups.AddToGroupAsync(Context.ConnectionId, "email-alerts");
    public async Task LeaveAlertsGroup() => await Groups.RemoveFromGroupAsync(Context.ConnectionId, "email-alerts");
}
```

### DTOs de payload

```csharp
public record BlacklistEntryCreatedDto(string Correo, string Motivo, int Intentos);
public record DeferFailStatusUpdatedDto(int Hits, int Limit, DateTime VentanaInicio, string Banda); // Banda: OK | WARNING | CRITICAL
public record CandidatoBlacklistDetectadoDto(string Destinatario, int Hits, DateTime UltimoHit);
```

### `SignalREmailHubNotifier` (implementación real)

```csharp
public class SignalREmailHubNotifier : IEmailHubNotifier
{
    private readonly IHubContext<EmailHub, IEmailHubClient> _hub;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SignalREmailHubNotifier> _logger;

    public async Task NotifyBlacklistEntryCreatedAsync(BlacklistEntryCreatedDto dto, CancellationToken ct)
    {
        try
        {
            await _hub.Clients.Group("email-alerts").BlacklistEntryCreated(dto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[EmailHub] Push BlacklistEntryCreated falló para {Correo}", dto.Correo);
            // INV-S07: nunca propagar
        }
    }

    public async Task NotifyDeferFailStatusUpdatedAsync(DeferFailStatusUpdatedDto dto, CancellationToken ct)
    {
        try
        {
            // Invalidar caché del endpoint defer-fail-status (D3 brief 071) antes del push.
            _cache.Remove("defer-fail-status:dominio");
            await _hub.Clients.Group("email-alerts").DeferFailStatusUpdated(dto);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "[EmailHub] Push DeferFailStatusUpdated falló"); }
    }

    public async Task NotifyCandidatoBlacklistDetectadoAsync(CandidatoBlacklistDetectadoDto dto, CancellationToken ct)
    {
        try { await _hub.Clients.Group("email-alerts").CandidatoBlacklistDetectado(dto); }
        catch (Exception ex) { _logger.LogWarning(ex, "[EmailHub] Push CandidatoBlacklistDetectado falló para {Destinatario}", dto.Destinatario); }
    }
}
```

### Tests (BE) — 4 tests

1. `EmailHubTests.JoinAlertsGroup_ConRolAdministrativo_AgregaAlGrupo`.
2. `EmailHubTests.JoinAlertsGroup_SinAuth_Returns401`.
3. `SignalREmailHubNotifierTests.NotifyBlacklist_PusheaACorrectoGrupo` — D15 #12.
4. `SignalREmailHubNotifierTests.NotifyDeferFail_InvalidaCacheAntesDelPush` — D3 cache invalidation.

## VERIFICACIÓN POST-DEPLOY

1. Cliente SignalR (Postman / browser DevTools) conecta a `/hubs/email-alerts` con JWT de Director.
2. `joinAlertsGroup()` retorna sin error.
3. Disparar manualmente `MailboxFullBlacklistHandler` (test sandbox) → cliente recibe `BlacklistEntryCreated` con payload válido.
4. Forzar contador 4/5 en `RateLimitDeferFailStatusService` → cliente recibe `DeferFailStatusUpdated` y caché del endpoint queda vacía.

## DEPENDENCIAS

- ⚠️ **Pre-req duro**: Plan 38 Chat 2 (072) deployado — provee la registración inicial `IEmailHubNotifier` + `MailboxFullBlacklistHandler` que llama al notifier.
- 🟢 Plan 39 Chat A (077) conviene mergeado antes (provee endpoints que el FE consume como fallback al SignalR), pero no es duro.
- 🟢 Plan 39 Chat C (079) FE escucha estos eventos.
- 🟢 Plan 38 Chat 6 (076) FE también escucha — coordinar listener compartido (D13 brief 071).

## REFERENCIAS

- Brief design: `.claude/chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md` (D5 + D13).
- Patrón heredado: `Hubs/AsistenciaHub.cs` (Plan 21+22).
- Reglas: `backend.md` §autorización en SignalR.
