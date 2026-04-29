> **Repo destino**: `Educa.API` + `educa-web` (cierre del design)
> **Plan**: 38 · **Chat**: 1 · **Fase**: F1.Design · **Estado**: ⏳ **running** — prioridad alta
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
