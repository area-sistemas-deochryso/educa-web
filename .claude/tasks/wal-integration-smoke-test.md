# Task — Smoke test de integración del WAL en browser

> **Creado**: 2026-05-04
> **Origen**: Cierre de DS1 (chat 085, brief `closed/085-wal-sync-engine-split.md`). El subsistema WAL es runtime crítico (todos los CRUD optimistas pasan por él) pero no tiene tests de integración. Vitest cubre unidades aisladas; ningún test ejercita el ciclo real init→recovery→sync→commit con IndexedDB + HTTP + leader election cross-tab + service worker.
> **Scope**: chat dedicado, medio día — definir checklist + ejecutar 1ra ronda. Repetir como smoke después de cambios al WAL.

---

## Contexto

El WAL es el subsistema que soporta la regla `optimistic-ui.md` — **toda mutación CRUD del frontend pasa por `WalFacadeHelper.execute()`**. Si el WAL se rompe, las mutaciones quedan sin persistir o sin rollback determinista. Es runtime crítico.

Hoy hay:
- ~34 specs unitarios (post-DS1) que mockean dependencias.
- 0 tests de integración.
- 0 smoke test formal en browser.

Cualquier cambio al engine (DS1 incluido, futuras optimizaciones, telemetría adicional) se mergea sin red real. La validación local consiste en "¿pasaron los specs?" — eso confirma unidades, no el ciclo completo.

---

## Qué cubrir en el smoke

### Caso 1 — Mutación optimista happy path

1. Login intranet, navegar a un CRUD admin (ej: `/intranet/admin/cursos`).
2. Crear / editar / toggle / eliminar — verificar que la UI **refleja el cambio inmediato** (apply local), luego no parpadea (commit reconcilia sin replace).
3. Verificar en DevTools → Network que el HTTP request salió.
4. Verificar en DevTools → Application → IndexedDB → `educa-wal` que la entry pasó por PENDING → IN_FLIGHT → COMMITTED → eliminada (o permanece según TTL de cleanup).

### Caso 2 — Offline → online recovery

1. Con la página abierta, ir a DevTools → Network → "Offline".
2. Crear / editar 2-3 items rápido. UI debe responder inmediato (apply local). En IndexedDB las entries quedan PENDING.
3. Volver "Online".
4. Verificar que las entries se procesan en orden, suman a la BD del backend, y la UI sigue consistente.

### Caso 3 — Conflicto 409

1. Editar el mismo item desde 2 tabs: tab A guarda, tab B intenta guardar versión vieja.
2. Tab B debe recibir 409 → entry marcada CONFLICT en IndexedDB → callback `onError` ejecutado → toast/UI muestra error → rollback aplicado.

### Caso 4 — Permanent error 4xx

1. Forzar un error de validación 422/400 desde un CRUD (ej: nombre vacío que el server rechaza).
2. Verificar: entry FAILED en IDB, rollback aplicado en UI, mensaje al usuario.

### Caso 5 — Retryable error 5xx

1. Apagar el backend mientras la app está abierta.
2. Hacer un cambio. Entry queda en RETRYING con backoff visible en IDB (`nextRetryAt`).
3. Encender el backend. Entry se procesa al siguiente tick (≤ SYNC_INTERVAL_MS).

### Caso 6 — Cross-tab leader election

1. Abrir 2 tabs con la misma sesión.
2. Tab A es leader. Hacer un cambio en tab B → entry encolada por tab B pero **procesada por tab A** (leader-only processing).
3. Verificar que tab B recibe `entryCommittedByOtherTab$` y invalida su cache (consulta refleja el cambio sin refetch).

### Caso 7 — Recovery on reload

1. Estando offline o con el server caído, hacer un cambio (entry queda PENDING).
2. Recargar la página.
3. Al volver a cargar, `init()` → `recovery.run()` debe identificar y procesar la entry pendiente.

### Caso 8 — Schema migration (REQUIRES_MIGRATION)

1. Crear manualmente una entry en IDB con `schemaVersion` viejo (vía DevTools → Application → IndexedDB → editar JSON).
2. Recargar.
3. `init()` debe emitir `REQUIRES_MIGRATION` y la UI mostrar el banner correspondiente (o el flujo de migración manual del status facade).

---

## Plan de ejecución

### F1 — Definir checklist como doc estable

- [ ] F1.1 Convertir los 8 casos en checklist markdown vivo en `claude-cowork/` (es QA, no Claude Code).
- [ ] F1.2 Cada caso lleva: precondición · pasos exactos · resultado esperado · DevTools query a hacer (Application/Network).

### F2 — Ronda inicial

- [ ] F2.1 Ejecutar los 8 casos sobre el branch `main` actual (post-DS1).
- [ ] F2.2 Documentar findings (lo que falla, lo que pasa con asterisco).
- [ ] F2.3 Si hay fallas, abrir tasks específicos.

### F3 — Disciplina post-DS1

- [ ] F3.1 Acordar trigger: cualquier PR que toque `core/services/wal/` corre el smoke en `claude-cowork/` antes del merge.
- [ ] F3.2 Si pasa, anotar fecha en el checklist; si falla, bloquea el merge.

### F4 — (Opcional, post-smoke) Automatizar

- [ ] F4.1 Evaluar si vale Playwright e2e: el WAL depende de IndexedDB + multi-tab + offline → e2e con Playwright es la única automatización viable.
- [ ] F4.2 Costo de Playwright e2e en este repo: tiene que valer respecto al smoke manual.

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Smoke manual se vuelve teatro (se firma sin ejecutar) | Cada caso pide screenshot + entry específica de IDB. Verificación es objetiva |
| 8 casos toma tiempo | Se hace solo en cambios al WAL, no en cada PR del repo |
| Cross-tab requiere 2 ventanas, multi-tab requiere mismo browser | Documentar setup paso a paso en `claude-cowork/` |
| El fail puede ser flaky (network, timing) | Si un caso falla, repetir 2 veces antes de declararlo regression real |

---

## Criterios de éxito

- [ ] Checklist vive en `claude-cowork/` y los 8 casos están redactados con resultado esperado verificable
- [ ] 1ra ronda ejecutada sobre `main` post-DS1 con resultados anotados
- [ ] Política definida: cambios a `core/services/wal/` exigen smoke antes de merge

## Beneficio

DS1 + tests del hot loop (task vecina) cubren las unidades y la orquestación. El smoke confirma que el sistema **integrado** funciona — IndexedDB + HTTP real + service worker + leader election + cross-tab + recovery. Sin esto, cualquier cambio al subsistema requiere QA manual ad-hoc cada vez, sin garantía de cobertura uniforme.

## Relación con otras tasks

- `wal-sync-engine-tests-hot-loop.md` — tests unitarios directos del engine (otra deuda detectada en DS1). Complementario: aquel cubre la lógica del loop, este cubre el ciclo end-to-end.
- `wal-cache-audit-fixes.md` — hallazgos de auditoría WAL+cache previos. Algunos podrían surgir como bugs durante el smoke.
