# 142 · BE — Plan 43 Chat 2.1: quick wins BE de monitoreo (split de 142 original)

> **Creado**: 2026-05-12 · **Estado**: ✅ BE shipped local 2026-05-12, awaiting-prod (SQL Azure + smoke) · **Repos**: `Educa.API`
> **Modo sugerido**: ya cerrado — verificar post-deploy
> **Plan base**: [plan/monitoreo-cowork-feedback-2026-05-11.md §Chat 2.1](../../plan/monitoreo-cowork-feedback-2026-05-11.md)
> **Split**: el FE remaining (A3 badge + A7+B7 textarea + A13 link + tests Vitest) se trackea en brief 147 (`open/`). Deploys independientes.

## Estado al cierre BE (2026-05-12)

- ✅ **A3 BE**: columna `EmailOutbox.EO_UltimoErrorTransiente` (NVARCHAR(200) NULL) en modelo + DTO + worker populate (catch path en PENDING/PROCESSING, reset en SENT) + proyección en `EmailOutboxService.cs:88`.
- ✅ **A7+B7 BE**: validador `BLACKLIST_MOTIVO_REQUERIDO` en `EmailBlacklistService.CrearManualAsync` (Observacion ≥ 20 chars cuando Motivo='MANUAL') + `EmailBlacklistController` prioriza `User.GetNombre()` para `usuarioReg`.
- ✅ **A12**: eliminado masking de email en 7 puntos admin (`EmailDashboardDiaService`, `EmailOutboxMonitoringService`, `EmailDeferEventQueryService`, `EmailDiagnosticoPersonaSearch`, `DiagnosticoCorreosDiaCorrelator` ×2, `CorrelationService`, `AuditoriaCorreosService`) + borrado de 2 helpers privados unused. Logs (`EmailHelper.Mask`) intactos.
- ✅ **Migración SQL**: `Scripts/plan43_chat21_A3_EmailOutboxUltimoErrorTransiente.sql` — idempotente, NULLable, sin DEFAULT (metadata-only op).
- ✅ **Build**: `dotnet build` 0 errores.

## Checklist post-deploy (verificación a confirmar con `/verify 142`)

```
[ ] SQL ejecutado en staging Azure SQL
[ ] SQL ejecutado en prod Azure SQL
[ ] A3 (esperar evento natural — no forzar): monitorear vía
    `SELECT TOP 20 EO_CodID, EO_Estado, EO_UltimoErrorTransiente, EO_FechaReg
     FROM EmailOutbox WHERE EO_UltimoErrorTransiente IS NOT NULL
     ORDER BY EO_FechaReg DESC`
    El path se activa cuando entre un defer 4.x.x transiente real (handler
    no promueve a FAILED y el correo sigue PENDING/PROCESSING). Si en 7d
    post-deploy no aparece ninguna fila → abrir hallazgo (probable bug en
    el catch path del worker)
[ ] Smoke: POST /api/sistema/email-blacklist con motivo MANUAL + observacion="x" → 422 BLACKLIST_MOTIVO_REQUERIDO
[ ] Smoke: GET /api/sistema/email-defer-events → verificar destinatario raw (sin ***)
[ ] FE follow-up brief 147 arrancado y shipped (A3 badge + A7+B7 textarea + A13 link)
```

## Original (pre-split)

## Por qué empacarlos

5 hallazgos de Cowork (A3, A7, A12, A13, B7) con el mismo perfil: cambios chicos, sin nueva infra, sin migraciones estructurales, sin contratos nuevos. Cada uno < 30min — empacarlos evita 5 briefs con overhead.

## Alcance (los 5 puntos)

### 1. A3 — `TipoFallo` durante PROCESSING

**Problema**: hoy un correo en `PROCESSING` con error transiente (4.2.2 mailbox full, deferred) muestra "Sin clasificar" en la bandeja. El admin no sabe si esperar o intervenir.

**Cambios**:
- BE: nueva columna `EmailOutbox.EO_UltimoErrorTransiente` (`NVARCHAR(200) NULL`). `EmailOutboxWorker` la popula cuando captura excepción transiente sin promover a `FAILED`.
- BE: `EmailOutboxListaDto` expone el campo.
- FE: en bandeja, badge gris "Pendiente reintento ({code})" cuando `EO_Estado='PROCESSING'` && `EO_UltimoErrorTransiente != null`.

**Migración SQL**: `ALTER TABLE EmailOutbox ADD EO_UltimoErrorTransiente NVARCHAR(200) NULL;`

### 2. A7 + B7 — Bloqueo manual de blacklist obligatorio

**Problema**: hoy un admin puede meter un email en `EmailBlacklist` con motivo vacío. Más adelante nadie sabe por qué.

**Cambios**:
- BE: validador en `EmailBlacklistService.AgregarManualAsync` → si `EBL_MotivoBloqueo='MANUAL'`, requiere `EBL_Motivo` con `len >= 20`. Lanza `BusinessRuleException("BLACKLIST_MOTIVO_REQUERIDO")`.
- BE: `EBL_UsuarioReg` debe persistir nombre humano resuelto vía `User.GetNombre()` (no DNI ni username técnico).
- FE: en dialog "Bloquear manualmente", textarea obligatoria con contador (`/20 min`). Submit deshabilitado hasta cumplir.

### 3. A12 — Enmascaramiento de email consistente en monitoreo

**Problema**: algunos DTOs admin enmascaran email (`u****@gmail.com`), otros no. Inconsistencia visual + dificulta búsqueda.

**Cambios**:
- BE: audit en `EmailDeferEventsService`, `EmailOutboxService`, `EmailBlacklistService`, `EmailQuarantineService`, `EmailMonitoreoService`. Localizar todas las llamadas a `MaskEmail()` / `Mask()`.
- Decisión documentada: **admin (4 roles administrativos) ve emails sin máscara en todo el módulo monitoreo**. Enmascaramiento se mantiene solo para `ReporteUsuario` anónimo y vistas no-admin.
- Verificar que no entra en conflicto con `INV-RU07` (DNI enmascarado en reportes — esa regla es DNI, no email).

### 4. A13 — Link de auditoría a usuarios

**Problema**: en `email-audit-findings.component`, las filas con hallazgos no tienen acción inline. Admin debe copiar DNI y abrir `/intranet/admin/usuarios` manualmente.

**Cambios**:
- FE: nueva columna "Acción" con `<a [routerLink]="['/intranet/admin/usuarios']" [queryParams]="{ dni, autoOpen: 'true' }">`.
- FE: `usuarios.component` (o su page wrapper) lee `autoOpen` en query params + abre dialog de edición con focus en campo correo. Usar `effect()` o `route.queryParamMap` + `OnInit`.
- FE: aplicable también a futuro panel "Gap del día" (Chat 6.2) — dejar `TODO INV-RU07` si el dialog de apoderado no existe todavía.

## Fuera de scope (explícito)

- No tocar fingerprint ni merge de ErrorGroup (eso es Chat 1.2).
- No tocar correlation id end-to-end (eso es Chat 1.3).
- No reconciliar contadores (eso ya cerró Chat 1.1, brief 139).
- No agregar filtros en bandeja (eso es Chat 4.1).
- No tocar UI estructural — solo agregar campos a DTOs/cards y un dialog/textarea.

## Reglas a respetar

- `rules/backend.md` — archivos ≤ 300 líneas; `BusinessRuleException` con código; `[Authorize]` en endpoints.
- `rules/business-rules.md` — INV-RU07 (DNI mask en reportes anónimos); aclarar en este chat que A12 NO entra en conflicto.
- `rules/primeng.md` — dialog confirma con `[(visible)]` y `(visibleChange)` separados; `appendTo="body"` en p-select de filtros si tocan.
- `rules/a11y.md` — botones icon-only del link auditoría con `pt + aria-label`.
- `rules/design-system.md §B5` — si el link es icon-only, seguir el triplet ver/editar/toggle.
- `rules/optimistic-ui.md` — el dialog de bloqueo manual va con `wal.execute` optimista.

## Entregables

- **Educa.API**: 1 migración SQL + cambios en `EmailOutbox` + 2 services (`EmailOutboxWorker`, `EmailBlacklistService`) + 2-3 DTOs + 4-6 tests contract.
- **educa-web**: actualizaciones en `email-outbox-tabla.component`, `email-outbox-stats.component`, dialog de blacklist manual, `email-audit-findings.component`, `usuarios.component` (query param handler). +6-10 vitest specs.
- Commit BE separado del FE (deploys independientes).
- Smoke local: `npm run lint && npm run test`; `dotnet test` con 4+ tests nuevos verdes.

## Checklist al cerrar

```
[ ] A3 — EO_UltimoErrorTransiente persiste y se muestra en PROCESSING
[ ] A7+B7 — bloqueo manual valida motivo >= 20 chars; UsuarioReg con nombre humano
[ ] A12 — auditado que ningún DTO admin del módulo monitoreo enmascara email
[ ] A13 — link auditoría → usuarios abre dialog en correo
[ ] Migración SQL EmailOutbox ejecutada en staging y producción
[ ] 4+ tests BE nuevos verdes (contract + unit)
[ ] 6+ tests FE nuevos verdes (specs vitest)
[ ] Plan 43 §Tabla de cierre actualizado: A3/A7/A12/A13/B7 → ✅ ship con brief 142
[ ] Maestro `plan/maestro.md` cola: entrada Chat 2.1 → ✅ shipped
```

## Riesgo conocido

- Migración SQL nueva en `EmailOutbox` (tabla con volumen alto). Hacerla `NULLable` + sin default → operación instantánea, sin lock prolongado. Verificar plan de ejecución antes de aplicar en Azure SQL prod.
- A12 puede revelar que algún DTO público (no admin) también enmascara y depende de eso. Si aparece, dejar TODO y reportar al cierre — NO ampliar scope.
