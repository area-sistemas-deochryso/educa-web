# 126 · Plan 28 Chat 3a BE — Reportes PDF/Excel para Asistentes Administrativos

> **Creado**: 2026-05-07 · **Estado**: ⏳ pendiente arrancar · **Repo**: `Educa.API` (master)
> **Split**: parte 1 de 3 del Chat 3 (3a reportes / 3b correos+dispatcher / 3c bandeja+notif).

## Modo sugerido

`/execute → /validate`. Diseño cerrado en Chat 1 (8 decisiones documentadas en maestro fila 28).

## Contexto

Chat 2 BE cerró 2026-04-22 (`203bff0`): modelo polimórfico `'A'` + dispatch + queries admin extendidas + migración SQL. El alcance original de Chat 3 (reportes + correos + bandeja + notif) excede el tamaño cómodo de un solo chat (~25-35 archivos, 600-900 LOC). Decisión 2026-05-07: splitear en 3a/3b/3c para PRs revisables.

**Estado del master**: planes 34/37/38/40/41 mergeados después de Chat 2. Ver "Riesgo conocido" abajo.

## Alcance estricto de 3a

**SOLO reportes PDF/Excel filtrados extendidos a `TipoPersona='A'`**. NO incluir correos, NO bandeja, NO notificaciones masivas.

1. **Query layer AA**:
   - `IConsultaAsistenciaService.ObtenerAsistentesAdminPorFechaRango(sedeId, fInicio, fFin, estadoCodigo?)` análogo al método de Profesor.
   - `IReporteFiltradoAsistentesAdminService` wrapper análogo a `ReporteFiltradoProfesoresService` (thin delegate).
   - Repo: extender `ReporteAsistenciaRepository` (o equivalente) con query `'A'` análoga al de profesores. Filtros INV-C09/C11 NO aplican a `'A'` (ya validado en Chat 2). Ventana INV-C10 sí.

2. **Service de reporte filtrado**:
   - Nuevo partial `ReporteFiltradoAsistenciaService.AsistentesAdmin.cs` con `PoblarAsistentesAdminAsync` análogo a `PoblarProfesoresAsync`.
   - DTO nuevo `PersonaAsistenteAdminReporteDto` (o reusar `PersonaProfesorReporteDto` si la forma es idéntica — decidir leyendo el DTO de profesor).
   - Extender `ReporteFiltradoAsistenciaDto` con `AsistentesAdmin: List<...>`, `TotalAsistentesAdminGeneral`, `TotalAsistentesAdminFiltrados`.
   - Orquestador: `incluyeAsistentesAdmin = tipoPersona == "A" || tipoPersona == "todos"`.
   - `EstadoAsistenciaCalculator` con `TipoPersona.AsistenteAdmin` (verificar que ya soporta el branch — Chat 2 reportó que `'A'` reusa rama Profesor en `TardanzaRegular`; confirmar en `IAsistenciaEstadoCalculador.CalcularEstadoCodigo`).

3. **Controller**:
   - `ReportesAsistenciaController.TiposPersonaValidos` agregar `"A"`.
   - `ParsearSalones`: rama `tipoPersona == "A"` → `salones` se ignora (igual que `'P'`).
   - `ValidarParametros`: salones obligatorios solo cuando se incluyen estudiantes (`tipo != "P" && tipo != "A"`).
   - Nombre de archivo PDF/Excel: `Reporte_{filtro}_{tipo}_{fecha:yyyyMMdd}.{ext}` ya soporta `'A'` automáticamente.

4. **PDF generator**:
   - Nuevo partial `ReporteFiltradoPdfService.AsistentesAdmin.cs` análogo a `.Profesores.cs`. Sección titulada "Asistentes Administrativos" con misma estructura tabular.
   - `ReporteFiltradoPdfService.GenerarPdf` orquesta: si dto tiene `AsistentesAdmin.Any()`, renderiza la sección.

5. **Excel generator**:
   - Nuevo partial `AsistenciaExcelService.AsistentesAdmin.cs` análogo a `.Profesores.cs`. Misma forma de hoja/columnas.
   - `AsistenciaExcelService.GenerarReporteFiltradoAsistencia` orquesta sección AA.
   - Mantener INV-RE02 (content-type + extensión únicos vía `ExcelHelpers.ContentTypeXlsx`).

6. **DI wiring**: registrar `IReporteFiltradoAsistentesAdminService → ReporteFiltradoAsistentesAdminService` en `ServiceExtensions.cs`.

## Lo que NO entra en 3a

- ❌ Correos diferenciados (`EnviarNotificacionAsistenciaCorreccionAsistenteAdmin`) → **Chat 3b**.
- ❌ `IAsistenciaAdminEmailNotifier.NotificarCorreccionAsistenteAdminAsync` y rama `'A'` en `AsistenciaAdminCrudHelpers.NotificarCorreccionAsync` → **Chat 3b**.
- ❌ `PersonaAsistenciaContext.AsistenteAdmin` + 3ra rama de `ResolverPersonaAsync` → **Chat 3b** (lo necesita el dispatcher de email; sin él, los reportes funcionan).
- ❌ Bandeja admin (filtros `TipoEntidadOrigen='AsistenciaAsistenteAdmin'` en email-outbox) → **Chat 3c**.
- ❌ Inclusión AA en notificaciones masivas → **Chat 3c**.

## Decisiones de Chat 1 a respetar

- Alcance acotado a rol "Asistente Administrativo" (decisión 1+8) — Director/Promotor/Coord NO.
- Horarios = profesor (07:31 tardanza / 09:30 falta regular) — decisión 6.

## Pre-work obligatorio

1. `git -C ../Educa.API log --oneline -10` — confirmar estado tras Chat 2.
2. `git -C ../Educa.API log --oneline 203bff0..HEAD -- Educa.API/Services/Reportes Educa.API/Services/Asistencias Educa.API/Services/Excel` — ver si planes posteriores tocaron reportes.
3. Revisar `ReporteFiltradoAsistenciaService.Profesores.cs`, `ReporteFiltradoPdfService.Profesores.cs`, `AsistenciaExcelService.Profesores.cs` línea por línea como template.
4. Confirmar `IAsistenciaEstadoCalculador.CalcularEstadoCodigo` ya acepta `TipoPersona.AsistenteAdmin` (sino, agregar branch trivial reusando rama Profesor).

## Riesgo conocido — suite con 8 rojos preexistentes

`Plan40F2BulkheadIntegrationTests` (8 fallos) por `IBackpressureRetryAfterCalculator` no registrado en DI. **NO es scope de 3a** — es deuda del Plan 40 F2/F4 que precede. Baseline de 3a:

- Suite total: 1679 tests.
- Pre-3a: 1671 ✅ + 8 ❌ (los 8 son los Bulkhead).
- Esperado post-3a: ≈1685 ✅ + 8 ❌ (~14 tests nuevos: query AA, controller validator, paridad PDF/Excel `'A'`, contract endpoints).
- **Aceptado**: cierre de 3a no exige tocar los 8 Bulkhead. Se reportan como ruido conocido.

## Validación esperada

- Build BE limpio.
- Suite verde EXCEPTO los 8 Bulkhead preexistentes.
- Tests nuevos contract `ReportesAsistenciaExcelEndpointTests` para `tipoPersona='A'` (paridad PDF/Excel — INV-RE01/02/03).
- Smoke local: `GET /api/ReportesAsistencia/datos?tipoPersona=A&filtro=todos&rango=dia&fecha=...` devuelve `AsistentesAdmin` poblado con AA reales (4 conocidos: Vivian conflicto Profesor, Ricardo, Ray, Diana).

## Salida esperada

- Chat 3b BE arranca sobre suite estable con `'A'` ya en reportes.
- Chat 4 FE puede empezar a consumir el endpoint `?tipoPersona=A` para preview, aunque la edit-dialog real depende de 3b (correos).

## Referencias

- Plan 28 fila en `plan/maestro.md` — 8 decisiones.
- Chat 2 cerrado: `chats/closed/023-plan-28-chat-2-be-modelo-dispatch-queries.md`.
- Patrón Plan 23 Chat 3.A para `'P'`: `ReporteFiltradoAsistenciaService.Profesores.cs`.
- Regla `business-rules.md §17` paridad Excel.
- Convenciones BE: `~/.claude/CLAUDE.md` cap 300 líneas/archivo + partial classes.
