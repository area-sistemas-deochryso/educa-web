# BE — Runtime health monitoring (endpoint admin + widget FE)

> **Repo destino**: `Educa.API` (master) + `educa-web` (main, widget consumidor)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-04 · **Modo sugerido**: `/design`
> **Dependencia inversa**: bloquea brief `096-be-load-control-layers` (necesitas medir antes de limitar)

## CONTEXTO

El usuario detectó que existe monitoreo de outbox (`EmailMonitoreoService`) y dashboard de salud SMTP (`DeferFailStatusWidget` polea cada 60s, push SignalR vía `EmailHub`), pero **no hay equivalente para el runtime del backend mismo**: ThreadPool, requests in-flight, latencias p50/p95/p99, conexiones DB, GC. Sin esto, no se pueden mapear los 3 patrones de saturación que justifican aplicar límites:

| Patrón | Síntoma | Causa raíz |
|---|---|---|
| **A — Starvation** | threads ↑, queue ↑, latencia ↑, CPU normal | Bloqueo de threads (sync IO, `.Result`, `Task.Wait`) |
| **B — Cuello externo** | threads estables, requests in-flight ↑, latencia ↑, DB lenta | El límite es IO externo (SQL Azure) |
| **C — Sobrecarga sin control** | requests ↑↑, todo ↑ (threads + latencia + errores) | Sin límites de entrada/concurrencia |

**Regla del usuario**: *"Si no puedes mapear una métrica a una causa → no estás midiendo bien."*

## INFRAESTRUCTURA YA EXISTENTE (no reinventar)

Auditoría rápida de `Educa.API` antes de diseñar:

| Componente | Archivo | Qué hace |
|---|---|---|
| OpenTelemetry full | `Extensions/ObservabilityExtensions.cs` | Traces + metrics + logs. AspNetCore + HttpClient + SqlClient + EFCore instrumentation. **Runtime instrumentation activa solo en prod** (GC, heap, JIT, **thread pool**). |
| Custom Meter | `Helpers/Diagnostics/AppMetrics.cs` | Meter `"Educa.API"` con `RequestDuration`, `ErrorsTotal`, `LoginAttempts`, `AsistenciasSynced`. |
| Request middleware | `Middleware/RequestMetricsMiddleware.cs` | Mide cada request → `RequestDuration` histogram + `ErrorsTotal` counter. |
| Rate limit middleware | `Middleware/RateLimitTelemetryMiddleware.cs` | Telemetría de rechazos rate-limit (existe partial — el contador real está en cPanel/Educa, no en backend). |
| Rate limit config | `Extensions/RateLimitingExtensions.cs` (201 líneas) | Políticas por endpoint. **No tiene SemaphoreSlim ni concurrency limits internos** — solo rate-limit de entrada. |
| Export | Application Insights (Azure Monitor) en prod, OTLP opcional en dev | Las métricas YA llegan a AppInsights. |

**Lo que falta** (gap real):

- Endpoint admin que devuelva un **snapshot consolidado** del runtime sin requerir abrir Application Insights.
- Widget FE espejo del patrón `DeferFailStatusWidget` para que el director vea saturación en vivo desde `/intranet/admin`.
- Lógica que **clasifique automáticamente** en Patrón A / B / C según los valores observados.
- Visualización de **requests in-flight** (no histograma, sino contador en vivo). Hay que agregar un `UpDownCounter` en `AppMetrics`.

## OBJETIVO DEL CHAT (modo `/design`)

Producir un plan ejecutable para la siguiente etapa (`/execute`), con:

1. **Contrato del endpoint** `GET /api/sistema/runtime-health` (DTO + caché TTL + scope de permisos).
2. **Contrato del widget FE** `RuntimeHealthWidget` (ubicación, polling, semáforo, breakdowns).
3. **Métrica nueva mínima**: `UpDownCounter` `requests-in-flight` en `AppMetrics` (la única instrumentación que hay que sumar; el resto se lee de las APIs estándar de .NET).
4. **Lógica de clasificación** de patrones A/B/C como función pura testeable.
5. **Lista cerrada de métricas** que el endpoint expone (no más, no menos):
   - ThreadPool: `threadCount`, `queueLength`, `completedItemsCount`, `pendingWorkItemCount` — vía `ThreadPool.GetAvailableThreads()` + `ThreadPool.PendingWorkItemCount`.
   - Requests: `inFlight` (counter nuevo), `p50` / `p95` / `p99` (window deslizante 5min de `RequestDuration`).
   - DB: `activeConnections`, `avgLatencyMs`, `p95LatencyMs` — vía `IDbContextFactory` + `Activity` listener filtrado por `db.system=mssql`.
   - GC: gen0/gen1/gen2 collections, `totalAllocatedBytes`, heapSize.
6. **Decisión sobre el dashboard FE**: ¿widget único en `/intranet/admin/health` (página nueva) o tab dentro del email-outbox dashboard?

## NO-SCOPE EXPLÍCITO

- ❌ Aplicar controles activos (rate limit nuevo, semáforos, bulkheads). Eso es brief `096`.
- ❌ Reescribir Application Insights. El endpoint solo lee lo que ya emitimos.
- ❌ Push SignalR (al menos no en F1; solo polling como `DeferFailStatusWidget` originalmente).
- ❌ Métricas de negocio (logins, asistencias). Solo runtime/infra.
- ❌ Persistir snapshots históricos. El endpoint es "vivo"; histórico ya está en AppInsights.

## ENTREGABLES DEL CHAT

1. **ADR corto** (`decisions/`) si surgen decisiones no triviales (ej: ¿exponer raw counters o solo el snapshot derivado? ¿permitir series cortas de 60s o solo punto actual?).
2. **Brief de ejecución** en `open/` para la fase F2 con scope cerrado.
3. **Update del plan maestro**: agregar el chat de execute como prioridad media (después de Plan 39 OPS).

## REFERENCIAS

- Patrón canónico de widget admin: `educa-web/src/app/features/intranet/pages/admin/email-outbox/components/defer-fail-status-widget/`.
- Patrón canónico de endpoint admin con caché: `Educa.API/Services/Notifications/EmailMonitoreoService.cs` (caché `IMemoryCache` con TTL diferenciado).
- Permisos: `[Authorize(Roles = "Director")]` consistente con admin pages.
- Reglas de pertenencia del menú: `educa-web/.claude/rules/menu-modules.md` — un widget de runtime health entra al módulo **Sistema** > grupo **Monitoreo** (responde "¿cómo se configura/observa la plataforma?").

## CRITERIO DE COMPLETADO

El chat termina cuando:

- Hay un brief `XXX-be-runtime-health-execute.md` en `open/` con scope sin ambigüedades.
- Las decisiones de arquitectura están documentadas (ADR si aplica, sino dentro del brief).
- El usuario validó que el contrato del endpoint y del widget reflejan lo que necesita.
