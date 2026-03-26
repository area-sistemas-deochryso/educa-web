# Diagnóstico: Gaps de Abstracción en el Codebase

> Documento de referencia. Describe el estado actual, los problemas detectados y el plan de acción priorizado.

---

## Estado Actual (Marzo 2026)

### Lo que SÍ está bien abstraído

| Abstracción | Ubicación | Uso |
|-------------|-----------|-----|
| `BaseRepository<T, C, U>` | `@data/repositories/base/` | UserRepository, NotificationRepository |
| `BaseAdapter<S, T>` | `@data/adapters/base/` | DateAdapter, IsoToFormattedDateAdapter |
| `BaseHttpService` | `@core/services/http/` | Poco usado — la mayoría llama HttpClient directo |
| `WalFacadeHelper` | `@core/services/wal/` | Usado por todos los facades admin |
| Modelos de dominio compartidos | `@data/models/` | 6 archivos (calificacion, horario, mensajeria, salon, eventos, notificaciones) |
| **`BaseCrudStore<T, TForm, TStats>`** | **`@core/store/base/`** | **VistasStore (piloto). 30 tests.** |
| **Tipos compartidos UI** | **`@shared/models/`** | **SelectOption, StatsBase, FormMeta, PaginationState, BaseVm, CrudVm** |
| **Interfaces de entidad** | **`@shared/interfaces/`** | **HasId, HasEstado, CrudEntity, CrudStoreReadonly, CrudStoreCommands** |

### Lo que NO está abstraído y debería estarlo

| Gap | Severidad | Líneas duplicadas | Features afectados |
|-----|-----------|-------------------|-------------------|
| Store CRUD boilerplate | 🔴 Alta | ~120 líneas × 15 stores = **~1800** | Todos los admin |
| Facade WAL CRUD boilerplate | 🔴 Alta | ~80 líneas × 12 facades = **~960** | Todos los admin |
| Dialog management (signals + open/close) | 🔴 Alta | ~30 líneas × 15 stores = **~450** | Todos los admin |
| Filter/Search/Pagination reset | 🟡 Media | ~30 líneas × 10 facades = **~300** | Admin con filtros |
| Interfaces duplicadas | 🟡 Media | ~50 líneas en total | Evaluation(3x), ModuloVistas(2x), GradoOption(2x) |
| SelectOption reinventada | 🟡 Media | ~5 líneas × 8 features | Todos con dropdowns |
| Estadísticas sin base | 🟠 Baja | ~10 líneas × 10 features | Admin con stats |
| `@shared/models/` vacío | 🟠 Baja | N/A | Proyecto completo |
| `@shared/interfaces/` vacío | 🟠 Baja | N/A | Proyecto completo |
| **Total estimado** | | **~3500+ líneas** | |

---

## Hallazgos Detallados

### 1. Stores: 80% boilerplate, 20% lógica real

**Anatomía de un store típico (ejemplo: ~400 líneas)**:

```
Líneas 1-60:    Loading, error, dialog signals + asReadonly     ← BOILERPLATE (15%)
Líneas 61-120:  CRUD mutations (add/update/remove/toggle)       ← BOILERPLATE (15%)
Líneas 121-160: Dialog open/close/reset                         ← BOILERPLATE (10%)
Líneas 161-200: Stats incremental updates                       ← BOILERPLATE (10%)
Líneas 201-280: Computed signals específicos del feature         ← VALOR REAL (20%)
Líneas 281-320: FormData y validaciones                         ← MIXTO (10%)
Líneas 321-400: ViewModel computed                              ← MIXTO (20%)
```

**80% es copiar-pegar** con solo cambiar nombres de entidad.

### 2. Facades: Patrón WAL repetido verbatim

Cada facade admin tiene estas operaciones casi idénticas:

```typescript
// create(): WAL.execute con optimistic close + refetch
// update(): WAL.execute con snapshot + rollback + mutación quirúrgica
// delete(): WAL.execute con remove + rollback add
// toggleEstado(): WAL.execute con toggle + rollback
// loadData(): forkJoin stats + items
// refreshItemsOnly(): re-fetch con filtros actuales
// setSearchTerm(): store.set + resetPage + refresh
// setFilterX(): store.set + resetPage + refresh
// clearFilters(): store.clear + refresh
// openNewDialog(): store.clear + store.open
// openEditDialog(): store.set + store.setForm + store.open
// closeDialog(): store.close
```

12 métodos × 12 facades = **144 métodos** que son copiar-pegar.

### 3. Interfaces sin hogar

| Tipo | Dónde está | Dónde debería estar |
|------|-----------|-------------------|
| `Evaluation` | 3 componentes inline | `@data/models/calificacion.models.ts` |
| `ModuloVistas` | store + utils (duplicado) | `@data/models/permisos.models.ts` |
| `GradoOption` { label, value } | 2 componentes | `@shared/models/select-option.models.ts` como `SelectOption` |
| `CalendarDay` | 2 componentes | `@shared/models/calendar.models.ts` |
| `JaaSTokenResponse` | facade inline | `videoconferencias.models.ts` |
| `LoginResponse` | facade inline | `auth.models.ts` |
| `HijoOption` | componente inline | feature models |

### 4. Naming inconsistente

```
cursos.models.ts           ← ✅ Correcto
usuarios.models.ts         ← ✅ Correcto
salon-admin.interface.ts   ← ❌ Debería ser .models.ts
horario.interface.ts       ← ❌ Debería ser .models.ts
curso.interface.ts         ← ❌ Debería ser .models.ts
profesor.interface.ts      ← ❌ Debería ser .models.ts
```

### 5. @shared/ infrautilizado

```
@shared/
├── interfaces/    ← VACÍO (exporta {})
├── models/        ← VACÍO (exporta {})
├── components/    ← Bien poblado
├── pipes/         ← Bien poblado
├── directives/    ← Bien poblado
└── services/      ← Solo UiMappingService
```

Las carpetas `interfaces/` y `models/` existen pero no se usan. Todo tipo compartido se define inline o en `@data/models/`.

---

## Plan de Acción (4 Fases)

### Fase 1: Tipos Compartidos — ✅ COMPLETADA

`@shared/models/`: `SelectOption<T>`, `StatsBase`, `FormMeta`, `PaginationState`, `BaseVm`, `CrudVm<T>`
`@shared/interfaces/`: `HasId`, `HasEstado`, `CrudEntity`, `CrudStoreReadonly<T>`, `CrudStoreCommands<T>`

### Fase 2: Interfaces de Contrato — ✅ COMPLETADA

`@shared/interfaces/crud-store.interfaces.ts`

### Fase 3: Base Classes — ✅ COMPLETADA

`@core/store/base/base-crud.store.ts` — `BaseCrudStore<T, TForm, TStats>` con 30 tests.

### Fase 4: Migración Incremental (en curso)

**Orden recomendado** (del más simple al más complejo):

| # | Feature | Estado | Resultado |
|---|---------|--------|-----------|
| 1 | ✅ Vistas | Migrado | **245 → 91 líneas (63%)** |
| 2 | ✅ Eventos-calendario | Migrado | **231 → 113 líneas (51%)** |
| 3 | ✅ Notificaciones-admin | Migrado | **235 → 113 líneas (52%)** |
| 4 | ✅ Cursos | Migrado | **436 → 310 líneas (29%)** — mucho computed específico de grados |
| 5 | ⏭️ Usuarios (458) | No apto | FormData complejo, sub-VMs, import flow, debug, tipo selectedItem ≠ tipo items |
| 6 | ⏭️ Permisos-roles (321) | No apto | Drawer + modulos hierarchy, no CRUD estándar |
| 7 | ⏭️ Permisos-usuarios (273) | No apto | Similar a permisos-roles |
| 8 | ⏭️ Salones (285) | No apto | Multi-entity read-mostly, no CRUD estándar |
| 9 | ⏭️ Campus (409) | No apto | Tree/node structure |
| 10 | ⏭️ Horarios (723) | No apto | Multi-view wizard, demasiado complejo |

**Regla**: Migrar un feature SOLO cuando se va a tocar por otro motivo. No crear PRs de "solo refactor".

**Excepción**: Features no-CRUD (Dashboard, Chat, Calendario, Reportes) NO se migran a BaseCrudStore.

---

## Consolidación de Duplicados Existentes

### Prioridad inmediata (hacer al tocar el archivo)

| Duplicado | Acción |
|-----------|--------|
| `Evaluation` (3x) | Unificar en `@data/models/calificacion.models.ts` como `EvaluacionBase` + `EvaluacionEditable` |
| `ModuloVistas` (2x) | Dejar en `@data/models/permisos.models.ts`, importar en ambos lugares |
| `GradoOption` { label, value } (2x) | Reemplazar por `SelectOption<string>` de `@shared/models/` |
| `CalendarDay` (2x) | Unificar en `@shared/models/calendar.models.ts` |
| `*.interface.ts` files | Renombrar a `*.models.ts` al tocar el feature |
| Tipos inline en facades | Extraer a `*.models.ts` del feature |

---

## Métricas de Éxito

### Antes (estado actual)

- Store promedio: **350-450 líneas** (80% boilerplate)
- Facade promedio: **300-570 líneas** (60% boilerplate)
- Tipos duplicados: **7+ interfaces** definidas en múltiples lugares
- `@shared/models/`: **0 archivos**
- `@shared/interfaces/`: **0 archivos**

### Después (objetivo)

- Store promedio: **80-150 líneas** (solo lógica específica del feature)
- Facade promedio: **100-200 líneas** (solo orquestación específica)
- Tipos duplicados: **0** (consolidados en capas correctas)
- `@shared/models/`: **5-8 archivos** con tipos reutilizables
- `@shared/interfaces/`: **3-5 archivos** con contratos
- `@core/store/base/`: **1 base class** usada por 10+ stores

### Cómo medir

```bash
# Líneas por store (objetivo: <150 para CRUD estándar)
wc -l src/app/features/intranet/pages/admin/*/services/*.store.ts

# Tipos duplicados (objetivo: 0)
grep -rn "interface.*Option" src/ --include="*.ts" | grep -v node_modules | grep -v "select-option"

# Interfaces sin hogar (objetivo: 0 en facades)
grep -rn "^interface\|^export interface" src/app/features/*/services/*.facade.ts
```

---

## Decisiones Arquitectónicas

| Decisión | Elegido | Alternativa descartada | Razón |
|----------|---------|----------------------|-------|
| Base class vs Composition | **Herencia simple** (1 nivel) | NgRx SignalStore con `withMethods` | El proyecto usa signals directos, no NgRx SignalStore entity |
| Mixins vs herencia profunda | **Composición** (signals adicionales en clase concreta) | Cadena de herencia de 3+ niveles | Evitar "diamond of death" y complejidad |
| Migración | **Incremental** (al tocar feature) | Big bang refactor | Menor riesgo, no bloquea desarrollo |
| Scope de base class | **Solo CRUD admin** | Todo tipo de store | No forzar abstracción donde no encaja |
| Naming | **`.models.ts`** para todo | `.interface.ts` para contratos | Simplicidad — un solo patrón |
