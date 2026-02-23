# Arquitectura Frontend

## Estructura del Proyecto

```text
src/app/
├── config/          # Environments (production, development), cache config
├── core/            # Singleton: servicios, guards, interceptors, helpers, store global
├── data/            # Capa de datos: repositories, adapters, models
├── shared/          # Reutilizable sin lógica de negocio: components, pipes, directives
└── features/        # Módulos lazy-loaded por dominio: public, intranet
```

---

## core/ — Infraestructura y servicios singleton

**Criterio**: Todo lo que es singleton, cross-cutting o infraestructura de la app.

```text
core/
├── guards/
│   ├── auth/                    # authGuard (sesión activa)
│   └── permisos/                # permisosGuard (ruta autorizada)
├── helpers/                     # logger, DebugService
├── initializers/                # Hooks de inicialización de app
├── interceptors/
│   ├── api-response/            # Normalización de respuestas API
│   ├── auth/                    # Agrega Bearer token automático
│   ├── error/                   # Manejo centralizado de errores HTTP
│   └── trace/                   # Request tracing (correlationId)
├── services/                    # ~20 carpetas, organizadas por DOMINIO
│   ├── asistencia/              # Servicio de asistencia
│   ├── auth/                    # Autenticación (models, service)
│   ├── blob/                    # Blob storage
│   ├── cache/                   # Invalidación de cache + versionado
│   ├── cursos/                  # Gestión de cursos
│   ├── destroy/                 # Utilidades de lifecycle
│   ├── error/                   # ErrorHandlerService (toasts de error)
│   ├── feature-flags/           # Feature flags (Facade + Store)
│   ├── grados/                  # Niveles/grados educativos
│   ├── http/                    # Base HTTP wrapper
│   ├── keyboard/                # Atajos de teclado + config
│   ├── modal/                   # Gestión de diálogos/modales
│   ├── notifications/           # Toasts + config
│   ├── permisos/                # Permisos (models, service, user-permisos)
│   ├── speech/                  # Reconocimiento de voz + commands config
│   ├── storage/                 # Abstracción 3 niveles:
│   │   ├── session-storage      #   SessionStorage (tokens, auth)
│   │   ├── preferences-storage  #   LocalStorage (preferencias UI)
│   │   ├── indexed-db           #   IndexedDB (datos grandes)
│   │   └── storage.service      #   Facade unificado
│   ├── sw/                      # Service Worker management
│   ├── trace/                   # Request tracing (Facade + Store)
│   ├── user/                    # Perfil de usuario
│   └── usuarios/                # Gestión de usuarios
├── store/                       # AuthStore global (NgRx Signals)
└── utils/                       # Utilidades generales
```

**Patrón interno de cada servicio**: Carpeta por dominio con `{domain}.service.ts`, `{domain}.models.ts`, `index.ts`.

---

## data/ — Capa de datos (Repository Pattern)

**Criterio**: Acceso a datos, transformación y modelos del dominio.

```text
data/
├── adapters/
│   ├── asistencia/              # Transforma respuestas de asistencia
│   ├── base/                    # Adaptadores base reutilizables
│   └── date/                    # Transformación de fechas
├── models/                      # Interfaces del dominio
└── repositories/
    ├── base/                    # BaseRepository con CRUD genérico
    ├── asistencia/              # Repository de asistencia
    ├── auth/                    # Repository de autenticación
    ├── notification/            # Repository de notificaciones
    └── user/                    # Repository de usuarios
```

**Patrón**: `BaseRepository` provee CRUD genérico; repositorios específicos lo extienden.

---

## shared/ — Componentes y utilidades reutilizables

**Criterio**: Sin lógica de negocio, genérico, reutilizable en cualquier feature.

```text
shared/
├── components/
│   ├── layout/                  # Shells: footer, header, intranet-layout, main-layout
│   ├── skeleton-loader/         # Primitiva base (text, circle, rect, card)
│   ├── table-skeleton/          # Skeleton de tabla configurable (SkeletonColumnDef[])
│   ├── stats-skeleton/          # Skeleton de cards de estadísticas
│   ├── lazy-content/            # Wrapper skeleton → contenido real
│   ├── responsive-table/        # Tabla responsive mobile/desktop
│   ├── progressive-loader/      # Carga progresiva de contenido
│   ├── form-error/              # Mostrar errores de validación
│   ├── form-field-error/        # Error por campo de formulario
│   ├── toast-container/         # Contenedor de notificaciones toast
│   ├── floating-notification-bell/ # Campana de notificaciones
│   ├── access-denied-modal/     # Modal de permiso denegado
│   ├── login/                   # Componente de login reutilizable
│   ├── voice-button/            # Botón de reconocimiento de voz
│   ├── sections/                # Helpers de layout por secciones
│   └── devtools/                # Herramientas de desarrollo
├── services/
│   └── admin/                   # AdminUtilsService (helpers para vistas admin)
├── directives/                  # highlight, table-loading, uppercase-input
├── pipes/                       # truncate
├── validators/                  # Validadores custom de formularios
├── interfaces/                  # Tipos compartidos
├── models/                      # Modelos compartidos
└── constants/                   # Constantes compartidas
```

---

## features/ — Módulos lazy-loaded por dominio

**Criterio**: Cada feature es una unidad de negocio independiente, lazy-loaded.

### features/public/ — Portal público (sin autenticación)

```text
features/public/pages/
├── home/                        # Landing page
├── about/                       # Sobre nosotros
├── contact/                     # Formulario de contacto
├── faq/                         # Preguntas frecuentes
├── privacy/                     # Política de privacidad
├── terms/                       # Términos de servicio
└── levels/                      # Niveles educativos
    ├── inicial/                 #   Kindergarten
    ├── primaria/                #   Primaria
    └── secundaria/              #   Secundaria
```

**Criterio**: Páginas simples, flat, sin state management complejo.

### features/intranet/ — Portal privado (autenticado)

```text
features/intranet/pages/
├── login/                       # Login de intranet
├── home-component/              # Dashboard principal
├── attendance-component/        # Asistencia (por rol)
│   ├── attendance-profesor/
│   ├── attendance-estudiante/
│   ├── attendance-apoderado/
│   ├── attendance-director/
│   ├── models/, config/
├── calendar-component/          # Calendario
├── schedule-component/          # Horarios (vista usuario)
├── campus-navigation/           # Navegación entre sedes
│   ├── components/, models/, config/, services/
├── profesor/                    # Sección del profesor
│   ├── cursos/, horarios/, salones/
│   ├── models/, services/
└── admin/                       # Administración (Director)
    ├── usuarios/                # CRUD usuarios (patrón completo)
    ├── horarios/                # CRUD horarios
    ├── cursos/                  # CRUD cursos
    ├── permisos-roles/          # Permisos por rol
    ├── permisos-usuarios/       # Permisos por usuario
    └── vistas/                  # Gestión de rutas/vistas
```

---

## Patrón CRUD Admin Completo (referencia: usuarios/)

El módulo `usuarios/` es el ejemplo canónico del patrón completo:

```text
admin/usuarios/
├── usuarios.component.ts          # Page/Route (Smart) — consume facade
├── usuarios.component.html
├── usuarios.component.scss
├── usuarios.facade.ts             # Comandos y orquestación
├── usuarios.store.ts              # Estado reactivo (signals privados)
├── index.ts                       # Barrel export
└── components/                    # Sub-componentes presentacionales (Dumb)
    ├── usuarios-table/            # Tabla principal
    ├── usuarios-stats/            # Cards de estadísticas
    ├── usuarios-filters/          # Controles de filtrado
    ├── usuarios-header/           # Encabezado de sección
    ├── usuario-form-dialog/       # Dialog crear/editar
    ├── usuario-detail-drawer/     # Drawer de detalle
    ├── usuarios-table-skeleton/   # Skeleton de tabla
    └── usuarios-stats-skeleton/   # Skeleton de stats
```

**Variantes**: Algunos módulos (horarios, cursos) ponen `services/` como subcarpeta en vez de al nivel raíz. El patrón base es el mismo: Store + Facade + Component + sub-componentes.

---

## Flujo de Datos (CRUD Optimizado)

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

---

## Criterios de Organización — Resumen

| Carpeta                      | Criterio de pertenencia                          |
| ---------------------------- | ------------------------------------------------- |
| `core/services/{dominio}/`   | Singleton, lógica transversal, infraestructura    |
| `core/guards/`               | Protección de rutas                               |
| `core/interceptors/`         | Transformación de HTTP requests/responses         |
| `core/store/`                | Estado global de la app (auth)                    |
| `data/repositories/`         | Acceso a datos con Repository Pattern             |
| `data/adapters/`             | Transformación API response → modelo de dominio   |
| `data/models/`               | Interfaces del dominio compartidas                |
| `shared/components/`         | UI genérica sin lógica de negocio                 |
| `shared/services/`           | Helpers compartidos entre features                |
| `features/{feature}/pages/`  | Páginas/rutas del feature                         |
| `features/.../components/`   | Sub-componentes presentacionales del feature      |
| `features/.../services/`     | Facade + Store locales del feature                |
