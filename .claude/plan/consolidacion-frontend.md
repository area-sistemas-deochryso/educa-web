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

### Contexto

Los 101 tests de contrato (Fase 2 de enforcement-reglas.md) cubren wrappers y guards.
Lo que falta son tests de **flujo de datos**: facade llama API → store se actualiza → vm refleja cambio.

### Tests prioritarios por flujo critico

| # | Flujo | Archivos a testear | Que verificar |
|---|-------|---------------------|---------------|
| 1 | **Login → session → permisos** | AuthService, SessionCoordinator, UserPermisosService | Login exitoso → token guardado → permisos cargados → redirect correcto |
| 2 | **CRUD usuarios (patron base)** | usuarios-crud.facade, usuarios.store | Create → refetch items + stats increment. Edit → mutacion quirurgica. Toggle → mutacion + stats. Delete → remove + stats |
| 3 | **Asistencia director** | attendance-director.component, attendance-view.service | Cambio de filtros → recarga datos. Exportar PDF → genera correctamente |
| 4 | **Horarios admin** | horarios-crud.facade, horarios.store | Crear horario → validacion conflictos. Editar → mutacion local. Eliminar → confirm + remove |
| 5 | **WAL optimistic flow** | WalFacadeHelper (ya tiene 20 tests) + un facade concreto | apply() se ejecuta inmediato. Error → rollback restaura snapshot exacto |

### Patron de test para facades

```typescript
describe('UsuariosCrudFacade', () => {
  // Setup: mock API service, real store
  it('create → calls API → refreshes items → increments stats', () => {});
  it('update → calls API → mutacion quirurgica sin refetch', () => {});
  it('toggle → optimistic update → rollback on error', () => {});
  it('delete → remove from list → decrement stats', () => {});
});
```

### Criterio de completitud

- [ ] 5 flujos con tests de comportamiento (no solo creacion)
- [ ] Cada test verifica el flujo completo: accion → efecto en store → reflejo en vm
- [ ] Tests fallan si alguien cambia la logica del facade (no solo si rompe la firma)
- [ ] Los 53 tests rotos en usuarios.store.spec.ts arreglados o eliminados

### Dependencia

Ninguna. Se puede empezar inmediatamente.

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
