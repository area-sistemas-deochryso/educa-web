# Chat 124 · FE · H7 — Normalizar naming WAL_CACHE_MAP

> **Creado**: 2026-05-07 · **Estado**: 🔄 running
> **Plan**: [tasks/wal-cache-audit-fixes.md](../../tasks/wal-cache-audit-fixes.md) — H7
> **Modo sugerido**: /investigate ✅ → /execute → /validate

<!-- minimal-from-go -->

## Scope

Normalizar `WAL_CACHE_MAP` (en `src/app/core/services/wal/models/wal.models.ts`) a 100% camelCase. Hoy mezcla camelCase + kebab-case + PascalCase.

## Mapeo de rename

| Antes | Después |
|---|---|
| `Curso` | `cursos` |
| `Vista` | `vistas` |
| `permisos-rol` | `permisosRol` |
| `PermisoUsuario` | `permisosUsuario` |
| `CursoContenido` | `cursoContenido` |
| `CursoContenidoArchivo` | `cursoContenidoArchivo` |
| `CursoContenidoSemana` | `cursoContenidoSemana` |
| `CursoContenidoTarea` | `cursoContenidoTarea` |
| `TareaArchivo` | `tareaArchivo` |
| `AsistenciaCurso` | `asistenciaCurso` |
| `Calificacion` | `calificacion` |
| `GrupoContenido` | `grupoContenido` |
| `Conversacion` | `conversaciones` |

Las URL keys de `WAL_CACHE_MAP` (los strings `/api/...`) **NO se renombran** — siguen siendo PascalCase porque así son los controllers del BE.

## Archivos afectados (14)

- `src/app/core/services/wal/models/wal.models.ts` (keys del map)
- `src/app/core/services/wal/wal-cross-tab-refetch.service.ts` (JSDoc example)
- `src/app/core/services/wal/wal-facade-helper.service.ts` (JSDoc example)
- `src/app/features/intranet/pages/admin/cursos/services/cursos.facade.ts`
- `src/app/features/intranet/pages/admin/vistas/services/vistas.facade.ts`
- `src/app/features/intranet/pages/admin/permissions-roles/services/permisos-roles.facade.ts`
- `src/app/features/intranet/pages/admin/permissions-users/services/permisos-usuarios-data.facade.ts`
- `src/app/features/intranet/pages/admin/permissions-users/services/permisos-usuarios-crud.facade.ts`
- `src/app/features/intranet/pages/profesor/cursos/services/curso-contenido-data.facade.ts`
- `src/app/features/intranet/pages/profesor/cursos/services/curso-contenido-crud.facade.ts`
- `src/app/features/intranet/pages/profesor/cursos/services/calificaciones.facade.ts`
- `src/app/features/intranet/pages/profesor/classrooms/services/grupos.facade.ts`
- `src/app/features/intranet/pages/profesor/classrooms/services/grupos.facade.spec.ts`
- `src/app/features/intranet/components/schedule/course-details-modal/attachments-modal/attachments-modal.facade.ts`
- `src/app/features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade.ts`

## Criterios de cierre

- WAL_CACHE_MAP keys 100% camelCase.
- Cero referencias PascalCase/kebab-case en literales `resourceType:`.
- Suite verde: lint + build + vitest.
- Task wal-cache-audit-fixes.md marcado H7 ✅.
