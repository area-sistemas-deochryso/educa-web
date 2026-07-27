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

## Resumen de cierre (2026-07-27)

Implementado tal cual el scope, sin drift respecto al brief. Estructura nueva en
`src/app/features/intranet/pages/admin/admin-rendimiento/` (clon del patrón
`estudiante-rendimiento` para services/store/facade — más simple que `attendance-panel`
porque acá hay un solo endpoint sin combinar fuentes — y de `attendance-panel` para el
layout de tiles + cards):

- `models/admin-rendimiento.models.ts` — DTOs `ReporteRendimientoDto`/`RendimientoPeriodoDto`
  (mirror camelCase de `Educa.API/DTOs/Calificaciones/*.cs`, confirmado leyendo el controller
  y los DTOs reales en `Educa.API` en vez de asumir el shape) + `outlierScore`/`tieneOutlier`/
  `ordenarPorOutlier`/`calcularKpis` (funciones puras, testeadas indirectamente vía el store).
- `services/admin-rendimiento-api.service.ts` — `GET /api/reportesrendimiento/institucional`
  sin query params (decisión: el endpoint acepta `sedeId`/`nivel`/`periodoOrden` opcionales,
  pero el brief pide traer la lista completa y resolver todo en el FE — no se agregó UI de
  filtros, fuera del criterio de cierre).
- `services/admin-rendimiento.store.ts` / `.facade.ts` — signals + `withRetry`, mismo patrón
  que `EstudianteRendimientoFacade` (brief 489).
- `services/admin-rendimiento.store.spec.ts` — 6 tests (estado inicial, `setCursos`, orden por
  outlier, cálculo de KPIs, loading/error, reset). Todos pasan.
- `components/admin-rendimiento-kpi-tile/` — tile simple (label + valor + ícono), variante
  `alerta` cuando hay cursos con desvío. No es un clon 1:1 de
  `AttendancePanelKpiTileComponent`: ese tile grafica actual-vs-anterior con Chart.js porque
  `attendance-panel` sí tiene un período previo comparable; el endpoint institucional no
  expone eso a nivel agregado, así que se simplificó a valor puntual (decisión de diseño no
  cubierta explícitamente por el brief).
- `components/admin-rendimiento-curso-card/` — un card por curso con gráfico de línea
  Chart.js (clon directo de `EstudianteRendimientoChartComponent`, adaptado a
  `promedioCurso` en vez de `promedio`) + badge "Desvío detectado" cuando `tieneOutlier`.
- `admin-rendimiento.component.ts/html/scss` — página: header, 3 KPI tiles institucionales
  (cursos evaluados, cursos con desvío, promedio institucional), grid de curso-cards
  **ordenados por `outlierScore` descendente** (mayor desvío primero — criterio de cierre).
- Ruta `admin/rendimiento` registrada en `intranet.routes.ts` (patrón standalone, igual que
  `admin/cursos`/`admin/salones`, no el patrón de tabs de `admin/asistencias`).
- Menú: entrada nueva en `intranet-menu.config.ts` bajo el grupo "Académico" (junto a
  Cursos/Salones/Horarios) — capability `ADMIN_RENDIMIENTO`, `soloParaRol: ADMIN_ROLES`,
  `preview: 'grades'`. Decisión de agrupación no cubierta por el brief (no existía grupo
  "Rendimiento"); se optó por sumarlo al grupo académico existente en vez de crear uno nuevo
  para un solo ítem.
- `capability-codes.generated.ts`: agregado `'ADMIN_RENDIMIENTO'` a mano, en orden alfabético,
  mismo precedente que `AYUDA_MANAGE`/`REPORTES_RENDIMIENTO`.
- Gateo de ruta verificado por lectura de `permissionsGuard`/`UserPermissionsService`: matchea
  la URL completa contra `vistasPermitidas` (derivado de `CAP_Ruta` server-side) — no requiere
  ningún `data.permissionPath` extra porque la ruta ya coincide 1:1 con `intranet/admin/rendimiento`.

**Drift encontrado**: ninguno relevante al scope. Único ajuste: el brief no especificaba si
había que exponer filtros de sede/nivel/período pese a que el endpoint los soporta — se
decidió no agregarlos (ver arriba), consistente con "sin pegarle al backend por criterio".

**Validación**: `npm run lint` → OK (0 errores). `npm run build` → OK, sin warnings, prerender
de rutas estáticas sin fallos. `npx vitest run .../admin-rendimiento` → 6/6 tests OK.

Pendiente post-deploy (no bloquea este chat): correr
`Educa.API/Migrations/Manual/20260727_AddAdminRendimientoCapability.sql` en el entorno.
