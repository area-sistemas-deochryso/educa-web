# 147 · FE — Plan 43 Chat 2.1 (FE remaining): badge transiente + textarea blacklist + link auditoría

> **Validación prod**: ❌ G.3 falla 2026-05-19 (Cowork BD-PROD-RO). Deep-link `/intranet/admin/usuarios?dni=X&autoOpen=true` no consume query params: tabla aterriza sin filtrar, drawer no abre. Ver hallazgo F-021 en `chats/open/`. G.1 (badge transiente) no validable sin tráfico orgánico (todos los PROCESSING legacy con `EO_UltimoErrorTransiente IS NULL`; además `NullValueHandling=Ignore` global oculta la key cuando es null — ver §5.3 del reporte Cowork). G.2 (textarea blacklist) pendiente próxima sesión Cowork local con BD prueba.
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

## Notas para `/verify` post-deploy (Cowork 2026-05-19)

> Diagnóstico de la sesión Cowork 2026-05-19: el handoff inicial reportó "`hasTransientField: false` en el JSON del endpoint" tanto en local como en BD prod. Investigación posterior confirmó:
>
> - ✅ Columna `EmailOutbox.EO_UltimoErrorTransiente` existe en ambas BD (`NVARCHAR(200)`, nullable, idéntica al script `plan43_chat21_A3_*.sql`).
> - ✅ Datos: 66 PROCESSING en local con `EO_UltimoErrorTransiente = NULL` (esperado — son legacy o nunca fallaron con error transitorio). FAILED tienen `EO_UltimoError` con auth errors `535: Incorrect authentication data`, no entran al campo transiente.
> - ✅ Código BE completo en `master` commit `6960f24` (Plan 43 Chat 2.1 BE): entity, DTO `EmailOutboxListaDto.UltimoErrorTransiente`, `EmailOutboxService.ListarAsync` proyecta el campo, `EmailOutboxWorker` lo popula en línea 270 cuando hay defer transitorio sin promover a FAILED.
> - ✅ `Program.cs` no tiene `DefaultIgnoreCondition`/`IgnoreNullValues` global — descartada la causa "JSON omite null keys".
>
> **Veredicto**: la ausencia de la key se explica únicamente porque el binary BE deployado (tanto en prod como el local que Cowork verificó) es **anterior al commit `6960f24`**. No hay bug — falta deploy.

**Plan de verificación al ejecutar `/verify 147`** (después del deploy del binary BE):

1. **Shape del JSON (verificación inmediata, no requiere defers reales)**

   ```bash
   # Desde DevTools en /intranet/admin/monitoreo/correos/bandeja:
   # GET /api/sistema/email-outbox/listar?estado=PROCESSING&pageSize=5
   # Confirmar que cada item del array `data` incluye la key:
   #   "ultimoErrorTransiente": null
   # (la KEY debe estar — el VALOR puede ser null hasta que ocurra defer real)
   ```

2. **Tipo FE alineado**

   ```bash
   grep -n "ultimoErrorTransiente" src/app/data/models/email-outbox.models.ts \
       src/app/features/intranet/pages/admin/monitoreo/correos/**/*.ts 2>/dev/null
   ```

   Debe aparecer en el modelo como `ultimoErrorTransiente?: string | null` y en el componente de tabla con el `@if` que renderiza el badge.

3. **Badge G.1 — verificación orgánica (puede tardar horas/días)**

   El badge "Pendiente reintento" solo renderiza cuando un correo PROCESSING tiene `ultimoErrorTransiente != null`. Esto ocurre cuando el worker se topa con un defer SMTP reintenable (códigos 4.x.x, timeout, mailbox full transitorio). Con el binary nuevo deployado:

   ```sql
   -- Re-correr periódicamente hasta que aparezca un caso real:
   SELECT TOP 5 EO_CodID, EO_Estado, EO_UltimoErrorTransiente, EO_FechaActualizacion
   FROM dbo.EmailOutbox
   WHERE EO_Estado = 'PROCESSING'
     AND EO_UltimoErrorTransiente IS NOT NULL
   ORDER BY EO_FechaActualizacion DESC;
   ```

   Cuando aparezca al menos una fila, smoke browser: refrescar la bandeja → confirmar que la fila correspondiente muestra el badge gris `Pendiente reintento` con tooltip que contiene el `ultimoErrorTransiente` truncado.

4. **Si tras 1 semana de deploy no aparece ningún caso orgánico**, considerar inyectar un defer artificial en staging (apuntar el worker a un MX que devuelva 4.7.0 transitorio) para validar end-to-end. No es bloqueante para cerrar el brief — el cierre solo exige que la key viaje correctamente en el JSON; el badge en sí es comportamiento ya cubierto por los specs vitest.

**Notas relacionadas:**

- El script SQL `plan43_chat21_A3_EmailOutboxUltimoErrorTransiente.sql` ya está aplicado en ambas BD (idempotente, devuelve no-op). No requiere re-ejecutarse.
- A7+B7 (textarea blacklist) y A13 (link autoOpen) NO fueron reproducibles orgánicamente en la sesión Cowork 2026-05-19 por falta de data (0 cuarentenas, 0 correos inválidos en email-audit). Sus checks se completan post-deploy cuando entre actividad real, o vía test sintético en staging.
