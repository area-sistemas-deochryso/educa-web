# Asistencia de Profesores en CrossChex

> **Estado**: ✅ Diseño cerrado (2026-04-18). Listo para `/execute` en Chat 1.
> **Origen**: Investigación 2026-04-18 + diseño 2026-04-18. CrossChex ya recibe marcaciones biométricas de profesores, pero el webhook (y el sync manual) las descartan silenciosamente porque la tabla `Asistencia` solo tiene FK a `Estudiante`.
> **Prioridad**: 🟡 **Alta** — no es urgente porque los datos son recuperables vía botón "Sobreescribir desde CrossChex" (`AsistenciaSyncService`), pero está pendiente ~1 semana de registros de profesores sin procesar.
> **Capa en el maestro**: Plan #21 — feature nuevo con impacto backend + frontend + reglas de negocio.
> **Ámbito**: `/intranet/asistencia` (admin view + profesor view). NO `/intranet/admin/asistencias` — ese queda fuera.

---

## Contexto

La ruta `/intranet/asistencia` es cross-role: un shell ([attendance.component.ts](../../src/app/features/intranet/pages/cross-role/attendance-component/attendance.component.ts)) delega a un sub-componente por rol. Director y los 3 administrativos no-Director (Asistente Administrativo, Promotor, Coordinador Académico) ven `AttendanceDirectorComponent`, hoy enfocado únicamente en estudiantes.

**Backend actual**:

- Tabla `Asistencia` tiene FK exclusiva a `Estudiante` (`ASI_EST_CodID`).
- `AsistenciaService.ProcesarWebhookAsync` (webhook en vivo) y `AsistenciaSyncService.SobreescribirDesdeCrossChexAsync` (sync manual admin) ambos terminan llamando a `IAsistenciaService.RegistrarAsistencia(FacialAsistenciaDto)`, que hace lookup solo contra `Estudiante` por DNI. Si el DNI es de un profesor, descarta.
- Cambio en `RegistrarAsistencia` arregla ambos caminos (live + sync histórico) transparentemente.

**Recuperación histórica**: Una vez desplegado el dispatch, el admin ejecuta "Sobreescribir desde CrossChex" por fecha para los ~7 días pendientes. CrossChex Cloud retiene el rango necesario.

---

## Requerimiento

1. En `/intranet/asistencia`, para administrativos (Director + 3 no-Director): agregar submenú **Estudiantes / Profesores**. Funcionalidad espejo adaptada al dominio profesor.
2. Profesor ve **su propia asistencia diaria** dentro de `AttendanceProfesorComponent` (además de la asistencia de sus estudiantes como tutor, que ya existe).
3. Estudiante y Apoderado: **sin cambios**.

---

## Decisiones cerradas (2026-04-18)

### Modelo de datos — tabla nueva `AsistenciaPersona`

Evaluado in-place vs tabla nueva. **Ganó tabla nueva** por criterio de limpieza:

| Criterio | Ganador |
| -------- | ------- |
| Semántica del nombre | Tabla nueva (`AsistenciaPersona` refleja modelo polimórfico) |
| Magia oculta | Tabla nueva (no `DEFAULT 'E'` que enmascare bugs) |
| Lectura para devs futuros | Tabla nueva (legacy `Asistencia` sugería FK a estudiante) |
| Rollback | Empate (apuntar al legacy es trivial) |
| Costo one-time | In-place (pero menor) |

**Esquema**:

```text
AsistenciaPersona (prefijo ASP_)
├── ASP_CodID              PK IDENTITY
├── ASP_TipoPersona        CHAR(1) NOT NULL  CHECK IN ('E','P')
├── ASP_PersonaCodID       INT NOT NULL  (FK polimórfica — validada en service)
├── ASP_Fecha              DATE NOT NULL
├── ASP_HoraEntrada        TIME NULL
├── ASP_HoraSalida         TIME NULL
├── ASP_Observacion        NVARCHAR(500) NULL
├── ASP_OrigenManual       BIT NOT NULL DEFAULT 0
├── ASP_UsuarioReg         NVARCHAR(50) NOT NULL
├── ASP_FechaReg           DATETIME2 NOT NULL
├── ASP_UsuarioMod         NVARCHAR(50) NULL
├── ASP_FechaMod           DATETIME2 NULL
└── ASP_RowVersion         ROWVERSION

Índices:
- IX_AsistenciaPersona_Persona (ASP_TipoPersona, ASP_PersonaCodID, ASP_Fecha)
- IX_AsistenciaPersona_Fecha_Tipo (ASP_Fecha, ASP_TipoPersona) INCLUDE (ASP_HoraEntrada, ASP_HoraSalida, ASP_Observacion)
```

### Migración — transición con sombra de 60 días

1. **Chat 1**: `CREATE TABLE AsistenciaPersona` + `INSERT INTO ... SELECT` desde `Asistencia` (~1 semana de datos, trivial) con `ASP_TipoPersona = 'E'`. Deja `Asistencia` intacta y read-only a nivel de código.
2. **Chat 5 (deploy)**: Validación de conteos + `sp_rename 'Asistencia', 'Asistencia_deprecated_2026_04'`.
3. **+60 días sin issues**: DROP de la tabla renombrada (chat futuro, fuera de este plan).

### Dispatch webhook — sin tiebreaker

Confirmado con query SQL el 2026-04-18: **0 colisiones DNI cross-table** (activas e históricas) entre `Estudiante` y `Profesor`.

Orden: `Profesor → Estudiante → rechazar`. Justificación: hay menos profesores (lookup más barato). Sin tiebreaker porque no hay ambigüedad posible hoy.

**Guard futuro**: incluir en el service lógica que rechace explícitamente si aparece una colisión nueva (`BusinessRuleException("DNI_COLISION_CROSS_TABLE")`), con log crítico para alerta operativa. Si alguna vez pasa, se debate regla aparte.

### Otras decisiones

| Tema | Decisión |
|------|----------|
| Ventanas horarias | Mismas que estudiantes (7:30 regular / 8:30 verano, +50 min = A, +2h = T, >2h = F). Reutiliza `AsistenciaEstadoCalculador` sin cambios. |
| Coherencia INV-C03 + anti-dup 30 min | Aplican idénticamente. Reutiliza `ClasificarYRegistrarMarcacion` parametrizado. |
| Cierre mensual (INV-AD03/AD04) | Aplica a ambos tipos transparentemente. |
| Origen manual (INV-AD02) | Aplica a ambos tipos transparentemente. |
| Vías válidas (INV-AD01) | Cubren ambos tipos — misma regla, mismo service. |
| Email routing | Una plantilla parametrizada por `TipoPersona`. Estudiante = sistemas + apoderado activo. Profesor = sistemas únicamente. |
| Reportes profesor | Mismo formato visual que salón-consolidado (día/mes/año/consolidado). Servicios nuevos: `ReporteAsistenciaProfesorPdfService`, `ReporteFiltradoProfesoresService`. |
| Justificación profesor | Requiere rol administrativo (INV-AD06 nuevo). Profesor no puede autojustificarse ni justificar a otros profesores. |
| Deuda `APP_USER_ROLE_ADMIN_LIST` | Se corrige en Chat 3 (precondición del submenú). Hoy incluye Profesor/Estudiante por error — debe quedar solo Director + 3 administrativos no-Director. |

### Invariantes nuevos o modificados

- **INV-AD05 (ampliado)**: Tipo `E` → correo a sistemas + apoderado activo. Tipo `P` → correo solo a sistemas.
- **INV-AD06 (nuevo)**: Justificación de asistencia de profesor requiere rol administrativo. Profesor no puede autojustificarse ni justificar a otro profesor. Estudiantes: sin cambios.

### Regla nueva de jurisdicción (a `permissions.md`)

| Rol | Jurisdicción |
|-----|---------------|
| Director | Todos (incluye otros administrativos) |
| Administrativos no-Director (Asistente Administrativo, Promotor, Coordinador Académico) | Todos los no-administrativos (Profesor, Estudiante, Apoderado). NO sobre Director ni entre sí. |
| Profesor | Sí mismo (lectura) + sus estudiantes como tutor (lectura + justificar) |
| Estudiante / Apoderado | Solo sí mismo / sus hijos (lectura) |

---

## Plan de ejecución — 5 chats

### Chat 1 — Backend core (modelo + dispatch + writes migrados) ✅ 2026-04-20

> **Camino 1 · B-split**: Chat 1 migra writes (webhook + admin crud). Chat 1.5 migra reads + FKs + servicios secundarios (ver sección siguiente). Trade-off asumido: entre deploy de Chat 1 y deploy de Chat 1.5, UI de reportes/consulta lee de `Asistencia` legacy (snapshot frozen); UI admin de edición y webhook ya operan sobre `AsistenciaPersona`.

**Objetivo**: Webhook en vivo, admin crud y `AsistenciaSyncService.Sobreescribir` empiezan a registrar profesores. Datos de estudiantes siguen funcionando sin regresión. Build limpio, 752 tests en verde.

| Entregable | Archivo | Estado |
| ---------- | ------- | ------ |
| Script SQL | `Educa.API/Scripts/plan21_chat1_AsistenciaPersona.sql` — CREATE TABLE + índices + seed `TipoPersona='E'` con IDENTITY_INSERT + 7 validaciones | ✅ Ejecutado en prueba (80 registros) + producción (1345 registros) el 2026-04-20 |
| Modelo | `Models/Asistencias/AsistenciaPersona.cs` | ✅ |
| EF config | `Data/Configurations/AsistenciaPersonaConfiguration.cs` + DbSet en `ApplicationDbContext` | ✅ |
| Constants | `Constants/Asistencias/TipoPersona.cs` (discriminador polimórfico) | ✅ |
| Repositorio nuevo | `Interfaces/Repositories/Asistencias/IAsistenciaPersonaRepository.cs` + `Repositories/Asistencias/AsistenciaPersonaRepository.cs` | ✅ |
| Lookup Profesor | `IAsistenciaRepository.GetProfesorActivoConSedeByDniAsync` + `ChequearColisionDniAsync` | ✅ |
| Executor polimórfico | `Services/Asistencias/Registro/AsistenciaMarcacionExecutor.cs` + `PersonaMarcacionContext` record | ✅ Refactor completo; firmas reciben `PersonaMarcacionContext` y `AsistenciaPersona` |
| Dispatch | `Services/Asistencias/AsistenciaService.cs` — orden Profesor → Estudiante → rechazar. Guard `DNI_COLISION_CROSS_TABLE` activo. | ✅ |
| Admin CRUD | `Services/Asistencias/AsistenciaAdmin/AsistenciaAdminCrudService.cs` — writes + reads propios migrados a `AsistenciaPersona` (solo `TipoPersona='E'` en Chat 1). | ✅ `RequireTipoEstudiante` guard + `ASISTENCIA_TIPO_NO_SOPORTADO` error |
| Notifier desacoplado | `IAsistenciaAdminEmailNotifier.NotificarCorreccionAsync` ahora recibe primitivos (fecha + horas + sede) en lugar de `Asistencia` legacy. | ✅ |
| Sync | `AsistenciaSyncService.cs` — `estudiantesNoEncontrados` → `personasNoEncontradas`, `EliminarAsistenciasDelDia` redirige a `AsistenciaPersona` (todos los tipos). | ✅ |
| DI | `Extensions/RepositoryExtensions.cs` — `IAsistenciaPersonaRepository` scoped. | ✅ |
| Tests | 3 nuevos en `AsistenciaServiceTests.cs`: regresión Estudiante, dispatch Profesor (incluye skip de correo apoderado), guard `DNI_COLISION_CROSS_TABLE`. | ✅ 752 tests verdes |

**Datos del seed migrado** (2026-04-20):
- Prueba: 80 registros, max ID 88, 7/7 validaciones OK.
- Producción: 1345 registros, max ID 1850, 7/7 validaciones OK.
- `ASP_HoraEntrada`/`ASP_HoraSalida` = `DATETIME` (consistencia binaria con legacy, no `TIME`).

### Chat 1.5 — Backend reads + FKs + secundarios (B-split parte 2) ✅ 2026-04-20

**Objetivo**: Cerrar el split — reads migran a `AsistenciaPersona`, servicios secundarios adaptan firmas, FKs `JustificacionSaludDia.JSD_ASI_CodID` y `PermisoSaludSalida.PSS_ASI_CodID` repuntan a `ASP_CodID` (IDs preservados por seed del Chat 1).

**Pre-requisito**: Chat 1.5 **debe cerrar antes que Chat 2** para que frontend de profesor consuma data coherente.

| Entregable | Archivo | Estado |
| ---------- | ------- | ------ |
| Script SQL FKs | `Educa.API/Scripts/plan21_chat15_FkRepointAsistenciaPersona.sql` — inspección + drop/create FKs + verificación post-repoint | ✅ Preparado (pendiente de ejecución en BD prueba/producción) |
| Reads admin | `AsistenciaAdminRepository.cs` — `ListarAsistenciasDelDiaAsync`, `CalcularEstadisticasDelDiaAsync`, `GetEmailDataByIdsAsync` join polimórfico sobre `AsistenciaPersona` (`TipoPersona='E'`) | ✅ |
| Reads consulta | `ConsultaAsistenciaRepository.cs` — apoderado, estudiante, profesor (día/rango), director (reporte + estadísticas + salones/sede). `ObtenerEstadisticasDiaRawAsync` reemplaza el llamado a `fn_EstadisticasAsistenciaDia` por LINQ directo contra `AsistenciaPersona` | ✅ |
| Reads reportes | `ReporteAsistenciaRepository.cs` — subqueries correlacionados `ObtenerEstudiantesConAsistenciaDiaAsync` y `ObtenerEstudiantesConAsistenciaRangoAsync` sobre `AsistenciaPersona` | ✅ |
| Reads write-repo | `AsistenciaWriteRepository.cs` + `IAsistenciaWriteRepository` — firmas cambiadas a `AsistenciaPersona` | ✅ |
| Reads legacy | `AsistenciaRepository` — `GetDnisConAsistenciaCompletaAsync`/`GetDnisConAsistenciaEditadaAsync` polimórficos (E + P), `GetAsistenciaPendientePorDniAsync` retorna `AsistenciaPersona?` cubriendo fallback profesor. `GetAsistenciaDelDiaAsync` y todos los comandos CRUD legacy (Create/Update/Reload/EliminarAsistenciasDelDia) removidos de la interfaz | ✅ |
| EF configs | `JustificacionSaludDiaConfiguration.cs` + `PermisoSaludSalidaConfiguration.cs` — navegaciones ahora apuntan a `AsistenciaPersona`, constraint names `FK_*_AsistenciaPersona` | ✅ |
| Models | `JustificacionSaludDia.Asistencia` → `AsistenciaPersona?`; `PermisoSaludSalida.Asistencia` → `AsistenciaPersona` | ✅ |
| Servicios secundarios | `AsistenciaAdminBulkEmailService` (consume `AsistenciaEmailDataRow`), `NotificacionFaltasService` (lista estudiantes con asistencia del día desde `AsistenciaPersona`), `PermisoSaludQueryService` (ListarEstudiantes + ValidarFechas), `JustificacionAsistenciaStrategy` (opera sobre `AsistenciaPersona`), `JustificacionSaludService` (crear + anular), `PermisoSaludSalidaService` (crear + anular). `AsistenciaCursoService` NO consume `Asistencia` legacy — sin cambios. `AsistenciaService.ManejarPersonaNoEncontradaAsync` usa directamente el retorno polimórfico de `GetAsistenciaPendientePorDniAsync` (cubre profesor desactivado intradía) | ✅ |
| Tests | Build limpio + 752 tests en verde — sin regresiones en consulta/reportes/permisos de salud (el contrato de DTOs no cambió) | ✅ |

**Trade-off cerrado**: con Chat 1.5 la UI de consulta/reportes ya lee `AsistenciaPersona`, por lo que los datos de profesor que el Chat 1 empezó a escribir son visibles transparentemente para el frontend actual (que sigue filtrando a `TipoPersona='E'` en backend). El Chat 2 habilitará el surface profesor-específico vía DTOs con `tipoPersona` y endpoints nuevos.

**Deploy pendiente (bloquea Chat 5)**: ejecutar `plan21_chat15_FkRepointAsistenciaPersona.sql` en prueba y producción antes del deploy del backend. El script revisa huérfanos (sección 1.3/1.4) antes de intentar el repoint y valida post-condiciones (sección 3).

### Chat 2 — Backend feature (consulta + reportes + email + guard)

**Objetivo**: API y side-effects completos para que frontend pueda consumir.

| Entregable | Archivo |
| ---------- | ------- |
| DTOs | `DTOs/Asistencias/AsistenciaProfesorDto.cs` + agregar `tipoPersona` a `AsistenciaListaDto` (backward compatible). |
| Endpoints consulta | `Controllers/Asistencias/ConsultaAsistenciaController.cs` — 4 endpoints: `GET /profesores/{dni}`, `GET /profesores?fechaInicio&fechaFin&estado`, `GET /profesor/{dni}/dia`, `GET /profesor/{dni}/mes`. |
| Repositorio consulta | `ConsultaAsistenciaRepository.cs` — nuevos métodos `ListarProfesoresPorFechaRango`, `GetAsistenciaProfesorAsync`. |
| Reportes PDF | `ReporteAsistenciaProfesorPdfService.cs` + `ReporteFiltradoProfesoresService.cs` (nuevos — reutilizan `PdfBuilder` base, mismo formato visual que salón-consolidado). |
| Email routing | `EmailNotificationService.EnviarNotificacionAsistenciaAsync(persona, tipoPersona, ...)` — si `P`, skip apoderado. Template usa `{{TipoSujeto}}`. Outbox `TipoEntidadOrigen = "AsistenciaProfesor"` para separar bandejas admin. |
| Guard INV-AD06 | `AsistenciaAdminService.JustificarAsistenciaAsync` — si target `TipoPersona = 'P'`, valida rol admin. Si no, lanza `BusinessRuleException("INV-AD06_JUSTIFICACION_PROFESOR_REQUIERE_ADMIN")`. |
| SignalR | `Hubs/AsistenciaHub.cs` — broadcast `AsistenciaRegistrada` incluye `tipoPersona` para que frontend filtre. |

### Chat 3 — Frontend admin (submenú + vista profesores)

**Objetivo**: Admin puede consultar, filtrar, exportar reportes y justificar asistencia de profesores.

| Entregable | Archivo |
| ---------- | ------- |
| Deuda bloqueante | `shared/constants/app-roles.ts` — corregir `APP_USER_ROLE_ADMIN_LIST` para que contenga solo Director + 3 administrativos no-Director. |
| Shell submenú | `attendance-director.component.ts` + `.html` — agregar `p-selectButton` Estudiantes/Profesores al inicio. Extraer lógica actual a `attendance-director-estudiantes.component.ts`. |
| Vista profesores | `attendance-director-profesores.component.ts` + `.html` + `.scss` — selector profesor individual + rango fecha + estado (A/T/F/J). Modos Día/Mes. Botones exportar reportes. |
| Service API | `asistencia-profesor.service.ts` — gateway HTTP a los 4 endpoints nuevos. |
| Store | `asistencia-profesor.store.ts` — estado: lista, filtros, loading, selección. |
| Facade data | `asistencia-profesor-data.facade.ts` — carga/refresh con WAL read-only. |
| Facade UI | `asistencia-profesor-ui.facade.ts` — toggle vista, filtros. |
| Modelos | `data/models/asistencia.models.ts` — agregar `AsistenciaProfesorDto`, `TipoPersona = 'E' \| 'P'` (semantic-types). |
| Mapping | `shared/services/ui-mapping.service.ts` — helper `getTipoPersonaLabel`. |
| Reports preview | Componentes preview para profesor-día/mes/año/consolidado. |

### Chat 4 — Frontend profesor (panel propia)

**Objetivo**: Profesor ve su propia asistencia read-only.

| Entregable | Archivo |
| ---------- | ------- |
| Panel en profesor | `attendance-profesor.component.ts` + `.html` — agregar `p-tabView` con "Mi asistencia" + (si tutor) "Mis estudiantes". |
| Sub-componente | `attendance-profesor-propia.component.ts` — consume endpoint `/profesor/{dni}/mes` con DNI del usuario autenticado. Read-only. Skeleton. |
| Store/facade | `asistencia-propia.store.ts` + `asistencia-propia.facade.ts` — carga mes actual, permite navegar meses anteriores. |
| Detección tutor | Verificar si profesor actual tiene salones como tutor — si no, solo mostrar "Mi asistencia" sin tab. |

### Chat 5 — Cierre (deploy + sync histórico + reglas)

**Objetivo**: Producción en verde con datos históricos recuperados y documentación al día.

| Entregable | Detalle |
| ---------- | ------- |
| Deploy backend | Ejecutar script SQL → validar conteos → deploy backend con dispatch activo. |
| Deploy frontend | Build con submenú + panel profesor → deploy → validar rutas y permisos. |
| Sync histórico | Ejecutar "Sobreescribir desde CrossChex" manualmente para cada día de la semana pendiente. Validar que profesores aparecen en `AsistenciaPersona` con `TipoPersona = 'P'`. |
| Rename legacy | `sp_rename 'Asistencia', 'Asistencia_deprecated_2026_04'`. |
| Smoke test | Profesor marca en biométrico real → verificar registro + correo a sistemas + visible en admin UI. |
| Rules — business-rules.md | § 1 nueva subsección "Modelo polimórfico de asistencia". § 15.9 INV-AD05 ampliado + INV-AD06 nuevo. |
| Rules — permissions.md | Sección nueva "Jurisdicción sobre asistencia" con la tabla. |
| Rules — domain.md / CLAUDE.md | Nota breve sobre asistencia de profesor. |

---

## Deuda técnica relacionada (no bloqueante)

- `APP_USER_ROLE_ADMIN_LIST` incluye Profesor/Estudiante por error — se corrige **en Chat 3** como precondición del submenú.
- `app-roles.ts` duplica el catálogo del backend. Revisar aparte (chat futuro fuera de este plan).
- Tabla `Asistencia` renombrada a `Asistencia_deprecated_2026_04` en Chat 5. DROP a los 60 días en chat futuro si no hay issues.

---

## Referencias

- Investigación original: chat 2026-04-18.
- Diseño cerrado: chat 2026-04-18 (este archivo).
- Reglas de negocio reutilizadas/modificadas: `business-rules.md` § 1, § 15.9.
- Frontend tocado: `src/app/features/intranet/pages/cross-role/attendance-component/*`.
- Backend tocado: `Educa.API/Controllers/Asistencias/*`, `Educa.API/Services/Asistencias/*`, `Educa.API/Models/Asistencias/AsistenciaPersona.cs` (nuevo).
- Servicios clave reutilizados: `AsistenciaEstadoCalculador`, `ClasificarYRegistrarMarcacion`, `AsistenciaSyncService`, `CierreAsistenciaService`.
