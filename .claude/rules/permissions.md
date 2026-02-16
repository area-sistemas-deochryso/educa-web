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
