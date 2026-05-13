> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 43 · **Chat**: 1.2 (ejecución BE) · **Fase**: F1 · **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.
> **Modo sugerido**: `/execute` → `/validate`. El `/design` ya está cerrado (chat 148 + ADR-0007).

---

# Plan 43 · Chat 1.2 — Fingerprint v2 + merge job (BE)

## Objetivo

Implementar el algoritmo nuevo de fingerprint (v2) y el job idempotente de re-fingerprint + merge correctivo de duplicados existentes. Después de este chat, los 340 grupos del slow `/notificaciones/activas` deben colapsar en 1 cuando se corra el job sobre prod.

## ADR de referencia

[ADR-0007 — Fingerprint stable + idempotent merge](../../decisions/0007-fingerprint-algorithm-and-merge.md). **Leer antes de tocar código** — define el algoritmo nuevo, las constraints, y el formato del `MergeReport`.

## Scope estricto

### A. Algoritmo nuevo (cambios pequeños)

1. `Educa.API/Helpers/Sanitization/ErrorFingerprintCalculator.cs`:
   - Cambiar `Separator` de `' '` a `' '` (NUL `\0`).
   - Agregar parámetro `httpMethod` a `Compute(...)`.
   - Agregar `private static string MessageContrib(string? errorCode, string? mensaje)` con whitelist `{SLOW_REQUEST, SLOW_REQUEST_FAILED}` → `""`.
   - Cambiar el cuerpo de `Compute` para usar `MessageContrib` y `httpMethod`.
   - Actualizar el docstring (que hoy miente con NUL — sincronizarlo con el código real).

2. `Educa.API/Constants/Sistema/ErrorCodesIgnoredForFingerprint.cs` (nuevo):
   - `public static class ErrorCodesIgnoredForFingerprint { public static readonly HashSet<string> Codes = new(StringComparer.OrdinalIgnoreCase) { "SLOW_REQUEST", "SLOW_REQUEST_FAILED" }; }`.
   - El calculator lo consume para `MessageContrib`.

3. `Educa.API/Services/Sistema/ErrorLogService.Upsert.cs`:
   - Pasar `errorLog.ERL_HttpMethod` como nuevo parámetro de `Compute`.

### B. Job de merge (cambio grande)

4. `Educa.API/Interfaces/Services/Sistema/IErrorGroupBackfillService.cs` (nuevo):

   ```csharp
   public interface IErrorGroupBackfillService
   {
       Task<MergeReport> RecomputeAndMergeAsync(CancellationToken ct = default);
   }
   ```

5. `Educa.API/Services/Sistema/ErrorGroupBackfillService.cs` (nuevo, ≤ 300 ln):
   - Implementación de los 6 pasos del ADR-0007 §2.
   - Lock advisory (`sp_getapplock` con resource `'errorgroup-backfill'`, mode `Exclusive`, timeout 5s) usando `_context.Database.ExecuteSqlInterpolatedAsync`.
   - Paged scan de `ErrorGroup` (500 por página) con AsNoTracking.
   - Para cada grupo: buscar ocurrencia más reciente (`ErrorLog.ERL_Fecha DESC FIRSTORDEFAULT`) para tomar `httpMethod` (que no existe en `ErrorGroup`).
   - Si no hay ocurrencia (grupo huérfano): usar campos del grupo, `httpMethod = ""`.
   - Agrupar por `fingerprint_v2`.
   - Transacción explícita por cluster (`_context.Database.BeginTransactionAsync`).
   - Estado del canónico según regla del ADR (cualquier NUEVO/EN_PROGRESO → NUEVO; todos RESUELTO → RESUELTO; todos IGNORADO → IGNORADO).
   - Append a `ERG_Observacion` del canónico: `$"(Merged from {N} groups on {now:yyyy-MM-dd} via ADR-0007)"`.
   - Retornar `MergeReport`.

6. `Educa.API/DTOs/Sistema/ErrorGroups/MergeReport.cs` (nuevo):
   - Record con los 6 campos definidos en el ADR.

7. `Educa.API/Controllers/Sistema/ErrorGroupAdminController.cs` (nuevo o agregar a existente):
   - `POST /api/sistema/error-groups/_admin/backfill` con `[Authorize(Roles = "Director")]`.
   - `[EnableRateLimiting("reports")]` (Plan 40 ADR-0005, bulkhead `concurrency:reports`).
   - Body vacío. Retorna `MergeReport` como JSON.
   - El controller delega 100% al service — sin lógica.

8. `Educa.API/Extensions/ServiceExtensions.cs` (o donde estén los DI registrations de Sistema):
   - `services.AddScoped<IErrorGroupBackfillService, ErrorGroupBackfillService>();`

### C. Tests obligatorios

9. `Educa.API.Tests/Helpers/Sanitization/ErrorFingerprintCalculatorTests.cs` (extender):
   - `Compute_WithSlowRequestErrorCode_OmitsMessage`: dos llamadas con mismo URL/method/status/errorCode `SLOW_REQUEST` y mensajes distintos → mismo fingerprint.
   - `Compute_WithDifferentHttpMethods_ProducesDifferentFingerprints`: GET vs POST mismo URL/status → diferente fingerprint.
   - `Compute_SeparatorIsNul`: snapshot test sobre un caso conocido para detectar regresión accidental del separador.
   - Mantener todos los tests v1 verdes (ningún test legítimo del v1 debería romperse — los inputs no-SLOW_REQUEST siguen hashendo con mensaje).

10. `Educa.API.Tests/Services/Sistema/ErrorGroupBackfillServiceTests.cs` (nuevo):
    - `RecomputeAndMergeAsync_Idempotent`: correr 2× sobre fixture con 5 duplicados → 1ª produce `ClustersMergeados=1, GruposEliminados=4`; 2ª produce `ClustersMergeados=0, GruposEliminados=0`.
    - `RecomputeAndMergeAsync_MergesDuplicates_PreservingOldestAsCanonical`: 3 grupos con fechas distintas + mismo fingerprint_v2 → canónico es el más antiguo, suma de `ContadorTotal`, ocurrencias movidas.
    - `RecomputeAndMergeAsync_CanonicalStatePropagation`: cluster con NUEVO+RESUELTO → canónico queda NUEVO; cluster con todos RESUELTO → canónico queda RESUELTO; cluster con todos IGNORADO → canónico queda IGNORADO.
    - `RecomputeAndMergeAsync_PreservesObservacionTrail`: append correcto a `ERG_Observacion`.
    - `RecomputeAndMergeAsync_NoOpWhenAllGroupsAlreadyV2`: sin duplicados ni rehash → reporte todo en 0.

### D. Doc INV-ET06

11. `educa-web/.claude/rules/business-rules.md §15.12`:
    - Reemplazar el texto de INV-ET06 con el borrador del ADR-0007 §5.
    - Mantener el ID `INV-ET06` (no inventar `INV-ET06b` — el invariante es el mismo, cambia el algoritmo).
    - Mencionar ADR-0007 como historia: *"Cambiar el algoritmo requiere job de re-fingerprint + merge documentado (ver ADR-0007)."*

### E. Smoke local pre-deploy

12. Si está disponible: snapshot de prod (export de `ErrorGroup` + `ErrorLog` filtrados por `/notificaciones/activas`) → restaurar en BD test local → correr backfill → verificar:
    - `SELECT COUNT(*) FROM ErrorGroup WHERE ERG_Url LIKE '%notificaciones/activas%'` = 1 (o ~pocos legítimos por method/status).
    - `SELECT ERG_ContadorTotal FROM ErrorGroup WHERE ...` ≈ 340.
    - Re-correr el backfill → 0 cambios (idempotente).

Si snapshot no disponible: generar 5 fixtures sintéticos con latencias variables en BD local, correr backfill, verificar.

## Fuera de scope este chat

- **Endpoint de trend 30d** para sparkline (`/api/sistema/error-groups/{id}/trend`). Sugerencia: brief 150 (FE) lo declara como prerrequisito; si Plan 43 Chat 5.1 lo cubre genéricamente con `/serie-temporal`, evaluar al inicio del 150 si tiene sentido consolidarlo allá.
- **Mini-sparkline FE**. Brief 150.
- **Ejecución del job sobre prod**. Eso es decisión separada — primero correr en staging tras este deploy.

## Reglas a respetar

- BE cap **300 ln** por archivo (backend.md). `ErrorGroupBackfillService.cs` debe quedar bajo el cap; si crece, partir en partial class.
- `AsNoTracking()` para queries de lectura del scan.
- Transacción explícita por cluster (no por grupo individual — overhead).
- Logger `ILogger<ErrorGroupBackfillService>` con structured logging (no string interpolation).
- Commit message en inglés, scope `error-groups` o `error-trace`. NO `Co-Authored-By`.

## Riesgos y mitigaciones (recapitulación del ADR-0007)

| Riesgo | Mitigación |
| --- | --- |
| Sobrecorrida del job sobre prod sin staging | El job no se ejecuta automático — endpoint admin manual + ack del Director |
| Estado del canónico inesperado | Regla determinista en el ADR + test específico |
| Falla parcial mid-cluster | Transacción por cluster (rollback automático si un UPDATE/DELETE rompe) |
| Lock advisory bloqueado | Timeout 5s — si bloquea, el endpoint retorna 409 Conflict con mensaje "backfill ya corriendo" |

## Criterio de cierre (DoD)

- [ ] `ErrorFingerprintCalculator.Compute` recibe `httpMethod` + usa `MessageContrib` + separador NUL. Docstring sincronizado.
- [ ] Constante `ErrorCodesIgnoredForFingerprint.Codes`.
- [ ] `ErrorGroupBackfillService` implementado + DI registrado + endpoint admin protegido.
- [ ] `MergeReport` DTO.
- [ ] Test suite: nuevos tests del calculator + nuevos tests del service. Suite total: `+10-15` tests verdes, sin romper los 1709 verdes baseline (Plan 28 Chat 3d). Los 8 ❌ preexistentes de Bulkhead/RuntimeHealth deben seguir como ❌, no nuevos.
- [ ] `INV-ET06` actualizado en `educa-web/.claude/rules/business-rules.md`.
- [ ] Smoke local pasado (fixtures sintéticos o snapshot real).
- [ ] Build + tests verdes.
- [ ] Commit en branch `master` (cap regla universal: este es BE, branch master por convención del proyecto).
- [ ] Brief movido a `awaiting-prod/149-...md` con nota: "ejecución del job sobre prod pendiente decisión post-deploy del Director".

## Plan file

`educa-web/.claude/plan/monitoreo-cowork-feedback-2026-05-11.md` §Chat 1.2.
