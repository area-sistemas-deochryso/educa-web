# 692 — Audit Tests F4: cobertura de lógica de negocio educativa sin test

> **Repo destino**: `educa-web`
> **Plan**: [`audit-tests-frontend-2026-09-16.md`](../../plan/audit-tests-frontend-2026-09-16.md) (Fase F4)
> **Creado**: 2026-09-16 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**: `features/intranet/pages/profesor/utils/calificacion.utils.spec.ts`, `features/intranet/pages/admin/schedules/helpers/horario-import.config.spec.ts`, `features/intranet/pages/admin/error-groups/components/{error-groups-kanban-board,change-group-status-dialog}/`, `features/intranet/pages/admin/{cursos,ayuda-faq}/services/`

## Origen

Hallazgos de `/audit` (2026-09-16), categoría **Riesgo** — lógica de negocio educativa (notas, horarios) y de dominio (transiciones de estado, rollback optimista) en producción sin ningún test que la respalde.

## Scope

1. **`calificacion.utils.spec.ts`** — `recalcularPromedios()` (recalcula promedios por periodo tras editar una nota: filtra por rango de semana, ignora notas `null`/`undefined`, agrega periodo "General") está exportada y en uso en producción pero sin ningún test — solo `calcularPromedioPonderado` y `esNotaEditable` están cubiertas. Agregar tests con: notas mixtas (algunas null), rango de semana límite, y verificación del agregado "General".
2. **`horario-import.config.spec.ts`** — `validateImportRowRango` y `markIntraBatchConflicts` (validación anti-solapamiento de horarios en import masivo) sin ningún test. Agregar: rango inválido (hora fin antes que inicio), fila que solapa con otra del mismo batch, y caso sin conflicto.
3. **`error-groups-kanban-board.component.ts` (`onDrop`)** y **`change-group-status-dialog.component.ts` (`onConfirm`)** — la guarda contra transición de estado inválida nunca se testea (solo el `dropPredicate` visual del kanban). Agregar test de intento de transición inválida rechazada en ambos componentes.
4. **`cursos.facade.spec.ts` / `faq-admin.facade.spec.ts`** — el rollback optimista (`onError`) de crear/eliminar está completamente sin cobertura, a diferencia de módulos hermanos como `ticket-bandeja.facade.spec.ts`/`ticket-tipo-catalogo.facade.spec.ts` que sí cubren el path 409/500 con el mismo patrón WAL. Agregar cobertura de error siguiendo ese mismo patrón.

## Pre-work

- Para el punto 4, usar `ticket-bandeja.facade.spec.ts` como plantilla del patrón WAL de rollback ya validado en el proyecto — no reinventar el enfoque.

## Out of scope

- F3 (mutaciones de seguridad/aprobación).
- No es una revisión general de `calificacion.utils`/`horario-import.config` más allá de las funciones listadas.

## Criterio de cierre

- [x] Los 4 puntos cubiertos.
- [x] Build + lint + tests OK.
- [x] Plan actualizado: F4 → ✅.
- [x] Maestro actualizado.

## Cierre

- `calificacion.utils.spec.ts`: 4 tests nuevos para `recalcularPromedios()` (notas null/undefined ignoradas, rango de semana límite inclusive, agregado "General", periodo sin notas → null).
- `horario-import.config.spec.ts`: 4 tests para `validateImportRowRango` (fuera de franja operativa, duración >4h, rango válido; documentado que "hora fin antes de inicio" se guarda en el caller — `horarios-import-dialog.component.ts` — no en esta función) + 4 tests para `markIntraBatchConflicts` (solape mismo salón/día, sin solape, salones distintos, filas ya inválidas excluidas del chequeo cruzado).
- `error-groups-kanban-board.component.spec.ts`: 4 tests nuevos para `onDrop()` (transición inválida rechazada, transición válida emite, mismo estado no emite, sin data no emite).
- `change-group-status-dialog.component.spec.ts`: 3 tests nuevos para `onConfirm()` (sin grupo no emite, sin estado seleccionado no emite, verificación de que `estadoOptions` nunca expone destinos inválidos).
- `cursos.facade.spec.ts`: 4 tests nuevos de rollback (create/update/toggle/delete) siguiendo el patrón WAL de `ticket-bandeja.facade.spec.ts` (apply optimista + rollback + onError).
- `faq-admin.facade.spec.ts`: 5 tests nuevos de error path (crear 500/403, actualizar error genérico no-409, eliminar 500) — antes solo el 409 de `actualizar()` estaba cubierto.
- Total: 90/90 tests verdes en los 6 specs tocados (24 tests nuevos). Lint y `tsc --noEmit` limpios.

## Tiempo estimado

~2h30.
