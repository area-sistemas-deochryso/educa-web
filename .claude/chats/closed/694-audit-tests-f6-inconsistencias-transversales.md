# 694 — Audit Tests F6: inconsistencias transversales de tests

> **Repo destino**: `educa-web`
> **Plan**: [`audit-tests-frontend-2026-09-16.md`](../../plan/audit-tests-frontend-2026-09-16.md) (Fase F6)
> **Creado**: 2026-09-16 · **Estado**: ✅ cerrado 2026-09-17.
> **MODO SUGERIDO**: `/execute`
> **touches**: `home.component.spec.ts`, `calendary.component.spec.ts`, `schedule.component.spec.ts`, `notificaciones-admin.facade.spec.ts`, `wal-facade-helper.service.spec.ts`, `storage.service.spec.ts`, `mapa-envio-tab.component.spec.ts`, `error-recovery.integration.spec.ts`

## Origen

Hallazgos de `/audit` (2026-09-16), categoría **Inconsistencia** — bajo riesgo funcional individual pero alto ruido de mantenimiento (tests redundantes, asserts que no verifican lo que su nombre sugiere). Agrupados en un solo brief de "housekeeping", siguiendo el mismo formato que [`685-audit-f11-inconsistencias-transversales-menores.md`](../closed/685-audit-f11-inconsistencias-transversales-menores.md) del audit anterior.

## Scope

1. **`home.component.spec.ts:107-110`** — `expect(component.resolvedSlots()).toBeDefined(); expect(Array.isArray(...)).toBe(true)` es un assert débil que no verifica qué widgets se resuelven realmente. Fix: verificar el contenido esperado de `resolvedSlots()` para el rol/escenario del test.
2. **`calendary.component.spec.ts`, `schedule.component.spec.ts`, `home.component.spec.ts`** — el patrón repetido "should render without errors" → `expect(fixture.nativeElement).toBeTruthy()` es redundante con "should create" (mismo componente, mismo assert en la práctica). Fix: eliminarlo o convertirlo en un assert real de contenido renderizado.
3. **`notificaciones-admin.facade.spec.ts`** — le falta la batería de rollback-on-error que su módulo gemelo `eventos-calendario.facade.spec.ts` sí tiene; el helper `wal.fail()` está disponible en el mismo archivo pero nunca se invoca. Fix: agregar los casos de error usando ese helper, y agregar cobertura de `update()` (sin ningún test actualmente).
4. **`wal-facade-helper.service.spec.ts:114-121`** — "apply immediately before WAL append" no compara el orden real de invocación entre ambos mocks, solo que ambos fueron llamados. Fix: capturar el orden de invocación (array de llamadas con `mockImplementation`) y verificar la secuencia.
5. **`storage.service.spec.ts:152-170`** — `clearAll` no verifica `clearScheduleModalsState()` pese a que la implementación real lo incluye. Fix: agregar el assert faltante.
6. **`mapa-envio-tab.component.spec.ts:23`** — `deferFailStatusUpdated$` se crea y se cablea en el mock, pero ningún test lo dispara — el handler del evento SignalR queda sin ejercitar. Fix: agregar un test que emita el subject y verifique la reacción del componente.
7. **`error-recovery.integration.spec.ts:172-183`** — "should extract traceId and errorCode from response body" solo verifica `hasErrors()===true` y `lastError()` definido, sin comprobar que `traceId`/`errorCode` realmente se extrajeron. Fix: verificar el valor extraído contra el fixture usado (`'trace-xyz'`/`'CONCURRENCY_CONFLICT'` o los que correspondan), notando que con status 409 el traceId no se refleja en `message` (solo para `status >= 500`) — ajustar el assert al campo real donde se expone.

## Pre-work

- Los 7 puntos son de bajo riesgo funcional y sin dependencias entre sí — pueden resolverse en cualquier orden, buen candidato para una sola pasada.

## Out of scope

- El resto de hallazgos de mayor severidad (ver F1-F5).
- No es una revisión general de estos archivos, solo los 7 puntos listados.

## Criterio de cierre

- [x] Los 7 puntos resueltos.
- [x] Build + lint + tests OK.
- [x] Plan actualizado: F6 → ✅.
- [x] Maestro actualizado.

## Cierre (2026-09-17)

- Punto 1: `resolvedSlots` con contenido real (vacío por defecto, item resuelto con capability, filtrado sin capability vía `addItem` real — el layout service es singleton por TestBed, recrear el componente no sirve).
- Punto 2: renders redundantes convertidos a asserts DOM (welcome en home, 12 month-cards en calendary, container+calendar en schedule).
- Punto 3: batería rollback `notificaciones-admin` (create/update/toggle/delete con `wal.fail()` + cobertura `update()` inexistente), espejo del gemelo `eventos-calendario`.
- Punto 4: orden real apply→append capturado con array de llamadas.
- Punto 5: `clearAll` con sessionStorage real en `storage.service.spec.ts`.
- Punto 6: el handler de `DeferFailStatusUpdated` vive en `EmailMonitoreoFacade.startHub` (el componente solo consume 2/3 eventos para toasts) — spec nuevo `email-monitoreo.facade.spec.ts` que emite el subject y verifica el reload. Desvío documentado del `touches[]` (agrega `services/email-monitoreo.facade.spec.ts`, sin cambios en prod).
- Punto 7: traceId en `context` + fuera de `message` en 409 (documenta el comportamiento real), errorCode exacto desde `httpDetails.body`.
- Total: 90/90 verdes en los 8 specs tocados. Lint 0 errores, `tsc --noEmit` limpio.

## Tiempo estimado

~2h.
