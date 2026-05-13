# Plan 43 — Monitoreo: feedback Cowork producción 2026-05-11

> **Origen**: Cowork revisó a fondo `/intranet/admin/monitoreo` (pestañas Correos e Incidencias) con datos reales de producción. 24 hallazgos clasificados en bugs/huecos (A1-A13) y mejoras estructurales (B1-B12).
> **Principio rector**: pasar de tratar síntomas a tratar causas. Foundations primero (correlation id propagado, fingerprint correcto, contadores reconciliados), luego diagnóstico real (SMTP visible donde se decide), luego operatividad (filtros + acciones inline), luego visualizaciones y por último vistas unificadas que dependen de todo lo anterior.
> **Razón del orden**: muchos hallazgos comparten causa raíz (correlation id roto, fingerprint variable, SMTP escondido en otra pestaña). Resolverlos de raíz cierra 3-5 puntos al mismo tiempo. Hacer al revés (UI primero) deja huecos visibles cuando la data llegue rota.

---

## Resumen ejecutivo

| Fase | Foco | Chats | Cierra puntos | Dependencias |
|------|------|------:|---------------|--------------|
| **F1** | Foundations — sin esto nada más es confiable | 3 | A1, A8, A11, B2, B3, B11 | — |
| **F2** | Quick wins paralelos — visibilidad y disciplina | 1 | A3, A7, A12, A13, B7 | — |
| **F3** | Diagnóstico real — SMTP donde se decide | 2 | A4, A5, A6, B4 | F1 (A11) |
| **F4** | Operatividad — filtros + acciones inline | 3 | A2, A9, A10, B5, B6 | F1 (A8) |
| **F5** | Visualizaciones — trends y heatmaps | 2 | B8, B9, B10 | F1 (A8) |
| **F6** | Vista unificada — colapsar 8 pestañas en 1 | 2 | B1, B12 | F1, F3, F4 |

**Total**: 13 chats efectivos. 24 puntos cerrados (varios puntos comparten chat por origen común).

---

## Fase 1 — Foundations (3 chats, secuenciales)

### Chat 1.1 — Reconciliar contadores y etiquetar `source` (A1, B11) ✅ ship 2026-05-11

**Repo**: BE + FE
**Tipo**: BE thin + FE labels
**Estimación**: 1 chat
**Estado**: ✅ ship 2026-05-11 (chat 139, commits `Educa.API@1f2f47a` + `educa-web@2f8254b`, smoke prod ✅)

**Por qué primero**: si los 3 widgets de la cabecera muestran números distintos sin explicación, todo lo demás del módulo pierde credibilidad. Cerrar esto primero hace que las fases siguientes se midan contra un baseline confiable.

**Resultado**:

La hipótesis inicial ("cPanel vs Outbox vs OutboxFiltered") era incorrecta — no existe endpoint cPanel-raw. Los 3 widgets consultan la misma tabla `EmailOutbox` pero con **ventanas temporales distintas**:

| Widget | Endpoint | Ventana | `Source` |
| --- | --- | --- | --- |
| Hub Correos (stats) | `/api/sistema/email-outbox/estadisticas` | All-time o rango | `OutboxTotal` / `OutboxRango` |
| Dashboard día | `/api/sistema/email-outbox/dashboard-dia` | Día calendario Lima | `OutboxDia` |
| Defer-fail status (hub gauge) | `/api/sistema/email-outbox/defer-fail-status` | Rolling 24h | `Outbox24h` |

**Decisión arquitectónica**: NO se unificó en un solo DTO porque los 3 miden cosas legítimamente distintas. Cada DTO ganó 4 campos opcionales (`Source`, `TimeWindowLabel`, `WindowStart`, `WindowEnd`) y el FE renderiza chip `tag-neutral` (design-system §A1 opción C) + tooltip con la ventana legible.

**Archivos tocados (cross-repo)**:

BE: `OutboxCounterSource.cs` (nuevo, constantes compartidas), `WindowStats.cs` + `EmailDashboardResumen.cs` + `EmailOutboxEstadisticasDto.cs` (+4 props c/u), `EmailOutboxStatusService.cs` + `EmailDashboardDiaService.cs` + `EmailOutboxService.cs` (popular campos), `OutboxCountersSourceMetadataTests.cs` (nuevo, 4 contract tests).

FE: `EmailOutboxEstadisticas`, `DeferFailWindowStats`, `EmailDashboardResumen`, `HubExtras.outbox/deferFail` (espejo de campos), `MonitoreoHubBadgesFacade.collectExtras` (propaga source/timeWindowLabel), `monitoreo-hub.summary.ts` + `DomainStat` (sourceChip + windowTooltip), `monitoreo-hub.component.html` (chip por stat), `dashboard-resumen.component.*` (chip sobre cards grandes), `email-outbox-stats.component.*` (chip sobre KPI bandeja), spec `monitoreo-hub.summary.spec.ts` (3 specs).

**Aprendizajes transferibles (para futuros chats del Plan 43)**:

1. **No asumir hipótesis del brief sin verificar contra el código**. El brief afirmaba 3 fuentes distintas (cPanel/Outbox/OutboxFiltered); la realidad fue 3 ventanas distintas de la misma tabla. Investigar primero, decidir contrato después.
2. **Bundle JS stale post-deploy fue el bug invisible**. La SPA cargada antes del deploy FE seguía ejecutando código viejo aún con el endpoint BE devolviendo shape nuevo. Diagnóstico tomó 3 turnos descartando SW de endpoints (falsa pista) hasta caer en bundle JS. Resuelto con `Ctrl+Shift+R`. **Spinoff registrado**: `tasks/sw-bundle-stale-detection.md` — propone banner "nueva versión disponible" consumiendo `updateAvailable$` + facades suscritos a `cacheUpdated$`. Sin esto, cada deploy futuro reproduce el "fallback fantasma".
3. **`design-system §A1` Opción C aplicada correctamente**: el chip de origen es informativo (responde "¿qué cuenta este número?"), por lo tanto va con `styleClass="tag-neutral"` y SIN `severity`. La regla heurística sirvió tal cual.
4. **Coincidencia desafortunada en testing manual**: el valor real del BE para `OutboxTotal` (`"Histórico completo"`) coincidía con el string fallback del FE. Imposible distinguir `value-from-BE` de `fallback-cuando-BE-undefined` solo por inspección visual. Quedó como lección para diseñar fallbacks **explícitamente distinguibles** del valor real.

**Plan original** (mantenido como historia):
1. Inventariar los 3 endpoints que alimentan los widgets de "Correos" (cabecera, dashboard del día, bandeja). Documentar para cada uno: scope (cPanel vs `EmailOutbox`), estado base que cuenta, ventana temporal.
2. Definir DTO único `OutboxCountersDto { total, sent, failed, processing, pending, source, windowStart, windowEnd }` con `source` enum (`"cPanel"` / `"Outbox"` / `"OutboxFiltered"`).
3. UI: chip visible en cada widget que diga su `source`. Tooltip con la ventana temporal.
4. Si los 3 representan métricas legítimamente distintas, dejar 3 con sus etiquetas. Si 2 deben coincidir, fixear el que esté roto.
5. **Hecho cuando**: usuario abre la página y entiende sin click qué cuenta cada número.

---

### Chat 1.2 — Fingerprint correcto + merge de duplicados (A8, B2)

**Repo**: BE + (FE thin para sparklines)
**Tipo**: BE pesado (algoritmo + job de merge) + FE mini-sparkline
**Estimación**: 1 chat largo o 2 si el merge se justifica aislado

**Por qué segundo**: hoy la pestaña Errores tiene 340 grupos que son 1 mismo bug. Cualquier filtro/acción/trend que agreguemos en F4/F5 será inútil si el agrupado no funciona.

**Plan**:
1. Auditar `ErrorFingerprintCalculator.Compute` en BE (`Helpers/Sanitization/`). Confirmar entradas exactas del hash y detectar el campo variable (probable: duración del slow request leakeada en el mensaje normalizado).
2. Cambiar fingerprint a `SHA-256(severidad ‖ method ‖ urlNormalized ‖ httpStatus ‖ errorCode)`. Quitar mensaje del input cuando `errorCode='SLOW_REQUEST'` — la latencia no debe variar el fingerprint.
3. Job idempotente de re-fingerprint: recalcular sobre `ErrorLog` huérfanos + merge de `ErrorGroup` duplicados (preservar el más antiguo como canónico, sumar `ContadorTotal`, mover ocurrencias, deletear duplicados). Documentar en ADR el algoritmo de merge y los efectos sobre INV-ET06.
4. Extender DTO con `ErrorGroupTrendDto { fecha, count }[30d]` y `ErrorGroupLatencyDto { p50, p95, p99 }` para slow-requests.
5. UI: mini-sparkline 30d en card de `ErrorGroup`. Modal con gráfico ampliado al hacer click.
6. Actualizar INV-ET06 en `business-rules.md §15.12` con el algoritmo nuevo + nota de migración.
7. **Hecho cuando**: el slow `/notificaciones/activas` vive en 1 grupo con 340 ocurrencias y trend visible.

---

### Chat 1.3 — Unificación de formato del correlation id (A11, B3) — **REWORKED 2026-05-13**

**Repo**: BE thin (Educa.API master)
**Tipo**: fix de drift de formato — 2 archivos editados, ~5 líneas
**Estimación**: 30-60 min

**Diagnóstico inicial (auditoría chat 153, 2026-05-13)**: el plan original asumía que el correlation id "se perdía en algún hop". **Falso**. La auditoría revela que el id se persiste correctamente en cada carril, pero existen **dos formatos paralelos** en BD por una decisión de fallback en `CorrelationIdMiddleware`:

| Carril | Formato real en prod | Origen |
|---|---|---|
| `ErrorLog.ERL_CorrelationId` | **GUID-36** con guiones (`fc79f7c0-8721-...`) | `dto.CorrelationId` (body POST del FE) o middleware con `X-Request-Id` del FE |
| `REU_ReporteUsuario.REU_CorrelationId` | **GUID-36** | `dto.CorrelationId` (body del FE) |
| `EmailOutbox.EO_CorrelationId` | **32 hex sin guiones** (`a259b96c00220...`) | Middleware fallback a `Activity.Current.TraceId` (W3C trace) cuando NO viene `X-Request-Id` (webhooks externos, CrossChex, background jobs) |
| `RateLimitEvent.REL_CorrelationId` | **32 hex** | Idem — además leía del response header en vez de Items |

El FE `requestTraceInterceptor` ya manda `X-Request-Id` con `crypto.randomUUID()` (GUID-36) en todos los requests browser. El bug está en el BE.

**Fix aplicado**:

1. `CorrelationIdMiddleware.cs`: cambiar fallback `Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("N")` (32 hex) → `Guid.NewGuid().ToString()` (D format, 36 con guiones). OTel `Activity` sigue capturando trace id por su cuenta para Azure Monitor — son canales separados.
2. `RateLimitTelemetryMiddleware.cs`: leer correlation id de `HttpContext.Items[CorrelationIdMiddleware.CorrelationIdItemKey]` en vez de `Response.Headers["X-Correlation-Id"]`. Alinea con cómo `EmailOutboxService.ResolveCorrelationId` ya lo consume.

**Limitación arquitectónica documentada** (no es un bug, es una propiedad de HTTP):

> El correlation id correlaciona eventos dentro del **mismo request HTTP del servidor**. Requests independientes (admin action vía FE vs webhook CrossChex que encola correo) tienen ids distintos por diseño. El hub `/intranet/admin/correlation/:id` solo cruza carriles cuando los eventos se originaron en la misma request HTTP — típico caso: admin aprueba matrícula (encola correo) → mismo id en ErrorLog (si hubo error), EmailOutbox y RateLimitEvent. Caso NO cruzable: correo automático de asistencia (webhook CrossChex) y action posterior del padre en intranet → son dos requests separados al servidor, dos ids distintos.

Esto **se registra como `INV-CORR01`** en `business-rules.md` del BE.

**Scope explícitamente reducido**:

- ✅ Alinear formato (A11+B3 honestamente).
- ❌ SignalR hubs (Plan 41 brecha #9 — sigue abierto). Mover a Plan 41 F6 que tiene la decisión arquitectónica completa (hub filter custom + query param + `HubCallerContext.Items`).
- ❌ No requiere migración de datos. Registros viejos quedan con su formato (forensic value); nuevos van en GUID-36.
- ❌ Sin cambios FE.

**Hecho cuando**:

1. SELECT post-deploy sobre los 4 carriles muestra **100% de filas nuevas en GUID-36** (regex match).
2. Tests verdes: nuevo `CorrelationIdMiddlewareTests` (6 cases incluyendo regresión OTel fallback) + nuevos cases en `RateLimitTelemetryMiddlewareTests` (Items propagation).
3. Smoke browser: navegar `/intranet/admin/correlation/<id-real>` con un id de admin action que encoló correo → ≥2 carriles cruzados.

> **Nota**: Plan 41 sigue con su agenda independiente (timeline + lifecycle + grafo + sesión). Este chat NO modifica nada de Plan 41 — solo limpia la fuente. Si Plan 41 F6 retoma SignalR, hereda formato GUID-36 limpio.

---

## Fase 2 — Quick wins paralelos (1 chat empacado)

### Chat 2.1 — Disciplina y consistencia en monitoreo (A3, A7, A12, A13, B7)

**Repo**: BE thin + FE
**Tipo**: muchos cambios pequeños sin riesgo
**Estimación**: 1 chat

**Por qué empacar**: son 5 puntos independientes, cada uno < 30min, todos con el mismo perfil (sin nueva infra, sin migraciones, sin nuevos contratos). Empacar evita 5 chats con overhead de brief.

**Plan**:

1. **A3** — `TipoFallo` durante PROCESSING:
   - Persistir `EO_UltimoErrorTransiente` (`NVARCHAR(200)`) cuando worker captura un error transiente sin cambiar `EO_Estado='FAILED'`.
   - UI: badge gris "Pendiente reintento (4.2.2 mailbox full)" en lugar de "Sin clasificar".

2. **A7 + B7** — Bloqueo manual obligatorio:
   - Validador en BE: `EBL_Motivo` requerido con `len >= 20` cuando `EBL_MotivoBloqueo='MANUAL'`.
   - UI: textarea obligatoria antes de confirmar bloqueo manual.
   - Persistir nombre humano resuelto en `EBL_UsuarioReg` (usar `User.GetNombre()` no username técnico).

3. **A12** — Quitar enmascaramiento inconsistente:
   - Auditar `EmailDeferEventsService` y todos los DTOs admin del módulo monitoreo: localizar llamadas a `MaskEmail()` / `Mask()`.
   - Decisión documentada: admin (4 roles administrativos) ve emails sin máscara en todo el módulo. Enmascaramiento queda solo para `ReporteUsuario` anónimo / usuario no-admin.
   - **Verificar**: que esto sea consistente con `INV-RU07` (DNI enmascarado en reportes) — esa regla es DNI, no emails, no entra en conflicto.

4. **A13** — Link auditoría → usuarios:
   - En `email-audit-findings.component`, agregar columna "Acción" con link `[routerLink]="['/intranet/admin/usuarios']" [queryParams]="{ dni, autoOpen: true }"`.
   - `usuarios.component` lee `autoOpen` en query params y abre dialog de edición pre-focused en el campo correo.
   - Aplica también a la columna acción del panel Gap del día (depende de F6 Chat 6.2 para los links de apoderado — dejar TODO si el dialog de apoderado no existe).

5. **Hecho cuando**: los 5 puntos shipped en un solo PR cohesivo, sin tocar UI estructural.

---

## Fase 3 — Diagnóstico real (2 chats)

### Chat 3.1 — SMTP response visible donde se decide (A6, B4)

**Repo**: BE + FE
**Tipo**: BE pesado (nuevos campos + JOIN para legacy) + FE drawer
**Estimación**: 1 chat
**Dependencia**: F1 Chat 1.3 (correlation id) ayuda pero no bloquea.

**Plan**:
1. Persistir `EmailBlacklist.EBL_OriginalSmtpResponse` (`NVARCHAR(500)` nullable) cuando se inserta desde `MailboxFullBlacklistHandler` o `BounceBlacklistHandler` — capturar el `EO_LastSmtpMessage` del hit que disparó el blacklisteo.
2. Análogo en `EmailQuarantine.EQU_OriginalSmtpResponse` + array de los 3 últimos hits SMTP en JSON (`EQU_RecentHits`).
3. Para registros legacy sin el campo nuevo: LEFT JOIN a `EmailOutbox` por `(destinatario, fecha aproximada ±2h)` en la query del detalle. Mostrar mejor-esfuerzo con badge "(reconstruido)".
4. UI Detalle blacklist: reemplazar "Promoted from quarantine..." por el SMTP real (`452 4.2.2 The recipient's inbox is out of storage space`). El texto interno pasa a "Causa interna" como dato secundario.
5. UI Detalle cuarentena: nueva sección "Histórico de hits" con los últimos 3 SMTP responses + timestamps.
6. **Hecho cuando**: ningún caso de blacklist o cuarentena requiere abrir la pestaña Eventos defer para ver el SMTP code real.

---

### Chat 3.2 — Detalle de correo completo + buscador inclusivo (A4, A5)

**Repo**: BE + FE
**Tipo**: BE moderado (campos + endpoint extendido) + FE drawer rediseñado
**Estimación**: 1 chat

**Plan**:

1. **A5** — Detalle correo:
   - Listar campos faltantes contra lo que la UI muestra hoy: `EO_Remitente`, `EO_LastSmtpCode`, `EO_LastSmtpMessage`, `EO_NextRetryAt`, `EO_LastAttemptAt`, `EO_OwnerEntityType+Id`, `EO_OriginEvent`.
   - Verificar cuáles ya están en BD (probable: la mitad). Persistir los faltantes desde el worker.
   - Ampliar `EmailOutboxDetalleDto` con esos campos. Resolver `EO_OwnerEntityType+Id` a un display object con nombre + link al perfil.
   - UI drawer: secciones "Envío" (remitente, destinatario, asunto, tipo), "Estado" (estado actual, intentos N/M, último intento, próximo reintento), "SMTP" (code + mensaje del último intento), "Origen" (qué evento del sistema lo creó, link al evento), "Vista previa" (body).
   - Renombrar botón "Ver eventos del correlation id" → "Abrir hub correlacionado". Rutear realmente a `/intranet/admin/correlation/:id` (existente desde Plan 32).

2. **A4** — Buscador de diagnóstico inclusivo:
   - Endpoint `GET /email-monitoreo/diagnostico/buscar?q=...` hoy hace JOIN solo con `Apoderado/Profesor/Director`.
   - Agregar UNION con `EmailOutbox.EO_Destinatario DISTINCT` para devolver "destinatarios huérfanos" (sin dueño en tablas de personas).
   - UI: resultados huérfanos con badge "Sin dueño en personas" + link al historial outbox del email.

3. **Hecho cuando**: un correo fallido se diagnostica completo desde el drawer sin abrir otra pestaña; y buscar cualquier email visible en bandeja retorna su historial.

---

## Fase 4 — Operatividad (3 chats, paralelizables)

### Chat 4.1 — Filtros + paginación Bandeja (A2, parte de B5)

**Repo**: BE + FE
**Tipo**: BE (`/count` endpoint, filtros combinables) + FE filter bar
**Estimación**: 1 chat
**Dependencia**: F1 Chat 1.2 (fingerprint) si filtramos por errorCode/category — no bloquea si se hace solo por estado/destinatario.

**Plan**:
1. Auditar dropdown "Estado del envío" — confirmar `<p-select>` con `appendTo="body"` (regla `primeng.md`). Fixear bug de scope/overflow si existe.
2. Confirmar si "500 registros" es cap server-side. Si es cap, reemplazar por paginación real (variante B de `rules/pagination.md`: endpoint `/email-outbox/count` separado con mismos filtros).
3. Filtros combinables (todos en query string): `estado`, `destinatario LIKE`, `tipoFallo`, `correlationId`, `fechaDesde`, `fechaHasta`.
4. UI filter bar siguiendo design-system §B6 (search-box + filter-dropdowns + btn-clear).
5. **Hecho cuando**: el usuario lista exactamente los 14 fallidos del día con 1 click.

---

### Chat 4.2 — Filtros + breadcrumbs Errores (A9, A10, parte de B5)

**Repo**: BE + FE
**Tipo**: BE (filtros) + FE (filter bar + modal breadcrumbs)
**Estimación**: 1 chat

**Plan**:
1. **A9** — filtros server-side: `fechaDesde`, `fechaHasta`, `dni`, `rol`, `plataforma` (mobile/desktop derivado del user-agent), `urlPattern` (LIKE), `ocurrenciasMin`. Persistir en query string para URLs compartibles.
2. **A10** — breadcrumbs:
   - Persistir todos los breadcrumbs en `ErrorLogDetalle` (ya existe la tabla — confirmar que no hay cap de 5).
   - UI: mostrar primeros 5, "ver más" expande hasta 50, "ver flujo completo" abre modal con timeline.
   - Capturar breadcrumbs POST-error: buffer corto en frontend (últimos 10 eventos después del error) enviado en flush al cerrar sesión o en próximo error.
3. **Hecho cuando**: encontrar "todos los slow request sobre `/notificaciones/activas` de los últimos 7 días para Director" es 1 vista compartible.

---

### Chat 4.3 — Acciones inline (B6, parte de A2/A4)

**Repo**: BE + FE
**Tipo**: BE (3 endpoints) + FE (botones en filas)
**Estimación**: 1 chat
**Dependencia**: F3 (diagnostico completo) para que "Exportar caso" tenga toda la data.

**Plan**:
1. Endpoint `POST /email-outbox/{id}/retry`:
   - Valida no-blacklist + no-quarantine para el destinatario.
   - Resetea `EO_Estado='PENDING'`, `EO_Intentos=0`, `EO_NextRetryAt=null`.
   - Auditoría: campo nuevo `EO_RetryManualBy` con DNI del admin + timestamp.
2. Endpoint `GET /email-outbox/{id}/export`:
   - Bundle JSON con outbox + defer + blacklist + quarantine + correlation events relacionados.
   - Útil para análisis externo o ticket de soporte hosting.
3. Endpoint `POST /email-blacklist/{id}/unblock` (si no existe ya) con motivo obligatorio.
4. UI: row actions en Bandeja, Blacklist, Cuarentena. Iconos siguiendo design-system §B5 (3 botones rounded text con `pt` aria-label).
5. **Hecho cuando**: ningún flujo correctivo de monitoreo requiere abrir SSMS.

---

## Fase 5 — Visualizaciones (2 chats)

### Chat 5.1 — Trend 30d en todos los contadores (B8)

**Repo**: BE moderado + FE
**Tipo**: BE (endpoint generalizado) + FE (sparkline component)
**Estimación**: 1 chat
**Dependencia**: F1 Chat 1.1 (contadores reconciliados) para que el trend tenga sentido.

**Plan**:
1. Endpoint genérico `GET /email-monitoreo/serie-temporal?metric={sent|failed|deferred|blacklisted|quarantined}&days=30&groupBy=day`.
2. Cache 60s con `IMemoryCache` (alineado INV-MAIL08).
3. Componente `<app-mini-sparkline [data]>` reutilizable, height 32px, sin ejes, color por metric.
4. Cada KPI card del módulo monitoreo: sparkline + "promedio 7d: N / máx 30d: M" debajo del número grande.
5. **Hecho cuando**: el "14 fallidos hoy" se ve junto a su contexto histórico sin clicks.

---

### Chat 5.2 — Heatmap latencia + bundle telemetría en reportes (B9, B10)

**Repo**: BE + FE
**Tipo**: BE (agregaciones + bundle persist) + FE (heatmap component + render bundle)
**Estimación**: 1 chat o 2 si el heatmap es complejo

**Plan**:

1. **B9** — Heatmap:
   - Endpoint `GET /error-monitoreo/latencia-heatmap?endpoint={urlPattern}&days=30` agrupa por `(día_semana, hora)` con p95 latency.
   - Componente heatmap con PrimeNG Chart (heatmap básico) o D3 si PrimeNG no alcanza.
   - Tab nuevo en Errores: "Análisis temporal" con selector de endpoint.

2. **B10** — Bundle telemetría en reportes:
   - Cuando `FeedbackReportDialog` abre, capturar snapshot: últimas 10 rutas visitadas (de `RequestTraceFacade` o router events), último API_CALL fallido (correlation id + endpoint + status), sessionId, plataforma, viewport.
   - Persistir en `REU_TelemetryBundle` (`NVARCHAR(MAX)` JSON nullable). Migración SQL: ADD COLUMN nullable, sin backfill.
   - Detalle de reporte: render del bundle como timeline visual + link al hub correlacionado si el bundle trae correlationId.
   - Actualizar INV-RU03 en `business-rules.md §15.10` con la nueva capa de contexto.

3. **Hecho cuando**: patrón "lentitud 13-14h sobre `/notificaciones/activas`" se ve sin leer logs fila por fila; y un reporte de usuario muestra qué vivió el usuario en el momento del envío.

---

## Fase 6 — Vista unificada (2 chats finales)

### Chat 6.1 — Vista unificada por destinatario (B1)

**Repo**: BE + FE
**Tipo**: BE (endpoint compositor) + FE (página nueva con tabs)
**Estimación**: 1 chat
**Dependencia**: F1 (contadores), F3 (SMTP visible), F4 (acciones inline).

**Plan**:
1. Endpoint `GET /api/sistema/email-monitoreo/persona?email={email}` que compone:
   - Dueño(s) posible(s) en `Apoderado`/`Profesor`/`Director`/`Estudiante` (UNION).
   - `EmailOutbox` envíos (paginado, últimos 90d default).
   - `EmailDeferEvents` históricos.
   - `EmailBlacklist` y `EmailQuarantine` (estado actual + historial).
   - `ReporteUsuario` cruzado por `REU_UsuarioDni` si el email pertenece a un usuario, o por `correlationId` si hay match.
2. Página Angular `/intranet/admin/monitoreo/correos/persona/:emailOrId` con tabs: **Envíos** · **Bounces** · **Blacklist/Cuarentena** · **Reportes**.
3. Header con avatar + nombre + rol + KPIs (total enviados, fallidos, blacklisteados).
4. Acciones globales: "Reintentar todos los fallidos", "Quitar de blacklist", "Exportar bundle completo".
5. Link desde toda fila de bandeja, blacklist, cuarentena, defer-events, reportes de usuario, auditoría — vía botón "Ver historial completo".
6. **Hecho cuando**: investigar un destinatario problemático toma 1 vista, no 8 pestañas distintas.

---

### Chat 6.2 — Links bidireccionales y panel Gap accionable (B12)

**Repo**: FE (mayormente) + BE thin
**Tipo**: cambios pequeños en muchas vistas
**Estimación**: 1 chat
**Dependencia**: F2 Chat 2.1 (A13 ya cubrió Auditoría → Usuarios).

**Plan**:
1. Panel Gap del día (sección Diagnóstico):
   - Columna "Acción sugerida" se vuelve clickeable:
     - "Sin correo apoderado" → link al perfil del apoderado con dialog "agregar correo" pre-abierto.
     - "Apoderado blacklisteado" → link al detalle de blacklist + botón "Quitar de blacklist" inline (reusa endpoint del Chat 4.3).
     - "Sin rastro en outbox" → link al perfil del estudiante para inspección manual.
   - Filtro por salón (multiselect).
   - Botón "Exportar Excel" con los 14 estudiantes faltantes.
2. Bandeja, Blacklist, Cuarentena, Defer-events: cada fila con destinatario, agregar link "Ver historial" → Chat 6.1.
3. Auditoría de correos: si el hallazgo es un usuario, link directo (ya cubierto A13). Si el hallazgo es un email del outbox sin usuario, link a vista por destinatario.
4. Reportes de usuario: si el `correlationId` resuelve a otros carriles, agregar chip clickeable "Ver hub correlacionado".
5. **Hecho cuando**: ningún flujo del módulo monitoreo es un dead-end visual — toda fila relevante lleva a más contexto.

---

## Tabla de cierre por punto

Cuando cada chat ship, marcar los puntos del feedback original que cierra:

| Punto | Cierra en | Estado |
|-------|-----------|--------|
| A1 — contadores inconsistentes | Chat 1.1 | ✅ ship 2026-05-11 (chat 139) |
| A2 — bandeja sin filtro/orden estado | Chat 4.1 | ⏳ |
| A3 — TipoFallo "Sin clasificar" en PROCESSING | Chat 2.1 | ✅ BE chat 142 (awaiting-prod) + FE chat 147 (awaiting-prod) |
| A4 — buscador no encuentra outbox huérfanos | Chat 3.2 | ⏳ |
| A5 — detalle correo sin SMTP/remitente/origen | Chat 3.2 | ⏳ |
| A6 — blacklist sin SMTP real | Chat 3.1 | ⏳ |
| A7 — bloqueo manual sin motivo | Chat 2.1 | ✅ BE chat 142 (awaiting-prod) + FE chat 147 (awaiting-prod) |
| A8 — fingerprint variable (340 grupos = 1 bug) | Chat 1.2 | ⏳ |
| A9 — filtros pobres en errores | Chat 4.2 | ⏳ |
| A10 — breadcrumbs limitados a 5 | Chat 4.2 | ⏳ |
| A11 — correlation id no se propaga | Chat 1.3 | ⏳ |
| A12 — enmascaramiento inconsistente | Chat 2.1 | ✅ BE chat 142 (awaiting-prod) — FE n/a |
| A13 — auditoría sin "ir a corregir" | Chat 2.1 | ✅ FE chat 147 (awaiting-prod) |
| B1 — vista por destinatario | Chat 6.1 | ⏳ |
| B2 — fingerprint + trend + percentiles | Chat 1.2 | ⏳ |
| B3 — correlation id end-to-end | Chat 1.3 | ⏳ |
| B4 — SMTP visible donde corresponde | Chat 3.1 | ⏳ |
| B5 — filtros consolidados | Chat 4.1 + 4.2 | ⏳ |
| B6 — acciones inline | Chat 4.3 | ⏳ |
| B7 — notas obligatorias en blacklist manual | Chat 2.1 | ✅ BE chat 142 (awaiting-prod) + FE chat 147 (awaiting-prod) |
| B8 — trend 30d en contadores | Chat 5.1 | ⏳ |
| B9 — heatmap latencia | Chat 5.2 | ⏳ |
| B10 — bundle telemetría en reportes | Chat 5.2 | ⏳ |
| B11 — resolver discrepancia 5039 vs 102 | Chat 1.1 | ✅ ship 2026-05-11 (chat 139) — los 3 widgets miden ventanas legítimamente distintas (24h / día Lima / total), etiquetadas con chip Source + tooltip de ventana |
| B12 — links bidireccionales | Chat 6.2 | ⏳ |

---

## Riesgos y decisiones pendientes

1. **Chat 1.3 (correlation id) toca SignalR hubs** — alto blast radius. Coordinar con Plan 41 F6 que también lo tiene en cola.
2. **Chat 1.2 (fingerprint merge) corre job sobre prod** — requiere ventana de mantenimiento o validar idempotencia exhaustiva en staging primero.
3. **Chat 4.3 (acciones inline) "Quitar de blacklist"** — requiere decidir si exige re-validación del email antes de despejar, o confía en el admin.
4. **Chat 5.2 (bundle telemetría)** — pregunta de privacidad: ¿qué tan profundo va el snapshot? Capturar PII accidental es un riesgo. Auditar campos del bundle antes de persistir.
5. **Chat 6.1 (vista por destinatario) puede crecer mucho** — si la composición de 5 fuentes es lenta, considerar materialización en tabla `EmailMonitoreoPersonaSnapshot` actualizada por job.

---

## Lo que NO entra en este plan

- Migración del proveedor SMTP (eso es Plan 24).
- Rate limiting de requests entrantes (Plan 26).
- Nuevos canales de notificación (push, WhatsApp). Solo correo.
- Auditoría de seguridad transversal (Plan 16).
- Redesign visual del módulo (Plan 35 ya cerrado, este plan asume el shell estable).
