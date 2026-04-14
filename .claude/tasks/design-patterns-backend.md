# Plan de Patrones de Diseño — Backend (ASP.NET Core 9)

> **Estado**: Pendiente
> **Prioridad**: Media-alta (mejora robustez y desacoplamiento)
> **Estimación**: Incremental — se aplica conforme se toca cada módulo
> **Principio**: "Un patrón sin dolor que resuelva es complejidad gratuita."

---

## Estado Actual del Backend

| Patrón | Estado | Cobertura |
|--------|--------|-----------|
| Layered (Controller → Service → Repository) | ✅ Implementado | 100% |
| Strategy (rol-based queries) | ✅ Implementado | 3 strategies (UsuarioRol, ConsultaAsistencia, UsuarioQuery) |
| Command (batch operations) | ✅ Implementado | BatchCommandExecutor + AprobacionCommand |
| Outbox (correos) | ✅ Implementado | EmailOutboxService + Worker |
| Result Pattern | ❌ No existe | Excepciones para todo (negocio + técnico) |
| Domain Events | ❌ No existe | Side effects acoplados en services |
| Specification | ❌ No existe | Queries con filtros inline en repositories |
| Decorator | ❌ No existe | Cross-cutting mezclado en services |
| Unit of Work explícito | ⚠️ Implícito via EF | Sin transacciones coordinadas formales |

**Infraestructura existente**: 103 services, 123 interfaces, todo `AddScoped`, registrado via `RepositoryExtensions.cs` y `ServiceExtensions.cs` en `Program.cs`. Sin MediatR ni librerías de CQRS.

---

## Patrón 1 — Result Pattern (Prioridad Alta)

### Problema

Services lanzan excepciones para **todo**: errores técnicos (`NullReferenceException`) y reglas de negocio (`BusinessRuleException`). Pero una regla de negocio no cumplida no es un error — es un resultado válido.

```csharp
// Actual — excepción para flujo de negocio
public async Task AprobarEstudianteAsync(int id)
{
    var periodo = await _repo.GetPeriodoAsync(salonId);
    if (periodo.EstadoCierre != "CERRADO")
        throw new BusinessRuleException("INV-T02: Periodo no cerrado"); // Esto no es una excepción
    // ...
}
```

El controller necesita `GlobalExceptionMiddleware` para convertir la excepción en 422, perdiendo la semántica de "resultado esperado".

### Solución

Clase `Result<T>` ligera (sin librería externa):

```
Educa.API/
├── Common/
│   ├── Result.cs            # Result<T> genérico
│   └── Error.cs             # Error tipado con código
```

```csharp
// Common/Result.cs
public class Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess => Error is null;
    public bool IsFailure => !IsSuccess;

    private Result(T value) { Value = value; }
    private Result(Error error) { Error = error; }

    public static Result<T> Ok(T value) => new(value);
    public static Result<T> Fail(string code, string message) => new(new Error(code, message));
}

public record Error(string Code, string Message);
```

```csharp
// Service retorna Result, no lanza excepción
public async Task<Result<AprobacionDto>> AprobarEstudianteAsync(int id)
{
    var periodo = await _repo.GetPeriodoAsync(salonId);
    if (periodo.EstadoCierre != "CERRADO")
        return Result<AprobacionDto>.Fail("INV-T02", "No se puede aprobar con periodo abierto");

    // ... lógica
    return Result<AprobacionDto>.Ok(dto);
}

// Controller maneja el Result
[HttpPost("aprobar")]
public async Task<IActionResult> Aprobar(int id)
{
    var result = await _aprobacionService.AprobarEstudianteAsync(id);
    if (result.IsFailure)
        return UnprocessableEntity(ApiResponse<object>.Fail(result.Error!.Code, result.Error.Message));

    return Ok(ApiResponse<AprobacionDto>.Success(result.Value!, "Estudiante aprobado"));
}
```

### Cuándo usar Result vs Exception

| Situación | Usar | Ejemplo |
|-----------|------|---------|
| Regla de negocio no cumplida | `Result.Fail` | Periodo no cerrado, matrícula duplicada |
| Entidad no encontrada (esperado) | `Result.Fail` | Estudiante no existe |
| Validación de input | `Result.Fail` | DNI inválido, monto negativo |
| Error técnico inesperado | `throw` | DB down, null reference, timeout |
| Error de concurrencia | `throw` | `DbUpdateConcurrencyException` → retry |

### Fases

```
R1.1 [ ] Crear Result<T> y Error en Common/
R1.2 [ ] Crear extension method para controller: result.ToActionResult()
R1.3 [ ] Piloto: migrar AprobacionService (usa BusinessRuleException en 5+ lugares)
R1.4 [ ] Migrar AsistenciaAdminService (cierre mensual, validaciones INV-AD*)
R1.5 [ ] Migrar CalificacionService (ventana de edición, periodo cerrado)
R1.6 [ ] Gradualmente migrar resto de services al tocar cada módulo
R1.7 [ ] Documentar en .claude/rules/backend.md cuándo Result vs Exception
```

### Extension helper para controllers

```csharp
// Common/ResultExtensions.cs
public static class ResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result, string successMessage = "")
    {
        if (result.IsSuccess)
            return new OkObjectResult(ApiResponse<T>.Success(result.Value!, successMessage));

        return result.Error!.Code switch
        {
            var c when c.StartsWith("NOT_FOUND") => new NotFoundObjectResult(
                ApiResponse<object>.Fail(c, result.Error.Message)),
            _ => new UnprocessableEntityObjectResult(
                ApiResponse<object>.Fail(result.Error.Code, result.Error.Message)),
        };
    }
}
```

### Impacto

- Controllers pasan de 5-10 líneas de try/catch a 2 líneas con `result.ToActionResult()`
- Services expresan intención: "esto puede fallar por regla de negocio" vs "esto no debería fallar"
- Facilita testing: verificar `result.IsFailure` es más limpio que `Assert.ThrowsAsync<>`

---

## Patrón 2 — Domain Events (Prioridad Alta)

### Problema

Services tienen side effects acoplados directamente:

```csharp
// Actual — AsistenciaService.RegistrarAsistencia()
public async Task RegistrarAsistenciaAsync(...)
{
    // 1. Lógica de negocio (clasificar marcación)
    await _repo.SaveAsync(asistencia);

    // 2. Side effects acoplados directamente
    await _signalRService.NotificarAsistencia(asistencia);      // SignalR
    await _emailOutbox.EnqueueAsync(correo);                     // Email
    // Si mañana se agrega: push notification, webhook, estadísticas...
    // este método crece sin parar
}
```

### Solución

Eventos de dominio con dispatcher simple (sin MediatR — mantener lightweight):

```
Educa.API/
├── Common/
│   ├── Events/
│   │   ├── IDomainEvent.cs              # Interfaz marcadora
│   │   ├── IDomainEventHandler.cs       # Contrato de handler
│   │   └── DomainEventDispatcher.cs     # Dispatcher por DI
├── Events/
│   ├── Asistencia/
│   │   ├── AsistenciaRegistradaEvent.cs
│   │   ├── NotificarSignalRHandler.cs
│   │   └── EnviarCorreoAsistenciaHandler.cs
│   ├── Aprobacion/
│   │   ├── EstudianteAprobadoEvent.cs
│   │   ├── CrearSalonDestinoHandler.cs
│   │   └── NotificarAprobacionHandler.cs
│   └── Calificacion/
│       ├── CalificacionPublicadaEvent.cs
│       └── NotificarCalificacionHandler.cs
```

```csharp
// Common/Events/IDomainEvent.cs
public interface IDomainEvent
{
    DateTime OccurredOn { get; }
}

// Common/Events/IDomainEventHandler.cs
public interface IDomainEventHandler<in TEvent> where TEvent : IDomainEvent
{
    Task HandleAsync(TEvent domainEvent, CancellationToken ct = default);
}

// Common/Events/DomainEventDispatcher.cs
public class DomainEventDispatcher : IDomainEventDispatcher
{
    private readonly IServiceProvider _provider;

    public async Task DispatchAsync<TEvent>(TEvent domainEvent, CancellationToken ct = default)
        where TEvent : IDomainEvent
    {
        var handlers = _provider.GetServices<IDomainEventHandler<TEvent>>();
        foreach (var handler in handlers)
        {
            try
            {
                await handler.HandleAsync(domainEvent, ct);
            }
            catch (Exception ex)
            {
                // Fire-and-forget: side effect failure NEVER fails the main operation (INV-S07)
                _logger.LogWarning(ex, "Handler {Handler} falló para evento {Event}",
                    handler.GetType().Name, typeof(TEvent).Name);
            }
        }
    }
}
```

```csharp
// Service limpio — solo negocio + dispatch
public async Task RegistrarAsistenciaAsync(...)
{
    // Lógica de negocio pura
    var asistencia = ClasificarMarcacion(...);
    await _repo.SaveAsync(asistencia);

    // Un dispatch, N handlers desacoplados
    await _dispatcher.DispatchAsync(new AsistenciaRegistradaEvent(asistencia));
}

// Cada handler es independiente y testeable
public class NotificarSignalRHandler : IDomainEventHandler<AsistenciaRegistradaEvent>
{
    public async Task HandleAsync(AsistenciaRegistradaEvent e, CancellationToken ct)
    {
        await _hubContext.Clients.Group(e.SedeId.ToString())
            .SendAsync("AsistenciaRegistrada", e.ToNotification(), ct);
    }
}
```

### Registro en DI

```csharp
// Extensions/EventExtensions.cs
public static IServiceCollection AddDomainEvents(this IServiceCollection services)
{
    services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();

    // Asistencia
    services.AddScoped<IDomainEventHandler<AsistenciaRegistradaEvent>, NotificarSignalRHandler>();
    services.AddScoped<IDomainEventHandler<AsistenciaRegistradaEvent>, EnviarCorreoAsistenciaHandler>();

    // Aprobación
    services.AddScoped<IDomainEventHandler<EstudianteAprobadoEvent>, CrearSalonDestinoHandler>();
    services.AddScoped<IDomainEventHandler<EstudianteAprobadoEvent>, NotificarAprobacionHandler>();

    return services;
}
```

### Eventos candidatos (por impacto)

| Evento | Handlers actuales acoplados | Prioridad |
|--------|---------------------------|-----------|
| `AsistenciaRegistradaEvent` | SignalR + Email + (futuro: push, estadísticas) | Alta |
| `EstudianteAprobadoEvent` | Crear salón destino + Email + Cambiar estado | Alta |
| `CalificacionPublicadaEvent` | (futuro: notificar apoderado, actualizar promedios) | Media |
| `PeriodoCerradoEvent` | Congelar calificaciones + Habilitar aprobación | Media |
| `MatriculaConfirmadaEvent` | (futuro: email confirmación, actualizar stats) | Baja |

### Fases

```
R2.1 [ ] Crear IDomainEvent, IDomainEventHandler, DomainEventDispatcher en Common/Events/
R2.2 [ ] Crear AsistenciaRegistradaEvent + 2 handlers (SignalR, Email)
R2.3 [ ] Refactorizar AsistenciaService para dispatch en vez de llamadas directas
R2.4 [ ] Crear EstudianteAprobadoEvent + handlers
R2.5 [ ] Refactorizar AprobacionService
R2.6 [ ] Crear EventExtensions.cs para registro en DI
R2.7 [ ] Tests unitarios de cada handler (aislado)
R2.8 [ ] Gradualmente crear eventos para Calificación y Periodo
```

---

## Patrón 3 — Specification Pattern (Prioridad Media)

### Problema

Repositories tienen queries con filtros combinados inline:

```csharp
// Actual — UsuariosRepository.cs
public async Task<List<UsuarioListaDto>> ListarAsync(string? rol, bool? estado, string? busqueda, int? sedeId)
{
    var query = _context.Usuarios.AsNoTracking();
    if (rol != null) query = query.Where(u => u.Rol == rol);
    if (estado != null) query = query.Where(u => u.Estado == estado);
    if (busqueda != null) query = query.Where(u => u.Nombre.Contains(busqueda) || u.Dni.Contains(busqueda));
    if (sedeId != null) query = query.Where(u => u.SedeId == sedeId);
    // ... 10+ filtros combinables
}
```

Cada combinación nueva de filtros → más parámetros → método crece sin control.

### Solución

Specifications composables:

```
Educa.API/
├── Common/
│   ├── Specifications/
│   │   ├── ISpecification.cs
│   │   ├── BaseSpecification.cs
│   │   └── SpecificationExtensions.cs
├── Specifications/
│   ├── Usuarios/
│   │   ├── UsuarioByRolSpec.cs
│   │   ├── UsuarioByEstadoSpec.cs
│   │   ├── UsuarioByBusquedaSpec.cs
│   │   └── UsuarioBySedeSpec.cs
│   ├── Asistencias/
│   │   ├── AsistenciaByFechaSpec.cs
│   │   └── AsistenciaByEstudianteSpec.cs
│   └── Horarios/
│       ├── HorarioConflictoSalonSpec.cs
│       ├── HorarioConflictoProfesorSpec.cs
│       └── HorarioConflictoEstudianteSpec.cs
```

```csharp
// Common/Specifications/ISpecification.cs
public interface ISpecification<T>
{
    Expression<Func<T, bool>> Criteria { get; }
    List<Expression<Func<T, object>>> Includes { get; }
    Expression<Func<T, object>>? OrderBy { get; }
    bool IsDescending { get; }
}

// Common/Specifications/BaseSpecification.cs
public abstract class BaseSpecification<T> : ISpecification<T>
{
    public Expression<Func<T, bool>> Criteria { get; protected set; } = _ => true;
    public List<Expression<Func<T, object>>> Includes { get; } = new();
    public Expression<Func<T, object>>? OrderBy { get; protected set; }
    public bool IsDescending { get; protected set; }

    protected void AddInclude(Expression<Func<T, object>> include) => Includes.Add(include);
}

// Common/Specifications/SpecificationExtensions.cs
public static class SpecificationExtensions
{
    public static IQueryable<T> Apply<T>(this IQueryable<T> query, ISpecification<T> spec) where T : class
    {
        query = query.Where(spec.Criteria);
        query = spec.Includes.Aggregate(query, (q, include) => q.Include(include));
        if (spec.OrderBy != null)
            query = spec.IsDescending ? query.OrderByDescending(spec.OrderBy) : query.OrderBy(spec.OrderBy);
        return query;
    }

    public static IQueryable<T> Apply<T>(this IQueryable<T> query, params ISpecification<T>[] specs) where T : class
    {
        return specs.Aggregate(query, (q, spec) => q.Apply(spec));
    }
}
```

```csharp
// Uso en repository — limpio y composable
public async Task<List<UsuarioListaDto>> ListarAsync(params ISpecification<Usuario>[] specs)
{
    return await _context.Usuarios
        .AsNoTracking()
        .Apply(specs)
        .Select(u => new UsuarioListaDto { ... })
        .ToListAsync();
}

// Uso en service — construye specs según filtros del request
public async Task<List<UsuarioListaDto>> ListarUsuariosAsync(UsuarioFiltroDto filtro)
{
    var specs = new List<ISpecification<Usuario>>();
    if (filtro.Rol != null) specs.Add(new UsuarioByRolSpec(filtro.Rol));
    if (filtro.Estado != null) specs.Add(new UsuarioByEstadoSpec(filtro.Estado.Value));
    if (filtro.Busqueda != null) specs.Add(new UsuarioByBusquedaSpec(filtro.Busqueda));

    return await _repo.ListarAsync(specs.ToArray());
}
```

### Dónde aplicar (por complejidad de queries)

| Repository | Filtros combinables | Prioridad |
|-----------|---------------------|-----------|
| Usuarios | ~10 filtros | Alta |
| Asistencias | ~8 filtros (fecha, estudiante, sede, estado, periodo) | Alta |
| Horarios | 3 validaciones de conflicto (INV-U03/U04/U05) | Alta |
| Calificaciones | ~6 filtros | Media |
| Cursos | ~4 filtros | Baja |

### Fases

```
R3.1 [ ] Crear ISpecification, BaseSpecification, SpecificationExtensions en Common/
R3.2 [ ] Crear specs de Horarios (conflicto salón, profesor, estudiante) — las 3 validaciones INV-U*
R3.3 [ ] Refactorizar HorarioService para usar specs composables
R3.4 [ ] Crear specs de Usuarios (rol, estado, búsqueda, sede)
R3.5 [ ] Refactorizar UsuariosRepository para usar specs
R3.6 [ ] Crear specs de Asistencias (fecha, estudiante, sede)
R3.7 [ ] Tests unitarios de cada spec aislada
```

---

## Patrón 4 — Decorator para Cross-Cutting (Prioridad Baja)

### Problema

Logging, caching y validación están mezclados en los services:

```csharp
// Actual — logging y timing mezclados con negocio
public async Task<List<CalificacionDto>> GetCalificacionesAsync(int salonId)
{
    _logger.LogInformation("Obteniendo calificaciones para salón {SalonId}", salonId);
    var sw = Stopwatch.StartNew();

    var result = await _repo.GetAsync(salonId);  // Lógica real

    sw.Stop();
    _logger.LogInformation("Calificaciones obtenidas en {Ms}ms", sw.ElapsedMilliseconds);
    return result;
}
```

### Solución

Decorator pattern con DI (Scrutor o manual):

```csharp
// Service real — solo negocio
public class CalificacionService : ICalificacionService
{
    public async Task<List<CalificacionDto>> GetCalificacionesAsync(int salonId)
    {
        return await _repo.GetAsync(salonId);
    }
}

// Decorator de logging
public class LoggingCalificacionService : ICalificacionService
{
    private readonly ICalificacionService _inner;
    private readonly ILogger<LoggingCalificacionService> _logger;

    public async Task<List<CalificacionDto>> GetCalificacionesAsync(int salonId)
    {
        _logger.LogInformation("Obteniendo calificaciones para salón {SalonId}", salonId);
        var sw = Stopwatch.StartNew();
        var result = await _inner.GetCalificacionesAsync(salonId);
        _logger.LogInformation("Calificaciones obtenidas en {Ms}ms, {Count} items",
            sw.ElapsedMilliseconds, result.Count);
        return result;
    }
}

// Decorator de caching
public class CachedCalificacionService : ICalificacionService
{
    private readonly ICalificacionService _inner;
    private readonly IMemoryCache _cache;

    public async Task<List<CalificacionDto>> GetCalificacionesAsync(int salonId)
    {
        var key = $"calificaciones:{salonId}";
        return await _cache.GetOrCreateAsync(key, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return await _inner.GetCalificacionesAsync(salonId);
        }) ?? [];
    }
}
```

```csharp
// Registro en DI — composición de decoradores
builder.Services.AddScoped<CalificacionService>();  // Base
builder.Services.AddScoped<ICalificacionService>(sp =>
    new LoggingCalificacionService(
        new CachedCalificacionService(
            sp.GetRequiredService<CalificacionService>(),
            sp.GetRequiredService<IMemoryCache>()),
        sp.GetRequiredService<ILogger<LoggingCalificacionService>>()));
```

### Cuándo usar Decorator vs Middleware

| Cross-cutting | Decorator | Middleware |
|--------------|-----------|-----------|
| Caching por servicio | ✅ | ❌ |
| Logging con contexto de negocio | ✅ | ❌ |
| Retry por operación | ✅ | ❌ |
| Auth/CSRF/CORS (HTTP-level) | ❌ | ✅ (ya existe) |
| Rate limiting (request-level) | ❌ | ✅ (ya existe) |
| Error handling global | ❌ | ✅ (ya existe) |

### Fases

```
R4.1 [ ] Evaluar si Scrutor vale como dependencia (simplifica registro de decoradores)
R4.2 [ ] Piloto: CachedCalificacionService (servicio con queries pesadas)
R4.3 [ ] Piloto: LoggingCalificacionService
R4.4 [ ] Evaluar si el patrón justifica la complejidad de DI adicional
R4.5 [ ] Si vale, crear patrón genérico reutilizable para otros services
```

### Regla de adopción

> Usar Decorator cuando el cross-cutting es **específico por servicio** (caching con TTL diferente, logging con contexto de negocio). Para cross-cutting uniforme (auth, metrics, headers), el middleware existente es suficiente.

---

## Patrón 5 — Unit of Work Explícito (Prioridad Media-Baja)

### Problema

EF Core ya actúa como Unit of Work implícito, pero transacciones multi-repository son ad-hoc:

```csharp
// Actual — transacción manual en service
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    await _aprobacionRepo.UpdateAsync(aprobacion);
    await _estudianteSalonRepo.CreateAsync(nuevoSalon);
    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

### Solución

Unit of Work como servicio que coordina el commit de múltiples repositories:

```csharp
// Common/IUnitOfWork.cs
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}

// Data/UnitOfWork.cs
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IDbContextTransaction? _transaction;

    public async Task<int> SaveChangesAsync(CancellationToken ct)
        => await _context.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct)
        => _transaction = await _context.Database.BeginTransactionAsync(ct);

    public async Task CommitAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
        if (_transaction != null) await _transaction.CommitAsync(ct);
    }

    public async Task RollbackAsync(CancellationToken ct)
    {
        if (_transaction != null) await _transaction.RollbackAsync(ct);
    }
}
```

### Dónde aplicar

Solo para operaciones que **requieren transacción multi-entity**:

| Operación | Entities involucradas | Usa transacción hoy |
|-----------|----------------------|---------------------|
| Aprobación + creación salón | AprobacionEstudiante + Salon + EstudianteSalon | Sí (manual) |
| Cierre de periodo | PeriodoAcademico + Calificaciones (freeze) | No (debería) |
| Matrícula completa | EstudianteSalon + PagoMatricula | Pendiente |

### Fases

```
R5.1 [ ] Crear IUnitOfWork y UnitOfWork
R5.2 [ ] Registrar como AddScoped en DI
R5.3 [ ] Migrar AprobacionService para usar IUnitOfWork
R5.4 [ ] Evaluar si otros services lo necesitan
```

### Regla de adopción

> Usar Unit of Work explícito solo cuando hay **2+ entities que deben persistir atómicamente**. Para operaciones single-entity, `SaveChangesAsync()` del DbContext es suficiente.

---

## Orden de Ejecución

```
Patrón 1 (Result)         ← Impacto inmediato, bajo riesgo, mejora controllers
  ↓
Patrón 2 (Domain Events)  ← Desacopla side effects, facilita extensión
  ↓
Patrón 3 (Specification)  ← Mejora queries complejas, incremental
  ↓
Patrón 5 (Unit of Work)   ← Solo donde hay transacciones multi-entity
  ↓
Patrón 4 (Decorator)      ← Solo si el caching/logging justifica la complejidad
```

**Regla general**: Adoptar el patrón **cuando toquemos el service** por otra razón (bug, feature, refactor). No refactorizar services estables solo para aplicar un patrón.

---

## Relación con Reglas Existentes

| Regla | Cómo se integra |
|-------|-----------------|
| `backend.md` — "Controller delega, Service decide" | Result Pattern refuerza: controller solo mapea Result → HTTP |
| `backend.md` — "300 líneas máximo" | Domain Events reduce tamaño de services al extraer handlers |
| `business-rules.md` — Invariantes INV-* | Result codes usan INV-* como código de error |
| `business-rules.md` — INV-S07 (notificación no falla operación) | Domain Events con try/catch en dispatcher lo garantiza |
| `business-rules.md` — State machines 14.x | Result Pattern para validar transiciones inválidas |

---

## Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| try/catch en controllers para BusinessRuleException | ~20+ | 0 (Result.ToActionResult()) |
| Side effects acoplados en services | 3-5 por service | 0 (dispatch a handlers) |
| Parámetros en métodos de repository | 5-10 | 0-1 (specs composables) |
| Líneas de transacción boilerplate | ~10 por operación | 3 (via IUnitOfWork) |
| Archivos a tocar al agregar side effect | 1 service (creciente) | 1 handler nuevo (independiente) |
