# Dominio (perspectiva FE)

> Entidades, jerarquía de usuarios y flujo CrossChex viven en `educa-coord/glossary/domain.md` (cross-repo). Este archivo cubre lo específico del FE: módulos por rol intranet, patrón CRUD optimista, flujo de permisos.

## Módulos por Rol (Intranet)

### Admin (Director)

- Usuarios, Salones, Cursos, Horarios, Eventos Calendario
- Permisos (por rol y por usuario), Vistas
- Notificaciones admin, Campus 3D

### Profesor

- Asistencia (marcar en clase), Calificaciones
- Cursos (contenido, tareas, archivos — 16 sub-componentes)
- Horarios (ver personal), Salones, Foro, Mensajería
- Final Salones (cierre de notas por periodo)

### Estudiante

- Asistencia (ver propia), Cursos (ver inscritos), Notas
- Horarios, Salones, Foro, Mensajería

### Apoderado

- Asistencia de hijos, Notificaciones

### Shared (cross-rol)

- Home/Dashboard, Asistencia general (por rol), Calendario, Videoconferencias

---

## Flujo CRUD Optimista (Usuarios, Salones, Cursos, etc.)

```text
Admin selecciona "Nuevo" / "Editar" / "Eliminar" en módulo
    ↓
Dialog se abre con formulario (o confirm para eliminar)
    ↓
Admin completa datos y presiona "Guardar"
    ↓
Facade → wal.execute({ optimistic: { apply, rollback }, http$, onCommit })
    ├── apply: muta el store INMEDIATO (UI no espera al server)
    ├── http$: dispara request al BE
    ├── onCommit: reconcilia campos derivados del server (rowVersion, ID real)
    └── onError: el engine llama rollback() automático
    ↓
Estrategia por operación:
    ├── CREAR: Refetch items only (necesita ID del servidor) + stats incremental
    ├── EDITAR: Mutación quirúrgica local (no refetch) + actualizar fila
    ├── TOGGLE: Mutación quirúrgica local + stats incremental
    └── ELIMINAR: Mutación quirúrgica local + stats incremental
    ↓
Tabla actualiza solo el registro afectado (mantiene paginación/ordenamiento)
```

Detalle completo en `rules/optimistic-ui.md` y `rules/crud-patterns.md`.

---

## Flujo de Permisos Granulares (FE)

```text
Usuario inicia sesión
    ↓
Backend retorna token + permisos (VistaRol + VistaUsuario)
    ↓
Frontend: AuthStore guarda permisos en SessionStorage
    ↓
Router: permisosGuard verifica ruta exacta antes de activar
    ├── Tener "intranet" NO da acceso a "intranet/admin"
    └── Tener "intranet/admin/usuarios" SÍ da acceso a "intranet/admin/usuarios/nuevo"
    ↓
UI: UserPermisosService.tienePermiso(ruta) controla visibilidad de botones/secciones
```

Detalle completo en `rules/permissions.md`.
