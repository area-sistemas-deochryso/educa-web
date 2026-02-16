# Signals en Angular

## Qué es y qué NO es un Signal

### Definición

```
Signal = valor + dependencias + scheduler
```

Un Signal es:
- ✅ Un **contenedor reactivo** de un valor actual
- ✅ Un **sistema de dependencias** que notifica cambios automáticamente
- ✅ Un **scheduler** que optimiza actualizaciones

### NO es

| ❌ NO es | Por qué |
|----------|---------|
| Un `Subject` | Subject es para streams de eventos, Signal es para estado actual |
| Un store global por defecto | El scope depende del provider |
| Una fuente de eventos | Para eventos usar RxJS |
| Un reemplazo de RxJS | Son complementarios, no competidores |

### Regla base

```typescript
Signals = estado síncrono derivable
RxJS = tiempo, async, IO, streams
```

---

## Tipos de Signals (y cuándo usar cada uno)

### 1. `signal()` - Estado mutable controlado

**Para qué**: Estado que cambia a lo largo del tiempo

```typescript
// ✅ CORRECTO - Estado UI local
readonly isExpanded = signal(false);
readonly selectedId = signal<string | null>(null);
readonly filters = signal<SearchFilters>({ query: '', category: 'all' });

toggle(): void {
  this.isExpanded.update(v => !v);
}

selectItem(id: string): void {
  this.selectedId.set(id);
}

updateFilters(newFilters: Partial<SearchFilters>): void {
  this.filters.update(current => ({ ...current, ...newFilters }));
}
```

**Reglas duras**:
- ✅ Solo para estado síncrono
- ✅ Mutación explícita con `.set()` o `.update()`
- ❌ NO hacer IO dentro de mutaciones
- ❌ NO exponer el signal mutable como público

```typescript
// ❌ INCORRECTO - Signal público mutable
export class UsersStore {
  readonly users = signal<User[]>([]);  // ❌ Cualquiera puede mutar
}

// En componente
this.store.users.set([]); // ❌ Mutación directa desde fuera

// ✅ CORRECTO - Signal privado con readonly
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();  // ✅ Solo lectura

  setUsers(users: User[]): void {
    this._users.set(users);  // ✅ Mutación controlada
  }
}
```

### 2. `computed()` - Derivación pura (sin efectos)

**Para qué**: Calcular valores derivados de otros signals

```typescript
// ✅ CORRECTO - Derivaciones puras
readonly users = signal<User[]>([]);
readonly searchQuery = signal('');

// Derivado 1: Filtrado
readonly filteredUsers = computed(() =>
  this.users().filter(u =>
    u.name.toLowerCase().includes(this.searchQuery().toLowerCase())
  )
);

// Derivado 2: Conteo
readonly totalUsers = computed(() => this.users().length);
readonly activeUsersCount = computed(() =>
  this.users().filter(u => u.active).length
);

// Derivado 3: Estado booleano
readonly hasUsers = computed(() => this.users().length > 0);
readonly isEmpty = computed(() => this.filteredUsers().length === 0);
```

**Reglas duras**:

| Regla | Por qué |
|-------|---------|
| ✅ Solo operaciones puras | Predecibilidad |
| ✅ Sin efectos secundarios | No mutaciones, no IO |
| ✅ Siempre devuelve algo | Es una función pura |
| ❌ NO mutar estado | Rompe la pureza |
| ❌ NO hacer IO | Es síncrono |
| ❌ NO logs ni side effects | Solo derivación |

```typescript
// ❌ INCORRECTO - computed con efectos secundarios
readonly totalPrice = computed(() => {
  const total = this.items().reduce((sum, i) => sum + i.price, 0);
  console.log('Total:', total);  // ❌ Side effect (log)
  this.analytics.track('price_calculated');  // ❌ Side effect (IO)
  return total;
});

// ❌ INCORRECTO - computed que muta
readonly sortedUsers = computed(() => {
  const users = this.users();
  users.sort((a, b) => a.name.localeCompare(b.name));  // ❌ Muta el array original
  return users;
});

// ✅ CORRECTO - computed puro
readonly totalPrice = computed(() =>
  this.items().reduce((sum, i) => sum + i.price, 0)
);

// ✅ CORRECTO - computed sin mutación
readonly sortedUsers = computed(() =>
  [...this.users()].sort((a, b) => a.name.localeCompare(b.name))
);
```

### 3. `effect()` - Puente con el mundo real

**Para qué**: Sincronizar signals con el mundo externo

```typescript
// ✅ CORRECTO - effect para sincronización
export class UserPreferencesService {
  private storage = inject(StorageService);
  readonly theme = signal<'light' | 'dark'>('light');

  constructor() {
    // Effect: Guardar preferencias cuando cambian
    effect(() => {
      const currentTheme = this.theme();
      this.storage.set('theme', currentTheme);
      logger.debug('Theme saved:', currentTheme);
    });
  }
}

// ✅ CORRECTO - effect para DOM
export class ScrollPositionService {
  readonly scrollY = signal(0);

  constructor() {
    // Effect: Sincronizar scroll con signal
    effect(() => {
      const y = this.scrollY();
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  }
}
```

**Reglas duras**:

| Regla | Por qué |
|-------|---------|
| ✅ Solo para sincronización | Conecta mundos |
| ✅ Puede tener side effects | Es su propósito |
| ❌ NO devuelve datos | No es una función |
| ❌ NO lógica de negocio | Solo sincronización |
| ❌ NO cálculos | Usa computed |

```typescript
// ❌ INCORRECTO - effect para derivar datos
readonly totalPrice = 0;

constructor() {
  effect(() => {
    this.totalPrice = this.items().reduce((sum, i) => sum + i.price, 0);  // ❌ Usar computed
  });
}

// ✅ CORRECTO - computed para derivar
readonly totalPrice = computed(() =>
  this.items().reduce((sum, i) => sum + i.price, 0)
);

// ❌ INCORRECTO - effect para lógica de negocio
constructor() {
  effect(() => {
    const users = this.users();
    const filtered = users.filter(u => u.active);  // ❌ Lógica en effect
    this.processUsers(filtered);  // ❌ No debe estar aquí
  });
}

// ✅ CORRECTO - computed + método
readonly activeUsers = computed(() =>
  this.users().filter(u => u.active)
);

processActiveUsers(): void {
  this.processUsers(this.activeUsers());
}
```

---

## Reglas Maestras (DO / DON'T)

### ✅ QUÉ SÍ HACER (DO)

#### 1. Usar signals solo para estado síncrono

```typescript
// ✅ CORRECTO - Estado de UI
readonly isExpanded = signal(false);
readonly selectedItems = signal<string[]>([]);
readonly currentPage = signal(1);
readonly sortBy = signal<'name' | 'date'>('name');

// ✅ CORRECTO - Derivaciones puras
readonly totalItems = computed(() => this.items().length);
readonly isEmpty = computed(() => this.items().length === 0);
readonly hasSelection = computed(() => this.selectedItems().length > 0);
```

**Por qué**:
- Signal = **valor actual**, no historia ni flujo
- Representa lo que **ES** ahora, no lo que **OCURRIÓ**

#### 2. Usar RxJS solo para tiempo, async e IO

```typescript
// ✅ CORRECTO - RxJS para async
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  loadUsers(): void {
    this.api.getUsers().pipe(
      retry(3),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(users => {
      // RxJS produce → Signal guarda
      this.store.setUsers(users);
    });
  }
}
```

**Por qué**:
- **RxJS produce** datos (tiempo, IO, eventos)
- **Signals mantienen** el resultado actual

#### 3. Pensar primero en el scope del estado

**Antes de escribir `signal()` responde**:

| Pregunta | Scope |
|----------|-------|
| ¿Este estado vive por componente? | Component-level signal |
| ¿Por feature? | Feature store service |
| ¿Es compartido de verdad? | Core store (singleton) |

```typescript
// ✅ CORRECTO - Estado por componente
@Component({})
export class UserCardComponent {
  readonly isExpanded = signal(false);  // ✅ Scope: componente
}

// ✅ CORRECTO - Estado por feature
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly _users = signal<User[]>([]);  // ✅ Scope: feature
  readonly users = this._users.asReadonly();
}

// ✅ CORRECTO - Estado global compartido
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<User | null>(null);  // ✅ Scope: app
  readonly user = this._user.asReadonly();
}
```

**Por qué**: El **provider define la vida** del estado

#### 4. Encapsular estado con facades

```typescript
// ✅ CORRECTO - Encapsulación completa
@Injectable({ providedIn: 'root' })
export class UsersStore {
  // Signals privados
  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);
  private readonly _selectedId = signal<string | null>(null);

  // Computed expuesto como readonly
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();

  // ViewModel derivado
  readonly selectedUser = computed(() => {
    const id = this._selectedId();
    return id ? this._users().find(u => u.id === id) : null;
  });

  readonly vm = computed(() => ({
    users: this.users(),
    loading: this.loading(),
    selectedUser: this.selectedUser(),
    hasSelection: this.selectedUser() !== null,
  }));

  // Métodos explícitos de mutación
  setUsers(users: User[]): void {
    this._users.set(users);
  }

  selectUser(id: string): void {
    this._selectedId.set(id);
  }

  clearSelection(): void {
    this._selectedId.set(null);
  }
}
```

**Por qué**: El **componente consume, no gobierna**

#### 5. Usar `computed()` solo para derivar

```typescript
// ✅ CORRECTO - Computed puro
readonly totalPrice = computed(() =>
  this.items().reduce((sum, item) => sum + item.price, 0)
);

readonly formattedPrice = computed(() =>
  `S/ ${this.totalPrice().toFixed(2)}`
);

readonly discountedPrice = computed(() =>
  this.totalPrice() * (1 - this.discount() / 100)
);
```

**Reglas**:
- ✅ Sin efectos secundarios
- ✅ Sin mutaciones
- ✅ Sin IO
- ✅ Siempre devuelve un valor

**Por qué**: `computed` = **fórmula**, no procedimiento

#### 6. Usar `effect()` como frontera

```typescript
// ✅ CORRECTO - effect para sincronización
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    // Effect: Sincronizar con DOM
    effect(() => {
      const dark = this.isDark();
      document.body.classList.toggle('dark-mode', dark);
    });

    // Effect: Guardar preferencia
    effect(() => {
      const dark = this.isDark();
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }
}
```

**Usos válidos**:
- ✅ Sincronizar con DOM
- ✅ Persistir en storage
- ✅ Logging
- ✅ Analytics
- ✅ Llamar servicios externos

**Por qué**: effect **conecta mundos**, no modela estado

#### 7. Confiar en signals + OnPush

```typescript
// ✅ CORRECTO - OnPush sin tricks
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    {{ users() }}
    {{ loading() }}
    {{ vm().totalCount }}
  `
})
export class UsersComponent {
  private store = inject(UsersStore);

  readonly users = this.store.users;
  readonly loading = this.store.loading;
  readonly vm = this.store.vm;

  // NO necesitas:
  // - markForCheck()
  // - detectChanges()
  // - ChangeDetectorRef
}
```

**Por qué**: Si el render se dispara mal, el **diseño** está mal

#### 8. Mantener mutaciones explícitas

```typescript
// ✅ CORRECTO - Métodos claros
export class TableComponent {
  private readonly _selectedRows = signal<string[]>([]);
  readonly selectedRows = this._selectedRows.asReadonly();

  selectRow(id: string): void {
    this._selectedRows.update(rows => [...rows, id]);
  }

  deselectRow(id: string): void {
    this._selectedRows.update(rows => rows.filter(r => r !== id));
  }

  clearSelection(): void {
    this._selectedRows.set([]);
  }
}

// En template
<button (click)="selectRow(row.id)">Select</button>
<button (click)="clearSelection()">Clear</button>
```

**Por qué**:
- ✅ Sin `signal.set()` desde templates
- ✅ Sin mutaciones implícitas
- ✅ API clara y testeable

---

### ❌ QUÉ NO HACER (DON'T)

#### 1. NO usar signals como streams

```typescript
// ❌ INCORRECTO - Signal para eventos
readonly buttonClicks = signal(0);

onClick(): void {
  this.buttonClicks.update(n => n + 1);  // ❌ No es un stream de eventos
}

// ✅ CORRECTO - RxJS para eventos
private clicks$ = new Subject<void>();

onClick(): void {
  this.clicks$.next();
}

constructor() {
  this.clicks$.pipe(
    debounceTime(300),
    scan((count) => count + 1, 0)
  ).subscribe(count => this.clickCount.set(count));
}
```

**Por qué**:
- ❌ Signals NO reemplazan `Subject`
- ❌ Signals NO reemplazan `Observable`
- ❌ Signals NO representan eventos

#### 2. NO usar `effect()` como lógica de negocio

```typescript
// ❌ INCORRECTO - effect con lógica
constructor() {
  effect(() => {
    const users = this.users();
    const validated = users.filter(u => this.validateUser(u));  // ❌ Lógica de negocio
    const sorted = validated.sort((a, b) => a.name.localeCompare(b.name));  // ❌ Transformación
    this.processedUsers.set(sorted);  // ❌ Esto debería ser computed
  });
}

// ✅ CORRECTO - computed para transformación
readonly validUsers = computed(() =>
  this.users().filter(u => this.validateUser(u))
);

readonly sortedUsers = computed(() =>
  [...this.validUsers()].sort((a, b) => a.name.localeCompare(b.name))
);
```

**Por qué**: Si devuelve algo "útil", está mal

#### 3. NO exponer signals mutables

```typescript
// ❌ INCORRECTO - Signal público mutable
@Injectable({ providedIn: 'root' })
export class UsersStore {
  readonly users = signal<User[]>([]);  // ❌ Mutable público
}

// En componente
this.store.users.set([]);  // ❌ Cualquiera puede mutar

// ✅ CORRECTO - Signal privado + readonly
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();  // ✅ Solo lectura

  setUsers(users: User[]): void {
    this._users.set(users);
  }
}
```

**Por qué**:
- ❌ Nunca `public signal`
- ❌ Nunca mutar desde el componente
- ❌ Nunca compartir estado sin control

#### 4. NO meter estado de UI en servicios singleton

```typescript
// ❌ INCORRECTO - Estado UI en singleton
@Injectable({ providedIn: 'root' })  // ❌ Singleton
export class TableService {
  readonly isExpanded = signal(false);  // ❌ Estado UI compartido
  readonly selectedRows = signal<string[]>([]);  // ❌ Selección compartida
  readonly currentPage = signal(1);  // ❌ Paginación compartida
}

// Problema: Si hay 2 tablas en la app, comparten el mismo estado ❌

// ✅ CORRECTO - Estado UI en componente
@Component({})
export class TableComponent {
  readonly isExpanded = signal(false);  // ✅ Estado local
  readonly selectedRows = signal<string[]>([]);  // ✅ Cada tabla su estado
  readonly currentPage = signal(1);  // ✅ Independiente
}
```

**Por qué**: Singleton + UI = **bugs fantasma**

#### 5. NO abusar de `toSignal()` / `toObservable()`

```typescript
// ❌ INCORRECTO - Todo convertido
readonly users$ = this.http.get<User[]>('/api/users');
readonly users = toSignal(this.users$);  // ❌ Anti-pattern

readonly query = signal('');
readonly query$ = toObservable(this.query);  // ❌ Innecesario

// ✅ CORRECTO - Diseño desde el inicio
// Store con Signals
private readonly _users = signal<User[]>([]);
readonly users = this._users.asReadonly();

// Facade con RxJS → Signal
loadUsers(): void {
  this.http.get<User[]>('/api/users')
    .subscribe(users => this._users.set(users));
}
```

**Por qué**:
- Son **puentes**, no cimientos
- Si todo necesita conversión → diseño incorrecto

#### 6. NO mezclar RxJS y signals sin frontera clara

```typescript
// ❌ INCORRECTO - Mezclado sin frontera
this.users$.subscribe(users => {
  this.filteredUsers.set(users.filter(u => u.active));  // ❌ Unclear flow
  this.count.set(users.length);  // ❌ Mutaciones dispersas
  this.loadDetails(users[0].id).subscribe(details => {  // ❌ Nested subscriptions
    this.details.set(details);
  });
});

// ✅ CORRECTO - Frontera clara
// RxJS produce, Signal guarda
loadUsers(): void {
  this.api.getUsers().pipe(
    tap(users => this.store.setUsers(users)),
    switchMap(users => this.api.getDetails(users[0].id)),
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(details => this.store.setDetails(details));
}
```

**Por qué**: Define **quién manda a quién**

#### 7. NO crear `computed()` pesados

```typescript
// ❌ INCORRECTO - computed pesado
readonly processedData = computed(() => {
  const data = this.rawData();
  const filtered = data.filter(d => this.complexFilter(d));  // ❌ Pesado
  const sorted = filtered.sort(this.complexSort);  // ❌ Pesado
  const grouped = this.groupBy(sorted, 'category');  // ❌ Pesado
  const aggregated = this.aggregate(grouped);  // ❌ Pesado
  return aggregated;
});

// ✅ CORRECTO - computed ligero + memoization
readonly filteredData = computed(() =>
  this.rawData().filter(d => this.simpleFilter(d))
);

readonly sortedData = computed(() =>
  [...this.filteredData()].sort((a, b) => a.name.localeCompare(b.name))
);

// Para operaciones pesadas, usar facade + cache
processData(): ProcessedData {
  const cached = this.cache.get(this.rawData());
  if (cached) return cached;

  const result = this.heavyProcessing(this.rawData());
  this.cache.set(this.rawData(), result);
  return result;
}
```

**Por qué**:
- ❌ Sin lógica de negocio compleja
- ❌ Sin loops pesados
- ❌ Sin cálculos caros

#### 8. NO confiar en CD para "arreglar" problemas

```typescript
// ❌ INCORRECTO - Forzar detección
@Component({})
export class ProblematicComponent {
  private cdr = inject(ChangeDetectorRef);

  updateData(): void {
    this.data = newData;
    this.cdr.detectChanges();  // ❌ No es la solución
    this.cdr.markForCheck();   // ❌ Parche, no diseño
  }
}

// ✅ CORRECTO - Diseño reactivo
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CorrectComponent {
  readonly data = signal<Data>(initialData);

  updateData(): void {
    this.data.set(newData);  // ✅ Reactivo automático
  }
}
```

**Por qué**:
- `detectChanges()` ≠ solución
- `markForCheck()` ≠ diseño
- El problema casi siempre es **arquitectónico**

---

## Regla de Oro

> **"Signals no simplifican el diseño.**
> **Solo hacen visibles los malos diseños más rápido."**

### Si algo...

| Síntoma | Causa real |
|---------|------------|
| Se renderiza de más | Scope incorrecto |
| Se actualiza sin razón | Dependencias mal diseñadas |
| Se vuelve impredecible | Mutabilidad sin control |

**No es culpa del CD, es culpa del scope y de la responsabilidad.**

---

## Checklist de Diseño con Signals

Antes de escribir código, responde:

### ✅ Sobre el estado

- [ ] ¿Este valor ES estado síncrono?
- [ ] ¿Qué scope necesita? (componente/feature/app)
- [ ] ¿Quién es el dueño único de este estado?
- [ ] ¿Cómo se muta? (métodos explícitos)

### ✅ Sobre derivaciones

- [ ] ¿Este valor se deriva de otros?
- [ ] ¿La derivación es pura?
- [ ] ¿Es costosa? (considerar memoization)
- [ ] ¿Necesita side effects? (usar effect)

### ✅ Sobre arquitectura

- [ ] ¿El componente solo consume?
- [ ] ¿El store es readonly desde fuera?
- [ ] ¿La frontera RxJS → Signal está clara?
- [ ] ¿OnPush funciona sin tricks?

---

## Antipatrones Comunes

### 1. Signal como evento stream

```typescript
// ❌ ANTI-PATTERN
readonly searchQuery = signal('');

onInput(value: string): void {
  this.searchQuery.set(value);  // ❌ Cada keystroke "es" un valor, no un evento
  this.search();
}

// ✅ PATTERN
private searchQuery$ = new Subject<string>();

onInput(value: string): void {
  this.searchQuery$.next(value);  // ✅ Evento en stream
}

constructor() {
  this.searchQuery$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ).subscribe(results => this.results.set(results));
}
```

### 2. Effect para derivación

```typescript
// ❌ ANTI-PATTERN
readonly total = signal(0);

constructor() {
  effect(() => {
    const items = this.items();
    this.total.set(items.reduce((sum, i) => sum + i.price, 0));  // ❌ Usar computed
  });
}

// ✅ PATTERN
readonly total = computed(() =>
  this.items().reduce((sum, i) => sum + i.price, 0)
);
```

### 3. Estado UI compartido

```typescript
// ❌ ANTI-PATTERN
@Injectable({ providedIn: 'root' })
export class UIStore {
  readonly isExpanded = signal(false);  // ❌ Compartido globalmente
}

// ✅ PATTERN
@Component({})
export class MyComponent {
  readonly isExpanded = signal(false);  // ✅ Local al componente
}
```

### 4. Mutación sin control

```typescript
// ❌ ANTI-PATTERN
export class Store {
  readonly data = signal<Data[]>([]);  // ❌ Público mutable
}

// ✅ PATTERN
export class Store {
  private readonly _data = signal<Data[]>([]);
  readonly data = this._data.asReadonly();

  addItem(item: Data): void {
    this._data.update(items => [...items, item]);
  }
}
```

---

## Ejercicios Prácticos

### Ejercicio 1: Reescribir BehaviorSubject como Signal

```typescript
// ANTES (RxJS)
private usersSubject = new BehaviorSubject<User[]>([]);
readonly users$ = this.usersSubject.asObservable();

setUsers(users: User[]): void {
  this.usersSubject.next(users);
}

// DESPUÉS (Signals)
private readonly _users = signal<User[]>([]);
readonly users = this._users.asReadonly();

setUsers(users: User[]): void {
  this._users.set(users);
}
```

### Ejercicio 2: Detectar cuándo NO conviene Signal

```typescript
// ❌ NO CONVIENE SIGNAL - Es un stream de eventos
readonly clicks$ = fromEvent(button, 'click');

// ❌ NO CONVIENE SIGNAL - Es async con timing
readonly polling$ = interval(5000).pipe(
  switchMap(() => this.api.getData())
);

// ✅ SÍ CONVIENE SIGNAL - Es estado actual
readonly currentData = signal<Data | null>(null);
```

---

## Resumen de Decisiones

| Necesito... | Usar |
|-------------|------|
| Estado UI local | `signal()` en componente |
| Estado compartido | `signal()` en store service |
| Valor derivado | `computed()` |
| Sincronizar con DOM/storage | `effect()` |
| Stream de eventos | RxJS `Subject` |
| HTTP/async | RxJS → `signal()` |
| Tiempo/debounce/retry | RxJS → `signal()` |

### Frase clave

> **Si no sabes si usar Signal o RxJS:**
> **¿Es un valor actual o un flujo de eventos en el tiempo?**
>
> - Valor actual → Signal
> - Flujo en el tiempo → RxJS
