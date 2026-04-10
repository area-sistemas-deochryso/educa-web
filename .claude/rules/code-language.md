# Idioma del Código

## Principio

> **"Código interno en inglés. Todo lo visible al usuario final en español."**

---

## Qué va en inglés (código interno)

| Elemento | Ejemplo |
|----------|---------|
| Nombres de archivos y carpetas | `attendance.service.ts`, `schedules/` |
| Clases y tipos | `AttendanceService`, `SchedulesStore` |
| Selectores de componentes | `app-attendance-day-list` |
| Variables y funciones | `loadStudents()`, `isActive` |
| Interfaces y enums | `AttendanceStatus`, `GradeType` |
| Barrel exports | `export { SchedulesComponent }` |
| Nombres de guards | `permissionsGuard` |
| Paths de `loadComponent` en routes | `import('./pages/admin/schedules')` |
| Tags de logger | `logger.tagged('AttendanceReports', ...)` |

## Qué va en español (visible al usuario)

| Elemento | Ejemplo |
|----------|---------|
| Rutas URL (`path:` en routes) | `path: 'profesor/asistencia'` |
| Títulos de página (`title:` en routes) | `title: 'Intranet - Asistencia'` |
| Labels de menú | `label: 'Horarios'` |
| Textos en templates HTML | `<h2>Gestión de Asistencias</h2>` |
| Mensajes de error/toast | `'Usuario no encontrado'` |
| Placeholders de inputs | `placeholder="Buscar por nombre..."` |
| Feature flags (mapean a rutas) | `environment.features.horarios` |
| Endpoints de API del backend | `/api/ConsultaAsistencia` |
| Comentarios explicativos | `// Validar que el periodo esté cerrado` |

## Nombres de dominio — Glosario

| Español (URL/UI) | Inglés (código) |
|-------------------|-----------------|
| asistencia | attendance |
| horarios | schedules |
| salones | classrooms |
| usuarios | users |
| calificaciones | grades |
| permisos | permissions |
| eventos-calendario | events-calendar |
| reportes-asistencia | attendance-reports |
| profesor | teacher (en clases/archivos) |
| estudiante | student (en clases/archivos) |
| apoderado | guardian (en clases/archivos) |
| director | director (igual en ambos) |
| cursos | courses |

**Nota**: Los segmentos de rol en URLs (`profesor/`, `estudiante/`) se mantienen en español porque son visibles al usuario.

## Al crear código nuevo

```typescript
// ✅ CORRECTO — archivo y clase en inglés, UI en español
// teacher-grades.component.ts
@Component({
  selector: 'app-teacher-grades',
  template: `<h1>Mis Calificaciones</h1>`,
})
export class TeacherGradesComponent { }

// ❌ INCORRECTO — clase en español
// profesor-calificaciones.component.ts
@Component({
  selector: 'app-profesor-calificaciones',
})
export class ProfesorCalificacionesComponent { }
```

## Al tocar código existente

Si un archivo existente aún usa naming en español (quedan algunos archivos internos pendientes de renombrar dentro de carpetas ya renombradas), **renombrarlo en el mismo PR** si el cambio es trivial. No crear PRs dedicados solo para renames individuales.

## Backend

El backend (Educa.API) mantiene naming en español (Controllers, DTOs, Services). Esta regla aplica **solo al frontend**.
