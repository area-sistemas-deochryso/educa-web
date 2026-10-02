# 754 — FE+BE: P105 H F3 — color por curso en Notas, Rendimiento, Plazos-widget y widget de asistencia (necesita `cursoId`)

> **Origen**: brief 750 (P105 H F2) · commit `d7985738` · 2026-10-02
> **Repos afectados**: `educa-web`, `Educa.API` (DTOs)
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → H
> **Created**: 2026-10-02
> **Validación prod**: ⏳ pendiente desde 2026-10-02 — verificar en local con ≥9 cursos en ambos temas (chip de curso en plazos, asistencia, notas y rendimiento; chip neutro si cursoId nulo). Depende de que 756 (BE, `74561aa7`) esté desplegado.
> **depends_on**: 750 (F2) integrado en `main` (aporta `app-curso-chip`, `PickerGridOption.cursoId` y las 3 bandas del helper)
> **MODO SUGERIDO**: `/investigate` (qué DTOs, qué endpoints) → `/design` → `/execute` → `/validate`
> **exclusive**: `false`
> **modules**: `academic`, `grades`, `attendance`

## Contexto

F2 dejó el color por curso en Salones, Foro y pickers de profesor. Quedaron fuera las vistas cuyo DTO no trae `cursoId` (el helper se indexa por `cursoId`; usar `cursoContenidoId` daría otro color que en Horarios y rompe "mismo curso, mismo color").

## Alcance

- **Plazos-widget** (`TareaPorVencerDto`, `EvaluacionPorCongelarseDto`) y **estudiante-attendance-widget** (`MiAsistenciaCursoResumenDto`): solo traen `horarioId`; estos widgets no cargan horarios. Opciones: BE agrega `cursoId` a esos DTOs (preferible) o fetch extra de horarios (costo HTTP por widget en el home).
- **Notas** (`EstudianteMisNotasDto`, `SalonNotasResumenDto`) y **Rendimiento** (`RendimientoPropioCursoDto`, `ReporteRendimientoDto`): solo `cursoContenidoId`/`cursoNombre`. Requiere `cursoId` en BE.
- **Convivencia con rojo/verde semánticos** (decisión de `/design`): en Rendimiento la serie usa `#6366f1` y puntos `#22c55e`/`#ef4444` fijos; en `admin-rendimiento-curso-card` el borde ya señala desvío (`--red-400`). Propuesta de partida: color de curso solo en un chip del header, dejar rojo/verde para puntos y badges, y no tocar el borde de desvío.
- Los hex de la serie no se adaptan al tema; revisar si el color de curso los reemplaza.

## Pendiente heredado de 750

- Verificación en vivo con ≥9 cursos a la vez en ambos temas (ver `awaiting-prod/750-…`).

## Out of scope

- Acento de rol sobre avatar (746), elegir color por curso desde admin (H2).

## Diseño (go 2026-10-02)

**Decisión (usuario): opción A** — el BE agrega `cursoId` a los DTOs; sin fetch extra de horarios en el home.

### BE (`Educa.API`) — `CursoId` = `Horario.CurHorCodId`/equivalente de `Horario.Curso` (verificar nombre de FK)
| DTO | Sitio | Cambio |
|---|---|---|
| `ReporteRendimientoDto` | `ReporteRendimientoService.cs` (2 `new`) | `CursoId = contenido.Horario.Curso?.CUR_CodID` |
| `RendimientoPropioCursoDto` | `ReporteRendimientoService.cs` (~209) | idem |
| `MiAsistenciaCursoResumenDto` | `AsistenciaCursoService.cs:157` | `CursoId = horario.Curso?.…` |
| `PlazoTareaEstudianteDto` / `PlazoCalificacionProfesorDto` | `PlazosInicioService.cs` + filas de repo (`ObtenerTareasPendientesConPlazoAsync`, `ObtenerEvaluacionesConNotasEnVentanaAsync`) | agregar `CursoId` a la tupla/fila del repo y mapearlo |
| `EstudianteMisNotasDto` | `CalificacionMapper.cs:220` + tupla de `ObtenerNotasEstudianteAsync` (ya incluye `Horario.Curso`) | ampliar tupla con `CursoId` |
| `SalonNotasResumenDto` | `CalificacionMapper.cs:140` | **fuera de este paso**: devuelve `CursoNombre=""` y es por salón; requiere rediseño del contrato |

### FE
- Sumar `cursoId: number` a las interfaces espejo (`estudiante.models.ts`, `profesor.models.ts`, `calificacion.models.ts`, `admin-rendimiento.models.ts`).
- Usar `app-curso-chip` / helper de F2 indexado por `cursoId`.
- **Convivencia con rojo/verde (propuesta del brief, adoptada)**: color de curso solo en un chip del header; puntos `#22c55e`/`#ef4444` y badges quedan; el borde de desvío (`--red-400`) no se toca. La serie `#6366f1` no se reemplaza.

### Orden de ejecución
1. BE: DTOs + servicios + repos + tests. 2. FE: modelos + vistas. 3. `/validate` en ambos repos.

## Handoff BE (2026-10-02)
El trabajo BE se hace en un chat aparte: `Educa.API/.claude/chats/open/756-be-p105-h-f3-cursoid-en-dtos-notas-rendimiento-plazos-asistencia.md`. Este brief (754) queda para el consumo FE una vez que 756 esté integrado. `SalonNotasResumenDto` quedó fuera (requiere rediseño del contrato).
