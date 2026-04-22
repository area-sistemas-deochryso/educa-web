> **Repo destino**: `educa-web` (frontend, branch `main`) + toca `Educa.API` (backend, branch `master`) para el endpoint nuevo. Arrancar el chat en `educa-web`; el endpoint BE es un archivo chico que se commitea al final en el repo backend.
> **Plan**: 22 · **Chat**: B · **Fase**: F5.6 · **Estado**: ⏳ pendiente arrancar.

---

# Plan 22 Chat B — F5.6 FE: widget throttle status (7 counters per-sender + dominio)

## PLAN FILE

- **Maestro**: `.claude/plan/maestro.md` → fila 22 del inventario. Chat A cerrado 2026-04-21, Chat B es la última pieza de F5+F6 (UI de observabilidad del throttle saliente).
- **Plan 22**: `../../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` → checklist final, ítem "Chat B — F5.6" (FE, 1 chat).
- **Chat A cerrado (BE)**: `.claude/chats/closed/012-plan-22-chat-a-cierre-tests-sql-deploy.md`. Infraestructura servidora del throttle ya está en prod.

## OBJETIVO

Exponer en la UI admin una **lectura en tiempo real** del estado de cuota saliente SMTP: cuántos correos SENT lleva cada uno de los 7 buzones remitentes en los últimos 60 minutos (ventana deslizante) y cuánto lleva el dominio agregado. Esto da al Director visibilidad de:

1. Si el throttle está previniendo bounces (counters no llegan a 50/200).
2. Si hay un sender saturando por problema de config (round-robin mal balanceado).
3. Si el dominio se acerca al techo en ráfagas legítimas (resumen diario, aprobación masiva) y amerita diferir.

Sin este widget, el Chat A cierra en producción pero el equipo solo ve los efectos (correos que llegan) sin poder auditar el throttle antes de problemas.

## ALCANCE

### Backend (Educa.API, ~100 líneas nuevas totales)

1. **DTO** `ThrottleStatusDto.cs` en `Educa.API/DTOs/Sistema/`:

   ```csharp
   public sealed record ThrottleStatusDto
   {
       public required List<SenderCounterDto> Senders { get; init; }
       public required int DomainCount { get; init; }
       public required int DomainLimit { get; init; }       // ThrottleLimitPerDomainPerHour (200)
       public required int PerSenderLimit { get; init; }    // ThrottleLimitPerHour (50)
       public required bool ThrottleEnabled { get; init; }
       public required DateTime NowUtc { get; init; }       // DateTimeHelper.PeruNow() → cliente decide display
   }

   public sealed record SenderCounterDto
   {
       public required string Address { get; init; }        // enmascarado parcial si aplica (ver reglas)
       public required int Index { get; init; }             // posición en Senders (0-6)
       public required int Count { get; init; }             // SENT últimos 60 min
       public required int Limit { get; init; }             // PerSender = 50
       public required bool Saturated { get; init; }        // Count >= Limit
   }
   ```

2. **Endpoint** `GET /api/email-outbox/throttle-status` en `EmailOutboxController.cs`:
   - `[Authorize(Roles = Roles.Administrativos)]` (los 4 admin roles).
   - `[EnableRateLimiting("reports")]` o `heavy` — es consulta de monitoreo, puede ejecutarse repetidas veces.
   - Delega a un `IEmailOutboxMonitoringService` nuevo que llama en paralelo a `IQuotaThrottleService.CheckQuotaAsync(sender, ct)` por cada sender configurado (`EmailSettings.Senders`) + 1 query de counter de dominio.
   - Retorna `ApiResponse<ThrottleStatusDto>.Success(...)`.

3. **Service** `EmailOutboxMonitoringService` en `Services/Notifications/`:
   - Usa `IQuotaThrottleService.CheckQuotaAsync` para per-sender (ya existe, no reinventar).
   - Agrega query de dominio via `ApplicationDbContext.EmailOutbox` con `AsNoTracking()` y `WHERE EO_Estado='SENT' AND EO_FechaEnvio >= @cutoff` (no filtra remitente — cuenta todo el dominio, consistente con `IX_EmailOutbox_FechaEnvio_Sent` ya creado en Chat A).
   - `PerSenderLimit` y `DomainLimit` leídos de `EmailSettings` inyectado (no hardcoded).

4. **DI**: registrar `IEmailOutboxMonitoringService` en `ServiceExtensions.cs`.

**Nota BE**: NO tocar `QuotaThrottleService` ni `EmailOutboxWorker.Sender.cs`. Este chat solo **lee** el estado, no muta lógica de throttle.

### Frontend (educa-web)

1. **Model** `throttle-status.models.ts` en `features/intranet/pages/admin/email-outbox/models/`:
   - `ThrottleStatus` + `SenderCounter` espejos del DTO BE.

2. **Service method** en `email-outbox.service.ts`:
   - `getThrottleStatus(): Observable<ThrottleStatus>` — GET `/email-outbox/throttle-status`, ApiResponse se desempaqueta por interceptor (no usar `ApiResponse<T>` genérico — ver `feedback_api_response_unwrap.md`).

3. **Store** `email-outbox.store.ts` (extender, ya existe):
   - `_throttleStatus = signal<ThrottleStatus | null>(null)`
   - `throttleStatus` readonly
   - `_throttleLoading = signal<boolean>(false)` + readonly
   - Setters `setThrottleStatus`, `setThrottleLoading`.

4. **Data facade** `email-outbox-data.facade.ts`:
   - `loadThrottleStatus(): void` — dispara el GET, maneja loading + error (NotificationsService para toast si falla).
   - **Polling opcional**: cada 30s mientras el widget esté visible. Implementar con `setInterval` cleanup via `DestroyRef` o usar `rxjs.interval(30000).pipe(takeUntilDestroyed)`. Arrancar en default OFF; togglear con un switch en el header del widget. Persistir preferencia en `PreferencesStorageService` (key `email-outbox-throttle-auto-refresh`).

5. **Componente** nuevo `throttle-status-widget.component.ts` en `components/throttle-status-widget/`:
   - Presentacional (`OnPush`, `input()` para `status: ThrottleStatus | null`, `loading: boolean`).
   - Template: grid 2 columnas con 7 cards per-sender (circle progress o barra con `count/limit`) + 1 card global de dominio más grande. Cada card muestra:
     - Email del sender (enmascarado en el medio: `sistemas@***.com` — o sin máscara si el usuario confirma; decisión al arrancar).
     - Counter actual (ej. `12 / 50`).
     - Tag `saturated` con `severity="danger"` si `saturated=true`, `warn` si `count >= limit * 0.8`, `success` si `< 0.5`, `info` si entre 0.5 y 0.8.
   - Card de dominio: misma estructura, `200` como denominador, badge grande si `domainCount / domainLimit >= 0.9` con mensaje "Acercándose al techo del dominio".
   - Mensaje "Throttle deshabilitado" en caso de `throttleEnabled=false` (config en appsettings con flag off).

6. **Integración** en `email-outbox.component.html`:
   - Insertar el widget **después del header, antes de la barra de filtros**.
   - Colapsable: por default expandido; botón icon `pi-chevron-up/down` persiste estado en `PreferencesStorageService`.
   - Ícono de refresh manual + switch "auto-refresh 30s" en el header del widget.

7. **Feature flag** `emailOutboxThrottleWidget` en `environment.ts` + `environment.development.ts`. Default ON en dev, OFF en prod hasta validar 24-48h post-deploy (los 6 buzones ya están operativos según Chat A cierre).

### Archivos

| Repo | Acción | Ruta | Líneas estimadas |
|------|--------|------|-----|
| BE | crear | `Educa.API/DTOs/Sistema/ThrottleStatusDto.cs` | ~40 |
| BE | crear | `Educa.API/Interfaces/Services/Notifications/IEmailOutboxMonitoringService.cs` | ~20 |
| BE | crear | `Educa.API/Services/Notifications/EmailOutboxMonitoringService.cs` | ~80 |
| BE | editar | `Educa.API/Controllers/Sistema/EmailOutboxController.cs` | +20 (1 endpoint) |
| BE | editar | `Educa.API/Extensions/ServiceExtensions.cs` | +1 línea DI |
| BE | crear | `Educa.API.Tests/Services/Notifications/EmailOutboxMonitoringServiceTests.cs` | ~100 (5-6 tests) |
| FE | crear | `src/app/features/intranet/pages/admin/email-outbox/models/throttle-status.models.ts` | ~25 |
| FE | editar | `src/app/features/intranet/pages/admin/email-outbox/services/email-outbox.service.ts` | +15 |
| FE | editar | `src/app/features/intranet/pages/admin/email-outbox/services/email-outbox.store.ts` | +20 |
| FE | editar | `src/app/features/intranet/pages/admin/email-outbox/services/email-outbox-data.facade.ts` | +40 (polling) |
| FE | crear | `.../components/throttle-status-widget/throttle-status-widget.component.ts` | ~150 |
| FE | crear | `.../components/throttle-status-widget/throttle-status-widget.component.html` | ~80 |
| FE | crear | `.../components/throttle-status-widget/throttle-status-widget.component.scss` | ~120 |
| FE | editar | `email-outbox.component.ts` + `.html` | +20 (integración) |
| FE | editar | `environment.ts` + `environment.development.ts` | +1 flag c/u |
| FE | crear | `throttle-status-widget.component.spec.ts` | ~100 (4-5 tests) |
| FE | crear | `email-outbox-data.facade.spec.ts` (extender) | +30 (polling test) |

**Ningún archivo supera 300 líneas** (cap duro). Respetar el design-system B1-B11 para el widget (card con border, no shadow decorativo).

## TESTS MÍNIMOS

### Backend (BE)

- `GetThrottleStatus_con_7_senders_configurados → retorna 7 SenderCounterDto + 1 DomainCount`
- `GetThrottleStatus_cuando_ThrottleEnabled=false → retorna Senders vacía, ThrottleEnabled=false`
- `GetThrottleStatus_sender_con_50_SENT_en_60min → marca Saturated=true`
- `GetThrottleStatus_dominio_con_200_SENT → DomainCount=200 (no lo limita, solo informa)`
- `GetThrottleStatus_cuenta_solo_EO_Estado=SENT → FAILED/PENDING_RETRY no suman` (alineado con `QuotaThrottleService`)
- `Endpoint_sin_rol_administrativo → 403` (test controller con `ClaimsPrincipalBuilder.WithRol("Profesor")`)

### Frontend (FE)

- `getThrottleStatus → delega a http.get con URL correcta y retorna ThrottleStatus mapeado`
- `loadThrottleStatus → setLoading(true) antes, setThrottleStatus(data) después`
- `loadThrottleStatus_con_error → setLoading(false) + notificación toast`
- `widget muestra 7 cards per-sender + 1 card dominio (según input)`
- `widget muestra severity=danger cuando saturated=true`
- `auto-refresh toggle persiste en PreferencesStorageService`

## REGLAS OBLIGATORIAS

- **INV-D05** (queries read-only con `AsNoTracking()`): el query de dominio en `EmailOutboxMonitoringService` debe usarlo.
- **INV-S07** (fire-and-forget notificaciones): no aplica — este endpoint no envía correos, solo lee.
- **INV-AD01**: no muta `AsistenciaPersona` ni `EmailOutbox`. Solo lectura.
- **Cap 300 líneas** por archivo (.cs y .ts). Si un archivo se acerca, partial + named responsibility.
- **ApiResponse unwrap**: el interceptor ya desenvuelve — en FE usar `get<ThrottleStatus>()`, NO `get<ApiResponse<ThrottleStatus>>()`.
- **Roles.Administrativos**: 4 roles (Director + Asistente Administrativo + Promotor + Coordinador Académico). Consistente con `EmailOutboxController` ya existente.
- **Design System B1-B11** (`.claude/rules/design-system.md`): widget con `border`, no `background: #fff` ni shadows decorativos. Stat card anatomy (`.stat-card`) aplica — background transparente global, border 1px surface-300, border-radius 12px.
- **A11y** (`.claude/rules/a11y.md`): tags de estado (saturated/warn/success) con `aria-label` descriptivo si son iconográficos. Colores con contraste WCAG AA.
- **Rate limiting**: endpoint `[EnableRateLimiting("reports")]` — el Director puede querer auto-refresh manual durante ráfagas y no queremos que la vista de monitoreo se auto-rate-limite (hay precedente de `/api/sistema/errors` que se auto-rate-limitaba con `heavy`).

## APRENDIZAJES TRANSFERIBLES (del Chat A + cierre)

1. **`IQuotaThrottleService.CheckQuotaAsync(sender, ct)` YA EXISTE** y retorna `QuotaCheckResult(Available, SenderCount)`. El monitoring service solo lo **orquesta** para los 7 senders + agrega query de dominio. No reimplementar lógica de ventana deslizante.

2. **`IX_EmailOutbox_FechaEnvio_Sent` y `IX_EmailOutbox_Remitente_FechaEnvio_Sent`** ya existen en prueba y producción (Chat A cerró el SQL). El endpoint nuevo NO requiere migración SQL.

3. **7 senders configurados** en `appsettings.json` + Azure App Service env vars: `Email__Address`, `Email__Address2`..`Email__Address7`. `EmailSettings.Senders` filtra los slots vacíos automáticamente. En dev puede haber < 7 senders — el widget debe manejar count dinámico (no asumir 7 exactos).

4. **`ApplicationDbContext.EmailOutbox`** con `AsNoTracking()` es el único camino. No hay repository wrapper para EmailOutbox salvo las mutaciones del worker. Service-to-DbContext directo es aceptable porque es read-only de diagnóstico (similar a `RateLimitEventsService` del Plan 26 F1).

5. **Feature flag `emailOutboxThrottleWidget`**: default OFF en prod. El usuario (Director) necesita validar 24-48h de prod estable antes de activarlo — no asumir que va ON inmediatamente. Dev siempre ON para QA local.

6. **Decisión de enmascaramiento de email**: el Chat A no tomó posición. Al arrancar, **preguntar al usuario**: ¿mostrar email completo (`sistemas@laazulitasac.com`) o enmascarado (`sistemas@***.com`)? La vista es solo para 4 roles administrativos (no estudiantes/apoderados), así que el caso de enmascaramiento es débil — default sugerido: **email completo**.

7. **Polling 30s**: precedente en el proyecto — `ChatHub` SignalR para real-time. Para este widget, SignalR es overkill (no necesita sub-segundo latencia). Polling HTTP simple con toggle de usuario es suficiente. El polling se detiene cuando el widget colapsa o el usuario sale de la página (`DestroyRef` + `takeUntilDestroyed`).

8. **Stat card anatomy (B3 del design-system)**: aplica directamente. Content-left (label + value + sublabel) + icon-right. Para los 7 cards per-sender, el layout puede ser compacto en grid de 2-3 columnas; el card del dominio puede ser full-width más grande.

## FUERA DE ALCANCE

- **SignalR real-time** para throttle status. Polling HTTP basta — si en el futuro se necesita, será otro chat.
- **Histórico de counters** (gráfico temporal de los últimos 7 días de saturación). Este chat solo muestra el estado actual (ventana deslizante de 60 min). Histórico requiere tabla nueva + retención + chat dedicado.
- **Alertas automáticas** si dominio > 180 (90% del techo). Solo mostrar badge visual. Plan 24 (sync CrossChex background) o un plan futuro de monitoring pueden agregar email/push al admin.
- **Tocar `QuotaThrottleService` o `EmailOutboxWorker`**. El Chat B es puramente read.
- **Plan 22 F4.BE + F4.FE** (auditoría preventiva): chats 5-6 del plan 22, pendientes, no parte de este.
- **Toggle manual del throttle** (apagar/prender desde UI). El throttle se controla por `ThrottleEnabled` en `appsettings.json` — UI solo lo refleja, no lo muta.

## CRITERIOS DE CIERRE

- [ ] Endpoint BE `GET /api/email-outbox/throttle-status` devuelve `ThrottleStatusDto` válido (probado con Swagger o curl en dev).
- [ ] 6 tests BE nuevos verdes (sin regresión en suite 1053 actual del Chat A cierre).
- [ ] Widget FE renderiza 7 counters per-sender + 1 global de dominio con colores semánticos correctos.
- [ ] Auto-refresh 30s togglable + persiste preferencia en `PreferencesStorageService`.
- [ ] Feature flag `emailOutboxThrottleWidget` en ambos environments, default OFF en prod + ON en dev.
- [ ] Tests FE nuevos (4-5) verdes. Suite completa sin regresión.
- [ ] `npm run lint` limpio, `npm run build` OK.
- [ ] Cap 300 líneas respetado en todos los archivos tocados.
- [ ] Design-system B1-B11 aplicado (sin `background: #fff`, sin shadows decorativos).
- [ ] A11y: aria-labels en icon-only buttons, contraste verificado en los 4 estados (success/info/warn/danger).
- [ ] Commit BE + commit FE separados (repos distintos).
- [ ] Actualizar `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` marcando "Chat B ✅" + fecha de cierre en el checklist.
- [ ] Actualizar `educa-web/.claude/plan/maestro.md` fila 22: cambiar de 75% → 90% (restan solo F4.BE + F4.FE).
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar.

## COMMIT MESSAGE sugerido

**Backend** (`Educa.API`, branch `master`):

```
feat(email-outbox): add throttle status endpoint for 7-sender monitoring

Plan 22 Chat B — read-only endpoint GET /api/email-outbox/throttle-status
delegates to IQuotaThrottleService.CheckQuotaAsync per configured sender
and aggregates domain counter. Returns ThrottleStatusDto with per-sender
counts, saturation flags, and "EmailSettings" limits for admin UI to
render without hardcoding values.

Adds EmailOutboxMonitoringService (80 lines, AsNoTracking domain query),
ThrottleStatusDto record, and 6 tests covering 7-sender config,
ThrottleEnabled=false short-circuit, saturation threshold, domain counter
semantics, and role boundary (non-admin returns 403).

No migration, no touch on throttle logic from Chat A.
```

**Frontend** (`educa-web`, branch `main`):

```
feat(email-outbox): add throttle status widget with 7-sender counters

Plan 22 Chat B — widget in /intranet/admin/email-outbox shows 7 per-sender
counters + domain counter from backend throttle status endpoint. Cards
render severity by count/limit ratio (success/info/warn/danger) matching
design-system B3 stat card anatomy.

Polling toggle (30s interval) persists in PreferencesStorageService.
Collapsible section with "emailOutboxThrottleWidget" feature flag (OFF in
prod, ON in dev). Widget follows design-system rules — transparent
background, border only, no decorative shadows.

Closes Chat B of Plan 22 F5+F6. Infrastructure delivered in Chat A.
```

## CIERRE

Feedback a pedir al cerrar:

1. **Decisión enmascaramiento email**: ¿se mantuvo email completo o enmascarado? ¿Qué motivó la decisión final?
2. **Polling 30s**: ¿resultó suficiente en uso real o se sintió lag? En sesión real con ráfaga legítima (resumen diario, aprobación masiva), el counter debería actualizarse antes del siguiente tick.
3. **Tamaño del widget**: ¿los 7 cards + 1 card de dominio caben cómodamente en viewport desktop sin scroll o el grid necesita responsive más agresivo?
4. **Próximo chat**: confirmar arranque de **Plan 26 F2** (multiplier por rol) como siguiente, con los datos de telemetría de F1 ya recolectados 24-48h (ver fila 26 del maestro + sección F2.4/F2.6 para calibrar multipliers con evidencia real).
