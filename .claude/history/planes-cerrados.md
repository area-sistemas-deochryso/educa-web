# Planes cerrados al 100%

> Archivo de historial. Los planes aquí están completos y no requieren acción. Se mantienen para consulta de decisiones, patrones reutilizables y contexto.
>
> Índice vivo en [`plan/maestro.md`](../plan/maestro.md) — tabla de inventario.

---

## Plan 6 — Asignación Profesor-Salón-Curso (tutor pleno vs por curso)

**Repo**: BE + FE · **Cerrado**: 2026-04-16 · **Plan base**: `Educa.API/.claude/plan/asignacion-profesor-salon-curso.md`

**Resumen**: introdujo la distinción entre modo tutor pleno (GRA_Orden ≤ 7) y modo por curso (GRA_Orden ≥ 8) con validators INV-AS01/AS02 enforced en `HorarioService`. 0 violaciones en producción.

### Checklist ejecutado

- **F1 — BD** ✅ (2026-04-16)
  - F1.0 SELECT primero: inspeccionada estructura real de 6 tablas en prueba y producción
  - F1.1 CREATE TABLE ProfesorCurso + 3 índices (único filtrado + 2 de consulta) — ejecutado en ambas BDs
  - F1.2 Migración desde Horario: prueba 3 filas, producción 0 filas (sin horarios activos GRA_Orden ≥ 8)
  - F1.3 Modelo EF (`ProfesorCurso.cs`) + `ProfesorCursoConfiguration.cs` + DbSet + nav properties en Profesor/Curso. Build OK.
  - F1.4 Plan base y maestro actualizados

- **F2 — Domain validators** ✅ (2026-04-16)
  - F2.1 `ModoAsignacionResolver` — función pura con umbral 7, sección V flexible
  - F2.2 `TutorPlenoValidator` (INV-AS01) — Validar + Ensure con BusinessRuleException
  - F2.3 `ProfesorCursoValidator` (INV-AS02) — Validar + Ensure con BusinessRuleException
  - F2.4 Tests unitarios — 42 tests pasando (3 archivos)
  - F2.5 Plan base + maestro actualizados

- **F3 — Backend Services** ✅ (2026-04-16)
  - F3.1 `ProfesorCursoService` + `ProfesorCursoRepository` + DTOs (CRUD estándar)
  - F3.2 `ProfesorCursoController` — 4 endpoints (GET profesor, GET curso, POST asignar, DELETE)
  - F3.3 Integrar validators en `HorarioAsignacionService.AsignarProfesorAsync` + `HorarioService.UpdateAsync`
  - F3.4 Regla desactivación tutor mid-año en `ProfesorStrategy.CambiarEstadoAsync`
  - F3.5 Regla eliminar salón tutor pleno con horarios activos en `SalonesService.EliminarAsync`
  - F3.6 DI registration + build OK + 741 tests OK
  - F3.7 Plan base + maestro actualizados

- **F4 — Frontend: horarios + salones + usuarios** ✅ (2026-04-16)
  - F4.1 Tipos: `ModoAsignacion` + `resolveModoAsignacion()` en `@data/models/classroom.models.ts`, `ProfesorCursoListaDto` en `profesor-curso.models.ts`
  - F4.2 `modoAsignacion` computed en `SchedulesOptionsStore` + `profesoresParaAsignacion` filtrado por modo + `ProfesorCursoApiService`
  - F4.3 Detail drawer: badge de modo + info contextual (tag Tutor/PorCurso/Flexible con tooltip)
  - F4.4 Badge de modo en tabla de salones admin + `SalonDetailDialog` header
  - F4.5 Sección "Cursos que dicta" en edición de profesor (`/admin/usuarios`)
  - F4.6 Plan base + maestro actualizados

- **F5 — Backfill y auditoría** ✅ (2026-04-16)
  - F5.1 Query SQL de violaciones existentes INV-AS01/AS02 — ejecutadas en ambas BDs
  - F5.2 Resultado: **0 violaciones** en test y producción. No hay grandfathering que gestionar.
  - F5.3 Actualizar plan base + maestro

- **F6 — Tests E2E + cierre** ✅ (2026-04-16)
  - F6.1 Tests facade FE: 4 tests (INV-AS01 reject, INV-AS02 reject, tutor pleno OK, por curso OK). Suite: 1321 tests, 0 fallos.
  - F6.2 Formalizar INV-AS01/02/03/04/05 en `business-rules.md § 15.12` + actualizar § 5.4 (umbrales corregidos, estado implementado)
  - F6.3 Mapear 4 error codes nuevos en `UI_ERROR_CODES`
  - F6.4 Actualizar plan base + maestro

---

## Plan 11 — Refactor `eslint.config.js` (fix G10)

**Repo**: FE · **Cerrado**: 2026-04-17 · **Plan base**: `plan/eslint-config-refactor.md`

**Resumen**: consolidó bloques `no-restricted-imports` duplicados en un plugin local `layer-enforcement` con reglas `imports-error` / `imports-warn` que iteran tabla declarativa `LAYER_RULES`. Cubre imports y re-exports. Tests de guardia aseguran que cambios futuros no saquen reglas de su scope.

- F1-F4 cerrados
- F5.1-F5.2 cerrados, F5.4 cerrado
- F5.3 Tests de guardia (2026-04-17) — `src/eslint-config-guards.spec.ts` con 13 tests que verifican via `ESLint.calculateConfigForFile()` que las reglas clave (layer-enforcement, barrel enforcement, globales) siguen aplicadas por capa. Falla el CI si un cambio futuro del config saca una regla de su scope.

---

## Plan 21 — Asistencia de Profesores en CrossChex

**Repo**: BE + FE · **Cerrado**: 2026-04-21 · **Plan base**: `plan/asistencia-profesores.md`

**Resumen**: CrossChex enviaba marcaciones de profesores que se descartaban silenciosamente porque la tabla `Asistencia` solo tenía FK a `Estudiante`. Se migró a modelo polimórfico con nueva tabla `AsistenciaPersona` (discriminador `ASP_TipoPersona ∈ {'E','P'}`) y FK polimórfica validada en service.

### Qué se decidió en investigación

- **Modelo**: Opción C — nueva tabla `AsistenciaPersona` con discriminador `ASP_TipoPersona ∈ {'E','P'}` y FK polimórfica.
- **Webhook**: dispatch por DNI en orden Profesor → Estudiante → rechazar.
- **Reutilización**: mismas ventanas horarias, invariantes horarios (INV-C01/02/03), cierre mensual (INV-AD03), origen manual (INV-AD02).
- **Invariantes nuevos/modificados**: INV-AD05 ampliado (profesor solo correo a sistemas), **INV-AD06 nuevo** (justificación de profesor requiere rol administrativo; profesor no puede autojustificarse ni justificar a colega), regla nueva de jurisdicción a `permissions.md`.
- **UI**: submenú Estudiantes/Profesores en `AttendanceDirectorComponent` para los 4 roles administrativos (Director + Asistente Admin + Promotor + Coordinador Académico); panel propio read-only en `AttendanceProfesorComponent`.

### Entregables principales (Chat 5 — cierre)

- SQL FKs ejecutado en prueba + producción
- Deploy BE+FE en Azure/Netlify
- Sync histórico de profesores vía "Sobreescribir desde CrossChex"
- `sp_rename 'Asistencia' → 'Asistencia_deprecated_2026_04'`
- Reglas actualizadas (2026-04-21): `business-rules.md` § 1.0 "Modelo polimórfico" + INV-AD06 nuevo en § 15.9; `permissions.md` sección "Jurisdicción sobre asistencia"; `domain.md` flujo 1 refleja polimorfismo E/P

### Deuda técnica lateral (no bloquea cierre)

- `PermisoSaludAuthorizationHelper.cs:63` anti-pattern `DIR_DNI == dni`
- `ErrorLog` en BD prueba le faltan 3 columnas (`ERL_RequestBody`, `ERL_RequestHeaders`, `ERL_ResponseBody`)
- DROP definitivo de `Asistencia_deprecated_2026_04` a los 60 días (~2026-06-20)

---

## Plan 23 — Extensión `/intranet/admin/asistencias` a Profesores

**Repo**: BE + FE · **Cerrado**: 2026-04-21 · **Plan base**: `plan/asistencia-admin-profesores.md`

**Resumen**: extendió la UI admin `/intranet/admin/asistencias` para auditar y corregir marcaciones de profesores (no solo estudiantes), parametrizando endpoints existentes con `tipoPersona ∈ {E, P, todos}` en lugar de duplicar vistas.

### Qué se decidió en diseño

- **Parametrizar, no duplicar**: query param `tipoPersona ∈ {E, P, todos}` en endpoints existentes. Default admin = `todos`.
- **UI**: toggle 3-opciones en tab Gestión con default `E` por retrocompatibilidad visual; columna "Grado" → "Contexto" polimórfico (`"1ro Secundaria A"` para E, `"Matemáticas — Secundaria"` para P).
- **Formulario "Nueva asistencia"**: pestaña Estudiante/Profesor con selector subyacente diferente.
- **Reportes**: eje `tipoPersona` adicional, header PDF dinámico, selector "Salones" oculto cuando tipo = Profesores/Todos.
- **Cross-link UI**: botón "Editar en admin" desde `AttendanceDirectorComponent` lleva a `/intranet/admin/asistencias?tab=gestion&tipoPersona=P&dni=...&fecha=...`.
- **Invariantes**: INV-AD05 ampliado (correo de corrección a profesor + Director, no apoderado); INV-AD06 reforzado con test de boundary.
- **Sin migración SQL nueva**: Plan 21 ya entregó `AsistenciaPersona`.

### Entregables (Chat 5 — cierre)

- Cross-link UI "Editar en admin" en `AttendanceDirectorComponent` tab profesores (gated por flag)
- Query params ampliados en `attendances.component.ts`: lee `tab` + `tipoPersona` + `dni` + `fecha`
- Helpers `isValidDateIso` + `parseIsoDate` extraídos a `services/attendances-query-params.ts`
- Nuevo helper `@core/helpers/date.utils.ts` con `formatDateLocalIso(fecha)` (YYYY-MM-DD local, sin desfase UTC)
- Métodos PDF en profesores consolidados (6 → 4) con `runPdf$(req$, handle)` genérico
- **Chat 4 (enforcement INV-AD06 + correo profesor)**: `AsistenciaAdminController` con `[Authorize(Roles = Roles.Administrativos)]` (4 roles), `AsistenciaAdminControllerAuthorizationTests` (6 tests reflection), `IEmailNotificationService.EnviarNotificacionAsistenciaCorreccionProfesor` (destinatario = `PRO_Correo`, BCC = colegio), helper `notificarExito` en `AttendancesCrudFacade`
- **Hardening INV-C01/C09/C10 (commit `332ef11`)**: umbrales absolutos de tardanza/falta por `TipoPersona` en periodo regular (E: 7:46/9:30 · P: 7:31/9:30); guards INV-C09 (salida estudiante <13:55) e INV-C10 (entrada <05:00)

Lint + tsc + **1380 tests verdes** FE (sin regresión). Suite BE: 800 verdes. Deploy BE+FE producción 2026-04-21.

---

## Plan 25 — Paridad Excel para reportes PDF

**Repo**: BE + FE · **Cerrado**: 2026-04-21 · **Plan base**: inline en maestro

**Resumen**: introdujo regla "todo endpoint o acción UI que exporta PDF debe ofrecer Excel equivalente". 14 endpoints `/excel` mirror de los `/pdf` + 5 páginas FE con menú dual 3-items. §17 en `business-rules.md` con INV-RE01/02/03.

### Regla nueva

> **"Todo endpoint o acción de UI que exporta un reporte en PDF debe ofrecer también la versión Excel equivalente."**

Excepción única: layout puramente tipográfico sin datos tabulares (ej: certificados, diplomas). Ningún reporte actual entra en esta excepción.

### Inventario

| Controller BE | Endpoints `/pdf` | Endpoints `/excel` |
|---------------|-----------------|-------------------|
| `ReportesAsistenciaController` | 1 | 1 |
| `BoletaNotasController` | 2 | 2 |
| `ConsultaAsistenciaController` | 11 | 11 |
| **Total** | **14** | **14** |

### Chats ejecutados

- **Chat 1 — BE: ClosedXML + `ReporteFiltradoAsistencia` Excel parity** ✅ (2026-04-21). Decisión práctica: NO abstraer `IReportBuilder` genérico (diferido a Plan 2/C.2) — entrega aditiva pura al lado del PDF. `ClosedXML 0.104.*`, `IAsistenciaExcelService` + `AsistenciaExcelService` (base + partials `Estudiantes`/`Profesores`, <300 ln), endpoint `GET /api/reportes-asistencia/excel` con `[EnableRateLimiting("heavy")]` mirror del `/pdf`, 12 tests nuevos (877 total).

- **Chat 2 — BE: migrar 4 reportes PDF restantes a Excel** ✅ (2026-04-21). 4 services nuevos + interfaces + 13 endpoints `/excel` mirror de los `/pdf` (11 en `ConsultaAsistenciaController` + 2 en `BoletaNotasController`). **ExcelHelpers.cs estático extraído** — consolidación de helpers duplicados de Chat 1. 27 tests nuevos (904 total). NO se adelantó `IReportBuilder` (Plan 2/C.2). Deuda: `ConsultaAsistenciaController.cs` quedó en 839 ln.

- **Chat 3 — FE: UI dual PDF/Excel** ✅ (2026-04-21). Inventario real en FE = 5 puntos: `estadisticas-dia`, `attendance-director-estudiantes`, `attendance-director-profesores`, `attendance-profesor-estudiantes`, `attendance-reports`. Se extendió el patrón existente `<p-menu>` agregando "Descargar Excel" a cada `pdfMenuItems`. Helper común `buildPdfExcelMenuItems()` en `consolidated-pdf.helper.ts` consolida los 3 items. `attendance-reports.facade.ts`: **reemplazado ExcelJS client-side por endpoint BE** `/api/ReportesAsistencia/excel`. 0 regresiones (1410 tests verdes).

- **Chat 4 — Documentación + tests de paridad end-to-end** ✅ (2026-04-21). `§17 Reportes exportables — paridad de formatos` en `business-rules.md` con INV-RE01/02/03. Tests BE: `ReportesAsistenciaExcelEndpointTests` + `BoletaNotasExcelEndpointTests` + `ConsultaAsistenciaExcelEndpointTests` — 26 tests contract verifican content-type, extensión `.xlsx` y paridad estructural. Tests FE: `consolidated-pdf.helper.spec.ts` (17 tests) + `attendance-reports.facade.spec.ts` (+2). Suite BE: 930 verdes (+26). Suite FE: 1429 verdes (+19).

- **Chat 5A — BE: paridad visual Excel ↔ PDF (colores + leyenda + nombres de mes)** ✅ (2026-04-21). Reapertura por feedback visual. Catálogo compartido `Constants/Asistencias/EstadoAsistenciaColores.cs` — fuente única de verdad para los 6 códigos (T/A/F/J/-/X) con `Foreground` + `Background` + `Label` + `Orden` + helper `ToArgbNoHash`. `ExcelHelpers` extendido: `EscribirLeyendaEstados`, `AplicarColorEstado`, `FormatearMesAnio` (`"ABRIL 2026"`), `FormatearRangoSemana`. Suite BE: **986 verdes** (+56 sobre 930).

- **Chat 5B — BE + FE: división Verano/Regular del reporte anual + espejo PDF de subtítulos** ✅ (2026-04-21). **Opción B** (query param `periodo=ambos|verano|regular`, default `ambos`) + promoción de `FechaFormatoHelper` a shared. 3 commits BE + 1 FE: refactor (`d3188ed`), feat división anual (`7618021`), feat subtítulos PDF (`98fa14f`), FE routing per periodo (`dd137f8`). **Cleanup dead code**: `ReporteAsistenciaConsolidadoPdfService` 395→295 ln. 20 BE nuevos + 5 FE nuevos. Suite BE: **1006 verdes** (+20 sobre 986). 22 vitest verdes FE.

### Decisiones clave

- **Plan 2/C.2 (PDF Builder genérico)**: diferida. Chat 1 decidió NO adelantar la abstracción — entrega aditiva sin tocar services PDF existentes.
- **Backend Excel desde cero**: el `ExcelService` del monorepo era solo frontend. Chat 1 agregó `ClosedXML` como librería base.
- **No toca reglas de negocio**: los datos exportados son los mismos, cambia solo el formato. Invariantes de dominio (INV-*) no se tocan.

---

## Quick wins cerrados (QW1-QW4)

- **QW1 — Migrar `health-permissions` a WAL** ✅ (2026-04-15)
- **QW2 — Limpiar ruido de lint en build artifacts** ✅ (2026-04-15)
- **QW3 — CI verde** ✅ (2026-04-16) — 6 spec files fixed (40 fallos → 0). 108 files, 1317 tests.
  - QW3.1 `horarios.store.spec.ts` (26 fallos) — métodos renombrados en store
  - QW3.2 `error.interceptor.spec.ts` (13 fallos) — mocks desactualizados
  - QW3.3-QW3.6 Facades + login (6 fallos) — WAL pattern + role count
  - QW3.7 Verificar `npm test` con 0 fallos — 108 files, 1317 tests passed
- **QW4 — Lint limpio para producción** ✅ (2026-04-16) — 0 errors, 0 warnings
  - QW4.1 Lint errors: 2 archivos >300 líneas (`error-reporter.service.ts`, `profesor-salones.component.ts`)
  - QW4.2 `no-unused-vars`: 33 issues en 27 archivos
  - QW4.3 `no-compact-trivial-setter`: 45 issues en 8 archivos
  - QW4.4 `no-explicit-any`: 99 issues en 14 specs
  - QW4.5 Otros warnings: 6 issues (lifecycle + layer-enforcement)
  - QW4.6 Verificación final y PUSH — deploy completado (Netlify + Azure) 2026-04-16

---

## Carril A — Features ✅ CERRADO (2026-04-16)

Plan 6 (Asignación Profesor-Salón-Curso) completado: BD + Domain + Backend + Frontend + Auditoría + Tests. Validators INV-AS01/AS02 enforced en HorarioService. 0 violaciones en producción. 1321 tests verdes.

---

## Ola 1 Carril D — Terminar Plan 12 F1 ✅ CERRADA (2026-04-18)

1. **Plan 12 F1.B.2** — `AprobacionEstudianteControllerTests` ✅ (2026-04-18) — 4 tests: guard manual `GetEntityId`, default año Perú, mapeo tupla (exito, mensaje) → Ok/BadRequest. Suite 756/756.
2. **Plan 12 F1.B.3** — `ConsultaAsistenciaControllerTests` ✅ (2026-04-18) — 8 tests: ownership apoderado→hijo (`Forbid()`), guard `sedeId=0 → UnauthorizedException`, fallback `GetEmail() ?? UsuarioActual`, mensaje según `Quitar`, mapeo bool→BusinessRuleException, validaciones inline de rangos de fecha en PDF período. `WithEmail` agregado a `ClaimsPrincipalBuilder`. Suite 764/764.
3. **Plan 12 F1.C** ✅ (2026-04-18) — Regla "no testear delegación pura" documentada en `Educa.API.Tests/Controllers/README.md` con definición operativa (4 criterios), ejemplos positivos (F1.B) y negativos (controllers pass-through enteros).

*Gate Ola 1*: ✅ Plan 12 F1 al 100% · infraestructura de controller tests documentada y replicable · 23 tests en 4 archivos de controller (Auth 6 + Asistencia 5 + Aprobación 4 + ConsultaAsistencia 8).

---

## Plan 20 — Design System (estándar desde `usuarios`)

**Repo**: FE · **Cerrado**: 2026-05-07

**Resumen**: Estándar canónico extraído de `/intranet/admin/usuarios` y aplicado al resto de la intranet. F1 globales (inputs/selects/buttons reset + `.label-uppercase`), F2 convención `p-tag` opción C (`tag-neutral` informativo / `severity` crítico, ~50 archivos migrados), F3 pautas B1-B11 documentadas en `rules/design-system.md`, F4 tokens de color (~30 archivos: `#e24c4c→--red-500`, `#dc2626→--red-600`, `#1e40af→--blue-800` + `p-button-success` blanco global), F5.3 migración página por página de las 8 admin priorizadas. Sin regresiones funcionales — refactor presentacional puro.

---

## Plan 22 — Endurecimiento de correos de asistencia

**Repo**: BE+FE · **Cerrado**: 2026-04-23 · **Plan base**: `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`

**Resumen**: Subió el techo efectivo SMTP de 50/h (1 buzón) a 200/h (7 buzones round-robin con sliding window 60min) + telemetría defer/fail + auditoría preventiva. Chats: F1+F2+F3.BE (validación + clasificación + re-enqueue jitter) · Chat A (F5+F6 multi-sender, `EO_IntentosPorCuota`, `FAILED_QUOTA_EXCEEDED`) · Chat B throttle-widget + defer-fail-widget (consume `/throttle-status` y `/defer-fail-status`, polling 30/60s, semáforo OK/WARNING/CRITICAL) · Chat 5 F4.BE (endpoint `/auditoria-correos-asistencia` admin-only con `EmailValidator` + DNI/correo enmascarados) · Chat 6 F4.FE (pantalla `/intranet/admin/auditoria-correos` read-only con feature flag). INV-AD05 sin BCC. Tests: 1535 FE + 1295 BE verdes.

---

## Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria +)

**Repo**: BE+FE · **Cerrado**: 2026-04-22 (pendiente solo validación del jefe post-deploy)

**Resumen**: Marcaciones CrossChex de estudiantes con `GRA_Orden < 8` se descartan silenciosamente (webhook + admin queries + reportes PDF/Excel + correos masivos). Profesores intactos. Constante `UmbralGradoAsistenciaDiaria=8` en BE + mirror `UMBRAL_GRADO_ASISTENCIA_DIARIA=8` en FE — revertir = bajar ambos y redeployar (data loss = 0). Chats: 1 `/design` + 2 BE webhook/admin/correos + 3 BE reportes + 4 BE+FE self-service/banner/widget + 5 docs `INV-C11` (§1.11 + §15.4 business-rules) + 5b fix gap consultas profesor/director + 5c fix gap bulk email admin (subquery `GraOrden` en `AsistenciaEmailDataRow`). Tests: 1167 BE + 1509 FE verdes.

---

## Plan 32 — Centralización de errores vía Correlation ID

**Repo**: BE+FE · **Cerrado**: 2026-04-25

**Resumen**: Hub admin `/intranet/admin/correlation/:id` que agrega 4 fuentes (`ErrorLog` + `RateLimitEvent` + `REU_ReporteUsuario` + `EmailOutbox`) en una vista por correlationId. Endpoint `GET /api/sistema/correlation/{id}` con 4 queries `AsNoTracking()` secuenciales + try/catch independiente por fuente (INV-S07) + caps defensivos (100 filas, 200 chars). Pill reusable `<app-correlation-id-pill>` (standalone, OnPush, click→Router) wireada en los 4 dashboards admin (error-logs, rate-limit-events, feedback-reports, email-outbox). Permiso reusado vía `data.permissionPath` override en `permisos.guard.ts`. Tests: 1397 BE + 1600 FE verdes.

---

## Plan 34 — Saneamiento de errores con `ErrorGroup`

**Repo**: BE+FE · **Cerrado**: 2026-04-27

**Resumen**: Modelo `ErrorGroup` con huella SHA-256 (`ErrorFingerprintCalculator` con normalización GUID/ISO date/long-id + URL collapse) agrupa ocurrencias `ErrorLog` por bug. Máquina de estados `NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO` (INV-ET07 con `StateTransitionValidator`). UPSERT atómico en cada insert auto-reabre `RESUELTO→NUEVO` con `ContadorPostResolucion++`; `IGNORADO` no se reabre. Purga selectiva por estado (7d/30d/180d desde `UltimaFecha`). Frontend con vista Kanban (drag-drop CDK con predicate espejo INV-ET07, `cdkDropListConnectedTo`, top 20 por columna + "Cargar más" client-side) + tabla coexistente, toggle persistido vía `PreferencesStorageService`, optimistic update + rollback exacto en 409. Invariantes nuevos: `INV-ET03/04/05/06/07`. Tests: 1466 BE + 1648 FE verdes.

---

## Plan 35 — Rediseño UX/UI submódulo Monitoreo (hub + shells)

**Repo**: FE · **Cerrado**: 2026-04-27

**Resumen**: 7 entradas planas del dropdown "Sistema → Monitoreo" colapsadas en 1 entrada → hub `/intranet/admin/monitoreo` con 3 cards (Correos / Incidencias / Seguridad) filtradas por permiso individual + feature flag. Shells minimalistas con `<p-tabs>` controlado por signal derivado de `route.firstChild`, navegación vía `router.navigate` relativa. 7 redirects legacy con `pathMatch: 'full'` conservan bookmarks. Lógica interna de las 6 páginas existentes intacta (refactor estructural puro). Tests: 1683/1683 verdes.

---

## Plan 36 — Rediseño UX/UI páginas internas de Monitoreo

**Repo**: FE+BE · **Cerrado**: 2026-04-28

**Resumen**: Continuación del Plan 35. 9 chats migraron las 7 sub-páginas al patrón B3 del design-system y agregaron features visuales: Chat 2 bandeja (overrides p-tabs transparente global, stats con tokens, Excel a `p-button-success`, layout grid stats+chart side-by-side), Chat 3 dashboard tab Detalle con 4 KPI cards, Chat 4b BE endpoint `/diagnostico/buscar-personas` (lookup polimórfico Estudiante/Profesor/Director/Apoderado por nombre/apellido/DNI hash, INV-S07 fail-safe) + Chat 4 FE typeahead `p-autoComplete` con debounce 300ms + autosubmit, Chat 6 toggle Kanban default 5 columnas, Chat 7 stat cards reportes-usuarios B3, Chat 8 columna "Intentos/Umbral" en rate-limit con highlight rojo y tooltip. Restricción dura: ningún chat tocó funcionalidad — solo HTML/SCSS y refactor presentacional. Tests: 1482 BE + 1694 FE verdes.

---

## Plan 33 — Auditoría de paginación de tablas

**Repo**: BE + FE · **Cerrado**: 2026-05-09 · **Plan base**: `plan/pagination-audit.md`

**Resumen**: cierre tipo retro-validación. El plan se abrió 2026-04-25 tras el fix puntual de `error-logs admin` (paginador mostraba "Página 1 de 2" hasta avanzar manualmente, total real 30 páginas). Inventario inicial separó las features ya correctas (4 con wrapper paginado + 1 con `/count`) y dejó **8 features 🔍** a auditar. Chat 135 (2026-05-09) clasificó las 8 con el test rápido de la regla `pagination.md` y confirmó que **ninguna paga BE con paginación real** — todas son client-side (PrimeNG pagina el array completo) o componentes presentacionales que delegan al consumidor. Cero fixes requeridos.

### Inventario final de las 8 features

| # | Feature | Clasificación |
| --- | --- | --- |
| 1 | `attendances admin` | ✅ Client-side (BE devuelve día completo) |
| 2 | `attendance-reports cross-role` | ✅ Client-side (reporte sin paginación) |
| 3 | `email-outbox-diagnostico` (correos-día) | ✅ Client-side (`length > 5`) |
| 4 | `email-outbox-diagnostico` (correo-individual) | ✅ Client-side (`length > 10`) |
| 5 | `email-outbox-dashboard-dia` | ✅ Client-side (Top 50 hardcoded, sin paginador) |
| 6 | `attendance-day-list` | ✅ No aplica (presentacional) |
| 7 | `responsive-table` | ✅ Client-side (wrapper genérico, slice local) |
| 8 | `student-attendance-tab` | ✅ No aplica (presentacional) |

### Riesgo latente

Si alguno de estos datasets crece (>500 filas en producción), habrá que migrar a server-side desde un plan dedicado. Hoy todos están dentro de límites operativos. La regla `pagination.md` documenta el patrón a seguir cuando eso pase.
