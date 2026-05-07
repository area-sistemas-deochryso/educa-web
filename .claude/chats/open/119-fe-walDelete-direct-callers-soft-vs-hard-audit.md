# FE — Audit DELETE optimistic en facades que llaman `wal.execute` directo

> **Validación prod**: ⏳ pendiente.

> **Repo destino**: `educa-web` (main)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-07 · **Modo sugerido**: `/audit` → `/design` corto → `/execute` → `/validate`
> **Origen**: derivado del cierre del brief 118 (`fix(crud): walDelete defaults to soft-delete optimistic update`). El fix de `BaseCrudFacade.walDelete` solo cubre cursos.facade (soft) + vistas.facade (hard). Hay ~15 facades adicionales que llaman `wal.execute` con `operation: 'DELETE'` directo, sin pasar por el helper. Cada uno define su propio `optimistic.apply/rollback` y puede tener el mismo mismatch hard/soft que disparó el bug original del curso 42.

## CONTEXTO

`BaseCrudFacade.walDelete` estandariza el optimistic delete con el parámetro `mode: 'soft' | 'hard'`. Pero solo lo usan 2 facades. Los demás CRUDs siguen el patrón explícito:

```ts
this.wal.execute({
  operation: 'DELETE',
  resourceType: 'X',
  ...,
  optimistic: {
    apply: () => {
      // <-- aquí cada facade decide si quita el item, decrementa total, etc.
    },
    rollback: () => { /* ... */ },
  },
});
```

Si el `apply` decrementa `total` o usa `removeItem` cuando el BE hace soft-delete, el FE muestra contadores stale igual que el bug del curso 42 (síntoma: `total` baja y `inactivos` no sube cuando se elimina un activo).

## SCOPE

### IN — facades con DELETE directo (15+ identificados)

Cada uno requiere:

1. Revisar el `apply/rollback` actual: ¿cómo muta el store y los counters?
2. Cruzar con el backend: ¿`Eliminar*` BE hace `_Estado = false` (soft) o `Remove*` físico (hard)?
3. Verificar coherencia. Si hay mismatch, alinear el optimistic con el BE.
4. Considerar migrar a `BaseCrudFacade.walDelete` si el facade ya tiene la forma estándar.

| # | Facade | Línea aprox | Resource type a confirmar BE |
|---|---|---|---|
| 1 | `attachments-modal/attachments-modal.facade.ts` | 176 | Archivo adjunto |
| 2 | `attendances/services/attendances-crud.facade.ts` | 301 | Asistencia (¿edit o delete real?) |
| 3 | `email-outbox/services/blacklist-crud.facade.ts` | 85 | EmailBlacklist |
| 4 | `events-calendar/services/eventos-calendario.facade.ts` | 207 | EventoCalendario (BE filtra `EVT_Estado` → soft) |
| 5 | `notificaciones-admin/services/notificaciones-admin.facade.ts` | 213 | Notificacion (BE filtra `NOT_Estado` → soft) |
| 6 | `permissions-roles/services/permisos-roles.facade.ts` | 157 | RolPermiso (`DeleteAsync` físico → hard) |
| 7 | `permissions-users/services/permisos-usuarios-crud.facade.ts` | 115 | UsuarioPermiso (físico → hard) |
| 8 | `schedules/services/horarios-assignment.service.ts` | 219 | Horario asignación |
| 9 | `schedules/services/horarios-crud.facade.ts` | 211 | Horario (¿soft `HOR_Estado`?) |
| 10 | `users/services/usuarios-crud.facade.ts` | 67 | Usuario por rol (soft `XXX_Estado`) |
| 11 | `estudiante/services/estudiante-cursos.facade.ts` | 253, 316 | (2 deletes — confirmar ambos) |
| 12 | `profesor/classrooms/services/grupos.facade.ts` | 175 | Grupo |
| 13 | `profesor/cursos/services/calificaciones.facade.ts` | 228, 315 | Calificacion + Nota |
| 14 | `profesor/cursos/services/curso-contenido-crud.facade.ts` | 149, 225, 334 | Semana / Tarea / Archivo |
| 15 | `profesor/cursos/services/curso-contenido-data.facade.ts` | 166 | (revisar — ¿es read-only?) |

### OUT

- `cursos.facade.ts` y `vistas.facade.ts` — ya cubiertos por el fix del brief 118.
- Audit de endpoints `/estadisticas` BE — completado en 118 (los 12 filtran correctamente).
- Refactor de `WalFacadeHelper` o del WAL engine — esto es solo audit + alineación de optimistic, no cambios al motor.
- Tests E2E — opcional, suficiente con specs unitarios por facade afectado.

## ENFOQUE PROPUESTO

1. **Audit**: para cada facade del scope, leer el `apply/rollback` y mapearlo contra el `Eliminar*` del service BE correspondiente. Producir tabla `[facade, líneas, BE soft/hard, optimistic actual, gap?]`.
2. **Decisión por gap**:
   - **A) Mismatch**: el optimistic asume hard pero BE es soft (o viceversa) → alinear el `apply/rollback`.
   - **B) Coherente pero inline**: el facade ya hace lo correcto pero podría migrar a `walDelete` del base → migración opcional, no blocker.
   - **C) Coherente y necesariamente custom**: el facade tiene lógica especial (ej: 2 deletes en cascade, decrementos múltiples) que `walDelete` del base no cubre — dejar como está, documentar.
3. **Fix**: aplicar correcciones tipo A. Las migraciones B son nice-to-have y se hacen oportunamente (no en este brief salvo que sean triviales).
4. **Tests**: para cada gap A corregido, agregar/actualizar spec que reproduce el escenario (soft-delete activo → counters reflejan transición a inactivo).
5. **Doc**: si aparece un patrón nuevo (ej: cascade delete), considerar agregarlo al base helper o documentarlo en `rules/optimistic-ui.md` como excepción válida.

## VALIDACIÓN

- `npm run lint` — 0 errores.
- `npx vitest run` — toda la suite verde (1934 baseline + tests nuevos).
- `npm run build` — compila.
- Smoke por feature corregido: en cada UI afectada, eliminar un registro activo y verificar que los counters reflejan la transición correcta (no que `total` baja sin que `inactivos` suba).

## REFERENCIAS

- Brief 118 cerrado: `awaiting-prod/118-fe-walDelete-soft-default-stats-cursos.md` (origen del fix base).
- `core/services/facades/base-crud.facade.ts` — patrón de referencia para `walDelete`.
- `core/helpers/stats.utils.ts` — `getEstadoToggleDeltas('delete-soft' | 'delete-hard')`.
- INV-D03 (`business-rules.md` §15.1) — soft-delete es la convención del proyecto.
- `rules/optimistic-ui.md` — patrón canónico optimistic + rollback.

## NOTAS

- Este brief NO depende del deploy del 118 — el fix base ya está en `main`. Puede arrancar inmediatamente.
- Hay potencial de descubrir 0 gaps reales: si todos los facades manejan soft/hard correctamente cada uno por su cuenta, el resultado es solo "audit OK + posibles migraciones a `walDelete` para reducir boilerplate". Eso también es resultado válido — confirma robustez del estado actual.
- Si aparecen 3+ gaps reales, considerar al cierre proponer un `INV-OPT01` o equivalente en `rules/optimistic-ui.md`: "El optimistic delete debe matchear el contrato del BE (soft → updateItem({ estado: false }), hard → removeItem + total--)".
