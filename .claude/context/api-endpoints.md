# APIs Backend Disponibles

Organización: 35 controllers en 10 dominios. Todos retornan `ApiResponse<T>`.

## Auth & Sesión

- `POST /api/auth/login` — Login (retorna token + permisos)
- `POST /api/auth/refresh` — Refresh token
- `POST /api/auth/logout` — Logout (invalida sesión)
- `POST /api/passwordrecovery/solicitar` — Solicitar recuperación de contraseña
- `POST /api/passwordrecovery/verificar` — Verificar código OTP
- `POST /api/passwordrecovery/cambiar` — Cambiar contraseña

## Permisos

- `GET /api/mispermisos` — Permisos del usuario actual
- `GET /api/permisosrol` — Permisos por rol
- `PUT /api/permisosrol` — Actualizar permisos de un rol
- `GET /api/permisosusuario` — Permisos personalizados de un usuario
- `PUT /api/permisosusuario` — Actualizar permisos de un usuario

## Administración (Director/AsistenteAdmin)

- `GET /api/usuarios` — Listar usuarios con filtros y paginación
- `GET /api/usuarios/{id}` — Detalle de usuario
- `POST /api/usuarios` — Crear usuario
- `PUT /api/usuarios/{id}` — Actualizar usuario
- `DELETE /api/usuarios/{id}` — Eliminar usuario (soft delete)
- `PUT /api/usuarios/{id}/estado` — Toggle estado activo/inactivo
- `POST /api/administracion/importar` — Importación masiva de estudiantes

## Salones

- `GET /api/salones` — Listar salones (grado + sección + sede)
- `GET /api/salones/{id}` — Detalle de salón
- `POST /api/salones` — Crear salón
- `PUT /api/salones/{id}` — Actualizar salón
- `DELETE /api/salones/{id}` — Eliminar salón
- `GET /api/salones/{id}/estudiantes` — Estudiantes del salón
- `GET /api/profesorsalon` — Profesores asignados a salones
- `POST /api/profesorsalon` — Asignar profesor a salón

## Cursos

- `GET /api/cursos` — Listar cursos
- `POST /api/cursos` — Crear curso
- `PUT /api/cursos/{id}` — Actualizar curso
- `DELETE /api/cursos/{id}` — Eliminar curso
- `GET /api/cursos/{id}/contenido` — Contenido del curso
- `GET /api/estudiantecurso` — Estudiantes por curso

## Académico

- `GET /api/grados` — Listar grados con secciones
- `GET /api/horario` — Listar horarios
- `POST /api/horario` — Crear horario
- `PUT /api/horario/{id}` — Actualizar horario
- `DELETE /api/horario/{id}` — Eliminar horario
- `GET /api/periodoacademico` — Periodos académicos
- `PUT /api/periodoacademico/{id}/cerrar` — Cerrar periodo

## Calificaciones

- `GET /api/calificacion` — Consultar calificaciones
- `POST /api/calificacion` — Registrar calificación
- `PUT /api/calificacion/{id}` — Actualizar calificación
- `GET /api/configuracioncalificacion` — Config de evaluación por nivel
- `PUT /api/configuracioncalificacion` — Actualizar config de evaluación
- `GET /api/cursocontenido` — Contenido y tareas de curso
- `GET /api/grupocontenido` — Grupos de contenido

## Aprobación

- `GET /api/aprobacionestudiante` — Consultar aprobaciones
- `POST /api/aprobacionestudiante/masivo` — Aprobación masiva (batch)
- `PUT /api/aprobacionestudiante/{id}` — Actualizar aprobación individual

## Asistencia Diaria (CrossChex)

- `GET /api/consultaasistencia` — Consultar asistencias con filtros (mes, grado, sección)
- `POST /api/asistencia/webhook` — Webhook de CrossChex (automático)
- `POST /api/asistencia/manual` — Registro manual de asistencia
- `GET /api/asistencia/reporte-pdf` — Generar PDF de reporte mensual

## Asistencia por Curso

- `GET /api/asistenciacurso` — Consultar asistencia por curso
- `POST /api/asistenciacurso` — Registrar asistencia en clase
- `PUT /api/asistenciacurso/{id}` — Actualizar asistencia

## Comunicación

- `GET /api/conversaciones` — Listar conversaciones del usuario
- `POST /api/conversaciones` — Crear conversación
- `POST /api/conversaciones/{id}/mensajes` — Enviar mensaje

## Notificaciones

- `GET /api/notificaciones` — Listar notificaciones del usuario
- `POST /api/notificaciones` — Crear notificación (admin)
- `PUT /api/notificaciones/{id}/leer` — Marcar como leída
- `GET /api/eventoscalendario` — Eventos del calendario escolar
- `POST /api/eventoscalendario` — Crear evento

## Integraciones & Sistema

- `POST /api/blobstorage/upload` — Subir archivo
- `GET /api/blobstorage/{id}` — Descargar archivo
- `GET /api/configuracion` — Configuración general de la app
- `GET /api/servertime` — Hora del servidor (para clock sync)
- `GET /api/warmup` — Health check / warm up
- `POST /api/videoconferencia/token` — Generar token JaaS (Jitsi)

## SignalR Hubs

- `/chathub` — Mensajería en tiempo real (grupos por conversación)
- `/asistenciahub` — Notificaciones de asistencia (broadcast: entrada/salida)

Ambos hubs requieren `[Authorize]`. Token via HttpOnly cookie o `?access_token=` query param.

## Notificaciones Multi-Canal

Cuando se registra una asistencia (entrada/salida):

1. **Push Notification** (Firebase) — `NotificationChannel.EnqueueAsync()` — App móvil del apoderado
2. **Email** (MailKit) — `EmailNotificationService.EnviarNotificacionAsistencia()` — Template HTML
3. **SignalR** — `AsistenciaHub.AsistenciaRegistrada()` — UI en tiempo real
4. **WhatsApp** (Futuro) — Integración pendiente
