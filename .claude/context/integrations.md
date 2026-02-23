# Integraciones Externas

## CrossChex Cloud API (Asistencia Biométrica)

- **Base URL**: `https://api.us.crosschexcloud.com`
- **Rate Limit**: 30 segundos entre páginas (paginación)
- **Autenticación**: API Key + Secret → Token JWT temporal
- **Endpoints usados**:
  - `authorize.token` - Obtener token
  - `attendance.record.getRecord` - Obtener registros de asistencia

## Servicios Automáticos (Backend)

### Hangfire Jobs

| Job | Schedule | Descripción |
| --- | --- | --- |
| `SincronizarAsistenciaMatutina` | `*/5 8-10 * * *` | Sincroniza asistencias desde CrossChex Cloud cada 5 min (8:00-10:59 AM) |

## Firebase (Push Notifications)

- `NotificationChannel.EnqueueAsync()` - Cola asíncrona para envío de push
- Destinatario: Dispositivo móvil del apoderado

## SendGrid (Email)

- `EmailNotificationService.EnviarNotificacionAsistencia()`
- Template HTML con datos del estudiante + fecha/hora + sede

## WhatsApp Business (Futuro)

- Integración pendiente con API de WhatsApp Business
