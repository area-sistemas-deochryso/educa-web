# Drift Map — Dependencias Código a Documentación

Mapa de qué documentación revisar cuando un área del código cambia (o viceversa). Usado por `/drift-check` para contextualizar hallazgos.

---

## Frontend (educa-web)

### Core Services

| Carpeta código | Documentación dependiente |
|----------------|--------------------------|
| `core/services/wal/` | `rules/optimistic-ui.md` |
| `core/services/auth/` | `rules/permissions.md`, `context/api-endpoints.md` |
| `core/services/storage/` | `rules/storage.md` |
| `core/services/sw/` | `rules/service-worker.md` |
| `core/services/cache/` | `rules/service-worker.md` |
| `core/services/signalr/` | `context/integrations.md` |
| `core/services/speech/` | `rules/feature-flags.md` |
| `core/services/notifications/` | `rules/feature-flags.md` |
| `core/services/permisos/` | `rules/permissions.md` |
| `core/services/feature-flags/` | `rules/feature-flags.md` |
| `core/services/capacitor/` | `rules/capacitor.md` |
| `core/services/feedback/` | `rules/business-rules.md` (sección 16) |
| `core/store/` | `rules/state-management.md`, `rules/crud-patterns.md` |
| `core/interceptors/` | `rules/rate-limiting.md`, `context/api-endpoints.md` |

### Shared

| Carpeta código | Documentación dependiente |
|----------------|--------------------------|
| `shared/components/skeleton-loader/` | `rules/skeletons.md`, `rules/lazy-rendering.md` |
| `shared/components/layout/` | `rules/architecture.md` |
| `shared/constants/module-registry.ts` | `rules/menu-modules.md` |
| `shared/constants/app-roles.ts` | `rules/permissions.md`, `rules/semantic-types.md` |

### Features

| Carpeta código | Documentación dependiente |
|----------------|--------------------------|
| `features/intranet/pages/admin/` | `rules/crud-patterns.md`, `rules/architecture.md` |
| `features/intranet/pages/cross-role/attendance*/` | `rules/business-rules.md` (sección 1) |
| `features/intranet/pages/cross-role/reportes-asistencia/` | `rules/business-rules.md` (sección 1) |
| `features/intranet/shared/config/intranet-menu.config.ts` | `rules/menu-modules.md` |

### Configuración

| Archivo código | Documentación dependiente |
|----------------|--------------------------|
| `src/app/config/environment.ts` | `rules/feature-flags.md` |
| `src/app/config/environment.development.ts` | `rules/feature-flags.md` |
| `tsconfig.json` (paths) | `rules/code-style.md` |
| `eslint.config.js` | `rules/eslint.md` |
| `angular.json` | `project-structure/config-files.md` |
| `capacitor.config.ts` | `rules/capacitor.md` |

---

## Backend (Educa.API)

| Carpeta código | Documentación dependiente |
|----------------|--------------------------|
| `Controllers/` | `context/api-endpoints.md`, `rules/backend.md` |
| `Services/` | `rules/backend.md` |
| `Repositories/` | `rules/backend.md` |
| `Models/` | `rules/backend.md`, `rules/business-rules.md` |
| `DTOs/` | `rules/backend.md` |
| `Constants/` | `rules/business-rules.md`, `rules/semantic-types.md` |
| `Middleware/` | `rules/backend.md` |
| `Exceptions/` | `rules/backend.md` |
| `Hubs/` | `context/integrations.md` |
| `Helpers/Auth/` | `rules/backend.md`, `rules/business-rules.md` (sección 7) |

---

## Documentación cruzada (docs que dependen de otros docs)

| Documento | Depende de |
|-----------|------------|
| `CLAUDE.md` | Todos los `@`-refs a rules/, context/, project-structure/ |
| `plan/maestro.md` | Links a planes específicos, tasks |
| `rules/menu-modules.md` | `shared/constants/module-registry.ts` |
| `rules/eslint.md` | `eslint.config.js` |
| `rules/architecture.md` | Estructura real de `src/app/` |
| `rules/business-rules.md` | Código BE que implementa invariantes |
| `context/api-endpoints.md` | Controllers BE reales |

---

## Cómo usar este mapa

1. **En drift-check**: Cuando un check falla, cruzar con este mapa para sugerir qué doc actualizar
2. **En code review**: Antes de mergear, verificar si el cambio toca una carpeta listada aquí y si la doc correspondiente necesita update
3. **En planificación**: Al diseñar un cambio, listar qué docs se verán afectados
