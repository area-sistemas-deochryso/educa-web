# BE — Load Control F2: Bulkheads por categoría

> **Repo destino**: `Educa.API` (master)
> **Estado**: ✅ cerrado local 2026-05-05 — esperando deploy + validación prod.
> **Creado**: 2026-05-05 · **Modo sugerido**: `/execute` → `/validate`
> **Bloqueado por**: F1 (chat 103) cerrado.
> **Bloquea a**: F6a (calibración sintética).
> **Validación prod**: ⏳ pendiente desde 2026-05-05.

## RESULTADO (cerrado 2026-05-05)

- 5 policies `concurrency:{pagos,reports,notif,uploads,bio}` en `RateLimitingExtensions.cs` con caps 15/8/15/10/20 (ADR-0005), configurables vía `ConcurrencyLimits:*` sin redeploy.
- Helper privado `AddBulkhead` para registro uniforme. Stash `kind=concurrency` + `policy` para que `OnRejected` (F1) emita 503 con `Retry-After`.
- 8 controllers anotados:
  - **pagos** (method-level): `CierreAsistenciaController.{CrearCierre,RevertirCierre}`, `AprobacionEstudianteController.AprobarMasivo`.
  - **reports** (class-level): `BoletaNotasController`, `ReportesAsistenciaController`, `ConsultaAsistenciaController`.
  - **notif** (class-level): `EmailOutboxController`, `NotificacionesController`, `EmailMonitoreoController`.
  - **uploads** (class-level): `BlobStorageController`.
  - **bio** (class-level): `AsistenciaController` (cubre webhook + registro manual; ambos comparten dominio bio).
- 6 tests integración (`Plan40F2BulkheadIntegrationTests`): saturación por bulkhead (Theory × 5) + aislamiento reports↔pagos. Suite full **1647/1647 ✅**.
- Doc: sección "Clasificación de endpoints por bulkhead" en `educa-web/.claude/rules/backend.md` con tabla, árbol de decisión, quirk `AllowMultiple=false` y deuda SignalR Hubs anotada.

### Aprendizaje transferible

`EnableRateLimitingAttribute` tiene `AllowMultiple=false` — el "Plan B" del brief (policy combinada por categoría) **no fue necesario** porque class-level y method-level son targets distintos del CLR y .NET acumula ambos atributos en runtime. La regla práctica que F2 valida: si un endpoint requiere rate (capa 1) + bulkhead (capa 3) y todos los métodos del controller pertenecen al mismo bulkhead, poner el bulkhead a class-level y dejar el rate por método. Si el controller es mixto, queda solo method-level con un atributo único; cubrir el resto con un ADR si surgen casos. Documentado en `backend.md` § "Composición de policies (.NET 9 quirk)".

### Pendiente para F3 / sub-chat

SignalR Hubs (`ChatHub`, `AsistenciaHub`, `EmailHub`) — `[EnableRateLimiting]` no aplica a `OnConnectedAsync` ni a métodos `On<X>`. Hoy pasan solo por capa 2 global N=140; el cap `concurrency:notif` se aplicará vía middleware o `RateLimiter` directo cuando F3 toque hubs. Anotado como deuda en `backend.md`.

### Validación prod (pendiente)

Después del deploy del BE a Azure:

1. Saturar `POST /api/AprobacionEstudiante/masivo` con N+ε requests simultáneos en sandbox/staging — los excedentes deben recibir 503 + `Retry-After` (no 429, no 500).
2. Verificar que `RateLimitTelemetryMiddleware` persiste eventos de la nueva policy (`concurrency:pagos|reports|notif|uploads|bio`) en `RateLimitEvents` con `kind = concurrency`.
3. Confirmar que `ConcurrencyLimits:Reports` ajustable en Azure App Configuration aplica sin redeploy (subir de 8 a 12 y validar que un 9º request entra).

## CONTEXTO

Implementación de capa 3 del modelo de control de carga. Categorización y N por bulkhead documentados en [ADR-0005](../../../Educa.API/.claude/decisions/0005-bulkhead-categories.md).

5 bulkheads explícitos + Default implícito. Cada uno con justificación numérica trazable en el ADR.

## OBJETIVO DEL CHAT

Agregar las 5 políticas `concurrency:<bulkhead>` y clasificar los endpoints existentes según el árbol de decisión del ADR-0005.

## ALCANCE

### IN

1. Agregar al `AddRateLimiter` en `RateLimitingExtensions.cs` las 5 políticas:

   | Policy | N (default) | Configurable como |
   |---|---:|---|
   | `concurrency:pagos` | 15 | `ConcurrencyLimits:Pagos` |
   | `concurrency:reports` | 8 | `ConcurrencyLimits:Reports` |
   | `concurrency:notif` | 15 | `ConcurrencyLimits:Notif` |
   | `concurrency:uploads` | 10 | `ConcurrencyLimits:Uploads` |
   | `concurrency:bio` | 20 | `ConcurrencyLimits:Bio` |

   Patrón:

   ```csharp
   options.AddPolicy("concurrency:pagos", context =>
       RateLimitPartition.GetConcurrencyLimiter("pagos", _ => new ConcurrencyLimiterOptions
       {
           PermitLimit = configuration.GetValue<int>("ConcurrencyLimits:Pagos", 15),
           QueueLimit = 0
       }));
   // ... idem para los otros 4
   ```

2. Clasificar endpoints existentes — agregar `[EnableRateLimiting("concurrency:<bulkhead>")]` además de la rate limit policy actual:

   **Pagos**:
   - `PagoMatriculaController.*` (cuando exista — feature pendiente, ver `project_matricula_pending.md`).
   - `CierreAsistenciaMensualController.Cerrar/Revertir`.
   - `AprobacionEstudianteController.Masivo`.

   **Reports**: ya tienen `[EnableRateLimiting("reports")]` o `[EnableRateLimiting("batch")]`. Agregar la concurrency complementaria:
   - `ReporteFiltradoAsistenciaController.*Pdf/*Excel`.
   - `ReporteAsistenciaController.*Pdf/*Excel`.
   - `BoletaNotasController.*Pdf/*Excel`.
   - `ConsultaAsistenciaController.*Pdf/*Excel`.

   **Notif**:
   - `EmailOutboxController.*`.
   - `NotificacionesController.*`.
   - `EmailMonitoreoController.*`.
   - `ChatHub`, `AsistenciaHub`, `EmailHub` — aplicar via convención (decisión de F2: `[EnableRateLimiting]` no aplica directo en hubs; usar middleware o atributo en cada `On<Method>`).

   **Uploads**: identificar endpoints con `[FromForm] IFormFile` o multipart. Listado en F2:
   - Todos los endpoints de archivos de tarea/curso/foro/mensajería actuales (puede no existir todavía si las features están pendientes).
   - Marcar al menos los que ya existen + dejar comentario en CLAUDE.md `backend.md` sobre el árbol de decisión.

   **Bio**:
   - `WebhookCrossChexController.Recibir` (o equivalente actual).

3. Validar composición de atributos — un controller con `[EnableRateLimiting("batch")]` + `[EnableRateLimiting("concurrency:reports")]` debe pasar SOLO si AMBAS políticas tienen permit. Si .NET 9 no compone nativamente, plan B: una sola policy combinada por categoría.

4. Tests de integración por bulkhead:
   - Saturar 25 requests a un endpoint del bulkhead `pagos` (N=15) → 15 pasan, 10 reciben 503.
   - Mismo test para `reports`, `notif`, `uploads`, `bio`.
   - Test de aislamiento: saturar `reports` y verificar que `pagos` sigue respondiendo (no es afectado).

5. Documentar el árbol de decisión en `educa-web/.claude/rules/backend.md` (sección nueva "Clasificación de endpoints por bulkhead") con link al ADR-0005.

### OUT

- `Retry-After` calculado dinámicamente → F4.
- Calibración con datos reales → F6.
- Tocar el `SemaphoreSlim` interno de `EmailService` o `NotificacionFaltasService` (ADR-0002 dice que se mantienen).

## CRITERIOS DE COMPLETADO

- ✅ 5 políticas `concurrency:*` registradas y configurables vía `IConfiguration`.
- ✅ Endpoints existentes clasificados según árbol de decisión.
- ✅ Tests de saturación por bulkhead pasan.
- ✅ Test de **aislamiento** pasa (saturar reports NO afecta a pagos).
- ✅ Sección "Clasificación de endpoints por bulkhead" agregada a `backend.md`.
- ✅ Lint/build/dotnet test verde.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| `[EnableRateLimiting]` no compone AND nativamente | Plan B: una policy combinada por categoría que internamente verifica rate + concurrency. |
| Endpoints de Uploads no existen todavía (feature pendiente) | F2 deja la policy registrada; se aplicará a los endpoints cuando se construyan. Documentar en CLAUDE.md. |
| Hubs SignalR no soportan `[EnableRateLimiting]` directo | Aplicar concurrency check en cada `OnConnectedAsync` o método del hub via `RateLimiterFactory` directo. |

## REFERENCIAS

- [ADR-0005](../../../Educa.API/.claude/decisions/0005-bulkhead-categories.md) — categorización completa.
- [ADR-0004](../../../Educa.API/.claude/decisions/0004-global-concurrency-n.md) — relación con N global.
- F1 (chat 103) — base sobre la que F2 agrega.
