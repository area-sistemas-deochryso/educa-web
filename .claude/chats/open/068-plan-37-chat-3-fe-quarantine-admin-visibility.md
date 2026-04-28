> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 37 · **Chat**: 3 · **Fase**: F3.FE · **Estado**: ⏳ pendiente arrancar (depende de Chat 2).
> **Creado**: 2026-04-28 · **Modo sugerido**: `/design` corto + `/execute`.

---

# Plan 37 Chat 3 — Visibilidad admin de cuarentena, pause de dominio y eventos de defer

## DEPENDENCIA

✅ **Chat 2 (067) cerrado y verificado** — endpoints `/api/sistema/email-outbox/quarantine`, `/domain-pauses`, `/defer-events` deben estar activos en prod.

## CONTEXTO

Backend ya tiene la mecánica activa: las cuarentenas y pauses se crean automáticamente desde la telemetría del parser IMAP. Falta exponerlo en `/intranet/admin/email-outbox` para que el Director vea qué se está bloqueando, por qué, y pueda liberar manualmente cuando sea necesario (ej: el destinatario contactó por otro canal y confirmó que ya liberó espacio en el buzón).

## OBJETIVO

3 vistas nuevas en la pantalla de admin de correos + notificación visual al Director cuando se detecta `DOMAIN_BLOCKED` activo.

## ALCANCE

### Vistas nuevas

Agregar 3 tabs en `/intranet/admin/email-outbox` (junto a "Bandeja", "Reportes", "Diagnóstico" actuales):

#### Tab "Cuarentena"

Tabla server-paginated (variante A wrapper paginado, ver `rules/pagination.md`):

| Columna | Contenido |
|---------|-----------|
| Destinatario (avatar-text) | email completo (sin enmascarar — admin tiene contexto) + dominio en sublabel |
| Motivo (badge) | `MAILBOX_FULL` / `SOFT_BOUNCE_REPEATED` / `DELAY_72H` / `MANUAL` con severity |
| Cuarentenas | contador `EQU_QuarantineCount` (1, 2, 3 con tag-critical en 3) |
| RetryAfter | fecha + countdown `dentro de Xh Ymin` |
| Estado | `Activa` / `Liberada` |
| Acciones | Liberar manual (icon-only `pi pi-unlock`, severity warning) + Ver detalle (drawer) |

**Filtros**: estado activa/liberada/todas, motivo, búsqueda por destinatario.

**Drawer de detalle** (B10): destinatario, motivo, cuarentena #N de 3, RetryAfter, evento origen (`EmailDeferEvent` con tipo + diagnostic-code + fecha), historial de cuarentenas previas del mismo destinatario.

**Acción "Agregar manualmente"**: dialog (B8) con destinatario, motivo `MANUAL` forzado, duración (24h/48h/72h custom), observación obligatoria.

#### Tab "Dominios pausados"

Tabla más simple:

| Columna | Contenido |
|---------|-----------|
| Dominio | `gmail.com`, `outlook.com`, etc. |
| Motivo | badge |
| Eventos disparadores | contador `ERP_TriggerEventCount` |
| PausedUntil | countdown |
| Estado | activa/liberada |
| Acciones | Liberar |

Banner de alerta arriba si hay ≥3 pauses activos simultáneos:
> ⚠️ 3 dominios receptores pausados — verifica el contador `defer-fail-status` arriba

#### Tab "Eventos de defer"

Timeline read-only de últimas 24h:

- Lista vertical, ordenada `EDE_Fecha` desc.
- Cada item: tipo (badge), destinatario (o dominio), status code, diagnostic-code (truncado a 100 chars + tooltip completo), correlación con `EmailOutbox` (link al diagnóstico del correo si está correlacionado).
- Filtros: tipo de evento (multiselect), rango de fecha, dominio receptor.
- Botón "Exportar CSV" (paridad PDF/Excel no aplica aquí — es timeline informativo).

### Notificación al Director

Cuando `DOMAIN_BLOCKED` activo en últimas 12h:

- Banner crítico (B9) en TOP de `/intranet/admin/email-outbox`:
  > 🚨 Dominio `laazulitasac.com` reportado como bloqueado por cPanel el {fecha} — el contador `max_defer_fail` puede haber agotado
- Toast push real-time (SignalR) si el evento llega mientras el director tiene la pantalla abierta.

### Integración con widget existente

El `DeferFailStatusWidget` (Plan 22 Chat B) sigue siendo la fuente operativa de "¿estoy cerca del techo?". Las nuevas tabs son **diagnóstico complementario**: explican POR QUÉ el contador subió (qué destinatarios, qué dominios, qué eventos). Cross-link:

- Click en "WARNING/CRITICAL" del widget → query param `?tab=defer-events&desde=hoy`.
- Click en evento `DOMAIN_BLOCKED` del timeline → highlight visual en el widget.

### Archivos a CREAR (~12 FE)

| # | Archivo |
|---|---------|
| 1-3 | `pages/admin/email-outbox/components/quarantine-tab/` (component + html + scss) |
| 4-6 | `pages/admin/email-outbox/components/domain-pauses-tab/` |
| 7-9 | `pages/admin/email-outbox/components/defer-events-tab/` |
| 10 | `pages/admin/email-outbox/components/quarantine-detail-drawer/` |
| 11 | `pages/admin/email-outbox/components/quarantine-add-dialog/` |
| 12 | `pages/admin/email-outbox/services/email-quarantine.service.ts` (HTTP gateway) |
| 13 | `pages/admin/email-outbox/services/email-quarantine.store.ts` (extends BaseCrudStore) |
| 14 | `pages/admin/email-outbox/services/email-quarantine.facade.ts` (vía BaseCrudFacade + WAL para release/add) |
| 15 | `pages/admin/email-outbox/services/email-domain-pause.service.ts` |
| 16 | `pages/admin/email-outbox/services/email-domain-pause.store.ts` |
| 17 | `pages/admin/email-outbox/services/email-domain-pause.facade.ts` |
| 18 | `pages/admin/email-outbox/services/defer-events.service.ts` (read-only, no store/facade) |
| 19 | `data/models/email-quarantine.models.ts` |
| 20 | `data/models/email-domain-pause.models.ts` |
| 21 | `data/models/email-defer-event.models.ts` |

### Archivos a MODIFICAR

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `pages/admin/email-outbox/email-outbox.component.html` | Agregar 3 tabs nuevos |
| 2 | `pages/admin/email-outbox/email-outbox.component.ts` | State del tab activo (signal) + query param sync |
| 3 | `pages/admin/email-outbox/components/defer-fail-status-widget.component.ts` | Click en estado WARNING/CRITICAL → navega al tab "Eventos" con filtro |
| 4 | `intranet-shared/services/realtime-notifications.service.ts` (si existe) | Subscribir a evento `DomainBlockedDetected` SignalR |

### REGLAS DE FRONTEND

- ✅ Standalone components, OnPush.
- ✅ BaseCrudStore + BaseCrudFacade para Quarantine y DomainPause.
- ✅ Optimistic UI (`WalFacadeHelper`) para release manual y add manual.
- ✅ Skeleton screens (`app-table-skeleton`, `app-stats-skeleton`).
- ✅ Design system B1-B10 (filter bar, table, drawer, dialog, alert banners).
- ✅ Accesibilidad: aria-label vía `pt` en botones icon-only.
- ✅ Tipos semánticos: `QuarantineMotivo`, `DomainPauseMotivo`, `DeferEventTipo` como `const + type`.
- ✅ Pagination server-side variante A (Quarantine + Eventos), client-side para DomainPauses (≤50 filas activas).
- ✅ Server-side typing — strict, no `any`.

### TESTS MÍNIMOS (Vitest)

| # | Caso |
|---|------|
| 1 | Quarantine store: setItems hidrata correctamente |
| 2 | Quarantine facade: `release(item)` aplica optimista, rollback si falla |
| 3 | Quarantine facade: `addManual({...})` valida observación obligatoria |
| 4 | DomainPause facade: similar |
| 5 | DeferEvents service: aplica filtros de tipo + fecha |
| 6 | DomainBlocked banner: aparece si hay evento `DOMAIN_BLOCKED` en últimas 12h |
| 7 | Cross-link widget → tab eventos preserva el filtro |

## FUERA DE ALCANCE

- ❌ NO crear página separada de "Salud del SMTP" (puede ser chat futuro consolidando widgets + tabs).
- ❌ NO modificar lógica BE (Chat 2).
- ❌ NO migrar el widget existente al design system completo (es deuda técnica menor).
- ❌ NO agregar export PDF de los eventos (CSV alcanza para análisis).

## CRITERIOS DE CIERRE

```
[ ] 3 tabs nuevos visibles bajo /intranet/admin/email-outbox
[ ] Cuarentena: lista paginada, filtros, drawer detalle, dialog add manual, release optimista con rollback
[ ] Domain pauses: lista, filtros, release manual
[ ] Defer events: timeline 24h con filtros + export CSV
[ ] Banner DOMAIN_BLOCKED visible cuando aplica
[ ] Cross-link widget defer-fail-status → tab eventos
[ ] BaseCrud{Store,Facade} reutilizadas (no god component)
[ ] WAL execute con apply/rollback en release y add
[ ] Skeletons y design system aplicados (B1, B4, B6, B8, B10)
[ ] Permisos: tabs solo visibles para Director y AsistenteAdministrativo
[ ] 7 tests Vitest pasando
[ ] npm run lint + npm run test verde
[ ] Smoke browser: crear cuarentena manual, esperar auto-release o liberar manual
[ ] Actualizar `rules/menu-modules.md` si aplica (los 3 tabs siguen siendo "Sistema > Monitoreo > Bandeja de Correos")
```

## COMMIT MESSAGE sugerido

```
feat(email-outbox): add admin visibility for quarantine + domain pauses + defer events

- Add "Cuarentena" tab with paginated list, filters, detail
  drawer and manual add/release dialogs (BaseCrudFacade + WAL
  optimistic execute with rollback)
- Add "Dominios pausados" tab with list and manual release
  (client-side pagination since active rows are bounded)
- Add "Eventos de defer" timeline tab with type/date filters
  and CSV export — read-only, sourced from "EmailDeferEvent"
- Add critical banner on top of admin/email-outbox when a
  "DOMAIN_BLOCKED" event landed in the last 12h, plus SignalR
  toast for real-time delivery
- Cross-link "DeferFailStatusWidget" WARNING/CRITICAL state to
  the events tab with date filter pre-applied
- All UI follows design system B1-B10 (filter bar, table,
  drawer, dialog, alert banners) with skeletons and aria-labels

Plan 37 Chat 3 — closes the diagnostic loop. The widget answers
"how close to the cap am I?", the new tabs answer "what is
consuming the cap and what should I do?".
```

## DECISIONES PENDIENTES

1. **Notificación push vs banner-only** — ¿el evento `DOMAIN_BLOCKED` debe mandar email al Director además de SignalR? Recomendación: SignalR + banner alcanza; correo solo si Chat 2 lo agregó (esquema fire-and-forget).
2. **¿Cuarentena manual con dominio receptor?** — el endpoint `POST /domain-pauses` ya lo permite. Confirmar si UI lo expone como caso de uso esperado o dejar fuera (admin lo puede hacer vía Postman si es excepcional).
3. **¿Tab eventos paginado o "infinite scroll"?** — Recomendación: paginado server-side, 25 filas por página. Infinite scroll complica filtrado.
