# BE — Load Control F6b: Calibración con datos reales de producción

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏸️ **WAITING** — movido a waiting/ el 2026-05-07 por dependencia externa
> **Creado**: 2026-05-05 · **Modo sugerido**: `/investigate` (read-only métricas) → `/adr` si requiere cambio estructural → `/execute` si solo ajuste de valores
> **Bloqueado por**: F6a cerrado + F1-F5 en `closed/` y desplegados en producción + 30 días de telemetría acumulada (revisar tras 2026-06-07 si F1-F5 ya en prod).
> **Bloquea a**: cierre del chat 096 (load control fully calibrated).

## CONTEXTO

Calibración fina con tráfico real. F6a validó comportamiento sintético; F6b valida que las predicciones de los ADRs (especialmente N=140 y los caps de bulkhead) coinciden con la realidad operativa.

Los ADRs documentan **valores iniciales defensivos**. F6b decide si:
- Mantener tal cual (predicción correcta).
- Ajustar valores hacia arriba (saturación legítima recurrente).
- Ajustar valores hacia abajo (sobredimensionamiento — solo si hay incentivo claro).
- Cambio estructural (categoría nueva, partition strategy distinta) → genera ADR nuevo que `Supersedes`.

## OBJETIVO DEL CHAT

Tomar las decisiones de calibración fina basadas en 30 días de telemetría de RuntimeHealth + RateLimitTelemetry.

## ALCANCE

### IN — Análisis y decisiones

1. **Recolectar datos de 30 días** desde `closed` de F4/F5 + deploy en prod:
   - `concurrency:global.permits_in_use` — distribución p50/p95/p99 por hora del día y día de semana.
   - Frecuencia 503 por policy (`concurrency:global`, `concurrency:pagos`, `concurrency:reports`, `concurrency:notif`, `concurrency:uploads`, `concurrency:bio`).
   - Correlación 503 → user (¿usuarios específicos saturando? ¿endpoint específico?).
   - `Retry-After` valor distribución (¿se queda en cap 1s mucho? ¿salta alto en horarios específicos?).
   - SQL pool exhaustion events (Hangfire jobs fallando por `Pool exhausted`) — síntoma adyacente.

2. **Tabla de decisión** (aplicar a cada bulkhead):

   | Observación 30 días | Decisión |
   |---|---|
   | p95 < 50% del cap durante 30 días, sin 503s | **No bajar** preventivamente. Margen futuro vale. Documentar como "validado holgado". |
   | p95 ≥ 78% del cap (110 para global de 140) Y sin 503s | Cap está justo. Subir 20-30% (vía `IConfiguration`, sin redeploy). |
   | 503s > 1% de requests del bulkhead durante > 7 días | Cap bajo. Investigar si es saturación legítima → subir, o abuso → revisar rate limit. |
   | p99 = 100% del cap por > 1h continua | Bug de pool exhaustion en otra capa. **No subir N** sin entender la causa. |
   | Aislamiento falla (saturación de bulkhead A correlaciona con latencia en bulkhead B) | Bug en F2 — abrir incidente. |

3. **Decisiones específicas a tomar**:
   - **N global**: ¿140 sigue OK? ¿Subir a 160 + pool 230?
   - **Bulkhead Pagos (15)**: ¿Suficiente o pico de matrícula lo satura?
   - **Bulkhead Reports (8)**: ¿8 simultáneos suficientes para directores generando boletines?
   - **Bulkhead Notif (15)**: ¿Acomodó el chat/mensajería real?
   - **Bulkhead Uploads (10)**: ¿Deadlines de tareas saturaron? ¿Subir a 15 solo en periodo de deadlines?
   - **Bulkhead Bio (20)**: ¿CrossChex retries fueron problema? ¿Subir/bajar?

4. **Documentar decisiones**:
   - Cada cambio → entrada en CHANGELOG del ADR correspondiente (ADR-0004 o ADR-0005) con `Updated YYYY-MM-DD: <decisión> based on <métrica>`.
   - Si cambio estructural (categoría nueva, partition diferente) → ADR nuevo que `Supersedes` el viejo.
   - Reporte ejecutivo en `educa-web/.claude/diagnostic/load-control-f6b-report.md`.

5. **Aplicar cambios vía `IConfiguration`** (Azure App Configuration, sin redeploy):
   - Cambios numéricos: simplemente actualizar `ConcurrencyLimits:*` en App Config.
   - Cambio estructural: requiere redeploy + ADR nuevo + brief de execute.

### OUT

- Cambios estructurales (categorías nuevas) — abrir nuevo ADR + brief.
- Migración a otra arquitectura (ej: cola opcional) — abrir ADR que `Supersedes` ADR-0001.

## CRITERIOS DE COMPLETADO

- ✅ 30 días de datos analizados.
- ✅ Decisiones tomadas para cada bulkhead + N global (mantener o ajustar).
- ✅ Si hay ajustes: aplicados en App Configuration + entradas de CHANGELOG en ADRs.
- ✅ Reporte F6b en `diagnostic/load-control-f6b-report.md`.
- ✅ Chat 096 (load control layers original) marcado completado al 100%.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| 30 días sin saturación legítima → no hay datos para decidir | Aceptable. Decisión = "validado holgado". Reabrir F6c en 6 meses si feature nueva cambia el patrón. |
| Saturación severa antes de los 30 días | Abrir incidente (no esperar a F6b). Ajustar valor crítico vía App Config + post-mortem en F6b. |
| Métricas de RuntimeHealth con bug → datos no confiables | Validar contra logs raw antes de decidir. |

## REFERENCIAS

- F6a (108) — base sintética.
- F1-F5 (103-107) — implementación.
- ADRs 0001-0006 — predicciones a validar.
- Plan 102 (runtime-health) — fuente de telemetría.
- Política de calibración: ADR-0004 §"Reglas de ajuste".
