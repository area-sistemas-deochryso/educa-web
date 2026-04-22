> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo — todos los archivos tocados son BE. El `/design` (Chat 1) vive en `educa-web` pero la implementación es 100% Educa.API.
> **Plan**: 29 · **Chat**: 2 · **Fase**: `/execute` BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 29 Chat 2 BE — `EmailValidator` + `EmailBlacklist` + fix SSL handshake

## PLAN FILE

`../../educa-web/.claude/plan/maestro.md` → sección **"🔴 Plan 29 — Corte de cascada SMTP (`max_defer_fail_percentage`)"**, subsecciones **"Las 8 decisiones (Chat 1 cerrado 2026-04-22)"** e **"Invariantes a formalizar en Chat 4 (wording final cerrado 2026-04-22)"**.

Contexto colateral (leer solo si hace falta):

- `../../educa-web/.claude/plan/maestro.md` → **"🚨 Restricción crítica — Límites SMTP del hosting (cPanel)"** → subsección **"Contador 1 — `max_defer_fail_percentage`"**.
- Memoria: `C:\Users\Asus Ryzen 9\.claude\projects\c--Users-Asus-Ryzen-9-EducaWeb-educa-web\memory\project_smtp_defer_fail_block.md`.
- Chat anterior: `../../educa-web/.claude/chats/closed/024-plan-29-chat-1-design-corte-cascada-smtp.md` (las 8 decisiones con justificación).

## OBJETIVO

Implementar las 4 mitigaciones del Chat 1 que impiden que un correo inválido o un fallo propio agote el contador `max_defer_fail_percentage` (5/h) de cPanel: (a) validación de formato pre-encolado, (b) tabla `EmailBlacklist` con auto-insert tras 3 bounces permanentes, (c) fix SSL handshake en `EmailService` con feature flag de rollback, (d) saneamiento del Outbox existente (archivar `FAILED >30d`, sin purgar). Todo esto desbloquea Plan 22 Chat B (widget con `DeferFailStatus`) y reduce la pérdida silenciosa de correos legítimos en producción.

## PRE-WORK OBLIGATORIO

### Scripts SQL — mostrar al usuario ANTES de codificar

Los 3 scripts van al usuario para ejecución manual en Azure SQL **antes del merge del código**. Son idempotentes (pueden re-ejecutarse).

**Script 1 — `scripts/plan29-chat2-01-create-emailblacklist.sql`**

```sql
-- Idempotente: solo crea si no existe
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmailBlacklist')
BEGIN
    CREATE TABLE EmailBlacklist (
        EBL_CodID INT IDENTITY(1,1) PRIMARY KEY,
        EBL_Correo NVARCHAR(100) NOT NULL,
        EBL_MotivoBloqueo NVARCHAR(50) NOT NULL,  -- 'BOUNCE_5XX' | 'MANUAL' | 'BULK_IMPORT' | 'FORMAT_INVALID'
        EBL_IntentosFallidos INT NOT NULL DEFAULT 0,
        EBL_UltimoError NVARCHAR(500) NULL,
        EBL_FechaPrimerFallo DATETIME2 NULL,
        EBL_FechaUltimoFallo DATETIME2 NULL,
        EBL_Estado BIT NOT NULL DEFAULT 1,  -- 1 = bloqueado activo, 0 = despejado
        EBL_UsuarioReg NVARCHAR(50) NOT NULL,
        EBL_FechaReg DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        EBL_UsuarioMod NVARCHAR(50) NULL,
        EBL_FechaMod DATETIME2 NULL,
        EBL_RowVersion ROWVERSION NOT NULL,
        CONSTRAINT CK_EmailBlacklist_Motivo CHECK (EBL_MotivoBloqueo IN ('BOUNCE_5XX','MANUAL','BULK_IMPORT','FORMAT_INVALID'))
    );

    -- Índice único filtrado: solo un bloqueo activo por correo normalizado
    CREATE UNIQUE INDEX UX_EmailBlacklist_Correo_Activa
        ON EmailBlacklist(EBL_Correo) WHERE EBL_Estado = 1;

    -- Índice compuesto para lookup caliente de EnqueueAsync
    CREATE INDEX IX_EmailBlacklist_Correo_Estado
        ON EmailBlacklist(EBL_Correo, EBL_Estado) INCLUDE (EBL_MotivoBloqueo);
END
```

**Script 2 — `scripts/plan29-chat2-02-create-emailoutbox-archive.sql`**

```sql
-- Tabla gemela para archivar registros FAILED >30d (Decisión 8 — NO purgar, archivar)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmailOutbox_Archive')
BEGIN
    -- Clona esquema de EmailOutbox + columna EOA_FechaArchivo
    SELECT TOP 0 *, CAST(NULL AS DATETIME2) AS EOA_FechaArchivo
    INTO EmailOutbox_Archive
    FROM EmailOutbox;

    -- Indices de lookup forense
    CREATE INDEX IX_EmailOutbox_Archive_Destinatario
        ON EmailOutbox_Archive(EO_Destinatario) INCLUDE (EO_FechaReg, EO_UltimoError);
    CREATE INDEX IX_EmailOutbox_Archive_FechaReg
        ON EmailOutbox_Archive(EO_FechaReg DESC);
END
```

**Script 3 — `scripts/plan29-chat2-03-sanitize-outbox.sql`**

```sql
-- (a) PROCESSING huérfanos (worker murió) >2h → FAILED
UPDATE EmailOutbox
SET EO_Estado = 'FAILED',
    EO_UltimoError = 'Worker cleanup — huérfano al deploy Plan 29',
    EO_FechaMod = SYSUTCDATETIME()
WHERE EO_Estado = 'PROCESSING'
  AND EO_FechaReg < DATEADD(HOUR, -2, SYSUTCDATETIME());

-- (b) FAILED >30d → archivar + eliminar del Outbox activo
INSERT INTO EmailOutbox_Archive
SELECT *, SYSUTCDATETIME() AS EOA_FechaArchivo
FROM EmailOutbox
WHERE EO_Estado = 'FAILED'
  AND EO_FechaReg < DATEADD(DAY, -30, SYSUTCDATETIME())
  AND EO_CodID NOT IN (SELECT EO_CodID FROM EmailOutbox_Archive);

DELETE FROM EmailOutbox
WHERE EO_Estado = 'FAILED'
  AND EO_FechaReg < DATEADD(DAY, -30, SYSUTCDATETIME());
```

### Confirmar con el usuario antes de codificar

1. Feature flag `EmailService:TlsStrictMode` — default ¿`true` (fix activo)? ¿o `false` para rollout controlado con observación 24h antes de activar?
2. El campo `EOA_FechaArchivo` en el clon `SELECT TOP 0 *` puede fallar si `EmailOutbox` tiene columnas computadas — confirmar con `SELECT name, is_computed FROM sys.columns WHERE object_id = OBJECT_ID('EmailOutbox')` y ajustar si hace falta.
3. ¿Scripts SQL se ejecutan en este orden (1 → 2 → 3) o el usuario los corre en momentos distintos?

## ALCANCE

### Archivos a CREAR

| # | Archivo | Rol | Líneas est. |
|---|---------|-----|-------------|
| 1 | `Educa.API/Helpers/EmailHelper.cs` | Masking: `Mask("apoderado@gmail.com")` → `"a***o@gmail.com"` | ~30 |
| 2 | `Educa.API/Services/Notifications/EmailValidator.cs` | Regex + normalización (trim, lowercase, strip invisibles) | ~80 |
| 3 | `Educa.API/Models/Notifications/EmailBlacklist.cs` | Entidad EF Core con auditoría completa | ~45 |
| 4 | `Educa.API/Interfaces/Repositories/IEmailBlacklistRepository.cs` | Contrato | ~20 |
| 5 | `Educa.API/Repositories/Notifications/EmailBlacklistRepository.cs` | `AsNoTracking()` en lookup; transactional upsert | ~120 |
| 6 | `Educa.API/Interfaces/Services/IEmailBlacklistService.cs` | Contrato | ~20 |
| 7 | `Educa.API/Services/Notifications/EmailBlacklistService.cs` | Check + insert + despeje (manual o auto desde worker) | ~150 |
| 8 | `Educa.API/Controllers/Sistema/EmailBlacklistController.cs` | Solo `DELETE /api/sistema/email-blacklist/{correo}` | ~80 |
| 9 | `Educa.API/DTOs/Notifications/DespejarBlacklistResponseDto.cs` | `ApiResponse<T>` payload | ~15 |
| 10 | `Educa.API/Data/Configurations/EmailBlacklistConfiguration.cs` | Fluent API (índices, CHECK) si se prefiere sobre data annotations | ~40 |

### Archivos a MODIFICAR

| # | Archivo | Cambio | Impacto líneas |
|---|---------|--------|----------------|
| 11 | `Educa.API/Services/Notifications/EmailOutboxService.cs` | Hook en `EnqueueAsync`: validación formato + blacklist, rechaza silencioso con `LogWarning` (mask) | +25, respetar 300 ln |
| 12 | `Educa.API/Services/Notifications/EmailOutboxWorker.cs` (o nombre actual) | Detectar bounce permanente `5.x.x` tras fallo; tras 3 acumulados → transacción `INSERT EmailBlacklist + UPDATE EO_Estado='FAILED_BLACKLISTED'`. Keyword guard para `"exceeded the max defers"` → `'FAILED_THROTTLE_HOST'` sin imputar | +40, respetar 300 ln |
| 13 | `Educa.API/Services/Notifications/EmailService.cs` | TLS fix: `SecureSocketOptions.StartTls` + `SslProtocols.Tls12` mínimo; todo detrás de `EmailService:TlsStrictMode` (default `true`) | +20 |
| 14 | `Educa.API/Data/ApplicationDbContext.cs` | `DbSet<EmailBlacklist> EmailBlacklists` + `OnModelCreating` config si no usa archivo separado | +5 |
| 15 | `Educa.API/Program.cs` | DI: `IEmailBlacklistRepository` + `IEmailBlacklistService` + `EmailValidator` si es instanciable (puede ser static) | +3 |
| 16 | `Educa.API/appsettings.json` | `"EmailService": { "TlsStrictMode": true }` | +3 |
| 17 | `Educa.API/appsettings.Development.json` | Idem para dev | +3 |

### Tests a CREAR (suite BE)

| # | Archivo de test | Casos |
|---|----------------|-------|
| T1 | `Educa.API.Tests/Helpers/EmailHelperTests.cs` | Mask normal, mask corto (<3 chars), mask null/empty |
| T2 | `Educa.API.Tests/Services/Notifications/EmailValidatorTests.cs` | Ver "TESTS MÍNIMOS" más abajo |
| T3 | `Educa.API.Tests/Repositories/Notifications/EmailBlacklistRepositoryTests.cs` | Lookup case-insensitive, solo activos, upsert |
| T4 | `Educa.API.Tests/Services/Notifications/EmailBlacklistServiceTests.cs` | Insert con motivo, check, despeje |
| T5 | `Educa.API.Tests/Services/Notifications/EmailOutboxServiceEnqueueValidationTests.cs` | Rechazo formato, rechazo blacklist, mask en log |
| T6 | `Educa.API.Tests/Services/Notifications/EmailOutboxWorkerBlacklistTests.cs` | 3 bounces → insert; SSL no cuenta; auth no cuenta; "max defers" no cuenta |
| T7 | `Educa.API.Tests/Controllers/Sistema/EmailBlacklistControllerAuthorizationTests.cs` | Reflection test: solo `Director,Asistente Administrativo` (patrón Plan 21 `AsistenciaAdminControllerAuthorizationTests`) |

**Target total**: suite BE ≥ 1185 + ~35 nuevos = **~1220 verdes**.

## TESTS MÍNIMOS (detalle)

### `EmailValidator`

| Input | Esperado |
|-------|----------|
| `"apoderado@gmail.com"` | Válido; normaliza igual |
| `"  apoderado@gmail.com  "` | Válido; normaliza a `"apoderado@gmail.com"` |
| `"APODERADO@GMAIL.COM"` | Válido; normaliza a `"apoderado@gmail.com"` |
| `"Apo.Der-ado+filter@mail.co"` | Válido; normaliza a `"apo.der-ado+filter@mail.co"` |
| `"apoderado@gmail.com​"` (zero-width space) | **Inválido** (rechaza, no normaliza silenciosamente) |
| `"apoderado@gmail.com "` (NBSP) | **Inválido** |
| `"apoderado"` | Inválido (sin `@`) |
| `"apoderado@gmail"` | Inválido (sin TLD) |
| `"apo derado@gmail.com"` | Inválido (espacio interno) |
| `"@gmail.com"` | Inválido (local part vacío) |
| `"apoderado@"` | Inválido (dominio vacío) |
| `""` | Inválido |
| `null` | Inválido |

### `EmailBlacklistService.IsBlacklistedAsync`

| Setup | Input | Esperado |
|-------|-------|----------|
| `EBL_Correo = 'apoderado@gmail.com'`, `EBL_Estado = 1` | `"apoderado@gmail.com"` | `true` |
| Mismo | `"APODERADO@GMAIL.COM"` | `true` (normalizado) |
| `EBL_Correo = 'apoderado@gmail.com'`, `EBL_Estado = 0` | `"apoderado@gmail.com"` | `false` (despejado) |
| Sin fila | `"otro@gmail.com"` | `false` |

### `EmailOutboxWorker` auto-blacklist

| Historial del destinatario | Nuevo fallo | Esperado |
|---------------------------|-------------|----------|
| 2 fallos `550` previos | `550 - mailbox not found` | 3ro acumulado → **INSERT blacklist** + `EO_Estado='FAILED_BLACKLISTED'` en transacción |
| 2 fallos `550` previos | `SslHandshakeException` | SSL no cuenta → `EO_Estado='FAILED'` sin blacklist |
| 2 fallos `550` previos | `535 Incorrect authentication data` | Auth no cuenta → `EO_Estado='FAILED'` sin blacklist |
| 2 fallos `550` previos | `exceeded the max defers and failures per hour` | Throttle host no cuenta → `EO_Estado='FAILED_THROTTLE_HOST'` sin imputar al destinatario |
| 0 fallos previos | `550` | `EO_Estado='FAILED'` sin blacklist (contador = 1, no llega a 3) |

### Controller authz (reflection test)

Patrón idéntico a `Educa.API.Tests/Controllers/Asistencias/AsistenciaAdminControllerAuthorizationTests.cs` del Plan 21. Verifica por reflection que `EmailBlacklistController` tiene `[Authorize(Roles = "Director,Asistente Administrativo")]` y que roles `Profesor`, `Apoderado`, `Estudiante`, `Promotor`, `Coordinador Académico` son rechazados.

## REGLAS OBLIGATORIAS

### Invariantes aplicables

- **`INV-MAIL01`** — `EmailOutboxService.EnqueueAsync` valida regex + `EmailBlacklist.EBL_Estado = 1`; rechaza silencioso con `LogWarning(email enmascarado)`, sin crear registro en `EmailOutbox`.
- **`INV-MAIL02`** — Auto-blacklist tras ≥3 bounces `5.x.x` dentro de transacción. SSL handshake, timeouts, `535 auth fail` y `exceeded the max defers` **NO** cuentan.
- **`INV-MAIL03`** — La defensa son `INV-MAIL01/02`. El contador `5/h` es política fija del hosting, no configurable.
- **`INV-S07`** — Notificación fire-and-forget: un fallo al notificar al admin que se insertó un correo en blacklist NUNCA bloquea el insert.
- **`INV-S06`** — `IdempotencyMiddleware` ya cubre el `DELETE /api/sistema/email-blacklist/{correo}`.
- **`INV-ET01/02`** — Errores del controller persisten en `ErrorLog` (fire-and-forget); el middleware global los captura.
- **`INV-D02`** — Auditoría completa en `EmailBlacklist` (4 campos `UsuarioReg/FechaReg/UsuarioMod/FechaMod`).
- **`INV-D05`** — Queries read-only con `AsNoTracking()` en `EmailBlacklistRepository`.
- **`INV-D08`** — Endpoint retorna `ApiResponse<DespejarBlacklistResponseDto>`.

### Reglas de arquitectura (`rules/backend.md`)

- **300 líneas máximo por archivo `.cs`**. `EmailOutboxService` y `EmailOutboxWorker` ya están cerca del límite — NO inline validator ni lookup. Extraer a helpers si hace falta.
- Excepciones tipadas: `NotFoundException` en el `DELETE` si el correo no está en blacklist. NO retornar 404 manual.
- Envío de correos solo vía `IEmailOutboxService.EnqueueAsync` (regla del proyecto).
- Structured logging con placeholders, NUNCA interpolación:
  ```csharp
  _logger.LogWarning("Email rechazado por formato inválido: {Email}", EmailHelper.Mask(correo));
  ```
- Rate limiting: aplicar policy `global` al endpoint (default). NO necesita `heavy`.
- Migración SQL antes del merge (regla del proyecto): los 3 scripts del PRE-WORK se muestran al usuario y se ejecutan manualmente en Azure SQL antes del deploy del código.

### Reglas específicas del Chat 2

- **Feature flag `EmailService:TlsStrictMode`** en `appsettings` — `true` activa StartTls + TLS 1.2 mínimo; `false` vuelve al comportamiento actual. Rollback sin redeploy.
- **Transacción explícita** en el worker cuando el 3er bounce dispara blacklist: `INSERT EmailBlacklist` + `UPDATE EmailOutbox` en `TransactionScope` o `ExecutionStrategy.CreateExecutionStrategy()`.
- **Mask en TODOS los logs** que toquen `EO_Destinatario`. Ya existe `DniHelper.Mask` para DNIs — crear análogo `EmailHelper.Mask` para correos.
- **Idempotencia del backfill** — los 3 scripts SQL del PRE-WORK deben poder ejecutarse múltiples veces sin duplicar filas ni romper constraints. Validar con `WHERE NOT EXISTS` o `MERGE`.
- **Validación en el endpoint DELETE**: normalizar el correo del path antes del lookup; tolerar `apoderado@gmail.com`, `APODERADO@GMAIL.COM`, `  apoderado@gmail.com  ` como equivalentes.

## APRENDIZAJES TRANSFERIBLES (del Chat 1)

### Hallazgo estructural

El NDR de `durbyangelica19@gmail.com` del 2026-04-22 prueba que **Educa es el remitente del correo bloqueado, no CrossChex** (`From: Sistemas Educa <sistemas3@laazulitasac.com>`, subject `Registro de Entrada - CAYCHO RAMOS JULIO`, template HTML con banner `medylo.blob.core.windows.net`, helo `webwk000002`). Esto cambia la prioridad: **fix SSL handshake (Decisión 6) es lo que más impacto tiene sobre el contador `5/h`**, no cortar CrossChex.

### Query A (ejecutada 2026-04-22)

Retornó **0 destinatarios** con ≥3 bounces permanentes históricos. Esto significa:
- No hay backfill de `EmailBlacklist` al deploy — la tabla arranca vacía.
- El script de saneamiento (Decisión 8) se reduce a limpiar `PROCESSING` huérfanos + archivar `FAILED >30d`.
- Cualquier defensa de blacklist protege el futuro, no resuelve una cola de correos muertos acumulada.

### Flags del hosting (señal secundaria)

El NDR traía headers `X-ImunifyEmail-Filter-Info` con flags `IE_VL_PBL_DOMAIN_50`, `IE_VL_PBL_ACCOUNT_50`. Indica que el filtro antispam del hosting marca `laazulitasac.com` + `sistemas3` con reputación degradada. **NO es tarea del Chat 2**, pero si tras 48h el fix SSL no basta, es el siguiente frente a investigar (deuda D1 del maestro).

### Dispatch polimórfico sin impacto

El modelo polimórfico del Plan 21/28 (`TipoPersona = 'E' | 'P' | 'A'`) **NO afecta** el Chat 2 — los correos salen igual por `EmailOutboxService.EnqueueAsync` sea cual sea el tipo de persona. No hace falta ramificar por `TipoPersona` en el validador ni en el worker.

### Schema real de `EmailOutbox` (confirmado por queries del usuario en Chat 1)

Columnas en uso: `EO_CodID`, `EO_Destinatario`, `EO_Asunto`, `EO_Intentos`, `EO_UltimoError`, `EO_FechaReg`, `EO_Estado`, `EO_Tipo`, `EO_Remitente`, `EO_IntentosPorCuota` (del Plan 22 Chat A). Estados observados: `'SENT'`, `'FAILED'`, `'PROCESSING'`. El Chat 2 añade `'FAILED_BLACKLISTED'` y `'FAILED_THROTTLE_HOST'` — verificar si hay CHECK constraint en `EO_Estado` y expandirlo en los scripts SQL si existe.

### Tipos de error dominantes (del inventario del Chat 1)

1. `SslHandshakeException: An error occurred while attempting to establish an SSL or TLS connection` — **dominante reciente**, causa del defer/fail actual.
2. `535: Incorrect authentication data` — histórico, ya resuelto.
3. **NO hay `550`** en el Outbox actual → consistente con Query A = 0.

### Patrón `EmailOutbox_Archive`

La decisión 8 cerrada en Chat 1 fue **archivar, no purgar** — preserva trazabilidad forense (el NDR de hoy salió del Outbox; si hubiéramos purgado, no habríamos podido diagnosticar). Costo de almacenamiento despreciable.

## FUERA DE ALCANCE

- **Vista admin FE para `EmailBlacklist`** (listar, buscar, despejar). Es deuda D2 del maestro, queda para chat separado. Hoy solo endpoint `DELETE`.
- **Validador en form de creación/edición de Estudiante/Profesor** (deuda D3). Hoy solo pre-outbox.
- **Widget Plan 22 Chat B con `DeferFailStatus`** (deuda D4). El Chat 2 BE deja los agregados listos para que Chat B consuma, pero el widget FE se implementa aparte.
- **Coordinación OPS con CrossChex** (Chat 3 Plan 29, inspección-only). No se toca nada del dispositivo biométrico.
- **§18 en `business-rules.md`** con `INV-MAIL01/02/03`. Ese wording va en Chat 4 Plan 29 (docs). El Chat 2 **NO** edita `business-rules.md`.
- **Modificaciones a `EmailOutboxWorker` fuera del hook de blacklist + keyword guard**. El throttle saliente Plan 22 F5/F6 ya está en producción y no se toca.
- **Migrar a SMTP externo** (SendGrid/Mailgun/SES). Decisión de más alto nivel, fuera del Plan 29.
- **Consolidación de la tabla `Apoderado`** (está vacía pero no se toca).

## CRITERIOS DE CIERRE

```
PRE-DEPLOY
[ ] Los 3 scripts SQL mostrados al usuario ANTES de mergear código
[ ] Usuario confirma ejecución en Azure SQL de los 3 scripts
[ ] Usuario responde las 3 preguntas del PRE-WORK (default TlsStrictMode, columnas computadas, orden de scripts)

CÓDIGO
[ ] 10 archivos creados según tabla de ALCANCE
[ ] 7 archivos modificados, ninguno supera 300 líneas (verificar con `Get-Content .\archivo.cs | Measure-Object -Line`)
[ ] `EmailHelper.Mask` usado en TODOS los logs que tocan `EO_Destinatario` (grep `LogWarning.*email\|correo` para auditar)
[ ] Feature flag `EmailService:TlsStrictMode` en appsettings + appsettings.Development con default `true`

TESTS
[ ] 7 archivos de test creados
[ ] Suite BE total ~1220 verdes (baseline 1185 + ~35 nuevos)
[ ] `EmailBlacklistControllerAuthorizationTests` rechaza 5 roles no admin (Profesor, Apoderado, Estudiante, Promotor, Coord Académico)
[ ] Test manual desde staging: enviar 3 correos a inbox de prueba del dev, ver llegada sin SslHandshakeException

VALIDACIÓN
[ ] `dotnet build` limpio en Educa.API
[ ] `dotnet test` sin fallos
[ ] Grep `Task.Run\|async void` en archivos nuevos para evitar ObjectDisposedException con scoped services (regla del proyecto)
[ ] Confirmar que `EmailOutboxService.EnqueueAsync` sigue funcionando para remitentes Plan 22 multi-sender

COMMIT
[ ] Commit con mensaje sugerido (ver más abajo)
[ ] Mover `025-plan-29-chat-2-be-email-validator-blacklist-ssl-fix.md` a `educa-web/.claude/chats/closed/`
[ ] Actualizar `maestro.md` Plan 29: celda inventario + Foco + Estado + marcar Chat 2 cerrado
[ ] Actualizar `maestro.md` Plan 22 Chat B (deuda D4): indicar que los agregados `DeferFailStatus` quedan listos para consumo FE

POST-DEPLOY (observación 48-72h)
[ ] 0 `SslHandshakeException` en `EmailOutbox` durante 48h
[ ] 0 bloqueos del dominio (no aparecen NDRs con `exceeded the max defers and failures per hour`)
[ ] Monitorear `EmailBlacklist` — si arranca a llenarse sin control, revisar umbral de 3 (Decisión 3)
```

## COMMIT MESSAGE sugerido

Un solo commit al cerrar Chat 2 (respeta skill `commit`: inglés imperativo, español entre `"..."` solo para términos de dominio, sin `Co-Authored-By`):

**Subject** (67 caracteres):

```
feat(email): Plan 29 Chat 2 — pre-outbox validator + blacklist + SSL fix
```

**Body**:

```
Close Plan 29 Chat 2 BE with the 4 mitigations against cPanel
"max_defer_fail_percentage" (5 defers+fails/h per domain).

Ship order:
1. "EmailValidator" + "EmailHelper.Mask" helpers (pure, ~80 + ~30 lines).
2. "EmailBlacklist" entity + repository + service + "DELETE" controller
   with "[Authorize(Roles = 'Director,Asistente Administrativo')]".
3. "EmailOutboxService.EnqueueAsync" hook: reject format-invalid or
   blacklisted recipients silently with "LogWarning" (masked email).
4. "EmailOutboxWorker" hook: after 3 permanent "5.x.x" bounces, insert
   into "EmailBlacklist" within transaction, mark "EO_Estado" as
   "FAILED_BLACKLISTED". SSL handshake, "535 auth", timeouts, and Exim
   "exceeded the max defers" do NOT count toward the threshold.
5. "EmailService" TLS fix behind feature flag "EmailService:TlsStrictMode"
   (default true): "SecureSocketOptions.StartTls" + "SslProtocols.Tls12".
6. Pre-deploy SQL scripts (manual execution): create "EmailBlacklist",
   create "EmailOutbox_Archive", sanitize outbox (archive "FAILED" >30d,
   NO purge — preserve forensic trail).

Invariants "INV-MAIL01/02/03" enforced in code; wording goes to
"business-rules.md" section 18 in Chat 4 docs.

Tests: +~35 across 7 new test files (validator, helper, repo, service,
outbox hook, worker auto-blacklist, controller authz).

Suite BE target ~1220 green (baseline 1185).

Plan 22 Chat B unblocked — "DeferFailStatus" aggregates ready for widget.
```

## CIERRE

Feedback a pedir al usuario al cerrar el Chat 2:

1. **Feature flag `TlsStrictMode`** — ¿queda en `true` en prod desde el primer deploy, o se hace rollout con `false` observando 24h antes de activar? El default del brief es `true` (fix activo) — confirmar si se ajusta.
2. **Umbral de 3 bounces (Decisión 3)** — tras 48-72h de telemetría post-deploy, ¿se mantiene en 3 o se ajusta? Depende de la cadencia real de bounces que se observe.
3. **Deuda D4 (widget `DeferFailStatus`)** — ¿Chat B del Plan 22 se retoma inmediatamente al cerrar Chat 2, o se espera 48-72h de observación para ajustar el shape del agregado?
4. **Chat 3 OPS (inspección CrossChex)** — ¿se hace en paralelo al deploy del Chat 2 o después? Dado que es inspección-only, puede ir en paralelo sin riesgo.
5. **Chat 4 docs (§18 `business-rules.md`)** — confirmar que el wording final queda como está en el maestro (líneas cerradas en Chat 1) o si la experiencia de implementación sugiere ajustes.
