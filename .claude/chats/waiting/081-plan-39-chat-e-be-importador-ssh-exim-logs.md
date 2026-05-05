# Plan 39 Chat E BE — Importador SSH de logs Exim (HOLD — criterio reactivación pendiente)

> **Repo destino**: `Educa.API` (master)
> **Plan**: 39 · **Chat**: E · **Fase**: F2.Execute · **Estado**: 🔒 **HOLD** — criterio reactivación pendiente
> **Creado**: 2026-04-29 · **Modo sugerido**: `/execute` (cuando se reactive)
> <!-- on-hold-criteria-pending -->

## CONTEXTO INMEDIATO

Cierre del design en chat 071 (Plan 39 Chat 1). D6 cerró este chat como **HOLD**, no NO-GO.

**Razón del HOLD**: Plan 38 Chat 2 (`MailboxFullBlacklistHandler`) ataca el 67% del incidente del 2026-04-29 (218/327 hits eran de un destinatario con 4.2.2 crónico). Antes de invertir en SSH (costo permanente: credenciales en KeyVault, paridad dev/prod del path Exim, idempotencia por `messageId`, parser brittle), hay que medir cuánto destapa Plan 38 Chat 2 en producción.

## CRITERIOS DE REACTIVACIÓN A GO (cualquiera dispara)

1. **30 días post-deploy de Plan 38 Chat 2 (072)**: si el contador `EmailBlacklistHits{motivo=BOUNCE_MAILBOX_FULL}` no captura ≥80% de los destinatarios que terminaron en `DOMAIN_BLOCKED` (medible cruzando `EmailBlacklist` con eventos de bloqueo del dominio en cPanel via OPS), el handler está perdiendo casos → SSH es necesario para análisis retrospectivo >10d.
2. **OPS aprueba SSH explícitamente** (Plan 29 Chat 3 OPS pendiente — si OPS abre acceso, el costo de credenciales ya está pagado).
3. **2+ incidentes en un trimestre que requieran análisis >10d retro** (cPanel pierde Track Delivery a 10d). Si pasa una vez, es ruido. Si pasa dos veces en un trimestre, GO.

## CRITERIO DE NO-GO DEFINITIVO

Si ninguno de los 3 criterios anteriores se cumple en **90 días post-cierre del Plan 39 Chat A+B+C+D**: archivar este brief a `closed/` con motivo "no se justificó" y eliminar el plan de la cola del maestro.

## OBJETIVO (cuando se reactive)

`ExpiredEximLogImportJob` — job nocturno (Hangfire) que parsea logs Exim del hosting via SSH y los importa a tabla `EmailExpiredLog` o equivalente.

## SCOPE PRELIMINAR (no iniciar sin reactivación)

### Modelo de datos

- Nueva tabla `EmailExpiredLog`:
  - `EEL_CodID` PK
  - `EEL_MessageId` (Exim queue id, único)
  - `EEL_Destinatario`
  - `EEL_FechaEvento`
  - `EEL_TipoEvento` (`accepted`, `defer`, `failure`, `delivered`)
  - `EEL_RawLine` (línea cruda Exim)
  - `EEL_FechaImport`
- Tabla auxiliar `EximLogImportProcessed` con unique constraint sobre `messageId` para idempotencia.

### Job

- `ExpiredEximLogImportJob` — Hangfire recurrente diario (04:00 hora Perú).
- SSH connection via `Renci.SshNet` o `SSH.NET`. Credenciales en Azure Key Vault.
- Parser de log Exim formato estándar (regex testeado contra muestras reales).
- Idempotencia: skip si `messageId` ya está en `EximLogImportProcessed`.
- Retención: borrar registros de `EmailExpiredLog` >90d.

### Invariante nueva

Si se reactiva, agregar `INV-MAIL09` a `business-rules.md`:

> `INV-MAIL09` — El importador `ExpiredEximLogImportJob` es idempotente por `EEL_MessageId` (Exim queue id) y no duplica filas. Tabla auxiliar `EximLogImportProcessed` con unique constraint enforce la idempotencia. Frecuencia: diaria 04:00 Perú. Retención de logs importados: 90 días.

### Tests

- `ExpiredEximLogImportJobTests.ParseaLineaAceptada`.
- `ExpiredEximLogImportJobTests.ParseaLineaDefer`.
- `ExpiredEximLogImportJobTests.IdempotencyPorMessageId`.
- `ExpiredEximLogImportJobTests.SshConnectionFalla_NoLanzaExcepcion`.

## REFERENCIAS

- Brief design: `.claude/chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md` (D6 — criterios HOLD/GO/NO-GO).
- Plan: `.claude/plan/monitoreo-empirico-mejoras.md` (sección 3.7).
- Patrón Hangfire: `Services/Sistema/HangfireExtensions.cs`.

## SEÑAL DE REACTIVACIÓN

Cuando se cumpla algún criterio de §"CRITERIOS DE REACTIVACIÓN A GO":

1. Editar este brief: cambiar estado de `🔒 HOLD` a `⏳ pendiente arrancar` y eliminar `<!-- on-hold-criteria-pending -->`.
2. Documentar cuál criterio disparó GO (con fecha + evidencia).
3. Agregar item al maestro como prioridad media.
4. Arrancar con `/start-chat 081`.

Si se cumple criterio NO-GO definitivo, mover a `closed/` con motivo "no se justificó tras 90d".
