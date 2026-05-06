# Load Control F6a — Reporte de calibración sintética

> **Brief**: `chats/running/108-be-load-control-f6a-calibration-synthetic.md`
> **Plan**: 40 — Load Control Layers
> **ADRs aplicables**: 0001-0006 (`Educa.API/.claude/decisions/`)
> **Scripts**: `scripts/load-tests/f6a/` (educa-web)
>
> **Estado**: 🟡 plantilla — completar al ejecutar.
> **Fecha de ejecución**: ___________
> **Operador**: ___________
> **Backend SHA local (master)**: ___________
> **k6 versión**: ___________

---

## Convenciones de medición

- **3 corridas** por escenario, **mediana** como valor reportado.
- Mantener 30s entre escenarios para que cap global y bulkheads se relajen.
- Si la varianza entre las 3 corridas supera 30%, repetir.
- Capturar en cada corrida: count 2xx, 4xx, 429, 503, p95 latency, valor `Retry-After` observado.
- En paralelo, observar `GET /api/sistema/runtime-health` cada 5s para `permits_in_use` (si está expuesto en local; si no, leer logs del BE).

---

## Escenario 1 — Pico matutino

| Campo | Valor esperado | Valor observado | Δ |
|---|---|---|---|
| Cap global N=140 utilizado pico | < 130 (180 in-flight, ~80 logins reusan token + 100 webhooks bio) | | |
| 503 totales | 0 | | |
| 429 totales | 0 (login reusa token; bio dentro de rate "biometric"=30/min) | | |
| Retry-After observado en 503 | N/A (no debería haber) | | |

**Notas**: ___________

**Veredicto**: [ ] OK · [ ] off (descripción): ___________

---

## Escenario 2 — Saturación bulkhead Pagos (cap N=15)

| Campo | Valor esperado | Valor observado | Δ |
|---|---|---|---|
| 2xx (cierres OK) | 15 | | |
| 503 | 10 | | |
| 4xx negocio (mes ya cerrado, etc.) | aceptable, contar aparte | | |
| Retry-After p50 (s) | `max(1, ceil(p95 × 1.5))` — esperar 1-3s típicamente | | |
| Retry-After p95 (s) | similar | | |
| Retry-After siempre = 5 fallback | NO debe pasar — si pasa, bug en `RateLimitTelemetryMiddleware` | | |
| Body de 503 indica `policy=concurrency:pagos` | sí | | |

**Notas**: ___________

**Veredicto**: [ ] OK · [ ] off (descripción): ___________

---

## Escenario 3 — Aislamiento entre bulkheads

### reports (cap N=8)

| Campo | Valor esperado | Valor observado |
|---|---|---|
| 2xx (o 4xx negocio) | 8 | |
| 503 | ~22 | |
| Retry-After p50 (s) | dinámico | |

### pagos (cap N=15) — durante saturación de reports

| Campo | Valor esperado | Valor observado | **CRÍTICO si difiere** |
|---|---|---|---|
| 2xx (o 4xx negocio) | 10 | | |
| 503 | **0** | | **bug F2 si > 0** |
| Latencia p95 | sin cambio significativo vs baseline | | |

**Notas**: ___________

**Veredicto**: [ ] aislamiento OK · [ ] **AISLAMIENTO ROTO** (escalar como bug F2 en plan 40): ___________

---

## Escenario 4 — Saturación combinada

### Carga simultánea
- 60 home requests (default)
- 20 reportes (`:reports` N=8)
- 20 push notif (`:notif` N=15)
- 10 webhooks bio (`:bio` N=20, no satura)
- 6 dashboard director (default — debe responder OK)

### Resultados clave

| Métrica | Esperado | Observado |
|---|---|---|
| home failures rate | < 5% | |
| reports 503 count | ~12 (20 - cap 8 = 12 saturados) | |
| notif 503 count | ~5 (20 - cap 15 = 5 saturados) | |
| **dashboard director 503** | **0** | |
| `permits_in_use` global pico | < 130 | |

**Notas**: ___________

**Veredicto**: [ ] OK · [ ] dashboard afectado (capa 2 saturó): ___________

---

## Escenario 5 — Cancelación efectiva

| Campo | Valor esperado | Valor observado |
|---|---|---|
| 8 requests heavy canceladas a 2s | 8 | |
| Follow-up tras 4s entró al bulkhead (2xx o 4xx negocio) | sí | |
| **Follow-up recibió 503** | **NO** | |
| Si 503: indica que slots no liberaron, bug en `CancellationToken` propagation | | |

**Logs del BE durante el test**: pegar líneas relevantes de `OperationCanceledException` o equivalentes.

```
[pegar aquí]
```

**Veredicto**: [ ] liberación efectiva · [ ] **liberación rota** (bug F3 — escalar): ___________

---

## Escenario 6 — Resilience HTTP externo (Polly)

> ⚠️ Este escenario requiere setup de mock Blob Storage. Ver header de `06-resilience-blob-mock.js` para opciones A/B/C.

### Setup utilizado
- [ ] A — Wiremock local en :9090
- [ ] B — Httpbin proxy
- [ ] C — Hook de diagnóstico `Diagnostics:ForceBlobFailure=true` (requiere PR a Educa.API)
- [ ] **Diferido a F6b** (no mock disponible hoy)

### Fase 1 — Retries de Polly (12 requests secuenciales, mock 503)

| Campo | Valor esperado | Valor observado |
|---|---|---|
| Latencia mediana de cada request | 1-3s (3 retries con jitter) | |
| Logs del BE muestran "Retry attempt 1/2/3" | sí, 3 por request | |
| Final: status 5xx tras retries | sí | |

### Fase 2 — Breaker OPEN (rafaga paralela tras 10+ fallos)

| Campo | Valor esperado | Valor observado |
|---|---|---|
| Latencia p95 tras breaker abierto | < 300ms (sin retries) | |
| Status code | 503 inmediato | |
| `Retry-After` header presente | sí | |

**Logs relevantes**:

```
[pegar líneas con "Circuit broken" / "BreakerOpen" / "RetryAttempt"]
```

**Veredicto**: [ ] retries + breaker funcionan · [ ] retries no se ejecutan · [ ] breaker no abre · [ ] diferido a F6b

---

## Resumen ejecutivo

### Escenarios completados

| # | Escenario | Estado |
|---|---|---|
| 1 | Pico matutino | [ ] OK · [ ] off · [ ] no ejecutado |
| 2 | Saturación pagos | [ ] OK · [ ] off · [ ] no ejecutado |
| 3 | Aislamiento bulkheads | [ ] OK · [ ] off · [ ] no ejecutado |
| 4 | Saturación combinada | [ ] OK · [ ] off · [ ] no ejecutado |
| 5 | Cancelación efectiva | [ ] OK · [ ] off · [ ] no ejecutado |
| 6 | Resilience HTTP | [ ] OK · [ ] off · [ ] diferido |

### Ajustes propuestos

> Solo proponer ajuste si la métrica está off por > 50% (regla del brief).

| Escenario | Métrica off | Δ | Ajuste propuesto | Justificación |
|---|---|---|---|---|
| | | | | |

### Bugs detectados

> Cualquier comportamiento inesperado que no sea "valor un poco off" sino *contradice el ADR*.

| # | Descripción | ADR violado | Severidad | Acción |
|---|---|---|---|---|
| | | | | |

### Decisiones para F6b

- ¿Algún escenario depende de calibración con datos reales? Anotar acá:
  ```
  [escribir]
  ```

---

## Apéndice — Configuración runtime al momento del test

Pegar acá el output de `GET /api/sistema/runtime-health` (si existe) o los valores de `appsettings.Development.json` relevantes:

```yaml
ConcurrencyLimits:
  Global: 140
  Pagos: 15
  Reports: 8
  Notif: 15
  Uploads: 10
  Bio: 20

RateLimits:
  Login: 10/min/IP
  Refresh: 20/min/IP
  Biometric: 30/min/IP
  Reports: 5/min/user
  Heavy: 5/min/user
```

## Apéndice — Comandos exactos ejecutados

```pwsh
# Setup
cd c:\Users\Asus Ryzen 9\EducaWeb\Educa.API\Educa.API
dotnet run

# k6 desde otra ventana
cd c:\Users\Asus Ryzen 9\EducaWeb\educa-web
Get-Content .\scripts\load-tests\f6a\.env-f6a | ForEach-Object {
  $k,$v = $_.Split('=',2); [System.Environment]::SetEnvironmentVariable($k,$v,'Process')
}

# Escenarios (3 runs cada uno)
k6 run --insecure-skip-tls-verify --out json=results\01-run1.json scripts\load-tests\f6a\01-pico-matutino.js
k6 run --insecure-skip-tls-verify --out json=results\01-run2.json scripts\load-tests\f6a\01-pico-matutino.js
k6 run --insecure-skip-tls-verify --out json=results\01-run3.json scripts\load-tests\f6a\01-pico-matutino.js
# repetir para 02..06
```
