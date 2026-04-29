# Plan 38 — Detección preventiva + UI admin de EmailBlacklist

**Estado**: Diseñado — Chat 1 en `running` (prioridad alta)
**Fecha diseño**: 2026-04-29
**Decisor**: `area.sistemas.min@gmail.com`
**Origen**: incidente 2026-04-29 — bloqueo del dominio `laazulitasac.com` por agotar `max_defer_fail_percentage` (5/h) con 4 reintentos a `evaavellanedaperez1985@gmail.com` y 3 a `kysa14.1994@gmail.com`, ambos con buzón 4.2.2 lleno. Mitigado a mano con INSERT SQL en `EmailBlacklist` (ver `sql/blacklist-3-destinatarios-2026-04-29.sql`).

---

## 1. Dimensión del problema

### 1.1 Lo que cubre hoy el sistema (verificado en código)

| Capa | Mecanismo | Cubre |
|---|---|---|
| `EmailValidator` (pre-encolado) | `INV-MAIL01` | Formato inválido / caracteres invisibles |
| `EmailBlacklist` (lookup en `EnqueueAsync`) | bloqueo previo al SMTP | Correos con `EBL_Estado = 1` |
| `EmailBounceBlacklistHandler` (sync, 5.x.x) | `INV-MAIL02` — auto-blacklist al 3er bounce 5.x.x | Bounces permanentes (5.1.1, 5.7.x, etc.) |
| `BounceParserJob` (IMAP, async) | NDRs de servidores remotos | Bounces que no llegan vía SMTP sync |
| `SmtpErrorClassifier` | Decisión retry vs FAILED | 4.2.2 → `FAILED_MAILBOX_FULL` (no retry desde la API) |
| `IQuotaThrottleService` | Round-robin sender + slot | Cuota 50/h buzón, 200/h dominio |
| `INV-MAIL03` | Techo cPanel | Documentación del 5/h `max_defer_fail` |

### 1.2 Lo que NO cubre y causó el incidente

1. **4.2.2 transitorio repetido NO blacklistea.** El clasificador marca el correo como `FAILED_MAILBOX_FULL` pero `EmailBounceBlacklistHandler` solo cuenta 5.x.x (`INV-MAIL02`). Resultado: la API marca FAILED y no reintenta, pero **Exim local sí reintenta** ese mismo mensaje cada 15-30 min hasta agotar su política (4d por defecto en cPanel). Cada reintento del Exim contra Gmail = 1 defer al techo 5/h.
2. **No hay endpoint POST para agregar manualmente** a `EmailBlacklist`. El controller solo expone `DELETE /api/sistema/email-blacklist/{correo}` (despeje). El INSERT de hoy se hizo por SQL directo.
3. **No hay UI admin para listar / filtrar / buscar / agregar** entradas. La tabla solo se ve por DBA.
4. **No hay detección preventiva por patrón.** Un destinatario que fallé 4.2.2 hace 3 días puede seguir encolándose cada mañana y consumir el techo otra vez.
5. **No hay alerta** cuando el sistema se acerca al techo 5/h (ya existe el widget defer-fail del Plan 29 Chat 2.6, pero no notifica al Director).

### 1.3 Datos del incidente (referencia para tests)

- `evaavellanedaperez1985@gmail.com` — 4 defers 4.2.2 en 1h54m
- `kysa14.1994@gmail.com` — 3 defers 4.2.2 (2 cuentas: sistemas@ y sistemas7@)
- `lisset21_2015@hotmail.com` — defer/fail no clasificado, llegó al 5/5 a las 9:26
- Track Delivery cPanel: 1466 registros 24h, ~70% del volumen va a Gmail

---

## 2. Objetivo

1. Cerrar la puerta por la que se cuelan los 4.2.2 repetidos antes de que Exim los reintente.
2. Dar al Director una pantalla operativa para ver / agregar / despejar bloqueos sin pasar por DBA.
3. Detectar patrones que anuncian el bloqueo del dominio antes de que ocurra.

---

## 3. Decisiones tomadas

| # | Punto | Decisión | Justificación |
|---|---|---|---|
| P1 | Tratamiento de 4.2.2 | **Auto-blacklist tras 2 hits 4.2.2 al mismo destinatario en 24h**, motivo `BOUNCE_MAILBOX_FULL` (nuevo). Umbral configurable en `EmailSettings` | Evita que Exim reintente en bucle. 2 hits ≠ blacklist permanente: el job de despeje (P5) lo libera tras 7 días si no hay más hits |
| P2 | Endpoint POST manual | Agregar `POST /api/sistema/email-blacklist` con body `{correo, motivo, observacion}`. Rol `Administrativos`. Motivo siempre `MANUAL` o `BULK_IMPORT` | Sin esto, mitigaciones rápidas requieren DBA |
| P3 | Endpoint GET de listado | Agregar `GET /api/sistema/email-blacklist?estado=&motivo=&q=&page=&pageSize=`. Server-paginated (variante A wrapper paginado, ver `rules/pagination.md`) | El listado es el corazón de la UI. Sin server-paginated colapsa con 5k+ entradas |
| P4 | UI admin | Nueva tab "Blacklist" en `/intranet/admin/email-outbox` (junto a Cuarentena del Plan 37) | Mismo módulo, mismo Director, no fragmentar |
| P5 | Despeje automático | Job nocturno: `EBL_Estado = 0` para entradas con `EBL_FechaUltimoFallo < hoy - 7d` y motivo `BOUNCE_MAILBOX_FULL` | 4.2.2 puede ser temporal — re-permitir tras 1 semana sin actividad |
| P6 | Alerta al Director | Toast SignalR + banner B9 cuando `defer-fail-status` llega a 4/5 (umbral configurable) | Avisar antes de bloquear el dominio, no después |
| P7 | Telemetría | Counter `EmailBlacklistHits` (tags: motivo, origen [auto/manual/4.2.2]) | Para medir efectividad del 4.2.2-detector y justificar/desactivar el umbral |

---

## 4. Alcance

### IN

- BE
  - Nuevo handler `MailboxFullBlacklistHandler` que cuenta hits 4.2.2 por destinatario en ventana 24h y blacklistea al 2º hit
  - Nuevo motivo `BOUNCE_MAILBOX_FULL` (con CHECK constraint update)
  - `POST /api/sistema/email-blacklist` con DTO `CrearBlacklistRequest` + service + repo
  - `GET /api/sistema/email-blacklist?...` paginado + búsqueda
  - Job nocturno `BlacklistAutoCleanupJob` (Hangfire o BackgroundService)
  - Tests: handler con escenario incidente 2026-04-29 reproducible
  - Migración SQL: nuevo motivo en CHECK + columnas de telemetría si aplica
- FE
  - Tab "Blacklist" en `/intranet/admin/email-outbox` con tabla server-paginated, filtros (estado, motivo, búsqueda), drawer de detalle, dialog de "Agregar manualmente", botón "Despejar"
  - Banner B9 + toast SignalR en `/intranet/admin/email-outbox` cuando `defer-fail` ≥ 4/5
  - Export CSV
- Docs
  - `INV-MAIL02` extendido para incluir `BOUNCE_MAILBOX_FULL` (no solo 5.x.x)
  - Nueva invariante `INV-MAIL06` — auto-cleanup de 7d para mailbox-full
  - `business-rules.md` §18 actualizado

### OUT

- Migración a ACS (sigue su propio plan `migracion-smtp-acs.md`) — este plan opera sobre cPanel
- Importación masiva desde CSV/Excel (puede ser chat futuro si surge necesidad)
- Whitelist (ningún caso lo justifica hoy)
- Sincronización con quarantine de Plan 37 (son dominios distintos: blacklist = destinatario permanente, quarantine = pausa temporal con expiry)

---

## 5. Invariantes afectadas

| Invariante | Acción |
|---|---|
| `INV-MAIL01` (validación pre-encolado) | Sin cambios |
| `INV-MAIL02` (auto-blacklist) | **Extendida**: 3+ bounces 5.x.x **O** 2+ hits 4.2.2 en 24h |
| `INV-MAIL03` (techo cPanel 5/h) | Sin cambios — la mitigación reduce su disparo |
| `INV-MAIL04'` (widget defer-fail) | **Extendida**: dispara toast SignalR al 4/5 |
| `INV-S07` (fail-open) | Sin cambios |

### Invariante nueva

| Invariante | Qué promete | Enforcement |
|---|---|---|
| `INV-MAIL06` | Una entrada `EmailBlacklist` con motivo `BOUNCE_MAILBOX_FULL` y sin actividad en los últimos 7 días pasa a `EBL_Estado = 0` automáticamente | Job nocturno + test de integración con clock fake |

---

## 6. División en chats

| Chat | Capa | Contenido | Estado |
|---|---|---|---|
| **Chat 1** (070) | Mixto | Investigación cierre (este documento ya cubre casi todo) + smoke design + decisión final de umbrales 2/24h y 7d cleanup. Output: queda un design.md con tablas SQL/DTOs concretos y los tests que se esperan | ⏳ **running** (este chat) |
| Chat 2 | BE | `MailboxFullBlacklistHandler` + nuevo motivo + migración SQL CHECK + tests con escenario 2026-04-29 | pendiente |
| Chat 3 | BE | `POST` + `GET` blacklist + DTOs + paginación + auth + tests controller | pendiente |
| Chat 4 | BE | `BlacklistAutoCleanupJob` + tests con clock fake | pendiente |
| Chat 5 | FE | Tab Blacklist (tabla, filtros, drawer, dialog agregar, despejar, export CSV) | pendiente, depende Chat 3 |
| Chat 6 | FE | Banner B9 + toast SignalR en admin/email-outbox | pendiente, depende Plan 37 Chat 3 (ya open) |

---

## 7. Archivos previstos

### BE (`Educa.API`)

- `Models/Notifications/EmailBlacklist.cs` — nuevos motivos en doc-comment
- `Constants/Sistema/EmailBlacklistMotivos.cs` — `+BounceMailboxFull`
- `Services/Notifications/MailboxFullBlacklistHandler.cs` — **nuevo**
- `Services/Notifications/BlacklistAutoCleanupJob.cs` — **nuevo**
- `Controllers/Sistema/EmailBlacklistController.cs` — agregar `POST` + `GET`
- `DTOs/Notifications/CrearBlacklistRequest.cs` + `EmailBlacklistListadoDto.cs` — **nuevos**
- `Repositories/Notifications/EmailBlacklistRepository.cs` — agregar `ListarPaginadoAsync`, `ContarHits4XXAsync`, `LimpiarVencidasAsync`
- `Migrations/` — nueva migración `AddBounceMailboxFullMotivo` (UPDATE CHECK constraint)
- Tests:
  - `EmailBlacklistRepositoryTests.cs` — extender
  - `MailboxFullBlacklistHandlerTests.cs` — **nuevo** con escenario incidente
  - `BlacklistAutoCleanupJobTests.cs` — **nuevo**
  - `EmailBlacklistControllerCrudTests.cs` — **nuevo**

### FE (`educa-web`)

- `src/app/features/intranet/pages/admin/email-blacklist/...` — **nuevo módulo lazy**:
  - `email-blacklist.component.{ts,html,scss}`
  - `services/email-blacklist.{service,store,facade}.ts`
  - `components/blacklist-table/`, `blacklist-detail-drawer/`, `blacklist-add-dialog/`
  - `models/blacklist.models.ts`
- `src/app/features/intranet/pages/admin/email-outbox/email-outbox.component.{ts,html}` — agregar tab "Blacklist" + banner B9 + listener SignalR
- `src/app/core/services/signalr/email-defer-alert.service.ts` — **nuevo** (reusa `AsistenciaHub` o crea `EmailHub`)

### Docs

- `.claude/rules/business-rules.md` §18 — invariantes actualizadas
- `.claude/rules/business-rules.md` §nueva `INV-MAIL06`

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Auto-blacklist por 4.2.2 lockea destinatario legítimo que liberó espacio en su buzón | Cleanup automático a los 7d (P5) + UI para despeje manual rápido (P4) |
| Umbral 2/24h muy agresivo o muy laxo | Configurable vía `EmailSettings.MailboxFullThresholdHits` y `MailboxFullThresholdHours` — ajustable sin redeploy |
| `POST` mal usado bloquea al colegio entero | Validación de motivo permitido (solo `MANUAL` / `BULK_IMPORT`), audit en `EBL_UsuarioReg`, soft-delete + reversibilidad |
| Doble blacklist (handler 5.x.x + handler 4.2.2 al mismo correo) | Repo upsert idempotente — ya implementado con índice único filtrado |

---

## 9. Criterios de aceptación

- Al replicar el escenario del 2026-04-29 en tests, la 2ª llegada de un correo a `evaavellanedaperez1985@gmail.com` se rechaza pre-encolado, **sin tocar SMTP**.
- El Director ve la lista de blacklist en `/intranet/admin/email-outbox?tab=blacklist`, puede filtrar por motivo, agregar manualmente y despejar.
- Banner B9 aparece cuando el contador `defer-fail-status` llega a 4/5, antes del bloqueo total.
- Tests BE pasan al 100%, FE specs verdes.
- Smoke check: enviar 3 correos a un destinatario con buzón lleno controlado en sandbox, verificar que el 3º se rechaza pre-encolado.
