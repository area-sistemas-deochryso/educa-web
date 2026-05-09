# BE — Load Control F1: Concurrencia global N=140

> **Repo destino**: `Educa.API` (master)
> **Estado**: 🟡 awaiting-prod — código mergeado, falta validación post-deploy.
> **Creado**: 2026-05-05 · **Cerrado local**: 2026-05-05 · **Modo aplicado**: `/execute` → `/validate` ✅
> **Commit BE**: `Educa.API@8aa99ec` (feat(ratelimit) Plan 40 F1).
> **Bloqueado por**: ADRs 0001-0006 cerrados (chat 096) — ya están en `Educa.API/.claude/decisions/`.
> **Bloquea a**: F2 (bulkheads), F3, F4, F5, F6a, F6b.
> **Validación prod**: ✅ verificada 2026-05-09 — Cowork: 10 fetches concurrentes a `/api/Auth/perfil` 200/200 en 2.9s wall-clock, sin 503. Cap global ≥10 confirmado.

## RESULTADO DEL CHAT (cierre 2026-05-05)

### Cambios shipped

| Archivo | Cambio |
| --- | --- |
| `Extensions/RateLimitingExtensions.cs` | + `KindItemKey`/`PolicyItemKey`/`KindRate`/`KindConcurrency` constants · lectura `ConcurrencyLimits:Global` (default 140, 5000 en TestEnv) · `GlobalLimiter` ahora es `PartitionedRateLimiter.CreateChained(rateGlobal, concurrencyGlobal)` · `OnRejected` decide 429 vs 503 vía `kind` stashado · helper `StashRateLimit(...)` para que las named policies sobre-stasheen `kind=rate`. |
| `Middleware/RateLimitTelemetryMiddleware.cs` | Captura 429 **y** 503 · `ResolvePolicyName` lee primero `PolicyItemKey` stashado (necesario para `concurrency:global` que no lleva `[EnableRateLimiting]`), fallback a metadata del endpoint. |
| `RateLimiting/RateLimitPartitionResolver.cs` | Migrado de `StashLimit` a `StashRateLimit(context, effective, policyName)` para que `reports`/`batch` sobre-stasheen `kind=rate`. |
| `Educa.API.Tests/Integration/Plan40F1ConcurrencyGlobalIntegrationTests.cs` | **NUEVO** · 2 tests: saturación con N=3 (5 GETs concurrentes → 3 OK + 2 con 503 + Retry-After) y regresión 429 (250 GETs → 200 OK + 50 con 429, ningún 503 espurio). |

### Validación local

- `dotnet build` ✅ 0 errores · 23 warnings preexistentes (XML docs + NU1902 vulns conocidas en MailKit/OpenTelemetry).
- `dotnet test` ✅ **1641/1641 verde**, incluyendo 2 tests nuevos del F1 y los 92 tests existentes del subsistema rate-limit (regresión limpia).

### Decisiones tomadas

- **Composición del global limiter**: `PartitionedRateLimiter.CreateChained(rateGlobal, concurrencyGlobal)` para evaluar rate antes de concurrency. Si rate niega no se evalúa concurrency; si rate acepta y concurrency niega, el permit del rate se libera automáticamente. Confirma riesgo del brief sobre composición de policies (no hace falta plan B con policy combinada en un único factory).
- **Kind contaminado entre layers**: el global concurrency factory deja `kind=concurrency` como último valor. Las named policies (login, refresh, biometric, feedback, heavy, reports, batch) **deben** sobre-stashear `kind=rate` vía `StashRateLimit`. Sin esto una rejection de `login` se interpretaría como 503. Cubierto por test de regresión.
- **TestEnv override**: `isTestEnv ? 5_000 : config(140)` mantiene los integration tests existentes del Plan 26 sin interferencia. Tests de F1 explícitamente **NO** setean `UseTestEnv` y configuran `ConcurrencyLimits:Global=3` en memoria.
- **Retry-After fallback 60s para concurrency**: F1 deja el callback preparado pero usa fallback fijo. F4 calculará dinámico real (probablemente ~1-5s). El header está siempre presente (criterio de cierre).
- **Política sin `[EnableRateLimiting]` por endpoint**: la concurrency global se aplica al pipeline globalmente vía `GlobalLimiter`, no como atributo. El middleware de telemetría resuelve la policy desde `PolicyItemKey` stashado por la factory.

### Aprendizajes transferibles a F2

- Las **bulkheads** (`concurrency:pagos`, `concurrency:reports`, etc.) usarán el mismo patrón `StashRateLimit`/`KindItemKey` pero con `KindConcurrency`. Para que un endpoint con bulkhead además del rate limit no contamine kind, hay que evaluar el orden: si el endpoint tiene `[EnableRateLimiting("batch")]` + `[EnableRateLimiting("concurrency:pagos")]`, ambas factories corren y stashean. La última gana — debe ser la de concurrency para que un rechazo del bulkhead se reporte como 503. Validar empíricamente en F2.
- El test pattern del archivo `Plan40F1ConcurrencyGlobalIntegrationTests.cs` (TestServer con InMemoryConfig + TestAuthHandler + endpoint slow para hold-ear conexiones) se reusa tal cual para F2.
- `RateLimitEvent.REL_Policy` (50 chars) está bien dimensionada: `concurrency:pagos` = 18 chars, `concurrency:reports` = 19 chars. No requiere migración.

## GATE POST-DEPLOY (criterios para `/verify`)

Validar en producción tras deploy del commit `Educa.API@8aa99ec`:

1. **Comportamiento normal**: ningún 503 espurio en endpoints que antes pasaban (smoke test de los flujos principales: login, listados admin, asistencia, calificaciones).
2. **Telemetría correcta**: queries sobre `RateLimitEvent` muestran:
   - 429 siguen registrándose con `REL_Policy` correcto (`global:r`, `global:w`, `login`, `refresh`, `biometric`, `feedback`, `reports`, `batch`).
   - Si llega a haber 503 (saturación real, esperable solo bajo pico extremo), `REL_Policy = 'concurrency:global'` con `REL_LimiteEfectivo = 140` y `REL_TokensConsumidos = 140`.
3. **No hay `kind` contaminado**: ningún 429 que aparezca con `REL_Policy='concurrency:global'` (eso indicaría bug en sobre-stash).
4. **Headers HTTP**: 503 (si ocurren) llevan `Retry-After: 60` y body `{ "mensaje": "Servidor temporalmente saturado...", "policy": "concurrency:global" }`.

Si los 4 criterios pasan tras 24-72h, mover a `closed/` con `/verify <NNN>`. Si aparece anomalía, mover a `running/` o `troubles/` con motivo.

---

## CONTEXTO ORIGINAL DEL BRIEF

(El resto del documento es el brief original del chat — preservado por completitud.)

---

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
