# Plan 39 Chat D FE — Banner B9 cross-páginas + tile "Aceptado vs Entregado" + alineación listener Plan 38

> **Repo destino**: `educa-web` (main)
> **Plan**: 39 · **Chat**: D · **Fase**: F2.Execute · **Estado**: ⏳ pendiente arrancar — prioridad alta
> **Creado**: 2026-04-29 · **Modo sugerido**: `/execute`
> **Pre-req**: Chat B (078) + Chat C (079) deployados. Plan 38 Chat 6 (076) deployado.

## CONTEXTO INMEDIATO

Chat D cierra el ciclo FE del Plan 39:

1. Banner B9 (defer-fail status crítico) visible en TODAS las sub-páginas de `/monitoreo/correos/*` (no solo dashboard del día — el admin puede estar mirando bandeja, diagnóstico, auditoría).
2. Tile nuevo "Aceptado por Exim ≠ entregado" en `/monitoreo/correos/auditoria` — gap entre `EO_Estado=SENT` y delivery real (B8 del plan original).
3. Alinear el listener SignalR de Plan 38 Chat 6 (076) para escuchar los 3 eventos del hub (no solo `BlacklistEntryCreated`). Si Plan 38 Chat 6 ya extrajo el listener a un service compartido (D13), solo agregar las suscripciones faltantes. Si no, refactorizar el listener acá.

## OBJETIVO

Banner B9 reusable cross-páginas + tile auditoría + listener compartido completo.

## SCOPE

### Archivos nuevos

- `shared/components/email-defer-fail-banner/` — componente standalone reutilizable. Consume `EmailMonitoreoFacade.deferFailStatus()` (creado en Chat C 079) y se renderiza si la banda es WARNING/CRITICAL.
- `features/intranet/pages/admin/email-outbox-auditoria/components/aceptado-vs-entregado-tile/` — tile con métricas:
  - Total aceptados por Exim (`EO_Estado='SENT'`).
  - Total con NDR async (`EO_BounceSource='async-imap'`).
  - Gap = aceptados - bounced - confirmed_delivered. Solo aproximación si no hay confirmación delivery (no la hay sin importador SSH del Chat E HOLD).
  - Disclaimer: *"Cifras estimadas — el confirm delivery requiere acceso a logs Exim (Plan 39 Chat E pendiente)."*

### Archivos modificados

- `pages/admin/email-outbox/email-outbox.component.html` — agregar `<app-email-defer-fail-banner>` arriba del tab strip.
- `pages/admin/email-outbox-dashboard-dia/email-outbox-dashboard-dia.component.html` — mismo banner arriba.
- `pages/admin/email-outbox-diagnostico/email-outbox-diagnostico.component.html` — mismo banner.
- `pages/admin/email-outbox-auditoria/email-outbox-auditoria.component.html` — banner + tile nuevo.
- `pages/admin/monitoreo/monitoreo-hub.component.html` — banner si está en hub.
- `services/email-hub.service.ts` (creado en Chat C 079) — agregar suscripción a `BlacklistEntryCreated` si Plan 38 Chat 6 (076) aún la maneja por separado. Refactor coordinado con 076 si conviene.

### Banner B9 — trigger (D8 Plan 38 + D5 Plan 39)

Visible cuando alguno de los siguientes:

- `defer-fail-status.banda` ∈ `{WARNING, CRITICAL}` (polling 30s + push SignalR).
- `BlacklistEntryCreated` recibido en últimos 5 min (almacenar timestamp en signal local + `setTimeout` para limpiar).
- `MailboxFullBlacklistHandler` disparó (señalado por evento `BlacklistEntryCreated` con `motivo='BOUNCE_MAILBOX_FULL'`).

```typescript
@Component({ selector: 'app-email-defer-fail-banner', standalone: true })
export class EmailDeferFailBannerComponent {
  private facade = inject(EmailMonitoreoFacade);
  private hub = inject(EmailHubService);

  readonly status = this.facade.deferFailStatus;
  readonly recentBlacklist = signal<Date | null>(null);

  readonly visible = computed(() => {
    const banda = this.status()?.banda;
    if (banda === 'WARNING' || banda === 'CRITICAL') return true;
    const ts = this.recentBlacklist();
    if (ts && Date.now() - ts.getTime() < 5 * 60 * 1000) return true;
    return false;
  });

  constructor() {
    this.hub.onBlacklistEntryCreated$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.recentBlacklist.set(new Date()));
  }
}
```

### Tile "Aceptado vs Entregado"

Endpoint nuevo opcional (si scope alcanza, sino se infiere desde existentes):

- `GET /api/sistema/email-outbox/monitoreo/aceptado-vs-entregado?ventanaDias=7` (extiende Chat A 077).
- Retorna `{ aceptados, bounceAsync, gap }`.

Si Chat A (077) no incluye esta agregación (no estaba en las 5 originales), agregarla acá como parte de Chat D — extiende `EmailMonitoreoService` con un 6° método. Nota: incluí en el scope del Chat D para no expandir Chat A; el handler es trivial.

### Tests (FE) — 4 tests

1. `email-defer-fail-banner.spec.ts` — visible cuando banda CRITICAL.
2. `email-defer-fail-banner.spec.ts` — visible 5 min después de `BlacklistEntryCreated`, luego oculto.
3. `aceptado-vs-entregado-tile.spec.ts` — disclaimer renderiza.
4. `email-hub.service.spec.ts` — listener responde a 3 eventos.

## VERIFICACIÓN POST-DEPLOY

1. Forzar `defer-fail-status = 4/5` (mock backend) → banner aparece en `/monitoreo`, `/monitoreo/correos/*` (4 sub-páginas).
2. Disparar `BlacklistEntryCreated` SignalR → banner aparece + auto-oculta a 5 min.
3. `/monitoreo/correos/auditoria` muestra el tile nuevo con disclaimer.

## DEPENDENCIAS

- ⚠️ **Pre-req duro**: Chat B (078) — provee push SignalR.
- ⚠️ **Pre-req duro**: Chat C (079) — provee `EmailMonitoreoFacade` + `EmailHubService`.
- ⚠️ **Pre-req duro**: Plan 38 Chat 6 (076) deployado — coordinar listener compartido.

## REFERENCIAS

- Brief design: `.claude/chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md` (D5 + D11 + D13).
- Patrón banner: regla `design-system.md` B9.
- Plan 38 Chat 6 brief: `.claude/chats/open/076-plan-38-chat-6-fe-banner-b9-toast-signalr.md`.
