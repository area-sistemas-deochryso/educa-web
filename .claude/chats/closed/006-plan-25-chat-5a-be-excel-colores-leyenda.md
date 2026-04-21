> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo. Scope 100% BE — los Excel los genera el backend; FE no se toca.
> **Plan**: 25 · **Chat**: 5A · **Fase**: F5.A (paridad visual — colores + leyenda + nombres de mes en español) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 25 Chat 5A — Paridad visual Excel ↔ PDF (colores + leyenda + nombres de mes)

## PLAN FILE

- Maestro (fuente de verdad del orden): `educa-web/.claude/plan/maestro.md` → **Plan 25 — Paridad Excel para reportes PDF** → Chat 5A (cleanup visual post-cierre).
- Path relativo desde `Educa.API` (BE): `../../educa-web/.claude/plan/maestro.md`.
- Plan file dedicado NO existe. Al cerrar Chat 5A + 5B, reevaluar si vale extraer `.claude/plan/reportes-excel-paridad.md` como post-mortem consolidado.
- **Reapertura del plan**: Plan 25 estaba cerrado al 100% (Chat 4, 2026-04-21). Este Chat 5A + Chat 5B (futuro) lo reabren a ~95% hasta completar la paridad visual. Documentar el re-open en la tabla del maestro (estado a `🟢 Re-abierto 2026-04-21`).
- Chats previos cerrados en `educa-web/.claude/chats/closed/`:
  - Chat 1 — BE `3a29b67`, maestro FE `8ea9e08` (2026-04-21): ClosedXML + `AsistenciaExcelService` + primer endpoint `/api/reportes-asistencia/excel`.
  - Chat 2 — BE `7f8ebf5`, maestro FE `00d883d` (2026-04-21): 4 services Excel restantes + 13 endpoints `/excel` totales, **con la deuda visual que este chat cierra**.
  - Chat 3 — FE `2a6200c` + docs `6ee1a17` (2026-04-21): UI dual PDF/Excel en 5 páginas de asistencia, Excel client-side de `attendance-reports` reemplazado por endpoint BE.
  - Chat 4 — BE `a2b36e8`, FE `6d19185` + `56b2617` (2026-04-21): docs §17 en `business-rules.md` + INV-RE01/02/03 + 26 tests contract BE (930 verdes) + 19 smoke tests FE (1429 verdes).

## OBJETIVO

Cerrar la divergencia visual que Chat 4 dejó documentada como feedback del usuario (2026-04-21): los Excel no siguen el color coding ni la leyenda que usan los PDF equivalentes, y los subtítulos de los rangos mes/semana/año muestran fechas numéricas en lugar del nombre del mes en español.

Específicamente, tras este chat:

1. **Catálogo de colores de estado compartido**. Mover la fuente de verdad de colores por estado (T/A/F/J/-/X) desde `AsistenciaPdfComposer.Colors.cs` (hoy partial del PDF) a un lugar que tanto PDF como Excel consuman, para que ambos formatos usen exactamente el mismo hex por código.
2. **Leyenda de estados en Excel**. Agregar una fila (o mini-tabla) de leyenda en cada hoja de reportes de asistencia con badges coloreados — misma info que el `ComposeLeyendaEstados` del PDF (T=`#506ad0` azul, A=`#77a02d` verde, F=`#f44336` rojo, J=`#9c27b0` morado, `-`=`#9e9e9e` gris).
3. **Colorear celdas de estado individual**. Los reportes que tienen columna de "estado" por persona (`AsistenciaExcelService` reporte filtrado, `ReporteAsistenciaProfesorExcelService` día/mes/filtrado) deben pintar la celda del estado con el color correspondiente (fondo claro `ColorEstadoBg` + texto `ColorEstado`). Los reportes consolidados por salón (columnas de conteo, no de estado) no aplican.
4. **Subtítulos con nombre de mes en español**.
   - Mes: `"ABRIL 2026"` en lugar de `"2026-04-01 a 2026-04-30"`.
   - Año: `"AÑO 2026"` (simple) — Chat 5B se encarga de la división Verano/Regular.
   - Semana: `"Semana del lunes 20 al domingo 26 de abril de 2026"` (full text).

El Chat 5A **NO** implementa features nuevas ni cambia firmas de endpoints. Tampoco cambia el diseño del año (eso es Chat 5B). Solo cierra la brecha visual pura.

## PRE-WORK OBLIGATORIO

Antes de codificar, confirmar el estado real del código post-Chat 4:

```bash
cd Educa.API

# 1. Git limpio + branch + último commit del Chat 4
git status --short && git branch --show-current
git log --oneline -3   # Esperado: top = "test(reports): Plan 25 Chat 4 — paridad..."

# 2. Inventario de services Excel que van a tocarse
ls Educa.API/Services/Excel/ | grep -v "ExcelHelpers"
# Esperado:
# AsistenciaExcelService.cs (+ 2 partials Estudiantes/Profesores)
# BoletaNotasExcelService.cs (+ 1 partial Tables)
# ReporteAsistenciaConsolidadoExcelService.cs
# ReporteAsistenciaProfesorExcelService.cs (+ 1 partial Tables)
# ReporteAsistenciaSalonExcelService.cs (+ 1 partial Tables)

# 3. Catálogo de colores fuente de verdad (hoy vive en PDF)
grep -n "ColorEstado\|ColorEstadoBg\|EstadosAsistencia" \
  Educa.API/Services/Asistencias/AsistenciaPdf/AsistenciaPdfComposer.Colors.cs
# Verificar: 5 estados (T/A/F/J/-/X) con 2 colores c/u (fg + bg)

# 4. Tamaño actual de cada archivo que se va a tocar (cap 300 ln)
wc -l Educa.API/Services/Excel/*.cs Educa.API/Services/Asistencias/AsistenciaPdf/AsistenciaPdfComposer.Colors.cs
```

Si `AsistenciaPdfComposer.Colors.cs` ya pasa de 160 ln (era 159 al cerrar Chat 4) o si `ExcelHelpers.cs` pasa de 200 ln con los agregados, **pausar y discutir la división** antes de codificar.

## ALCANCE

### 1. Catálogo compartido de colores de estado

Decisión a tomar en pre-work:

| Opción | Ubicación | Pros | Contras |
|---|---|---|---|
| **A** | `Constants/Asistencias/EstadoAsistenciaColores.cs` nuevo | Más coherente con taxonomía `Constants/` de dominio | Requiere migrar el consumidor PDF (`ColorEstado` → `EstadoAsistenciaColores.Hex(codigo)`) |
| **B** | `Domain/Asistencia/EstadoAsistenciaColores.cs` | Encaja con el Domain Layer existente (INV-C01 vive ahí) | El Domain no debería saber de presentación — discutible |
| **C** | Dejar en `AsistenciaPdfComposer.Colors.cs` pero volverlo no-partial (clase normal), que `ExcelHelpers` lo consuma | Cambio mínimo | Acopla visualmente Excel a un archivo cuyo namespace dice "PDF" |

**Recomendación**: Opción A. El archivo nuevo expone 2 diccionarios `Foreground` + `Background` por código de estado (hex strings — Excel usa hex ARGB sin `#`, PDF usa `Color.FromHex("#RRGGBB")` — un helper `ToArgbNoHash` convierte). Tamaño estimado: ~60 ln.

**Archivo a crear**:

| Archivo | Rol | Contenido |
|---|---|---|
| `Educa.API/Constants/Asistencias/EstadoAsistenciaColores.cs` | Catálogo fuente de verdad | `Dictionary<string, string>` con los 6 códigos (`T/A/F/J/-/X`) mapeados a hex. 2 diccionarios: `Foreground` + `Background`. 1 diccionario `Label` (`"TARDANZA"`, `"ASISTIÓ"`, `"FALTA"`, `"JUSTIFICADO"`, `"PENDIENTE"`, `"ANTES DEL REGISTRO"`). 1 array `Orden` para la secuencia de la leyenda (T, A, F, J, -). Helper `ToArgbNoHash(string hex)` para Excel (`"#506ad0"` → `"FF506AD0"`). |

**Archivo a modificar (consumidor PDF)**:

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Asistencias/AsistenciaPdf/AsistenciaPdfComposer.Colors.cs` | Reemplazar `ColorEstado` / `ColorEstadoBg` / `EstadosAsistencia` por lectura del catálogo compartido. Los métodos públicos existentes se mantienen como façade para no romper consumidores del PDF — internamente leen de `EstadoAsistenciaColores`. Paridad 1:1 con el código anterior validada por test. |

### 2. Helper Excel para leyenda de estados

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Excel/ExcelHelpers.cs` | Agregar método `EscribirLeyendaEstados(IXLWorksheet ws, int fila, int colInicial)`. Renderiza una fila de 5 badges (código + label + color de fondo) replicando la leyenda del PDF. Devuelve la siguiente fila libre. Cap 300 ln del archivo respetado (hoy ~150 ln, esto suma ~30-40 ln). |

### 3. Colorear celdas de estado individual en los Excel que tienen columna "Estado"

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Excel/AsistenciaExcelService.Estudiantes.cs` | La columna 5 ("Estado") se pinta con `fill background = EstadoAsistenciaColores.Background[codigo]` + `font color = Foreground[codigo]` usando el `EstadoCodigo` del DTO. |
| `Educa.API/Services/Excel/AsistenciaExcelService.Profesores.cs` | Idem para la columna "Estado" del bloque de profesores. |
| `Educa.API/Services/Excel/ReporteAsistenciaProfesorExcelService.Tables.cs` | Idem para las tablas de asistencia-profesor-día/mes/filtrado que tienen columna "Estado". Verificar índice de columna en pre-work. |

**Los consolidados por salón NO aplican** (`ReporteAsistenciaSalonExcelService`, `ReporteAsistenciaConsolidadoExcelService`): sus columnas son conteos agregados (#, Grado, Sección, Estudiantes, Asistieron, ...), no códigos de estado individuales. La leyenda sí va en la parte superior de la hoja como referencia visual, pero no se pinta celda por celda.

### 4. Subtítulos con nombre de mes en español

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Excel/ExcelHelpers.cs` | Agregar helpers `FormatearMesAnio(int mes, int anio) → "ABRIL 2026"` y `FormatearRangoSemana(DateTime inicio)` usando `CulturaPeru` ya existente. `ToUpper()` para consistencia con el estilo "REPORTE CONSOLIDADO MENSUAL". |
| `Educa.API/Services/Excel/ReporteAsistenciaConsolidadoExcelService.cs` | En `GenerarExcelTodosSalonesMes` cambiar el subtítulo a `"REPORTE CONSOLIDADO MENSUAL — {FormatearMesAnio(mes, anio)}"`. En `Semana`, usar `"Semana del {inicio:dddd d} al {fin:dddd d 'de' MMMM 'de' yyyy}"` con `CulturaPeru`. En `Anio`, por ahora `"AÑO {anio}"` — Chat 5B lo enriquece con división Verano/Regular. |
| `Educa.API/Services/Excel/ReporteAsistenciaSalonExcelService.cs` + `.Tables.cs` | Mismo tratamiento para los subtítulos de salón (mes / periodo). |
| `Educa.API/Services/Excel/ReporteAsistenciaProfesorExcelService.cs` + `.Tables.cs` | Mismo tratamiento para subtítulos de profesor (día ya usa `FormatearFecha` OK, mes necesita `FormatearMesAnio`). |

**Espejo en PDF (opcional, dentro del scope si cabe)**: el PDF tiene la misma deuda (`"Del 01/04/2026 al 30/04/2026"`). Si cabe en cap 300 ln de los archivos PDF, aplicar el mismo cambio ahí — así Chat 5B no tiene que hacerlo. Si no cabe, documentar en FUERA DE ALCANCE y Chat 5B lo arregla junto con la división de año. **Decidir en pre-work** después de medir `wc -l` de los PDF services.

### 5. Llamar `EscribirLeyendaEstados` desde las hojas que muestran estados individuales

Agregar la leyenda en la parte superior de las hojas generadas por:

- `AsistenciaExcelService` (reporte filtrado — 1 o 2 hojas según `TipoPersona`)
- `ReporteAsistenciaProfesorExcelService` (día / mes / filtrado)

Los consolidados por salón **no incluyen leyenda** — su contenido es agregado, no individual. Incluirla confundiría (columnas no tienen códigos de estado).

## TESTS MÍNIMOS

Tests a nivel de service (xUnit + FluentAssertions + ClosedXML), consistente con el patrón Chat 1–2. **No** se agregan tests a nivel de controller — Chat 4 ya cubrió el contract.

| Archivo | Tests | Input → Resultado |
|---|---|---|
| `Tests/Constants/EstadoAsistenciaColoresTests.cs` (nuevo) | 4 | `Foreground["A"]` → `"#77a02d"` · `Background["F"]` → `"#fde8e7"` · `Label["J"]` → `"JUSTIFICADO"` · `Orden` tiene exactamente 5 entradas en orden `T,A,F,J,-` |
| `Tests/Services/Excel/ExcelHelpersLeyendaTests.cs` (nuevo) | 3 | Helper genera 5 celdas con fondos ARGB correctos · `FormatearMesAnio(4, 2026)` → `"ABRIL 2026"` (uppercase, con culture es-PE) · `ToArgbNoHash("#506ad0")` → `"FF506AD0"` |
| `Tests/Services/Excel/AsistenciaExcelServiceColorTests.cs` (nuevo o extensión del existente) | 2 | Reporte filtrado con 1 estudiante estado `"F"` → celda de estado tiene `FillColor == Background["F"]` · Reporte con `"A"` → celda tiene `FillColor == Background["A"]` |
| `Tests/Services/Excel/ReporteAsistenciaConsolidadoExcelServiceTests.cs` (extender existente) | 1 | Subtítulo de reporte mensual contiene `"ABRIL"` (nombre del mes) cuando `mes=4, anio=2026` |

**Paridad PDF ↔ catálogo compartido**: 1 test que verifica que `AsistenciaPdfComposer.ColorEstado("A")` retorna un `Color` cuyo hex equivale a `EstadoAsistenciaColores.Foreground["A"]`. Esto previene drift entre la facade PDF y el catálogo nuevo.

**Sin regresiones sobre baseline Chat 4**: `dotnet test` debe cerrar con ≥ 930 (baseline) + N nuevos, 0 fallos.

## REGLAS OBLIGATORIAS

- **`backend.md` §Organización de archivos**: un archivo = una clase. El catálogo nuevo `EstadoAsistenciaColores` es 1 clase estática en 1 archivo — no mezclar con `ExcelHelpers`.
- **Cap 300 ln** por archivo `.cs`. El que más riesgo tiene es `ExcelHelpers.cs` — si con los helpers nuevos pasa de 300, dividir en partial (`ExcelHelpers.Leyenda.cs`).
- **`backend.md` §Logging**: structured logging con placeholders. Los tests no loguean — assertions solamente.
- **`testing.md`**: xUnit + FluentAssertions + Moq (ya usados). `ClosedXML` disponible desde Chat 1 para abrir el xlsx en tests.
- **`code-language.md`**: código/tests en inglés; labels visibles al usuario en español (`"TARDANZA"`, `"ASISTIÓ"`, etc.).
- **`git.md`**: 1 commit `test(reports)` si hay tests puros + 1 commit `refactor(reports)` o `feat(reports)` — **nunca** mezclar test y código productivo en el mismo commit salvo que sea trivial. Decidir según scope final.
- **NO tocar**: los endpoints BE ya cerrados (paridad /pdf y /excel intacta), los `descargarPdf*` / `descargarExcel*` del FE (Chat 3), el patrón de menús consolidado `buildPdfExcelMenuItems`, el tamaño/shape de los DTOs que alimentan los services.
- **Commit style**: la skill `commit` prohíbe `Co-Authored-By` explícitamente. Mensaje en inglés, español solo entre comillas para términos de dominio (`"leyenda"`, `"EstadoAsistencia"`, estados `"T"`/`"A"`/`"F"`/`"J"`).

## APRENDIZAJES TRANSFERIBLES (del Chat 4)

1. **`ControllerTestBase` + `ClaimsPrincipalBuilder`** ya existen en `Educa.API.Tests/Controllers/Common/` — reutilizar para cualquier test nuevo de controller. Este Chat 5A probablemente no agrega tests de controller, pero el helper está listo.
2. **ClosedXML + FluentAssertions**: el patrón `using var wb = new XLWorkbook(new MemoryStream(bytes)); ws.Cell(r, c).Style.Fill.BackgroundColor` funciona para assertar colores. Ver `AsistenciaExcelServiceTests.cs` para el setup típico.
3. **`AsistenciaExcelServiceTestFactory` (internal static)** en `Tests/Services/Excel/` provee `BaseDto()`, `CrearSalon()`, `CrearEstudiante()`, `CrearProfesor()` para armar DTOs rápido — reutilizar.
4. **`ExcelHelpers.CulturaPeru`** ya existe (`new CultureInfo("es-PE")`) — usarlo para los nombres de mes. NO hardcodear diccionario de meses (anti-patrón).
5. **Colores de PDF viven en `AsistenciaPdfComposer.Colors.cs`** — es un partial class de un static. Al mover el catálogo a `Constants/Asistencias`, la facade partial debe seguir funcionando con los mismos nombres de método públicos (`ColorEstado`, `ColorEstadoBg`, `EstadosAsistencia`) para no romper el PDF. Internal refactor, zero breaking change.
6. **ClosedXML espera ARGB sin `#`** (8 hex chars: `"FF506AD0"` = alpha=FF + RGB). PDF (QuestPDF) espera `Color.FromHex("#506ad0")` (6 o 8 chars con `#`). El helper `ToArgbNoHash` del catálogo hace la conversión.
7. **`ExcelHelpers` es `internal`** — al crear `ExcelHelpers.Leyenda.cs` como partial, debe seguir `internal static partial class`. Los tests están en el mismo assembly o usan `InternalsVisibleTo`. Verificar en pre-work si `InternalsVisibleTo` ya está configurado (ver si `BoletaNotasExcelServiceTests` accede a algún internal).
8. **`FormatearFecha` ya existe en `ExcelHelpers`** — agregar `FormatearMesAnio` y `FormatearRangoSemana` junto a él, misma convención (uppercase, CulturaPeru).
9. **Tests de paridad estructural PDF↔Excel** (Chat 4) verificaron args al data service. Este chat agrega **paridad visual** (colores hex + labels). Son complementarios, no redundantes.

## FUERA DE ALCANCE

- **División Verano/Regular del reporte anual**: es Chat 5B (decisión de diseño pendiente — ¿query param `periodo`?, ¿2 hojas/páginas automático?, ¿agregación por periodo?). No tocar acá.
- **Agregar nuevos endpoints PDF o Excel**: la superficie del API está congelada en los 14+14 endpoints de Chat 2/4.
- **Migrar `BoletaNotasPdfService` / `BoletaNotasExcelService` a usar la nueva leyenda**: las boletas de notas no tienen códigos de asistencia (tienen notas numéricas/literales). No aplica.
- **Reemplazar el color `#1E40AF` del header de Excel** por otro: mantener — es el blue-800 del design system, ya validado en `design-system.md`.
- **Migrar el PDF completo a leer subtítulos con nombres de mes**: decidir en pre-work si cabe (ver ALCANCE §4 "Espejo en PDF"). Si no cabe, queda para Chat 5B.
- **Tocar `AsistenciaPdfComposer.ComposeLeyendaEstados`** más allá del refactor mínimo para que lea del catálogo compartido. El layout PDF se preserva.
- **Tests E2E / smoke de abrir el xlsx en Excel real**: fuera del scope — los tests unit con ClosedXML validan el modelo.
- **Plan 22 F4.BE/F4.FE**: chat aparte, no se mezcla con Plan 25.

## CRITERIOS DE CIERRE

- [ ] Pre-work ejecutado y output compartido con el usuario antes de codificar. Confirmado: tamaños actuales de cada archivo, decisión A/B/C sobre ubicación del catálogo, y si el espejo PDF de los subtítulos cabe en cap 300 ln.
- [ ] Decisión tomada: ¿catálogo en `Constants/Asistencias/`, `Domain/Asistencia/` o dejar en PDF? Justificada.
- [ ] `EstadoAsistenciaColores.cs` creado con 6 códigos + Foreground/Background/Label/Orden + helper `ToArgbNoHash`.
- [ ] `AsistenciaPdfComposer.Colors.cs` refactorizado para leer del catálogo — facade pública (`ColorEstado`, `ColorEstadoBg`, `EstadosAsistencia`) intacta.
- [ ] `ExcelHelpers` extendido con `EscribirLeyendaEstados`, `FormatearMesAnio`, `FormatearRangoSemana` (nuevo archivo o partial si pasa 300 ln).
- [ ] Celdas de estado individual coloreadas en `AsistenciaExcelService.Estudiantes.cs`, `AsistenciaExcelService.Profesores.cs`, `ReporteAsistenciaProfesorExcelService.Tables.cs`.
- [ ] Leyenda invocada desde las hojas con estados individuales (reportes filtrados + reportes de profesor). NO en consolidados por salón.
- [ ] Subtítulos con nombres de mes en español aplicados a todos los services Excel de rango (mes/semana). El año queda simple `"AÑO {anio}"` — Chat 5B lo enriquece.
- [ ] Cap 300 ln respetado. Si algún archivo pasa, dividir en partial con responsabilidad nombrada (`ExcelHelpers.Leyenda.cs`, etc.).
- [ ] Tests nuevos: `EstadoAsistenciaColoresTests` + `ExcelHelpersLeyendaTests` + extensión de `AsistenciaExcelServiceTests` (color cells) + extensión de `ReporteAsistenciaConsolidadoExcelServiceTests` (subtítulo mes).
- [ ] `dotnet test` verde — todos los nuevos + 0 regresiones sobre los 930 baseline de Chat 4. Si se tocó el espejo PDF, incluir 1 test de que el PDF también renderiza el nombre del mes.
- [ ] Actualizar `.claude/plan/maestro.md` fila Plan 25: Chat 5A ✅ + Chat 5B ⏳. Estado del plan: `🟢 Re-abierto` mientras 5B esté pendiente, `✅ Cerrado` cuando ambos cierren.
- [ ] Commits separados por rol:
  - BE: `refactor(reports): Plan 25 Chat 5A — shared "EstadoAsistencia" color catalog`
  - BE: `feat(reports): Plan 25 Chat 5A — color coding + "leyenda" + Spanish month names in Excel`
  - FE (solo maestro): `docs(maestro): re-open Plan 25 — Chat 5A closed, Chat 5B pending`
- [ ] **Mover este archivo** a `educa-web/.claude/chats/closed/`:
  ```bash
  mv "educa-web/.claude/chats/006-plan-25-chat-5a-be-excel-colores-leyenda.md" \
     "educa-web/.claude/chats/closed/"
  ```

## COMMIT MESSAGE sugerido

Idioma **inglés**, modo imperativo. Español solo entre `"..."` para términos de dominio. **NO** incluir `Co-Authored-By` (regla explícita de la skill `commit`).

Backend (repo `Educa.API`, branch `master`) — refactor del catálogo:

```text
refactor(reports): Plan 25 Chat 5A — shared "EstadoAsistencia" color catalog

- Extract the "T"/"A"/"F"/"J"/"-"/"X" color catalog (foreground +
  background + label + display order) from
  "AsistenciaPdfComposer.Colors.cs" (partial class, PDF-only) to a
  new "Constants/Asistencias/EstadoAsistenciaColores.cs" — a single
  source of truth that both PDF ("QuestPDF") and Excel ("ClosedXML")
  can consume. Includes a "ToArgbNoHash" helper to convert "#506ad0"
  → "FF506AD0" for the ARGB format ClosedXML expects.
- "AsistenciaPdfComposer.Colors.cs" now reads from the shared
  catalog; the public facade ("ColorEstado", "ColorEstadoBg",
  "EstadosAsistencia") is preserved — zero breaking change for PDF
  consumers.
- Tests: "EstadoAsistenciaColoresTests" covers the 6 codes and the
  "ToArgbNoHash" conversion; 1 parity test verifies PDF and Excel
  resolve identical hex for "A"/"T"/"F"/"J"/"-".

Suite green: 930 baseline + N new, 0 regressions.
```

Backend — feature visual:

```text
feat(reports): Plan 25 Chat 5A — color coding + "leyenda" + Spanish month names in Excel

- Paint individual "Estado" cells ("A"/"T"/"F"/"J"/"-") with the
  same foreground + background hex the PDF uses, via
  "EstadoAsistenciaColores". Applies to "AsistenciaExcelService"
  (reporte filtrado — estudiantes + profesores) and
  "ReporteAsistenciaProfesorExcelService" (dia/mes/filtrado).
  Consolidated-by-salón sheets (counts, not states) are left
  uncoloured as before.
- Add an "EscribirLeyendaEstados" helper to "ExcelHelpers" that
  renders a horizontal "leyenda" row with 5 coloured badges + Spanish
  labels ("TARDANZA", "ASISTIÓ", "FALTA", "JUSTIFICADO",
  "PENDIENTE"), mirroring the PDF header leyenda.
- Rewrite Excel subtitles for monthly/weekly reports to use Spanish
  month names via "FormatearMesAnio"/"FormatearRangoSemana"
  ("ABRIL 2026" instead of "2026-04-01 a 2026-04-30"). The annual
  report keeps a simple "AÑO 2026" — Chat 5B will split it into
  "Verano"/"Regular".
- Cap 300-ln respected; "ExcelHelpers" split into partial
  "ExcelHelpers.Leyenda.cs" if needed.

Closes Plan 25 Chat 5A (visual parity — colors + legend + month names).
```

Frontend (repo `educa-web`, branch `main`) — solo maestro:

```text
docs(maestro): re-open Plan 25 — Chat 5A closed, Chat 5B pending

- Plan 25 Chat 5A ✅ — Excel reports now mirror the PDF colour
  scheme (states "T"/"A"/"F"/"J"/"-" painted + "leyenda" row added)
  and use Spanish month names in subtitles.
- Plan 25 Chat 5B ⏳ — pending: split the annual report into
  "Verano" (Ene-Feb) and "Regular" (Mar-Dic) periods, both in PDF
  and Excel. Design decision open (2 sheets/pages automatic vs.
  new "periodo" query param).
- Plan 25 state: 🟢 Re-opened. Will close at 100% when Chat 5B ships.
```

## CIERRE

Feedback breve a pedir al usuario tras cerrar:

- **Ubicación del catálogo** (A/B/C): ¿fue `Constants/Asistencias/` la elección correcta, o emergió algún motivo para moverlo a `Domain/`? Aprendizaje para futuros catálogos compartidos entre subsistemas de presentación.
- **Espejo PDF de los subtítulos**: ¿se alcanzó a tocar dentro de los 300 ln, o quedó para Chat 5B? Si quedó, verificar que Chat 5B lo tiene listado.
- **Ancho de la leyenda en Excel**: ¿los 5 badges entran en el ancho de la hoja sin forzar scroll? Si no, evaluar leyenda vertical (columna lateral) en Chat 5B.
- **Performance**: colorear celda por celda en reportes con 500+ filas ¿agrega latencia perceptible? Medir 1 reporte grande en pre-test de Chat 5B si se sospecha.
- **Consistencia con Capacitor/PWA**: ¿los Excel descargados desde la app móvil (Capacitor) se ven correctamente con colores? Test manual post-deploy — no bloqueante para cerrar Chat 5A.
- **Backlog siguiente**: ¿arrancamos Chat 5B inmediatamente o hay otro plan (Plan 22 F4.BE/F4.FE) que tenga mayor urgencia?
