> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 38 · **Chat**: 5 · **Fase**: F5.FE · **Modo sugerido**: `/execute`
> **Creado**: 2026-04-29 · **Estado**: ⏳ pendiente arrancar.
> **Pre-requisito**: Chat 3 (073) deployado a Azure App Service y validado (POST/GET responden).
>
> **🔗 Cross-link Plan 39 (D11/D13 del brief 071)**: el dialog "Agregar a blacklist" debe leer query param `?correo=...` y prellenar el campo. Plan 39 Chat C (079) genera CTAs "Bloquear" desde los tiles "Top destinatarios" y "Candidatos" del dashboard de monitoreo, navegando a `/intranet/admin/email-outbox?tab=blacklist&action=add&correo=...`. Implementación: en el `OnInit` del componente padre, leer `route.snapshot.queryParamMap.get('correo')` y `get('action')`, y si `action === 'add'` con correo presente, abrir el dialog con form prefilled.

> **Validación prod**: ✅ verificada 2026-05-04 — verde: tab Blacklist con 3 activos + filtros + CRUD funcionando
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

---

## CIERRE LOCAL — 2026-04-30

**Commit FE**: `educa-web main` (sin push) — pendiente de hash.

**Decisión de scope reportada**: el brief asumía "tabs internos en `email-outbox.component`" pero el shell `correos-shell` ya implementaba **routing-based tabs** (Bandeja/Dashboard/Diagnóstico/Auditoría como rutas hermanas, Plan 36 Chat 1). Implementé el patrón consistente — Blacklist es una nueva ruta hija `/intranet/admin/monitoreo/correos/blacklist` con feature flag `emailBlacklistTab` y permiso `ADMIN_EMAIL_BLACKLIST`. El componente `email-outbox.component` queda **intacto** (cero regresión en la página de Bandeja).

**Archivos**: 12 nuevos + 8 modificados.

- **Nuevos (modelos + components + services)**:
  - `data/models/email-blacklist.models.ts` (~85 ln) — DTOs espejo del BE + tipos semánticos `EmailBlacklistMotivo`, `EmailBlacklistFiltroEstado`, `BlacklistFormData`, `BlacklistFiltros`, `BlacklistEstadisticas` + `EMAIL_BLACKLIST_MOTIVOS_MANUALES` para D17.8.
  - `pages/admin/email-outbox/components/blacklist-tab/` — smart container 200 ln (orquesta filtros + tabla + dialog + drawer + URL prefill `?action=add&correo=` para cross-link Plan 39 Chat C / D11+D13).
  - `pages/admin/email-outbox/components/blacklist-table/` — presentational, server-paginated, B4+B5 del design-system (header UPPERCASE, row-actions triplet con `aria-label` vía `pt`, empty state con detección de `hasActiveFilters`).
  - `pages/admin/email-outbox/components/blacklist-add-dialog/` — presentational, B8 del design-system. Solo expone `MANUAL` + `BULK_IMPORT` en el `<p-select>` (D17.8). Validación inline correo + motivo, normalización trim+lowercase al submit.
  - `pages/admin/email-outbox/components/blacklist-detail-drawer/` — presentational, B10 del design-system. Avatar shield 80px, info-list con audit completo, botón "Despejar" condicional al estado activo.
  - `pages/admin/email-outbox/services/blacklist.service.ts` — HTTP gateway (`getPaginado` + `crear` + `despejar` con encodeURIComponent del correo).
  - `pages/admin/email-outbox/services/blacklist.store.ts` — extiende `BaseCrudStore<EmailBlacklistEntry, BlacklistFormData, BlacklistEstadisticas>` con extras: `filterMotivo`, `filterEstadoBlacklist`, `drawerVisible`/`drawerItem`, `tableReady`, helpers `onCreado`/`onDespejado`, `hasActiveFilters` computed.
  - `pages/admin/email-outbox/services/blacklist-data.facade.ts` — load paginado + search debounced 300ms + filtros + `deriveStats` (best-effort sobre la página visible cuando no hay filterEstado, exacto cuando filterEstado fija el universo).
  - `pages/admin/email-outbox/services/blacklist-crud.facade.ts` — WAL optimista. CREATE: `apply` cierra dialog, `onCommit` agrega item + stats; rollback re-abre dialog con datos previos. DELETE: `apply` quirúrgico (remove + stats), `rollback` restaura **posición original** del item (no prepend/refetch). Maneja 404 con refresh + warning.
  - `pages/admin/email-outbox/services/blacklist-ui.facade.ts` — orquesta visibilidad de dialog + drawer.
  - `+ 7 archivos de test` (44 tests nuevos).

- **Modificados**:
  - `data/models/index.ts` — barrel re-export.
  - `pages/admin/email-outbox/services/index.ts` — barrel exports nuevos.
  - `pages/admin/monitoreo/monitoreo.routes.ts` — ruta hija condicional `blacklist` con `[authGuard, permissionsGuard]` + permissionPath dedicado.
  - `pages/admin/monitoreo/shells/correos-shell.component.ts` — tab `Blacklist` agregado al array `ALL_TABS` (5to tab).
  - `shared/constants/permission-registry.ts` — `ADMIN_EMAIL_BLACKLIST: 'intranet/admin/monitoreo/correos/blacklist'`.
  - `shared/services/ui-mapping/ui-mapping.service.ts` — `getBlacklistMotivoSeverity` + `getBlacklistMotivoLabel` (D12 + D20).
  - `config/environment.ts` + `config/environment.development.ts` — flag `emailBlacklistTab: true` en ambos.

**Métricas**:

- Lint: ✅ 0 errores · 1 warning preexistente fuera de scope.
- Build production: ✅ OK.
- Vitest: **1738/1738 verdes** (baseline 1683 → +55 netos: 44 nuevos del feature + 11 ajustes en specs preexistentes que recalibró TestBed por el providers nuevo).

**Decisiones de implementación**:

1. **Routing-based tabs vs tabs internos**: el shell `correos-shell` ya usa el primer patrón (`p-tabs` con `(valueChange)` que navega), así que Blacklist se montó como ruta hija hermana. El brief asumía tabs internos al `email-outbox.component`. Ambas opciones eran válidas; elegí la consistente con el shell para no introducir un patrón híbrido que confunda al siguiente chat (Plan 37 Chat 2 Cuarentena hará lo mismo).
2. **Permiso dedicado** (`ADMIN_EMAIL_BLACKLIST`) en lugar de reusar `ADMIN_EMAIL_OUTBOX`: la blacklist es un dominio operativo distinto (mutaciones que afectan envío real). Dejarlo separado permite que el Director pueda dar acceso a soporte solo a Bandeja (read-only) sin habilitar el blockblock manual.
3. **`deriveStats` best-effort**: el BE no expone `/stats` para blacklist. Cuando `filterEstado` está activo, el ratio es 100% (exacto). Sin filtro, uso el ratio de la página visible × total. Es ruido aceptable hasta que se agregue endpoint dedicado (deuda menor documentada para chat futuro).
4. **`rollback` de DELETE preserva posición original**: `findIndex` antes del `apply` + `splice` en `rollback` para restaurar el item exactamente donde estaba. Patrón replicable en otras facades CRUD donde el order matters.
5. **Outputs renombrados** (`confirm`/`cancel`/`close` → `confirmAdd`/`cancelAdd`/`closeDrawer`): ESLint `@angular-eslint/no-output-native` los rechaza por colisionar con eventos DOM nativos.

**Aprendizaje transferible** (replicable en futuros tabs del shell):

- **Patrón `routing-based tabs + feature flag + permission dedicado`** está consolidado en `correos-shell` (5 tabs ahora) e `incidencias-shell` (2 tabs). Plantilla a seguir: agregar entry en `ALL_TABS` del shell, ruta hija condicional en `monitoreo.routes.ts` con `permissionPath`, registry permiso, flag en ambos environments. **Sin tabs internos**: cada tab es una ruta lazy con su propio component standalone, evitando god-components con 4+ responsabilidades.

**Verificación post-deploy** (los 7 pasos del brief):

1. `/intranet/admin/monitoreo/correos/blacklist` muestra tab activo + tabla con entradas reales.
2. Filtro `motivo=BOUNCE_MAILBOX_FULL` filtra correctamente.
3. Búsqueda `q=gmail` reduce filas (LIKE %q%).
4. Click "Agregar" → dialog → completar correo + motivo MANUAL → POST → fila aparece sin refresh.
5. Click "Despejar" en una fila → confirm → DELETE → fila desaparece sin refresh.
6. Click "Ver" abre drawer con detalle + audit (UsuarioReg, FechaReg, UltimoError truncado).
7. Deep-link `?action=add&correo=foo@x.com` abre dialog prefilled (cross-link Plan 39 Chat C / D11+D13).
