> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 38 · **Chat**: 5 · **Fase**: F5.FE · **Modo sugerido**: `/execute`
> **Creado**: 2026-04-29 · **Estado**: ⏳ pendiente arrancar.
> **Pre-requisito**: Chat 3 (073) deployado a Azure App Service y validado (POST/GET responden).
>
> **🔗 Cross-link Plan 39 (D11/D13 del brief 071)**: el dialog "Agregar a blacklist" debe leer query param `?correo=...` y prellenar el campo. Plan 39 Chat C (079) genera CTAs "Bloquear" desde los tiles "Top destinatarios" y "Candidatos" del dashboard de monitoreo, navegando a `/intranet/admin/email-outbox?tab=blacklist&action=add&correo=...`. Implementación: en el `OnInit` del componente padre, leer `route.snapshot.queryParamMap.get('correo')` y `get('action')`, y si `action === 'add'` con correo presente, abrir el dialog con form prefilled.

---

# Plan 38 Chat 5 FE — Tab "Blacklist" en `/intranet/admin/email-outbox`

## CONTEXTO

Cierre design en `chats/closed/070-plan-38-chat-1-blacklist-investigacion-design.md` (decisiones D7, D11, D12, D17, D20). El admin debe ver, agregar, despejar y filtrar entradas sin pasar por DBA.

Mock de UI (B6 filtros + B4 tabla server-paginated + B8 dialog + B10 drawer, ver `rules/design-system.md`):

```
┌─ /intranet/admin/email-outbox ────────────────────────────────────────┐
│ Tabs: [ Bandeja | Cuarentena | Dominios | Blacklist ← nueva ]         │
│                                                                       │
│ [Buscar correo...]   [Estado ▾]  [Motivo ▾]  [+ Agregar]   [↻]       │
│                                                                       │
│ ┌────────────────────────────────────────────────────────────────┐    │
│ │ # │ Destinatario        │ Motivo      │ Hits │ Primer │ Último │ Estado │ Acciones │
│ │ 1 │ kysa14.1994@gm…     │ 4.2.2 lleno │  3   │ 04-29  │ 04-29  │  ●    │ 👁  ✕   │
│ │ 2 │ eva@gm…             │ 4.2.2 lleno │  4   │ 04-29  │ 04-29  │  ●    │ 👁  ✕   │
│ │ ...                                                                            │ │
│ └────────────────────────────────────────────────────────────────┘    │
│ Mostrando 1 a 25 de 187 registros                                     │
└────────────────────────────────────────────────────────────────────────┘
```

## OBJETIVO

Tab nuevo en módulo existente `email-outbox` (sin crear feature aparte) — patrón consistente con tabs ya planeados de Plan 37 (Cuarentena, Dominios).

## ARCHIVOS

### Nuevos (módulo del feature)

- `src/app/features/intranet/pages/admin/email-outbox/components/blacklist-tab/blacklist-tab.component.{ts,html,scss}` — Smart component que orquesta tabla + filtros + dialog + drawer.
- `src/app/features/intranet/pages/admin/email-outbox/components/blacklist-table/blacklist-table.component.{ts,html,scss}` — Presentational. Inputs: `items: EmailBlacklistEntry[]`, `loading: boolean`, `total: number`. Outputs: `viewDetail`, `despejar`, `lazyLoad`.
- `src/app/features/intranet/pages/admin/email-outbox/components/blacklist-add-dialog/blacklist-add-dialog.component.{ts,html,scss}` — Presentational. Inputs: `visible: boolean`. Outputs: `confirm: { correo, motivo, observacion }`, `cancel`. Solo lista `MANUAL` y `BULK_IMPORT` en el `<p-select>` (D17.8).
- `src/app/features/intranet/pages/admin/email-outbox/components/blacklist-detail-drawer/blacklist-detail-drawer.component.{ts,html,scss}` — Presentational con info-list (B10).
- `src/app/features/intranet/pages/admin/email-outbox/services/blacklist.service.ts` — HTTP gateway (`getPaginado`, `crear`, `despejar`).
- `src/app/features/intranet/pages/admin/email-outbox/services/blacklist.store.ts` — `BaseCrudStore<EmailBlacklistEntry, BlacklistFormData, BlacklistEstadisticas>`.
- `src/app/features/intranet/pages/admin/email-outbox/services/blacklist-data.facade.ts` — load paginado + load estadísticas.
- `src/app/features/intranet/pages/admin/email-outbox/services/blacklist-crud.facade.ts` — `crear`, `despejar` con `WalFacadeHelper`.
- `src/app/features/intranet/pages/admin/email-outbox/services/blacklist-ui.facade.ts` — open/close dialog/drawer.
- `src/app/data/models/email-blacklist.models.ts` — `EmailBlacklistEntry` + `EmailBlacklistMotivo` (semantic type) + `BlacklistFormData` + `BlacklistFiltros`.

### Modificados

- `src/app/features/intranet/pages/admin/email-outbox/email-outbox.component.{ts,html}` — agregar 4to tab "Blacklist". Sincronizar URL `?tab=blacklist`.
- `src/app/shared/services/ui-mapping.service.ts` — agregar `getBlacklistMotivoSeverity(motivo)` + `getBlacklistMotivoLabel(motivo)` (D12 / D20).

### Tests (~16 tests)

- `blacklist-table.component.spec.ts`:
  1. Render con 0 / 1 / N entradas + paginación correcta.
  2. Click "Despejar" emite `despejar`.
  3. `tag` con severity correcta por motivo (D12).
  4. `BadgeMotivo_RenderizaConSeverity` (D17.7).
- `blacklist-add-dialog.component.spec.ts`:
  5. Dialog valida formato + motivo + auth.
  6. `RechazaMotivosNoPermitidos` — `<p-select>` solo lista `MANUAL` y `BULK_IMPORT` (D17.8).
- `blacklist-data.facade.spec.ts`:
  7. `loadItems(filtros)` mapea a query params.
  8. Filtros se reflejan en query params (deeplinkable).
- `blacklist-crud.facade.spec.ts`:
  9. `crear` con WAL apply optimista.
  10. `despejar` con WAL rollback en error.
- `blacklist.store.spec.ts`:
  11. mutaciones quirúrgicas + `removeItem` decrementa total.
- `blacklist.service.spec.ts`:
  12. GET con query params + paginación.
  13. POST + DELETE.
- `email-outbox.component.spec.ts` (extender):
  14. Tab "Blacklist" se muestra cuando feature flag y permiso OK.
  15. `tab=blacklist` query param activa el tab.
- `blacklist-detail-drawer.component.spec.ts`:
  16. Render info-list con entrada activa + entrada despejada.

## VALIDACIÓN

```bash
npm run lint
npm run test  # +16 tests verdes, baseline 1683 → ≥1699
npm run build
```

## INVARIANTES Y REGLAS

- ✅ Stores con signals privados + `asReadonly()` (`rules/state-management.md`).
- ✅ Mutaciones quirúrgicas en facade (`rules/crud-patterns.md`, `rules/optimistic-ui.md`).
- ✅ Server-paginated wrapper variante A (`rules/pagination.md`).
- ✅ `appendTo="body"` en dropdowns (`rules/primeng.md`).
- ✅ Botones icon-only con `aria-label` vía `pt` (`rules/a11y.md`).
- ✅ Dialog/Drawer fuera de `@if` (`rules/dialogs-sync.md`).
- ✅ Skeleton obligatorio (`rules/skeletons.md`): `app-table-skeleton` durante load.
- ✅ Tipos semánticos (`rules/semantic-types.md`): `EmailBlacklistMotivo = 'BOUNCE_5XX' | ...`.
- ✅ Cap 500 ln archivos TS, 300 ln backend (no aplica).

## OUT

- Banner B9 + toast SignalR (Chat 6).
- Importación CSV masiva (chat futuro).

## VERIFICACIÓN POST-DEPLOY

1. `/intranet/admin/email-outbox?tab=blacklist` muestra tab activo + tabla con 187+ entradas reales (las 3 manuales del 2026-04-29 + las que detecte el handler nuevo).
2. Filtros: `motivo=BOUNCE_MAILBOX_FULL` filtra correctamente.
3. Búsqueda: `q=gmail` reduce filas.
4. Click "Agregar" abre dialog → completar correo + motivo MANUAL → POST → fila aparece sin refresh.
5. Click "Despejar" en una fila → confirm → DELETE → fila desaparece sin refresh.
6. Click "Ver" abre drawer con detalle + audit (UsuarioReg, FechaReg, UltimoError truncado).
7. Deep-link `?tab=blacklist&motivo=BOUNCE_MAILBOX_FULL` carga ya filtrado.

## ENTREGABLE AL CERRAR

Commit `feat(email-outbox): admin blacklist tab with paginated CRUD`. Brief a `awaiting-prod/`.
