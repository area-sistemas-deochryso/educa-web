> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 25 · **Chat**: 3 · **Fase**: F3 (UI dual "PDF" / "Excel" en cada página que exporta reportes) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 25 Chat 3 — FE: UI dual PDF/Excel en todas las páginas de reportes

## PLAN FILE

- Maestro (fuente de verdad del orden): [`.claude/plan/maestro.md`](../plan/maestro.md) → **Plan 25 — Paridad Excel para reportes PDF** → Chat 3.
- Plan file dedicado NO existe. Si al cierre conviene extraerlo, crearlo como `.claude/plan/reportes-excel-paridad.md` y dejar el inline del maestro como stub que apunte ahí.
- Chat 1 cerrado 2026-04-21 (BE `3a29b67`, maestro FE `8ea9e08`): ClosedXML + primer Excel (`ReporteFiltradoAsistencia`).
- Chat 2 cerrado 2026-04-21 (BE `7f8ebf5`, maestro FE `00d883d`): 4 services Excel restantes + 13 endpoints `/excel`.

## OBJETIVO

Exponer en el frontend la descarga Excel para **todas** las páginas que hoy solo descargan PDF. Reemplazar cada botón solitario "Descargar PDF" por un menú/split-button con dos opciones ("PDF" y "Excel"). Reusar un componente compartido cuando el patrón aparezca en 3+ páginas; no crear abstracción antes si solo hay 2 casos.

## PRE-WORK OBLIGATORIO

Antes de codificar, confirmar el estado del repo y el inventario real de puntos a migrar:

```bash
cd educa-web

# 1. Git limpio + branch correcta
git status --short && git branch --show-current

# 2. Puntos de descarga PDF en UI (botones, menuItems)
grep -rn "Descargar PDF" src/app --include="*.ts" --include="*.html" 2>&1

# 3. Services API que ya tienen "descargarPdf*" → acá van a vivir los nuevos "descargarExcel*"
grep -rn "descargarPdf" src/app/shared/services --include="*.ts" | grep -v ".spec.ts" | head -20

# 4. Composer frontend de menús (PrimeNG SplitButton / MenuItem ya usado en los mismos archivos)
grep -rn "MenuItem\[\]\|p-splitButton\|pSplitButton" src/app/features/intranet/pages/cross-role/attendance-component --include="*.ts" --include="*.html" 2>&1 | head -20

# 5. Endpoints /excel disponibles en BE (Chat 2) — lista de referencia
#    - Boleta:       /api/BoletaNotas/estudiante/{id}/excel · /api/BoletaNotas/salon/{id}/excel
#    - Salón:        /api/ConsultaAsistencia/profesor/asistencia-dia/excel
#                    /api/ConsultaAsistencia/director/asistencia-dia/excel
#                    /api/ConsultaAsistencia/director/asistencia-mes/excel
#                    /api/ConsultaAsistencia/director/asistencia-periodo/excel
#    - Consolidado:  /api/ConsultaAsistencia/director/reporte/todos-salones/{dia|semana|mes|anio}/excel
#    - Profesor:     /api/ConsultaAsistencia/profesor/{dni}/{dia|mes}/excel
#                    /api/ConsultaAsistencia/profesores/reporte-filtrado/excel
#    - Reporte filtrado (Chat 1): /api/reportes-asistencia/excel
```

Si algo no cuadra (botón que el grep no encuentra, endpoint Excel del BE que se pasó en Chat 2), **pausar y discutir** antes de codificar.

**Nota de scope**: hoy en la app hay **~5 lugares** con descarga PDF activa (contados en Chat 2). El pre-work va a confirmar la cifra exacta. Si suben a 7+, el plan del Chat 3 lo absorbe sin cambios; si son 3 o menos, reconsiderar si crear el shared component o dejar inline (ver "Reglas obligatorias").

## ALCANCE

### Inventario confirmado en Chat 2

13 endpoints `/excel` ya expuestos en el BE. Los puntos en UI a migrar (FE) son:

| # | Ubicación FE | Botón actual | Endpoints Excel a llamar |
|---|---|---|---|
| 1 | `features/intranet/pages/cross-role/attendance-reports/**` | Descargar reporte filtrado | `/api/reportes-asistencia/excel` (Chat 1) |
| 2 | `features/intranet/components/attendance/estadisticas-dia/estadisticas-dia.component.ts:43` | "Descargar PDF" | `/api/ConsultaAsistencia/director/asistencia-dia/excel` o el de profesor según rol |
| 3 | `features/intranet/pages/cross-role/attendance-component/attendance-director/estudiantes/**` (2 botones en `.ts:212,230`) | "Descargar PDF" en menuItems (día/mes/periodo/consolidado) | 4 variantes del `/excel` (día/mes/periodo + consolidado día/semana/mes/año) |
| 4 | `features/intranet/pages/cross-role/attendance-component/attendance-director/profesores/**` | "Descargar PDF (mes)" | `/api/ConsultaAsistencia/profesor/{dni}/mes/excel` + `/api/ConsultaAsistencia/profesores/reporte-filtrado/excel` |
| 5 | `features/intranet/pages/cross-role/attendance-component/attendance-profesor/estudiantes/**` | "Descargar PDF" | `/api/ConsultaAsistencia/profesor/asistencia-dia/excel` |
| 6 | Boletas de notas (si hay UI que hoy descarga boleta PDF — el pre-work confirma si existe) | — | `/api/BoletaNotas/estudiante/{id}/excel` · `/api/BoletaNotas/salon/{id}/excel` |

### Archivos a crear

| Archivo | Rol | Líneas estimadas |
|---|---|---|
| `src/app/shared/components/download-split-button/download-split-button.component.ts` | Presentational — split button "Descargar" con opciones PDF/Excel configurables | ~80 |
| `src/app/shared/components/download-split-button/download-split-button.component.html` | Template | ~25 |
| `src/app/shared/components/download-split-button/download-split-button.component.scss` | (opcional) estilos | ~10 |
| `src/app/shared/components/download-split-button/index.ts` | Barrel export | ~1 |
| `src/app/shared/components/download-split-button/download-split-button.component.spec.ts` | Test: renderiza 2 opciones, dispara el output correcto | ~40 |

**Decisión**: **solo** extraer el shared component si aparece en **3+ páginas**. Si son 2, inline con `p-splitButton` directo en cada componente — extracción prematura tapa el patrón. El inventario ya muestra 5 puntos, así que el shared es probable. Validar durante la implementación.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/app/shared/services/attendance/director-attendance-api.service.ts` | Agregar 8 métodos `descargarExcel*` paralelos a los `descargarPdf*` existentes (día, mes, periodo, consolidado día/semana/mes/año, + 2 profesor) |
| `src/app/shared/services/attendance/asistencia-profesor-api.service.ts` | Agregar 3 métodos `descargarExcelProfesor{Dia,Mes}` + `descargarExcelReporteFiltradoProfesores` |
| `src/app/shared/services/attendance/attendance.service.ts` | Agregar fachada de los nuevos `descargarExcel*` (espejo del `descargarPdf*` existente) |
| `src/app/features/intranet/services/attendance/attendance-pdf.service.ts` | **Renombrar** conceptualmente (sin renombrar archivo todavía) para que reciba el formato como parámetro, o agregar métodos hermanos `descargarExcel*`. Decisión en implementación — si el service queda > 300 ln, dividir |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-director/consolidated-pdf.helper.ts` | Agregar hermano `consolidated-excel.helper.ts` o parametrizar por formato |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-director/estudiantes/attendance-director-estudiantes.component.ts` | `menuItems`: cada "Descargar PDF" → 2 items ("PDF" + "Excel") o usar `<app-download-split-button>` |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-director/profesores/attendance-director-profesores.component.ts` | Idem |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-profesor/estudiantes/attendance-profesor-estudiantes.component.ts` | Idem |
| `src/app/features/intranet/components/attendance/estadisticas-dia/estadisticas-dia.component.ts` | Agregar output `descargarExcel = output<void>()` paralelo a `descargarPdf`; reemplazar botón por split |
| `src/app/features/intranet/pages/cross-role/attendance-reports/**` | Agregar botón Excel (ya tenía solo PDF post-Chat 1) |
| Boletas de notas (si existen) | Agregar opción Excel |

### Contrato del shared component (borrador)

```typescript
// download-split-button.component.ts
@Component({
  selector: 'app-download-split-button',
  standalone: true,
  imports: [SplitButtonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-splitButton
      [label]="label()"
      [icon]="icon()"
      [disabled]="disabled()"
      [loading]="loading()"
      (onClick)="downloadPdf.emit()"
      [model]="menuItems()"
      [pt]="{ root: { 'aria-label': label() } }"
    />
  `,
})
export class DownloadSplitButtonComponent {
  readonly label = input('Descargar');
  readonly icon = input('pi pi-download');
  readonly disabled = input(false);
  readonly loading = input(false);

  readonly downloadPdf = output<void>();
  readonly downloadExcel = output<void>();

  readonly menuItems = computed<MenuItem[]>(() => [
    { label: 'PDF',   icon: 'pi pi-file-pdf',   command: () => this.downloadPdf.emit() },
    { label: 'Excel', icon: 'pi pi-file-excel', command: () => this.downloadExcel.emit() },
  ]);
}
```

- **Default click** (mitad izquierda del split button) dispara `downloadPdf` — preserva el comportamiento "un click baja el PDF" que los usuarios ya tienen en el cerebro. El desplegable agrega Excel sin cambiar el flujo actual.
- Si el usuario quiere invertir el default (Excel por defecto) se agrega un input futuro — no en este chat.

### Content-Type esperado del FE

El interceptor / `HttpClient.get(url, { responseType: 'blob' })` recibe el binario. El nombre de archivo lo decide el `file-download.utils.ts` existente (convención: `Reporte_{X}_{fecha:yyyyMMdd}.xlsx`). **No** cambiar extension ni content-type — ya vienen correctos del BE:
- PDF: `application/pdf`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

## TESTS MÍNIMOS

Por cada archivo nuevo:

| Caso | Verificación |
|---|---|
| `DownloadSplitButtonComponent` renderiza 2 menuItems | `fixture.debugElement.queryAll(By.css('...'))` cuenta = 2 con labels "PDF" y "Excel" |
| Click en botón principal dispara `downloadPdf` | Spy sobre `downloadPdf.emit` |
| Click en opción "Excel" dispara `downloadExcel` | Spy sobre `downloadExcel.emit` |
| `disabled=true` deshabilita el split button | DOM property check |

Para cada página migrada al patrón:

| Caso | Verificación |
|---|---|
| menuItems tiene 2 entradas para cada reporte migrado | El array exporta longitud 2x vs baseline |
| `descargarExcel(tipo)` llama al método correcto del API service | Spy sobre el api.service |
| Los tests ya existentes de "descargarPdf" siguen verdes | Baseline |

**NO** testear el contenido real del xlsx en FE — eso es responsabilidad del BE (ya cubierto en los 27 tests de Chat 2). El FE solo testea routing de la UI + llamadas HTTP.

## REGLAS OBLIGATORIAS

- **`code-language.md`**: código en inglés, labels visibles al usuario en español. "Descargar", "PDF", "Excel" van en español. Nombres de métodos (`descargarExcel*`) **continúan en español** para mantener simetría con los `descargarPdf*` existentes — romper la simetría aquí = deuda de naming cross-cutting que no es el scope de este chat. Si al final de Chat 3 se decide renombrar todo a inglés, hacerlo en chat aparte y masivo.
- **`primeng.md`**: si se usa `p-splitButton`, el dropdown de opciones respeta `appendTo="body"` **solo si** está dentro de overlay/dialog. En el header de una página normal no hace falta. El patrón ya está documentado.
- **`a11y.md`**: botón solo-icono → `[pt]="{ root: { 'aria-label': '...' } }"`. El "Descargar" es label visible, así que el aria-label no es obligatorio, pero si el botón queda solo-icono en mobile (responsive), agregarlo.
- **`architecture.md` §Taxonomía**: `<app-download-split-button>` es **Presentational/Dumb** → `ChangeDetectionStrategy.OnPush`, sin servicios, `input()`/`output()` signal API.
- **`crud-patterns.md` §Checklist`**: no hay funciones en bindings (usar `computed()` para `menuItems`).
- **Cap de líneas**: 500 ln bloqueo, 350 ln warning. Si `attendance-director-estudiantes.component.ts` (ya grande) pasa de 500 ln, dividir antes de mergear.
- **Feature flags (`feature-flags.md`)**: no requiere flag nuevo. La descarga Excel se activa en el momento en que los endpoints existen (ya existen desde Chat 2).
- **NO tocar**: el BE (ya cerrado), el shared `file-download.utils.ts` (ya funciona con blob + nombre), los `descargarPdf*` existentes (aditivo puro). Los tests existentes de PDF **deben** seguir verdes.
- **Simplify antes de extraer**: el shared `<app-download-split-button>` se justifica si se usa en 3+ páginas. Si solo 2, inline con `p-splitButton` y dejar comentario `// TODO: extraer a shared si aparece en 3+ páginas`.

## APRENDIZAJES TRANSFERIBLES (del Chat 2)

Descubrimientos del 2026-04-21 que este chat **debe** conocer:

1. **13 endpoints `/excel` listos en BE**: todos con `[EnableRateLimiting("heavy")]`, Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, DNI como texto (INV-D01), Perú timezone (INV-D04). Rutas listadas en sección "Pre-work".
2. **Todos los endpoints siguen patrón `descargarPdf*` → `descargarExcel*`**: mismos query params, misma auth, misma semántica. El wrapper del FE puede ser un thin mirror casi mecánico.
3. **BE devuelve xlsx directo con `File(bytes, contentType, fileName)`** — el FE lo maneja igual que el PDF: `responseType: 'blob'` + `downloadBlob(blob, fileName)` del utils existente.
4. **`file-download.utils.ts`** (frontend) ya existe — reusar `downloadBlob(blob, fileName)` para ambos formatos.
5. **Rate limit del BE es `"heavy"` (5/min por userId)**: el FE **no** debe retry automático si viene 429. Si el usuario lo pide rápido 2 veces, el segundo click puede fallar — mostrar toast amigable, no retry silencioso. El interceptor rate-limit del FE ya sabe esto (`rate-limit.md`).
6. **`AsistenciaExcelService` del BE ya tiene 3 hojas posibles** (Estudiantes / Profesores / Sin resultados). El FE solo recibe el blob, no le importa cuántas hojas tiene.
7. **Extracted helpers del BE** (`ExcelHelpers.cs`) no aplican al FE — fueron solo consolidación interna del servidor.
8. **Nombres de archivo**: el BE ya setea `Content-Disposition: attachment; filename=...xlsx`. El FE puede aceptar ese nombre o forzar uno propio — consistir con lo que hace el PDF hoy (inspeccionar `file-download.utils.ts`).
9. **Tests baseline FE**: correr `npm test` al inicio y final para confirmar que el patrón "menuItems con 1 opción" que cambia a "menuItems con 2 opciones" no rompe asserts existentes.
10. **Commit style** (regla de skill `commit`): **inglés imperativo**, español solo entre comillas para términos de dominio (`"Descargar"`, `"Boleta de Notas"`). **NUNCA** `Co-Authored-By`. El commit de Chat 2 (BE `7f8ebf5`, FE `00d883d`) es referencia.

## FUERA DE ALCANCE

- **Chat 4 (Plan 25)**: documentación (`business-rules.md` con la regla "todo reporte PDF debe tener Excel") + smoke tests E2E (abrir Excel generado en Chrome/Firefox/Excel/LibreOffice) + tests de integración BE↔FE.
- **Renombrar `descargarPdf*` → `descargar{Formato}*`** cross-cutting: **NO** en este chat. Si se decide, queda para otro chat dedicado (el patrón "Excel es PDF pero .xlsx" es fuerte; renombrar ahora es doble trabajo innecesario).
- **Cambiar el default del split-button de PDF a Excel**: NO. PDF default preserva mental model existente.
- **Retry automático en 429 del rate-limit `heavy`**: NO. El usuario hace click con intención; si hay rate limit, toast + esperar.
- **Agregar nuevos reportes**: NO — solo duplicar los que ya exportan PDF hoy.
- **Backend** (ya cerrado en Chat 2).
- **Plan 22 F4.BE/F4.FE** — chat aparte.

## CRITERIOS DE CIERRE

- [ ] Pre-work ejecutado y salida compartida con el usuario antes de codificar
- [ ] Decisión tomada: ¿`<app-download-split-button>` shared o inline por página? (y justificada por cuántas páginas lo usan)
- [ ] Si shared: componente creado + spec + barrel export. Si inline: al menos 1 página migrada limpia como referencia
- [ ] API services (`director-attendance-api.service.ts`, `asistencia-profesor-api.service.ts`, `attendance.service.ts`) con métodos `descargarExcel*` paralelos a los PDF, sin refactor de los existentes
- [ ] Todas las páginas del inventario (estadisticas-dia, attendance-director-estudiantes, attendance-director-profesores, attendance-profesor-estudiantes, attendance-reports, boletas si aplica) con dropdown PDF/Excel
- [ ] Cap 500 ln respetado en los archivos de componente. Si alguno pasa, dividir
- [ ] `npm run lint` limpio, sin warnings nuevos
- [ ] `npm test` verde (todos los specs actuales + nuevos del shared component)
- [ ] Smoke manual en dev: descargar al menos 1 PDF y 1 Excel por cada página migrada, confirmar que:
  - El archivo se descarga con extensión correcta
  - Se abre sin warnings en Chrome/Firefox/Excel/LibreOffice
  - El contenido coincide con el PDF equivalente (misma selección de filtros)
- [ ] Actualizar `.claude/plan/maestro.md` fila Plan 25: Chat 3 ✅, Chat 4 ⏳ docs + tests. Progreso `~75% → ~90%` (3 de 4 chats cerrados tras Chat 3)
- [ ] Commit frontend con el mensaje sugerido abajo
- [ ] (Opcional) Commit separado `docs(maestro)` si la actualización del maestro se hace aparte
- [ ] **Mover este archivo** a `educa-web/.claude/chats/closed/`:
  ```bash
  mv "educa-web/.claude/chats/004-plan-25-chat-3-fe-ui-dual-pdf-excel.md" \
     "educa-web/.claude/chats/closed/"
  ```

## COMMIT MESSAGE sugerido

Idioma **inglés**, modo imperativo. Español solo entre `"..."` para términos de dominio. **NO** incluir `Co-Authored-By` (regla explícita de la skill `commit`).

Frontend (repo `educa-web`, branch `main`):

```text
feat(reports): Plan 25 Chat 3 — dual "PDF" / "Excel" download UI

- Replace every "Descargar PDF" button with a "Descargar" split button
  that exposes both PDF and Excel options across attendance pages
  ("attendance-director-estudiantes", "attendance-director-profesores",
  "attendance-profesor-estudiantes", "estadisticas-dia",
  "attendance-reports"), plus "Boleta de Notas" if present.
- Add sibling "descargarExcel*" methods in "director-attendance-api.service.ts",
  "asistencia-profesor-api.service.ts" and "attendance.service.ts"
  mirroring the existing "descargarPdf*" without touching the PDF path.
- Extract "<app-download-split-button>" shared component (only because
  it appears on 3+ pages) with a default PDF click to preserve the
  existing mental model. Menu dropdown adds the Excel option.
- Specs cover the 2-option menu, PDF default click, Excel submenu
  command, and no regressions on the previous PDF-only specs. Suite
  green.

Closes Plan 25 Chat 3.
```

Maestro update (si se hace commit aparte, repo `educa-web`, branch `main`):

```text
docs(maestro): close Plan 25 Chat 3 — dual UI "PDF" / "Excel" across all reports

- Plan 25 Chat 3 ✅ — every page that used to download only PDF now also
  offers Excel through a shared "<app-download-split-button>".
- Progreso ~90% (3 de 4 chats cerrados).

Next: Plan 25 Chat 4 — "business-rules.md" with the "every PDF must have
Excel" rule + smoke tests BE↔FE.
```

## CIERRE

Feedback breve a pedir al usuario tras cerrar:

- **Default del split-button**: ¿se mantuvo PDF como default o apareció evidencia en el uso real de que Excel es lo que la gente realmente quiere primero? Si lo segundo, Chat 4 puede invertir el default con un feature flag.
- **Shared component vs inline**: ¿el `<app-download-split-button>` quedó realmente compartido (≥3 usos) o fue extracción prematura? Si se quedó en 2 usos, revertir a inline en el siguiente chat.
- **Naming `descargarExcel*`**: ¿la simetría con `descargarPdf*` se sintió forzada (español en código) o natural? Si forzada, programar un chat de renombrado cross-cutting a inglés (`downloadPdf` / `downloadExcel`).
- **Nombre del archivo descargado**: ¿el que arma el BE (`Reporte_X_20260421.xlsx`) es lo que el Director espera, o prefiere incluir salón/profesor en el nombre para desambiguar en la carpeta de descargas?
- **Orden de backlog**: con Plan 25 Chat 3 cerrado, ¿seguimos con Plan 25 Chat 4 (docs + tests E2E) o saltamos a Plan 22 F4.BE/F4.FE pendiente antes de que la deuda se enfríe?
