# BE — Load Control F6a: Calibración sintética con k6

> **Repo destino**: `Educa.API` (master) + `educa-web` (puede tocar test-k6 setup)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-05 · **Modo sugerido**: `/investigate` → `/execute` (ajustes finos) → `/validate`
> **Bloqueado por**: F2 (chat 104) cerrado.
> **Bloquea a**: F6b (datos reales).

## CONTEXTO

Validación sintética de las capas 2-6 implementadas en F1-F5. Sin esperar a producción — usa el sistema de testing de carga existente: `/intranet/admin/test-k6` ([`features/intranet/pages/admin/test-k6/`](../../../educa-web/src/app/features/intranet/pages/admin/test-k6/)).

Objetivo: detectar configuraciones obviamente mal calibradas antes de exponer al tráfico real (donde una mala N puede generar 503s a usuarios legítimos).

## OBJETIVO DEL CHAT

Ejecutar 6 escenarios sintéticos contra el backend con F1-F5 ya cerrados. Validar que el comportamiento bajo carga coincide con lo predicho por los ADRs.

## ALCANCE

### IN — 6 escenarios sintéticos

1. **Pico matutino simulado**: 80 logins concurrentes + 100 webhooks bio en 60s.
   - Esperado: ningún 503 (cap global 140 cubre 180 con holgura), ningún 429 (rate limit calibrado para rush).

2. **Saturación bulkhead Pagos**: 25 requests concurrentes a `CierreAsistenciaMensual.Cerrar`.
   - Esperado: 15 pasan (`concurrency:pagos` cap), 10 reciben 503 con `Retry-After` calibrado.

3. **Aislamiento entre bulkheads**: saturar `concurrency:reports` con 30 requests + 10 requests a `concurrency:pagos` simultáneamente.
   - Esperado: reports con 8 success + 22 saturados, pagos con 10/10 success (no afectado).

4. **Saturación combinada**: pico matutino + reportes pesados + push masivo notificaciones simultáneos.
   - Esperado: bulkheads saturados independientemente, login y dashboard del director siguen respondiendo (capa 2 global tiene 72+ slots libres).

5. **Cancelación efectiva**: query pesada con `CommandTimeout=60` cancelada vía cliente cierra conexión a los 2s.
   - Esperado: pool stats reflejan liberación inmediata (no espera 60s).

6. **Resilience HTTP externo**: simular Blob Storage caído (mock 503) — verificar que Polly retries 3x, breaker abre, retorna placeholder.
   - Esperado: 3 retries con jitter visibles en logs, breaker abre tras `MinimumThroughput=10`, requests subsiguientes responden inmediato con 503 + `Retry-After`.

### Métricas a observar

| Métrica | Fuente | Umbral OK |
|---|---|---|
| `concurrency:global.permits_in_use` p95 bajo carga normal | RuntimeHealth (Plan 102) | < 50 |
| Frecuencia 503 con `policy=concurrency:global` en pico | RateLimitTelemetryMiddleware | 0 (capa 2 no debería saturar en sintético) |
| Frecuencia 503 por bulkhead | RateLimitTelemetryMiddleware | matchea cap esperado por escenario |
| `Retry-After` valor en 503 | Headers respuesta | matchea fórmula `max(1, ceil(p95 × 1.5))` |
| Latencia p95 endpoints `pagos` durante saturación de `reports` | RuntimeHealth | sin cambio significativo (aislamiento) |

### Ajustes permitidos en F6a

Si el sintético muestra valores claramente incorrectos:
- N por bulkhead off por > 50% → ajustar valor en `IConfiguration` (sin redeploy ya posible).
- Aislamiento falla (pagos afectados al saturar reports) → bug en F2, abrir issue.
- `Retry-After` siempre = 5 (fallback) → verificar que p95 expone correctamente, ajustar.

**No** ajustar valores por margen sintético — solo por errores evidentes. La calibración fina es F6b.

### OUT

- Calibración con datos reales de producción → F6b.
- Cambios estructurales (agregar bulkhead nuevo, partition strategy) → ADR nuevo.

## CRITERIOS DE COMPLETADO

- ✅ 6 escenarios ejecutados con resultados documentados.
- ✅ Aislamiento entre bulkheads validado.
- ✅ Cancelación efectiva validada.
- ✅ Resilience HTTP externo validada.
- ✅ Reporte de F6a en `educa-web/.claude/diagnostic/load-control-f6a-report.md` con métricas y conclusiones.
- ✅ Si hay ajustes, commit del cambio con justificación basada en datos sintéticos.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Sintético no replica patrón real de uploads/chat | F6a cubre los patrones medibles sintéticamente. F6b cubre los reales. |
| k6 mismo se vuelve cuello de botella | Ejecutar k6 desde máquina externa o limitar requests/seg para no saturar el cliente. |
| Resultados varían por estado SQL en momento del test | Repetir cada escenario 3 veces y tomar mediana. |

## REFERENCIAS

- F1 (103), F2 (104), F3 (105), F4 (106), F5 (107) — todos cerrados.
- Test-k6 frontend: [`features/intranet/pages/admin/test-k6/`](../../../educa-web/src/app/features/intranet/pages/admin/test-k6/).
- Plan 102 (`be-runtime-health-execute`) — métricas de p95.
- ADRs 0001-0006 — predicción del comportamiento esperado.
