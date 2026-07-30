# 496 — Fix: panel Rendimiento (Profesor) manda `CUR_CodID` en vez de `cursoContenidoId`

> **Creado**: 2026-07-30 · **Modo sugerido**: `/execute` (causa raíz ya confirmada por SQL + repro en vivo, fix acotado)
> **exclusive**: false
> **isolation**: worktree
> **touches**:
>   - `src/app/features/intranet/pages/profesor/final-classrooms/services/profesor-final-salones.facade.ts`
>   - `src/app/features/intranet/pages/profesor/final-classrooms/services/profesor-final-salones.facade.spec.ts`
>   - `src/app/features/intranet/pages/profesor/final-classrooms/profesor-final-salones.component.ts`
>   - `src/app/features/intranet/pages/admin/classrooms/components/salon-rendimiento-tab/salon-rendimiento-tab.component.ts`
>   - `src/app/features/intranet/pages/admin/classrooms/components/salon-rendimiento-tab/salon-rendimiento-tab.component.html`
>   - `src/app/features/intranet/pages/admin/classrooms/components/salon-detail-dialog/salon-detail-dialog.component.ts`

## Contexto

Bug encontrado durante verificación post-deploy de P91 F3 (panel de rendimiento Profesor, brief 493, ya shipped). Ruta: `/intranet/profesor/final-salones` → "Ver salón" → modal → tab **Rendimiento** → dropdown "Seleccionar curso" → elegir un curso dispara `GET /api/reportesrendimiento/curso/{cursoContenidoId}/estudiantes` con el ID equivocado → 401 "No tiene acceso a este curso" → refresh de token + reintento + logout automático.

## Causa raíz (confirmada por SQL + repro en vivo)

- `HorarioResponseDto.cursoId` (poblado por `HorarioService.MapToDto`, `Educa.API`) es el `CUR_CodID` de la **materia** (`h.HorCursoCodId`), no el `CC_CodID` de `CursoContenido` que el endpoint de rendimiento espera.
- El brief 493 asumió, sin verificarlo, que "es el mismo ID" que ya usa el tab Notas (`getNotasSalon(salonId, cursoId)` — ese endpoint sí acepta `CUR_CodID`, es un contrato distinto). Documentado en el propio brief 493 cerrado, sección "Decisiones de diseño no cubiertas por el brief".
- Repro en vivo (sesión profesora MENDO CALDERON MARIELA, salón INICIAL 3 AÑOS B, curso Arte): `GET /api/horario/salon/26` → horario `id=17`, `cursoId=14` (Arte, materia). `GET /api/reportesrendimiento/curso/14/estudiantes` → 401. El `cursoContenidoId` real es `10`.
- **No hace falta tocar `Educa.API`**: ya existe `GET /api/cursocontenido/horario/{horarioId}` (`CursoContenidoController.ObtenerPorHorario`), consumido en frontend vía `ProfesorCursosApiService.getContenido(horarioId)` — resuelve `horarioId=17` → `{ id: 10, ... }`. Verificado en vivo: `GET /api/cursocontenido/horario/17` → `id: 10`. `GET /api/reportesrendimiento/curso/10/estudiantes` → 200 OK.
- Mismo patrón ya usado en el codebase para este exacto problema: `GruposFacade.loadGruposForHorario` (`profesor/classrooms/services/grupos.facade.ts`) resuelve `horarioId → getContenido → contenido.id` con `switchMap`.

## Scope

- `ClassroomRendimientoTabComponent` (`salon-rendimiento-tab`): el dropdown pasa a emitir `horarioId` (ya único por fila, `HorarioResponseDto.id`) en vez de `cursoId` (materia). Se elimina el dedup artificial por `cursoId` (ya no hace falta — cada horario resuelve su propio `cursoContenidoId`).
- `ClassroomDetailDialogComponent`: el output `loadRendimiento` cambia de payload `{ salonId, cursoId }` a `{ salonId, horarioId }` (solo afecta el tab Rendimiento — Notas no se toca).
- `TeacherFinalClassroomsFacade.loadRendimientoEstudiantes`: cambia de tomar `cursoContenidoId` directo a tomar `horarioId`, resolver vía `ProfesorCursosApiService.getContenido(horarioId)` y luego llamar `getRendimientoEstudiantes(contenido.id)`. Maneja el caso "sin contenido" con mensaje de error explícito (no debería ocurrir en la práctica — si hay rendimiento que mostrar, ya existe `Calificacion` con `CC_CodID`, lo que implica que `CursoContenido` ya existe — pero se cubre el caso null igual).

## Fuera de alcance

- `Educa.API` — no requiere cambios, endpoint de resolución ya existe y fue verificado en vivo.
- Tab Notas (`salon-notas-tab`) — usa `cursoId` (materia) correctamente para su propio contrato (`/api/calificacion/salon/{salonId}/curso/{cursoId}`), sin bug.
- Panel Admin (F2, `admin-rendimiento`) y Panel Estudiante (F4, `estudiante-rendimiento`) — contratos distintos (`institucional`, `mi-rendimiento`), no afectados.

## Criterio de cierre

- [x] `cursoOptions` del tab Rendimiento usa `horarioId` como value.
- [x] `TeacherFinalClassroomsFacade.loadRendimientoEstudiantes` resuelve `cursoContenidoId` vía `ProfesorCursosApiService.getContenido` antes de llamar al endpoint de rendimiento.
- [x] Specs actualizados (`profesor-final-salones.facade.spec.ts`) cubriendo resolución exitosa y caso "sin contenido".
- [x] `npm run lint` + `npm run build` OK. `vitest run` sobre `profesor/final-classrooms` — 19/19 OK.
- [x] Repro en vivo (worktree, puerto 4210): seleccionar "Arte" en el dropdown de Rendimiento del salón INICIAL 3 AÑOS B (profesora MENDO CALDERON MARIELA) dispara `GET /api/CursoContenido/horario/17` (200) → `GET /api/reportesrendimiento/curso/10/estudiantes` (200). Sin 401, sin logout, tabla renderiza el estudiante del curso.

## Tiempo estimado

~30-45 min (fix acotado, causa raíz y endpoint de resolución ya confirmados).

## Cierre (2026-07-30)

Implementado en modo `/execute`. Causa raíz y fix verificados en vivo antes de commitear (ver criterio de cierre arriba). Sin cambios a `Educa.API` — el endpoint de resolución (`GET /api/cursocontenido/horario/{horarioId}`) ya existía y ya estaba en uso por `GruposFacade` para este mismo problema, solo faltaba aplicarlo acá.

**Pendiente fuera de este chat**: mergear `chat/496-fix-rendimiento-cursoid` a trunk (`/wt-merge`), y actualizar `educa-coord` si corresponde referenciar este fix desde el chat de verificación post-deploy que lo encontró.
