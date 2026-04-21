> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo. Scope principal BE — si se decide exponer `periodo` como query param, el FE también recibe un touch menor (nuevo botón/selector en el menú consolidated anual). Decidir en pre-work.
> **Plan**: 25 · **Chat**: 5B · **Fase**: F5.B (división Verano/Regular del reporte anual + espejo PDF de subtítulos en español) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 25 Chat 5B — Reporte anual dividido Verano/Regular + espejo PDF de subtítulos

## PLAN FILE

- Maestro (fuente de verdad del orden): `educa-web/.claude/plan/maestro.md` → **Plan 25 — Paridad Excel para reportes PDF** → Chat 5B (cierre de la reapertura).
- Path relativo desde `Educa.API` (BE): `../../educa-web/.claude/plan/maestro.md`.
- Plan file dedicado NO existe. Al cerrar Chat 5B, Plan 25 pasa a ✅ 100% y se decide si vale extraer `.claude/plan/reportes-excel-paridad.md` como post-mortem consolidado (5 chats de reportes merecen una retrospectiva).
- **Reapertura del plan**: Plan 25 fue re-abierto en Chat 5A (2026-04-21). Este Chat 5B lo cierra — el estado pasa de `🟢 Re-abierto` a `✅ Cerrado`.
- Chats previos relevantes en `educa-web/.claude/chats/closed/`:
  - Chat 4 — BE `a2b36e8`, FE `6d19185` + `56b2617` (2026-04-21): docs §17 + INV-RE01/02/03 + 26 tests contract BE + 19 smoke tests FE.
  - Chat 5A — BE `aeb92bf` (refactor catálogo compartido) + `dc1604f` (feat: colores + leyenda + nombres de mes), FE `a49b4a5` (2026-04-21): paridad visual Excel ↔ PDF + nombres de mes en español, 986 tests verdes (+56 sobre baseline).

## OBJETIVO

Cerrar los dos pendientes documentados al terminar Chat 5A:

1. **División Verano/Regular del reporte anual consolidado**. Hoy `GenerarExcelTodosSalonesAnio` / `GenerarPdfTodosSalonesAnio` retornan un agregado único con datos mezclados de Verano (Ene-Feb) y Regular (Mar-Dic), que se evalúan con reglas distintas por INV-C01 (umbrales absolutos en regular vs. fórmula `inicio+delta` en verano). Mezclarlos hace que el reporte anual no sea interpretable operativamente.
2. **Espejo PDF de los subtítulos en español**. Chat 5A arregló los subtítulos en Excel (`"ABRIL 2026"`, `"Semana del lunes 20..."`) pero los PDF equivalentes siguen mostrando `"Del 01/04/2026 al 30/04/2026"`. Deuda diferida explícitamente en Chat 5A porque los PDF services ya están en 395 / 320 / 222 ln respectivamente y tocarlos aumenta el riesgo de rebasar el cap 300.

Con esto, Plan 25 cierra al 100% y se documenta la regla operativa completa.

## PRE-WORK OBLIGATORIO

Antes de codificar, confirmar el estado real post-Chat 5A y tomar **2 decisiones** que bloquean el diseño:

```bash
cd Educa.API

# 1. Git limpio + branch + último commit del Chat 5A
git status --short && git branch --show-current
git log --oneline -5   # Esperado: top = "feat(reports): Plan 25 Chat 5A — color coding + ..."

# 2. Tamaño actual de los PDF services (cap 300 ln — crítico para el espejo)
wc -l Educa.API/Services/Asistencias/ReporteAsistenciaConsolidadoPdfService.cs \
      Educa.API/Services/Asistencias/ReporteAsistenciaSalonPdfService.cs \
      Educa.API/Services/Asistencias/ReporteAsistenciaProfesorPdfService.cs \
      Educa.API/Services/Asistencias/ReporteAsistenciaProfesorPdfService.Tables.cs
# Post Chat 5A (último conocido): 395 / 320 / 222 / 280 ln respectivamente
# Si alguno sigue > 300 después de Chat 5A, este chat NO puede tocarlo sin
# dividir primero en partial. Listar archivos afectados antes de codificar.

# 3. Data services de verano/regular — ¿existe algo?
grep -rn "Verano\|verano\|regular\|Regular\|Enero\|Febrero" \
  Educa.API/Services/Asistencias/ReporteAsistenciaDataService.cs
# Esperado: 0 referencias — no hay separación hoy

# 4. INV-C01 reference en el backend
grep -rn "UMBRAL_\|FECHA_INICIO_REGISTRO\|EstadoAsistenciaCalculator" \
  Educa.API/Domain/Asistencia/
# Confirmar: hoy se calcula por fecha (regular/verano) pero el agregado
# anual no separa los totales.

# 5. Endpoint actual del consolidado anual (BE) y su consumidor FE
grep -n "anio\|anual" Educa.API/Controllers/Asistencias/ConsultaAsistenciaController.cs \
  Educa.API/Controllers/Sistema/ReportesAsistenciaController.cs | head -20
grep -rn "todosSalonesAnio\|TodosSalonesAnio\|getTodosSalonesAnio" \
  ../../educa-web/src/app/ | head -10
```

### Decisión 1 (bloquea diseño): formato de salida

| Opción | Descripción | Pros | Contras |
|---|---|---|---|
| **A** | 2 **hojas separadas** en el mismo xlsx (`"Verano"` + `"Regular"`), 2 **páginas separadas** en el mismo PDF. Un solo endpoint `/anio`. Siempre retorna ambos periodos. | Zero cambios en API, FE no toca. Usuario descarga 1 archivo y ve ambos periodos. | Reporte grande puede sentirse pesado. Un usuario que solo quiere Regular debe scrollear. |
| **B** | **Query param** `periodo=verano\|regular\|ambos` (default `ambos`). El BE retorna 1 hoja/página o 2 según el param. | Flexibilidad para el consumidor. FE puede ofrecer 3 botones si quiere. | Amplifica la superficie del API (14 endpoints → 14 + 3 variantes × 2 formatos = 20). Rompe INV-RE01 si no se hace simétrico. |
| **C** | **Sumatoria por periodo en la misma hoja/página**. Una hoja con columnas extras `% Verano` + `% Regular` + `% Global`; el PDF agrega un bloque de totales por periodo debajo del bloque actual. | Mínimo overhead visual. No parte la experiencia. | No separa los salones por periodo — mezcla datos calculados con reglas distintas en una sola fila. El usuario **aún** tiene que mentalizar la separación. |

**Recomendación inicial**: Opción A. Un solo endpoint, un solo archivo, 2 hojas/páginas con nombres explícitos (`"Resumen Verano (Ene-Feb)"` + `"Resumen Regular (Mar-Dic)"`). El subtítulo de cada hoja es `"REPORTE CONSOLIDADO ANUAL — VERANO 2026"` / `"REPORTE CONSOLIDADO ANUAL — REGULAR 2026"`. Cero cambios en API, cero touch en FE. El argumento contra (reporte grande) se mitiga por el hecho de que ya solo hay ~20 salones por sede.

**Decidir en pre-work con el usuario** antes de codificar.

### Decisión 2 (bloquea scope de archivos): espejo PDF de subtítulos

Depende del pre-work paso 2. Tres escenarios:

| Tamaño actual del PDF service | Acción |
|---|---|
| `ReporteAsistenciaConsolidadoPdfService` < 380 ln tras toque Chat 5A | Tocar directo — cabe el cambio de subtítulos (agrega ≤ 15 ln). |
| Está > 380 ln o el toque lo pondría > 300 | Dividir en partial `*.Subtitulos.cs` **antes** de agregar el cambio, para mantener el cap. |
| Ya está > 400 ln desde Chat 4 (sin tocarlo Chat 5A) | **Prioridad**: dividir primero la responsabilidad de subtítulos/header a un partial; luego agregar el cambio. Esto es deuda que este chat aprovecha para pagar. |

El service `ReporteAsistenciaConsolidadoPdfService` (395 ln al cerrar Chat 5A) es el candidato más riesgoso — probablemente requiera partial split para mantener el cap.

## ALCANCE

### 1. División Verano/Regular en `ReporteAsistenciaDataService`

El data service es la fuente común de datos para PDF + Excel. Dividirlo allí garantiza que ambos formatos consuman lo mismo (paridad estructural, INV-RE01).

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Asistencias/ReporteAsistenciaDataService.cs` | Agregar método `ObtenerDatosTodosSalonesAnioDividido(int sedeId, int anio) → AnioDivididoDto` (o equivalente). Internamente llama dos veces al agregado existente: una con rango `(Ene 1, Feb 28/29)` etiquetado `"Verano"`, otra con `(Mar 1, Dic 31)` etiquetado `"Regular"`. Retorna `AnioDivididoDto { Sede, Verano: List<ReporteAsistenciaRangoDto>, Regular: List<ReporteAsistenciaRangoDto>, TotalesCombinados: ... }`. |
| `Educa.API/DTOs/Asistencia/AnioDivididoDto.cs` (nuevo) | DTO con las 2 listas + totales. |

**Decisión de datos pendiente**: ¿salones que no existieron en Verano (secciones `"V"` nuevas del año) deben aparecer con datos vacíos en la hoja Verano o solo aparecer en Regular? Criterio lógico: solo aparecen donde tuvieron asistencia real. Confirmar en pre-work revisando cómo se consulta hoy el agregado anual.

### 2. Consumo desde Excel

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Excel/ReporteAsistenciaConsolidadoExcelService.cs` | `GenerarExcelTodosSalonesAnio` llama al método nuevo de `DataService`, luego genera **2 hojas** (`"Verano"` + `"Regular"`) vía el `AgregarHojaRango` existente. Cada hoja recibe su subtítulo (`"REPORTE CONSOLIDADO ANUAL — VERANO 2026"` / `"... — REGULAR 2026"`). El service pasa de ~209 ln → estimado ~220 ln. Dentro del cap. |

### 3. Consumo desde PDF

| Archivo | Cambio |
|---|---|
| `Educa.API/Services/Asistencias/ReporteAsistenciaConsolidadoPdfService.cs` | `GenerarPdfTodosSalonesAnio` llama al método nuevo de `DataService`, luego compone **2 páginas separadas** (page break explícito de QuestPDF) con el mismo layout actual. Subtítulos diferenciados. |

**Riesgo**: este archivo ya tiene 395 ln. El cambio puede forzar partial split. Estrategia:

- Si cabe (cambio ≤ 10 ln nuevas neto): tocar directo.
- Si no cabe: extraer `ReporteAsistenciaConsolidadoPdfService.AnualDividido.cs` como partial con el método `GenerarPdfTodosSalonesAnio` + helper `ComposePaginaPeriodo`.

### 4. Espejo PDF de subtítulos en español (deuda Chat 5A)

| Archivo | Cambio |
|---|---|
| `ReporteAsistenciaConsolidadoPdfService.cs` | Subtítulos `"REPORTE CONSOLIDADO MENSUAL — ABRIL 2026"`, `"... SEMANAL — Semana del lunes 20..."`. Consume `ExcelHelpers.FormatearMesAnio`/`FormatearRangoSemana` (¡tentación!) o mejor: promover esos helpers a un namespace compartido (ver aprendizaje transferible #1). |
| `ReporteAsistenciaSalonPdfService.cs` | Mismo tratamiento. |
| `ReporteAsistenciaProfesorPdfService.cs` + `.Tables.cs` | Mismo tratamiento para día (ya usa `dddd d de MMMM` — OK) + mes (falta `FormatearMesAnio`). |

### 5. Promoción de helpers de formato

Si se decide reusar `FormatearMesAnio` / `FormatearRangoSemana` en PDF, **no** importar `ExcelHelpers` desde `Services/Asistencias/` (rompe la separación Excel ↔ PDF). Dos opciones:

| Opción | Descripción |
|---|---|
| **Duplicar** los helpers en `AsistenciaPdfComposer.Format.cs` (3-4 líneas cada uno) | Zero acoplamiento, código se lee solo. |
| **Promover** a `Helpers/FechaFormatoHelper.cs` (nuevo namespace compartido) | DRY, consistencia garantizada, 1 solo punto de cambio. |

**Recomendación**: promover. Son helpers de dominio (nombres de mes en Perú), no de presentación. Mover desde `ExcelHelpers` a `Helpers/FechaFormatoHelper.cs` y dejar el delegate en `ExcelHelpers` como thin wrapper temporal.

### 6. Performance check (opcional, bajo esfuerzo)

| Archivo | Cambio |
|---|---|
| Nuevo test bench o medición manual | Medir latencia de `ReporteAsistenciaSalonExcelService.GenerarExcelAsistenciaMes` con 30 estudiantes × 22 días = 660 filas pintadas (caso real). Si > 500ms, evaluar caching del `XLColor` objects. Si < 500ms, documentar y pasar. |

**Criterio**: no optimizar sin evidencia. Si nadie lo reporta como lento en uso real, no invertir esfuerzo.

### 7. Smoke test Capacitor (opcional, post-deploy)

Deuda desde Chat 5A: verificar que los Excel descargados desde la app Capacitor Android se abren correctamente con colores (no es código, es verificación manual). Documentar resultado en el feedback de cierre.

## TESTS MÍNIMOS

Tests a nivel de service (xUnit + FluentAssertions + ClosedXML), consistentes con patrón Chat 1–4.

| Archivo | Tests | Input → Resultado |
|---|---|---|
| `Tests/Services/Asistencias/ReporteAsistenciaDataServiceAnualTests.cs` (nuevo o extensión) | 2 | `ObtenerDatosTodosSalonesAnioDividido(1, 2026)` con datos en Ene + Abr → retorna 2 listas no vacías · Año sin datos de Verano → Verano vacío + Regular con data |
| `Tests/Services/Excel/ReporteAsistenciaConsolidadoExcelServiceAnualTests.cs` (nuevo o extensión) | 2 | Reporte anual → workbook tiene **2 hojas** (`"Verano"` + `"Regular"`) · Subtítulo de cada hoja contiene `"VERANO"` / `"REGULAR"` respectivamente |
| `Tests/Services/Asistencias/ReporteAsistenciaConsolidadoPdfServiceAnualTests.cs` (nuevo o extensión) | 1 | PDF anual tiene ≥ 2 páginas (page break entre Verano y Regular) |
| `Tests/Services/Asistencias/ReportePdfSubtitulosTests.cs` (nuevo) | 3 | PDF consolidado mensual contiene `"ABRIL 2026"` · PDF consolidado semanal contiene `"Semana del"` + nombre de día en español · PDF profesor mes contiene `"ABRIL 2026"` |
| `Tests/Helpers/FechaFormatoHelperTests.cs` (si se promueve) | 2 | Paridad con tests de Chat 5A — `FormatearMesAnio(4, 2026) == "ABRIL 2026"`, `FormatearRangoSemana(new DateTime(2026, 4, 20))` contiene `"abril"` |

**Sin regresiones sobre baseline Chat 5A**: `dotnet test` debe cerrar con ≥ 986 (baseline) + N nuevos, 0 fallos.

## REGLAS OBLIGATORIAS

- **INV-RE01**: el reporte anual mantiene paridad PDF ↔ Excel. Si Excel tiene 2 hojas, PDF debe tener 2 páginas. Si se agrega `periodo=` query param en BE, debe existir tanto para `/pdf` como para `/excel` (el test `*ExcelEndpointTests` lo verifica estructuralmente).
- **INV-C01** (contexto, no se toca): los umbrales absolutos de regular (07:46 estudiante / 07:31 profesor) vs. la fórmula `inicio+delta` de verano son reglas de dominio. El cálculo se hace en `EstadoAsistenciaCalculator` (Domain) — este chat **solo separa el agregado**, no modifica las reglas.
- **Cap 300 ln** por archivo `.cs`. Si `ReporteAsistenciaConsolidadoPdfService.cs` (395 ln post-Chat 5A) requiere toque y el cambio lo mantiene > 300, dividir en partial con responsabilidad nombrada (`*.AnualDividido.cs` o `*.Subtitulos.cs`) — nunca partirlo "a la mitad" sin nombre.
- **`backend.md` §Logging**: structured logging con placeholders (`LogInformation("Reporte anual dividido sede={Sede}", sedeId)`).
- **`testing.md`**: xUnit + FluentAssertions + Moq. `ClosedXML` para abrir xlsx, `QuestPDF` internal API o inspección de bytes para PDF (los tests de Chat 4 no inspeccionaron PDF internamente — fue contract puro. Aquí es razonable inspeccionar solo page count + presencia de texto si no requiere infraestructura pesada).
- **`code-language.md`**: código/tests en inglés; labels visibles al usuario en español (`"VERANO 2026"`, `"REGULAR 2026"`).
- **`git.md`**: separar commits por rol semántico:
  - 1 `refactor(reports)` si se promueve el helper `FechaFormatoHelper` (no es cambio funcional, solo movimiento).
  - 1 `feat(reports)` para la división Verano/Regular (cambio funcional en Excel + PDF).
  - 1 `feat(reports)` o `fix(reports)` para el espejo PDF de subtítulos en español (cambio funcional visual).
  - Decidir según scope final — si los 3 caben en 2 commits claros mejor que en 3.
- **NO tocar**: endpoints BE ya cerrados (sus firmas), DTOs del data service (solo agregar nuevos), regla de negocio de cálculo de estado, menús FE (salvo que se adopte Opción B del Decisión 1).
- **Commit style**: skill `commit` prohíbe `Co-Authored-By`. Mensaje en inglés, español solo entre comillas para términos de dominio (`"Verano"`, `"Regular"`, `"periodo"`, `"AnioDividido"`).

## APRENDIZAJES TRANSFERIBLES (del Chat 5A)

1. **`FormatearMesAnio` / `FormatearRangoSemana` ya existen en `ExcelHelpers`** (Chat 5A). Si se promocionan a `FechaFormatoHelper` compartido, el cambio es mecánico: mover + re-apuntar `ExcelHelpers` a llamar al nuevo helper como fachada delgada. Los 8 tests de Chat 5A cubren el contrato — mover los tests también al nuevo namespace.
2. **`EstadoAsistenciaColores` (catálogo compartido)** está en `Constants/Asistencias/`. Si este chat necesita un color propio para los dos periodos (ej: badge azul para Verano, verde para Regular), agregarlo allí como `PeriodoAsistenciaColores` separado — no mezclar con los estados.
3. **`InternalsVisibleTo("Educa.API.Tests")`** ya está configurado en el csproj (Chat 5A) — los tests pueden tocar internals del API sin fricción.
4. **`AsistenciaExcelServiceTestFactory`** provee `BaseDto()`, `CrearSalon()`, etc. — reutilizar en los tests nuevos.
5. **Pattern de extension point en data services**: el data service hoy tiene `ObtenerDatosTodosSalonesDia/Semana/Mes/Anio`. El método nuevo `ObtenerDatosTodosSalonesAnioDividido` sigue el mismo pattern — tupla `(sede, listas)` o DTO dedicado, consistente con lo existente.
6. **Los `*.Tables.cs` partials** (Chat 2) son la convención para layout de hojas — el método `AgregarHojaRango` es genérico y puede reusarse tal cual para ambas hojas Verano/Regular, solo cambia el subtítulo que se le pasa.
7. **`AsistenciaPdfColoresParidadTests` (Chat 5A)** previene drift PDF↔catálogo con 15 tests. Si este chat mueve helpers de fecha a un espacio compartido, crear un `AsistenciaFechaFormatoParidadTests` equivalente que pin el contrato PDF↔Excel↔Helper.
8. **Cap 300 ln — deuda pre-existente en PDF services**: `ReporteAsistenciaConsolidadoPdfService` estaba en 395 ln desde antes de Chat 5A. Chat 5A NO lo tocó justamente por ese riesgo. Este chat lo tiene que tocar — ideal aprovechar para dividir en partials y pagar la deuda.
9. **QuestPDF `PageBreak`**: para la separación Verano/Regular en PDF, usar `page.Item().PageBreak()` o dos secciones `Container.Section`. Sintaxis en la doc de QuestPDF — validar en pre-work si se usa en otros services del proyecto.
10. **Tests de PDF son caros** (Chat 4 decidió NO hacer WebApplicationFactory). Para inspeccionar páginas internas, considerar dumpear a PNG + OCR solo si es estrictamente necesario; alternativa: inspeccionar el byte stream buscando `%%EOF` y contando `/Page` entries.

## FUERA DE ALCANCE

- **Tocar el cálculo de estado** (INV-C01 — `EstadoAsistenciaCalculator`): no se modifica. Los umbrales de regular vs. verano siguen vigentes. Solo cambia cómo se **agrega** el reporte, no cómo se **calculan** los estados individuales.
- **Agregar nuevos endpoints** salvo que Decisión 1 adopte Opción B (query param `periodo=`). Si se adopta A o C, la superficie del API no cambia.
- **Filtros avanzados en el reporte anual** (ej: filtrar solo un grado): fuera de scope. Plan separado si se pide.
- **Migrar el FE a mostrar 2 botones separados** Verano/Regular: fuera de scope salvo Opción B.
- **Refactor de `ExcelHelpers` a múltiples archivos**: solo dividir si el cap 300 se compromete. Hoy está en 212 ln — hay margen.
- **Feature flag para activar/desactivar la división**: innecesario. El cambio es aditivo y si el usuario prefiere ver todo junto, puede combinar las hojas en su Excel.
- **Documentación extensa del endpoint**: el Swagger/OpenAPI auto-generado cubre. Si se agrega query param, documentar 1 línea en el XML comment del controller.
- **Plan 22 F4.BE/F4.FE**: chat aparte, no se mezcla con Plan 25.
- **Abstracción genérica `PdfBuilderService` (Plan 2/C.2)**: diferida desde Chat 1 del Plan 25. Seguir sin tocar — el caso actual no la justifica aún.

## CRITERIOS DE CIERRE

- [ ] Pre-work ejecutado y output compartido con el usuario antes de codificar. Confirmados: tamaños actuales de PDF services, Decisión 1 (formato de salida), Decisión 2 (si requiere partial split), si se promueve `FechaFormatoHelper` compartido.
- [ ] **Decisión 1 tomada**: Opción A (2 hojas/2 páginas), B (query param) o C (sumatoria en 1 hoja). Justificada y documentada en el commit message.
- [ ] **Decisión 2 tomada**: helpers de fecha duplicados vs. promovidos a `FechaFormatoHelper`. Justificada.
- [ ] `AnioDivididoDto` (o equivalente) creado con 2 listas + totales opcionales.
- [ ] `ReporteAsistenciaDataService` extendido con el método que retorna ambos periodos consumiendo la lógica existente (no duplica cálculo).
- [ ] `ReporteAsistenciaConsolidadoExcelService.GenerarExcelTodosSalonesAnio` genera 2 hojas con subtítulos diferenciados (`"... VERANO 2026"` / `"... REGULAR 2026"`).
- [ ] `ReporteAsistenciaConsolidadoPdfService.GenerarPdfTodosSalonesAnio` genera 2 páginas con subtítulos diferenciados. Si fue necesario partial split del service, documentar.
- [ ] Subtítulos PDF en español aplicados a `ReporteAsistenciaConsolidadoPdfService` (mensual, semanal), `ReporteAsistenciaSalonPdfService`, `ReporteAsistenciaProfesorPdfService` (mes).
- [ ] Cap 300 ln respetado en todos los archivos tocados. Si hubo partial split, partial tiene responsabilidad nombrada.
- [ ] Tests nuevos: data service dividido + Excel 2 hojas + PDF 2 páginas + subtítulos PDF en español. Opcionalmente helper promovido.
- [ ] `dotnet test` verde: ≥ 986 baseline + N nuevos, 0 regresiones. Si se promovió helper, los 8 tests de Chat 5A siguen pasando (ahora apuntan al nuevo namespace).
- [ ] Actualizar `.claude/plan/maestro.md` fila Plan 25: Chat 5B ✅. Estado del plan: `✅ Cerrado` (de `🟢 Re-abierto`).
- [ ] Si Decisión 1 fue Opción B: FE recibe touch para ofrecer selector `periodo`. En ese caso, commit FE separado y actualizar maestro con referencia a ambos commits.
- [ ] Commits separados por rol:
  - BE (si promueve helper): `refactor(reports): Plan 25 Chat 5B — promote Spanish date formatters to shared helper`
  - BE: `feat(reports): Plan 25 Chat 5B — split annual report into "Verano"/"Regular" periods`
  - BE: `feat(reports): Plan 25 Chat 5B — Spanish month names in PDF subtitles`
  - FE (si aplica): `feat(reports): Plan 25 Chat 5B — annual report "periodo" selector`
  - FE (maestro): `docs(maestro): close Plan 25 — Chat 5B shipped, plan 100% complete`
- [ ] Feedback manual Capacitor: verificar Excel descargado en app Android abre con colores correctamente (deuda Chat 5A). No bloqueante para cerrar.
- [ ] **Mover este archivo** a `educa-web/.claude/chats/closed/`:
  ```bash
  mv "educa-web/.claude/chats/007-plan-25-chat-5b-be-anual-verano-regular.md" \
     "educa-web/.claude/chats/closed/"
  ```

## COMMIT MESSAGE sugerido

Idioma **inglés**, modo imperativo. Español solo entre `"..."` para términos de dominio. **NO** incluir `Co-Authored-By` (regla explícita de la skill `commit`).

Backend (repo `Educa.API`, branch `master`) — división Verano/Regular (commit principal):

```text
feat(reports): Plan 25 Chat 5B — split annual report into "Verano"/"Regular" periods

- The annual consolidated report ("GenerarExcelTodosSalonesAnio" +
  "GenerarPdfTodosSalonesAnio") now separates data into "Verano"
  (Ene-Feb, summer) and "Regular" (Mar-Dic) periods, which are
  evaluated with different rules per INV-C01 (absolute thresholds
  vs. "inicio+delta" formula). Mixing them in a single aggregate
  was operationally misleading.
- Excel: 2 sheets ("Verano" + "Regular") with differentiated
  subtitles. Zero API change; FE unchanged.
- PDF: 2 pages with explicit "PageBreak" between periods. Same
  layout per period as before.
- New "ObtenerDatosTodosSalonesAnioDividido" method in
  "ReporteAsistenciaDataService" — reuses existing aggregation
  logic, called twice with the two date ranges. No duplication
  of calculation rules.
- New "AnioDivididoDto" shared between PDF + Excel.
- Tests: 2 data service + 2 Excel + 1 PDF covering the split.

Suite green: 986 baseline + N new, 0 regressions.
```

Backend — espejo PDF de subtítulos:

```text
feat(reports): Plan 25 Chat 5B — Spanish month names in PDF subtitles

- Rewrite PDF subtitles to use Spanish month names via
  "FechaFormatoHelper" (shared with Excel since Plan 25 Chat 5A).
  "ReporteAsistenciaConsolidadoPdfService" (monthly, weekly),
  "ReporteAsistenciaSalonPdfService" and
  "ReporteAsistenciaProfesorPdfService" now show "ABRIL 2026"
  instead of "Del 01/04/2026 al 30/04/2026".
- Closes visual parity deferred from Chat 5A: Excel and PDF now
  use identical Spanish date formatting.
- Cap 300-ln respected; "ReporteAsistenciaConsolidadoPdfService"
  split into partial "*.Subtitulos.cs" where necessary (pre-existing
  debt from Chat 4).

Closes Plan 25 Chat 5B (annual split + Spanish PDF subtitles).
```

Backend (si se promueve helper) — refactor previo:

```text
refactor(reports): Plan 25 Chat 5B — promote Spanish date formatters to shared helper

- Move "FormatearMesAnio" and "FormatearRangoSemana" from
  "ExcelHelpers" (Chat 5A) to a new "Helpers/FechaFormatoHelper.cs"
  so PDF services ("QuestPDF") can consume them without coupling
  to the Excel namespace. "ExcelHelpers" keeps thin delegates
  for backwards compatibility and existing tests.
- Prepares the ground for the PDF subtitle fix in the next commit
  (Plan 25 Chat 5B — espejo PDF de subtítulos en español).

Zero behavioural change; 8 helper tests from Chat 5A still green.
```

Frontend (repo `educa-web`, branch `main`) — solo maestro:

```text
docs(maestro): close Plan 25 — Chat 5B shipped, plan 100% complete

- Plan 25 Chat 5B ✅ — annual consolidated report now splits into
  "Verano" (Ene-Feb) and "Regular" (Mar-Dic) periods in both PDF
  and Excel (2 sheets / 2 pages). PDF subtitles finally use
  Spanish month names (deferred from Chat 5A).
- Plan 25 state: ✅ **Closed** (from 🟢 Re-opened). 6 of 6 chats
  shipped across 2 weeks:
  - Chat 1 — ClosedXML + first Excel parity
  - Chat 2 — 4 remaining reports to Excel
  - Chat 3 — UI dual PDF/Excel
  - Chat 4 — Docs + paridad contract tests
  - Chat 5A — Visual parity (colors + legend + Spanish months)
  - Chat 5B — Annual split + PDF Spanish subtitles
- Rule §17 "Reportes exportables — paridad de formatos" active;
  invariantes INV-RE01/02/03 enforced by contract tests.
```

## CIERRE

Feedback breve a pedir al usuario tras cerrar:

- **Decisión de formato (A/B/C) tomada**: ¿la Opción A (2 hojas/2 páginas) fue suficiente o el usuario ya pidió el query param `periodo`? Aprendizaje para balancear simplicidad vs. flexibilidad en futuros reportes con sub-periodos.
- **Partial split de `ReporteAsistenciaConsolidadoPdfService`**: ¿fue necesario? Si sí, ¿el nombre del partial (`*.AnualDividido.cs` / `*.Subtitulos.cs`) se lee claro o hay mejor naming? Deuda pagada vs. diferida.
- **Helper promocionado `FechaFormatoHelper`**: ¿se hizo? Si no, ¿el motivo (duplicación tolerable) resultó cierto? Decisión transferible para futuros pairs PDF↔Excel.
- **Performance**: colorear celdas en reportes grandes (500+ filas) ¿agregó latencia perceptible? Si sí, documentar en deuda futura.
- **Capacitor Excel con colores**: test manual post-deploy exitoso? Si falló, abrir chat aparte para investigar.
- **Plan 25 cerrado**: ¿vale extraer un post-mortem `.claude/plan/reportes-excel-paridad.md` con los 6 chats? ¿O dejar todo inline en maestro? Decisión de organización documental.
- **Backlog siguiente**: con Plan 25 cerrado, ¿Plan 22 F4.BE/F4.FE es la próxima prioridad o surgió otro plan más urgente?
