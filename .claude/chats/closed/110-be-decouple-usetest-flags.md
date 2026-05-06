# BE — Decoupling de `UseTestEnv` (DB vs RateLimits)

> **Repo destino**: `Educa.API` (master)
> **Estado**: 🟢 listo para arrancar
> **Creado**: 2026-05-06 · **Modo sugerido**: `/execute` (cambio mecánico chico)
> **Bloquea a**: chat 108 (F6a calibración k6) — sin este decoupling, F6a no puede medir nada porque `UseTestEnv=true` anula caps de bulkhead.

## Contexto

Hoy el flag `UseTestEnv` en `appsettings.Development.json` controla **tres cosas a la vez**:

1. Qué connection string usa la BD (prueba vs producción) — `DatabaseExtensions.cs`.
2. Configuración de jobs Hangfire — `HangfireExtensions.cs`.
3. **Desactiva todos los caps de rate y bulkhead** — `RateLimitingExtensions.cs`.

El #3 está mal acoplado al #1: cuando el usuario quiere usar BD de prueba (deseable, no romper datos reales), pierde la capacidad de medir capa 1-3 del load control. Esto bloquea F6a (chat 108) porque las mediciones quedan inservibles con caps a 5000.

## Objetivo

Separar el flag en dos:

- `UseTestEnv` (existente): sigue controlando DB + Hangfire. Sin cambios de comportamiento.
- `UseTestEnv:BypassLimits` (nuevo): controla solo `RateLimitingExtensions.cs`. Default = valor de `UseTestEnv` (backwards-compatible).

Resultado: el usuario puede tener `UseTestEnv=true` + `UseTestEnv:BypassLimits=false` y obtener BD de prueba con caps reales.

## ALCANCE

### IN

1. **`Educa.API/Educa.API/Extensions/RateLimitingExtensions.cs`**:
   - Reemplazar la sola línea `var isTestEnv = configuration.GetValue<bool>("UseTestEnv");` por:

     ```csharp
     var bypassLimits = configuration.GetValue<bool?>("UseTestEnv:BypassLimits")
                     ?? configuration.GetValue<bool>("UseTestEnv");
     ```

   - Renombrar la variable local `isTestEnv` → `bypassLimits` en TODOS los usos del archivo (~15 ocurrencias). Buscar con `grep -n "isTestEnv" Extensions/RateLimitingExtensions.cs`.
   - **No tocar** lógica de `DatabaseExtensions.cs` ni `HangfireExtensions.cs` — siguen leyendo `UseTestEnv` directo.

2. **`Educa.API/Educa.API/Constants/Sistema/ConfigKeys.cs`**:
   - Agregar constante `public const string UseTestEnvBypassLimits = "UseTestEnv:BypassLimits";`.
   - Usar la constante en el `RateLimitingExtensions.cs` en vez del literal.

3. **`Educa.API/Educa.API/appsettings.Development.json`**:
   - Agregar `"UseTestEnv:BypassLimits": false` para documentar el nuevo flag (default explícito).
   - Mantener `"UseTestEnv": true` como esté.

4. **`Educa.API/Educa.API/appsettings.json`** (prod):
   - Agregar `"UseTestEnv:BypassLimits": false` para que prod sea explícita igual.

5. **Documentación**: actualizar `Educa.API/.claude/rules/` o `decisions/` si hay un ADR de rate limiting (mencionar el decoupling en una línea).

### Tests

- **Smoke manual**: levantar BE local con `UseTestEnv=true` + `UseTestEnv:BypassLimits=false`, hacer 31 POSTs en <60s con un solo Director, verificar que el #31 retorna 429 (cap writes 30/min se respeta).
- **Smoke manual contrario**: con `UseTestEnv:BypassLimits=true`, el mismo escenario debe devolver 200 en los 31 (caps a 50k).
- Tests existentes de rate limiting (si los hay en `Educa.API.Tests/`) deben pasar sin cambios — backwards-compat por el `?? UseTestEnv`.

### OUT

- No tocar `DatabaseExtensions.cs` ni `HangfireExtensions.cs`.
- No agregar más sub-flags (`UseTestEnv:UseSchedules`, etc.). Solo el de rate limits es el que duele hoy.
- No deprecar `UseTestEnv`. Sigue como master switch para DB.
- No cambiar defaults de `ConcurrencyLimits:*` ni los rate limits per-user.

## Criterios de completado

- ✅ `UseTestEnv:BypassLimits=false` con `UseTestEnv=true` produce caps reales (140 global, 15 pagos, 8 reports, 200 read/min, 30 write/min).
- ✅ `UseTestEnv:BypassLimits=true` produce caps anulados (5000 / 50k).
- ✅ Sin la nueva clave en config (solo `UseTestEnv=true`), el comportamiento es idéntico al actual (backwards-compat por el `??`).
- ✅ Build verde, tests verdes.
- ✅ Commit listo para deploy local (no requiere redeploy a Azure — afecta solo `appsettings.Development.json`).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper tests de rate limiting existentes | El operador `??` mantiene comportamiento previo cuando solo está `UseTestEnv` |
| El usuario olvida el nuevo flag y vuelve al estado anterior | Documentar en el README del proyecto o en `appsettings.Development.json` con comentario |
| Hangfire o DB se acoplen al nuevo flag por error | Out-of-scope explícito; no tocar esos archivos |

## Referencias

- Bloquea: `chats/running/108-be-load-control-f6a-calibration-synthetic.md` o `chats/waiting/108-*` (según se mueva).
- `Educa.API/Educa.API/Extensions/RateLimitingExtensions.cs:49` — origen del acoplamiento.
- `Educa.API/Educa.API/Extensions/DatabaseExtensions.cs:13` — uso legítimo de `UseTestEnv` que NO se toca.
- ADR-0004 / ADR-0005 — caps de bulkhead que se deben respetar con BypassLimits=false.
