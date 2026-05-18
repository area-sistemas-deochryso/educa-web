# Brief 192 — Polish W21 · Migrar a skeletons shared

> **Branch**: `main`.
> **Plan**: [`plan/intranet-fe-polish-W21.md`](../../plan/intranet-fe-polish-W21.md) · F4 (brief derivado del audit F1).
> **Task base**: [`tasks/polish-W21-skeletons-shared.md`](../../tasks/polish-W21-skeletons-shared.md).
> **Creado**: 2026-05-18 · **Chat**: 1 · **Estado**: ⏳ pendiente arrancar.

---

## OBJETIVO

Reemplazar spinners genéricos (`pi-spinner`, `p-progressSpinner`, overlays ad-hoc) por componentes shared (`app-skeleton-loader`, `app-table-skeleton`, `app-stats-skeleton`) en las pages de estudiante y profesor/cursos. Cierra drift 🔴 detectado en F1.

## MODO SUGERIDO

Arrancar con `/design` (decidir `SkeletonColumnDef[]` por tabla y mapeo de cada sección). Flujo: `/design` → `/execute` → `/validate` → cierre. Razón: requiere decisión de qué skeleton va dónde y cómo modelar las columnas de las tablas.

## PRE-WORK OBLIGATORIO

- `rules/skeletons.md` completo (jerarquía de 3 niveles + tabla de mapeo).
- `rules/lazy-rendering.md` (patrón `<app-lazy-content>` con multi-fase si aplica).

## ALCANCE

| Página | Patrón actual | Skeleton sugerido |
|---|---|---|
| `pages/estudiante/schedules/` | Loading overlay con spinner genérico | `app-skeleton-loader` (grid de bloques semanales) |
| `pages/estudiante/notas/` | Sin skeleton | `app-table-skeleton` para tabla notas + `app-stats-skeleton` si hay KPIs |
| `pages/profesor/cursos/` | spinners en archivos/tareas/evaluaciones | `app-skeleton-loader` por sección |
| `pages/estudiante/cursos/` | spinner en `misNotasLoading` | `app-skeleton-loader` consistente |

> **Out-of-scope**: `profesor/grades` — absorbido por F3 (brief separado).

Estimación: medio (~3-4h).

## TESTS MÍNIMOS

- Smoke manual: cada sección con datos de API muestra skeleton (no spinner) mientras carga.
- Inspección de network throttling (Slow 3G en DevTools): no hay CLS visible (la altura está reservada).

## REGLAS OBLIGATORIAS

- `rules/skeletons.md` — usar shared components con `minHeight` definido.
- `rules/lazy-rendering.md` — un loading por sección, no global.

## VALIDACIÓN FINAL

- Grep: 0 `<p-progressSpinner>` aislados en las pages del scope (salvo justificación inline).
- `npm run lint` limpio.
- `npm run build` limpio.
- Smoke manual: tabla de notas + bloques semanales renderizan skeleton primero, contenido después, sin saltos de layout.

## CRITERIOS DE CIERRE

- [ ] Cada sección listada tiene skeleton shared en lugar de spinner genérico.
- [ ] `SkeletonColumnDef[]` definidos donde se usan `app-table-skeleton`.
- [ ] `minHeight` declarado en cada `<app-lazy-content>` para evitar CLS.
- [ ] Lint + build limpios.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único con código + move + update maestro.

## COMMIT MESSAGE sugerido

`refactor(intranet): migrate generic spinners to shared skeleton components (polish W21)`

## CIERRE

Confirmar al usuario el render visual de los skeletons (throttled network) antes de commit final.
