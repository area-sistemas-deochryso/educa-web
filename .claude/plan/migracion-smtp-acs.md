# Migración SMTP: cPanel → Azure Communication Services Email

**Estado**: Diseñado — pendiente de ejecución
**Fecha diseño**: 2026-04-24
**Decisor**: `area.sistemas.min@gmail.com`
**Supersede**: Plan 29 Chats 2.6/3/4 + Plan 31 Chat 2 (se archivan al abrir Chat 1 de ejecución)

---

## 1. Contexto

El canal SMTP actual (cPanel de Inkani Server, dominio `laazulitasac.com`) tiene un techo operativo crítico documentado en `project_smtp_defer_fail_block.md` y formalizado como `INV-MAIL03`:

- El hosting bloquea el **dominio entero** durante ~1 hora cuando acumula ≥ 5 defers+fails en 60 min.
- Correos de CrossChex con destinatarios inválidos (caracteres invisibles, buzones rebotados) agotan el contador y matan correos legítimos de otros flujos.
- Plan 29 (Chats 2.6/3/4) intentó mitigar con validación pre-encolado + auto-blacklist + widget de monitoreo. Plan 31 Chat 2 intentó parsear NDRs por IMAP para alimentar el blacklist.
- **Diagnóstico del chat de investigación previo**: el problema es estructural del hosting compartido. Ninguna mitigación en el emisor garantiza disponibilidad del canal. La solución es cambiar de canal.

## 2. Objetivo

Reemplazar el transporte SMTP de cPanel por **Azure Communication Services (ACS) Email**, un servicio transaccional con:

- SLA del 99.9% para envíos
- Telemetría nativa vía Event Grid (`EmailDeliveryReportReceived`) — elimina necesidad de parsear NDRs por IMAP
- Cuotas por recurso (no por dominio del hosting) — desaparece el techo compartido
- Reputación de IP gestionada por Azure

## 3. Decisiones tomadas

| # | Punto | Decisión | Justificación |
|---|---|---|---|
| P1 | Región Azure | Misma que el App Service de Educa.API (a confirmar en Chat 1) | Latencia mínima, sin egress inter-region |
| P2 | Inbound (recepción de correos) | **OUT del scope** | No hay caso de uso concreto. ACS Email Inbound está en preview. MX intacto, no se rompen buzones existentes. Re-abrible en chat futuro si aparece necesidad |
| P3 | Rollout | **Switch total con kill switch**. Flag binario `Email:Provider = "cpanel" \| "acs"`, default `acs` post-cutover, válvula a `cpanel` durante 2-4 semanas | Cutover de correo es alto riesgo (DKIM/SPF/DMARC warming). Kill switch es barato; perder correos por un problema de config post-deploy no lo es |
| P4 | Gestión de secretos | **Key Vault + Managed Identity + Key Vault References** | Connection string nunca en App Settings; rotación sin redeploy |
| P5 | Event Grid | Webhook directo a `POST /api/sistema/email-events` en Educa.API. Solo `EmailDeliveryReportReceived` | Sin infra adicional. Migrable a Function/Queue si el volumen lo exige |

## 4. Alcance

### IN

- Nuevo `IEmailService` con implementación ACS (`AcsEmailService`)
- Mecanismo de selección de provider con flag + kill switch
- Webhook de Event Grid para eventos de delivery/bounce
- Integración con `EmailBounceBlacklistHandler` (INV-MAIL02) desde Event Grid
- Custom domain `laazulitasac.com` verificado en ACS con DKIM
- Cambios DNS: SPF edit + DKIM add (2 CNAMEs) + DMARC opcional
- Eliminación de `CpanelEmailService`, parser IMAP, widget defer-fail (post-cutover)
- Migración Widget admin FE: `DeferFailStatusWidget` → `AcsQuotaStatusWidget`
- Actualización de `business-rules.md` §18 + invariantes
- Cancelación formal de Plan 29 Chats 2.6/3/4 y Plan 31 Chat 2

### OUT

- Inbound / recepción de correos en ACS (queda como chat futuro si aparece caso)
- Migración de buzones humanos del colegio (pertenece a **Roadmap de abandono de cPanel**, chat separado)
- Migración del sitio web público, DNS completo, MySQL, FTP (pertenece al mismo roadmap)
- Engagement tracking (open/click) — feature aparte si RRHH lo pide
- Transferencia del dominio a otro registrador
- Cambio de nameservers fuera de Inkani

## 5. Invariantes afectadas

| Invariante | Acción |
|---|---|
| `INV-MAIL01` (validación pre-encolado) | **Se mantiene sin cambios** — corre antes de resolver provider |
| `INV-MAIL02` (auto-blacklist por 3+ bounces 5.x.x) | **Se mantiene la lógica**; cambia el feeder: ahora la alimenta Event Grid en vez del parser IMAP. Mismo umbral, misma tabla `EmailBlacklist` |
| `INV-MAIL03` (techo cPanel 5/h defer+fail) | **Se deprecata con nota histórica** en `business-rules.md` tras el cutover. No se elimina — queda como referencia de por qué se migró |
| `INV-MAIL04` (widget defer-fail) | **Se reemplaza** por `INV-MAIL04'` (widget ACS quota) — mismo rol, nueva fuente |
| `INV-S07` (fire-and-forget) | **Se mantiene** — aplica a ACS igual que a cPanel |
| `INV-RU08` (notificación fire-and-forget) | **Se mantiene sin cambios** |

### Invariante nueva

| Invariante | Qué promete | Enforcement |
|---|---|---|
| `INV-MAIL05` | El webhook `POST /api/sistema/email-events` es **idempotente por `id` del evento Event Grid**. Una retransmisión del mismo evento no duplica efectos sobre `EmailOutbox` ni sobre el contador de blacklist | Tabla `EventGridProcessedEvents` (o columna `EO_AcsEventIdsProcessed`) con unique constraint. Verificado por test de idempotencia en `EmailEventsControllerTests` |

## 6. Archivos — Backend

### Crear

| Archivo | Rol |
|---|---|
| `Educa.API/Services/Email/AcsEmailService.cs` | Implementa `IEmailService` usando `Azure.Communication.Email` SDK |
| `Educa.API/Services/Email/EmailProviderSelector.cs` | Lee `Email:Provider` del `IConfiguration`; resuelve `IEmailService` concreto para el worker |
| `Educa.API/Controllers/Sistema/EmailEventsController.cs` | `POST /api/sistema/email-events` — handshake de Event Grid + dispatch al handler |
| `Educa.API/Services/Email/EventGrid/EmailDeliveryEventHandler.cs` | Procesa `EmailDeliveryReportReceived` → actualiza `EmailOutbox.EO_Estado` + alimenta `EmailBounceBlacklistHandler` (INV-MAIL02) |
| `Educa.API/Services/Email/EventGrid/EventGridSubscriptionValidator.cs` | Valida `SubscriptionValidationEvent` (handshake inicial de Event Grid) |
| `Educa.API/Services/Email/EventGrid/EventGridIdempotencyStore.cs` | Enforcement de `INV-MAIL05` — registra IDs de eventos ya procesados |
| `Educa.API/Controllers/Sistema/EmailProviderStatusController.cs` | `GET /api/sistema/email-provider-status` — consumido por `AcsQuotaStatusWidget` del FE |
| `Educa.API/Models/Sistema/EventGridProcessedEvent.cs` | Entidad para idempotencia |
| `Educa.API.Tests/Controllers/EmailEventsControllerTests.cs` | Tests: handshake, idempotencia INV-MAIL05, actualización de EmailOutbox, feeder INV-MAIL02 |

### Modificar

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Email/EmailService.cs` (o equivalente actual) | Renombrar a `CpanelEmailService.cs` — hoy es la única implementación y el nombre es ambiguo |
| `Educa.API/Services/Email/EmailOutboxWorker.cs` | Resolver provider vía `EmailProviderSelector` antes del envío. Persistir `EO_ProviderUsed` y `EO_AcsMessageId` en la fila |
| `Educa.API/Services/Email/EmailBounceBlacklistHandler.cs` | Aceptar input desde Event Grid además del parser IMAP (hasta Fase 6 donde se elimina IMAP) |
| `Educa.API/appsettings.json` + `appsettings.Development.json` | Config `Email:Provider` (default `cpanel` hasta cutover), `Azure:Communication:ConnectionString` (Key Vault reference), `Azure:EventGrid:ValidationCode` |
| `Educa.API/Program.cs` | DI: registrar ambas implementaciones de `IEmailService`, Key Vault + Managed Identity, mapping del controller de eventos |
| `Educa.API/Data/ApplicationDbContext.cs` | `DbSet<EventGridProcessedEvent>` + Fluent API de `EmailOutbox` para nuevas columnas |
| `Educa.API/Educa.API.csproj` | Agregar paquetes NuGet: `Azure.Communication.Email`, `Azure.Identity`, `Azure.Messaging.EventGrid`, `Azure.Extensions.AspNetCore.Configuration.Secrets` |

### Eliminar (solo después de 2-4 semanas con `acs` como provider único — Chat 6)

| Archivo | Cuándo |
|---|---|
| `Educa.API/Services/Email/CpanelEmailService.cs` | Chat 6 |
| Parser IMAP del Plan 31 Chat 2 (archivos exactos pendientes de identificar en Chat 6) | Chat 6 |
| `Educa.API/Controllers/Sistema/DeferFailStatusController.cs` (o equivalente del endpoint `defer-fail-status`) | Chat 6 |
| Job/worker del parser IMAP | Chat 6 |

## 7. Archivos — Frontend

### Crear

| Archivo | Rol |
|---|---|
| `src/app/features/intranet/pages/admin/email-outbox/components/acs-quota-status-widget/` (o ruta equivalente) | Reemplaza `DeferFailStatusWidget` |
| `src/app/core/services/email-provider-status/email-provider-status.service.ts` | Consume `GET /api/sistema/email-provider-status` |

### Modificar

| Archivo | Cambio |
|---|---|
| Página admin de Email Outbox (ubicación exacta en Chat 7) | Swap del widget defer-fail por `AcsQuotaStatusWidget` |

### Eliminar (Chat 7)

| Archivo | Cuándo |
|---|---|
| `DeferFailStatusWidget` y su service | Chat 7, mismo commit que el swap |

## 8. Infraestructura Azure

Provisionado en Chat 1 con guía paso a paso (el decisor no tiene experiencia previa con estos recursos):

| Recurso | Configuración |
|---|---|
| Resource Group | Reusar el del App Service existente |
| Communication Services | Plan Standard |
| Email Communication Services (child) | Data location que corresponda a la región del App Service |
| Azure-managed domain | Habilitado para pruebas iniciales (Chat 1) |
| Custom domain `laazulitasac.com` | Verificado con DKIM en Chat 2 |
| Key Vault | Crear nuevo si no existe; reusar si existe |
| Managed Identity del App Service | System-assigned |
| RBAC en Key Vault | Role `Key Vault Secrets User` para la Managed Identity |
| Event Grid System Topic | Sobre el recurso de Communication Services |
| Event Grid Subscription | Filtro: solo `Microsoft.Communication.EmailDeliveryReportReceived`. Endpoint: `https://educa1.azurewebsites.net/api/sistema/email-events` (o la URL del App Service actual) |

## 9. DNS (zona gestionada en cPanel de Inkani — Zone Editor)

### Estado actual (capturado 2026-04-24)

```
MX     laazulitasac.com                   Preference 0 → laazulitasac.com
TXT    laazulitasac.com                   v=spf1 +a +mx +ip4:198.50.167.165 +ip4:148.113.163.27 ~all
TXT    default._domainkey.laazulitasac.com v=DKIM1; k=rsa; p=MIIBIj...QAB;
TXT    _dmarc.laazulitasac.com            v=DMARC1; p=none;
NS                                        ns5.inkaniserver.net, ns6.inkaniserver.net
```

### Cambios requeridos

| Registro | Acción | Valor final |
|---|---|---|
| **MX** | No se toca | Preserva buzones existentes en Inkani |
| **SPF** (TXT @) | **Editar** — agregar include de ACS | `v=spf1 +a +mx +ip4:198.50.167.165 +ip4:148.113.163.27 include:<host-acs> ~all` (host exacto lo provee Azure al verificar dominio) |
| **DKIM** `selector1._domainkey` | **Agregar CNAME** (valor dado por Azure) | Ej: `selector1._domainkey` → `selector1-laazulitasac-com._domainkey.azurecomm.net` |
| **DKIM** `selector2._domainkey` | **Agregar CNAME** (valor dado por Azure) | Ej: `selector2._domainkey` → `selector2-laazulitasac-com._domainkey.azurecomm.net` |
| **DKIM** `default._domainkey` | No se toca | Lo sigue usando cPanel hasta Chat 6 |
| **DMARC** (TXT `_dmarc`) | **Editar opcionalmente** — agregar `rua` para recibir reportes | `v=DMARC1; p=none; rua=mailto:dmarc@laazulitasac.com` (usar correo que se lea) |

### Notas operativas

- El SPF tiene ~3 lookups DNS hoy de los 10 permitidos. Agregar `include:` de ACS suma 1-3 más. Dentro del límite.
- Los DKIM de cPanel (`default`) y los de ACS (`selector1`, `selector2`) conviven sin colisión.
- TTL actual 7200 (2h). Bajar a 300 (5 min) 24h antes del cutover (Chat 5) para acelerar propagación; volver a 7200 después.
- No subir DMARC a `p=quarantine` antes de validar que ACS envía con alineación correcta (post-cutover, Chat 7 o posterior).

## 10. Migration SQL (Chat 3)

```sql
-- EmailOutbox: columnas nuevas para telemetría de provider y correlación
ALTER TABLE EmailOutbox
ADD EO_ProviderUsed NVARCHAR(10) NULL,
    EO_AcsMessageId NVARCHAR(100) NULL;

-- Tabla de idempotencia de eventos Event Grid (INV-MAIL05)
CREATE TABLE EventGridProcessedEvents (
    EPE_CodID BIGINT IDENTITY PRIMARY KEY,
    EPE_EventId NVARCHAR(100) NOT NULL,
    EPE_EventType NVARCHAR(100) NOT NULL,
    EPE_ProcessedAt DATETIME2 NOT NULL,
    EPE_RelatedOutboxId INT NULL
);

CREATE UNIQUE INDEX UX_EventGridProcessedEvents_EventId
ON EventGridProcessedEvents(EPE_EventId);

CREATE INDEX IX_EventGridProcessedEvents_Outbox
ON EventGridProcessedEvents(EPE_RelatedOutboxId)
WHERE EPE_RelatedOutboxId IS NOT NULL;
```

**Script se muestra al decisor antes de ejecutar en Azure SQL** (regla del proyecto).

## 11. Cronograma de ejecución

7 chats. Cada uno con entregable concreto antes de pasar al siguiente.

| # | Chat | Entregable | Estado del sistema al cerrar |
|---|---|---|---|
| 1 | **Provisioning Azure guiado** | Resource Group verificado, Communication Services + Email Communication, Key Vault creado/verificado, Managed Identity + RBAC, connection string en Key Vault como secret | Infra lista, aún nada cableado con la app |
| 2 | **DNS + verificación de custom domain** | SPF editado, 2 CNAMEs DKIM agregados, DMARC opcionalmente ajustado, dominio `laazulitasac.com` verificado en ACS, correo de prueba enviado desde Azure-managed domain | ACS puede enviar como `@laazulitasac.com`, cPanel aún activo |
| 3 | **BE: AcsEmailService + flag + migration SQL** | Código nuevo + flag default `cpanel`. Script SQL ejecutado en Azure SQL. Deploy silencioso — comportamiento runtime idéntico al actual | Deploy sin cambio visible |
| 4 | **BE: webhook Event Grid + handler** | Controller `email-events`, handler de delivery events, Event Grid Subscription creada y validada. Idempotencia INV-MAIL05 funcionando | Eventos llegan y se persisten; flag aún `cpanel` |
| 5 | **Cutover**: flipear flag a `acs` + monitoreo 48h | Flag en `acs`, TTL bajado a 300 24h antes, métricas de envío monitoreadas. Kill switch documentado y probado (flipear a `cpanel` en App Settings y verificar) | Tráfico por ACS, cPanel como válvula de emergencia |
| 6 | **Cleanup BE**: eliminar parser IMAP, `CpanelEmailService`, credenciales cPanel del Key Vault, endpoint defer-fail | Código libre de cPanel, credenciales revocadas, NuGet de IMAP removido | BE solo-ACS |
| 7 | **FE widget + docs + memoria** | `AcsQuotaStatusWidget` en producción, `business-rules.md` §18 reescrito, `INV-MAIL03/04` deprecados con nota histórica, `INV-MAIL05` documentado, memorias actualizadas (`project_smtp_defer_fail_block`, `project_smtp_limits`, `project_bcc_bounces_not_detected`, `project_outbox_correlation_header`) | Documentación alineada al nuevo mundo |

**Entre Chats 5 y 6 hay una ventana de 2-4 semanas obligatoria** para validar estabilidad antes del cleanup. Si durante la ventana se usa el kill switch para volver a cPanel, se reinicia el contador.

## 12. Planes a cancelar (archivar en `plan/closed/`)

Al abrir Chat 1 de ejecución, mover a `.claude/plan/closed/` con nota `superseded by migracion-smtp-acs.md — see commit <hash>`:

| Plan / Fase | Motivo |
|---|---|
| Plan 29 Chat 2.6 (endpoint `defer-fail-status`) | Reemplazado por quota ACS (`GET /api/sistema/email-provider-status`) |
| Plan 29 Chat 3 (negociación con Inkani para subir techo 5/h) | Se abandona cPanel, innecesario |
| Plan 29 Chat 4 (ajustes OPS post-negociación) | Idem |
| Plan 31 Chat 2 (parser IMAP de NDRs) | Reemplazado por Event Grid `EmailDeliveryReportReceived` |

Plan 29 Chats ya cerrados (2.1, 2.2, 2.3, 2.4, 2.5, 2.7) permanecen como están — su trabajo (validación pre-encolado, blacklist, plantillas) es código vivo que soporta INV-MAIL01/02 con o sin ACS.

Plan 31 Chat 1 (header `X-Educa-Outbox-Id`) permanece — útil para correlación incluso en ACS.

## 13. Plan de rollback por fase

| Fase | Si falla, ¿cómo vuelvo atrás? |
|---|---|
| Chat 1 (provisioning) | Eliminar recursos Azure creados (sin impacto en producción). Cost = $0 si se elimina en ≤ 1 día |
| Chat 2 (DNS) | Revertir cambios DNS al estado de §9 "Estado actual". TTL 7200 implica ≤ 2h para propagación |
| Chat 3 (código BE + SQL) | Deploy previo + script SQL inverso: `ALTER TABLE EmailOutbox DROP COLUMN EO_ProviderUsed, EO_AcsMessageId; DROP TABLE EventGridProcessedEvents;` (si ya se usaron, preservar datos antes) |
| Chat 4 (webhook) | Deshabilitar Event Grid Subscription en Azure Portal (1 clic). No afecta runtime |
| **Chat 5 (cutover)** | **Flag `Email:Provider = "cpanel"` en App Settings. Efecto inmediato sin redeploy. Válvula de emergencia documentada** |
| Chat 6 (cleanup) | Revert del commit. Recuperar credenciales cPanel si se revocaron requiere coordinar con Inkani |
| Chat 7 (FE + docs) | Revert del commit |

**Punto de no retorno efectivo**: fin de Chat 6. Después del cleanup, volver a cPanel requiere revert + restaurar credenciales + re-provisionar componentes eliminados. Por eso la ventana de 2-4 semanas entre Chats 5 y 6 es obligatoria.

## 14. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| DKIM mal propagado al cutover → correos marcados como spam | Media | Alto | Verificar DKIM con herramientas tipo `mail-tester.com` antes de Chat 5. Enviar correos de prueba desde Chat 2 y monitorear alineación |
| Reputación de IP nueva de ACS → bounces iniciales | Baja (Azure gestiona pools de IPs) | Medio | Monitorear 48h post-cutover. Si aparece patrón, usar kill switch |
| Event Grid retrasado o eventos perdidos | Baja | Medio | Event Grid reintenta con backoff por 24h. `EO_Estado` puede quedar desactualizado temporalmente pero se reconcilia |
| Costo real supera estimación | Media | Bajo | ACS Email ~$0.25 por 1000 correos + $1 por cada mil transacciones de Event Grid. Para el volumen del colegio (~5k correos/mes) cae en el tier gratuito o primeros dólares |
| Bloqueo de cPanel durante ventana Chat 5→6 (por tráfico residual) | Baja | Medio | El kill switch a `cpanel` durante la ventana es seguro siempre que cPanel no esté bloqueado. Si se activa el bloqueo de Inkani, el flag no ayuda — hay que resolver en Inkani o acelerar Chat 6 |
| Inbound legítimo llega al dominio y se pierde | Baja (MX no se toca) | Bajo | MX apunta a cPanel sin cambios; buzones humanos (si existen) siguen funcionando |

## 15. Verificaciones post-cutover (Chat 5)

Antes de cerrar Chat 5, verificar:

- [ ] Tres correos de prueba enviados (ASISTENCIA, ASISTENCIA_CORRECCION, REPORTE_USUARIO) llegan a bandeja de entrada, no a spam
- [ ] SPF, DKIM, DMARC reportan PASS en `mail-tester.com` o similar (≥ 9/10)
- [ ] Event Grid recibe eventos `Delivered` dentro de 60s del envío
- [ ] Bounce simulado (enviar a `bounce@simulator.amazonses.com` o dirección similar de prueba) dispara evento `Failed` → `EmailBounceBlacklistHandler` actualiza `EmailBlacklist` correctamente
- [ ] Widget admin FE muestra estado ACS (quota, envíos, tasa de delivery)
- [ ] Kill switch probado: flipear a `cpanel` 15 min, verificar envío por cPanel, flipear de vuelta a `acs`
- [ ] `EO_ProviderUsed` = `acs` en filas de `EmailOutbox` durante la ventana

## 16. Referencias

### Memoria

- `project_smtp_defer_fail_block.md` — problema raíz
- `project_smtp_limits.md` — cuotas cPanel
- `project_email_audit_universe.md` — estado del universo de destinatarios
- `project_bcc_bounces_not_detected.md` — limitación de MailKit/SMTP compartido
- `project_outbox_correlation_header.md` — header X-Educa-Outbox-Id

### Reglas

- `business-rules.md` §18 (Correos Salientes) + `INV-MAIL01..04` (tras este plan: 01/02 mantienen, 03/04 deprecan, 05 nueva)
- `backend.md` sección "Envío de Correos — Outbox Obligatorio"

### Planes relacionados

- `plan/closed/plan-29-*` (a crear al ejecutar) — historial de mitigaciones fallidas
- `plan/closed/plan-31-chat-2.md` (a crear al ejecutar) — parser IMAP superseded

### Documentación externa (para consultar en ejecución)

- Azure Communication Services Email: `https://learn.microsoft.com/azure/communication-services/concepts/email/email-overview`
- Event Grid schema `EmailDeliveryReportReceived`: `https://learn.microsoft.com/azure/communication-services/concepts/email/handle-email-events`
- Key Vault References en App Service: `https://learn.microsoft.com/azure/app-service/app-service-key-vault-references`

---

## 17. Chats relacionados pendientes (fuera de este plan)

### Roadmap de abandono total de cPanel

El cliente (colegio) expresó interés en abandonar cPanel completamente (no solo para correo). Ese trabajo es un proyecto separado que requiere:

1. Chat de **investigación** (`/investigate`) para auditar qué vive en Inkani hoy (buzones humanos, sitios web, DBs, FTP, cron jobs, certificados)
2. Chat de **diseño** (`/design`) con datos reales, no suposiciones
3. N chats de **ejecución** dependiendo del alcance decidido

**No bloquea este plan**. Este plan resuelve solo el canal SMTP del sistema Educa.API.

Si el cliente pide un documento de alto nivel antes de esa investigación, generar `roadmap-abandono-cpanel.md` en un chat aparte — no mezclarlo con la ejecución de este plan.

---

**Última actualización**: 2026-04-24 — diseño cerrado, pendiente de apertura de Chat 1 de ejecución.
