# Plan: Flujos Alternos — Resiliencia ante Fallos de Dependencias Externas

> **Última actualización**: 2026-04-09
> **Principio**: "Si una dependencia externa falla, la app pierde funcionalidad pero nunca se detiene."
> **Prerequisito**: Proyecto limpio (roadmap de enforcement completado o en progreso).

---

## Qué es un Flujo Alterno

Un flujo alterno es un camino de respaldo que se activa **automáticamente** cuando una dependencia externa falla. No es una solución óptima — es una red de seguridad para evitar el detenimiento completo de operaciones.

**Lo que ya existe**: WAL (offline sync para mutaciones), SignalR con `withAutomaticReconnect`, SW con cache SWR, `withRetry` para errores transitorios.

**Lo que falta**: Plan transversal (front + back) para cada dependencia, detección de fallos consistente, persistencia durante fallos prolongados, y recuperación ordenada.

---

## Inventario de Dependencias Externas (Orden de Criticidad)

| # | Dependencia | Criticidad | Impacto si falla | Flujo alterno actual |
|---|-------------|-----------|-------------------|---------------------|
| 1 | **Azure SQL Server** | 🔴 Crítica | Backend no puede leer ni escribir datos. App inutilizable. | ❌ Ninguno |
| 2 | **Azure App Service** (API backend completo) | 🔴 Crítica | Frontend no puede comunicarse con backend. Todas las operaciones fallan. | ⚠️ Parcial: SW cache para lecturas, WAL para escrituras pendientes |
| 3 | **Internet del usuario** | 🟠 Alta | Igual que #2 desde perspectiva del frontend | ⚠️ Parcial: SW cache + WAL |
| 4 | **CrossChex Cloud API** | 🟡 Media | Asistencia biométrica no se sincroniza. Asistencia manual sigue funcional. | ⚠️ Parcial: Hangfire reintenta, pero sin detección ni notificación |
| 5 | **MailKit/SMTP** | 🟡 Media | Correos de asistencia y notificaciones no llegan | ✅ EmailOutbox con retry exponencial (5 intentos) |
| 6 | **SignalR** (hubs) | 🟢 Baja | Se pierde tiempo real (chat, broadcast asistencia). Funciones siguen vía HTTP. | ✅ `withAutomaticReconnect` con backoff |
| 7 | **Azure Blob Storage** | 🟢 Baja | No se pueden subir/descargar archivos. Resto funcional. | ❌ Ninguno |
| 8 | **Firebase FCM** (push) | 🟢 Baja | Push notifications no llegan al móvil. App web no se afecta. | ❌ Ninguno (fire-and-forget) |
| 9 | **JaaS/Jitsi** (videoconferencias) | 🟢 Baja | Videoconferencias no disponibles. Feature flag puede desactivar. | ❌ Ninguno |

---

## Arquitectura de Detección y Respuesta

### Modelo: 3 capas

```
CAPA 1: DETECCIÓN          CAPA 2: DEGRADACIÓN          CAPA 3: RECUPERACIÓN
─────────────────          ──────────────────           ────────────────────
¿La dependencia             Activar flujo alterno        Sincronizar lo pendiente
está respondiendo?          para seguir operando         cuando vuelva

Health checks               Cache/WAL/fallbacks          Sync engine
Timeouts                    UI indicators                Retry queues
Circuit breaker             Feature degradation          Reconciliación
```

---

## Plan por Dependencia

### DEP-1: Azure SQL Server (🔴 Crítica)

**Escenario**: Azure SQL no responde. El backend lanza excepciones en toda query.

**Detección (Backend)**:
- Health check endpoint `/api/sistema/health` que hace `SELECT 1` contra la BD
- Si falla 3 veces consecutivas → backend entra en modo degradado
- Log `CRITICAL` + alerta (futuro: integración con Azure Monitor)

**Degradación (Backend)**:
- Endpoint de health retorna `503 Service Degraded` con detalle de qué falló
- Endpoints de lectura: retornan `503` con mensaje claro, no `500` genérico
- Endpoints de escritura: retornan `503` — frontend encola en WAL
- **NO intentar cache en backend** — la fuente de verdad es la BD, cache parcial causa inconsistencias

**Degradación (Frontend)**:
- SW cache sirve datos de lectura (SWR sin la R — solo stale)
- WAL persiste escrituras en IndexedDB (ya funciona)
- Banner visible: "Servicio en mantenimiento. Tus cambios se guardarán cuando el servicio se restaure."
- Deshabilitar operaciones que requieren consistencia inmediata (aprobaciones, cierre de periodo)

**Recuperación**:
- Health check vuelve OK → backend sale del modo degradado
- WAL sync engine procesa operaciones pendientes (ya existe)
- Frontend detecta reconexión → refresca datos desde API

**Esfuerzo**: Alto (Backend: health check service + modo degradado. Frontend: banner + detección)

---

### DEP-2: Azure App Service — Backend completo (🔴 Crítica)

**Escenario**: El backend no responde en absoluto (deploy fallido, App Service reiniciándose, Azure caído).

**Detección (Frontend)**:
- Interceptor HTTP detecta `0 status` (network error) o `502/503/504` en requests a `/api/*`
- Si N requests consecutivas fallan (N=3) dentro de una ventana de 30 segundos → modo offline forzado
- El SW ya maneja esto parcialmente (devuelve cache si existe, 503 si no)

**Degradación (Frontend)**:
- **Lecturas**: SW cache (datos de la última visita exitosa). Indicador visual de "datos pueden no estar actualizados"
- **Escrituras**: WAL en IndexedDB. Indicador visual de operaciones pendientes (ya existe: `sync-status` + `pending-operations` drawer)
- **Nuevo: Persistencia extendida en WAL**:
  - Actualmente WAL no tiene límite de retención explícito
  - Agregar estimación de storage disponible (`navigator.storage.estimate()`)
  - Si storage > 80%, advertir al usuario y dejar de aceptar operaciones nuevas
  - Si storage está bien, WAL puede acumular operaciones por horas/días

**Degradación (Backend — cuando vuelva)**:
- `IdempotencyMiddleware` ya previene duplicados vía `X-Idempotency-Key`
- WAL sync engine reenvía operaciones pendientes en orden
- Operaciones que fallaron por timeout: WAL las reintenta con el mismo idempotency key

**Recuperación**:
- Frontend detecta que API responde (health check periódico cada 30s cuando está en modo offline)
- WAL sync engine se activa automáticamente
- Banner se oculta cuando sync completa y datos frescos llegan

**Esfuerzo**: Medio (Frontend: detección de N fallos consecutivos + health check polling + banner. WAL ya cubre la persistencia)

---

### DEP-3: Internet del usuario (🟠 Alta)

**Escenario**: El usuario pierde conexión WiFi/datos móviles.

**Detección (Frontend)**:
- `navigator.onLine` + `SwService.isOnline$` (ya existe)
- Confirmar con fetch a un recurso conocido (el `online` event puede dar falsos positivos)

**Degradación**: Igual que DEP-2 desde la perspectiva del frontend. WAL + SW cache.

**Diferencia clave vs DEP-2**: En DEP-3, al volver la conexión el backend está sano. La recuperación es más simple — solo WAL sync.

**Nuevo requerido**:
- Capacitor: `@capacitor/network` para detección nativa de conectividad (más confiable que `navigator.onLine`)
- Prueba de conectividad real: `HEAD` al health check endpoint, no confiar solo en el evento del browser

**Esfuerzo**: Bajo (mucho ya existe, solo agregar detección robusta y banner)

---

### DEP-4: CrossChex Cloud API (🟡 Media)

**Escenario**: La API de CrossChex no responde. Hangfire no puede sincronizar asistencia biométrica.

**Detección (Backend)**:
- Hangfire job `SincronizarAsistenciaMatutina` ya reintenta cada 5 minutos
- **Nuevo**: Si el job falla N veces consecutivas (N=3), registrar en tabla de estado de integraciones
- Log `WARNING` con tag `CROSSCHEX`

**Degradación (Backend)**:
- Asistencia biométrica no se actualiza, pero:
  - Asistencia manual (`AsistenciaAdminService`) sigue funcional al 100%
  - Asistencia por curso sigue funcional al 100%
- **Nuevo**: Endpoint `/api/sistema/integration-status` que retorna estado de CrossChex
- **Nuevo**: Notificación al Director cuando CrossChex lleva >30min sin responder

**Degradación (Frontend)**:
- En la vista de asistencia diaria, mostrar indicador: "Última sincronización biométrica: hace X minutos"
- Si > 30min: badge de advertencia en la vista de asistencia

**Recuperación**:
- Hangfire reanuda automáticamente cuando CrossChex responde
- Los registros biométricos perdidos durante la caída se recuperan en la siguiente sincronización exitosa (CrossChex retorna registros por rango de fecha, no solo nuevos)

**Esfuerzo**: Medio (Backend: estado de integración + notificación. Frontend: indicador de última sincronización)

---

### DEP-5: MailKit/SMTP (🟡 Media)

**Escenario**: El servidor SMTP no acepta conexiones.

**Estado actual**: `EmailOutbox` con `EmailOutboxWorker` ya maneja retry exponencial (5 intentos). Los correos quedan encolados en BD.

**Lo que falta**:
- **Detección visible**: Si hay >10 correos pendientes en outbox con >3 reintentos, notificar al Director
- **Dashboard admin**: Vista de estado del outbox (pendientes, fallidos, últimos enviados)
- **Retención**: Correos que agotan los 5 intentos quedan como `FAILED` — el admin debería poder re-encolarlos manualmente

**Esfuerzo**: Bajo (Backend: query al outbox + endpoint de estado. Frontend: card en dashboard admin)

---

### DEP-6: SignalR Hubs (🟢 Baja)

**Estado actual**: `withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000])` — reconexión automática con backoff hasta 60s.

**Lo que falta**:
- **Fallback a polling manual**: Si SignalR no reconecta después de 60s, ofrecer botón "Refrescar" en las vistas que dependen de tiempo real (chat, asistencia)
- El botón dispara un `GET` normal al endpoint HTTP equivalente
- No se necesita polling automático — basta con que el usuario pueda refrescar manualmente

**Esfuerzo**: Bajo (agregar botón de refresh condicionado a estado de SignalR)

---

### DEP-7: Azure Blob Storage (🟢 Baja)

**Escenario**: Blob storage no responde. No se pueden subir ni descargar archivos.

**Degradación**:
- Mostrar mensaje claro: "No se pueden cargar archivos en este momento"
- Las vistas que muestran archivos: mostrar placeholder en lugar de error
- **No bloquear** formularios que tienen campo de archivo — permitir guardar sin archivo y subir después

**Esfuerzo**: Bajo (manejo de error en `BlobStorageService` + UI fallback)

---

### DEP-8: Firebase FCM (🟢 Baja)

**Estado actual**: Fire-and-forget. Si falla, no afecta operaciones.

**Lo que falta**:
- Log `WARNING` si FCM falla (para monitoreo, no para acción inmediata)
- Las notificaciones fallidas quedan en `NotificationsService` de la app — el usuario las ve al abrir la intranet

**Esfuerzo**: Mínimo (solo logging)

---

### DEP-9: JaaS/Jitsi (🟢 Baja)

**Escenario**: JaaS no genera tokens o Jitsi no carga.

**Degradación**:
- Si el token falla: mensaje claro "Videoconferencia no disponible temporalmente"
- Feature flag `videoconferencias` puede desactivarse por config si el problema es prolongado

**Esfuerzo**: Mínimo (ya tiene feature flag)

---

## Componente Transversal: Health Monitor

Un servicio nuevo que centraliza la detección de estado de todas las dependencias.

### Frontend: `HealthMonitorService`

```
Ubicación: @core/services/health/health-monitor.service.ts

Responsabilidades:
- Polling periódico al health check del backend (cada 30s en modo degradado, cada 5min en modo normal)
- Estado consolidado: { backend: 'up'|'down'|'degraded', internet: 'online'|'offline' }
- Signal reactivo que consume el layout para mostrar/ocultar banners
- No hace polling cuando todo está bien Y la app está en foreground
```

### Backend: Health Check Endpoint

```
Ubicación: Controllers/Sistema/HealthController.cs

GET /api/sistema/health → {
  status: 'healthy' | 'degraded' | 'unhealthy',
  checks: {
    database: { status, latencyMs },
    crosschex: { status, lastSyncAt },
    smtp: { status, pendingEmails },
    blobStorage: { status },
    signalr: { status }
  },
  timestamp
}

- Cada check tiene timeout de 3 segundos
- Si algún check falla → status = 'degraded'
- Si database falla → status = 'unhealthy'
- Rate limit: máximo 1 check real cada 30s (cache en memoria)
- [AllowAnonymous] para que funcione sin auth (el frontend puede estar sin token)
```

---

## Banner de Estado Degradado (Frontend)

```
Ubicación: @shared/components/health-banner/

Comportamiento:
- Se muestra encima del header cuando health != 'healthy'
- Colores: amarillo (degraded), rojo (unhealthy/offline)
- Mensajes según estado:
  - Offline: "Sin conexión. Tus cambios se guardan localmente."
  - Backend down: "Servicio en mantenimiento. Tus cambios se guardarán automáticamente."
  - Degraded: "Algunas funciones pueden estar limitadas."
- Incluye timestamp de última conexión exitosa
- Se oculta automáticamente cuando todo vuelve a la normalidad
```

---

## Fases de Implementación

### Fase 1: Infraestructura base (Prerequisito para todo lo demás)

| # | Tarea | Lado | Esfuerzo |
|---|-------|------|----------|
| 1.1 | Health check endpoint (`/api/sistema/health`) — solo BD + respuesta simple | Backend | Bajo |
| 1.2 | `HealthMonitorService` — polling al health check, signals de estado | Frontend | Medio |
| 1.3 | `HealthBannerComponent` — banner visual de estado degradado | Frontend | Bajo |
| 1.4 | Integrar banner en `intranet-layout` y `main-layout` | Frontend | Bajo |

### Fase 2: DEP-2 y DEP-3 — Backend/Internet caído

| # | Tarea | Lado | Esfuerzo |
|---|-------|------|----------|
| 2.1 | Detección de N fallos consecutivos en interceptor → modo offline forzado | Frontend | Medio |
| 2.2 | WAL: estimación de storage disponible + advertencia de capacidad | Frontend | Bajo |
| 2.3 | Capacitor: `@capacitor/network` para detección nativa | Frontend | Bajo |
| 2.4 | Health check polling en modo offline (cada 30s) + auto-recovery | Frontend | Medio |

### Fase 3: DEP-1 — Azure SQL caído

| # | Tarea | Lado | Esfuerzo |
|---|-------|------|----------|
| 3.1 | Health check ampliado — `SELECT 1` contra BD con circuit breaker | Backend | Medio |
| 3.2 | Modo degradado en backend — endpoints retornan 503 informativo | Backend | Alto |
| 3.3 | Lista de operaciones bloqueadas en modo degradado (aprobaciones, cierre periodo) | Frontend | Medio |

### Fase 4: DEP-4 a DEP-9 — Dependencias secundarias

| # | Tarea | Lado | Esfuerzo |
|---|-------|------|----------|
| 4.1 | Health check ampliado con CrossChex, SMTP, Blob | Backend | Medio |
| 4.2 | Estado de última sincronización CrossChex en vista de asistencia | Frontend | Bajo |
| 4.3 | Dashboard de estado de outbox de correos | Frontend + Backend | Medio |
| 4.4 | Fallback de refresh manual cuando SignalR no reconecta | Frontend | Bajo |
| 4.5 | Manejo de error en Blob Storage con placeholder UI | Frontend | Bajo |

---

## Grafo de Dependencias

```
Fase 1 (Health infra) ──→ Fase 2 (Backend/Internet) ──→ Fase 3 (Azure SQL)
                      └──→ Fase 4 (Dependencias secundarias)
```

Fase 2 y Fase 4 son paralelizables entre sí (una es frontend, la otra es transversal pero independiente).

---

## Invariantes de Flujos Alternos

| ID | Invariante |
|----|-----------|
| `INV-FA01` | Un fallo en dependencia externa **NUNCA** produce error 500 sin contexto — siempre 503 con mensaje claro |
| `INV-FA02` | WAL persiste operaciones indefinidamente mientras haya storage disponible — no hay timeout de descarte |
| `INV-FA03` | La recuperación es automática — el usuario no debe hacer nada manual para re-sincronizar |
| `INV-FA04` | Operaciones que requieren consistencia inmediata (aprobaciones, cierre periodo) se **bloquean** en modo degradado, no se encolan |
| `INV-FA05` | El health check no expone información sensible — solo estados y latencias |
| `INV-FA06` | El banner de estado es no-intrusivo — no bloquea la UI, solo informa |

---

## Checklist Pre-Implementación

```
DETECCIÓN
[ ] ¿Cada dependencia tiene un mecanismo de detección de fallo?
[ ] ¿Los health checks tienen timeout (no bloquear si la dependencia cuelga)?
[ ] ¿Hay circuit breaker para evitar hammering a una dependencia caída?

DEGRADACIÓN
[ ] ¿El usuario puede seguir operando (aunque sea en modo limitado)?
[ ] ¿Las operaciones pendientes se persisten en WAL/outbox?
[ ] ¿La UI comunica claramente el estado degradado?
[ ] ¿Las operaciones que requieren consistencia se bloquean (no se encolan)?

RECUPERACIÓN
[ ] ¿La recuperación es automática al volver la dependencia?
[ ] ¿Las operaciones encoladas se sincronizan en orden con idempotency?
[ ] ¿Los datos de lectura se refrescan al reconectar?
[ ] ¿El banner se oculta automáticamente?

TRANSVERSAL
[ ] ¿El plan cubre frontend Y backend?
[ ] ¿No se duplicó infraestructura existente (WAL, SW, reconnect)?
[ ] ¿Los logs tienen contexto suficiente para diagnosticar?
```
