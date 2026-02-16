# Gestión de Estado y Servicios

## 0. Objetivo

Diseñar **propiedad del estado** y **fronteras de responsabilidad** para:

- ✅ Minimizar Change Detection
- ✅ Evitar duplicación de verdad
- ✅ Separar estado, tiempo e IO

> **Principio fundamental**: "Arquitectura = decidir quién puede cambiar qué, y cuándo."

---

## 1. Clasificación de Estado (única verdad por concepto)

### UI Local
**Visual/efímero**

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  // Estado UI local - vive en el componente
  readonly isExpanded = signal(false);
  readonly hovering = signal(false);

  toggle(): void {
    this.isExpanded.update(v => !v);
  }
}
```

| Característica | Descripción |
|----------------|-------------|
| Vive en | Componente |
| Persiste | No persiste navegación |
| Ejemplo | Colapsado/expandido, hover, focus |

### Ephemeral / Scoped
**Temporal, cruza componentes de un flow**

```typescript
// Wizard con estado compartido entre pasos
@Injectable() // Sin providedIn: 'root'
export class CreateUserWizardService {
  private readonly _currentStep = signal(0);
  readonly currentStep = this._currentStep.asReadonly();

  private readonly _formData = signal<Partial<User>>({});
  readonly formData = this._formData.asReadonly();

  nextStep(data: Partial<User>): void {
    this._formData.update(d => ({ ...d, ...data }));
    this._currentStep.update(s => s + 1);
  }
}

@Component({
  providers: [CreateUserWizardService], // Scoped al componente
})
export class CreateUserWizardComponent { }
```

| Característica | Descripción |
|----------------|-------------|
| Vive | Mientras dura el flow |
| Persiste | Durante el flujo, no la navegación |
| Ejemplo | Wizard multi-step, modal con tabs |

### Feature State
**Caso de uso del módulo**

```typescript
@Injectable({ providedIn: 'root' })
export class AsistenciaStore {
  // Estado del feature - persiste navegación interna
  private readonly _asistencias = signal<Asistencia[]>([]);
  readonly asistencias = this._asistencias.asReadonly();

  private readonly _criteria = signal<AsistenciaCriteria>({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  });
  readonly criteria = this._criteria.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  // ViewModel derivado
  readonly vm = computed(() => ({
    asistencias: this.asistencias(),
    loading: this.loading(),
    isEmpty: this.asistencias().length === 0,
    monthLabel: this.getMonthLabel(this.criteria().mes),
  }));
}
```

| Característica | Descripción |
|----------------|-------------|
| Vive | En Store del feature |
| Persiste | Navegación interna del módulo |
| Ejemplo | Lista de asistencias, filtros, paginación |

### App State
**Global**

```typescript
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => store.user() !== null),
    userRole: computed(() => store.user()?.rol),
  })),
  withMethods((store) => ({
    setUser(user: AuthUser): void {
      patchState(store, { user });
    },
  }))
);
```

| Característica | Descripción |
|----------------|-------------|
| Vive | Core stores |
| Persiste | Toda la aplicación |
| Ejemplo | Auth, tenant, conectividad |

### ⚠️ Regla: 1 concepto = 1 dueño

```typescript
// ❌ INCORRECTO - Duplicación de verdad
@Component({})
export class ListComponent {
  readonly users = signal<User[]>([]); // Dueño: componente
}

@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly users = signal<User[]>([]); // Dueño: store
}

// ✅ CORRECTO - Un solo dueño
@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly users = signal<User[]>([]); // ✅ Único dueño
}

@Component({})
export class ListComponent {
  private store = inject(UsersStore);
  readonly users = this.store.users; // Solo lectura
}
```

---

## 2. Roles de Servicios (reforzado)

Ver `@.claude/rules/architecture.md` para taxonomía completa. Aquí reforzamos las reglas:

| Tipo | Estado | IO | UI |
|------|--------|----|----|
| Utility | ❌ | ❌ | ❌ |
| Gateway | ❌* | ✅ | ❌ |
| State/Store | ✅ | ❌ | ❌ |
| Facade | ❌** | ✅ | ✅ |
| Ephemeral | ✅ | ❌ | ✅ |

\* Puede tener cache interno, pero no expone estado reactivo a UI
\*\* Muy poco, solo orquestación

---

## 3. Contrato Store (shape estándar)

```typescript
interface StoreState<T> {
  // Intención (serializable, cacheable)
  criteria: SearchCriteria;

  // Paginación/sort
  page: {
    index: number;
    size: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };

  // Entidades normalizadas
  entitiesById: Record<string, T>;

  // Resultado
  result: {
    ids: string[];
    total: number;
  };

  // Selección
  selection: Set<string>;

  // Status
  status: {
    loading: boolean;
    error: string | null;
    stale: boolean; // Datos desactualizados
  };
}

// ViewModel (derivado, listo para template)
interface StoreVM<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  hasSelection: boolean;
  selectedItems: T[];
  // ... otros derivados
}

@Injectable({ providedIn: 'root' })
export class UsersStore {
  // Estado privado
  private readonly _state = signal<StoreState<User>>(initialState);

  // Lecturas readonly
  readonly criteria = computed(() => this._state().criteria);
  readonly loading = computed(() => this._state().status.loading);

  // ViewModel
  readonly vm = computed<StoreVM<User>>(() => {
    const state = this._state();
    const items = state.result.ids.map(id => state.entitiesById[id]);

    return {
      items,
      loading: state.status.loading,
      error: state.status.error,
      isEmpty: items.length === 0,
      hasSelection: state.selection.size > 0,
      selectedItems: Array.from(state.selection)
        .map(id => state.entitiesById[id])
        .filter(Boolean),
    };
  });

  // Comandos (mutación controlada)
  setCriteria(criteria: SearchCriteria): void {
    this._state.update(s => ({ ...s, criteria }));
  }

  setLoading(loading: boolean): void {
    this._state.update(s => ({
      ...s,
      status: { ...s.status, loading },
    }));
  }

  setResult(users: User[]): void {
    const entitiesById = users.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {} as Record<string, User>);

    this._state.update(s => ({
      ...s,
      entitiesById,
      result: {
        ids: users.map(u => u.id),
        total: users.length,
      },
      status: { ...s.status, loading: false, stale: false },
    }));
  }
}
```

---

## 4. Lecturas vs Escrituras

### ✅ CORRECTO - Lecturas readonly

```typescript
@Injectable({ providedIn: 'root' })
export class UsersStore {
  // Privado - mutable
  private readonly _users = signal<User[]>([]);

  // Público - readonly
  readonly users = this._users.asReadonly();

  // Derivados - computed
  readonly activeUsers = computed(() =>
    this.users().filter(u => u.active)
  );

  // ViewModel - contrato del template
  readonly vm = computed(() => ({
    users: this.users(),
    count: this.users().length,
    hasUsers: this.users().length > 0,
  }));
}
```

### ❌ INCORRECTO - Mutación pública

```typescript
@Injectable({ providedIn: 'root' })
export class UsersStore {
  // ❌ Signal público mutable
  readonly users = signal<User[]>([]);

  // ❌ Expone setter
  setUsers(users: User[]): void {
    this.users.set(users); // Cualquiera puede llamar esto
  }
}

// En componente
this.store.users.set([]); // ❌ Mutación directa desde UI
```

### Regla: "Un servicio no es estado; es una fuente de estado"

```typescript
// El store NO ES el array de usuarios
// El store ES LA FUENTE de donde vienen los usuarios

// ✅ CORRECTO
readonly users = this.store.users; // Leo desde la fuente

// ❌ INCORRECTO
this.store.users.set([]); // Escribo directamente
```

---

## 5. Draft vs Committed

### Draft (UI / Ephemeral)
**Editable, sucio, no dispara IO**

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
  // Draft - editable en UI
  readonly formData = signal<Partial<User>>({});

  readonly isDirty = computed(() => {
    return JSON.stringify(this.formData()) !== JSON.stringify(this.originalData());
  });

  onFieldChange(field: keyof User, value: unknown): void {
    // Solo actualiza UI, no dispara IO
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  save(): void {
    // Commit - dispara IO
    this.facade.saveUser(this.formData());
  }
}
```

### Committed (Store)
**Dispara búsqueda/carga**

```typescript
@Injectable({ providedIn: 'root' })
export class UsersStore {
  // Committed criteria - dispara búsqueda
  private readonly _criteria = signal<SearchCriteria>({ role: 'all' });
  readonly criteria = this._criteria.asReadonly();

  setCriteria(criteria: SearchCriteria): void {
    // Commit - dispara IO
    this._criteria.set(criteria);
    // Trigger side effect
  }
}
```

### ⚠️ Regla: No mezclar draft con estado productivo

```typescript
// ❌ INCORRECTO - Draft mezclado con store
@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly draftUser = signal<Partial<User>>({}); // ❌ Draft en store
  readonly users = signal<User[]>([]); // ✅ Estado productivo
}

// ✅ CORRECTO - Draft en componente/ephemeral
@Component({})
export class UserFormComponent {
  readonly draftUser = signal<Partial<User>>({}); // ✅ Draft en UI
  private store = inject(UsersStore);
  readonly users = this.store.users; // ✅ Committed desde store
}
```

---

## 6. Signals vs RxJS

### Signals - Estado actual

```typescript
@Injectable({ providedIn: 'root' })
export class UsersStore {
  // Estado actual
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();

  // Derivados síncronos
  readonly activeUsers = computed(() =>
    this.users().filter(u => u.active)
  );

  // ViewModel
  readonly vm = computed(() => ({
    users: this.users(),
    count: this.users().length,
  }));
}
```

### RxJS - Tiempo, IO, Cancelación

```typescript
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  // RxJS para operaciones asíncronas
  loadUsers(criteria: SearchCriteria): void {
    this.store.setLoading(true);

    this.api.searchUsers(criteria).pipe(
      debounceTime(300),      // Tiempo
      switchMap(c => this.api.getUsers(c)), // Cancelación
      retry(2),                // Retry
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (users) => this.store.setUsers(users), // Actualiza signals
      error: (err) => this.store.setError(err),
    });
  }
}
```

### Puente: RxJS → effects → Signals

```typescript
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(UsersStore);

  constructor() {
    // Effect: Cuando criteria cambia, cargar datos
    effect(() => {
      const criteria = this.store.criteria();

      this.api.getUsers(criteria).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(users => {
        this.store.setUsers(users);
      });
    });
  }
}
```

| Usar Signals para | Usar RxJS para |
|-------------------|----------------|
| Estado actual | Tiempo (debounce, throttle) |
| Derivados síncronos | IO asíncrono |
| ViewModel | Cancelación (switchMap) |
| Change Detection | Retry/error handling |
| | Combinación de streams |

---

## 7. Cache y Offline

### Cache ≠ Store

```typescript
// Store - decide qué se muestra
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();
}

// Cache - optimiza IO
@Injectable({ providedIn: 'root' })
export class UsersCacheService {
  private cache = new Map<string, { data: User[]; timestamp: number }>();

  get(key: string): User[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isStale = Date.now() - entry.timestamp > 5 * 60 * 1000; // 5 min TTL
    return isStale ? null : entry.data;
  }

  set(key: string, data: User[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
```

### Claves determinísticas

```typescript
// ✅ CORRECTO - Clave basada en intención normalizada
function getCacheKey(criteria: SearchCriteria): string {
  const normalized = {
    role: criteria.role || 'all',
    page: criteria.page || 1,
    search: criteria.search?.toLowerCase().trim() || '',
  };
  return JSON.stringify(normalized);
}

// ❌ INCORRECTO - Clave inconsistente
const key = `users-${Math.random()}`; // ❌ No es determinística
const key2 = criteria.search; // ❌ No normalizada
```

### Estrategia TTL + SWR (Stale-While-Revalidate)

```typescript
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private cache = inject(UsersCacheService);
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  loadUsers(criteria: SearchCriteria): void {
    const cacheKey = getCacheKey(criteria);

    // 1. Devolver cache inmediatamente (si existe)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.store.setUsers(cached);
      this.store.setStale(true); // Marcar como posiblemente obsoleto
    }

    // 2. Fetch al servidor en background
    this.api.getUsers(criteria)
      .subscribe(users => {
        this.cache.set(cacheKey, users);
        this.store.setUsers(users);
        this.store.setStale(false);
      });
  }
}
```

### Invalidación explícita

```typescript
@Injectable({ providedIn: 'root' })
export class UsersCacheService {
  private cache = new Map<string, CacheEntry>();

  // Invalidar por tag
  invalidateByTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
      }
    }
  }

  // Invalidar por prefijo
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  // Limpiar todo
  clear(): void {
    this.cache.clear();
  }
}

// Uso
this.cache.invalidateByTag('users'); // Invalida todo relacionado con users
this.cache.invalidateByPrefix('users-role:'); // Invalida por rol específico
```

### Offline - Escrituras con cola

```typescript
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private queue = signal<QueuedWrite[]>([]);

  // Encolar escritura
  enqueue(operation: QueuedWrite): void {
    this.queue.update(q => [...q, operation]);
    this.persistQueue(); // Guardar en IndexedDB
  }

  // Procesar cola cuando vuelve conexión
  processQueue(): void {
    const operations = this.queue();

    for (const op of operations) {
      this.api.execute(op).subscribe({
        next: () => {
          this.queue.update(q => q.filter(x => x.id !== op.id));
          this.persistQueue();
        },
        error: (err) => {
          logger.error('Error procesando cola:', err);
          // Mantener en cola para reintento
        },
      });
    }
  }
}
```

---

## 8. Pipeline Canónico

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Event                              │
│                     (click, input)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        Facade                                │
│             (comando de intención)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Store (intención)                          │
│          setCriteria(), setLoading()                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Gateway / Cache / IO                            │
│    (fetch data, check cache, call API)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│             Store (materialización)                          │
│       setResult(), setError(), setStale()                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    ViewModel                                 │
│         computed(() => ({ ... }))                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Template                                │
│              {{ vm.users() }}                                │
└─────────────────────────────────────────────────────────────┘
```

### Ejemplo completo

```typescript
// 1. UI Event
@Component({
  template: `
    <button (click)="loadUsers()">Cargar</button>
    <div>{{ vm().users }}</div>
  `
})
export class UsersComponent {
  private facade = inject(UsersFacade);
  readonly vm = this.facade.vm;

  loadUsers(): void {
    this.facade.loadUsers({ role: 'admin' });
  }
}

// 2. Facade (comando de intención)
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(UsersStore);
  private api = inject(UsersApiService);
  readonly vm = this.store.vm;

  loadUsers(criteria: SearchCriteria): void {
    // 3. Store (intención)
    this.store.setCriteria(criteria);
    this.store.setLoading(true);

    // 4. Gateway / IO
    this.api.getUsers(criteria).subscribe({
      // 5. Store (materialización)
      next: (users) => this.store.setResult(users),
      error: (err) => this.store.setError(err),
    });
  }
}

// 6. ViewModel (derivado)
@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly vm = computed(() => ({
    users: this.users(),
    loading: this.loading(),
    isEmpty: this.users().length === 0,
  }));
}

// 7. Template consume VM
// {{ vm().users }}
```

---

## 9. Checklist de Validación

### Antes de implementar estado

- [ ] ¿Hay un solo dueño por concepto?
- [ ] ¿El Store no tiene mutación pública?
- [ ] ¿La UI solo conoce Facade?
- [ ] ¿El draft está separado del committed?
- [ ] ¿El cache tiene key determinística + invalidación?
- [ ] ¿Uso Signals para estado?
- [ ] ¿Uso RxJS para tiempo/IO?
- [ ] ¿El template consume ViewModel?

### Code review checklist

```typescript
// ❌ RED FLAGS
.set() expuesto en servicio
múltiples dueños del mismo concepto
lógica de negocio en componente
draft mezclado con store
cache sin invalidación
RxJS para estado síncrono
funciones en template

// ✅ GREEN FLAGS
readonly signals
computed para derivados
comandos claros (load, save, delete)
1 dueño por estado
draft en componente/ephemeral
cache con TTL + invalidación
pipeline canónico respetado
```

---

## 10. Antipatrones Comunes

### ❌ Estado duplicado

```typescript
// ❌ INCORRECTO
@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly users = signal<User[]>([]);
  readonly activeUsers = signal<User[]>([]); // ❌ Duplicado
}

// ✅ CORRECTO
@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly users = signal<User[]>([]);
  readonly activeUsers = computed(() => // ✅ Derivado
    this.users().filter(u => u.active)
  );
}
```

### ❌ Lógica en componente

```typescript
// ❌ INCORRECTO
@Component({})
export class UsersComponent {
  loadUsers(): void {
    this.http.get<User[]>('/api/users').subscribe(users => {
      this.users.set(users.filter(u => u.active));
    });
  }
}

// ✅ CORRECTO
@Component({})
export class UsersComponent {
  private facade = inject(UsersFacade);

  loadUsers(): void {
    this.facade.loadActiveUsers();
  }
}
```

### ❌ Mutación pública

```typescript
// ❌ INCORRECTO
@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly users = signal<User[]>([]); // Mutable público
}

this.store.users.set([]); // ❌ Cualquiera puede mutar

// ✅ CORRECTO
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();

  setUsers(users: User[]): void {
    this._users.set(users);
  }
}
```

### ❌ Cache sin invalidación

```typescript
// ❌ INCORRECTO
@Injectable({ providedIn: 'root' })
export class UsersCache {
  private cache = new Map<string, User[]>();

  get(key: string): User[] | null {
    return this.cache.get(key) || null; // ❌ Nunca se invalida
  }
}

// ✅ CORRECTO
@Injectable({ providedIn: 'root' })
export class UsersCache {
  private cache = new Map<string, CacheEntry>();

  get(key: string): User[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isStale = Date.now() - entry.timestamp > TTL;
    return isStale ? null : entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}
```

---

## Resumen de Decisiones

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde vive el estado UI? | Componente (signal local) |
| ¿Dónde vive el estado del feature? | Store (signals privados) |
| ¿Cómo expongo estado? | readonly + computed |
| ¿Cómo muto estado? | Comandos (métodos) |
| ¿Cuándo uso Signals? | Estado actual + derivados |
| ¿Cuándo uso RxJS? | Tiempo + IO + cancelación |
| ¿Draft o Committed? | Draft en UI, Committed en Store |
| ¿Cache en Store? | No, cache separado |
| ¿Cómo invalido cache? | TTL + invalidación explícita (tags) |
| ¿Qué consume el template? | ViewModel (computed) |
