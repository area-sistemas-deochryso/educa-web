# BE — Load Control F3: Timeouts sistemáticos + CancellationToken

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-05 · **Modo sugerido**: `/execute` → `/validate`
> **Bloqueado por**: F1 (chat 103) cerrado. F2 (chat 104) puede correr en paralelo (no hay overlap de archivos).
> **Bloquea a**: F5 (Polly extiende timeouts en HttpClient externos).

## CONTEXTO

Implementación de capa 5 del modelo de control de carga. Política documentada en [ADR-0006 §1](../../../Educa.API/.claude/decisions/0006-timeouts-and-backpressure.md).

Estado actual:
- `HttpClient.Timeout` solo en `CrossChexApiService.cs:52` (`30s`). El resto usa default `100s`.
- `CommandTimeout` no configurado globalmente — EF default `30s`.
- `CancellationToken` propagado parcialmente en services, no sistemático en repos.

## OBJETIVO DEL CHAT

Establecer timeouts default explícitos y propagar `CancellationToken` en los 5 repos críticos del ADR.

## ALCANCE

### IN

1. **HttpClient default 30s en todos los named clients** — auditar `Program.cs` y módulos `AddHttpClient<>()`. Agregar `client.Timeout = TimeSpan.FromSeconds(30)` donde falte:
   - `BlobStorageService` — verificar y agregar.
   - JaaS / videoconferencias — auditar.
   - Cualquier otro `IHttpClientFactory` registrado sin timeout.

2. **EF default 30s mantener; override 60s en reportes pesados**:

   ```csharp
   // En services de reportes específicos (no global)
   public async Task<byte[]> GenerarReporteFiltradoAsync(...)
   {
       _context.Database.SetCommandTimeout(60);
       // ... query pesada ...
   }
   ```

   No cambiar el default global EF — mantener 30s.

3. **`CancellationToken` propagado en repos críticos** (orden):

   1. `ConsultaAsistenciaRepository` — métodos `ObtenerEstudiantesReporteAsync`, `ObtenerEstadisticasDiaRawAsync`, `ObtenerEstudiantesPorGradoConAsistenciasAsync`, `ObtenerEstudiantesPorDiaAsync`.
   2. `AsistenciaAdminRepository` — incluye `GetEmailDataByIdsAsync`, `GetEmailDataByIdAsync`.
   3. `ReporteAsistenciaRepository` — 3 queries con joins masivos.
   4. `EmailMonitoreoService` — 5 endpoints de dashboard cacheados pero con queries SQL.
   5. `UsuariosQueryRepository` — listado paginado server-side + count separado.

   Patrón:
   - Agregar `CancellationToken cancellationToken = default` al final de cada signature.
   - Propagar a `ToListAsync`, `FirstOrDefaultAsync`, `CountAsync`, etc.
   - Propagar también desde el controller (parámetro `CancellationToken cancellationToken`).

4. **Test de cancelación**: una query con `CommandTimeout = 60` que se cancela con un token a los 2s libera la conexión inmediatamente. Validar que el connection pool no queda bloqueado.

5. **Documentar política** en `educa-web/.claude/rules/backend.md` sección nueva "Timeouts y CancellationToken":
   - HttpClient: 30s default, override por named client.
   - EF: 30s default, 60s solo en reportes con `SetCommandTimeout(60)`.
   - Repos críticos propagan `CancellationToken`. Resto incremental al tocar.

### OUT

- Polly retry/circuit breaker → F5.
- Calibración con datos reales → F6.

## CRITERIOS DE COMPLETADO

- ✅ Todos los `HttpClient` registrados tienen `Timeout = 30s` explícito.
- ✅ Reportes pesados marcados con `SetCommandTimeout(60)`.
- ✅ 5 repos críticos propagan `CancellationToken`.
- ✅ Test de cancelación pasa: query cancelada libera conexión inmediato (visible en pool stats).
- ✅ Sección "Timeouts y CancellationToken" agregada a `backend.md`.
- ✅ Lint/build/dotnet test verde.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Cambio de `Timeout` rompe HTTP externo lento legítimo (ej: blob upload 60s) | Override por named client. Default 30s no aplica a uploads grandes — ya tienen su own timeout. |
| `CancellationToken` propagado dispara cancelaciones imprevistas en navegación normal | Solo controllers del scope reciben token de la request. Cancel se dispara solo si el cliente cierra la conexión — comportamiento deseado. |
| Test de cancelación flaky por dependencia de timing | Usar `CancellationTokenSource` con cancel explícito + assert en el response, no en timing absoluto. |

## REFERENCIAS

- [ADR-0006](../../../Educa.API/.claude/decisions/0006-timeouts-and-backpressure.md) §1.
- [ADR-0002](../../../Educa.API/.claude/decisions/0002-resilience-polly-vs-handcrafted.md) — F5 extiende.
- Patrón existente: [`Services/Integraciones/CrossChexApiService.cs:52`](../../../Educa.API/Educa.API/Services/Integraciones/CrossChexApiService.cs).
