# Revisión de Código Muerto

> **Estado**: Completado
> **Fecha cierre**: 2026-04-09
> **Origen**: Auditoría de `shared/` en `higiene-estructural.md` (P1.1, 2026-04-08)

---

## Decisiones tomadas

| Item | Consumidores | Decisión |
|------|-------------|----------|
| `access-denied-modal` | 0 | **Eliminado** |
| `lazy-content` | 0 | **Eliminado** — documentado pero nunca adoptado |
| `progressive-loader` | 0 | **Eliminado** |
| `footer` / `header` (layout) | 1 (main-layout) | **Mantenido** — parte del layout público |
| `highlight` directiva | 0 | **Eliminado** |
| `truncate` pipe | 0 | **Eliminado** |
| `UiMappingService` | 10+ consumidores | **Mantenido** — activamente usado |
| `BaseRepository` | 0 (solo sus hijos) | **Eliminado** con hijos |
| `UserRepository` | 0 | **Eliminado** |
| `NotificationRepository` | 0 | **Eliminado** |
| `PaginatedResponse` | 8 servicios | **Movido** a `@shared/models/pagination.models.ts` |

## Acciones ejecutadas

1. Movido `PaginatedResponse` de `@data/repositories/base/` a `@shared/models/pagination.models.ts` (reemplaza `PaginatedResult`)
2. Actualizado 8 imports de `@data/repositories` → `@shared/models`
3. Movido `QueryParams` type inline a `@data/models/notification.models.ts`
4. Eliminadas carpetas: `access-denied-modal`, `lazy-content`, `progressive-loader`, `highlight`, `truncate`, `data/repositories/`
5. Limpiados barrels: `shared/components/index.ts`, `shared/directives/index.ts`, `shared/pipes/index.ts`, `data/index.ts`
6. Eliminados 2 re-exports temporales sin consumidores: `layout/intranet-layout`, `services/calificacion-config`
7. Build y lint verificados
