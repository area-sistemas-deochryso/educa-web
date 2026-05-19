# Cowork — F6a Calibración sintética k6

> **Brief origen**: `.claude/chats/running/108-be-load-control-f6a-calibration-synthetic.md`
> **Reporte destino**: `.claude/diagnostic/load-control-f6a-report.md`
> **Scripts k6**: `scripts/load-tests/f6a/01..06-*.js`

## Pegar al iniciar el chat de Cowork

```
educa-web — F6a calibración k6. Leé .claude/claude-cowork/f6a-k6-calibration.md
y operá según ese brief.
```

---

## División de trabajo

| Quién | Hace |
|---|---|
| **Usuario (terminal)** | Ejecuta los scripts k6 en PowerShell |
| **Cowork (browser)** | Monitorea runtime-health + captura métricas + llena reporte |

Cowork **no ejecuta k6** (es browser-only). Solo observa el BE bajo carga.

---

## Pre-flight checklist (Cowork verifica antes de empezar)

1. **BE local up**: `GET https://localhost:7102/api/sistema/runtime-health` responde 200. Si no, pedir al usuario `dotnet run` en `Educa.API/Educa.API`.
2. **FE local up**: `http://localhost:4201/intranet` muestra login. Si no, pedir `npm run start`.
3. **Login con Director**: DNI `74125896` / pwd `12349898` (sesión guardada — un click en "ADMINISTRADOR EL DIRECTOR").
4. **DevTools abierto**: Network (filtro Fetch/XHR) + Console visibles.
5. **`.env-f6a` creado**: usuario confirma que existe `scripts/load-tests/f6a/.env-f6a` con credenciales.
6. **Config rate limits — IMPORTANTE**: F6a mide bulkheads (capa 2-3), NO rate (capa 1). Verificar que `Educa.API/Educa.API/appsettings.Development.json` tiene **`"UseTestEnv": false`** (o ausente). Si está `true`, los bulkheads se anulan (suben a 5000) y las mediciones son inútiles.

   **NO subir `UseTestEnv=true`**. Los rate limits per-user (200 reads/min, 30 writes/min por userId) son los defaults y deben quedar así. Si aparecen 429 durante la corrida, distinguir por header `policy`:
   - `policy=global:r` o `global:w` → rate per-user (ruido, anotar separado).
   - `policy=concurrency:reports` etc en **503** → bulkhead saturado (lo que queremos medir).

## Credenciales mínimas — 3 usuarios

Los scripts comparten 1 token por escenario (decisión documentada). No hace falta crear 80 estudiantes — alcanza con:

| Variable env | Rol | Usado en escenarios |
|---|---|---|
| `DIRECTOR_DNI` / `DIRECTOR_PWD` | Director | 2, 3, 4, 5 |
| `PROFESOR_DNI` / `PROFESOR_PWD` | Profesor | 1, 4 |
| `ESTUDIANTE_DNI` / `ESTUDIANTE_PWD` | Estudiante | reservado (no usado por scripts actuales) |

**1 IP alcanza** (la máquina del usuario). Login per-IP cap=60/min, los scripts hacen 1 solo login en `setup()`, así que no se satura.

---

## Loop por escenario (×6, cada uno 3 corridas)

### Paso A — Cowork: arrancar monitor de runtime-health

Abrir nueva pestaña con `https://localhost:7102/api/sistema/runtime-health` y refrescar cada 5s durante la corrida. Capturar el peak de `permits_in_use` para cada bulkhead. Si el endpoint 404ea, fallback: leer logs del BE en consola del usuario vía screenshot.

### Paso B — Pedir al usuario que corra el script

Copy-paste exacto al usuario:

```pwsh
cd C:\Users\Asus Ryzen 9\EducaWeb\educa-web
Get-Content .\scripts\load-tests\f6a\.env-f6a | ForEach-Object {
  $k,$v = $_.Split('=',2); [System.Environment]::SetEnvironmentVariable($k,$v,'Process')
}
k6 run --insecure-skip-tls-verify --out json=results\f6a-NN-runM.json scripts\load-tests\f6a\NN-<nombre>.js
```

Reemplazar `NN` (01..06) y `M` (1..3). Avisar al usuario que pegue el summary final del run.

### Paso C — Capturar métricas de la corrida

Del summary k6 + monitor runtime-health, anotar **separando 429 rate vs 503 bulkhead**:

| Campo | Fuente |
|---|---|
| Requests OK | k6 summary `http_reqs` con status 200/204 |
| **429 rate per-user** (ruido) | requests con header `policy=global:r` o `global:w` |
| **503 bulkhead** (lo que se mide) | requests con header `policy=concurrency:<nombre>` |
| `Retry-After` típico en 503 | `--out json` o logs BE filter `policy=concurrency:` |
| Latencia p95 | k6 summary `http_req_duration p(95)` |
| `permits_in_use` peak | runtime-health durante la corrida |

Si aparece volumen significativo de 429 rate, anotar como **deuda** del escenario, no como falla del bulkhead.

### Paso D — Esperar 65s entre escenarios

Ventana fixed-window de rate per-user es 60s. Esperar 65s garantiza que el escenario siguiente no arrastra crédito gastado del anterior. Entre **runs del mismo escenario** también esperar 65s para no sumar writes contra el cap 30/min per-user.

---

## Tabla de resultados — Cowork llena en tiempo real

Mantener este draft en memoria y sincronizarlo al reporte cuando termine cada escenario:

```markdown
### Escenario N — <nombre>

| Run | OK | 429 | 503 | Retry-After p50 | p95 lat | permits peak |
|---|---:|---:|---:|---:|---:|---:|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

**Mediana**: OK=__ · 503=__ · p95=__ · Retry-After=__
**Esperado (ADR)**: <copiar del README scripts/load-tests/f6a/README.md tabla "Los 6 escenarios">
**Verdict**: ✅ matches | ⚠️ off <50% (aceptable, anotar) | ❌ off >50% (sugerir ajuste)
```

---

## Reglas de decisión durante la sesión

| Síntoma | Acción Cowork |
|---|---|
| Escenario 2 (pagos): 503 cuenta ≠ 10 ± 1 | Anotar el delta, NO ajustar todavía. Recolectar las 3 corridas. |
| Escenario 3 (aislamiento): pagos con 503 mientras reports satura | 🚨 BUG F2. Pausar, marcar el reporte como "🔴 aislamiento falla", abrir issue. |
| `Retry-After` siempre = 5 (fallback) | Verificar que `RuntimeHealth.p95` expone el valor; si no, anotar como deuda F6b. |
| BE crashea / responde 500 sostenido | Pausar inmediatamente, capturar logs, escalar al usuario. |
| Escenario 6 (Blob mock) sin wiremock disponible | Skip + anotar "diferido a F6b" en el reporte (decisión ya tomada en el brief). |

---

## Cierre — Cowork reporta al final

1. Llenar `.claude/diagnostic/load-control-f6a-report.md` con todos los escenarios + medianas + verdicts.
2. **Resumen ejecutivo** en una tabla:

   | Escenario | Verdict | Comentario |
   |---|---|---|
   | 1 Pico matutino | ✅/⚠️/❌ | |
   | 2 Saturación pagos | | |
   | 3 Aislamiento | | |
   | 4 Saturación combinada | | |
   | 5 Cancelación | | |
   | 6 Resilience HTTP | ✅ ejecutado / ⏭️ diferido | |

3. **Recomendaciones** (solo si algo está off >50%):
   - "Ajustar `concurrency:X` de N a M porque…"
   - "Verificar fórmula `Retry-After` porque…"

4. **Postear al usuario**: "F6a ejecutado. Reporte en `.claude/diagnostic/load-control-f6a-report.md`. Volvé al chat 108 y corré `/end` para decidir commit + transición a `awaiting-prod/`."

---

## Lo que Cowork NO hace

- No edita scripts k6 (son del brief, ya shipped).
- No commitea (es trabajo del chat 108 vía `/end`).
- No ajusta caps en `appsettings.json` autónomamente — solo recomienda.
- No corre el escenario 6 si no hay wiremock — diferir a F6b según decisión documentada.
