# 551 — FE: "Mi Rendimiento" debe distinguir mensaje cuando el curso no tiene períodos configurados

> **Repo**: `educa-web`
> **Creado**: 2026-08-12
> **Origen**: `Educa.API` chat 498 · commit `bf23829` (worktree `chat/498-rendimiento-propio-sin-periodos`, sin merge a main) · 2026-08-12
> **Modo sugerido**: `/execute` (cambio acotado, contrato ya definido en BE)

## Contexto del cambio

`Educa.API` (brief 498) corrigió `ReporteRendimientoService.ObtenerRendimientoPropioAsync` para distinguir dos causas antes indistinguibles de `periodos: []` en `GET /api/reportesrendimiento/mi-rendimiento`:

1. El curso no tiene evaluaciones.
2. El curso tiene evaluaciones activas pero `PeriodoCalificacion` no tiene filas configuradas (bug reportado: "Mi Rendimiento" mostraba vacío pese a haber una nota calificada en "Mis Calificaciones").

El BE ahora expone `RendimientoPropioCursoDto.SinPeriodosConfigurados: boolean` (camelCase en wire: `sinPeriodosConfigurados`) — `true` solo en el caso 2. Este campo **todavía no llegó a main** (vive en la branch del worktree del chat 498, pendiente de `/wt-merge` desde `Educa.API`).

## Impacto en este repo

- `src/app/features/intranet/pages/estudiante/rendimiento/services/estudiante-rendimiento.models.ts:14-19` — agregar `sinPeriodosConfigurados: boolean` a `RendimientoPropioCursoDto`.
- `src/app/features/intranet/pages/estudiante/rendimiento/components/estudiante-rendimiento-chart/estudiante-rendimiento-chart.component.html:3-8` — el mensaje "Sin datos para este período" se dispara solo por `periodos().length === 0`, sin distinguir la causa. Agregar un input/signal que reciba el flag y renderizar un mensaje específico (ej. "Este curso aún no tiene los períodos de evaluación configurados") cuando `sinPeriodosConfigurados` sea `true`.
- Revisar `estudiante-rendimiento-chart.component.ts` y `estudiante-rendimiento.store.ts`/`estudiante-rendimiento.models.ts` (`estudiante-rendimiento.store.spec.ts` para tests) para el hilo completo del dato desde el store hasta el componente — el facade/store actuales no aplican ningún filtro, solo pasan el `cursos[]` tal cual llega del endpoint.

## Bloqueante

Este brief no puede probarse contra el endpoint real hasta que `Educa.API` chat 498 se mergee a `main` (`/wt-merge 498-rendimiento-propio-sin-periodos` desde ese repo). Verificar antes de arrancar `/execute` si el campo ya está disponible en el ambiente de desarrollo backend.

## Criterios de completado

- [x] `RendimientoPropioCursoDto` (FE) incluye `sinPeriodosConfigurados`.
- [x] El chart de rendimiento muestra un mensaje distinto (no genérico) cuando `sinPeriodosConfigurados === true`.
- [x] Repro con los datos de prueba del bug original (`EST_CodID 85`, `CC_CodID 9`) confirma el mensaje específico en pantalla.
- [x] Build + tests en verde.

## Cierre (2026-08-12)

Commit `eefaa301` (`feat(rendimiento): distinguish unconfigured evaluation periods in "Mi Rendimiento"`) en branch `chat/551-fe-mi-rendimiento-mensaje-especifico-sin-periodos` (worktree `WT/educa-web/551-...`, pendiente `/wt-merge`). 5 archivos, 12 inserciones / 2 eliminaciones.

Bloqueante original (BE sin mergear) resuelto antes de arrancar: `Educa.API` chat 498 ya estaba en `main` (commit `712dd92`, verificado por grep directo del campo `SinPeriodosConfigurados` en el working tree del backend).

Verificado en vivo (dev server FE `:4201` + BE `:5139`, login vía sesión guardada como estudiante ALCALA SANDOVAL DANIELA, curso `QA E2E Curso Prueba`) — el mensaje "Este curso aún no tiene los períodos de evaluación configurados" se renderiza correctamente en reemplazo del genérico "Sin datos para este período". Servidores de dev detenidos tras la verificación, puertos 4201/5139 liberados.

**Nota operativa**: `npm ci`/`npm install` en el worktree recién creado se corrompió de forma distinta en 5 intentos consecutivos (probable interferencia de antivirus/indexador con la extracción de `tar` en Windows). Se resolvió creando una **directory junction** de `node_modules` apuntando al `node_modules` sano del repo principal (`New-Item -ItemType Junction`), evitando una reinstalación completa. Vale la pena considerarlo default para worktrees nuevos si el problema se repite.
