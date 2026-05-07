# BE/FE — Audit filtrado soft-delete en endpoints `/estadisticas` + fix walDelete optimistic

> **Validación prod**: ⏳ pendiente smoke en prod (eliminar curso descartable, verificar `cursosInactivos` sube).

> **Repo destino**: `educa-web` (main) — pivot tras audit BE
> **Estado**: ✅ trabajo completado local, awaiting prod validation
> **Creado**: 2026-05-06 · **Modo sugerido**: `/audit` → `/design` corto → `/execute` → `/validate`
> **Origen**: smoke Cowork 2026-05-06 ronda 2, CASO 091/098. Tras soft-delete del curso 42, `GET /api/sistema/cursos/estadisticas` devolvió `{ totalCursos: 29, cursosActivos: 29, cursosInactivos: 0 }` mientras el listado mostraba el curso con `CUR_Estado = false`. **Hipótesis inicial**: las stats BE no filtran por `_Estado`. **Hipótesis incorrecta** — root cause real es FE optimistic mismatch.

## RESULTADO DEL AUDIT (2026-05-07)

### BE — los 12 endpoints filtran correctamente (no hay gap)

| # | Endpoint | Tabla(s) | `_Estado`? | Veredicto |
|---|---|---|---|---|
| 1 | `cursos/estadisticas` | `Curso.CUR_Estado` | sí | **OK** — `CountAsync(c => c.CUR_Estado)` / `CountAsync(c => !c.CUR_Estado)` |
| 2 | `usuarios/estadisticas` | Multi (SP) | sí | **OK** — SP por rol activos+inactivos |
| 3 | `vistas/estadisticas` | `Vista.VIS_Estado` | sí | **OK** — split `Count(v => v.VIS_Estado == 1)` |
| 4 | `profesor/estadisticas` | `Estudiante.EST_Estado` | sí | **OK** — `CountAsync(e => e.EST_Estado)` |
| 5 | `consulta-asistencia/director/estadisticas` | `Asistencia` | append-only | N/A |
| 6 | `asistencia-admin/estadisticas` | `Asistencia` | append-only | N/A |
| 7 | `notificaciones/admin/estadisticas` | `Notificacion.NOT_Estado` | sí | **OK** — filtra |
| 8 | `eventos-calendario/admin/estadisticas` | `EventoCalendario.EVT_Estado` | sí | **OK** — filtra |
| 9 | `reportes-usuario/estadisticas` | `ReporteUsuario` (state machine) | N/A | N/A |
| 10 | `email-outbox/estadisticas` | `EmailOutbox` | append-only | N/A |
| 11 | `email-monitoreo/sender-stats` | `EmailOutbox` | append-only | N/A |
| 12 | `rate-limit-events/stats` | `RateLimitEvent` | append-only | N/A |

**Conclusión**: ningún endpoint BE necesita fix. INV-D03 ya está respetado donde aplica. La nota propuesta `INV-D10` (stats endpoints filter by `_Estado`) **no es necesaria** — el patrón actual es uniforme (`Total = Activos + Inactivos`, separados; el FE elige qué mostrar).

### Root cause real: FE `BaseCrudFacade.walDelete`

El `walDelete` en `core/services/facades/base-crud.facade.ts` aplicaba optimistic update tipo **hard-delete** universal:

```ts
// Antes (hard implícito):
this.store.removeItem(item.id);
this.store.incrementarEstadistica(total, -1);
this.store.incrementarEstadistica(activos, isActivo ? -1 : 0);
this.store.incrementarEstadistica(inactivos, isActivo ? 0 : -1);
```

Pero `EliminarCurso` BE hace **soft-delete** (`CUR_Estado = false`, registro persiste). Mismatch:

- BE post-soft-delete: `total=30 (incluye 1 inactivo), activos=29, inactivos=1`.
- FE optimistic post-walDelete: `total=29, activos=29, inactivos=0` ❌ (síntoma reportado).

El FE escondía el item con `removeItem`, el SWR del SW eventualmente refetcheaba el listado y traía el item con `CUR_Estado = false` (renderizado como inactivo), explicando el listado "con CUR_Estado=false" y stats inconsistentes simultáneamente. No era BE filter gap, era FE optimistic mismatch.

### Fix aplicado

1. `core/helpers/stats.utils.ts`:
   - Tipo `EstadoStatsOperation = 'toggle' | 'delete' | 'delete-soft' | 'delete-hard'`.
   - `'delete-soft'` (activo) → `{ activosDelta: -1, inactivosDelta: +1 }`.
   - `'delete-hard'` → comportamiento previo (`-1, 0` activo / `0, -1` inactivo).
   - `'delete'` queda como **alias** de `'delete-hard'` por compat.
   - `getEstadoRollbackDeltas` normaliza `-0 → +0`.
2. `core/services/facades/base-crud.facade.ts walDelete` — parámetro `mode: 'soft' | 'hard'` (default `'soft'`, alineado con INV-D03):
   - `'soft'`: NO `removeItem`, sí `updateItem({ estado: false|0 })` (preserva tipo boolean/number). Total no cambia.
   - `'hard'`: comportamiento previo (`removeItem` + `total -= 1`).
3. `features/intranet/pages/admin/vistas/services/vistas.facade.ts` — pasa `'hard'` explícito (BE Vista hace `RemoveAndSaveAsync` físico).
4. `features/intranet/pages/admin/cursos/services/cursos.facade.ts` — sin cambios (default `'soft'` es correcto).
5. Tests:
   - Nuevos: `core/helpers/stats.utils.spec.ts` (11 tests: toggle / delete-soft / delete-hard / alias / rollback).
   - Actualizados: `cursos.facade.spec.ts` — 2 tests de delete reflejan comportamiento soft.
   - Vistas specs intactos.

### Archivos modificados

```
src/app/core/helpers/stats.utils.ts
src/app/core/helpers/stats.utils.spec.ts                                          (nuevo)
src/app/core/services/facades/base-crud.facade.ts
src/app/features/intranet/pages/admin/vistas/services/vistas.facade.ts
src/app/features/intranet/pages/admin/cursos/services/cursos.facade.spec.ts
.claude/chats/running/118-be-stats-endpoints-soft-delete-filter-audit.md          (este brief)
```

### Validación local

- `npx vitest run` focused stats + cursos.facade + vistas: **68/68 pass**.
- Audit BE confirma: 0 endpoints requieren cambio.
- Smoke pendiente en prod tras deploy FE: repetir CASO 091/098 — eliminar curso descartable, verificar `cursosInactivos` sube (no queda en 0).

### Aprendizajes transferibles

1. **Diagnosticar antes de actuar**: el síntoma sugería bug BE pero la lógica BE era correcta. El audit cross-controller (12 endpoints) descartó la hipótesis y forzó búsqueda en FE.
2. **`BaseCrudFacade` es shared infra**: cualquier optimistic update que asuma comportamiento BE específico (hard vs soft) afecta a todos los facades que lo extienden. Hoy 2 (cursos+vistas), crece.
3. **Default alineado con invariante**: `INV-D03` dice soft por convención. El default de `walDelete` ahora matchea. Los hard-deletes son la excepción (Vistas).

## CONTEXTO

INV-D03 (`backend.md` + `business-rules.md` §15.1) define **soft delete = toggle de estado, nunca DELETE físico**. Las queries de listado del proyecto respetan el patrón (filtran `_Estado = true` o exponen `incluirInactivos`). Las queries de **estadísticas** son el caso del que nadie se acuerda — un `COUNT(*)` sin `WHERE` cuenta soft-deleted como activos, e infla métricas que llegan a dashboards y widgets.

El bug del curso 42 es **un caso sample**. La hipótesis del usuario (a confirmar) es que **varios** endpoints `/estadisticas` tienen el mismo gap. Hay 10 controllers con métodos `Estadisticas` o `Stats`:

| Controller | Endpoint candidato a auditar |
|---|---|
| `CursosController` | `/api/sistema/cursos/estadisticas` ✅ confirmado con bug |
| `UsuariosController` | `/api/sistema/usuarios/estadisticas` |
| `AsistenciaAdminController` | endpoints de stats de asistencia |
| `ConsultaAsistenciaController` | `/director/estadisticas`, `/dia/estadisticas`, etc. |
| `NotificacionesController` | stats de notificaciones |
| `EmailOutboxController` | stats outbox / monitoreo |
| `ReportesUsuarioController` | stats reportes feedback |
| `EventosCalendarioController` | stats eventos |
| `VistasController` | stats vistas |
| `ProfesorController` | stats de profesores asignados |

No todos aplican — algunos cuentan eventos inmutables (notificaciones enviadas, errores ocurridos) donde no hay `_Estado`. Otros sí: cursos, usuarios, profesores, salones, eventos calendario, vistas, etc. La auditoría tiene que distinguir.

## SCOPE

**IN**:

- Auditar los 10 controllers listados, identificar cuáles consultan tablas con campo `*_Estado` (BIT) o relación con tabla soft-deletable.
- Para cada endpoint con gap, decidir si:
  - **Fix**: agregar filtro `_Estado = true` para que `total` cuente solo activos.
  - **Refactor**: separar `total` (todos) de `activos` (filtrados) si el negocio quiere ambos.
- Aplicar fix o ajuste a los endpoints afectados.
- Tests unitarios o de integración mínimos: cada endpoint con bug debe tener un test que cree un registro con `_Estado = false` y verifique que NO se cuenta como activo.
- Actualizar `business-rules.md` §INV-D03 si descubrimos un patrón que merezca regla nueva (ej: "endpoints `/estadisticas` deben filtrar por `_Estado` salvo justificación").

**OUT**:

- Endpoints de listado (ya filtran correctamente — INV-D09 cubierto).
- Métricas que cuentan eventos históricos sin estado (ej: `EmailOutbox`, `ErrorLog`, `RateLimitEvent`, `EmailDeferEvent`) — son append-only, no aplican.
- Cleanup físico de datos sucios en prod (eso lo hace el usuario con SQL directo).
- Frontend — los widgets que consumen estos endpoints reciben los números corregidos automáticamente, no requieren cambio.

## ENFOQUE PROPUESTO

1. **Audit pass**: leer los 10 controllers, mapear cada `Estadisticas`/`Stats` a su query/repository. Listar shape del DTO de respuesta y campos vs filtros aplicados.
2. **Tabla de hallazgos**: por endpoint, columnas `[endpoint, tabla origen, tiene _Estado?, filtra _Estado?, gap]`. Identificar los con gap.
3. **Decisión por gap**:
   - Si el DTO ya tiene `total / activos / inactivos` (como cursos), `total` debe ser `activos + inactivos` y los tres consistentes con la BD.
   - Si el DTO solo expone `total`, decidir si "total = activos" o "total = todos" según contrato implícito del consumidor (revisar widgets FE).
4. **Fix + tests**: aplicar cambios + test que reproduce el bug.
5. **Doc**: si el patrón es generalizable, agregar nota a `business-rules.md` o crear `INV-D10` (stats endpoints filter by `_Estado`).

## VALIDACIÓN

Por cada endpoint corregido:

- [ ] Crear registro de prueba.
- [ ] Soft-delete (toggle estado).
- [ ] `GET /estadisticas` devuelve numbers consistentes con BD real.
- [ ] Reactivar y verificar contadores vuelven a ajustar.

Smoke en prod tras deploy: repetir el flujo del CASO 091/098 con un curso descartable y confirmar que `cursosActivos` baja.

## REFERENCIAS

- `business-rules.md` §15.1 INV-D03 (soft-delete) + §15.1 INV-D09 (filtrado en tablas de relación).
- `backend.md` — sección "Soft-delete en tablas de relación".
- Smoke Cowork 2026-05-06 ronda 2 — anomalía residual reportada por usuario.
- Briefs cerrados: `091-fe-wal-cross-tab-wire-remaining-facades.md`, `098-fe-wal-cross-tab-refetch-end-to-end-fix.md` (donde se descubrió).

## NOTAS

- Sample confirmado: `CursosController` `/estadisticas` cuenta soft-deleted como activos.
- Posibles candidatos altos: `UsuariosController`, `ProfesorController`, `EventosCalendarioController`, `VistasController` — todos con tablas que tienen `_Estado` BIT.
- Posibles falsos positivos: `EmailOutboxController` `/stats` cuenta envíos (eventos), no entidades — no aplica filtro de estado.
- El bug es **silencioso**: el dashboard muestra números mal, nadie se entera salvo por reconciliación manual con BD. Severidad media-baja en cuanto a riesgo, alta en cuanto a confianza en métricas internas.
