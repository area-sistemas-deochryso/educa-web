# Dominio del Negocio

## Entidades Principales

```text
Director / AsistenteAdministrativo (admin completo)
    └── Sedes (instituciones educativas)
        ├── Grados (1°, 2°, 3°, etc.)
        │   └── Secciones (A, B, C)
        │       └── Salones (aulas físicas)
        │           ├── Estudiantes (alumnos)
        │           │   ├── Apoderados (padres/tutores)
        │           │   └── Asistencias (entrada/salida)
        │           ├── Profesores (docentes asignados)
        │           └── Cursos (materias)
        └── Dispositivos CrossChex (control biométrico)
```

## Jerarquía de Usuarios

| Rol | Acceso | Permisos Principales |
| --- | --- | --- |
| **Director** | Total | CRUD completo de usuarios, salones, cursos, asistencias |
| **AsistenteAdministrativo** | Administrativo limitado | Gestión de salones, consultas, reportes |
| **Profesor** | Gestión de aula | Ver estudiantes de sus salones, marcar asistencia |
| **Apoderado** | Consulta | Ver asistencias de sus hijos, recibir notificaciones |
| **Estudiante** | Consulta mínima | Ver su propia información |

## Flujos Principales

### 1. Asistencia Automática (CrossChex Cloud)

```text
Estudiante marca biométrico en dispositivo CrossChex
    ↓
CrossChex Cloud API registra evento
    ↓
Hangfire Job (cada 5 min, 8:00-10:59 AM)
    ↓
Backend: SincronizarAsistenciaDelDia()
    ├── Obtiene registros del día desde CrossChex API
    ├── Filtra DNIs ya registrados
    ├── Registra entrada/salida en BD
    └── Envía notificaciones
        ├── Push (Firebase) → App móvil del apoderado
        ├── Email (SendGrid) → Correo del apoderado
        └── (Futuro) WhatsApp → Teléfono del apoderado
```

### 2. CRUD Administrativo (Usuarios, Salones, Cursos)

```text
Admin selecciona "Nuevo" en módulo
    ↓
Dialog se abre con formulario
    ↓
Admin completa datos y presiona "Guardar"
    ↓
Facade → API → Backend
    ├── CREAR: Refetch items only (necesita ID del servidor) + actualizar stats
    ├── EDITAR: Mutación quirúrgica local (no refetch) + actualizar fila
    ├── TOGGLE: Mutación quirúrgica local + actualizar stats incrementales
    └── ELIMINAR: Mutación quirúrgica local + actualizar stats incrementales
    ↓
Tabla actualiza solo el registro afectado (mantiene paginación/ordenamiento)
```

### 3. Permisos Granulares

```text
Usuario inicia sesión
    ↓
Backend: AuthService.Login()
    ├── Valida credenciales
    ├── Obtiene permisos (VistaRol + VistaUsuario)
    └── Retorna token + permisos
    ↓
Frontend: AuthStore guarda en SessionStorage
    ↓
Router: permisosGuard verifica ruta exacta
    ├── Tener "intranet" NO da acceso a "intranet/admin"
    └── Tener "intranet/admin/usuarios" SÍ da acceso a "intranet/admin/usuarios/nuevo"
    ↓
UI: UserPermisosService controla visibilidad de botones/secciones
```
