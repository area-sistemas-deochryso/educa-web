# Mapa De Codigo Propio

Este documento resume el codigo propio relevante de `educa-web`, excluyendo tests, artefactos generados, cobertura, dependencias y documentacion generada.

## Alcance

- Incluye solo la app Angular bajo `src/app`
- Excluye `*.spec.*`
- Excluye `dist/`, `coverage/`, `node_modules/` y similares
- No intenta mapear documentacion autogenerada

## Arbol Resumido

Raiz funcional: [src/app](./src/app)

- `config`
  - environments, feature flags y versionado de cache
- `core`
  - infraestructura transversal
  - guards, interceptors, stores, helpers y servicios base
  - bloques fuertes: auth, permisos, session, notifications, storage, wal, trace, speech
- `data`
  - models, adapters y repositories
- `shared`
  - componentes reutilizables, pipes, directives, constants, utils y servicios compartidos
- `features/public`
  - home, about, contact, faq, privacy, terms y niveles
- `features/intranet`
  - login
  - shared
  - profesor
  - estudiante
  - admin

## Entradas Principales

- [src/app/app.routes.ts](./src/app/app.routes.ts)
- [src/app/features/intranet/intranet.routes.ts](./src/app/features/intranet/intranet.routes.ts)
- [src/app/core/index.ts](./src/app/core/index.ts)
- [src/app/data/index.ts](./src/app/data/index.ts)
- [src/app/shared/index.ts](./src/app/shared/index.ts)
- [src/app/shared/components/layout/index.ts](./src/app/shared/components/layout/index.ts)

## Estructura Por Capas

### Config

Configuracion de entorno y banderas:

- `src/app/config/environment.ts`
- `src/app/config/environment.development.ts`
- `src/app/config/environment.capacitor.ts`
- `src/app/config/cache-versions.config.ts`

### Core

Infraestructura comun de la app:

- guards
- interceptors
- stores
- helpers
- servicios base HTTP, auth, session, permisos, storage, notifications, wal, trace, speech

Piezas clave:

- [src/app/core/services/http/base-http.service.ts](./src/app/core/services/http/base-http.service.ts)
- [src/app/core/services/facades/base-crud.facade.ts](./src/app/core/services/facades/base-crud.facade.ts)
- [src/app/core/services/auth/auth-api.service.ts](./src/app/core/services/auth/auth-api.service.ts)
- [src/app/core/services/auth/auth.service.ts](./src/app/core/services/auth/auth.service.ts)
- [src/app/core/services/session/session-refresh.service.ts](./src/app/core/services/session/session-refresh.service.ts)
- [src/app/core/services/session/session-activity.service.ts](./src/app/core/services/session/session-activity.service.ts)
- [src/app/core/services/permisos/permisos.service.ts](./src/app/core/services/permisos/permisos.service.ts)

### Data

Modelos y capa de acceso/transformacion de datos del frontend:

- `src/app/data/models`
- `src/app/data/adapters`
- `src/app/data/repositories`

### Shared

Biblioteca interna reutilizable:

- `src/app/shared/components`
- `src/app/shared/directives`
- `src/app/shared/pipes`
- `src/app/shared/constants`
- `src/app/shared/services`
- `src/app/shared/models`
- `src/app/shared/utils`

## Features Public

Rutas publicas cargadas desde `app.routes.ts`:

- `home`
- `about`
- `contact`
- `faq`
- `privacy`
- `terms`
- `levels/inicial`
- `levels/primaria`
- `levels/secundaria`

## Features Intranet

La intranet se organiza por area funcional y por rol.

### Login

- `src/app/features/intranet/pages/login`

### Shared

Modulos transversales dentro de intranet:

- `home-component`
- `attendance-component`
- `reportes-asistencia`
- `mensajeria`
- `schedule-component`
- `calendary-component`
- `videoconferencias`
- `campus-navigation`
- `ctest-k6`

### Profesor

Barrel principal:

- [src/app/features/intranet/pages/profesor/index.ts](./src/app/features/intranet/pages/profesor/index.ts)

Pantallas:

- `asistencia`
- `calificaciones`
- `cursos`
- `final-salones`
- `foro`
- `horarios`
- `mensajeria`
- `salones`

### Estudiante

Barrel principal:

- [src/app/features/intranet/pages/estudiante/index.ts](./src/app/features/intranet/pages/estudiante/index.ts)

Pantallas:

- `asistencia`
- `cursos`
- `foro`
- `horarios`
- `mensajeria`
- `notas`
- `salones`

### Admin

Pantallas y modulos:

- `usuarios`
- `vistas`
- `cursos`
- `horarios`
- `salones`
- `asistencias`
- `eventos-calendario`
- `notificaciones-admin`
- `email-outbox`
- `permisos-roles`
- `permisos-usuarios`
- `campus`

## Modulos Mas Grandes

Por cantidad aproximada de archivos de codigo propio en intranet:

- `admin/horarios`: 52
- `profesor/cursos`: 49
- `admin/usuarios`: 42
- `admin/salones`: 31
- `admin/campus`: 29
- `shared/ctest-k6`: 29
- `shared/campus-navigation`: 28
- `admin/email-outbox`: 22
- `shared/reportes-asistencia`: 20
- `admin/permisos-usuarios`: 17

## Mapa Por Dominios

### Autenticacion y sesion

- Frontend base:
  - [src/app/core/services/auth/auth-api.service.ts](./src/app/core/services/auth/auth-api.service.ts)
  - [src/app/core/services/auth/auth.service.ts](./src/app/core/services/auth/auth.service.ts)
  - [src/app/core/services/session/session-refresh.service.ts](./src/app/core/services/session/session-refresh.service.ts)
  - [src/app/core/services/session/session-activity.service.ts](./src/app/core/services/session/session-activity.service.ts)

### Asistencia y reportes

- Profesor:
  - [src/app/shared/services/asistencia/profesor-asistencia-api.service.ts](./src/app/shared/services/asistencia/profesor-asistencia-api.service.ts)
- Admin:
  - [src/app/features/intranet/pages/admin/asistencias/services/asistencias-admin.service.ts](./src/app/features/intranet/pages/admin/asistencias/services/asistencias-admin.service.ts)
  - [src/app/features/intranet/pages/admin/asistencias/services/asistencias-data.facade.ts](./src/app/features/intranet/pages/admin/asistencias/services/asistencias-data.facade.ts)
  - [src/app/features/intranet/pages/admin/asistencias/services/asistencias-crud.facade.ts](./src/app/features/intranet/pages/admin/asistencias/services/asistencias-crud.facade.ts)
- Reportes:
  - [src/app/features/intranet/pages/shared/reportes-asistencia/reportes-asistencia.component.ts](./src/app/features/intranet/pages/shared/reportes-asistencia/reportes-asistencia.component.ts)

### Cursos y calificaciones

- Profesor cursos:
  - [src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts](./src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts)
  - [src/app/features/intranet/pages/profesor/cursos/services/curso-contenido-data.facade.ts](./src/app/features/intranet/pages/profesor/cursos/services/curso-contenido-data.facade.ts)
  - [src/app/features/intranet/pages/profesor/cursos/services/curso-contenido-crud.facade.ts](./src/app/features/intranet/pages/profesor/cursos/services/curso-contenido-crud.facade.ts)
  - [src/app/features/intranet/pages/profesor/cursos/services/calificaciones.facade.ts](./src/app/features/intranet/pages/profesor/cursos/services/calificaciones.facade.ts)
- Configuracion de calificacion:
  - [src/app/shared/services/calificacion-config/calificacion-config.service.ts](./src/app/shared/services/calificacion-config/calificacion-config.service.ts)

### Usuarios

- [src/app/features/intranet/pages/admin/usuarios/usuarios.component.ts](./src/app/features/intranet/pages/admin/usuarios/usuarios.component.ts)
- `src/app/features/intranet/pages/admin/usuarios/services`

### Horarios

- [src/app/features/intranet/pages/admin/horarios/horarios.component.ts](./src/app/features/intranet/pages/admin/horarios/horarios.component.ts)
- `src/app/features/intranet/pages/admin/horarios/services`

### Permisos

- [src/app/core/services/permisos/permisos.service.ts](./src/app/core/services/permisos/permisos.service.ts)
- `src/app/features/intranet/pages/admin/permisos-roles`
- `src/app/features/intranet/pages/admin/permisos-usuarios`

### Notificaciones

- [src/app/core/services/notifications/notifications-api.service.ts](./src/app/core/services/notifications/notifications-api.service.ts)
- [src/app/core/services/notifications/notifications.service.ts](./src/app/core/services/notifications/notifications.service.ts)
- `src/app/features/intranet/pages/admin/notificaciones-admin`
- `src/app/features/intranet/pages/admin/email-outbox`

### Campus

- `src/app/features/intranet/pages/shared/campus-navigation`
- `src/app/features/intranet/pages/admin/campus`

### Mensajeria

- `src/app/features/intranet/pages/shared/mensajeria`
- `src/app/features/intranet/pages/profesor/mensajeria`
- `src/app/features/intranet/pages/estudiante/mensajeria`

## Archivos Criticos Para Empezar Rapido

### Navegacion y shell

- [src/app/app.routes.ts](./src/app/app.routes.ts)
- [src/app/features/intranet/intranet.routes.ts](./src/app/features/intranet/intranet.routes.ts)
- [src/app/shared/components/layout/index.ts](./src/app/shared/components/layout/index.ts)

### Infraestructura

- [src/app/core/services/http/base-http.service.ts](./src/app/core/services/http/base-http.service.ts)
- [src/app/core/services/facades/base-crud.facade.ts](./src/app/core/services/facades/base-crud.facade.ts)
- [src/app/core/services/auth/auth-api.service.ts](./src/app/core/services/auth/auth-api.service.ts)
- [src/app/core/services/permisos/permisos.service.ts](./src/app/core/services/permisos/permisos.service.ts)

### Modulos de negocio con mas peso

- [src/app/features/intranet/pages/admin/usuarios/usuarios.component.ts](./src/app/features/intranet/pages/admin/usuarios/usuarios.component.ts)
- [src/app/features/intranet/pages/admin/horarios/horarios.component.ts](./src/app/features/intranet/pages/admin/horarios/horarios.component.ts)
- [src/app/features/intranet/pages/admin/asistencias/services/asistencias-admin.service.ts](./src/app/features/intranet/pages/admin/asistencias/services/asistencias-admin.service.ts)
- [src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts](./src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts)
- [src/app/features/intranet/pages/shared/reportes-asistencia/reportes-asistencia.component.ts](./src/app/features/intranet/pages/shared/reportes-asistencia/reportes-asistencia.component.ts)

## Resumen De Volumen

Conteo aproximado de archivos de codigo propio relevados:

- `src/app`: 1110
- `features/intranet`: 640
- `shared`: 250
- `core`: 137
- `features/public`: 36
- `data`: 34
