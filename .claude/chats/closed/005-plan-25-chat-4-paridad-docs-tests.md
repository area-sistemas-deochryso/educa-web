> **Repo destino**: **orden secuencial** — primero `Educa.API` (backend, branch `master`) para tests de paridad, luego `educa-web` (frontend, branch `main`) para docs (`business-rules.md`) + smoke tests UI. **NO abrir dos chats en paralelo** (regla `one-repo-one-chat`): terminar BE, cerrar chat, y si sobra contexto continuar en el mismo chat sobre FE. Si el contexto ya pesa mucho después de BE, cerrar y abrir 006-plan-25-chat-4-fe.
> **Plan**: 25 · **Chat**: 4 · **Fase**: F4 (docs + tests paridad end-to-end) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 25 Chat 4 — Docs + tests paridad PDF/Excel end-to-end

## PLAN FILE

- Maestro (fuente de verdad del orden): `educa-web/.claude/plan/maestro.md` → **Plan 25 — Paridad Excel para reportes PDF** → Chat 4.
- Path relativo desde `Educa.API` (BE): `../../educa-web/.claude/plan/maestro.md`.
- Path relativo desde `educa-web` (FE): `.claude/plan/maestro.md`.
- Plan file dedicado NO existe. Al cerrar Chat 4 con el plan cerrado (100%), evaluar si vale extraer `.claude/plan/reportes-excel-paridad.md` como post-mortem + regla operativa consolidada, o si el registro en el maestro basta.
- Chats previos cerrados en `educa-web/.claude/chats/closed/`:
  - Chat 1 — BE `3a29b67`, maestro FE `8ea9e08` (2026-04-21): ClosedXML + `AsistenciaExcelService` + primer endpoint `/api/reportes-asistencia/excel`.
  - Chat 2 — BE `7f8ebf5`, maestro FE `00d883d` (2026-04-21): 4 services Excel restantes + 13 endpoints `/excel` totales.
  - Chat 3 — FE `2a6200c` + docs `6ee1a17` (2026-04-21): UI dual PDF/Excel en 5 páginas de asistencia, Excel client-side de `attendance-reports` reemplazado por el endpoint BE.

## OBJETIVO

Cerrar Plan 25 con:

1. **Regla operativa documentada**: agregar en `business-rules.md` (frontend) la invariante "todo endpoint/acción UI que exporta PDF también debe ofrecer Excel equivalente" con detalle suficiente para que un chat futuro que toque un reporte nuevo no la pase por alto.
2. **Paridad verificada por tests BE**: un test por endpoint `/excel` existente verificando que (a) el content-type y extensión son correctos, (b) llamadas con el mismo filtro a `/pdf` y `/excel` devuelven **la misma cantidad de filas lógicas** (no bytes — los archivos son formatos distintos). Esto protege contra drift silencioso cuando alguien agregue una nueva regla de filtro solo a un lado.
3. **Smoke test FE** mínimo: un spec Vitest por cada página del inventario Chat 3 verificando que el `pdfMenuItems` expone exactamente 3 items (`Ver PDF`, `Descargar PDF`, `Descargar Excel`) con los labels esperados. No probar el blob — el BE ya está cubierto.

El Chat 4 NO implementa features nuevas. Solo cubre lo que Chats 1-3 dejaron funcionando pero sin red de seguridad.

## PRE-WORK OBLIGATORIO

Antes de codificar, confirmar el estado real del código post-Chat 3:

```bash
cd educa-web

# 1. Git limpio + branch + último commit del Chat 3
git status --short && git branch --show-current
git log --oneline -3   # Esperado: top = "docs(maestro): close Plan 25 Chat 3"

# 2. Inventario de endpoints BE /excel (para escribir tests)
grep -rn "HttpGet.*excel" ../Educa.API/Educa.API/Controllers --include="*.cs" | grep -v "\.Excel"

# 3. Páginas FE migradas en Chat 3 (para smoke tests)
grep -rn "Descargar Excel" src/app --include="*.ts" | grep -v ".spec.ts"
# Esperado: 5 resultados apuntando a los 5 componentes del inventario

# 4. Ubicación actual del capítulo de rules candidato
head -50 .claude/rules/business-rules.md   # Para decidir dónde insertar la regla
```

```bash
cd ../Educa.API/Educa.API

# 5. Existe proyecto de tests de integración? O solo unit tests?
ls ../Educa.API.Tests/  2>/dev/null
# Si no existe Integration/, los tests de paridad van como integration-style bajo Services/Excel/
# usando WebApplicationFactory<Program> o directamente con TestServer.
```

Si el inventario muestra endpoints Excel que **no** están migrados (grep falla), **pausar y discutir** antes de codificar.

## ALCANCE

### 1. Docs — frontend (`educa-web`)

| Archivo | Cambio |
|---|---|
| `.claude/rules/business-rules.md` | Agregar sección operativa "§ Reportes — paridad de formatos" (ubicación: antes o después de `§ Impresiones`; decidir en pre-work). Cuerpo: la regla en 1 párrafo + lista de endpoints actuales que la cumplen + consecuencia si se viola (alguien pide el Excel a mano porque el admin no puede exportarlo). |

**Contenido propuesto para la sección**:

```markdown
## § Reportes — paridad de formatos

> **Todo endpoint BE o acción de UI que exporta un reporte en PDF DEBE ofrecer
> también la versión Excel equivalente.**

Aplica a reportes nuevos y mantiene la paridad en los 6 existentes (detalle en
`.claude/plan/maestro.md` — Plan 25). Rule of thumb al agregar un reporte nuevo:

1. El controller BE agrega **2 endpoints** mirror: `/foo/pdf` y `/foo/excel`.
2. El UI del FE agrega **1 menú único** con 3 items (`Ver PDF`, `Descargar PDF`,
   `Descargar Excel`) vía el helper `buildPdfExcelMenuItems`
   (`consolidated-pdf.helper.ts`) o equivalente por feature.
3. El test BE verifica que con el mismo filtro ambos endpoints devuelven la
   misma cantidad de filas lógicas.

**Excepción única**: layout puramente tipográfico sin datos tabulares (ej:
certificados, diplomas). Ningún reporte actual entra en esta excepción.

**Consecuencia de romper la regla**: Director/Admin re-transcribe datos del
PDF al Excel a mano — señal de que hay que abrir un chat para agregar el
endpoint faltante.
```

### 2. Tests BE — `Educa.API.Tests`

> **Decisión técnica a tomar en pre-work**: si existe `Educa.API.Tests/Integration/` con `WebApplicationFactory<Program>`, agregar ahí. Si no existe, agregar al proyecto actual como **clase `[Collection]` que use TestServer in-memory** — evitar proyecto nuevo si ya hay infraestructura.

| Archivo a crear | Rol | Tests |
|---|---|---|
| `Educa.API.Tests/Integration/Excel/ReportesExcelParidadTests.cs` | Paridad entre `/pdf` y `/excel` por cada endpoint | 13 tests (uno por endpoint). Cada test:  (a) llama `/pdf` + `/excel` con el **mismo** query string, (b) deserializa respuesta `/excel` → xlsx → cuenta filas con `ClosedXML` (ya disponible), (c) deserializa `/pdf` → cuenta placeholders "filas lógicas" usando la misma query a un endpoint `/datos` JSON del mismo dominio (donde existe), (d) assert `filasExcel == filasJson`. |
| `Educa.API.Tests/Integration/Excel/ExcelContentTypeTests.cs` | Content-type + extensión + rate limit | 13 tests (uno por endpoint): `response.Content.Headers.ContentType?.MediaType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` + `Content-Disposition` con `.xlsx`. |

**Endpoints a cubrir** (confirmados en Chat 2 + pre-work):

```
/api/reportes-asistencia/excel
/api/BoletaNotas/estudiante/{id}/excel
/api/BoletaNotas/salon/{id}/excel
/api/ConsultaAsistencia/director/asistencia-dia/excel
/api/ConsultaAsistencia/director/asistencia-mes/excel
/api/ConsultaAsistencia/director/asistencia-periodo/excel
/api/ConsultaAsistencia/director/reporte/todos-salones/dia/excel
/api/ConsultaAsistencia/director/reporte/todos-salones/semana/excel
/api/ConsultaAsistencia/director/reporte/todos-salones/mes/excel
/api/ConsultaAsistencia/director/reporte/todos-salones/anio/excel
/api/ConsultaAsistencia/profesor/{dni}/dia/excel
/api/ConsultaAsistencia/profesor/{dni}/mes/excel
/api/ConsultaAsistencia/profesores/reporte-filtrado/excel
```

**Cap 300 ln** por archivo de tests. Si el file se pasa, **dividir por dominio** (ej: `ReportesExcelParidadAsistenciaTests` + `ReportesExcelParidadBoletasTests`).

### 3. Smoke tests FE — `educa-web`

| Archivo a crear | Rol | Tests |
|---|---|---|
| `src/app/features/intranet/components/attendance/estadisticas-dia/estadisticas-dia.component.spec.ts` | Verifica output Excel + menú de 3 items | 2 tests |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-director/estudiantes/attendance-director-estudiantes.component.spec.ts` (actualizar existente si ya hay) | Verifica que `pdfMenuItems` retorna 3 items con labels esperados | 2 tests |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-director/profesores/attendance-director-profesores.component.spec.ts` (actualizar existente) | Idem | 2 tests |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-profesor/estudiantes/attendance-profesor-estudiantes.component.spec.ts` (actualizar existente) | Idem | 2 tests |
| `src/app/features/intranet/pages/cross-role/attendance-reports/services/attendance-reports.facade.spec.ts` (actualizar existente) | Test del nuevo `exportarExcel` delegando a `api.descargarExcel` | 1 test nuevo |

**Cada test típico**:

```typescript
it('builds menu with 3 items (Ver PDF / Descargar PDF / Descargar Excel)', () => {
  const items = component.pdfMenuItems();
  expect(items).toHaveLength(3);
  expect(items[0].label).toContain('Ver PDF');
  expect(items[1].label).toContain('Descargar PDF');
  expect(items[2].label).toContain('Descargar Excel');
});
```

NO probar el blob retornado ni navegación — smoke puro de estructura.

## TESTS MÍNIMOS

Por endpoint BE nuevo en `/excel`:

| Caso | Input | Resultado esperado |
|---|---|---|
| Content-type correcto | GET `/api/X/excel?params` | `response.Content.Headers.ContentType.MediaType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` |
| Extensión en Content-Disposition | Idem | Header contiene `.xlsx` |
| Paridad de filas | GET `/datos` + GET `/excel` con **mismo** query | `filasJson == filasExcelHojaPrincipal` (excluyendo header y totales) |
| Rate limit configurado | Ejecutar 6 requests seguidas por el mismo userId | 6ta devuelve 429 (heavy: 5/min) — **opcional**, solo si rate limit testing infrastructure ya existe |

Por smoke FE:

| Caso | Verificación |
|---|---|
| `pdfMenuItems` tiene 3 items | `.toHaveLength(3)` |
| Labels correctos | Los 3 labels contienen `"PDF"` los 2 primeros y `"Excel"` el tercero |
| Excel item dispara la acción Excel correcta | Spy sobre `view.pdf.descargarExcel*` al ejecutar `items[2].command()` |

## REGLAS OBLIGATORIAS

- **`backend.md` §Logging**: structured logging con placeholders, NUNCA string interpolation. Los tests no loguean — assertions solamente.
- **Cap 300 ln**: aplica a los archivos de tests nuevos. Dividir por dominio si pasa.
- **`testing.md`**: tests BE con `xUnit` + `FluentAssertions` si ya se usan en el proyecto (confirmar en pre-work). FE con Vitest (`describe`/`it`/`expect`).
- **Fire-and-forget en producción**: los tests NO necesitan esta regla; relevante solo al escribir lógica. Para paridad, usar el pipeline real vía `WebApplicationFactory`.
- **`code-language.md`**: código/tests en inglés; labels visibles al usuario se mantienen en español como en Chat 3. En tests, los assertions pueden referenciar los labels en español entre `"..."` (ej: `expect(label).toBe('Descargar Excel')`).
- **`git.md`**: 2 commits separados si se cierran BE y FE juntos. `test(reports)` / `docs(rules)` — **nunca** mezclar en el mismo commit.
- **NO tocar**: los endpoints BE ya cerrados (son fuente de verdad para los tests de paridad), los `descargarPdf*` / `descargarExcel*` del FE (ya probados manualmente en Chat 3), el patrón de menús consolidado en `buildPdfExcelMenuItems`.
- **Commit style**: la skill `commit` prohíbe `Co-Authored-By` explícitamente. Mensaje en inglés, español solo entre comillas para términos de dominio.

## APRENDIZAJES TRANSFERIBLES (del Chat 3)

Descubrimientos del 2026-04-21 que este chat **debe** conocer:

1. **5 páginas FE migradas** (no 6 como estimaba el plan original): `estadisticas-dia`, `attendance-director-estudiantes`, `attendance-director-profesores`, `attendance-profesor-estudiantes`, `attendance-reports`. La boleta de notas **no** tiene UI propia de descarga PDF en FE todavía — si aparece una página futura con eso, el smoke test de ese chat es responsabilidad del chat correspondiente.
2. **Helper consolidado `buildPdfExcelMenuItems`** en `src/app/features/intranet/pages/cross-role/attendance-component/attendance-director/consolidated-pdf.helper.ts`. Los smoke tests pueden testear por esta unidad en lugar de por cada componente — ahorro de duplicación. **Preferir test del helper** (1 file) + tests por componente **solo** si la rama del `computed()` específica del componente (modo día vs mes) lo justifica.
3. **Padrón de 3 items** (no split button): `Ver PDF`, `Descargar PDF`, `Descargar Excel`. "Ver Excel" NO aplica porque navegadores descargan xlsx, no lo abren. Los tests deben reflejar esto.
4. **`attendance-reports.facade.ts` ahora usa endpoint BE** para Excel (no ExcelJS client-side). El test de `exportarExcel` en el spec existente debe mockear `AttendanceReportsApiService.descargarExcel` y verificar que se llama con los filtros correctos + que `downloadBlob` se invoca.
5. **`AttendanceReportsApiService.descargarExcel` ya existe** — método HTTP simple `GET /api/ReportesAsistencia/excel`. No hay lógica de serialización client-side que testear.
6. **Escape hatches max-lines** en `attendance-director-estudiantes.component.ts` y `attendance-director-profesores.component.ts` (`/* eslint-disable max-lines -- ... */`). Los tests NO deben agregar imports al componente que sumen líneas al archivo de producción; si necesitas exponer algo privado, extraerlo primero.
7. **ClosedXML disponible en BE** desde Chat 1 — los tests pueden leer el xlsx del response body con `new XLWorkbook(stream)` sin libs adicionales. Para la cuenta de filas: `worksheet.RowsUsed().Count() - header/stats/totales`.
8. **Endpoint `/datos` JSON** existe solo para `reportes-asistencia`. Para el resto (asistencia-dia, mes, periodo, etc.), no hay un `/datos` paralelo al PDF/Excel — usar el endpoint JSON normal del controller (ej: `/director/asistencia-dia` sin `/pdf` ni `/excel`). Confirmar en pre-work.
9. **Rate limit `"heavy"`**: 5 req/min por userId. Si escribes tests que hacen múltiples requests al mismo endpoint en un test, considera el reset entre tests o levanta el rate limit en config de test. El `WebApplicationFactory` puede override la config.
10. **Commit pattern** (referencia Chat 3): 2 commits (`feat(reports)` + `docs(maestro)`), ambos en inglés, sin `Co-Authored-By`. Repetir el patrón en Chat 4: `test(reports)` + `docs(rules)` + `docs(maestro)` (3 commits: BE tests, FE business-rules, FE maestro close).

## FUERA DE ALCANCE

- **Agregar nuevos endpoints PDF o Excel**: Plan 25 Chats 1-2 ya cerraron el set. Si aparece un reporte nuevo, va por la regla operativa nueva (que este chat documenta) — otro chat.
- **Migrar `BoletaNotasPdfService` a consumir `ExcelHelpers`**: ya consolidado en Chat 2.
- **Reemplazar `descargarPdf*` por `download*` (inglés cross-cutting)**: rechazado explícitamente en Chat 3. Si se decide en el futuro, chat aparte.
- **Invertir el default del menú (Excel primero)**: NO. PDF default preserva mental model.
- **Tests E2E con Playwright/Cypress**: si el proyecto no los tiene ya, NO es scope de este chat. Smoke unit con Vitest basta.
- **Otros reportes del backend que no son de asistencia/boleta** (si existen): fuera del alcance del Plan 25. Si aparece evidencia en pre-work, levantar issue separado.
- **Plan 22 F4.BE/F4.FE**: chat aparte, no se mezcla con Plan 25.

## CRITERIOS DE CIERRE

- [ ] Pre-work ejecutado y output compartido con el usuario antes de codificar. Confirmar: existe proyecto de tests, infraestructura `WebApplicationFactory` disponible, 13 endpoints `/excel` localizados y rutas exactas confirmadas.
- [ ] Decisión tomada: ¿tests BE van en `Integration/` nuevo o extienden el proyecto existente? Justificada por qué se encontró.
- [ ] `business-rules.md` actualizado con la sección "§ Reportes — paridad de formatos" + decisión de ubicación (antes/después de qué sección).
- [ ] Tests BE nuevos: `ReportesExcelParidadTests.cs` + `ExcelContentTypeTests.cs` (o su split por dominio si > 300 ln), cubriendo los 13 endpoints.
- [ ] Smoke tests FE: cobertura del helper `buildPdfExcelMenuItems` + 1-2 tests por componente del inventario verificando la estructura del menú de 3 items.
- [ ] Cap 300 ln respetado en los archivos de tests nuevos. Si alguno pasa, dividir.
- [ ] `dotnet test` verde (BE) — todos los nuevos + 0 regresiones sobre los 904 baseline de Chat 2.
- [ ] `npm run lint` + `npm test` + `npm run build` limpios (FE) — 0 regresiones sobre los 1410 tests baseline de Chat 3.
- [ ] Smoke manual opcional: descargar PDF + Excel de 1 reporte por cada endpoint y validar que las filas visibles coinciden (spot check para respaldar el test automático).
- [ ] Actualizar `.claude/plan/maestro.md` fila Plan 25: Chat 4 ✅. Progreso `~90% → 100%` (4 de 4 chats cerrados, plan cerrado completo).
- [ ] Commits separados por repo + por rol:
  - BE: `test(reports): Plan 25 Chat 4 — paridad "PDF"/"Excel" tests across 13 endpoints`
  - FE: `docs(rules): Plan 25 Chat 4 — "paridad de formatos" rule + smoke tests`
  - FE: `docs(maestro): close Plan 25 Chat 4 — plan 25 completed`
- [ ] **Mover este archivo** a `educa-web/.claude/chats/closed/`:
  ```bash
  mv "educa-web/.claude/chats/005-plan-25-chat-4-paridad-docs-tests.md" \
     "educa-web/.claude/chats/closed/"
  ```

## COMMIT MESSAGE sugerido

Idioma **inglés**, modo imperativo. Español solo entre `"..."` para términos de dominio. **NO** incluir `Co-Authored-By` (regla explícita de la skill `commit`).

Backend (repo `Educa.API`, branch `master`):

```text
test(reports): Plan 25 Chat 4 — paridad "PDF"/"Excel" tests across 13 endpoints

- Add "ReportesExcelParidadTests" covering the 13 "/excel" endpoints
  introduced in Chats 1-2. Each test hits "/pdf" and "/excel" with
  the same query, reads the xlsx via "ClosedXML" and asserts the row
  count of the main sheet matches the count from the JSON "/datos"
  endpoint (or the sibling JSON endpoint where "/datos" does not
  exist). Protects against silent drift when a filter rule is added
  to one format only.
- Add "ExcelContentTypeTests" verifying Content-Type
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  and Content-Disposition with ".xlsx" extension for every endpoint.
- Tests use the existing "WebApplicationFactory<Program>" harness —
  no new test project. Files split by domain ("Asistencia" /
  "Boletas") to stay under the 300-line cap.
- Suite green: 904 baseline + N new, 0 regressions.

Closes Plan 25 Chat 4 (BE slice).
```

Frontend (repo `educa-web`, branch `main`) — regla + smoke tests:

```text
docs(rules): Plan 25 Chat 4 — "paridad de formatos" rule + smoke tests

- Add "§ Reportes — paridad de formatos" to "business-rules.md":
  every BE endpoint or UI action that exports PDF must also offer
  Excel. Documents the 3-item menu pattern ("Ver PDF" / "Descargar
  PDF" / "Descargar Excel") and the BE endpoint pair convention.
- Smoke tests for the 5 FE pages migrated in Chat 3 assert the
  menu returns exactly 3 items in the expected order. Primary
  coverage lives on the shared "buildPdfExcelMenuItems" helper;
  per-component specs only cover mode-specific branches
  (día/mes/período/consolidado).
- Extend "attendance-reports.facade.spec.ts" to cover the new
  "exportarExcel" path that delegates to the BE endpoint (replaces
  the old ExcelJS client-side flow).

Closes Plan 25 Chat 4 (FE slice).
```

Frontend — maestro close (separado):

```text
docs(maestro): close Plan 25 Chat 4 — plan 25 completed

- Plan 25 Chat 4 ✅ — "paridad de formatos" rule landed in
  "business-rules.md", BE paridad tests green, FE smoke tests green.
- Plan 25 closes at 100% (4 of 4 chats).
- Chat handoff archived under ".claude/chats/closed/".
```

## CIERRE

Feedback breve a pedir al usuario tras cerrar:

- **Ubicación de la regla**: ¿`business-rules.md` fue el archivo correcto o conviene moverla a un `rules/reports.md` dedicado? La regla tiene sabor operativo más que invariante de dominio.
- **Cobertura de tests BE**: ¿los tests de paridad por count de filas son suficientes, o hace falta comparar también contenido celda-a-celda para al menos 1 endpoint piloto?
- **Rate limit en tests**: ¿se ajustó la config de test para deshabilitar `"heavy"` o se dejó activo? Si activo, documentar qué tests evitar correr en paralelo.
- **Test del helper vs por componente**: ¿el smoke test del `buildPdfExcelMenuItems` fue suficiente o hizo falta test por componente? Aprendizaje para próximos features similares.
- **Plan 25 cerrado**: ¿hay follow-ups no cubiertos (ej: reportes futuros como aprobación/matrícula) que merezcan un Plan 26 siguiendo este modelo de 4 chats?
- **Backlog siguiente**: ¿Plan 22 F4.BE/F4.FE o algún pendiente de Plan 21 viene después, o se abre un plan nuevo?
