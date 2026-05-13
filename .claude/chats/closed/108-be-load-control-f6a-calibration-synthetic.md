# BE — Load Control F6a: Calibración sintética con k6

> **Repo destino**: `Educa.API` (master) + `educa-web` (puede tocar test-k6 setup)
> **Estado**: 🟢 destrabado — F6a-02 y F6a-03 ejecutados parcialmente. Faltan 01/04/05 + refinar thresholds.
> **Creado**: 2026-05-05 · **Modo aplicado**: `/investigate` → preparador (camino A del chat 108) → `/execute` parcial (2026-05-06).
> **Bloqueos previos resueltos**: chat 110 decouple-usetest-flags cerrado (`b7cd9a2`); 3 bugs BE descubiertos en sesión Cowork 2026-05-06 fixados en `Educa.API@cee1ef2`.
> **Bloquea a**: F6b (datos reales).

## Sesión 2026-05-06 — bugs BE resueltos + corridas parciales

Sesión Cowork del usuario 2026-05-06 destapó 3 blockers BE para F6a; se atacaron en este chat:

| Bug | Archivo | Fix | Estado |
|---|---|---|---|
| 1: `runtime-health` 500 por policy "global" no registrada | `Educa.API/Controllers/Sistema/RuntimeHealthController.cs` | `[EnableRateLimiting("global")]` → `[DisableRateLimiting]` (GlobalLimiter chained ya cubre) | ✅ fixed |
| 2: `CrearCierreAsync` race en check-then-insert (SqlException 2601/2627 → 500) | `Educa.API/Services/Asistencias/CierreAsistenciaService.cs` | try/catch `DbUpdateException`+SqlException 2601/2627 con re-fetch idempotente | ✅ fixed |
| 3: `Retry-After` "absurdo" 4ms | `BackpressureRetryAfterCalculator.cs` | falso positivo — calculator correcto, p95 inflado por Bug 2 | ✅ falso positivo |

Commit BE: `Educa.API/master@cee1ef2`. Fix scripts F6a (`SalonId`→`SedeId`): `educa-web/main@<pendiente>`.

### Corridas validadas

| Escenario | 2xx | 503 | 500 (SqlException) | Threshold |
|---|---|---|---|---|
| **F6a-02** saturación-pagos (25 VUs, cap=15) | 15 | 5-7 (`policy=concurrency:pagos`) | **0** ✅ (era 14 antes del fix) | `blocked_503 ≥ 8` falla por 1-3 — ramp-up de `shared-iterations` ⚠️ |
| **F6a-03** aislamiento-bulkheads (30 reports + 10 pagos) | 30 + 10 | `pagos_503=0` ✅ (CRÍTICO) | 0 | `reports_503 ≥ 15` falla — endpoint `BoletaNotas/estudiante/1` retorna fast 4xx (~127ms) sin saturar cap=8 ⚠️ |

`Retry-After` observado: 4s entero (no fallback de 5s) — el calculator está leyendo p95 real.

### Pendiente para próxima sesión

- **Refinar threshold F6a-02**: cambiar `executor` de `shared-iterations` a `constant-arrival-rate` con `rate=25, timeUnit=100ms` para forzar simultaneidad real.
- **Refinar threshold F6a-03**: usar endpoint con latencia > 500ms (PDF real con ID válido) o subir `iterations` a 60+ para acumular concurrencia con cap=8.
- **Correr F6a-01** (pico matutino): requiere `CROSSCHEX_WEBHOOK_SECRET` real en `.env-f6a`.
- **Correr F6a-04** (combinado): requiere webhook secret + datos reales.
- **Correr F6a-05** (cancelación): no tiene blockers conocidos.
- **Diferir F6a-06** a F6b (requiere wiremock para Blob).
- **Llenar reporte** `.claude/diagnostic/load-control-f6a-report.md` con las 5 corridas.

## ESTADO ACTUAL (2026-05-05 — preparación inicial)

Camino A elegido: yo preparo scripts + plantillas, vos ejecutás cuando tengas BE local + k6.

### Shipped (sin commit aún — pendiente decisión del usuario en `/end`)

| Archivo | Rol |
|---|---|
| `scripts/load-tests/f6a/README.md` | instrucciones, prerequisitos, comandos exactos |
| `scripts/load-tests/f6a/.env-f6a.example` | template de credenciales locales (gitignored) |
| `scripts/load-tests/f6a/_lib/auth.js` | helper login compartido |
| `scripts/load-tests/f6a/_lib/payloads.js` | fixtures CrossChex |
| `scripts/load-tests/f6a/01-pico-matutino.js` | 80 logins (token reusado) + 100 webhooks bio |
| `scripts/load-tests/f6a/02-saturacion-pagos.js` | 25 cierres concurrentes — verifica cap Pagos N=15 |
| `scripts/load-tests/f6a/03-aislamiento-bulkheads.js` | reports + pagos simultáneos — verifica aislamiento |
| `scripts/load-tests/f6a/04-saturacion-combinada.js` | pico + reports + notif + bio + dashboard director |
| `scripts/load-tests/f6a/05-cancelacion-efectiva.js` | follow-up tras cancelar 8 reportes a 2s |
| `scripts/load-tests/f6a/06-resilience-blob-mock.js` | Polly retries + breaker (requiere mock setup) |
| `.claude/diagnostic/load-control-f6a-report.md` | plantilla del reporte para llenar al ejecutar |

### Decisiones tomadas durante la preparación

- **Login en escenario 1 reusa un único token** (estudiante o profesor). Evita falso positivo con rate limit `login=10/min/IP` cuando k6 corre desde una sola IP. El brief habla de "logins concurrentes" pero lo medible bajo k6 es "sesiones autenticadas haciendo home requests" — equivalente desde el punto de vista del cap global.
- **Endpoint clasificado en `:reports`** elegido para escenarios 3+5: `GET /api/BoletaNotas/estudiante/{id}` (decoración heredada via class-level `[EnableRateLimiting("concurrency:reports")]` en `BoletaNotasController`).
- **Endpoint clasificado en `:notif`** para escenario 4: `POST /api/Notificaciones`.
- **Escenario 6 (Blob mock) NO es auto-ejecutable hoy** sin uno de:
  - Wiremock local en :9090 + override de `appsettings.Development.json:AzureBlobStorage:Endpoint`.
  - Hook de diagnóstico `Diagnostics:ForceBlobFailure=true` (requiere PR a `Educa.API`, ~30 líneas).
  - Diferir a F6b cuando el deploy a Azure permita simular falla real.
  Documentado en header del script. **Recomendación**: opción C (hook de diagnóstico) en un sub-chat aparte si F6a quiere ser hermético, o aceptar diferimiento a F6b.

### Lo que falta — sesión operativa del usuario

1. Instalar k6 (`scoop install k6`).
2. Levantar `dotnet run` en `Educa.API` con master actual (F1-F5 mergeados).
3. Copiar `.env-f6a.example` → `.env-f6a` y completar credenciales locales reales.
4. Ejecutar 5 escenarios × 3 runs = 15 corridas (~30-45 min).
5. Decidir qué hacer con escenario 6 (mock setup vs diferir).
6. Llenar `.claude/diagnostic/load-control-f6a-report.md` con observaciones.
7. Si hay ajustes evidentes (>50% off), commit con justificación; si no, commit del reporte y mover brief a `awaiting-prod/` cuando F1-F5 deployen y el reporte se cierre.

### Referencia rápida de caps esperados (ADR-0005)

| Bulkhead | Cap | Endpoints clave |
| --- | ---: | --- |
| `concurrency:global` | 140 | todos los requests autenticados |
| `concurrency:pagos` | 15 | `cierre-asistencia/*`, `PagoMatricula*`, `Aprobacion*/masivo` |
| `concurrency:reports` | 8 | `BoletaNotas*`, `ConsultaAsistencia*` (clase con `[EnableRateLimiting("concurrency:reports")]`) |
| `concurrency:notif` | 15 | `Notificaciones*`, `EmailOutbox*`, hubs |
| `concurrency:uploads` | 10 | multipart/form-data hacia Blob |
| `concurrency:bio` | 20 | `POST /api/Asistencia/webhook` |

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
