# 164 — Coord F4: saneamiento de reglas cruzadas FE↔BE

> **Repos afectados**: `educa-web/` + `Educa.API/` + `educa-coord/`.
> **Plan**: [migracion-arquitectura-claude.md §F4](../../plan/migracion-arquitectura-claude.md)
> **Depende de**: chat 162 cerrado (invariants ya partidos).
> **Creado**: 2026-05-14 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/audit` primero, luego `/design`, luego `/execute`.

## Scope

Eliminar las referencias cross-repo en `rules/` y `context/`. Cada repo queda hablando solo de su stack; lo compartido vive en `educa-coord/`.

### Tareas

1. **`educa-web/.claude/rules/backend.md` (~600 ln)** — auditar:
   - ¿Duplica reglas que ya viven en `Educa.API/.claude/rules/`? → borrar.
   - ¿Es síntesis "FE-friendly" del BE útil para chats FE? → mover a `educa-coord/contracts/backend-overview-for-frontend.md` y referenciar on-demand desde el CLAUDE.md del FE.
2. **`Educa.API/.claude/rules/frontend.md`** (si existe equivalente) — mismo tratamiento simétrico.
3. **`educa-web/.claude/context/api-endpoints.md`** + **`Educa.API/.claude/context/api-endpoints.md`** — consolidar en `educa-coord/contracts/api-catalog.md`. Ambos `.claude/` lo referencian on-demand.
4. **Glosario** — si `context/domain.md` existe en ambos repos con contenido similar, consolidar en `educa-coord/glossary/domain.md`.
5. Actualizar los `CLAUDE.md` para que los punteros on-demand apunten a `educa-coord/` donde corresponda.

## Out of scope

- Reglas puramente FE (a11y, design-system, primeng, capacitor, …) → quedan en `educa-web`.
- Reglas puramente BE (controllers, EF, analyzers, performance) → quedan en `Educa.API`.
- Adelgazar el índice on-demand del FE (volumen total) → F5.

## Criterio de cierre

- `grep -r "\.\./Educa\.API" educa-web/.claude/` vacío salvo planes históricos cerrados.
- `grep -r "\.\./educa-web" Educa.API/.claude/` vacío salvo planes históricos cerrados.
- `educa-coord/contracts/api-catalog.md` existe y está referenciado desde ambos CLAUDE.md como on-demand.
- 3 commits separados.

## Tiempo estimado

~2 sesiones. **Riesgo medio** — decidir caso por caso qué duplica vs qué es síntesis útil.

---

## Cierre — 2026-05-15

✅ Cerrado en 1 chat. Resultados:

| Acción | Resultado |
|---|---|
| Tarea 1 — `rules/backend.md` | Borrado (659 ln) — 90% duplicado, 10% extraído a 4 contratos en `educa-coord/contracts/` |
| Tarea 2 — BE `frontend.md` simétrico | No-op (no existía) |
| Tarea 3 — `context/api-endpoints.md` | Borrado en ambos repos (-191 FE, -68 BE), consolidado en `educa-coord/contracts/api-catalog.md` |
| Tarea 4 — `context/domain.md` | Adelgazados ambos (-38 FE, -30 BE); intersección en `educa-coord/glossary/domain.md` + prefijos en `db-fields.md` |
| Tarea 5 — CLAUDE.md punteros | Reemplazados por sección "Contratos cross-repo" en ambos repos |
| Bonus — drift refs | `drift-map.md` + `drift-check.md` FE reapuntados a `educa-coord/` |

### Commits
1. `educa-coord` `1f6351e` — feat(contracts,glossary): extract cross-repo wire shape and dominio (+681 ln, 6 archivos)
2. `educa-web` `3634fb7` — refactor(.claude): drop duplicated backend rules; reference educa-coord (-883/+36)
3. `educa-web` `53256e2` — fix(.claude): retarget drift-map and drift-check to educa-coord (-15/+15)
4. `Educa.API` `04745bf` — refactor(.claude): drop duplicated api-endpoints; reference educa-coord (-138/+64)
5. `Educa.API` `1ad49aa` — chore(crosschex): WIP secret rotation config bind (chat 157) — commit aparte de WIP no relacionado del chat 157

### Criterio de cierre

- ✅ `grep -r "\.\./Educa\.API" educa-web/.claude/` solo retorna comandos operativos legítimos (drift-check, daily-report, hooks) y briefs históricos — **0 refs en rules/context activos**.
- ✅ `grep -r "\.\./educa-web" Educa.API/.claude/` solo retorna `agents/README.md` que apunta al `code-reviewer.md` compartido — **0 refs en rules/context**.
- ✅ `educa-coord/contracts/api-catalog.md` existe y está referenciado on-demand desde ambos CLAUDE.md.
- ✅ 3 commits separados de F4 (+ 1 follow-up natural + 1 commit aparte de WIP).

### Hallazgos / deuda

- `tasks/design-patterns-backend.md:120` cita `.claude/rules/backend.md` como destino futuro de un TODO — referencia conceptual a actualizar cuando se ejecute el task (destino será `Educa.API/.claude/rules/` o `educa-coord/contracts/`).
- Brief 168 abierto cita `Educa.API/.claude/rules/backend.md` que nunca existió — bug del propio brief 168, no de F4.
- Considerar follow-up: mover `code-reviewer.md` a `educa-coord/agents/` (hoy vive en FE pero es cross-stack).

**F5** (adelgazar índices on-demand a ≤25 entradas) es la fase natural siguiente.
