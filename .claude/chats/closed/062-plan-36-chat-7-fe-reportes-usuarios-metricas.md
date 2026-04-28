> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 7 · **Fase**: F7 (`/execute`) · **Creado**: 2026-04-27 · **Estado**: ✅ cerrado local 2026-04-28.
> **Validación prod**: ✅ verificada 2026-04-28 — 5 stat cards con patrón B3 (icono lateral, valor grande, label, sublabel) renderizadas correctamente.

---

# Plan 36 Chat 7 FE — Reportes de Usuarios: mejorar métricas

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #6.

## OBJETIVO

Mejorar el diseño de las cards de métricas de la página `/intranet/admin/monitoreo/incidencias/reportes` (componente `feedback-reports`). Las 5 cards actuales (Total / Nuevos / En Progreso / Resueltos / Descartados) se ven muy planas — alinearlas al patrón [`design-system.md` §B3](../../rules/design-system.md) (stat-card con icono lateral, valor grande, label, sublabel).

## RESTRICCIÓN DURA

- Solo HTML/SCSS de las cards.
- Tabla + drawer + filtros + lógica → **NO TOCAR** (regla `crud-patterns.md` prohíbe modificar funcionalidad sin necesidad).

## REGLAS

- [`rules/design-system.md`](../../rules/design-system.md) §B3 (stat-card con icon-right 48×48 `--surface-200`).
- Cada métrica con icono semántico (ej: 📥 Total · 🆕 Nuevos · ⏳ En Progreso · ✅ Resueltos · 🗑️ Descartados).

## VALIDACIÓN

`npm run lint` · `npm run build` · `npm test` (no se esperan tests nuevos, solo HTML/SCSS).

## POST-DEPLOY GATE

Sí — verificación visual.
