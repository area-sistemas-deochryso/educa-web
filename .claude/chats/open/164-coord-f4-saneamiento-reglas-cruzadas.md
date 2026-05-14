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
