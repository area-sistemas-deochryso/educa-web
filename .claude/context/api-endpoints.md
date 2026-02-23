# APIs Backend Disponibles

## Auth & Permisos

- `POST /api/auth/login` - Login (retorna token + permisos)
- `GET /api/permisos/usuario` - Permisos del usuario actual

## Administración (Director/AsistenteAdmin)

- `GET /api/usuarios` - Listar usuarios con filtros
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/{id}` - Actualizar usuario
- `DELETE /api/usuarios/{id}` - Eliminar usuario
- `PUT /api/usuarios/{id}/estado` - Toggle estado activo/inactivo

## Salones & Cursos

- `GET /api/salones` - Listar salones (grado + sección + sede)
- `POST /api/salones` - Crear salón
- `PUT /api/salones/{id}` - Actualizar salón
- `DELETE /api/salones/{id}` - Eliminar salón
- `GET /api/cursos` - Listar cursos
- `POST /api/cursos` - Crear curso
- `PUT /api/cursos/{id}` - Actualizar curso

## Asistencias

- `GET /api/asistencias` - Consultar asistencias con filtros (mes, grado, sección)
- `POST /api/asistencias/webhook` - Webhook de CrossChex (automático)
- `POST /api/asistencias/manual` - Registro manual de asistencia
- `GET /api/asistencias/reporte-pdf` - Generar PDF de reporte mensual

## Notificaciones Multi-Canal

Cuando se registra una asistencia (entrada/salida):

1. **Push Notification** (Firebase)
   - `NotificationChannel.EnqueueAsync()` - Cola asíncrona
   - Enviado al dispositivo móvil del apoderado (app)

2. **Email** (SendGrid)
   - `EmailNotificationService.EnviarNotificacionAsistencia()`
   - Template HTML con datos del estudiante + fecha/hora + sede

3. **WhatsApp** (Futuro)
   - Integración pendiente con API de WhatsApp Business
