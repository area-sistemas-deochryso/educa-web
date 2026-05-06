# F6a — Calibración sintética con k6 (Plan 40 Load Control)

> **Brief**: `.claude/chats/running/108-be-load-control-f6a-calibration-synthetic.md`
> **Objetivo**: validar comportamiento de las capas 2-6 (concurrency global, bulkheads, timeouts, backpressure, resilience HTTP) con k6.

## Pre-requisitos

1. **k6 instalado**:

   ```pwsh
   # con scoop
   scoop install k6
   # o con winget
   winget install k6 --id k6.k6
   # verificación
   k6 --version
   ```

2. **Backend Educa.API corriendo localmente** con F1-F5 mergeados (`Educa.API` `master`, commits `8aa99ec` ... `4884214`):

   ```pwsh
   cd ..\Educa.API\Educa.API
   dotnet run
   # debería escuchar en https://localhost:7102
   ```

   - Verificá en consola que el rate limiter está usando los caps reales:
     - `concurrency:global` N=140
     - `concurrency:pagos` N=15, `:reports` N=8, `:notif` N=15, `:uploads` N=10, `:bio` N=20

3. **Credenciales locales** en archivo `.env-f6a` (no commitear; está gitignoreado).
   Copialo desde `.env-f6a.example` y completalo. **El `CROSSCHEX_WEBHOOK_SECRET` NO va
   en el archivo** — lo pide el wrapper `run.ps1` por terminal cada vez (ver más abajo).

4. **Certificado HTTPS dev confiado** (si usás `localhost:7102`):

   ```pwsh
   dotnet dev-certs https --trust
   # o para que k6 acepte cert self-signed sin tocar trust store:
   k6 run --insecure-skip-tls-verify scripts\load-tests\f6a\01-pico-matutino.js
   ```

## Cómo correr

### Recomendado — `run.ps1` (wrapper que pide el secret en terminal)

`run.ps1` carga `.env-f6a`, pide `CROSSCHEX_WEBHOOK_SECRET` con `Read-Host -AsSecureString`
sólo cuando el script lo necesita (01 y 04), y pasa todo a k6 vía `-e` flags. El secret
nunca queda en disco ni en historial de shell.

```pwsh
cd scripts\load-tests\f6a

# Escenarios 01 y 04 — pedirá el secret
.\run.ps1 01-pico-matutino.js
.\run.ps1 04-saturacion-combinada.js

# Escenarios 02, 03, 05, 06 — sin secret (no pregunta)
.\run.ps1 02-saturacion-pagos.js
.\run.ps1 03-aislamiento-bulkheads.js

# Pasar args extra a k6 (ej: guardar JSON)
.\run.ps1 02-saturacion-pagos.js -ExtraArgs '--out json=..\..\..\results\f6a-02-run1.json'
```

Ejecutar **3 corridas** de cada escenario y tomar **mediana** de los valores observados
(regla del brief, mitiga ruido de SQL).

### Sin wrapper (escenarios sin secret)

```pwsh
k6 run --insecure-skip-tls-verify scripts\load-tests\f6a\02-saturacion-pagos.js
```

Después de cada corrida, anotar en el reporte `.claude/diagnostic/load-control-f6a-report.md`:

- Cantidad de requests OK / 429 / 503
- Valor de `Retry-After` observado en 503 (extraído de logs verbose o `--out json`)
- Latencia p95
- Diferencia con expectativa del ADR

## Los 6 escenarios

| # | Script | Bulkhead | Carga | Esperado |
|---|---|---|---|---|
| 1 | `01-pico-matutino.js` | global + bio | 80 logins concurrentes + 100 webhooks bio en 60s | 0× 503, 0× 429. Capa 2 cubre 180 con holgura. |
| 2 | `02-saturacion-pagos.js` | pagos N=15 | 25 cierres en burst de 100ms (constant-arrival-rate) | 15 OK, 10× 503 con `Retry-After` calibrado. |
| 3 | `03-aislamiento-bulkheads.js` | reports + pagos | 60 reportes + 10 cierres en burst | reports: 8 OK + ~52 saturados. pagos: 10/10 OK (no afectado). Pasá `ESTUDIANTE_ID_PDF` con ID válido. |
| 4 | `04-saturacion-combinada.js` | global + 3 bulkheads | pico matutino + reportes + push notif simultáneos | bulkheads saturados independientemente, login y dashboard responden. |
| 5 | `05-cancelacion-efectiva.js` | reports | query pesada con client-abort a 2s | pool stats reflejan liberación inmediata, no espera 60s del CommandTimeout. |
| 6 | `06-resilience-blob-mock.js` | uploads + Polly | upload con mock Blob 503 | 3 retries con jitter, breaker abre tras 10 fallos, requests subsiguientes 503 inmediato. |

## Notas operativas

- **Escenario 6** requiere mock del Blob Storage retornando 503. Ver `06-resilience-blob-mock.js` — incluye instrucciones para configurar `Educa.API` con `BlobStorage:UseMockEndpoint=true` apuntando a un wiremock local. Si no hay wiremock disponible, escenario 6 puede diferirse a F6b.
- **Métricas runtime-health**: en otra ventana, mientras corre k6, observar `GET https://localhost:7102/api/sistema/runtime-health` cada 5s para capturar `permits_in_use`. (Si el endpoint no está expuesto en local, se mira en logs del BE.)
- **Reset entre escenarios**: dejar 30s entre escenarios para que el cap global y los bulkheads se relajen completamente.
- **No correr bajo VPN o proxy**: el rate limiter particiona por IP, y un proxy intermedio puede cambiar el comportamiento.

## Archivos generados

- `01-pico-matutino.js` ... `06-resilience-blob-mock.js` — scripts standalone.
- `_lib/auth.js` — helper de login compartido.
- `_lib/payloads.js` — fixtures (CrossChex payload, etc.).
- `.env-f6a` — credenciales locales (gitignored).

## Contexto del brief

- **NO** ajustar finos: solo si la métrica está off por > 50%.
- Si aislamiento entre bulkheads falla (pagos afectados al saturar reports) → bug de F2, abrir issue separado.
- Si `Retry-After` siempre = 5 (fallback) → verificar que p95 expone correctamente, ajustar fórmula.
- Calibración fina con datos reales = F6b.
