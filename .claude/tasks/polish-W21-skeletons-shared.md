<!-- created: 2026-05-18 -->

# polish-W21-skeletons-shared

> **Origen**: F1 audit del plan [`intranet-fe-polish-W21.md`](../plan/intranet-fe-polish-W21.md), 2026-05-18.
> **Severidad**: 🔴 (drift vs `rules/skeletons.md` — spinners genéricos donde el design-system pide skeleton shared).

## Scope

Migrar `pi-spinner` / `p-progressSpinner` / overlays de loading genéricos a los componentes shared `app-skeleton-loader`, `app-table-skeleton`, `app-stats-skeleton` en las pages que cargan datos de API.

## Hallazgos concretos

| Archivo / page | Patrón actual | Skeleton sugerido |
|---|---|---|
| `pages/estudiante/schedules/` | Loading overlay con spinner genérico | `app-skeleton-loader` (grid de bloques semanales) |
| `pages/estudiante/notas/` | Sin `p-skeleton` | `app-table-skeleton` para la tabla de notas + `app-stats-skeleton` si hay KPIs |
| `pages/profesor/grades/profesor-calificaciones.component.ts` | Solo `ProgressSpinner` | `app-table-skeleton` para tabla de evaluaciones (resuelto si F3 corre) |
| `pages/profesor/cursos/` | spinners genéricos (pi-spinner) sin shared component | `app-skeleton-loader` en secciones de archivos / tareas / evaluaciones |
| `pages/estudiante/cursos/` | Idem profesor/cursos — spinner genérico en `misNotasLoading` | `app-skeleton-loader` consistente con el resto |

> **Nota**: `profesor/grades` absorbido por F3 si se ejecuta primero.

## Criterio de cierre

- Cada sección con datos de API tiene su skeleton shared correspondiente (no `<p-progressSpinner>` aislado).
- `minHeight` definido en cada `<app-lazy-content>` o equivalente para evitar CLS.
- Tabla de mapeo de `rules/skeletons.md` §"Mapeo de Columnas de Tabla" aplicada a las tablas de notas y evaluaciones.

## Pre-work

- Leer `rules/skeletons.md` completo.
- Leer `rules/lazy-rendering.md` para el patrón `<app-lazy-content>` con multi-fase si se aplica.

## Estimación

Medio (~3-4h). Requiere definir `SkeletonColumnDef[]` por cada tabla y reemplazar markup.
