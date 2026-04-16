# APIs Backend Disponibles

Organización: 42 controllers en 10 dominios. Todos retornan `ApiResponse<T>`.

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
- `PUT /api/profesorsalon/{profesorId}` — Actualizar asignación profesor-salón
- `DELETE /api/profesorsalon/{profesorId}` — Remover profesor de salón

## Cursos

- `GET /api/cursos` — Listar cursos
- `POST /api/cursos` — Crear curso
- `PUT /api/cursos/{id}` — Actualizar curso
- `DELETE /api/cursos/{id}` — Eliminar curso
- `GET /api/cursos/{id}/contenido` — Contenido del curso
- `GET /api/estudiantecurso/mis-horarios` — Horarios del estudiante autenticado
- `GET /api/estudiantecurso/horario/{horarioId}/contenido` — Contenido de un horario (estudiante)
- `POST /api/estudiantecurso/semana/{semanaId}/archivo` — Subir archivo a semana
- `GET /api/estudiantecurso/semana/{semanaId}/mis-archivos` — Archivos del estudiante en semana
- `DELETE /api/estudiantecurso/archivo/{archivoId}` — Eliminar archivo propio
- `POST /api/estudiantecurso/tarea/{tareaId}/archivo` — Subir archivo a tarea
- `GET /api/estudiantecurso/tarea/{tareaId}/mis-archivos` — Archivos del estudiante en tarea
- `DELETE /api/estudiantecurso/tarea-archivo/{archivoId}` — Eliminar archivo de tarea
- `GET /api/estudiantecurso/mis-notas` — Notas del estudiante autenticado
- `GET /api/estudiantecurso/horario/{horarioId}/mi-asistencia` — Asistencia por curso del estudiante
- `GET /api/estudiantecurso/horario/{horarioId}/grupos` — Grupos del horario (estudiante)

## Académico

- `GET /api/grados` — Listar grados con secciones
- `GET /api/horario` — Listar horarios
- `POST /api/horario` — Crear horario
- `PUT /api/horario/{id}` — Actualizar horario
- `DELETE /api/horario/{id}` — Eliminar horario
- `GET /api/periodoacademico` — Periodos académicos
- `PUT /api/periodoacademico/{id}/cerrar` — Cerrar periodo
- `GET /api/profesorcurso/profesor/{profesorId}` — Cursos asignados a un profesor (por año)
- `GET /api/profesorcurso/curso/{cursoId}` — Profesores asignados a un curso (por año)
- `POST /api/profesorcurso/asignar` — Asignar profesor a curso(s) en batch
- `DELETE /api/profesorcurso/{id}` — Desasignar profesor de curso

## Calificaciones

- `GET /api/calificacion` — Consultar calificaciones
- `POST /api/calificacion` — Registrar calificación
- `PUT /api/calificacion/{id}` — Actualizar calificación
- `GET /api/configuracioncalificacion` — Config de evaluación por nivel
- `PUT /api/configuracioncalificacion` — Actualizar config de evaluación
- `GET /api/boletanotas/estudiante/{estudianteId}` — Descargar boleta PDF de un estudiante `[heavy]`
- `GET /api/boletanotas/salon/{salonId}` — Descargar boleta PDF de todo un salón `[heavy]`
- `GET /api/cursocontenido` — Contenido y tareas de curso
- `GET /api/grupocontenido/contenido/{contenidoId}` — Grupos de un contenido
- `POST /api/grupocontenido` — Crear grupo de contenido
- `PUT /api/grupocontenido/{grupoId}` — Actualizar grupo
- `DELETE /api/grupocontenido/{grupoId}` — Eliminar grupo
- `POST /api/grupocontenido/{grupoId}/estudiantes` — Asignar estudiantes a grupo
- `DELETE /api/grupocontenido/{grupoId}/estudiante/{estudianteId}` — Remover estudiante de grupo
- `PUT /api/grupocontenido/contenido/{contenidoId}/config` — Configurar máximo de estudiantes por grupo
- `POST /api/grupocontenido/{calificacionId}/calificar-grupos` — Calificar grupos en lote

## Aprobación

- `GET /api/aprobacionestudiante` — Consultar aprobaciones
- `POST /api/aprobacionestudiante/masivo` — Aprobación masiva (batch)
- `PUT /api/aprobacionestudiante/{id}` — Actualizar aprobación individual

## Asistencia Diaria (CrossChex)

- `GET /api/consultaasistencia` — Consultar asistencias con filtros (mes, grado, sección)
- `POST /api/asistencia/webhook` — Webhook de CrossChex (automático)
- `POST /api/asistencia/manual` — Registro manual de asistencia
- `GET /api/asistencia/reporte-pdf` — Generar PDF de reporte mensual

## Asistencia Admin (Director)

- `GET /api/asistenciaadmin` — Listar asistencias con filtros para edición
- `POST /api/asistenciaadmin` — Crear registro de asistencia manual
- `PUT /api/asistenciaadmin/{id}` — Editar registro de asistencia
- `DELETE /api/asistenciaadmin/{id}` — Eliminar registro de asistencia
- `GET /api/cierre-asistencia` — Listar cierres mensuales
- `POST /api/cierre-asistencia` — Crear cierre mensual (INV-AD03)
- `POST /api/cierre-asistencia/{id}/revertir` — Revertir cierre (INV-AD04, solo Director)
- `GET /api/reportesasistencia` — Reportes de asistencia con filtros

## Permisos de Salud

- `GET /api/permisos-salud/sintomas` — Catálogo de síntomas
- `GET /api/permisos-salud/resumen` — Resumen de permisos por salón
- `GET /api/permisos-salud/estudiantes` — Estudiantes con permisos de salud
- `POST /api/permisos-salud/validar-fechas` — Validar fechas de justificación
- `GET /api/permisos-salud/salones` — Salones disponibles (admin)
- `POST /api/permisos-salud/salida` — Crear permiso de salida por salud
- `DELETE /api/permisos-salud/salida/{id}` — Anular permiso de salida
- `POST /api/permisos-salud/justificacion` — Crear justificación médica
- `DELETE /api/permisos-salud/justificacion/{id}` — Anular justificación

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
- `POST /api/sistema/client-errors` — Reportar error del frontend (INV-ET02)
- `POST /api/sistema/errors` — Reportar error de frontend con detalle `[AllowAnonymous]` `[heavy]`
- `GET /api/sistema/errors` — Listar errores (Director)
- `GET /api/sistema/errors/{id}` — Detalle completo de error (Director)
- `GET /api/sistema/errors/{id}/detalles` — Detalles técnicos del error (Director)
- `GET /api/sistema/email-outbox/listar` — Listar correos con filtros (admin)
- `GET /api/sistema/email-outbox/estadisticas` — Estadísticas de envío (admin)
- `GET /api/sistema/email-outbox/{id}/html` — Ver cuerpo HTML del correo (admin)
- `GET /api/sistema/email-outbox/tendencias` — Tendencias de envío (admin)
- `POST /api/sistema/email-outbox/{id}/reintentar` — Reintentar envío fallido (admin)
- `POST /api/sistema/reportes-usuario` — Crear reporte de usuario `[AllowAnonymous]` `[feedback]`
- `GET /api/sistema/reportes-usuario` — Listar reportes (admin)
- `GET /api/sistema/reportes-usuario/estadisticas` — Estadísticas de reportes (admin)
- `GET /api/sistema/reportes-usuario/{id}` — Detalle de reporte (admin)
- `PATCH /api/sistema/reportes-usuario/{id}/estado` — Cambiar estado del reporte (admin)

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
