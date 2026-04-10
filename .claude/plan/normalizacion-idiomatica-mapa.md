# Mapa de Normalización Idiomática — Español → Inglés

> **Generado**: 2026-04-10
> **Decisión**: Código interno en inglés. Todo lo visible al usuario final en español (incluye rutas URL).
> **Alcance**: 8 dominios, ~258 archivos
> **Estrategia**: Por fases (un dominio a la vez), empezando por asistencia
>
> ### Qué NO cambia (visible al usuario)
> - **Rutas URL**: `/intranet/profesor/asistencia`, `/intranet/admin/salones` → se mantienen en español
> - **Segmentos de rol**: `profesor/`, `estudiante/` → se mantienen en español
> - **Labels de menú**: textos visibles en `intranet-menu.config.ts` → español
> - **Feature flags**: `environment.features.horarios` → se mantienen (son config interna pero mapean a rutas)
> - **Endpoints API**: `/api/ConsultaAsistencia` → el backend no cambia
>
> ### Qué SÍ cambia (código interno)
> - Nombres de archivos y carpetas
> - Nombres de clases (PascalCase)
> - Selectores de componentes (`app-xxx`)
> - Imports y barrel exports
> - Paths de `loadComponent` en routes (la ruta del archivo, no el `path:` URL)

---

## Fases de Ejecución

| Fase | Dominio | Archivos aprox | Riesgo | Depende de |
|------|---------|---------------|--------|------------|
| **F1** | Asistencia (attendance) | ~58 | Alto — módulo más grande | Nada |
| **F2** | Reportes Asistencia (attendance-reports) | ~17 | Medio | F1 (comparte servicios) |
| **F3** | Horarios (schedules) | ~59 | Alto — muchos sub-componentes | Nada |
| **F4** | Salones (classrooms) | ~52 | Alto — cross-feature con horarios | F3 (comparte servicios) |
| **F5** | Usuarios (users) | ~48 | Medio | Nada |
| **F6** | Calificaciones (grades) | ~15 | Bajo | Nada |
| **F7** | Permisos (permissions) | ~29 | Medio — core services | Nada |
| **F8** | Eventos Calendario (events-calendar) | ~9 | Bajo | Nada |

### Dependencias entre fases

```
F1 (asistencia) ──→ F2 (reportes-asistencia)
F3 (horarios)   ──→ F4 (salones) — comparten salones-api.service en horarios
F5, F6, F7, F8 son independientes entre sí y de las demás
```

---

## F1: ASISTENCIA → ATTENDANCE (~58 archivos)

### Directorios a renombrar

| Actual | Nuevo |
|--------|-------|
| `src/app/core/services/asistencia/` | `src/app/core/services/attendance/` |
| `src/app/shared/services/asistencia/` | `src/app/shared/services/attendance/` |
| `src/app/features/intranet/pages/admin/asistencias/` | `src/app/features/intranet/pages/admin/attendances/` |
| `src/app/features/intranet/pages/profesor/asistencia/` | `src/app/features/intranet/pages/profesor/attendance/` |
| `src/app/features/intranet/pages/estudiante/asistencia/` | `src/app/features/intranet/pages/estudiante/attendance/` |
| `src/app/features/intranet/components/attendance/asistencia-dia-list/` | `src/app/features/intranet/components/attendance/attendance-day-list/` |

### Archivos — core/services/asistencia/

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `asistencia.service.ts` | `attendance.service.ts` | `AsistenciaService` → `AttendanceService` |
| `asistencia.service.spec.ts` | `attendance.service.spec.ts` | — |
| `asistencia.models.ts` | `attendance.models.ts` | (tipos/interfaces) |
| `index.ts` | `index.ts` | (actualizar re-exports) |

### Archivos — shared/services/asistencia/

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `director-asistencia-api.service.ts` | `director-attendance-api.service.ts` | `DirectorAsistenciaApiService` → `DirectorAttendanceApiService` |
| `profesor-asistencia-api.service.ts` | `teacher-attendance-api.service.ts` | `ProfesorAsistenciaApiService` → `TeacherAttendanceApiService` |
| `estudiante-asistencia-api.service.ts` | `student-attendance-api.service.ts` | `EstudianteAsistenciaApiService` → `StudentAttendanceApiService` |
| `apoderado-asistencia-api.service.ts` | `guardian-attendance-api.service.ts` | `ApoderadoAsistenciaApiService` → `GuardianAttendanceApiService` |
| `index.ts` | `index.ts` | (actualizar re-exports) |

### Archivos — core/services/signalr/

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `asistencia-signalr.service.ts` | `attendance-signalr.service.ts` | `AsistenciaSignalRService` → `AttendanceSignalRService` |

### Archivos — data/models/

| Actual | Nuevo | Tipos |
|--------|-------|-------|
| `asistencia.models.ts` | `attendance.models.ts` | Interfaces de asistencia |
| `asistencia-admin.models.ts` | `attendance-admin.models.ts` | Interfaces de asistencia admin |

### Archivos — features/intranet/pages/admin/asistencias/

| Actual | Nuevo | Clase/Selector |
|--------|-------|----------------|
| `asistencias.component.ts` | `attendances.component.ts` | `AsistenciasComponent` → `AttendancesComponent` / `app-attendances` |
| `asistencias.component.html` | `attendances.component.html` | — |
| `asistencias.component.scss` | `attendances.component.scss` | — |

#### services/ (dentro de admin/asistencias/)

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `asistencias-admin.service.ts` | `attendances-admin.service.ts` | `AsistenciasAdminService` → `AttendancesAdminService` |
| `asistencias-admin.store.ts` | `attendances-admin.store.ts` | `AsistenciasAdminStore` → `AttendancesAdminStore` |
| `asistencias-data.facade.ts` | `attendances-data.facade.ts` | `AsistenciasDataFacade` → `AttendancesDataFacade` |
| `asistencias-crud.facade.ts` | `attendances-crud.facade.ts` | `AsistenciasCrudFacade` → `AttendancesCrudFacade` |
| `asistencias-ui.facade.ts` | `attendances-ui.facade.ts` | `AsistenciasUiFacade` → `AttendancesUiFacade` |

#### models/ (dentro de admin/asistencias/)

| Actual | Nuevo |
|--------|-------|
| `asistencias-admin.models.ts` | `attendances-admin.models.ts` |

### Archivos — features/intranet/pages/profesor/asistencia/

| Actual | Nuevo | Clase/Selector |
|--------|-------|----------------|
| `profesor-asistencia.component.ts` | `teacher-attendance.component.ts` | `ProfesorAsistenciaComponent` → `TeacherAttendanceComponent` |
| `profesor-asistencia.component.html` | `teacher-attendance.component.html` | — |
| `profesor-asistencia.component.scss` | `teacher-attendance.component.scss` | — |

### Archivos — features/intranet/pages/estudiante/asistencia/

| Actual | Nuevo | Clase/Selector |
|--------|-------|----------------|
| `estudiante-asistencia.component.ts` | `student-attendance.component.ts` | `EstudianteAsistenciaComponent` → `StudentAttendanceComponent` |
| `estudiante-asistencia.component.html` | `student-attendance.component.html` | — |
| `estudiante-asistencia.component.scss` | `student-attendance.component.scss` | — |

### Archivos — components/attendance/ (sub-componentes con nombre español)

| Actual | Nuevo | Selector |
|--------|-------|----------|
| `asistencia-dia-list/asistencia-dia-list.component.ts` | `attendance-day-list/attendance-day-list.component.ts` | `app-asistencia-dia-list` → `app-attendance-day-list` |
| `asistencia-dia-list/asistencia-dia-list.component.html` | `attendance-day-list/attendance-day-list.component.html` | — |
| `asistencia-dia-list/asistencia-dia-list.component.scss` | `attendance-day-list/attendance-day-list.component.scss` | — |

### Archivos — profesor/cursos/components/ (sub-componentes de asistencia curso)

| Actual | Nuevo | Selector |
|--------|-------|----------|
| `asistencia-registro-panel/asistencia-registro-panel.component.ts` | `attendance-registration-panel/attendance-registration-panel.component.ts` | actualizar selector |
| `asistencia-registro-panel/asistencia-registro-panel.component.html` | `attendance-registration-panel/attendance-registration-panel.component.html` | — |
| `asistencia-registro-panel/asistencia-registro-panel.component.scss` | `attendance-registration-panel/attendance-registration-panel.component.scss` | — |
| `asistencia-resumen-panel/asistencia-resumen-panel.component.ts` | `attendance-summary-panel/attendance-summary-panel.component.ts` | actualizar selector |
| `asistencia-resumen-panel/asistencia-resumen-panel.component.html` | `attendance-summary-panel/attendance-summary-panel.component.html` | — |
| `asistencia-resumen-panel/asistencia-resumen-panel.component.scss` | `attendance-summary-panel/attendance-summary-panel.component.scss` | — |

### Archivos — profesor/cursos/services/ (store y facade de asistencia curso)

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `asistencia-curso.store.ts` | `attendance-course.store.ts` | `AsistenciaCursoStore` → `AttendanceCourseStore` |
| `asistencia-curso.store.spec.ts` | `attendance-course.store.spec.ts` | — |
| `asistencia-curso.facade.ts` | `attendance-course.facade.ts` | `AsistenciaCursoFacade` → `AttendanceCourseFacade` |
| `asistencia-curso.facade.spec.ts` | `attendance-course.facade.spec.ts` | — |

### Archivos — profesor/models/

| Actual | Nuevo |
|--------|-------|
| `asistencia-curso.models.ts` | `attendance-course.models.ts` |

### Archivos — sub-componentes en salones/ (tabs de asistencia)

| Actual | Nuevo | Selector |
|--------|-------|----------|
| `salon-asistencia-tab/salon-asistencia-tab.component.ts` | `classroom-attendance-tab/classroom-attendance-tab.component.ts` | `app-classroom-attendance-tab` |
| (+ .html y .scss) | (+ .html y .scss) | — |
| `estudiante-asistencia-tab/estudiante-asistencia-tab.component.ts` | `student-attendance-tab/student-attendance-tab.component.ts` | actualizar |
| (+ .html y .scss) | (+ .html y .scss) | — |

### Rutas a actualizar

| Archivo | Path actual | Path nuevo |
|---------|-------------|------------|
| `intranet.routes.ts` | `'profesor/asistencia'` | `'profesor/attendance'` |
| `intranet.routes.ts` | `'estudiante/asistencia'` | `'estudiante/attendance'` |
| `intranet.routes.ts` | `'admin/asistencias'` | `'admin/attendances'` |
| `intranet-menu.config.ts` | Rutas de menú con `asistencia` | Actualizar paths |

### Barrel exports a actualizar

| Archivo | Cambios |
|---------|---------|
| `src/app/core/services/index.ts` | Re-export de `attendance/` en vez de `asistencia/` |
| `src/app/core/services/asistencia/index.ts` | Renombrar a `attendance/index.ts` |
| `src/app/shared/services/index.ts` | Re-export de `attendance/` |
| `src/app/shared/services/asistencia/index.ts` | Renombrar a `attendance/index.ts` |
| `src/app/data/models/index.ts` | Re-export de `attendance.models` y `attendance-admin.models` |

### Imports que se romperán (grep `from.*asistencia`)

Todos los archivos que importan desde paths con "asistencia" necesitarán actualización. Los principales consumidores:
- Componentes de attendance que importan servicios
- `intranet.routes.ts` (lazy imports)
- Barrels de `core/services/` y `shared/services/`
- Componentes de admin, profesor, estudiante
- Tests (.spec.ts)

---

## F2: REPORTES ASISTENCIA → ATTENDANCE-REPORTS (~17 archivos)

### Directorio

| Actual | Nuevo |
|--------|-------|
| `features/intranet/pages/cross-role/reportes-asistencia/` | `features/intranet/pages/cross-role/attendance-reports/` |

### Archivos

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `reportes-asistencia.component.ts` | `attendance-reports.component.ts` | `ReportesAsistenciaComponent` → `AttendanceReportsComponent` |
| `reportes-asistencia.component.html` | `attendance-reports.component.html` | — |
| `reportes-asistencia.component.scss` | `attendance-reports.component.scss` | — |
| `reportes-asistencia-api.service.ts` | `attendance-reports-api.service.ts` | `ReportesAsistenciaApiService` → `AttendanceReportsApiService` |
| `reportes-asistencia.store.ts` | `attendance-reports.store.ts` | `ReportesAsistenciaStore` → `AttendanceReportsStore` |
| `reportes-asistencia.facade.ts` | `attendance-reports.facade.ts` | `ReportesAsistenciaFacade` → `AttendanceReportsFacade` |
| `reportes-asistencia.models.ts` | `attendance-reports.models.ts` | (tipos) |
| `reportes-asistencia.config.ts` | `attendance-reports.config.ts` | (constantes) |

### Sub-componentes

| Actual | Nuevo | Selector |
|--------|-------|----------|
| `reportes-filtros/reportes-filtros.component.*` | `reports-filters/reports-filters.component.*` | actualizar |
| `reportes-resumen/reportes-resumen.component.*` | `reports-summary/reports-summary.component.*` | actualizar |
| `reportes-resultado/reportes-resultado.component.*` | `reports-result/reports-result.component.*` | actualizar |

### Rutas

| Path actual | Path nuevo |
|-------------|------------|
| `'reportes-asistencia'` | `'attendance-reports'` |

---

## F3: HORARIOS → SCHEDULES (~59 archivos)

### Directorios

| Actual | Nuevo |
|--------|-------|
| `pages/admin/horarios/` | `pages/admin/schedules/` |
| `pages/estudiante/horarios/` | `pages/estudiante/schedules/` |
| `pages/profesor/horarios/` | `pages/profesor/schedules/` |

### Componentes principales

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `horarios.component.*` | `schedules.component.*` | `HorariosComponent` → `SchedulesComponent` |
| `profesor-horarios.component.*` | `teacher-schedules.component.*` | `ProfesorHorariosComponent` → `TeacherSchedulesComponent` |
| `estudiante-horarios.component.*` | `student-schedules.component.*` | `EstudianteHorariosComponent` → `StudentSchedulesComponent` |

### Sub-componentes (9 carpetas)

| Actual | Nuevo |
|--------|-------|
| `horarios-filters/` | `schedules-filters/` |
| `horarios-list-view/` | `schedules-list-view/` |
| `horarios-weekly-view/` | `schedules-weekly-view/` |
| `horarios-stats-skeleton/` | `schedules-stats-skeleton/` |
| `horarios-table-skeleton/` | `schedules-table-skeleton/` |
| `horarios-form-dialog/` | `schedules-form-dialog/` |
| `horarios-curso-picker/` | `schedules-course-picker/` |
| `horarios-import-dialog/` | `schedules-import-dialog/` |
| `horario-detail-drawer/` | `schedule-detail-drawer/` |

### Services/Stores/Facades

| Actual | Nuevo |
|--------|-------|
| `horarios-api.service.ts` | `schedules-api.service.ts` |
| `horarios-assignment.service.ts` | `schedules-assignment.service.ts` |
| `horarios-form.store.ts` | `schedules-form.store.ts` |
| `horarios-filter.store.ts` | `schedules-filter.store.ts` |
| `horarios-ui.facade.ts` | `schedules-ui.facade.ts` |
| `horarios-crud.facade.ts` | `schedules-crud.facade.ts` |
| `horarios-data.facade.ts` | `schedules-data.facade.ts` |
| `horarios.store.ts` | `schedules.store.ts` |
| `estudiante-horarios.store.ts` | `student-schedules.store.ts` |
| `estudiante-horarios.facade.ts` | `student-schedules.facade.ts` |

### Models/Utils (8 archivos)

| Actual | Nuevo |
|--------|-------|
| `horario.models.ts` | `schedule.models.ts` |
| `horario.interface.ts` | `schedule.interface.ts` |
| `horario-form.utils.ts` | `schedule-form.utils.ts` |
| `horario-conflict.utils.ts` | `schedule-conflict.utils.ts` |
| `horario-time.utils.ts` | `schedule-time.utils.ts` |
| `horario-error.utils.ts` | `schedule-error.utils.ts` |
| `horario-mapping.utils.ts` | `schedule-mapping.utils.ts` |
| `horario-import.config.ts` | `schedule-import.config.ts` |

### Rutas

| Path actual | Path nuevo |
|-------------|------------|
| `'admin/horarios'` | `'admin/schedules'` |
| `'profesor/horarios'` | `'profesor/schedules'` |
| `'estudiante/horarios'` | `'estudiante/schedules'` |
| `'horarios'` (experimental) | `'schedules'` |

### Feature flags

| Actual | Nuevo |
|--------|-------|
| `environment.features.horarios` | `environment.features.schedules` |

---

## F4: SALONES → CLASSROOMS (~52 archivos)

### Directorios

| Actual | Nuevo |
|--------|-------|
| `pages/admin/salones/` | `pages/admin/classrooms/` |
| `pages/estudiante/salones/` | `pages/estudiante/classrooms/` |
| `pages/profesor/salones/` | `pages/profesor/classrooms/` |
| `pages/profesor/final-salones/` | `pages/profesor/final-classrooms/` |
| `components/attendance/salon-selector/` | `components/attendance/classroom-selector/` |

### Componentes principales

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `salones-admin.component.*` | `classrooms-admin.component.*` | `SalonesAdminComponent` → `ClassroomsAdminComponent` |
| `profesor-salones.component.*` | `teacher-classrooms.component.*` | `ProfesorSalonesComponent` → `TeacherClassroomsComponent` |
| `profesor-final-salones.component.*` | `teacher-final-classrooms.component.*` | `ProfesorFinalSalonesComponent` → `TeacherFinalClassroomsComponent` |
| `estudiante-salones.component.*` | `student-classrooms.component.*` | `EstudianteSalonesComponent` → `StudentClassroomsComponent` |

### Sub-componentes (10+ carpetas)

| Actual | Nuevo |
|--------|-------|
| `salon-detail-dialog/` | `classroom-detail-dialog/` |
| `salon-notas-tab/` | `classroom-grades-tab/` |
| `salon-asistencia-tab/` | `classroom-attendance-tab/` |
| `salon-aprobacion-tab/` | `classroom-approval-tab/` |
| `salon-grupos-tab/` | `classroom-groups-tab/` |
| `salon-notas-estudiante-tab/` | `classroom-student-grades-tab/` |
| `salon-selector/` | `classroom-selector/` |
| `salon-estudiantes-dialog/` | `classroom-students-dialog/` |
| `salones-admin-table/` | `classrooms-admin-table/` |
| `config-calificacion-dialog/` | `config-grade-dialog/` |
| `estudiante-notas-salon-tab/` | `student-classroom-grades-tab/` |
| `estudiante-salon-dialog/` | `student-classroom-dialog/` |

### Services/Stores/Facades

| Actual | Nuevo |
|--------|-------|
| `salones-admin-api.service.ts` | `classrooms-admin-api.service.ts` |
| `salones-admin.store.ts` | `classrooms-admin.store.ts` |
| `salones-admin.facade.ts` | `classrooms-admin.facade.ts` |
| `salones-api.service.ts` (en horarios) | `classrooms-api.service.ts` |
| `estudiante-salones.store.ts` | `student-classrooms.store.ts` |
| `estudiante-salones.facade.ts` | `student-classrooms.facade.ts` |
| `profesor-final-salones-api.service.ts` | `teacher-final-classrooms-api.service.ts` |
| `profesor-final-salones.store.ts` | `teacher-final-classrooms.store.ts` |
| `profesor-final-salones.facade.ts` | `teacher-final-classrooms.facade.ts` |

### Models

| Actual | Nuevo |
|--------|-------|
| `salon.models.ts` (@data) | `classroom.models.ts` |
| `salon.interface.ts` | `classroom.interface.ts` |
| `salon-admin.interface.ts` | `classroom-admin.interface.ts` |
| `profesor-final-salones.interface.ts` | `teacher-final-classrooms.interface.ts` |

### Rutas

| Path actual | Path nuevo |
|-------------|------------|
| `'admin/salones'` | `'admin/classrooms'` |
| `'profesor/salones'` | `'profesor/classrooms'` |
| `'profesor/final-salones'` | `'profesor/final-classrooms'` |
| `'estudiante/salones'` | `'estudiante/classrooms'` |

---

## F5: USUARIOS → USERS (~48 archivos)

### Directorio

| Actual | Nuevo |
|--------|-------|
| `pages/admin/usuarios/` | `pages/admin/users/` |

### Componentes principales + 10 sub-componentes

| Actual | Nuevo |
|--------|-------|
| `usuarios.component.*` | `users.component.*` |
| `usuario-detail-drawer/` | `user-detail-drawer/` |
| `usuario-form-dialog/` | `user-form-dialog/` |
| `usuarios-filters/` | `users-filters/` |
| `usuarios-header/` | `users-header/` |
| `usuarios-stats/` | `users-stats/` |
| `usuarios-stats-skeleton/` | `users-stats-skeleton/` |
| `usuarios-table/` | `users-table/` |
| `usuarios-table-skeleton/` | `users-table-skeleton/` |
| `usuarios-import-dialog/` | `users-import-dialog/` |
| `usuarios-validation-dialog/` | `users-validation-dialog/` |

### Services/Stores/Facades

| Actual | Nuevo |
|--------|-------|
| `usuarios.service.ts` | `users.service.ts` |
| `usuarios.store.ts` | `users.store.ts` |
| `usuarios-ui.facade.ts` | `users-ui.facade.ts` |
| `usuarios-crud.facade.ts` | `users-crud.facade.ts` |
| `usuarios-data.facade.ts` | `users-data.facade.ts` |

### Models/Utils

| Actual | Nuevo |
|--------|-------|
| `usuarios.models.ts` | `users.models.ts` |
| `usuario-form-policies.utils.ts` | `user-form-policies.utils.ts` |
| `usuario-validation.utils.ts` | `user-validation.utils.ts` |
| `usuario-rol-constraints.models.ts` (@shared) | `user-role-constraints.models.ts` |

### Rutas

| Path actual | Path nuevo |
|-------------|------------|
| `'admin/usuarios'` | `'admin/users'` |

---

## F6: CALIFICACIONES → GRADES (~15 archivos)

### Directorio

| Actual | Nuevo |
|--------|-------|
| `pages/profesor/calificaciones/` | `pages/profesor/grades/` |

### Archivos

| Actual | Nuevo |
|--------|-------|
| `profesor-calificaciones.component.*` | `teacher-grades.component.*` |
| `calificaciones-panel/` | `grades-panel/` |
| `calificaciones.store.ts` | `grades.store.ts` |
| `calificaciones.facade.ts` | `grades.facade.ts` |
| `calificacion.models.ts` (feature) | `grade.models.ts` |
| `calificacion.utils.ts` | `grade.utils.ts` |
| `calificacion-config.service.ts` (@intranet-shared) | `grade-config.service.ts` |
| `calificacion-config.utils.ts` | `grade-config.utils.ts` |
| `calificacion.models.ts` (@data) | `grade.models.ts` |

### Rutas

| Path actual | Path nuevo |
|-------------|------------|
| `'profesor/calificaciones'` | `'profesor/grades'` |
| `'estudiante/notas'` | `'estudiante/grades'` (considerar) |

---

## F7: PERMISOS → PERMISSIONS (~29 archivos)

### Directorios

| Actual | Nuevo |
|--------|-------|
| `core/services/permisos/` | `core/services/permissions/` |
| `core/guards/permisos/` | `core/guards/permissions/` |
| `pages/admin/permisos-roles/` | `pages/admin/permissions-roles/` |
| `pages/admin/permisos-usuarios/` | `pages/admin/permissions-users/` |

### Core services

| Actual | Nuevo | Clase |
|--------|-------|-------|
| `permisos.service.ts` | `permissions.service.ts` | `PermisosService` → `PermissionsService` |
| `user-permisos.service.ts` | `user-permissions.service.ts` | `UserPermisosService` → `UserPermissionsService` |

### Guards

| Actual | Nuevo |
|--------|-------|
| `permisos.guard.ts` | `permissions.guard.ts` |
| `permisos.guard.spec.ts` | `permissions.guard.spec.ts` |
| `permisos-security.contract.spec.ts` | `permissions-security.contract.spec.ts` |

### Pages y sub-componentes

| Actual | Nuevo |
|--------|-------|
| `permisos-roles.component.*` | `permissions-roles.component.*` |
| `permisos-usuarios.component.*` | `permissions-users.component.*` |
| `permisos-detail-drawer/` | `permissions-detail-drawer/` |
| `permisos-edit-dialog/` | `permissions-edit-dialog/` |
| `permisos-stats-cards/` | `permissions-stats-cards/` |

### Services/Stores

| Actual | Nuevo |
|--------|-------|
| `permisos-roles.store.ts` | `permissions-roles.store.ts` |
| `permisos-roles.facade.ts` | `permissions-roles.facade.ts` |
| `permisos-usuarios.store.ts` | `permissions-users.store.ts` |
| `permisos-usuarios.facade.ts` | `permissions-users.facade.ts` |
| `permisos-usuarios-helper.service.ts` | `permissions-users-helper.service.ts` |

### Models/Utils

| Actual | Nuevo |
|--------|-------|
| `permisos.models.ts` | `permissions.models.ts` |
| `permisos-modulos.utils.ts` | `permissions-modules.utils.ts` |

### Rutas

| Path actual | Path nuevo |
|-------------|------------|
| `'admin/permisos/roles'` | `'admin/permissions/roles'` |
| `'admin/permisos/usuarios'` | `'admin/permissions/users'` |

---

## F8: EVENTOS-CALENDARIO → EVENTS-CALENDAR (~9 archivos)

### Directorio

| Actual | Nuevo |
|--------|-------|
| `pages/admin/eventos-calendario/` | `pages/admin/events-calendar/` |

### Archivos

| Actual | Nuevo |
|--------|-------|
| `eventos-calendario.component.*` | `events-calendar.component.*` |
| `eventos-calendario.service.ts` | `events-calendar.service.ts` |
| `eventos-calendario.store.ts` | `events-calendar.store.ts` |
| `eventos-calendario.facade.ts` | `events-calendar.facade.ts` |
| `eventos-calendario.models.ts` (@data) | `events-calendar.models.ts` |

### Feature flags

| Actual | Nuevo |
|--------|-------|
| `environment.features.calendario` | `environment.features.calendar` |

### Rutas

| Path actual | Path nuevo |
|-------------|------------|
| `'admin/eventos-calendario'` | `'admin/events-calendar'` |

---

## CROSS-CUTTING: Archivos que se actualizan en TODAS las fases

| Archivo | Qué cambia |
|---------|------------|
| `intranet.routes.ts` | Paths de rutas + lazy imports |
| `intranet-menu.config.ts` | Paths de menú |
| `core/services/index.ts` | Barrel re-exports |
| `shared/services/index.ts` | Barrel re-exports |
| `data/models/index.ts` | Barrel re-exports |
| `environment.ts` | Feature flags (horarios, calendario) |
| `environment.development.ts` | Feature flags |
| `.claude/CLAUDE.md` | Referencias en documentación |
| `.claude/rules/architecture.md` | Rutas de ejemplo |
| `.claude/rules/eslint.md` | Violaciones conocidas |

---

## NOTAS IMPORTANTES

### 1. Rutas de URL vs rutas de archivo
Las rutas de URL en el router (`path: 'admin/attendances'`) son visibles para el usuario. Considerar si se quiere mantener español en las URLs para UX (`/intranet/admin/asistencias` vs `/intranet/admin/attendances`). **Decisión pendiente del usuario.**

### 2. Nombres de roles en paths
Los paths de URL usan roles en español (`profesor/`, `estudiante/`). Estos son parte de la identidad de la app y podrían mantenerse en español. **Decisión pendiente del usuario.**

### 3. Backend no cambia
El backend mantiene naming en español (DTOs, Controllers, etc.). Solo el frontend normaliza a inglés. Los endpoints API (`/api/ConsultaAsistencia`, `/api/Asistencia`) no cambian.

### 4. Orden de ejecución
Cada fase se ejecuta como:
1. Renombrar directorios (de hojas a raíz)
2. Renombrar archivos
3. Actualizar clases/selectores dentro de cada archivo
4. Actualizar imports en consumidores
5. Actualizar barrels
6. Actualizar rutas
7. `npm run lint && npm run build`
