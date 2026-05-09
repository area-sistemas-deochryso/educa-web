# BE — Load Control F4: Backpressure + Retry-After dinámico en 503

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-05 · **Modo sugerido**: `/execute` → `/validate`
> **Bloqueado por**: F1 (chat 103) cerrado. Plan 102 (`be-runtime-health-execute`) en `closed/` (necesitamos `RuntimeHealth` con p95 expuesto).
> **Bloquea a**: F6a, F6b.
> **Validación prod 2026-05-09 (sábado)**: ⚠️ parcial — Cowork no pudo disparar 503 + `Retry-After` sin sobrecargar prod (queue del bulkhead absorbió 12 PDFs concurrentes). Telemetría histórica `rate-limit-events` con 48 eventos `policy=reports` corresponden a rate-limit/min, NO al bulkhead. Contrato verificado en código (`BackpressureRetryAfterCalculatorTests.cs`).
> **Próximo chat (BE)**: agregar test integración server-side que sature `concurrency:reports` con `cap_max + queue_max + 1` requests sintéticos contra `WebApplicationFactory` y verifique 503 con header `Retry-After` numérico + body `retryAfterSeconds`. Verificar primero si ya existe en `Plan40F2BulkheadIntegrationTests.cs` o vecinos. Si existe → referenciar y `/verify 106`. Si no → crear test, deploy, re-validar.

## CONTEXTO

Implementación de capa 6 del modelo de control de carga. Política documentada en [ADR-0006 §2](../../../Educa.API/.claude/decisions/0006-timeouts-and-backpressure.md).

F1 dejó el `OnRejected` callback distinguiendo 429 (rate) de 503 (concurrency) con un `Retry-After` fijo fallback. F4 implementa el cálculo dinámico:

```
retryAfterSeconds = max(1, ceil(p95_latency_seconds × 1.5))
```

## OBJETIVO DEL CHAT

Reemplazar el `Retry-After` fijo de 503 por un valor calculado a partir del p95 expuesto por `RuntimeHealth`.

## ALCANCE

### IN

1. **Helper `BackpressureRetryAfterCalculator`** en `Helpers/`:

   ```csharp
   public interface IBackpressureRetryAfterCalculator
   {
       int Calculate(string policyName);
   }

   public class BackpressureRetryAfterCalculator : IBackpressureRetryAfterCalculator
   {
       private readonly IRuntimeHealthService _health;
       private readonly ILogger<...> _logger;

       public int Calculate(string policyName)
       {
           try
           {
               var p95Ms = _health.GetP95LatencyMs(); // del Plan 102
               var p95Sec = p95Ms / 1000.0;
               return Math.Max(1, (int)Math.Ceiling(p95Sec * 1.5));
           }
           catch (Exception ex)
           {
               _logger.LogWarning(ex, "p95 unavailable, fallback Retry-After=5");
               return 5;
           }
       }
   }
   ```

2. **Integrar en `OnRejected`** de `RateLimitingExtensions.cs`:

   ```csharp
   options.OnRejected = async (context, ct) =>
   {
       var policyName = context.Lease.GetMetadata("policy") ?? "unknown";
       var isConcurrency = policyName.StartsWith("concurrency:");

       var statusCode = isConcurrency
           ? StatusCodes.Status503ServiceUnavailable
           : StatusCodes.Status429TooManyRequests;

       int retryAfter;
       if (isConcurrency)
       {
           var calc = context.HttpContext.RequestServices
               .GetRequiredService<IBackpressureRetryAfterCalculator>();
           retryAfter = calc.Calculate(policyName);
       }
       else
       {
           retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var v)
               ? (int)Math.Ceiling(v.TotalSeconds) : 60;
       }

       context.HttpContext.Response.StatusCode = statusCode;
       context.HttpContext.Response.Headers.RetryAfter = retryAfter.ToString();
       context.HttpContext.Response.Headers.Append("Access-Control-Expose-Headers", "Retry-After");
       context.HttpContext.Response.ContentType = "application/json";

       await context.HttpContext.Response.WriteAsJsonAsync(new
       {
           mensaje = isConcurrency ? "Servidor saturado" : "Demasiadas solicitudes",
           retryAfterSeconds = retryAfter,
           policy = policyName
       }, ct);
   };
   ```

3. **Registrar el helper en DI**:

   ```csharp
   builder.Services.AddScoped<IBackpressureRetryAfterCalculator, BackpressureRetryAfterCalculator>();
   ```

4. **Tests de integración**:
   - Mock `IRuntimeHealthService` con p95=2000ms → saturar bulkhead → verificar `Retry-After: 3`.
   - Mock con p95=200ms → `Retry-After: 1` (cap mínimo).
   - Mock que tira excepción → `Retry-After: 5` (fallback).
   - Test que 429 (rate limit) NO usa el calculator (sigue con Retry-After del lease).

5. **Frontend awareness** — agregar nota en `educa-web/.claude/rules/rate-limiting.md` sobre el comportamiento del 503 para que el `rateLimitInterceptor` del FE pueda manejar:
   - 429: cooldown global (existente).
   - 503: respeta `Retry-After` y reintenta una sola vez (no escalar a cooldown global — es saturación pasajera, no abuso).

   El cambio en el interceptor del FE es mínimo y puede ir en este mismo chat o como sub-task del 106 si overlap.

### OUT

- Polly retry/circuit breaker en HttpClient → F5.
- Métricas de saturación por bulkhead → reusar Plan 102 si ya las expone.
- Calibración real → F6b.

## CRITERIOS DE COMPLETADO

- ✅ `BackpressureRetryAfterCalculator` implementado y registrado.
- ✅ `OnRejected` usa el calculator para 503 de concurrency.
- ✅ 4 tests de integración pasan (p95 alto, p95 bajo, fallback, 429 sin afectar).
- ✅ FE rateLimitInterceptor maneja 503 distinto a 429 (sin cooldown global).
- ✅ Lint/build/dotnet test verde.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| `IRuntimeHealthService.GetP95LatencyMs` no existe en el Plan 102 con esa signature | Validar en F4 al arrancar; si la signature difiere, adaptar el calculator. |
| p95 oscila mucho → `Retry-After` inestable | Calcular sobre ventana móvil de 5 min (ya hace runtime-health). Aceptable. |
| FE 503 cooldown rompe UX existente | Test manual del interceptor del FE antes de cerrar el chat. |

## REFERENCIAS

- [ADR-0006](../../../Educa.API/.claude/decisions/0006-timeouts-and-backpressure.md) §2.
- Plan 102 (`be-runtime-health-execute`) — fuente de p95.
- F1 (chat 103) — base del callback `OnRejected`.
- `educa-web/.claude/rules/rate-limiting.md` — comportamiento del FE rateLimitInterceptor.
