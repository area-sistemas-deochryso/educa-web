> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Validación prod**: ✅ verificada 2026-04-27 — tab funciona; bugs de drawer ([object Object] + correlationId no renderizado) resueltos en chat aparte.
> **Plan**: 30b · **Chat**: FE · **Fase**: F1.FE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 30b FE — Sub-tab "Entradas con correo" (lista simétrica positiva)

## PLAN FILE

Plan 30b vive **inline en el maestro** (no tiene archivo dedicado). Referencia obligada:

- Maestro: [.claude/plan/maestro.md](../plan/maestro.md) — buscar la nota "🟢 **Plan 30b BE ✅ cerrado 2026-04-27**" + cola top-3 (item #3).
- Plan 30b BE cerrado: commit `0ee5848` en `Educa.API master` — agrega DTO `EntradaConCorreoEnviado` + campo `EntradasConCorreoEnviado` (`required`) a la respuesta de `GET /api/sistema/asistencia/diagnostico-correos-dia`.
- Plan 30 FE cerrado (2026-04-27, commit `dd68113`): el feature `email-outbox-diagnostico/` ya está en producción con `emailOutboxDiagnostico: true` y el sub-tab "Detalle" muestra 3 tablas del lado del gap (negativo). Falta la simétrica positiva.

## CONTEXTO DEL PEDIDO

El admin abrió el feature en producción y observó que el sub-tab "Detalle" del Gap del día solo muestra **3 tablas, todas del lado negativo**:

1. Entradas sin correo enviado
2. Estudiantes sin correo apoderado
3. Apoderados blacklisteados

El **conteo** de correos enviados existe en el `Resumen` (card verde), pero falta la **lista detallada** del lado positivo: ¿quiénes son los N estudiantes a los que SÍ les llegó el correo hoy? Esto cierra la simetría visual del feature.

## OBJETIVO

Espejar el nuevo campo `EntradasConCorreoEnviado` del DTO BE en el modelo FE, crear un componente simétrico verde/success al `entradas-sin-correo-table`, y agregar un **4to sub-tab** "Entradas con correo (N)" dentro del sub-tab "Detalle" en `tab-correos-dia.component.html`.

## PRE-WORK OBLIGATORIO

1. **Confirmar el shape exacto del nuevo DTO BE** consultando el commit `0ee5848` del backend:

   ```bash
   cd "c:/Users/Asus Ryzen 9/EducaWeb/Educa.API"
   git show 0ee5848 -- Educa.API/DTOs/Sistema/EntradaConCorreoEnviado.cs
   ```

   Campos exactos del DTO BE (camelCase en JSON):
   - `asistenciaId: number`
   - `estudianteId: number`
   - `dniMasked: string` (formato `***1234`)
   - `nombreCompleto: string`
   - `salon: string`
   - `graOrden: number`
   - `horaEntrada: string` (ISO datetime)
   - `emailOutboxId: number`
   - `correoApoderadoMasked: string` (formato `e***o@dominio.com` o `***@dominio.com`)
   - `estado: string` (siempre `"SENT"` en esta release; campo dejado abierto a expansión futura)
   - `fechaEnvio: string` (ISO datetime; mapea a `EO_FechaReg` — hora de encolado, cercana a `horaEntrada`)
   - `remitente: string | null` (buzón remitente del Plan 22 F6 multi-sender)
   - `correlationId: string | null` (para deep-link al hub `/intranet/admin/correlation/:id`)

2. **Familiarizarse con la estructura del feature existente** (≈10 min):
   - [tab-correos-dia.component.html](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/tab-correos-dia.component.html) — la estructura de sub-tabs `Resumen | Detalle` con 3 sub-sub-tabs adentro.
   - [entradas-sin-correo-table.component.ts](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/components/entradas-sin-correo-table/entradas-sin-correo-table.component.ts) — el componente que vas a espejar (mismo patrón pero variante verde/success).
   - [correos-dia.store.ts](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/services/correos-dia.store.ts) — agregar el computed `entradasConCorreoEnviado` y exponerlo vía `vm`.
   - [correos-dia.models.ts](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/models/correos-dia.models.ts) — donde vive el mirror del DTO BE.

3. **Verificar el feature flag**:

   ```bash
   grep emailOutboxDiagnostico src/app/config/environment*.ts
   ```

   Debería estar en `true` en ambos environments. Si no, no hay nada que hacer del lado del flag — solo se reemplaza la página existente.

## ALCANCE

### 1. Espejar el DTO en `correos-dia.models.ts`

Agregar la nueva interfaz **antes del `// #endregion DTOs`**:

```typescript
export interface EntradaConCorreoEnviado {
  asistenciaId: number;
  estudianteId: number;
  dniMasked: string;
  nombreCompleto: string;
  salon: string;
  graOrden: number;
  horaEntrada: string;
  emailOutboxId: number;
  correoApoderadoMasked: string;
  estado: string;          // siempre "SENT" hoy; abierto a expansión
  fechaEnvio: string;      // ISO datetime
  remitente: string | null;
  correlationId: string | null;
}
```

Y agregar el campo nuevo a `DiagnosticoCorreosDiaDto`:

```typescript
export interface DiagnosticoCorreosDiaDto {
  fecha: string;
  sedeId: number | null;
  resumen: DiagnosticoCorreosDiaResumen;
  estudiantesSinCorreo: EstudianteSinCorreoApoderado[];
  apoderadosBlacklisteados: ApoderadoBlacklisteadoDelDia[];
  entradasSinCorreoEnviado: EntradaSinCorreoEnviado[];
  entradasConCorreoEnviado: EntradaConCorreoEnviado[];   // <— nuevo (Plan 30b)
  generatedAt: string;
}
```

### 2. Exponer el array en el store

En [correos-dia.store.ts](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/services/correos-dia.store.ts) agregar el computed y sumarlo al `vm`:

```typescript
readonly entradasConCorreoEnviado = computed(
  () => this._dto()?.entradasConCorreoEnviado ?? [],
);

// ...y dentro del vm:
readonly vm = computed(() => ({
  // ... campos existentes ...
  entradasConCorreoEnviado: this.entradasConCorreoEnviado(),
}));
```

### 3. Crear componente `entradas-con-correo-table`

Carpeta nueva: `tab-correos-dia/components/entradas-con-correo-table/` con 4 archivos (mismo patrón que `entradas-sin-correo-table`):

- `entradas-con-correo-table.component.ts`
- `entradas-con-correo-table.component.html`
- `entradas-con-correo-table.component.scss`
- `entradas-con-correo-table.component.spec.ts`

Diseño visual (variante verde/success vs rojo/danger del componente negativo):

| Columna | Contenido | Notas |
|---------|-----------|-------|
| **DNI** | `<code>{{ row.dniMasked }}</code>` | mismo estilo |
| **Nombre** | `{{ row.nombreCompleto }}` | mismo estilo |
| **Salón** | `<p-tag [value]="row.salon" styleClass="tag-neutral" />` | tag neutral (informativo, design-system A1) |
| **Entrada** | `{{ row.horaEntrada \| date: 'HH:mm' }}` | mismo formato |
| **Correo apoderado** | `<code>{{ row.correoApoderadoMasked }}</code>` | enmascarado por BE |
| **Envío** | `{{ row.fechaEnvio \| date: 'HH:mm' }}` | timestamp del encolado |
| **Estado** | `<p-tag value="SENT" severity="success" />` | severity hace el trabajo (design-system A1 Opción C — crítico positivo) |
| **Correlation** | `<app-correlation-id-pill [correlationId]="row.correlationId" [compact]="true" />` si no es null, sino `<span class="muted">—</span>` | pill del Plan 32 |

Empty message del `#emptymessage`:

```html
<div class="empty-state">
  <i class="pi pi-inbox"></i>
  <p>Aún no hay entradas con correo enviado hoy</p>
</div>
```

Sin prop `isCritical` — todo es estado estable. Severity está fijo, no necesita lógica de mapeo. Si se prefiere, agregar utility `senderTooltip(remitente: string | null): string` para mostrar el buzón emisor en `pTooltip` del icono de envío.

**Imports del componente**: `TableModule`, `TagModule`, `DatePipe`, y `CorrelationIdPillComponent` (de `@shared/components/correlation-id-pill`).

**Selector**: `app-entradas-con-correo-table`.

**Cap 300 ln**: el componente HTML va a quedar en ~50-60 ln, TS ~30 ln, SCSS ~15 ln. Sin riesgo.

### 4. Agregar el 4to sub-tab en el HTML

En [tab-correos-dia.component.html](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/tab-correos-dia.component.html), dentro de `<p-tabs value="entradas" class="detalle-subtabs">`, agregar el nuevo `p-tab` y su `p-tabpanel`:

```html
<!-- Posición sugerida: 4ta tab, después de "Apoderados blacklisteados" -->
<p-tab value="enviados">
  <i class="pi pi-check-circle"></i>
  <span>Entradas con correo</span>
  @if (hasData() && vm().entradasConCorreoEnviado.length > 0) {
    <span class="tab-badge tab-badge--success">
      {{ vm().entradasConCorreoEnviado.length }}
    </span>
  }
</p-tab>
```

Y el panel correspondiente:

```html
<p-tabpanel value="enviados">
  @if (vm().loading && !hasData()) {
    <app-table-skeleton [columns]="enviadosColumns" [rows]="8" />
  } @else if (hasData()) {
    <app-entradas-con-correo-table [data]="vm().entradasConCorreoEnviado" />
  }
</p-tabpanel>
```

### 5. Definir `ENVIADOS_COLUMNS` y agregar la clase `tab-badge--success`

En [tab-correos-dia.component.ts](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/tab-correos-dia.component.ts):

```typescript
const ENVIADOS_COLUMNS: SkeletonColumnDef[] = [
  { width: '110px', cellType: 'text' },     // DNI
  { width: 'flex', cellType: 'text' },      // Nombre
  { width: '160px', cellType: 'badge' },    // Salón
  { width: '90px',  cellType: 'text' },     // Entrada
  { width: '180px', cellType: 'text' },     // Correo apoderado
  { width: '90px',  cellType: 'text' },     // Envío
  { width: '90px',  cellType: 'badge' },    // Estado
  { width: '110px', cellType: 'badge' },    // Correlation pill
];
```

Importar el nuevo componente y agregarlo al `imports` del `@Component`. Exponer `enviadosColumns = ENVIADOS_COLUMNS;`.

### 6. SCSS: tab-badge variante success

En [tab-correos-dia.component.scss](../../src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/tab-correos-dia.component.scss) localizar `.tab-badge--neutral` y agregar al lado:

```scss
.tab-badge--success {
  background: color-mix(in srgb, var(--green-500) 15%, transparent);
  border: 1px solid var(--green-500);
  color: var(--green-700);
}
```

(Reutilizar el patrón de `color-mix` del design-system B9 para banners de éxito.)

## TESTS MÍNIMOS

### `entradas-con-correo-table.component.spec.ts`

| # | Caso | Esperado |
|---|------|----------|
| 1 | Renderiza filas con DNI enmascarado, nombre y correo enmascarado | `textContent` contiene `***1234`, `PEREZ, JUAN`, `e***o@dominio.com` |
| 2 | Empty state cuando `data()` es array vacío | `textContent` contiene `Aún no hay entradas con correo enviado hoy` |
| 3 | Renderiza tag de severity success por fila (cuando hay data) | DOM tiene al menos un `.p-tag-success` |

Helper `makeEntradaConCorreo(overrides)` simétrico al `makeEntrada` del spec del componente negativo.

### `correos-dia.store.spec.ts` y `correos-dia.facade.spec.ts`

Si los specs existentes assertean el shape exacto del DTO con todas las propiedades, **agregar `entradasConCorreoEnviado: []`** a cualquier mock o expected. Hacer un grep primero:

```bash
grep -rn "estudiantesSinCorreo\|entradasSinCorreoEnviado" \
  src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/services/*.spec.ts
```

Si las facadas/services emiten DTOs con campos faltantes, los tests lo van a captar como `undefined`. Mejor agregarlos defensivamente en los mocks compartidos.

### `tab-correos-dia.component.spec.ts` (si existe)

| # | Caso | Esperado |
|---|------|----------|
| 4 | Cuando `vm().entradasConCorreoEnviado.length > 0`, el badge success aparece con el conteo | `textContent` del `<p-tab value="enviados">` contiene el número exacto |

Si no hay spec del smart component (Plan 30 FE cerró con uno general en el feature), no agregar uno nuevo solo por esto — el test del componente presentacional + el spec del store cubren el flujo.

**Total**: 3 tests nuevos del componente + 1 test del badge si aplica + actualizar mocks de specs existentes para incluir el nuevo campo en el shape.

## REGLAS OBLIGATORIAS

- **`code-language.md`** — código en inglés, UI en español. Selector `app-entradas-con-correo-table`. Path de archivos en kebab-case.
- **`code-style.md`** — `OnPush`, signals, `input.required<T>()`, imports desde alias (`@shared/components` para la pill).
- **`a11y.md`** — el icono de envío con `pTooltip` también requiere `aria-label` vía `[pt]` si se hace clickeable. Para esta tabla no hay botones — solo lectura, así que la tabla en sí no requiere acciones a11y especiales más allá de `aria-label` en el `<section>`.
- **`design-system.md` A1 (Opción C)** — `<p-tag value="SENT" severity="success" />` **sin** `tag-neutral`. El estado SENT es información operativa (admin la lee para confirmar), no metadato categorizador. **Salón** sí va con `tag-neutral` (categoría/contexto del estudiante).
- **`design-system.md` B4** — tabla con header UPPERCASE 0.8rem (`label-uppercase`), row-hover, sin background propio (el global hace transparente).
- **`primeng.md`** — si la tabla tiene paginator, usar el patrón estándar `[paginator]="data().length > 5"` + `[rowsPerPageOptions]="[5, 10, 15, 20]"` (mismo que la negativa).
- **`comments.md` + `regions.md`** — separar por regiones colapsables.
- **`templates.md`** — todo computed, no funciones en bindings (`razonSeverity` no aplica acá porque es estado fijo).
- **`testing.md`** — Vitest + `componentRef.setInput('data', [...])`, `fixture.detectChanges()`.
- **Cap 200-350 ln** archivos TS, **150-250 ln** templates HTML — el componente nuevo no se acerca al cap.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

1. **El JOIN BE NO usa entidad polimórfica** — el brief original asumía `EO_TipoEntidadOrigen` + `EO_EntidadOrigenId`, pero el sistema correlaciona por `EO_Destinatario = EST_CorreoApoderado` dentro de la ventana del día. Para el FE no cambia nada (los campos llegan camelCase como espera Angular), pero saber esto evita malentendidos cuando se debugea cross-stack.

2. **`fechaEnvio` mapea a `EO_FechaReg` (encolado), no a `EO_FechaEnvio`** — semánticamente "FechaEnvio" en el contrato del DTO se refiere al encolado del outbox, que ocurre sincrónicamente al webhook. La hora real de envío SMTP vive en `EO_FechaEnvio` (no expuesto en este DTO). Si el usuario pide "hora real SMTP" más adelante, esa es deuda lateral del Plan 30b — abrir un mini-plan derivado.

3. **El campo `estado` siempre es `"SENT"` hoy** — el contrato lo deja abierto a expansión futura (PENDING/RETRYING). Para el FE: NO hardcodear `value="SENT"` en el `<p-tag>`; usar `[value]="row.estado"` y `severity="success"` por ahora. Cuando el contrato expanda, solo cambia el mapeo de severity (no el shape).

4. **El componente `<app-correlation-id-pill>` ya existe** del Plan 32 Chat 4 FE (commit `a70b8d3`). Vive en `@shared/components/correlation-id-pill/`. Acepta `correlationId: string | null`, modo `compact` que trunca a 8 chars con tooltip al id completo, y al click navega al hub `/intranet/admin/correlation/:id` reusando el permiso vía override.

5. **El feature `email-outbox-diagnostico/` está al 100% en producción** con flag `emailOutboxDiagnostico: true`. No hay que tocar el flag. Solo se agrega un sub-tab a una página existente.

6. **`tab-badge--neutral` ya existe** en el SCSS de `tab-correos-dia.component.scss` para los 3 sub-tabs negativos. Agregar `tab-badge--success` siguiendo el mismo patrón con `color-mix` y verde.

## FUERA DE ALCANCE

- **NO tocar el BE** — Plan 30b BE ya está cerrado y commiteado en `Educa.API master 0ee5848`. El usuario hará push cuando esté listo.
- **NO tocar `tab-correo-individual/`** — el sub-feature del 2do tab principal sigue intacto (esto es solo `tab-correos-dia/`).
- **NO agregar paginación nueva** — usar el patrón existente del componente negativo (paginator solo si `data().length > 5`).
- **NO agregar filtros ni ordenamiento custom** — el array viene ordenado del BE por `HoraEntrada` ascendente. Confirmado en el correlator del Chat BE.
- **NO modificar el feature flag** ni la ruta — la página y permiso ya existen en producción.
- **NO refactorizar los 3 componentes hermanos** (`entradas-sin-correo-table`, `estudiantes-sin-correo-table`, `apoderados-blacklisteados-table`) — el chat es agregar uno nuevo, no rediseñar la familia.

## CRITERIOS DE CIERRE

- [ ] Pre-work hecho: shape DTO confirmado con `git show 0ee5848`, archivos del feature leídos, flag verificado.
- [ ] Interfaz `EntradaConCorreoEnviado` agregada a `correos-dia.models.ts`.
- [ ] Campo `entradasConCorreoEnviado` agregado a `DiagnosticoCorreosDiaDto` (mirror del BE).
- [ ] Computed `entradasConCorreoEnviado` + entry en `vm` agregados al store.
- [ ] Componente nuevo `entradas-con-correo-table` creado (4 archivos, mismo patrón que el negativo, variante verde/success).
- [ ] 4to sub-tab "Entradas con correo" agregado al HTML del `tab-correos-dia` con badge success.
- [ ] `ENVIADOS_COLUMNS` definido en el componente smart con 8 columnas.
- [ ] `.tab-badge--success` agregado al SCSS con `color-mix` verde.
- [ ] `<app-correlation-id-pill>` integrada en la columna Correlation (compact + null fallback).
- [ ] **3+ tests nuevos** del componente presentacional verde.
- [ ] Mocks de specs existentes (store/facade/component) actualizados con `entradasConCorreoEnviado: []` donde corresponda.
- [ ] `npm run lint` limpio.
- [ ] `npm test` verde end-to-end (baseline 1632 → 1635+ tras los nuevos tests).
- [ ] `npm run build` verde sin warnings nuevos.
- [ ] Smoke test manual: arrancar dev server, navegar a `/intranet/admin/email-outbox?tab=correos-dia`, click en sub-tab "Detalle", confirmar que aparece el 4to sub-tab "Entradas con correo (N)" con badge success y que la tabla renderiza con la pill correlation funcional (al click navega al hub).
- [ ] Commit FE en `educa-web main` con mensaje canónico (en inglés, sin Co-Authored-By).
- [ ] Plan maestro actualizado: nota de cierre Plan 30b FE + Plan 30b al **100%** + cola top-3 actualizada.
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat.

## COMMIT MESSAGE sugerido

```
feat(diagnostico-correos): Plan 30b FE - add "entradas con correo" sub-tab

Add the symmetric positive sub-tab to the "Detalle" view of the daily
gap diagnostic. The "Entradas con correo (N)" tab mirrors the existing
negative tabs but with success styling, listing every "AsistenciaPersona"
in INV-C11 scope whose "EmailOutbox" row is "SENT" today.

Each row carries the masked recipient, sender mailbox, "fechaEnvio"
(enqueue time, mapping to "EO_FechaReg") and an "<app-correlation-id-pill>"
that deep-links to the Plan 32 hub. Closes the visual symmetry of the
daily gap drill-down: admins now see the complete picture in one glance.

Wires the new "EntradaConCorreoEnviado" DTO that landed in Educa.API
master 0ee5848: model mirror, store computed + vm, smart-component
column config, success-variant tab badge, and 3 new component specs.
Updates existing store/facade specs to include the new field in DTO
mocks defensively.
```

## CIERRE

Al cerrar este chat, pedir feedback al usuario sobre:

1. **Decisión visual del orden de columnas** — ¿hay un orden mejor para las 8 columnas? El brief sugiere DNI/Nombre/Salón/Entrada/Correo/Envío/Estado/Correlation, pero "Estado" es siempre SENT y podría omitirse a esta altura del proyecto. Si el usuario prefiere, se quita la columna Estado y queda en 7 columnas (más legible). Mantener el campo en el DTO igual — solo decidir si se renderiza.

2. **Posición del nuevo sub-tab** — agregado al final (4to). Si el usuario prefiere que aparezca primero (orden positivo→negativo: "Con correo" → "Sin correo" → "Sin apoderado" → "Blacklisteados"), reordenar.

3. **Si emerge una variante futura** del Plan 30b ampliando el filtro a PENDING/RETRYING (el campo `estado` quedó abierto a esto), abrir mini-plan derivado en lugar de modificar este chat.

Después del cierre, agregar al final de la cola del maestro cualquier trabajo derivado descubierto. Si todo Plan 30b queda al 100%, mover ambos briefs cerrados (BE + FE) a `closed/` y archivar el plan en `.claude/history/planes-cerrados.md` cuando el usuario confirme validación post-deploy.
