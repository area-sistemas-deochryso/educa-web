# Base Abstractions — Clases Base para Store, Facade y Patterns

## Principio Fundamental

> **"Si 80% del código es idéntico entre features, el 80% debería vivir en una base class."**

El proyecto ya tiene `BaseRepository` y `BaseAdapter`. Falta aplicar el mismo principio a **Stores** y **Facades**, donde el 80%+ del código es boilerplate repetido.

---

## Diagnóstico: Qué se Repite

| Patrón | Repeticiones | Líneas duplicadas/feature |
|--------|-------------|---------------------------|
| Loading/Error signals + setters | 15+ stores | ~20 líneas |
| Dialog visibility signals + open/close | 15+ stores | ~30 líneas |
| CRUD mutations (add/update/remove/toggle) | 12+ stores | ~40 líneas |
| Estadísticas incrementales | 10+ stores | ~15 líneas |
| WAL CRUD operations | 12+ facades | ~80 líneas |
| Filter/Search + pagination reset | 10+ facades | ~30 líneas |
| Dialog command delegation | 12+ facades | ~20 líneas |
| Error handling + toast | 12+ facades | ~15 líneas |
| **Total por feature** | | **~250 líneas de boilerplate** |

---

## Capa 1: Interfaces de Contrato

> **"Define el contrato ANTES de la implementación."**

### HasId — Entidad identificable

```typescript
// @shared/interfaces/entity.interfaces.ts
export interface HasId {
  id: number;
}

export interface HasEstado {
  estado: boolean;
}

export interface HasTimestamps {
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export type Identifiable = HasId & HasEstado;
```

### CrudStore — Contrato de un store CRUD

```typescript
// @shared/interfaces/crud-store.interfaces.ts
import { Signal, WritableSignal } from '@angular/core';

export interface CrudStoreReadonly<T extends HasId, TStats = unknown> {
  // Estado
  readonly items: Signal<T[]>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string | null>;

  // UI
  readonly dialogVisible: Signal<boolean>;
  readonly confirmDialogVisible: Signal<boolean>;
  readonly selectedItem: Signal<T | null>;
  readonly isEditing: Signal<boolean>;

  // Stats (opcional)
  readonly estadisticas: Signal<TStats | null>;
}

export interface CrudStoreCommands<T extends HasId, TForm = Partial<T>, TStats = unknown> {
  // Data mutations
  setItems(items: T[]): void;
  addItem(item: T): void;
  updateItem(id: number, updates: Partial<T>): void;
  removeItem(id: number): void;
  toggleEstado(id: number): void;

  // Loading/Error
  setLoading(loading: boolean): void;
  setError(error: string | null): void;

  // Dialog
  openDialog(): void;
  closeDialog(): void;
  openConfirmDialog(): void;
  closeConfirmDialog(): void;

  // Form
  setSelectedItem(item: T | null): void;
  setFormData(data: TForm): void;
  setIsEditing(editing: boolean): void;

  // Stats
  setEstadisticas(stats: TStats): void;
  incrementarEstadistica(campo: keyof TStats, delta: number): void;
}
```

### CrudFacade — Contrato de un facade CRUD

```typescript
// @shared/interfaces/crud-facade.interfaces.ts
export interface CrudFacadeReadonly<TVm> {
  readonly vm: Signal<TVm>;
}

export interface CrudFacadeCommands<TCreate, TUpdate, TItem> {
  loadData(): void;
  create(data: TCreate): void;
  update(id: number, data: TUpdate): void;
  delete(item: TItem): void;
  toggleEstado(item: TItem): void;

  // Dialog
  openNewDialog(): void;
  openEditDialog(item: TItem): void;
  closeDialog(): void;
  openConfirmDialog(): void;
  closeConfirmDialog(): void;
}
```

---

## Capa 2: Base Classes

### BaseCrudStore — Store con CRUD genérico

```typescript
// @core/store/base/base-crud.store.ts
@Injectable()
export abstract class BaseCrudStore<
  T extends HasId,
  TForm = Partial<T>,
  TStats extends StatsBase = StatsBase,
> implements CrudStoreReadonly<T, TStats>, CrudStoreCommands<T, TForm, TStats> {

  // #region Estado privado
  private readonly _items = signal<T[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedItem = signal<T | null>(null);
  private readonly _isEditing = signal(false);
  private readonly _formData: WritableSignal<TForm>;
  private readonly _estadisticas = signal<TStats | null>(null);
  // #endregion

  // #region UI State
  private readonly _dialogVisible = signal(false);
  private readonly _confirmDialogVisible = signal(false);
  // #endregion

  // #region Lecturas públicas
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedItem = this._selectedItem.asReadonly();
  readonly isEditing = this._isEditing.asReadonly();
  readonly estadisticas = this._estadisticas.asReadonly();
  readonly dialogVisible = this._dialogVisible.asReadonly();
  readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();
  // #endregion

  // #region Computed base
  readonly isEmpty = computed(() => this.items().length === 0);
  readonly itemCount = computed(() => this.items().length);
  // #endregion

  constructor(defaultFormData: TForm) {
    this._formData = signal<TForm>(defaultFormData);
  }

  readonly formData = computed(() => this._formData());

  // #region Data mutations
  setItems(items: T[]): void { this._items.set(items); }

  addItem(item: T): void {
    this._items.update((list) => [item, ...list]);
  }

  updateItem(id: number, updates: Partial<T>): void {
    this._items.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  removeItem(id: number): void {
    this._items.update((list) => list.filter((item) => item.id !== id));
  }

  toggleEstado(id: number): void {
    this._items.update((list) =>
      list.map((item) =>
        item.id === id ? { ...item, estado: !(item as HasEstado).estado } : item
      )
    );
  }
  // #endregion

  // #region Loading/Error
  setLoading(loading: boolean): void { this._loading.set(loading); }
  setError(error: string | null): void { this._error.set(error); }
  clearError(): void { this._error.set(null); }
  // #endregion

  // #region Dialog
  openDialog(): void { this._dialogVisible.set(true); }

  closeDialog(): void {
    this._dialogVisible.set(false);
    this._selectedItem.set(null);
    this._isEditing.set(false);
    this.resetFormData();
  }

  openConfirmDialog(): void { this._confirmDialogVisible.set(true); }
  closeConfirmDialog(): void { this._confirmDialogVisible.set(false); }
  // #endregion

  // #region Form
  setSelectedItem(item: T | null): void { this._selectedItem.set(item); }
  setFormData(data: TForm): void { this._formData.set(data); }
  setIsEditing(editing: boolean): void { this._isEditing.set(editing); }

  protected abstract getDefaultFormData(): TForm;

  resetFormData(): void {
    this._formData.set(this.getDefaultFormData());
  }
  // #endregion

  // #region Stats
  setEstadisticas(stats: TStats): void { this._estadisticas.set(stats); }

  incrementarEstadistica(campo: keyof TStats, delta: number): void {
    this._estadisticas.update((stats) => {
      if (!stats) return stats;
      const current = stats[campo];
      if (typeof current !== 'number') return stats;
      return { ...stats, [campo]: current + delta };
    });
  }
  // #endregion
}
```

### Uso concreto

```typescript
// features/admin/cursos/services/cursos.store.ts
@Injectable({ providedIn: 'root' })
export class CursosStore extends BaseCrudStore<CursoListaDto, CursoFormData, CursosEstadisticas> {

  constructor() {
    super({ nombre: '', nivel: null, gradoIds: [] }); // defaultFormData
  }

  protected getDefaultFormData(): CursoFormData {
    return { nombre: '', nivel: null, gradoIds: [] };
  }

  // Solo lo que es ESPECÍFICO de cursos
  // #region Estado específico
  private readonly _filterNivel = signal<NivelEducativo | null>(null);
  readonly filterNivel = this._filterNivel.asReadonly();
  // #endregion

  // #region Computed específicos
  readonly cursosPorNivel = computed(() => {
    const nivel = this.filterNivel();
    return nivel ? this.items().filter(c => c.nivel === nivel) : this.items();
  });
  // #endregion

  // #region Comandos específicos
  setFilterNivel(nivel: NivelEducativo | null): void {
    this._filterNivel.set(nivel);
  }
  // #endregion
}
```

**Resultado**: El store de Cursos pasa de ~437 líneas a ~80 líneas. Solo contiene lo que es ÚNICO de cursos.

---

## Capa 3: Mixins para Filtros y Paginación

> Para stores que necesitan filtrado y paginación, usar composición en lugar de herencia profunda.

### FilterMixin

```typescript
// @core/store/mixins/filter.mixin.ts
export interface FilterState {
  searchTerm: string;
  filterEstado: boolean | null;
  page: number;
  pageSize: number;
  total: number;
}

export function withFilterState() {
  return {
    _searchTerm: signal(''),
    _filterEstado: signal<boolean | null>(null),
    _page: signal(1),
    _pageSize: signal(10),
    _total: signal(0),
  };
}
```

Los stores que necesiten filtros extienden la base Y agregan los signals de filtro. No se crea una cadena de herencia de 4 niveles.

---

## Cuándo usar Base Class vs NO

### ✅ SÍ usar BaseCrudStore cuando

- El feature es un CRUD admin estándar (listar, crear, editar, toggle, eliminar)
- Tiene dialog de formulario
- Tiene confirmDialog para eliminar
- Tiene estadísticas
- Tiene loading/error state

**Ejemplos**: Cursos, Usuarios, Salones, Campus, Horarios, Vistas, Permisos-roles

### ❌ NO usar BaseCrudStore cuando

- El feature no es CRUD (ej: Dashboard, Chat, Calendario)
- El estado es muy diferente al patrón base (ej: Wizard multi-step)
- El feature es read-only (ej: Reportes, Kardex)
- Forzar la herencia haría el código MÁS complejo, no menos

**En esos casos**: Usar signals directos como se hace actualmente, pero aplicar las interfaces de contrato donde tengan sentido.

---

## Patrón de ViewModel Base

### BaseVm — propiedades que TODO vm tiene

```typescript
// @shared/models/viewmodel.models.ts
export interface BaseVm {
  loading: boolean;
  error: string | null;
}

export interface CrudVm<T> extends BaseVm {
  items: T[];
  isEmpty: boolean;
  dialogVisible: boolean;
  confirmDialogVisible: boolean;
  isEditing: boolean;
  formData: unknown;
}
```

### Construcción del vm en stores concretos

```typescript
// El store concreto compone el vm base + sus campos específicos
readonly vm = computed(() => ({
  // Base (heredado de BaseCrudStore computed o manual)
  items: this.items(),
  loading: this.loading(),
  error: this.error(),
  isEmpty: this.isEmpty(),
  dialogVisible: this.dialogVisible(),
  confirmDialogVisible: this.confirmDialogVisible(),
  isEditing: this.isEditing(),
  formData: this.formData(),
  estadisticas: this.estadisticas(),

  // Específico del feature
  filterNivel: this.filterNivel(),
  cursosPorNivel: this.cursosPorNivel(),
}));
```

---

## Migración Incremental

> **"No refactorizar todo de golpe. Migrar feature por feature cuando se toque."**

### Orden de migración recomendado

| Fase | Qué hacer | Impacto |
|------|-----------|---------|
| **1** | Crear interfaces en `@shared/interfaces/` | Zero risk, solo tipos |
| **2** | Crear `@shared/models/` compartidos (SelectOption, StatsBase, etc.) | Zero risk, solo tipos |
| **3** | Crear `BaseCrudStore` en `@core/store/base/` | No afecta código existente |
| **4** | Migrar 1 store simple (ej: Vistas) como piloto | Validar el patrón |
| **5** | Migrar stores restantes incrementalmente | Al tocar cada feature |

### Regla de migración

Al crear un feature NUEVO → usar `BaseCrudStore` obligatoriamente si es CRUD admin.
Al modificar un feature EXISTENTE → evaluar si es buen momento para migrar (si el cambio es grande, sí; si es un bugfix de 2 líneas, no).

---

## Relación con Reglas Existentes

| Regla existente | Cómo se complementa |
|-----------------|---------------------|
| `architecture.md` | Define taxonomía. Base abstractions dan la implementación concreta |
| `state-management.md` | Define principios. Base classes los implementan |
| `crud-optimization.md` | Define estrategias. `BaseCrudStore` las incluye por defecto |
| `enforcement.md` | Define checks. Base classes los resuelven automáticamente |
| `signals.md` | Define DO/DON'T. Base classes cumplen todas las reglas |
| `dialogs-sync.md` | Define patrón dialog. `BaseCrudStore` lo incluye |

---

## Checklist de Code Review

```
BASE CLASSES
[ ] ¿Feature CRUD admin usa BaseCrudStore? (o tiene justificación para no hacerlo)
[ ] ¿Store concreto SOLO tiene código específico del feature?
[ ] ¿No hay boilerplate de loading/error/dialog duplicado manualmente?

INTERFACES
[ ] ¿Tipos compartidos vienen de @shared/models/?
[ ] ¿Entidades de dominio vienen de @data/models/?
[ ] ¿No hay interfaces duplicadas entre features?

COMPOSICIÓN
[ ] ¿Si el store necesita filtros, usa composición (no herencia profunda)?
[ ] ¿El vm compone base + específico?
[ ] ¿La herencia no supera 2 niveles? (BaseCrudStore → ConcreteStore)
```

---

## Anti-Patrones de Abstracción

### ❌ Sobre-abstraer

```typescript
// ❌ Herencia de 4 niveles
class BaseStore → FilterableStore → PaginatedStore → CrudStore → CursosStore

// ✅ Base + composición
class BaseCrudStore → CursosStore (con signals de filtro adicionales)
```

### ❌ Abstraer antes de tener 3+ casos

```typescript
// ❌ Crear BaseWizardStore porque "tal vez lo necesitemos"
// ✅ Crear cuando haya 3+ wizards con el mismo patrón
```

### ❌ Forzar la abstracción

```typescript
// ❌ Dashboard store forzado a extender BaseCrudStore
// ✅ Dashboard store con signals directos (no es CRUD)
```

> **"La abstracción correcta elimina duplicación sin agregar complejidad. Si agrega complejidad, no es la abstracción correcta."**
