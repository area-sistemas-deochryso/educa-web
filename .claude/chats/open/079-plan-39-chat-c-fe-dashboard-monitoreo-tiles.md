# Plan 39 Chat C FE — Tab "Mapa de envío" en Dashboard del día con 6 tiles

> **Repo destino**: `educa-web` (main)
> **Plan**: 39 · **Chat**: C · **Fase**: F2.Execute · **Estado**: ⏳ pendiente arrancar — prioridad alta
> **Creado**: 2026-04-29 · **Modo sugerido**: `/execute`
> **Pre-req**: Chat A (077) deployado. Plan 38 Chat 5 (075) deployado (cross-link "Bloquear" a tab Blacklist).

## CONTEXTO INMEDIATO

Cierre del design en chat 071 (Plan 39 Chat 1). 6 tiles con orden visual definido en D11.

Endpoints consumidos: 5 del Chat A (077) + 1 del Plan 29 Chat 2.6 (`defer-fail-status`). Hub SignalR del Chat B (078) para push opcional (graceful degradation: si SignalR no conecta, polling cada 30s al endpoint defer-fail-status).

## OBJETIVO

Implementar el tab "Mapa de envío" en `/intranet/admin/monitoreo/correos/dashboard` con los 6 tiles, skeletons independientes, cross-links a tab Blacklist, y listener SignalR para los 3 eventos.

## SCOPE

### Archivos nuevos

Bajo `src/app/features/intranet/pages/admin/email-outbox-dashboard-dia/`:

- `components/defer-fail-live-counter-tile/` (extiende widget Plan 29 con SignalR push del Chat B 078).
- `components/sender-stats-tile/`.
- `components/top-destinatarios-tile/` — incluye CTA "Bloquear" con `routerLink` query param `?correo=`.
- `components/serie-temporal-tile/` — toggle hora/día.
- `components/dominios-receptores-tile/`.
- `components/candidatos-blacklist-tile/` — CTA "Bloquear" prefill dialog del Plan 38.
- `components/mapa-envio-tab/` — container que monta los 6 tiles en grid responsivo.
- `services/email-monitoreo.facade.ts` + `email-monitoreo.store.ts` — orquestación + estado.
- `services/email-monitoreo.api.service.ts` — gateway HTTP a los 5 endpoints + 1 (`defer-fail-status`).
- `models/email-monitoreo.models.ts` — interfaces espejo de los DTOs del BE.
- `services/email-hub.service.ts` — wrapper SignalR del `EmailHub`. Reutilizable por Plan 38 Chat 6 (D13 cross-link).

### Archivos modificados

- `pages/admin/email-outbox-dashboard-dia/email-outbox-dashboard-dia.component.html` — agregar tab "Mapa de envío" con `<app-mapa-envio-tab>`.
- `pages/admin/monitoreo/monitoreo-hub.component.html` — badge crítico cuando `defer-fail-status >= 4` (consumir desde el store del facade).

### Tiles (D11 brief 071)

Layout responsivo:

- **Desktop (≥1200px)**: 2 columnas × 3 filas. Tile A (Defer/Fail) en esquina superior izquierda fijo (sticky).
- **Tablet (768-1199px)**: 1 columna × 6 filas. Tile A sticky top.
- **Mobile (<768px)**: 1 columna apilada, todos los tiles colapsables (`<p-accordion>`).

Cada tile:

- Tiene su propio skeleton (regla `skeletons.md`).
- Usa `computed()` para derivar % calculados (regla `templates.md`).
- Aria-label en CTAs icon-only (regla `a11y.md`).
- Color: respeta tokens `var(--blue-800)` para destacados sobre fondo claro (regla `a11y.md`).

### Cross-links a Plan 38

Tile D ("Top destinatarios"):
```html
<button pButton label="Bloquear" icon="pi pi-ban"
        [routerLink]="['/intranet/admin/email-outbox']"
        [queryParams]="{ tab: 'blacklist', action: 'add', correo: dest.destinatario }"
        [pt]="{ root: { 'aria-label': 'Bloquear ' + dest.destinatario } }">
</button>
```

Tile F ("Candidatos"): mismo patrón.

**Coordinación con Plan 38 Chat 5 (075)**: el dialog "Agregar a blacklist" debe leer `?correo=...` y prellenar el form. La anotación cross-link se agrega al brief 075 al cerrar el chat 071 (D13).

### Listener SignalR (3 eventos del hub D5)

```typescript
// services/email-hub.service.ts
this.hub.on('BlacklistEntryCreated', (dto) => this.onBlacklistEntryCreated$.next(dto));
this.hub.on('DeferFailStatusUpdated', (dto) => this.onDeferFailStatusUpdated$.next(dto));
this.hub.on('CandidatoBlacklistDetectado', (dto) => this.onCandidatoBlacklistDetectado$.next(dto));
```

Reconexión automática (regla común de SignalR: `withAutomaticReconnect()`). Test #7 D16 valida.

### Caché (FE)

El Service Worker del proyecto cachea automáticamente las responses GET (regla `service-worker.md`, estrategia SWR única). 5 cache keys independientes en IndexedDB (D4). Nada extra que hacer en el FE.

### Tests (FE) — 6 + 2 = 8 tests (D16)

1. `defer-fail-live-counter-tile.spec.ts` — actualiza con SignalR mock sin refresh.
2. `sender-stats-tile.spec.ts` — barras proporcionales y % calculado.
3. `top-destinatarios-tile.spec.ts` — click "Bloquear" navega con query param `?correo=`.
4. `candidatos-blacklist-tile.spec.ts` — CTA "Bloquear" abre dialog prellenado.
5. `mapa-envio-tab.spec.ts` — banner B9 aparece cuando hits ≥ 4 (mock SignalR).
6. `serie-temporal-tile.spec.ts` — toggle hora/día funciona y resetea cache local.
7. `email-hub.service.spec.ts` — reconexión automática.
8. `candidatos-blacklist-tile.spec.ts` — push `CandidatoBlacklistDetectado` refresca tile sin polling.

## VERIFICACIÓN POST-DEPLOY

1. `/intranet/admin/monitoreo/correos/dashboard` carga los 6 tiles sin errores.
2. Cada tile tiene skeleton durante carga inicial.
3. Click "Bloquear" en Tile D → redirige a `/intranet/admin/email-outbox?tab=blacklist&action=add&correo=...` y dialog del Plan 38 se abre prellenado.
4. SignalR conecta vista en DevTools (panel WS).
5. Disparar mock `BlacklistEntryCreated` → tile de candidatos se actualiza sin refresh.

## DEPENDENCIAS

- ⚠️ **Pre-req duro**: Chat A (077) deployado.
- ⚠️ **Pre-req duro**: Plan 38 Chat 5 (075) deployado para cross-link.
- 🟢 Chat B (078) ideal pero no duro: si SignalR no responde, fallback es polling al endpoint `defer-fail-status` cada 30s.
- 🟢 Plan 38 Chat 6 (076) reutiliza el `email-hub.service.ts` que crea este chat (D13).

## REFERENCIAS

- Brief design: `.claude/chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md` (D11 + D13).
- Reglas: `templates.md`, `skeletons.md`, `a11y.md`, `service-worker.md`, `crud-patterns.md`.
- Plan 38 Chat 5 brief: `.claude/chats/open/075-plan-38-chat-5-fe-blacklist-tab-admin.md` (cross-link `?correo=`).
