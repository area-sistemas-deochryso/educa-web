# Tarea: Auditoría y trazabilidad de correos enviados

> **Estado**: ✅ Implementado (backend + frontend)
> **Iniciado**: 2026-04-07
> **Completado**: 2026-04-07
> **Origen**: Surgió como continuación natural de [admin-asistencia-formal.md](admin-asistencia-formal.md). Cuando se descubrió que alguien editó asistencia en BD sin disparar correos, quedó claro que el sistema necesitaba auditar qué correos se enviaron y cuáles fallaron.

---

## 1. Decisiones cerradas

| # | Decisión | Elección |
|---|----------|----------|
| 1 | Patrón de envío | **Outbox + worker** |
| 2 | Retención | **1 año** |
| 3 | Alcance | **Todos los correos + obligar futuros vía convención** |
| 4 | Retry | **Exponencial (2s→10s→1m→5m→30m), 5 reintentos, marca failed + alerta, reintento manual desde UI** |
| 5 | Periodo ciego | **Empezar de cero** (solo correos desde el deploy) |
| 6 | UI admin | **Completa** (tabla + stats + filtros + reintentar + preview + dashboard tendencias + export Excel). Alertas configurables como iteración futura |
| 7 | Idempotencia | **Lock optimista** (status=processing con timestamp + timeout) |

---

## 2. Qué se implementó

### Backend (Educa.API)

| Archivo | Responsabilidad |
|---------|----------------|
| `Models/Sistema/EmailOutbox.cs` | Entidad con estados PENDING→PROCESSING→SENT/FAILED, intentos, retry, RowVersion, correlación con entidad origen |
| `Services/Notifications/EmailOutboxService.cs` | EnqueueAsync (fire-and-forget INV-S07), ListarAsync, ObtenerEstadisticasAsync, ObtenerTendenciasAsync, ReintentarAsync, ObtenerCuerpoHtmlAsync, CleanupAsync |
| `Services/Notifications/EmailOutboxWorker.cs` | BackgroundService: poll cada 5s, batch de 10, exponential backoff, 5 max intentos |
| `Services/Notifications/EmailOutboxCleanupWorker.cs` | BackgroundService diario: elimina registros > 1 año |
| `Controllers/Sistema/EmailOutboxController.cs` | Endpoints admin (solo Director): listar, estadísticas, tendencias, preview HTML, reintentar |
| `DTOs/Sistema/EmailOutboxTendenciaDto.cs` | DTO de tendencias (fecha, enviados, fallidos, pendientes, total) |
| `Interfaces/Services/Notifications/IEmailOutboxService.cs` | Contrato del servicio |

### Frontend (educa-web)

| Archivo | Responsabilidad |
|---------|----------------|
| `features/intranet/pages/admin/email-outbox/email-outbox.component.*` | Página principal con drawer de detalle |
| `components/email-outbox-header/` | Header con botón refresh + exportar Excel |
| `components/email-outbox-chart/` | Gráfico de barras CSS con tendencias de envíos (últimos 30 días) |
| `components/email-outbox-stats/` | Cards de estadísticas (total, enviados, fallidos, pendientes, % éxito) |
| `components/email-outbox-filters/` | Filtros por tipo, estado, fecha desde/hasta, búsqueda |
| `components/email-outbox-table/` | Tabla con acciones (ver detalle, reintentar) |
| `services/email-outbox.store.ts` | Store con signals |
| `services/email-outbox-data.facade.ts` | Carga de datos |
| `services/email-outbox-ui.facade.ts` | Estado UI (drawer, reintentar) |
| `services/email-outbox.service.ts` | API gateway |
| `data/models/email-outbox.models.ts` | Modelos del feature |

### Call-sites migrados (todos pasan por outbox)

| Call-site | Método | Tipo de correo |
|-----------|--------|---------------|
| `EmailNotificationService` | `EnviarNotificacionAsistencia()` | ASISTENCIA |
| `EmailNotificationService` | `EnviarNotificacionAsistenciaCorreccion()` | ASISTENCIA_CORRECCION |
| `PasswordRecoveryService` | `EnviarOtpEmailAsync()` | OTP |

No quedan llamadas directas a `IEmailService` desde los services de negocio. Todo pasa por `IEmailOutboxService.EnqueueAsync`.

---

### Regla de convención

Agregada en `backend.md` sección "Envío de Correos — Outbox Obligatorio": prohíbe llamar `IEmailService` directo desde services de negocio. Solo `IEmailOutboxService.EnqueueAsync()`. Incluida en checklist de code review.

---

## 3. Pendiente para iteración futura

- Alertas configurables (umbral de % de fallos, notificación a área de sistemas)
