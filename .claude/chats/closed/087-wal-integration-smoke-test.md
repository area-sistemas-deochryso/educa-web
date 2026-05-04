# 087 — Smoke test de integración del WAL en browser (claude-cowork)

> **Repo destino**: `educa-web` (main, solo agrega doc en `claude-cowork/`) · **Tipo**: QA + docs
> **Origen**: Cierre de DS1 (chat 085, brief `closed/085-wal-sync-engine-split.md`). El subsistema WAL es runtime crítico sin tests de integración hoy.
> **Creado**: 2026-05-04 · **Estado**: ⏳ pendiente arrancar
> **Modo sugerido**: `/design` corto (definir el checklist como doc estable) → ejecución en sesión Cowork QA

## CONTEXTO INMEDIATO

Toda mutación CRUD del frontend pasa por `WalFacadeHelper.execute()` (regla `optimistic-ui.md`). Si el WAL se rompe, las mutaciones quedan sin persistir o sin rollback determinista.

Cobertura hoy (post-DS1):
- Vitest: ~34 specs unitarios — mockean dependencias.
- Tests de integración: 0.
- Smoke browser formal: 0.

Cualquier cambio al WAL (DS1, futura optimización, telemetría) se mergea sin red de integración real. La validación local consiste en "¿pasaron los specs?" — eso confirma unidades, no el ciclo completo (IndexedDB + HTTP + service worker + leader election + cross-tab).

## OBJETIVO

Definir y ejecutar 1ra ronda de un checklist de smoke browser de **8 casos** (ver task) que cubra:

1. Optimistic happy path (CRUD admin)
2. Offline → online recovery
3. Conflict 409 (mismo item desde 2 tabs)
4. Permanent error 4xx (validación rechazada)
5. Retryable error 5xx (backend caído + backoff)
6. Cross-tab leader election (entry encolada en tab B procesada por tab A)
7. Recovery on reload (entry pendiente sobrevive al reload)
8. Schema migration (`REQUIRES_MIGRATION` desde IDB con schemaVersion viejo)

## SCOPE

### Producto

- Checklist en `claude-cowork/wal-integration-smoke.md` con: precondición · pasos exactos · resultado esperado verificable · DevTools query (Application/Network).
- Política: cualquier PR que toque `core/services/wal/` corre el checklist antes del merge.

### Plan completo

Ver `tasks/wal-integration-smoke-test.md` con F1-F4.

### Out of scope

- Tests unitarios del engine (eso es el chat 086)
- Automatización con Playwright e2e (F4 opcional, evaluable después de la 1ra ronda manual)
- Cambios al código del WAL durante el smoke — si algún caso falla, abrir task aparte

## CRITERIOS DE ÉXITO

- [ ] `claude-cowork/wal-integration-smoke.md` con los 8 casos redactados con resultado verificable
- [ ] 1ra ronda ejecutada sobre `main` post-DS1, findings anotados
- [ ] Si hay fallas, abiertas como tasks específicos
- [ ] Política definida en doc: cambios a `core/services/wal/` exigen smoke antes de merge

## REFERENCIAS

- Task: `tasks/wal-integration-smoke-test.md`
- Subsistema: `src/app/core/services/wal/`
- Regla canónica: `rules/optimistic-ui.md`
- Brief origen: `closed/085-wal-sync-engine-split.md`
- Setup Cowork: `claude-cowork/SETUP-COWORK.md`
