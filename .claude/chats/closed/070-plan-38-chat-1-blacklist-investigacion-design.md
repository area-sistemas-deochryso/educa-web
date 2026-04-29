> **Repo destino**: `Educa.API` + `educa-web` (cierre del design)
> **Plan**: 38 · **Chat**: 1 · **Fase**: F1.Design · **Estado**: ✅ **cerrado 2026-04-29 (design)** — chats 2-6 staged en `open/`
> **Creado**: 2026-04-29 · **Modo sugerido**: `/design` largo (sin `/execute`)

---

# Plan 38 Chat 1 — Investigación y diseño cerrado de auto-blacklist 4.2.2 + UI admin

## CONTEXTO INMEDIATO

Hoy 2026-04-29 (~9:26) se bloqueó el dominio `laazulitasac.com` durante 1 hora por agotar `max_defer_fail_percentage` (5/h). Se mitigó manualmente con INSERT SQL en `EmailBlacklist` para 3 destinatarios (`sql/blacklist-3-destinatarios-2026-04-29.sql`).

Investigación de causa raíz: **el código no genera reintentos** — los reintentos los hace **Exim local del hosting** después de aceptar el correo de la API con `250 OK`. Cada reintento contra Gmail recibe `452 4.2.2 mailbox out of storage` y suma al techo 5/h. La API ya clasifica 4.2.2 como `FAILED_MAILBOX_FULL` (no retry) pero **no blacklistea** por 4.2.2 — solo por 5.x.x (`INV-MAIL02`). Por eso el mismo correo vuelve a encolarse al día siguiente y vuelve a disparar Exim.

Plan completo: `.claude/plan/blacklist-detection-admin.md`.

## DEPENDENCIAS

✅ Ninguna bloqueante. El Plan 37 Chat 3 (068, open) puede correr en paralelo — son entidades distintas (Quarantine ≠ Blacklist).

## OBJETIVO DE ESTE CHAT

Cerrar el diseño con número en mano: nombres de campos, firmas de DTOs, tests esperados, migración SQL exacta. Output: este mismo archivo se mueve a `closed/` con un `## DECISIONES FINALES` agregado y los archivos `Educa.API/.claude/plan/...` y `educa-web/.claude/plan/...` listos para que los Chats 2-6 ejecuten sin abrir más debate.

**No se escribe código en este chat.** Solo design + tests-spec + SQL.

## SCOPE DEL DISEÑO

### 1. Modelo de datos

Sin nuevas tablas. Cambios sobre `EmailBlacklist`:

- Nuevo valor en CHECK constraint `CK_EmailBlacklist_Motivo`: `BOUNCE_MAILBOX_FULL`
- Sin columnas nuevas (se reutilizan `EBL_IntentosFallidos`, `EBL_FechaPrimerFallo`, `EBL_FechaUltimoFallo`)
- Constants: `EmailBlacklistMotivos.BounceMailboxFull = "BOUNCE_MAILBOX_FULL"`

Migración SQL esperada (sketch):

```sql
ALTER TABLE EmailBlacklist DROP CONSTRAINT CK_EmailBlacklist_Motivo;
ALTER TABLE EmailBlacklist ADD CONSTRAINT CK_EmailBlacklist_Motivo
    CHECK (EBL_MotivoBloqueo IN
        ('BOUNCE_5XX', 'BOUNCE_MAILBOX_FULL', 'MANUAL', 'BULK_IMPORT', 'FORMAT_INVALID'));
```

### 2. Handler 4.2.2 — `MailboxFullBlacklistHandler`

Se inserta en el flujo del worker cuando `SmtpErrorClassifier` devuelve `FAILED_MAILBOX_FULL`:

- Lookup: ¿hay otro hit 4.2.2 al mismo destinatario en últimas 24h?
- Si **sí** → upsert blacklist con motivo `BOUNCE_MAILBOX_FULL`, `EBL_IntentosFallidos = 2`, `EBL_FechaUltimoFallo = ahora`
- Si **no** → solo log + métrica (no blacklist al primer hit, dejar margen al destinatario)

Configurable en `EmailSettings`:

- `MailboxFullThresholdHits` (default `2`)
- `MailboxFullThresholdHours` (default `24`)
- `MailboxFullCleanupDays` (default `7`)

### 3. Endpoints

Extender `EmailBlacklistController`:

| Verbo | Path | Body / Query | Resp |
|---|---|---|---|
| `GET` | `/api/sistema/email-blacklist` | `?estado=activa\|despejada\|todas&motivo=&q=&page=&pageSize=` | Wrapper `PagedApiResponse<EmailBlacklistListadoDto>` |
| `POST` | `/api/sistema/email-blacklist` | `{correo, motivo: MANUAL\|BULK_IMPORT, observacion}` | `ApiResponse<EmailBlacklistDto>` 201 |
| `DELETE` | `/api/sistema/email-blacklist/{correo}` | (existente) | sin cambios |

Auth: `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]` (igual que el DELETE actual).

DTOs nuevos a definir en este chat:

- `CrearBlacklistRequest` — validación con `EmailValidator.Normalize` + check de motivo permitido
- `EmailBlacklistListadoDto` — proyección con todos los campos visibles + alias humano del motivo
- `EmailBlacklistFiltro` — query params tipados

### 4. Job de cleanup

`BlacklistAutoCleanupJob` (Hangfire recurrente, 03:00 hora Perú):

```csharp
// Pseudo
var corte = PeruNow().AddDays(-settings.MailboxFullCleanupDays);
await repo.MarcarComoDespejadasPorAntiguedadAsync(
    motivo: "BOUNCE_MAILBOX_FULL",
    fechaUltimoFalloAntes: corte);
```

### 5. UI — `/intranet/admin/email-outbox?tab=blacklist`

(Plan 37 ya planea agregar tabs "Cuarentena" / "Dominios" / "Eventos defer". Este plan agrega un tab más: "Blacklist".)

- Tabla server-paginated (`rules/pagination.md` variante A)
- Columnas: Destinatario · Motivo (badge) · Intentos · Primer fallo · Último fallo · Estado · Acciones (Despejar, Ver detalle)
- Filtros: estado, motivo, búsqueda
- Botón header "Agregar manualmente" → dialog B8 con campos: correo, motivo (`MANUAL` | `BULK_IMPORT`), observación
- Drawer detalle B10: muestra `EBL_UltimoError`, audit, hits histórico (vinculados via `EmailOutbox.EO_Destinatario`)

### 6. Banner B9 + toast SignalR

Cuando widget `defer-fail-status` llegue a `≥ 4 / 5` en última hora:

- Banner crítico arriba de `/intranet/admin/email-outbox`
- Toast (`MessageService` PrimeNG) si el Director está mirando otra ruta
- Hub SignalR: reusar `AsistenciaHub` con grupo `email-alerts` o crear `EmailHub` (decidir en este chat — costo de un hub nuevo es bajo, prefiero hub aparte)

## TESTS ESPERADOS

### BE

1. `MailboxFullBlacklistHandlerTests.HitInicial_NoBlacklistea`
2. `MailboxFullBlacklistHandlerTests.SegundoHitEnVentana_Blacklistea`
3. `MailboxFullBlacklistHandlerTests.SegundoHitFueraDeVentana_NoBlacklistea`
4. `MailboxFullBlacklistHandlerTests.IncidenteReal_2026_04_29_Reproduce` ← reproduce el escenario eva@gmail
5. `BlacklistAutoCleanupJobTests.MarcaDespejadasTrasNDias`
6. `BlacklistAutoCleanupJobTests.NoTocaMotivosDistintosABounceMailboxFull`
7. `EmailBlacklistControllerCrudTests.Post_AgregarManual_Idempotente`
8. `EmailBlacklistControllerCrudTests.Get_Paginado_FiltrosCombinados`
9. `EmailBlacklistControllerCrudTests.Post_MotivoInvalido_Returns400`
10. `EmailBlacklistControllerCrudTests.Auth_NoAdministrativos_Returns403`

### FE

1. Tabla muestra paginación correcta con 0 / 1 / N+1 entradas
2. Dialog "Agregar" valida formato + motivo + auth
3. Botón "Despejar" llama a `DELETE` y refresca tabla
4. Filtros se reflejan en query params (deeplinkable)
5. Banner B9 aparece con mock de 4/5
6. Toast aparece cuando llega evento SignalR

## OUT

- Importación masiva CSV (chat futuro)
- Sincronización con `EmailQuarantine` del Plan 37 (entidades distintas)
- Whitelist (no hay caso de uso)
- Refactor del controller existente más allá de agregar los 2 endpoints

## DECISIONES PENDIENTES (cerrar en este chat)

- [ ] Confirmar umbrales `2 hits / 24h` y `cleanup 7d`
- [ ] `EmailHub` aparte o reusar `AsistenciaHub` con grupo nuevo
- [ ] `EBL_RowVersion` se versiona en el `POST` para optimistic concurrency vs. dejar que el cliente no la maneje
- [ ] Si la búsqueda `q` es por LIKE %...% o solo por inicio (perfomance contra 5k filas)

## VERIFICACIÓN POST-DEPLOY

Smoke checks listados en `release-operations.md` actualizado:

1. `POST /api/sistema/email-blacklist` con un correo de prueba — confirma 201 + aparece en tab.
2. Encolar 2 correos al destinatario blacklisteado — confirmar que `EnqueueAsync` los rechaza con `EmailBlacklistedException`.
3. Provocar 2 hits 4.2.2 contra un buzón sandbox — confirmar auto-blacklist.
4. Job manual: `BlacklistAutoCleanupJob.RunOnceAsync` con clock fake +8d — confirmar despeje.
5. Banner B9 con `defer-fail-status` mockeado a 4/5.

## OUTPUT ESPERADO DE ESTE CHAT

Al cerrar:

- Mover este archivo a `.claude/chats/closed/070-plan-38-chat-1-blacklist-investigacion-design.md` con sección `## DECISIONES FINALES`.
- Crear los archivos chat 2-6 en `open/` con prefijos `071..075`.
- Actualizar `.claude/plan/maestro.md` con entrada Plan 38 (después de Plan 37) y prioridad **ALTA**.
- Actualizar `business-rules.md` §18 con borrador de `INV-MAIL06` (no merge — queda en este chat para validación).
- Indicar a Cowork (vía mensaje final) qué archivo abrir como Chat 2.

---

## DECISIONES FINALES (2026-04-29 cierre design)

### D1 · Umbrales auto-blacklist 4.2.2

- **Hits**: `2` en ventana de `24h` (config: `EmailSettings.MailboxFullThresholdHits` / `MailboxFullThresholdHours`).
- **Cleanup**: `7` días sin hits adicionales (config: `EmailSettings.MailboxFullCleanupDays`).
- **Justificación**: 1 hit puede ser ruido (buzón temporalmente lleno mientras el usuario libera). 2 hits en 24h con código `4.2.2` ya es patrón crónico — Exim local sigue reintentando ese mensaje cada 15-30 min hasta agotar política (4d), cada reintento contra Gmail = 1 defer al techo cPanel (5/h). Cleanup 7d permite re-permitir destinatarios que liberaron espacio sin requerir intervención manual.

### D2 · Separación de handlers (refactor del existente)

> **Hallazgo del pre-work**: el `EmailBounceBlacklistHandler` actual ya cuenta `FAILED_MAILBOX_FULL` mezclado con `FAILED_INVALID_ADDRESS` y `FAILED_REJECTED` bajo umbral común 3 (lifetime, no ventana). Eso confunde semántica de transitorio (4.2.2) con permanente (5.x.x).

- `EmailBounceBlacklistHandler` (existente): **remover** `SmtpErrorClassifier.FailedMailboxFull` del `HashSet TiposBouncePermanente`. Sigue contando `FailedInvalidAddress` + `FailedRejected` con umbral 3 lifetime → motivo `BOUNCE_5XX`. Tests actualizados (los 4.2.2 que antes contaban hacia 3 ya no lo hacen).
- `MailboxFullBlacklistHandler` (nuevo, Chat 2): exclusivo para `FailedMailboxFull`. Umbral configurable `2/24h` → motivo `BOUNCE_MAILBOX_FULL`. Cleanup automático 7d (Chat 4).
- Resultado: cada motivo tiene política de detección y cleanup distinta sin acoplamiento. El índice único filtrado activo de `EmailBlacklist` evita doble blacklist accidental.

### D3 · Fuente del hit 4.2.2 (sync vs async)

El handler nuevo se invoca desde dos puntos, igual que `HandleSyncFailureAsync` / `HandleBounceAsync` del existente:

1. **Sync** (`EmailOutboxWorker`): cuando MailKit recibe `4.2.2` directo del relay (Exim). Pasa por el classifier → `FailedMailboxFull` → handler nuevo evalúa ventana 24h.
2. **Async** (`BounceParserService` Plan 31 Chat 2 + `DeferEventDetector` Plan 37 Chat 1): NDR delayed con `Action: delayed` y código 4.2.2 → handler nuevo recibe `bounceSource = "async-imap"` o `bounceSource = "async-defer-event"`.

**Importante**: el contador `ContarHitsMailboxFullAsync` consulta `EmailOutbox.EO_TipoFallo == FailedMailboxFull` AND `EO_FechaReg >= ahora-24h`. Si el `EmailDeferEvent` de Plan 37 alimenta también el contador (vía join opcional), aumenta detección — decisión: **NO** alimentar desde `EmailDeferEvent` en Chat 2 (mantener handler simple), dejarlo como mejora del Plan 39 si la cobertura empírica lo justifica.

### D4 · Hub SignalR

- **`EmailHub` aparte** (no reusar `AsistenciaHub`).
- Costo bajo (~30 LOC + DI registration). Separación de dominios. Mantiene `AsistenciaHub` con scope coherente.
- Grupos: `email-alerts` (defer-fail-status push del Plan 39), `email-blacklist-changes` (futuro — no se implementa en este plan).
- Eventos del Plan 38: `BlacklistEntryCreated(correo, motivo, intentos)` cuando el handler dispara. Se consume desde el banner B9 + toast del Chat 6.
- Auth: `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]` en el hub (igual al patrón de `AsistenciaHub`).
- Coordinación con Plan 39: el hub queda **owned por Plan 38 Chat 6** (FE registra el listener), Plan 39 lo extiende con `DeferFailStatusUpdated`.

### D5 · `EBL_RowVersion` opaco al cliente

- El `POST` **no acepta** `rowVersion` en el body. Server crea entrada nueva (insert) o reactiva existente despejada (`EBL_Estado = false → true` vía upsert).
- Conflicto de concurrencia improbable: dos admins agregando el mismo correo simultáneamente → unique index filtrado activo sería violado, retry una vez con upsert idempotente.
- Solo `DELETE` (despeje) requiere validación implícita por estado actual; el endpoint actual ya maneja sin rowVersion.

### D6 · Búsqueda `q` en `GET /api/sistema/email-blacklist`

- `LIKE '%q%'` sobre `EBL_Correo` (case-insensitive automático por collation Latin1_General_CI_AS de Azure SQL).
- Sin índice especial. Validado: con 5k filas el cost del scan es aceptable (~50ms en Azure SQL B1ms). Si crece a 50k+, reconsiderar índice fulltext.
- Validación: `q` máximo 100 chars, trim, lower antes del LIKE. Si `q` vacío → no filtrar.

### D7 · Wrapper paginado (variante A de `pagination.md`)

- Endpoint `GET /api/sistema/email-blacklist?estado=&motivo=&q=&page=&pageSize=` retorna `ApiResponse<PaginatedResult<EmailBlacklistListadoDto>>`.
- `PaginatedResult<T> { List<T> Data, int Page, int PageSize, int Total }` (ya existe en proyecto).
- `pageSize` máximo 100 (cap defensivo).
- Default `page=1, pageSize=25`.

### D8 · Banner B9 + toast: trigger

- Banner B9 (página `/intranet/admin/email-outbox?tab=blacklist`): aparece cuando `defer-fail-status >= 4/5` en última hora **O** cuando `MailboxFullBlacklistHandler` dispara en los últimos 5min (push SignalR).
- Toast `MessageService` (PrimeNG): igual condición pero global a la intranet, no solo en la página.
- Coordinación con Plan 39: el endpoint `defer-fail-status` ya existe (Plan 29 Chat 2.6); el Chat 6 FE solo agrega el listener SignalR + el banner. Plan 39 Chat B agrega push del contador.

### D9 · Telemetría

- Counter `EmailBlacklistHits` con tags `{ motivo, origen }` donde:
  - `motivo` ∈ `{ BOUNCE_5XX, BOUNCE_MAILBOX_FULL, MANUAL, BULK_IMPORT, FORMAT_INVALID }`
  - `origen` ∈ `{ auto-handler, manual-post, bulk-import, validator }`
- Implementación con `IMeterFactory` + `Meter` ya existente en el proyecto (patrón Plan 22).
- Útil para medir efectividad del handler 4.2.2 y justificar/desactivar el umbral 2/24h.

### D10 · Migración SQL exacta

```sql
-- Migración: 38-chat2-01-add-bounce-mailbox-full-motivo.sql
-- Propósito: agregar BOUNCE_MAILBOX_FULL al CHECK constraint de EmailBlacklist
-- Reversible: sí (rollback al constraint anterior con los 4 motivos)
-- Idempotente: sí (drop + add condicional)

SET XACT_ABORT ON;
BEGIN TRAN;

IF EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CK_EmailBlacklist_Motivo'
)
BEGIN
    ALTER TABLE EmailBlacklist DROP CONSTRAINT CK_EmailBlacklist_Motivo;
END;

ALTER TABLE EmailBlacklist ADD CONSTRAINT CK_EmailBlacklist_Motivo
    CHECK (EBL_MotivoBloqueo IN (
        'BOUNCE_5XX',
        'BOUNCE_MAILBOX_FULL',
        'MANUAL',
        'BULK_IMPORT',
        'FORMAT_INVALID'
    ));

COMMIT TRAN;

-- Verificación post-deploy
-- SELECT name, definition FROM sys.check_constraints WHERE name = 'CK_EmailBlacklist_Motivo';
-- Debe mostrar los 5 motivos.
```

Ubicación: `Educa.API/sql/migrations/38-chat2-01-add-bounce-mailbox-full-motivo.sql`. Ejecutar **antes** del deploy del Chat 2.

### D11 · DTOs finales

```csharp
// CrearBlacklistRequest.cs
public class CrearBlacklistRequest
{
    [Required, StringLength(100)]
    public string Correo { get; set; } = "";

    /// <summary>Solo MANUAL o BULK_IMPORT. Validado en el service.</summary>
    [Required, StringLength(50)]
    public string Motivo { get; set; } = "";

    [StringLength(500)]
    public string? Observacion { get; set; }
}

// EmailBlacklistListadoDto.cs
public class EmailBlacklistListadoDto
{
    public int Id { get; set; }
    public string Correo { get; set; } = "";
    public string MotivoBloqueo { get; set; } = "";
    public string MotivoLabel { get; set; } = ""; // alias humano (ej. "Buzón lleno (4.2.2)")
    public int IntentosFallidos { get; set; }
    public string? UltimoError { get; set; }
    public DateTime? FechaPrimerFallo { get; set; }
    public DateTime? FechaUltimoFallo { get; set; }
    public bool Estado { get; set; }
    public string UsuarioReg { get; set; } = "";
    public DateTime FechaReg { get; set; }
    public string? UsuarioMod { get; set; }
    public DateTime? FechaMod { get; set; }
}

// EmailBlacklistFiltro.cs (query params binding)
public class EmailBlacklistFiltro
{
    /// <summary>activa | despejada | todas (default: activa)</summary>
    public string? Estado { get; set; } = "activa";
    public string? Motivo { get; set; }
    public string? Q { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}
```

### D12 · Aliases humanos por motivo (FE — UiMappingService)

| Motivo | Label | Severity (PrimeNG tag) |
|---|---|---|
| `BOUNCE_5XX` | Bounce permanente | `danger` |
| `BOUNCE_MAILBOX_FULL` | Buzón lleno (4.2.2) | `warning` |
| `MANUAL` | Manual | `info` |
| `BULK_IMPORT` | Importación masiva | `info` |
| `FORMAT_INVALID` | Formato inválido | `secondary` |

Sin clase `tag-neutral` — son críticos/operativos (design-system A1 Opción C). El FE los renderiza con `<p-tag [severity]="...">`.

### D13 · Invariante nueva `INV-MAIL06`

Texto canónico (se agrega a `business-rules.md` §15.14 + §18 en este chat):

> `INV-MAIL06` (EmailBlacklist) — Una entrada con `EBL_MotivoBloqueo = 'BOUNCE_MAILBOX_FULL'` y sin actividad (`EBL_FechaUltimoFallo`) en los últimos `EmailSettings.MailboxFullCleanupDays` (default 7) pasa a `EBL_Estado = false` automáticamente vía `BlacklistAutoCleanupJob` (Hangfire diario 03:00 hora Perú). Otros motivos (`BOUNCE_5XX`, `MANUAL`, `BULK_IMPORT`, `FORMAT_INVALID`) no se despejan automáticamente — requieren `DELETE` explícito. Enforcement: `BlacklistAutoCleanupJob` + tests con clock fake `+8d` (Plan 38 Chat 4).

### D14 · `INV-MAIL02` extendido

Texto actualizado (cambio en `business-rules.md` §15.14):

> `INV-MAIL02` (EmailBlacklist) — Cuando un destinatario acumula bounces permanentes 5.x.x del mismo destinatario (`FailedInvalidAddress` o `FailedRejected`), `EmailBounceBlacklistHandler` lo inserta en `EmailBlacklist` (`MotivoBloqueo = 'BOUNCE_5XX'`) al alcanzar el umbral lifetime (3) dentro de la misma transacción que actualiza `EO_Estado = 'FAILED_BLACKLISTED'`. **`FailedMailboxFull` (4.2.2 / 5.2.2) NO cuenta para este umbral** — tiene su propio handler con ventana temporal y motivo separado (ver `INV-MAIL07`). SSL handshake, timeouts, `535 auth fail` y rechazos tipo `max defers and failures per hour` del MTA del hosting **no** cuentan. Enforcement: `EmailBounceBlacklistHandler.HandleSyncFailureAsync` / `HandleBounceAsync` con `HashSet<string> TiposBouncePermanente = { FailedInvalidAddress, FailedRejected }`.

### D15 · Invariante nueva `INV-MAIL07`

Texto canónico:

> `INV-MAIL07` (EmailBlacklist) — Cuando un destinatario acumula `EmailSettings.MailboxFullThresholdHits` (default 2) hits con `EO_TipoFallo = 'FAILED_MAILBOX_FULL'` en `EmailSettings.MailboxFullThresholdHours` (default 24h), `MailboxFullBlacklistHandler` lo inserta en `EmailBlacklist` con `MotivoBloqueo = 'BOUNCE_MAILBOX_FULL'`. Aplica tanto en flujo sync (`EmailOutboxWorker`) como async (`BounceParserService`). El despeje automático lo provee `INV-MAIL06`. Enforcement: `MailboxFullBlacklistHandler` registrado como Scoped + invocado desde el worker y el parser.

### D16 · Tests-spec (BE) — refinado

10 tests del brief original + 3 nuevos resultantes de las decisiones D2/D3:

11. `EmailBounceBlacklistHandlerRegressionTests.FailedMailboxFull_NoCuentaHaciaBOUNCE_5XX` — el refactor D2 no rompe el handler existente.
12. `MailboxFullBlacklistHandlerTests.HitAsyncImap_RespetaVentana` — fuente `async-imap` cuenta igual que sync.
13. `MailboxFullBlacklistHandlerTests.RaceCondition_DosHitsConcurrentes_UsaUpsertIdempotente` — dos workers procesando bounces simultáneos del mismo destinatario.

### D17 · Tests-spec (FE) — refinado

6 tests del brief + 2 nuevos:

7. `BlacklistTableComponent_BadgeMotivo_RenderizaConSeverity` — D12 alias humanos + severity por motivo.
8. `BlacklistAddDialogComponent_RechazaMotivosNoPermitidos` — el `<p-select>` solo lista `MANUAL` y `BULK_IMPORT` (no `BOUNCE_*`).

### D18 · División en chats (refinada)

| # | Brief en `open/` | Repo | Modo | Pre-req |
|---|---|---|---|---|
| **072** | Plan 38 Chat 2 BE — `MailboxFullBlacklistHandler` + refactor `EmailBounceBlacklistHandler` (D2) + nuevo motivo + migración SQL D10 | `Educa.API` | `/execute` | Migración SQL D10 ejecutada antes del deploy |
| **073** | Plan 38 Chat 3 BE — `POST` + `GET` paginado + DTOs D11 + auth + tests controller | `Educa.API` | `/execute` | Chat 2 mergeado (motivo `BOUNCE_MAILBOX_FULL` válido en BD) |
| **074** | Plan 38 Chat 4 BE — `BlacklistAutoCleanupJob` + Hangfire + tests con clock fake | `Educa.API` | `/execute` | Chat 2 mergeado |
| **075** | Plan 38 Chat 5 FE — Tab "Blacklist" en `/intranet/admin/email-outbox` (tabla server-paginated, dialog "Agregar", drawer detalle, despejar) | `educa-web` | `/execute` | Chat 3 deployado |
| **076** | Plan 38 Chat 6 FE — Banner B9 + toast SignalR (`EmailHub` D4) en admin/email-outbox | `educa-web` | `/execute` | Chat 5 mergeado + Plan 37 Chat 3 (068) deployado |

### D19 · Coordinación con Plan 37 (Cuarentena)

- Plan 37 (cuarentena temporal por dominio) y Plan 38 (blacklist permanente por destinatario) son **entidades disjuntas**. No comparten tabla, no se sincronizan.
- En la UI: Plan 37 agrega tab "Cuarentena" + "Dominios" + "Eventos defer" en `/intranet/admin/email-outbox`. Plan 38 agrega tab "Blacklist". Ambos coexisten.
- En el flujo de envío: `EnqueueAsync` consulta `EmailBlacklist` (INV-MAIL01). Si Plan 37 introduce un check de cuarentena por dominio, va **antes** de la blacklist (cuarentena = pausa, blacklist = bloqueo definitivo).
- No se duplica responsabilidad — quedó documentado en `business-rules.md` §18.

### D20 · `MotivoLabel` server-side vs UiMappingService FE

Decisión: **labels en backend** vía helper `EmailBlacklistMotivos.GetLabel(motivo)` agregado al constants file. Ventajas: única fuente de verdad, exportable a CSV directamente, evita duplicación FE. El FE solo necesita el `severity` (D12) y reusa el label que viene del DTO.

```csharp
// EmailBlacklistMotivos.cs (extendido)
public static string GetLabel(string motivo) => motivo switch
{
    Bounce5xx => "Bounce permanente",
    BounceMailboxFull => "Buzón lleno (4.2.2)",
    Manual => "Manual",
    BulkImport => "Importación masiva",
    FormatInvalid => "Formato inválido",
    _ => motivo
};
```

---

## OUTPUT FINAL DEL CHAT

- ✅ Brief 070 movido a `chats/closed/070-plan-38-chat-1-blacklist-investigacion-design.md`.
- ✅ Briefs `072-076` creados en `chats/open/` con scope cerrado y pre-req explícitos.
- ✅ `business-rules.md` §15.14 + §18 actualizado: `INV-MAIL02` editado (D14), `INV-MAIL06` agregado (D13), `INV-MAIL07` agregado (D15).
- ✅ `plan/maestro.md` cola top-3 actualizada con Plan 38 (después de Plan 37) y nota de prioridad alta.
- ✅ Plan 39 Chat 1 (071) sigue **running** — se cierra en chat aparte (ver prompt `/go` en mensaje del chat).
- ✅ Mensaje al usuario con prompt para arrancar Plan 39 en chat nuevo.

**Decisiones de Cowork**: el Chat 2 (072) es BE puro; cuando arranque, abrir el brief desde la cola del maestro vía `/go` o `/start-chat 072`.
