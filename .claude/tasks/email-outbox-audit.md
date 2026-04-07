# Tarea: Auditoría y trazabilidad de correos enviados

> **Estado**: 🔵 Pendiente de definición
> **Iniciado**: 2026-04-07
> **Origen**: Surgió como continuación natural de [admin-asistencia-formal.md](admin-asistencia-formal.md). Cuando se descubrió que alguien editó asistencia en BD sin disparar correos, quedó claro que el sistema **no tiene forma de auditar qué correos se enviaron y cuáles fallaron**.

---

## 1. Problema

Hoy el envío de correos vive en `Educa.API/Services/Notifications/EmailNotificationService.cs` y se ejecuta como **fire-and-forget** desde otros services (`AsistenciaService`, `PasswordRecoveryService`, etc.). Cuando algo falla, **nadie se entera** salvo que alguien lea los logs de App Insights con la query correcta.

### Mecanismos de "auditoría" existentes (parciales)

| Mecanismo | Qué hace | Limitación |
|---|---|---|
| **BCC manual** a `area.sistemas.min@gmail.com` (constante en `EmailNotificationService`) | Cada correo lleva BCC oculto | Auditoría visual en bandeja Gmail. No queryable. No filtrable por estudiante/fecha sin escarbar. Si Gmail elimina viejos, se pierden |
| **Application logs** (`LogInformation` / `LogError`) | Cada envío exitoso o fallido se loggea | Logs efímeros (TTL de App Insights). No estructurados como tabla relacional. Imposible cruzar fácilmente con la fila de origen (`Asistencia`, etc.) |
| **`SaveToSentFolder` vía IMAP** en `Educa.API/Services/Integraciones/EmailService.cs` | El propio `EmailService` guarda copia en carpeta "Enviados" del buzón saliente del colegio (medylo) | Mirror IMAP, no es tabla. Mismo problema que BCC: no es queryable desde la app |

### Lo que falta

1. **Tabla persistente** que registre cada intento de envío con su estado actual
2. **Correlación con la entidad de origen**: dado un `Asistencia.ASI_CodID`, poder responder "¿se envió el correo del apoderado?"
3. **Reintento automático** ante fallos transitorios de SMTP (hoy hay retry dentro de `EmailService.SendEmailAsync` pero solo dentro de la misma request — si el proceso muere, el correo se pierde)
4. **Endpoint + UI admin** para que el área de sistemas pueda consultar / reintentar / diagnosticar sin SSH ni KQL
5. **Alertas** cuando un porcentaje de correos falla en una ventana de tiempo

### Por qué importa AHORA

El problema concreto que motivó esto: ayer se editó asistencia en BD y nadie se enteró que faltaron correos hasta que el usuario lo notó. Aunque la tarea [admin-asistencia-formal.md](admin-asistencia-formal.md) cierra el hueco de "edición sin pasar por la API", **no resuelve el caso donde la API sí dispara el correo pero el SMTP falla silenciosamente**. Sigue siendo fire-and-forget.

---

## 2. Decisiones pendientes (esto es lo que hay que cerrar antes de implementar)

### Decisión 1 — Patrón de envío

| Opción | Descripción | Ventaja | Desventaja |
|---|---|---|---|
| **A. Reemplazar fire-and-forget por outbox + worker** | Los call-sites encolan en `EmailOutbox`, un `BackgroundService` lee y envía con retry exponencial | Resiliencia real ante fallos transitorios. Reintentos automáticos. Estado consultable | Mayor reescritura. Requiere refactor de todos los call-sites. Worker como nueva pieza de infraestructura |
| **B. Shadow logging (no toca el flujo actual)** | Cada llamada a `_emailService.SendEmailAsync` también escribe una fila en `EmailLog` con resultado, sin cambiar el envío | Refactor mínimo. Cero riesgo de regresión | NO resuelve el retry resiliente. Si SMTP falla, la fila queda con `failed` pero nadie reintenta automáticamente |
| **C. Trigger SQL + tabla audit por separado** | Una tabla `EmailAuditLog` se llena desde código, pero el envío sigue igual | Auditoría sin cambiar arquitectura | Mismo problema que B. Además acopla audit a múltiples puntos de código |

### Decisión 2 — Retención de la tabla

| Opción | Implica |
|---|---|
| **90 días** | Tabla pequeña, borrado automático mensual. Pierde historia para casos legales/quejas tardías |
| **1 año** | Cubre el ciclo académico completo. Tabla mediana |
| **Indefinida** | Cero pérdida de información. Tabla crece linealmente, costo de almacenamiento Azure SQL |
| **Indefinida con archivado a Blob Storage** | Mantiene cero pérdida + tabla acotada (ej: solo últimos 3 meses en SQL, resto en JSON comprimido en blob) | Más complejo, requiere job de archivado |

### Decisión 3 — Alcance: ¿qué tipos de correo entran?

Hoy el sistema envía correos desde varios puntos:

- **Asistencia** (`EmailNotificationService.EnviarNotificacionAsistencia`)
- **Asistencia corrección** (nueva, en `admin-asistencia-formal`)
- **Recuperación de contraseña** (`PasswordRecoveryService`)
- **Notificación de faltas** (`NotificacionFaltasService`)
- Posibles futuros: notificaciones de matrícula, eventos de calendario, mensajes del chat

| Opción | Implica |
|---|---|
| **Solo asistencia** | Mínimo refactor, cubre el caso que motivó la task | Otros correos siguen ciegos |
| **Todos los actuales** | Punto único de auditoría para todo el sistema | Refactor de cada call-site existente |
| **Todos + obligar futuros via convención** | Punto único + regla en `backend.md` que prohíbe llamar `IEmailService` directo | Refactor + nueva convención que respetar en code reviews |

### Decisión 4 — Estado del retry y aborto

Si se elige outbox + worker, hay que decidir:

| Pregunta | Opciones |
|---|---|
| **Backoff** | Lineal (2s, 4s, 6s...) · Exponencial (2s, 4s, 8s, 16s, 30s) · Custom (2s, 10s, 1min, 5min, 30min) |
| **Máximo de reintentos antes de abortar** | 3 · 5 · 10 · ilimitado |
| **Qué pasa con un correo abortado** | Marca `failed` y queda inerte · Marca `failed` y dispara alerta · Marca `failed` y notifica al área de sistemas |
| **Reintento manual desde UI** | Sí (botón "reintentar" en outbox) · No (requiere intervención técnica) |

### Decisión 5 — Qué hacer con los correos del periodo "ciego" (antes de la outbox)

Una vez implementada, los correos previos no van a aparecer en la outbox. Hay que decidir:

| Opción | Implica |
|---|---|
| **Empezar de cero** (solo correos desde el deploy) | Simple. Pierde historia previa pero el flujo nuevo está limpio |
| **Backfill desde logs de App Insights** | Reconstruye historia parcial. Trabajo extra de scripting one-time |
| **Backfill desde IMAP "Enviados"** | Más completo. Requiere parser del buzón. Más trabajo |

### Decisión 6 — UI de admin: alcance

| Opción | Incluye |
|---|---|
| **Mínima** | Tabla con filtros (fecha, estado, tipo), botón reintentar, ver detalle |
| **Estándar** | Lo anterior + cards de estadísticas (% éxito, fallos último día, top errores) + filtro por entidad origen |
| **Completa** | Lo anterior + dashboard de tendencias (gráfico de envíos por día), alertas configurables, exportación a Excel |

### Decisión 7 — Idempotencia

Si el worker reinicia mientras procesa una fila, ¿cómo se evita doble envío?

| Opción | Implica |
|---|---|
| **Lock optimista** (`status=processing` con timestamp + timeout) | Simple, suficiente para volumen actual. Riesgo bajo de doble envío en edge cases |
| **Idempotency key** (hash de `to + subject + bodyHash + entidadOrigen + entidadId + fecha`) | Garantía absoluta de no duplicados. Requiere diseñar el hash correctamente |
| **Lease distribuido** | Solo si el sistema escala a múltiples workers concurrentes. Innecesario hoy |

---

## 3. Información de contexto que el implementador necesitará

### Archivos relevantes del proyecto

| Archivo | Por qué importa |
|---|---|
| `Educa.API/Services/Notifications/EmailNotificationService.cs` | Punto principal de envío de correos de asistencia. Contiene `EnviarNotificacionAsistencia` y (próximamente) `EnviarNotificacionAsistenciaCorreccion` |
| `Educa.API/Services/Integraciones/EmailService.cs` | Wrapper SMTP de bajo nivel. Tiene retry interno (`MaxRetries`) pero solo dentro de la misma request |
| `Educa.API/Models/Comunicacion/Email.cs` | Modelo simple con `To`, `Bcc`, `Subject`, `Body` |
| `Educa.API/Services/Auth/PasswordRecoveryService.cs` | Otro call-site directo de `_emailService.SendEmailAsync` |
| `Educa.API/Services/Notifications/NotificacionFaltasService.cs` | Otro call-site (verificar) |
| `Educa.API/Models/Sistema/CommandAuditLog.cs` | Patrón de referencia: ya existe una tabla audit (para batch commands) que se puede usar como template estructural para `EmailOutbox` |

### Patrones del proyecto a respetar

- Backend: **300 líneas máximo por archivo** (`backend.md`). Cualquier service que crezca, dividir.
- BackgroundServices ya hay precedentes en el proyecto (`MensajeNotificationWorker`, `NotificationWorker` en `Services/Notifications/`). Usar ese patrón.
- Toda mutación de BD usa `RowVersion` para concurrencia (INV-S05).
- Logging estructurado siempre (`backend.md`).
- Respuestas API con `ApiResponse<T>` siempre.
- Una entidad por archivo, un DTO por archivo (`backend.md`).
- Nuevos invariantes documentados en `business-rules.md` sección 15.

### Reglas de negocio relacionadas

- `INV-S07`: Las notificaciones son fire-and-forget — nunca pueden fallar la operación principal. **Esta invariante NO debe romperse**: si el outbox encola y la inserción falla, igualmente la operación de negocio debe completarse. La forma exacta queda a definir.
- `INV-AD05` (próximo a agregarse): El `AsistenciaAdminService` envía correo diferenciado al apoderado en cada operación. Esta task complementaría esa invariante con una garantía de auditoría.

### Frontend: nueva ruta

Si la decisión 6 incluye UI:
- Ruta sugerida: `intranet/admin/email-outbox`
- Permiso nuevo: `ADMIN_EMAIL_OUTBOX: 'intranet/admin/email-outbox'` en `permission-registry.ts`
- Patrón: multi-facade CRUD admin como `usuarios` (referencia: `src/app/features/intranet/pages/admin/usuarios/`)
- Solo lectura + botón reintentar — no es CRUD completo

---

## 4. Lo que NO está decidido y se pospone hasta empezar

- Esquema exacto de la tabla `EmailOutbox` (columnas, tipos, índices)
- Estructura del payload (JSON serializado del `Email` original o columnas planas)
- Política de cleanup automático
- Métricas exactas para alertas
- Si se integra con un servicio externo (SendGrid, etc.) o se mantiene MailKit + SMTP propio
- Cómo se autentica el endpoint admin (probablemente solo Director, igual que cierre de mes)
- Si hay paginación en el endpoint de listado o se trae todo

---

## 5. Pasos previos antes de implementar

1. **Cerrar las 7 decisiones del punto 2** con el usuario
2. **Diseñar el SQL** y mostrarlo antes de ejecutarlo (regla `backend.md`: nunca correr scripts sin mostrarlos)
3. **Listar todos los call-sites actuales** de `IEmailService.SendEmailAsync` en el backend para tener inventario completo del refactor
4. **Decidir orden de migración**: ¿todos los call-sites en un PR o uno por uno?
5. **Plan de rollback**: si la outbox falla, ¿cómo se vuelve al envío directo sin downtime?

---

## 6. Notas finales

- Esta tarea es **independiente** de [admin-asistencia-formal.md](admin-asistencia-formal.md) pero la complementa. Se puede implementar antes, después o en paralelo. Idealmente **después**, porque admin-asistencia agrega un nuevo call-site (`EnviarNotificacionAsistenciaCorreccion`) que también debería entrar al outbox.
- El usuario es senior, prefiere respuestas directas y odia el ruido. Va al grano. Al cerrar conversación con "gracias", responder con feedback bidireccional obligatorio (`.claude/rules/communication.md`).
- **NO empezar a implementar hasta cerrar las 7 decisiones**. La task tiene scope variable según las respuestas (puede ser 1 día o 1 semana de trabajo según opciones).
