# Backend

El backend está en **Educa.API** (ASP.NET Core):
- **Ubicación**: `../Educa.API/Educa.API/`
- **Tecnología**: ASP.NET Core 9 con Entity Framework Core 9
- **Base de datos**: SQL Server (Azure)
- **Rama git**: `master` → `origin/master`

## Estructura

```
Educa.API/
├── Controllers/     # Endpoints REST — solo routing y validación
├── Services/        # Lógica de negocio e interfaces
├── Repositories/    # Acceso a datos e interfaces
├── Models/          # Entidades de BD
├── DTOs/            # Data Transfer Objects (request/response)
├── Data/            # DbContext y configuración de EF
├── Helpers/         # Utilidades, calculadores, extensiones
├── Hubs/            # SignalR hubs (chat, notificaciones real-time)
└── Properties/      # Configuración de launch settings
```

## API REST

- Development: `https://localhost:7102` | Production: `https://educacom.azurewebsites.net`
- Patrón: `GET /api/recursos`, `GET /api/recursos/:id`, `POST`, `PUT`, `DELETE`

---

## Principio de Arquitectura

> **"Controller delega, Service decide, Repository accede."**

| Capa | Responsabilidad | NO debe hacer |
|------|----------------|---------------|
| **Controller** | Routing, validación, autorización, response | Lógica de negocio, queries a DB |
| **Service** | Lógica de negocio, orquestación, validaciones | Acceso directo a DbContext |
| **Repository** | Queries a BD, CRUD de entidades | Lógica de negocio |
| **Helper** | Lógica pura, cálculos, utilidades | Estado, IO, dependencias de BD |
| **DTO** | Transferencia de datos, validación de input | Lógica, métodos complejos |

---

## Controller — Reglas

> **"El controller es un cartero, no un ingeniero"**: recibir request, validar auth, delegar al service, retornar response.

```csharp
// ✅ CORRECTO — Controller delgado
[HttpGet("listar")]
public async Task<IActionResult> ListarConversaciones()
{
    var dni = ObtenerDni();
    if (string.IsNullOrEmpty(dni))
        return Unauthorized(new { mensaje = "Usuario no identificado" });
    var resultado = await _conversacionesService.ListarPorUsuarioAsync(dni);
    return Ok(resultado);
}

// ❌ INCORRECTO — Controller con lógica de negocio, mapping, queries directas
```

| Si el controller tiene... | Mover a... |
|--------------------------|------------|
| Mapping entidad → DTO | Service o extension method |
| Cálculos de negocio | Service |
| Queries complejas | Repository |
| Parsing de JSON/datos | Helper o Service |
| Lógica "si X entonces Y" | Service |

Helpers de claims (`ObtenerDni()`, `ObtenerRol()`) SÍ pertenecen al controller.

---

## Service — Reglas

> **"El service es donde vive la inteligencia."**

| Líneas | Estado | Acción |
|--------|--------|--------|
| < 300 | OK | Mantener |
| 300-600 | Aceptable | Revisar split |
| > 600 | Warning | Dividir por responsabilidad |
| > 1000 | Refactor obligatorio | Extraer sub-servicios |

- Siempre definir **interfaz** (`IXxxService`) + implementación
- Registrar en DI: `builder.Services.AddScoped<IService, Service>()`
- Services lanzan excepciones tipadas, NO retornan `IActionResult`

## Repository — Reglas

> **"Solo queries, nunca decisiones."**

- Usar `AsNoTracking()` para queries read-only
- NO incluir lógica de categorización ni decisiones de negocio

## DTOs — Reglas

- **Un archivo por dominio** (no uno por DTO individual)
- Usar **Data Annotations** para validación (`[Required]`, `[StringLength]`)
- Strings no-nullable inicializadas con `= ""`
- Separar DTOs de lista (ligero) vs detalle (completo)

---

## Manejo de Errores

> **"Nunca silenciar, siempre propagar con contexto."**

- **Controllers**: try/catch con status codes (400, 404, 500) + `LogError`
- **Services**: lanzar excepciones tipadas (`NotFoundException`, `ValidationException`)
- **NUNCA** catch vacío — siempre log + propagar o retornar default seguro

---

## Naming Conventions

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Controllers | `{Dominio}Controller` | `ConversacionesController` |
| Services | `{Dominio}Service` | `ConversacionesService` |
| Interfaces | `I{Dominio}Service` | `IConversacionesService` |
| Repositories | `{Dominio}Repository` | `ConversacionesRepository` |
| DTOs Crear | `Crear{Entidad}Dto` | `CrearEstudianteDto` |
| DTOs Lista | `{Entidad}ListaDto` | `EstudianteListaDto` |
| DTOs Detalle | `{Entidad}DetalleDto` | `EstudianteDetalleDto` |
| Entidades | PascalCase singular | `Estudiante`, `Asistencia` |
| Campos BD | `{PREFIJO}_{Campo}` | `EST_Nombres`, `ASI_Fecha` |

---

## Logging

| Nivel | Cuándo usar |
|-------|-------------|
| `LogInformation` | Operaciones exitosas importantes |
| `LogWarning` | Situaciones inesperadas no críticas |
| `LogError` | Errores que requieren atención |
| `LogDebug` | Info detallada para debugging |

**SIEMPRE** structured logging con placeholders, **NUNCA** string interpolation:

```csharp
// ✅ _logger.LogError(ex, "Error para usuario {Dni}", dni);
// ❌ _logger.LogError(ex, $"Error para usuario {dni}");
```

---

## Migraciones y Scripts SQL

> **"NUNCA ejecutar scripts SQL sin mostrarlos al usuario primero."**

Cuando un cambio en el backend requiera crear tablas, columnas, índices o cualquier modificación en la base de datos:

1. **SIEMPRE** mostrar el script SQL completo al usuario antes de cualquier otra acción
2. **NUNCA** asumir que el usuario puede ejecutar scripts automáticamente — la BD de producción es Azure SQL y requiere ejecución manual
3. **Listar explícitamente** todos los objetos de BD nuevos que el cambio requiere (tablas, índices, FKs, constraints)
4. **Advertir** si un deploy de backend va a fallar sin el script SQL previo

Esto aplica a:
- Nuevas entidades/tablas (`[Table("X")]`)
- Nuevos índices o constraints (Fluent API en `ApplicationDbContext`)
- Cambios en columnas existentes (tipo, nullable, longitud)
- Nuevos `DbSet<T>` en el `ApplicationDbContext`

---

## Checklist de Code Review

```
ARQUITECTURA
[ ] ¿Controller solo delega? ¿Service tiene la lógica? ¿Repository solo queries?
[ ] ¿Archivos > 600 líneas necesitan split?

ERRORES
[ ] ¿No hay catch vacíos? ¿LogError/LogWarning con contexto?
[ ] ¿Controllers retornan status codes apropiados (400, 404, 500)?

DATOS
[ ] ¿Queries read-only usan AsNoTracking()? ¿DTOs con Data Annotations?
[ ] ¿Strings no-nullable inicializadas con = ""?

LOGGING
[ ] ¿Structured logging (placeholders, no interpolation)?

SEGURIDAD
[ ] ¿Endpoints sensibles tienen [Authorize]?
[ ] ¿Se valida acceso al recurso? ¿No se exponen datos sensibles en errores?

MIGRACIONES
[ ] ¿Hay tablas/columnas/índices nuevos? → Script SQL mostrado al usuario
[ ] ¿El deploy va a fallar sin migración previa? → Advertir explícitamente
```
