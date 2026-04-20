# Plan 23 — Extensión de `/intranet/admin/asistencias` a Profesores

> **Fecha**: 2026-04-20
> **Origen**: Conversación 2026-04-20. Tras cerrar Plan 21 (CrossChex sincroniza marcaciones de profesores y estudiantes en la tabla unificada `AsistenciaPersona`), la vista admin de gestión y reportes quedó desalineada: sólo contempla estudiantes aunque el botón "Sincronizar CrossChex" ya trae ambos tipos.
> **Dependencia dura**: Plan 21 cerrado (sin él, la tabla `AsistenciaPersona` y el dispatcher de profesores no existen).
> **Dependencia blanda**: Plan 22 (endurecimiento correos) — si Plan 22 cierra antes, este plan consume directamente la nueva clasificación SMTP + notificación triple; si cierra después, hereda el endurecimiento sin rework.

---

## Problema

`/intranet/admin/asistencias` tiene dos pestañas:

| Tab | Qué muestra hoy | Qué debería mostrar |
|-----|------------------|---------------------|
| **Gestión** | Listado + stats + sync CrossChex **solo de estudiantes** | Listado filtrable por tipo de persona (Estudiantes / Profesores / Todos) con stats diferenciadas |
| **Reportes** | Generador de reportes **solo de estudiantes** | Reportes por tipo de persona (incluye profesores) o consolidados |

### Síntomas concretos

1. **Gestión — invisibilidad de marcaciones de profesor**: el backend ya las registra en `AsistenciaPersona` con `ASP_TipoPersona = 'P'`, pero el endpoint `GET /api/asistencia-admin/dia` filtra por `TipoPersona = 'E'` (o no filtra y el DTO no distingue). El Director no ve las marcaciones biométricas de los profesores que ya están en BD.
2. **Gestión — botón "Sincronizar CrossChex"**: el label sugiere una sola cosa, pero internamente `SobreescribirDesdeCrossChexAsync` ya procesa ambos tipos. El Director no tiene control ni retro-alimentación de cuántos registros se importaron por tipo.
3. **Gestión — estadísticas sesgadas**: las 4 cards (Total, Completas, Incompletas, Manuales) agregan todo como si fueran estudiantes. Si hay 107 estudiantes + 12 profesores, mostrar "107 Total registros" oculta la realidad.
4. **Gestión — "Nueva asistencia" formulario**: el selector `listarEstudiantes` solo lista estudiantes. Un admin que necesita registrar manualmente la asistencia de un profesor (ej: biométrico caído, llegó presencial) no tiene cómo.
5. **Gestión — "Cerrar mes"**: `CierreAsistenciaMensual` aplica a TODOS los registros del mes sin distinción (ver INV-AD03). OK, no requiere cambio — pero hay que verificar que el enforcement no discrimine.
6. **Reportes — tipo de reporte**: la pantalla filtra por rango + fecha + salones. No permite cambiar el universo de personas. Un reporte "Tardanzas del mes" hoy devuelve tardanzas de estudiantes, nunca de profesores.
7. **Reportes — selector "Salones"**: solo aplica a estudiantes. Para profesores se necesita otro eje (área, nivel que dicta, o simplemente "todos los profesores").

### Costo actual

Cada día desde el cierre de Plan 21:

- El admin no puede auditar cumplimiento de profesores desde la UI.
- Las correcciones manuales de asistencia de profesores (INV-AD05 — correo diferenciado "Corrección de asistencia") no se pueden ejecutar desde admin porque el formulario no los lista.
- La única forma de ver marcaciones de profesor es por la vista `AttendanceDirectorComponent` (tab Profesores de Plan 21 Chat 7) — pero esa vista es read-only y no tiene flujo de edición formal.

---

## Decisiones arquitectónicas

### D1 — Estrategia de UI: "Persona" como filtro transversal

La UI actual está modelada como "vista de estudiantes del día". Se reinterpreta como "vista de personas del día" con un filtro/toggle por tipo.

| Componente UI | Antes | Después |
|---------------|-------|---------|
| Filtros header | Fecha + search | Fecha + search + **toggle Estudiantes / Profesores / Todos** |
| Columna "Grado" | Grado + Sección | Contexto polimórfico: Grado/Sección (estudiante) · Área/Cargo (profesor) |
| Stat cards | 4 cards estáticas | 4 cards + **selector si mostrar "Total global" o "Por tipo"** (default: global con badges) |
| Formulario "Nueva asistencia" | Selector de estudiante | Selector con pestaña Estudiante / Profesor (reutiliza UX de `AttendanceDirectorComponent` de Plan 21) |

**No se duplica la vista**. Se agrega un filtro que cambia el universo sin romper la coherencia de las demás columnas.

### D2 — Modelo de datos del DTO

`AsistenciaAdminLista` debe ganar 2 campos para soportar ambos tipos:

```typescript
interface AsistenciaAdminLista {
  // existentes
  id: number;
  dni: string;
  nombreCompleto: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  estado: string;
  origenManual: boolean;
  // nuevos
  tipoPersona: 'E' | 'P';              // discriminador
  contextoPersona: string;             // polimórfico: "1ro Secundaria A" (E) o "Matemáticas — Secundaria" (P)
}
```

**No se agregan campos específicos de rol** (ni `grado`, ni `seccion`, ni `area`). El backend compone `contextoPersona` según el tipo. La UI lo renderiza plano en la columna "Grado" (que se renombra a "Contexto" o se deja "Grado" sabiendo que para profesores muestra su área). **Preferencia**: renombrar a **"Contexto"** para claridad.

### D3 — Endpoints backend: parametrizar por `tipoPersona`

No se duplican endpoints. Se agrega query param opcional `tipoPersona ∈ {E, P, todos}` (default = `todos` para admin):

| Endpoint | Cambio |
|----------|--------|
| `GET /api/asistencia-admin/dia?fecha&sedeId&search` | Agregar `&tipoPersona=E\|P\|todos` (default `todos`) |
| `GET /api/asistencia-admin/estadisticas?fecha&sedeId` | Agregar `&tipoPersona` — response ahora puede incluir desglose `{totalEstudiantes, totalProfesores, ...}` o agregado según param |
| `GET /api/asistencia-admin/estudiantes?sedeId&search` | **Renombrar** a `/personas?sedeId&search&tipoPersona` (backwards compat: mantener alias temporal `/estudiantes` que reenvía con `tipoPersona=E`) |
| `POST /api/asistencia-admin/entrada` + `/salida` + `/completa` | Agregar `TipoPersona` al DTO de request |
| `POST /api/asistencia-admin/sync` | Response estructurado: `{ estudiantes: { nuevos, errores }, profesores: { nuevos, errores } }` en lugar de string plano |

### D4 — Enforcement de jurisdicción (INV-AD06 de Plan 21)

Plan 21 formalizó INV-AD06: "la justificación de un profesor requiere rol administrativo; un profesor no puede autojustificarse ni justificar a un colega". Este plan **debe** verificar que:

- `POST /api/asistencia-admin/*` con `TipoPersona = 'P'` solo lo puedan ejecutar los 4 roles administrativos (Director, Asistente Admin, Promotor, Coordinador Académico) — ya protegido por `[Authorize(Roles = ...)]` a nivel controller, pero agregar test de boundary.
- El correo diferenciado "Corrección de asistencia" (INV-AD05) se envíe al profesor + al Director cuando la persona editada es profesor (ver patrón en `EmailNotificationService` de Plan 21 Chat 3).

### D5 — Reportes: eje adicional sin duplicar

La pantalla actual de Reportes tiene filtros: Tipo de reporte + Rango + Fecha + Salones. Se agrega:

- **Tipo de persona** (Estudiantes / Profesores / Todos) — selector al lado de "Rango".
- **Selector "Salones"** se desactiva o muta a "Áreas" cuando tipo = Profesores. Cuando tipo = Todos, se oculta el selector de salones y se reporta sobre todo el universo.

Los endpoints de reportes (`ReportesAsistenciaController`) deben aceptar el param `tipoPersona`. **No se diseñan templates PDF nuevos** — se reutilizan los existentes con header dinámico ("Reporte de asistencia — Estudiantes" / "— Profesores" / "— Consolidado").

### D7 — Sincronización restringida a la fecha seleccionada

Hoy el botón "Sincronizar CrossChex" ya pasa `store.fecha()` al endpoint, pero el label no lo transparenta — el admin no sabe si está sincronizando "hoy", "todo el mes" o la fecha del filtro. Se formaliza el contrato:

- **Un clic = un día**. El sync siempre opera sobre la fecha activa del date picker, nunca sobre "hoy" ni sobre rangos. Backend `SobreescribirDesdeCrossChexAsync(fecha)` ya respeta este contrato.
- **Label del botón explícito**: `"Sincronizar CrossChex · {DD/MM/YYYY}"` (fecha del store interpolada) o mínimamente tooltip con la fecha. Evita ambigüedad visual.
- **Confirm dialog antes del sync**: PrimeNG `p-confirmDialog` con mensaje `"Se reemplazarán las marcaciones automáticas del {DD/MM/YYYY} con las de CrossChex. Los registros editados manualmente se preservan. ¿Continuar?"`. Razón: el sync **borra** los registros no-manuales del día antes de reimportar (ver `AsistenciaSyncService.SobreescribirDesdeCrossChexAsync` paso 3). Un clic accidental sin confirmación es destructivo.
- **Toast de resultado estructurado**: consumir el response JSON del Chat 1 (`{estudiantes: {nuevos, preservados, errores}, profesores: {...}}`) y mostrar `"Fecha {DD/MM/YYYY}: {N_E} estudiantes + {N_P} profesores importados, {K} preservados (editados manualmente)"`. Reemplaza el toast string-plano actual.
- **Respeto al filtro `tipoPersona`**: el sync siempre trae **ambos** tipos (el webhook de CrossChex no distingue). El filtro UI solo afecta la visualización post-sync, no el universo sincronizado. Documentar esta decisión en el tooltip para evitar confusión.

### D6 — Consumo inmediato de Plan 22 si cierra primero

Si al arrancar este plan ya está merge Plan 22 (endurecimiento correos):

- La validación ASCII+RFC del DTO (F1 de Plan 22) aplica automáticamente al encolar correos desde aquí.
- La clasificación SMTP (F2) aplica al flujo de corrección formal.
- No se escribe nada específico — se heredan en la capa outbox.

Si este plan cierra primero, Plan 22 al arrancar ya encuentra el universo de correos cubriendo ambos tipos y no necesita refactor de alcance.

---

## Fases

### Chat 1 — Backend: parametrizar endpoints por `tipoPersona` (BE) ✅ (2026-04-20)

**Objetivo**: listar, contar, crear y editar asistencia admite ambos tipos sin duplicar código.

- [x] Agregar param `tipoPersona ∈ {E, P, null}` a `IAsistenciaAdminService.ListarDelDiaAsync`, `ObtenerEstadisticasDelDiaAsync`, `ListarPersonasParaSeleccionAsync` (rename).
- [x] Modificar queries para filtrar por `ASP_TipoPersona` cuando param esté presente; sin filtro por default para admin.
- [x] Ampliar `AsistenciaAdminLista` DTO con `TipoPersona` + `ContextoPersona` (string polimórfico compuesto por el service).
- [x] Ampliar `AsistenciaAdminEstadisticas` DTO: campos `TotalEstudiantes`, `TotalProfesores`, `CompletasEstudiantes`, `CompletasProfesores` (respuesta desglosada). Consumer decide qué mostrar.
- [x] Agregar `TipoPersona` a `CrearEntradaManualRequest`, `CrearSalidaManualRequest`, `CrearAsistenciaCompletaRequest`, `ActualizarHorasRequest`.
- [x] Route `/estudiantes` → renombrar a `/personas` con query `tipoPersona`; alias `/estudiantes` reenvía con `tipoPersona=E` (no se rompe FE todavía).
- [x] Response de `SincronizarDesdeCrossChex` estructurado: `{ mensaje, estudiantes: {nuevos, errores, preservados}, profesores: {...} }`.
- [x] Tests: agregar 6-8 tests unitarios al service cubriendo los 3 casos (`E`, `P`, null). Suite verde.

**Gate**: ✅ endpoints funcionan con ambos tipos sin breaking change para el frontend actual. Suite BE: **781 verdes** (baseline 772, +12 nuevos del Chat 1; plan exigía ≥766).

**Notas de implementación**:

- Repo dividido en 3 partial classes (regla 300-líneas): `AsistenciaAdminRepository` (base + entity lookups), `AsistenciaAdminQueryRepository` (listar+stats polimórficos), `AsistenciaAdminSeleccionRepository` (personas para selección).
- CrudService dividido: `AsistenciaAdminCrudService` (create), `AsistenciaAdminCrudMutateService` (update/delete), `AsistenciaAdminCrudHelpers` (ResolverPersonaAsync + notificación + DTO mapping). Helper `PersonaAsistenciaContext` aisla la resolución polimórfica.
- `IAsistenciaAdminValidator` añade `ValidarProfesorActivoAsync`.
- `IAsistenciaPersonaRepository.ContarEditadosDelDiaPorTipoAsync` alimenta el desglose de preservados por tipo en el sync.
- `EstudianteParaSeleccionDto` renombrado a `PersonaParaSeleccionDto` (alias `/estudiantes` del controller mantiene retrocompat FE).
- `SincronizarResultadoDto` + `SincronizarTipoResultadoDto` reemplazan el string plano del POST /sync. `AsistenciaSyncService` trackea nuevos/preservados/errores por tipo vía `SyncProcesoStats` y `AsistenciaRegistroResult.TipoPersona` (expuesto por Plan 21).
- Chat 4 implementará INV-AD05 para profesor (correo al profesor + Director). Chat 1 deja TODO explícito en `AsistenciaAdminCrudHelpers.NotificarCorreccionAsync` y `AsistenciaAdminCrudMutateService.EliminarAsync`.

### Chat 2 — Frontend: filtro tipo de persona en tab Gestión (FE) ✅ (2026-04-20)

**Objetivo**: UI permite alternar Estudiantes / Profesores / Todos sin duplicar componentes.

- [x] Agregar signal `tipoPersonaFilter = signal<'E' | 'P' | 'todos'>('E')` en `AttendancesAdminStore` (default `E` por retrocompatibilidad visual).
- [x] Agregar `SelectButton` de 3 opciones en el header (entre "Gestión/Reportes" tabs y las stat cards).
- [x] `AttendancesDataFacade.loadDia()` pasa el filtro al service (`'todos'` → `null` antes de enviar).
- [x] `AsistenciaAdminLista` model tipado con `tipoPersona` y `contextoPersona`.
- [x] Renombrar columna "Grado" → "Contexto" en la tabla.
- [x] Estadísticas: 4 cards mantienen el total del filtro activo; sub-label "de los cuales N son profesores" cuando filtro = Todos.
- [x] Visual: badge junto al nombre (`Estudiante` / `Profesor`) con `tag-neutral` (design-system F2).
- [x] Formulario "Nueva asistencia": `p-selectButton` Estudiante / Profesor; recarga el selector subyacente al cambiar tipo.
- [x] **Sincronización restringida a la fecha seleccionada** (D7):
  - [x] Label del botón interpola la fecha activa: `"Sincronizar CrossChex · {DD/MM/YYYY}"`.
  - [x] Confirm dialog previo: `"Se reemplazarán las marcaciones automáticas del {DD/MM/YYYY}. Los registros editados manualmente se preservan. ¿Continuar?"`.
  - [x] Toast de resultado estructurado consumiendo `SincronizarResultadoDto` del Chat 1: `"Fecha {DD/MM/YYYY}: {N_E} estudiantes + {N_P} profesores importados, {K} preservados (editados manualmente)"`.
  - [x] Tooltip: `"Sincroniza ambos tipos (estudiantes y profesores). El filtro de tipo solo afecta la visualización."`.
- [x] Tests: 19 specs nuevos (8 store + 11 data facade) cubren default filter, set/update del filtro, herencia en form, alias `estudiantes`, paso de tipoPersona al service, conversión `'todos'` → `null`, reload en `onTipoPersonaChange`, response estructurado de sync (success + error paths), guard de `syncing`. Suite FE: **1374 verdes** (baseline 1341, +33 nuevos).

**Gate**: ✅ Director puede ver, filtrar y crear manualmente asistencia de profesores desde la misma pantalla. Botón de sync comunica explícitamente la fecha objetivo y pide confirmación antes de borrar/reimportar.

**Notas de implementación**:

- Modelos en `@data/models/attendance-admin.models.ts`: agregados `TipoPersonaAsistencia` / `TipoPersonaFilter` / `SincronizarResultado` / `SincronizarTipoResultado`; `EstudianteParaSeleccion` se reexpone como alias de `PersonaParaSeleccion`; los 4 request types ganan `tipoPersona?`.
- Store: `_tipoPersonaFilter` privado default `'E'`; `setTipoPersonaFilter`; alias retrocompat `estudiantes` = `personas`; `openNewDialog` hereda el tipo del filtro actual (`P` si es P, `E` para `E`/`todos`); `openEditDialog`/`openSalidaDialog` copian el tipo del item.
- Service: renombrado `listarEstudiantes` → `listarPersonas(sedeId, search, tipoPersona)`; alias retrocompat `listarEstudiantes` reenvía con `tipoPersona='E'`. `sincronizarDesdeCrossChex` devuelve `Observable<SincronizarResultado>` estructurado. `listarDelDia` y `obtenerEstadisticas` aceptan `tipoPersona?: TipoPersonaAsistencia | null`.
- Data facade: `loadItems`/`refreshItemsOnly` convierten `'todos'` → `null` vía helper `toApiTipoPersona`. `loadEstadisticas` siempre pasa `null` (desglose global E/P lo hace el BE). Nuevo `onTipoPersonaChange` + `loadPersonas(tipoPersona, search?)`. `sincronizarDesdeCrossChex(onSuccess?, onError?)` callbacks para que el componente maneje toast/UI.
- Crud facade: los 4 DTOs de mutación pasan `fd.tipoPersona` o `selected.tipoPersona`. Sin cambios de estrategia WAL.
- Component: `p-selectButton` del filtro; `p-selectButton` del form con pestañas Estudiante/Profesor (onChange recarga selector); ConfirmationService para el confirm dialog del sync; `MessageService` para el toast estructurado; `fechaLabel` computed `dd/MM/yyyy`; `filtroLabel` computed; badge "Filtro activo: X · Cambiar" cuando no es `E`. Lee query param `tipoPersona` del route para cross-link del Chat 5.
- Design-system: `tag-neutral` en badge "Estudiante"/"Profesor" junto al nombre; `p-button-success` en "Nueva asistencia" (texto blanco global A5); `stat-sublabel` nuevo token SCSS para la línea extra del card Total.
- Dialogs-sync: `p-confirmDialog` siempre en DOM con `(onHide)`; `p-selectButton` con `[ngModel]`+`(ngModelChange)`; `appendTo="body"` en todos los `p-select` nuevos/existentes.
- Lint + tsc + build limpios.

### Chat 3 — Frontend: tab Reportes con eje `tipoPersona` (FE + BE)

**Objetivo**: la pestaña Reportes respeta el universo de personas.

- [ ] Backend: endpoints de `ReportesAsistenciaController` aceptan `tipoPersona`. Queries internas filtran por `AsistenciaPersona.ASP_TipoPersona`.
- [ ] Header PDF dinámico: "Reporte de asistencia — Estudiantes/Profesores/Consolidado".
- [ ] Frontend: agregar selector "Tipo de persona" al lado de "Rango".
- [ ] Selector "Salones" se oculta o deshabilita cuando tipo = Profesores (no aplica — profesores no están adscritos a un salón para asistencia).
- [ ] Cuando tipo = Todos: selector salones oculto, header PDF = "Consolidado".
- [ ] Tests FE: spec del facade de reportes con los 3 valores del filtro.
- [ ] Tests BE: 2-3 tests del controller / service de reportes con `tipoPersona`.

**Gate**: se pueden generar reportes para profesores sin bypass (Excel/PDF) desde `/intranet/admin/asistencias?tab=reportes`.

### Chat 4 — Enforcement INV-AD06 + correo de corrección profesor (BE + FE)

**Objetivo**: las mutaciones sobre profesores desde admin disparan el correo correcto y están cubiertas por tests.

- [ ] Verificar `[Authorize(Roles = "Director,Asistente Administrativo,Promotor,Coordinador Académico")]` a nivel `AsistenciaAdminController` (debería estar por Plan 21).
- [ ] Test de boundary (rol Profesor intentando POST sobre otro profesor → 403): agregar a suite de security tests.
- [ ] Auditar `EmailNotificationService` — al editar un registro con `TipoPersona = 'P'`, el correo va al profesor **y** al Director (no al apoderado). Verificar que plantilla INV-AD05 usa placeholder "estudiante/profesor" correctamente.
- [ ] Documentar INV-AD06 como test unitario (cualquiera no-admin que intente mutar → excepción).
- [ ] Frontend: toast de confirmación usa "profesor" en lugar de "estudiante" cuando aplique.

**Gate**: no se puede mutar asistencia de profesor sin rol administrativo. El correo se envía al canal correcto.

### Chat 5 — Deploy + armonización con Plan 21 Chat 7 (vista read-only profesor)

**Objetivo**: consolidar la experiencia admin y garantizar que `AttendanceDirectorComponent` (Plan 21 Chat 7) y `/intranet/admin/asistencias` no diverjan.

- [ ] Auditoría manual: ambos componentes muestran los mismos datos cuando se apunta al mismo profesor/día. Si hay desalineación, documentar en `tasks/audit-asistencia-profesores-divergencia.md`.
- [ ] Cross-link UI: en `AttendanceDirectorComponent` tab profesores, botón "Editar en admin" que lleva a `/intranet/admin/asistencias?tab=gestion&tipoPersona=P&dni=...&fecha=...` con pre-filtros aplicados.
- [ ] Query params leídos por `AttendancesPageComponent` al montar (fecha + tipo + dni opcional → scroll a registro + abrir modal de edición si lo pide).
- [ ] Actualizar `business-rules.md` INV-AD05 (ampliar alcance a profesor desde admin).
- [ ] Actualizar `permissions.md` con la nueva jurisdicción.
- [ ] Deploy: Plan 23 no requiere migración SQL nueva (Plan 21 ya entregó `AsistenciaPersona`). Solo deploy BE + FE.
- [ ] Smoke en producción: crear manualmente asistencia de profesor desde admin, verificar correo al profesor + Director.

**Gate**: experiencia completa E2E cerrada. Plan 23 ✅.

---

## Invariantes involucrados

| ID | Invariante | Relación con este plan |
|----|-----------|------------------------|
| INV-AD01 | Toda mutación sobre `AsistenciaPersona` pasa por service (no edición directa en BD) | Este plan extiende el alcance de `IAsistenciaAdminService` a profesores pero mantiene la vía única |
| INV-AD02 | `OrigenManual = true` tiene precedencia sobre webhook | Sin cambio — aplica igual a profesores |
| INV-AD03 | Cierre mensual congela el mes para toda la sede | Sin cambio — aplica a ambos tipos |
| INV-AD05 | Correo diferenciado "Corrección de asistencia" en mutaciones admin | **Ampliado**: profesor recibe correo al profesor + Director (no al apoderado) |
| INV-AD06 | Profesor no puede autojustificarse ni justificar a colega | **Reforzado** con test de boundary en Chat 4 |

---

## Métrica de cierre

- [ ] 5 chats ejecutados (BE-FE-BE+FE-BE+FE-deploy)
- [ ] 0 endpoints nuevos (todos parametrizados)
- [ ] `AsistenciaAdminLista` discriminado por `tipoPersona`
- [ ] Tab Gestión filtra por tipo de persona sin duplicar componentes
- [ ] Tab Reportes genera PDFs/Excels de profesores
- [ ] `business-rules.md` + `permissions.md` actualizados
- [ ] Sin regresión de tests: suite BE ≥ 766 verdes, FE ≥ 1341 verdes
- [ ] Deploy completado y smoke en producción OK

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| El toggle "Estudiantes/Profesores/Todos" confunde al admin que venía acostumbrado a ver solo estudiantes | Default = `E`; badge explicativo "Filtro activo: Estudiantes · Cambiar" arriba de la tabla |
| Renombrar `/estudiantes` a `/personas` rompe clientes terceros | Mantener alias `/estudiantes` por 2 releases; deprecar en release notes |
| Response estructurado de sync rompe mensaje que hoy se muestra como toast | Adaptar el toast del frontend en el mismo Chat 2 (consume el JSON y compone el mensaje) |
| Reportes de profesores requieren columnas distintas a las de estudiantes | En Chat 3 validar con usuario real (Director): ¿necesita columnas "Área" / "Cargo"? Si sí, agregar al DTO de reporte |

---

## Notas de ejecución

- No requiere refactor de la lógica de cálculo de estados (INV-C01/02/03) — ya es universal por Plan 21.
- No requiere cambios en webhook CrossChex — Plan 21 ya resolvió dispatch Profesor→Estudiante→rechazar.
- Este plan es puramente **UI admin + parametrización de endpoints**, no reinventa el core de asistencia.
