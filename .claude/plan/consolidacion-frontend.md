# Plan de Consolidacion Frontend

> **Fecha**: 2026-04-13
> **Objetivo**: Elevar el frontend al nivel de solidez del backend
> **Principio rector**: "Reducir la distancia entre lo declarado y lo real"
> **Horizonte**: 3-6 meses, trabajo incremental

---

## Diagnostico Actual (datos reales)

| Metrica | Valor | Evaluacion |
|---------|-------|------------|
| Tests (.spec.ts) | 99 archivos | Cantidad aceptable, calidad superficial |
| Archivos TS >300 lineas | 15+ | Violacion de regla propia max-lines:300 |
| Templates HTML >150 lineas | 10+ (top: 487 ln) | Componentes god-template |
| Facades | 49 | Buena cobertura de patron |
| Stores | 41 | Buena cobertura de patron |
| Services | 94 | Algunos gordos (storage 641 ln, profesor-api 417 ln) |
| eslint-disable | 7 archivos | Bajo, controlado |
| CI | Si (.github/workflows/ci.yml) | lint + test + build en PRs |

### Los 15 archivos TS mas grandes (>300 lineas)

| Lineas | Archivo | Tipo |
|--------|---------|------|
| 641 | core/services/storage/storage.service.ts | Facade de storage |
| 466 | core/services/wal/wal-sync-engine.service.ts | Infraestructura WAL |
| 449 | core/services/storage/preferences-storage.service.ts | Storage impl |
| 442 | core/services/facades/base-crud.facade.ts | Base class |
| 439 | campus-navigation/services/pathfinding.service.ts | Feature especifico |
| 421 | core/services/storage/session-storage.service.ts | Storage impl |
| 417 | profesor/services/profesor-api.service.ts | API service gordo |
| 401 | admin/schedules/services/horarios.store.ts | Store gordo |
| 399 | core/services/wal/wal.service.ts | Infraestructura WAL |
| 395 | core/services/wal/wal-db.service.ts | Infraestructura WAL |
| 384 | core/services/error/error-reporter.service.ts | Error handling |
| 383 | admin/campus/services/campus-admin.facade.ts | Facade gordo |
| 382 | core/services/notifications/notifications.service.ts | Notificaciones |
| 379 | admin/classrooms/services/salones-admin.facade.ts | Facade gordo |
| 379 | admin/campus/services/campus-admin.store.ts | Store gordo |

### Los 10 templates mas grandes (>150 lineas)

| Lineas | Archivo |
|--------|---------|
| 487 | estudiante/cursos/curso-content-readonly-dialog.html |
| 463 | admin/attendances/attendances.component.html |
| 425 | admin/permissions-roles/permisos-roles.component.html |
| 423 | admin/cursos/cursos.component.html |
| 388 | admin/notificaciones-admin/notificaciones-admin.html |
| 359 | admin/users/usuario-form-dialog.component.html |
| 358 | admin/schedules/horario-detail-drawer.component.html |
| 353 | profesor/classrooms/salon-grupos-tab.component.html |
| 335 | cross-role/ctest-k6/load-profile.component.html |
| 326 | admin/events-calendar/eventos-calendario.html |

---

## Fase 1 — Tests de Comportamiento (semanas 1-3)

> **Problema**: 99 spec files pero la mayoria valida creacion, no comportamiento.
> **Objetivo**: Cubrir los 5 flujos criticos con tests que detecten regresiones reales.
> **Esfuerzo**: ~8-12 horas total
> **Estado**: 5/5 flujos completos ✅ (2026-04-14)

### Contexto

Los 101 tests de contrato (Fase 2 de enforcement-reglas.md) cubren wrappers y guards.
Lo que falta son tests de **flujo de datos**: facade llama API → store se actualiza → vm refleja cambio.

### Tests prioritarios por flujo critico

| # | Flujo | Archivos a testear | Estado | Commit |
|---|-------|---------------------|--------|--------|
| 2 | **CRUD usuarios (patron base)** | usuarios-crud.facade + usuarios.store | ✅ Hecho | `22c1c3d` (18 tests) + `6aa26de` (25 tests) |
| 5 | **WAL optimistic flow** | WalFacadeHelper + facade concreto | ✅ Parcial — cubierto dentro del flujo 2 (apply inmediato, rollback en error, onCommit stats) | junto con flujo 2 |
| 1 | **Login → session → permisos** | AuthService, SessionCoordinator, UserPermisosService | ✅ Hecho | specs existentes + nuevo `session-coordinator.service.spec.ts` (11 tests) |
| 3 | **Asistencia director** | attendance-director.component, attendance-view.service | ✅ Hecho | `attendance-view.service.spec.ts` (18 tests) |
| 4 | **Horarios admin** | horarios-crud.facade, horarios.store | ✅ Hecho | `horarios-crud.facade.spec.ts` (16 tests) |

### Progreso detallado

#### ✅ Flujo 2 — CRUD usuarios (completo)

**Diagnóstico inicial**: El spec de `usuarios.store.spec.ts` tenía 15 tests rotos (no 53 como decía el plan original) por API desfasada tras refactor a `BaseCrudStore`. Nombres viejos (`setUsuarios`, `removeUsuario`, `clearFilters`, `updateFormData`, `uiVm`, `dataVm`) no existían en la API actual.

**Fix store spec** (`6aa26de`): Reescrito a 25 tests enfocados SOLO en comportamiento feature-specific (salones, skeletons, import, filtros rol/salón, diálogos custom, `toggleEstadoUsuario`, `triggerRefresh`, `onClearFiltros` override, `updateFormDataWithPolicies`, computed de rol/validación, composición de vm). La base CRUD ya tiene su propio spec (`base-crud.store.spec.ts`) — evitamos duplicación.

**Nuevo facade spec** (`22c1c3d`): 18 tests de comportamiento para `UsersCrudFacade` usando un **WAL mock controllable** que captura el último config y expone `commit()`/`fail()` para que cada test decida cuándo disparar `onCommit` o `rollback+onError`. Cubre:
- Dispatch create vs update (saveUsuario)
- Create flow: optimistic close dialog + onCommit incrementa stats (total/activos/rol)
- Update flow: optimistic quirúrgico + close; rollback restaura snapshot; onCommit triggerRefresh
- Delete flow: optimistic remove + decrementa activos O inactivos según estado; rollback exacto
- Toggle flow: flip estado + mueve contador activos ↔ inactivos; rollback exacto
- Import flow: success con creados>0 incrementa; success con solo actualizados solo refetch; error preserva stats

**Patrón replicable del WAL mock controllable** (usar en los otros flujos):

```typescript
interface WalConfig {
  operation: string;
  optimistic?: { apply: () => void; rollback: () => void };
  onCommit: (result?: unknown) => void;
  onError: (err: unknown) => void;
}

function createControllableWal() {
  const configs: WalConfig[] = [];
  const execute = vi.fn((config: WalConfig) => {
    configs.push(config);
    config.optimistic?.apply();  // apply inmediato
  });
  return {
    execute,
    last: () => configs[configs.length - 1],
    commit: (result?: unknown) => configs[configs.length - 1].onCommit(result),
    fail: (err: unknown) => {
      const cfg = configs[configs.length - 1];
      cfg.optimistic?.rollback();
      cfg.onError(err);
    },
  };
}
```

#### ✅ Flujo 1 — Login/session/permisos (completo)

**Diagnóstico**: La mayoría del flujo ya estaba cubierto por specs existentes. Se auditaron y se identificó un gap real en `SessionCoordinatorService` (coordinación multi-tab vía BroadcastChannel) que no tenía spec.

**Cobertura verificada en specs existentes**:
- `auth.service.spec.ts` (25 tests) — login success/failure, block tras 3 intentos, reset, logout (limpia storage+permisos), verifyToken, cambiarContrasena, sessions multi-user (getSessions, switchSession, removeSession)
- `auth.store.spec.ts` — NgRx Signals store global
- `user-permisos.service.spec.ts` (24 tests) — `tienePermiso()` con match exacto case-insensitive, **INV-S04** (ruta padre no da acceso a hijas, ni parcial), `ensurePermisosLoaded`, restore desde storage, clear
- `user-permisos-security.contract.spec.ts` — contratos de seguridad

**Nuevo spec** (`session-coordinator.service.spec.ts`, 11 tests):
- `setup()` abre `BroadcastChannel('educa-session')` y fallback graceful si no está disponible
- `teardown()` cierra canal; broadcast posterior es no-op
- `broadcast()` envía mensajes y tolera `postMessage` que lanza (canal cerrado)
- `message$` re-emite todos los mensajes recibidos (refresh-done, logout, login)
- Detección de login con usuario distinto: warning no bloquea, mensaje se re-emite igual

**Patrón aplicado**: `MockBroadcastChannel` class instalado en `globalThis.BroadcastChannel` con helper `fire()` para simular mensajes entrantes desde otro tab. Canales se limpian en `afterEach`.

#### ✅ Flujo 3 — Asistencia director (completo)

**Archivos cubiertos** (refactor en commit `64b03c0`):
- `services/attendance/attendance-view.service.ts` (AttendanceViewController, 327 líneas)

**Nuevo spec** (`attendance-view.service.spec.ts`, 18 tests) cubre:
- `init()` — inicializa PDF con getter de contexto y conecta SignalR
- `setViewMode()` — cambio Día↔Mes dispara carga correspondiente; no-op si mismo modo
- `loadEstudiantes()` — restauración desde storage, fallback al primero, no-op sin contexto, set de tablas ingresos+salidas
- `selectEstudiante()` — guarda en storage + recarga; no-op si mismo id
- `onIngresosMonthChange / onSalidasMonthChange` — actualiza mes, dispara `onMonthChange` y `syncSelectedYear`; cambio en salidas no toca ingresos
- `reload()` — delega según viewMode activo
- `onFechaDiaChange` — actualiza fecha y recarga día
- `pdfFecha` computed — en Día devuelve `fechaDia`, en Mes devuelve primer día del mes seleccionado

**Patrón aplicado**: `processAsistencias` mock dinámico que refleja el mes/año recibidos (evita que el re-fetch interno sobrescriba el estado con valores del emptyTable).

#### ✅ Flujo 4 — Horarios admin (completo)

**Archivos cubiertos**:

- `pages/admin/schedules/services/horarios-crud.facade.ts` (313 líneas)
- `pages/admin/schedules/services/horarios.store.ts` (401 líneas — candidato Fase 2, ya tenía spec propio)

**Nuevo spec** (`horarios-crud.facade.spec.ts`, 16 tests) con WAL mock controllable, cubre:

- **CREATE**: emite operation `CREATE`; onCommit incrementa `totalHorarios` + `horariosActivos` y refresca; onError no toca stats
- **UPDATE**: apply aplica mutación quirúrgica al store; rollback restaura snapshot exacto; onCommit ajusta `horariosSinProfesor` al asignar/desasignar profesor
- **TOGGLE**: apply mueve contadores `horariosActivos` ↔ `horariosInactivos` según estado; rollback revierte
- **DELETE**: apply remueve + decrementa total/activos/horariosSinProfesor; rollback re-añade con stats restauradas
- **importarHorarios**: `creados>0` refresca y notifica; `creados=0` no refresca ni notifica éxito
- **Asignaciones**: `asignarProfesor`, `desasignarEstudiante` delegan en `SchedulesAssignmentService`

**Validación de conflictos** (INV-U03/U04/U05): responsabilidad del backend — el facade solo surfaces el error al usuario.

### Patron de test para facades

```typescript
describe('XxxCrudFacade', () => {
  // Setup: WAL controllable (ver arriba), real store, mock API, mock dataFacade/errorHandler
  it('create → optimistic close + onCommit increments stats', () => {});
  it('update → optimistic local + rollback restaura snapshot exacto', () => {});
  it('toggle → optimistic flip + mueve activos↔inactivos', () => {});
  it('delete → optimistic remove + decrementa stats', () => {});
});
```

### Criterio de completitud

- [x] Los 15 tests rotos en usuarios.store.spec.ts arreglados (reescritos)
- [x] Flujo 2 con test de comportamiento completo (18 tests facade + 25 tests store)
- [x] Flujo 5 WAL cubierto dentro del flujo 2
- [x] Flujo 1 Login/session/permisos (specs existentes + nuevo session-coordinator spec)
- [x] Flujo 3 Asistencia director (attendance-view.service.spec.ts, 18 tests)
- [x] Flujo 4 Horarios admin (horarios-crud.facade.spec.ts, 16 tests)

### Dependencia

Ninguna. Cada flujo restante es independiente; usar el patrón WAL mock controllable del flujo 2 como plantilla.

---

## Fase 2 — Dividir Archivos Grandes TS (semanas 2-5)

> **Problema**: 15 archivos superan la regla max-lines:300, algunos por mucho (641 ln).
> **Objetivo**: Ningun archivo de feature >350 lineas. Core/infra puede tener escape hatch justificado.
> **Esfuerzo**: ~10-15 horas total (incremental, 1-2 archivos por sesion)

### Clasificacion y estrategia

#### Grupo A — Core/Infraestructura (escape hatch justificado)

Estos archivos son grandes porque su responsabilidad es intrinsecamente amplia.
Dividir solo si hay separacion logica clara.

| Archivo | Lineas | Estrategia |
|---------|--------|------------|
| storage.service.ts | 641 | Dividir: facade general + sub-facades por dominio (auth-storage, preferences-storage, cache-storage) |
| wal-sync-engine.service.ts | 466 | Escape hatch: motor de sync es una unidad logica cohesiva |
| base-crud.facade.ts | 442 | Escape hatch: base class — cada linea es contrato compartido |
| wal.service.ts | 399 | Escape hatch: core del WAL |
| wal-db.service.ts | 395 | Escape hatch: IndexedDB wrapper |

#### Grupo B — Features (dividir obligatorio)

Estos archivos son gordos porque acumularon responsabilidades. Dividir por rol.

| Archivo | Lineas | Estrategia de division |
|---------|--------|------------------------|
| profesor-api.service.ts | 417 | Dividir por dominio: profesor-cursos-api.service.ts + profesor-salones-api.service.ts + profesor-asistencia-api.service.ts |
| horarios.store.ts | 401 | Extraer: estado de filtros → horarios-filters.store.ts. Estado de UI → ya deberia estar en ui.facade |
| campus-admin.facade.ts | 383 | Dividir en multi-facade: campus-data.facade + campus-crud.facade + campus-ui.facade |
| salones-admin.facade.ts | 379 | Ya es facade unico — dividir en multi-facade si tiene 3+ responsabilidades |
| campus-admin.store.ts | 379 | Extraer computed pesados a campus-admin-derived.store.ts o mover a facade |
| notifications.service.ts | 382 | Dividir: notification-api.service.ts + notification-state.service.ts |
| error-reporter.service.ts | 384 | Revisar si hay logica que deberia estar en interceptor |
| preferences-storage.service.ts | 449 | Dividir por dominio de preferencias si hay 3+ grupos logicos |
| session-storage.service.ts | 421 | Dividir: auth-session-storage + general-session-storage |
| pathfinding.service.ts | 439 | Feature campus — aceptable si es algoritmo puro. Escapar si es cohesivo |

### Orden de ejecucion (por frecuencia de edicion)

Priorizar archivos que se tocan seguido (mayor riesgo de regresion):

1. **profesor-api.service.ts** — se toca en cada feature de profesor
2. **horarios.store.ts** — modulo activo con ediciones recientes
3. **storage.service.ts** — facade central, tocada indirectamente por muchos
4. **notifications.service.ts** — se toca al agregar features de comunicacion
5. El resto: incremental al tocar el archivo

### Criterio de completitud

- [ ] Grupo B: todos los archivos <350 lineas
- [ ] Grupo A: archivos con escape hatch documentado en primera linea del archivo
- [ ] Cada division mantiene los tests existentes pasando
- [ ] Lint pasa despues de cada division

---

## Fase 3 — Dividir Templates Grandes (semanas 3-6)

> **Problema**: 10 templates superan 150 lineas (regla propia), top: 487 lineas.
> **Objetivo**: Ningun template >250 lineas. Extraer sub-componentes presentacionales.
> **Esfuerzo**: ~8-12 horas total

### Estrategia general

Un template grande casi siempre tiene secciones extraibles a sub-componentes:

| Seccion tipica | Extraer a |
|----------------|-----------|
| Stats/KPIs cards | `*-stats.component.ts` (presentational) |
| Filtros complejos | `*-filters.component.ts` (presentational) |
| Tabla con columnas | `*-table.component.ts` (presentational) |
| Dialog/form | `*-form-dialog.component.ts` (ya existe en algunos) |
| Drawer de detalle | `*-detail-drawer.component.ts` (ya existe en algunos) |

### Prioridad por tamano y frecuencia de edicion

| # | Template | Lineas | Accion |
|---|----------|--------|--------|
| 1 | curso-content-readonly-dialog.html | 487 | Extraer: content-tabs, resource-list, task-list como sub-componentes |
| 2 | attendances.component.html | 463 | Extraer: attendance-filters, attendance-stats, attendance-table |
| 3 | permisos-roles.component.html | 425 | Extraer: role-selector, permissions-tree, permissions-actions |
| 4 | cursos.component.html | 423 | Extraer: cursos-stats, cursos-filters, cursos-table (patron CRUD estandar) |
| 5 | notificaciones-admin.html | 388 | Extraer: notif-stats, notif-form, notif-preview |

### Criterio de completitud

- [ ] Top 5 templates divididos en sub-componentes
- [ ] Ningun template nuevo >250 lineas
- [ ] Sub-componentes son presentacionales (input/output, OnPush)
- [ ] Templates restantes se dividen al tocarlos (incremental)

---

## Fase 4 — Compliance Reglas vs Codigo (semana 4, continua)

> **Problema**: Mas reglas documentadas que codigo que las cumpla uniformemente.
> **Objetivo**: Audit completo con TODOs trackables. Eliminar la disonancia.
> **Esfuerzo**: ~4-6 horas (audit) + trabajo incremental

### Auditar

| Regla | Que buscar | Comando |
|-------|-----------|---------|
| Transparencia de tablas | p-table sin override SCSS | grep -rl "p-table" --include="*.html" y verificar SCSS |
| Transparencia de filtros | p-inputtext/p-select sin override | grep en SCSS de componentes con filtros |
| appendTo="body" | p-select/p-calendar sin appendTo | grep -r "p-select\|p-calendar" sin appendTo |
| Dialogs fuera de @if | p-dialog dentro de @if | grep -r "@if.*dialog" en HTML |
| [(visible)] two-way | Overlays con banana-in-box | grep -r "\[\(visible\)\]" en HTML |
| Botones sin aria-label | Botones icon-only sin pt | Buscar pButton sin label ni pt |
| Funciones en template | Metodos llamados en bindings | Buscar {{ method() }} que no sean signals/computed |

### Resultado esperado

Un archivo `.claude/tasks/compliance-audit-results.md` con:
- Violaciones encontradas por regla
- Prioridad (critica/media/baja)
- Archivo afectado
- Estado (pendiente/resuelto)

### Criterio de completitud

- [ ] Audit ejecutado para las 7 reglas listadas
- [ ] Violaciones criticas (dialogs en @if, [(visible)]) corregidas
- [ ] Violaciones medias documentadas como TODOs
- [ ] Regla: al tocar un archivo, corregir sus violaciones

---

## Fase 5 — Enforcement Fases 3-5 (semanas 6-10)

> Continuar el plan de enforcement-reglas.md (Fases 3, 4, 5 pendientes)

### Fase 3 — Tipos Semanticos

- Crear tipos pendientes (EstadoMatricula, MetodoPago, EstadoEstudiante, WalConsistencyLevel)
- Audit de `any` en services y stores
- Aplicar incrementalmente al tocar archivos

### Fase 4 — CI ya existe

- CI ya configurado (.github/workflows/ci.yml)
- Verificar que PR no mergeable sin CI verde (branch protection rules)
- Agregar CI para backend cuando tenga pipeline

### Fase 5 — Barrel Exports Restrictivos

- Reducir exports de storage/, wal/, session/ a solo facades
- ESLint rule para prohibir imports a implementaciones internas

---

## Fase 6 — Tests Pre-Matricula (semanas 8-12)

> **Problema**: Matricula tocara Salon→EstudianteSalon→Aprobacion. Sin tests UI de esos flujos.
> **Objetivo**: Red de seguridad antes de implementar la feature mas compleja del roadmap.

### Tests necesarios

| Flujo | Que testear |
|-------|-------------|
| Salones admin CRUD | Crear salon → validar unicidad. Toggle → mutacion. Stats actualizan |
| Aprobacion masiva | Batch command → resultados parciales. Progresion correcta |
| Estudiante-Salon | Asignacion → un solo salon activo por ano (INV-U01) |

---

## Resumen de Fases

| Fase | Semanas | Esfuerzo | Impacto | Dependencia |
|------|---------|----------|---------|-------------|
| 1. Tests de comportamiento | 1-3 | 8-12h | Alto — detecta regresiones reales | Ninguna |
| 2. Dividir archivos TS | 2-5 | 10-15h | Medio — reduce riesgo de cambio | Ninguna |
| 3. Dividir templates | 3-6 | 8-12h | Medio — mejora mantenibilidad | Ninguna |
| 4. Compliance audit | 4+ | 4-6h + continuo | Medio — elimina disonancia reglas/codigo | Ninguna |
| 5. Enforcement F3-F5 | 6-10 | 6-10h | Alto — cierra escape hatches | Fases 1-2 del enforcement |
| 6. Tests pre-matricula | 8-12 | 6-8h | Critico — protege nucleo para matricula | Fase 1 |

### Metricas de exito a 6 meses

| Metrica | Hoy | Objetivo |
|---------|-----|----------|
| Tests de comportamiento (flujos completos) | ~0 | 15+ flujos criticos |
| Archivos TS >300 lineas (features) | 10+ | 0 (solo infra con escape hatch) |
| Templates >250 lineas | 10+ | 0 |
| Violaciones de reglas propias sin TODO | desconocido | 0 |
| Tipos `any` en services/stores | pendiente audit | 0 en codigo nuevo |
| Tests rotos (usuarios.store.spec) | 53 | 0 |
