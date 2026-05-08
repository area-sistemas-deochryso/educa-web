# Plan 41 — Trazabilidad y Observabilidad del Hub de Correlación

> **Fecha**: 2026-05-08
> **Origen**: Petición del usuario tras revisar `/intranet/admin/correlation/:id` shipped por Plan 32. La página funciona pero deja al admin reconstruyendo eventos mentalmente: 4 listas planas independientes, sin timeline, sin enlaces laterales a otras vistas, sin contexto de la request principal, sin breadcrumbs del cliente. La meta es **cerrar las 12 brechas identificadas** para que el hub sea lo primero que el admin abre cuando hay un incidente y lo único que necesita ver.
> **Decisión del usuario**: cerrar TODAS las brechas, aceptando >10 chats si hace falta.
> **Estado**: ⏳ en progreso. F1 ✅ awaiting-prod (chat 131). F2 lista para arrancar.

---

## Contexto

| Hito previo | Aporte | Limitación residual |
|---|---|---|
| **Plan 32** ✅ (2026-04-25) | `CorrelationController` + `CorrelationService` con 4 queries fail-safe + página FE con 4 secciones + `<app-correlation-id-pill>` desde error-logs/rate-limit/feedback/email-outbox | Snapshot plano, sin timeline, sin enlaces salientes |
| **Plan 34** ✅ (2026-04-27) | `ErrorGroup` con UPSERT por fingerprint + Kanban admin | Hub no linkea a Kanban — el admin tiene que copiar el groupCode |
| **Plan 35/36** ✅ (2026-04-27/28) | Hub de monitoreo + shells consistentes | Hub correlation está fuera de la navegación principal del Monitoreo — solo deep-link |
| **`RequestMetricsMiddleware`** | Mide latencia + cuenta errores por route | Solo OpenTelemetry en memoria — no persiste en BD, no se cruza con correlationId |
| **`ActivityTrackerService`** (FE) | Captura clicks/navigations en memoria del cliente | Solo se envían cuando el usuario reporta error — invisibles desde el hub |

---

## Diagnóstico — las 12 brechas

| # | Brecha | Tipo | Severidad |
|---|---|---|---|
| 1 | Sin timeline cronológico unificado | UX | Alta |
| 2 | Sin request lifecycle (método+URL+status+ms persistidos por correlation) | Datos | Alta |
| 3 | Sin breadcrumbs del cliente persistidos | Datos | Media |
| 4 | Sin grafo de relaciones (ErrorGroup, EntidadOrigen, otros correlations del DNI) | UX | Alta |
| 5 | Sin vista por sesión / usuario | UX | Alta |
| 6 | Sin search global por contenido | UX | Media |
| 7 | Sin outbox-chain visible (NDR ↔ email ↔ blacklist hits) | UX | Media |
| 8 | Sin performance context (p95 del endpoint vs request actual) | UX | Media |
| 9 | SignalR sin propagación de correlation | Datos | Baja-Media |
| 10 | Sin export / share / permalink | UX | Baja |
| 11 | Sin auto-refresh durante incidentes activos | UX | Baja |
| 12 | UI no muestra cap defensivo (100 filas) cuando una sección llega llena | UX | Baja |

---

## Fases y chats

### F1 — Timeline cronológico unificado · 1 chat FE

**Resuelve brechas #1 y #12.**

| Chat | Repo | Scope | Salida |
|---|---|---|---|
| **Chat 1 — F1 FE timeline + cap-awareness** | `educa-web` | Componente `correlation-timeline-section/` que mezcla los 4 arrays del snapshot ordenados por fecha, render como steps con icono + color por tipo (error / rate-limit / reporte / outbox). Toggle "Vista timeline ↔ Vista por sección" persistido en `PreferencesStorageService`. Banner `<i class="pi pi-info-circle"></i> 100 filas (cap)` cuando una sección viene llena. | Nueva sección antes de las 4 secciones existentes. Default: timeline. Tests unitarios del computed que ordena. |

**Sin cambios BE**. Riesgo bajo. Cierre limpio sin migración.

---

### F2 — Anclas y enlaces laterales · 2 chats (1 BE + 1 FE)

**Resuelve brechas #4, #5 (parcial), #7.**

| Chat | Repo | Scope | Salida |
|---|---|---|---|
| **Chat 2 — F2 BE DTO ampliado** | `Educa.API` | `CorrelationSnapshotDto` agrega: (a) `errorGroupCode?` por cada `ErrorLog` (resuelto vía `LEFT JOIN ErrorGroup` en el service); (b) `entidadOrigen` ya existe en `EmailOutbox` pero confirmar que llega serializado; (c) `relatedCorrelationIds: string[]` — los últimos 5 distinct correlationIds del mismo `usuarioDni` (cualquiera de las 4 tablas) en las últimas 2h, exclusivo del id consultado. Cap 5. INV-S07 fail-safe por sub-query. | DTO ampliado + tests. Endpoint mantiene shape — campos opcionales. |
| **Chat 3 — F2 FE enlaces salientes** | `educa-web` | Botones en cada fila del timeline / sección: "Ver grupo de errores" (→ `/intranet/admin/error-groups?fingerprint=X`), "Ver bandeja del destinatario" (→ `/intranet/admin/email-outbox?destinatario=Y`), "Ver reporte de usuario" (→ `/intranet/admin/feedback-reports/Z`). Sección lateral "Otros correlation IDs de este usuario (últimas 2h)" si `relatedCorrelationIds.length > 0` — chips con `<app-correlation-id-pill>`. | Hub navegable como grafo. Tests del computed que arma los links. |

---

### F3 — Persistir RequestMetric con CorrelationId · 2 chats (1 BE + 1 FE)

**Resuelve brechas #2 y #8. Decisión usuario: solo persistir requests con `status >= 400`.**

| Chat | Repo | Scope | Salida |
|---|---|---|---|
| **Chat 4 — F3 BE tabla `RequestMetric` + middleware insert + snapshot** | `Educa.API` | Nueva tabla `RequestMetric` (cols: `RM_CodID`, `RM_CorrelationId`, `RM_Route` (template), `RM_Method`, `RM_Status`, `RM_DurationMs`, `RM_UsuarioDni` masked, `RM_UsuarioRol`, `RM_Plataforma`, `RM_Fecha`). Insert fire-and-forget en `RequestMetricsMiddleware.InvokeAsync` solo cuando `statusCode >= 400`. Endpoint correlation devuelve `requestMetric?` con la fila matching (1 fila o null). Purga diaria 7 días vía Hangfire job. SQL script obligatorio mostrado al usuario antes de deploy. | Tabla + DDL + middleware + endpoint extendido + tests + script SQL. |
| **Chat 5 — F3 FE ancla "Request" en header** | `educa-web` | Sección "Request" en header del hub (encima de las secciones), muestra: método + URL + status + durationMs + dni + fecha. Si está disponible, comparativa "esta request: 4.2s — p95 del endpoint: 800ms (5.2× más lento)". Si no hay `requestMetric` (correlation pre-deploy o request 200), mostrar "Request principal no registrada". | Header informativo del hub. Tests del fallback null. |

**Volumen estimado**: con tasa típica de error <5% del proyecto, ~50.000 inserts/día → ~5 MB/día. Retención 7 días → ~35 MB total. Sin riesgo de I/O.

---

### F4 — Breadcrumbs del cliente persistidos · 3 chats (1 design + 1 BE + 1 FE)

**Resuelve brecha #3. Riesgo de privacidad — requiere decisión de scope antes de implementar.**

| Chat | Repo | Scope | Salida |
|---|---|---|---|
| **Chat 6 — F4 design + ADR privacidad** | docs | Decidir: (a) qué eventos se persisten (clicks navegación + form submits + http requests + errores capturados); (b) buffer en cliente (último N=20 eventos); (c) flush periodicidad (debounced 30s o on-error/on-navigation); (d) retención (7d default); (e) PII — qué se enmascara antes de persistir; (f) opt-out por usuario. **ADR obligatorio en `Educa.API/.claude/decisions/`**. | ADR + diseño aprobado. Sin código. |
| **Chat 7 — F4 BE tabla + endpoint** | `Educa.API` | Nueva tabla `ClientBreadcrumb` (cols: `CB_CodID`, `CB_CorrelationId`, `CB_SessionId`, `CB_Tipo`, `CB_Detalle` (JSON ≤500 chars), `CB_UsuarioDni` masked, `CB_Plataforma`, `CB_Fecha`). Endpoint `POST /api/sistema/breadcrumbs` con rate limit (60/min por IP). Snapshot agrega `clientBreadcrumbs[]` (cap 50). Purga 7d. | Tabla + endpoint + service + tests + script SQL. |
| **Chat 8 — F4 FE tracker + flush + render** | `educa-web` | `BreadcrumbsTrackerService` mantiene buffer in-memory y flushea cada 30s o al detectar error. Captura: `router.events`, `requestTraceInterceptor` (ya existe), errores capturados por `GlobalErrorHandler`. Sección nueva en el hub que renderiza breadcrumbs del cliente como steps con icono por tipo. | Tracker + sección hub + tests. |

---

### F5 — Search, export, auto-refresh · 3 chats independientes

**Resuelve brechas #6, #10, #11.**

| Chat | Repo | Scope | Salida |
|---|---|---|---|
| **Chat 9 — F5 search global por contenido** | `Educa.API` + `educa-web` | Endpoint `GET /api/sistema/correlation/search?q=&desde=&hasta=&dni=` que devuelve lista de correlationIds matcheando texto en `ERL_Mensaje` / `REU_Descripcion` / `EO_Asunto` / `EO_UltimoError` (case-insensitive, cap 50 resultados, query timeout 5s). Caps de input: q ≥3 chars y ≤200, ventana ≤7d. Página `/intranet/admin/correlation/search` con form + tabla de resultados (cada uno con pill clickeable). | Endpoint + service + página FE + tests. |
| **Chat 10 — F5 FE export JSON** | `educa-web` | Botón "Exportar JSON" en el hub header. Serializa el snapshot completo + metadata (correlationId + generatedAt + URL del hub). Descarga como `correlation-{id}-{YYYYMMDD}.json`. | Botón + service de export. Sin BE. |
| **Chat 11 — F5 FE auto-refresh opt-in** | `educa-web` | Switch en header "Auto-refresh (30s)" que dispara `loadSnapshot` cada 30s mientras esté activo. Pausa al cambiar de tab (visibilitychange). Persistido en `PreferencesStorageService` (default off). | Switch + lógica reactiva. Sin BE. |

---

### F6 — SignalR + WAL correlation · 3 chats coordinados

**Resuelve brecha #9. Alto blast radius — recomendación: ejecutar al final, después de validar que F1-F5 cubrieron el dolor en producción real.**

| Chat | Repo | Scope | Salida |
|---|---|---|---|
| **Chat 12 — F6 design + ADR blast radius** | docs | Decidir: (a) cómo se propaga correlationId a `ChatHub` y `AsistenciaHub` (header en `OnConnectedAsync` vs query string vs claim); (b) tabla `HubEvent` para logs persistidos vs OpenTelemetry only; (c) `WalEntry.correlationId` requiere migración del modelo del WAL (FE) — impacto en LeaderElection, IndexedDB schema; (d) compatibilidad con sesiones existentes pre-deploy. **ADR obligatorio**. | ADR + diseño aprobado. Sin código. |
| **Chat 13 — F6 BE hub interceptor + WAL FE schema** | `Educa.API` + `educa-web` | BE: filtro/middleware en hubs que extrae `correlationId` y lo agrega al log scope + persiste en `HubEvent`. FE: `WalDbService` schema bump → guardar `correlationId` en cada `WalEntry`. Migration handler para entries pre-deploy. | Hub interceptor + WAL schema + scripts SQL + tests. |
| **Chat 14 — F6 FE render hub/WAL events** | `educa-web` | Hub correlation agrega 2 secciones nuevas: "Eventos SignalR" (cuando hay match en `HubEvent`) y "Operaciones WAL" (entries del WAL local con ese correlationId). Riesgo: WAL es local — solo se ven eventos del navegador del admin, no del usuario afectado. Documentar la limitación en el hub. | Secciones + tests. |

---

## Estimado total

| Fase | Chats | Costo aprox |
|---|---|---|
| F1 | 1 (FE) | 0.5 día |
| F2 | 2 (1 BE + 1 FE) | 1.5 días |
| F3 | 2 (1 BE + 1 FE) | 2 días (incluye SQL) |
| F4 | 3 (design + 1 BE + 1 FE) | 3 días (ADR + privacidad) |
| F5 | 3 independientes | 2 días |
| F6 | 3 (design + 2 dev) | 4 días (alto blast radius) |
| **Total** | **14 chats** | **~13 días calendario** secuenciales |

**Paralelización posible**:
- F2 BE y F2 FE pueden solaparse parcialmente (FE espera DTO ampliado para tests, pero puede empezar con shapes mockeados).
- F5 los 3 chats son independientes entre sí — puede tomar 1-2 días si se ejecutan en serie sin diseño previo.
- F6 depende de F1-F5 para validar valor real.

---

## Decisiones tomadas (Chat 0 — diseño 2026-05-08)

1. ✅ Cerrar las 12 brechas en su totalidad.
2. ✅ F3 RequestMetric: solo persistir `status >= 400` para minimizar I/O.
3. ✅ Crear este plan dedicado (no inline en maestro) por tamaño (14 chats).
4. ⏳ Pendiente decisión Chat 6: ámbito y retención de breadcrumbs cliente (privacidad).
5. ⏳ Pendiente decisión Chat 12: estrategia SignalR/WAL — re-evaluar valor tras F1-F5.

---

## Dependencias

- Plan 32 ✅ ya cerrado — base sobre la que se construye.
- Plan 34 ✅ ya cerrado — F2 linkea a Kanban de ErrorGroup.
- Plan 35 ✅ ya cerrado — el hub de monitoreo agregará entrada visual al hub correlation tras F1.

**Sin bloqueos externos.** Las 14 fases pueden arrancar inmediatamente.

---

## Cierre del plan

Plan 41 cierra al 100% cuando:
- F1-F5 están en producción y verificadas (`/verify` ejecutado en cada brief).
- F6 está en producción **o** explícitamente aplazado por decisión del usuario tras observar F1-F5 en uso real.
- Las 12 brechas están marcadas como cerradas en este documento (✅ por brecha).
- INV nuevos formalizados en `business-rules.md` si aplican (F3 introduce `RequestMetric`, F4 introduce `ClientBreadcrumb`, F6 introduce `HubEvent` — cada uno con su INV de retención y privacidad).

---

## Estado de brechas

| # | Brecha | Estado |
|---|---|---|
| 1 | Timeline cronológico | ✅ F1 (chat 131, awaiting-prod) |
| 2 | Request lifecycle | ⏳ F3 |
| 3 | Breadcrumbs cliente | ⏳ F4 |
| 4 | Grafo de relaciones | ⏳ F2 |
| 5 | Vista por sesión / usuario | ⏳ F2 (parcial) + F5 (search) |
| 6 | Search global | ⏳ F5 |
| 7 | Outbox-chain visible | ⏳ F2 |
| 8 | Performance context | ⏳ F3 |
| 9 | SignalR correlation | ⏳ F6 |
| 10 | Export / share | ⏳ F5 |
| 11 | Auto-refresh | ⏳ F5 |
| 12 | Cap awareness UI | ✅ F1 (chat 131, awaiting-prod) |
