# BE — Load control layers (concurrency + bulkheads + timeouts + backpressure)

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-04 · **Modo sugerido**: `/adr` primero, después `/design`
> **Bloqueado por**: brief `095-be-runtime-health-monitoring` debe estar al menos en F1 (`/design` cerrado, métricas accesibles). Sin medición no hay calibración.

## CONTEXTO

El usuario formalizó las **6 capas de control de carga** que un backend debe tener antes de optimizar performance. Educa.API hoy implementa **solo capa 1 parcial** (rate limiting de entrada vía `Extensions/RateLimitingExtensions.cs`). Las capas 2–6 no existen como mecanismo sistemático.

> *"Primero defines límites, luego optimizas dentro de ellos."*

### Inventario de las 6 capas

| Capa | Concepto | Estado actual en Educa.API | Gap |
|---|---|---|---|
| **1 — Rate limiting** | Cuántas requests aceptás | ✅ Configurado por endpoint en `Extensions/RateLimitingExtensions.cs` (201 líneas) | Revisar si la partition (IP/user/global) es la correcta para cada política. |
| **2 — Concurrency limit** | Cuántas operaciones reales corren simultáneas | ❌ No existe | Agregar `SemaphoreSlim(N)` global + N inicial calibrado. |
| **3 — Bulkheads** | Aislar dominios críticos | ❌ No existe | Categorías propuestas: Pagos, Reportes pesados, Notificaciones, Default. |
| **4 — Cola opcional** | Buffer cuando rechazar no es opción | ❌ No existe | Probablemente NO aplica — no hay caso de uso que tolere latencia extra. **Decidir explícitamente**. |
| **5 — Timeouts + cancelación** | Nunca dejar IO sin límite | ⚠️ Parcial — algunos services usan `CancellationToken`, no es sistemático | `IDbCommand.CommandTimeout` + `HttpClient.Timeout` + `CancellationToken` propagado en repos críticos. |
| **6 — Backpressure** | Cómo decir "no" cuando colapsás | ⚠️ Rate limit devuelve 429 pero no `Retry-After` consistente; no hay degradación graceful | Agregar `Retry-After`, considerar respuestas degradadas (sin breakdowns en reportes pesados). |

## OBJETIVO DEL CHAT (modo `/adr` → `/design`)

### Fase A — ADR (decisiones de diseño no triviales)

Producir uno o varios ADRs que cierren:

1. **¿Polly o handcrafted?** Polly 8 es la opción canónica de .NET para resilience pipelines (retry, timeout, circuit breaker, bulkhead). Pero suma dependencia. ¿Vale la pena? Educa.API ya usa `Renci.SshNet`, MailKit, Hangfire — agregar Polly no es disruptivo, pero hay que decidir.
2. **¿Semáforos por endpoint o middleware genérico?**
   - Opción A: Atributo `[ConcurrencyLimit(N)]` por endpoint que envuelva la action.
   - Opción B: Middleware que clasifique el request por categoría (path / claim / header) y aplique el `SemaphoreSlim` correcto.
   - Opción C: `RateLimiter` de .NET 9 también soporta concurrency limits (no solo rate). Reutilizar la infra de `Extensions/RateLimitingExtensions.cs`.
3. **N inicial para concurrencia global**: regla del usuario es `N = conexionesMaxDB * 0.7`. Hay que **leer** el max pool size de SQL Azure (default 100) y de la connection string actual para calcular, no inventar.
4. **Categorías de bulkhead** y N por categoría. Propuesta inicial:
   - **Pagos** (CRUD de matrícula + pagos): N=20. Aislamiento crítico (INV-T01, INV-AD03).
   - **Reportes pesados** (`[EnableRateLimiting("heavy")]`): N=5. Ya tienen rate limit, agregar concurrency limit.
   - **Notificaciones / outbox / SignalR**: N=10. Mantener fluido pero no inundar.
   - **Default** (resto del CRUD): N restante (calculado).
5. **Política de timeouts default**: ¿2s, 5s, 30s? Diferenciado por tipo (DB query vs HTTP externo vs read masivo). Documentar.
6. **Backpressure activo vs degradado**:
   - 429 + `Retry-After: <segundos calibrado>`.
   - ¿Se degrada algún endpoint? (ej: reportes que devuelvan totales sin breakdowns cuando hay saturación).

### Fase B — Design ejecutable

Una vez resueltos los ADRs, producir brief(s) de execute con sub-fases:

- **F1**: Concurrencia global con `SemaphoreSlim` + middleware clasificador. N calibrado contra SQL pool.
- **F2**: Bulkheads por categoría (4 grupos definidos en ADR). Tests que prueben aislamiento (Pagos no se afecta cuando Reportes está saturado).
- **F3**: Timeouts sistemáticos en repositorios + `HttpClient` named clients. Tests con `CancellationToken` cancelando ops largas.
- **F4**: Backpressure formal — middleware que setee `Retry-After` calculado del tiempo de cola. Decidir si algún endpoint admite degradación.
- **F5**: Resiliencia (retries con límite + circuit breaker en deps externas: SignalR cluster, BlobStorage, JaaS, MailKit). Polly o handcrafted según ADR.
- **F6**: Calibración con datos reales — usando el endpoint del brief 095. Iterar N hasta encontrar el punto donde `p95` se mantiene plano bajo carga sin disparar 429s en exceso.

## CRITERIOS DE ÉXITO POR FASE

| Fase | Criterio medible |
|---|---|
| F1 | Bajo carga sintética (k6, ya disponible en `/intranet/admin/test-k6`), threadpool-thread-count se mantiene estable; los excedentes esperan en queue del semáforo, no en el ThreadPool. |
| F2 | Saturar reportes pesados con k6 NO degrada latencia de Pagos (medible vía endpoint del brief 095). |
| F3 | `dotnet test` agrega tests que prueban cancelación: una query >timeout cancela y libera la conexión. |
| F4 | 429s tienen `Retry-After` con valor calibrado, no fijo. Cliente puede planificar reintento. |
| F5 | Caída transitoria de Application Insights / Blob no propaga 500s en cascada. Circuit breaker abre, requests degradan o devuelven default seguro. |
| F6 | Reporte final: gráficos del widget del brief 095 mostrando los 3 patrones bajo control. |

## NO-SCOPE EXPLÍCITO

- ❌ Reescribir el rate limiting existente. Solo extender la partition strategy si el ADR lo decide.
- ❌ Reemplazar Hangfire ni cambiar SignalR transports.
- ❌ Cache de queries (es optimización, no límite — viola la regla del usuario "primero límites, luego optimizar").
- ❌ Tocar la cola WAL del frontend. WAL ya tiene su propia resilience (M1-M4 cerrados).

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| N mal calibrado bloquea requests legítimos | F6 itera con datos reales. Empezar conservador (N=50 global), ajustar. |
| Polly agrega complejidad para casos simples | ADR Fase A decide. Si la mayoría son try/catch + Retry-After, handcrafted alcanza. |
| Tests de concurrencia son flaky | Usar k6 para integration tests + `Task.WhenAll` con `SemaphoreSlim` controlado en unit tests. |
| Bulkheads requieren cambios en muchos endpoints | Middleware clasificador por path resuelve sin tocar controllers. |

## REFERENCIAS

- Capa 1 actual: `Educa.API/Extensions/RateLimitingExtensions.cs`.
- Telemetría rate-limit: `Educa.API/Middleware/RateLimitTelemetryMiddleware.cs`.
- Calibración con datos: depende del brief `095-be-runtime-health-monitoring`.
- Sistema de testing de carga: `educa-web/src/app/features/intranet/pages/admin/test-k6/`.
- Constraint real medido: `project_smtp_limits.md` y `project_smtp_defer_fail_block.md` (los planes 22/29/38 son ejemplos de cómo el techo externo obliga a pre-filtros antes de enviar — mismo patrón que vamos a aplicar internamente).
- Invariantes que el aislamiento debe proteger: INV-T01 (cierre periodo irreversible), INV-AD03 (cierre mensual asistencia), INV-RU08 (correos fire-and-forget no fallan inserts).

## CRITERIO DE COMPLETADO

El chat termina cuando:

- ADRs cerrados y commiteados (decisión documentada por escrito, no implícita).
- Brief(s) F1-F6 en `open/` con orden y dependencias entre fases.
- N inicial calculado y justificado (no inventado).
- El usuario validó que las 4 categorías de bulkhead reflejan el negocio real.
