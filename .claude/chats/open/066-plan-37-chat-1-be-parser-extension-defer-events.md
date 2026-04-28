> **Repo destino**: `Educa.API` (backend, branch `master`).
> **Plan**: 37 · **Chat**: 1 · **Fase**: F1.BE · **Estado**: ⏳ pendiente arrancar.
> **Creado**: 2026-04-28 · **Modo sugerido**: `/execute` con `/design` corto inicial.

---

# Plan 37 Chat 1 — Extensión del parser IMAP a warnings/defers crónicos + tabla `EmailDeferEvent`

## CONTEXTO

El usuario observó en su bandeja `sistemas6@laazulitasac.com` 3 patrones que el sistema actual no detecta:

1. **`Warning: message delayed 72 hours`** — NDR con `Action: delayed`. El parser del Plan 31 Chat 2 solo procesa `Action: failed`. Estos warnings se ignoran y permitimos que el destinatario consuma defers durante 72h antes de detectar el problema.
2. **`Domain laazulitasac.com has exceeded the max defers and failures per hour (5/5 (100%))`** — NDR del MTA local cuando el dominio entero está bloqueado. `Status: 5.0.0` cae a `FailedUnknown`. No detectamos el momento exacto del bloqueo, solo lo inferimos del widget agregado de defer/fail status.
3. **`mailbox out of storage`** (452-4.2.2) recurrente al mismo destinatario — produce ciclos de 72h hasta NDR final 5.x.x. Hoy esperamos 3 NDR finales para blacklist (≈9 días).

## PRE-REQUISITO

✅ **Plan 31 Chat 2 verificado en prod** — el parser IMAP base debe estar corriendo (job Hangfire `bounce-parser-imap` cada 5min, filas en `BounceParserProcessed`). Si aún no se verificó, ejecutar `/verify 038` antes de arrancar este chat.

## OBJETIVO

Cerrar la ventana de detección entre "defer crónico" y "blacklist permanente". Crear un tipo de evento intermedio que permita:

- **Visibilidad temprana** — admin ve "este destinatario lleva 3 defers en 7 días" antes que se vuelva blacklist.
- **Detección activa de bloqueo del dominio** — registrar el momento en que cPanel devuelve "exceeded the max defers" con timestamp + duración estimada.
- **Materia prima para Chat 2** — la cuarentena temporal y el throttle por dominio receptor se alimentan de estos eventos.

Este chat NO modifica el comportamiento del worker ni del flujo de blacklist actual. Solo agrega telemetría que el Chat 2 consume.

## ALCANCE

### Tabla nueva en BD

```sql
CREATE TABLE EmailDeferEvent (
    EDE_CodID BIGINT IDENTITY(1,1) NOT NULL,
    EDE_TipoEvento NVARCHAR(40) NOT NULL,    -- 'WARNING_DELAYED_24H' | 'WARNING_DELAYED_72H' | 'DOMAIN_BLOCKED' | 'SOFT_BOUNCE_RECURRENT' | 'MAILBOX_FULL_TRANSIENT'
    EDE_Destinatario NVARCHAR(200) NULL,     -- null cuando es DOMAIN_BLOCKED
    EDE_DominioReceptor NVARCHAR(100) NULL,  -- gmail.com, outlook.com, laazulitasac.com (cuando es DOMAIN_BLOCKED del propio dominio)
    EDE_StatusCode NVARCHAR(10) NULL,        -- '4.2.2', '4.0.0', '5.0.0', etc.
    EDE_DiagnosticCode NVARCHAR(500) NULL,
    EDE_EmailOutboxId BIGINT NULL,           -- correlacionado si el parser pudo
    EDE_BounceParserProcessedId BIGINT NULL, -- FK a BounceParserProcessed cuando viene del parser
    EDE_Detectado NVARCHAR(20) NOT NULL,     -- 'parser-imap' | 'sync-smtp'
    EDE_Fecha DATETIME2 NOT NULL,
    EDE_FechaReg DATETIME2 NOT NULL,
    CONSTRAINT PK_EmailDeferEvent PRIMARY KEY (EDE_CodID)
);
CREATE INDEX IX_EmailDeferEvent_Destinatario_Fecha ON EmailDeferEvent(EDE_Destinatario, EDE_Fecha) WHERE EDE_Destinatario IS NOT NULL;
CREATE INDEX IX_EmailDeferEvent_Dominio_Fecha ON EmailDeferEvent(EDE_DominioReceptor, EDE_Fecha) WHERE EDE_DominioReceptor IS NOT NULL;
CREATE INDEX IX_EmailDeferEvent_Tipo_Fecha ON EmailDeferEvent(EDE_TipoEvento, EDE_Fecha);
```

**Mostrar el script al usuario antes de cualquier código** (regla `backend.md` — Migraciones y Scripts SQL). El usuario lo ejecuta manualmente en Azure SQL.

### Archivos a CREAR (4)

| # | Archivo | Rol |
|---|---------|-----|
| 1 | `Models/Sistema/EmailDeferEvent.cs` | Entidad EF (~50 ln) |
| 2 | `Constants/Sistema/EmailDeferEventTipos.cs` | Constantes de tipo + helper de detección |
| 3 | `Services/Notifications/DeferEventDetector.cs` | Lógica pura: dado un `NdrParsedResult`, decide si genera evento(s) y cuáles. Sin IO. |
| 4 | `Services/Notifications/DeferEventService.cs` | Persistencia (`RegistrarAsync(NdrParsedResult, EmailOutbox?, BounceParserProcessed?)`) |

### Archivos a MODIFICAR (3)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `Services/Notifications/Ndr3464Parser.cs` | Extraer `Action` (`delivered`/`delayed`/`failed`) del `message/delivery-status`. Hoy se asume failed. Devolver el campo en `NdrParsedResult`. |
| 2 | `Services/Notifications/BounceParserService.cs` | Tras correlacionar (o intentar correlacionar) cada NDR: invocar `DeferEventService.RegistrarAsync(...)` que decide si registra evento. NUNCA fallar el flujo principal si falla (INV-S07). Mover `Action: delayed` a `Processed` igual que los `failed` (idempotencia). |
| 3 | `Data/ApplicationDbContext.cs` | `DbSet<EmailDeferEvent>` + Fluent API. |

### Reglas de detección (en `DeferEventDetector`)

| NDR observado | Tipo de evento |
|---------------|----------------|
| `Action: delayed` con `Diagnostic-Code` que contenga `delayed 24 hours` o subject `Warning: ... delayed 24` | `WARNING_DELAYED_24H` |
| `Action: delayed` con `delayed 72 hours` o subject equivalente | `WARNING_DELAYED_72H` |
| `Action: failed` con `Diagnostic-Code` que contenga `exceeded the max defers and failures per hour` o `(5/5 (100%))` | `DOMAIN_BLOCKED` (extraer dominio del mensaje, default `laazulitasac.com`) |
| `Action: failed` con `Status: 5.2.2` o diagnostic con `mailbox is out of storage`/`out of storage space`/`OverQuotaTemp` | `MAILBOX_FULL_TRANSIENT` |
| Cualquier `Action: failed` con `Status` 4.x.x → 5.x.x final donde el destinatario YA tiene ≥1 evento `WARNING_DELAYED_*` o `MAILBOX_FULL_TRANSIENT` en últimos 7 días | `SOFT_BOUNCE_RECURRENT` |

Un mismo NDR puede generar 2 eventos (ej: `MAILBOX_FULL_TRANSIENT` + `SOFT_BOUNCE_RECURRENT`).

### Decisión clara: estos eventos NO alimentan blacklist en este chat

Los `MAILBOX_FULL_TRANSIENT` y `SOFT_BOUNCE_RECURRENT` quedan registrados como eventos. Hoy el `EmailBounceBlacklistHandler` ya alimenta blacklist al 3er bounce 5.x.x — eso sigue funcionando exactamente igual. Lo que se agrega aquí es el rastro previo, no se cambian umbrales.

El Chat 2 decide qué hacer con los eventos (cuarentena + pause de dominio).

### TESTS MÍNIMOS

| # | Caso |
|---|------|
| 1 | `DeferEventDetector` — NDR `Action: delayed 24h` → 1 evento `WARNING_DELAYED_24H` |
| 2 | `DeferEventDetector` — NDR `Action: delayed 72h` → 1 evento `WARNING_DELAYED_72H` |
| 3 | `DeferEventDetector` — NDR diagnostic con `exceeded the max defers` → 1 evento `DOMAIN_BLOCKED` con dominio extraído |
| 4 | `DeferEventDetector` — NDR `5.2.2 mailbox full` → 1 evento `MAILBOX_FULL_TRANSIENT` |
| 5 | `DeferEventDetector` — NDR final 5.x.x con 1 warning previo en DB → 2 eventos (transient + recurrent) |
| 6 | `DeferEventService` — registra evento incluso si el outbox no se correlacionó |
| 7 | `BounceParserService` — `Action: delayed` ahora se mueve a `Processed` (idempotencia) |
| 8 | `BounceParserService` — falla del `DeferEventService` no rompe el flujo (INV-S07) |

### REGLAS OBLIGATORIAS

- ✅ **300 líneas máximo por `.cs`** — `BounceParserService` ya está cerca, considerar `BounceParserService.DeferEvents.cs` partial.
- ✅ `AsNoTracking()` en lecturas para detectar `SOFT_BOUNCE_RECURRENT` (consulta `EmailDeferEvent` últimos 7 días por destinatario).
- ✅ Logs estructurados con email enmascarado.
- ✅ INV-S07: detector falla → log warning, parser sigue.

## FUERA DE ALCANCE

- ❌ NO crear cuarentena (Chat 2).
- ❌ NO crear pause por dominio receptor (Chat 2).
- ❌ NO modificar `EmailBounceBlacklistHandler` ni cambiar umbral 3.
- ❌ NO crear endpoints admin para listar eventos (Chat 3 FE).
- ❌ NO crear widget FE (Chat 3).
- ❌ NO purgar `EmailDeferEvent` (chat futuro si la tabla crece).

## CRITERIOS DE CIERRE

```
[ ] Script SQL mostrado al usuario y ejecutado en Azure SQL
[ ] EmailDeferEvent model + DbSet + Fluent API
[ ] Constants EmailDeferEventTipos con 5 tipos + helpers
[ ] DeferEventDetector puro implementado con 5 reglas
[ ] DeferEventService con RegistrarAsync (auditoría completa)
[ ] Ndr3464Parser extrae Action + lo expone en NdrParsedResult
[ ] BounceParserService invoca detector + service por cada NDR (failed Y delayed)
[ ] Action: delayed se mueve a Processed
[ ] 8 tests pasan, baseline previo intacto (≥1336)
[ ] dotnet build + dotnet test verde
[ ] Verificación post-deploy: filas en EmailDeferEvent tras primer ciclo con NDRs delayed reales
[ ] Memoria nueva: "EmailDeferEvent activo desde {fecha} — alimenta cuarentena del Chat 2"
```

## COMMIT MESSAGE sugerido

```
feat(email-outbox): add EmailDeferEvent telemetry for soft/delayed bounces

- Add "EmailDeferEvent" model + table for chronic defer telemetry
  (5 event types: WARNING_DELAYED_24H/72H, DOMAIN_BLOCKED,
  MAILBOX_FULL_TRANSIENT, SOFT_BOUNCE_RECURRENT)
- Extend "Ndr3464Parser" to extract "Action" field from
  delivery-status part (delivered/delayed/failed); previously only
  "failed" was processed
- Add "DeferEventDetector" pure rule engine that maps a
  "NdrParsedResult" to zero or more event types
- Add "DeferEventService" persisting events alongside parser flow
  (fire-and-forget per INV-S07 — detector failures never break
  the bounce parser job)
- Move "Action: delayed" NDRs to Processed folder for idempotency

Plan 37 Chat 1 — closes the visibility gap between transient defers
(72h delays, mailbox-full bursts) and permanent blacklist threshold.
Foundation for Chat 2 quarantine + recipient-domain throttle.
```

## DECISIONES PENDIENTES (preguntar al inicio del chat)

1. **¿El parser del Plan 31 Chat 2 está verificado en prod?** Si no, hacer `/verify 038` primero. Si nunca se desplegó, este chat se bloquea.
2. **Fixtures de NDRs reales** — pedir 3-4 archivos `.eml` de la bandeja `sistemas6@`: uno de cada tipo (delayed 24h, delayed 72h, exceeded max defers, mailbox out of storage). Sin fixtures reales, los tests se quedan heurísticos.
3. **Heurística de subject vs diagnostic-code** — algunos NDRs traen el motivo en `Subject` (`Warning: message ... delayed 72 hours`) y otros en `Diagnostic-Code`. Confirmar con fixtures que ambas rutas funcionan.
