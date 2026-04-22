> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 27 · **Chat**: 3 · **Fase**: `/execute` BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 27 Chat 3 — `/execute` BE — Reportes PDF/Excel de asistencia con filtro por grado + tests

## PLAN FILE

**Maestro**: `educa-web/.claude/plan/maestro.md` § "🔴 Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria en adelante)".

Path desde el repo destino:

- Desde `Educa.API`: `../../educa-web/.claude/plan/maestro.md`

Secciones relevantes del maestro:

- "Plan de ejecución (confirmado post-Chat 1)" — fila **Chat 3** (este chat).
- "Invariantes a formalizar en Chat 5" — `INV-C11` (este chat lo aplica en reportes; Chat 5 lo documenta formalmente en `business-rules.md §15.4`).
- "Decisiones tomadas en Chat 1 (`/design` ✅ 2026-04-22)" — **decisión 7** ("filtrar uniforme en reportes históricos") y **decisión 3** ("nota en PDF/Excel: `Datos filtrados: GRA_Orden ≥ 8`").

Chat anterior (Chat 2 `/execute` BE): `educa-web/.claude/chats/closed/017-plan-27-chat-2-be-filtro-grado-asistencia-diaria.md`.

Referencias de dominio:

- `business-rules.md §17` + `INV-RE01/02/03` — paridad PDF/Excel (Plan 25). Todo endpoint PDF tiene mirror Excel; ambos consumen el **mismo** data service.
- `backend.md` — "Cómo dividir un service > 300 líneas" (aplica si al agregar nota un reporte cruza el cap).

## OBJETIVO

Aplicar el filtro `GRA_Orden >= 8` de forma **uniforme** en todos los services de reportes PDF/Excel de asistencia diaria, y agregar una **nota visible en el header** de cada reporte: *"Datos filtrados: GRA_Orden ≥ 8 (Plan 27 · INV-C11)"*. Respetar `INV-RE01/02/03` (paridad PDF/Excel). Complementar con **15-20 tests** que auditen el invariante `INV-C11` y el respeto a `INV-D09` (soft-delete en `EstudianteSalon`).

## PRE-WORK OBLIGATORIO

### 1. Auditar qué services de reporte existen (solo leer, no tocar)

Los 6 services identificados en el maestro (§ "Cómo dividir"):

| Service | Líneas aprox. | Tipo |
|---------|--------------|------|
| `Services/Asistencias/ReporteFiltradoAsistenciaService.cs` | 441 | PDF |
| `Services/Asistencias/ReporteFiltradoPdfService.cs` | 425 | PDF |
| `Services/Asistencias/ReporteAsistenciaDataService.cs` | 396 | **Data (compartido)** |
| `Services/Asistencias/ReporteAsistenciaConsolidadoPdfService.cs` | 389 | PDF |
| `Services/Academico/BoletaNotasPdfService.cs` | 381 | **PDF boleta notas (NO asistencia)** |
| `Services/Asistencias/ReporteAsistenciaSalonPdfService.cs` | 314 | PDF |

Y los 4 services Excel paralelos (paridad INV-RE01):

| Service | Tipo |
|---------|------|
| `Services/Excel/ReporteAsistenciaSalonExcelService.cs` | Excel |
| `Services/Excel/ReporteAsistenciaProfesorExcelService.cs` | Excel (profesor — revisar si aplica) |
| `Services/Excel/ReporteAsistenciaConsolidadoExcelService.cs` | Excel |
| `Services/Asistencias/ReporteFiltradoProfesoresService.cs` | PDF+Excel profesores (revisar si aplica) |

**Importante**: `BoletaNotasPdfService` es de **calificaciones**, NO de asistencia — Plan 27 NO lo toca (decisión original "solo asistencia diaria"). Confirmar al abrir el chat que NO entra en scope.

Los services de **profesores** (`ReporteAsistenciaProfesor*`, `ReporteFiltradoProfesoresService`) operan sobre `TipoPersona='P'` — **NO aplicar filtro de grado** (profesores no tienen `GRA_Orden`). Sí agregar la nota si el reporte combina estudiantes+profesores (confirmar al leer cada uno).

### 2. Verificar que los data services consuman el repo filtrado

El Chat 2 ya aplicó filtro `GRA_Orden >= 8` en:

- `ConsultaAsistenciaRepository.ObtenerEstudiantesReporteAsync`
- `ConsultaAsistenciaRepository.ObtenerEstadisticasDiaRawAsync`
- `ConsultaAsistenciaRepository.ObtenerSalonesSedeAsync` (NO tocado aún — revisar si algún reporte lo usa).
- `AsistenciaAdminQueryRepository.ListarEstudiantesDelDiaAsync`
- `AsistenciaAdminQueryRepository.CalcularEstadisticasDelDiaAsync`

**Verificar en Chat 3**: qué data services/queries alimentan cada reporte. Si un reporte usa una query NO filtrada en Chat 2, hay que extender el filtro ahí también.

Queries candidatas a revisar (en `ConsultaAsistenciaRepository`):

- `ObtenerAsistenciasEstudianteAsync` — un solo estudiante (no tocar).
- `ObtenerEstudiantesPorGradoConAsistenciasAsync` — recibe grado explícito (no tocar en chat 2; si admin elige grado < 8 la UI chat 4 lo bloquea).
- `ObtenerSalonesSedeAsync` — lista de salones. **Revisar**: si algún reporte lo usa para enumerar salones, filtrar `GRA_Orden >= 8`.
- `GetAsistenciaProfesorAsync`, `ListarProfesoresPorFechaRangoAsync`, `ObtenerProfesoresSedeAsync` — profesores, no tocar.

### 3. Mostrar al usuario y confirmar antes de codificar

```text
[ ] Auditoría de services de reporte completa (listados arriba confirmados).
[ ] Confirmar: "BoletaNotasPdfService" SE EXCLUYE (no es asistencia, no aplica INV-C11).
[ ] Confirmar: reportes de "Profesor" NO filtran por GRA_Orden (tienen nota genérica "Profesores no sujetos a filtro de grado").
[ ] Git status limpio en Educa.API (sin WIP de Chat 2 pendiente).
[ ] Branch: master.
```

## ALCANCE

### Archivos a modificar (BE)

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `Services/Asistencias/ReporteFiltradoAsistenciaService.cs` | Verificar que use query filtrada de `ConsultaAsistenciaRepository`; agregar nota en header PDF | +5-10 |
| `Services/Asistencias/ReporteFiltradoPdfService.cs` | Idem (agregar nota) | +5-10 |
| `Services/Asistencias/ReporteAsistenciaDataService.cs` | **Service central** — confirmar que el agregado respeta el filtro. Agregar config `MostrarNotaPlan27 = true` si el DTO de header lo soporta | +5-10 |
| `Services/Asistencias/ReporteAsistenciaConsolidadoPdfService.cs` | Nota en header | +5 |
| `Services/Asistencias/ReporteAsistenciaSalonPdfService.cs` | Nota en header | +5 |
| `Services/Excel/ReporteAsistenciaSalonExcelService.cs` | Misma nota en header Excel (fila A1 o celda dedicada) | +5-10 |
| `Services/Excel/ReporteAsistenciaConsolidadoExcelService.cs` | Idem | +5-10 |
| `Services/Asistencias/ReporteFiltradoProfesoresService.cs` | **Revisar**: si genera reporte con estudiantes, agregar filtro; si es solo profesores, agregar nota genérica | +5-15 |
| `Services/Excel/ReporteAsistenciaProfesorExcelService.cs` | **Revisar**: profesores = no filtrar; solo nota si genera mixto | +5 |

**Texto exacto de la nota** (decisión 3 Chat 1, consensuado):

```text
"Datos filtrados: GRA_Orden ≥ 8 (5to Primaria en adelante). Plan 27 · INV-C11."
```

Posición sugerida:

- PDF: párrafo entre el título y el cuerpo, en gris oscuro (`#4B5563`), cursiva, tamaño 10pt.
- Excel: fila A1 merged sobre las columnas visibles, bold, fondo `--blue-100` (#DBEAFE), texto `--blue-800` (#1E40AF).

**Constante compartida**: considerar mover el texto a `Constants/Asistencias/AsistenciaGrados.cs` como `NotaReportePlan27` (cap 300 líneas permite, solo son 5-10 líneas extra).

### Tests a agregar (BE)

Mínimo **15 tests**, target **20**. Baseline post-Chat 2 (commit `171ca74`): **1133 tests verdes**.

| Archivo | Tests |
|---------|-------|
| `Educa.API.Tests/Services/Asistencias/ReporteFiltradoAsistenciaServiceTests.cs` (si existe, si no crear) | +3-4: universo filtrado por grado; combinación grado=3ro retorna vacío; salón mixto solo muestra 5to+ |
| `Educa.API.Tests/Services/Asistencias/ReporteAsistenciaConsolidadoServiceTests.cs` (si existe) | +2-3: reporte consolidado respeta filtro; totales excluyen grados bajos |
| `Educa.API.Tests/Repositories/Asistencias/AsistenciaRepositoryPlan27Tests.cs` | +5-7: tests adicionales sobre `ObtenerEstudiantesReporteAsync`, `ObtenerEstadisticasDiaRawAsync`, `AsistenciaAdminQueryRepository.ListarEstudiantesDelDiaAsync`, `CalcularEstadisticasDelDiaAsync`. Validar INV-D09 (soft-delete en `EstudianteSalon`) en cada uno |
| `Educa.API.Tests/Services/Excel/ReporteAsistenciaConsolidadoExcelServiceTests.cs` (si existe) | +2: header con nota Plan 27 presente; data filtrada |

**Pattern EF InMemory** ya funciona en `AsistenciaRepositoryPlan27Tests.cs` — reusar el seed base (`Rv()` para `RowVersion`, `ApplicationDbContext(options, null)` para skipear value converters).

## TESTS MÍNIMOS (casos input → output)

| Caso | Input | Resultado esperado |
|------|-------|---------------------|
| Reporte consolidado de sede con 15 estudiantes (5 en 3ro Primaria, 10 en 5to+) | `GET /api/consultaasistencia/reporte-consolidado/pdf?sedeId=1&fecha=2026-04-22` | PDF con **10 filas** (solo GRA_Orden ≥ 8). Header contiene texto "Datos filtrados: GRA_Orden ≥ 8" |
| Reporte filtrado admin día con filtro grado="3ro Primaria" | `POST /api/consultaasistencia/reporte-filtrado/pdf` con `grado="3ro Primaria"` | Retorna PDF con **lista vacía** (filtro admin choca con Plan 27) + mensaje "sin resultados" |
| Reporte Excel consolidado | `GET /api/consultaasistencia/reporte-consolidado/excel?sedeId=1` | Excel con fila 1 = header Plan 27, fila 2+ = datos filtrados. Content-type correcto |
| Repo `ObtenerEstudiantesReporteAsync` con mix E5+E10 | Llamada directa al repo | Solo retorna estudiantes de `GRA_Orden >= 8` |
| Repo con estudiante soft-deleted en `EstudianteSalon` | Llamada directa | No aparece (INV-D09) |
| Repo consolidado con estudiante sin salón activo | Llamada directa | No aparece (ni como `GRA_Orden=null` ni nada) |
| Reporte de **profesores** (no asistencia diaria estudiante) | `GET /api/consultaasistencia/reporte-profesores/pdf` | **NO filtra**. Header muestra nota genérica "Profesores no sujetos a filtro de grado" o no muestra nota Plan 27 |

## REGLAS OBLIGATORIAS

Backend — aplicables al código generado:

- **INV-C11** (este chat lo aplica en reportes) — el filtro `GRA_Orden >= 8` va a nivel data service / repository, NO a nivel controller. El reporte NO debe recibir datos no filtrados y luego filtrar en memoria.
- **INV-RE01 / INV-RE02 / INV-RE03** (paridad PDF/Excel, Plan 25) — ambos endpoints `/pdf` y `/excel` deben aplicar el mismo filtro y mostrar la misma nota. Si un reporte solo tiene PDF (sin Excel mirror), es violación pre-existente — documentarlo pero NO arreglar en este chat.
- **INV-D09** (soft-delete en tablas de relación) — `EstudianteSalon` debe filtrarse por `ESS_Estado = 1`. Revisar cada query nueva/modificada respete esto. Los tests del repo DEBEN validarlo.
- **INV-S07** (fire-and-forget notificaciones) — no aplica a reportes, pero NO introducir efectos colaterales (ej: no loggear warnings cuando no hay resultados).
- **Cap 300 líneas por archivo** (`backend.md`) — si al agregar nota un service supera 300 líneas, **dividir por responsabilidad** (config + builder). Ver sección "Cómo dividir un service > 300 líneas" en `backend.md`.
- **AsNoTracking()** en todas las queries read-only nuevas/modificadas.
- **ApiResponse<T>** no cambia (reportes retornan `File(...)` directo — es el patrón actual, no tocarlo).
- **Structured logging** — placeholders `{Grado}`, `{GraOrden}`, `{Fecha}`, no string interpolation.
- **NUNCA DNI completo en logs** — usar `DniHelper.Mask()` si aparece en body del reporte o en logs.
- **Tests deben correr verdes antes de commit** — baseline 1133 → target ~1150.

## APRENDIZAJES TRANSFERIBLES (del Chat 2)

### 1. Constante y texto

La constante vive en `Educa.API/Constants/Asistencias/AsistenciaGrados.cs`:

```csharp
public const int UmbralGradoAsistenciaDiaria = 8;
```

**Importante**: el nombre final fue `UmbralGradoAsistenciaDiaria` (PascalCase), NO `UMBRAL_GRADO_ASISTENCIA_DIARIA` como estaba en el prompt del Chat 2 — seguí la convención C# existente (`UmbralEntradaSalidaHora` en `AsistenciaHorarios.cs`). Al agregar `NotaReportePlan27`, usar el mismo PascalCase.

### 2. Filtros aplicados en Chat 2 (queries YA filtradas)

Repo `ConsultaAsistenciaRepository` — los siguientes métodos YA filtran `GRA_Orden >= 8`:

- `ObtenerEstudiantesReporteAsync(sedeId, fecha, grado, seccion)` — filtro en WHERE principal.
- `ObtenerEstadisticasDiaRawAsync(sedeId, fecha)` — filtro via join con `Grado`.

Repo `AsistenciaAdminQueryRepository`:

- `ListarEstudiantesDelDiaAsync` — subquery `EstudianteSalon.Any(...)`.
- `CalcularEstadisticasDelDiaAsync` — subquery similar con `TipoPersona != 'E' || ...`.

Repo `AsistenciaRepository` (nuevo método para webhook):

- `GetGraOrdenEstudianteActivoAsync(estudianteId)` — null si sin salón activo.

### 3. Patrón de tests de repo con EF InMemory

`AsistenciaRepositoryPlan27Tests.cs` (Chat 2) establece el patrón:

- `ApplicationDbContext(options, null)` — con `IDniEncryptionService = null` para desactivar los value converters de DNI/contraseña.
- `SeedBaseData()` con `Rv()` helper que devuelve `new byte[] { 0, 0, 0, 0, 0, 0, 0, 1 }` para `RowVersion` (InMemory no autogenera).
- Entidades con `[Timestamp]`: Sede, Seccion, Grado, Salon, Estudiante → requieren `*_RowVersion` seteado.
- `EstudianteSalon` NO tiene `[Timestamp]` — no requiere RowVersion.

Reusar este pattern para extender tests de `AsistenciaAdminQueryRepository` y los tests de services si es factible sin proyecciones con `NombreHelper.NombreCompletoSql` (esa DbFunction no funciona en InMemory).

### 4. Services de reporte ya existentes — no bajé al detalle

El Chat 2 NO tocó los services de reporte — solo los repos. Los 6 services PDF + 4 Excel siguen intactos. Este chat (Chat 3) los examina por primera vez. Revisar:

- Dónde consumen cada service las queries modificadas.
- Cómo renderizan el header actual (hay un patrón común o cada uno lo hace ad-hoc).
- Si ya hay un `PdfBuilderService` compartido que puede recibir la nota como parámetro genérico.

### 5. Regresión lateral conocida (mantener NO TOCAR)

Plan 22: regresión de correos `ASISTENCIA_PROFESOR` detectada 2026-04-22. Sigue abierta, es tema aparte. Si los tests de reportes-profesor disparan algo relacionado, anotar pero **no corregir** aquí.

### 6. Paridad PDF/Excel (INV-RE01/02/03) no es negociable

Si un reporte solo tiene endpoint `/pdf` sin `/excel`, es violación pre-existente de INV-RE01 (Plan 25). **NO** corregir violaciones pre-existentes en este chat — documentar en el maestro para un chat futuro. Plan 27 Chat 3 solo aplica filtro donde ya hay paridad.

### 7. Baseline de tests

- Chat 2 commit BE: `2738eaf` → 1130 tests.
- Chat 2 commit BE extra (repo tests): `171ca74` → 1133 tests.
- Target Chat 3: **~1150 tests verdes** (+15-17 tests).

### 8. Commit message — reglas skill `commit`

- Inglés, imperativo, subject ≤ 72 chars.
- Términos de dominio en español entre comillas (`"ConsultaAsistenciaRepository"`, `"ASISTENCIA_CORRECCION"`).
- NUNCA `Co-Authored-By`.
- Si Chat 3 cierra en dos commits (feature + tests separados), ambos respetan la regla.

## FUERA DE ALCANCE

Explícitamente NO se toca en Chat 3:

- **FE** — Chat 4 (banner admin, mensaje self-service, widget home).
- **Documentación formal en `business-rules.md`** — Chat 5 (sección nueva §1.X + `INV-C11` en §15.4).
- **`BoletaNotasPdfService`** — es calificaciones, Plan 27 NO aplica (decisión original).
- **Reportes de profesor puros** — NO filtran por grado (profesores no tienen `GRA_Orden`). Solo aplicar nota genérica si el reporte es mixto.
- **Regresión `ASISTENCIA_PROFESOR`** — chat aparte.
- **Violaciones pre-existentes de INV-RE01** (reportes sin Excel mirror) — documentar pero no arreglar.
- **Plan 22 / 24 / 26** — frentes paralelos.
- **Widget "Asistencia de Hoy"** — FE Chat 4.

## CRITERIOS DE CIERRE

```text
PRE-WORK
[ ] Auditoría de 6 services PDF + 4 Excel completa
[ ] Confirmado con usuario: BoletaNotas excluido, profesores sin filtro de grado
[ ] Git status limpio en Educa.API antes de empezar

IMPLEMENTACIÓN
[ ] Constante "NotaReportePlan27" agregada en "AsistenciaGrados.cs"
[ ] Nota agregada en header de los 4 reportes PDF de asistencia (estudiantes)
[ ] Nota agregada en header de los 2-3 reportes Excel de asistencia
[ ] Verificado que "ReporteAsistenciaDataService" consume queries ya filtradas (Chat 2)
[ ] Verificado paridad PDF/Excel (INV-RE01/02/03) en cada reporte modificado
[ ] Reportes de profesor NO filtrados por grado; nota genérica si aplica
[ ] Archivos respetan cap 300 líneas (dividir si cualquiera cruza)

TESTS
[ ] +5-7 tests en "AsistenciaRepositoryPlan27Tests" (extender con admin query + consulta)
[ ] +3-4 tests en service de reporte filtrado/consolidado (si existen, crear si no)
[ ] +2 tests en service Excel consolidado
[ ] +2 tests de paridad PDF/Excel contract (validar content-type + mismos args)
[ ] dotnet test — 100% verde (~1150 tests)
[ ] dotnet build — sin warnings nuevos

VALIDACIÓN MANUAL (opcional)
[ ] Generar PDF consolidado con mix de grados → verificar filtro + nota visible
[ ] Generar Excel equivalente → misma data, misma nota

CIERRE
[ ] Commit en Educa.API con mensaje sugerido abajo
[ ] Actualizar maestro Plan 27: marcar Chat 3 ✅
[ ] Preparar Chat 4 (FE admin + self-service + widget home) con /next-chat
[ ] Mover este archivo a educa-web/.claude/chats/closed/ al cerrar el chat
```

## COMMIT MESSAGE sugerido

Solo hay commit en `Educa.API` (Chat 3 no toca FE).

```text
feat(asistencia): Plan 27 Chat 3 — grade filter in reports + header note

Apply INV-C11 grade filter uniformly across attendance PDF/Excel reports
(decision 7 Chat 1) and add the visible header note
"Datos filtrados: GRA_Orden >= 8 (5to Primaria en adelante). Plan 27 · INV-C11."
to every affected report (decision 3 Chat 1). Teacher reports keep their
flow — no grade filter, generic note only if mixed.

- "AsistenciaGrados.NotaReportePlan27" constant for the header text
- "ReporteFiltradoAsistenciaService" + "ReporteFiltradoPdfService":
  header note, data already filtered by repo (Chat 2)
- "ReporteAsistenciaConsolidadoPdfService" + "*ExcelService": idem
- "ReporteAsistenciaSalonPdfService" + "*ExcelService": idem
- Teacher-only reports ("ReporteFiltradoProfesoresService") keep INV-C11 off
- Paridad PDF/Excel (INV-RE01/02/03) verified on each touched endpoint

+XX tests (repo extensions + service contract + PDF/Excel parity).
Baseline 1133 → XXXX green. Reversible via "UmbralGradoAsistenciaDiaria".
```

**Subject alternativo más corto** (69 chars, válido):

```text
feat(asistencia): Plan 27 Chat 3 — grade filter in reports + note
```

## CIERRE

Al terminar Chat 3, pedir al usuario feedback sobre:

1. **¿La nota es suficientemente visible?** — el formato propuesto (gris cursiva 10pt PDF, fondo celeste claro Excel) puede necesitar ajuste tras revisar un PDF real.
2. **¿Hay reportes sin Excel mirror que el usuario considere críticos?** — Chat 3 documenta esas violaciones de INV-RE01 pero no las arregla; el usuario decide si abrir un chat dedicado.
3. **¿Chat 4 arranca inmediatamente o hay pausa para validación intermedia con el jefe?** — según política declarada en Chat 1, Chat 4 puede seguir sin pausa, pero confirmar.
4. **Baseline post-deploy** — confirmar que los reportes descargados por admin post-deploy efectivamente muestran la nota.

Si Chat 3 cierra limpio (tests verdes, commit hecho, maestro actualizado), invocar `/next-chat` para generar el prompt de Chat 4 (FE: banner admin + self-service + widget home).
