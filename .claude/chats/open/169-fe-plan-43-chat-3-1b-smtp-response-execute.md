# Plan 43 · Chat 3.1b — `/execute` FE: SMTP response en drawers monitoreo

> **Repo destino**: `educa-web` (main) — chat exclusivamente FE.
> **Plan**: 43 · **Chat**: 3.1b · **Fase**: F3 · **Creado**: 2026-05-15 · **Estado**: ⏳ pendiente arrancar.
> **Modo sugerido**: `/execute` → `/validate`.
> **Predecesor**: brief 154 (closed, design) + brief 168 (BE execute — bloqueante para smoke real, pero el contrato DTO se puede leer del design).

## Contexto

Cierra la parte FE de Plan 43 Chat 3.1. El BE va en brief 168 en paralelo; este chat puede arrancar con mocks del nuevo contrato DTO si el BE aún no shipea, y validar smoke browser cuando ambos converjan.

## Decisiones heredadas (no re-discutir)

Ver `closed/154-be-fe-plan-43-chat-3-1-smtp-response-visible.md` líneas 85-130. Resumen FE:

- Drawer Detalle blacklist (`/intranet/admin/monitoreo/email-blacklist`) → nueva sección **"SMTP response"** con el código real (`originalSmtpResponse`). El campo previo `ultimoError` pasa a "Causa interna" como dato secundario, no destacado.
- Drawer Detalle cuarentena (`/intranet/admin/monitoreo/email-quarantine`) → nueva sección **"Histórico de hits"** con tabla de últimos 3 (`recentHits[]`: timestamp + SMTP code + message).
- Badge `(reconstruido)` (PrimeNG `p-tag` con `severity="warn"` o `styleClass="tag-neutral"` según design-system §6) cuando `originalSmtpResponseSource === 'reconstructed'`. Sin badge si `stored`. Texto "—" + tooltip "Sin trazas disponibles" si `unavailable`.

## Pre-work

1. Confirmar shape DTO con brief 168 (o leer del design del brief 154). Tipos a crear/extender en `@data/models/`:
   - `EmailBlacklistListadoDto` → +`originalSmtpResponse?: string`, +`originalSmtpResponseSource?: 'stored' | 'reconstructed' | 'unavailable'`.
   - `EmailQuarantineDetalleDto` → ídem + `recentHits?: QuarantineHitDto[]`.
   - Nuevo `QuarantineHitDto { smtpCode: string; smtpMessage: string; occurredAt: string }`.
2. Leer `rules/design-system.md` §B10 (drawer detalle) + §6 (tag-neutral vs severity) + `rules/a11y.md` para aria-labels.

## Scope

### Componentes a tocar

- `features/intranet/pages/admin/monitoreo/email-blacklist/components/blacklist-detail-drawer/*` (path probable — verificar) — agregar bloque "SMTP response" arriba de "Causa interna".
- `features/intranet/pages/admin/monitoreo/email-quarantine/components/quarantine-detail-drawer/*` — agregar bloque "Histórico de hits" con `p-table` o lista simple de 3 items.
- Tipos: `data/models/email-monitoreo.models.ts` (o donde vivan hoy los DTOs de monitoreo email).
- `SemanticType` `OriginalSmtpResponseSource` (const + type) según `rules/semantic-types.md`.

### Detalles UI

- Badge `(reconstruido)`: usar `p-tag` con `value="reconstruido"` `styleClass="tag-neutral"` `[pt]="{ root: { 'aria-label': 'Valor reconstruido desde EmailOutbox' } }"`.
- Tabla histórico hits: columnas `Fecha` / `Código SMTP` / `Mensaje`. UPPERCASE headers (`.label-uppercase`). Si `recentHits` es null o vacío → empty-state "Sin hits previos registrados".
- Smoke check de a11y: botones nuevos (si aplican) con `aria-label` vía `pt`.

### Sin cambios

- No tocar el listado / cards de Bandeja — solo drawers de detalle.
- No agregar filtros nuevos en este chat (eso es Chat 4.1).

## Invariantes en juego

- `INV-D08` — DTOs `ApiResponse<T>` ya manejados por interceptor.
- A11y contraste — texto SMTP sobre fondo claro va `#1e40af` o `--text-color`, NUNCA primary celeste.
- `dialogs-sync.md` — drawer siempre en DOM con `[visible]` + `(visibleChange)`.

## Criterios de cierre

- [ ] Drawer blacklist muestra `originalSmtpResponse` destacado + `ultimoError` como secundario.
- [ ] Drawer cuarentena muestra tabla de hasta 3 `recentHits` + `originalSmtpResponse`.
- [ ] Badge `(reconstruido)` aparece cuando source = `reconstructed`.
- [ ] Empty-state "—" + tooltip si source = `unavailable`.
- [ ] Lint ✅ · build ✅ · tests existentes verdes.
- [ ] Smoke browser (requiere BE deployed): abrir 1 blacklist real + 1 quarantine real, verificar render.

## Aprendizajes transferibles

> A poblar al cerrar.

## Referencias

- `chats/closed/154-be-fe-plan-43-chat-3-1-smtp-response-visible.md` — design completo.
- `chats/open/168-be-plan-43-chat-3-1a-smtp-response-execute.md` — contraparte BE.
- `rules/design-system.md` §6 (p-tag), §B10 (drawer detalle).
- Plan 43 maestro item 8.
