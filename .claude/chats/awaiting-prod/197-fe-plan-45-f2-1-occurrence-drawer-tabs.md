# Brief 197 — Plan 45 F2.1 · Tabs en `error-occurrence-drawer` (UI rework parte 1/2)

> **Creado**: 2026-05-19 · **Cerrado local**: 2026-05-19 (awaiting-prod) · **Modo**: /investigate → /design (micro) → /execute → /validate
> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan padre**: [`educa-coord/plans/xrepo-45-monitoreo-incidencias-rework.md`](../../../../educa-coord/plans/xrepo-45-monitoreo-incidencias-rework.md) §F2 — UI rework `/incidencias/errores`. Diseño F2-F6 ✅ en [brief 196](../../../../educa-coord/chats/closed/196-plan45-design-f2-f6.md).
> **Anclado en**: [ADR-0005](../../../../educa-coord/decisions/0005-problem-details-error-shape.md) (ProblemDetails RFC 7807).
> **Validación prod**: ⏳ pendiente desde 2026-05-19 — smoke browser en `https://educa.com.pe/intranet/admin/monitoreo/incidencias/errores` post-deploy Netlify. Cerrar con [`/verify 197`](../../commands/verify.md).

## Contexto

Plan 45 🔴 urgente en coord maestro. F2 FE corre en paralelo a F5 BE (otro repo). El diseño de F2 (brief 196 coord) escribió el scope mirando `ErrorGroupDetailDrawerComponent` como anchor, pero al inspeccionar el codebase aparece una estructura natural en dos niveles que el design no resolvió:

- `error-group-detail-drawer` — drawer **a nivel grupo** con tabs **Resumen / Ocurrencias paginadas**. Datos: `ErrorGroup` + lista de `OcurrenciaLista[]`. NO muestra stack/breadcrumbs/payloads.
- `error-occurrence-drawer` — **sub-drawer** que abre al click en una ocurrencia. Muestra `ErrorLogCompleto` con stack/breadcrumbs/req-res en una **vista vertical sin tabs**. Es el que tiene la data por evento individual.

**Interpretación de F2 que aplica acá**: los tabs **General / Trace / Breadcrumbs / Group / Request-Response** del plan F2 son **por ocurrencia individual**, no por grupo. Por lo tanto el rework natural va sobre el `error-occurrence-drawer` (no sobre el group-drawer, que ya tiene su separación correcta Resumen/Ocurrencias).

Esta interpretación se documenta acá para que F2.2 (JOIN endpoint + vista por evento ErrorLog) la herede.

## Scope (F2.1 — chat actual)

Rework del `error-occurrence-drawer` para reorganizar el contenido vertical actual en tabs PrimeNG `p-tabs`. **Sin endpoint nuevo, sin BE deps**. Toda la data ya viene en `ErrorLogCompleto` (verificado en `error-groups.models.ts:177-199`).

### Tabs propuestos

1. **General** (default) — Resumen actual: severidad, origen, mensaje, URL, HTTP method/status, errorCode, usuario, plataforma, userAgent, sourceLocation, fecha.
2. **Trace** — Por ahora **empty state** con copy "Sin trace registrado para este evento" + nota informativa "Trace cross-layer estará disponible cuando F5 BE complete (ProblemDetails + endpoint `/full`)". Espacio reservado en la UI para que F2.2 lo llene con `ErrorLogTrace[]` cuando el endpoint exista.
3. **Breadcrumbs** — Las filas existentes `errorCompleto.breadcrumbs[]` ordenadas por `orden`, con icono `TIPO_ACCION_ICON_MAP`, descripción, ruta, timestamp y metadata.
4. **Group** — Mini-card con info del grupo padre: estado, contador total, fechas primera/última, link a abrir el group-drawer. Si la ocurrencia no tiene grupo (`ErrorLogCompleto` no expone groupId hoy), placeholder informativo. Requiere chequear si el endpoint actual `/errors/{id}` devuelve el group context o solo el log.
5. **Request/Response** — `requestHeaders`, `requestBody`, `responseBody` con `formatJson` (ya existe). Botón "Copiar para reproducción" (`copyForReproduction`, ya existe) en el header del tab.

### Comportamiento

- Tabs siempre en el DOM (regla `dialogs-sync.md` — overlays nunca dentro de `@if`).
- Cuando `notFound()` o `loading()`, mostrar los estados actuales **fuera** del tabs (header del drawer), no dentro de un tab.
- Default tab activo: `General`.
- Si el tab seleccionado tiene data vacía (ej: sin breadcrumbs), mostrar empty state propio del tab.

## Scope (F2.2 — chat siguiente, NO acá)

Para que quede explícito y no contamine este chat:

- Endpoint BE nuevo `GET /api/sistema/error-logs/{id}/full` (o flag `?includeContraparte=true`) que devuelva `ErrorLog + ErrorLogTrace[] + ErrorLogDetalle[] + ErrorGroup` en un solo payload.
- JOIN FE↔BE por `CorrelationId` dentro del tab Trace (bloque "Contraparte BE/FE").
- Vista por evento (`ErrorLog`) en `ErrorGroupsViewToggle` además de la vista por grupo.

## Out-of-scope

- No tocar `error-group-detail-drawer` (group-level). Sus tabs `Resumen/Ocurrencias` quedan como están.
- No tocar facade/store/services existentes.
- No tocar `error.interceptor.ts` ni `ErrorReporterService` (eso es F3).
- No tocar `ProblemDetails` ni `normalizeErrorBody` (eso es F3 — depende de F5 BE).
- No tocar `ErrorGroupsViewToggle` (eso es F2.2).
- No agregar endpoint BE (eso es F2.2).

## Validación

- `npm run lint` limpio.
- `npx tsc --noEmit -p tsconfig.app.json` limpio.
- Test existente `error-groups.component.spec.ts` y vecinos siguen verdes (los specs no testean este drawer directamente — verificar que no rompió por re-exports).
- Smoke manual: abrir `/intranet/admin/incidencias/errores`, click en un grupo → click en una ocurrencia → ver que los 5 tabs renderizan con su data, tab default es General, copiar-para-reproducción sigue funcional.

## Decisiones por confirmar (micro, antes de tipear código)

| # | Decisión | Default propuesto |
|---|---|---|
| 1 | ¿Tab "Group" cuando `ErrorLogCompleto` no expone groupId? | Placeholder "Grupo no disponible en esta vista. Cierra el sub-drawer para volver al grupo padre." Si el endpoint actual sí lo devuelve (revisar BE), mostrarlo. |
| 2 | ¿Tab "Trace" vacío con copy explicativo o ocultar tab hasta F2.2? | Mostrar tab con empty state. Ayuda a comunicar "esto viene". |
| 3 | ¿`p-tabs` (PrimeNG 21) o `p-tabView` (PrimeNG legacy)? | `p-tabs` — ya está importado `TabsModule` en el group-drawer, mismo módulo. |

## Referencias

- Plan padre: `educa-coord/plans/xrepo-45-monitoreo-incidencias-rework.md` §F2.
- Diseño F2-F6: `educa-coord/chats/closed/196-plan45-design-f2-f6.md`.
- Output F1 investigate: `educa-coord/plans/xrepo-45-investigate-output.md`.
- ADR-0005 ProblemDetails: `educa-coord/decisions/0005-problem-details-error-shape.md`.
- Componente a reworkear: `src/app/features/intranet/pages/admin/error-groups/components/error-occurrence-drawer/`.
- Modelo: `src/app/features/intranet/pages/admin/error-groups/models/error-groups.models.ts:177-199` (`ErrorLogCompleto`).
- Reglas: `.claude/rules/dialogs-sync.md`, `.claude/rules/primeng.md`, `.claude/rules/design-system.md`.

## Resultado

- **Archivos** (4):
  - `src/app/features/intranet/pages/admin/error-groups/components/error-occurrence-drawer/error-occurrence-drawer.component.ts` — `+TabsModule`, `+parentGroup` input (`ErrorGroupLista | null`), `+ESTADO_LABEL_MAP / SEVERITY_MAP` imports, `+getEstadoLabel/Severity` helpers.
  - `src/app/features/intranet/pages/admin/error-groups/components/error-occurrence-drawer/error-occurrence-drawer.component.html` — rewrite completo: origin banner + cadena de llamadas siguen fuera de tabs (header del drawer), resto del contenido envuelto en `<p-tabs value="general">` con 5 tabpanels.
  - `src/app/features/intranet/pages/admin/error-groups/components/error-occurrence-drawer/error-occurrence-drawer.component.scss` — `+#region Tabs (F2.1)`: `.occurrence-tabs`, `.tab-count`, `.tab-empty`, `.tab-future-hint` (color-mix `--blue-500` 8% para "viene en F2.2"), `.detail-section--flush`, `.correlation-link`.
  - `src/app/features/intranet/pages/admin/error-groups/error-groups.component.html` — agregado `[parentGroup]="selectedGroup()"` al sub-drawer.

- **Distribución del contenido** en los 5 tabs:
  - **General** (default) — Mensaje + Contexto técnico (URL, Error Code, Usuario, Plataforma, User Agent). Sin CorrelationId.
  - **Trace** — Stack trace texto + caja informativa "F5 BE pendiente" anunciando el `ErrorLogTrace[]` por capa de F2.2.
  - **Breadcrumbs** — Flujo del usuario (10+ entries en FE) con badge contador en el label; empty state en BACKEND.
  - **Group** — Bloque "Grupo padre" (Estado tag, Ocurrencias, Primera/Última vez, Fingerprint) usando `[parentGroup]` + bloque "Correlation ID" (pill UUID + link "Ver eventos correlacionados").
  - **Req/Res** — Datos de Reproducción + botón copia (BACKEND); empty state en FRONTEND.

- **Validación**:
  - `npx tsc --noEmit -p tsconfig.app.json` — exit 0.
  - `npx eslint` sobre archivos tocados — exit 0.
  - `max-lines` error pre-existente en `error-groups.component.ts:372` (313 ln vs 300) — verificado contra main, no es regresión.
  - Smoke browser local con Cowork: **18/18 checks ✅** sobre 2 ocurrencias (FE HTTP 401 + BE "A task was canceled"). No requests extra al cambiar tabs (tabs son client-side). Drawer nivel 2 (Resumen/Ocurrencias) intacto.

- **Sin tocar**: facade/store/services del feature, `error-group-detail-drawer`, `error.interceptor.ts`, `normalizeErrorBody` (F3), endpoints BE (F2.2 / F5).

## Aprendizajes transferibles

- **El diseño de tabs por evento (no por grupo)** clarificó una ambigüedad del brief 196 coord: F2 escribió "extender `ErrorGroupDetailDrawerComponent`" pero la data Trace/Breadcrumbs/Req-Res es por evento individual. La interpretación correcta — rework sobre el sub-drawer nivel 3 — debe heredarla F2.2 al diseñar el endpoint compuesto `/full` y la "vista por evento" del `ErrorGroupsViewToggle`.
- **Cowork como visual pre-check antes de tocar UI** ahorró ciclos: el audit reveló que (a) los tabs Breadcrumbs vs Req/Res son mutuamente excluyentes según `origen`, (b) el CorrelationId ya tenía CTA + link existente que no había que reconstruir, (c) el stack trace de texto ya estaba presente — el "Trace" tab del plan se refería a `ErrorLogTrace[]` (layer trace, F2.2), no al stack texto. Hacer las suposiciones explícitas con datos del DOM real costó 1 ida y vuelta de prompt vs adivinar y rehacer.
- **`[parentGroup]` como input desde el padre** evita un endpoint nuevo de `/api/sistema/error-groups/{id}` para el contexto del grupo en el sub-drawer. El parent component ya tiene el grupo seleccionado en `store.selectedGroup`; pasarlo down como input cumple el principio "no traer data que ya tenés a mano".
- **Tabs PrimeNG 21 (`p-tabs / p-tablist / p-tab / p-tabpanels / p-tabpanel`)** vs el legacy `p-tabView`: el feature ya usaba el shape nuevo en `error-group-detail-drawer`, así que mantuvimos consistencia. `TabsModule` único import. Estado del tab activo se maneja con atributo `value` declarativo, sin signal extra.

## Deuda residual (no bloqueante)

- **"Usuario: Anónimo" cuando `usuarioRol`/`usuarioDni` son null** (sugerencia de Cowork). Hoy se omite la fila completa; consistencia visual mejoraría con literal "Anónimo". Fix de 2 líneas en el tab General — se hace en F2.2 al pasar por ahí, o en una limpieza menor.
- **`max-lines` pre-existente** en `error-groups.component.ts:372` (313 ln vs 300). Refactor sugerido: extraer los handlers de drawer/dialog a un facade-UI. Out of scope F2.1.

## Próximos pasos (handoff a F2.2)

F2.2 — **JOIN endpoint + vista por evento (`ErrorLog`)**:

- Endpoint BE nuevo: `GET /api/sistema/error-logs/{id}/full` (o flag `?includeContraparte=true`) que devuelva `ErrorLog + ErrorLogTrace[] + ErrorLogDetalle[] + ErrorGroup` en un solo payload. Reemplaza el `parentGroup` input por data del propio response.
- JOIN FE↔BE por `CorrelationId` dentro del tab Trace: bloque "Contraparte BE/FE" con link al `ERL_CodID` correspondiente.
- Vista por evento (`ErrorLog`) en `ErrorGroupsViewToggle` además de la vista por grupo. Modo "evento individual" con tabla por filas de `ErrorLog`, filtros por `CorrelationId`, `UsuarioDni`, ventana temporal.
- Cuando llegue `ErrorLogTrace[]`, reemplazar el placeholder del tab Trace por la tabla por capa (`Capa`, `Componente`, `Metodo`, `DuracionMs`, `Resultado`, `ErrorSnippet`).

Estimado coord para F2.2: **1 chat FE + 0.5-1 chat BE**.
