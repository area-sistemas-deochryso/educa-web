# Plan 43 · Chat 1.3 — Unificación de formato del correlation id (BE thin)

> **Repo destino**: `Educa.API` (master) — BE thin tras la auditoría inicial.
> **Plan**: 43 · **Chat**: 1.3 · **Fase**: F1 (Foundations) · **Creado**: 2026-05-13 · **Estado**: 🟢 fix aplicado, validación en curso.
> **Modo aplicado**: `/investigate` ✅ → `/execute` ✅ → `/validate` 🟡 → `/end` cuando suite completa verde.

## Resumen

Lo que el plan original llamó "propagación correlation id end-to-end" era en realidad **drift de formato** entre dos fallbacks del `CorrelationIdMiddleware`. La auditoría chat 153 reveló que el id YA se propaga correctamente, pero el middleware caía a `Activity.Current.TraceId` (32 hex W3C) o `Guid.NewGuid().ToString("N")` (32 sin guiones) cuando no venía `X-Request-Id` del FE — webhook CrossChex, background jobs. Resultado: coexistían 32-hex y GUID-36 en la misma columna lógica, el hub `/intranet/admin/correlation/:id` aparecía vacío para cualquier id real.

## Hallazgos de la auditoría (chat 153)

### Datos en producción (SELECT 2026-05-13)

| Carril | Total 24h | Con id | Formato real | Length |
|---|---:|---:|---|---:|
| `ErrorLog` | 23 | 23 (100%) | GUID-36 con guiones | 36 |
| `REU_ReporteUsuario` | 0 | 0 | GUID-36 (samples históricos) | 36 |
| `EmailOutbox` | 84 | 84 (100%) | hex W3C sin guiones | 32 |
| `RateLimitEvent` (rechazados) | 0 | 0 | hex sin guiones (samples) | 32 |

Top 10 correlation ids cross-tabla (7 días): **carriles_cubiertos = 1 en todos**. Cero ids cruzan ≥2 tablas. Confirmado: cada hop usa su propio formato.

### Origen del drift en código

`CorrelationIdMiddleware.cs:32-34` (antes del fix):

```csharp
var correlationId = context.Request.Headers[RequestIdHeader].FirstOrDefault()
    ?? Activity.Current?.TraceId.ToString()   // 32 hex W3C
    ?? Guid.NewGuid().ToString("N");          // 32 sin guiones
```

`RateLimitTelemetryMiddleware.cs:65` (antes del fix): leía del response header `X-Correlation-Id`, frágil al orden de pipeline.

### Limitación arquitectónica detectada (NO es un bug)

El correlation id correlaciona eventos **dentro del mismo request HTTP del servidor**. Requests independientes (admin FE vs webhook CrossChex que encola correo) tienen ids distintos por diseño. El hub `/intranet/admin/correlation/:id` solo cruza carriles cuando los eventos se originaron en la misma request HTTP. Documentado como **INV-CORR01** en `business-rules.md` BE.

## Fix aplicado

| Archivo | Cambio |
|---|---|
| `Middleware/CorrelationIdMiddleware.cs` | Fallback ahora `Guid.NewGuid().ToString()` (D format, 36 con guiones). Eliminado import `System.Diagnostics`. OTel `Activity` sigue capturando trace id por su cuenta para Azure Monitor — son canales separados. |
| `Middleware/RateLimitTelemetryMiddleware.cs` | Lee `HttpContext.Items[CorrelationIdMiddleware.CorrelationIdItemKey]` en vez de response header. Alinea con `EmailOutboxService.ResolveCorrelationId`. |
| `Tests/Middleware/CorrelationIdMiddlewareTests.cs` | **Nuevo** (6 tests): con `X-Request-Id` preserva id FE, sin header genera GUID-36, regresión `Activity.Current` no contamina, regex GUID-36 canónico. |
| `Tests/Middleware/RateLimitTelemetryMiddlewareTests.cs` | +2 tests: lee correlation id de Items, sin Items pasa null. |

## Resultados

- Build BE: ✅ (exit 0).
- Tests focused (CorrelationId + RateLimitTelemetry + EmailOutboxEnqueueCorrelation): **21/21 verdes**.
- Suite completa: 🟡 en curso (background task `b1eg9vphp`).
- **Sin cambios FE** — `requestTraceInterceptor` ya manda `X-Request-Id: crypto.randomUUID()` (GUID-36) desde el primer día.
- **Sin migración de datos** — registros viejos quedan con su formato (forensic value). Filas nuevas a partir del deploy van todas en GUID-36.

## Scope explícitamente reducido vs plan original

- ✅ Alinear formato (cierra A11+B3).
- ❌ SignalR hubs → Plan 41 F6 (sigue con la decisión arquitectónica completa: hub filter + query param + `HubCallerContext.Items`).
- ❌ FE cambios — innecesarios.

## Verificación post-deploy (pendiente del usuario)

1. **Smoke SQL**: re-correr query 1 después de 24h del deploy.
   - Esperado: 100% filas nuevas en GUID-36 en los 4 carriles.
2. **Smoke browser**: ejecutar una admin action que encole correo (ej: aprobar matrícula, reset password de un usuario), capturar el `X-Correlation-Id` del response, abrir `/intranet/admin/correlation/<id>` → debe mostrar **≥2 carriles cruzados** (ErrorLog si hubo log + EmailOutbox).

## Criterios de cierre

- [x] Auditoría completa de los hops reportada al usuario.
- [x] Fix de los 2 hops identificados.
- [x] Tests nuevos verdes (8 nuevos: 6 + 2).
- [ ] Suite completa BE sin regresiones (en curso).
- [ ] INV-CORR01 documentado en `business-rules.md` BE.
- [ ] Plan file y maestro actualizados con scope corregido (✅ plan file, pendiente maestro).
- [ ] Smoke browser + SQL post-deploy (responsabilidad del usuario tras `/end`).

## Aprendizajes transferibles

- **"Auditá antes de propagar"**: el plan original pedía propagar el id end-to-end. Auditando con SELECT real se descubrió que la propagación ya funciona — el bug era de formato. Cambió el scope de "chat denso cross-repo + E2E" a "BE thin, 2 archivos, 5 líneas". Lección: SELECT de cobertura real ANTES de codear; nunca asumir lo que dice el brief original.
- **Drift entre dos APIs de identidad**: `Activity.TraceId` (W3C) y `Guid.NewGuid()` resuelven necesidades distintas. Mezclarlos como fallbacks de la misma variable garantiza drift. Una columna lógica = un solo formato.
- **El hub correlation tiene límites estructurales**: HTTP request boundary impone que eventos en requests separados NO comparten id. Documentar como invariante (INV-CORR01) evita expectativas falsas downstream (F3/F6/B10 ahora saben qué esperar).

## Referencias

- [`plan/monitoreo-cowork-feedback-2026-05-11.md`](../../plan/monitoreo-cowork-feedback-2026-05-11.md) — Plan 43, Chat 1.3 (rewrited).
- [`plan/correlation-id-links.md`](../../plan/correlation-id-links.md) — Plan 32 (hub + columnas + endpoint + pill).
- [`plan/correlation-hub-observability.md`](../../plan/correlation-hub-observability.md) — Plan 41 (timeline + lifecycle + SignalR brecha #9).
- ADR sugerido: no se generó — el cambio es chico y se documenta inline en code comments + INV-CORR01.
