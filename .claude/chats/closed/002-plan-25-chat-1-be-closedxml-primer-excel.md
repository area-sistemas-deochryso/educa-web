> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 25 · **Chat**: 1 · **Fase**: F1 (infra ClosedXML + primer reporte Excel) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 25 Chat 1 — BE: ClosedXML + `ReporteFiltradoAsistencia` Excel parity

## PLAN FILE

- Frontend (maestro, fuente de verdad del orden): [`../../educa-web/.claude/plan/maestro.md`](../../educa-web/.claude/plan/maestro.md) → **Plan 25 — Paridad Excel para reportes PDF**.
- Plan file dedicado para Plan 25 aún NO existe (inline en el maestro). Si al cierre conviene extraerlo, hacerlo en `Educa.API/.claude/plan/reportes-excel-paridad.md`.
- Orden del backlog acordado 2026-04-21: **25 → 22 → 24** (revertido tras revisar estado real — ver "Aprendizajes transferibles" abajo).

## OBJETIVO

Entregar el primer reporte en Excel **al lado** del PDF existente sin bloquear con abstracciones prematuras. Chat 1 = infraestructura (NuGet + servicio base) + primer reporte migrado (`ReporteFiltradoAsistencia`, el más usado).

Resultado: `GET /api/consulta-asistencia/reporte-filtrado/excel` paralelo al `/pdf` existente, con los mismos parámetros de filtro y paridad fila a fila.

**NO** abstraer `IReportBuilder` genérico — eso queda diferido a Plan 2/C.2. Este chat es aditivo puro sobre los servicios PDF existentes (no los toca).

## PRE-WORK OBLIGATORIO

Antes de tocar código, validar que el estado real del repo coincide con lo que el plan asume. Comandos a ejecutar y compartir salida con el usuario:

```bash
# 1. Confirmar paquete PDF ya instalado (QuestPDF 2024.10.2 esperado)
grep -n "QuestPDF\|ClosedXML\|EPPlus" Educa.API/Educa.API.csproj

# 2. Confirmar que NO existe un ExcelService backend previo
find Educa.API -type f -name "*Excel*.cs" 2>&1

# 3. Ver estructura partial class de ReporteFiltradoPdfService (vamos a replicarla)
ls Educa.API/Services/Asistencias/ReporteFiltradoPdfService*.cs
wc -l Educa.API/Services/Asistencias/ReporteFiltradoPdfService*.cs
wc -l Educa.API/Services/Asistencias/ReporteFiltradoAsistenciaService*.cs

# 4. Identificar endpoint actual /pdf y sus parámetros exactos
grep -n "reporte-filtrado\|ReporteFiltrado" Educa.API/Controllers/Asistencias/ConsultaAsistenciaController.cs

# 5. Confirmar política de rate limit "heavy" en Program.cs
grep -n '"heavy"\|AddRateLimiter\|EnableRateLimiting' Educa.API/Program.cs | head -20

# 6. Baseline de tests antes de empezar (para comparar al cierre)
cd Educa.API && dotnet test --no-build --verbosity minimal 2>&1 | tail -5
```

Si algo sale distinto a lo asumido, **pausar y discutir** antes de codificar. Específicamente:

- Si ya hay una librería Excel distinta (EPPlus, Syncfusion) → no agregar ClosedXML, adaptar al que ya está.
- Si `ReporteFiltradoPdfService` no está en partial classes → seguir el patrón que sí use.
- Si el endpoint `/pdf` no existe en `ConsultaAsistenciaController` → identificar dónde vive y migrar el scope.

## ALCANCE

### NuGet a agregar

En `Educa.API/Educa.API.csproj`:

```xml
<PackageReference Include="ClosedXML" Version="0.104.*" />
```

Razón: **ClosedXML** es OSS MIT puro, sin licencia dual (EPPlus cambió a dual hace años). Suficiente para tablas con estilos básicos, que es lo que necesita un reporte de asistencia.

### Archivos a crear

| Archivo | Rol | Líneas estimadas |
| --- | --- | ---: |
| `Educa.API/Interfaces/Services/Asistencias/IAsistenciaExcelService.cs` | Interfaz `GenerarReporteFiltradoAsistenciaAsync(filtros) → Task<byte[]>` | ~30 |
| `Educa.API/Services/Excel/AsistenciaExcelService.cs` | Implementación base (setup workbook, metadatos, dispatch por `tipoPersona`) | ~180 |
| `Educa.API/Services/Excel/AsistenciaExcelService.Estudiantes.cs` | Partial: columnas y filas específicas de estudiantes | ~120 |
| `Educa.API/Services/Excel/AsistenciaExcelService.Profesores.cs` | Partial: columnas y filas específicas de profesores | ~120 |
| `Educa.API.Tests/Services/Excel/AsistenciaExcelServiceTests.cs` | xUnit + Moq + FluentAssertions: 3+ casos (estudiantes/profesores/todos) + content-type + disposition | ~150 |

> Si al implementar alguno supera **300 líneas**, dividir ya en otra partial (`.Header.cs`, `.Styles.cs`). No dejar archivos `>300` aunque la primera versión quepa.

### Archivos a modificar

| Archivo | Cambio |
| --- | --- |
| `Educa.API/Educa.API.csproj` | `<PackageReference Include="ClosedXML" Version="0.104.*" />` |
| `Educa.API/Program.cs` | `builder.Services.AddScoped<IAsistenciaExcelService, AsistenciaExcelService>();` |
| `Educa.API/Controllers/Asistencias/ConsultaAsistenciaController.cs` | Nuevo endpoint `GET reporte-filtrado/excel` mirror del `/pdf` — delega al nuevo service. Controller delgado (backend.md §Controller Reglas). |

### Contrato del endpoint

```csharp
// Mismos query params que /pdf: sedeId, desde, hasta, tipoPersona, salonIds, etc.
[HttpGet("reporte-filtrado/excel")]
[EnableRateLimiting("heavy")]
public async Task<IActionResult> ReporteFiltradoExcel(/* mismos params que /pdf */)
{
    var bytes = await _excelService.GenerarReporteFiltradoAsistenciaAsync(filtros);
    var nombre = $"reporte-asistencia-{DateTimeHelper.PeruNow():yyyy-MM-dd}.xlsx";
    return File(
        bytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        nombre);
}
```

### Layout del Excel

- **Header fila 1-3**: metadata (rango de fechas, sede, tipoPersona, total de filas). Fuente bold.
- **Header fila 5**: nombres de columnas (UPPERCASE + fondo gris suave, bordes).
- **Rows**: datos de la consulta. DNI con formato texto (ClosedXML lo convierte a número si no se fuerza).
- **Hojas**: una sola por default. Si `tipoPersona=Todos`, decidir al momento (dos hojas separadas `Estudiantes` + `Profesores` es preferible para facilitar filtrado en Excel).
- **Formato fechas**: `dd/MM/yyyy` en zona Perú (INV-D04). `DateTimeHelper.PeruNow()` para timestamps del reporte.
- **Autoancho**: `worksheet.Columns().AdjustToContents()` al final.

## TESTS MÍNIMOS

### `AsistenciaExcelServiceTests`

| Caso | Input | Verificación |
| --- | --- | --- |
| Solo estudiantes | `tipoPersona=E`, rango 1 día, 5 estudiantes mock | Workbook tiene 1 hoja; fila 5 = headers esperados; filas 6-10 tienen DNI como texto; nombre de archivo contiene `estudiantes` o rango |
| Solo profesores | `tipoPersona=P`, 3 profesores mock | Workbook tiene 1 hoja; filas coinciden con mock |
| Todos | `tipoPersona=Todos`, 5 est + 3 prof | Workbook tiene 2 hojas (`Estudiantes` + `Profesores`); suma de filas = 8 |
| Rango sin resultados | 0 registros mock | Retorna byte[] válido con solo header + fila "Sin resultados" |
| Formato DNI | DNI `"00012345"` | En la celda se lee como string `"00012345"` (no `12345`) |
| Zona horaria Perú | Fecha UTC mock `2026-04-21T05:00:00Z` | Celda muestra `21/04/2026` (Perú UTC-5 → 2026-04-21 00:00) |

Paridad con PDF — test adicional:

| Caso | Verificación |
| --- | --- |
| Paridad fila-a-fila | Con el mismo mock de datos, `service.Excel(filtros)` genera N filas; `service.Pdf(filtros)` genera N filas (si existe acceso a la data cruda del PDF). Si no hay API limpia para comparar, hacer el assert sobre el data layer común que ambos consumen (`ReporteFiltradoAsistenciaService`). |

### Smoke manual (no automatizado)

- Descargar con `curl` o Postman desde dev: `curl -o reporte.xlsx "https://localhost:7102/api/consulta-asistencia/reporte-filtrado/excel?sedeId=1&desde=2026-04-01&hasta=2026-04-20&tipoPersona=E" -H "Authorization: Bearer <token>"`.
- Abrir en Excel o LibreOffice → no debe mostrar warnings de archivo corrupto ni caracteres raros.
- Ordenar, filtrar, aplicar formato condicional → debe comportarse como una tabla normal.

## REGLAS OBLIGATORIAS

- **Cap 300 ln** por archivo `.cs` (backend.md §Service Reglas). Si se acerca, dividir desde el inicio en partial classes.
- **Controller delgado**: solo routing + delegación. Nada de lógica de negocio ni mapping en el controller (backend.md §Controller Reglas).
- **Service con interfaz + DI Scoped**: `IAsistenciaExcelService` + implementación, registrado en `Program.cs`.
- **Rate limit `"heavy"`** en el endpoint (5/min por userId, backend.md §Rate Limiting). Consistente con el `/pdf` actual.
- **Zona horaria Perú (INV-D04)**: toda fecha/hora en la salida usa `DateTimeHelper.PeruNow()` o conversión equivalente. NO `DateTime.Now` crudo.
- **AsNoTracking()** en cualquier query que el service dispare (INV-D05).
- **File response directo**: endpoint retorna `File(bytes, contentType, fileName)` — no envolver en `ApiResponse<T>` (consistente con endpoints `/pdf` existentes; INV-D08 no aplica a binarios).
- **Content-Type exacto**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (nunca `application/octet-stream` ni `application/vnd.ms-excel`, que es xls legacy).
- **Fire-and-forget NO aplica** aquí — el Excel se devuelve al cliente, no se envía por correo en este chat.
- **DNI en Excel**: mantener **paridad** con lo que hace el PDF. Si el PDF muestra DNI completo, el Excel también. Si el PDF enmascara con `DniHelper.Mask`, el Excel también. No introducir divergencia en este chat — si detectas deuda de enmascaramiento, abrir ticket aparte, no corregirla aquí.
- **Structured logging** (backend.md §Logging): `_logger.LogInformation("Reporte Excel generado para {TipoPersona} rango {Desde}-{Hasta}", ...)` con placeholders, nunca string interpolation.
- **No tocar servicios PDF existentes** — este chat es aditivo puro. Si encuentras un bug en el PDF mientras implementas, anótalo en el feedback de cierre, no lo arregles aquí.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

Descubrimientos del audit de estado real 2026-04-21 que el chat nuevo **debe** conocer para no redescubrir:

1. **NO existe `ExcelService.cs` en el backend.** El maestro dice "reusar `ExcelService` existente" — es incorrecto. El `ExcelService` existente es del **frontend** (`core/services/excel/ExcelService` en educa-web). Crear el backend desde cero.

2. **QuestPDF 2024.10.2 ya instalado.** Es la única librería de reporting en el backend hoy. ClosedXML debe agregarse — no hay alternativa ya instalada.

3. **`ReporteFiltradoAsistenciaService` ya está en partial classes** (base 209 ln + `.Estudiantes.cs` 254 ln + `.Profesores.cs` 166 ln). Replicar la **misma estructura** en `AsistenciaExcelService` para consistencia.

4. **Deuda cap 300 ln preexistente en PDF services**: `ReporteAsistenciaConsolidadoPdfService.cs` (395), `ReporteAsistenciaDataService.cs` (400), `BoletaNotasPdfService.cs` (382), `ReporteAsistenciaSalonPdfService.cs` (320). Plan 25 Chat 1 **NO** debe empeorar esto — el nuevo service respeta cap desde el inicio. La deuda existente la paga Plan 2/C.

5. **`AsistenciaPdfComposer`** con partial classes (`DiarioSections`, `StudentSections`, `StatCards`, `Footer`, `Colors`) es un embrión de builder genérico. NO tocar en este chat. Es candidato para la abstracción `IReportBuilder` de Plan 2/C.2, pero queda diferido.

6. **Plan 22 F3.FE está WIP en paralelo en el repo FE** (`educa-web`) — ver `git status` del frontend (9 archivos modificados en `email-outbox/` + carpetas `models/` y `pipes/` untracked). Este chat es backend puro en otro repo, **no hay conflicto** (regla `one-repo-one-chat.md` permite chats paralelos en repos distintos). El task-chat.md del frontend (`educa-web/.claude/task-chat.md`) es para Plan 22 F3.FE y **no debe tocarse desde aquí**.

7. **Maestro desactualizado en dos puntos** — corregir en el commit de cierre o en commit separado `docs(maestro)`:
   - Fila Plan 25: eliminar mención "reusar `ExcelService` existente" (no existe en BE).
   - Fila Plan 22: actualmente dice `(plan file pendiente crear)`; ya existe en `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`.

8. **Orden de backlog revertido** el 2026-04-21: era `22 → 24 → 25`, cambió a `25 → 22 → 24` porque el usuario pidió sacar Excel lo antes posible. Plan 22 y Plan 24 quedan esperando tras Plan 25 entregado.

## FUERA DE ALCANCE

- **Chat 2** (Plan 25): migrar los 5 reportes PDF restantes a Excel (`ReporteAsistenciaConsolidado`, `ReporteAsistenciaSalon`, `ReporteAsistenciaProfesor`, `BoletaNotas`, y cualquier otro PDF que quede). Reusar el `AsistenciaExcelService` creado aquí extendiendo o creando servicios hermanos.
- **Chat 3** (Plan 25): UI dual en el frontend (`p-splitButton` "Descargar" con opciones PDF/Excel) en todas las páginas que hoy exportan PDF. Shared component si se repite 3+ veces.
- **Abstracción `IReportBuilder`** genérica compartida entre PDF y Excel → diferido a **Plan 2/C.2** (PDF Builder genérico). Si aparece fricción fuerte durante este chat por duplicar mapeo de columnas, documentarla como entrada para Plan 2/C.2 pero no adelantarlo.
- **Plan 22 y Plan 24** (endurecimiento correos, job CrossChex) — otros chats, otro momento.
- **No modificar servicios PDF existentes** — ni siquiera para "aprovechar y mejorar". Chat aditivo.
- **No refactorizar `ApplicationDbContext`** ni queries compartidas por Plan 25 y PDF. Lectura read-only, `AsNoTracking()`, done.

## CRITERIOS DE CIERRE

- [ ] Pre-work ejecutado y salida compartida con el usuario antes de codificar
- [ ] `<PackageReference Include="ClosedXML" Version="0.104.*" />` agregado a `Educa.API.csproj`
- [ ] `IAsistenciaExcelService` creado en `Interfaces/Services/Asistencias/`
- [ ] `AsistenciaExcelService` creado (base + `.Estudiantes.cs` + `.Profesores.cs` si el split desde el inicio es conveniente)
- [ ] Cap 300 ln respetado en cada archivo `.cs` nuevo
- [ ] Registro DI en `Program.cs`: `AddScoped<IAsistenciaExcelService, AsistenciaExcelService>()`
- [ ] Endpoint `GET /api/consulta-asistencia/reporte-filtrado/excel` con `[EnableRateLimiting("heavy")]`
- [ ] Endpoint retorna `FileContentResult` con Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition` con nombre legible
- [ ] Tests `AsistenciaExcelServiceTests` con mínimo 3 casos verdes (estudiantes / profesores / todos)
- [ ] Test de paridad fila a fila con PDF (o sobre el data layer común)
- [ ] `dotnet build` limpio, sin warnings nuevos
- [ ] `dotnet test` verde, suite BE sin regresiones (baseline medido en pre-work)
- [ ] Smoke manual: descargar Excel desde dev, abrir en Excel/LibreOffice sin warnings, filtrar y ordenar funciona
- [ ] Actualizar `educa-web/.claude/plan/maestro.md` fila Plan 25:
  - Estado `Chat 1 ✅ ClosedXML + ReporteFiltradoAsistencia Excel shippeado · Chat 2 ⏳ migrar 5 reportes restantes · Chat 3 ⏳ UI dual FE`
  - Eliminar mención "reusar `ExcelService` existente" (no existe en BE)
  - Corregir fila Plan 22 `(plan file pendiente crear)` → `plan file creado en Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`
- [ ] Commit backend con el mensaje sugerido abajo
- [ ] (Opcional) Commit separado `docs(maestro)` si la actualización del maestro se hace aparte

## COMMIT MESSAGE sugerido

Idioma **inglés**, modo imperativo. Español solo entre `"..."` para términos de dominio. **NO** incluir `Co-Authored-By` (regla explícita de la skill `commit`).

Backend (repo `Educa.API`, branch `master`):

```text
feat(reportes): Plan 25 Chat 1 — "ReporteFiltradoAsistencia" Excel parity

- Add ClosedXML 0.104.* to Educa.API.csproj for "xlsx" generation.
- Add "IAsistenciaExcelService" + "AsistenciaExcelService" with partial
  class split ("Estudiantes"/"Profesores") mirroring the existing PDF
  services, under the 300-line cap.
- Expose "GET /api/consulta-asistencia/reporte-filtrado/excel" mirroring
  the "/pdf" endpoint with "[EnableRateLimiting("heavy")]", Peru timezone
  ("INV-D04"), and Content-Type
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".
- Row-by-row parity with the existing "/pdf" endpoint for the same
  filters. DNI preserved as text, dates in "dd/MM/yyyy" Peru time.
- Unit tests cover "estudiantes", "profesores", and "todos" filter paths
  plus DNI-as-text and timezone assertions.

Closes Plan 25 Chat 1.
```

Maestro update (si se hace commit aparte, repo `educa-web`, branch `main`):

```text
docs(maestro): close Plan 25 Chat 1 + fix stale notes

- Plan 25 Chat 1 ✅ — "ReporteFiltradoAsistencia" Excel shipped behind
  the "/excel" endpoint.
- Remove stale "reuse existing ExcelService" note (the backend had none;
  "ExcelService" in the monorepo is frontend-only).
- Plan 22 plan file exists at
  "Educa.API/.claude/plan/asistencia-correos-endurecimiento.md";
  remove "(pendiente crear)" marker.

Next: Plan 25 Chat 2 — migrate 5 remaining PDF reports to Excel.
```

## CIERRE

Feedback breve a pedir al usuario tras cerrar:

- **Hojas separadas vs columna `tipoPersona`**: cuando el filtro es `Todos`, ¿el Excel trae dos hojas (`Estudiantes` + `Profesores`, propuesto) o una sola hoja con columna `tipoPersona`? Impacta el Chat 2 (consistencia entre reportes).
- **Enmascaramiento de DNI**: se mantuvo paridad con el PDF. Si el Director quiere DNI enmascarado en el Excel (para compartir por correo) pero completo en el PDF, decidir si crear flag de query string o tratarlo como tarea aparte.
- **Abstracción `IReportBuilder`**: ¿la duplicación de mapeo de columnas entre PDF y Excel se sintió dolorosa (señal para adelantar Plan 2/C.2), o aceptable (dejamos la deuda explícita)?
- **Chat 2 scope**: ¿migrar los 5 reportes en un solo chat o dividir en 2 (uno por subcarpeta: Asistencia × Boleta)? Depende de lo que haya tardado Chat 1.
- **Orden de backlog**: con Plan 25 Chat 1 cerrado, ¿seguimos con Plan 25 Chat 2 (migrar resto) o saltamos a Plan 22 Chat 4 FE que está WIP en el otro repo?
