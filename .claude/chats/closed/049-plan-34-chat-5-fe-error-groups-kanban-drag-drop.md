> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 34 · **Chat**: 5 · **Fase**: F5 FE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 34 Chat 5 FE — Vista Kanban + drag-drop CDK + toggle vista + exploración mobile

## PLAN FILE

Ruta del plan: `.claude/plan/saneamiento-errores.md` — sección **"Chat 5 FE — Vista Kanban + drag-drop CDK + toggle vista + exploración mobile"** (líneas 264-321).

Maestro: `.claude/plan/maestro.md` — fila Plan 34 (80%, post-Chat 4 FE cerrado 2026-04-25 con +33 tests, 1630 FE verdes).

## OBJETIVO

Cerrar el FE del Plan 34 agregando la vista Kanban con drag-drop CDK al feature `error-groups/`. Al cerrar este chat, el admin Director puede:

- Cambiar entre vista **Tabla** (Chat 4) y **Kanban** (este chat) vía toggle persistido en `PreferencesStorage`.
- Ver 5 columnas (NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO) con cards compactas y contador por columna.
- Arrastrar una card a otra columna para cambiar el estado, con validación visual de drop predicates según `ESTADO_TRANSITIONS_MAP` (defensa en profundidad — el BE rechaza con `ERRORGROUP_TRANSICION_INVALIDA`).
- Optimistic update + rollback al estado anterior si el server rechaza (mismo patrón WAL del Chat 4).
- Cargar más cards por columna ("Cargar más" en footer de cada columna, top 20 inicial ordenadas por `ultimaFecha DESC`).

Decisión final del scope mobile **se toma dentro del chat** después de la exploración (decisión 13 del /design): si scroll horizontal + long-press + CDK touch funciona en mobile real, se usa Kanban en mobile; si no, fallback a tabla forzada con toggle oculto < 768px.

## CONTEXTO HEREDADO DEL CHAT 4 FE (commit pendiente en `educa-web main`)

Lo que el Chat 4 FE dejó funcionando — la base sobre la que este chat construye:

### Estructura del feature

```
pages/admin/error-groups/
├── error-groups.component.ts/html/scss   ← orquesta vista (HOY solo tabla)
├── index.ts
├── config/error-groups.config.ts          ← ESTADO_OPTIONS, SEVERIDAD_OPTIONS, ORIGEN_OPTIONS, TABLE_SKELETON_COLUMNS
├── models/error-groups.models.ts          ← DTOs + ESTADO_TRANSITIONS_MAP + maps de UI
├── services/
│   ├── error-groups.service.ts            ← 5 endpoints BE
│   ├── error-groups.store.ts              ← signals + visibleItems computed + mutaciones quirúrgicas
│   ├── error-groups-data.facade.ts        ← listado + count + detalle + ocurrencias + search debounced
│   ├── error-groups-crud.facade.ts        ← cambiarEstado WAL optimistic + rollback + 3 errorCodes
│   └── error-groups-ui.facade.ts          ← drawer + sub-drawer + dialog
└── components/
    ├── error-group-detail-drawer/         ← drawer del grupo con tabs Resumen/Ocurrencias
    ├── error-occurrence-drawer/           ← sub-drawer ocurrencia (movido de error-log-detail-drawer)
    └── change-group-status-dialog/        ← dialog cambio estado con select filtrado
```

### API que ya está disponible

**Models**:

```ts
// models/error-groups.models.ts
export const ESTADO_TRANSITIONS_MAP: Record<ErrorGroupEstado, ErrorGroupEstado[]> = {
  NUEVO:       ['VISTO', 'EN_PROGRESO', 'RESUELTO', 'IGNORADO'],
  VISTO:       ['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'IGNORADO'],
  EN_PROGRESO: ['NUEVO', 'VISTO', 'RESUELTO', 'IGNORADO'],
  RESUELTO:    ['NUEVO'],
  IGNORADO:    ['NUEVO'],
};
```

**Store** (`ErrorGroupsStore` — solo lo relevante):

- `items()`, `setGroups()`, `updateGroupEstado(id, nuevoEstado, patch?)` — la mutación quirúrgica que el WAL del Chat 4 ya consume y mantiene drawer/dialog en sync.
- `visibleItems()` — computed que filtra resueltos/ignorados cuando toggle ON sin filtro estado explícito.
- `filterEstado/Severidad/Origen`, `searchTerm`, `hideResolvedIgnored` — filtros con sus setters.

**CRUD facade**:

```ts
// error-groups-crud.facade.ts — método que YA existe y resuelve el cambio de estado
cambiarEstado(grupoId: number, dto: CambiarEstadoErrorGroup, snapshot: ErrorGroupLista): void
```

Recibe el snapshot completo del grupo ANTES del cambio para poder hacer rollback exacto al estado y rowVersion previos. Maneja `INV-ET07_ROW_VERSION_STALE` (refetchGroup + warning), `ERRORGROUP_TRANSICION_INVALIDA` (showError) y 404 (removeGroup + warning).

**Reglas/comportamientos heredados**:

- Filtros sincronizados con URL via `router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })`.
- WAL optimistic con apply/rollback determinista — el cambio visible vive en `apply`.
- Outputs de dialog se llaman `confirmStatus`/`cancelStatus` (renombrados por ESLint `no-output-native`).
- Cap 300 ln respetado en TODOS los archivos.

### Decisiones del /design relevantes

- **Decisión 12** — el drag-drop NO abre dialog modal (es directo). La observación queda opcional desde el drawer del grupo, no desde el drop.
- **Decisión 13** — mobile: explorar primero. Si scroll horizontal + long-press + CDK touch funciona, se usa. Si no, fallback a tabla forzada en mobile (toggle Kanban se oculta < 768px). La decisión final se documenta en este plan al cerrar.

## PRE-WORK OBLIGATORIO

1. **Verificar Angular CDK ya instalado**:

   ```bash
   grep "@angular/cdk" package.json
   ```

   Si no está, agregar `@angular/cdk` matcheando la versión de `@angular/core` (Angular 21). Si ya está (lo más probable, lo usa otro feature), saltar.

2. **Listar usos existentes de drag-drop CDK** para imitar patrón:

   ```bash
   grep -rn "DragDropModule\|cdkDropList\|cdkDrag" src/app --include="*.ts" --include="*.html" | head -10
   ```

   Si no hay precedentes, este chat es el primer consumidor — usar la doc oficial de PrimeNG/Angular CDK directamente.

3. **Confirmar que el commit del Chat 4 FE está pusheado** (contexto sobre el que se construye). Verificar con `git log --oneline -3` que el último commit en `educa-web main` es el del Chat 4 FE.

## ALCANCE

| # | Archivo | Tipo | Estimado |
|---|---------|------|----------|
| 1 | `components/error-groups-kanban-board/` (3 archivos) | Nuevo (Container/Smart) | ~250 ln total |
| 2 | `components/error-group-card/` (3 archivos) | Nuevo (Presentational, OnPush) | ~150 ln total |
| 3 | `components/error-groups-view-toggle/` (3 archivos) | Nuevo (Presentational con toggle persistido) | ~120 ln total |
| 4 | `services/error-groups-crud.facade.ts` | Modificar — `+moveCardOptimistic(group, toEstado)` | +~40 ln |
| 5 | `services/error-groups.store.ts` | Modificar — exponer items por estado si hace falta computed adicional | +~10 ln |
| 6 | `error-groups.component.ts/html` | Modificar — renderiza Kanban o Tabla según `viewMode` signal del componente | +~20 ln |
| 7 | `core/services/storage/preferences-storage.service.ts` | Modificar — `+getErrorGroupsViewMode(): 'kanban' \| 'table'` y `setErrorGroupsViewMode(mode)` | +~12 ln |
| 8 | Tests: kanban-board, group-card, view-toggle, crud-facade `moveCardOptimistic`, preferences-storage | Nuevos | ~300 ln total |

### Lógica del kanban-board (Container/Smart)

Patrón canónico (ver `pages/admin/email-outbox/email-outbox.component.ts` para multi-facade y `pages/admin/classrooms/salones-admin.component.ts` para `p-tabs` con grid columnar):

- Recibe `groups: ErrorGroupLista[]` (los `visibleItems` del store) como `input`.
- Computa internamente las 5 columnas usando `computed()`:

  ```ts
  readonly columnsByEstado = computed(() => {
    const all = this.groups();
    return ESTADOS.map(estado => ({
      estado,
      items: all
        .filter(g => g.estado === estado)
        .sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha))
        .slice(0, this.pageSizeByColumn().get(estado) ?? 20),
    }));
  });
  ```

- "Cargar más": map signal `pageSizeByColumn = signal<Map<ErrorGroupEstado, number>>(...)` con valor inicial 20 por columna. Click en "Cargar más" incrementa en 20 (50, 70, etc.) — sin pegada al BE porque el listado YA viene con todos los visibles del filtro actual.
- Outputs: `(cardClick)` (abre drawer del grupo, mismo flow del chat 4), `(cardDropped)` con payload `{ group, fromEstado, toEstado }`.
- Drop predicates en cada columna: `cdkDropListEnterPredicate = (drag) => ESTADO_TRANSITIONS_MAP[drag.data.estado]?.includes(this.column.estado)`.

### Drag-drop con feedback visual

Cuando el usuario empieza a arrastrar (`cdkDragStarted`), aplicar clase CSS `kanban-column--valid-drop` o `kanban-column--invalid-drop` a las 5 columnas según el predicate. Estado del drag vive en un signal local `draggingFrom: ErrorGroupEstado | null` que se setea en `(cdkDragStarted)` y se limpia en `(cdkDragEnded)`.

```scss
.kanban-column {
  transition: opacity 0.2s, border-color 0.2s;

  &--valid-drop {
    border-color: var(--green-500);
  }

  &--invalid-drop {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
```

### Lógica del WAL handler

```ts
// error-groups-crud.facade.ts (shape, no copy-paste)
moveCardOptimistic(group: ErrorGroupLista, toEstado: ErrorGroupEstado): void {
  // El predicate ya validó la transición visualmente. Por defensa en profundidad
  // re-validamos en el facade antes del WAL — si es inválida no llamamos al BE.
  if (!ESTADO_TRANSITIONS_MAP[group.estado].includes(toEstado)) return;

  const dto: CambiarEstadoErrorGroup = {
    estado: toEstado,
    observacion: null,                    // Drop directo, sin observación (decisión 12)
    rowVersion: group.rowVersion,
  };
  // Reusa el método existente — apply/rollback ya están implementados allí
  this.cambiarEstado(group.id, dto, group);
}
```

### View toggle

`PreferencesStorage` gana 2 métodos:

```ts
// preferences-storage.service.ts
private static readonly KEY_ERROR_GROUPS_VIEW = 'errorGroupsViewMode';

getErrorGroupsViewMode(): 'kanban' | 'table' {
  const stored = localStorage.getItem(PreferencesStorageService.KEY_ERROR_GROUPS_VIEW);
  return stored === 'table' ? 'table' : 'kanban';   // Default: kanban
}

setErrorGroupsViewMode(mode: 'kanban' | 'table'): void {
  localStorage.setItem(PreferencesStorageService.KEY_ERROR_GROUPS_VIEW, mode);
}
```

`ErrorGroupsViewToggleComponent`:

- `p-selectButton` (segmented) con 2 opciones (`Kanban` / `Tabla`).
- Lee la preferencia inicial via `inject(PreferencesStorageService).getErrorGroupsViewMode()` → emite `(modeChange)` al cambiar + persiste.
- Coloca el toggle en el header de la página, junto al botón "Refrescar".

### Filtros en Kanban

- **Severidad / origen / búsqueda** filtran cards en TODAS las columnas (basta que el componente padre pase `visibleItems()` filtrado, lógica heredada del store).
- **Filtro estado** se oculta en modo Kanban (no aplica — las columnas YA son los estados).
- **Toggle "Ocultar resueltos/ignorados"** oculta las columnas RESUELTO e IGNORADO completas (modo Kanban implementa en CSS via `[class.column--hidden]` o `@if`).

### Mobile — exploración (decisión final dentro del chat)

Pasos:

1. Implementar Kanban con `touchstart`/`touchmove` enabled (CDK lo hace automático con `cdkDrag`).
2. Probar en Chrome DevTools mobile emulator (iPhone 12 Pro): scroll horizontal del board, long-press para iniciar drag, drop en columna válida.
3. Si funciona → declarar Kanban OK en mobile, dejar el toggle visible.
4. Si NO funciona (drag confunde con scroll, performance degradada, drops imprecisos):
   - Detectar `< 768px` via `window.matchMedia` o un computed con resize listener.
   - Forzar `viewMode = 'table'` en mobile (no respetar la preferencia guardada).
   - Ocultar el toggle Kanban/Tabla en el header.
   - Documentar el motivo en este plan al cerrar el chat.

## TESTS MÍNIMOS

### `error-groups-kanban-board.component.spec.ts` — ~5 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | Render con groups vacío | 5 columnas vacías con header "0" |
| 2 | Render con 10 groups (mix de estados) | Cards distribuidas en columnas correctas |
| 3 | Drop predicate desde NUEVO permite VISTO/EN_PROGRESO/RESUELTO/IGNORADO | predicate retorna true |
| 4 | Drop predicate desde RESUELTO permite SOLO NUEVO | predicate retorna true para NUEVO, false para resto |
| 5 | Click en card emite cardClick output | output emitido con la group |

### `error-group-card.component.spec.ts` — ~3 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | Render con todos los campos | mensaje truncado, severidad badge, contador, fecha relativa |
| 2 | Render con `contadorPostResolucion > 0` | badge especial "+N" |
| 3 | OnPush + inputs usados como signals | no hay binding mutable |

### `error-groups-view-toggle.component.spec.ts` — ~3 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | Init con localStorage vacío | viewMode = 'kanban' (default) |
| 2 | Click en "Tabla" emite y persiste | output emitido + localStorage actualizado |
| 3 | Init con localStorage = 'table' | viewMode = 'table' |

### `error-groups-crud.facade.spec.ts` — extender con +1 caso

| # | Caso | Esperado |
|---|------|----------|
| 1 | `moveCardOptimistic(NUEVO group, 'IGNORADO')` | Llama cambiarEstado con dto correcto |
| 2 | `moveCardOptimistic(RESUELTO group, 'EN_PROGRESO')` (transición prohibida) | NO llama cambiarEstado — short-circuit defensa en profundidad |

### `preferences-storage.service.spec.ts` — extender con +2 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | `getErrorGroupsViewMode` sin set previo | retorna 'kanban' |
| 2 | `setErrorGroupsViewMode('table')` + get | retorna 'table' |

**Baseline FE post-Chat 5 esperado**: ~+15 tests sobre 1630 actuales → ~1645 verdes.

## REGLAS OBLIGATORIAS

- **`crud-patterns.md`** — multi-facade preservada, mutaciones quirúrgicas vía store; `moveCardOptimistic` reusa `cambiarEstado` existente, no duplica WAL logic.
- **`optimistic-ui.md`** — apply visible inmediato + rollback determinista al snapshot; el WAL ya está implementado, este chat solo agrega el caller.
- **`dialogs-sync.md`** — N/A para Kanban (no hay dialog modal en el drop, decisión 12).
- **`design-system.md`** — B1 contenedores con border, B4 tipografía de tabla, B7 botones canónicos para "Cargar más" (`p-button-text p-button-sm`).
- **`a11y.md`** — `aria-label` en botones icon-only via `pt`, contraste; cards deben ser `role="button"` y soportar Enter/Space para abrir drawer (alternativa al click).
- **`templates.md`** — sin funciones en template, todo computed; `@for` con track único (`group.id`).
- **`code-style.md` + `code-language.md`** — código en inglés (kanban-board, group-card, view-toggle), UI en español (labels, mensajes).
- **`reading-optimization.md`** — solo leer archivos del Chat 4 que se modifican; no leer toda la suite anterior.
- **Cap 300 ln** por archivo TS, ~250 HTML.
- **No `any`** en código nuevo. Usar `ErrorGroupEstado` y tipos del feature.
- **Permisos**: el feature ya está restringido a Director vía la ruta `intranet/admin/trazabilidad-errores`. No tocar permisos en este chat.

## APRENDIZAJES TRANSFERIBLES (del Chat 4 FE)

- **El componente principal extrajo opciones a `config/error-groups.config.ts`** para mantener cap 300 ln. Si Kanban hace que `error-groups.component.ts` crezca, mover lógica a un sub-componente nuevo en lugar de inflar el main.
- **`p-tabs` API moderna de PrimeNG 21**: `<p-tabs value="X"><p-tablist><p-tab value="X" /></p-tablist><p-tabpanels><p-tabpanel value="X" /></p-tabpanels></p-tabs>`. No es la sintaxis vieja. Si necesitas tabs en Kanban (improbable), usar este patrón.
- **`@if` y `@for` con `track`** son el control flow obligatorio. No usar `*ngIf`/`*ngFor`.
- **Outputs no pueden llamarse `confirm`/`cancel`/`close`** (ESLint `no-output-native`). Usar nombres como `cardClick`, `cardDropped`, `modeChange`.
- **El drawer del grupo (Chat 4) ya carga el detalle + ocurrencias** al abrir vía `uiFacade.openDrawer(group)`. No hay que duplicar carga; el click en card del Kanban llama el mismo flujo.
- **PrimeNG `p-iconfield` + `p-inputicon`** se usaron en el Chat 4 para el search box. Si Kanban necesita su propio search, reusarlos directo.
- **`store.updateGroupEstado(id, nuevoEstado, patch?)` actualiza items + selectedGroup + dialogGroup en una sola llamada** — el Kanban no necesita sincronizar estados porque la mutación quirúrgica ya cubre todos los lugares donde el grupo puede estar visible.
- **El BE devuelve mensaje string en `PATCH /estado`, no el grupo actualizado** — el rowVersion fresco solo se recupera si el siguiente cambio falla con stale (refetch en onError). Igual que en Chat 4.
- **Lint corre con `npm run lint`** (proyecto entero). Para validar solo el feature: `npx eslint src/app/features/intranet/pages/admin/error-groups/`.
- **Tests con vitest**: `npx vitest run src/app/features/intranet/pages/admin/error-groups/` corre solo la suite del feature.
- **Build production con `npm run build`** (toma ~2-3 min). Los warnings de SSR `navigator is not defined` son preexistentes, no relacionados.

## FUERA DE ALCANCE

- **No tocar el BE** — todos los endpoints del Plan 34 ya están entregados (Chat 3 BE, commit `0b67b04` en `Educa.API master`).
- **No tocar el drawer del grupo, sub-drawer ni dialog del Chat 4** — siguen funcionando intactos. El Kanban llama `uiFacade.openDrawer(group)` igual que la tabla.
- **No tocar el hub de correlation (Plan 32)** — el sub-drawer mantiene la pill clickeable que navega al hub, sin cambios.
- **No agregar dialog al drop** (decisión 12) — la observación opcional sigue disponible desde el drawer del grupo, no del Kanban.
- **No agregar filtros nuevos** — los del Chat 4 (severidad/origen/búsqueda) ya filtran cards en Kanban porque el componente recibe `visibleItems` filtrado del store.
- **No tocar `PreferencesStorage` para otros features** — solo agregar las 2 keys de `errorGroupsViewMode`.
- **No tocar permisos / menú / rutas** — el feature ya está accesible y correctamente restringido a Director.
- **Mobile decision-making**: NO predeterminar la decisión. Probar primero, decidir dentro del chat.

## CRITERIOS DE CIERRE

- [ ] CDK drag-drop integrado y funcional en desktop (Chrome/Firefox/Edge).
- [ ] 5 columnas con header `nombre + contador`, top 20 cards ordenadas por `ultimaFecha DESC`, botón "Cargar más" funcional.
- [ ] Drop predicates rechazan transiciones inválidas (visual + lógica).
- [ ] Visual feedback al iniciar drag: columnas válidas resaltan, inválidas se atenúan.
- [ ] Optimistic update + rollback funciona ante 409 simulado.
- [ ] Toggle Kanban/Tabla funcional, persiste en `PreferencesStorage`, default Kanban primera vez.
- [ ] En modo Kanban: filtro estado oculto, toggle "Ocultar resueltos/ignorados" oculta las 2 columnas correspondientes.
- [ ] Click en card del Kanban abre el drawer del grupo (mismo flow del Chat 4).
- [ ] Mobile decision documentada en este plan al cerrar (Kanban OK en mobile / fallback a tabla con justificación).
- [ ] Tests verdes (~+15 sobre baseline 1630 → ~1645 verdes).
- [ ] Lint OK (0 errores nuevos), build production OK.
- [ ] Cap 300 ln respetado en cada archivo nuevo.
- [ ] Commit FE en `educa-web main` con mensaje canónico.
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat.
- [ ] Actualizar `educa-web/.claude/plan/maestro.md` (renglón Plan 34): pasar % de 80% a **100%** (Plan 34 cerrado), agregar entrada de novedades.
- [ ] Actualizar `educa-web/.claude/plan/saneamiento-errores.md` Chat 5: marcar como ✅ cerrado + decisión mobile documentada.
- [ ] Si Plan 34 cierra al 100%, mover toda la entrada del maestro a `history/planes-cerrados.md` cuando el usuario confirme.

## COMMIT MESSAGE sugerido

**Frontend** (`educa-web main`):

```
feat(admin): add kanban view + drag-drop for "error-groups"

Close Plan 34 by adding the kanban view to the "error-groups" admin
feature. Uses Angular CDK drag-drop with drop predicates that mirror
"ESTADO_TRANSITIONS_MAP" (defense in depth — the BE rejects invalid
transitions with "ERRORGROUP_TRANSICION_INVALIDA"). The drag is direct
without modal dialog (decision 12 of /design): the optional
"observacion" stays available from the group drawer, not from the drop.

Adds three new components: "error-groups-kanban-board" (smart
container, computes 5 columns from store items, "Cargar más" pagination
per column), "error-group-card" (presentational, OnPush, ~80px tall
with severidad badge + truncated message + footer counter), and
"error-groups-view-toggle" (segmented Kanban/Tabla toggle in the
header, persists to "PreferencesStorage" with key
"errorGroupsViewMode", defaults to Kanban first time).

The WAL handler "moveCardOptimistic" in "error-groups-crud.facade"
short-circuits on invalid transitions and reuses the existing
"cambiarEstado" implementation (apply + rollback against the snapshot,
"INV-ET07_ROW_VERSION_STALE" handling, 404 → "removeGroup"). The
"PreferencesStorage" gains "getErrorGroupsViewMode" and
"setErrorGroupsViewMode".

Mobile decision: <KANBAN_OK_EN_MOBILE | FALLBACK_A_TABLA>
(documented in plan/saneamiento-errores.md at close).

Includes ~15 new tests (kanban-board, group-card, view-toggle, facade
"moveCardOptimistic", preferences-storage) → 1645 FE green
(baseline 1630).
```

## CIERRE

Al cerrar este chat, pedir feedback al usuario sobre:

1. ¿La sensación del drag-drop es buena en desktop, o el feedback visual (columnas que se atenúan/iluminan) es ruidoso?
2. ¿La default Kanban primera vez es correcta, o el admin prefiere arrancar en tabla?
3. **Mobile**: ¿la decisión final fue Kanban OK o fallback a tabla? Documentar el motivo en `saneamiento-errores.md` antes de cerrar.
4. ¿Listo para mover Plan 34 a `history/planes-cerrados.md` al 100%?
5. Si quedan rincones a mejorar (ej: long-press timing en mobile, contador no se actualiza en tiempo real cuando otro admin mueve una card), abrir un mini-plan derivado o documentar como deuda menor.
