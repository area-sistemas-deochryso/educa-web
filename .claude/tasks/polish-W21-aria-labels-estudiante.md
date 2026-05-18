<!-- created: 2026-05-18 -->

# polish-W21-aria-labels-estudiante

> **Origen**: F1 audit del plan [`intranet-fe-polish-W21.md`](../plan/intranet-fe-polish-W21.md), 2026-05-18.
> **Severidad**: 🔴 (drift vs `rules/a11y.md` — botones icon-only sin texto alternativo).

## Scope

Agregar `[pt]="{ root: { 'aria-label': '...' } }"` en botones PrimeNG icon-only (sin `label=`) en las pages del rol estudiante y en `profesor/grades`.

## Hallazgos concretos

| Archivo | Líneas | Botones afectados |
|---|---|---|
| `pages/estudiante/schedules/estudiante-hororarios.component.html` | 23-30 | Day selector buttons (Lun, Mar, …) — solo icono/inicial de día sin aria-label |
| `pages/estudiante/notas/...` | TBD | Tags + icon buttons sin `pTooltip` ni `aria-label` (agent reportó "Sin aria-label ni pTooltip en botones/tags") |
| `pages/profesor/grades/profesor-calificaciones.component.ts` | TBD (template inline) | Sin aria-label en elementos interactivos del monolito |

> **Nota**: `profesor/grades` se absorbe en F3 del plan W21 si se ejecuta primero. Si F3 corre antes que esta task, los hallazgos de grades quedan resueltos ahí.

## Criterio de cierre

- Todo botón con `icon=` y sin `label=` tiene `[pt]="{ root: { 'aria-label': 'texto descriptivo' } }"`.
- Los day-selectors de `estudiante/schedules` tienen aria-label completo ("Ver horario del lunes", "Ver horario del martes", etc. — no solo "L"/"M").
- Si hay `pTooltip` debe convivir con `aria-label` (no reemplazarlo — los screen readers no leen tooltips).

## Pre-work

Leer `rules/a11y.md` §"Botones PrimeNG con solo iconos" y §"Patrón pt para accesibilidad".

## Estimación

Chico (~1h). Reemplazo mecánico con re-render manual en browser para verificar nombres descriptivos.
