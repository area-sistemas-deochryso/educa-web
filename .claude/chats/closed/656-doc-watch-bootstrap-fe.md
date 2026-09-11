# 656 — Doc Watch: bootstrap registro local de educa-web

> **Origen**: `educa-coord` `/sync-maestro` 2026-09-11 (delegado — Cwatch F2, plan cross-repo).
> **Repos afectados**: `educa-web` (solo lectura de código para asignar globs)
> **Plan**: [`educa-coord/plans/coord-doc-watch-registry.md`](../../../educa-coord/plans/coord-doc-watch-registry.md) — F2
> **Creado**: 2026-09-11 · **Estado**: abierto.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: false
> **modules**: docs/coord-infra
> **touches**:
>   - `educa-web`: `.claude/doc-watch.md` (nuevo)

## Scope

F2 del plan Cwatch (`depends_on: [F1]`, F1 ✅ hecho 2026-05-28; F4 — el bootstrap equivalente de `educa-coord` — ya cerrado como referencia en brief coord [652](../../../educa-coord/chats/closed/652-doc-watch-bootstrap-coord.md)):

- Inventariar los docs operativos de `educa-web/.claude/` (`reference/`, `invariants/`, `contracts/`, `context/` si aplica según el plan §1-§2.1).
- Clasificar cada uno como **watchable** / **broad** / **stable** según criterios del plan §2.3.
- Para los watchable: asignar globs de código local (`src/**/...`) que el doc describe.
- Crear `educa-web/.claude/doc-watch.md` con el formato de tabla del plan §2.1 ("Local registry": `Doc | Watches | Scope`), sección "Broad docs" aparte, stable excluidos.

## Pre-work

- Leer plan completo `educa-coord/plans/coord-doc-watch-registry.md` (ADR-0006: tratar como intención/contrato, no blueprint — la cifra "~170 docs" y ejemplos son orientativos, confirmar contra el `ls` real de `.claude/`).
- Revisar `chats/closed/652-doc-watch-bootstrap-coord.md` (mismo trabajo, ya ejecutado en coord) como referencia de formato y de las decisiones de scope que tomó esa pasada (ej. `chats/**` y `plans/*.md` excluidos por ser trackers, no docs de código vigente — aplicar el mismo criterio acá con `chats/**` local).

## Out of scope

- F3 (bootstrap `Educa.API/.claude/doc-watch.md`) — brief 657, chat separado en ese repo.
- F5 (modificar `/end` en `claude-config` para leer los registros) — chat separado en `claude-config`.
- F6 (validación con `/end` real) — depende de F2+F3+F4+F5, chat separado.

## Criterio de cierre

- [x] `educa-web/.claude/doc-watch.md` existe con la tabla completa (`Doc | Watches | Scope`).
- [x] Todos los docs relevantes de `educa-web/.claude/` clasificados (watchable/broad/stable) — broad en sección aparte, stable excluidos.
- [x] Watchable docs tienen al menos un glob de código local (`src/**/...`).
- [x] `educa-coord/plans/coord-doc-watch-registry.md` actualizado: F2 marcado ✅ (edición cross-repo, coordinar con coord al cerrar — ver `COORD.md` §1 sobre planes cross-repo).

## Tiempo estimado

~1 chat (mecánico, alto volumen — mismo tamaño que F4/652).
