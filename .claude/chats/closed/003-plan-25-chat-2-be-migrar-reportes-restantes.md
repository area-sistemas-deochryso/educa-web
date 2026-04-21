> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 25 · **Chat**: 2 · **Fase**: F2 (migrar 4 servicios PDF restantes a Excel) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 25 Chat 2 — BE: migrar los reportes PDF restantes a Excel

## PLAN FILE

- Frontend (maestro, fuente de verdad del orden): [`../../educa-web/.claude/plan/maestro.md`](../../educa-web/.claude/plan/maestro.md) → **Plan 25 — Paridad Excel para reportes PDF** → Chat 2.
- Plan file dedicado NO existe aún (inline en maestro). Si al cierre conviene extraerlo, hacerlo en `Educa.API/.claude/plan/reportes-excel-paridad.md` y dejar el inline como stub que apunte ahí.
- Chat 1 cerrado 2026-04-21 (commit BE `3a29b67`, commit maestro FE `8ea9e08`): `ReporteFiltradoAsistencia` en Excel paralelo al `/pdf`.

## OBJETIVO

Cerrar la paridad Excel para los **4 servicios PDF** restantes del backend, siguiendo el patrón aditivo de Chat 1 (nuevo service Excel al lado del PDF, sin tocar los services PDF existentes):

| # | PDF service actual | Controller / endpoint `/pdf` |
|---|---|---|
| 1 | `ReporteAsistenciaSalonPdfService` | `ConsultaAsistenciaController` — varios endpoints PDF de salón |
| 2 | `ReporteAsistenciaConsolidadoPdfService` | `ConsultaAsistenciaController` — endpoints PDF consolidado |
| 3 | `ReporteAsistenciaProfesorPdfService` (+ `.Tables.cs` partial) | `ConsultaAsistenciaController` — endpoints PDF profesor (Plan 21 Chat 2) |
| 4 | `BoletaNotasPdfService` | `BoletaNotasController` — 2 endpoints (`/boleta/{estudiante}` + variante) |

Entregar para cada uno: un nuevo `*ExcelService` (con su interfaz), el endpoint `/excel` mirror con `[EnableRateLimiting("heavy")]`, registro DI, y tests unitarios que verifiquen content-type, hojas generadas, DNI como texto, y paridad de filas con el DTO compartido con el PDF.

**Decisión clave**: seguir con el patrón aditivo (servicios hermanos por dominio) salvo que durante el trabajo la duplicación de mapeo de columnas se vuelva dolorosa — en ese caso, **pausar y proponer** adelantar `IReportBuilder` genérico (Plan 2/C.2). No adelantar la abstracción especulativamente.

## PRE-WORK OBLIGATORIO

Antes de tocar código, confirmar estado real del repo y compartir la salida con el usuario:

```bash
# 1. Confirmar que Chat 1 quedó limpio (ClosedXML ya instalado, AsistenciaExcelService existe)
cd Educa.API && grep -n "ClosedXML\|AsistenciaExcelService" Educa.API/Educa.API.csproj Educa.API/Extensions/ServiceExtensions.cs

# 2. Line count + partials de cada PDF service a migrar (para dimensionar partials del Excel)
wc -l Educa.API/Services/Asistencias/ReporteAsistenciaSalonPdfService*.cs
wc -l Educa.API/Services/Asistencias/ReporteAsistenciaConsolidadoPdfService*.cs
wc -l Educa.API/Services/Asistencias/ReporteAsistenciaProfesorPdfService*.cs
wc -l Educa.API/Services/Academico/Calificaciones/BoletaNotasPdfService*.cs

# 3. Endpoints /pdf existentes y sus DTOs de entrada/salida
grep -n 'return File.*"application/pdf"' Educa.API/Controllers/Asistencias/ConsultaAsistenciaController.cs
grep -n 'return File.*"application/pdf"' Educa.API/Controllers/Academico/BoletaNotasController.cs

# 4. Interfaces de los services PDF (contratos a replicar)
ls Educa.API/Interfaces/Services/Asistencias/IReporteAsistencia*.cs
ls Educa.API/Interfaces/Services/Academico/IBoletaNotasPdfService.cs 2>&1 || \
   grep -rn "IBoletaNotasPdfService" Educa.API/Interfaces/

# 5. DTOs compartidos PDF↔Excel (el fuente de verdad de filas)
ls Educa.API/DTOs/Asistencia/ReporteAsistencia*.cs
ls Educa.API/DTOs/Asistencia/BoletaNotas*.cs 2>&1 || find Educa.API/DTOs -name "*Boleta*"

# 6. Baseline de tests (Chat 1 cerró con 877 verdes)
dotnet test --no-build --verbosity minimal 2>&1 | tail -5
```

Si algo sale distinto a lo asumido, **pausar y discutir** antes de codificar. En particular:

- Si un PDF service no tiene un DTO de salida claro (datos calculados inline), aplicar la regla de backend.md §Service Reglas y extraer primero el DTO antes de generar el Excel encima.
- Si un endpoint `/pdf` no tiene rate limit `"heavy"` hoy, **no** "aprovechar y arreglarlo" aquí — documentarlo como deuda y agregarlo solo al endpoint `/excel` nuevo (paridad mínima).

## ALCANCE

### Archivos a crear (por cada service a migrar)

Estimación orientativa de líneas — si alguno supera 300, **dividir desde el inicio** en partials (patrón de Chat 1: base + partials por dominio).

| Service origen | Interfaz nueva | Implementación | Partials sugeridos | Tests |
|---|---|---|---|---|
| `ReporteAsistenciaSalonPdfService` | `IReporteAsistenciaSalonExcelService` | `ReporteAsistenciaSalonExcelService.cs` (~150 ln) | si el layout tiene secciones claras: `.Tabla.cs` + `.Resumen.cs` | `ReporteAsistenciaSalonExcelServiceTests` |
| `ReporteAsistenciaConsolidadoPdfService` | `IReporteAsistenciaConsolidadoExcelService` | `ReporteAsistenciaConsolidadoExcelService.cs` (~180 ln) | probablemente 1 partial `.Agregados.cs` | idem |
| `ReporteAsistenciaProfesorPdfService` | `IReporteAsistenciaProfesorExcelService` | `ReporteAsistenciaProfesorExcelService.cs` (~150 ln) | espejar partial `.Tables.cs` del PDF como `.Tables.cs` del Excel | idem |
| `BoletaNotasPdfService` | `IBoletaNotasExcelService` | `BoletaNotasExcelService.cs` (~180 ln) | si tiene periodo + cursos + resumen: 2 partials | idem |

Todos los nuevos services bajo `Educa.API/Services/Excel/` (consistente con Chat 1), **no** bajo los subdominios PDF. Excepción: si el dominio amerita propio subdir (`Services/Excel/Academico/` para la boleta), aceptable — nombrar con consistencia.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `Educa.API/Extensions/ServiceExtensions.cs` | 4 líneas nuevas `AddScoped<IXxxExcelService, XxxExcelService>()` agrupadas junto al registro existente de `IAsistenciaExcelService` (Plan 25 Chat 1) |
| `Educa.API/Controllers/Asistencias/ConsultaAsistenciaController.cs` | Agregar endpoints `/excel` mirror para los 3 PDF de asistencia; cada uno con `[EnableRateLimiting("heavy")]` e inyección del service correspondiente. **NO** borrar ni modificar los endpoints `/pdf` existentes |
| `Educa.API/Controllers/Academico/BoletaNotasController.cs` | Agregar endpoints `/excel` mirror de los 2 PDF de boleta |

**NO modificar** ningún `*PdfService.cs` existente. Aditivo puro.

### Contrato común a respetar

```csharp
[HttpGet("ruta-dominio/excel")]
[EnableRateLimiting("heavy")]
public async Task<IActionResult> DescargarExcelXxx([FromQuery] /* mismos params que /pdf */)
{
    // 1) Reusar exactamente la misma validación/autorización que el /pdf
    // 2) Reusar el MISMO data service (IReporteXxxDataService o el que aplique)
    //    — NO reinventar la consulta ni duplicar repos
    var datos = await _dataService.ObtenerXxxAsync(...);
    var bytes = _excelService.GenerarXxx(datos);
    var fileName = $"Reporte_Xxx_{fecha:yyyyMMdd}.xlsx";
    return File(
        bytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName);
}
```

### Layout del Excel (consistencia entre services)

- **Filas 1-3**: metadata (nombre entidad, rango, totales). Negrita en fila 1.
- **Fila 5**: headers de columnas. Fondo `#1E40AF` (Blue-800), texto blanco, bold, center, borde fino.
- **Fila 6+**: data. Filas alternas con `#F3F4F6` para legibilidad.
- **DNI** siempre con `cell.Style.NumberFormat.Format = "@"` antes de setear valor (INV-D01 — respeta ceros a la izquierda).
- **Horas** como `"HH:mm"` o `"-"` si null. Fechas como `"dd/MM/yyyy"`. Toda fecha viene del DTO que ya está en Perú (INV-D04) — **no** re-convertir timezone.
- **Auto-filter** sobre el rango de la tabla (`range.SetAutoFilter()`).
- **Auto-ancho**: `ws.Columns().AdjustToContents()` al final de cada hoja.
- **Hojas**: una por vista lógica (ej: Boleta → hoja "Periodo 1", "Periodo 2", etc. si aplica). Si el PDF tiene una sola vista, una sola hoja.

Reusar helpers de `AsistenciaExcelService` (Chat 1) si se vuelven comunes — si 2 services comparten `EscribirDniComoTexto`, `FormatearHora`, `AplicarEstiloHeader` → extraer a un `ExcelHelpers.cs` estático en `Educa.API/Services/Excel/` y refactorizar Chat 1 para usarlo.

## TESTS MÍNIMOS

Por cada nuevo `*ExcelService`, crear tests xUnit + FluentAssertions + Moq con al menos estos casos (patrón de `AsistenciaExcelServiceTests`/`AsistenciaExcelServiceEdgeTests`):

| Caso | Verificación |
|---|---|
| DTO con N filas → N filas de data | Workbook tiene las N filas esperadas; header fila 5, data arranca fila 6 |
| DTO vacío (0 filas) | Hoja con mensaje "Sin resultados" u equivalente, **sin** excepción |
| DNI `"00012345"` | Celda retorna string `"00012345"` y `Style.NumberFormat.Format == "@"` |
| Horas `07:46` y null | `GetString() == "07:46"` y `GetString() == "-"` respectivamente |
| Bytes válidos xlsx | Firma de zip: `bytes[0..3] == { 0x50, 0x4B, 0x03, 0x04 }` |
| Null guard | `GenerarXxx(null)` lanza `ArgumentNullException` |

Paridad fila-a-fila con PDF: el test de paridad cuenta filas del DTO vs filas del Excel generado (patrón de `AsistenciaExcelServiceTests.ParidadFilasConDto`). **No** testear el PDF directamente desde acá.

Factory helper compartido entre tests si 2+ suites usan los mismos mocks → extraer a `*TestFactory.cs` (patrón Chat 1). Si los DTOs son muy distintos por service, factory por service.

## REGLAS OBLIGATORIAS

- **Cap 300 ln** por archivo `.cs` (backend.md §Service Reglas). Partials cuando sea necesario desde el inicio.
- **Controller delgado**: routing + delegación. Zero lógica nueva (backend.md §Controller Reglas).
- **Interfaz + DI Scoped** por cada service nuevo. Registro junto al `IAsistenciaExcelService` existente.
- **Rate limit `"heavy"`** en cada endpoint `/excel` (5/min por userId). Mismo que `/pdf`.
- **AsNoTracking()** en cualquier query que el chat agregue (INV-D05) — aunque la regla "no reimplementar el data service" debería mantener la query de lectura en el service de datos existente.
- **Content-Type exacto**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Nunca `application/octet-stream` ni `application/vnd.ms-excel`.
- **DNI como texto** (INV-D01): `cell.Style.NumberFormat.Format = "@"` antes de setear. Aplicar a toda celda que contenga DNI en cualquier service.
- **Zona Perú** (INV-D04): el DTO ya trae las fechas en Perú. NO re-convertir. Si descubres que un data service las trae UTC, **pausar y documentar** como deuda del data service — no parchar en el Excel.
- **Paridad con PDF**: si el PDF muestra DNI completo, el Excel igual. Si el PDF enmascara con `DniHelper.Mask`, el Excel igual. **No** introducir divergencia aquí. Si detectas deuda de enmascaramiento, abrir ticket aparte.
- **Structured logging** (backend.md §Logging): `_logger.LogInformation("Reporte Excel <X> generado para {Entidad} rango {Desde}-{Hasta}", ...)`. Placeholders, nunca interpolación.
- **No tocar services PDF** existentes. Si encuentras un bug en el PDF, anótalo en el feedback de cierre, **no** lo arregles aquí.
- **Fire-and-forget NO aplica** — el Excel se devuelve directo al cliente, no se envía por correo.
- **ApiResponse<T> NO aplica** a binarios (consistente con `/pdf`): `return File(bytes, ct, name)` directo.

## APRENDIZAJES TRANSFERIBLES (del Chat 1)

Descubrimientos del 2026-04-21 que el Chat 2 **debe** conocer para no redescubrir:

1. **`ClosedXML 0.104.*` ya instalado** en `Educa.API.csproj`. No volver a agregarlo. Está en `Educa.API/Educa.API.csproj:42-43` debajo de FirebaseAdmin y arriba de QuestPDF.

2. **`AsistenciaExcelService` existe** en `Educa.API/Services/Excel/` (base + `.Estudiantes.cs` + `.Profesores.cs`). Usar como **patrón de referencia**, no modificar. Tiene helpers útiles que probablemente conviene promover a un `ExcelHelpers.cs` estático compartido:
   - `EscribirDniComoTexto(IXLCell, string)`
   - `FormatearHora(DateTime?) → string`
   - `AplicarEstiloHeader(IXLRange)`
   - Constantes `ColorHeaderBg`, `ColorHeaderFg`, `ColorRowAltBg`, `ContentTypeXlsx`, `CulturaPeru`

3. **ClosedXML NO tiene `SemiBold()`**. Usar `cell.Style.Font.Bold = true`. (Error al compilar en Chat 1; ya corregido en base service.)

4. **El endpoint real de `ReporteFiltradoAsistencia` vive en `ReportesAsistenciaController`**, NO en `ConsultaAsistenciaController`. Para Chat 2: revisar con cuidado **dónde está el `/pdf` real de cada service** antes de asumir rutas. No confiar en el plan inline si hay discrepancia.

5. **Patrón de partial classes del PDF services** (base + `.Estudiantes.cs` + `.Profesores.cs` o `.Tables.cs`) se **replicó 1:1** en Excel para mantener consistencia. Para Chat 2: si el PDF tiene N partials, el Excel puede tener M distintos — el split se elige por responsabilidad del Excel, no por espejar el PDF ciegamente.

6. **Tests bajo cap 300 también**. Si un archivo de tests se pasa, extraer factory helpers a `*TestFactory.cs` (ejemplo: `AsistenciaExcelServiceTestFactory.cs`). Usar `using static ...TestFactory` en los archivos de test para invocar métodos directo.

7. **Baseline tests: 877 verdes tras Chat 1** (865 pre-Chat 1 + 12 nuevos). Chat 2 no debe introducir regresiones.

8. **DNI "00012345" con `Format = "@"` funciona** con ClosedXML. Verificado en tests. El string se preserva exacto sin convertir a número. Test de regresión: `celdaDni.GetString().Should().Be("00012345")` + `Style.NumberFormat.Format.Should().Be("@")`.

9. **Firma del content-type correcto**: `"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"`. Está constante en `AsistenciaExcelService.ContentTypeXlsx`.

10. **Commit style** (regla de skill `commit`): inglés modo imperativo, español **solo entre comillas** para términos de dominio (`"TipoPersona"`, `"INV-D04"`, `"AsistenciaPersona"`). **NUNCA** `Co-Authored-By`. El commit de Chat 1 (BE `3a29b67`) sirve de referencia.

11. **Orden del backlog (2026-04-21)**: `25 → 22 → 24`. Plan 22 Chat 4 FE (F3.FE) ya cerró. Si al cerrar Chat 2 aparece la pregunta "¿seguimos con Chat 3 UI dual o saltamos a Plan 22 F4.BE/F4.FE?", preguntar al usuario — ambos son válidos.

## FUERA DE ALCANCE

- **Chat 3** (Plan 25): UI dual en el frontend (`p-splitButton` "Descargar" con opciones PDF/Excel) en cada página que exporta PDF hoy. Reusar componente compartido si 3+ páginas lo repiten. Requiere todos los endpoints `/excel` ya disponibles — Chat 2 los entrega.
- **Chat 4** (Plan 25): documentación (`business-rules.md` con la regla "todo reporte PDF debe tener Excel") + smoke tests FE + tests de integración E2E.
- **Abstracción `IReportBuilder` genérica** (Plan 2/C.2): diferida. Si durante Chat 2 la duplicación duele lo suficiente para justificar adelantar la abstracción, **pausar y discutir con el usuario antes de adelantarla**. No decidirlo solo.
- **No modificar services PDF existentes** bajo ningún motivo.
- **No refactorizar data services ni repositorios** compartidos entre PDF y Excel.
- **No cambiar rate limit de endpoints `/pdf` existentes** aunque falten `[EnableRateLimiting("heavy")]` — solo agregar a los `/excel` nuevos.
- **Plan 22 F4.BE / F4.FE** y **Plan 24** — otros chats, otro momento.

## CRITERIOS DE CIERRE

- [ ] Pre-work ejecutado y salida compartida con el usuario antes de codificar
- [ ] 4 interfaces nuevas creadas en `Interfaces/Services/**/*ExcelService.cs`
- [ ] 4 services nuevos en `Educa.API/Services/Excel/` (con partials si >300 ln)
- [ ] Cap 300 ln respetado en cada archivo `.cs` nuevo
- [ ] Registro DI de los 4 services en `Extensions/ServiceExtensions.cs` junto al `IAsistenciaExcelService` existente
- [ ] (opcional) `ExcelHelpers.cs` estático extraído si 2+ services comparten helpers, con `AsistenciaExcelService` refactorizado para usarlo
- [ ] Endpoints `GET .../excel` agregados en `ConsultaAsistenciaController` (3) + `BoletaNotasController` (1 o 2, según lo que haya hoy) con `[EnableRateLimiting("heavy")]`
- [ ] Cada endpoint retorna `File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName)`
- [ ] Tests unit por service con mínimo 6 casos verdes cada uno (3 ramas + DNI + horas + sanity + null guard)
- [ ] Test de paridad fila-a-fila con el DTO compartido por PDF y Excel
- [ ] `dotnet build` limpio, sin warnings nuevos
- [ ] `dotnet test` verde, suite BE sin regresiones (baseline Chat 1: 877)
- [ ] Smoke manual: descargar al menos 1 Excel por service desde dev con `curl` o Postman, abrir en Excel/LibreOffice sin warnings, filtrar y ordenar funciona
- [ ] Actualizar `../../educa-web/.claude/plan/maestro.md` fila Plan 25: Chat 2 ✅, Chat 3 ⏳ UI dual FE, Chat 4 ⏳ docs + tests. Progreso `~75%` (3 de 4 chats cerrados).
- [ ] Commit backend con el mensaje sugerido abajo
- [ ] (Opcional) Commit separado `docs(maestro)` si la actualización del maestro se hace aparte
- [ ] **Mover este archivo** a `educa-web/.claude/chats/closed/`:
  ```bash
  mv "educa-web/.claude/chats/003-plan-25-chat-2-be-migrar-reportes-restantes.md" \
     "educa-web/.claude/chats/closed/"
  ```

## COMMIT MESSAGE sugerido

Idioma **inglés**, modo imperativo. Español solo entre `"..."` para términos de dominio. **NO** incluir `Co-Authored-By` (regla explícita de la skill `commit`).

Backend (repo `Educa.API`, branch `master`):

```text
feat(reportes): Plan 25 Chat 2 — Excel parity for 4 remaining PDF reports

- Add "IReporteAsistenciaSalonExcelService", "IReporteAsistenciaConsolidadoExcelService",
  "IReporteAsistenciaProfesorExcelService" and "IBoletaNotasExcelService" mirroring
  the existing PDF services under the 300-line cap.
- Expose "/excel" endpoints in "ConsultaAsistenciaController" and
  "BoletaNotasController" with "[EnableRateLimiting("heavy")]", Peru timezone
  ("INV-D04"), DNI preserved as text ("INV-D01") and Content-Type
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".
- Reuse the same data services that feed the "/pdf" endpoints — no query
  duplication. Row-by-row parity on the shared DTO.
- Promote shared helpers ("EscribirDniComoTexto", "FormatearHora",
  "AplicarEstiloHeader", color constants) to a static "ExcelHelpers" and
  refactor "AsistenciaExcelService" to consume it.
- Unit tests cover the 3-branch "TipoPersona" / periodo / salón matrix,
  empty-result fallbacks, DNI-as-text, hours format, and row parity with
  the shared DTO. Suite: no regressions from Chat 1 baseline.

Closes Plan 25 Chat 2.
```

Maestro update (si se hace commit aparte, repo `educa-web`, branch `main`):

```text
docs(maestro): close Plan 25 Chat 2 — 4 PDF reports now have Excel parity

- Plan 25 Chat 2 ✅ — "ReporteAsistenciaSalon", "ReporteAsistenciaConsolidado",
  "ReporteAsistenciaProfesor" and "BoletaNotas" now expose "/excel" mirrors of
  their "/pdf" endpoints with "heavy" rate limit and Peru timezone.
- Shared Excel helpers consolidated in "ExcelHelpers.cs" to remove drift
  across the 5 Excel services (Chat 1 + Chat 2).

Next: Plan 25 Chat 3 — dual UI ("PDF" / "Excel" split button) on every page
that exports a report today.
```

## CIERRE

Feedback breve a pedir al usuario tras cerrar:

- **Abstracción `IReportBuilder`**: ¿la duplicación de mapeo entre PDF y Excel se sintió dolorosa (→ adelantar Plan 2/C.2) o aceptable (→ dejarla explícita como deuda documentada)?
- **Extracción de `ExcelHelpers.cs`**: ¿quedó limpia la consolidación, o expuso un split distinto (quizá el helper debe vivir como extension method sobre `IXLCell`)?
- **Nombres de archivo de salida**: ¿el patrón `Reporte_{X}_{fecha:yyyyMMdd}.xlsx` es consistente con lo que el Director espera, o prefiere incluir salón/profesor en el nombre para desambiguar al guardar?
- **Chat 3 scope**: con 5 endpoints Excel disponibles, ¿la UI dual se hace en un solo chat (shared component + migrar todas las páginas) o se divide por rol (admin / profesor / estudiante)?
- **Orden de backlog**: con Plan 25 Chat 2 cerrado, ¿seguimos con Plan 25 Chat 3 (UI dual) o saltamos a Plan 22 F4.BE/F4.FE pendiente antes de que la deuda se enfríe?
