# educa-web

Aplicación Angular 21 para gestión educativa con portal público e intranet privada.

## Stack

- **Frontend**: Angular 21, TypeScript 5.9, NgRx Signals, PrimeNG 21, Vitest
- **Backend**: ASP.NET Core 8, Entity Framework Core, SQL Server (Azure)
- **PWA**: Service Worker con cache offline (SWR + Network-first)
- **Integraciones**: CrossChex Cloud (asistencia biométrica), Firebase (push), SendGrid (email), WhatsApp

## Comandos

```bash
npm start              # Dev server (puerto 4201)
npm run build          # Build producción
npm test               # Vitest
npm run lint           # ESLint
npm run lint:fix       # ESLint auto-fix
```

## Dominio del Negocio

### Entidades Principales

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

### Jerarquía de Usuarios

| Rol | Acceso | Permisos Principales |
| --- | --- | --- |
| **Director** | Total | CRUD completo de usuarios, salones, cursos, asistencias |
| **AsistenteAdministrativo** | Administrativo limitado | Gestión de salones, consultas, reportes |
| **Profesor** | Gestión de aula | Ver estudiantes de sus salones, marcar asistencia |
| **Apoderado** | Consulta | Ver asistencias de sus hijos, recibir notificaciones |
| **Estudiante** | Consulta mínima | Ver su propia información |

### Flujos Principales

#### 1. Asistencia Automática (CrossChex Cloud)

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

#### 2. CRUD Administrativo (Usuarios, Salones, Cursos)

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

#### 3. Permisos Granulares

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

## Arquitectura Frontend

### Patrón por Feature

```text
features/intranet/pages/admin/usuarios/
├── usuarios.component.ts          # Container (Smart) - consume facade
├── usuarios.component.html        # Template con lazy-content + tabla
├── usuarios.component.scss        # Estilos
├── components/                    # Presentational (Dumb)
│   ├── usuarios-form-dialog/     # Formulario de creación/edición
│   ├── usuarios-table-skeleton/  # Skeleton para lazy rendering
│   └── usuarios-stats/            # Cards de estadísticas
└── services/
    ├── usuarios.store.ts          # Estado reactivo (signals privados)
    └── usuarios.facade.ts         # Orquestación (RxJS → signals)
```

### Flujo de Datos (CRUD Optimizado)

```typescript
// 1. Usuario hace clic en "Guardar"
onSave() { this.facade.save(data); }

// 2. Facade decide estrategia
save(data) {
  if (data.id) {
    // EDITAR: Mutación quirúrgica (no refetch)
    this.api.update(data).subscribe(() => {
      this.store.updateItem(data.id, data); // Solo actualiza 1 fila
    });
  } else {
    // CREAR: Refetch items only (necesita ID del servidor)
    this.api.create(data).subscribe(() => {
      this.refreshItemsOnly(); // Recarga lista pero NO stats ni skeletons
      this.store.incrementarEstadistica('total', 1);
    });
  }
}

// 3. Template se actualiza automáticamente (signals + OnPush)
// - CREAR: Lista completa se refresca
// - EDITAR/TOGGLE/ELIMINAR: Solo la fila afectada cambia
// - Stats se actualizan incrementalmente (sin refetch)
// - Paginación/ordenamiento se mantienen (stateStorage="session")
```

### Convenciones de Datos Importantes

| Campo Backend | Transformación Frontend | Notas |
| --- | --- | --- |
| `EST_DNI` | `.padLeft(8, '0')` | DNI siempre 8 dígitos con ceros a la izquierda |
| `EST_Estado` | `boolean` | `true` = Activo, `false` = Inactivo |
| `EST_CorreoApoderado` | `string` | Email para notificaciones de asistencia |
| `ASI_Estado` | `"Incompleta" / "Completa"` | Incompleta = solo entrada, Completa = entrada + salida |
| Fechas | `DateTime` (ISO 8601) | Backend en UTC, frontend convierte a local |
| `WorkNo` (CrossChex) | `EST_DNI` | Número de empleado = DNI del estudiante |

### APIs Backend Disponibles

#### Auth & Permisos

- `POST /api/auth/login` - Login (retorna token + permisos)
- `GET /api/permisos/usuario` - Permisos del usuario actual

#### Administración (Director/AsistenteAdmin)

- `GET /api/usuarios` - Listar usuarios con filtros
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/{id}` - Actualizar usuario
- `DELETE /api/usuarios/{id}` - Eliminar usuario
- `PUT /api/usuarios/{id}/estado` - Toggle estado activo/inactivo

#### Salones & Cursos

- `GET /api/salones` - Listar salones (grado + sección + sede)
- `POST /api/salones` - Crear salón
- `PUT /api/salones/{id}` - Actualizar salón
- `DELETE /api/salones/{id}` - Eliminar salón
- `GET /api/cursos` - Listar cursos
- `POST /api/cursos` - Crear curso
- `PUT /api/cursos/{id}` - Actualizar curso

#### Asistencias

- `GET /api/asistencias` - Consultar asistencias con filtros (mes, grado, sección)
- `POST /api/asistencias/webhook` - Webhook de CrossChex (automático)
- `POST /api/asistencias/manual` - Registro manual de asistencia
- `GET /api/asistencias/reporte-pdf` - Generar PDF de reporte mensual

### Notificaciones Multi-Canal

Cuando se registra una asistencia (entrada/salida):

1. **Push Notification** (Firebase)
   - `NotificationChannel.EnqueueAsync()` - Cola asíncrona
   - Enviado al dispositivo móvil del apoderado (app)

2. **Email** (SendGrid)
   - `EmailNotificationService.EnviarNotificacionAsistencia()`
   - Template HTML con datos del estudiante + fecha/hora + sede

3. **WhatsApp** (Futuro)
   - Integración pendiente con API de WhatsApp Business

## Reglas por tema

@.claude/rules/reading-optimization.md
@.claude/rules/code-style.md
@.claude/rules/comments.md
@.claude/rules/regions.md
@.claude/rules/debug.md
@.claude/rules/architecture.md
@.claude/rules/state-management.md
@.claude/rules/signals.md
@.claude/rules/rxjs.md
@.claude/rules/templates.md
@.claude/rules/testing.md
@.claude/rules/git.md
@.claude/rules/feature-flags.md
@.claude/rules/eslint.md
@.claude/rules/backend.md
@.claude/rules/permissions.md
@.claude/rules/storage.md
@.claude/rules/service-worker.md
@.claude/rules/a11y.md
@.claude/rules/primeng.md
@.claude/rules/lazy-rendering.md
@.claude/rules/dialogs-sync.md
@.claude/rules/crud-optimization.md
@.claude/rules/enforcement.md
@.claude/rules/quality-gate.md
@.claude/rules/pwa-ios.md

## Servicios Automáticos (Backend)

### Hangfire Jobs

| Job | Schedule | Descripción |
| --- | --- | --- |
| `SincronizarAsistenciaMatutina` | `*/5 8-10 * * *` | Sincroniza asistencias desde CrossChex Cloud cada 5 min (8:00-10:59 AM) |

### CrossChex Cloud API

- **Base URL**: `https://api.us.crosschexcloud.com`
- **Rate Limit**: 30 segundos entre páginas (paginación)
- **Autenticación**: API Key + Secret → Token JWT temporal
- **Endpoints usados**:
  - `authorize.token` - Obtener token
  - `attendance.record.getRecord` - Obtener registros de asistencia

## Archivos de configuración

| Archivo | Propósito |
| --- | --- |
| `angular.json` | Angular CLI config |
| `tsconfig.json` | TypeScript con path aliases |
| `eslint.config.js` | ESLint 9 flat config |
| `vite.config.ts` | Vitest config |
| `src/app/config/environment*.ts` | Variables de entorno |
| `public/sw.js` | Service Worker (cache + offline) |

## URLs Importantes

| Ambiente | Frontend | Backend API |
| --- | --- | --- |
| **Development** | `http://localhost:4201` | `https://localhost:7102` |
| **Production** | `https://educaweb.com` | `https://educacom.azurewebsites.net` |

## Repositorios

| Proyecto | Rama | Remote |
| --- | --- | --- |
| **Frontend** (educa-web) | `main` | `origin/main` |
| **Backend** (Educa.API) | `master` | `origin/master` |
