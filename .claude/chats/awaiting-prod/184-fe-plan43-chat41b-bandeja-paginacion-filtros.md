# 184 — Plan 43 Chat 4.1b · FE bandeja paginación server-side + filtros

> **Repo**: `educa-web` (FE)
> **Plan**: [`../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md`](../../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md) §Chat 4.1
> **Creado**: 2026-05-16 · **Estado**: ✅ FE shipped local 2026-05-18 — awaiting-prod hasta deploy BE 183.
> **MODO SUGERIDO**: `/execute` → `/validate`

## Resultado (2026-05-18)

- **Service** (`email-outbox.service.ts`): `listar()` extendido con `tipoFallo`, `correlationId`, `page`, `pageSize`. Nuevo método `count(filtros)` con fail-safe `catchError → of(null)`. Builder privado `buildFiltrosParams` reutilizado entre los dos endpoints.
- **Store** (`email-outbox.store.ts`): signals `_page`, `_pageSize`, `_totalCount` + `totalRecordsEstimate` computed con fallback progresivo (per `rules/pagination.md` §"Fail-safe del count"). `filteredItems` deja de filtrar client-side (todo va al BE). Nuevo `clearFilters()` + `removeItem` decrementa `_totalCount`.
- **Facade** (`email-outbox-data.facade.ts`): `loadData` dispatcha items+count+stats+tendencias en `forkJoin`; `loadPage(page, pageSize)` solo refetch del listado (no recarga count); `clearFilters` resetea todos + `page=1` + refetch. Bug fix: `onFilterTipoFalloChange` ahora dispara `loadData`. Nuevo `onFilterCorrelationIdChange`. Guard idempotente en `loadPage` para absorber el bounce inicial de PrimeNG `[lazy]`.
- **UI**: filtro `correlationId` (input text) + btn-clear con design-system §B6 (opacity 0.5→1, `pTooltip` + `[pt]` aria-label). Tabla con `[lazy]`, `[totalRecords]` real, `[rowsPerPageOptions]=[10,25,50,100]`, `currentPageReportTemplate`.
- **Tests**: +8 nuevos en `email-outbox-data.facade.spec.ts` cubriendo dispatch paralelo, filtros enviados al BE, fail-safe count=null, `loadPage` sin count, guard idempotente, `clearFilters`, bug fix tipoFallo, nuevo correlationId. **14/14 verdes**.

### Validación

- ESLint `email-outbox/`: ✅ clean.
- `tsc --noEmit`: ✅ exit 0.
- Vitest spec del facade: ✅ 14/14.

### Aprendizajes transferibles

- Variante B (`/count` separado) deja el shape de `listar` intacto — no fuerza wrapper. Útil cuando el endpoint ya existe con consumers.
- PrimeNG `[lazy]` dispara `onLazyLoad` al montar la tabla con el state inicial. Si el facade ya ejecutó `loadData()` antes, el bounce duplica fetch. Guard idempotente: ignorar si `page`+`pageSize` coinciden con state actual **y** ya hay loading o tableReady=true.
- `filteredItems` client-side se eliminó (era `computed(() => items.filter(...))`). Mover los filtros al BE evita inconsistencia entre lo que el BE pagina y lo que el UI mostraba.
- `removeItem` quirúrgico debe decrementar `_totalCount` para mantener paginator coherente (per `rules/pagination.md`).

### Pendiente fuera de scope FE

- Smoke browser con `estado=FAILED` esperando deploy BE 183 (`Educa.API@listar` + `/count`).

## Contexto

Hand-off de Chat 4.1 splitting (igual patrón que Chat 3.1a BE + 3.1b FE). Brief BE 183 abre los endpoints `/listar` con paginación + `/count` + filtros `tipoFallo` y `correlationId`. Este brief FE consume ese contrato.

### Estado FE actual (auditado 2026-05-16)

| Pieza | Estado |
|---|---|
| `email-outbox-filters.component.html` | `appendTo="body"` ✅ aplicado en los 3 `p-select` + 2 `p-datepicker`. Bullet 1 del plan **ya está hecho**. |
| Filtros UI presentes | `buscar`, `tipo`, `estado`, `tipoFallo`, `desde`, `hasta` |
| Filtros UI faltantes | `correlationId` (input text), **btn-clear** |
| `email-outbox.service.ts::listar` | Envía `tipo`, `estado`, `desde`, `hasta`, `search`. **Falta `tipoFallo`, `correlationId`, `page`, `pageSize`.** |
| `/count` | **No existe** en el service FE. |
| `email-outbox-data.facade.ts::loadData` | NO incluye `tipoFallo` ni `correlationId` en filtros enviados al BE. Bug latente: UI permite seleccionar `tipoFallo` pero no aplica. |
| `filterTipoFallo` change | `onFilterTipoFalloChange` **NO dispara `loadData()`** (bug). |
| `filterCorrelationId` | Existe en store (Plan 32 Chat 4) pero solo como filtro client-side desde deep-link del hub. NO se envía al BE. |
| Paginación tabla | Client-side sobre array completo (sin `[totalRecords]` real). |

## Scope

### 1. Filtros UI

- En `email-outbox-filters.component.ts/.html`:
  - Agregar input `filterCorrelationId` + output `filterCorrelationIdChange`. Renderizar campo nuevo (input text con placeholder "ID de correlación").
  - Agregar **btn-clear** alineado a design-system §B6 (`p-button-text` con `pi pi-filter-slash`, `margin-left: auto`, `opacity 0.5 → 1` en hover, tooltip "Limpiar filtros" + `[pt]` con `aria-label`).
  - Output nuevo `clearFiltersChange` que el componente padre cablea a un método del facade.

### 2. Service

En `email-outbox.service.ts::listar`:
- Agregar params opcionales: `tipoFallo?: string`, `correlationId?: string`, `page?: number`, `pageSize?: number`.
- Mantener el shape de respuesta `EmailOutboxLista[]` (variante B, no wrapper).
- Agregar método nuevo `count(filtros): Observable<number>` que llama `GET /email-outbox/count` con los mismos filtros. Fail-safe: catchError → `of(null)` o `of(0)` (decidir según patrón de `ErrorLogService` FE).

### 3. Store

En `email-outbox.store.ts`:
- Agregar signals: `_page = signal(1)`, `_pageSize = signal(25)`, `_totalCount = signal<number | null>(null)`.
- Exponer readonly + computed `totalRecordsEstimate` con fallback estimate per `pagination.md` §"Fail-safe del count".
- Setters: `setPaginationState(page, pageSize)`, `setTotalCount(count: number | null)`.
- Mutación quirúrgica `removeItem` decrementa `_totalCount` (per `pagination.md`).

### 4. Facade

En `email-outbox-data.facade.ts`:
- `loadData()`: incluir `tipoFallo` y `correlationId` en filtros + dispatch `count(filtros)` en paralelo via `forkJoin` (junto con `items`, `stats`, `tendencias`).
- Método nuevo `loadPage(page, pageSize)`: solo refetch del listado (NO count — el count no cambia al paginar, per `pagination.md` §"loadPage no recarga el count").
- `onFilterTipoFalloChange` ahora SÍ dispara `loadData()` (bug fix).
- `onFilterCorrelationIdChange` nuevo → setea store + dispara `loadData()`.
- Método `clearFilters()` → resetea todos los filtros + `page=1` + dispara `loadData()`.

### 5. Tabla / Componente página

- Convertir paginator de la `p-table` a `[lazy]="true"` con `(onLazyLoad)="onLazyLoad($event)"` que llama `facade.loadPage(...)`.
- `[totalRecords]="vm().totalRecordsEstimate"`.
- `[rows]="vm().pageSize"`, `[first]="(vm().page - 1) * vm().pageSize"`.
- `[rowsPerPageOptions]="[10, 25, 50, 100]"`.
- `[showCurrentPageReport]="true"`, `currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"`.

### 6. Cross-tab refetch

Si el facade es `BaseCrudFacade` con `crossTabRefetch`, agregar refetch tanto items como count (per `rules/optimistic-ui.md` §"Asimetría items vs stats"). Si es facade manual, suscribir explícito.

## Pre-work

- Leer `educa-web/.claude/rules/pagination.md` (variante B completa).
- Leer `educa-web/.claude/rules/state-management.md` (signals + facade pattern).
- Revisar `error-logs admin` como referencia canónica de variante B (`Educa.API master 7e9d10b` + `educa-web main 1a13062`).
- Confirmar shape del response BE de 183 antes de arrancar `/execute` — si BE eligió variante A wrapper, ajustar service shape acá.

## Out of scope

- Endpoint BE — vive en brief coord 183.
- Filtros adicionales (`intentosMin`, `senderEmail`) — chats posteriores.
- Acciones inline (retry, exportar bundle) — Chat 4.3.
- Refactor general del componente — solo cambios necesarios para 4.1.

## Criterio de cierre

- [ ] Filtros UI completos: `correlationId` + btn-clear.
- [ ] Service envía los 7 filtros (`tipo`, `estado`, `tipoFallo`, `correlationId`, `desde`, `hasta`, `search`) + `page`, `pageSize`.
- [ ] `/count` cableado, store guarda total real.
- [ ] Paginator lazy con `totalRecords` real (no estimate solo).
- [ ] Tests específicos: facade dispatch items+count en paralelo + `loadPage` solo items + `clearFilters` resetea todo.
- [ ] Lint + build + vitest verdes.
- [ ] Smoke local: filtrar `estado=FAILED` muestra "Mostrando 1 a 14 de 14 registros" (caso reportado en plan).

## Tiempo estimado

~90-120 min (`/execute` 60-90 + `/validate` 30).

## Dependencias

- **Bloqueado por 183 BE**. Arrancable cuando: (a) 183 shipped, o (b) `/design` de 183 cerró contrato → ejecutar FE asumiendo contrato + smoke se posterga hasta deploy BE.

## Hand-off para arrancar

Cuando 183 shipee, mover este brief a `running/` con `/start-chat 184` (si no está ya ahí) y arrancar `/execute`.
