# 165 — Coord F5: adelgazar índices on-demand de FE y BE

> **Repos afectados**: `educa-web/` + `Educa.API/`.
> **Plan**: [migracion-arquitectura-claude.md §F5](../../plan/migracion-arquitectura-claude.md)
> **Depende de**: chats 162, 164 cerrados.
> **Creado**: 2026-05-14 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/audit` + `/execute`.

## Scope

Revisar el bloque "ÍNDICE BAJO DEMANDA" de cada `CLAUDE.md` y aplicar:

1. Para cada entrada, evaluar:
   - **Trigger ≤30% de los chats típicos** → mantener on-demand.
   - **Trigger >70%** → subir a always-on solo si el archivo es chico (<100 ln). Si es grande, repensar.
   - **Trigger raro pero contenido enorme** → partir el archivo (`/split-catalog`) antes de evaluar.
2. Agregar puntero a `educa-coord/principles/README.md` como entrada on-demand con trigger amplio ("vas a tomar una decisión arquitectónica no trivial — revisa qué elementos del marco aplican").
3. Agregar puntero a `educa-coord/invariants/README.md` con trigger "vas a tocar dominio educativo (asistencia, calificaciones, …) — leé la invariante específica del subdominio".
4. **Objetivo numérico**: índice on-demand del FE ≤25 entradas (hoy ~30). Índice del BE: aplicar mismo criterio.
5. Validar contra `~/.claude/rules/context-budget.md`: bloque always-on ≤200 líneas por CLAUDE.md.

## Out of scope

- Reorganizar reglas always-on que ya pasan el filtro.
- Tocar el contenido de las reglas en sí.

## Criterio de cierre

- `educa-web/.claude/CLAUDE.md` índice on-demand ≤25 entradas.
- `Educa.API/.claude/CLAUDE.md` aplica mismo criterio (anotar conteo final).
- Bloque always-on de cada CLAUDE.md ≤200 ln contando los `@import`.
- Punteros a `educa-coord/principles/` y `educa-coord/invariants/` agregados con trigger claro.

## Tiempo estimado

~45 min.
