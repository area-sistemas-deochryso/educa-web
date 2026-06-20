# 326 — P66 F3: Implement dependency guidance component

> **Created**: 2026-06-17
> **Plan**: [xrepo-66-dependency-guidance.md](../../../educa-coord/plans/xrepo-66-dependency-guidance.md)
> **Repos**: `educa-web`
> **Origin**: P66 F1 (brief 324) mapped dependencies, F2 designed the component

## MODO SUGERIDO

`/execute`

## Objective

Build and apply the `<app-dependency-guidance>` shared component per the F2 design.

## F2 Design (from plan file)

**Strategy: hybrid placement.**

- **1 missing dependency** → inline `⚠` card next to the empty control with message + link button.
- **≥2 missing** → consolidated banner at page top. Checklist: `✅ Entity (N)` present, `❌ Entity — [Create ↗]` missing.

**Component API**: `DependencyCheck[]` — each entry:
```ts
{ label: string, satisfied: boolean, count?: number, targetUrl: string, targetLabel: string }
```

**Behavior**:
- Links open in new tab (`target="_blank"`)
- Disappears when all dependencies satisfied (reactive via signals)
- Messages in Spanish

## Scope

1. Build `DependencyGuidanceComponent` in `@shared/components`
2. Apply to **Horarios page** (3 deps: salones, cursos, profesores) — highest friction
3. Other admin pages deferred unless real user friction observed

## Reference

- Brief 324 findings: dependency map + rescoped chains
- P66 plan file: full F2 design spec

## Out of scope

- Backend changes
- Pages beyond Horarios (deferred per F2 decision)
- Seed data dependencies (grados, períodos, sedes — infrastructure, not operational)
