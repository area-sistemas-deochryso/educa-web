# Plan 39 — Monitoreo de correos basado en evidencia empírica

**Estado**: Diseñado — Chat 1 en `running` (prioridad alta)
**Fecha diseño**: 2026-04-29
**Decisor**: `area.sistemas.min@gmail.com`
**Origen**: tras el incidente del 2026-04-29, se hizo análisis empírico del histórico de fallos del cPanel Track Delivery (10 días, 327 fallos sistemas*). El análisis reveló brechas concretas en el monitoreo actual que justifican un nuevo plan separado de Plan 35 (estructura del hub) y Plan 36 (rediseño visual interno).

---

## 1. Hallazgos del análisis empírico (2026-04-20 → 2026-04-29)

### 1.1 Volumen total observado en cPanel

- **1.467** registros totales (con éxitos) en Track Delivery (~10d retention)
- **380** registros de defer/failure/inprogress
- **327** desde cuentas `sistemas*@laazulitasac.com` (los otros 53 son rechazos de inbound a `deochrysosac.com`)

### 1.2 Distribución por sender (qué cuenta envía más fallos)

| Cuenta | Fallos | % | Observación |
|---|---|---|---|
| `sistemas4` | 170 | **52%** | concentra >mitad sin razón aparente |
| `sistemas5` | 51 | 16% | |
| `sistemas` | 47 | 14% | |
| `sistemas2` | 25 | 8% | |
| `sistemas7` | 18 | 6% | |
| `sistemas6` | 9 | 3% | |
| `sistemas3` | 7 | 2% | |

**Inferencia**: o `sistemas4` envía 5x más volumen total (round-robin desbalanceado), o sufre tasa de fallo desproporcionada. **Hoy no hay forma de saberlo desde la UI** — falta la métrica `% fallos / volumen` por sender.

### 1.3 Top destinatarios tóxicos (Pareto extremo)

| Destinatario | Fallos | Días | Categorías |
|---|---|---|---|
| `kysa14.1994@gmail.com` | **218** | 5 | 178 retry · 34 mailbox-full · 6 domain-blocked |
| `delacruzseccawalter1@gmail.com` | 34 | 3 | 17 retry · 12 mailbox-full · 5 domain-blocked |
| `evaavellanedaperez1985@gmail.com` | 17 | 5 | (mitigado hoy) |
| 17 otros con 2-5 fallos cada uno | ~58 | 1-2 | mayoría DOMAIN_BLOCKED |

**Top 3 = 269/327 = 82% del total**. Si `kysa` se hubiera blacklisteado al 2º hit (21-abr), se evitaban ~216 hits posteriores y los bloqueos del 27-29 abril.

### 1.4 Categorías de fallo (semántica SMTP)

| Categoría | Hits | % | Acción correcta |
|---|---|---|---|
| `RETRY_PENDING` (Exim "retry time not reached") | 200 | 61% | Indicador de cola creciendo — visibilizar |
| `DOMAIN_BLOCKED` (5/5 alcanzado) | 61 | 19% | Síntoma terminal — alarma roja |
| `MAILBOX_FULL_4_2_2` | 50 | 15% | Disparar blacklist (Plan 38 lo cubre) |
| `OTHER` (incl. 5.1.1 user unknown) | 16 | 5% | `INV-MAIL02` ya cubre (3+ bounces 5.x.x) |

### 1.5 Distribución temporal

| Día | Fallos | Notas |
|---|---|---|
| 20-abr | 10 | base normal |
| 21-abr | 5 | base normal |
| 22-abr | 18 | inicio de spike `kysa` |
| 23-abr | 9 | |
| 24-abr | 6 | |
| 27-abr | **169** | spike masivo — múltiples destinatarios + retries acumulados |
| 28-abr | **68** | secuela del spike |
| 29-abr (parcial) | 42 | incidente reportado y mitigado |

**Patrón**: los spikes son acumulativos. Empieza con 1 destinatario tóxico el día N, Exim reintenta cada 15-30min, llega al 5/5, descarta cola del día N+1, y se realimenta. Sin intervención humana se mantiene varios días.

### 1.6 Otros hallazgos puntuales

- `roxanabriceñochapa@gmail.com` aparece con `ñ` en el local-part — sospecha de validación pre-encolado pasando por alto caracteres no-ASCII
- `juanmartingonzalesperalta50@gmail.com` con 2 hits 5.1.1 (user unknown) en 1 día — no llegó al umbral 3+ de `INV-MAIL02`
- 2 dominios receptores concentran fallos: `gmail.com` (mayoría) y `hotmail.com` — coincide con base de apoderados del colegio

---

## 2. Brechas del monitoreo actual (lo que NO se ve hoy)

Hub `/intranet/admin/monitoreo` (Plan 35) y sus 4 sub-páginas de Correos (Bandeja, Dashboard del día, Diagnóstico, Auditoría) **no exponen ninguna de las dimensiones que detectaron este incidente al hacer el análisis manual**:

| # | Vista que falta | Pregunta que respondería | Donde encajaría |
|---|---|---|---|
| B1 | **Mapa por sender**: volumen total, fallos, % fallo, último uso | ¿`sistemas4` está sobrecargada o problemática? | nuevo tab/panel en Bandeja |
| B2 | **Top destinatarios fallidos** rolling 7d / 30d | ¿Hay alguien como `kysa` ahora mismo? | panel en Dashboard del día |
| B3 | **Alerta proactiva** cuando un destinatario acumula ≥2 hits 4.2.2 en 24h | Anticipar el bloqueo del dominio | Plan 38 lo aborda; aquí solo la visualización |
| B4 | **Serie temporal por hora/día** de defers + fails | ¿Estamos en spike? ¿Cuándo empezó? | Dashboard del día |
| B5 | **Contador 5/h en vivo** (`max_defer_fail`) | ¿Cuánto margen queda antes del bloqueo? | banner B9 + tile en Dashboard |
| B6 | **Categorización SMTP** (4.2.2, 5.1.1, 5.7.x, retry, blocked, junk) | ¿De qué tipo son los fallos? | Diagnóstico |
| B7 | **"Candidatos a blacklist"** — destinatarios con N hits sin estar blacklisteados | ¿A quién agrego ahora mismo? | Cross-link al tab Blacklist (Plan 38) |
| B8 | **"Aceptado por Exim ≠ entregado"** — gap entre `EO_Estado=SENT` y delivery real | ¿Cuánto correo fingí enviar? | Auditoría |
| B9 | **Export del histórico Exim a BD** (Track Delivery se pierde a 10d) | Análisis retrospectivo más allá de 10 días | nuevo job BE |
| B10 | **Vista por dominio receptor** (gmail vs hotmail vs otros) | ¿Quién nos está rebotando más? | Dashboard del día |

---

## 3. Decisiones tomadas

| # | Decisión | Justificación |
|---|---|---|
| P1 | **Mapa por sender** como tile principal del Dashboard del día | Sin esta vista no se detecta desbalance del round-robin. Costo bajo: query ya existente con group-by |
| P2 | **Top 10 destinatarios** rolling 7d en Dashboard del día | Cubre 82% de los casos con UI mínima |
| P3 | **Categorización SMTP** vía `EmailOutbox.EO_TipoFallo` (ya existe) — solo agregar series por categoría | El BE ya clasifica con `SmtpErrorClassifier`. Solo falta aprovecharlo en charts |
| P4 | **Serie temporal por hora** (last 24h) y por día (last 30d) en Dashboard del día | Detectar spikes + correlacionar con eventos |
| P5 | **Contador 5/h en vivo** vía SignalR (extiende `defer-fail-status` del Plan 29 Chat 2.6) | Permite el banner del Plan 38 P6 + tile siempre visible |
| P6 | **Cross-links explícitos** Bandeja↔Blacklist↔Diagnóstico por destinatario | Cuando ves a `kysa` con 4 hits, 1 click la blacklisteás |
| P7 | **Importar Track Delivery a BD** (job nocturno parser de logs Exim, opcional via SSH) | Hoy se pierde a 10d. ACS llevará Event Grid → en transición, conviene tener buffer propio |
| P8 | **Top dominios receptores** (gmail/hotmail/outlook/yahoo/otros) en Dashboard del día | Trivial de calcular, valioso para entender base de usuarios |
| P9 | **Vista "Candidatos a blacklist"** = destinatarios con ≥2 hits 4.2.2 en 24h **y** sin estar en `EmailBlacklist` activa | Recomendación accionable. Cero falsos negativos del incidente 29-abr |
| P10 | **Telemetría** counter `EmailDeliveryByCategory` (tags: categoría, sender, dominio_receptor) | Para Application Insights — detección de anomalías AI/manual |

---

## 4. Alcance

### IN

- BE
  - Nuevo endpoint `GET /api/sistema/email-outbox/dashboard/sender-stats` — agregaciones por sender en ventana configurable
  - Nuevo endpoint `GET /api/sistema/email-outbox/dashboard/top-destinatarios?ventanaDias=7&limit=10`
  - Nuevo endpoint `GET /api/sistema/email-outbox/dashboard/serie-temporal?granularidad=hour|day&ventanaDias=`
  - Nuevo endpoint `GET /api/sistema/email-outbox/dashboard/dominios-receptores`
  - Nuevo endpoint `GET /api/sistema/email-outbox/dashboard/candidatos-blacklist` (join `EmailOutbox` con `EmailBlacklist`)
  - Hub SignalR para `defer-fail-status` push (extiende Plan 29 Chat 2.6 que era pull)
  - Nuevo job opcional `ExpiredEximLogImportJob` (out of scope si OPS no aprueba SSH)
- FE
  - Tab "Mapa de envío" en `/monitoreo/correos/dashboard` — 6 tiles: counter 5/h vivo, sender-mix, top destinatarios, serie temporal, dominios receptores, candidatos a blacklist
  - Tile "Aceptado vs Entregado" en `/monitoreo/correos/auditoria`
  - Banner B9 en `/monitoreo` y `/monitoreo/correos/*` cuando `defer-fail-status` ≥ 4/5
  - Cross-links: en cada tabla con `EO_Destinatario`, agregar acción "Ver en Blacklist" / "Agregar a Blacklist"
- Docs
  - `business-rules.md` §18 — invariante nueva `INV-MAIL07` (importación incremental opcional)
  - `rules/design-system.md` — patrón B12 "tile reactivo SignalR" si surge

### OUT

- Migración a ACS (sigue su plan)
- Rediseño visual de páginas (Plan 36)
- Sincronización con Cuarentena del Plan 37
- Importación retroactiva (>10d antes) — el cPanel ya no los tiene

---

## 5. Invariantes afectadas

| Invariante | Acción |
|---|---|
| `INV-MAIL01` | Sin cambios — pero el Chat 2 valida que `roxanabriceñochapa@gmail.com` (con ñ) esté siendo aceptado o rechazado correctamente |
| `INV-MAIL04'` (widget defer-fail) | **Extendida**: ahora push SignalR + tile en dashboard |
| `INV-MAIL05` (telemetría ACS — futuro) | Compatible: la categorización por `EO_TipoFallo` se reusa cuando llegue Event Grid |
| `INV-S07` (fail-open) | Sin cambios |

### Invariante nueva (opcional)

| Invariante | Qué promete | Enforcement |
|---|---|---|
| `INV-MAIL07` | El importador de logs Exim (si se activa) es **idempotente por messageId Exim** y no duplica filas | Tabla `EximLogImportProcessed` con unique constraint + test |

---

## 6. División en chats

| Chat | Capa | Contenido | Estado |
|---|---|---|---|
| **Chat 1** (071) | Mixto | Diseño cerrado: SQL de cada agregación, contratos DTO, mocks de los 6 tiles, decisión sobre P7 (importador SSH) | ⏳ **running** |
| Chat 2 | BE | 5 endpoints dashboard + tests (con seed que reproduce el escenario `kysa` 5 días) | pendiente |
| Chat 3 | BE | Hub SignalR + push de `defer-fail-status` + integración con widget Plan 29 | pendiente |
| Chat 4 | BE (opcional) | `ExpiredEximLogImportJob` — depende OPS aprobar SSH | hold |
| Chat 5 | FE | Tab "Mapa de envío" en Dashboard del día con 6 tiles | pendiente, depende Chat 2 |
| Chat 6 | FE | Banner B9 + cross-links a Blacklist + tile "Aceptado vs Entregado" | pendiente, depende Plan 38 Chat 5 |

---

## 7. Archivos previstos

### BE (`Educa.API`)

- `Controllers/Sistema/EmailOutboxDashboardController.cs` — agregar 5 endpoints (o crear `EmailMonitoreoController.cs` aparte)
- `Services/Notifications/EmailMonitoreoService.cs` — **nuevo**
- `Repositories/Notifications/EmailMonitoreoRepository.cs` — **nuevo**
- `DTOs/Notifications/SenderStatsDto.cs`, `TopDestinatariosDto.cs`, `SerieTemporalDto.cs`, `DominiosReceptoresDto.cs`, `CandidatosBlacklistDto.cs` — **nuevos**
- `Hubs/EmailHub.cs` — **nuevo** (o reusar `AsistenciaHub` con grupo `email-alerts`)
- `Services/Sistema/ExpiredEximLogImportJob.cs` — **nuevo, opcional** (Chat 4 hold)
- Tests:
  - `EmailMonitoreoServiceTests.cs` — seed con escenario `kysa` 5 días, valida agregaciones
  - `EmailMonitoreoControllerTests.cs` — auth, paginación, filtros
  - `EmailHubTests.cs` — push de defer-fail-status

### FE (`educa-web`)

- `src/app/features/intranet/pages/admin/email-outbox-dashboard-dia/` — agregar componentes:
  - `components/sender-stats-tile/`
  - `components/top-destinatarios-tile/`
  - `components/serie-temporal-tile/`
  - `components/dominios-receptores-tile/`
  - `components/candidatos-blacklist-tile/`
  - `components/defer-fail-live-counter-tile/` (extiende widget Plan 29 con SignalR)
- `src/app/core/services/signalr/email-monitoreo.service.ts` — **nuevo**
- `src/app/features/intranet/pages/admin/email-outbox/email-outbox.component.html` — banner B9 condicional
- `src/app/features/intranet/pages/admin/monitoreo/monitoreo-hub.component.html` — agregar badge crítico cuando defer-fail≥4

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Las agregaciones se vuelven costosas con 100k+ filas en `EmailOutbox` | Índices ya planeados en `EmailMonitoreoRepository`. Caché en memoria 30s para `defer-fail-status` (cambia poco). |
| Falsa correlación: spike por evento puntual (no patrón) genera ruido en alertas | Banner B9 solo dispara cuando hay ≥4 hits en última hora — patrón estructural, no puntual |
| `kysa` no aparece en candidatos porque ya fue auto-blacklisted (Plan 38 P1) | OK — la vista busca *futuros* casos, los ya blacklisteados van al tab Blacklist |
| OPS no aprueba SSH para importador de logs (P7) | Chat 4 queda en hold. Resto del plan no depende. |

---

## 9. Criterios de aceptación

- En el Dashboard del día, el Director ve los 6 tiles con datos reales de los últimos 7d.
- Replicando el escenario `kysa` 5 días en seed de tests, el tile "Top destinatarios" la muestra al día 2 con badge rojo, **antes** del primer DOMAIN_BLOCKED.
- El tile "Candidatos a blacklist" la muestra como recomendación con CTA "Bloquear".
- Banner B9 aparece en `/monitoreo` y todas las sub-páginas de Correos cuando `defer-fail-status` ≥ 4/5.
- Tile "5/h en vivo" actualiza por SignalR sin necesidad de refresh manual.
- `EmailMonitoreoServiceTests.SenderMixDesbalanceado_ReportaCorrectamente` reproduce los 170 fallos de `sistemas4` vs los 7 de `sistemas3` y muestra 52% vs 2%.
- Tests BE 100%, specs FE verdes, build production OK.
