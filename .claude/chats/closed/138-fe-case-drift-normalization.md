# FE — Plan 42 Fase 2-FE: Endurecer recepción de casing en contratos REST

> **Repo destino**: `educa-web` (main)
> **Estado**: 🟡 F1 ✅ cerrada 2026-05-09 (Rama A confirmada) · F2-FE pendiente arrancar
> **Creado**: 2026-05-09 · **Modo sugerido**: `/investigate` → `/execute` → `/validate`
> **Plan padre**: [`plan/case-drift.md`](../../plan/case-drift.md) · ver §"Resultado F1"
> **Brief par cross-repo**: `Educa.API/.claude/chats/open/004-be-case-drift-normalization.md`
> **Origen**: creado por `/go` 2026-05-09 tras auditoría dual que detectó mito documental en `Educa.API/Program.cs:74` + 4 políticas de serialización distintas en BE.

## ACTUALIZACIÓN 2026-05-09 — F1 cerrada, scope F2-FE reducido

F1 ejecutada vía análisis estático exhaustivo + inspección binaria de `Microsoft.AspNetCore.Mvc.NewtonsoftJson.dll`. Resultado: **Rama A** — BE ya emite camelCase consistente (convención implícita de `AddNewtonsoftJson()` vía `NewtonsoftJsonMvcOptionsSetup` interno del package).

**Tareas F2-FE actualizadas** (recortadas tras F1):

- ✅ **F2-FE.1 audit `obj.PascalCase`**: pendiente, esperable 0 hallazgos por evidencia indirecta (1535+ tests verdes + producción operativa).
- ❌ **F2-FE.2 `normalizeKeys()` defensivo**: descartado — BE ya consistente, agregar normalización es coste sin beneficio.
- ✅ **F2-FE.3 WAL endpoint `.toLowerCase()`**: sigue siendo válido, alinea persistencia con `api-schema-versions.ts`.
- ✅ **F2-FE.4 audit query params (`HttpParams`)**: pendiente, auditoría preventiva.
- ✅ **F2-FE.5 audit headers custom (`X-Request-Id`, `X-Schema-Version`)**: pendiente, auditoría preventiva.

F2-BE puede arrancar en paralelo (commit del brief 004 BE).

## CONTEXTO

Auditoría `/investigate` 2026-05-09 reveló que:

1. BE tiene 4 políticas de casing distintas. HTTP REST con Newtonsoft sin `ContractResolver` → default PascalCase. Comentario en `Program.cs:74` dice "camelCase para coincidir con HTTP" pero no se materializa.
2. FE TS interfaces (`@data/models/**`) son 100% camelCase consistente.
3. `apiResponseInterceptor` NO tiene normalización casing.
4. Hay un mismatch aparente que requiere verificación empírica antes de tocar código (F1).

## SCOPE

### IN

- **F1.1-F1.6** (común — ejecutar si BE no la hizo todavía): verificar empíricamente qué casing emite hoy un endpoint BE en runtime con `curl` o devtools. Documentar resultado en el plan padre.
- **F2-FE.1**: audit `grep -rn "obj\.[A-Z][a-zA-Z]*" src/app/` para detectar acceso PascalCase a fields tipados como camelCase (señal de bug latente Rama C).
- **F2-FE.2**: decidir si agregar `normalizeKeys()` recursivo en `apiResponseInterceptor` (depende del resultado de F1).
- **F2-FE.3**: normalizar `.toLowerCase()` el `WalEntry.endpoint` en `WalService.add()` antes de persistir, alineado con `api-schema-versions.ts:40-83`. Test unit nuevo.
- **F2-FE.4**: audit query params en services (`grep -rn "HttpParams" src/app/`). Confirmar 100% camelCase. Si hay snake_case o PascalCase, normalizar.
- **F2-FE.5**: audit headers custom `X-*` que el FE emite (`X-Request-Id`, `X-Schema-Version`). Confirmar consistencia.
- Validación: `npm run lint && npm run test`.

### OUT

- **F2-BE** (todo lo que requiera tocar `Educa.API/`) — vive en el brief par 004.
- **F3** (analyzers/eslint anti-regresión) — chat dedicado al final del plan.
- **F4** (docs `INV-CONTRACT01/02/03`) — chat dedicado al final del plan.
- Cambiar el contrato de payloads externos (CrossChex webhook, JaaS) — fuera de scope de este plan.

## ENFOQUE PROPUESTO

1. **Coordinación con F1**: leer commit más reciente del plan o del brief par. Si F1 ya fue ejecutada por el chat BE, leer el resultado en `plan/case-drift.md` y saltar a F2-FE. Si no, ejecutar F1 primero (1 chat hace F1, el otro lo aprovecha).
2. **F2-FE.1 audit**: cuantificar bugs latentes Rama C. Si hay 0 → confirmar contrato funciona accidentalmente, F2-FE liviano. Si hay >0 → reparar uno por uno + decisión de interceptor defensivo.
3. **F2-FE.3 WAL normalize**: cambio puntual + test. Verificar que `WalDbService` no rompe en lookups después.
4. **F2-FE.4-5 audits**: si todo limpio, solo documentar. Si hay drift, listar y normalizar.
5. **Validación**: lint + tests + smoke en browser local (admin → ver dashboards / hacer mutation con WAL).

## CRITERIOS DE SALIDA

- F1 documentada en `plan/case-drift.md` con la rama A/B/C confirmada.
- F2-FE.1 reporta count de bugs Rama C (idealmente 0).
- F2-FE.3 commit con WAL endpoint normalize + test verde.
- F2-FE.4-5 cierran sin drift o con drift documentado y listo para fix.
- Lint + tests verdes.
- Brief par BE puede arrancar en paralelo si está bloqueado esperando F1.

## RIESGOS

- Si F1 demuestra Rama C (BE PascalCase + FE accede `obj.id` que llega `undefined`), hay bugs reales en producción que se enmascaran. Reportar y escalar antes de seguir.
- WAL normalize lowercase puede invalidar caches existentes en navegadores con sesión activa. Considerar bump de `DB_VERSION` en `public/sw.js` (ver `rules/service-worker.md`).

## REFERENCIAS

- Plan padre: [`plan/case-drift.md`](../../plan/case-drift.md)
- Hallazgo CORS Expose-Headers: probable bug latente que Plan 41 ya está pagando (BE F2-BE.4 lo desbloquea).
- Convención WAL endpoint paths: [`api-schema-versions.ts`](../../../src/app/shared/constants/api-schema-versions.ts)

## RESULTADO (2026-05-09)

### Audits

- **F2-FE.1** (`grep "obj\.[A-Z]"` en `src/app/`): **0 hallazgos**. Confirma Rama A — el código FE no accede a fields PascalCase en runtime.
- **F2-FE.4** (`HttpParams` keys): 100% camelCase consistente en los 13 services con `HttpParams`. Hallazgo lateral: `health-justification-dialog.component.ts:242-262` usa **FormData PascalCase** (`EstudianteId`, `SalonId`, `Fechas`, `Observacion`). Funciona por model binding case-insensitive de ASP.NET Core, pero rompe convención FE. **Deuda menor** — fuera del scope del brief, candidato a follow-up si se prioriza.
- **F2-FE.5** (headers `X-*`): consistentes en formato `X-Pascal-Case`. Sin drift. (HTTP headers son case-insensitive de todos modos.)

### Cambio aplicado (F2-FE.3)

- [`wal.service.ts`](../../../src/app/core/services/wal/wal.service.ts) — `WalService.normalizeEndpoint()` (helper estático): lowercase del path + preserva query string. Aplicado en `append()` antes de persistir. Comentario referencia INV-CONTRACT03.
- [`wal.service.spec.ts`](../../../src/app/core/services/wal/wal.service.spec.ts) — nuevo. 7 tests (5 normalizeEndpoint + 2 append integration).
- Decisión de diseño: **preservar query string** porque puede llevar valores case-sensitive (ej: `correlationId=ABC123`).

### Validación

- Lint: limpio. 1 warning pre-existente no relacionado (`crosschex-sync-banner.component.spec.ts`).
- WAL specs: **119/119 ✅** (10 archivos).
- Suite full: **1953/1955 ✅**. 2 fallos pre-existentes confirmados con `git stash` (`cursos.facade.spec` cross-tab + `home.component.spec` rol Asistente Administrativo). No relacionados con este brief.

### Aprendizajes

- La normalización `.toLowerCase()` ingenua del endpoint completo rompe valores case-sensitive en query string. **Patrón correcto**: split por `?`, lowercase solo el path, preservar la query.
- `WAL_CACHE_MAP` keys (`@core/services/wal/models/wal.models.ts`) usa nombres de resource camelCase (`'usuarios'`, `'horarios'`) — consistente con la nueva normalización del path.
- F2-FE.4 reveló que el ámbito "casing en contratos REST" excede `HttpParams`: FormData multipart también es vector. El plan original no lo cubría — registrar para F4 si se hace pass barrida.

### Criterios de salida

- ✅ F2-FE.1 reporta 0 bugs Rama C.
- ✅ F2-FE.3 commit con WAL endpoint normalize + 7 tests verdes.
- ✅ F2-FE.4-5 cierran sin drift en scope del brief; drift colateral (FormData) documentado para follow-up.
- ✅ Lint + tests verdes (excepto 2 fallos pre-existentes ajenos).
- N/A F1 ya cerrada antes de arrancar este brief.
