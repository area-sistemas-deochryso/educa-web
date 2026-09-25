# 707 — Refrescar nota de "F5 pendiente" en `doc-watch.md`

> **Origen**: `educa-coord` chat 705 · 2026-09-23 (commit a confirmar cuando 705 cierre)
> **Plan**: `educa-coord/plans/coord-doc-watch-registry.md` (F5)

## CONTEXTO DEL CAMBIO

`educa-coord` implementó (brief 705) el chequeo de "doc watch" en el comando global `/end` — el override local de `educa-web` (`.claude/commands/end.md`) es un **delta liviano real** (solo referencia qué skill de commit usar) y ya hereda el paso nuevo del global sin necesitar edición. **No hace falta tocar `end.md` en este repo.**

Lo único que quedó desactualizado es la nota de "Deuda documentada" en `educa-web/.claude/doc-watch.md`, que todavía dice que F5 está pendiente.

## IMPACTO EN ESTE REPO

En `.claude/doc-watch.md`, sección "## Deuda documentada" (primera bullet): reemplazar

> "...Se refinan orgánicamente cuando F5 (`/end` integration, pendiente) dispare el chequeo de 'dead glob'."

por algo como

> "...Se refinan orgánicamente ahora que F5 (`/end` integration, `educa-coord` brief 705, 2026-09-23) dispara el chequeo de 'dead glob' en cada cierre que matchea alguna fila."

Sin cambios de código ni de `end.md`.

## OUT OF SCOPE

- F6 (validación con un `/end` real) — fase separada del plan.

## Criterio de cierre

- [ ] Nota de "Deuda documentada" en `doc-watch.md` actualizada.
