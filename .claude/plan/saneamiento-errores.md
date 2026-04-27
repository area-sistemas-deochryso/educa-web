> **Plan**: 34 · Fecha creación: 2026-04-25 · Estado: /design ✅ cerrado, Chat 2 BE ✅ cerrado 2026-04-25, Chat 3 BE ✅ cerrado 2026-04-25, Chat 4 FE listo para arrancar
> **Repo principal**: `Educa.API` (master) para Chats 1-2 · `educa-web` (main) para Chats 3-5
> **Prioridad**: media — entra a la cola después de los 3 chats actualmente prioritarios (Plan 31 Chat 2, Plan 30 FE, Plan 24 Chat 4 B). No bloquea ni es bloqueado por ellos.

# Plan 34 — Saneamiento de errores con estados y agrupación por huella

## Objetivo

Convertir `/intranet/admin/trazabilidad-errores` de "lista inmutable de
incidentes" a "panel de bugs gestionables". Hoy un error que se resuelve
y vuelve a ocurrir genera fila nueva sin contexto de "ya lo viste / ya lo
arreglaste". El admin no tiene memoria operativa.

Frase del usuario que motivó el plan:
> *"si lo veo, lo resuelvo y se repite, vuelvo a ver el mismo evento sin
> contexto de 'ya lo viste'."*

Tres mecanismos combinados resuelven el dolor:

1. **Agrupación por huella**: ocurrencias con la misma firma se colapsan en
   un único `ErrorGroup` con contador. El admin ve el bug, no cada
   evidencia.
2. **Máquina de estados**: cada `ErrorGroup` tiene estado
   (`NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO`) con transiciones
   validadas y observación opcional. Reapertura automática si vuelve un
   bug `RESUELTO`; silencio total si está `IGNORADO`.
3. **UI con vista Kanban + tabla**: kanban como default visual, tabla
   como vista de búsqueda. Drag-and-drop entre columnas con CDK.

## Decisiones del /design (2026-04-25)

| # | Decisión | Detalle |
|---|----------|---------|
| 1 | Modelo de datos | **Tabla nueva `ErrorGroup` + FK opcional `ERL_ERG_CodID` en `ErrorLog`**. El bug es un concepto separado de sus evidencias. Permite: estado a nivel grupo, contador `ContadorPostResolucion`, listado eficiente sin GROUP BY runtime |
| 2 | Huella | **Precomputada como `ERG_Fingerprint` (CHAR(64)) con índice UNIQUE**. Algoritmo: `SHA-256(severidad ‖ normalize(mensaje) ‖ normalize(url) ‖ httpStatus ‖ errorCode)`. Helper estático puro `ErrorFingerprintCalculator.cs`. `normalize(mensaje)`: lowercase, strip GUIDs/IDs largos/fechas ISO, colapsa whitespace. `normalize(url)`: lowercase, strip query, segmentos numéricos → `:id` |
| 3 | Política de reapertura | **Auto-reapertura desde `RESUELTO → NUEVO`** + `ContadorPostResolucion++`. **`IGNORADO` nunca se auto-reabre** — solo el Director puede sacarlo manual. Las ocurrencias se persisten igual en ambos casos (audit trail intacto) |
| 4 | Estados | `NUEVO / VISTO / EN_PROGRESO / RESUELTO / IGNORADO` (confirmados). Conscientemente divergentes de `REVISADO/DESCARTADO` de `ReporteUsuario` — son nombres más naturales para errores. Patrón conceptual (estado + observación + RowVersion) idéntico |
| 5 | Breadcrumbs | **Siguen vinculados a la ocurrencia individual (`ErrorLog`)**, sin cambios estructurales. El drawer del grupo muestra "Ocurrencias" como tab y cada una abre sus propios breadcrumbs en sub-drawer |
| 6 | Relación con Plan 32 | **Ortogonales y complementarios**. `fingerprint` agrupa repeticiones del mismo bug en el tiempo. `correlationId` vincula eventos cruzados de UNA operación. El sub-drawer de ocurrencia mantiene el link al correlation hub `/intranet/admin/correlation/:id` igual que hoy. Plan 32 sin cambios |
| 7 | Política de purga | **Selectiva por estado del grupo**. `IGNORADO` 7 días · `NUEVO/VISTO/EN_PROGRESO` 30 días · `RESUELTO` 180 días (memoria institucional, alineado con `INV-RU01/RU02` de `ReporteUsuario`). Delete del grupo cascade a ocurrencias y breadcrumbs |
| 8 | Backfill | **NO se hace**. Errores existentes (`ErrorLog` actuales) quedan con `ERL_ERG_CodID = NULL` y se purgan naturalmente en 7 días con la lógica vieja. Reduce riesgo del deploy. Job opcional de backfill solo si el usuario lo pide post-deploy |
| 9 | Vista UI | **Coexistencia tabla + kanban con toggle persistido**. Default al entrar primera vez: **Kanban**. Preferencia guardada en `PreferencesStorage` (mismo wrapper que `theme-mode`/`language-preference`) |
| 10 | Stack drag-drop | **Angular CDK `@angular/cdk/drag-drop`**. Estable, accesible (keyboard nav incluida), agnóstico de librerías UI. PrimeNG no tiene kanban nativo |
| 11 | Validación de drops | **Visual + lógica**. Al iniciar drag, columnas válidas se iluminan (verde suave), inválidas se atenúan. CDK `cdkDropListEnterPredicate` previene drops inválidos antes del HTTP. Backend valida igual con `RowVersion` (defensa en profundidad) |
| 12 | Observación al cambiar estado | **Opcional siempre**. Sin dialog modal interrumpiendo el drag. Si el admin quiere agregar observación, abre el drawer del grupo y la edita ahí. Velocidad del kanban es el punto |
| 13 | Mobile (< 768px) | **Explorar primero**: scroll horizontal + long-press para drag con CDK touch support. Si la UX en pruebas reales no funciona, fallback a tabla con dropdown de cambio de estado en menú de acciones (mismo que vista tabla en desktop). Decisión final dentro del Chat 5 |
| 14 | Filtros en Kanban | Severidad / Origen / búsqueda por mensaje **aplican** (filtran cards en todas las columnas). Estado **no aplica** (ya separados visualmente). Toggle "Ocultar resueltos/ignorados" **oculta las columnas completas**, no solo cards |
| 15 | Optimistic update | **WAL estándar** (`rules/optimistic-ui.md`). Drop → `wal.execute({ optimistic: { apply, rollback } })`. Si server rechaza por RowVersion stale o transición inválida, la card vuelve sola a su columna original sin refetch |

## Invariantes nuevos a agregar a `business-rules.md` §15.12

| ID | Invariante |
|----|-----------|
| `INV-ET03` | Toda ocurrencia (`ErrorLog`) pertenece a un `ErrorGroup` determinado por `ERG_Fingerprint`. Si el grupo no existe, se crea con estado `NUEVO`. Si existe en estado `RESUELTO`, se reabre a `NUEVO` automáticamente y se incrementa `ERG_ContadorPostResolucion`. Si está en `IGNORADO`, NO se reabre (las ocurrencias se persisten igual para audit trail) |
| `INV-ET04` | El estado del bug vive en `ErrorGroup`, no en ocurrencias individuales. Los breadcrumbs (`ErrorLogDetalle`) siguen vinculados a su ocurrencia |
| `INV-ET05` | Purga selectiva por estado del grupo: `IGNORADO` → 7 días, `NUEVO/VISTO/EN_PROGRESO` → 30 días, `RESUELTO` → 180 días. El delete del grupo elimina sus ocurrencias y breadcrumbs en cascade. `ErrorLog` con `ERL_ERG_CodID = NULL` (huérfanos legacy) siguen purgándose con la regla vieja de 7 días por `ERL_Fecha` |
| `INV-ET06` | El `ERG_Fingerprint` se computa con `SHA-256(severidad ‖ normalize(mensaje) ‖ normalize(url) ‖ httpStatus ‖ errorCode)` por `ErrorFingerprintCalculator`. Cambiar el algoritmo de normalización requiere job de rehash documentado |
| `INV-ET07` | Transiciones de estado validan `RowVersion` (optimistic concurrency). Solo Director muta. La transición desde `IGNORADO → NUEVO` requiere intervención manual (no auto). Drops desde la UI Kanban a transiciones inválidas se previenen visualmente y el backend rechaza con `ConflictException("INV-ET07")` por defensa en profundidad |

`INV-ET01` y `INV-ET02` (persistencia fire-and-forget) **no cambian**.
Internamente el insert pasa de `Insert(ErrorLog)` a
`Upsert(ErrorGroup) + Insert(ErrorLog)` en transacción, pero el contrato
externo es idéntico. Si la transacción falla, sigue siendo `LogWarning`
y el HTTP response continúa.

## Encaje con sistemas existentes

| Sistema | Patrón compartido | Cambio requerido |
|---|---|---|
| `feedback-reports` (`ReporteUsuario`) | Estado + Observación + RowVersion + purga selectiva (180d resueltos) | Ninguno. `ErrorGroup` replica este patrón 1:1 |
| `email-outbox` (`EmailOutbox`) | Estado de side effect + reintento | Ninguno. Conceptualmente equivalente (estado de un envío vs estado de un bug) |
| `rate-limit-events` | Append-only sin estado | Ninguno. Eventos puros, no aplica |
| `correlation hub` (Plan 32) | Vincula por `CorrelationId` | Ninguno. Sub-drawer de ocurrencia sigue usándolo |

Sistema completo queda con tres capas semánticamente alineadas:

- **Bugs detectados auto** → `ErrorGroup` + `ErrorLog` (este plan)
- **Bugs reportados por usuarios** → `ReporteUsuario`
- **Eventos de envío de correo** → `EmailOutbox`

Las tres con el mismo patrón `estado + observación + RowVersion + purga
selectiva`. Esa uniformidad es valor en sí misma — un admin que aprende
una de las tres pantallas entiende cómo operar las otras dos.

## Desglose de 5 chats

### Chat 1 `/design` ✅ cerrado 2026-04-25

Este mismo. Decisiones 1-15 cerradas con confirmación del usuario.

### Chat 2 BE — Modelo + migración SQL + UPSERT en `ErrorLogService`

**Repo**: `Educa.API master`

**Scope**:

- Script SQL mostrado al usuario antes de ejecutar (regla `backend.md` §
  Migraciones):
  - `CREATE TABLE ErrorGroup` con todas las columnas
  - `CREATE UNIQUE INDEX UX_ErrorGroup_Fingerprint ON ErrorGroup(ERG_Fingerprint)`
  - `CREATE INDEX IX_ErrorGroup_Estado_UltimaFecha ON ErrorGroup(ERG_Estado, ERG_UltimaFecha DESC)` (para listado paginado en vista tabla)
  - `ALTER TABLE ErrorLog ADD ERL_ERG_CodID BIGINT NULL`
  - `ALTER TABLE ErrorLog ADD CONSTRAINT FK_ErrorLog_ErrorGroup FOREIGN KEY (ERL_ERG_CodID) REFERENCES ErrorGroup(ERG_CodID) ON DELETE CASCADE`
  - `CREATE INDEX IX_ErrorLog_ErrorGroup ON ErrorLog(ERL_ERG_CodID)`
- `Models/Sistema/ErrorGroup.cs` (nuevo): incluye `[Timestamp] ERG_RowVersion` + auditoría estándar (4 campos)
- `Models/Sistema/ErrorLog.cs`: agrega propiedad `ERL_ERG_CodID` + navigation `ErrorGroup`
- `Constants/Sistema/ErrorGroupEstados.cs` (nuevo): const strings + array `Validos[]` (mismo patrón que `ReporteUsuarioEstados`)
- `Helpers/Sanitization/ErrorFingerprintCalculator.cs` (nuevo): función pura `Compute(severidad, mensaje, url, httpStatus, errorCode) → string` que retorna SHA-256 hex (64 chars)
- `Services/Sistema/ErrorLogService.cs`: modificar `RegistrarErrorFrontendAsync` y `RegistrarErrorBackendAsync` para:
  1. Calcular fingerprint
  2. UPSERT a `ErrorGroup` (buscar por fingerprint; si existe actualizar `UltimaFecha + ContadorTotal++`; si no crear con estado `NUEVO`)
  3. Si grupo está `RESUELTO` → reabrir (`Estado = 'NUEVO'`, `ContadorPostResolucion++`) + `LogInformation` con id del grupo
  4. Si grupo está `IGNORADO` → solo `ContadorTotal++`, NO reabrir
  5. Insertar `ErrorLog` con `ERL_ERG_CodID` apuntando al grupo
  6. Todo en transacción explícita; si falla, fire-and-forget como hoy (INV-ET01/ET02 intactos)
- DI sin cambios estructurales (servicio existente)
- Tests:
  - `ErrorFingerprintCalculator`: huellas estables, normalización (mensaje con GUIDs, URL con `/api/usuarios/123`)
  - `ErrorLogServiceUpsertTests`: insert nuevo grupo, insert que matchea grupo existente, reapertura desde RESUELTO incrementa contador, IGNORADO no reabre, transacción atómica
  - Tests de regresión: persistencia fire-and-forget sigue funcionando ante fallo en upsert (INV-ET02)

**Criterios de cierre**:

- Tests BE verdes (~+15 tests sobre baseline)
- Script SQL ejecutado por el usuario manualmente en BD prueba + producción
- Verificación post-deploy: `SELECT TOP 5 * FROM ErrorGroup ORDER BY ERG_CodID DESC` después de 1-2 errores nuevos para confirmar que se crean
- Cap 300 líneas respetado en todos los archivos tocados
- Build sin warnings nuevos

**Archivos previstos** (~7-8):

- `Models/Sistema/ErrorGroup.cs` (nuevo)
- `Models/Sistema/ErrorLog.cs` (+1 propiedad + navigation)
- `Data/ApplicationDbContext.cs` (+1 DbSet + Fluent API si aplica)
- `Constants/Sistema/ErrorGroupEstados.cs` (nuevo)
- `Helpers/Sanitization/ErrorFingerprintCalculator.cs` (nuevo)
- `Services/Sistema/ErrorLogService.cs` (modificar UPSERT)
- Scripts SQL en `scripts/` o documentados en este plan
- Tests: `Helpers/Sanitization/ErrorFingerprintCalculatorTests.cs` + `Services/Sistema/ErrorLogServiceUpsertTests.cs`

### Chat 3 BE ✅ cerrado 2026-04-25 — `ErrorGroupService` + Controller + DTOs + purga selectiva

> Cerrado en `Educa.API master`. 4 DTOs, `IErrorGroupRepository` + `ErrorGroupRepository`, `IErrorGroupService` + `ErrorGroupService` partial (`.Purga.cs`) con state machine en `Domain/Common/StateMachine/StateMachines.cs` (entry en lugar de archivo separado, simetría con las 7 máquinas existentes), `ErrorGroupController` con `[Authorize(Roles = Roles.Director)]` y 5 endpoints, `ErrorLogPurgeJob` reescrito a 2 llamadas (selectiva + huérfanos legacy), DI registrado, business-rules.md FE actualizado con INV-ET03..07 + nueva sección §19. **+45 tests verdes** (6 state machine + 13 service + 13 controller authz + 7 purga selectiva con fallback InMemory documentado + 6 helpers existentes) → suite BE **1466 verde** (baseline 1421). Build limpio, cap 300 respetado en todos los archivos producción.

**Repo**: `Educa.API master`

**Scope**:

- `Services/Sistema/ErrorGroupService.cs` (nuevo) con métodos:
  - `ListarGruposAsync(filtros, paginación)` — filtra por estado/severidad/origen/búsqueda; ordena por `UltimaFecha DESC`
  - `ObtenerCountAsync(filtros)` — para paginador (regla `pagination.md` variante B)
  - `ObtenerGrupoConOcurrenciasAsync(grupoId, paginaOcurrencias, pageSize)` — drawer drill-down
  - `CambiarEstadoAsync(grupoId, nuevoEstado, observacion?, rowVersion)` — valida transición según máquina, lanza `ConflictException("INV-ET07")` si transición inválida
- `Repositories/Sistema/ErrorGroupRepository.cs` (nuevo): queries `AsNoTracking()`, soft delete N/A (ErrorGroup se elimina físico vía purga)
- `Controllers/Sistema/ErrorGroupController.cs` (nuevo) en route `api/sistema/error-groups`:
  - `GET /` listar paginado con filtros (`[Authorize(Roles = Roles.Director)]`)
  - `GET /count` para paginador
  - `GET /{id}` detalle del grupo con metadata
  - `GET /{id}/ocurrencias?pagina=X&pageSize=Y` paginadas
  - `PATCH /{id}/estado` body `{ estado, observacion?, rowVersion }`
  - Sigue patrón existente `ApiResponse<T>` (INV-D08)
- DTOs:
  - `ErrorGroupListaDto` — id, fingerprint (truncado para UI), severidad, mensajeRepresentativo, url, httpStatus, errorCode, origen, estado, observacion, primeraFecha, ultimaFecha, contadorTotal, contadorPostResolucion, rowVersion
  - `ErrorGroupDetalleDto` — todo lo anterior + count de ocurrencias paginadas
  - `OcurrenciaListaDto` — subset de `ErrorLogListaDto` para drill-down
  - `CambiarEstadoErrorGroupDto` — input del PATCH
- `Services/Sistema/ErrorLogPurgeJob.cs` MODIFICAR a purga selectiva:
  - Para grupos `IGNORADO`: cutoff = 7 días desde `UltimaFecha`
  - Para grupos `NUEVO/VISTO/EN_PROGRESO`: cutoff = 30 días desde `UltimaFecha`
  - Para grupos `RESUELTO`: cutoff = 180 días desde `UltimaFecha`
  - Delete cascade automático borra ocurrencias y breadcrumbs
  - Caso aparte: `ErrorLog` con `ERL_ERG_CodID = NULL` (huérfanos legacy del periodo de transición) se siguen purgando por `ERL_Fecha < 7 días` (regla vieja, sin tocar)
- Tests:
  - `ErrorGroupService`: ListarGrupos con filtros, transiciones válidas, transición inválida lanza ConflictException, RowVersion stale lanza ConflictException, observación opcional aplica
  - `ErrorGroupController`: 7 tests authz por reflection (4 admin pass + 3 no-admin reject + route)
  - `ErrorLogPurgeJobSelectivoTests`: 3 estados con sus cutoffs, huérfanos legacy se purgan, cascade borra ocurrencias

**Criterios de cierre**:

- Tests BE verdes (~+25 tests sobre baseline post-Chat 2)
- Endpoint manual probado con Postman / IDE: GET listar, GET ocurrencias, PATCH cambiar estado feliz + caminos de error
- INV-ET03/ET04/ET05/ET06/ET07 documentados en `business-rules.md` §15.12 + nueva sección `§19 Saneamiento de errores` (similar a §16 Reportes de Usuario)
- Cap 300 líneas respetado

**Archivos previstos** (~10):

- `Services/Sistema/ErrorGroupService.cs` (nuevo)
- `Repositories/Sistema/ErrorGroupRepository.cs` (nuevo)
- `Interfaces/Services/Sistema/IErrorGroupService.cs` + `IErrorGroupRepository.cs`
- `Controllers/Sistema/ErrorGroupController.cs` (nuevo)
- `Services/Sistema/ErrorLogPurgeJob.cs` (modificar)
- `DTOs/Sistema/ErrorGroup*Dto.cs` (4 DTOs nuevos)
- Tests: `ErrorGroupServiceTests.cs` + `ErrorGroupControllerAuthorizationTests.cs` + `ErrorLogPurgeJobSelectivoTests.cs`
- DI registrado en `RepositoryExtensions.AddRepositories` + `ServiceExtensions.AddApplicationServices`

### Chat 4 FE ✅ cerrado 2026-04-25 — Vista tabla + multi-facade + drawer + dialog cambio estado

> Cerrado en `educa-web main`. Feature `error-logs/` renombrado a `error-groups/` con ruta pública `/intranet/admin/trazabilidad-errores` preservada. Multi-facade (data + crud + ui) + store + service espejo de los 5 endpoints BE Chat 3. Drawer del grupo con tabs Resumen/Ocurrencias usando `p-tabs`. Sub-drawer de ocurrencia movido (no duplicado) desde `error-log-detail-drawer/` con la pill de correlation Plan 32 intacta. Dialog cambio estado con select que solo lista destinos válidos según `ESTADO_TRANSITIONS_MAP` (defensa en profundidad — el BE rechaza transiciones inválidas con `ERRORGROUP_TRANSICION_INVALIDA`). WAL optimista en `cambiarEstado` con rollback exacto al snapshot + manejo específico de `INV-ET07_ROW_VERSION_STALE` (refetch + warning) y 404 (remove + warning). Toggle "Ocultar resueltos/ignorados" ON por defecto (filtro client-side cuando no hay filtro estado explícito — deuda menor documentada). Filtros sincronizados con URL para deep-link y back button. **+33 tests** (12 store + 7 service + 6 crud-facade + 8 dialog) → **1630 FE verdes** (baseline 1600). Lint OK (0 errores), build OK, cap 300 ln respetado en todos los archivos. Carpeta vieja `pages/admin/error-logs/` eliminada (sin imports rotos confirmado por grep).

**Repo**: `educa-web main`

**Scope**:

- Models nuevos `pages/admin/error-logs/models/error-groups.models.ts`:
  - `ErrorGroupLista`, `ErrorGroupDetalle`, `OcurrenciaLista`, `CambiarEstadoErrorGroup`
  - Tipos semánticos: `ErrorGroupEstado`, `ESTADO_TRANSITIONS_MAP` (qué destinos permite cada estado)
  - Maps de UI: `ESTADO_LABEL_MAP`, `ESTADO_SEVERITY_MAP` (badge color), `ESTADO_ICON_MAP`
- Service `pages/admin/error-logs/services/error-groups.service.ts`: 5 métodos espejo de los endpoints BE
- Store `pages/admin/error-logs/services/error-groups.store.ts` extiende `BaseCrudStore`:
  - Mutaciones quirúrgicas: `setGroups`, `updateGroupEstado`, `removeGroup`, `setTotalCount`
  - Sub-store para ocurrencias del grupo seleccionado (paginadas)
- Multi-facade pattern (`crud-patterns.md`):
  - `error-groups-data.facade.ts` — carga listado + count + detalle del grupo seleccionado + ocurrencias
  - `error-groups-crud.facade.ts` — `cambiarEstado()` con WAL + manejo de RowVersion stale
  - `error-groups-ui.facade.ts` — `openDrawer(group)`, `closeDrawer()`, filtros (severidad, origen, búsqueda, "ocultar resueltos/ignorados" toggle)
- Componente principal `error-groups.component.ts/html/scss`:
  - **Renombrar archivo de feature**: `pages/admin/error-logs/` → `pages/admin/error-groups/` (con compat para que la ruta `/intranet/admin/trazabilidad-errores` siga funcionando)
  - Vista tabla (la vista Kanban llega en Chat 5)
  - Tabla de grupos: badge estado, severidad, mensaje representativo, URL normalizada, contador `15 total / 3 desde fix`, última fecha, acciones
  - Filtros (severidad multi, origen multi, búsqueda, toggle "ocultar resueltos/ignorados" activado por defecto)
  - Paginador con count real (regla `pagination.md` variante B — ya hay precedente en error-logs anterior)
- Drawer del grupo `components/error-group-detail-drawer/`:
  - Tabs PrimeNG: `Resumen` (metadata + observación editable inline) + `Ocurrencias` (tabla paginada de ErrorLog del grupo)
  - Click en ocurrencia → abre sub-drawer (siguiente bullet)
  - Acciones de cambio de estado en footer del drawer (5 botones según transiciones válidas)
- Sub-drawer de ocurrencia `components/error-occurrence-drawer/`:
  - Mover lógica del drawer actual (`error-log-detail-drawer/`) aquí
  - Stack trace, breadcrumbs, request/response body
  - Pill `<app-correlation-id-pill>` (Plan 32) navegando al hub de correlación — **sin cambios respecto a hoy**
- Dialog cambio estado `components/change-group-status-dialog/` (para uso desde tabla):
  - Confirmación + campo observación opcional (`textarea` 0-1000 chars)
  - Sigue patrón `dialogs-sync.md` (NUNCA dentro de `@if`)
- WAL (`optimistic-ui.md`):
  - `cambiarEstado` usa `wal.execute({ optimistic: { apply: store.updateGroupEstado, rollback: snapshot restore } })`
  - Patrón estándar `OPTIMISTIC` (default), no requiere `server-confirmed`
- Filtros con query params en URL para deep-link y back button
- Tests:
  - Service (5 endpoints)
  - Store (mutaciones quirúrgicas, transiciones)
  - Crud facade (cambiarEstado happy + RowVersion stale rollback)
  - Componente principal (filtros, tabla, paginación)
  - Drawer (tabs, observación editable)
  - Sub-drawer (link a correlation hub se renderiza)
  - Dialog cambio estado (sync con store, validación)

**Criterios de cierre**:

- Tests FE verdes (~+30 tests sobre baseline)
- Lint OK + build OK
- Tabla funcional en browser, todos los flujos: listar, filtrar, abrir drawer, ver ocurrencias, abrir sub-drawer con stack y correlation hub, cambiar estado desde dialog
- Cap 300 líneas respetado en cada archivo
- Cap de tipos/diseño respetado (`design-system.md`, `templates.md`)

**Archivos previstos** (~18):

- `models/error-groups.models.ts` (nuevo)
- `services/error-groups.service.ts` + `.store.ts` + 3 facades
- `error-groups.component.ts/html/scss` (renombrar feature + reescribir tabla)
- `components/error-group-detail-drawer/` (3 archivos)
- `components/error-occurrence-drawer/` (3 archivos — mover lógica del drawer actual)
- `components/change-group-status-dialog/` (3 archivos)
- Routing: ajuste de path interno preservando URL pública

### Chat 5 FE — Vista Kanban + drag-drop CDK + toggle vista + exploración mobile ✅ CERRADO 2026-04-27

**Repo**: `educa-web main` (commit pendiente — incluye Chat 4 acumulado)

**Estado de cierre**:

- Kanban funcional con 5 columnas (NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO), top 20 por columna ordenadas por `ultimaFecha DESC`, "Cargar más" client-side por columna.
- Toggle Kanban/Tabla en el header, persiste en `PreferencesStorage` con key `educa_pref_error_groups_view_mode`. Default `kanban`.
- Drop predicates espejo de `ESTADO_TRANSITIONS_MAP` (defensa en profundidad — el BE rechaza con `ERRORGROUP_TRANSICION_INVALIDA`). Visual feedback al iniciar drag: columnas válidas se iluminan verde, inválidas se atenúan a opacity 0.45.
- WAL handler `moveCardOptimistic(group, toEstado)` en `error-groups-crud.facade.ts` reusa el `cambiarEstado` existente (apply + rollback contra snapshot, manejo de `INV-ET07_ROW_VERSION_STALE`, 404, transición inválida del BE).
- Filtro estado oculto en modo Kanban (las columnas son los estados). Severidad/origen/búsqueda siguen filtrando en ambas vistas. Toggle "Ocultar resueltos/ignorados" oculta las columnas RESUELTO+IGNORADO en Kanban.
- Click en card del Kanban abre el mismo drawer del Chat 4 (sin duplicar carga).
- `StorageService` extendido con `getErrorGroupsViewMode/setErrorGroupsViewMode` para respetar el patrón facade — los componentes nunca tocan `PreferencesStorageService` directo.

**Decisión 13 (mobile) — pendiente de validación en device real**:

CDK habilita touch automáticamente en `cdkDrag`, así que la implementación lleva el toggle visible también en pantallas < 768px. La decisión final ("Kanban en mobile" vs "fallback a tabla forzada con toggle oculto") se toma cuando el usuario pruebe la build en su navegador / dispositivo. Si el long-press confunde con scroll horizontal o el feedback es ruidoso, abrir mini-plan derivado para forzar `viewMode = 'table'` cuando `window.matchMedia('(max-width: 768px)').matches`. **No se toma esa decisión sin evidencia real-device.**

**Métricas de cierre**:

- 18 tests nuevos (3 preferences + 3 card + 4 view-toggle + 6 kanban-board + 2 facade `moveCardOptimistic`) → **1648 FE verdes** (baseline 1630).
- Lint OK (0 errores; 1 warning preexistente ajeno al chat). Build production OK.
- Cap 300 ln respetado: kanban-board 137 ln, card 56 ln, view-toggle 45 ln, crud-facade 113 ln, error-groups.component 286 ln efectivas, preferences-storage 193 ln.

**Scope original (referencia)**:

- Setup Angular CDK drag-drop: import en `error-groups.module` o standalone
- Componente `components/error-groups-kanban-board/`:
  - 5 columnas (NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO) con header `nombre + contador`
  - Top 20 cards por columna ordenadas por `UltimaFecha DESC` + botón "Cargar más"
  - Layout horizontal con scroll si overflow (mobile-friendly)
  - Drop predicates (`cdkDropListEnterPredicate`) según `ESTADO_TRANSITIONS_MAP`
  - Visual feedback: columnas válidas se iluminan al iniciar drag, inválidas se atenúan
- Componente `components/error-group-card/` (presentational, dumb, OnPush):
  - Compacta ~80px alto: badge severidad + mensaje truncado 2 líneas + footer `15 ocurrencias · hace 3h` + icono origen
  - Inputs: `group: ErrorGroupLista`
  - Sin lógica, recibe data del padre
- Componente `components/error-groups-view-toggle/` en el header:
  - SegmentedButton PrimeNG: `Kanban | Tabla`
  - Persiste en `PreferencesStorage` con key `errorGroupsViewMode`
  - Default primera vez: `Kanban`
- WAL handler en `error-groups-crud.facade.ts`:
  - `moveCardOptimistic(groupId, fromEstado, toEstado)` con `wal.execute({ optimistic: { apply: store.updateGroupEstado(groupId, toEstado), rollback: store.updateGroupEstado(groupId, fromEstado) } })`
  - Reusa endpoint del Chat 3 BE
  - Sin dialog modal — el drag-drop es directo (decisión 12)
- Filtros en Kanban:
  - Severidad / origen / búsqueda **aplican** (filtran cards en todas las columnas)
  - Estado **se oculta del UI** (no aplica)
  - Toggle "Ocultar resueltos/ignorados" → oculta columnas completas
- Mobile (decisión 13 — exploración primero):
  - Probar scroll horizontal + long-press con CDK touch support en pantallas < 768px
  - Si funciona en pruebas reales (test en browser DevTools mobile + dispositivo físico si posible): usar Kanban en mobile
  - Si no funciona (UX rota, drag confunde con scroll, performance mala): fallback a tabla forzada en mobile (toggle Kanban se oculta)
  - Decisión final del scope mobile **se toma dentro del Chat 5** después de la exploración. Documentar el resultado en este plan al cerrar el chat
- Tests:
  - `error-groups-kanban-board` (render columnas, drop predicates devuelven true/false según matriz, mover card actualiza state)
  - `error-group-card` (render presentational con todos los campos)
  - `error-groups-view-toggle` (cambia preferencia, persiste en storage, lee al init)
  - Facade `moveCardOptimistic` (apply + rollback con server reject)

**Criterios de cierre**:

- Tests FE verdes (~+15 tests sobre baseline post-Chat 4)
- Lint OK + build OK
- Browser check: kanban renderiza, drag-drop funcional desktop, drop predicates rechazan inválidos, optimistic + rollback funciona ante 409 simulado, toggle persiste entre recargas
- Mobile decision documentada: si Kanban en mobile funciona, validado en device físico o emulador; si fallback, justificación específica
- Cap 300 líneas respetado

**Archivos previstos** (~10):

- `components/error-groups-kanban-board/` (3 archivos)
- `components/error-group-card/` (3 archivos)
- `components/error-groups-view-toggle/` (3 archivos)
- `components/resolve-status-dialog/` — **NO** se crea (decisión 12: observación opcional desde drawer, no dialog modal al drop)
- Update en `error-groups-crud.facade.ts` (+ método `moveCardOptimistic`)
- Update en `error-groups.store.ts` (+ método `updateGroupEstado` si no existe ya en Chat 4)
- Update en `error-groups.component.ts/html` (renderizar `<app-error-groups-kanban-board>` o `<app-error-groups-table>` según `viewMode`)
- Update en `PreferencesStorage` keys (sumar `errorGroupsViewMode`)

## Estimado

| Carga | Estimado |
|---|---|
| Total chats | 5 (1 design ya cerrado + 4 ejecución) |
| Tests sumados | ~85 nuevos (15 BE Chat 2 + 25 BE Chat 3 + 30 FE Chat 4 + 15 FE Chat 5) |
| Archivos tocados | ~45 (~17 BE + ~28 FE) |
| Migración SQL | 1 script (CREATE table + ALTER + 3 índices) |
| Riesgo | **Bajo en BE** (UPSERT en path crítico requiere tests sólidos pero patrón es estándar). **Medio en FE Chat 5** (drag-drop CDK puede tener issues sutiles con touch en mobile — por eso la exploración) |

## Bloqueos / dependencias

| Hacia adelante | Hacia atrás |
|---|---|
| Plan 34 NO bloquea ningún plan activo | Plan 34 NO depende de cierre de otros planes |
| | Plan 32 (correlation hub) **debe seguir intacto** — el sub-drawer del Chat 4 reusa `<app-correlation-id-pill>` sin cambios |

## Notas operativas

- **Migración sin downtime**: la `ALTER TABLE` agrega columna NULL, no rompe inserts existentes. Durante el deploy entre Chat 2 BE y producción, los inserts viejos siguen funcionando con `ERL_ERG_CodID = NULL`.
- **Backfill diferido**: si después del deploy el usuario quiere ver agrupados los errores históricos, se puede agregar un Chat 6 BE de backfill one-shot. No es prerequisito para cerrar el plan.
- **Renombrado de feature FE**: `pages/admin/error-logs/` → `pages/admin/error-groups/` debe preservar la URL pública `/intranet/admin/trazabilidad-errores` (path interno cambia, ruta visible al usuario no).
- **Coordinación con `next-chat`**: este plan entra a la cola del maestro como Plan 34 después del Chat 31-2 / Plan 30 FE / Plan 24 Chat 4 B. No hace falta brief separado para Chat 1 (este archivo lo cubre).

## Fuentes consultadas durante el diseño

- [Educa.API/Models/Sistema/ErrorLog.cs](../../../Educa.API/Educa.API/Models/Sistema/ErrorLog.cs) — modelo actual
- [Educa.API/Services/Sistema/ErrorLogService.cs](../../../Educa.API/Educa.API/Services/Sistema/ErrorLogService.cs) — service actual
- [Educa.API/Services/Sistema/ErrorLogPurgeJob.cs](../../../Educa.API/Educa.API/Services/Sistema/ErrorLogPurgeJob.cs) — purga actual (7d global)
- [Educa.API/Models/Sistema/ReporteUsuario.cs](../../../Educa.API/Educa.API/Models/Sistema/ReporteUsuario.cs) — patrón de máquina de estados de referencia
- [educa-web/.claude/rules/business-rules.md](../rules/business-rules.md) §16 Reportes de Usuario, §15.10 INV-RU, §15.12 INV-ET
- [educa-web/.claude/rules/optimistic-ui.md](../rules/optimistic-ui.md) — WAL `optimistic` para drag-drop
- [educa-web/.claude/rules/pagination.md](../rules/pagination.md) — paginación variante B `/count`
- [educa-web/.claude/rules/dialogs-sync.md](../rules/dialogs-sync.md) — drawers + dialogs sin `@if`
- [educa-web/.claude/rules/crud-patterns.md](../rules/crud-patterns.md) — multi-facade pattern
- [educa-web/.claude/plan/correlation-id-links.md](./correlation-id-links.md) — Plan 32, no se modifica
