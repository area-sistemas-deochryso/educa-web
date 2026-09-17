# Auditoría de cobertura y fidelidad de tests frontend — 2026-09-16

> **Origen**: `/audit` sobre el 100% de `src/app/**/*.spec.ts` (261 archivos, 8 agentes en paralelo por subsistema: core guards/interceptors/auth, WAL/storage/sesión, admin ×3, email-outbox, cross-role, estudiante/profesor/login/shared, público/shared).
> **Objetivo del audit**: verificar que los tests cubren los casos que deben cubrir (no solo happy path) y que realmente fallarían si la implementación se rompe — no solo que "pasan".
> **Contraparte**: ninguna — audit 100% frontend (Vitest), ningún hallazgo requiere cambio de backend.

## Problema

La suite de 261 specs es sólida en general: sin tests deshabilitados (`it.skip`/`xit`/`describe.skip`) en ningún archivo, contratos de seguridad (`*-security.contract.spec.ts`) bien construidos, y la enorme mayoría de servicios core con asserts específicos y cobertura de error real. El audit encontró un subconjunto acotado de problemas reales:

1. ~~**Un test que contradice un invariante documentado**: `wal.service.spec.ts` afirma explícitamente que el endpoint WAL preserva su casing original — viola **INV-CONTRACT03** (debe persistirse en lowercase). La implementación tampoco normaliza: no es solo un test mal escrito, es un gap real entre `business-rules.md` y `WalService.add()`.~~ **Corregido en F1**: la lectura era al revés — el invariante documentado estaba desactualizado (normalización revertida deliberadamente en commit `8b2ccc85` por romper un path case-sensitive real), el test y el código están correctos. Ver brief 689 para el detalle completo.
2. **Tests "Bug"**: 7 specs adicionales donde el assert no verifica lo que el nombre del test promete (tautológicos, guardas condicionales que pueden saltearse silenciosamente, o assert sobre el argumento equivocado del mock) — pasarían igual aunque la lógica real se rompiera.
3. **Mutaciones de seguridad/negocio sin cobertura de error, o directamente sin spec**: gestión de permisos por usuario (`permisos-usuarios-data.facade.ts`, sin spec en absoluto), aprobación de salones finales, mutaciones de grupos con rollback WAL, formulario de contacto público (tiene validación reactiva real y estado de submit, cero cobertura).
4. **Lógica de negocio educativa sin test**: recálculo de promedios por periodo, validación anti-solapamiento de horarios en import masivo, guarda de transición de estado inválida en el kanban de error-groups.
5. **Gaps de infraestructura WAL/integration**: timers no ejercitados con fake timers, `httpMock.verify()` reemplazado por un flush-all silencioso que esconde requests inesperados, servicios con cobertura muy por debajo del tamaño real de su implementación (`notifications.service`, `wal-leader.service`).
6. **Inconsistencias menores**: asserts débiles puntuales, tests redundantes/tautológicos, orden de invocación no verificado donde el propio nombre del test lo promete.

## No-objetivos

- No es un audit de cobertura numérica (%) — es de calidad/fidelidad de los asserts existentes y de gaps concretos en paths de error/rollback/seguridad.
- No se corrigió nada durante el audit (modo `/audit` puro, 8 agentes read-only, sin `npm test` ejecutado — eso corresponde a `/validate` en cada fase de ejecución).
- No incluye hallazgos de código de producción salvo que el test los exponga directamente (F1 toca tanto el test como la falta de normalización real en `WalService`, que es consecuencia directa del mismo gap).
- No cubre E2E/Playwright — el proyecto no tiene esa capa, solo unit/integration Vitest.

## Fases

| Fase | Tema | Severidad dominante | Brief / Estado |
|---|---|---|---|
| F1 | ✅ INV-CONTRACT03 estaba desactualizado, no el código — `wal.service.spec.ts` y `WalService.append()` están correctos (ver brief) | Bug/Regla violada → doc stale | ✅ [689](../chats/closed/689-audit-tests-f1-inv-contract03-wal-casing.md) |
| F2 | Bugs de aserción: 7 specs cuyo assert no verifica lo que el nombre promete (facades admin, error-handler, sync-range-dialog) | Bug | ✅ [690](../chats/running/690-audit-tests-f2-bugs-asserts-debiles.md) |
| F3 | Cobertura de mutaciones críticas de seguridad/aprobación sin test (permisos por usuario sin spec, aprobación de salones, grupos+rollback, contacto público) | Riesgo | ✅ [691](../chats/closed/691-audit-tests-f3-cobertura-seguridad-mutaciones-criticas.md) |
| F4 | Cobertura de lógica de negocio educativa sin test (recálculo de notas, anti-solapamiento de horarios, transición de estado inválida, rollback optimista cursos/faq) | Riesgo | ✅ [692](../chats/closed/692-audit-tests-f4-cobertura-logica-negocio.md) |
| F5 | Gaps de infra WAL/integration (timers, `httpMock.verify()`, wal-leader, notifications.service, storage-security, session-coordinator) | Riesgo | ✅ [693](../chats/closed/693-audit-tests-f5-infra-wal-integration-gaps.md) |
| F6 | Inconsistencias transversales: asserts débiles puntuales, tests tautológicos, orden de invocación no verificado | Inconsistencia | ⏳ [694](../chats/open/694-audit-tests-f6-inconsistencias-transversales.md) |

## Done-when

- [ ] F1-F6 cerrados y verificados.
- [ ] Build + lint + `npm test` en verde tras cada fase.
- [ ] Plan y maestro sincronizados en cada cierre de fase.
- [ ] **Nota de excepción**: los 6 briefs (689-694) se generaron de una sola vez a pedido explícito del usuario 2026-09-16, superando el soft cap de `chats/open/` ≤5 — mismo precedente documentado en `backlog-hygiene.md` para fases de audit deliberadamente pesadas (usado también en `audit-angular22-ts6-2026-09-12.md`, briefs 679-686).

## Fuera de scope

- Hallazgos de severidad Observación de bajo valor — no ameritan brief propio, ver [`tasks/audit-tests-observaciones-menores.md`](../tasks/audit-tests-observaciones-menores.md), se abordan oportunistamente al tocar esos archivos.
- El resto de specs públicos/shared que solo tienen `should create` — aceptable para componentes presentacionales puros (ver criterio en el task file).

## Referencia — criterios usados por los 8 agentes del audit

Para cada spec: (1) ¿cubre el path de error/edge-case además del happy path?, (2) ¿los asserts son específicos o débiles (`toBeTruthy()`/`toBeDefined()` donde debería haber un valor concreto)?, (3) ¿hay tests tautológicos (el mock devuelve X, el test solo confirma que salió X sin ejercitar lógica real)?, (4) ¿hay tests deshabilitados sin razón documentada?, (5) para tests "debería fallar/manejar error": ¿el mock realmente simula el error, o devuelve éxito?, (6) ¿falta cobertura obvia dado el nombre/rol del archivo?
