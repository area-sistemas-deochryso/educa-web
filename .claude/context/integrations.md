# Integraciones Externas

## CrossChex Cloud API (Asistencia Biometrica)

- **Base URL**: `https://api.us.crosschexcloud.com`
- **Rate Limit**: 30 segundos entre paginas (paginacion)
- **Autenticacion**: API Key + Secret → Token JWT temporal
- **Endpoints usados**:
  - `authorize.token` - Obtener token
  - `attendance.record.getRecord` - Obtener registros de asistencia

## Servicios Automaticos (Backend)

### Hangfire Jobs

| Job | Schedule | Descripcion |
| --- | --- | --- |
| `SincronizarAsistenciaMatutina` | `*/5 8-10 * * *` | Sincroniza asistencias desde CrossChex Cloud cada 5 min (8:00-10:59 AM) |

## Firebase (Push Notifications)

- `NotificationChannel.EnqueueAsync()` - Cola asincrona para envio de push
- Destinatario: Dispositivo movil del apoderado

## MailKit (Email)

- `EmailNotificationService.EnviarNotificacionAsistencia()`
- Template HTML con datos del estudiante + fecha/hora + sede
- Libreria: MailKit (SMTP directo)

## WhatsApp Business (Futuro)

- Integracion pendiente con API de WhatsApp Business

---

## Integraciones Internas

### WAL (Write-Ahead Log) — Offline Sync

Sistema de persistencia de mutaciones en IndexedDB antes de enviarlas al servidor.

- **DB**: `educa-wal-db` (IndexedDB)
- **Cobertura**: 35/35 mutaciones protegidas (100% facades admin + profesor)
- **Patron**: Facade → `wal.execute()` → optimistic UI → HTTP → commit/rollback
- **Idempotency**: Header `X-Idempotency-Key` (backend middleware pendiente)
- **Componentes UI**: `sync-status` (header indicator), `pending-operations` (drawer)

### Proxy Same-Origin (Development)

- `proxy.conf.json` redirige `/api/*` a `https://localhost:7102`
- `environment.development.ts`: `apiUrl: ''` (same-origin)
- `environment.ts`: `apiUrl: 'https://educacom.azurewebsites.net'` (produccion)
- Prepara la infraestructura para cookie auth (HttpOnly cookies requieren same-origin)

### SignalR (Real-time)

- Chat/mensajeria interna entre usuarios
- Hubs en backend: `ChatHub`
- Token via query string en conexion WebSocket
