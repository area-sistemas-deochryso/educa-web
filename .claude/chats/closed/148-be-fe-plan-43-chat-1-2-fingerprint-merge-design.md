> **Repo destino**: `educa-web` (FE, branch `main`) + `Educa.API` (BE, branch `master`). Este chat es `/design`: vive en `educa-web` porque produce el update de `business-rules.md §15.12`; el ADR vive en `Educa.API/.claude/decisions/0007-...`.
> **Plan**: 43 · **Chat**: 1.2 (design) · **Fase**: F1 (Foundations) · **Creado**: 2026-05-13 · **Estado**: ✅ design cerrado (pendiente commit + handoff a briefs 149/150).
> **Modo aplicado**: `/design`. Próximos chats: brief 149 BE (`/execute` + `/validate`) y brief 150 FE (`/execute` + `/validate`, bloqueado por 149).

---

# Plan 43 · Chat 1.2 — Fingerprint correcto + merge idempotente + sparkline 30d

## Objetivo

Que el slow `/notificaciones/activas` (hoy 340 grupos distintos por mismo bug) viva en **1 solo `ErrorGroup`** con `ContadorTotal=340` y trend 30d visible. Cierra hallazgos del Plan 43:

- **A8** — fingerprint variable produce explosión de grupos (340 grupos = 1 bug).
- **B2** — falta trend + percentiles en `ErrorGroup`.

## Por qué importa ahora

F4 (filtros server-side en Errores por `errorCode`) y F5 (sparklines/heatmap) **dependen** de tener fingerprints correctos. Sin esto, todo lo que F4/F5 construyan opera sobre data podrida (340 filas que deberían ser 1).

## Scope acordado (este chat — `/design`)

1. **Auditar** `Helpers/Sanitization/ErrorFingerprintCalculator.cs` (Educa.API). Confirmar los inputs exactos del SHA-256 actual y detectar el campo variable. Hipótesis del plan: duración del slow request leakea al mensaje normalizado → cada request con latencia distinta genera fingerprint distinto.
2. **Auditar** caso real: query SQL sobre `ErrorGroup` filtrando por `/notificaciones/activas` → confirmar 340 grupos con `ContadorTotal=1` cada uno o similar.
3. **Auditar** `ErrorGroupService.PersistErrorLogWithGroupAsync` (Plan 34 Chat 2): cómo se ejecuta el UPSERT, qué pasa hoy con duplicados, transición `RESUELTO → NUEVO`.
4. **Definir algoritmo nuevo de fingerprint** (sin código todavía):
   - Inputs propuestos por el plan: `severidad ‖ method ‖ urlNormalized ‖ httpStatus ‖ errorCode`.
   - Quitar `mensaje` del input cuando `errorCode='SLOW_REQUEST'`.
   - Definir si esa rama (sin mensaje) aplica a otros errorCodes o solo a SLOW_REQUEST. Validar contra los errorCodes activos hoy en `ErrorLog`.
5. **Diseñar job de merge idempotente**:
   - Cómo decidir el "canónico" (más antiguo por `ERG_PrimeraFecha`, o el más activo, o explícito).
   - Cómo sumar `ContadorTotal` + `ContadorPostResolucion`.
   - Cómo mover ocurrencias (`ErrorLog.ERL_ERG_CodID = canonico_id`) en batch sin lockear la tabla.
   - Cómo deletear duplicados respetando FK `ON DELETE CASCADE` sin perder breadcrumbs.
   - Cómo correrlo en staging primero (snapshot de prod) y validar idempotencia (correrlo 2× debe dar el mismo resultado).
6. **Decidir split** del chat de ejecución: 1 brief BE grande o 2 sub-briefs BE (algoritmo + job aislado).
7. **Borrador de ADR** en `Educa.API/.claude/decisions/NNNN-fingerprint-merge.md` con el algoritmo final + efectos sobre `INV-ET06` (§15.12 de `business-rules.md`).
8. **Actualizar borrador de `INV-ET06`** (§15.12 de `business-rules.md`) con el algoritmo nuevo + nota de migración.

## Fuera de scope este chat

- Implementación del algoritmo nuevo (eso es `/execute` en el sub-brief BE).
- Job de merge corriendo (idem).
- Endpoint `/serie-temporal` para sparkline (lo cubre Plan 43 Chat 5.1 explícitamente — chequear si se anticipa acá o se deja allá).
- Mini-sparkline FE (sub-brief FE posterior).

## Plan de salida del `/design`

Al final del chat tengo que producir:

- ADR draft en `Educa.API/.claude/decisions/` con algoritmo nuevo + estrategia de merge.
- Diff propuesto para `educa-web/.claude/rules/business-rules.md §15.12` (INV-ET06).
- 1 o 2 briefs nuevos en `chats/open/` con scope estricto de ejecución BE (y separado FE si se decide split FE en chat dedicado vs como parte del FE de F5 sparklines).
- Update del Plan 43 con la decisión de split.

## Riesgos identificados

| Riesgo | Mitigación propuesta |
| --- | --- |
| Job de merge sobre prod no idempotente → duplica grupos | Correrlo 2× sobre snapshot de staging antes del prod run; assertion al final que `count(ErrorGroup grouped by fingerprint) = count(ErrorGroup distinct fingerprint)` |
| Cambiar fingerprint rompe agrupados activos sanos | Ejecutar merge **después** de cambiar el algoritmo; los grupos sanos no cambian de fingerprint si los inputs ya excluyen mensaje |
| FK `ON DELETE CASCADE` borra breadcrumbs cuando se borra grupo duplicado | Mover `ErrorLog.ERL_ERG_CodID` ANTES de borrar duplicados; breadcrumbs (`ErrorLogDetalle`) viajan con la ocurrencia |
| `INV-ET06` se actualiza sin que la migración haya corrido → docs miente sobre algoritmo en prod | Activar la nueva regla en docs SOLO post-deploy del nuevo cálculo + ejecución del merge job |

## Plan de migración (preliminar)

1. Deploy BE con `ErrorFingerprintCalculator` nuevo. A partir de aquí, **nuevas** ocurrencias ya entran al grupo correcto (UPSERT del Chat 2 del Plan 34 las consolida).
2. Job manual de merge correctivo sobre prod (ventana de baja actividad). Recalcula fingerprint de todos los `ErrorGroup` existentes y los mergea por fingerprint nuevo.
3. Update `INV-ET06` en `business-rules.md`.
4. Smoke verificación: query SQL `SELECT count(*) FROM ErrorGroup WHERE ERG_Fingerprint IN (subquery duplicates) = 0`.

## Referencias

- Plan 43 base: [`plan/monitoreo-cowork-feedback-2026-05-11.md`](../../plan/monitoreo-cowork-feedback-2026-05-11.md) §Chat 1.2 (líneas 69-85).
- Plan 34 archivado (UPSERT + estados): `history/planes-cerrados.md#plan-34`.
- INV-ET06 actual: `rules/business-rules.md §15.12`.
- Archivos BE a auditar:
  - `Educa.API/Helpers/Sanitization/ErrorFingerprintCalculator.cs`
  - `Educa.API/Services/Sistema/ErrorGroupService.cs`
  - `Educa.API/Services/Sistema/ErrorLogService.cs` (PersistErrorLogWithGroupAsync)
  - `Educa.API/Models/Sistema/ErrorGroup.cs`
- Cowork findings: `claude-cowork/` (donde se detectaron los 340 grupos en prod).

## Reglas de código a respetar (ya cuando arranque ejecución BE)

- BE: cap 300 ln por archivo, `AsNoTracking()` para queries de lectura, transacciones explícitas para el merge job, fire-and-forget NO aplica (el merge debe ser síncrono y reportar resultado).
- Tests: agregar a `Educa.API.Tests` (1709 verdes baseline) tests de `ErrorFingerprintCalculator` (nuevo algoritmo) + tests del merge job (idempotencia).
- Sin Co-Authored-By en commit.

---

## ✅ Outcomes del `/design` (2026-05-13)

### Hallazgos del audit

1. `ErrorFingerprintCalculator.Compute` ([Educa.API/Helpers/Sanitization/ErrorFingerprintCalculator.cs](../../../../Educa.API/Educa.API/Helpers/Sanitization/ErrorFingerprintCalculator.cs)) hashea `severidad ‖ mensaje ‖ url ‖ httpStatus ‖ errorCode` con separador `' '` (single space). El docstring miente — dice NUL pero el código usa space.
2. `NormalizeMensaje` filtra GUIDs/ISO dates/`\b\d{6,}\b`/whitespace. **No filtra duración** del slow request: latencias <100s tienen <6 dígitos; aun con 6+, `\b` no separa `\d` de `m`/`s` en `2345ms`.
3. El FE ([request-trace.interceptor.ts:84-96](../../../src/app/core/interceptors/trace/request-trace.interceptor.ts#L84-L96) + [error-reporter.service.ts:115-147](../../../src/app/core/services/error/error-reporter.service.ts#L115-L147)) reporta slow requests con `errorCode='SLOW_REQUEST'`, `mensaje="Slow request (2345ms): GET /api/notificaciones/activas"`. **Cada latencia distinta = mensaje distinto = fingerprint distinto = grupo distinto**. Origen exacto de los 340 grupos.
4. El UPSERT ([ErrorLogService.Upsert.cs](../../../../Educa.API/Educa.API/Services/Sistema/ErrorLogService.Upsert.cs)) llama a `Compute` con el mensaje crudo — no hay rama "skip por errorCode".
5. `ErrorGroup` tiene `ERG_RowVersion` (concurrency) + cascade FK desde `ErrorLog`/`ErrorLogDetalle` → el job de merge DEBE mover ocurrencias antes de borrar duplicados, sino se pierde data.
6. `httpMethod` NO entra al hash hoy. GET vs POST del mismo URL/status colapsan en mismo grupo — bug latente.

### Decisiones tomadas

1. **Algoritmo v2**: `SHA-256(severidad ‖ httpMethod ‖ normalize(url) ‖ httpStatus ‖ errorCode ‖ messageContrib)` con separador NUL `\0`. `messageContrib` retorna `""` para `{SLOW_REQUEST, SLOW_REQUEST_FAILED}` (whitelist explícita) y `NormalizeMensaje(mensaje)` para el resto.
2. **No stripear duración con regex** en `NormalizeMensaje` (alternativa C descartada por frágil) — la whitelist por errorCode es más segura.
3. **Job correctivo one-shot** (`ErrorGroupBackfillService.RecomputeAndMergeAsync`) con lock advisory + transacción por cluster + reporte estructurado. Endpoint admin protegido (rol Director, bulkhead `concurrency:reports`).
4. **Idempotencia obligatoria** — test específico que corre 2× la misma BD y la 2ª produce 0 cambios.
5. **Estado del canónico post-merge**: cualquier NUEVO/EN_PROGRESO → NUEVO; todos RESUELTO → RESUELTO; todos IGNORADO → IGNORADO. Append a `ERG_Observacion` con trail `"(Merged from N groups on YYYY-MM-DD via ADR-0007)"`.
6. **Split en 2 briefs** de ejecución (no 1 chat denso ni 3 sub-chats):
   - **149 BE** — algoritmo + job + endpoint + tests + update INV-ET06.
   - **150 FE** — mini-sparkline (bloqueado por 149, decisión sobre consolidar con Plan 43 Chat 5.1 al inicio del chat).
7. **No ejecutar el job sobre prod en el mismo deploy del algoritmo** — primero staging con snapshot, después prod con ack del Director.

### Artefactos entregados

| Archivo | Estado |
| --- | --- |
| [`Educa.API/.claude/decisions/0007-fingerprint-algorithm-and-merge.md`](../../../../Educa.API/.claude/decisions/0007-fingerprint-algorithm-and-merge.md) | ✅ ADR Proposed |
| [`educa-web/.claude/chats/open/149-be-plan-43-chat-1-2-fingerprint-v2-merge-job.md`](../open/149-be-plan-43-chat-1-2-fingerprint-v2-merge-job.md) | ✅ Brief BE ejecución |
| [`educa-web/.claude/chats/open/150-fe-plan-43-chat-1-2-errorgroup-sparkline.md`](../open/150-fe-plan-43-chat-1-2-errorgroup-sparkline.md) | ✅ Brief FE ejecución (bloqueado por 149) |
| Borrador `INV-ET06` v2 | En ADR-0007 §5. El brief 149 lo materializa en `business-rules.md` al cerrar — no se toca acá para no descoordinarlo del deploy. |

### Pendientes al cerrar este chat (post-`/end`)

- Mover brief 148 a `chats/closed/` (lo hace `/end`).
- Mover briefs 149 + 150 a `chats/open/` ✅ (ya están ahí).
- Agregar `[Plan 43 · Chat 1.2 · BE]` y `[Plan 43 · Chat 1.2 · FE]` a la cola del maestro (sección 🟡 Alta — Plan 43 monitoreo) reemplazando el item original `[Plan 43 · Chat 1.2 · BE+FE]`.
- Update §15.12 de `business-rules.md` lo hace el brief 149 BE al implementar, **NO acá** (evita decoupling entre docs y deploy).
