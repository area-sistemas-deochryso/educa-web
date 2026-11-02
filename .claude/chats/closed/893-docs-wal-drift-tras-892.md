---
exclusive: true
isolation: main
touches:
  - .claude/documentacion-subsistemas/wal-write-ahead-log.md
  - .claude/documentacion-subsistemas/wal-resilience-degradation.md
  - .claude/context/domain.md
  - .claude/context/integrations.md
  - .claude/reference/optimistic-ui.md
  - .claude/reference/state-management.md
  - .claude/rules/business-rules.md
  - .claude/rules/optimistic-ui.md
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo docs de `.claude/`, sin código).
> **Origen**: brief 892 (FE, idempotencia 409 `IDEMPOTENCIA_EN_CURSO`), commit `085c4e57` en `main` local, sin push. Brief 892 cerrado en `educa-coord/chats/awaiting-prod/`.
> **Creado**: 2026-11-02 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/investigate` (verificar cada afirmación del doc contra el código) → `/execute` (editar los docs) → cierre.
> **modules**: `sistema` (WAL).

## OBJETIVO

Actualizar los docs del WAL que quedaron desactualizados tras el brief 892. Hoy describen 4 estados, no tratan el 409 en curso como caso propio y no documentan el reintento con la misma clave. Los docs que `/end` marcó como skip en el brief 892 quedan en este brief.

## MODO SUGERIDO

Arrancar con `/investigate`. Es un barrido de hechos: por cada doc, verificar contra `src/app/core/services/wal/` qué afirma y qué es cierto hoy. Después `/execute` para editar. Razón: el riesgo es escribir docs con los mismos supuestos que ya fallaron, así que cada claim tiene que salir del código.

## PRE-WORK OBLIGATORIO

- Leer el brief 892 (`educa-coord/chats/awaiting-prod/892-fe-p119-idempotencia-en-curso-wal-feedback.md`), sección «Resolución del /design» y «Estado de ejecución».
- Leer `educa-coord/contracts/api-protocol.md` sección «Idempotency key» (409 en curso y regla de no reenviar con clave nueva).
- Leer `educa-coord/invariants/concurrencia.md` INV-S06.
- No hay worktree: el trabajo corre en `WD/educa-web` sobre `main`. Como es solo `.claude/`, `isolation: main`.

## ALCANCE

Los 8 docs de la tabla de `touches`. Para cada uno, dos cosas: qué es cierto hoy (verificado con `file:line`) y qué hay que cambiar. Si un doc ya está bien para este tema, decirlo y no tocarlo.

Puntos concretos ya detectados (confirmar, no asumir):

1. `documentacion-subsistemas/wal-write-ahead-log.md:254`: lista de estados `PENDING, IN_FLIGHT, COMMITTED, FAILED`. Faltan `CONFLICT`, `REQUIRES_MIGRATION` y `VERIFICACION_PENDIENTE`. Ver `wal.models.ts` (`WalEntryStatus`).
2. `documentacion-subsistemas/wal-write-ahead-log.md:200`: «el servidor rechaza duplicados con 409 Conflict (o acepta sin efecto)». Ya no describe el caso: hay dos 409 distintos. `INV-S05` (conflicto de datos) y `IDEMPOTENCIA_EN_CURSO` (reintentar con la misma clave, sin rollback).
3. `documentacion-subsistemas/wal-write-ahead-log.md:109`: «si el servidor rechaza al reintentar (conflicto) → rollback». Aclarar que aplica al 409 de datos, no al 409 en curso.
4. `documentacion-subsistemas/wal-resilience-degradation.md:167-169` (reglas del circuit breaker): que 409 no cuente sigue siendo cierto. Agregar que el 409 en curso tampoco cuenta (INV-WAL-RES04). Verificar en `wal-in-flight.utils.ts` y `wal-sync-engine.service.ts`.
5. Los 6 docs restantes (`context/domain.md`, `context/integrations.md`, `reference/optimistic-ui.md`, `reference/state-management.md`, `rules/business-rules.md`, `rules/optimistic-ui.md`): buscar menciones de estados, de 409 o de rollback. Si no hay ninguna desactualizada, dejarlos igual y reportarlo.

## TESTS MÍNIMOS

No hay tests de docs. Verificación por grep:

- Cada estado que mencione un doc del WAL existe en `wal.models.ts`.
- Cada `INV-*` nuevo o citado en los docs existe en `educa-coord/invariants/` o en el propio doc.
- Cada `file:line` citado apunta a una línea que existe hoy.

## REGLAS OBLIGATORIAS

- Solo editar archivos de `.claude/`. Cero cambios en `src/`.
- Nada de afirmaciones sin `file:line` verificado en el código.
- Conservar el estilo de cada doc (son docs de dominio en español, con identificadores en inglés).
- Commit en inglés, Conventional Commits, sin `Co-Authored-By`. Sin push.

## IMPLEMENTATION DETAIL (ADR-0006)

Hechos verificados al cerrar el brief 892 (commit `085c4e57`, ya en `main` local):

- **Estados**: `WalEntryStatus` suma `VERIFICACION_PENDIENTE` (`wal.models.ts`). `WalProcessResult` suma `VERIFICATION_PENDING`. `WalStats` suma `verificationPending`.
- **Límite**: `WAL_DEFAULTS.IN_FLIGHT_MAX_RETRIES = 5`. Backoff 2, 4, 8, 16, 30 s (~60 s en total) con la misma clave (`entry.id`).
- **Clasificación**: `classifyWalError` devuelve `in-flight` primero. Un 409 sin `errorCode IDEMPOTENCIA_EN_CURSO` sigue siendo `conflict` (INV-S05).
- **Engine**: rama `in-flight` delega en `handleInFlight` (`wal-in-flight.utils.ts`). Sin `markConflict`, sin rollback, sin `circuitBreaker.recordFailure()`.
- **Agotado**: `VERIFICACION_PENDIENTE`, `onError` con mensaje de `UI_ERROR_CODES`, callback eliminado, sin rollback.
- **Fuera del conteo**: `hasActiveByResourceType` solo cuenta `PENDING` e `IN_FLIGHT`. Una entry en `VERIFICACION_PENDIENTE` no bloquea a las facades.
- **Sin UI**: no hay acción para verificar o descartar. Solo aparece en el conteo de estadísticas y en el mapa de severidad de `correlation-wal-section.component.ts`.
- **Feedback**: va `server-confirmed` (`wal-facade-helper.service.ts`, `executeServerConfirmed`), sin `X-Idempotency-Key`. Por eso nunca recibe 409 en curso.

## APRENDIZAJES TRANSFERIBLES (del brief 892)

- Un `Record<WalEntryStatus, …>` en `correlation-wal-section.component.ts` rompe el build si se agrega un estado nuevo. Cualquier estado nuevo obliga a tocar ese mapa.
- `wal-sync-engine.service.ts` roza el `max-lines` de 300 de lint. Por eso la lógica en-curso vive en `wal-in-flight.utils.ts`.
- Los comentarios de `feedback-report.service.ts` y `feedback-report.facade.ts` decían que el WAL inyecta la clave. Era falso: se corrigieron en el 892.

## FUERA DE ALCANCE

- **Brief 890** (registrar pago, `educa-coord/chats/waiting/`): hay que revisar su regla «cualquier respuesta obliga clave nueva». Es otro brief, con su propia ejecución.
- **Brief 891** (BE, `waiting/`): depende de acciones del usuario en TEST.
- **UI para `VERIFICACION_PENDIENTE`**: decisión de producto, no de docs.
- **Clave en feedback**: brief aparte si se decide.
- **Lint de `main`**: 19 problemas preexistentes en archivos no tocados por el 892.
- **Otros docs del WAL o de otros subsistemas** que no matchean `touches`.

## VALIDACIÓN FINAL

- `git diff --name-only` muestra solo archivos bajo `.claude/`.
- Los greps de TESTS MÍNIMOS pasan.
- Cada doc de ALCANCE tiene una nota de «revisado: cambiado / sin cambios» en el mensaje de cierre.

## CRITERIOS DE CIERRE

- [ ] Los 2 docs del WAL que describen estados y 409 están corregidos, con `file:line`.
- [ ] Los 6 docs restantes revisados (cambiados o confirmados sin cambios).
- [ ] Ninguna afirmación nueva sin verificar contra el código.
- [ ] `git diff` limitado a `.claude/`.
- [ ] Brief movido `open/` → `closed/` en el mismo commit que los docs.

## COMMIT MESSAGE sugerido

`docs(wal): document in-flight 409 and the verification status`

## CIERRE

Preguntar al usuario si quiere ver el diff de los docs antes de commitear, y si el 409 en curso debe llevar también una nota en `wal-resilience-degradation.md`.
