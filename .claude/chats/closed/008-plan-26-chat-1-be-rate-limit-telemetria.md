> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 26 · **Chat**: 1 · **Fase**: F1 (subfases F1.1 a F1.4) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 26 Chat 1 — Rate limit telemetry (BE: tabla + middleware + endpoint)

## PLAN FILE

`educa-web/.claude/plan/maestro.md` → sección **"🔵 Plan 26 — Rate limiting flexible"** → **F1 — Telemetría sobre policies actuales**.

Path relativo desde `Educa.API`: `../../educa-web/.claude/plan/maestro.md`.

## OBJETIVO

Observabilidad de 429 antes de cambiar cualquier policy. Crear tabla `RateLimitEvent`, middleware fire-and-forget que la pueble cuando hay throttling (o cuando una request consume >80% de su cuota — early warning), y endpoint admin para consultarla con filtros. **No se toca ninguna policy en este chat**.

## PRE-WORK OBLIGATORIO

### 1. DB SELECT first (regla del proyecto)

Antes de escribir el script de la tabla nueva, mostrar al usuario las siguientes queries sobre la BD de prueba y esperar confirmación:

```sql
-- Verificar si ya existe alguna tabla o log relacionado con rate limit / throttling
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%RateLimit%' OR TABLE_NAME LIKE '%Throttle%';

-- Revisar estructura de ErrorLog (modelo de referencia para decidir columnas)
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ErrorLog'
ORDER BY ORDINAL_POSITION;

-- Volumen estimado de 429 por día (si hay algún log parcial en ErrorLog)
SELECT COUNT(*) AS total, CAST(ERL_FechaReg AS DATE) AS dia
FROM ErrorLog
WHERE ERL_StatusCode = 429
GROUP BY CAST(ERL_FechaReg AS DATE)
ORDER BY dia DESC;
```

### 2. Estructura propuesta

Mostrar al usuario ANTES de ejecutar CREATE TABLE:

```sql
CREATE TABLE RateLimitEvent (
    REL_CodID BIGINT IDENTITY(1,1) PRIMARY KEY,
    REL_CorrelationId NVARCHAR(50) NULL,
    REL_Endpoint NVARCHAR(200) NOT NULL,
    REL_HttpMethod NVARCHAR(10) NOT NULL,
    REL_Policy NVARCHAR(50) NULL,              -- política aplicada (heavy, global, etc.) o NULL si no aplica
    REL_UsuarioDni NVARCHAR(8) NULL,           -- NULL si anónimo (pre-login)
    REL_UsuarioRol NVARCHAR(50) NULL,          -- "Director", "Profesor", etc. "Anónimo" si null
    REL_LimiteEfectivo INT NULL,               -- cuota efectiva que aplicó (NULL en F1, útil en F2+)
    REL_TokensConsumidos INT NULL,             -- cuántos tokens pidió (NULL en F1)
    REL_FueRechazado BIT NOT NULL,             -- TRUE si devolvió 429; FALSE si fue early warning >80%
    REL_IpAddress NVARCHAR(45) NULL,
    REL_FechaReg DATETIME2 NOT NULL
);

CREATE INDEX IX_RateLimitEvent_FechaReg_Rechazado
    ON RateLimitEvent (REL_FechaReg DESC) INCLUDE (REL_FueRechazado);

CREATE INDEX IX_RateLimitEvent_UsuarioDni_FechaReg
    ON RateLimitEvent (REL_UsuarioDni, REL_FechaReg DESC)
    WHERE REL_UsuarioDni IS NOT NULL;

CREATE INDEX IX_RateLimitEvent_Endpoint_FechaReg
    ON RateLimitEvent (REL_Endpoint, REL_FechaReg DESC);
```

Confirmar con el usuario: nombre prefijo `REL_`, nullable fields, índices. Luego ejecutar en BD de prueba y confirmar con `SELECT TOP 10 * FROM RateLimitEvent ORDER BY REL_CodID DESC` vacío.

## ALCANCE

### Archivos nuevos (BE)

| Archivo | Rol | Líneas est. |
|---------|-----|-------------|
| `Models/Sistema/RateLimitEvent.cs` | Entidad EF | ~50 |
| `Interfaces/IRepositories/Sistema/IRateLimitEventRepository.cs` | Contrato | ~20 |
| `Repositories/Sistema/RateLimitEventRepository.cs` | Query + Insert | ~120 |
| `Interfaces/IServices/Sistema/IRateLimitTelemetryService.cs` | Contrato | ~15 |
| `Services/Sistema/RateLimitTelemetryService.cs` | Orquesta persistencia + filtro 80% | ~80 |
| `Middleware/RateLimitTelemetryMiddleware.cs` | Intercepta 429 y early warning | ~100 |
| `Controllers/Sistema/RateLimitEventsController.cs` | GET con filtros | ~120 |
| `DTOs/Sistema/RateLimitEventListaDto.cs` | DTO lista (DNI enmascarado) | ~25 |
| `DTOs/Sistema/RateLimitEventFiltroDto.cs` | Filtros: user, rol, endpoint, policy, rango, soloRechazados | ~25 |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `Data/ApplicationDbContext.cs` | Agregar `DbSet<RateLimitEvent>` + Fluent API si aplica |
| `Program.cs` | Registrar DI (`IRateLimitEventRepository`, `IRateLimitTelemetryService`) + `app.UseMiddleware<RateLimitTelemetryMiddleware>()` en pipeline (después de `GlobalExceptionMiddleware`, antes de rate limit) |

### Tests nuevos (al menos 3 archivos)

- `Educa.API.Tests/Services/Sistema/RateLimitTelemetryServiceTests.cs` (~6 tests)
- `Educa.API.Tests/Middleware/RateLimitTelemetryMiddlewareTests.cs` (~5 tests)
- `Educa.API.Tests/Controllers/Sistema/RateLimitEventsControllerTests.cs` (~4 tests, incluye authorization)

## TESTS MÍNIMOS

### Service

1. `LogRejectedAsync(endpoint, method, userId, rol, policy, ip)` → evento persistido con `REL_FueRechazado=true`
2. `LogEarlyWarningAsync(...)` solo si consumo ≥ 80% de la cuota → evento persistido con `REL_FueRechazado=false`
3. Fallo simulado de DbContext → no lanza excepción, solo `LogWarning` (INV-S07 + INV-ET02)
4. Usuario anónimo (`userId=null`) → evento con `REL_UsuarioRol="Anónimo"` y `REL_UsuarioDni=null`

### Middleware

1. Response status 429 → service llamado con `REL_FueRechazado=true`
2. Response status 200 con header `X-RateLimit-Remaining` indicando ≤20% restante → service llamado con `REL_FueRechazado=false`
3. Response status 200 con cuota saludable → service NO llamado
4. Request sin auth → rol = "Anónimo"
5. Exception interna del middleware → no rompe la response (fire-and-forget)

### Controller

1. GET con rango fecha y `soloRechazados=true` → solo eventos con `REL_FueRechazado=true` en rango
2. GET con filtro por rol "Director" → solo eventos de directores
3. Non-administrativo (Profesor/Estudiante/Apoderado) → 403 Forbidden
4. DNI en DTO viene enmascarado (`***1234`), nunca crudo

## REGLAS OBLIGATORIAS

- **INV-S07 + INV-ET02**: fire-and-forget. Un fallo al persistir evento NUNCA falla la request ni el middleware.
- **INV-D01**: DNI normalizado con `DniHelper.Normalizar()` antes de almacenar.
- **INV-D04**: fechas en hora Perú → `DateTimeHelper.PeruNow()` en el service, NUNCA `DateTime.Now`.
- **INV-D05**: queries read-only con `AsNoTracking()`.
- **INV-D08**: `ApiResponse<T>` en todos los endpoints.
- Cap duro **300 líneas** por archivo `.cs`.
- Extraer claims con `User.GetDni()` / `User.GetRol()` (extension methods en `Helpers/Auth/UserClaimsExtensions.cs`).
- DNI en DTOs con `DniHelper.Mask(dni)` → `***1234`.
- `[Authorize(Roles = Roles.Administrativos)]` a nivel clase en `RateLimitEventsController`.
- Structured logging — NUNCA string interpolation en logs (`_logger.LogError(ex, "...", dni)`).
- El endpoint `GET /api/sistema/rate-limit-events` debe tener `[EnableRateLimiting("reports")]` para no colapsarse a sí mismo.
- El middleware debe ir en el pipeline **después** de rate limiting nativo (para observar sus 429) pero **antes** del handler final. Orden exacto: `UseRateLimiter()` → `UseMiddleware<RateLimitTelemetryMiddleware>()`.
- NO agregar `Co-Authored-By` en commits (skill rule).

## APRENDIZAJES TRANSFERIBLES

Del chat actual y conversaciones previas:

1. **Decisiones de diseño ya tomadas — NO re-discutir**. Ver plan maestro sección "Decisiones de diseño aprobadas":
   - Multipliers por rol: Director 3.0 / AsistenteAdmin 2.5 / Profesor 2.0 / Apoderado 1.0 / Estudiante 1.0
   - Franja escolar: 7am-5pm Lima L-V, x1.5
   - Burst 10/30s + sustained 200/5min
   - Cap 5x acumulado
   - Retención 90 días
   - **En F1 no se aplica ninguno de estos valores** — solo se observa.

2. **Policies existentes (referencia)**: `global reads` 200/min, `global writes` 30/min, `login` 10/min, `refresh` 20/min, `biometric` 30/min, `heavy` 5/min. Ver `rules/backend.md` sección Rate Limiting.

3. **`ErrorLog` como referencia de estructura**: mismo patrón de columnas (CorrelationId, enmascaramiento de DNI, persistencia fire-and-forget). NO reusar la tabla — son dominios distintos (error vs rate limit, ver Plan 7 relación).

4. **Patrón de outbox/notifier existente**: `EmailFailureLogger` de Plan 22 Chat 3 — scoped DI, try/catch interno, `LogWarning` en fallo. Mismo patrón aplica aquí.

5. **`TestDbContextFactory`** ya existe en `Educa.API.Tests` (aprendizaje de Plan 22 F1) — usarlo para tests de repository/service con EF InMemory.

6. **`ControllerTestBase` + `ClaimsPrincipalBuilder`** ya existen en tests — usarlos para tests de controller con authorization (patrón de Plan 25 y Plan 23 Chat 4).

7. **`IClock` inyectable**: buscar si ya hay un `IClock`/`IDateTimeProvider` en el proyecto. Si no, NO crearlo ahora — usar `DateTimeHelper.PeruNow()` directo (F3 introducirá `IClock` cuando se necesite `TestClock`).

8. **Rate limiting nativo de ASP.NET Core 9**: el header `X-RateLimit-Remaining` no es estándar en .NET 9 `RateLimiter`. Verificar en el chat si existe un mecanismo nativo para leer tokens restantes. **Fallback si no hay**: en F1 loguear solo rechazos (FueRechazado=true). El early warning (>80%) se difiere a F2 cuando se reemplace por custom limiter.

9. **Scope del controller**: montar bajo `api/sistema/rate-limit-events` (consistente con `api/sistema/reportes-usuario`, `api/sistema/errors`, etc.).

10. **Registro de roles administrativos**: `Roles.Administrativos` es constante con 4 roles (Director, Asistente Administrativo, Promotor, Coordinador Académico). Ver `Constants/Auth/Roles.cs`.

## FUERA DE ALCANCE

- **F1.5 + F1.6 (FE admin view)** — van en Chat 2 del Plan 26.
- **F2+ (multipliers, endpoint overrides, time-of-day, burst)** — chats siguientes.
- **No tocar `Program.cs` policies** salvo para registrar el middleware. Los 6 policies actuales quedan intactos.
- **No instrumentar `biometric`, `login`, `refresh`** con early warning — son sensibles y el volumen bajo no lo amerita. Solo `global` y `heavy`.
- **No crear tabla en producción** hasta que el usuario dé OK tras validar en prueba (deploy coordinado en otro momento).
- **No reescribir `ErrorLog`** — es un dominio paralelo, no mezclar.
- **No tocar `rules/backend.md` todavía** — actualizar en el chat de cierre (Chat 2 o un chat de docs) cuando F1 esté verde end-to-end.

## CRITERIOS DE CIERRE

- [ ] SELECTs de PRE-WORK mostrados al usuario y confirmados
- [ ] Script `CREATE TABLE RateLimitEvent` + índices ejecutado en **BD de prueba** (NO producción aún)
- [ ] `SELECT TOP 10 * FROM RateLimitEvent ORDER BY REL_CodID DESC` devuelve filas tras ejercitar endpoint con 429 simulado
- [ ] Middleware registrado en `Program.cs` en el orden correcto
- [ ] DI registrado (`IRateLimitEventRepository`, `IRateLimitTelemetryService`)
- [ ] `DbSet<RateLimitEvent>` agregado en `ApplicationDbContext`
- [ ] Endpoint `GET /api/sistema/rate-limit-events` responde con filtros (probado manual con curl/Postman)
- [ ] `[Authorize(Roles = Roles.Administrativos)]` verificado — tests de controller validan 403 para roles no-administrativos
- [ ] Tests nuevos verdes (esperado ~15 nuevos, 0 regresiones sobre baseline actual)
- [ ] Cap 300 líneas respetado en todos los archivos `.cs` tocados
- [ ] INV-S07 + INV-ET02 respetados — tests de fallo de persistencia verifican que no propaga excepciones
- [ ] DNI enmascarado en DTOs (test verifica formato `***1234`)
- [ ] Plan maestro actualizado: marcar F1.1-F1.4 como ✅ con fecha 2026-04-21, agregar resumen en la fila del inventario (Plan 26)
- [ ] Commit hecho con mensaje sugerido (abajo)
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat

## COMMIT MESSAGE sugerido

Subject (≤ 72 chars):

```
feat(sistema): Plan 26 Chat 1 — rate limit telemetry (table + middleware + endpoint)
```

Body sugerido (inglés, términos de dominio entre comillas):

```
Introduce "RateLimitEvent" table + fire-and-forget middleware that logs 429
responses with userId, role, endpoint, policy, correlationId and masked DNI.
Adds "GET /api/sistema/rate-limit-events" admin endpoint (filters by user,
role, endpoint, policy, date range, rejected-only) restricted to
"Roles.Administrativos".

F1 is observation-only — no policy is touched. Data collected over the next
1-2 weeks will calibrate F2 (role multiplier + endpoint override).

Covers Plan 26 F1.1-F1.4. FE admin view follows in Chat 2.

Respects INV-S07 (fire-and-forget), INV-ET02 (telemetry failure never fails
the request), INV-D01 (DNI normalized), INV-D04 (Peru time).
```

**Reglas del skill `commit`**: inglés imperativo, español solo entre `"..."` para términos de dominio (`"RateLimitEvent"`, `"Roles.Administrativos"`), **NUNCA `Co-Authored-By`**, subject ≤ 72 chars.

## CIERRE

Al terminar el chat, preguntar al usuario:

1. **Rango de retención**: ¿90 días acordados en el plan siguen OK, o querés arrancar con 30 días y extender si el volumen es bajo? (decisión del job de purga — se implementa en Chat 2 o en F5, no en este chat)
2. **Early warning al 80%**: si en ASP.NET Core 9 `RateLimiter` no hay API nativa para leer tokens restantes, ¿diferimos el early warning a F2 (cuando se reemplace por custom limiter)? Respuesta técnica a dar al usuario una vez investigado.
3. **Deploy a producción**: ¿coordinamos el deploy del script SQL + BE en la ventana usual (lunes/jueves) o esperamos a cerrar F1.5-F1.6 para deploy conjunto? Recomendación: esperar Chat 2 para tener visibilidad UI antes de prod.
4. **Hallazgos de SELECT inicial**: si las queries de PRE-WORK revelan algo inesperado (tablas previas, volumen masivo de 429, etc.), reportarlo como observación para el diseño de F2.

Feedback a pedir al usuario: qué patrón de 429 ven en la BD de prueba tras 24-48h de captura. Esto calibra los multipliers iniciales de F2.
