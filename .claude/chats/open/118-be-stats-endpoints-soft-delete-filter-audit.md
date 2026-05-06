# BE — Auditar filtrado de soft-delete en endpoints `/estadisticas`

> **Validación prod**: ⏳ pendiente.

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-06 · **Modo sugerido**: `/audit` → `/design` corto → `/execute` → `/validate`
> **Origen**: smoke Cowork 2026-05-06 ronda 2, CASO 091/098. Tras soft-delete del curso 42, `GET /api/sistema/cursos/estadisticas` devolvió `{ totalCursos: 29, cursosActivos: 29, cursosInactivos: 0 }` mientras el listado mostraba el curso con `CUR_Estado = false`. Las stats no filtran por `_Estado`.

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
