> **Repo destino**: `educa-web` (frontend, branch `main`) + `Educa.API` (backend, branch `master`).
> **Plan**: 38 · **Chat**: 6 · **Fase**: F6.FE+BE · **Modo sugerido**: `/execute`
> **Creado**: 2026-04-29 · **Estado**: ⏳ pendiente arrancar.
> **Pre-requisito**: Chat 5 (075) mergeado + Plan 37 Chat 3 (068) deployado (tab blacklist y cuarentena visibles).
>
> **🔗 Cross-link Plan 39 (D5/D13 del brief 071)**: el ownership del `EmailHub` server-side se movió a Plan 39 Chat B (078) — este chat NO crea `Hubs/EmailHub.cs`. Este chat **solo** registra el listener FE para los **3 eventos** del hub (no solo `BlacklistEntryCreated`):
>
> - `BlacklistEntryCreated(correo, motivo, intentos)` — Plan 38.
> - `DeferFailStatusUpdated(hits, limit, ventana, banda)` — Plan 39.
> - `CandidatoBlacklistDetectado(destinatario, hits, ultimoHit)` — Plan 39.
>
> El listener vive en un service compartido `email-hub.service.ts` que crea Plan 39 Chat C (079). Plan 39 Chat D (080) reusa ese service para alinear el banner B9 cross-páginas. **Pre-req actualizado**: además del Chat 5 + Plan 37 Chat 3, este chat necesita Plan 39 Chat B (078) BE deployado para que el hub server-side exista. Si Plan 39 Chat C (079) llega antes, el service `email-hub.service.ts` ya está creado y este chat solo agrega el banner B9 + toast.

---

# Plan 38 Chat 6 — Banner B9 + toast SignalR (`EmailHub`) en admin/email-outbox

## CONTEXTO

Decisiones D4 (`EmailHub` aparte) + D8 (banner B9 + toast cuando `defer-fail-status >= 4/5` o `MailboxFullBlacklistHandler` dispara). El admin no debe enterarse del bloqueo cuando ya ocurrió — debe verlo venir.

## OBJETIVO

1. Crear `EmailHub` SignalR (BE).
2. Push de eventos: `BlacklistEntryCreated` (Chat 2) + `DeferFailStatusUpdated` (delegar a Plan 39 Chat B; este chat solo wirea el listener vacío).
3. Banner B9 (`rules/design-system.md` §6.B9) + toast (`MessageService` PrimeNG).

## ARCHIVOS

### Backend (Educa.API)

#### Nuevos

- `Educa.API/Hubs/EmailHub.cs` — hub SignalR. Auth `[Authorize(Roles = Roles.Administrativos)]`. Grupos: `email-alerts`. Métodos `JoinAlerts(string)`, `LeaveAlerts(string)`.
- `Educa.API/Services/Notifications/EmailHubNotifier.cs` — wrapper que inyecta `IHubContext<EmailHub>` y publica eventos. Métodos:
  - `NotifyBlacklistEntryCreatedAsync(string correoEnmascarado, string motivo, int intentos)`
  - `NotifyDeferFailStatusUpdatedAsync(int hits, int limit)` (Plan 39 lo consume).
- `Educa.API/Constants/Sistema/EmailHubEvents.cs` — constantes de nombre de evento (string magic-free).

#### Modificados

- `Educa.API/Services/Notifications/MailboxFullBlacklistHandler.cs` (del Chat 2) — disparar `EmailHubNotifier.NotifyBlacklistEntryCreatedAsync` después del UPSERT exitoso. Fire-and-forget con `INV-S07`.
- `Educa.API/Services/Notifications/EmailBlacklistService.cs` — disparar también desde `CrearManualAsync` (Chat 3).
- `Educa.API/Extensions/ServiceExtensions.cs` — DI de `EmailHubNotifier`.
- `Educa.API/Program.cs` — `app.MapHub<EmailHub>("/emailhub")`.

### Frontend (educa-web)

#### Nuevos

- `src/app/core/services/signalr/email-hub.service.ts` — wrapper de `HubConnection`. Patrón análogo a `AsistenciaSignalRService`. Expone:
  - `connect()` / `disconnect()`
  - Observable `blacklistEntryCreated$: Observable<{ correoEnmascarado, motivo, intentos }>`
  - Observable `deferFailStatusUpdated$: Observable<{ hits, limit }>`
- `src/app/features/intranet/pages/admin/email-outbox/components/defer-fail-banner/defer-fail-banner.component.{ts,html,scss}` — banner B9 con `color-mix()` (`rules/design-system.md` §6.B9). Inputs: `hits: number`, `limit: number`, `visible: boolean`. Severity `danger` cuando `hits >= 4` o `BlacklistEntryCreated` reciente (último 5min).

#### Modificados

- `src/app/features/intranet/pages/admin/email-outbox/email-outbox.component.{ts,html}` — montar `<app-defer-fail-banner>` arriba del bloque de tabs. Listener SignalR + `MessageService.add({ severity: 'warn', summary: 'Bloqueo automático', detail: '...' })` ante `blacklistEntryCreated$`.
- `src/app/core/services/feature-flags/feature-flags.service.ts` — feature flag `emailDeferAlerts` (default `true` para Director).

### Tests (~10 tests)

#### Backend

- `EmailHubTests.cs` (nuevo):
  1. `JoinAlerts_AddsToGroup`.
  2. `LeaveAlerts_RemovesFromGroup`.
  3. `Auth_NoAdministrativos_Returns403`.

- `EmailHubNotifierTests.cs` (nuevo):
  4. `NotifyBlacklistEntryCreated_PusheaACorrectoGrupo`.
  5. `INV_S07_ContextDisposed_NoFalla` — fail-open.

#### Frontend

- `email-hub.service.spec.ts`:
  6. `connect/disconnect` ciclo.
  7. `blacklistEntryCreated$` emite ante eventos del hub.
  8. Reconnect automático ante drop de conexión.

- `defer-fail-banner.component.spec.ts`:
  9. Render con `hits=0` → no visible.
  10. Render con `hits=4, limit=5` → severity `warn`.
  11. Render con `hits=5, limit=5` → severity `danger`.

- `email-outbox.component.spec.ts` (extender):
  12. SignalR mock dispara → `MessageService.add` llamado con severity `warn`.

## VALIDACIÓN

```bash
# Backend
dotnet build Educa.API/Educa.API/Educa.API.csproj
dotnet test --filter FullyQualifiedName~EmailHub

# Frontend
npm run lint
npm run test  # +10 FE tests verdes
npm run build
```

## INVARIANTES

- ✅ `INV-MAIL04` extendida — el monitoreo del defer-fail ahora también empuja vía SignalR (no solo polling 60s).
- ✅ `INV-S07` (fail-open) — fallo en push SignalR NO debe bloquear el envío del correo, NO debe bloquear el handler.
- ✅ Auth `Administrativos` en hub.
- Cap 300 ln respetado en BE / 500 ln en FE.

## VERIFICACIÓN POST-DEPLOY

1. Director navega a `/intranet/admin/email-outbox` → DevTools Network: WebSocket abierto a `/emailhub`.
2. Forzar 2 hits 4.2.2 en sandbox → toast aparece sin refresh + banner B9 visible.
3. Cerrar pestaña, abrir otra → banner B9 NO aparece automáticamente (banner solo dura 5min, `setTimeout` cleanup).
4. Mock `defer-fail-status >= 4` → banner aparece solo, sin necesidad del handler.
5. Profesor navega a `/intranet/admin/email-outbox` → 403 al hub (sin `Administrativos`).

## OUT

- Push del `defer-fail-status` real desde el contador del MTA — eso lo hace Plan 39 Chat B (el endpoint pull ya existe; el push complementa).
- Otros eventos del hub (cuarentena, dominios) — Plan 37 los agrega.

## ENTREGABLE AL CERRAR

Commit `feat(email): EmailHub + defer-fail banner with SignalR push`. Brief a `awaiting-prod/`.
