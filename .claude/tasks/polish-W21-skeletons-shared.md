<!-- created: 2026-05-18 -->

# polish-W21-skeletons-shared

> **Origen**: F1 audit del plan [`intranet-fe-polish-W21.md`](../plan/intranet-fe-polish-W21.md), 2026-05-18.
> **Severidad**: 🟡 (bajó de 🔴 — la mayoría del hallazgo original ya se resolvió, ver verificación 2026-08-20).
> **Verificado 2026-08-20**: 4 de 6 hallazgos originales ya migrados a `app-skeleton-loader`. Quedan 2 componentes con `<i class="pi pi-spinner pi-spin">` crudo.

## Scope

Migrar `pi-spinner` / `p-progressSpinner` / overlays de loading genéricos a los componentes shared `app-skeleton-loader`, `app-table-skeleton`, `app-stats-skeleton` en las pages que cargan datos de API.

## Hallazgos — estado actual (verificado en código, no solo en este doc)

| Archivo / page | Estado | Nota |
|---|---|---|
| `pages/estudiante/schedules/estudiante-horarios.component.html` | ✅ Migrado | `app-skeleton-loader` presente |
| `pages/estudiante/notas/estudiante-notas.component.html` | ✅ Migrado | `app-skeleton-loader` presente, sin spinner residual |
| `pages/profesor/grades/profesor-calificaciones.component.html` | ✅ N/A | Componente refactorizado — ya no es el monolito original, sin spinner propio |
| `pages/profesor/cursos/components/calificaciones-panel/` | ✅ Migrado | `app-skeleton-loader` |
| `pages/profesor/cursos/components/student-files-dialog/` | ✅ Migrado | `app-skeleton-loader` |
| `pages/profesor/cursos/components/student-task-submissions-dialog/` | ✅ Migrado | `app-skeleton-loader` |
| `pages/profesor/cursos/components/attendance-summary-panel/` | ❌ Pendiente | `<i class="pi pi-spinner pi-spin">` crudo (línea ~50) |
| `pages/profesor/cursos/components/attendance-registration-panel/` | ❌ Pendiente | `<i class="pi pi-spinner pi-spin">` crudo (línea ~79) |
| `pages/estudiante/cursos/estudiante-cursos.component.ts` | ❌ Pendiente | `<p-progressSpinner>` crudo (línea ~85) |

## Scope restante (real)

Solo 3 componentes: `attendance-summary-panel`, `attendance-registration-panel` (profesor/cursos) y `estudiante-cursos.component.ts`. El resto ya está migrado.

## Criterio de cierre

- Cada sección con datos de API tiene su skeleton shared correspondiente (no `<p-progressSpinner>` aislado).
- `minHeight` definido en cada `<app-lazy-content>` o equivalente para evitar CLS.
- Tabla de mapeo de `rules/skeletons.md` §"Mapeo de Columnas de Tabla" aplicada a las tablas de notas y evaluaciones.

## Pre-work

- Leer `rules/skeletons.md` completo.
- Leer `rules/lazy-rendering.md` para el patrón `<app-lazy-content>` con multi-fase si se aplica.

## Estimación

Chico (~30-45min). Solo 3 reemplazos puntuales de spinner crudo por `app-skeleton-loader` (sin tablas con columnas que mapear — son paneles/cards simples).
