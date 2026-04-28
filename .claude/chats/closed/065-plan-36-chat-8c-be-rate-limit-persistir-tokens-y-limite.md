> **Repo destino**: `Educa.API` (backend, branch `master`).
> **Plan**: 36 · **Chat**: 8c · **Fase**: Execute · **Creado**: 2026-04-28 · **Cerrado local**: 2026-04-28.
> **Modo aplicado**: `/execute` → `/validate`.
> **Deriva de**: [`064-plan-36-chat-8b-fe-rate-limit-intentos-umbral-investigar.md`](../waiting/064-plan-36-chat-8b-fe-rate-limit-intentos-umbral-investigar.md).
> **Task tracker BE**: `Educa.API/.claude/tasks/rate-limit-persistir-tokens-y-limite.md`.
> **Commit**: `Educa.API master 5165b62`.

# Plan 36 Chat 8c BE — Persistir `LimiteEfectivo` y `TokensConsumidos` en eventos 429

## CONTEXTO

Investigación de Chat 8b confirmó que el FE renderiza correctamente — la causa raíz es que `RateLimitTelemetryService.LogRejectedAsync` no recibe ni persiste `LimiteEfectivo` / `TokensConsumidos`. Solo `LogEarlyWarningAsync` los setea, y este se dispara con `FueRechazado=false`. En prod los eventos visibles son rechazos → DB con NULL → FE muestra `— / —`.

## OBJETIVO

Que cada `RateLimitEvent` con `REL_FueRechazado = 1` persista `REL_LimiteEfectivo` y `REL_TokensConsumidos` con valores reales del partition que rechazó. FixedWindowRateLimiter rechaza al agotar permits → `tokensConsumidos == limiteEfectivo` en el momento del rechazo (aproximación válida y coherente con el dolor del usuario "ver cuándo se llegó al techo").

## APPROACH

1. Definir constantes públicas en `RateLimitingExtensions` para keys de `HttpContext.Items` (`RateLimit:Limit`, `RateLimit:Tokens`).
2. En cada partition factory de `RateLimitingExtensions.cs` (`GlobalLimiter` + 6 policies), stashear el `PermitLimit` calculado en `context.HttpContext.Items[LimitKey]` antes de devolver el partition descriptor.
3. En `RateLimitPartitionResolver.Resolve`, stashear también `effective` (que ya considera role multiplier + endpoint override).
4. Extender `IRateLimitTelemetryService.LogRejectedAsync` con `int? limiteEfectivo, int? tokensConsumidos`.
5. `RateLimitTelemetryMiddleware.InvokeAsync` lee `HttpContext.Items` cuando hay 429 y setea `tokensConsumidos = limit` (FixedWindow exhausted-on-reject).
6. `RateLimitTelemetryService` persiste los valores.

## RESTRICCIONES

- Mantener INV-S07 / INV-ET02: telemetría NUNCA falla la response.
- No tocar lógica del rate limiter (cuotas, ventanas, partitionado).
- Cap 300 líneas por archivo (`backend.md`).

## VALIDACIÓN

- `dotnet build` limpio.
- `dotnet test` verde — extender RateLimitTelemetryServiceTests + RateLimitTelemetryMiddlewareTests + RateLimitPartitionResolverTests.

## POST-DEPLOY GATE

Sí — verificar columna `INTENTOS / UMBRAL` muestra valores reales en `/intranet/admin/monitoreo/seguridad/rate-limit` tras forzar un 429 real en prod. Cuando se valide, cerrar 063 + 064 (FE) juntos.

---

## EJECUCIÓN — RESUMEN (2026-04-28)

### Decisiones clave

| # | Decisión | Razón |
|---|---------|-------|
| 1 | Stash en `HttpContext.Items` desde la **partition factory** (no desde `OnRejected`) | La factory ya tiene el `limit` calculado en cierre — `OnRejected` no lo expone directo. Funciona para accept y reject sin sobrecosto. |
| 2 | Una sola constante stasheada `tokens == limit` en rechazo | FixedWindow rechaza al agotar permits → la igualdad es exacta en el momento del 429. Aproximación válida y coherente con el dolor del usuario "ver cuándo se llegó al techo". |
| 3 | Helper `StashLimit(context, limit)` público estático en `RateLimitingExtensions` | Reusado por las 6 policies fijas + `RateLimitPartitionResolver`. Evita duplicar la asignación a 2 keys. |
| 4 | `ReadIntItem` defensivo en el middleware (null si no hay stash, null si no es int) | INV-S07 preserved — si por algún motivo el factory no stasheó (path nuevo, refactor futuro), se persiste NULL como hoy. No rompe. |
| 5 | Firma extendida con params **opcionales** (`int? = null`) | Backward compatible — los call sites de tests legacy y cualquier consumidor externo siguen funcionando sin recompile. |

### Aprendizajes transferibles

- **Telemetría a través del pipeline ASP.NET RateLimiter**: el `OnRejected` global no expone el `PermitLimit` del partition que rechazó. La forma limpia de pasarlo al middleware es stashear en `HttpContext.Items` desde la partition factory (que sí lo tiene en su closure). Patrón aplicable a cualquier middleware downstream que necesite metadata del limiter.
- **FixedWindow rejection invariant**: en `FixedWindowRateLimiter`, el rechazo ocurre cuando se agotan permits → `tokensConsumidos == PermitLimit` en el momento exacto del 429. Esto permite "estimar" tokens consumidos sin acceso al estado interno del limiter.
- **Tests pre-existentes ajenos al scope**: las 5 fallas en `Excel.*Plan27_INV_C11` ya estaban en `master` (commit `2ea7830 fix(asistencia-reportes): drop internal references from PDF/Excel header note` — los tests no se actualizaron al cambiar el header). Confirmado con `git stash` + re-test. Deuda separada, no atribuible a este chat.

### Métricas

| Métrica | Antes | Después |
|---------|-------|---------|
| Tests RateLimit | 85 | **91** (+6) |
| Tests totales suite BE | 1488 | 1488 (5 fallas pre-existentes ajenas a scope) |
| Build warnings | preexistentes | sin nuevos |
| Files cambiados | — | 5 producción + 3 tests |

### Archivos tocados

**Producción**:
- `Educa.API/Interfaces/Services/Sistema/IRateLimitTelemetryService.cs` — firma extendida con `int? limiteEfectivo, int? tokensConsumidos` (opcionales).
- `Educa.API/Services/Sistema/RateLimitTelemetryService.cs` — persiste `REL_LimiteEfectivo` y `REL_TokensConsumidos` en rechazos.
- `Educa.API/Extensions/RateLimitingExtensions.cs` — constantes públicas `LimitItemKey`/`TokensItemKey` + helper estático `StashLimit` + 6 partition factories actualizadas (global GET/POST + login/refresh/biometric/feedback/heavy).
- `Educa.API/RateLimiting/RateLimitPartitionResolver.cs` — stashea `effective` (con role multiplier × endpoint override) para policies `reports`/`batch`.
- `Educa.API/Middleware/RateLimitTelemetryMiddleware.cs` — lee items con `ReadIntItem` defensivo y forwardea al service.

**Tests** (+6 nuevos):
- `Educa.API.Tests/Services/Sistema/RateLimitTelemetryServiceTests.cs` — `LogRejectedAsync_ConLimiteYTokens_PersisteAmbos_Plan36Chat8c`, `LogRejectedAsync_SinLimiteNiTokens_PersisteNullLegacy_Plan36Chat8c`.
- `Educa.API.Tests/Middleware/RateLimitTelemetryMiddlewareTests.cs` — `Response429_ConItemsDeRateLimit_PasaLimiteYTokens_Plan36Chat8c`, `Response429_SinItemsDeRateLimit_PasaNullEnLimiteYTokens_Plan36Chat8c`. Verifies legacy actualizadas a la nueva arity (9 args).
- `Educa.API.Tests/RateLimiting/RateLimitPartitionResolverTests.cs` — `Resolve_DirectorReportsBase5_StasheaLimite15EnHttpContextItems`, `Resolve_EstudianteSinOverride_StasheaLimiteBase`.

### Pendiente post-deploy

1. Push `Educa.API master` (lo dispara el usuario).
2. Forzar 429 real en prod (`POST /api/Auth/login` spam o cualquier endpoint con policy → `[RateLimitOverride]`).
3. Verificar en `/intranet/admin/monitoreo/seguridad/rate-limit` que la columna `INTENTOS / UMBRAL` muestra valores reales (ej: `200 / 200`) en lugar de `— / —`.
4. Si ✅: cerrar **063** (`awaiting-prod/`) y **064** (`waiting/`) juntos vía `/verify 063` + `/verify 064`.
5. Si ❌: rollback al chat o investigar regresión.
