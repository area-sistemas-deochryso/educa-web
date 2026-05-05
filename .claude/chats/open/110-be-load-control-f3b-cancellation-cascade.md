# BE — Load Control F3b: CancellationToken cascade en repos restantes + test + doc

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-05 · **Modo sugerido**: `/execute` → `/validate`
> **Bloqueado por**: 105a F3a cerrado (HttpClient + ReporteAsistenciaRepository ya tocados).
> **Bloquea a**: F5 (Polly extiende timeouts en HttpClient externos).

## CONTEXTO

Continuación de 105a F3a. La política universal (HttpClient 30s default + EF 30s default + 60s en reportes pesados + CancellationToken propagado) está documentada en [ADR-0006 §1](../../../Educa.API/.claude/decisions/0006-timeouts-and-backpressure.md). 105a entregó:

- HttpClient timeouts consolidados a 30s en `AddHttpClient<>()` (los 2 named clients existentes).
- `ReporteAsistenciaRepository`: 4 firmas con `CancellationToken cancellationToken = default` + `SetCommandTimeout(60)` en las 2 queries pesadas.

Falta el resto de la red de seguridad: 4 repos críticos + test de cancelación + doc en `backend.md`.

## OBJETIVO

Cerrar la propagación de `CancellationToken` en los 4 repos críticos pendientes, validar con un test que la cancelación libera la conexión, y documentar la política operativa.

## ALCANCE

### IN

1. **`CancellationToken` propagado en 4 repos** (interface + impl):
   1. `ConsultaAsistenciaRepository` (~672 LOC) — métodos `ObtenerEstudiantesReporteAsync`, `ObtenerEstadisticasDiaRawAsync`, `ObtenerEstudiantesPorGradoConAsistenciasAsync`, `ObtenerEstudiantesPorDiaAsync`. Verificar si hay otras lecturas pesadas que también convenga marcar.
   2. `AsistenciaAdminRepository` (~178 LOC) — incluir `GetEmailDataByIdsAsync`, `GetEmailDataByIdAsync`.
   3. `UsuariosRepository` (~460 LOC) — listado paginado server-side + count separado (Plan 33). El proyecto tiene `UsuariosRepository.cs` (no `UsuariosQueryRepository.cs` como dijo 105 — auditar y corregir nombre en el brief 105 cerrado si conviene).
   4. `EmailMonitoreoService` (~403 LOC, en `Services/Notifications/`, no en `Sistema/`) — 5 endpoints de dashboard cacheados (`sender-stats`, `top-destinatarios`, `serie-temporal`, `dominios-receptores`, `candidatos-blacklist`) que aún ejecutan SQL bajo `IMemoryCache.GetOrCreateAsync` (caché miss).

   Patrón (idéntico al aplicado en 105a sobre `ReporteAsistenciaRepository`):
   - Agregar `CancellationToken cancellationToken = default` al final de cada signature pública (interface + impl).
   - Propagar a `ToListAsync(cancellationToken)`, `FirstOrDefaultAsync(cancellationToken)`, `CountAsync(cancellationToken)`, `SingleOrDefaultAsync`, `AnyAsync`, etc.
   - **No** rompe callers existentes — `default` cubre las llamadas viejas.

2. **`SetCommandTimeout(60)` en queries pesadas adicionales** que se descubran al revisar (ej: count separado de UsuariosRepository en paginación grande, queries con joins cross-tabla en EmailMonitoreoService). Constante `HeavyReportTimeoutSeconds = 60` por archivo.

3. **Propagación desde controllers críticos**:
   - Las acciones que llaman a estos repos deben aceptar `CancellationToken cancellationToken` como parámetro (ASP.NET wirea automáticamente a `HttpContext.RequestAborted`).
   - Pasar el token al service → repo en cada hop.
   - Scope mínimo: controllers de reportes y de asistencia admin (donde la latencia ya es alta).

4. **Test de cancelación** en el proyecto de tests:
   - Crear `Plan40F3CancellationTests.cs` (o ubicarlo según el patrón existente de tests de Plan 40 F1/F2 en `Educa.API.Tests/`).
   - Caso: ejecutar una query con `SetCommandTimeout(60)` con un `CancellationTokenSource` que cancela a los 2s.
   - Assert: la query lanza `OperationCanceledException` (o `TaskCanceledException`) y la conexión EF se libera (verificable observando que un `_context.Estudiante.CountAsync()` posterior responde inmediato sin bloqueo del pool).
   - Anti-flaky: usar cancel explícito (`cts.Cancel()` después de `Task.Delay(2000)`), assert sobre la excepción y sobre la liberación, no sobre timing absoluto.

5. **Documentar política** en `educa-web/.claude/rules/backend.md`. Sección nueva "Timeouts y CancellationToken" con:
   - HttpClient: 30s default vía `AddHttpClient<>(c => c.Timeout = ...)`. Override por named client si la integración necesita más (uploads grandes, etc.).
   - EF: 30s default global. 60s solo en reportes con `SetCommandTimeout(60)` y constante `HeavyReportTimeoutSeconds` por archivo.
   - Repos críticos propagan `CancellationToken cancellationToken = default`. Resto incremental al tocar (no big-bang).
   - Controllers reciben `CancellationToken` del action y lo pasan service → repo. Cancelación = HttpContext aborted = cliente cerró conexión.

### OUT

- Polly retry/circuit breaker → F5.
- Calibración con datos reales → F6.
- Repos no listados (CrossChex Repository, Ratings, etc.) — incremental al tocar.

## CRITERIOS DE COMPLETADO

- ✅ 4 repos restantes propagan `CancellationToken` (interface + impl).
- ✅ Reportes/queries pesadas adicionales identificadas marcadas con `SetCommandTimeout(60)`.
- ✅ Controllers de reportes y asistencia admin propagan CT.
- ✅ Test de cancelación verde, valida liberación inmediata de conexión.
- ✅ Sección "Timeouts y CancellationToken" agregada a `backend.md`.
- ✅ `dotnet build` + `dotnet test` verde.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Cascade que se infiltra a archivos no listados (services intermediate) y rompe build | Mantener `default` en parámetro nuevo. Solo modificar firmas downstream cuando agregar CT explícito sea trivial. Si el cascade revela archivos > 300 LOC adicionales, frenar y reportar. |
| Test de cancelación flaky por timing del DB | `cts.Cancel()` explícito en lugar de `CancelAfter`. Assert por la excepción + por la operación posterior, no por el tiempo. Usar BD de test con cuota baja para forzar locking visible. |
| `EmailMonitoreoService` no sigue el patrón repo-only (tiene queries SQL inline en service) | Aplicar `_context.Database.SetCommandTimeout(60)` y `cancellationToken` directo en el service, mismo principio. |

## REFERENCIAS

- 105a F3a (chat de origen) — patrón aplicado en `ReporteAsistenciaRepository`.
- [ADR-0006](../../../Educa.API/.claude/decisions/0006-timeouts-and-backpressure.md) §1.
- [ADR-0002](../../../Educa.API/.claude/decisions/0002-resilience-polly-vs-handcrafted.md) — F5 extiende.
- Patrón de timeout en config: `Educa.API/Extensions/ServiceExtensions.cs:195-204`.
