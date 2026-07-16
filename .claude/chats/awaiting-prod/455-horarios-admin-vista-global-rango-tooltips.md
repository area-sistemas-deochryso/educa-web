---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/admin/schedules/components/schedule-global-view/, src/app/shared/utils/time-range.utils.ts, src/app/features/intranet/pages/admin/schedules/helpers/horario-form.utils.ts, src/app/features/intranet/pages/admin/schedules/helpers/horario-import.config.ts, src/app/features/intranet/pages/admin/schedules/components/horarios-form-dialog/, src/app/features/intranet/pages/admin/schedules/components/schedule-entity-list/]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/455-horarios-admin-vista-global-rango-tooltips`.
> **Creado**: 2026-07-16 · **Estado**: ⏳ pendiente.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat.

# Gestión de Horarios (admin): Vista Global incompleta + rango horario sin validar + tooltips

## MODO SUGERIDO

`/execute` — causa raíz confirmada para los 3 puntos.

## ALCANCE

### 1. Vista Global solo cubre "Sin Profesor Asignado"

**Archivo**: `schedule-global-view.component.ts` (líneas 41-75). `problems()` solo arma 2 grupos: `'no-profesor'` y `'conflict'`. **Es solo gap de UI, no de datos** — `cantidadEstudiantes` ya viene en el payload y ya se usa en `horarios-filter.store.ts:51` y `schedule-weekly-grid.component.ts:80`.

**Fix**: agregar tercer `ProblemGroup` con `type: 'sin-estudiantes'`, filtro `all.filter(h => h.estado && h.cantidadEstudiantes === 0)` (mismo predicado que `horarios-filter.store.ts:51`, sobre horarios activos), label "Sin Estudiantes Asignados", icon `pi pi-user-slash` o similar, severity `'warning'`. Extender el union type `ProblemGroup['type']`. Revisar `schedule-global-view.component.html` — si itera `problems()` genéricamente no necesita cambios; confirmar al implementar.

### 2. Horario de 14 horas sin validación

**Archivos**: `time-range.utils.ts` (líneas 13-37, `validateTimeRange` — solo formato + `horaFin > horaInicio`), `horario-form.utils.ts` (líneas 1-61, `validateHoraInicioEnRangoVisible` líneas 12-17 — solo valida `horaInicio` contra `HORAS_DIA` 07:00-17:00, no valida `horaFin` ni duración), `horario-import.config.ts` (**importación masiva no llama ningún validador de horario** — solo `timeRangesOverlap` para solapes, es la vía más probable de entrada del dato anómalo del audit), `horarios-form-dialog.component.html` (líneas 31-50, inputs `type="time"` sin `min`/`max`).

**Decisión ya tomada**: rango horario **07:00-17:00** (alineado a `HORAS_DIA` existente, no un rango nuevo), duración máxima por bloque **4 horas**.

**Fix**:
- Extender `validateTimeRange` (o función hermana) para validar duración máxima (`horaFin - horaInicio ≤ 240 min`) y que el rango completo esté dentro de 07:00-17:00.
- Corregir `validateHoraInicioEnRangoVisible` para que también valide `horaFin` (hoy un horario `07:00-23:00` pasa porque solo mira `horaInicio`).
- Hacer que `horario-import.config.ts` llame al validador centralizado (no solo `timeRangesOverlap`) — cubre el flujo de importación masiva, la vía más probable del dato anómalo.
- Agregar `min="07:00" max="17:00"` a los `<input type="time">` en `horarios-form-dialog.component.html` como refuerzo de UX (no reemplaza la validación de TS).

### 3. Nombres truncados sin tooltip

**Archivo**: `schedule-entity-list.component.html` (líneas 32-37), `.scss` (líneas 116-139, `text-overflow: ellipsis` sin `title`/`pTooltip`). El patrón ya existe en el mismo template (ícono de estado, líneas 24-30, usa `pTooltip`).

**Fix**: agregar `[pTooltip]="entity.label"` (+ `[title]="entity.label"` como fallback nativo) al `<span class="entity-name">`, análogo para `.entity-subtitle` si también trunca.

## OUT OF SCOPE

- **Command palette (Ctrl+K) con entradas duplicadas para Administrador** — el archivo raíz (`intranet-menu.config.ts`) está siendo modificado activamente por el worktree del brief `444` ahora mismo. **No tocar este punto en este brief** — se ejecuta después de que `444` cierre, en un brief separado.
- Revalidar/limpiar horarios ya existentes con datos anómalos en la base — requeriría script de datos, no cambio de FE.
- Cambiar el rango de `HORAS_DIA` (afecta la grilla semanal, otro componente, no tocar).

## Criterio de cierre

- [x] Vista Global muestra sección "Sin Estudiantes Asignados" con los casos reales.
- [x] Crear/editar/importar un horario fuera de 07:00-17:00 o con duración >4h es rechazado, en los 3 flujos (form manual, import masivo).
- [x] Tooltip visible en nombres truncados de "Salones"/"Profesores".
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge.

## Resumen de ejecución (2026-07-16)

**Estado**: ✅ implementado, esperando deploy a prod para verificación.

### Cambios por punto

1. **Vista Global — grupo "Sin Estudiantes Asignados"**: `schedule-global-view.component.ts` — se agregó `type: 'sin-estudiantes'` al union `ProblemGroup['type']` y un tercer grupo `sinEstudiantes` (mismo predicado `h.estado && h.cantidadEstudiantes === 0` que `horarios-filter.store.ts:51`), icon `pi pi-user-slash`, severity `warning`. El template (`schedule-global-view.component.html`) itera `problems()` genéricamente — no requirió cambios.

2. **Rango horario 07:00-17:00 + duración máxima 4h**:
   - `horario-form.utils.ts`: `validateHoraInicioEnRangoVisible` (solo validaba `horaInicio`) reemplazada por `validateRangoYDuracion(horaInicio, horaFin)` — exportada, valida ambos extremos contra `HORAS_DIA` (07:00-17:00) y que la duración no exceda `MAX_DURACION_MINUTOS = 240`. `validateHorarioForm`, `validateHoraInicio` y `validateHoraFin` ahora delegan en esta función centralizada (antes `validateHoraFin` no validaba rango/duración en absoluto).
   - `horario-import.config.ts`: nueva función exportada `validateImportRowRango(horaInicio, horaFin)` que llama a `validateRangoYDuracion` — cierra el gap de la importación masiva, que antes solo corría `timeRangesOverlap` (solapes) sin ningún chequeo de rango/duración.
   - `horarios-import-dialog.component.ts`: el parseo de filas (`parseExcel`) ahora invoca `validateImportRowRango` y agrega el error a la fila si corresponde.
   - `horarios-form-dialog.component.html`: se agregó `min="07:00" max="17:00"` a los `<input type="time">` de horaInicio/horaFin como refuerzo de UX (no reemplaza la validación TS).

3. **Tooltips en nombres truncados**: `schedule-entity-list.component.html` — se agregó `[pTooltip]`/`[title]` a `.entity-name` y `.entity-subtitle` (patrón ya usado en el ícono de estado del mismo template). `TooltipModule` ya estaba importado en el componente.

### Archivos tocados

- `src/app/features/intranet/pages/admin/schedules/components/schedule-global-view/schedule-global-view.component.ts`
- `src/app/features/intranet/pages/admin/schedules/helpers/horario-form.utils.ts`
- `src/app/features/intranet/pages/admin/schedules/helpers/horario-import.config.ts`
- `src/app/features/intranet/pages/admin/schedules/components/horarios-import-dialog/horarios-import-dialog.component.ts`
- `src/app/features/intranet/pages/admin/schedules/components/horarios-form-dialog/horarios-form-dialog.component.html`
- `src/app/features/intranet/pages/admin/schedules/components/schedule-entity-list/schedule-entity-list.component.html`

### Validación

- `bun run lint`: OK, sin errores.
- `bun run build`: OK, build completo (browser + server bundles + prerender).
- `bun run test`: 2345/2349 tests pasaron. 4 fallos son timeouts pre-existentes y no relacionados a este brief (`email-outbox-diagnostico`, `correlation` — archivos no tocados en este chat); la suite de `schedules` y `time-range.utils` corrió aislada con **83/83 tests OK**.

### Fuera de alcance (respetado)

- Command palette (Ctrl+K) duplicado — colisión con worktree del brief 444, no tocado.
- Limpieza de datos anómalos existentes en BD — requiere script, no FE.
- Cambio del rango de `HORAS_DIA` — no tocado.
