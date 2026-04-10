# Plan: Trazabilidad de Errores en Producción

> **Última actualización**: 2026-04-09
> **Principio**: "El usuario no debe notar nada. El desarrollador debe ver todo."
> **Prerequisito**: Proyecto limpio (roadmap de enforcement completado o en progreso).

---

## Qué se quiere lograr

Un sistema de trazabilidad **invisible para el usuario** que persiste errores de producción en SQL Server con el contexto suficiente para que el desarrollador pueda reproducir y solucionar el problema rápidamente.

**Lo que ya existe**:
- `GlobalExceptionMiddleware` (backend) — captura excepciones y retorna `ApiResponse` con `traceId`
- `ErrorHandlerService` (frontend) — maneja errores HTTP y JS, muestra toasts seguros al usuario
- `X-Correlation-Id` / `X-Request-Id` — correlación de requests front→back
- `DiagnosticLogger` (backend) — logging por tags configurable
- Fire-and-forget POST a `/api/sistema/client-errors` (frontend) — reporta errores JS al backend

**Lo que falta**:
- Persistencia estructurada en BD (actualmente los errores van a logs que se pierden o son difíciles de consultar)
- Contexto del flujo del usuario previo al error (las últimas N acciones)
- Retención controlada (7 días, luego purga automática)
- Vista de consulta para desarrolladores (NO para usuarios finales)

---

## Arquitectura

```
FRONTEND                                    BACKEND                              BD
──────────                                  ───────                              ──
                                                                    ┌──────────────────┐
ActivityTracker ── últimas 30 acciones ──┐                          │   ErrorLog        │
  (navegación, clicks, API calls)        │                          │   (tabla padre)   │
                                         ▼                          │   - CorrelationId │
GlobalErrorHandler ──→ ErrorReporter ──→ POST /api/sistema/errors ──→│   - Mensaje       │
  (captura error)     (empaqueta +        (endpoint dedicado)       │   - StackTrace    │
                       adjunta breadcrumbs)                         │   - Rol, DNI      │
                                         ▲                          │   - Severidad     │
GlobalExceptionMiddleware ───────────────┘                          │   - Origen        │
  (captura excepciones backend)          (escribe directo)          │   - Fecha         │
                                                                    ├──────────────────┤
                                                                    │   ErrorLogDetalle │
                                                                    │   (tabla hija)    │
                                                                    │   - TipoAccion    │
                                                                    │   - Descripcion   │
                                                                    │   - Timestamp     │
                                                                    │   - Orden         │
                                                                    └──────────────────┘
                                                                             │
                                                            Hangfire Job (diario, 3am)
                                                            DELETE WHERE Fecha < 7 días
```

---

## Modelo de Datos

### Tabla: `ErrorLog`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ERL_CodID` | `BIGINT IDENTITY` | PK |
| `ERL_CorrelationId` | `NVARCHAR(50)` | X-Correlation-Id del request (para cruzar con logs existentes) |
| `ERL_Origen` | `NVARCHAR(20)` | `'FRONTEND'` o `'BACKEND'` |
| `ERL_Severidad` | `NVARCHAR(20)` | `'CRITICAL'`, `'ERROR'`, `'WARNING'` |
| `ERL_Mensaje` | `NVARCHAR(500)` | Mensaje del error (interno, para desarrollador) |
| `ERL_StackTrace` | `NVARCHAR(MAX)` | Stack trace completo (frontend JS o backend C#) |
| `ERL_Url` | `NVARCHAR(500)` | URL/ruta donde ocurrió (frontend: ruta Angular, backend: endpoint) |
| `ERL_HttpMethod` | `NVARCHAR(10)` | GET/POST/PUT/DELETE (null si es error JS del frontend) |
| `ERL_HttpStatus` | `INT` | Status code HTTP (null si es error JS sin HTTP) |
| `ERL_ErrorCode` | `NVARCHAR(50)` | Código de error de negocio (`CONCURRENCY_CONFLICT`, etc.) si aplica |
| `ERL_UsuarioDni` | `NVARCHAR(50)` | DNI del usuario (enmascarado: `***1234`) |
| `ERL_UsuarioRol` | `NVARCHAR(50)` | Rol del usuario (`Director`, `Profesor`, etc.) |
| `ERL_Plataforma` | `NVARCHAR(20)` | `'WEB'`, `'ANDROID'`, `'IOS'` |
| `ERL_UserAgent` | `NVARCHAR(500)` | User-Agent del navegador/dispositivo |
| `ERL_Fecha` | `DATETIME2` | Fecha/hora en hora Perú (UTC-5) |
| `ERL_TotalBreadcrumbs` | `INT` | Cantidad de acciones previas registradas |

**Índices**:
- `IX_ErrorLog_Fecha` en `ERL_Fecha` DESC (consultas recientes primero)
- `IX_ErrorLog_CorrelationId` en `ERL_CorrelationId` (cruce con logs)
- `IX_ErrorLog_Origen_Severidad` en `(ERL_Origen, ERL_Severidad)` (filtros de consulta)

### Tabla: `ErrorLogDetalle` (Breadcrumbs)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ERD_CodID` | `BIGINT IDENTITY` | PK |
| `ERD_ERL_CodID` | `BIGINT` | FK a `ErrorLog` |
| `ERD_Orden` | `INT` | Orden cronológico (1 = más antiguo, N = más reciente antes del error) |
| `ERD_TipoAccion` | `NVARCHAR(30)` | Tipo de acción (ver tabla abajo) |
| `ERD_Descripcion` | `NVARCHAR(500)` | Descripción legible de la acción |
| `ERD_Ruta` | `NVARCHAR(200)` | Ruta Angular al momento de la acción |
| `ERD_Timestamp` | `DATETIME2` | Timestamp de la acción |
| `ERD_Metadata` | `NVARCHAR(500)` | JSON con datos extra relevantes (opcional) |

**Índice**: `IX_ErrorLogDetalle_ErrorLogId` en `ERD_ERL_CodID` (join eficiente)

**FK**: `ERD_ERL_CodID` → `ErrorLog.ERL_CodID` con `ON DELETE CASCADE` (purga automática al borrar el padre)

### Tipos de Acción (`ERD_TipoAccion`)

| Tipo | Descripción | Ejemplo de `ERD_Descripcion` |
|------|-------------|------------------------------|
| `NAVIGATION` | Cambio de ruta | `"/intranet/admin/usuarios" → "/intranet/admin/cursos"` |
| `API_CALL` | Request HTTP a la API | `"GET /api/usuarios (200, 340ms)"` |
| `API_ERROR` | Request HTTP que falló | `"POST /api/cursos (422, 120ms)"` |
| `USER_ACTION` | Acción del usuario en UI | `"Click: Guardar usuario"`, `"Abrir dialog: Crear curso"` |
| `STATE_CHANGE` | Cambio relevante de estado | `"Login exitoso"`, `"Rol cambiado a Director"` |
| `WAL_OPERATION` | Operación WAL | `"WAL: enqueue CREATE usuarios"` |

---

## Reglas de Captura por Tipo de Error

| Tipo de error | Breadcrumbs max | Ejemplo |
|---------------|----------------|---------|
| Error JS no manejado (500, null reference, etc.) | 30 | La app crasheó — necesito todo el contexto |
| Error HTTP 500 del backend | 30 | El backend falló — necesito ver qué hizo el usuario antes |
| Error de negocio (422, 400) | 15 | Regla de negocio violada — contexto moderado |
| Error de autenticación (401, 403) | 10 | Sesión expirada o acceso denegado — poco contexto necesario |
| Error de red/timeout (0, 408, 504) | 5 | Problema de conectividad — solo las últimas acciones |
| Error de concurrencia (409) | 10 | Conflicto — contexto moderado |

---

## Componentes a Crear

### Frontend

#### 1. `ActivityTrackerService` — Registro de breadcrumbs

```
Ubicación: @core/services/error/activity-tracker.service.ts

Responsabilidad:
- Mantiene un ring buffer de las últimas 30 acciones del usuario
- Se alimenta de:
  - Router events (NavigationEnd) → tipo NAVIGATION
  - HTTP interceptor (request+response) → tipo API_CALL / API_ERROR
  - Facade commands (decorador o llamada manual) → tipo USER_ACTION
  - Auth events (login/logout) → tipo STATE_CHANGE
  - WAL operations → tipo WAL_OPERATION
- Expone método getBreadcrumbs(maxCount: number): Breadcrumb[]
- Ring buffer en memoria (no persiste — si la app se cierra, se pierde)
- NO persiste en storage (son datos efímeros, solo útiles si hay error)
```

**Interfaz del breadcrumb**:
```typescript
interface Breadcrumb {
  tipo: BreadcrumbTipo;         // NAVIGATION, API_CALL, etc.
  descripcion: string;          // Texto legible
  ruta: string;                 // Ruta Angular actual
  timestamp: number;            // Date.now()
  metadata?: Record<string, string>;  // Datos extra (método HTTP, status, etc.)
}
```

#### 2. `ErrorReporterService` — Envío de errores al backend

```
Ubicación: @core/services/error/error-reporter.service.ts

Responsabilidad:
- Recibe error + breadcrumbs → construye payload → POST /api/sistema/errors
- Determina cantidad de breadcrumbs según tipo de error (tabla de reglas)
- Incluye: correlationId, plataforma (web/android/ios), userAgent
- Rate limiting: máximo 10 reportes por minuto (evitar flood)
- Fire-and-forget: si el POST falla, no reintentar (el backend ya tiene el error en logs)
- NO enviar datos sensibles: nunca el DNI completo, nunca tokens, nunca contraseñas
```

**Integración con `ErrorHandlerService` existente**:
- Reemplaza el POST actual a `/api/sistema/client-errors` (que es básico)
- Se invoca desde `handleHttpError` y `handleClientError`
- El usuario sigue viendo el mismo toast de siempre — no cambia nada visible

#### 3. Interceptor de breadcrumbs HTTP

```
Ubicación: Integrar en el trace interceptor existente (request-trace.interceptor.ts)

Cambio: Además de grabar en RequestTraceStore (solo dev), grabar en ActivityTrackerService (siempre)
- Solo grabar: método, URL (sin query params sensibles), status, duración
- No grabar: body del request, headers, tokens
```

#### 4. Decorador o helper para acciones de usuario

```
Para capturar USER_ACTION desde facades sin ensuciar el código:

// Opción A: Método en ActivityTrackerService
this.activityTracker.track('USER_ACTION', 'Guardar usuario');

// Opción B: Solo en facades que manejan operaciones críticas (no en todos)
// Se agrega manualmente en los facades admin (create, update, delete, toggle)
```

### Backend

#### 5. Modelo `ErrorLog` + `ErrorLogDetalle`

```
Ubicación: Models/Sistema/ErrorLog.cs, Models/Sistema/ErrorLogDetalle.cs

- Entidades EF Core con configuración Fluent API en ApplicationDbContext
- ON DELETE CASCADE en ErrorLogDetalle
```

#### 6. `IErrorLogService` + `ErrorLogService`

```
Ubicación: Interfaces/Services/Sistema/IErrorLogService.cs
           Services/Sistema/ErrorLogService.cs

Métodos:
- RegistrarErrorFrontendAsync(ErrorFrontendDto dto) → guarda ErrorLog + detalles
- RegistrarErrorBackendAsync(Exception ex, HttpContext context) → guarda ErrorLog (sin breadcrumbs)
- ObtenerErroresRecientesAsync(filtros) → lista paginada para consulta dev
- PurgarAntiguosAsync() → DELETE WHERE Fecha < 7 días
```

#### 7. Endpoint `POST /api/sistema/errors`

```
Ubicación: Controllers/Sistema/ErrorLogController.cs

POST /api/sistema/errors
- [Authorize] — necesita saber quién es el usuario
- Rate limit: "heavy" (5/min por usuario)
- Recibe: ErrorFrontendDto con mensaje, stack, breadcrumbs[], plataforma, userAgent, correlationId
- Valida: máximo 30 breadcrumbs, trunca strings largos
- Enmascarar DNI en el service antes de guardar
- Retorna 201 Created (sin body — fire-and-forget del lado del frontend)
```

#### 8. Integración en `GlobalExceptionMiddleware`

```
Cambio en: Middleware/GlobalExceptionMiddleware.cs

Para errores 500 (excepciones no manejadas):
- Además de log + ApiResponse, llamar a IErrorLogService.RegistrarErrorBackendAsync()
- Fire-and-forget (no debe fallar la respuesta si el registro falla)
- Incluir: CorrelationId, URL, método HTTP, usuario (de claims), stack trace
- SIN breadcrumbs (el backend no tiene el flujo del usuario — eso viene del frontend)
```

#### 9. Job de purga

```
Ubicación: Services/Sistema/ErrorLogPurgeJob.cs

Hangfire job:
- Schedule: diario a las 3:00 AM (hora Perú)
- Acción: DELETE FROM ErrorLog WHERE ERL_Fecha < DATEADD(DAY, -7, GETDATE())
- CASCADE borra los detalles automáticamente
- Log del resultado: "Purgados {count} registros de error con antigüedad > 7 días"
```

---

## DTOs

### `ErrorFrontendDto` (Frontend → Backend)

| Campo | Tipo | Validación |
|-------|------|------------|
| `correlationId` | `string` | Opcional, max 50 chars |
| `mensaje` | `string` | Requerido, max 500 chars |
| `stackTrace` | `string?` | Opcional, max 4000 chars |
| `url` | `string` | Requerido, max 500 chars |
| `httpMethod` | `string?` | Opcional (GET/POST/PUT/DELETE) |
| `httpStatus` | `int?` | Opcional |
| `errorCode` | `string?` | Opcional, max 50 chars |
| `severidad` | `string` | Requerido: CRITICAL, ERROR, WARNING |
| `plataforma` | `string` | Requerido: WEB, ANDROID, IOS |
| `userAgent` | `string` | Requerido, max 500 chars |
| `breadcrumbs` | `BreadcrumbDto[]` | Max 30 items |

### `BreadcrumbDto`

| Campo | Tipo | Validación |
|-------|------|------------|
| `tipo` | `string` | Requerido: NAVIGATION, API_CALL, API_ERROR, USER_ACTION, STATE_CHANGE, WAL_OPERATION |
| `descripcion` | `string` | Requerido, max 500 chars |
| `ruta` | `string` | Requerido, max 200 chars |
| `timestamp` | `long` | Requerido (epoch ms) |
| `metadata` | `string?` | Opcional, max 500 chars (JSON) |

### `ErrorLogListaDto` (Backend → Consulta dev)

| Campo | Tipo |
|-------|------|
| `id` | `long` |
| `correlationId` | `string` |
| `origen` | `string` |
| `severidad` | `string` |
| `mensaje` | `string` |
| `url` | `string` |
| `httpStatus` | `int?` |
| `errorCode` | `string?` |
| `usuarioDni` | `string` (enmascarado) |
| `usuarioRol` | `string` |
| `plataforma` | `string` |
| `fecha` | `DateTime` |
| `totalBreadcrumbs` | `int` |

### `ErrorLogDetalleDto` (Backend → Consulta dev, al expandir un error)

| Campo | Tipo |
|-------|------|
| `id` | `long` |
| `orden` | `int` |
| `tipoAccion` | `string` |
| `descripcion` | `string` |
| `ruta` | `string` |
| `timestamp` | `DateTime` |
| `metadata` | `string?` |

---

## Relación con Infraestructura Existente

| Componente existente | Relación | Cambio |
|---------------------|----------|--------|
| `GlobalExceptionMiddleware` | **Usa** — llama a `IErrorLogService` para errores 500 | Agregar llamada fire-and-forget |
| `ErrorHandlerService` | **Usa** — invoca `ErrorReporterService` en vez del POST directo actual | Reemplazar POST a `/api/sistema/client-errors` |
| `X-Correlation-Id` | **Aprovecha** — se incluye en `ErrorLog` para cruzar con logs | Sin cambio |
| `RequestTraceStore` | **Independiente** — sigue funcionando solo en dev | Sin cambio |
| `DiagnosticLogger` | **Independiente** — sigue funcionando por tags | Sin cambio |
| `POST /api/sistema/client-errors` | **Reemplazado** por `POST /api/sistema/errors` | Deprecar endpoint viejo |
| `DniHelper.Mask()` | **Usa** — para enmascarar DNI en la tabla | Sin cambio |

---

## Fases de Implementación

### Fase 1: Tablas y Backend

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 1.1 | Script SQL: crear tablas `ErrorLog` + `ErrorLogDetalle` con índices | Bajo |
| 1.2 | Modelos EF: `ErrorLog.cs`, `ErrorLogDetalle.cs`, DbSet en ApplicationDbContext | Bajo |
| 1.3 | DTOs: `ErrorFrontendDto`, `BreadcrumbDto`, `ErrorLogListaDto`, `ErrorLogDetalleDto` | Bajo |
| 1.4 | `IErrorLogService` + `ErrorLogService` — registro y consulta | Medio |
| 1.5 | `ErrorLogController` — POST errors + GET lista + GET detalle | Bajo |
| 1.6 | Integración en `GlobalExceptionMiddleware` — fire-and-forget para 500s | Bajo |
| 1.7 | Job de purga Hangfire — DELETE > 7 días, diario 3am | Bajo |

### Fase 2: Frontend — Captura de breadcrumbs

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 2.1 | `ActivityTrackerService` — ring buffer de 30 acciones | Medio |
| 2.2 | Integrar con Router (NavigationEnd → breadcrumb NAVIGATION) | Bajo |
| 2.3 | Integrar con HTTP interceptor (request/response → breadcrumb API_CALL/API_ERROR) | Bajo |
| 2.4 | Integrar con auth (login/logout → breadcrumb STATE_CHANGE) | Bajo |

### Fase 3: Frontend — Envío de errores

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 3.1 | `ErrorReporterService` — empaqueta error + breadcrumbs + envía al backend | Medio |
| 3.2 | Integrar con `ErrorHandlerService` — reemplazar POST actual | Bajo |
| 3.3 | Integrar con `GlobalErrorHandler` — errores JS no manejados | Bajo |
| 3.4 | Deprecar `/api/sistema/client-errors` | Bajo |

### Fase 4: Consulta para desarrolladores (opcional, después de validar que las fases 1-3 funcionan)

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 4.1 | Vista admin en intranet: tabla de errores recientes con filtros | Medio |
| 4.2 | Expandir error → ver breadcrumbs como timeline | Medio |
| 4.3 | Acceso restringido: solo rol Director o desarrolladores con permiso especial | Bajo |

---

## Seguridad y Privacidad

| Regla | Detalle |
|-------|---------|
| DNI enmascarado | `DniHelper.Mask(dni)` → `***1234` — nunca DNI completo en la tabla |
| Sin tokens | NUNCA guardar JWT, refresh token, ni cookies de auth en breadcrumbs |
| Sin contraseñas | NUNCA guardar cuerpo de login requests |
| Sin datos de estudiantes | Breadcrumbs de API_CALL solo guardan URL y status, NUNCA el body |
| Truncar strings | Mensaje max 500, stack max 4000, breadcrumb desc max 500 |
| Rate limit | Máximo 5 reportes/minuto por usuario (backend) + 10/minuto (frontend) |
| Purga automática | 7 días máximo — no acumular datos personales indefinidamente |

---

## Invariantes

| ID | Invariante |
|----|-----------|
| `INV-ET01` | El usuario NUNCA ve diferencia en su experiencia — el tracking es 100% invisible |
| `INV-ET02` | Un error en el registro de trazabilidad NUNCA falla la operación principal (fire-and-forget) |
| `INV-ET03` | DNI SIEMPRE enmascarado en `ErrorLog` — nunca completo |
| `INV-ET04` | Breadcrumbs NUNCA contienen datos sensibles (tokens, passwords, body de requests) |
| `INV-ET05` | Registros > 7 días se purgan automáticamente — sin intervención manual |
| `INV-ET06` | `X-Correlation-Id` se preserva — permite cruzar ErrorLog con logs de aplicación existentes |
| `INV-ET07` | Si el POST de error falla (backend caído), se pierde silenciosamente — no reintentar, no encolar |

---

## SQL Script (para ejecutar en Azure SQL antes del deploy)

```sql
-- ============================================
-- Tablas de trazabilidad de errores
-- ============================================

CREATE TABLE ErrorLog (
    ERL_CodID           BIGINT IDENTITY(1,1) PRIMARY KEY,
    ERL_CorrelationId   NVARCHAR(50)    NULL,
    ERL_Origen          NVARCHAR(20)    NOT NULL,  -- FRONTEND, BACKEND
    ERL_Severidad       NVARCHAR(20)    NOT NULL,  -- CRITICAL, ERROR, WARNING
    ERL_Mensaje         NVARCHAR(500)   NOT NULL,
    ERL_StackTrace      NVARCHAR(MAX)   NULL,
    ERL_Url             NVARCHAR(500)   NOT NULL,
    ERL_HttpMethod      NVARCHAR(10)    NULL,
    ERL_HttpStatus      INT             NULL,
    ERL_ErrorCode       NVARCHAR(50)    NULL,
    ERL_UsuarioDni      NVARCHAR(50)    NULL,      -- Enmascarado: ***1234
    ERL_UsuarioRol      NVARCHAR(50)    NULL,
    ERL_Plataforma      NVARCHAR(20)    NOT NULL DEFAULT 'WEB',
    ERL_UserAgent       NVARCHAR(500)   NULL,
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

-- ============================================

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

-- ============================================
-- Job de purga (ejecutar manualmente o via Hangfire)
-- ============================================
-- DELETE FROM ErrorLog WHERE ERL_Fecha < DATEADD(DAY, -7, GETUTCDATE());
-- CASCADE borra ErrorLogDetalle automáticamente
```

---

## Checklist Pre-Implementación

```
BACKEND
[ ] Script SQL ejecutado en Azure SQL (tablas + índices)
[ ] Modelos EF con DbSet en ApplicationDbContext
[ ] DTOs con Data Annotations para validación
[ ] IErrorLogService registrado en DI (AddScoped)
[ ] GlobalExceptionMiddleware integrado (fire-and-forget)
[ ] Job de purga registrado en Hangfire
[ ] Endpoint con [Authorize] y rate limiting

FRONTEND
[ ] ActivityTrackerService con ring buffer de 30
[ ] Router events alimentando breadcrumbs
[ ] HTTP interceptor alimentando breadcrumbs (sin body/tokens)
[ ] ErrorReporterService con rate limit de 10/min
[ ] ErrorHandlerService integrado con ErrorReporter
[ ] Endpoint viejo (/api/sistema/client-errors) deprecado

SEGURIDAD
[ ] DNI enmascarado en service antes de guardar
[ ] Sin tokens/passwords en breadcrumbs
[ ] Sin body de requests en breadcrumbs
[ ] Strings truncados a sus max lengths
[ ] Rate limiting en ambos lados (front + back)
[ ] Purga automática a 7 días

VALIDACIÓN
[ ] Error 500 del backend → aparece en tabla ErrorLog con origin BACKEND
[ ] Error JS del frontend → aparece con origin FRONTEND + breadcrumbs
[ ] Error de red → aparece con máximo 5 breadcrumbs
[ ] Tabla no crece indefinidamente (purga funciona)
[ ] Usuario no nota nada diferente
```
