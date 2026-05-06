# BE — Runtime health monitoring — Execute (endpoint + clasificador + métrica + widget)

> **Repo destino**: `Educa.API` (master) + `educa-web` (main)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-05 · **Modo sugerido**: `/execute` → `/validate`
> **Predecesor**: `095-be-runtime-health-monitoring.md` (closed) — `/design` que cerró las 4 decisiones de arquitectura.
> **Bloquea**: `096-be-load-control-layers.md` (capa 2-6: necesita las métricas de este chat para calibrar).

## CONTEXTO

El `/design` del chat 095 cerró 4 decisiones (D1=A, D2=B, D3=A, D4=A). Este chat ejecuta el plan: endpoint + clasificador + métrica nueva + widget FE. Sin medición no se puede aplicar 096 (semáforos, bulkheads, timeouts).

## DECISIONES CERRADAS (rationale del 095)

### D1 — Sliding window in-process para p50/p95/p99 de requests (opción A)

**Por qué A y no B/C**:

- B (solo `inFlight` + `total24h`, percentiles desde AppInsights) **viola el requisito explícito** del 095 *"endpoint admin que devuelva un snapshot consolidado del runtime sin requerir abrir Application Insights"*.
- C (`MeterListener` sobre el propio `RequestDuration`) es elegante pero frágil: re-suscribirse al meter propio puede entrar en ciclos si el listener registra otro histogram, y `OpenTelemetry` ya tiene un MeterListener interno — agregar uno propio compite por la callback. Mejor mantener el cálculo desacoplado de OpenTelemetry.

**Implementación**: clase `RequestPercentileTracker` (sliding window 5 min con buckets de 5s, ~60 buckets de `int[]` con conteos por rango logarítmico de duración). No es TDigest exacto pero los percentiles bucket-quantizados son suficientes para mapear A/B/C. Consumo memoria estable < 10KB.

### D2 — `EventListener` sobre `Microsoft.Data.SqlClient.EventSource` para pool stats (opción B)

**Por qué B y no A**:

- A (solo latencias derivadas de `Activity` listener `db.system=mssql`) cubre p50/p95/p99 de queries pero **no ve el pool**. El patrón B (cuello externo: pool agotado) requiere `active-hard-connections` y `pooled-connections`.
- C (abrir test connection cada poll) es hack que ensucia métricas con conexiones del propio endpoint.

**Implementación**: `SqlClientCounterListener : EventListener` registrado en `Program.cs` que captura `EventSource` con nombre `Microsoft.Data.SqlClient.EventSource` y mantiene `volatile int _activeHard; volatile int _pooled` en memoria. Consume < 1KB.

### D3 — Página dedicada `/intranet/admin/sistema/health` (opción A)

**Razón**: regla `menu-modules.md` ubica monitoreo de plataforma en módulo Sistema > Monitoreo. Tab dentro de email-outbox sería violación semántica (correos ≠ runtime).

### D4 — Snapshot puntual sin serie corta (opción A)

**Razón**: serie histórica ya está en AppInsights — duplicarla sin ROI claro. Si más adelante se necesita, agregar B (12 puntos cada 5s) es trivial.

### D5 — Permisos: `[Authorize(Roles = "Director")]` (default del 095)

**Razón**: el brief 095 lo dejó así explícito. Si el usuario quiere abrir a Asistente Admin/Promotor/Coord. Académico durante este chat, ajustar a `Roles.Administrativos` antes del commit (cambio de 1 línea + 4 tests authz).

## CONTRATO DEL ENDPOINT

**Ruta**: `GET /api/sistema/runtime-health`
**Permisos**: `[Authorize(Roles = "Director")]` (ver D5)
**Cache**: `IMemoryCache` con TTL **10s** (poll FE 60s, tolera múltiples tabs sin pegarle al endpoint)
**Rate limit**: política `"global"` reads (200/min por user)
**Fail-safe (INV-S07)**: try/catch global; si falla, devolver `RuntimeHealthSnapshot { Pattern = UNKNOWN, ... }` con counters en 0 — el widget muestra banner "error de telemetría" (mismo patrón `isProbableTelemetryFailure` del defer-fail).

### DTO

```csharp
public sealed record RuntimeHealthSnapshot(
    string GeneratedAt,
    SaturationPattern Pattern,
    string PatternReason,
    ThreadPoolSnapshot ThreadPool,
    RequestsSnapshot Requests,
    DbSnapshot Db,
    GcSnapshot Gc);

public sealed record ThreadPoolSnapshot(
    int WorkerThreadsBusy,         // maxWorker - availableWorker
    int WorkerThreadsMax,
    int CompletionPortBusy,
    int CompletionPortMax,
    int QueueLength,               // ThreadPool.PendingWorkItemCount
    long CompletedItemsCount);     // ThreadPool.CompletedWorkItemCount

public sealed record RequestsSnapshot(
    int InFlight,
    double P50Ms,
    double P95Ms,
    double P99Ms,
    int CountLast5Min);

public sealed record DbSnapshot(
    int ActiveConnections,
    int PooledConnections,
    double AvgLatencyMs,
    double P95LatencyMs);

public sealed record GcSnapshot(
    int Gen0Collections,
    int Gen1Collections,
    int Gen2Collections,
    long HeapSizeBytes,
    long TotalAllocatedBytes);

public enum SaturationPattern { OK, STARVATION, EXTERNAL_BOTTLENECK, OVERLOAD, UNKNOWN }
```

## MÉTRICA NUEVA ÚNICA

```csharp
// AppMetrics.cs — agregar
public static readonly UpDownCounter<int> RequestsInFlight =
    Meter.CreateUpDownCounter<int>(
        "educa.requests.in_flight",
        unit: "{request}",
        description: "Requests currently being processed");
```

`RequestMetricsMiddleware.InvokeAsync`: `+1` antes de `await _next`, `-1` en `finally` (incluso ante exception). Sin tags para minimizar cardinalidad. La sliding window in-process la alimenta el mismo middleware tras `sw.Stop()`.

## CLASIFICADOR — FUNCIÓN PURA TESTEABLE

```csharp
namespace Educa.API.Helpers.Diagnostics;

public sealed record SaturationThresholds(
    int QueueLengthAlert = 50,
    double P95LatencyAlertMs = 800,
    int InFlightAlert = 100,
    double DbP95AlertMs = 500);

public static class SaturationClassifier
{
    public static (SaturationPattern Pattern, string Reason) Classify(
        ThreadPoolSnapshot tp, RequestsSnapshot req, DbSnapshot db,
        SaturationThresholds t)
    {
        bool queueHigh = tp.QueueLength > t.QueueLengthAlert;
        bool latencyHigh = req.P95Ms > t.P95LatencyAlertMs;
        bool inflightHigh = req.InFlight > t.InFlightAlert;
        bool dbSlow = db.P95LatencyMs > t.DbP95AlertMs;

        // STARVATION antes que OVERLOAD: ambos suben latencia, pero starvation
        // tiene queue alta SIN inflight alto (los threads están bloqueados, no
        // procesando).
        if (queueHigh && latencyHigh && !inflightHigh)
            return (SaturationPattern.STARVATION,
                $"queue={tp.QueueLength} p95={req.P95Ms:F0}ms");

        if (latencyHigh && dbSlow && !queueHigh)
            return (SaturationPattern.EXTERNAL_BOTTLENECK,
                $"db_p95={db.P95LatencyMs:F0}ms api_p95={req.P95Ms:F0}ms");

        if (inflightHigh && latencyHigh && queueHigh)
            return (SaturationPattern.OVERLOAD,
                $"in_flight={req.InFlight} queue={tp.QueueLength}");

        return (SaturationPattern.OK, "all metrics within thresholds");
    }
}
```

`SaturationThresholds` parametrizable vía `appsettings.json` (`Diagnostics:SaturationThresholds`). Permite calibrar sin redeploy.

## CONTRATO DEL WIDGET FE

| Campo | Decisión |
|---|---|
| Ruta | `/intranet/admin/sistema/runtime-health` |
| Componente page | `RuntimeHealthPageComponent` (smart, container) |
| Widget | `<app-runtime-health-widget [snapshot]="..." [loading]="..." [autoRefresh]="..." />` (presentacional) |
| Polling | 60s, toggle on/off, persistido en `PreferencesStorageService` (key `runtimeHealthAutoRefresh`) |
| Semáforo | `OK → success`, `STARVATION/EXTERNAL_BOTTLENECK/OVERLOAD → warn`, `UNKNOWN → info` con banner sutil "error de telemetría" |
| Breakdowns | 4 cards (ThreadPool, Requests, DB, GC) — cada card con 2-4 valores raw + chip de severidad |
| SignalR | ❌ NO en F1. Polling puro, igual que `DeferFailStatusWidget` original (pre-Plan 38 Chat 6). |
| Feature flag | `runtimeHealth` en `environment.features` (OFF prod, ON dev). Cuando se valide, se prende en prod. |
| Permiso registry | `ADMIN_SISTEMA_RUNTIME_HEALTH` |
| Menú | Módulo **Sistema** > grupo **Monitoreo** (label "Salud del runtime") |

### Estructura de archivos FE

```
features/intranet/pages/admin/sistema/runtime-health/
├── runtime-health.component.ts          (smart, ~80 lines)
├── runtime-health.component.html
├── runtime-health.component.scss
├── components/
│   └── runtime-health-widget/
│       ├── runtime-health-widget.component.ts
│       ├── runtime-health-widget.component.html
│       └── runtime-health-widget.component.scss
├── models/
│   └── runtime-health.models.ts         (DTO espejo BE)
└── services/
    ├── runtime-health.service.ts        (API gateway)
    ├── runtime-health.store.ts          (signal + asReadonly)
    └── runtime-health.facade.ts         (polling + cleanup destroyRef)
```

## ARCHIVOS A CREAR / MODIFICAR

### Backend (`Educa.API`)

| Archivo | Acción | Notas |
|---|---|---|
| `Helpers/Diagnostics/AppMetrics.cs` | Modify | Agregar `RequestsInFlight UpDownCounter` |
| `Helpers/Diagnostics/RequestPercentileTracker.cs` | Create | Sliding window 5min, buckets logarítmicos |
| `Helpers/Diagnostics/SqlClientCounterListener.cs` | Create | `EventListener` sobre `Microsoft.Data.SqlClient.EventSource` |
| `Helpers/Diagnostics/SaturationClassifier.cs` | Create | Función pura + `SaturationThresholds` |
| `Middleware/RequestMetricsMiddleware.cs` | Modify | `RequestsInFlight.Add(+1/-1)` + alimentar `RequestPercentileTracker` |
| `DTOs/Sistema/RuntimeHealthSnapshot.cs` (+ records hijos) | Create | DTO + sub-records + enum |
| `Services/Sistema/RuntimeHealthService.cs` | Create | Orquesta lectura + clasifica + cachea (TTL 10s) |
| `Interfaces/Services/Sistema/IRuntimeHealthService.cs` | Create | Contrato |
| `Controllers/Sistema/RuntimeHealthController.cs` | Create | `[Authorize(Roles = "Director")]` |
| `Program.cs` | Modify | Registrar `SqlClientCounterListener` (singleton eager) + `RequestPercentileTracker` (singleton) + `RuntimeHealthService` (scoped) |
| `appsettings.json` | Modify | Sección `Diagnostics:SaturationThresholds` |

### Frontend (`educa-web`)

| Archivo | Acción | Notas |
|---|---|---|
| `features/intranet/pages/admin/sistema/runtime-health/...` (estructura completa de arriba) | Create | 9 archivos |
| `shared/constants/permission-registry.ts` | Modify | `ADMIN_SISTEMA_RUNTIME_HEALTH` |
| `features/intranet/shared/config/intranet-menu.config.ts` | Modify | Item nuevo en Sistema > Monitoreo |
| `features/intranet/intranet.routes.ts` | Modify | Spread condicional `runtimeHealth` |
| `config/environment.ts` + `environment.development.ts` | Modify | `features.runtimeHealth` flag |

## SCOPE OUT (no hacer en este chat)

- ❌ Aplicar controles activos (semáforos, bulkheads, rate limit nuevo). Eso es brief `096`.
- ❌ Push SignalR del runtime health. Polling puro en F1; si se necesita, F2 separado siguiendo el patrón Plan 38 Chat 6 sobre `EmailHub`.
- ❌ Persistir snapshots históricos en BD. AppInsights ya cubre histórico.
- ❌ Métricas de negocio (logins, asistencias). Solo runtime/infra.
- ❌ Open Asistente Admin/Promotor/Coord. al endpoint sin pedir explícito. Default Director.

## VALIDACIÓN

| Capa | Comando |
|---|---|
| BE lint/build | `dotnet build` (cap 300 líneas por archivo) |
| BE tests | `dotnet test` — agregar mínimo: |
| | • Unit `SaturationClassifier` (4 tests: OK + 3 patrones + edge cases) |
| | • Unit `RequestPercentileTracker` (3 tests: window slide, percentiles, empty) |
| | • Integration `RuntimeHealthService` (2 tests: happy path + fail-safe) |
| | • Authz `RuntimeHealthController` (2 tests por reflection: Director pass + 4 no-Director reject) |
| FE lint | `npm run lint` |
| FE build | `npm run build:capacitor` |
| FE tests | `npx vitest run` — agregar: widget render tests + facade polling tests con vitest fake timers |

## CRITERIO DE COMPLETADO

- Endpoint `/api/sistema/runtime-health` responde con `RuntimeHealthSnapshot` válido localmente.
- Página `/intranet/admin/sistema/runtime-health` renderiza el widget con datos reales.
- Tests BE +11 mínimo, FE +6 mínimo. Suite verde en ambos repos.
- Lint + build OK en ambos repos.
- Feature flag `runtimeHealth` OFF en prod, ON en dev — listo para `/verify` post-deploy.

## REFERENCIAS

- Brief `/design` predecesor: `closed/095-be-runtime-health-monitoring.md`
- Patrón canónico endpoint con caché: `Educa.API/Services/Notifications/EmailMonitoreoService.cs`
- Patrón canónico widget admin: `educa-web/src/app/features/intranet/pages/admin/email-outbox/components/defer-fail-status-widget/`
- Patrón fail-safe FE (`isProbableTelemetryFailure`): `email-outbox/models/defer-fail-status.models.ts`
- Reglas: `business-rules.md` INV-S07 (fail-safe), `menu-modules.md` (módulo Sistema > Monitoreo), `backend.md` (cap 300 líneas, ApiResponse<T> opcional aquí — el endpoint puede devolver `RuntimeHealthSnapshot` directo dado que es leído por widget propio, mismo patrón que `defer-fail-status`).

## APRENDIZAJES TRANSFERIBLES (de chat 095)

- **OTel runtime instrumentation NO es lectura in-process**. `AddRuntimeInstrumentation()` exporta a AppInsights pero no permite leer back desde el meter propio. Para consultas en-vivo desde un endpoint propio, usar APIs estándar de .NET (`ThreadPool`, `GC`, `EventListener`).
- **Histogramas OTel custom no son consultables desde el meter propio**. El sliding window in-process es complementario, no duplicado: el primero alimenta dashboards externos, el segundo alimenta endpoints internos.
- **Clasificador de saturación A/B/C es función pura** — no depende de DI, no toca BD, no toca tiempo. Cualquier feature de health monitoring debe extraer esta capa para que sea trivialmente testeable.

---

## ✅ Verificado en producción 2026-05-06

Smoke Cowork (`claude-cowork/post-deploy-2026-05-06.md` CASO 102):

- `GET /api/sistema/runtime-health` → 200 (no 500 — bug 1 del chat 108 NO regresó).
- Métricas reales observadas: `requests.p50Ms=32, p95Ms=512, p99Ms=512, inFlight=1`, `db.activeConnections=15, p95LatencyMs=0`, `threadPool.queueLength=0`.
- **Desviación de plan vs implementación**: el shape devuelto es `{ generatedAt, pattern, patternReason, threadPool, requests, db, gc }`, no `{ classification, metrics: { p50, p95, p99, inFlight, sqlPool } }` como decía la sección "DECISIONES CERRADAS" del brief. La equivalencia funcional: `pattern: 0 + patternReason: "all metrics within thresholds"` corresponde a clasificación A. La doc del brief quedó desactualizada respecto a la implementación final ganadora; no es bug — solo registro histórico.

Cierre formal del Plan 102.
