# Plan: Attendance UX Redesign

> Rediseño completo de `/intranet/asistencia` para maximizar usabilidad.  
> Scope: FE (Angular 21) + BE (ASP.NET Core 9). Rama dedicada.

## Problema

La página de asistencia muestra datos crudos sin contexto operativo. El director necesita scrollear tablas para deducir el estado del día, no hay búsqueda/filtro en listas de 30+ estudiantes, la vista mensual es una grilla densa que no revela patrones, y la justificación requiere un modal por cada falta. Cada fricción se multiplica × días × salones × roles.

## Opciones

- **A — Incremental**: implementar solo mejoras FE puras (filtros, navegación, justificación inline). Bajo esfuerzo, impacto parcial. No resuelve el problema de contexto operativo (dashboard, conteos director, banner cierre).
- **B — Completa**: 7 features en fases ordenadas por dependencia, FE + BE. Cubre toda la superficie de dolor. Requiere endpoint nuevo para dashboard enriquecido y conteos por grupo.

## Recomendación

**Opción B** — el impacto de las 7 features juntas es multiplicativo (el dashboard da contexto, los filtros dan acceso, la navegación da velocidad, la justificación inline da eficiencia). Separar pierde la coherencia UX.

## Decisiones

| Decision | Choice | Why |
|---|---|---|
| Dashboard data source | Extender `director/estadisticas` existente (agrega desglose por grupo y alertas) en vez de endpoint nuevo | Ya existe la SQL function `fn_EstadisticasAsistenciaDia` y el pattern. Agregar campos al DTO existente es backwards-compatible (nuevos campos opcionales). |
| Sidebar vs tabs director | Sidebar en desktop, tabs en mobile | Director necesita ver conteos de todos los grupos sin cambiar de tab. En mobile no hay espacio para sidebar. |
| Timeline vs grilla mensual | Timeline heatmap reemplaza grilla | La grilla semana×7 es densa y no revela patrones. Timeline es más escaneable. Datos ya vienen del mismo endpoint mensual. |
| Justificación inline vs modal | Inline row expansion | El modal agrega 4 pasos por justificación. Con 5 faltas = 20 pasos. Inline reduce a 2 pasos por falta. |
| Cierre banner data | Reusar store de cierres existente + comparar con mes/fecha actual | `attendances-cierres.facade` ya carga cierres. Solo falta lógica de presentación condicional. |

## Fases funcionales

### F1 — Navegación temporal ◀▶
`depends_on: []`

Reemplazar dropdowns de mes y datepicker por paginador temporal con flechas (◀ día/mes ▶). Clic en el texto central abre el picker completo para saltos grandes. Aplica a ambos componentes de vista día (estudiantes y persona) y al selector de mes en la tabla mensual. El header de asistencia absorbe este control en vez de que cada sub-componente lo implemente.

**Racional de orden**: es prerequisito visual para F3 (dashboard) y F5 (timeline) que necesitan navegación temporal consistente.

### F2 — Filtro inline con búsqueda en vista día
`depends_on: []`

Agregar input de búsqueda (por nombre/DNI) y chips de estado clickeables arriba de la tabla del día. Filtrado client-side sobre los datos ya cargados. Los chips muestran conteo por estado y filtran la tabla al hacer clic. Aplica tanto a `attendance-day-list` (estudiantes) como a `attendance-persona-day-list` (profesores/staff) para consistencia cross-rol.

**Racional de orden**: independiente de todo lo demás, FE puro.

### F3 — Dashboard de estado instantáneo (BE + FE)
`depends_on: []`

**BE**: extender el endpoint `director/estadisticas` existente para incluir desglose por tipo de persona (estudiantes/profesores/admin), conteo de salones sin registro, y conteo de justificaciones pendientes. Mantener backwards-compatible (campos nuevos opcionales). Extender la SQL function o agregar queries complementarias.

**FE**: nuevo componente dashboard que se renderiza arriba del contenido de cada rol admin (director/promotor/coordinador/asist. admin). Muestra barra de progreso de asistencia del día, conteos por estado, y alerts accionables (salones sin registro, justificaciones pendientes). Cada alert es un link que navega al sub-contexto relevante. Para roles no-admin (estudiante, apoderado, profesor) no se muestra — esos roles ya tienen su contexto directo.

**Racional de orden**: el endpoint BE es la dependencia más larga. Arranca en paralelo con F1 y F2.

### F4 — Justificación inline sin modal
`depends_on: [F2]`

Reemplazar el `p-dialog` de justificación por expansión de fila in-place. Al hacer clic en una fila justificable, se expande mostrando el campo de texto y botones guardar/cancelar/quitar inline. Enter o clic en ✓ guarda. Escape colapsa. Reutiliza la misma lógica de `guardarJustificacion()` y `quitarJustificacion()` existente — solo cambia la presentación.

Depende de F2 porque los filtros de estado cambian la estructura de la tabla y la expansión inline debe funcionar sobre la tabla filtrada.

### F5 — Timeline heatmap mensual
`depends_on: [F1]`

Reemplazar la grilla semana×7 del `attendance-table` por una timeline horizontal de puntos coloreados. Cada punto es un día, el color mapea al estado (misma paleta que la leyenda). Hover muestra tooltip con detalle (fecha, hora entrada/salida, estado). Debajo de la timeline: resumen de rachas (racha actual, mejor racha del mes). Los datos ya vienen del mismo endpoint mensual — la transformación es puramente de presentación.

Depende de F1 porque la navegación temporal ◀▶ es cómo el usuario cambia de mes en esta vista.

### F6 — Sidebar Director con conteos en vivo (BE + FE)
`depends_on: [F3]`

**BE**: agregar al endpoint extendido de F3 (o endpoint complementario) el desglose de conteos por grupo del director (estudiantes, profesores, asistentes admin, coordinadores, promotores, directores) con total y presentes por grupo.

**FE**: reemplazar el `p-selectButton` horizontal de 6 opciones por un sidebar/panel lateral en desktop que muestra cada grupo con su conteo y un indicador de alerta si hay personas sin registro. En mobile colapsa a tabs (comportamiento actual adaptado). El sidebar se alimenta del dashboard store de F3.

Depende de F3 porque consume los conteos por grupo que ese endpoint provee.

### F7 — Banner de cierre pendiente
`depends_on: [F3]`

Banner condicional que aparece cuando: (a) la hora de cierre configurada ya pasó, y (b) el mes actual no tiene cierre registrado. Usa el store de cierres existente (`attendances-cierres.facade`) cruzado con la hora actual. El banner muestra conteo de registros pendientes (dato del dashboard de F3) y un botón de acción directa "Cerrar asistencia del mes". Solo visible para roles con capability `ASISTENCIA_CLOSURE`.

Depende de F3 porque necesita el conteo de registros pendientes del dashboard.

## Done-when

- Un director abre `/asistencia` y en <1s ve el porcentaje de asistencia del día sin scroll.
- El director puede identificar qué salones necesitan atención desde el dashboard sin entrar a cada sub-tab.
- Un profesor puede buscar un estudiante por nombre en la lista del día y filtrar por "Faltas" con un clic.
- La vista mensual revela patrones de inasistencia (rachas, días recurrentes) visualmente sin leer celda por celda.
- Justificar 5 faltas consecutivas toma <30s (vs ~2min con el modal actual).
- Navegar entre días/meses es ◀▶ en vez de abrir un dropdown y buscar.
- El director recibe un banner prominente si la asistencia del mes no se ha cerrado después de la hora límite.
- Todos los cambios son consistentes cross-rol: lo que aplica a estudiantes aplica igual a profesores/staff.

## Dependencias

- **BE → FE**: F3 y F6 necesitan endpoint extendido antes de que el FE pueda consumirlo.
- **Cross-componente**: F1 (navegación) afecta el header compartido y todos los sub-componentes que consumen fecha/mes.
- **Store**: F3 introduce un nuevo store de dashboard (o extiende el existente del director). F6 y F7 lo consumen.

## Fuera de alcance

- Reportes PDF/Excel — no se tocan.
- Asistencia admin (`/admin/asistencias`) — página separada con su propia arquitectura.
- Lógica de estados (cálculo A/T/F/J/-) — no cambia.
- Endpoints de justificación — misma API, solo cambia la presentación FE.
- Responsive de roles estudiante/apoderado más allá de la consistencia ya definida (filtros + navegación).
- Notificaciones push o real-time (SignalR) para el dashboard — polling manual con el botón reload existente.

## Reglas/invariantes aplicables

- **INV-CONTRACT01**: JSON camelCase en nuevos campos del DTO extendido.
- **INV-CONTRACT02**: si se agrega header custom en BE, agregarlo a CORS expose list.
- **code-language**: componentes nuevos en inglés, labels UI en español.
- **code-style**: standalone components, OnPush, inject(), signals, logger (no console).
- **state-management**: signals para estado local, NgRx Signals si se crea store de dashboard.
- **design-system**: colores de estado usan la misma paleta ($color-asistio, $color-tardanza, etc.). Dashboard progress bar usa tokens existentes.
- **a11y**: chips de filtro necesitan aria-pressed, timeline necesita aria-label por punto, sidebar necesita roles navigation.
- **backend rules**: CancellationToken en endpoints nuevos, 30s timeout default.

---

## TL;DR
- **Problema**: la página de asistencia muestra datos sin contexto operativo — requiere scroll, clics y deducción manual para entender el estado del día
- **Recomiendo**: Opción B (7 features completas) · porque el impacto es multiplicativo y separar pierde coherencia UX
- **Pendiente**: nada — las 7 features están acordadas

Sin alternativas reales: la opción incremental (A) ya fue descartada al acordar las 7 propuestas.

**Alcance** (si vas con la recomendada):
- toca: attendance header, day-list, persona-day-list, attendance-table, attendance-director shell, BE ConsultaAsistenciaController.Director + DirectorConsultaStrategy + DTOs
- fuera: reportes PDF/Excel, admin attendances page, estado calculation logic, SignalR real-time

**Reglas que aplican**: INV-CONTRACT01, INV-CONTRACT02, code-language, code-style, state-management, design-system, a11y, backend CancellationToken

**Siguiente paso**: `/execute` — crear rama `feat/attendance-redesign`, arrancar por F1+F2+F3 en paralelo

### Worktree strategy
- **Isolation**: worktree (rama dedicada `feat/attendance-redesign`)
- **Exclusive**: true — toca componentes shared de asistencia que colisionarían con cualquier otro chat
- **Touches**: `src/app/features/intranet/components/attendance/**`, `src/app/features/intranet/pages/cross-role/attendance-component/**`, `Educa.API/Controllers/Asistencias/**`, `Educa.API/Services/Asistencias/**`, `Educa.API/DTOs/**`
- **Parallel risk**: la rama `feat/attendance-ux-polish` tiene cambios en los mismos componentes — debe mergearse primero o integrar sobre ella

## Contract checklist

- [ ] Director ve barra de progreso con porcentaje de asistencia sin scroll al entrar a `/asistencia`
- [ ] Dashboard muestra alerts accionables (salones sin registro, justificaciones pendientes) con navegación directa
- [ ] Input de búsqueda en vista día filtra por nombre y DNI en ambos componentes (estudiantes y persona)
- [ ] Chips de estado filtran la tabla y muestran conteo, con orden consistente con la leyenda (A, T, F, J, -)
- [ ] Vista mensual timeline muestra puntos coloreados por día con hover detalle y resumen de rachas
- [ ] Navegación ◀▶ funciona en vista día (cambia fecha) y vista mes (cambia mes) sin abrir dropdown
- [ ] Justificación inline expande fila sin modal y permite guardar/quitar con Enter/Escape
- [ ] Sidebar director en desktop muestra conteos por grupo; en mobile colapsa a tabs
- [ ] Banner de cierre pendiente aparece solo cuando la hora límite pasó y el mes no tiene cierre
- [ ] Endpoint `director/estadisticas` extendido es backwards-compatible (campos nuevos opcionales)
