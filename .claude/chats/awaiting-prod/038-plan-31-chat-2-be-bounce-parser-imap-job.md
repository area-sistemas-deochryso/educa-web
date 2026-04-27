> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 31 · **Chat**: 2 · **Fase**: F2.BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 31 Chat 2 — Parser IMAP de bounces asíncronos + Hangfire job

## PLAN FILE

Cola del maestro: `../../educa-web/.claude/plan/maestro.md` → sección `📋 Próximos 3 chats (cola ordenada)`, item #1.

Plan 31 fue diseñado en chat dedicado el 2026-04-24. Este chat es la pieza central — Chat 1 (foundation, commit `c46dfa0`) ya desplegó las precondiciones. Chat 3 (FE widget + INV-MAIL05) depende de este.

## OBJETIVO

Detectar bounces asíncronos leyendo NDRs (Non-Delivery Reports) que llegan a las bandejas IMAP de los 7 buzones del pool, correlacionarlos con el `EmailOutbox` original, y aplicar la política INV-MAIL02 (auto-blacklist al 3er bounce 5.x.x). Cierra el gap actual donde `MailKit` marca `SENT` aunque el correo rebote después (ver memoria `project_bcc_bounces_not_detected`).

Sin esto, el dashboard "Visibilidad de Correos" miente: `SENT` no garantiza entrega. El parser IMAP es la única forma de detectar bounces post-send con cPanel/Exim compartido.

## PRE-WORK YA EJECUTADO POR EL USUARIO (2026-04-24, NO repetir)

✅ **Tabla `BounceParserProcessed`** creada en Azure SQL:

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

✅ **Env vars en Azure App Services** ya configuradas:

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

✅ **Foundation del Chat 1 desplegado** (commit `c46dfa0`):
- Header `X-Educa-Outbox-Id` se inyecta en cada envío del worker.
- `EmailOutbox.EO_BounceSource` y `EO_BounceDetectedAt` ya en el modelo + columnas BD.
- `EmailBounceBlacklistHandler.HandleBounceAsync(entry, destinatario, errorMessage, tipoFalloClassified, bounceSource, ct)` ya existe — entry point agnóstico de `Exception`.
- Constantes `BounceParserConstants.OutboxIdHeaderName`, `BounceSourceAsyncImap` ya en `Constants/Sistema/`.

⚠️ **Validación pendiente** (pedir al usuario al arrancar): ¿se confirmó en Roundcube que un correo de prueba post-deploy del Chat 1 muestra `X-Educa-Outbox-Id: NNN` en headers de la carpeta `Sent`? Si cPanel/Exim lo strippea, hay que cambiar a un header preservado (ej: `Message-ID` custom) ANTES de codificar este chat. Sin esa confirmación, el correlator estrategia 1 no funcionará.

## ALCANCE

### Archivos a CREAR (≥ 7)

| # | Archivo | Rol | Líneas est. |
|---|---------|-----|-------------|
| 1 | `Educa.API/Models/Sistema/BounceParserProcessed.cs` | Entidad EF para tabla de idempotencia | ~50 |
| 2 | `Educa.API/Models/Sistema/BounceParserSettings.cs` | Sub-config (`Email:BounceParser`) — `Enabled`, `PollingIntervalMinutes`, `FoldersToScan[]`, `ProcessedFolderName`, `FallbackMatchWindowMinutes`, `MaxNdrsPerBuzonPerCycle` | ~40 |
| 3 | `Educa.API/Services/Notifications/Ndr3464Parser.cs` | **Puro**: parsea `MimeMessage` (NDR multipart/report) y devuelve `NdrParsedResult` con destinatario fallido + status code (5.x.x / 4.x.x) + diagnostic-code + Original Message-Id (si presente) + header `X-Educa-Outbox-Id` (si el original viene incluido). Sin IO. | ~150 |
| 4 | `Educa.API/Services/Notifications/BounceCorrelator.cs` | **Lógica pura sobre BD**: dado un `NdrParsedResult`, encuentra el `EmailOutbox` correlacionado. Estrategia 1 (header), estrategia 2 (Message-Id), estrategia 3 (fallback ventana temporal por destinatario). Devuelve `EmailOutbox?` + `CorrelationSource` (`"header"` / `"message-id"` / `"fallback-window"` / `"unmatched"`). | ~120 |
| 5 | `Educa.API/Services/Notifications/BounceParserService.cs` | Orquestador. Por cada sender activo del pool (`EmailSettings.Senders`), abre IMAP, escanea carpetas configuradas, parsea cada NDR, correlaciona, llama `EmailBounceBlacklistHandler.HandleBounceAsync` con `bounceSource="async-imap"`, registra en `BounceParserProcessed`, mueve NDR a `Processed`. | ~180 |
| 6 | `Educa.API/Services/Notifications/BounceParserService.Imap.cs` | Partial: helpers IMAP (`OpenFolderAsync`, `EnsureProcessedFolderExistsAsync`, `MoveMessagesToProcessedAsync`). Mantiene archivo principal bajo 300. | ~100 |
| 7 | `Educa.API/Services/Sistema/BounceParserJob.cs` | Wrapper Hangfire `EjecutarAsync()` que crea scope, resuelve `IBounceParserService`, llama `RunCycleAsync`. Sigue patrón de `ReporteFallosCorreoAsistenciaJob.cs`. | ~40 |
| 8 | `Educa.API/Interfaces/Services/Notifications/IBounceParserService.cs` | Contrato `Task RunCycleAsync(CancellationToken ct)` | ~10 |

### Archivos a MODIFICAR (5)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `Educa.API/Models/Sistema/EmailSettings.cs` | Agregar `public BounceParserSettings BounceParser { get; set; } = new();` (sub-objeto). Conservar el resto sin cambios. |
| 2 | `Educa.API/Data/ApplicationDbContext.cs` | Agregar `DbSet<BounceParserProcessed> BounceParserProcessed { get; set; }` + Fluent API en `OnModelCreating` (índice unique en `BPR_MessageId`, índices auxiliares ya están en BD). |
| 3 | `Educa.API/Constants/Sistema/HangfireJobs.cs` | Agregar `public const string BounceParser = "bounce-parser-imap";`. |
| 4 | `Educa.API/Extensions/HangfireExtensions.cs` | Registrar el job al final del bloque `UseHangfireServices` con `RecurringJob.AddOrUpdate<BounceParserJob>(HangfireJobs.BounceParser, job => job.EjecutarAsync(), "*/5 * * * *", peru)`. Si `BounceParserSettings.Enabled == false`, registrar con `Cron.Never()` para que quede en BD pero no corra (rollback rápido sin redeploy). |
| 5 | `Educa.API/Extensions/ServiceExtensions.cs` (o donde se hace DI de notifications) | Registrar `IBounceParserService` (Scoped), `Ndr3464Parser` (Scoped o Transient — es puro), `BounceCorrelator` (Scoped), `BounceParserJob` (Scoped), `EmailBounceBlacklistHandler` ya está registrado por Chat 1. |

### Reglas de diseño obligatorias

#### `Ndr3464Parser` — debe ser puro y testeable

- Recibe `MimeMessage` (no `IMailFolder` ni IO).
- Devuelve `NdrParsedResult` o `null` si no es un NDR válido.
- Detecta NDR por `Content-Type: multipart/report; report-type=delivery-status` O por heurística de subject (`Mail Delivery Failed`, `Undeliverable`, `Delivery Status Notification`).
- Extrae del `message/delivery-status` part: `Final-Recipient`, `Status` (5.x.x), `Diagnostic-Code`.
- Extrae del `message/rfc822` part (mensaje original adjunto): el header `X-Educa-Outbox-Id` y `Message-Id` original.
- Mapea el status code a `EO_TipoFallo` reusando `SmtpErrorClassifier` (deberá agregarse helper `ClassifyByStatusCode(string status)` que mapee `5.1.1`/`5.1.2` → `FailedInvalidAddress`, `5.2.2` → `FailedMailboxFull`, etc.).

#### `BounceCorrelator` — orden de estrategias

```
1. Si NDR contiene "X-Educa-Outbox-Id" → buscar EmailOutbox por EO_CodID
   correlation = "header"
2. Si NDR contiene Message-Id original → matchear con cualquier campo
   (hoy NO persistimos Message-Id, así que esta estrategia queda PREPARADA
   pero no funcional — si el chat decide implementar, agregar EO_MessageId
   al modelo + persistirlo en EmailService.SendEmailOnceAsync)
   correlation = "message-id"
3. Fallback: buscar el SENT más reciente al mismo destinatario dentro de
   FallbackMatchWindowMinutes (default 120). Si hay 1 candidato → match.
   Si hay 0 o múltiples → unmatched.
   correlation = "fallback-window"
```

**Decisión abierta del chat**: ¿implementar la estrategia 2 (Message-Id) o dejarla para chat futuro? Recomendación: dejarla para futuro — agregar el campo `EO_MessageId` introduce migración SQL adicional y el header de Chat 1 ya cubre 100% de los correos post-deploy. La estrategia 3 cubre el tráfico legacy.

#### Idempotencia con `BounceParserProcessed`

Antes de procesar un NDR:

```csharp
var alreadyProcessed = await _context.BounceParserProcessed
    .AsNoTracking()
    .AnyAsync(p => p.BPR_MessageId == ndr.MessageId, ct);
if (alreadyProcessed) continue;
```

Después de procesar exitosamente (sea correlacionado o no):

```csharp
_context.BounceParserProcessed.Add(new BounceParserProcessed
{
    BPR_MessageId = ndr.MessageId,
    BPR_Buzon = senderAddress,
    BPR_Folder = folderName,
    BPR_EmailOutboxId = correlatedOutboxId, // null si unmatched
    BPR_CorrelationSource = correlationSource,
    BPR_NdrStatusCode = ndr.StatusCode,
    BPR_Destinatario = ndr.FailedRecipient,
    BPR_ProcessedAt = DateTimeHelper.PeruNow(),
    BPR_FechaReg = DateTimeHelper.PeruNow()
});
await _context.SaveChangesAsync(ct);
```

**Importante**: el `SaveChangesAsync` debe incluir tanto la mutación del `EmailOutbox` (vía `HandleBounceAsync`) como el insert de `BounceParserProcessed` en una sola transacción. Patrón idéntico al del Chat 1 — el handler agrega al ChangeTracker y el caller persiste todo junto.

#### Movimiento del NDR a `Processed`

Después del save exitoso, mover el `IMessageSummary` a la carpeta `Processed`:

```csharp
await sourceFolder.MoveToAsync(uid, processedFolder, ct);
```

Si la carpeta `Processed` no existe, crearla con `personal.CreateAsync("Processed", true, ct)`. Sigue patrón similar a `EmailService.SaveToSentFolder`.

**¿Por qué mover y no marcar Read?** Mover libera el `INBOX` (no se mezclan correos legítimos con NDRs viejos) y sirve como triple-check de idempotencia (si por alguna razón `BounceParserProcessed` se borra, los NDRs ya movidos no se reprocesan en el ciclo siguiente). El cleanup de `Processed` queda manual o como Chat futuro.

#### Cap por ciclo (`MaxNdrsPerBuzonPerCycle = 50`)

Por sender, escanear máximo 50 NDRs por carpeta por ciclo. Si llega más, log warning y deja el resto para el siguiente ciclo (5 min después). Evita ciclos largos que corten el next-run de Hangfire.

### Reglas de error handling

#### INV-S07 obligatorio en TODO el flujo

- Si `BounceParserService.RunCycleAsync` falla — log error + return (NO throw, no romper el job de Hangfire).
- Si abrir IMAP a un sender específico falla — log warning + skip ese sender, continuar con el siguiente.
- Si parsear un NDR específico falla — log warning + skip ese NDR, continuar con el siguiente.
- Si `HandleBounceAsync` falla — log warning, no insertar en `BounceParserProcessed` para que se reintente próximo ciclo.
- Si mover a `Processed` falla pero el save fue exitoso — log warning, el NDR queda en INBOX pero `BounceParserProcessed` lo marca como visto → next ciclo se salta.

#### Privacidad

- Logs DEBEN enmascarar emails con `EmailHelper.Mask()`.
- Logs DEBEN enmascarar DNIs con `DniHelper.Mask()` (no aplica directo aquí pero por consistencia).

## TESTS MÍNIMOS

| # | Test | Input | Resultado esperado |
|---|------|-------|--------------------|
| 1 | `Ndr3464Parser` — Gmail NDR estándar 5.1.1 | NDR multipart/report con `Status: 5.1.1` y mensaje original adjunto con `X-Educa-Outbox-Id: 12345` | `NdrParsedResult` con `FailedRecipient`, `StatusCode = "5.1.1"`, `OutboxIdFromHeader = 12345`, `TipoFallo = FailedInvalidAddress` |
| 2 | `Ndr3464Parser` — NDR sin header (correo legacy) | NDR sin `X-Educa-Outbox-Id` en el original adjunto | `OutboxIdFromHeader = null`, demás campos parseados correctamente |
| 3 | `Ndr3464Parser` — Outlook NDR (formato distinto) | NDR con `Subject: Undeliverable: ...` y heurística no estricta | Detecta como NDR válido, parsea destinatario y status |
| 4 | `Ndr3464Parser` — correo NO-NDR | Email regular | Devuelve `null` |
| 5 | `BounceCorrelator` — header presente | NDR con `OutboxIdFromHeader = 100`, EmailOutbox 100 SENT en BD | Devuelve `EmailOutbox` 100, `CorrelationSource = "header"` |
| 6 | `BounceCorrelator` — fallback window 1 candidato | Sin header, destinatario `x@y.com`, 1 SENT a `x@y.com` hace 30 min, ventana 120 min | Devuelve ese SENT, `CorrelationSource = "fallback-window"` |
| 7 | `BounceCorrelator` — fallback window 0 candidatos | Sin header, destinatario `x@y.com`, 0 SENT recientes | Devuelve `null`, `CorrelationSource = "unmatched"` |
| 8 | `BounceCorrelator` — fallback window múltiples candidatos | Sin header, 3 SENT a `x@y.com` hace 10/20/30 min | Devuelve `null`, `CorrelationSource = "unmatched"` (no adivina cuál era) |
| 9 | `BounceParserService` — idempotencia | NDR con `MessageId="abc"` ya en `BounceParserProcessed` | Skip silencioso, sin re-llamar handler |
| 10 | `BounceParserService` — bounce permanente correlacionado al 3er hit | 2 SENT históricos del mismo destinatario con `EO_TipoFallo = FailedInvalidAddress`, NDR llega para el 3ro | Llama `HandleBounceAsync` con `bounceSource="async-imap"`, EmailOutbox actualizado a `FAILED_BLACKLISTED`, `EO_BounceSource="async-imap"`, `BounceParserProcessed` registrado, `EmailBlacklist` con fila |
| 11 | `BounceParserService` — NDR unmatched igual se registra | NDR sin correlación posible | `BPR_EmailOutboxId = null`, `BPR_CorrelationSource = "unmatched"`, no llama handler, log warning |
| 12 | `BounceParserService` — disabled flag | `BounceParser:Enabled = false` | `RunCycleAsync` early-return sin abrir IMAP, log info |
| 13 | `BounceParserService` — INV-S07 sender saturado | Mock IMAP que lanza `SocketException` al conectar el sender 2 | Log warning, continúa con sender 3, no propaga |
| 14 | `BounceParserService` — cap MaxNdrsPerBuzonPerCycle | Mock IMAP con 100 NDRs en INBOX, `MaxNdrsPerBuzonPerCycle=50` | Procesa 50, log warning con count restante, no procesa los otros 50 |

### Estrategia de mocking IMAP

MailKit no expone interfaces sobre `ImapClient` — los tests pueden:
- **Opción A**: extraer un wrapper `IImapMailClient` interno que `BounceParserService` consuma. Tests usan stub. **Recomendado**: aísla IMAP del orquestador y permite test de orquestación sin red.
- **Opción B**: tests del orquestador con `Skip = "Requires IMAP"` y solo testear `Ndr3464Parser` + `BounceCorrelator` puros. Tests de orquestación quedan como integración manual.

Decisión sugerida: **Opción A** — el costo de un wrapper interno (`IImapMailClient` con métodos `ConnectAsync`, `OpenFolderAsync`, `FetchAsync`, `MoveToAsync`) es bajo y desbloquea tests #9-#14. Alternativa rápida si el chat se alarga: implementar Opción A solo para los métodos críticos que tests #9 + #10 + #14 necesitan.

### Fixtures de NDRs reales

El usuario tiene capturas de NDRs reales en su bandeja `sistemas4@laazulitasac.com` (origen del Plan 31). Pedir al inicio del chat 2-3 archivos `.eml` representativos (Gmail, Outlook, Yahoo si aplica) para fixtures de tests del parser. Sin fixtures reales, tests #1-#3 quedan como heurísticos basados en el RFC y pueden no cubrir variaciones del MTA real.

## REGLAS OBLIGATORIAS

### Backend (`backend.md`)

- ✅ **300 líneas máximo por archivo `.cs`** — `BounceParserService.cs` arriesga superar; usar partial `.Imap.cs` como ya está planeado.
- ✅ **AsNoTracking()** en queries de lectura (`BounceParserProcessed.AnyAsync`, fallback window).
- ✅ **Structured logging** — placeholders, sin string interpolation. Emails enmascarados.
- ✅ **NUNCA `ex.Message` en respuestas API** — n/a (no hay endpoints).
- ✅ **Strings nullable inicializadas con `= ""` solo si no son nullable** — aplicar a todos los campos del modelo nuevo.

### Invariantes (`business-rules.md`)

- ✅ **INV-MAIL01** (validación pre-encolado) — n/a (este chat no encola correos, solo lee).
- ✅ **INV-MAIL02** (auto-blacklist al 3er bounce 5.x.x) — el parser DEBE alimentar este contador via `HandleBounceAsync(bounceSource="async-imap")`. Test #10 lo verifica.
- ✅ **INV-MAIL03** (techo cPanel) — el parser AYUDA a respetarlo: detectar bounces async permite alimentar blacklist y reducir reenvíos a destinatarios muertos que consumen quota.
- ✅ **INV-MAIL04** (monitoreo defer/fail) — el widget existe (Plan 22 Chat B) y consume `defer-fail-status`. Este chat NO modifica ese endpoint.
- ✅ **INV-D02** (auditoría) — `BPR_FechaReg` + `BPR_ProcessedAt` cubre. Sin `UsuarioReg/Mod` porque es proceso automático del job (puede setear `"BounceParserJob"` literal si quieres trazabilidad).
- ✅ **INV-D04** (timezone Perú) — `DateTimeHelper.PeruNow()` en TODO timestamp. Cuidado con MimeMessage `Date` que viene en UTC del MTA — convertir antes de comparar con `EO_FechaEnvio`.
- ✅ **INV-D05** (read-only AsNoTracking) — todas las lecturas del correlator + chequeo idempotencia.
- ✅ **INV-S07** (fire-and-forget) — el job NUNCA debe romper Hangfire. Try/catch global + por sender + por NDR.
- ⏳ **INV-MAIL05** se formaliza en Chat 3 (FE/docs), NO acá.

### Tests

- ✅ Cobertura de los 14 casos arriba — ningún test existente debe romperse.
- ✅ Si la opción A (wrapper IMAP) se elige, agregar tests del wrapper son OPC (es thin layer sobre MailKit).

## APRENDIZAJES TRANSFERIBLES (del Chat 1 cerrado 2026-04-24)

### Estructura del repo backend

- Backend está en `c:\Users\Asus Ryzen 9\EducaWeb\Educa.API\Educa.API\` (carpeta nested).
- `EmailBounceBlacklistHandler.HandleBounceAsync` ya existe y tiene esta firma: `public async Task<HandleResult> HandleBounceAsync(EmailOutbox entry, string destinatario, string errorMessage, string tipoFalloClassified, string bounceSource, CancellationToken ct = default)`. Es el entry point del parser. Devuelve `OutboxEntryWasMutated = true` solo cuando alimenta blacklist (3er bounce); para 1er/2do graba `EO_BounceSource` + `EO_BounceDetectedAt` pero retorna `false` (no es estado terminal — el parser debe igualmente persistir `BounceParserProcessed`).
- `BounceParserConstants.OutboxIdHeaderName = "X-Educa-Outbox-Id"` — usar esa constante al leer el header del NDR adjunto.
- `BounceParserConstants.BounceSourceAsyncImap = "async-imap"` — pasar como `bounceSource` al handler.
- `EmailService.SaveToSentFolder` ya muestra cómo abrir IMAP, navegar PersonalNamespaces y buscar carpetas con tolerancia a nombres alternativos. **Patrón a reusar para abrir `INBOX`/`Junk`/`Trash` y mover a `Processed`.**

### Patrones del proyecto

- **`SmtpErrorClassifier`** tiene constantes públicas (`FailedInvalidAddress`, `FailedMailboxFull`, `FailedRejected`, etc.) — extender con un método `ClassifyByStatusCode(string status)` o duplicar el mapping en el parser. Recomendación: extender `SmtpErrorClassifier` para mantener la fuente única de verdad.
- **`DateTimeHelper.PeruNow()`** está en `Educa.API.Helpers.Formatting` — usar siempre.
- **Wrapper IMAP** no existe hoy — es deuda técnica del Plan 22/29 que `EmailService.SaveToSentFolder` y este chat ambos comparten. Si agregas `IImapMailClient`, otros chats futuros pueden migrar `SaveToSentFolder` también (NO en este chat, sería scope creep).

### Hangfire

- Patrón canónico (ver `HangfireExtensions.cs:129`):
  ```csharp
  RecurringJob.AddOrUpdate<BounceParserJob>(
      HangfireJobs.BounceParser,
      job => job.EjecutarAsync(),
      "*/5 * * * *",
      peru);
  ```
- Si `BounceParserSettings.Enabled == false`, registrar con `Cron.Never()` (rollback rápido sin redeploy).
- Job class debe tener constructor con `IServiceScopeFactory` (no inyectar el service directo — Hangfire activa el job en su propio scope).

### EF Core

- `DbSet<BounceParserProcessed>` en `ApplicationDbContext` + Fluent API. La tabla y los índices ya existen en BD — NO crear migration ni script SQL adicional.

### Testing

- `TestDbContextFactory.Create()` para tests de unidad (InMemory).
- `TestDbContextFactory.CreateScopeFactory()` para tests con DI (ver `EmailOutboxWorkerTests.cs`).
- FluentAssertions y Moq están como `using` global del csproj de tests.

### Decisiones del Chat 1 que afectan a este chat

- El handler escribe `EO_BounceSource` aunque no llegue al umbral — significa que después de `HandleBounceAsync` debes hacer `SaveChangesAsync` aunque `OutboxEntryWasMutated` sea `false` (la columna `EO_BounceSource` quedó dirty en el ChangeTracker).
- El header `X-Educa-Outbox-Id` se serializa con `CultureInfo.InvariantCulture` — al leer del NDR usar `long.Parse(value, CultureInfo.InvariantCulture)` para evitar parse con locale.

## FUERA DE ALCANCE

- ❌ **NO crear endpoint admin para listar `BounceParserProcessed`** — Chat 3 FE puede agregarlo si lo justifica (widget). No anticipar.
- ❌ **NO modificar `EmailDashboardDiaService` ni agregar campos al DTO `EmailDashboardResumen`** — Chat 3 FE.
- ❌ **NO documentar INV-MAIL05 en `business-rules.md`** — Chat 3.
- ❌ **NO crear widget FE de "bounces async vs sync"** — Chat 3.
- ❌ **NO migrar `EmailService.SaveToSentFolder` al wrapper `IImapMailClient`** si decidís Opción A — solo crear el wrapper para el parser. Migración del `SaveToSentFolder` es scope creep.
- ❌ **NO agregar `EO_MessageId` al modelo** (estrategia 2 del correlator) — dejar para chat futuro si la cobertura del header (estrategia 1) + fallback (estrategia 3) no alcanza.
- ❌ **NO tocar `appsettings.json`** — la sección `Email:BounceParser` ya está en env vars de Azure y se bindea contra `EmailSettings.BounceParser` cuando agregues la sub-clase.
- ❌ **NO procesar NDRs viejos masivamente al primer ciclo** (los que ya están acumulados pre-deploy) — el `MaxNdrsPerBuzonPerCycle=50` los irá vaciando 50 cada 5 min naturalmente. Si el usuario quiere acelerarlo, ejecutar el job manualmente desde el dashboard `/hangfire`.
- ❌ **NO tocar el FE** — todo BE en este chat.

## CRITERIOS DE CIERRE

```
[ ] BounceParserSettings creado con 6 propiedades (Enabled, PollingIntervalMinutes, FoldersToScan, ProcessedFolderName, FallbackMatchWindowMinutes, MaxNdrsPerBuzonPerCycle) + propagado en EmailSettings
[ ] BounceParserProcessed model + DbSet + Fluent API en ApplicationDbContext
[ ] Ndr3464Parser puro implementado (multipart/report + heurística subject + extracción header X-Educa-Outbox-Id)
[ ] BounceCorrelator con 3 estrategias (header, message-id stub, fallback window) implementado
[ ] BounceParserService.cs (orquestador) + .Imap.cs (partial helpers) implementado, ambos < 300 líneas
[ ] BounceParserJob.cs (wrapper Hangfire) + registro en HangfireJobs.BounceParser
[ ] HangfireExtensions registra el job con cron */5 * * * * (Cron.Never si Enabled=false)
[ ] DI: IBounceParserService + Ndr3464Parser + BounceCorrelator + BounceParserJob registrados como Scoped
[ ] 14 tests del checklist pasan en verde (con fixtures de NDRs reales pedidos al usuario)
[ ] Tests existentes del handler/worker/EmailService siguen pasando (1336 BE como baseline post-Chat-1)
[ ] dotnet build sin warnings nuevos
[ ] dotnet test verde
[ ] Patrón INV-S07 verificado: try/catch global en RunCycleAsync + por sender + por NDR
[ ] Logs enmascarando emails (EmailHelper.Mask)
[ ] Verificación post-deploy en /hangfire dashboard: el job "bounce-parser-imap" aparece registrado y se ejecuta cada 5 min
[ ] Verificación post-deploy en BD: nuevas filas en BounceParserProcessed después del primer ciclo (esperar 5-10 min post-deploy)
[ ] Verificación post-deploy: NDRs reales en bandeja sistemas4@ se mueven a carpeta "Processed"
[ ] Memoria nueva en `~/.claude/projects/.../memory/` documentando que el parser está activo + cómo se correlacionan correos pre-deploy (fallback window) vs post-deploy (header)
[ ] Actualizar Foco del maestro con cierre del chat + commit hash + tests count
[ ] Mover este archivo a educa-web/.claude/chats/closed/ al cerrar el chat
```

## COMMIT MESSAGE sugerido

Un solo commit (todo el chat es un cambio cohesivo del feature parser):

```
feat(email-outbox): add async IMAP bounce parser job

- Add "BounceParserSettings" sub-config bound from "Email:BounceParser"
  (Enabled flag, polling interval, folders to scan, processed folder
  name, fallback match window, max NDRs per cycle)
- Add "BounceParserProcessed" model + DbSet for idempotency (table
  already deployed 2026-04-24)
- Add "Ndr3464Parser" pure parser for RFC 3464 multipart/report
  messages, extracting failed recipient, status code, diagnostic code
  and original "X-Educa-Outbox-Id" header from attached message
- Add "BounceCorrelator" with 3 strategies: header (post-deploy),
  message-id (stub for future), fallback window (legacy traffic)
- Add "BounceParserService" orchestrator that scans INBOX/Junk/Trash
  on every active sender from the pool, parses NDRs, correlates,
  invokes "EmailBounceBlacklistHandler.HandleBounceAsync" with
  "bounceSource = async-imap", persists to "BounceParserProcessed"
  and moves NDR to Processed folder
- Add "BounceParserJob" Hangfire wrapper with recurring cron */5
- Preserves INV-MAIL02 (auto-blacklist at 3rd 5.x.x bounce now
  alimented by both sync and async paths) and INV-S07 (parser
  failures never break the Hangfire job)

Plan 31 Chat 2 — closes the visibility gap where MailKit reports
"SENT" while Gmail/Outlook bounce hours later. Foundation from
Chat 1 (header inyected on every send + handler split) makes
correlation deterministic for new traffic.
```

Validar `commit` skill: subject 51 chars ≤ 72 ✅, inglés imperativo ✅, español solo entre `"..."` (`"BounceParserSettings"`, `"X-Educa-Outbox-Id"`, `"async-imap"`, etc.) ✅, sin Co-Authored-By ✅.

## CIERRE

Pedir feedback del usuario sobre:

1. **Confirmación del header en Roundcube** (CRÍTICO al inicio del chat) — ¿se verificó que `X-Educa-Outbox-Id: NNN` aparece en headers de un correo enviado post-deploy del Chat 1? Si NO → no codificar nada, primero diagnosticar si cPanel/Exim lo strippea.
2. **Fixtures de NDRs reales** — pedir 2-3 archivos `.eml` (Gmail, Outlook, Yahoo si hay) de la bandeja `sistemas4@` para tests del parser. Sin fixtures reales el test #1-#3 queda heurístico.
3. **Decisión opción A vs B del mocking IMAP** — ¿wrapper `IImapMailClient` interno (testeo completo) o solo tests del parser puro y orquestador como integración manual (más rápido)? Recomendación A.
4. **Decisión estrategia 2 del correlator (Message-Id)** — ¿implementar ahora agregando `EO_MessageId` o stub para futuro? Recomendación stub (header + fallback window cubren).
5. **Tiempo entre deploy del Chat 2 y validación end-to-end** — esperar al menos un ciclo (5 min) post-deploy y revisar `BounceParserProcessed` en BD + `/hangfire` dashboard. Si tras 30 min hay 0 filas, hay un bug en la conexión IMAP.
6. **Cleanup de carpeta `Processed`** — ¿deuda técnica para chat futuro (purga > 90 días) o no preocupa por ahora? Recomendación: dejar como deuda menor — un Hangfire job adicional se agrega rápido si los buzones se llenan.
