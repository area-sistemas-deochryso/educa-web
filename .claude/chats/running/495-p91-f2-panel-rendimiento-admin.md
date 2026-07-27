# 495 — P91 F2: panel de rendimiento Directivo/Admin

> **Coord ref**: `educa-coord/chats/open/487-p91-f2-panel-rendimiento-admin.md`
> **Plan**: `educa-coord/plans/xrepo-91-dashboard-rendimiento-multirol.md`
> **Creado**: 2026-07-27 · **Estado**: ✅ desbloqueado — `Educa.API` brief 492 (`GET /api/reportesrendimiento/institucional`) shipped y mergeado a `main`.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: false
> **touches**: nuevo panel de rendimiento admin (clona `attendance-panel`)

## Contrato real a consumir

`GET /api/reportesrendimiento/institucional` (capability `REPORTES_RENDIMIENTO`) → `List<ReporteRendimientoDto>`, uno por curso-contenido, con el mismo `RendimientoPeriodoDto[]` (promedio + outliers) que consume F1/F4. Trae **todos los cursos de una vez** — el ordenamiento/resaltado por outlier se resuelve en el FE sobre esta lista completa, sin pegarle al backend por criterio.

## Decisión de gateo de ruta (resuelta 2026-07-27)

`REPORTES_RENDIMIENTO` es la capability de **datos** (una sola, compartida por las 3 vistas, scope resuelto server-side — decisión de brief 490). Su `CAP_Ruta` ya apunta a `intranet/estudiante/rendimiento` (F4). Este panel usa una capability de **página** nueva y separada — mismo patrón que `ADMIN_ASISTENCIAS` (página) vs `REPORTES_ASISTENCIA` (datos):

- Capability nueva: `ADMIN_RENDIMIENTO`, `CAP_Ruta = 'intranet/admin/rendimiento'`, asignada a `ADMIN_ROLES` (`intranet-menu.config.ts:57`).
- Migración ya escrita: `Educa.API/Migrations/Manual/20260727_AddAdminRendimientoCapability.sql` (pendiente de correr en el entorno, no auto-aplicada).
- El endpoint sigue validando `REPORTES_RENDIMIENTO` sin cambios — `ADMIN_RENDIMIENTO` solo gatea la ruta y el ítem de menú en el FE.

## Scope

- Vista institucional: rendimiento agregado por curso/sede/período, consumiendo `GET /api/reportesrendimiento/institucional`.
- **Ordenar/resaltar por outliers**: el curso que se desvió de su línea base sube al frente, no una tabla alfabética de promedios planos — es el diferencial de valor, no un nice-to-have.
- Clonar la estructura ya probada de `attendance-panel` (`educa-web/src/app/features/intranet/pages/admin/attendance-panel/`): gráficos (Chart.js) + tiles de indicadores + capa de servicio/estado (facade+service+store).
- Ruta nueva `intranet/admin/rendimiento`, gateada por capability `ADMIN_RENDIMIENTO` (route + `permissionsGuard` + entrada en `intranet-menu.config.ts` con `soloParaRol: ADMIN_ROLES`).

## Pre-work

- Revisar `attendance-panel` como referencia directa de estructura a clonar (componente, service, store, facade).
- Revisar `capability-codes.generated.ts` — agregar `'ADMIN_RENDIMIENTO'` manualmente (mismo precedente que brief 489: `gen:caps` requiere backend autenticado en vivo, no disponible en este entorno).

## Out of scope

- Cálculo de agregación/outlier (vive en backend, F1/490).
- Exportación PDF/Excel.
- Panel Profesor (F3, brief 493) y Panel Estudiante (F4, ya shipped) — fases hermanas, sin dependencia.

## Criterio de cierre

- [ ] FE: lint + build OK, comportamiento verificado.
- [ ] El panel resalta/ordena por riesgo, no solo lista promedios.
- [ ] Consistente visualmente con el patrón de `attendance-panel`.
- [ ] `educa-coord/`: plan P91 actualizado marcando F2 como shipped, brief 487 cerrado.
- [ ] Pendiente post-deploy: correr `20260727_AddAdminRendimientoCapability.sql` en el entorno correspondiente.

## Tiempo estimado

~N min.
