# Sistema de Permisos

El sistema de permisos es **granular por ruta**.

## Niveles de permisos

1. **Permisos por Rol**: Cada rol (Director, Profesor, Apoderado, Estudiante) tiene vistas asignadas
2. **Permisos por Usuario**: Permisos personalizados que sobrescriben los del rol
3. **Verificación exacta**: Tener permiso a `intranet` NO da acceso a `intranet/admin`

## Verificación programática

```typescript
const userPermisosService = inject(UserPermisosService);
if (userPermisosService.tienePermiso('intranet/admin/usuarios')) {
  // mostrar botón
}
```

## Guards de rutas

```typescript
// En app.routes.ts
{
  path: 'admin',
  canActivate: [authGuard, permisosGuard],
  loadComponent: () => import('./admin.component'),
}
```

## Roles disponibles

- Director - Acceso completo a administración
- Profesor - Acceso a gestión de estudiantes y asistencia
- Apoderado - Acceso a información de sus hijos
- Estudiante - Acceso a su propia información
- Asistente Administrativo - Acceso administrativo limitado

## Jurisdicción sobre asistencia (Plan 21 + Plan 23, 2026-04-20)

> **"Ningún profesor audita asistencia de otro profesor. Las correcciones formales las ejecuta el área administrativa."**

La tabla `AsistenciaPersona` es polimórfica (estudiantes + profesores). Las mutaciones desde la vista admin `/intranet/admin/asistencias` están restringidas por rol según el `TipoPersona` del registro afectado (INV-AD06).

| Acción | Sobre Estudiante (`E`) | Sobre Profesor (`P`) |
|--------|-----------------------|---------------------|
| Ver asistencia diaria (read-only) | Director, Asistente Admin, Promotor, Coordinador Académico, Profesor (sus estudiantes tutor), Estudiante (la propia), Apoderado (la de sus hijos) | Director, Asistente Admin, Promotor, Coordinador Académico, Profesor (**solo la propia**) |
| Crear/editar/eliminar registro formal desde admin UI | Director, Asistente Admin, Promotor, Coordinador Académico | Director, Asistente Admin, Promotor, Coordinador Académico |
| Justificar ausencia | Director, Asistente Admin, Promotor, Coordinador Académico | Director, Asistente Admin, Promotor, Coordinador Académico (**nunca el propio profesor ni un colega**) |

**Enforcement**: `AsistenciaAdminController` tiene `[Authorize(Roles = Roles.Administrativos)]` a nivel clase (4 roles administrativos). Verificado por `AsistenciaAdminControllerAuthorizationTests` (6 tests por reflection que rechazan explícitamente Profesor, Apoderado y Estudiante).

**Auto-servicio del profesor**: un profesor puede consultar su propia asistencia (`/profesor/me/mes`, `/profesor/me/dia`) pero NO puede mutarla. Cualquier corrección va por el canal administrativo con correo diferenciado al profesor (INV-AD05).
