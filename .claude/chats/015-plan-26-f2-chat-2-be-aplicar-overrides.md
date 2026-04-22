> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 26 · **Chat**: 4 (F2 sub-chat 2 de 2) · **Fase**: F2 · **Estado**: ⏳ pendiente arrancar.

---

# Plan 26 F2 Chat 2 — BE: aplicar `[RateLimitOverride]` a 14 endpoints reportes + 2 vistas admin + migrar `heavy` → `reports`/`batch`

## PLAN FILE

- **Maestro inline**: `../../educa-web/.claude/plan/maestro.md` → sección "🔵 Plan 26 — Rate limiting flexible", subsección "Fases · F2", item **F2.4** (pendiente). Items F2.0/F2.1/F2.2/F2.3/F2.5 ya cerrados por F2 Chat 1.
- **F2 Chat 1 cerrado** (máquina del multiplier): `../../educa-web/.claude/chats/closed/014-plan-26-f2-chat-1-be-multiplier-por-rol.md`. Entregó `[RateLimitOverride]`, `RoleMultipliers`, `RateLimitPartitionResolver`, policies `reports`/`batch`. Este chat **aplica** lo que aquel **dejó listo**.

## OBJETIVO

Aplicar el modelo flexible de rate limiting a los endpoints reales:

1. Migrar las **39 instancias** de `[EnableRateLimiting("heavy")]` distribuidas en **10 controllers** a `reports` (lectura pesada: GETs, exports, PDFs) o `batch` (escritura pesada: imports, operaciones masivas).
2. Aplicar `[RateLimitOverride("reports", 2.0)]` en los **14 endpoints de reportes** (Plan 25 cerrado) que el admin exporta en serie.
3. Aplicar `[RateLimitOverride("reports", 3.0)]` en las **2 vistas de observabilidad admin** que se auto-rate-limitaban (telemetría F1 capturó: `/api/sistema/errors` con 5/16 rechazos en una sesión real).
4. Verificar que `heavy` queda sin consumidores → marcarla `[Obsolete]` en el código del extension method (no quitarla todavía — F5 puede eliminarla cuando todos los deploys hayan rotado).

## PRE-WORK

Antes de tocar código, confirmar con el usuario:

1. **Mapeo de cada heavy a reports/batch**: el siguiente cuadro es el dispatch propuesto. **Confirmar cada controller** o ajustar.
   - `BoletaNotasController` → **reports** (GETs de PDF/Excel)
   - `HorarioController` → caso por caso (probable mix: import = batch, export = reports)
   - `UsuariosController` → caso por caso (import masivo = batch, listado paginado pesado = reports)
   - `AsistenciaAdminController` → **batch** (mutaciones formales)
   - `ConsultaAsistenciaController` → **reports** (Plan 25: 11 endpoints PDF/Excel)
   - `ReportesAsistenciaController` → **reports** (Plan 25: 1 endpoint)
   - `CampusController` → **reports** (probable: descarga de plano)
   - `BlobStorageController` → **batch** (uploads) o evaluar si necesita policy propia
   - `ErrorLogController` → **reports** + override 3.0 (vista admin de diagnóstico)
   - `RateLimitEventsController` → **reports** + override 3.0 (vista admin de diagnóstico)

2. **Override 2.0 en 14 endpoints de reportes (Plan 25)**: confirmar que el alcance son los 14 endpoints contados en `INV-RE01` del Plan 25 (`ReportesAsistenciaController` 1, `BoletaNotasController` 2, `ConsultaAsistenciaController` 11). El override 2.0 sobre `reports` (base 5) da: Director ×3 × override ×2 = 6.0 → cap 5.0 → **25 efectivos**; Estudiante ×1 × override ×2 = **10 efectivos**.

3. **Override 3.0 en `/api/sistema/errors` y `/api/sistema/rate-limit-events`**: confirmar los rangos completos de routes que llevan el override (todos los GET de stats + listado, no solo el listado raw).

## ALCANCE

### Migración heavy → reports/batch

| Controller | Endpoints heavy | Migración propuesta |
|------------|-----------------|---------------------|
| `BoletaNotasController` | 2 | reports |
| `HorarioController` | ~5-6 | reports (GET) + batch (import) — confirmar |
| `UsuariosController` | ~4-5 | reports (GET stats) + batch (import) — confirmar |
| `AsistenciaAdminController` | ~3-4 | batch |
| `ConsultaAsistenciaController` | 11 | reports + override 2.0 |
| `ReportesAsistenciaController` | 1 | reports + override 2.0 |
| `CampusController` | ~2 | reports |
| `BlobStorageController` | ~2 | batch o policy propia |
| `ErrorLogController` | ~3 | reports + override 3.0 |
| `RateLimitEventsController` | ~3 | reports + override 3.0 |

### Archivos (estimación)

- **10 controllers editados** (cap 300 líneas por archivo — ninguno debería pasarse, pero verificar).
- **0 nuevos archivos** salvo el caso edge de `BlobStorageController` si necesita policy nueva (decisión del PRE-WORK).
- **`RateLimitingExtensions.cs`**: marcar `heavy` con `[Obsolete]`-style comment expandido + (opcional) si nadie la usa, considerar dejarla solo para no romper deploys mixtos. **No eliminar todavía**.

### Tests

- **Smoke por controller**: 1 test por controller que confirme que el endpoint sigue respondiendo 200 después del cambio de policy. Existentes deberían cubrirlo si el filtro de tests se amplía.
- **1 test integración nuevo** que verifique override 3.0 sobre `/api/sistema/errors`: Director hace 25 requests → todas 200; la 26 → 429.
- **Regresión**: suite completa BE debe seguir verde (baseline tras F2 Chat 1: **1097 tests**; este chat probablemente no agrega más tests, solo edita controllers).

## REGLAS OBLIGATORIAS

- **Cap 300 líneas** por archivo `.cs`. Algunos controllers podrían superarlo después de agregar overrides — refactorizar antes (no usar el chat para meter overrides en archivos que ya están cerca del límite sin dividirlos).
- **NO tocar** `[EnableRateLimiting("login")]`, `"refresh"`, `"biometric"`, `"feedback"` — fuera de scope.
- **`heavy` queda funcional** durante este chat. La idea es que el deploy del chat anterior + este pueden convivir con tráfico mixto.
- **Verificación con telemetría F1**: después del deploy, esperar 1-2 días y revisar `/intranet/admin/rate-limit-events` para confirmar que las 429 caen en los roles esperados (Estudiante en endpoints sin override, no Director). Esto cierra F2.6.

## CRITERIOS DE CIERRE

- [ ] Las 39 instancias de `[EnableRateLimiting("heavy")]` migradas a `"reports"` o `"batch"` según el mapeo aprobado en PRE-WORK.
- [ ] `[RateLimitOverride("reports", 2.0)]` aplicado en los 14 endpoints de reportes (Plan 25).
- [ ] `[RateLimitOverride("reports", 3.0)]` aplicado en `/api/sistema/errors` y `/api/sistema/rate-limit-events`.
- [ ] `dotnet build` limpio. `dotnet test` verde — suite completa sin regresión (target ≥ 1098 tests).
- [ ] Todos los archivos editados ≤ 300 líneas.
- [ ] `heavy` sigue activa pero sin consumidores nuevos. Comentario en `RateLimitingExtensions.cs` actualizado: "sin consumidores tras F2 Chat 2 — eliminar en F5".
- [ ] Actualizar `.claude/plan/maestro.md` Plan 26 F2: marcar **F2.4 como [x]**, dejar F2.6 como `[~]` (esperando observación post-deploy).
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/`.
- [ ] Generar prompt del siguiente chat (probable: **`016-plan-26-f3-be-time-of-day-multiplier.md`** una vez la telemetría confirme que F2 funciona; o un mini-chat de monitoreo si el usuario prefiere validar antes).

## COMMIT MESSAGE sugerido

**Backend** (`Educa.API`, branch `master`):

```
feat(rate-limit): Plan 26 F2 Chat 2 — apply [RateLimitOverride] + migrate heavy → reports/batch

Migrate 39 [EnableRateLimiting("heavy")] occurrences across 10 controllers
to "reports" (heavy reads — PDFs, exports, GETs) and "batch" (heavy
writes — imports, bulk ops). Apply [RateLimitOverride("reports", 2.0)]
on the 14 report endpoints from Plan 25 so admin exports give Director
25 effective req/min (3.0 × 2.0 capped at 5.0 × base 5 = 25). Apply
override 3.0 on /api/sistema/errors and /api/sistema/rate-limit-events
since F1 telemetry showed both auto-rate-limited under "heavy" in real
admin sessions (top endpoint: /api/sistema/errors with 5/16 rejections).

The "heavy" policy stays registered with no consumers (kept until F5
when deploy rotation completes) — comment updated to flag it deprecated.

No regressions in 1097-test suite (Plan 26 F2 Chat 1 baseline).
```

## CIERRE — feedback a pedir

1. **Mapeo correcto**: ¿el dispatch heavy → reports/batch quedó como esperabas, o tuviste que mover algún endpoint que asumimos mal?
2. **Telemetría post-deploy**: ¿esperaste 1-2 días antes de cerrar F2.6, o lo cerraste de inmediato?
3. **`heavy` realmente sin consumidores**: ¿quedó algún endpoint que usa `heavy` por motivos legítimos (ej. policy más restrictiva intencionalmente)?
4. **Archivos cerca de 300 líneas**: ¿alguno requirió división? Si sí, el split queda como referencia para próximos chats.
5. **Próximo chat**: ¿F3 (time-of-day) o un mini-chat de calibración basado en métricas reales antes de seguir?
