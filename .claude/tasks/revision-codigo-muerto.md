# Revisión de Código Muerto

> **Estado**: Pendiente
> **Origen**: Auditoría de `shared/` en `higiene-estructural.md` (P1.1, 2026-04-08)
> **Prioridad**: Baja — no bloquea nada, pero agrega ruido al navegar

---

## Contexto

Durante la auditoría de `shared/` se encontraron componentes, directivas, pipes y servicios con **0 imports** en todo el codebase. También `BaseRepository` y sus implementaciones no tienen consumidores reales.

Para cada item hay que decidir: **eliminar**, **reactivar** (si era intencional pero falta integrar), o **mantener** (si hay razón válida).

---

## Items sin consumidores en `shared/`

| Tipo | Item | Ubicación | Notas |
| --- | --- | --- | --- |
| Componente | `access-denied-modal` | `shared/components/` | ¿Se planeaba para guard de permisos? |
| Componente | `lazy-content` | `shared/components/` | Wrapper skeleton→contenido, documentado en `lazy-rendering.md` pero sin uso real |
| Componente | `progressive-loader` | `shared/components/` | Sin imports ni uso en templates |
| Componente | `footer` | `shared/components/layout/` | Layout público, ¿se reemplazó? |
| Componente | `header` | `shared/components/layout/` | Layout público, ¿se reemplazó? |
| Directiva | `highlight` | `shared/directives/` | Solo tiene spec, sin uso real |
| Pipe | `truncate` | `shared/pipes/` | Solo tiene spec, sin uso real |
| Servicio | `UiMappingService` | `shared/services/` | Exportado en index.ts pero sin consumidores |

## `@data/repositories/` — sin consumidores activos

| Item | Ubicación | Notas |
| --- | --- | --- |
| `BaseRepository` | `data/repositories/base/` | Clase base, 0 inyecciones |
| `UserRepository` | `data/repositories/user/` | Extiende BaseRepository, 0 inyecciones |
| `NotificationRepository` | `data/repositories/notification/` | Extiende BaseRepository, 0 inyecciones |
| `PaginatedResponse` (tipo) | `data/repositories/base/` | SÍ se importa en 5 servicios como tipo — mover a `@shared/models/` si se elimina el directorio |

---

## Decisión pendiente por item

```
[ ] access-denied-modal — ¿eliminar o integrar con permisosGuard?
[ ] lazy-content — ¿eliminar o adoptar como wrapper estándar?
[ ] progressive-loader — ¿eliminar?
[ ] footer — ¿eliminar o reconectar al layout público?
[ ] header — ¿eliminar o reconectar al layout público?
[ ] highlight — ¿eliminar?
[ ] truncate — ¿eliminar?
[ ] UiMappingService — ¿eliminar o integrar donde falta?
[ ] BaseRepository + implementaciones — ¿deprecar formalmente o eliminar? (mover PaginatedResponse primero)
```
