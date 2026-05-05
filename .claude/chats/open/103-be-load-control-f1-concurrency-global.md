# BE — Load Control F1: Concurrencia global N=140

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-05 · **Modo sugerido**: `/execute` → `/validate`
> **Bloqueado por**: ADRs 0001-0006 cerrados (chat 096) — ya están en `Educa.API/.claude/decisions/`.
> **Bloquea a**: F2 (bulkheads), F3, F4, F5, F6a, F6b.

## CONTEXTO

Implementación de capa 2 del modelo de control de carga. Decisión documentada en [ADR-0003](../../../Educa.API/.claude/decisions/0003-concurrency-limits-via-rate-limiter.md) y [ADR-0004](../../../Educa.API/.claude/decisions/0004-global-concurrency-n.md).

**Mecanismo**: extender `Extensions/RateLimitingExtensions.cs` con política `concurrency:global` usando `ConcurrencyLimiter` built-in de .NET 9 (no agregar middleware nuevo).

**N=140**, justificación detallada en ADR-0004 (paper trail completo del cálculo `200 × 0.7` y consumidores del headroom).

## OBJETIVO DEL CHAT

Agregar política `concurrency:global` y aplicarla globalmente al pipeline. Sin endpoints específicos clasificados todavía (eso es F2).

## ALCANCE

### IN

1. Agregar al `AddRateLimiter` en `RateLimitingExtensions.cs`:

   ```csharp
   var globalConcurrency = isTestEnv ? 5_000 : 140;
   options.AddPolicy("concurrency:global", context =>
       RateLimitPartition.GetConcurrencyLimiter("global", _ => new ConcurrencyLimiterOptions
       {
           PermitLimit = globalConcurrency,
           QueueLimit = 0
       }));
   ```

2. Aplicar la política globalmente vía `app.UseRateLimiter()` con default policy o middleware filter que envuelve el pipeline (validar la opción que .NET 9 expone más limpia).

3. Configurar via `IConfiguration` (key `ConcurrencyLimits:Global`) con default 140 — para que F6 itere sin redeploy vía Azure App Configuration:

   ```csharp
   var globalConcurrency = isTestEnv ? 5_000
       : configuration.GetValue<int>("ConcurrencyLimits:Global", defaultValue: 140);
   ```

4. Extender `OnRejected` callback para distinguir 429 (rate limit) de 503 (concurrency saturated):

   ```csharp
   options.RejectionStatusCode = ...; // remover, usar lógica condicional
   options.OnRejected = async (context, ct) =>
   {
       var policyName = context.Lease.GetMetadata(...) ?? "rate";
       var statusCode = policyName.StartsWith("concurrency:")
           ? StatusCodes.Status503ServiceUnavailable
           : StatusCodes.Status429TooManyRequests;
       context.HttpContext.Response.StatusCode = statusCode;
       // resto igual + body con policy
   };
   ```

   (F4 finaliza la lógica de `Retry-After` dinámico — F1 deja el callback preparado pero usa fallback fijo.)

5. Test de integración:
   - Saturar con 200 requests paralelas a un endpoint cualquiera.
   - Verificar que ~60-80 reciben 503 (no 429), las primeras 140 pasan.
   - Validar `Retry-After` presente en headers.

### OUT (no scope)

- Bulkheads por categoría → F2.
- Timeouts en repos → F3.
- `Retry-After` calculado dinámicamente → F4.
- Polly para HttpClient → F5.
- Calibración con datos reales → F6.

## CRITERIOS DE COMPLETADO

- ✅ Política `concurrency:global` registrada y aplicada globalmente.
- ✅ Configurable vía `IConfiguration` (`ConcurrencyLimits:Global`).
- ✅ `OnRejected` distingue 429 (rate) de 503 (concurrency) con el body apropiado.
- ✅ Test de integración pasa: requests > 140 reciben 503 con `Retry-After`.
- ✅ Lint/build/dotnet test verde.
- ✅ Telemetría existente (RateLimitTelemetryMiddleware) persiste eventos de concurrency saturation correctamente.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| `[EnableRateLimiting]` y default global no se componen como AND | Investigar si `app.UseRateLimiter()` aplica global + se respetan los `[EnableRateLimiting]` extras de F2. Plan B: aplicar `concurrency:global` como `[EnableRateLimiting]` explícito en cada controller base. |
| Test sintético con 200 requests dispara rate limit existente antes que concurrency | Usar usuario con multiplier alto (`reports` Director ×3) o desactivar rate limit en TestEnv (ya configurado con `isTestEnv ? 50_000 : ...`). |
| `OnRejected` cambio rompe headers existentes | Test de regresión sobre 429 actual antes de mergear. |

## REFERENCIAS

- [ADR-0003](../../../Educa.API/.claude/decisions/0003-concurrency-limits-via-rate-limiter.md) — mecanismo.
- [ADR-0004](../../../Educa.API/.claude/decisions/0004-global-concurrency-n.md) — N=140.
- [`Extensions/RateLimitingExtensions.cs`](../../../Educa.API/Educa.API/Extensions/RateLimitingExtensions.cs) — archivo a extender.
- [`Middleware/RateLimitTelemetryMiddleware.cs`](../../../Educa.API/Educa.API/Middleware/RateLimitTelemetryMiddleware.cs) — telemetría heredada.
