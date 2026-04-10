# Plan: Trazabilidad de Errores en Producción

> **Última actualización**: 2026-04-10
> **Estado**: ✅ Fases 1-4 implementadas y validadas
> **Principio**: "El usuario no debe notar nada. El desarrollador debe ver todo."

---

## Qué se logró

Un sistema de trazabilidad **invisible para el usuario** que persiste errores de producción en SQL Server con:
- Contexto del flujo del usuario (breadcrumbs: navegación, API calls, acciones WAL, login/logout, dialogs)
- Clasificación inteligente de origen (FRONTEND / BACKEND / NETWORK)
- Cadena de llamadas legible extraída del stack trace (filtra minificados de chunks)
- Source location C# exacta para errores de backend (clase.método en archivo:línea)
- Vista admin con drawer de detalle y timeline de breadcrumbs
- Retención controlada (7 días, purga automática Hangfire 3am)

---

## Arquitectura Implementada

```
FRONTEND                                    BACKEND                              BD
──────────                                  ───────                              ──
                                                                    ┌──────────────────┐
ActivityTracker ── ring buffer 30 ──────┐                           │   ErrorLog        │
  - Router (NAVIGATION)                 │                           │   + SourceLocation│
  - HTTP interceptor (API_CALL/ERROR)   │                           │   + Origen smart  │
  - WAL (WAL_OPERATION)                 ▼                           │                   │
  - Auth (STATE_CHANGE)        ErrorReporter ──→ POST /api/errors ──→│   (FRONTEND/      │
  - BaseCrudFacade (USER_ACTION)  (classify    [AllowAnonymous]     │    BACKEND/       │
                                   origin +                         │    NETWORK)       │
GlobalErrorHandler ─────────────→  parse stack                      │                   │
  (JS errors)                      + breadcrumbs)                   ├──────────────────┤
                                         ▲                          │   ErrorLogDetalle │
errorInterceptor ────────────────────────┘                          │   (breadcrumbs)   │
  (HTTP errors — incluso en                                         └──────────────────┘
   login/refresh si son 500+)            ▲                                   │  ▲
                                         │                                   │  │
GlobalExceptionMiddleware ───────────────┘                                   │  │
  (persiste directo a BD sin POST,       (fire-and-forget)                   │  │
   para TODOS los errores ≥400                                               │  │
   excepto 401/403)                                                          │  │
                                                                  Hangfire 3am (purga >7d)
                                                                             │
                                                              Vista Admin ◄──┘
                                                              GET /api/errors
                                                              GET /api/errors/{id}
                                                              (solo Director)
```

---

## Modelo de Datos

### Tabla: `ErrorLog`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ERL_CodID` | `BIGINT IDENTITY` | PK |
| `ERL_CorrelationId` | `NVARCHAR(50)` | X-Correlation-Id del request |
| `ERL_Origen` | `NVARCHAR(20)` | `FRONTEND`, `BACKEND`, `NETWORK` |
| `ERL_Severidad` | `NVARCHAR(20)` | `CRITICAL`, `ERROR`, `WARNING` |
| `ERL_Mensaje` | `NVARCHAR(500)` | Mensaje del error |
| `ERL_StackTrace` | `NVARCHAR(MAX)` | Stack trace completo (JS o C#) |
| `ERL_Url` | `NVARCHAR(500)` | URL/ruta donde ocurrió |
| `ERL_HttpMethod` | `NVARCHAR(10)` | GET/POST/PUT/DELETE |
| `ERL_HttpStatus` | `INT` | Status code HTTP |
| `ERL_ErrorCode` | `NVARCHAR(50)` | Código de error de negocio |
| `ERL_UsuarioDni` | `NVARCHAR(50)` | DNI enmascarado: `***1234` |
| `ERL_UsuarioRol` | `NVARCHAR(50)` | Rol del usuario |
| `ERL_Plataforma` | `NVARCHAR(20)` | `WEB`, `ANDROID`, `IOS`, `BACKEND` |
| `ERL_UserAgent` | `NVARCHAR(500)` | User-Agent del navegador/dispositivo |
| `ERL_SourceLocation` | `NVARCHAR(500)` | JSON con cadena de llamadas (front) o clase.método (back) |
| `ERL_Fecha` | `DATETIME2` | Fecha/hora Perú (UTC-5) |
| `ERL_TotalBreadcrumbs` | `INT` | Cantidad de acciones previas |

**Índices**: `IX_ErrorLog_Fecha` (DESC), `IX_ErrorLog_CorrelationId` (filtered), `IX_ErrorLog_Origen_Severidad`

### Tabla: `ErrorLogDetalle` (Breadcrumbs)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ERD_CodID` | `BIGINT IDENTITY` | PK |
| `ERD_ERL_CodID` | `BIGINT` | FK a ErrorLog (CASCADE DELETE) |
| `ERD_Orden` | `INT` | Orden cronológico |
| `ERD_TipoAccion` | `NVARCHAR(30)` | NAVIGATION, API_CALL, API_ERROR, USER_ACTION, STATE_CHANGE, WAL_OPERATION |
| `ERD_Descripcion` | `NVARCHAR(500)` | Descripción legible |
| `ERD_Ruta` | `NVARCHAR(200)` | Ruta Angular al momento |
| `ERD_Timestamp` | `DATETIME2` | Timestamp de la acción |
| `ERD_Metadata` | `NVARCHAR(500)` | JSON con datos extra |

---

## Clasificación de Origen

### Frontend → Backend (ErrorReporterService)

| HTTP Status | Origen | Razón |
|-------------|--------|-------|
| 0, 408, 504 | `NETWORK` | Backend no respondió / timeout |
| 500+ | `BACKEND` | El servidor falló |
| 4xx | `FRONTEND` | El frontend envió algo incorrecto |
| Error JS | `FRONTEND` | Crash en código del cliente |

### Backend (GlobalExceptionMiddleware)

| Excepción | HTTP | Severidad | Se persiste? |
|-----------|------|-----------|-------------|
| No manejada | 500 | `CRITICAL` | ✅ Sí |
| `DbUpdateConcurrencyException` | 409 | `WARNING` | ✅ Sí |
| `ConflictException` | 409 | `WARNING` | ✅ Sí |
| `NotFoundException` / `KeyNotFoundException` | 404 | `WARNING` | ✅ Sí |
| `BusinessRuleException` | 400 | `ERROR` | ✅ Sí |
| `InvalidOperationException` | 400 | `ERROR` | ✅ Sí |
| `UnauthorizedException` | 401 | — | ❌ No (flujo normal) |
| `UnauthorizedAccessException` | 403 | — | ❌ No (flujo normal) |

---

## Fuentes de Breadcrumbs (ActivityTrackerService)

| Fuente | Tipo | Qué captura | Integración |
|--------|------|-------------|-------------|
| Router events | `NAVIGATION` | Cambios de ruta | `NavigationEnd` en constructor |
| HTTP interceptor | `API_CALL` / `API_ERROR` | Requests HTTP (sin body/tokens) | `requestTraceInterceptor` |
| WalFacadeHelper | `WAL_OPERATION` | `WAL: CREATE Curso`, `WAL: DELETE Horario #15` | `execute()` |
| AuthService | `STATE_CHANGE` | `Login exitoso: Director`, `Logout` | `handleSuccessfulLogin()`, `logout()` |
| BaseCrudFacade | `USER_ACTION` | `Abrir dialog: Crear Curso`, `Confirmar eliminación: Horario` | `openNewDialog()`, `openConfirmDialog()` |

### Reglas de captura por tipo de error

| Tipo de error | Breadcrumbs max |
|---------------|----------------|
| Error JS no manejado / HTTP 500 | 30 |
| Error de negocio (422, 400) | 15 |
| Error de autenticación (401, 403) | 10 |
| Error de concurrencia (409) | 10 |
| Error de red/timeout (0, 408, 504) | 5 |

---

## Source Location — Cadena de llamadas

### Frontend (stack trace JS minificado)

El `ErrorReporterService` extrae funciones legibles del stack trace:
- Filtra funciones minificadas (1-2 chars: `Hi`, `Pf`, `r`)
- Filtra genéricas (`emit`, `next`, `subscribe`, `run`, `invoke`, etc.)
- Quita prefijos de variable minificada (`n.alignOverlay` → `alignOverlay`)
- Resultado: `alignOverlay ← onOverlayBeforeEnter ← handleBeforeEnter`

### Backend (stack trace C#)

El `ErrorLogService.ExtractCSharpSourceLocation` extrae:
- Primer frame de `Educa.API.*` (no middleware/framework)
- Formato: `AuthService.Login en AuthController.cs:49`

---

## Archivos Implementados

### Backend (Educa.API)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `Models/Sistema/ErrorLog.cs` | Nuevo | Modelo EF — tabla padre |
| `Models/Sistema/ErrorLogDetalle.cs` | Nuevo | Modelo EF — breadcrumbs (cascade) |
| `DTOs/Sistema/ErrorFrontendDto.cs` | Nuevo | DTO de entrada con origen + sourceLocation |
| `DTOs/Sistema/BreadcrumbDto.cs` | Nuevo | DTO de breadcrumb individual |
| `DTOs/Sistema/ErrorLogListaDto.cs` | Nuevo | DTO para consulta de lista |
| `DTOs/Sistema/ErrorLogDetalleDto.cs` | Nuevo | DTO para consulta de detalles |
| `DTOs/Sistema/ErrorLogCompletoDto.cs` | Nuevo | DTO completo con stack + breadcrumbs + sourceLocation |
| `Interfaces/Services/Sistema/IErrorLogService.cs` | Nuevo | Interfaz del servicio |
| `Services/Sistema/ErrorLogService.cs` | Nuevo | Registro, consulta, purga + ExtractCSharpSourceLocation |
| `Services/Sistema/ErrorLogPurgeJob.cs` | Nuevo | Hangfire job — purga diaria 3am |
| `Controllers/Sistema/ErrorLogController.cs` | Nuevo | POST [AllowAnonymous] + GET [Director] |
| `Middleware/GlobalExceptionMiddleware.cs` | Mod | Persiste errores ≥400 (excepto 401/403) fire-and-forget |
| `Data/ApplicationDbContext.cs` | Mod | DbSets + Fluent API (índices, cascade) |
| `Extensions/ServiceExtensions.cs` | Mod | Registro DI de IErrorLogService |
| `Extensions/HangfireExtensions.cs` | Mod | Job de purga registrado |
| `Constants/Sistema/HangfireJobs.cs` | Mod | Constante PurgarErrorLogs |

### Frontend (educa-web)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `core/services/error/activity-tracker.models.ts` | Nuevo | Tipos Breadcrumb y BreadcrumbTipo |
| `core/services/error/activity-tracker.service.ts` | Nuevo | Ring buffer 30 + integración Router |
| `core/services/error/error-reporter.service.ts` | Nuevo | Clasificación origen + parse stack + envío |
| `core/services/error/error-handler.service.ts` | Mod | Usa ErrorReporter en vez de POST directo |
| `core/services/error/index.ts` | Mod | Barrel exports |
| `core/interceptors/trace/request-trace.interceptor.ts` | Mod | Alimenta ActivityTracker con API breadcrumbs |
| `core/interceptors/error/error.interceptor.ts` | Mod | Reporta 500+ silenciosamente en URLs skip |
| `core/services/wal/wal-facade-helper.service.ts` | Mod | Track WAL_OPERATION |
| `core/services/auth/auth.service.ts` | Mod | Track STATE_CHANGE en login/logout |
| `core/services/facades/base-crud.facade.ts` | Mod | Track USER_ACTION en openNewDialog/openConfirmDialog |
| `features/.../admin/error-logs/` | Nuevo | Vista admin completa (10 archivos) |
| `shared/constants/permission-registry.ts` | Mod | ADMIN_ERROR_LOGS permiso |
| `features/.../intranet.routes.ts` | Mod | Ruta admin/trazabilidad-errores |
| `features/.../intranet-menu.config.ts` | Mod | Item en módulo Sistema |

---

## Vista Admin — Trazabilidad de Errores

- **Ruta**: `/intranet/admin/trazabilidad-errores`
- **Permiso**: `ADMIN_ERROR_LOGS` (solo Director)
- **Módulo menú**: Sistema

### Funcionalidades

- **Stats cards**: Total, Critical, Error, Warning
- **Filtros**: Origen (Frontend/Backend/Red), Severidad
- **Tabla**: Fecha, origen (tag color), severidad, mensaje, HTTP status, usuario
- **Drawer de detalle** (al hacer click):
  - Banner de origen con color por severidad + tags HTTP
  - Card "Cadena de llamadas" con funciones legibles del stack
  - Mensaje completo
  - Stack trace (JS o C#) con scroll
  - Contexto técnico (URL, error code, correlation ID, user agent)
  - Timeline de breadcrumbs con iconos por tipo y colores diferenciados
  - Marcador "Error ocurrió aquí" al final de la timeline

---

## Endpoints API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/sistema/errors` | `[AllowAnonymous]` | Reporte de error desde frontend (rate limit: heavy) |
| `GET` | `/api/sistema/errors` | `[Director]` | Lista paginada con filtros (origen, severidad) |
| `GET` | `/api/sistema/errors/{id}` | `[Director]` | Error completo + stack + breadcrumbs |
| `GET` | `/api/sistema/errors/{id}/detalles` | `[Director]` | Solo breadcrumbs de un error |

---

## Doble registro — Frontend + Backend

Un error del backend produce **dos registros**:

1. **Registro BACKEND** (middleware → directo a BD): Tiene stack trace C# completo con source location exacta. Sin breadcrumbs (el backend no tiene el flujo del usuario).
2. **Registro FRONTEND/BACKEND/NETWORK** (interceptor → POST): Tiene breadcrumbs del usuario (las últimas N acciones). Sin stack trace C#. El origen se clasifica por HTTP status.

Ambos comparten el `X-Correlation-Id` para cruzarlos.

---

## Seguridad y Privacidad

| Regla | Detalle |
|-------|---------|
| DNI enmascarado | `MaskDni()` → `***1234` — nunca completo |
| Sin tokens | NUNCA en breadcrumbs ni payloads |
| Sin body de requests | Breadcrumbs solo guardan URL y status |
| Strings truncados | Mensaje 500, stack 4000, breadcrumb desc 500 |
| Rate limit | heavy (5/min) en POST |
| Purga automática | 7 días — Hangfire job diario 3am |
| Anónimo permitido | POST acepta errores pre-login |

---

## Invariantes

| ID | Invariante | Estado |
|----|-----------|--------|
| `INV-ET01` | El usuario NUNCA ve diferencia — tracking invisible | ✅ Validado |
| `INV-ET02` | Error en registro NUNCA falla la operación principal (fire-and-forget) | ✅ Validado |
| `INV-ET03` | DNI SIEMPRE enmascarado en ErrorLog | ✅ Implementado |
| `INV-ET04` | Breadcrumbs NUNCA contienen datos sensibles | ✅ Implementado |
| `INV-ET05` | Registros > 7 días se purgan automáticamente | ✅ Hangfire job |
| `INV-ET06` | X-Correlation-Id se preserva para cruce | ✅ Validado |
| `INV-ET07` | Si POST falla, se pierde silenciosamente | ✅ Implementado |

---

## SQL Script

```sql
-- Ejecutar ANTES del deploy del backend

CREATE TABLE ErrorLog (
    ERL_CodID           BIGINT IDENTITY(1,1) PRIMARY KEY,
    ERL_CorrelationId   NVARCHAR(50)    NULL,
    ERL_Origen          NVARCHAR(20)    NOT NULL,
    ERL_Severidad       NVARCHAR(20)    NOT NULL,
    ERL_Mensaje         NVARCHAR(500)   NOT NULL,
    ERL_StackTrace      NVARCHAR(MAX)   NULL,
    ERL_Url             NVARCHAR(500)   NOT NULL,
    ERL_HttpMethod      NVARCHAR(10)    NULL,
    ERL_HttpStatus      INT             NULL,
    ERL_ErrorCode       NVARCHAR(50)    NULL,
    ERL_UsuarioDni      NVARCHAR(50)    NULL,
    ERL_UsuarioRol      NVARCHAR(50)    NULL,
    ERL_Plataforma      NVARCHAR(20)    NOT NULL DEFAULT 'WEB',
    ERL_UserAgent       NVARCHAR(500)   NULL,
    ERL_SourceLocation  NVARCHAR(500)   NULL,
    ERL_Fecha           DATETIME2       NOT NULL,
    ERL_TotalBreadcrumbs INT            NOT NULL DEFAULT 0
);

CREATE INDEX IX_ErrorLog_Fecha
    ON ErrorLog (ERL_Fecha DESC);

CREATE INDEX IX_ErrorLog_CorrelationId
    ON ErrorLog (ERL_CorrelationId)
    WHERE ERL_CorrelationId IS NOT NULL;

CREATE INDEX IX_ErrorLog_Origen_Severidad
    ON ErrorLog (ERL_Origen, ERL_Severidad);

CREATE TABLE ErrorLogDetalle (
    ERD_CodID           BIGINT IDENTITY(1,1) PRIMARY KEY,
    ERD_ERL_CodID       BIGINT          NOT NULL,
    ERD_Orden           INT             NOT NULL,
    ERD_TipoAccion      NVARCHAR(30)    NOT NULL,
    ERD_Descripcion     NVARCHAR(500)   NOT NULL,
    ERD_Ruta            NVARCHAR(200)   NOT NULL,
    ERD_Timestamp       DATETIME2       NOT NULL,
    ERD_Metadata        NVARCHAR(500)   NULL,

    CONSTRAINT FK_ErrorLogDetalle_ErrorLog
        FOREIGN KEY (ERD_ERL_CodID)
        REFERENCES ErrorLog (ERL_CodID)
        ON DELETE CASCADE
);

CREATE INDEX IX_ErrorLogDetalle_ErrorLogId
    ON ErrorLogDetalle (ERD_ERL_CodID);
```

Si la tabla ya existe y falta `ERL_SourceLocation`:
```sql
ALTER TABLE ErrorLog ADD ERL_SourceLocation NVARCHAR(500) NULL;
```

---

## Pendiente (mejoras futuras)

- [ ] Paginación real en la vista admin (actualmente carga una página de 20)
- [ ] Filtro por rango de fechas
- [ ] Agrupar errores duplicados (mismo mensaje + mismo archivo = 1 fila con contador)
- [ ] Alertas automáticas si CRITICAL > N en última hora
- [ ] Exportar a Excel
