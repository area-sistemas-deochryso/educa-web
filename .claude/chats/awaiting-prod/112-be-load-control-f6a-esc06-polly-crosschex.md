# BE — Load Control F6a Esc 06: Re-purpose para verificar Polly sobre CrossChex

> **Repo destino**: `educa-web` (script k6) + `Educa.API` (stub trigger + flag de fallo CrossChex)
> **Estado**: ✅ cerrado local 2026-05-06 — 3 runs OK, sección 6 del reporte F6a completa.
> **Validación prod**: ⏳ pendiente desde 2026-05-06 — alineado con F1-F5 (`awaiting-prod/103-107`) que ya despliegan la pipeline Polly real.
> **Creado**: 2026-05-06 · **Modo sugerido**: `/execute`.
> **Continúa**: chat 111 cerró F6a esc 03/04/05 ✅; esc 06 quedó re-purposed por hallazgo de scope.
> **Bloquea a**: cierre completo de Plan 40 F6a → habilita F6b (chat 109, hoy en HOLD).

## Contexto heredado del chat 111

Chat 111 dejó cerrados esc 03, 04, 05 con thresholds STRICT pasando. Esc 06 se descartó porque el script original asumía **Polly retries + breaker sobre Blob Storage**, pero el ADR-0002 / `Educa.API/Educa.API/Extensions/ServiceExtensions.cs:202-209` explícitamente excluye `BlobStorageService` de la pipeline Polly:

> "BlobStorageService → usa Azure SDK (BlobServiceClient), retries propios en BlobClientOptions. AddStandardResilienceHandler no intercepta SDK calls."

Polly solo wraps los named HttpClients de **CrossChex y WhatsApp** (`ServiceExtensions.cs:210-228`):
- `CrossChex`: `attemptTimeout=30s, totalTimeout=60s, maxRetries=2`
- `WhatsApp`: `attemptTimeout=10s, totalTimeout=30s, maxRetries=2`
- Breaker compartido (vía `HttpResilienceExtensions.cs`): `FailureRatio=0.5, MinimumThroughput=10`

El hook A original (`Diagnostics:ForceBlobFailure`) en `BlobStorageService` quedó implementado pero NO se usa. Se reverteó al cerrar el chat 111. Si hay residuo en working tree, revert.

## OBJETIVO

Re-purpose esc 06 para verificar **Polly retries + breaker sobre `CrossChexApiService`** (que sí tiene resilience pipeline). Cerrar el último escenario sintético de F6a.

## ALCANCE

### IN

#### 1. Endpoint stub diagnóstico — `crosschex-trigger`

Agregar al `F6aStubController.cs` (que el chat 111 ya creó):

```csharp
[HttpGet("crosschex-trigger")]
public async Task<IActionResult> CrossChexTrigger(
    CancellationToken ct,
    [FromServices] IWebHostEnvironment env,
    [FromServices] IConfiguration config,
    [FromServices] CrossChexApiService crosschex)  // verificar nombre real del servicio inyectable
{
    if (!env.IsDevelopment() || !config.GetValue<bool>("Diagnostics:EnableF6aStubs"))
        return NotFound();

    try
    {
        // Llamar un método que dispare la pipeline HTTP de CrossChex.
        // Verificar firma real: probablemente algo tipo PingAsync/HealthCheckAsync/GetEmployeesAsync.
        // Si no hay método "ping", usar el que se haga login/poll (con auth dummy si es posible).
        var result = await crosschex.GetEmployeesAsync(ct);  // placeholder — ajustar a método real
        return Ok(new { ok = true });
    }
    catch (Exception ex)
    {
        return StatusCode(503, new { error = ex.Message, type = ex.GetType().Name });
    }
}
```

#### 2. Mock de fallo CrossChex

Hay 2 opciones (elegir según costo):

**A. Flag `Diagnostics:ForceCrossChexFailure=true`** que apunta el `CrossChex:BaseUrl` en runtime a una URL inexistente (`http://localhost:9999`) o que retorna 503. Requiere injectar IConfiguration en `CrossChexApiService` y reescribir `BaseAddress` solo si el flag está on.

   - Más limpio, sin red externa.
   - ~20 líneas + comentario.

**B. Wiremock local en `:9090`** retornando 503 fijo, y override `CrossChex:BaseUrl` en `appsettings.Development.json`.

   - Más realista (red real, latencia).
   - Setup adicional con docker.

**Recomendación**: Opción A — más simple, hermético, sin docker.

#### 3. Modificar script `06-resilience-blob-mock.js`

Renombrarlo a `06-resilience-crosschex.js` (más descriptivo) y cambiar:

- `BLOB_ENDPOINT = '/api/BlobStorage/download/test.pdf'` → `'/api/diagnostics/f6a/crosschex-trigger'`
- Comentarios actualizados explicando que verifica Polly sobre CrossChex (no Blob).
- Threshold: `'response_time_ms{phase:breaker_open}': ['p(95)<300']` se mantiene — la lógica es la misma (post-breaker, requests son inmediatas).

Workflow de fases del script (warmup_retries 30s + breaker_open_check 20s) sigue válido. Polly con `MinimumThroughput=10` necesita al menos 10 fallos en `SamplingDuration` para abrir; el script tira 12 sequenciales en fase 1 → suficiente.

#### 4. Flag en `appsettings.Development.json`

```json
"Diagnostics": {
  "EnabledTags": [...],
  "EnableF6aStubs": false,
  "SendCorreo": true,
  "MarkCrosschex": true,
  "ForceCrossChexFailure": false   // ← nueva, default false
}
```

#### 5. Reporte F6a — completar sección 6

Llenar `.claude/diagnostic/load-control-f6a-report.md` sección 6 (esc 06) con:
- 3 runs, mediana
- Logs del BE confirmando: `[Resilience] CrossChex retry 1/2`, `[Resilience] CrossChex circuit-breaker OPEN`
- `response_time_ms` post-breaker `<300ms`
- `Retry-After` observado en 503 fase 2 (debería ser `null` o el del SDK, no del BE rate limiter)

### OUT

- Cualquier cambio sobre `BlobStorageService` (defer al F6b real con Blob apagable).
- Verificación de WhatsApp (puede ser un follow-up si hace falta, pero no bloquea F6a).
- Ajustes a esc 01-05 (ya cerrados).
- Calibración fina por margen (regla del Plan 40).

## Pre-work obligatorio

1. Stub controller del chat 111 ya existe en `Educa.API/Controllers/Diagnostics/F6aStubController.cs` (working tree, sin commit) — agregar el método nuevo encima.
2. Verificar el nombre real del método inyectable de `CrossChexApiService` que dispare HTTP (probablemente `GetEmployeesAsync`, `PollAsync`, etc.). Inspeccionar `Educa.API/Educa.API/Services/Integraciones/CrossChexApiService.cs`.
3. Confirmar que `HttpResilienceExtensions.cs` loggea las transitions del breaker — si no, agregar logger para que el reporte pueda capturar las observaciones esperadas.
4. BD test (sin cambios respecto al chat 111).

## CRITERIOS DE COMPLETADO

- ✅ `F6aStubController` con método `CrossChexTrigger` agregado, gateado por env+flag.
- ✅ Flag `Diagnostics:ForceCrossChexFailure` en `appsettings.Development.json`.
- ✅ `CrossChexApiService` respeta el flag (apunta a URL inválida o tira 503 sintético).
- ✅ Script `06-resilience-crosschex.js` apunta al stub.
- ✅ 3 runs ejecutados, mediana en sección 6 del reporte F6a.
- ✅ Log del BE muestra Polly retries (2x con jitter) + breaker OPEN tras 10+ fallos.
- ✅ Threshold `p95<300ms` post-breaker pasa.
- ✅ Revert de cambios diagnósticos antes del commit final (igual que chat 111).
- ✅ Brief movido a `awaiting-prod/` cuando F1-F5 deployen (alineado con el resto de F6a).

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| `CrossChexApiService` no tiene método "ping" trivial | Buscar el método real con menos efectos (idealmente solo HTTP GET); si todos requieren auth real, mockear el server |
| Flag `ForceCrossChexFailure` requiere reinicio BE para tomar efecto | Documentar en el workflow del chat |
| Polly logs no son visibles en el output del BE local | Agregar `LogInformation` explícito en `OnRetry`, `OnOpened` (si no están ya) |
| El breaker no abre si las requests son menos que `MinimumThroughput=10` | Phase 1 del script tira 12 → suficiente. Si SamplingDuration corre rápido y los conteos no se acumulan, ajustar el rate del script |

## REFERENCIAS

- Chat 111 brief: `chats/waiting/111-...md` (cuando se mueva a `awaiting-prod/`).
- Reporte F6a: `.claude/diagnostic/load-control-f6a-report.md` (secciones 1-5 completas).
- ServiceExtensions.cs:202-209 — exclusión explícita de Blob de Polly.
- ServiceExtensions.cs:210-228 — pipeline Polly de CrossChex y WhatsApp.
- HttpResilienceExtensions.cs — config de breaker (FailureRatio, MinimumThroughput).
- ADR-0002 — resilience híbrida.

## Notas operativas

- El stub controller del chat 111 sigue activo cuando `Diagnostics:EnableF6aStubs=true`. NO commitear.
- Mantener `SendCorreo=false` y `MarkCrosschex=false` para evitar ruido si el flujo de CrossChex llega a tocar email/asistencia.
- Si el método real del `CrossChexApiService` que se dispare devuelve datos sensibles, el stub no debería retornarlos — solo `{ ok: true }` o el conteo.
