# code-language (override de educa-web)

> Política universal: ver `~/.claude/rules/code-language.md`. Acá viven el glosario del dominio y los detalles del stack Angular + Educa.API.

## Tabla de elementos del stack (frontend)

### En inglés (código interno)

| Elemento | Ejemplo |
|---|---|
| Archivos y carpetas | `attendance.service.ts`, `schedules/` |
| Clases y tipos | `AttendanceService`, `SchedulesStore` |
| Selectores | `app-attendance-day-list` |
| Variables y funciones | `loadStudents()`, `isActive` |
| Interfaces y enums | `AttendanceStatus`, `GradeType` |
| Barrel exports | `export { SchedulesComponent }` |
| Guards | `permissionsGuard` |
| Paths de `loadComponent` | `import('./pages/admin/schedules')` |
| Tags de logger | `logger.tagged('AttendanceReports', ...)` |

### En español (visible al usuario)

| Elemento | Ejemplo |
|---|---|
| Rutas URL (`path:`) | `path: 'profesor/asistencia'` |
| Títulos de página (`title:`) | `title: 'Intranet - Asistencia'` |
| Labels de menú | `label: 'Horarios'` |
| Textos en HTML | `<h2>Gestión de Asistencias</h2>` |
| Mensajes de error/toast | `'Usuario no encontrado'` |
| Placeholders | `placeholder="Buscar por nombre..."` |
| Feature flags (mapean a rutas) | `environment.features.horarios` |
| Endpoints de API del backend | `/api/ConsultaAsistencia` |

## Glosario de dominio

| Español (URL/UI) | Inglés (código) |
|---|---|
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

## Backend (Educa.API)

El backend mantiene naming en español (Controllers, DTOs, Services). Esta regla aplica **solo al frontend**. Los DTOs consumidos desde Angular se mapean a tipos en inglés en la capa `@data/`.

## Convivencia con código heredado

Si un archivo existente aún usa naming en español (quedan algunos archivos internos pendientes de renombrar dentro de carpetas ya renombradas), **renombrarlo en el mismo PR** si el cambio es trivial. No crear PRs dedicados sólo para renames individuales.

## Ejemplo

```typescript
// ✅ archivo y clase en inglés, UI en español
// teacher-grades.component.ts
@Component({
  selector: 'app-teacher-grades',
  template: `<h1>Mis Calificaciones</h1>`,
})
export class TeacherGradesComponent { }

// ❌ clase en español
// profesor-calificaciones.component.ts
@Component({
  selector: 'app-profesor-calificaciones',
})
export class ProfesorCalificacionesComponent { }
```
