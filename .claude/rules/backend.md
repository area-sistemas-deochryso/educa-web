# Reglas Backend (Educa.API)

## Timeouts y CancellationToken

### HttpClient

- **30s default** vía `AddHttpClient<>(c => c.Timeout = TimeSpan.FromSeconds(30))` en `ServiceExtensions.cs`.
- Override por named client si la integración necesita más (uploads grandes, etc.).

### EF Core

- **30s default** global (default de EF).
- **60s** solo en queries pesadas (reportes, paginación grande, joins cross-tabla) con `SetCommandTimeoutIfRelational(HeavyReportTimeoutSeconds)`.
- Cada repo que necesita 60s define `private const int HeavyReportTimeoutSeconds = 60;`.
- `SetCommandTimeoutIfRelational` es un extension method que skip silente bajo InMemory provider (tests).

### CancellationToken

- Repos críticos propagan `CancellationToken cancellationToken = default` en toda firma async pública (interface + impl).
- Repos completados: `ConsultaAsistenciaRepository`, `AsistenciaAdminRepository`, `UsuariosRepository`, `EmailMonitoreoService`, `ReporteAsistenciaRepository`.
- Resto: incremental al tocar (no big-bang).
- Services intermedios (`ConsultaAsistenciaService`, `UsuariosService`, `ReporteFiltradoAsistenciaService`) y strategies propagan `CancellationToken ct = default`.
- Controllers reciben `CancellationToken ct` como parámetro de action (ASP.NET wirea automáticamente a `HttpContext.RequestAborted`) y lo pasan service → repo.
- Cancelación = `HttpContext` aborted = cliente cerró conexión → EF aborta la query y libera la conexión del pool.

### Referencia

- [ADR-0006 §1](../../Educa.API/.claude/decisions/0006-timeouts-and-backpressure.md) — política completa.
- Test: `Plan40F3CancellationTests.cs` — valida que cancelación libera contexto EF.
