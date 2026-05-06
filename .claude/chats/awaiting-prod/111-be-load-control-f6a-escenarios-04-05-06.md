# BE — Load Control F6a: Escenarios 04, 05 y 06 (cierre)

> **Repo destino**: `educa-web` (scripts k6) + `Educa.API` (eventual hook diagnóstico para esc 06)
> **Estado**: 🟢 listo para arrancar — pre-work del chat 108 completado.
> **Creado**: 2026-05-06 · **Modo sugerido**: `/execute`.
> **Continúa**: chat 108 (`chats/awaiting-prod/108-...md` cuando deploye F1-F5; mientras tanto running/).
> **Bloquea a**: cierre de Plan 40 F6a → habilita F6b (chat 109, hoy en HOLD).

## Contexto heredado del chat 108

Chat 108 dejó:

- **F6a-01 ✅ OK retroactivo** (run 1 2026-05-06): `errors_503 = 0`, capa 2 no satura. Los 5833× 429 son rate limit absorbiendo y eso es comportamiento correcto. Threshold de `errors_429` removido del script.
- **F6a-02 ✅ OK funcional** (runs 1-2 2026-05-06): cap=15 confirmado en run 1 (15 OK + 7 saturados + 3 negocio); run 2 dispersó timing y dio 19 OK + 0 saturados. **Insight de la sesión**: `constant-arrival-rate` reusa slots cuando los completes son rápidos vs el spread de entrada → `responses_2xx > 15` NO significa cap roto. Threshold final: `responses_2xx >= 10` (sanity check).
- **F6a-03 ⚠️ inconclusivo** (runs 1-2): con `ESTUDIANTE_ID_PDF=1` el endpoint resuelve fast (1ms median) y nunca satura cap=8 ni a 100 r/s. **Blocker conocido**: necesita endpoint pesado. Decisión pendiente del operador entre opciones A (ID real con notas), B (cambiar endpoint a `ConsultaAsistencia/reporte-asistencias-pdf`) o C (diferir a F6b).

Los 3 scripts (01-03) y el wrapper `run.ps1` (que pide `CROSSCHEX_WEBHOOK_SECRET` por terminal con `Read-Host -AsSecureString`) están listos en `scripts/load-tests/f6a/`. El reporte `.claude/diagnostic/load-control-f6a-report.md` tiene secciones 1-3 completadas.

**Hallazgo a investigar (opcional, no bloquea F6a)**: en F6a-02 run 1, el `Retry-After` observado fue 1s cuando `p95 × 1.5 = 1.94s` que debería redondear a 2. Posibles causas listadas en el reporte (lectura de p95 de ventana incorrecta, edge case de runtime frío). Si se reproduce en otros escenarios, abrir issue en F4 (chat 106 backpressure).

## OBJETIVO

Cerrar F6a ejecutando los escenarios restantes:

- **04 — saturación combinada**: pico + reportes + push notif simultáneos. Validar que login y dashboard del director siguen respondiendo (capa 2 tiene slots libres aunque los bulkheads se saturen).
- **05 — cancelación efectiva**: query pesada con `CommandTimeout=60` cancelada vía cliente cierra conexión a los 2s. Validar que pool stats reflejan liberación inmediata, no espera 60s.
- **06 — resilience HTTP externo**: simular Blob Storage caído (mock 503). Validar que Polly retries 3x con jitter, breaker abre tras `MinimumThroughput=10`, requests subsiguientes responden inmediato.

## ALCANCE

### IN

#### Escenario 04 — Saturación combinada

- Pre-work: revisar el script existente `scripts/load-tests/f6a/04-saturacion-combinada.js`. Cargas:
  - 60 home requests (default bulkhead) en ramp 0→60 en 30s.
  - 20 reportes pesados (`:reports` cap=8).
  - 20 push notif (`:notif` cap=15).
  - 10 webhooks bio (`:bio` cap=20).
  - 6 dashboard del director (default bulkhead) — métrica STRICT.
- Threshold STRICT: `dashboard_director_503 === 0`. El dashboard del director NO debe recibir 503 mientras los bulkheads se saturan, porque cae en el bulkhead Default que tiene 72+ slots libres (140 global - sumas de bulkheads saturados).
- Pre-condición: el `notif` push usa `POST /api/Notificaciones`. Verificar que el payload (`Tipo: 'evento'`, `Prioridad: 'low'`, `DniDestinatarios: []`) sigue siendo válido para el BE actual. Si no acepta lista vacía, ajustar.
- Aplicar el mismo aprendizaje de F6a-02: el bulkhead `:reports` puede no saturar exactamente a 8 + 12 saturados — depende del timing. Métrica clave es **dashboard_director_503**.

#### Escenario 05 — Cancelación efectiva

- Pre-work: leer el script `scripts/load-tests/f6a/05-cancelacion-efectiva.js` (no revisado en chat 108). Validar que:
  - Usa un endpoint con `CommandTimeout=60` real (los `Heavy*` repos del backend, ej `ReporteAsistenciaRepository`).
  - Configura `timeout` k6 a 2s para forzar abort del cliente.
  - Mide stats post-cancel — pool de SQL debería liberar inmediato (no esperar 60s).
- Métricas a observar:
  - K6 reports `http_req_duration ≈ 2s` para los abortados.
  - En paralelo, `GET /api/sistema/runtime-health` cada 1s — `Database.Pool.PoolFreeConnections` debería volver a su nivel de baseline en <5s.
- Threshold STRICT: que `http_req_duration` máx esté cerca del timeout del cliente (2-3s), NO 60s. Si llegan a 60s, hay bug en `CancellationToken` propagation.
- Si el script existente no propaga `CancellationToken` correctamente al backend (por ejemplo el endpoint actual no acepta CT), abrir issue para F3 (chat 105) y diferir.

#### Escenario 06 — Resilience HTTP externo

- Tres opciones documentadas en el chat 108 (preparación inicial):
  - **Opción A** (recomendada): hook de diagnóstico en `Educa.API` — flag `Diagnostics:ForceBlobFailure=true` en `appsettings.Development.json` que hace que `IBlobStorageService.UploadAsync` retorne 503. ~30 líneas. Permite test hermético sin wiremock.
  - **Opción B**: wiremock local en `:9090` con `appsettings.Development.json:AzureBlobStorage:Endpoint` apuntando ahí. Más realista pero requiere setup adicional.
  - **Opción C**: diferir a F6b cuando el deploy a Azure permita simular falla con un Blob real apagado.
- Si el operador elige A: implementar el hook en `Educa.API` (~30 líneas de cambio en `BlobStorageService` + `appsettings.Development.json`), commit con scope `chore(blob)`, después correr el escenario.
- Métricas a observar:
  - Logs del BE: `[Resilience] BlobStorageClient retry 1/3` × 3 visibles con jitter entre retries.
  - Logs: `[Resilience] BlobStorageClient circuit-breaker OPEN` tras `MinimumThroughput=10` fallos en `SamplingDuration` (≥30s).
  - Requests subsiguientes (post-breaker-open): respuesta inmediata <50ms con 503 (no espera retries).
- Threshold STRICT: tiempo de respuesta post-breaker-open < 100ms (vs requests pre-breaker que duran 2-6s por los retries).

### Métricas a documentar

Mismas conventions del chat 108: 3 corridas de cada escenario, mediana, capturar 2xx/4xx/429/503/p95/Retry-After. Llenar las secciones 4-6 del reporte `.claude/diagnostic/load-control-f6a-report.md`.

### OUT

- Re-ejecutar 01-03 (ya cubiertos en chat 108 salvo blocker de 03 que es decisión del operador, no de este chat).
- Cambios en código BE para los escenarios 04 y 05 — solo escenario 06 acepta el hook de diagnóstico (opción A).
- F6b — calibración con datos reales (chat 109, en HOLD).
- Calibración fina por margen sintético (regla del Plan 40).

## Pre-work obligatorio

1. k6 instalado (verificado en chat 108).
2. `Educa.API` corriendo local con master + commits `cee1ef2` (fixes BE chat 108) — no requiere deploy.
3. `.env-f6a` con credenciales (verificado en chat 108).
4. **Decisión sobre escenario 06**: A / B / C antes de empezar. Si A → implementar hook primero.
5. **Decisión sobre 03 pendiente del chat 108** (no bloquea este chat pero conviene resolverlo): ¿pasamos `ESTUDIANTE_ID_PDF` real, cambiamos endpoint, o diferimos a F6b? Esto puede resolverse en este mismo chat para cerrar 03 también.

## CRITERIOS DE COMPLETADO

- ✅ Escenario 04 ejecutado, secciones 4 del reporte llenas, `dashboard_director_503 = 0` verificado.
- ✅ Escenario 05 ejecutado, sección 5 del reporte llena, cancelación efectiva confirmada (`<5s` para liberar pool).
- ✅ Escenario 06 ejecutado (con hook A o wiremock B) o diferido (opción C documentada en reporte).
- ✅ Si hay ajustes evidentes (>50% off), commit con justificación. Si no, commit del reporte.
- ✅ Brief movido a `awaiting-prod/` cuando F1-F5 deployen.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Endpoint en escenario 04 (notif) cambió shape de payload | Revisar BE actual antes; ajustar payload si rompe en runtime. |
| `CommandTimeout=60` no se aplica en el endpoint del esc 05 | Diferir a un brief de F3 que valide la propagación. |
| Hook de diagnóstico para esc 06 (opción A) requiere PR a Educa.API | Hacer commit aparte con scope `chore(blob)`, reverteable. |
| Como en chat 108, los thresholds pueden estar mal calibrados al primer pase | Aplicar el mismo approach: si la métrica STRICT pasa, OK; si los thresholds informativos no, ajustar con justificación. |

## REFERENCIAS

- Chat 108 brief: `chats/running/108-be-load-control-f6a-calibration-synthetic.md` (lo que se hizo y los hallazgos).
- Reporte: `.claude/diagnostic/load-control-f6a-report.md` (secciones 1-3 completas).
- Scripts: `scripts/load-tests/f6a/04-saturacion-combinada.js`, `05-cancelacion-efectiva.js`, `06-resilience-blob-mock.js`.
- Wrapper: `scripts/load-tests/f6a/run.ps1` (esc 04 pedirá `CROSSCHEX_WEBHOOK_SECRET`).
- ADRs aplicables: `Educa.API/.claude/decisions/0001-0006`.
- Plan 40 fila 49 del maestro.

## Notas operativas heredadas

- 30s entre escenarios para que cap global y bulkheads se relajen.
- No correr bajo VPN/proxy (rate limit particiona por IP).
- Capturar logs del BE en paralelo cuando corra 06 — la observabilidad de Polly retries y breaker open vive ahí, no en métricas k6.
