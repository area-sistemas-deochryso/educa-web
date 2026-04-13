# Historial: Normalización Idiomática — Asistencia

> **Completado**: 2026-04-10
> **Estado**: ✅ Cerrado — 8 dominios renombrados español→inglés, 365 archivos modificados
> **Origen**: Evaluación de asistencia en `higiene-estructural.md` (P2.4, 2026-04-08)
> **Resultado**: Código interno en inglés. URLs visibles al usuario en español. Regla documentada en `rules/code-language.md`.
> **Mapa completo**: `normalizacion-idiomatica-mapa.md` (en esta misma carpeta)

---

## Problema

El módulo de asistencia mezcla español (`asistencia-*`) e inglés (`attendance-*`) en nombres de carpetas, archivos y componentes. Esto dificulta grep, navegación y onboarding.

## Inventario de inconsistencias

### Inglés (`attendance-*`)

| Tipo | Archivo/Carpeta | Ubicación |
| --- | --- | --- |
| Carpeta | `components/attendance/` | `features/intranet/` |
| Carpeta | `services/attendance/` | `features/intranet/` |
| Componente | `attendance.component.ts` | `pages/shared/attendance-component/` |
| Componente | `attendance-profesor.component.ts` | `pages/shared/attendance-component/` |
| Componente | `attendance-director.component.ts` | `pages/shared/attendance-component/` |
| Componente | `attendance-estudiante.component.ts` | `pages/shared/attendance-component/` |
| Componente | `attendance-apoderado.component.ts` | `pages/shared/attendance-component/` |
| Componente | `attendance-filter.component.ts` | `components/attendance/` |
| Componente | `attendance-header.component.ts` | `components/attendance/` |
| Componente | `attendance-legend.component.ts` | `components/attendance/` |
| Componente | `attendance-table.component.ts` | `components/attendance/` |
| Componente | `attendance-table-skeleton.component.ts` | `components/attendance/` |
| Servicio | `attendance-view.service.ts` | `services/attendance/` |
| Servicio | `attendance-data.service.ts` | `services/attendance/` |
| Servicio | `attendance-pdf.service.ts` | `services/attendance/` |
| Servicio | `attendance-stats.service.ts` | `services/attendance/` |
| Modelo | `attendance.types.ts` | `pages/shared/attendance-component/models/` |
| Config | `attendance.constants.ts` | `pages/shared/attendance-component/config/` |

### Español (`asistencia-*`)

| Tipo | Archivo/Carpeta | Ubicación |
| --- | --- | --- |
| Carpeta | `shared/services/asistencia/` | `shared/` |
| Carpeta | `pages/admin/asistencias/` | `features/intranet/` |
| Componente | `asistencia-dia-list.component.ts` | `components/attendance/` (¡mezcla!) |
| Componente | `asistencia-registro-panel.component.ts` | `pages/profesor/cursos/components/` |
| Componente | `asistencia-resumen-panel.component.ts` | `pages/profesor/cursos/components/` |
| Componente | `estadisticas-dia.component.ts` | `components/attendance/` |
| Servicio | `asistencia.service.ts` | `shared/services/asistencia/` |
| Servicio | `director-asistencia-api.service.ts` | `shared/services/asistencia/` |
| Servicio | `profesor-asistencia-api.service.ts` | `shared/services/asistencia/` |
| Servicio | `estudiante-asistencia-api.service.ts` | `shared/services/asistencia/` |
| Servicio | `apoderado-asistencia-api.service.ts` | `shared/services/asistencia/` |
| Servicio | `asistencias-admin.service.ts` | `pages/admin/asistencias/services/` |
| Store | `asistencia-curso.store.ts` | `pages/profesor/cursos/services/` |
| Facade | `asistencia-curso.facade.ts` | `pages/profesor/cursos/services/` |
| Modelo | `asistencia.models.ts` | `data/models/` |
| Modelo | `asistencia-admin.models.ts` | `data/models/` |
| Modelo | `asistencia-curso.models.ts` | `pages/profesor/models/` |
| SignalR | `asistencia-signalr.service.ts` | `core/services/signalr/` |

---

## Decisión pendiente

Elegir UN idioma para este módulo y renombrar todo de forma consistente:

- **Opción A**: Todo español (`asistencia-*`) — consistente con dominio, backend y modelos de datos
- **Opción B**: Todo inglés (`attendance-*`) — consistente con convenciones Angular/TS

Considerar que el resto del proyecto también tiene mezclas (ej: `reportes-*` español, `campus-navigation` inglés). La decisión aquí puede sentar precedente para una normalización más amplia.

---

## Checklist de ejecución (cuando se decida)

```
[ ] Decidir idioma estándar
[ ] Renombrar carpetas
[ ] Renombrar archivos
[ ] Actualizar selectores de componentes (app-asistencia-* o app-attendance-*)
[ ] Actualizar clases (PascalCase)
[ ] Actualizar imports y barrel exports
[ ] Actualizar rutas en intranet.routes.ts
[ ] Verificar build + lint
[ ] Actualizar references en CLAUDE.md/architecture.md si aplica
```
