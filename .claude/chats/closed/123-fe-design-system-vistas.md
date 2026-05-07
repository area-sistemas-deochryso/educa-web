# 123 · FE · Design System F5.3.4 — migrar `vistas` admin al estándar

> **Repo destino**: `educa-web` (main)
> **Estado**: 🚧 en curso 2026-05-07
> **Creado**: 2026-05-07 · **Modo aplicado**: `/execute` → `/validate`
> **Origen**: `tasks/design-system-from-usuarios.md` F5.3.4 (#4 del backlog F5.2). Continuación de briefs 120/121/122. Pulleado por `/go` minimal-from-go.

<!-- minimal-from-go -->

## Hallazgos (auditoría rápida)

`src/app/features/intranet/pages/admin/vistas/vistas.component.scss`:

| Pauta | Estado | Acción |
|---|---|---|
| **B1** Container con border, no background | ❌ `.stat-card` L20-22 con `bg: surface-card` + `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` | remover ambas líneas |
| **B3** Stat cards | ✅ anatomía correcta (icon 48×48, valor 1.75rem/700, surface-200) | nada |
| **B6** Filter bar | ✅ ya transparente con border | nada |
| **B2** Page header | (ya en `vistas-header` separado, no scope) | nada |

Adicional fuera de scope estricto: `.loading-container` L109 también tiene `bg: surface-card`. **No tocar** (brief F5.3.4 nombra solo stat-card; queda para barrido futuro).

## Criterio de cierre

- L20 (`background: var(--surface-card)`) y L22 (`box-shadow`) eliminadas de `.stat-card`.
- El global ya da transparencia (`design-system.md` §1).
- Lint + build verdes.
- Marcar F5.3.4 ✅ en `tasks/design-system-from-usuarios.md` y `plan/maestro.md`.
