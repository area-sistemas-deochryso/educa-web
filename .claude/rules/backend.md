# Backend

El backend está en **Educa.API** (ASP.NET Core):
- **Ubicación**: `../Educa.API/Educa.API/`
- **Tecnología**: ASP.NET Core 9 con Entity Framework Core 9
- **Base de datos**: SQL Server (Azure)
- **Rama git**: `master` → `origin/master`

## Estructura

```
Educa.API/
├── Controllers/     # Endpoints REST — solo routing y validación (8 subdominios, 35 controllers)
│   ├── Academico/   # Aprobación, AsistenciaCurso, Calificación, Cursos, Horario, Salones, etc.
│   ├── Administracion/  # Admin, Usuarios
│   ├── Asistencias/ # Asistencia diaria, ConsultaAsistencia
│   ├── Auth/        # Auth, PasswordRecovery
│   ├── Campus/      # Campus 3D
│   ├── Comunicacion/# Conversaciones (chat)
│   ├── Integraciones/# BlobStorage, Configuracion
│   ├── Permisos/    # MisPermisos, PermisosRol, PermisosUsuario
│   ├── Sistema/     # EventosCalendario, Notificaciones, ServerTime, Warmup
│   └── Videoconferencias/ # JaaS tokens
├── Services/        # Lógica de negocio (12 subdominios, 80+ archivos)
├── Repositories/    # Acceso a datos (9 subdominios, 31 archivos)
├── Interfaces/      # Contratos: IServices (55) + IRepositories (30)
├── Models/          # Entidades de BD (8 subdominios, 47 archivos)
├── DTOs/            # Data Transfer Objects (13 namespaces, 50+ archivos)
├── Data/            # ApplicationDbContext, configuración EF, value converters
├── Constants/       # Auth (Roles, ClaimNames, CookieConfig), Academico, Asistencias, Sistema
├── Helpers/         # UserClaimsExtensions, DniHelper, CalificacionHelper, DiagnosticLogger
├── Middleware/      # GlobalException, CorrelationId, CSRF, Idempotency, RequestMetrics, SecurityHeaders
├── Exceptions/      # NotFoundException, BusinessRuleException, UnauthorizedException, ConflictException
├── Hubs/            # ChatHub, AsistenciaHub (SignalR real-time)
└── Properties/      # Configuración de launch settings
```

## API REST

- Development: `https://localhost:7102` | Production: `https://educacom.azurewebsites.net`
- Patrón: `GET /api/recursos`, `GET /api/recursos/:id`, `POST`, `PUT`, `DELETE`

---

## Organización de Archivos

> **"Un archivo = una clase. Sin excepciones."**

- Cada clase, record o struct va en su propio archivo `.cs` con el mismo nombre que la clase
- Si un dominio necesita múltiples clases relacionadas (ej: DTOs de CRUD), cada una va en su propio archivo dentro de la misma carpeta
- **NUNCA** agrupar múltiples clases en un solo archivo, aunque sean del mismo dominio

```
// ✅ CORRECTO
DTOs/Usuarios/UsuarioListaDto.cs      → class UsuarioListaDto
DTOs/Usuarios/CrearUsuarioDto.cs      → class CrearUsuarioDto
DTOs/Usuarios/ActualizarUsuarioDto.cs → class ActualizarUsuarioDto

// ❌ INCORRECTO
DTOs/Usuarios/UsuariosDto.cs → class UsuarioListaDto + class CrearUsuarioDto + class ActualizarUsuarioDto
```

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
| **Middleware** | Cross-cutting concerns (errores, CSRF, tracing) | Lógica de negocio |
| **Constants** | Valores fijos del dominio (roles, estados, config keys) | Lógica, estado |
| **Exceptions** | Excepciones tipadas del negocio | Lógica de flujo normal |

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

Helpers de claims (`User.GetDni()`, `User.GetRol()`, `User.GetEntityId()`, `User.GetNombre()`, `User.GetSedeId()`) son extension methods en `Helpers/Auth/UserClaimsExtensions.cs`. Se llaman directamente sobre `User` (ClaimsPrincipal).

---

## Service — Reglas

> **"El service es donde vive la inteligencia."**

| Líneas | Estado | Acción |
|--------|--------|--------|
| ≤ 300 | OK | Mantener |
| > 300 | **Refactor obligatorio** | Dividir por responsabilidad — sin zona gris |

> **Regla dura: 300 líneas máximo por archivo .cs** (service, repository, controller, helper, mapper).
> Aplica a todo el backend. Si un archivo supera 300 líneas, se divide antes de mergear.
> Excepciones: `ApplicationDbContext` (DbSets crecen linealmente con entidades, no se puede dividir).

- Siempre definir **interfaz** (`IXxxService`) + implementación
- Registrar en DI: `builder.Services.AddScoped<IService, Service>()`
- Services lanzan excepciones tipadas, NO retornan `IActionResult`

## Repository — Reglas

> **"Solo queries, nunca decisiones."**

- Usar `AsNoTracking()` para queries read-only
- NO incluir lógica de categorización ni decisiones de negocio
- **NUNCA** incluir lógica de negocio (cálculos, aggregaciones, condicionales de negocio) — solo queries y CRUD
- **NUNCA** incluir lógica de negocio (cálculos, aggregaciones, condicionales de negocio) — solo queries y CRUD

## DTOs — Reglas

- **Un archivo por dominio** (no uno por DTO individual)
- Usar **Data Annotations** para validación (`[Required]`, `[StringLength]`)
- Strings no-nullable inicializadas con `= ""`
- Separar DTOs de lista (ligero) vs detalle (completo)

---

## Respuesta API Estándar

Todos los endpoints retornan `ApiResponse<T>` para uniformidad:

```csharp
// ✅ CORRECTO — usar ApiResponse<T>
return Ok(ApiResponse<List<UsuarioDto>>.Success(usuarios, "Usuarios obtenidos"));

// ❌ INCORRECTO — retornar entidad directa
return Ok(usuarios);
```

---

## Middleware Pipeline

| Middleware | Orden | Responsabilidad |
|-----------|-------|----------------|
| `SecurityHeadersMiddleware` | 1 | HSTS, X-Frame-Options, CSP headers |
| `CorrelationIdMiddleware` | 2 | Agrega X-Correlation-Id para tracing |
| `RequestMetricsMiddleware` | 3 | Telemetría de performance |
| `CsrfValidationMiddleware` | 4 | Validación CSRF en mutaciones |
| `IdempotencyMiddleware` | 5 | Rechaza duplicados (409 Conflict) vía `X-Idempotency-Key` |
| `GlobalExceptionMiddleware` | 6 | Captura excepciones → respuesta tipada |

---

## Excepciones Tipadas

| Excepción | HTTP Status | Uso |
|-----------|-------------|-----|
| `NotFoundException` | 404 | Entidad no encontrada |
| `BusinessRuleException` | 422 | Violación de regla de negocio |
| `UnauthorizedException` | 401 | Sin autenticación válida |
| `ConflictException` | 409 | Concurrencia, duplicados |

`GlobalExceptionMiddleware` captura estas excepciones y retorna `ApiResponse` con el status code correcto. Los services lanzan excepciones, los controllers NO necesitan try/catch para estos casos.

---

## Rate Limiting

Configurado en `Program.cs` con políticas por tipo de operación:

| Política | Límite | Partición | Uso |
|----------|--------|-----------|-----|
| `global` (reads) | 200/min | userId (auth) o IP (anon) | GET endpoints |
| `global` (writes) | 30/min | userId o IP | POST/PUT/DELETE |
| `login` | 10/min | IP | `POST /api/auth/login` |
| `refresh` | 20/min | IP | Token refresh |
| `biometric` | 30/min | IP (dispositivo) | Webhook CrossChex |
| `heavy` | 5/min | userId | Reportes, imports, batch |

Decorador: `[EnableRateLimiting("heavy")]` en el controller action.

---

## Manejo de Errores

> **"Nunca silenciar, siempre propagar con contexto."**

- **Controllers**: Delegación a `GlobalExceptionMiddleware` para excepciones tipadas. Try/catch solo para casos especiales
- **Services**: lanzar excepciones tipadas (`NotFoundException`, `BusinessRuleException`, `ConflictException`)
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

## Autenticación (JWT + Cookie)

Token JWT se resuelve por prioridad:
1. **HttpOnly cookie** (`educa_auth`) — preferido en producción
2. **Authorization header** (`Bearer {token}`) — fallback
3. **Query string** (`?access_token=`) — solo para SignalR WebSocket/SSE

Cookies de auth definidas en `Constants/Auth/CookieConfig.cs`:
- `educa_auth` — JWT principal
- `educa_refresh` — Refresh token
- `educa_device` — Device ID

---

## Envío de Correos — Outbox Obligatorio

> **"NUNCA llamar `IEmailService` directamente desde un service de negocio."**

Todo envío de correo **debe** pasar por `IEmailOutboxService.EnqueueAsync()`. El `EmailOutboxWorker` se encarga del envío real con retry exponencial, auditoría y trazabilidad.

```csharp
// ✅ CORRECTO — encolar en outbox
await _outboxService.EnqueueAsync(email, "ASISTENCIA", usuario, "Asistencia", asistenciaId);

// ❌ INCORRECTO — envío directo (sin auditoría, sin retry persistente)
await _emailService.SendEmailAsync(email);
```

| Capa | Puede usar |
|------|-----------|
| Services de negocio | `IEmailOutboxService.EnqueueAsync()` (vía `IEmailNotificationService` o directo) |
| `EmailOutboxWorker` | `IEmailService.SendEmailOnceAsync()` (único consumidor permitido) |
| Tests / debug | `IEmailService` directamente (solo en desarrollo) |

**Razón**: El outbox garantiza persistencia, retry automático (5 intentos, backoff exponencial), trazabilidad por entidad de origen, y UI admin de diagnóstico. Un `SendEmailAsync` directo pierde todo esto.

---

## Checklist de Code Review

```
ARQUITECTURA
[ ] ¿Controller solo delega? ¿Service tiene la lógica? ¿Repository solo queries?
[ ] ¿Algún archivo supera 300 líneas? → Dividir por responsabilidad (regla dura, sin excepciones salvo DbContext)
[ ] ¿Excepciones tipadas (NotFoundException, BusinessRuleException) en services?

ERRORES
[ ] ¿No hay catch vacíos? ¿LogError/LogWarning con contexto?
[ ] ¿Services lanzan excepciones tipadas? ¿GlobalExceptionMiddleware los captura?

DATOS
[ ] ¿Queries read-only usan AsNoTracking()? ¿DTOs con Data Annotations?
[ ] ¿Strings no-nullable inicializadas con = ""?
[ ] ¿Endpoints retornan ApiResponse<T>?

LOGGING
[ ] ¿Structured logging (placeholders, no interpolation)?

SEGURIDAD
[ ] ¿Endpoints sensibles tienen [Authorize]?
[ ] ¿Se valida acceso al recurso? ¿No se exponen datos sensibles en errores?
[ ] ¿Rate limiting en endpoints pesados? ([EnableRateLimiting("heavy")])
[ ] ¿Claims se extraen con User.GetDni(), User.GetRol(), etc.?

CORREOS
[ ] ¿Envío de correos usa IEmailOutboxService.EnqueueAsync()? (NUNCA IEmailService directo)
[ ] ¿Se pasa entidadOrigen + entidadId para trazabilidad?

MIGRACIONES
[ ] ¿Hay tablas/columnas/índices nuevos? → Script SQL mostrado al usuario
[ ] ¿El deploy va a fallar sin migración previa? → Advertir explícitamente
```

---

## Model Checklist (Backend)

Antes de crear un nuevo modelo en Educa.API:

| Requisito | Cómo verificar |
|-----------|---------------|
| RowVersion | `[Timestamp] [Column("XXX_RowVersion")] public byte[] XXX_RowVersion` |
| Fechas Perú | `= DateTimeHelper.PeruNow()` (NO `DateTime.Now`) |
| Auditoría completa | 4 campos: UsuarioReg, FechaReg, UsuarioMod, FechaMod |
| Strings inicializadas | `= ""` en campos no-nullable |
| SQL migration | Script preparado ANTES del deploy |
