# Plan 36 — Rediseño UX/UI de las páginas internas de Monitoreo

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Plan**: 36 · Fecha creación: 2026-04-27 · Estado: ⏳ pendiente arrancar
> **Repo**: `educa-web` (main) — FE-only
> **Prioridad**: media. Continuación natural de Plan 35 (hub Monitoreo).

---

## Problem

Plan 35 reagrupó las 7 entradas en 1 hub + 3 dominios con shells. Queda pendiente revisar el diseño interno de cada sub-página para coherencia con el hub y el Design System. El plan empieza con auditoría del usuario — sin diagnóstico, no hay rediseño.

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Approach | Investigation-first: Chat 1 pregunta problemas concretos al usuario antes de decidir qué tocar | Evita rediseñar por gusto; el scope real depende de la respuesta del usuario |
| Scope constraint | Solo HTML/SCSS, no TS de lógica de negocio | Restricción dura: no modificar funcionalidad existente |
| Trazabilidad de Errores | Posiblemente fuera de scope (Plan 34 rediseño reciente) | Tocarla es destructivo; Chat 1 confirma explícitamente |
| Grouping of fixes | Por dominio (Correos/Incidencias/Seguridad) o por tipo (polish batch) según hallazgos | Decisión post-Chat 1 |

---

## Phases

### Chat 1 — /investigate (sin código)

Abrir con cuestionario de 3 preguntas por página (7 páginas). Para cada una el usuario dice: ✅ rediseñar / 🟡 ajuste menor / ⏭️ no tocar. Producir acta con decisión binaria documentada.

### Chat 2-N — /design + /execute (según hallazgos)

Cantidad de chats se decide después del Chat 1. Heurística: 1-2 rediseños profundos → 1 chat por página; 3+ → chats por dominio; ajustes menores → 1 chat agrupado de polish.

---

## Done-when

- Chat 1 produjo decisión documentada para las 7 páginas.
- Cada página ✅ tiene rediseño ejecutado respetando Design System.
- Cada página 🟡 tiene sus ajustes implementados.
- Páginas ⏭️ no se tocaron.
- Tests verdes, lint OK, build OK, browser check manual de cada página tocada.
- Coherencia visual con el hub Plan 35.

---

## Out of scope

- Hub `/intranet/admin/monitoreo` (ya rediseñado en Plan 35).
- Shells de navegación (Correos/Incidencias).
- Cambios de funcionalidad (carga de datos, filtros, mutaciones).
- Features nuevos o endpoints nuevos.

---

## Dependencies

- Plan 35 (hub + shells deben existir, aunque no necesitan estar en producción para arrancar).
