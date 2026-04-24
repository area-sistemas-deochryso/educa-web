> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 31 · **Chat**: 1 · **Fase**: F1.BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 31 Chat 1 — Foundation del Bounce Parser asíncrono

## PLAN FILE

Cola del maestro: `../../educa-web/.claude/plan/maestro.md` → sección `📋 Próximos 3 chats (cola ordenada)`, item #1.

Plan 31 fue diseñado en chat dedicado el 2026-04-24. No hay archivo de plan dedicado — el alcance completo está en este brief y en `business-rules.md §18 + §15.14` (donde Chat 3 agregará INV-MAIL05).

## OBJETIVO

Habilitar correlación NDR↔`EO_CodID` para que el `BounceParserService` del Chat 2 pueda matchear bounces asíncronos con el registro original del outbox. Tres cambios atómicos:

1. **Schema BD** — actualizar el modelo `EmailOutbox` con las 2 columnas nuevas que ya están en BD (`EO_BounceSource`, `EO_BounceDetectedAt`).
2. **Header custom** — `EmailService.BuildMimeMessage` inyecta `X-Educa-Outbox-Id: {EO_CodID}` cuando el `Email` lo trae, y `EmailOutboxWorker` lo setea en cada envío.
3. **Refactor handler** — `EmailBounceBlacklistHandler` se split en 2 métodos para que el parser IMAP (Chat 2) lo pueda invocar sin construir Excepciones sintéticas.

Sin scope de funcionalidad nueva visible. El usuario no ve nada nuevo después de este chat — pero el Chat 2 queda desbloqueado para construir el parser.

## PRE-WORK OBLIGATORIO — YA EJECUTADO POR EL USUARIO

✅ **Script SQL en Azure SQL** (ejecutado 2026-04-24, NO repetir):

```sql
ALTER TABLE EmailOutbox ADD EO_BounceSource NVARCHAR(20) NULL;
ALTER TABLE EmailOutbox ADD EO_BounceDetectedAt DATETIME2 NULL;

UPDATE EmailOutbox
SET EO_BounceSource = 'sync'
WHERE EO_TipoFallo IN ('FAILED_INVALID_ADDRESS', 'FAILED_MAILBOX_FULL', 'FAILED_REJECTED', 'FAILED_BLACKLISTED');

CREATE INDEX IX_EmailOutbox_BounceSource ON EmailOutbox(EO_BounceSource) WHERE EO_BounceSource IS NOT NULL;
```

✅ **Env vars Azure App Services** (ya configuradas, NO requieren acción en Chat 1 — las consume Chat 2):

```
Email__BounceParser__Enabled=true
Email__BounceParser__PollingIntervalMinutes=5
Email__BounceParser__FoldersToScan__0=INBOX
Email__BounceParser__FoldersToScan__1=INBOX.Junk
Email__BounceParser__FoldersToScan__2=INBOX.Trash
Email__BounceParser__ProcessedFolderName=Processed
Email__BounceParser__FallbackMatchWindowMinutes=120
Email__BounceParser__MaxNdrsPerBuzonPerCycle=50
```

✅ **Tabla `BounceParserProcessed`** (creada 2026-04-24, la usa Chat 2 — no aplica acá):

```sql
CREATE TABLE BounceParserProcessed (
    BPR_CodID BIGINT IDENTITY(1,1) NOT NULL,
    BPR_MessageId NVARCHAR(500) NOT NULL,
    BPR_Buzon NVARCHAR(200) NOT NULL,
    BPR_Folder NVARCHAR(100) NOT NULL,
    BPR_EmailOutboxId BIGINT NULL,
    BPR_CorrelationSource NVARCHAR(20) NOT NULL,
    BPR_NdrStatusCode NVARCHAR(10) NULL,
    BPR_Destinatario NVARCHAR(200) NULL,
    BPR_ProcessedAt DATETIME2 NOT NULL,
    BPR_FechaReg DATETIME2 NOT NULL,
    CONSTRAINT PK_BounceParserProcessed PRIMARY KEY (BPR_CodID)
);
CREATE UNIQUE INDEX IX_BounceParserProcessed_MessageId ON BounceParserProcessed(BPR_MessageId);
CREATE INDEX IX_BounceParserProcessed_EmailOutboxId ON BounceParserProcessed(BPR_EmailOutboxId) WHERE BPR_EmailOutboxId IS NOT NULL;
CREATE INDEX IX_BounceParserProcessed_ProcessedAt ON BounceParserProcessed(BPR_ProcessedAt);
```

## ALCANCE

### Archivos a MODIFICAR (5)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `Educa.API/Models/Sistema/EmailOutbox.cs` | Agregar 2 propiedades nullable: `EO_BounceSource` (string?, max 20) y `EO_BounceDetectedAt` (DateTime?). NO requiere migration manual — la BD ya tiene las columnas. ~10 líneas |
| 2 | `Educa.API/Models/Comunicacion/Email.cs` | Agregar `public long? OutboxId { get; set; }` (nullable porque el legacy `SendEmailAsync` no lo setea). ~3 líneas |
| 3 | `Educa.API/Services/Integraciones/EmailService.cs` (`BuildMimeMessage`) | Si `request.OutboxId.HasValue` → `message.Headers.Add("X-Educa-Outbox-Id", request.OutboxId.Value.ToString(CultureInfo.InvariantCulture))`. ~5 líneas. Constante para el nombre del header en una clase nueva (ver siguiente bullet) |
| 4 | `Educa.API/Services/Notifications/EmailOutboxWorker.cs` (línea ~155 dentro de `ProcessSingleEmailAsync`, donde construye el `Email`) | Setear `OutboxId = entry.EO_CodID` al construir el `Email`. ~2 líneas |
| 5 | `Educa.API/Services/Notifications/EmailBounceBlacklistHandler.cs` | **Refactor**: split del método actual `HandleAsync` en 2 públicos. Ver detalle abajo. ~80-100 líneas tocadas |

### Archivos a CREAR (1)

| # | Archivo | Contenido |
|---|---------|-----------|
| 6 | `Educa.API/Constants/Sistema/BounceParserConstants.cs` | Constantes compartidas Chat 1↔Chat 2: `OutboxIdHeaderName = "X-Educa-Outbox-Id"`, `BounceSourceSync = "sync"`, `BounceSourceAsyncImap = "async-imap"`. ~20 líneas |

### Refactor de `EmailBounceBlacklistHandler` (detalle)

El método actual `HandleAsync(EmailOutbox, Exception, string, CT)` mezcla 3 responsabilidades:

1. Guards SSL/Auth/ThrottleHost (requieren `Exception` típicamente)
2. Verificación de bounce permanente (puro texto: `tipoFalloClassified`)
3. Lookup de bounces históricos + escritura en blacklist

El parser IMAP del Chat 2 NO tiene `Exception` — solo el texto del NDR. Necesita invocar (2)+(3) sin pasar por (1).

**Split propuesto** (2 métodos públicos):

```csharp
// Mantenido para EmailOutboxWorker — entry point con Exception
public async Task<HandleResult> HandleSyncFailureAsync(
    EmailOutbox entry,
    Exception ex,
    string tipoFalloClassified,
    CancellationToken ct = default)
{
    // 1) Guards: throttle host (text match en ex.Message)
    // 2) Guards: SSL handshake (ex type)
    // 3) Guards: auth 535 (ex type + text)
    //    → todos returnan early con HandleResult correspondiente
    // 4) Si pasa los guards → delega a HandleBounceAsync
    return await HandleBounceAsync(
        entry,
        destinatario: entry.EO_Destinatario,
        errorMessage: ex.Message ?? string.Empty,
        tipoFalloClassified,
        bounceSource: BounceParserConstants.BounceSourceSync,
        ct);
}

// Nuevo — para parser IMAP del Chat 2
public async Task<HandleResult> HandleBounceAsync(
    EmailOutbox entry,
    string destinatario,
    string errorMessage,
    string tipoFalloClassified,
    string bounceSource, // "sync" | "async-imap"
    CancellationToken ct = default)
{
    // Lógica actual de líneas 100-144: chequea TiposBouncePermanente,
    // cuenta bounces históricos, alimenta blacklist al 3er bounce.
    // Setea entry.EO_BounceSource = bounceSource y EO_BounceDetectedAt = PeruNow()
    //   cuando muta el entry.
}
```

**Razones del split**:

- `HandleSyncFailureAsync` mantiene 100% del comportamiento actual del worker — no requiere cambios en el worker más allá de renombrar la llamada.
- `HandleBounceAsync` es agnóstico de Exception — el parser IMAP del Chat 2 lo invoca con datos del NDR sin construir excepciones sintéticas.
- `bounceSource` parametrizado permite que el mismo método marque correctamente el origen.
- `entry.EO_BounceDetectedAt` se setea solo cuando el handler muta el entry (alimenta blacklist o actualiza tipo) — no para todos los fallos.

**Contrato preservado** (regression check obligatorio):

- El método actual `HandleAsync` queda como `[Obsolete]` o se elimina y el worker llama directamente `HandleSyncFailureAsync`. Decisión del chat: si los tests existentes aún usan `HandleAsync`, hacer alias temporal con `[Obsolete]`. Si solo el worker lo usa, eliminar y migrar el worker.
- `HandleResult` record sigue igual.
- El text matching para `"exceeded the max defers"` sigue dentro de `HandleSyncFailureAsync`.
- `EmailBlacklist` schema sin cambios.

## TESTS MÍNIMOS

| # | Test | Input | Resultado esperado |
|---|------|-------|--------------------|
| 1 | `Email` model serialización | `new Email { To = "x", OutboxId = 12345 }` | Sin error de compilación, OutboxId accesible |
| 2 | `BuildMimeMessage` con OutboxId | `Email { OutboxId = 12345 }` → `BuildMimeMessage(...)` | `MimeMessage.Headers["X-Educa-Outbox-Id"] == "12345"` |
| 3 | `BuildMimeMessage` sin OutboxId | `Email { OutboxId = null }` → `BuildMimeMessage(...)` | `MimeMessage.Headers["X-Educa-Outbox-Id"]` es null/ausente — NO romper envíos legacy |
| 4 | `EmailOutboxWorker` setea OutboxId | Mock de `IEmailService.SendEmailOnceAsync` que captura el `Email` recibido + worker procesando un `EmailOutbox` con `EO_CodID = 999` | `capturedEmail.OutboxId == 999` |
| 5 | `HandleSyncFailureAsync` — comportamiento idéntico al `HandleAsync` actual para throttle | `SmtpException("exceeded the max defers and failures per hour")` | `entry.EO_Estado == "FAILED_THROTTLE_HOST"`, `OutboxEntryWasMutated = true` |
| 6 | `HandleSyncFailureAsync` — SSL handshake | `SslHandshakeException(...)` | Retorna `OutboxEntryWasMutated = false`, NO llama lookup de bounces |
| 7 | `HandleSyncFailureAsync` — bounce permanente al 3er intento | Mock 2 `EmailOutbox` históricos con `FAILED_INVALID_ADDRESS` para mismo destinatario + nuevo entry | Llama a `HandleBounceAsync` con `bounceSource="sync"`, `entry.EO_Estado == "FAILED_BLACKLISTED"`, `EO_BounceSource == "sync"`, `EO_BounceDetectedAt != null`, fila nueva en `EmailBlacklist` |
| 8 | `HandleBounceAsync` directo (simulación de invocación desde Chat 2) | Sin Exception, datos del NDR como params, mock 2 bounces históricos | `entry.EO_Estado == "FAILED_BLACKLISTED"`, `EO_BounceSource == "async-imap"`, `EO_BounceDetectedAt != null`, fila nueva en `EmailBlacklist` |
| 9 | `HandleBounceAsync` — primer bounce (no llega al umbral) | Sin históricos | `entry.EO_BounceSource == "async-imap"`, `OutboxEntryWasMutated = false` (no muta estado, solo registra source/timestamp si es desde Chat 2 — decisión a tomar en chat: ¿registrar source siempre o solo cuando alimenta blacklist?) |

**Decisión abierta del Chat 1**: en test #9, ¿`HandleBounceAsync` con bounce no-permanente (1er o 2do) muta `EO_BounceSource`/`EO_BounceDetectedAt` o no?

**Recomendación**: SÍ mutar — la fuente de detección es información valiosa aunque no dispare blacklist. Refleja "este bounce fue visto por el parser IMAP" para auditoría posterior. El `OutboxEntryWasMutated` del result se mantiene `true` para que el worker/parser sepa que hubo cambio (aunque no de estado terminal).

## REGLAS OBLIGATORIAS

### Backend (`backend.md`)

- ✅ **300 líneas máximo por archivo `.cs`** — `EmailBounceBlacklistHandler` post-refactor probablemente queda en ~250 líneas. Si supera, partial class con `.SyncFailure.cs` + `.Bounce.cs` (siguiendo patrón del `EmailOutboxWorker.Sender.cs` ya existente).
- ✅ **DTOs/modelos con `[StringLength]`** — `EO_BounceSource` `[StringLength(20)]`.
- ✅ **Strings nullable inicializadas con `= ""` solo si NO son nullable** — `EO_BounceSource` es `string?`, NO inicializar.
- ✅ **Structured logging** — `_logger.LogInformation("...{OutboxId}...{BounceSource}...", entry.EO_CodID, source)`. Sin string interpolation.
- ✅ **No usar `ex.Message` en respuestas API ni DTOs** — solo en `ILogger`. Aplica al `errorMessage` que se persiste en `EBL_UltimoError` (ya truncado a 500 chars en código actual).

### Invariantes (`business-rules.md`)

- ✅ **INV-MAIL01** (validación pre-encolado) — no afectada.
- ✅ **INV-MAIL02** (auto-blacklist al 3er bounce 5.x.x) — **comportamiento preservado** post-refactor. El test #7 lo verifica.
- ✅ **INV-MAIL03** (techo cPanel) — sin cambio.
- ✅ **INV-MAIL04** (monitoreo defer/fail) — sin cambio.
- ✅ **INV-D02** (auditoría) — no aplica al refactor (ya cubierto en `EmailBlacklist`).
- ✅ **INV-D04** (timezone Perú) — `EO_BounceDetectedAt = DateTimeHelper.PeruNow()`.
- ✅ **INV-D08** (`ApiResponse<T>`) — no aplica (sin endpoints nuevos).
- ✅ **INV-S07** (fire-and-forget) — el header inyectado falla solo si `request.OutboxId` lanza excepción (imposible con primitivo). Sin cambios al pattern.
- ⏳ **INV-MAIL05** se formaliza en Chat 3 FE/docs, NO en este chat. Pero la columna `EO_BounceSource` que agregamos acá es la base sobre la que se enuncia.

### Tests

- ✅ Cobertura de los 9 casos arriba — ningún test existente debe romperse.
- ✅ Si los tests existentes de `EmailBounceBlacklistHandler.HandleAsync` rompen por el rename, actualizarlos al nombre nuevo (`HandleSyncFailureAsync`) — son refactor, no funcional.
- ✅ Tests de `EmailOutboxWorker` que mockean el handler probablemente no rompen (siguen llamando al handler vía DI).

## APRENDIZAJES TRANSFERIBLES (del chat de diseño)

### Estructura del repo backend

- Backend está en `c:\Users\Asus Ryzen 9\EducaWeb\Educa.API\Educa.API\` (carpeta nested — el repo raíz tiene una subcarpeta del mismo nombre).
- El `EmailOutbox` model NO usa `EO_RowVersion` para optimistic concurrency en el outbox (sí lo tiene declarado, pero el flujo del worker no lo aprovecha hoy). No agregar lógica de RowVersion en este chat — fuera de alcance.
- `DateTimeHelper.PeruNow()` está en `Educa.API.Helpers.Formatting` — usar siempre, no `DateTime.Now`.

### Patrón existente que se reutiliza

- **Partial class para mantener < 300 líneas**: ver `EmailOutboxWorker.cs` (~298) + `EmailOutboxWorker.Sender.cs` (~107). Si `EmailBounceBlacklistHandler` post-refactor pasa de 300, replicar el patrón.
- **`SmtpErrorClassifier.Classify(Exception)` existe** y devuelve `(tipoFallo, shouldRetry)`. Tiene constantes públicas `FailedInvalidAddress`, `FailedMailboxFull`, `FailedRejected`, etc. Reutilizar — NO duplicar la clasificación.
- **`EmailHelper.Mask(email)` y `DniHelper.Mask(dni)` existen** — usarlos en logs (regla INV-MAIL01 + memoria del proyecto).

### Riesgos detectados (mitigaciones para el chat)

- **Tests existentes pueden tener mocks específicos del nombre `HandleAsync`** — buscar `HandleAsync` en `Educa.API.Tests/` antes de eliminar el método actual. Si hay 5+ tests, mantener un alias `[Obsolete]` que delegue a `HandleSyncFailureAsync` en lugar de cambiar 5+ tests.
- **El método `EmailService.SendEmailAsync` legacy (no `SendEmailOnceAsync`)** sigue vivo para tests manuales. NO setea `OutboxId` y eso está bien — los correos enviados por `SendEmailAsync` no son rastreados por outbox de todas formas. No agregar lógica defensive ahí.
- **`Email.OutboxId` es nullable a propósito** — no romper envíos del path legacy ni de tests que construyen `Email` sin saber del outbox. El header solo se inyecta cuando hay valor.

### No-decisiones — esto YA está decidido

- ✅ Header name: `X-Educa-Outbox-Id` (constante en `BounceParserConstants.OutboxIdHeaderName`).
- ✅ Carpeta IMAP de procesados: `Processed` (no `Procesados`, no `BouncesHandled`). Configurable por env var `Email__BounceParser__ProcessedFolderName`.
- ✅ Cron del job: `*/5 * * * *` (cada 5 min) — pero esto se implementa en Chat 2, no acá.
- ✅ `EO_BounceSource` valores: `'sync'` | `'async-imap'` (NO `'imap'`, NO `'async'`).

## FUERA DE ALCANCE

- ❌ **NO crear `BounceParserService`, `Ndr3464Parser`, `BounceCorrelator`, `BounceParserJob`** — son del Chat 2.
- ❌ **NO registrar el job en `HangfireExtensions`** — Chat 2.
- ❌ **NO crear modelo `BounceParserProcessed`** ni `DbSet<>` ni Fluent API — Chat 2 (la tabla en BD ya existe pero el código que la usa va en Chat 2).
- ❌ **NO modificar `EmailDashboardDiaService`** ni agregar campos al DTO `EmailDashboardResumen` — Chat 3 FE.
- ❌ **NO documentar INV-MAIL05** en `business-rules.md` — Chat 3.
- ❌ **NO crear widget FE de "bounces async vs sync"** — Chat 3.
- ❌ **NO tocar `appsettings.json`** — la config del parser ya está en env vars de Azure y se bindeará en Chat 2 cuando exista la sección `EmailSettings.BounceParser`.
- ❌ **NO migrar `EmailService.SendEmailAsync` (path legacy)** — solo `SendEmailOnceAsync` y el `BuildMimeMessage`.

## CRITERIOS DE CIERRE

```
[ ] Modelo EmailOutbox actualizado con EO_BounceSource + EO_BounceDetectedAt
[ ] Email.OutboxId agregado (nullable)
[ ] EmailService.BuildMimeMessage inyecta X-Educa-Outbox-Id cuando OutboxId.HasValue
[ ] EmailOutboxWorker setea OutboxId = entry.EO_CodID en cada envío
[ ] BounceParserConstants.cs creado con 3 constantes
[ ] EmailBounceBlacklistHandler refactorizado (split en HandleSyncFailureAsync + HandleBounceAsync)
[ ] Worker actualizado al nuevo nombre del handler
[ ] 9 tests del checklist pasan en verde (incluido test #9 con la decisión tomada)
[ ] Tests existentes del handler/worker siguen pasando (rename ajustado si aplica)
[ ] dotnet build sin warnings nuevos
[ ] dotnet test verde
[ ] Archivo NO supera 300 líneas (handler post-refactor) — si supera, partial class
[ ] Verificar manualmente en Roundcube post-deploy: enviar correo de prueba (ej: test del notificador) → revisar headers del correo en carpeta Sent → confirmar que aparece "X-Educa-Outbox-Id: NNN"
[ ] Memoria nueva en `~/.claude/projects/.../memory/` documentando que el header está activo (clave para Chat 2: el parser puede asumir presencia del header en correos del deploy en adelante)
[ ] Actualizar Foco del maestro con cierre del chat + commit hash
[ ] Mover este archivo a educa-web/.claude/chats/closed/ al cerrar el chat
```

## COMMIT MESSAGE sugerido

Solo un commit (todo el chat es un cambio atómico de "preparación foundation"):

```
feat(email-outbox): foundation for async bounce detection

- Add "EO_BounceSource" and "EO_BounceDetectedAt" columns to EmailOutbox
  model (DB schema deployed 2026-04-24)
- Add nullable OutboxId to Email model + inject as "X-Educa-Outbox-Id"
  header in EmailService.BuildMimeMessage
- EmailOutboxWorker sets OutboxId on every send to enable correlation
- Split EmailBounceBlacklistHandler into HandleSyncFailureAsync (worker
  entry, keeps Exception guards) + HandleBounceAsync (Exception-agnostic,
  for IMAP parser of Chat 2)
- Preserves INV-MAIL02 behavior (auto-blacklist at 3rd 5.x.x bounce);
  test coverage extended to verify both sync and async invocation paths

Plan 31 Chat 1 — foundation only. No user-visible changes. Unblocks
Chat 2 (BounceParserService) by giving the parser a stable header to
correlate NDRs with "EO_CodID" and a clean handler API.
```

Validar que cumple `commit` skill: subject 56 chars ≤ 72 ✅, inglés imperativo ✅, español solo entre `"..."` (`"EO_BounceSource"`, `"X-Educa-Outbox-Id"`, `"EO_CodID"`) ✅, sin Co-Authored-By ✅.

## CIERRE

Pedir feedback del usuario sobre:

1. **Decisión del test #9** — ¿`HandleBounceAsync` muta `EO_BounceSource` aunque no llegue a alimentar blacklist? (recomendación: SÍ).
2. **Manejo de tests legacy del handler** — si encontraste 5+ tests usando `HandleAsync`, ¿alias `[Obsolete]` o cambio masivo?
3. **Verificación manual del header en Roundcube** — confirmar que el usuario lo verificó post-deploy (importante para validar que cPanel/Exim no strippea el header — premisa del Chat 2).
4. **Tiempo entre Chat 1 y Chat 2** — recomendar al usuario esperar 24-48h entre deploys para acumular correos en producción con el header inyectado, así Chat 2 tiene NDRs reales con `X-Educa-Outbox-Id` para validar el correlator.