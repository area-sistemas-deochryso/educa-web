# Plan 1 — Fase 5: Hardening de Wrappers (cerrar escape hatches)

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Estado**: ⏳ pendiente arrancar
> **Plan padre**: Plan 1 — Enforcement de Reglas (F1-F3 ✅ · F4 parcial ✅ · F5 ⏳).
> **Prioridad**: 🟢 Media — deuda técnica con dueño claro, scope acotado.
> **Estimación**: ~2-3h, un solo chat.
> **Principio**: "Que los wrappers existentes sean el ÚNICO camino, no solo el camino sugerido."

---

## Problem

Los wrappers existen y los lints prohíben bypass cross-capa, pero los barrel exports siguen exponiendo implementaciones internas. Un dev que importa una impl directamente desde el barrel compila sin error — el lint solo bloquea imports desde fuera de la carpeta. Cerrar el escape hatch significa que el barrel solo exponga la facade pública.

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Zones to harden | storage, wal, session (3 zones with stable wrappers) | These have clear public facades; others (cache, auth) need separate audit |
| Barrel reduction | Only export the public facade from each zone's index.ts | Prevents accidental import of internals even within the same layer |
| ESLint enforcement | Add layer-enforcement rule prohibiting direct imports to internal files from outside their folder | Makes the restriction compile-time, not just convention |
| Consumer migration | Migrate existing consumers to public facade before reducing barrel | Avoid breaking existing code |
| Exceptions | eslint-disable with documented reason for rare legitimate cases | Wrapper may not cover 100% of use cases initially |

---

## Phases

### Phase 1 — Audit

Grep all imports from the 3 zones across `src/app/`. Classify each: public facade (OK) vs internal impl (migrate or document exception).

### Phase 2 — Migrate consumers

For each import of an internal impl outside its folder, migrate to the public wrapper. If wrapper doesn't cover the case, add the method (preferred) or document exception.

### Phase 3 — Reduce barrel exports

Replace each zone's `index.ts` to only re-export the public facade.

### Phase 4 — ESLint rule

Add entries in `eslint.config.js` (layer-enforcement plugin) prohibiting direct imports to internal files from outside their respective folder.

### Phase 5 — Validate

Lint, test suite, and production build must all pass green.

---

## Done-when

- Barrel exports of storage/, wal/, session/ only expose their public facade.
- ESLint rule prevents importing internal files from outside each zone's folder.
- All existing consumers migrated to public facade (or documented exception).
- `rules/eslint.md` updated documenting the new rule.
- Lint, tests, and build pass.

---

## Out of scope

- `@core/services/cache/` and `@core/services/auth/` (need separate audit).
- Backend wrappers.
- Other enforcement tasks from `tasks/`.
