# 167 — Coord F7: auditoría final + ADR de cierre

> **Repos afectados**: los 3.
> **Plan**: [migracion-arquitectura-claude.md §F7](../../plan/migracion-arquitectura-claude.md)
> **Depende de**: chats 160-166 cerrados.
> **Creado**: 2026-05-14 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/audit`.

## Scope

Verificar que la migración cerró limpia y dejar el ADR que congela la decisión.

### Checks

1. `grep -r "\.\./Educa\.API" educa-web/.claude/` → vacío salvo planes históricos cerrados (history/).
2. `grep -r "\.\./educa-web" Educa.API/.claude/` → vacío salvo planes históricos.
3. `grep -r "business-rules.md" educa-web/.claude/ Educa.API/.claude/` → solo menciones en history/commits.
4. Cada `CLAUDE.md` always-on ≤200 líneas (siguiendo `~/.claude/rules/context-budget.md`).
5. `educa-coord/principles/` tiene 17 `claude.md` + 17 `human.md` (skeletons OK).
6. `educa-coord/invariants/` tiene todos los IDs `INV-*` originales (compare counts).
7. `educa-coord/COORD.md` documenta protocolo cross-repo completo.
8. Abrir un chat dummy desde `educa-web/` y confirmar que NO carga reglas de BE en el contexto inicial.

### Entregables

1. Escribir `educa-coord/decisions/0001-arquitectura-coord-folder.md` (ADR) con:
   - Contexto: dolor de contexto inflado + cross-repo `Read`.
   - Decisión: 3 repos (FE, BE, coord), reglas duras de §2.2 del plan.
   - Consecuencias: lo que se gana / lo que se pierde / cómo se revierte.
   - Estado: `accepted`.
2. Crear brief de seguimiento para F8 (deuda voluntaria) si hay `human.md` que el equipo quiere completar pronto.

## Out of scope

- Empezar F8 acá.
- Cambios al código fuente.

## Criterio de cierre

- 8 checks de arriba pasan.
- ADR-0001 commiteado en `educa-coord/`.
- Plan `migracion-arquitectura-claude.md` marcado como ✅ cerrado en el maestro del FE (con puntero al ADR).

## Tiempo estimado

~30 min.

---

## Nota sobre briefs adicionales

El plan estima 10-12 chats. Estos 8 (chats 160-167) cubren los **mínimos obligatorios** (fases F1, F1b, F2, F3, F4, F5, F6, F7). Pueden surgir briefs adicionales durante la ejecución si:

- F2 requiere partir un dominio más fino que lo planeado (ej: `asistencia.md` se vuelve 3 archivos).
- F4 descubre más reglas cruzadas de las inventariadas.
- F8 se activa (poblar `human.md` de los 17 principios — deuda voluntaria, 0-17 briefs sueltos).
- Surgen ADRs cross-repo nuevos durante la migración.

Cuando aparezcan, crear brief con numeración continua (`168+`) referenciando al chat origen.
