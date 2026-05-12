# 147 · FE — Plan 43 Chat 2.1 (FE remaining): badge transiente + textarea blacklist + link auditoría

> **Creado**: 2026-05-12 · **Estado**: ⏳ pendiente arrancar · **Repo**: `educa-web`
> **Modo sugerido**: `/execute` (3 puntos scoped + tests)
> **Plan base**: [plan/monitoreo-cowork-feedback-2026-05-11.md §Chat 2.1](../../plan/monitoreo-cowork-feedback-2026-05-11.md)
> **Split de**: brief 142 (BE shipped local 2026-05-12, awaiting-prod). Deploys independientes.

## Por qué split

El brief 142 original empacó BE+FE para los 5 hallazgos Cowork (A3, A7, A12, A13, B7). El BE se completó y movió a `awaiting-prod/` para deploy independiente (alineado con `commit-style`: BE/FE en commits/deploys separados). Este brief 147 toma el FE remaining.

## Alcance (3 puntos + tests)

### 1. A3 — Badge "Pendiente reintento" en bandeja PROCESSING

**Contrato BE ya disponible** (commit Educa.API@<hash-be>): `EmailOutboxListaDto.UltimoErrorTransiente: string | null`. Poblado por `EmailOutboxWorker` cuando defer 4.x.x sin promover a FAILED.

**Cambios FE**:
- Actualizar tipo `EmailOutboxListaDto` (o equivalente en `@data/models/email-outbox.models.ts`) — agregar `ultimoErrorTransiente?: string | null` (camelCase tras unwrap del interceptor).
- En `email-outbox-tabla.component` (o columna de estado del listado): renderizar badge **gris** `Pendiente reintento` cuando `estado === 'PROCESSING' && ultimoErrorTransiente != null`. El tooltip muestra el `ultimoErrorTransiente` truncado a 80 chars.
- Estilo: alineado con `design-system.md` §6 — tag neutral (`styleClass="tag-neutral"`, no severity).

### 2. A7+B7 — Textarea obligatoria con contador en blacklist manual

**Contrato BE ya disponible**: 422 `BLACKLIST_MOTIVO_REQUERIDO` cuando `motivo='MANUAL'` y `observacion < 20` chars trimeados.

**Cambios FE**:
- En el dialog "Bloquear manualmente" (probablemente `email-blacklist-manual-dialog.component` o similar en `features/intranet/pages/admin/email-blacklist/`): convertir el campo observación en textarea obligatoria **solo cuando motivo === 'MANUAL'**.
- Contador `{{observacion.length}}/20 min` visible debajo del textarea.
- Submit (`[disabled]`) cuando `motivo === 'MANUAL' && observacion.trim().length < 20`.
- Mensaje de error en el textarea cuando < 20 + dirty/touched.
- Si el backend devuelve `BLACKLIST_MOTIVO_REQUERIDO`, mostrar toast con el `mensaje` del backend (no hardcodear).

### 3. A13 — Link auditoría → usuarios con autoOpen

**Cambios FE**:
- En `email-audit-findings.component` (probablemente `features/intranet/pages/admin/email-audit/` o similar): nueva columna "Acción" con anchor:
  ```html
  <a [routerLink]="['/intranet/admin/usuarios']"
     [queryParams]="{ dni: row.dni, autoOpen: 'true' }"
     pTooltip="Abrir usuario para corregir correo">
    <i class="pi pi-arrow-right"></i>
  </a>
  ```
- A11y: `aria-label="Abrir usuario para corregir correo"`.
- En `usuarios.component` (o page wrapper que monta el dialog): leer `route.queryParamMap` en `ngOnInit` o vía `effect()`. Si `autoOpen === 'true'` y `dni` matchea una fila cargada → invocar el handler de edición existente con focus en el campo `correo` (puede requerir agregar `[autofocus]` o `(visibleChange)` que ponga focus programático).
- Si el dni no matchea una fila visible (paginación), aplicar filtro de búsqueda por dni primero, luego intentar abrir.

### 4. Tests

- 2 vitest specs para el badge (PROCESSING+transiente → render badge, PROCESSING sin transiente → sin badge).
- 2 vitest specs para el textarea (motivo MANUAL <20 → submit disabled, ≥20 → submit enabled).
- 1-2 vitest specs para el link/autoOpen (queryParams se setean, dialog abre con DNI correcto).

Total: 5-6 specs nuevos.

## Fuera de scope

- BE: ya shipped en brief 142 (awaiting-prod).
- A12 BE: ya shipped — en el FE no requiere cambios (los DTOs admin del módulo monitoreo ahora exponen email raw, los componentes ya renderizan el campo tal cual).

## Reglas a respetar

- `rules/primeng.md` — dialog con `[(visible)]` y `(visibleChange)` separados; `appendTo="body"` en p-select si hay filtros.
- `rules/a11y.md` — link icon-only requiere `pt + aria-label`.
- `rules/design-system.md §6` — `tag-neutral` para badge informativo.
- `rules/optimistic-ui.md` — si el dialog de blacklist hace mutación, va con `wal.execute` optimista (ya estaba implementado en brief 138 si aplica).
- `rules/communication.md` — toast con mensaje del backend, no hardcodear.

## Entregables

- `educa-web`: actualizaciones en email-outbox tabla + dialog blacklist + email-audit-findings + usuarios page (query param handler) + 5-6 vitest specs.
- Commit FE separado del BE.
- Smoke local: `npm run lint && npm run test`.
- Al cerrar: actualizar plan 43 §Tabla de cierre marcando A3/A7/A12/A13/B7 como ✅ shipped (BE en 142, FE en 147) y maestro cola → ✅ Chat 2.1 completo.

## Checklist al cerrar

```
[ ] A3 FE — badge gris en PROCESSING con tooltip + tipo DTO actualizado
[ ] A7+B7 FE — textarea obligatoria con contador /20 + submit disabled
[ ] A13 FE — link routerLink + autoOpen dialog con focus en correo
[ ] 5+ tests FE nuevos verdes (vitest)
[ ] npm run lint limpio
[ ] Plan 43 §Tabla de cierre actualizado
[ ] Maestro cola: Chat 2.1 → ✅ ambos lados shipped
```

## Riesgo conocido

- Si el dialog `usuarios.component` no soporta `autoFocus` en un campo específico, requiere agregar `ViewChild` + `nativeElement.focus()` post-open. Si bloquea, dejar TODO y abrir hallazgo en `claude-cowork/`.
- Si `autoOpen` se invoca con un DNI fuera del viewport actual de la tabla paginada, requiere pre-filtrar — coordinar con el patrón de paginación existente.
