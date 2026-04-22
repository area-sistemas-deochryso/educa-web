> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 26 · **Chat**: 3 (F2 sub-chat 1 de 2) · **Fase**: F2 · **Estado**: ⏳ pendiente arrancar.

---

# Plan 26 F2 Chat 1 — BE: multiplier por rol + `[RateLimitOverride]` + nueva policy `reports`/`batch`

## PLAN FILE

- **Maestro** (plan 26 inline): `../../educa-web/.claude/plan/maestro.md` → sección "🔵 Plan 26 — Rate limiting flexible", subsección "Fases · F2". El plan está inline en el maestro; aún no se migró a archivo dedicado. Si el diseño crece durante el chat, mover a `Educa.API/.claude/plan/rate-limit-flexible.md` antes de escribir código.
- **Chat 2 BE cerrado** (Plan 26 — telemetría): `../../educa-web/.claude/chats/closed/009-plan-26-chat-2-fe-rate-limit-admin-view.md` (FE) + `008-plan-26-chat-1-be-rate-limit-telemetria.md` (BE Chat 1). La vista admin ya está viva en prod y capturó datos reales que este chat usa para calibrar.

## OBJETIVO

Introducir **multiplier por rol** sobre las policies de rate limit existentes. El Director/Asistente Admin/Promotor/Coordinador Académico hoy chocan con 429 en uso normal (exportar 4-5 reportes seguidos agota `heavy` aún con el parche temporal `heavy = 15/min`). Este chat:

1. Revierte el parche temporal de Chat 2 (`heavy` 15 → 5/min).
2. Crea atributo custom `[RateLimitOverride(policy, multiplier)]` que ajusta cuota base sin crear policy nueva.
3. Agrega partition key resolver que lee el rol del `ClaimsPrincipal` y aplica `roleMultipliers[rol]`.
4. Define multipliers en constante tipada (F5 migrará a `appsettings`).
5. Cubre con tests de integración que el mismo endpoint con rol distinto obtiene límite efectivo distinto.

**NO aplicar en este chat** el atributo a los 14 endpoints de reportes (Plan 25) ni a las 2 vistas de observabilidad admin — eso es F2.4, siguiente chat (014-plan-26-f2-chat-2-be-aplicar-overrides.md o similar). Este chat entrega la **máquina** del multiplier; el siguiente la **aplica**.

## PRE-WORK OBLIGATORIO

Antes de codificar, confirmar con el usuario:

1. **Multipliers iniciales** (default sugerido del plan):
   ```
   Director              → 3.0
   Asistente Administrativo → 2.5
   Promotor              → 2.5   (mismo que Asistente — ambos son admin, confirmar)
   Coordinador Académico → 2.5   (mismo que Asistente — confirmar)
   Profesor              → 2.0
   Apoderado             → 1.0
   Estudiante            → 1.0
   Anónimo / sin rol     → 1.0
   ```
   El plan original solo listó Director/AsistenteAdmin/Profesor/Apoderado/Estudiante. **Promotor** y **Coordinador Académico** son parte de `Roles.Administrativos` desde el Plan 21/22 — preguntar al usuario si heredan `2.5` o tienen su propio multiplier.

2. **Cap 5x**: el plan fija cap máximo de multiplier acumulado en `5.0` (rol × endpoint × franja). Confirmar que el clamp se aplica aquí (F2) o en F3 (time-of-day). Sugerencia: aplicarlo aquí para no esperar a F3.

3. **Nueva policy naming**: el plan pide deprecar `heavy` por `reports` (lecturas pesadas) + `batch` (escrituras pesadas). Confirmar si este chat crea las dos policies con cuota base `5/min` (igual que `heavy`) y deja `heavy` deprecated pero funcional, o si solo agrega `reports` y `batch` queda para el chat de F2.4.

## ALCANCE

### Archivos (estimación inicial — revisar al arrancar)

| Acción | Ruta | Líneas | Notas |
|--------|------|--------|-------|
| crear | `Educa.API/Attributes/RateLimitOverrideAttribute.cs` | ~30 | AttributeTargets.Method, stores `policy` + `multiplier` |
| crear | `Educa.API/RateLimiting/RoleMultipliers.cs` | ~40 | Constante estática `IReadOnlyDictionary<string, double>` + `GetMultiplier(string? rol) : double` con fallback `1.0` |
| crear | `Educa.API/RateLimiting/RateLimitPartitionResolver.cs` | ~80 | Resolver que: lee `[RateLimitOverride]` del endpoint, combina con `roleMultipliers[rol]`, clampa a `5.0`, devuelve límite efectivo |
| editar | `Educa.API/Extensions/RateLimitingExtensions.cs` | +60 | Agregar policies `reports` y `batch`; revertir `heavy` de 15 → 5/min (quitar comentario "parche temporal"); integrar resolver en `AddPolicy` |
| editar | `Educa.API/Constants/Auth/Roles.cs` | 0 | Solo confirmar que los valores string que usa `RoleMultipliers` coinciden exactamente |
| crear | `Educa.API.Tests/RateLimiting/RoleMultipliersTests.cs` | ~60 | 6-8 tests puros: Director → 3.0, Estudiante → 1.0, null/unknown → 1.0, cap 5x no se supera |
| crear | `Educa.API.Tests/RateLimiting/RateLimitPartitionResolverTests.cs` | ~100 | 5-6 tests: combinación rol × override, clamp 5x, sin override, sin rol (anónimo) |
| crear | `Educa.API.Tests/Integration/RateLimitIntegrationTests.cs` | ~120 | 3-4 tests con `WebApplicationFactory` o `TestServer`: Director hace 12 requests `reports` → OK (5 × 3 = 15 efectivo); Estudiante 6 requests → 429 en el 6; `[RateLimitOverride("reports", 2.0)]` sobre endpoint dummy con Director → 30 efectivo |

**Cap 300 líneas por archivo** (INV backend). El resolver puede crecer — si se acerca, partial + named responsibility (`Resolver.RolLookup.cs` / `Resolver.OverrideLookup.cs`).

### Fuera de scope (siguiente chat F2 Chat 2)

- Aplicar `[RateLimitOverride]` a los 14 endpoints de reportes del Plan 25.
- Aplicar `[RateLimitOverride]` a `/api/sistema/rate-limit-events` y `/api/sistema/errors` (las 2 vistas admin que se auto-rate-limitan).
- Validación con telemetría F1 de que las 429 caen en los roles esperados.

## TESTS MÍNIMOS

### Unit

- `RoleMultipliers.GetMultiplier("Director") → 3.0`
- `RoleMultipliers.GetMultiplier("Estudiante") → 1.0`
- `RoleMultipliers.GetMultiplier(null) → 1.0` (anónimo)
- `RoleMultipliers.GetMultiplier("RolInexistente") → 1.0` (fallback seguro)
- `Resolver.ResolveLimit(policy: "reports", rol: "Director", endpoint sin override) → 5 × 3.0 = 15`
- `Resolver.ResolveLimit(policy: "reports", rol: "Director", endpoint con [RateLimitOverride("reports", 2.0)]) → 5 × 3.0 × 2.0 = 30`
- `Resolver.ResolveLimit(policy: "reports", rol: "Director", endpoint con [RateLimitOverride("reports", 3.0)]) → min(5 × 3.0 × 3.0, 5 × cap_factor) — clampado a cap 5x sobre base → 25` (verificar regla exacta del cap con usuario)
- `Resolver.ResolveLimit(policy: "login", rol: "Director", ...) → 10` (NO se toca — policies `login`/`refresh`/`biometric` están fuera del multiplier)

### Integración (con `WebApplicationFactory`)

- `Director autenticado hace 12 requests consecutivos a /api/reportes/dummy → todas 200 OK` (base 5 × 3.0 = 15)
- `Director en request #16 → 429` (cap)
- `Estudiante autenticado hace 6 requests consecutivos → la 6ta → 429` (base 5 × 1.0 = 5)
- `Request anónima a endpoint con [RateLimitOverride("reports", 2.0)] → límite = 5 × 1.0 × 2.0 = 10`

### Regresión

- **No se rompen** los 28 tests del módulo `RateLimiting` del Chat 2 BE.
- Suite completa BE sigue verde (baseline actual: **1063 tests** tras Plan 22 Chat B; este chat sube a ~1080-1090).

## REGLAS OBLIGATORIAS

- **Cap 300 líneas** por archivo `.cs` (backend.md). Dividir con partial + responsibility si hace falta.
- **Policies `login` / `refresh` / `biometric` NO se tocan** — están calibradas para abuso, aplicar multiplier las debilitaría (plan 26 guardrails).
- **INV-S07** (fire-and-forget): cualquier error resolviendo el multiplier **no debe** fallar la request. Ante excepción → fallback a cuota base con `LogWarning`.
- **INV-D05** (AsNoTracking): los resolvers no tocan BD. Los multipliers son constantes en memoria.
- **Cap 5x acumulado**: rol × endpoint × franja no puede superar `5.0 × cuota_base`. F3 sumará time-of-day; el clamp debe dejar espacio. Discutir con el usuario si el cap ya se aplica aquí o en F3.
- **Reflection por endpoint**: la lectura de `[RateLimitOverride]` sobre el endpoint puede ser costosa si se hace por-request. Cachear por `Endpoint.DisplayName` o `MethodInfo` en `ConcurrentDictionary`. Mencionado en el plan como "Reflection Warning" — no está expresado así pero el patrón de Chat 2 ya usa `RouteEndpointBuilder`.
- **Zona horaria**: F3 traerá `IClock` + Lima TZ. Este chat no la necesita — los multipliers son puros de rol/endpoint.
- **No mezclar con auth**: el resolver extrae rol del `ClaimsPrincipal` ya autenticado (`ClaimTypes.Role`). No hace lookup a BD.

## APRENDIZAJES TRANSFERIBLES (del Chat 2 BE + FE del Plan 26)

1. **Orden del pipeline es crítico**: en Chat 2 se descubrió que `RateLimitTelemetryMiddleware` **debe ir ANTES** de `UseRateLimiter` en `Program.cs`. Si va después, el limiter corta el pipeline al rechazar y **ningún 429 se persiste**. Este chat introduce un resolver que probablemente va integrado en la policy (via `AddPolicy`) — no como middleware separado — así que el orden del pipeline no se altera. Pero al agregar `reports` y `batch` como policies, confirmar con un test manual que las 429 siguen llegando a `RateLimitEvent`.

2. **LINQ records con ctor no traducible**: en Chat 2 BE se descubrió que proyectar a un `record` con constructor en una query EF Core no traduce a SQL (tira `InvalidOperationException` en runtime). La solución fue **proyección anónima + map en memoria**. No aplica directo a este chat (sin BD), pero útil para los repos del módulo `RateLimiting` si se extiende con queries de stats del multiplier.

3. **Dato real de la telemetría** (primera sesión admin post-deploy): **top endpoint rechazado fue `/api/sistema/errors` con 5/16 rechazos** en una sola sesión del usuario. Esto confirma que el admin quiere **multiplier fuerte** en las vistas de diagnóstico — el chat siguiente (F2 Chat 2) las marcará con `[RateLimitOverride("reports", 3.0)]`. No condiciona este chat, pero sirve para priorizar el diseño del atributo (tiene que soportar multipliers enteros y decimales).

4. **Parche temporal a revertir**: `RateLimitingExtensions.cs` tiene comentario `"parche temporal"` en la policy `heavy` donde se subió de 5 → 15/min. Buscar ese comentario como marcador. Al revertir, agregar comentario nuevo que cite este plan: `// Plan 26 F2 Chat 1 — parche revertido, multiplier por rol reemplaza este workaround`.

5. **Vista admin de rate limit (FE)**: la vista `/intranet/admin/rate-limit-events` ya existe y muestra `rol` como columna. Los datos nuevos de F2 (cuando las 429 caigan) aparecerán con el rol del usuario autenticado — no hace falta cambio FE en este chat. Pero verificar que `RateLimitEvent.Rol` se sigue poblando correctamente desde el middleware (Chat 1 BE ya lo hace con `ClaimsPrincipalExtensions`).

6. **Tests de integración con `WebApplicationFactory`**: hay precedente en el repo (ver `Educa.API.Tests/` — patrón usado en controllers). El `TestServer` acepta un `testAuthHandler` custom que inyecta claims — reusar. Si no existe helper común, crear `Educa.API.Tests/Helpers/Auth/TestAuthHandler.cs` en este chat como subproducto reutilizable para F3/F4.

7. **`Roles.Administrativos`** es una constante `string` con los 4 roles separados por coma: `"Director,Asistente Administrativo,Promotor,Coordinador Académico"`. Usar `.Split(',', StringSplitOptions.TrimEntries)` si se necesita iterar. Los strings individuales viven en `Roles.Director`, `Roles.AsistenteAdministrativo`, etc. (ver `Educa.API/Constants/Auth/Roles.cs`).

## FUERA DE ALCANCE

- Aplicar `[RateLimitOverride]` a endpoints específicos (F2 Chat 2).
- Time-of-day multiplier / franja escolar (F3, chat aparte).
- Token bucket burst + sustained (F4, 2 chats aparte).
- Config externa en appsettings (F5, diferido).
- Toques a `login` / `refresh` / `biometric` (explícitamente fuera).
- Cambios en la vista admin FE (F1 cerrada, no se toca en F2).

## CRITERIOS DE CIERRE

- [ ] `heavy` revertido a `5/min` (base). Parche temporal removido + comentario citando este plan.
- [ ] Policies `reports` y `batch` agregadas (cuota base `5/min` o la que el usuario confirme).
- [ ] `[RateLimitOverride(policy, multiplier)]` creado + probado por reflection en endpoint dummy.
- [ ] `RoleMultipliers.cs` con los 5-7 roles aprobados por el usuario en PRE-WORK.
- [ ] `RateLimitPartitionResolver` integrado en `AddPolicy("reports")` y `AddPolicy("batch")` (no en `login`/`refresh`/`biometric`).
- [ ] Cap 5x verificado con test explícito.
- [ ] `dotnet build` limpio. `dotnet test --no-build` verde — suite completa sin regresión (baseline 1063, target ~1080-1090).
- [ ] Todos los archivos ≤ 300 líneas.
- [ ] Actualizar `.claude/plan/maestro.md` sección Plan 26 F2: marcar F2.0, F2.1, F2.2, F2.3, F2.5 como `[x]`. Dejar F2.4 y F2.6 como `[ ]` (siguiente chat).
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat.
- [ ] Generar prompt del siguiente chat (`015-plan-26-f2-chat-2-be-aplicar-overrides-14-endpoints.md` o nombre similar).

## COMMIT MESSAGE sugerido

**Backend** (`Educa.API`, branch `master`):

```
feat(rate-limit): Plan 26 F2 Chat 1 — role multiplier + "reports"/"batch" policies

Add [RateLimitOverride(policy, multiplier)] attribute and a partition
resolver that reads the role from ClaimsPrincipal and applies
RoleMultipliers (Director 3.0, Asistente/Promotor/Coordinador 2.5,
Profesor 2.0, Apoderado/Estudiante/Anónimo 1.0). Effective limit per
request is clamped at 5x the base to keep guardrails safe while F3
layers time-of-day on top.

New policies "reports" and "batch" replace the deprecated "heavy"
bucket. The temporary patch that raised "heavy" to 15/min in Chat 2
is reverted — the multiplier handles that case properly (Director
x3 on base 5/min gives 15 effective with the right model).

Auth-sensitive policies ("login", "refresh", "biometric") are NOT
touched — they stay calibrated for abuse.

Adds unit tests for RoleMultipliers + resolver (including the 5x
cap) and integration tests with WebApplicationFactory + a test auth
handler that injects claims. No changes to the admin FE view — the
existing "RateLimitEvent" telemetry keeps capturing 429s with the
caller's role.
```

## CIERRE

Feedback a pedir al cerrar:

1. **Multipliers finales**: ¿los valores quedaron como los sugeridos o los ajustaste con datos de la telemetría F1?
2. **Cap 5x**: ¿se aplicó en F2 o se movió a F3? Si quedó en F2, ¿la fórmula del clamp aguanta bien cuando F3 agregue time-of-day?
3. **Performance del resolver**: ¿se necesitó cache de reflection en `ConcurrentDictionary` o la overhead por-request fue despreciable? (Medir en tests de integración con 100+ requests consecutivas).
4. **Policies deprecated**: ¿`heavy` quedó funcional con un marker `[Obsolete]` o se eliminó directo? (Depende de si hay controllers del Plan 25 que aún lo usen — verificar antes de borrar).
5. **Próximo chat**: confirmar que F2 Chat 2 (aplicar `[RateLimitOverride]` a 14 endpoints de reportes + 2 vistas admin) es lo inmediato, o si el usuario quiere **observar la telemetría 1-2 semanas más** antes de aplicar overrides a endpoints concretos.
