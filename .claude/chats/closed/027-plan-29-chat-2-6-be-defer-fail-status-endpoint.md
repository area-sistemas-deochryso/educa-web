> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo — todos los archivos tocados son BE. El `/design` (Chat 1) vive en `educa-web` pero este fix es 100% Educa.API.
> **Plan**: 29 · **Chat**: 2.6 · **Fase**: `/design` mini + `/execute` BE (cierre deuda D4 del Chat 2) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 29 Chat 2.6 BE — Endpoint `DeferFailStatus` (desbloquear Plan 22 Chat B widget)

## PLAN FILE

`../../educa-web/.claude/plan/maestro.md` → sección **"🔴 Plan 29 — Corte de cascada SMTP (`max_defer_fail_percentage`)"** → subsección **"Gaps conocidos"**, gap **(2)**.

También referenciar:
- Plan 22 Chat B (widget throttle status) que está bloqueado por este chat — fila Plan 22 en el inventario del maestro.
- Deuda D4 del Plan 29 en la tabla de deudas documentadas del plan.

Contexto de chats anteriores (leer solo si hace falta):
- `../../educa-web/.claude/chats/closed/025-plan-29-chat-2-be-email-validator-blacklist-ssl-fix.md` — brief del Chat 2 que dejó la BD preparada pero no expuso endpoint.
- `../../educa-web/.claude/chats/closed/026-plan-29-chat-2-5-be-extender-validacion-formato.md` — Chat 2.5 cerró gap (1) de validación universal.
- Commits `674e86a` (Chat 2) y `0580983` (Chat 2.5) en Educa.API `master` — código base del que parte este chat.

## OBJETIVO

Exponer un endpoint `GET /api/email-outbox/defer-fail-status` que agregue en un solo DTO las métricas del canal SMTP para que el widget FE del Plan 22 Chat B pueda consumir: **contador actual de la hora (anti `5/h` cPanel)**, **breakdown 24h por tipo de fallo**, **tamaño de la blacklist**, **últimos eventos relevantes**. Hoy el FE solo puede obtener esta info con queries directas crudas contra `EmailOutbox`/`EmailBlacklist`; el widget necesita un agregado empaquetado con semver estable.

El chat combina **decisión de shape del DTO (mini-design)** + **implementación** en una sola sesión porque el scope es chico. Si el shape requiere más de 2-3 decisiones el agente debe **parar y pedir al usuario**.

## PRE-WORK OBLIGATORIO

### 1. Queries para inspeccionar el estado actual de la BD

Ejecutar y reportar los resultados **antes de codificar** (puede cambiar el shape):

```sql
-- A. Distribución de estados + tipoFallo en ventana 24h y 1h
SELECT
    'last_24h' AS Window,
    EO_Estado,
    EO_TipoFallo,
    COUNT(*) AS Cantidad
FROM EmailOutbox
WHERE EO_FechaReg >= DATEADD(HOUR, -24, DATEADD(HOUR, -5, GETUTCDATE()))
GROUP BY EO_Estado, EO_TipoFallo
UNION ALL
SELECT
    'last_1h',
    EO_Estado,
    EO_TipoFallo,
    COUNT(*)
FROM EmailOutbox
WHERE EO_FechaReg >= DATEADD(HOUR, -1, DATEADD(HOUR, -5, GETUTCDATE()))
GROUP BY EO_Estado, EO_TipoFallo
ORDER BY Window, Cantidad DESC;

-- B. Tamaño de la blacklist activa
SELECT
    COUNT(*)                            AS TotalActivos,
    MIN(EBL_FechaReg)                   AS EntradaMasVieja,
    MAX(EBL_FechaReg)                   AS EntradaMasReciente,
    SUM(CASE WHEN EBL_MotivoBloqueo = 'BOUNCE_5XX' THEN 1 ELSE 0 END) AS Bounces,
    SUM(CASE WHEN EBL_MotivoBloqueo = 'MANUAL'     THEN 1 ELSE 0 END) AS Manuales
FROM EmailBlacklist
WHERE EBL_Estado = 1;

-- C. Contador de defer/fail que cuenta para cPanel en la hora actual
-- (correos que cruzaron al SMTP y fueron rechazados — excluye los bloqueados pre-envío)
SELECT
    COUNT(*) AS DeferFailCountUltimaHora
FROM EmailOutbox
WHERE EO_Estado IN ('FAILED', 'RETRYING')
  AND EO_TipoFallo NOT IN ('FAILED_INVALID_ADDRESS', 'FAILED_NO_EMAIL', 'FAILED_BLACKLISTED')
  AND EO_FechaReg >= DATEADD(HOUR, -1, DATEADD(HOUR, -5, GETUTCDATE()));
```

Con los resultados, confirmar que el shape propuesto (ver "ALCANCE") cubre todo lo útil.

### 2. Confirmar el umbral cPanel con el usuario

Hoy sabemos por investigación: **`max_defer_fail_percentage` = 5/h por dominio**. Confirmar con el usuario si se negoció con el hosting subir el umbral (Chat 3 OPS, puede no haber pasado todavía). El valor a exponer en el DTO debe venir de **configuración** (`appsettings.json` en `Email:DeferFailThresholdPerHour`) con default `5`, no hardcoded.

## ALCANCE

### Archivos a CREAR

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|------------------|
| 1 | `Educa.API/DTOs/Notifications/DeferFailStatusDto.cs` | DTO con agregados | ~60 |
| 2 | `Educa.API/Interfaces/Services/Notifications/IEmailOutboxStatusService.cs` | Contrato | ~15 |
| 3 | `Educa.API/Services/Notifications/EmailOutboxStatusService.cs` | Queries + mapeo al DTO | ~180 |
| 4 | `Educa.API/Controllers/Sistema/EmailOutboxStatusController.cs` | Endpoint REST | ~40 |
| 5 | `Educa.API.Tests/Services/Notifications/EmailOutboxStatusServiceTests.cs` | Tests con casos canónicos | ~200 |
| 6 | `Educa.API.Tests/Controllers/Sistema/EmailOutboxStatusControllerAuthorizationTests.cs` | Test de autorización (reflection) | ~70 |

### Archivos a MODIFICAR

| # | Archivo | Cambio |
|---|---------|--------|
| 7 | `Educa.API/Program.cs` o `ServiceCollectionExtensions.cs` | Registrar `IEmailOutboxStatusService` + `EmailOutboxStatusService` en DI |
| 8 | `Educa.API/appsettings.json` | Agregar `Email:DeferFailThresholdPerHour = 5` |

### Shape propuesto del DTO (a confirmar antes de codificar)

```csharp
public record DeferFailStatusDto(
    string       Status,                     // "OK" | "WARNING" | "CRITICAL"
    CurrentHourStatus CurrentHour,
    WindowStats  Last24h,
    BlacklistSummary Blacklist,
    DateTime     GeneratedAt                 // Peru time
);

public record CurrentHourStatus(
    int DeferFailCount,                     // hits al SMTP que rebotaron
    int Threshold,                          // appsettings, default 5
    int PercentUsed,                        // 0-100+
    DateTime HourStart                      // piso de la hora
);

public record WindowStats(
    int Total,
    int Sent,
    int Pending,
    int FailedInvalidAddress,               // Chat 2.5
    int FailedNoEmail,                      // Chat 2.5
    int FailedBlacklisted,                  // Chat 2
    int FailedThrottleHost,                 // Chat 2
    int FailedOther                         // fallback (problemas síncronos SMTP no clasificados)
);

public record BlacklistSummary(
    int TotalActivos,
    int ByReasonBounce5xx,
    int ByReasonManual,
    int ByReasonBulkImport,
    int ByReasonFormatInvalid,
    DateTime? OldestEntry,
    DateTime? NewestEntry
);
```

### Reglas de negocio del status

```
OK       → DeferFailCount < 60% del threshold
WARNING  → DeferFailCount entre 60% y 99% del threshold
CRITICAL → DeferFailCount >= 100% del threshold
```

### Endpoint

```csharp
[ApiController]
[Route("api/email-outbox")]
[Authorize(Roles = Roles.Administrativos)]  // 4 roles, mismo patrón Plan 21 INV-AD06
public class EmailOutboxStatusController : ControllerBase
{
    private readonly IEmailOutboxStatusService _service;

    public EmailOutboxStatusController(IEmailOutboxStatusService service)
        => _service = service;

    [HttpGet("defer-fail-status")]
    [EnableRateLimiting("global")]
    public async Task<IActionResult> GetDeferFailStatus()
    {
        var status = await _service.GetDeferFailStatusAsync();
        return Ok(ApiResponse<DeferFailStatusDto>.Success(status, "Status retrieved"));
    }
}
```

### Queries del service (3 queries concurrentes `Task.WhenAll`)

1. **Current hour** — SELECT COUNT(*) sobre `EmailOutbox` WHERE estado IN ('FAILED','RETRYING') AND tipoFallo NOT IN (los 3 que no cuentan para cPanel) AND fecha >= piso_hora.
2. **24h breakdown** — SELECT con `SUM(CASE...)` por cada campo de `WindowStats` (una sola query agrupada).
3. **Blacklist summary** — SELECT con SUM(CASE) sobre `EmailBlacklist` + MIN/MAX de fechas.

Todas con `AsNoTracking()`.

## TESTS MÍNIMOS

### Service (`EmailOutboxStatusServiceTests`)

| Caso | Setup | Resultado esperado |
|------|-------|-------------------|
| BD vacía | 0 filas | `Status=OK`, todos los contadores = 0 |
| 3 FAILED con TipoFallo normales en la última hora (cruzaron al SMTP) | Threshold = 5 | `CurrentHour.DeferFailCount = 3`, `PercentUsed = 60`, `Status = WARNING` |
| 5 FAILED que contaron | Threshold = 5 | `Status = CRITICAL`, `PercentUsed = 100` |
| FAILED_BLACKLISTED no cuenta para cPanel | 3 FAILED_BLACKLISTED + 1 FAILED normal | `DeferFailCount = 1`, `Status = OK` |
| FAILED_INVALID_ADDRESS no cuenta para cPanel (Chat 2.5) | 2 INVALID_ADDRESS + 0 SMTP | `DeferFailCount = 0` |
| Breakdown 24h distingue todos los tipos | 1 de cada estado/tipoFallo | cada campo de `WindowStats` = 1 |
| Blacklist con mix de motivos | 2 BOUNCE_5XX + 1 MANUAL | `ByReasonBounce5xx = 2`, `ByReasonManual = 1` |
| Threshold configurable | appsettings = 25 (negociado con hosting) | `CurrentHour.Threshold = 25` |

### Controller (`EmailOutboxStatusControllerAuthorizationTests`)

Reflection sobre la clase + método:
- Clase tiene `[Authorize(Roles = Roles.Administrativos)]` (los 4 roles del Plan 21)
- Rechazo explícito de `Profesor`, `Apoderado`, `Estudiante`
- Endpoint decorado con `[HttpGet("defer-fail-status")]` y `[EnableRateLimiting("global")]`

**Target**: suite BE ≥ 1253 + ~12 = **~1265 verdes** (baseline Chat 2.5 = 1253).

## REGLAS OBLIGATORIAS

### Invariantes aplicables

- **`INV-D05`** — Todas las queries usan `AsNoTracking()`.
- **`INV-D08`** — El endpoint retorna `ApiResponse<T>` (no el DTO pelado).
- **`INV-S07`** — Un error en el service NO puede propagar al caller — wrap en try/catch, retornar DTO con `Status = "CRITICAL"` + fecha actual si la query falla (telemetría fail-safe).
- **Patrón Plan 21 INV-AD06** — 4 roles administrativos (Director, Asistente Administrativo, Promotor, Coordinador Académico), no solo Director.

### Reglas de arquitectura

- **300 líneas máximo** por archivo `.cs`. El service va a rondar 180, seguro bajo el cap. Si se infla más, dividir en `EmailOutboxStatusService.Current.cs` + `.Window.cs` + `.Blacklist.cs`.
- **Separación controller/service/DTO** — el controller solo delega (cartero, no ingeniero).
- **Structured logging** con placeholders.
- **Sin migración SQL** — solo lectura sobre tablas existentes (`EmailOutbox`, `EmailBlacklist`).

### Rate limiting

- Política `"global"` — el endpoint puede ser consultado por el widget FE cada 30-60 segundos. No es heavy.

## APRENDIZAJES TRANSFERIBLES

### Literales de tipo en EmailOutbox son UPPERCASE

Descubierto en Chat 2.5: los tipos en prod son `"ASISTENCIA"`, `"ASISTENCIA_CORRECCION"`, `"ASISTENCIA_CORRECCION_PROFESOR"` en mayúsculas. Los tipos en otras fuentes son CamelCase (`"NotificacionAdmin"`, `"ReporteUsuario"`, `"ReporteFallosCorreoAsistencia"`). Si este chat filtra por `EO_Tipo`, usar `StringComparer.OrdinalIgnoreCase` o literales exactos. Este chat en particular **NO debería filtrar por tipo** — solo agrega por estado/tipoFallo.

### BCC rebotes son invisibles

MailKit marca `EO_Estado='SENT'` aunque los BCCs reboten. El NDR llega asíncronamente al inbox del remitente (`sistemas3@`). El Chat 2 del Plan 29 solo detecta bounces **síncronos** durante `SendAsync`. **No aparece como `FAILED` aunque rebotó** — el agregado `DeferFailStatus` subestima el problema real.

Esto **NO cambia el scope** de este chat (el shape propuesto es correcto para bounces síncronos), pero vale la pena agregar un comentario `// Nota: no incluye bounces asíncronos por NDR — limitación conocida` en el `EmailOutboxStatusService` para que el siguiente que lo lea no asuma cobertura total.

### Estructura del `EmailOutboxService` post-Chat 2

Es `partial class` (`EmailOutboxService.cs` + `EmailOutboxService.Enqueue.cs`). **NO tocar esos archivos** — este chat crea un service separado (`EmailOutboxStatusService`) que solo consume data, no muta.

### Contexto de tests InMemory

Usar `TestDbContextFactory.Create()` de `Educa.API.Tests/Helpers/Db/` (ya extendido en Chat 2 para relajar `EBL_RowVersion`). NO crear factoría nueva.

### Patrón de test de autorización reflection

`AsistenciaAdminControllerAuthorizationTests.cs` es el patrón canónico para verificar `[Authorize(Roles = ...)]` por reflection. Copiar estructura — 6 tests por controller (4 roles admitidos + 3 rechazos explícitos + 1 verificación de decorador).

### Convenciones de commit (`.claude/skills/commit/SKILL.md`)

- **Inglés** imperativo en subject y body.
- Español solo entre `"..."` para términos de dominio (`"DeferFailStatus"`, `"EmailOutbox"`, `"EmailBlacklist"`, `"FAILED_BLACKLISTED"`, etc.).
- **NUNCA** `Co-Authored-By`.

## FUERA DE ALCANCE

- **Widget FE Plan 22 Chat B** — este chat solo deja el endpoint BE. El widget FE va en un chat de frontend separado (Plan 22 Chat B reabierto una vez cerrado este).
- **Job IMAP para NDR asíncronos (bounces BCC invisibles)** — hallazgo del Chat 2.5, deuda separada. Ver memoria `project_bcc_bounces_not_detected.md`. Puede ser un Chat 2.7 BE o diferirse hasta que el problema crezca.
- **Alinear literales case-sensitive del `EmailOutboxWorker.cs:44`** — deuda técnica del Chat 2.5, no bloquea este chat.
- **Limpieza de datos de Director** (duplicado MEDALITH, "EL DIRECTOR ADMINISTRADOR" sospechoso, 6 directores sin correo) — hallazgos operativos del 2026-04-23, tema de data cleanup separado. No entra aquí.
- **Chat 3 OPS** (negociación hosting umbral `max_defer_fail_percentage`) — OPS, no código.
- **Chat 4 docs** (§18 `business-rules.md` con `INV-MAIL01/02/03/04` si aplica) — se hace después del Chat 3 OPS.
- **Modificar `EmailBlacklistService`, `EmailBounceBlacklistHandler`, `EmailOutboxWorker`, `EmailOutboxService`** — son de solo lectura para este chat.

## CRITERIOS DE CIERRE

```
PRE-WORK
[ ] Queries A/B/C ejecutadas y resultados reportados al usuario
[ ] Umbral confirmado (default 5 o negociado con hosting)
[ ] Shape del DTO confirmado explícitamente (o ajustado si el usuario propone cambios)

CÓDIGO
[ ] DTO DeferFailStatusDto.cs creado con los 4 records (status/current/24h/blacklist)
[ ] Interface + service implementados con 3 queries Task.WhenAll
[ ] Controller con [Authorize(Roles = Roles.Administrativos)] + [EnableRateLimiting("global")]
[ ] DI registrado
[ ] appsettings.json con Email:DeferFailThresholdPerHour = 5
[ ] Todos los archivos bajo 300 líneas
[ ] AsNoTracking() en todas las queries
[ ] ApiResponse<DeferFailStatusDto> en el endpoint

TESTS
[ ] ≥ 8 tests en EmailOutboxStatusServiceTests cubriendo los 8 casos listados
[ ] ≥ 4 tests en EmailOutboxStatusControllerAuthorizationTests (reflection)
[ ] Suite total ≥ 1265 verdes (baseline 1253 + ~12 nuevos)

VALIDACIÓN
[ ] dotnet build limpio (0 errores, warnings solo pre-existentes)
[ ] dotnet test verde
[ ] Endpoint manual test: GET /api/email-outbox/defer-fail-status autenticado como Director → 200 + DTO poblado
[ ] Endpoint manual test: sin auth → 401. Con rol Profesor → 403.

COMMIT
[ ] Un solo commit con mensaje sugerido (ver más abajo)
[ ] Mover 027-plan-29-chat-2-6-be-defer-fail-status-endpoint.md a educa-web/.claude/chats/closed/
[ ] Actualizar maestro.md Plan 29:
     - Inventario: progreso ~60% → ~70%
     - Foco: marcar Chat 2.6 cerrado, mover "Siguiente" a Chat 3 OPS y (Chat 4 docs después)
     - Gap (2) "DeferFailStatus" marcado ✅ cerrado
     - Deuda D4 marcada ✅ cerrada
     - Plan 22 Chat B desbloqueado: actualizar fila Plan 22 y/o el estado del widget
[ ] Actualizar maestro.md Plan 22 Chat B desbloqueado (widget FE ya puede consumir el endpoint)

POST-DEPLOY
[ ] Monitorear que el endpoint responda en < 500ms (3 queries son pequeñas, debe ser rápido)
[ ] Validar con el widget FE (Plan 22 Chat B) cuando se implemente que el shape es suficiente
```

## COMMIT MESSAGE sugerido

**Subject** (69 caracteres):

```
feat(email): Plan 29 Chat 2.6 — add "DeferFailStatus" endpoint for admin widget
```

**Body**:

```
Close Plan 29 Chat 2.6 BE — deuda D4 del Chat 2 cerrada.

Chat 2 del Plan 29 dejó la BD preparada para monitorear el techo
"max_defer_fail_percentage" de cPanel ("EmailOutbox" con estados
"FAILED_BLACKLISTED" / "FAILED_THROTTLE_HOST" / "FAILED" + tipos de
fallo discriminados) pero no expuso un endpoint. El widget FE del
Plan 22 Chat B quedó bloqueado porque consumir directamente las
tablas desde el frontend rompe encapsulamiento y acopla FE a BD.

Add new endpoint "GET /api/email-outbox/defer-fail-status"
([Authorize(Roles = Roles.Administrativos)], 4 roles) que devuelve
"DeferFailStatusDto" con:
 - "CurrentHour": contador de fallos que cruzaron al SMTP en la hora
   actual contra el threshold configurable ("Email:DeferFailThresholdPerHour"),
   calcula "Status" OK/WARNING/CRITICAL por bandas 0-60/60-100/100+.
 - "Last24h": breakdown por "EO_TipoFallo" (INVALID_ADDRESS,
   NO_EMAIL, BLACKLISTED, THROTTLE_HOST, OTHER).
 - "Blacklist": total activos + desglose por "EBL_MotivoBloqueo" +
   ventana temporal (oldest/newest).

Tests: +12 parametrizados ("EmailOutboxStatusServiceTests" con 8
casos de BD + "EmailOutboxStatusControllerAuthorizationTests" con
reflection sobre 4 roles + rechazos).

Suite BE: target ~1265 green (baseline 1253 from Chat 2.5).

Plan 22 Chat B unblocked — widget FE puede consumir este endpoint.

Nota: el DTO cuenta solo bounces síncronos. NDR asíncronos (BCC
rebotados post-aceptación SMTP) no entran — limitación conocida
documentada en Chat 2.5 del Plan 29.
```

## CIERRE

Feedback a pedir al usuario al cerrar el Chat 2.6:

1. **Shape del DTO** — ¿el shape propuesto cubre lo que el widget FE va a necesitar? Si el usuario ya tiene un mock/diseño del widget, confirmar que los campos están alineados. Si no, dejar el shape conservador y ajustar cuando el FE lo consuma.
2. **Performance real del endpoint** — las 3 queries están sobre índices existentes (`IX_EmailOutbox_FechaReg`, `IX_EmailBlacklist_Estado`). Si el endpoint tarda > 500ms con volúmenes reales, considerar cachear el DTO por 30s en memoria (no en este chat, deuda).
3. **Siguiente prioridad** — con el Chat 2.6 cerrado, ¿arrancamos Chat 3 OPS (negociación hosting) o Chat 4 docs (`INV-MAIL04` en `business-rules.md` §18)? O Plan 22 Chat B FE (widget)? Orden depende de prioridades del negocio.
4. **Hallazgos en los queries A/B/C** — si al correr el pre-work se detectan contadores raros (muchos `FAILED_THROTTLE_HOST`, blacklist creciendo rápido, etc.), reportar como señal de otros bugs aparte.