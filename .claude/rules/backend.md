# Backend

El backend está en **Educa.API** (ASP.NET Core):
- **Ubicación**: `../Educa.API/Educa.API/`
- **Tecnología**: ASP.NET Core 8 con Entity Framework Core
- **Base de datos**: SQL Server (Azure)
- **Rama git**: `master` → `origin/master`

## Estructura

```
Educa.API/
├── Controllers/     # Endpoints de la API (REST) — solo routing y validación
├── Services/        # Lógica de negocio e interfaces
├── Repositories/    # Acceso a datos e interfaces
├── Models/          # Entidades de BD
├── DTOs/            # Data Transfer Objects (request/response)
├── Data/            # DbContext y configuración de EF
├── Helpers/         # Utilidades, calculadores, extensiones
├── Hubs/            # SignalR hubs (chat, notificaciones real-time)
└── Properties/      # Configuración de launch settings
```

## Entidades principales

| Entidad | Descripción |
|---------|-------------|
| Estudiante | Alumnos registrados en el sistema |
| Profesor | Docentes con salones asignados |
| Apoderado | Padres/tutores vinculados a estudiantes |
| Director | Administradores con acceso completo |
| AsistenteAdministrativo | Personal administrativo |
| Asistencia | Registros de ingreso/salida |
| Vista | Rutas del sistema para permisos |
| VistaRol | Relación vista-rol para permisos |
| VistaUsuario | Permisos personalizados por usuario |
| Conversacion | Mensajería interna entre usuarios |
| Mensaje | Mensajes dentro de conversaciones |

## API REST

Base URL:
- Development: `https://localhost:7102`
- Production: `https://educacom.azurewebsites.net`

Endpoints siguen patrón REST:
- `GET /api/recursos` - Listar
- `GET /api/recursos/:id` - Obtener uno
- `POST /api/recursos` - Crear
- `PUT /api/recursos/:id` - Actualizar
- `DELETE /api/recursos/:id` - Eliminar

---

## Principios de Arquitectura

> **"Controller delega, Service decide, Repository accede."**

### Responsabilidades por capa

| Capa | Responsabilidad | NO debe hacer |
|------|----------------|---------------|
| **Controller** | Routing, validación de request, autorización, mapeo de response | Lógica de negocio, queries directas a DB, mapping complejo |
| **Service** | Lógica de negocio, orquestación, validaciones de dominio | Acceso directo a DbContext, concerns de HTTP |
| **Repository** | Queries a BD, CRUD de entidades | Lógica de negocio, decisiones de negocio |
| **Helper** | Lógica pura, cálculos, utilidades | Estado, IO, dependencias de BD |
| **DTO** | Transferencia de datos, validación de input | Lógica, métodos complejos |

---

## Controller — Reglas

### Principio: "El controller es un cartero, no un ingeniero"

Un controller solo debe:
1. Recibir el request
2. Validar autorización
3. Delegar al service
4. Retornar el response

### ✅ CORRECTO — Controller delgado

```csharp
[HttpGet("listar")]
public async Task<IActionResult> ListarConversaciones()
{
    var dni = ObtenerDni();
    if (string.IsNullOrEmpty(dni))
        return Unauthorized(new { mensaje = "Usuario no identificado" });

    var resultado = await _conversacionesService.ListarPorUsuarioAsync(dni);
    return Ok(resultado);
}
```

### ❌ INCORRECTO — Controller con lógica

```csharp
[HttpGet("listar")]
public async Task<IActionResult> ListarConversaciones()
{
    var dni = ObtenerDni();
    if (string.IsNullOrEmpty(dni))
        return Unauthorized(new { mensaje = "Usuario no identificado" });

    // ❌ Lógica de negocio en controller
    var conversaciones = await _repo.ObtenerConversacionesPorUsuarioAsync(dni);
    var resultado = conversaciones.Select(c => {
        // ❌ Mapping complejo en controller
        var participantes = ParseParticipantes(c.CON_Participantes);
        var noLeidos = CalcularNoLeidos(participantes, dni);
        return new ConversacionListDto { /* ... */ };
    }).ToList();

    return Ok(resultado);
}
```

### Qué sacar del controller al service

| Si el controller tiene... | Mover a... |
|--------------------------|------------|
| Mapping de entidad → DTO | Service o extension method |
| Cálculos de negocio | Service |
| Queries complejas | Repository |
| Parsing de JSON/datos | Helper o Service |
| Clases internas (private class) | DTOs/ o Models/ |
| Lógica de "si X entonces Y" | Service |

### Helpers de claims: OK en controller

Los métodos para extraer claims del usuario autenticado SÍ pertenecen al controller:

```csharp
// ✅ OK en controller — concern de HTTP/Auth
private string? ObtenerDni() =>
    User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

private string? ObtenerRol() =>
    User.FindFirst(ClaimTypes.Role)?.Value;
```

---

## Service — Reglas

### Principio: "El service es donde vive la inteligencia"

### Tamaño máximo recomendado

| Líneas | Estado | Acción |
|--------|--------|--------|
| < 300 | OK | Mantener |
| 300-600 | Aceptable | Revisar si se puede dividir |
| 600-1000 | Warning | Dividir responsabilidades |
| > 1000 | Refactor obligatorio | Extraer sub-servicios |

### Dividir por responsabilidad, no por tamaño arbitrario

```csharp
// ❌ INCORRECTO — Un servicio hace todo
public class ReporteAsistenciaPdfService
{
    // Obtener datos de BD (200 líneas)
    // Categorizar estudiantes (100 líneas)
    // Generar PDF layout (800 líneas)
    // Helpers de formato (200 líneas)
}

// ✅ CORRECTO — Dividido por responsabilidad
public class ReporteAsistenciaDataService    // Datos + categorización
public class ReporteAsistenciaPdfBuilder     // Layout PDF con QuestPDF
public class PdfFormatHelper                 // Helpers de formato reutilizables
```

### Interfaces para cada service

```csharp
// ✅ CORRECTO — Interface + implementación
public interface IConversacionesService
{
    Task<List<ConversacionListDto>> ListarPorUsuarioAsync(string dni);
    Task<ConversacionDetalleDto?> ObtenerDetalleAsync(int id, string dni);
    Task<int> CrearConversacionAsync(CrearConversacionDto dto, string dni);
}

public class ConversacionesService : IConversacionesService
{
    // Implementación con lógica de negocio
}
```

**Registrar en DI**:

```csharp
builder.Services.AddScoped<IConversacionesService, ConversacionesService>();
```

---

## Repository — Reglas

### Principio: "Solo queries, nunca decisiones"

```csharp
// ✅ CORRECTO — Query pura
public async Task<List<Estudiante>> ObtenerPorSalonAsync(int sedeId, string grado, string seccion)
{
    return await _context.Estudiante
        .Where(e => e.EST_SED_CodID == sedeId
                  && e.EST_Grado == grado
                  && e.EST_Seccion == seccion
                  && e.EST_Estado == true)
        .OrderBy(e => e.EST_Apellidos)
        .ThenBy(e => e.EST_Nombres)
        .ToListAsync();
}

// ❌ INCORRECTO — Decisión de negocio en repository
public async Task<List<Estudiante>> ObtenerEstudiantesParaReporte(int sedeId, string grado, string seccion)
{
    var estudiantes = await _context.Estudiante.Where(/*...*/).ToListAsync();

    // ❌ Lógica de categorización NO pertenece aquí
    return estudiantes.Where(e => e.EstaActivo && e.TieneAsistencia).ToList();
}
```

### AsNoTracking para queries de lectura

```csharp
// ✅ CORRECTO — AsNoTracking para queries read-only
return await _context.Estudiante
    .AsNoTracking()  // ✅ Mejor performance en queries de solo lectura
    .Where(e => e.EST_SED_CodID == sedeId)
    .ToListAsync();
```

---

## DTOs — Reglas

### Un archivo por dominio/módulo

```
DTOs/
├── AdministracionDto.cs         # Estudiante, Profesor, Director, Apoderado
├── AsistenciaDto.cs             # Asistencia, reportes
├── AuthDto.cs                   # Login, permisos, tokens
├── ConversacionesDto.cs         # Mensajería
├── HorariosDto.cs               # Horarios, bloques
└── CursosDto.cs                 # Cursos, grados
```

**Agrupar por dominio**, no un archivo por DTO individual (evita explosión de archivos).

### Validación con Data Annotations

```csharp
public class CrearEstudianteDto
{
    [Required]
    [StringLength(8)]
    public string DNI { get; set; } = "";  // ✅ Inicializar para evitar nullable warnings

    [Required]
    [StringLength(100)]
    public string Nombres { get; set; } = "";

    [StringLength(100)]
    [EmailAddress]
    public string? Correo { get; set; }  // ✅ Nullable si es opcional
}
```

### DTO de lista vs DTO de detalle

```csharp
// DTO para listados (ligero, solo campos de tabla)
public class EstudianteListaDto
{
    public int Id { get; set; }
    public string DNI { get; set; } = "";
    public string NombreCompleto { get; set; } = "";
    public bool Estado { get; set; }
}

// DTO para detalle (completo, incluye relaciones)
public class EstudianteDetalleDto : EstudianteListaDto
{
    public DateTime? FechaNacimiento { get; set; }
    public string? Grado { get; set; }
    public string? Seccion { get; set; }
    public List<ApoderadoListaDto> Apoderados { get; set; } = [];
}
```

---

## Manejo de Errores

### Principio: "Nunca silenciar, siempre propagar con contexto"

### ❌ INCORRECTO — Catch vacío

```csharp
try
{
    var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
    // ...
}
catch
{
    // ❌ Se traga el error silenciosamente
}
```

### ✅ CORRECTO — Log + propagar o retornar default con warning

```csharp
try
{
    var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
    // ...
}
catch (JsonException ex)
{
    _logger.LogWarning(ex, "JSON inválido en participantes: {Json}", json);
    return new Dictionary<string, ParticipanteInfo>(); // Default seguro
}
```

### Patrón en controllers

```csharp
[HttpPost]
public async Task<IActionResult> Crear([FromBody] CrearDto dto)
{
    try
    {
        var resultado = await _service.CrearAsync(dto);
        return Ok(new { mensaje = "Creado exitosamente", data = resultado });
    }
    catch (ValidationException ex)
    {
        // Error de validación de negocio → 400
        return BadRequest(new { error = ex.Message });
    }
    catch (NotFoundException ex)
    {
        // Recurso no encontrado → 404
        return NotFound(new { error = ex.Message });
    }
    catch (Exception ex)
    {
        // Error inesperado → 500 con log
        _logger.LogError(ex, "Error al crear recurso");
        return StatusCode(500, new { error = "Error interno del servidor" });
    }
}
```

### Patrón en services

```csharp
// Services lanzan excepciones tipadas, NO retornan IActionResult
public async Task<ConversacionDetalleDto> ObtenerDetalleAsync(int id, string dni)
{
    var conversacion = await _repo.ObtenerPorIdAsync(id);

    if (conversacion == null)
        throw new NotFoundException($"Conversación {id} no encontrada");

    if (!EsParticipante(conversacion, dni))
        throw new ForbiddenException("No es participante de esta conversación");

    return MapToDetalleDto(conversacion, dni);
}
```

---

## Organización con #region

### Usar `#region` para secciones grandes, no para esconder código

```csharp
public class MiService : IMiService
{
    #region Dependencias y Constructor

    private readonly ApplicationDbContext _context;
    private readonly ILogger<MiService> _logger;

    public MiService(ApplicationDbContext context, ILogger<MiService> logger)
    {
        _context = context;
        _logger = logger;
    }

    #endregion

    #region Consultas

    public async Task<List<ItemDto>> ListarAsync() { /* ... */ }
    public async Task<ItemDto?> ObtenerPorIdAsync(int id) { /* ... */ }

    #endregion

    #region Comandos

    public async Task<int> CrearAsync(CrearDto dto) { /* ... */ }
    public async Task ActualizarAsync(int id, ActualizarDto dto) { /* ... */ }
    public async Task EliminarAsync(int id) { /* ... */ }

    #endregion

    #region Helpers privados

    private ItemDto MapToDto(Item entity) { /* ... */ }

    #endregion
}
```

### Regiones estándar

| Region | Contenido |
|--------|-----------|
| `Dependencias y Constructor` | Campos readonly + constructor |
| `Consultas` | Métodos de lectura (GET) |
| `Comandos` | Métodos de escritura (POST/PUT/DELETE) |
| `Helpers privados` | Métodos de soporte internos |

---

## Naming Conventions

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Controllers | `{Dominio}Controller` | `ConversacionesController` |
| Services | `{Dominio}Service` | `ConversacionesService` |
| Interfaces | `I{Dominio}Service` | `IConversacionesService` |
| Repositories | `{Dominio}Repository` | `ConversacionesRepository` |
| DTOs Crear | `Crear{Entidad}Dto` | `CrearEstudianteDto` |
| DTOs Actualizar | `Actualizar{Entidad}Dto` | `ActualizarEstudianteDto` |
| DTOs Lista | `{Entidad}ListaDto` | `EstudianteListaDto` |
| DTOs Detalle | `{Entidad}DetalleDto` | `EstudianteDetalleDto` |
| Entidades | PascalCase singular | `Estudiante`, `Asistencia` |
| Campos BD | `{PREFIJO}_{Campo}` | `EST_Nombres`, `ASI_Fecha` |

---

## Logging

### Niveles de log

| Nivel | Cuándo usar | Ejemplo |
|-------|-------------|---------|
| `LogInformation` | Operaciones exitosas importantes | "Asistencia sincronizada: {Count} registros" |
| `LogWarning` | Situaciones inesperadas no críticas | "JSON inválido en participantes" |
| `LogError` | Errores que requieren atención | "Error al crear conversación" |
| `LogDebug` | Info detallada para debugging | "Query ejecutada en {Ms}ms" |

### Structured logging

```csharp
// ✅ CORRECTO — Structured logging con placeholders
_logger.LogError(ex, "Error al crear conversación para usuario {Dni}", dni);
_logger.LogInformation("Asistencia sincronizada: {Count} registros para sede {SedeId}", count, sedeId);

// ❌ INCORRECTO — String interpolation
_logger.LogError(ex, $"Error al crear conversación para usuario {dni}");
```

---

## Checklist de Code Review Backend

```
ARQUITECTURA
[ ] ¿Controller solo delega al service? (no lógica de negocio)
[ ] ¿Service contiene la lógica de negocio?
[ ] ¿Repository solo hace queries?
[ ] ¿Archivos > 600 líneas tienen justificación o necesitan split?

ERRORES
[ ] ¿No hay catch vacíos?
[ ] ¿Errores tienen LogError/LogWarning con contexto?
[ ] ¿Controllers retornan status codes apropiados (400, 404, 500)?

DATOS
[ ] ¿Queries read-only usan AsNoTracking()?
[ ] ¿DTOs tienen Data Annotations de validación?
[ ] ¿Strings no-nullable están inicializadas con = ""?

LOGGING
[ ] ¿Usa structured logging (placeholders, no interpolation)?
[ ] ¿Nivel de log apropiado (Error vs Warning vs Info)?

SEGURIDAD
[ ] ¿Endpoints sensibles tienen [Authorize]?
[ ] ¿Se valida que el usuario tiene acceso al recurso?
[ ] ¿No se exponen datos sensibles en responses de error?
```
