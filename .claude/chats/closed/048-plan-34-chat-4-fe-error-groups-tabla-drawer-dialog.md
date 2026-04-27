> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 34 · **Chat**: 4 · **Fase**: F4 FE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 34 Chat 4 FE — Vista tabla `ErrorGroups` + multi-facade + drawer + dialog cambio estado

## PLAN FILE

Ruta del plan: `.claude/plan/saneamiento-errores.md` — sección **"Chat 4 FE — Vista tabla + multi-facade + drawer + dialog cambio estado"** (≈ líneas 196-261).

Maestro: `.claude/plan/maestro.md` — fila Plan 34 (60%, post-Chat 3 BE `0b67b04`).

## OBJETIVO

Cerrar la primera mitad del FE del Plan 34: convertir el dashboard admin actual `/intranet/admin/trazabilidad-errores` (vista tabla de **ocurrencias** `ErrorLog`) en vista tabla de **grupos** `ErrorGroup` consumiendo los 5 endpoints recién shipped en Chat 3 BE. La vista Kanban con drag-drop CDK queda para Chat 5 FE.

Al cerrar este chat, el admin Director puede:

- Ver listado paginado de grupos de errores con filtros (estado, severidad, origen, búsqueda en mensaje).
- Abrir drawer con metadata + tabs `Resumen` / `Ocurrencias` paginadas.
- Click en una ocurrencia → sub-drawer con stack/breadcrumbs/correlation-pill (lógica heredada del drawer actual).
- Cambiar estado de un grupo desde dialog (con observación opcional) — la matriz de transiciones permitidas se aplica en el FE Y en el BE (defensa en profundidad INV-ET07).

## CONTEXTO HEREDADO DEL CHAT 3 BE (commit `0b67b04` en `Educa.API master`)

Lo que el Chat 3 BE dejó funcionando — **la fuente de verdad para el shape de los DTOs y el comportamiento de los endpoints**:

### Endpoints disponibles

Todos bajo `[Authorize(Roles = Roles.Director)]` (INV-ET07 — Director-only por ahora). Si el `AsistenteAdministrativo` lo necesita, se discute al cerrar el Chat 4 con justificación; el FE NO debe asumir otros roles.

| Verb | Path | Query/body | Response |
|---|---|---|---|
| `GET` | `/api/sistema/error-groups` | `estado?`, `severidad?`, `origen?`, `q?`, `pagina=1`, `pageSize=20` | `ApiResponse<List<ErrorGroupListaDto>>` |
| `GET` | `/api/sistema/error-groups/count` | mismos filtros (sin pagina/pageSize) | `ApiResponse<int>` (paginación variante B de `pagination.md`) |
| `GET` | `/api/sistema/error-groups/{id:long}` | — | `ApiResponse<ErrorGroupDetalleDto>` |
| `GET` | `/api/sistema/error-groups/{id:long}/ocurrencias` | `pagina=1`, `pageSize=20` | `ApiResponse<List<OcurrenciaListaDto>>` |
| `PATCH` | `/api/sistema/error-groups/{id:long}/estado` | `{ estado, observacion?, rowVersion }` | `ApiResponse<string>` (mensaje) |

### DTOs reales (espejar 1:1 en `error-groups.models.ts`)

```ts
// ErrorGroupListaDto
interface ErrorGroupLista {
  id: number;                       // BE long → number es seguro hasta 2^53
  fingerprintCorto: string;         // primeros 12 chars del hex
  severidad: string;                // 'CRITICAL' | 'ERROR' | 'WARNING'
  mensajeRepresentativo: string;
  url: string;
  httpStatus: number | null;
  errorCode: string | null;
  origen: string;                   // 'FRONTEND' | 'BACKEND' | 'NETWORK'
  estado: ErrorGroupEstado;         // 'NUEVO' | 'VISTO' | 'EN_PROGRESO' | 'RESUELTO' | 'IGNORADO'
  primeraFecha: string;             // ISO string del backend
  ultimaFecha: string;
  contadorTotal: number;
  contadorPostResolucion: number;
  rowVersion: string;               // base64 (8 bytes serializados)
}

// ErrorGroupDetalleDto — superset
interface ErrorGroupDetalle extends Omit<ErrorGroupLista, 'fingerprintCorto'> {
  fingerprint: string;              // 64 chars (no truncado)
  observacion: string | null;
  totalOcurrencias: number;         // count separado del listado paginado
  usuarioReg: string;
  fechaReg: string;
  usuarioMod: string | null;
  fechaMod: string | null;
}

// OcurrenciaListaDto — drill-down del drawer
interface OcurrenciaLista {
  id: number;                       // ERL_CodID
  correlationId: string;
  fecha: string;
  httpMethod: string | null;
  httpStatus: number | null;
  mensaje: string;
  url: string;
  usuarioDni: string | null;        // ya enmascarado por backend
  usuarioRol: string | null;
  totalBreadcrumbs: number;
}

// CambiarEstadoErrorGroupDto (request)
interface CambiarEstadoErrorGroup {
  estado: ErrorGroupEstado;
  observacion?: string | null;       // cap 1000 en BE
  rowVersion: string;                // base64
}
```

### Códigos de error que el FE debe manejar

El interceptor global ya unwrappea `ApiResponse<T>` → `T`. Los errores llegan al `errorHandler` con shape estándar:

- `INV-ET07_ESTADO_INVALIDO` — 409 — el estado enviado no está en el catálogo.
- `ERRORGROUP_TRANSICION_INVALIDA` — 409 — la transición está prohibida por la matriz (la UI debe filtrar para que esto sea inalcanzable, pero por defensa en profundidad puede pasar).
- `INV-ET07_ROW_VERSION_STALE` — 409 — otro admin ya cambió el grupo. El FE debe refetchear el grupo, mostrar toast "El grupo fue modificado, recarga", y dejar el estado anterior.
- `ERROR_GROUP_NOT_FOUND` — 404 — el grupo fue purgado entre fetch y mutation.

### Matriz de transiciones (espejar exacto del BE)

```ts
// shared/constants o models/error-groups.models.ts
export const ESTADO_TRANSITIONS_MAP: Record<ErrorGroupEstado, ErrorGroupEstado[]> = {
  NUEVO:       ['VISTO', 'EN_PROGRESO', 'RESUELTO', 'IGNORADO'],
  VISTO:       ['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'IGNORADO'],
  EN_PROGRESO: ['NUEVO', 'VISTO', 'RESUELTO', 'IGNORADO'],
  RESUELTO:    ['NUEVO'],   // soft-terminal: solo reapertura manual
  IGNORADO:    ['NUEVO'],   // soft-terminal: solo unignore manual
};
```

El idem (X→X) es **no-op**, no error. El BE devuelve mensaje "Sin cambios" sin tocar BD ni RowVersion. El FE NO necesita incluir el estado actual en las opciones del dialog (el dialog solo muestra los destinos válidos).

## ALCANCE

| # | Archivo | Tipo | Estimado |
|---|---------|------|----------|
| 1 | `pages/admin/error-groups/models/error-groups.models.ts` | Nuevo (renombrado del feature) | ~80 ln |
| 2 | `pages/admin/error-groups/services/error-groups.service.ts` | Nuevo (5 métodos espejo) | ~80 ln |
| 3 | `pages/admin/error-groups/services/error-groups.store.ts` | Nuevo (extiende `BaseCrudStore`) | ~150 ln |
| 4 | `pages/admin/error-groups/services/error-groups-data.facade.ts` | Nuevo | ~120 ln |
| 5 | `pages/admin/error-groups/services/error-groups-crud.facade.ts` | Nuevo | ~100 ln |
| 6 | `pages/admin/error-groups/services/error-groups-ui.facade.ts` | Nuevo | ~80 ln |
| 7 | `pages/admin/error-groups/error-groups.component.ts` | Nuevo (vista tabla principal) | ~150 ln |
| 8 | `pages/admin/error-groups/error-groups.component.html` | Nuevo (filtros + tabla + drawer + dialog) | ~180 ln |
| 9 | `pages/admin/error-groups/error-groups.component.scss` | Nuevo | ~80 ln |
| 10 | `components/error-group-detail-drawer/` (3 archivos) | Nuevo (Tabs Resumen + Ocurrencias) | ~250 ln total |
| 11 | `components/error-occurrence-drawer/` (3 archivos) | **Mover** lógica del drawer actual de `error-logs/components/error-log-detail-drawer/` | ~200 ln total |
| 12 | `components/change-group-status-dialog/` (3 archivos) | Nuevo (dialog con observación) | ~150 ln total |
| 13 | `pages/admin/error-groups/index.ts` | Nuevo (barrel export) | ~5 ln |
| 14 | `intranet.routes.ts` | Modificar — `loadComponent` apunta al feature renombrado, ruta pública `/intranet/admin/trazabilidad-errores` se preserva | +2 ln |
| 15 | (eliminar) `pages/admin/error-logs/` | **Borrar** carpeta completa después de migrar el sub-drawer y verificar que no haya imports rotos | -archivos viejos |
| 16 | Tests: store, service, crud-facade (con WAL), data-facade, ui-facade, componente principal, drawer, sub-drawer, dialog | Nuevos | ~500 ln total |

### Renombrado del feature — ruta pública preservada

La ruta admin sigue siendo `/intranet/admin/trazabilidad-errores`. Solo cambia el path interno del feature:

```ts
// intranet.routes.ts (snippet actual a modificar)
{
  path: 'admin/trazabilidad-errores',
  loadComponent: () =>
    import('./pages/admin/error-groups').then((m) => m.ErrorGroupsComponent),
  // ...resto sin cambios (canActivate, data.permissionPath, etc.)
}
```

**Nota crítica**: La ruta del hub de correlation (Plan 32) tiene `data.permissionPath: 'intranet/admin/trazabilidad-errores'` — preservar ese override sin tocar.

### Lógica del componente principal (vista tabla)

Patrón canónico del proyecto (ver `pages/admin/email-outbox/email-outbox.component.ts` como referencia 1:1 — multi-facade + tabla + drawer + dialog + filtros con query params):

- **Filtros con `signal()` + sync con URL**: `estado`, `severidad`, `origen`, `q` (búsqueda mensaje, max 200 chars), `paginaOcurrencias` (separado del paginador principal).
- **Toggle "Ocultar resueltos/ignorados"**: ON por defecto. Cuando ON → filtros backend `estado` se vuelven multi (NUEVO+VISTO+EN_PROGRESO). Como el endpoint actual acepta solo `estado` único, el toggle ON sin filtro de estado explícito hace **3 fetches paralelos** y consolida — alternativa: agregar `estados` (multi) al BE en un follow-up. **Para el Chat 4 mantener la lógica simple**: si toggle ON y no hay filtro estado explícito, fetch sin filtro de estado y filtrar client-side antes de pasar al store. La paginación del BE seguirá basada en universo completo, esa diferencia se documenta como deuda menor.
- **Búsqueda con debounce 300ms** (`searchTrigger$.pipe(debounceTime, distinctUntilChanged, ...)` en facade, no en componente).
- **Paginador con count real** (regla `pagination.md` variante B): `getCount` se dispara en paralelo con `getList`; cuando cambian los filtros, ambos se refetchean; cuando cambia solo la página, **NO** se refetchea el count.
- **Mutación quirúrgica para `cambiarEstado`** (regla `crud-patterns.md`): el WAL aplica el nuevo estado en el store INMEDIATO, el BE confirma vía onCommit con el rowVersion fresco. El listado NO se refetchea.

### Drawer del grupo (`error-group-detail-drawer`)

PrimeNG `p-drawer` (NO `p-tabView` interno — ver design-system B10). Estructura:

- Header: badge severidad + estado + mensaje truncado.
- Body: 2 secciones colapsables o 2 tabs:
  - **Resumen**: metadata (fingerprint, primeraFecha, ultimaFecha, contadores, observacion editable inline con save al perder foco).
  - **Ocurrencias**: tabla paginada server-side (consume `GET /{id}/ocurrencias`). Click en fila → sub-drawer.
- Footer: 4 botones según `ESTADO_TRANSITIONS_MAP[grupo.estado]` (no hay botón para el estado actual). Cada botón abre el dialog cambio estado.

**Sincronización (regla `dialogs-sync.md`)**: el drawer SIEMPRE en el DOM, `[visible]` + `(visibleChange)` separados, NUNCA dentro de `@if`.

### Sub-drawer de ocurrencia (`error-occurrence-drawer`)

**Mover** la lógica actual de `pages/admin/error-logs/components/error-log-detail-drawer/` aquí. Sin cambios funcionales mayores:

- Stack trace, breadcrumbs (con `<app-error-breadcrumb-list>`), request/response body.
- `<app-correlation-id-pill>` (Plan 32) clickeable navega al hub de correlation — **preservar el comportamiento actual**.

El único cambio: ahora abre desde el drawer del grupo (no desde la tabla principal). El componente recibe la ocurrencia entera vía `@Input` o consume el detalle por id desde el service del feature.

### Dialog cambio estado (`change-group-status-dialog`)

PrimeNG `p-dialog` modal con:

- Título: "Cambiar estado de grupo de errores"
- Body: tag readonly del estado actual + select de destino (solo opciones válidas según matriz) + textarea opcional para observación (max 1000 chars con contador).
- Footer: Cancelar (text) + Guardar (success).
- Sync con `change-group-status-dialog.store` (signal de visibilidad + grupo seleccionado).

**Validación FE de la transición**: el select solo lista destinos en `ESTADO_TRANSITIONS_MAP[grupoActual.estado]`. La defensa en profundidad ya está en BE.

### WAL para cambio estado

```ts
// error-groups-crud.facade.ts (shape, no copy-paste)
cambiarEstado(grupoId: number, dto: CambiarEstadoErrorGroup, snapshot: ErrorGroupLista): void {
  this.wal.execute({
    operation: 'UPDATE',
    resourceType: 'error-groups',
    resourceId: grupoId,
    endpoint: `${this.apiBase}/${grupoId}/estado`,
    method: 'PATCH',
    payload: dto,
    http$: () => this.api.cambiarEstado(grupoId, dto),
    optimistic: {
      apply: () => {
        this.store.updateGroupEstado(grupoId, dto.estado);
        this.uiFacade.closeDialog();
      },
      rollback: () => {
        this.store.updateGroupEstado(grupoId, snapshot.estado);
      },
    },
    onCommit: () => {
      // El BE devuelve un mensaje (ApiResponse<string>), no un objeto.
      // El nuevo rowVersion no viaja en este endpoint — lo refetcheamos
      // solo si el siguiente cambio falla con INV-ET07_ROW_VERSION_STALE.
      // Alternativa: cambiar BE para devolver el grupo actualizado completo
      // (deuda lateral menor — anotar al cerrar).
    },
    onError: (err) => {
      if (err.errorCode === 'INV-ET07_ROW_VERSION_STALE') {
        // Refetch el grupo y mostrar toast.
        this.dataFacade.refetchGroup(grupoId);
      }
      this.errorHandler.showError('Error al cambiar estado', err.message);
    },
  });
}
```

### Filtros con query params en URL

Para deep-link y back button:

```
/intranet/admin/trazabilidad-errores?estado=NUEVO&severidad=CRITICAL&q=horarios&pagina=2
```

El componente lee `route.queryParams` en `ngOnInit`, hidrata los signals de filtros, y `router.navigate([], { queryParams })` cuando cambian. Patrón heredado de `pages/admin/email-outbox/email-outbox.component.ts`.

## TESTS MÍNIMOS

### Service (`error-groups.service.spec.ts` — 5 casos)

| # | Caso | Esperado |
|---|------|----------|
| 1 | `getList(filtros, pagina, pageSize)` | GET correcto, params en query string, response unwrappeada |
| 2 | `getCount(filtros)` | GET correcto, retorna number |
| 3 | `getDetalle(id)` | GET correcto |
| 4 | `getOcurrencias(grupoId, pagina, pageSize)` | GET correcto |
| 5 | `cambiarEstado(id, dto)` | PATCH con body correcto |

### Store (`error-groups.store.spec.ts` — ~8 casos)

Mutaciones quirúrgicas y filtros:

| # | Caso | Esperado |
|---|------|----------|
| 1 | `setGroups` actualiza el array | items() refleja el nuevo array |
| 2 | `setTotalCount(N)` | totalCount() = N |
| 3 | `updateGroupEstado(id, 'VISTO')` | Solo el grupo con id mantiene resto de campos, estado cambia a VISTO |
| 4 | `updateGroupEstado` para id no existente | No-op, sin error |
| 5 | `removeGroup(id)` | Item eliminado, totalCount decrementa en 1 si > 0 |
| 6 | `setFilters` actualiza signals | Filter signals reflejan nuevos valores |
| 7 | `clearFilters` | Filter signals vuelven a default |
| 8 | `setSelectedGroup` + `clearSelectedGroup` | selectedGroup signal sincroniza |

### Crud facade (`error-groups-crud.facade.spec.ts` — ~5 casos)

| # | Caso | Esperado |
|---|------|----------|
| 1 | `cambiarEstado(NUEVO → VISTO)` happy path | apply mueve store, no rollback |
| 2 | `cambiarEstado` con error 409 `INV-ET07_ROW_VERSION_STALE` | rollback al estado original, refetch del grupo, toast |
| 3 | `cambiarEstado` con error 409 `ERRORGROUP_TRANSICION_INVALIDA` | rollback, toast (no debería pasar pero defensa en profundidad) |
| 4 | `cambiarEstado` con error 404 | rollback, toast "El grupo fue eliminado" |
| 5 | `cambiarEstado` idem (NUEVO → NUEVO) | El FE filtra antes de llegar al WAL — el botón está disabled / no aparece |

### Componente principal (`error-groups.component.spec.ts` — ~6 casos)

| # | Caso | Esperado |
|---|------|----------|
| 1 | Render inicial muestra spinner mientras carga | skeleton |
| 2 | Filtros sincronizan con URL | navigate con queryParams |
| 3 | Click en fila → abre drawer | facade.openDrawer llamado |
| 4 | Botón "Cambiar estado" → abre dialog | facade.openDialog con grupo |
| 5 | Toggle "Ocultar resueltos/ignorados" | filtro client-side aplicado |
| 6 | Search con debounce | 300ms entre input y dispatch |

### Drawer + sub-drawer + dialog (~10 casos combinados)

- Drawer renderiza tabs y observación editable.
- Sub-drawer renderiza correlation pill clickeable que navega.
- Dialog solo lista destinos válidos según matriz.
- Dialog en DOM aunque no visible (`dialogs-sync.md`).

**Baseline FE post-Chat 4 esperado**: ~+30 tests sobre 1600 actuales → ~1630 verdes.

## REGLAS OBLIGATORIAS

- **`crud-patterns.md`** — multi-facade (data + crud + ui), mutaciones quirúrgicas para edit/toggle/delete, refetch solo en CREATE.
- **`dialogs-sync.md`** — `p-dialog` y `p-drawer` SIEMPRE en el DOM, `[visible]` + `(visibleChange)`, NUNCA en `@if`.
- **`optimistic-ui.md`** — WAL.execute con `optimistic.apply` + `rollback`, no pesimismo disfrazado.
- **`pagination.md` variante B** — `getCount` separado, fetch paralelo con `getList`, no recargar count al cambiar página.
- **`design-system.md`** — B1 contenedores con border (no background), B4 tabla con UPPERCASE 0.8rem + letter-spacing 0.5px, B6 filter bar, B10 drawer right-side, B8 dialog form-grid.
- **`a11y.md`** — botones icon-only con `pt: { root: { 'aria-label': '...' } }`, contraste, focus.
- **`templates.md`** — sin funciones en template (solo computed/signals), `@for` con track único, `@if @else if` anidado.
- **`code-style.md` + `code-language.md`** — código en inglés (archivos, clases, variables), UI en español (labels, mensajes, toast).
- **`reading-optimization.md`** — solo leer archivos que vas a modificar; confiar en convenciones del proyecto.
- **Cap 300 ln** por archivo TS, ~250 HTML — si se acerca, dividir.
- **No `any`** en código nuevo. Tipos semánticos para `ErrorGroupEstado`.
- **`Roles.Director`** en el guard y aria-labels; permisos reusan el path `intranet/admin/trazabilidad-errores`.

## APRENDIZAJES TRANSFERIBLES (del Chat 3 BE — commit `0b67b04`)

- **State machine en archivo único**: el BE consolidó la matriz INV-ET07 como entry en `Domain/Common/StateMachine/StateMachines.cs`, no archivo separado. El FE espejea con `ESTADO_TRANSITIONS_MAP` constante en `models/`.
- **Error code de transición**: el BE tira `BusinessRuleException("ERRORGROUP_TRANSICION_INVALIDA")` (auto-generado por `StateTransitionValidator`), no `INV-ET07_TRANSICION_INVALIDA` como sugería el brief original. El FE NO debe asumir el prefix `INV-ET07_` para todos los errores de transición — usar el catálogo real:
  - `INV-ET07_ESTADO_INVALIDO` — estado fuera del catálogo (sintáctico).
  - `INV-ET07_ROW_VERSION_STALE` — concurrencia.
  - `ERRORGROUP_TRANSICION_INVALIDA` — transición prohibida (idem retorna OK silencioso, no este error).
- **Idempotencia X→X**: el BE retorna `"Sin cambios"` sin mutar BD ni RowVersion. El FE puede confiar en eso pero igual filtra el botón / select para que sea inalcanzable desde la UI.
- **Paginación variante B**: el endpoint `/count` espeja exactamente los filtros del listado (sin pagina/pageSize). Patrón heredado del Plan 33 sobre `error-logs admin` — referenciar `pages/admin/email-outbox/services/email-outbox-data.facade.ts:loadCount` como template.
- **`OcurrenciaListaDto` ya enmascara DNI**: el BE responde `usuarioDni: '***1234'`, no requiere transform en FE.
- **`rowVersion` como base64 string**: el FE lo guarda como string y lo manda tal cual en el PATCH. No deserializar.
- **Pill correlation de Plan 32**: `<app-correlation-id-pill>` ya existe en `@shared/components/correlation-id-pill/`. Reusar tal cual en el sub-drawer.
- **El sub-drawer de ocurrencia es `error-log-detail-drawer` actual movido**: la mayor parte del trabajo es renombrar imports + moverlo a la nueva carpeta. NO reescribir lógica.
- **El drawer actual de error-logs lee `correlationId` query param**: cuando se pasa al feature renombrado, preservar este comportamiento — Plan 32 hub depende de eso.

## DOCS — `business-rules.md` (ya actualizado en Chat 3 BE)

`INV-ET03..ET07` y la nueva sección §19 ya están en `.claude/rules/business-rules.md` (commit `7ae0cb0`). El Chat 4 FE NO debería tocarlas. Si descubre algún ajuste de tipos o de matriz, alinea entre el código y la regla en el mismo PR.

## FUERA DE ALCANCE

- **Vista Kanban con drag-drop CDK** — Chat 5 FE.
- **Toggle Kanban/Tabla en el header** — Chat 5 FE (en este chat solo existe la tabla; el toggle se agrega cuando llegue el Kanban).
- **Mobile UX exploration** — Chat 5 FE (después de validar que la tabla funciona en desktop).
- **Endpoint nuevo del BE** para devolver el `rowVersion` fresco después del PATCH — deuda lateral menor; si se necesita, abrir follow-up.
- **Filtros multi-estado en el BE** — el `q` y `severidad` siguen siendo string único. Si el toggle "Ocultar resueltos/ignorados" requiere multi, se hace client-side en este chat (con la deuda documentada).
- **Modificar el hub de correlation (Plan 32)** — sigue intacto. El sub-drawer reutilizado mantiene la pill clickeable que navega al hub.
- **Tocar `ErrorLogController` o el viejo flujo `/api/sistema/errors`** — el endpoint sigue vivo para consumir desde otros lugares (no admin); no se borra ni se redirige en este chat.

## CRITERIOS DE CIERRE

- [ ] Feature renombrado `error-logs/` → `error-groups/`, ruta pública preservada.
- [ ] 5 endpoints del BE consumidos correctamente (verificar en browser que las respuestas llegan).
- [ ] Tabla con filtros funciona, paginador muestra total real.
- [ ] Drawer abre, tabs renderizan, observación editable persiste.
- [ ] Sub-drawer renderiza stack/breadcrumbs/correlation-pill clickeable.
- [ ] Dialog cambio estado solo muestra destinos válidos según matriz.
- [ ] WAL aplica cambio optimista + rollback en error 409.
- [ ] RowVersion stale dispara refetch + toast.
- [ ] Tests verdes (~+30 sobre baseline 1600 → ~1630 verdes).
- [ ] Lint OK, build OK.
- [ ] Cap 300 ln respetado en cada archivo.
- [ ] Sub-drawer movido desde `error-logs/components/error-log-detail-drawer/` (no duplicado, viejo borrado).
- [ ] Carpeta vieja `pages/admin/error-logs/` eliminada después de verificar no hay imports rotos.
- [ ] Commit FE en `educa-web main` con mensaje canónico.
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat.
- [ ] Actualizar `educa-web/.claude/plan/maestro.md` (renglón Plan 34): pasar % de 60% a ~80%, marcar "Chat 4 FE ✅ cerrado <fecha>".
- [ ] Actualizar la cola "📋 Próximos 3 chats" del maestro: agregar Plan 34 Chat 5 FE al final si la prioridad lo justifica.

## COMMIT MESSAGE sugerido

**Frontend** (`educa-web main`):

```
feat(admin): Plan 34 Chat 4 FE — error-groups table + drawer + status dialog

Rename "error-logs" admin feature to "error-groups", consuming the 5
endpoints shipped in Chat 3 BE (Educa.API 0b67b04). Public route
"/intranet/admin/trazabilidad-errores" is preserved; only the internal
"loadComponent" path changes.

The new "error-groups.component" replaces the previous occurrence-list
view with a paginated group-list view: filters (estado / severidad /
origen / busqueda + "Ocultar resueltos/ignorados" toggle ON by default),
real total count via separate "/count" endpoint (pagination variante B),
URL query-param sync for deep-link and back button.

Multi-facade pattern: "error-groups-data.facade" loads list + count +
detail + occurrences; "error-groups-crud.facade" mutates state with WAL
optimistic + rollback (handles "INV-ET07_ROW_VERSION_STALE" by refetching
the group); "error-groups-ui.facade" controls drawer + dialog visibility.

The detail drawer renders Resumen + Ocurrencias tabs (occurrences
paginated server-side). Click on an occurrence opens the existing
"error-log-detail-drawer" logic (moved to "error-occurrence-drawer/")
preserving the "correlation-id-pill" navigation to the Plan 32 hub.

The status dialog only lists destinations valid per
"ESTADO_TRANSITIONS_MAP" (mirror of "INV-ET07" matrix on FE for defense
in depth). The idem (X→X) is filtered before reaching the WAL.

Includes ~30 new tests (service, store, 3 facades, components, drawer,
sub-drawer, dialog) → 1630 FE green (baseline 1600).
```

## CIERRE

Al cerrar este chat, pedir feedback al usuario sobre:

1. ¿La paginación variante B con count separado se siente bien o se nota lentitud al cambiar filtros (porque dispara 2 fetches paralelos)? Si es lento, podemos consolidar en wrapper `{ data, total, page, pageSize }` en un Chat 4.5 BE.
2. ¿La observación editable inline en el drawer es suficiente o se necesita un dialog dedicado (más espacio + textarea más grande)?
3. ¿La matriz INV-ET07 funciona en el día a día o aparece algún caso (ej: "quería pasar de RESUELTO a EN_PROGRESO directo") que debamos relajar? Si aparece, abrir follow-up — el BE acepta cambios solo en `Domain/Common/StateMachine/StateMachines.cs`.
4. ¿Listo para `/next-chat plan 34` que generaría el brief de Chat 5 FE (vista Kanban + drag-drop CDK + toggle vista + exploración mobile)?
