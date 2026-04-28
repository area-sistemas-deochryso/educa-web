> **Repo destino**: `Educa.API` (backend, branch `master`).
> **Plan**: 37 · **Chat**: 2 · **Fase**: F2.BE · **Estado**: ⏳ pendiente arrancar (depende de Chat 1).
> **Creado**: 2026-04-28 · **Modo sugerido**: `/design` corto + `/execute`.

---

# Plan 37 Chat 2 — Cuarentena temporal por destinatario + pause por dominio receptor

## DEPENDENCIA

✅ **Chat 1 (066) cerrado y verificado** — la tabla `EmailDeferEvent` debe existir en prod con datos reales (al menos 24h post-deploy del Chat 1 para que se acumulen eventos representativos).

## CONTEXTO

Chat 1 generó la telemetría. Este chat la usa para **cortar el ciclo de defers crónicos antes de que agoten el contador `max_defer_fail_percentage = 5/h` del dominio** (INV-MAIL03).

Hoy `EmailBlacklist` es permanente (3 bounces 5.x.x → bloqueo definitivo, INV-MAIL02). Falta el escalón intermedio:

- **Cuarentena temporal de destinatario**: 24-72h fuera del flujo, auto-libera.
- **Pause por dominio receptor**: cuando `gmail.com` empieza a diferir crónicamente, pausamos TODOS los `@gmail.com` por 60 min para no consumir más defers.

## OBJETIVO

Reducir el ratio de fallos que consumen el contador 5/h del MTA local. Cuando una cuarentena o pause aplica, el correo se rechaza ANTES de tocar el SMTP — no consume contador (igual que INV-MAIL01 con blacklist permanente).

## ALCANCE

### Tablas nuevas en BD

#### `EmailQuarantine` — destinatario temporalmente fuera

```sql
CREATE TABLE EmailQuarantine (
    EQU_CodID BIGINT IDENTITY(1,1) NOT NULL,
    EQU_Destinatario NVARCHAR(200) NOT NULL,
    EQU_Motivo NVARCHAR(40) NOT NULL,           -- 'MAILBOX_FULL' | 'SOFT_BOUNCE_REPEATED' | 'DELAY_72H' | 'MANUAL'
    EQU_RetryAfter DATETIME2 NOT NULL,          -- destinatario sale de cuarentena automáticamente cuando now > RetryAfter
    EQU_QuarantineCount INT NOT NULL,           -- contador histórico; 3+ → promoción a EmailBlacklist permanente
    EQU_OriginEventId BIGINT NULL,              -- FK a EmailDeferEvent que disparó esta cuarentena
    EQU_Estado BIT NOT NULL,                    -- 1 activa, 0 liberada (no físico delete)
    EQU_FechaLiberacion DATETIME2 NULL,
    EQU_MotivoLiberacion NVARCHAR(40) NULL,     -- 'AUTO_EXPIRED' | 'MANUAL_RELEASE' | 'PROMOTED_BLACKLIST'
    EQU_UsuarioReg NVARCHAR(50) NOT NULL,
    EQU_FechaReg DATETIME2 NOT NULL,
    EQU_UsuarioMod NVARCHAR(50) NULL,
    EQU_FechaMod DATETIME2 NULL,
    EQU_RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_EmailQuarantine PRIMARY KEY (EQU_CodID)
);
CREATE UNIQUE INDEX UX_EmailQuarantine_DestinatarioActiva
    ON EmailQuarantine(EQU_Destinatario)
    WHERE EQU_Estado = 1;
CREATE INDEX IX_EmailQuarantine_RetryAfter ON EmailQuarantine(EQU_RetryAfter) WHERE EQU_Estado = 1;
```

#### `EmailRecipientDomainPause` — dominio receptor pausado

```sql
CREATE TABLE EmailRecipientDomainPause (
    ERP_CodID BIGINT IDENTITY(1,1) NOT NULL,
    ERP_Dominio NVARCHAR(100) NOT NULL,         -- gmail.com, outlook.com, hotmail.com, etc.
    ERP_PausedUntil DATETIME2 NOT NULL,
    ERP_Motivo NVARCHAR(40) NOT NULL,           -- 'DEFER_BURST' | 'DOMAIN_BLOCKED_NDR' | 'MANUAL'
    ERP_TriggerEventCount INT NOT NULL,         -- cuántos defers en la ventana de detección
    ERP_Estado BIT NOT NULL,
    ERP_FechaLiberacion DATETIME2 NULL,
    ERP_UsuarioReg NVARCHAR(50) NOT NULL,
    ERP_FechaReg DATETIME2 NOT NULL,
    ERP_UsuarioMod NVARCHAR(50) NULL,
    ERP_FechaMod DATETIME2 NULL,
    ERP_RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_EmailRecipientDomainPause PRIMARY KEY (ERP_CodID)
);
CREATE UNIQUE INDEX UX_EmailRecipientDomainPause_DominioActivo
    ON EmailRecipientDomainPause(ERP_Dominio)
    WHERE ERP_Estado = 1;
```

**Mostrar ambos scripts al usuario antes de cualquier código.**

### Reglas de promoción a cuarentena

Disparadas por `DeferEventService.RegistrarAsync` después de insertar evento (Chat 1 deja el hook abierto):

| Trigger | Acción |
|---------|--------|
| 1× evento `MAILBOX_FULL_TRANSIENT` para destinatario sin cuarentena activa | Cuarentena 24h, motivo `MAILBOX_FULL` |
| 2+ eventos soft (cualquier `WARNING_DELAYED_*` o `MAILBOX_FULL_TRANSIENT` o `SOFT_BOUNCE_RECURRENT`) en últimos 7 días para mismo destinatario | Cuarentena 48h, motivo `SOFT_BOUNCE_REPEATED` |
| 1× evento `WARNING_DELAYED_72H` | Cuarentena 24h, motivo `DELAY_72H` |
| 3ra cuarentena del mismo destinatario (counter `EQU_QuarantineCount` ≥ 3 al insertar) | Insertar en `EmailBlacklist` con motivo `BOUNCE_5XX_AFTER_QUARANTINE`, NO crear cuarentena. Promoción permanente. |

### Reglas de pause por dominio receptor

Disparadas por mismo hook:

| Trigger | Acción |
|---------|--------|
| 1× evento `DOMAIN_BLOCKED` (es el propio dominio bloqueado por cPanel) | NO crear pause (ya estamos bloqueados, agregar pause no ayuda). Solo registrar para visibilidad del Chat 3. |
| 3+ eventos `WARNING_DELAYED_*` o `MAILBOX_FULL_TRANSIENT` al mismo `EDE_DominioReceptor` (extraído del email) en última 1h | Pause de ese dominio receptor por 60 min, motivo `DEFER_BURST` |

### Hook en `EmailOutboxService.EnqueueAsync` (extiende INV-MAIL01)

Orden de chequeos antes de crear la fila `EmailOutbox`:

1. Validar formato (`EmailValidator.Validate`) — ya existe.
2. ¿Está en `EmailBlacklist` activa? → rechazar (existente, INV-MAIL01).
3. **NUEVO**: ¿Está en `EmailQuarantine` activa con `EQU_RetryAfter > now`? → rechazar con `LogInformation` y status `QUARANTINED` (no encolar, no consumir contador).
4. **NUEVO**: ¿El dominio del destinatario está en `EmailRecipientDomainPause` activa con `ERP_PausedUntil > now`? → rechazar con `LogInformation` y status `DOMAIN_PAUSED`.
5. Si todo pasa, crear la fila como hoy.

**Comportamiento del retorno de `EnqueueAsync`**: hoy devuelve `Guid` o `null` (validación fallida). Cambiar a un `EnqueueResult` con `enum Outcome { Enqueued, RejectedFormat, RejectedBlacklist, RejectedQuarantine, RejectedDomainPause }`. Callers existentes que solo necesitan `Guid?` siguen funcionando (compat layer si es necesario para no romper firma).

### Auto-release jobs (Hangfire)

| Job | Cron | Acción |
|-----|------|--------|
| `email-quarantine-release` | `*/15 * * * *` | `UPDATE EmailQuarantine SET Estado=0, FechaLiberacion=now, MotivoLiberacion='AUTO_EXPIRED' WHERE Estado=1 AND RetryAfter < now` |
| `email-domain-pause-release` | `*/15 * * * *` | similar para `EmailRecipientDomainPause` |

### Endpoints admin (mínimos para Chat 3 FE)

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/sistema/email-outbox/quarantine?activas=true` | Director, AsistenteAdministrativo |
| GET | `/api/sistema/email-outbox/domain-pauses?activas=true` | mismos |
| POST | `/api/sistema/email-outbox/quarantine/{id}/release` | mismos · libera manual con observación |
| POST | `/api/sistema/email-outbox/domain-pauses/{id}/release` | mismos |
| POST | `/api/sistema/email-outbox/quarantine` | mismos · agregar manualmente (motivo `MANUAL`) |
| POST | `/api/sistema/email-outbox/domain-pauses` | mismos · agregar manualmente |
| GET | `/api/sistema/email-outbox/defer-events?desde&hasta&tipo` | mismos · timeline para Chat 3 |

DTOs con DNI/usuario enmascarados (INV-RU07-style).

### Archivos a CREAR (~10)

| # | Archivo |
|---|---------|
| 1 | `Models/Sistema/EmailQuarantine.cs` |
| 2 | `Models/Sistema/EmailRecipientDomainPause.cs` |
| 3 | `Constants/Sistema/EmailQuarantineMotivos.cs` |
| 4 | `Constants/Sistema/EmailRecipientDomainPauseMotivos.cs` |
| 5 | `Services/Notifications/EmailQuarantineService.cs` (CRUD + promoción a blacklist al 3er) |
| 6 | `Services/Notifications/EmailRecipientDomainPauseService.cs` |
| 7 | `Services/Notifications/QuarantinePromotionEvaluator.cs` (puro: dado evento + estado actual, decide si crear cuarentena/pause) |
| 8 | `Services/Sistema/EmailQuarantineReleaseJob.cs` (Hangfire wrapper) |
| 9 | `Services/Sistema/EmailRecipientDomainPauseReleaseJob.cs` (Hangfire wrapper) |
| 10 | `Controllers/Sistema/EmailQuarantineController.cs` (endpoints admin) |
| 11 | `DTOs/Sistema/EmailQuarantineDtos.cs` (Crear, Liberar, ListaItem, Detalle) |

### Archivos a MODIFICAR (5)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `Services/Notifications/EmailOutboxService.Enqueue.cs` | Agregar chequeos 3 y 4 antes de crear fila |
| 2 | `Services/Notifications/DeferEventService.cs` (Chat 1) | Tras `Add(EmailDeferEvent)`, invocar `QuarantinePromotionEvaluator` y persistir consecuencias en mismo SaveChanges |
| 3 | `Data/ApplicationDbContext.cs` | DbSets + Fluent API para 2 tablas nuevas |
| 4 | `Constants/Sistema/HangfireJobs.cs` | 2 constantes nuevas |
| 5 | `Extensions/HangfireExtensions.cs` | Registrar 2 jobs cron `*/15` |

### TESTS MÍNIMOS (15)

Cobertura crítica:

| # | Caso |
|---|------|
| 1 | `QuarantinePromotionEvaluator` — primer `MAILBOX_FULL_TRANSIENT` → cuarentena 24h |
| 2 | `QuarantinePromotionEvaluator` — 2 eventos soft en 7 días → cuarentena 48h motivo `SOFT_BOUNCE_REPEATED` |
| 3 | `QuarantinePromotionEvaluator` — 3ra cuarentena del mismo email → blacklist permanente, sin nueva cuarentena |
| 4 | `QuarantinePromotionEvaluator` — 3+ defers a `gmail.com` en 1h → pause `gmail.com` 60 min |
| 5 | `QuarantinePromotionEvaluator` — `DOMAIN_BLOCKED` propio dominio → no crea pause (solo registra) |
| 6 | `EmailOutboxService.EnqueueAsync` — destinatario en cuarentena activa → rechaza con `RejectedQuarantine` |
| 7 | `EmailOutboxService.EnqueueAsync` — dominio receptor pausado → rechaza con `RejectedDomainPause` |
| 8 | `EmailOutboxService.EnqueueAsync` — cuarentena con `RetryAfter < now` → permite encolar (auto-expira) |
| 9 | `EmailQuarantineReleaseJob` — libera todas las cuarentenas con `RetryAfter < now`, deja `MotivoLiberacion='AUTO_EXPIRED'` |
| 10 | `EmailQuarantineService.Release` — manual con observación, requiere rol Director, RowVersion check |
| 11 | `EmailQuarantineController` — POST sin rol Director → 403 |
| 12 | `EmailQuarantineController` — GET con `activas=true` → solo retorna `EQU_Estado=1` |
| 13 | Integración: Chat 1 inserta evento `MAILBOX_FULL_TRANSIENT` → flow completo crea cuarentena en mismo SaveChanges |
| 14 | INV-S07: si `QuarantinePromotionEvaluator` lanza, el insert del evento del Chat 1 NO se rollbackea (try/catch) |
| 15 | Performance: 1000 destinatarios en cuarentena, `EnqueueAsync` agrega <5ms overhead (bench manual) |

### REGLAS OBLIGATORIAS

- ✅ INV-D02 (auditoría completa).
- ✅ INV-D03 (soft-delete vía `Estado`).
- ✅ INV-D05 (AsNoTracking en queries de lectura).
- ✅ INV-D08 (ApiResponse en endpoints).
- ✅ INV-S05 (RowVersion en mutaciones manuales).
- ✅ INV-S07 (auto-release fire-and-forget; falla del evaluator no rompe Chat 1).
- ✅ INV-MAIL01 extendido a 4 capas (formato, blacklist, cuarentena, pause).
- ✅ 300 ln máx por archivo.

## FUERA DE ALCANCE

- ❌ NO modificar widget `defer-fail-status` (Plan 22 Chat B sigue funcionando).
- ❌ NO crear FE (Chat 3).
- ❌ NO purgar tablas (chat futuro a los 90/180 días).
- ❌ NO notificar al Director por correo cuando se crea cuarentena (Chat 3 si lo justifica).

## CRITERIOS DE CIERRE

```
[ ] 2 scripts SQL mostrados al usuario y ejecutados
[ ] EmailQuarantine + EmailRecipientDomainPause modelos + DbSets + Fluent API
[ ] QuarantinePromotionEvaluator puro con 5 reglas
[ ] EmailQuarantineService + EmailRecipientDomainPauseService (CRUD + auto-promoción)
[ ] EmailOutboxService.Enqueue extendido con 2 chequeos nuevos (orden correcto: blacklist → quarantine → pause)
[ ] DeferEventService de Chat 1 invoca evaluator en mismo SaveChanges
[ ] 2 Hangfire jobs de auto-release registrados con cron */15
[ ] EmailQuarantineController con 7 endpoints + DTOs + autorización Director/AsistenteAdmin
[ ] 15 tests pasan; baseline previo intacto
[ ] dotnet build + test verde
[ ] Verificación post-deploy: cuarentena de prueba creada manualmente vía endpoint, auto-release tras `RetryAfter`
[ ] INV-MAIL01 actualizado en business-rules.md describiendo las 4 capas
[ ] Memoria nueva: "Cuarentena + domain pause activos desde {fecha}"
```

## COMMIT MESSAGE sugerido

```
feat(email-outbox): add temporal quarantine + recipient-domain pause

- Add "EmailQuarantine" model + table for time-bound recipient
  exclusion (24-72h with auto-release; 3rd quarantine promotes
  to permanent blacklist)
- Add "EmailRecipientDomainPause" model + table for receiver-
  domain throttle (gmail.com, outlook.com paused 60 min when 3+
  defers in 1h)
- Add "QuarantinePromotionEvaluator" pure rule engine consuming
  "EmailDeferEvent" telemetry from Plan 37 Chat 1
- Extend "EmailOutboxService.EnqueueAsync" with 2 new pre-flight
  checks (after format + blacklist): quarantine, domain pause.
  Rejected items never touch the SMTP relay → preserve cPanel
  defer/fail counter
- Add Hangfire auto-release jobs (cron */15) for both tables
- Add admin endpoints (GET/POST) under "EmailQuarantineController"
  for manual inspection and override (Director/AsistenteAdmin)

Plan 37 Chat 2 — turns Chat 1 telemetry into active prevention.
INV-MAIL01 expanded to 4 layers: format → blacklist → quarantine
→ recipient-domain pause.
```

## DECISIONES PENDIENTES

1. **Promoción a blacklist tras 3ra cuarentena** — ¿debería ser automática o requerir confirmación admin? Recomendación: automática, motivo registrado para audit.
2. **Cap de pausados simultáneos** — ¿límite a `EmailRecipientDomainPause` activos para evitar pausar todo el universo Gmail? Recomendación: máx 5 dominios activos a la vez (alerta si supera).
3. **¿Soporte de wildcards en dominios?** (ej: `*.edu`) — Recomendación: no en este chat, casos puntuales con dominios fijos.
