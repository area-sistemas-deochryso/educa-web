# RxJS en Angular Moderno

## Idea central

> **RxJS modela eventos en el tiempo y efectos (IO).**
> **Signals modelan estado actual.**
> **Angular orquesta ambos.**

**Nunca compiten. Cada uno tiene un rol claro.**

---

## Regla de oro

```typescript
Si algo OCURRE  → RxJS
Si algo ES      → Signal
```

| Pregunta | Tecnología |
|----------|-----------|
| ¿Esto ES un valor actual? | Signal |
| ¿Esto OCURRE en el tiempo? | RxJS |
| ¿Tiene duración/cancelación? | RxJS |
| ¿Se deriva síncronamente? | Signal (computed) |
| ¿Requiere IO/red/storage? | RxJS |

---

## HTTP en Angular Moderno

> **RxJS controla cuándo y cómo**
> **Signals guardan el resultado**
> **Template muestra el estado**

### El flujo correcto

```
┌──────────────────────────────────────────────────────────┐
│                      Evento UI                            │
│                 (click, input, init)                      │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                        RxJS                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Tiempo    │  │      IO      │  │  Concurrencia   │ │
│  │ debounce    │  │     HTTP     │  │    switchMap    │ │
│  │ throttle    │  │   WebSocket  │  │    mergeMap     │ │
│  │  timeout    │  │   IndexedDB  │  │    concatMap    │ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐                      │
│  │    Retry    │  │  Cancelación │                      │
│  │   backoff   │  │takeUntilDest.│                      │
│  │    delay    │  │    unsubsc.  │                      │
│  └─────────────┘  └──────────────┘                      │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                       Signal                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │Estado actual│  │   Loading    │  │     Error       │ │
│  │    data     │  │   boolean    │  │  error | null   │ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                      Template                             │
│              {{ data() }}                                 │
│              @if (loading()) { <spinner> }                │
│              @if (error()) { <error> }                    │
└──────────────────────────────────────────────────────────┘
```

### Principios fundamentales

| Capa | Responsabilidad | Qué hace |
|------|----------------|----------|
| **RxJS** | Modela eventos, tiempo y efectos | Decide **cuándo**, **cómo** y **si** ocurre algo |
| **Signals** | Guardan estado actual | Alimentan templates, derivan valores |
| **Template** | Muestra estado | Consume signals, reactivo automático |

### Ejemplo completo: Búsqueda con HTTP

```typescript
// 1. Store (Signals)
@Injectable({ providedIn: 'root' })
export class SearchStore {
  // Estado privado
  private readonly _results = signal<SearchResult[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Estado público readonly
  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ViewModel derivado
  readonly vm = computed(() => ({
    results: this.results(),
    loading: this.loading(),
    error: this.error(),
    isEmpty: this.results().length === 0 && !this.loading(),
    hasError: this.error() !== null,
  }));

  // Comandos (mutación controlada)
  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setResults(results: SearchResult[]): void {
    this._results.set(results);
    this._loading.set(false);
    this._error.set(null);
  }

  setError(error: string): void {
    this._error.set(error);
    this._loading.set(false);
  }

  clear(): void {
    this._results.set([]);
    this._error.set(null);
  }
}

// 2. Facade (RxJS + Signals)
@Injectable({ providedIn: 'root' })
export class SearchFacade {
  private api = inject(SearchApiService);
  private store = inject(SearchStore);
  private destroyRef = inject(DestroyRef);

  // Expone ViewModel
  readonly vm = this.store.vm;

  // RxJS controla cuándo y cómo
  search(query: string): void {
    // Validación temprana
    if (!query.trim()) {
      this.store.clear();
      return;
    }

    // Signal: actualizar loading
    this.store.setLoading(true);

    // RxJS: tiempo, IO, cancelación, retry
    of(query).pipe(
      debounceTime(300),           // Tiempo: esperar 300ms de silencio
      distinctUntilChanged(),      // Evitar búsquedas duplicadas
      tap(() => this.store.setLoading(true)),
      switchMap(q =>               // Cancelación: solo la última búsqueda
        this.api.search(q).pipe(
          timeout(5000),           // Tiempo: máximo 5 segundos
          retry({                  // Retry con backoff
            count: 2,
            delay: (error, retryCount) => {
              logger.warn(`Retry ${retryCount} for query: ${q}`);
              return timer(retryCount * 1000); // 1s, 2s
            }
          }),
          catchError(error => {    // Error es dato
            const message = this.getErrorMessage(error);
            this.store.setError(message); // Signal: actualizar error
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef) // Cancelación: cleanup automático
    ).subscribe({
      next: (results) => {
        // Signal: guardar resultado
        this.store.setResults(results);
      }
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Sin conexión a internet';
      if (error.status === 429) return 'Demasiadas búsquedas, espera un momento';
      return 'Error al buscar, intenta de nuevo';
    }
    return 'Error inesperado';
  }
}

// 3. Component (consume Signals)
@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      type="text"
      (input)="onSearch($any($event.target).value)"
      placeholder="Buscar..." />

    @if (vm().loading) {
      <app-spinner />
    }

    @if (vm().hasError) {
      <app-error [message]="vm().error" />
    }

    @if (vm().isEmpty && !vm().loading) {
      <p>No hay resultados</p>
    }

    @for (result of vm().results; track result.id) {
      <app-search-result [result]="result" />
    }
  `
})
export class SearchComponent {
  private facade = inject(SearchFacade);

  // Template consume ViewModel (Signal)
  readonly vm = this.facade.vm;

  // Evento UI → Facade (RxJS hace el trabajo)
  onSearch(query: string): void {
    this.facade.search(query);
  }
}
```

### switchMap cancela automáticamente

```typescript
// Usuario escribe: "angular"
// a      → HTTP request #1 (inicia)
// an     → HTTP request #2 (inicia, #1 se cancela ✂️)
// ang    → HTTP request #3 (inicia, #2 se cancela ✂️)
// angu   → HTTP request #4 (inicia, #3 se cancela ✂️)
// angul  → HTTP request #5 (inicia, #4 se cancela ✂️)
// angula → HTTP request #6 (inicia, #5 se cancela ✂️)
// angular → HTTP request #7 (completa ✅)

// Solo la última request completa, todas las anteriores se cancelan
searchInput$.pipe(
  switchMap(query => this.api.search(query)) // ✅ Cancelación automática
).subscribe(results => this.store.setResults(results));
```

### retry con delay (backoff exponencial)

```typescript
// ✅ CORRECTO - Retry con backoff
this.http.get<User[]>('/api/users').pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      // Retry 1: espera 1s
      // Retry 2: espera 2s
      // Retry 3: espera 4s
      const delayMs = Math.pow(2, retryCount - 1) * 1000;
      logger.warn(`Retry ${retryCount}/${3} in ${delayMs}ms`);
      return timer(delayMs);
    }
  }),
  catchError(error => {
    this.store.setError('Error después de 3 intentos');
    return EMPTY;
  })
).subscribe(users => this.store.setUsers(users));

// ❌ INCORRECTO - Retry sin delay (martillar el servidor)
this.http.get('/api/users').pipe(
  retry(3) // ❌ Sin delay
).subscribe();
```

### Error es dato

```typescript
// ❌ INCORRECTO - Error rompe flujo
this.http.get<User[]>('/api/users').subscribe({
  next: (users) => this.store.setUsers(users),
  error: (err) => {
    console.error(err); // ❌ Solo log, no actualiza UI
  }
});

// ✅ CORRECTO - Error es parte del estado
this.http.get<User[]>('/api/users').pipe(
  catchError(error => {
    // Error → Signal
    this.store.setError(this.getErrorMessage(error));
    return EMPTY; // O return of([]) para array vacío
  })
).subscribe({
  next: (users) => {
    // Success → Signal
    this.store.setUsers(users);
    this.store.setError(null);
  }
});
```

### Resumen de decisiones HTTP

| Situación | RxJS | Signal |
|-----------|------|--------|
| **Búsqueda** | `debounceTime` + `switchMap` | `results`, `loading` |
| **Load inicial** | `retry` + `catchError` | `data`, `loading`, `error` |
| **Polling** | `interval` + `switchMap` | `latestData`, `lastUpdate` |
| **Upload archivo** | `exhaustMap` (evitar duplicados) | `progress`, `status` |
| **Multiple requests** | `forkJoin` o `combineLatest` | `allData`, `loading` |
| **Infinite scroll** | `mergeMap` (acumular) | `items`, `hasMore` |

---

## Qué SÍ usar RxJS para

### RxJS vive en los bordes del sistema

```typescript
// ✅ CORRECTO - RxJS para IO y eventos en el tiempo
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  loadUsers(): void {
    // HTTP
    this.api.getUsers().pipe(
      // Tiempo
      debounceTime(300),
      // Cancelación
      switchMap(criteria => this.api.search(criteria)),
      // Retry con backoff
      retry({
        count: 3,
        delay: (error, retryCount) => timer(retryCount * 1000),
      }),
      // Cleanup
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (users) => this.store.setUsers(users), // → Signal
      error: (err) => this.store.setError(err),
    });
  }
}
```

### Casos de uso válidos para RxJS

| Caso | Ejemplo |
|------|---------|
| **HTTP** | `this.http.get()`, `this.http.post()` |
| **Eventos de usuario** | `fromEvent(input, 'input')` |
| **Timers** | `interval()`, `timer()`, `debounceTime()` |
| **Concurrencia** | `forkJoin()`, `combineLatest()`, `merge()` |
| **Cancelación** | `switchMap()`, `takeUntil()` |
| **Retry/backoff** | `retry()`, `retryWhen()` |
| **WebSocket/SSE** | `webSocket()`, event streams |
| **Offline/SW** | Cache updates, background sync |
| **APIs externas** | Wrappers de librerías no-Angular |

---

## Qué NO usar RxJS para

### ❌ Red flags comunes

```typescript
// ❌ INCORRECTO - BehaviorSubject como estado
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private usersSubject = new BehaviorSubject<User[]>([]);
  readonly users$ = this.usersSubject.asObservable();

  setUsers(users: User[]): void {
    this.usersSubject.next(users);
  }
}

// ✅ CORRECTO - Signal para estado
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();

  setUsers(users: User[]): void {
    this._users.set(users);
  }
}
```

```typescript
// ❌ INCORRECTO - subscribe() libre en componente
@Component({})
export class UsersComponent {
  users: User[] = [];

  ngOnInit(): void {
    // ❌ Red flag: subscribe directo sin takeUntilDestroyed
    this.api.getUsers().subscribe(users => {
      this.users = users;
    });
  }
}

// ✅ CORRECTO - Facade + Signal
@Component({})
export class UsersComponent {
  private facade = inject(UsersFacade);
  readonly users = this.facade.users; // Signal

  ngOnInit(): void {
    this.facade.loadUsers();
  }
}
```

### Qué NO hacer con RxJS

- ❌ **Estado UI**: Usar signals, no BehaviorSubject
- ❌ **Store global**: NgRx Signals, no BehaviorSubject
- ❌ **"Guardar datos"**: Store con signals
- ❌ **Reemplazar Signals**: Son complementarios
- ❌ **subscribe() sin takeUntilDestroyed**: Memory leak

---

## Modelo mental correcto

```
Evento ──RxJS──▶ Resultado ──Signal──▶ Template
```

**RxJS produce, Signal conserva.**

```typescript
// Pipeline completo
@Injectable({ providedIn: 'root' })
export class SearchFacade {
  private api = inject(SearchApiService);
  private store = inject(SearchStore);

  search(query: string): void {
    // 1. Evento (RxJS)
    of(query).pipe(
      debounceTime(300),           // Tiempo
      distinctUntilChanged(),      // Evitar duplicados
      switchMap(q => this.api.search(q)), // IO + Cancelación
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      // 2. Resultado → Signal
      next: (results) => this.store.setResults(results),
      error: (err) => this.store.setError(err),
    });
  }
}

// 3. Template consume Signal
@Component({
  template: `{{ results() }}` // Signal, no Observable
})
export class SearchComponent {
  private facade = inject(SearchFacade);
  readonly results = this.facade.results;
}
```

---

## Concurrencia (la decisión más importante)

> **"Si eliges mal, el bug será intermitente."**

### Tabla de decisión

| Intención | Operador | Cuándo usar |
|-----------|----------|-------------|
| Solo importa el **último** | `switchMap` | Búsqueda, autocompletado |
| **Todos** importan | `mergeMap` | Guardar logs, analytics |
| En **orden** estricto | `concatMap` | Importar archivos secuenciales |
| Ignorar mientras uno **corre** | `exhaustMap` | Login, submit (evitar doble click) |

### Ejemplos mentales

#### 1. Buscador → switchMap

```typescript
// ✅ CORRECTO - Solo importa la última búsqueda
searchInput$.pipe(
  debounceTime(300),
  switchMap(query => this.api.search(query)), // Cancela búsquedas anteriores
).subscribe(results => this.store.setResults(results));
```

**Por qué**: Si el usuario escribe "angular", no queremos resultados de "ang", "angu", "angul".

#### 2. Guardar logs → mergeMap

```typescript
// ✅ CORRECTO - Todos los logs importan
logEvent$.pipe(
  mergeMap(event => this.api.saveLog(event)), // Todos se ejecutan en paralelo
).subscribe();
```

**Por qué**: No queremos perder ningún log, todos deben guardarse.

#### 3. Importar archivos → concatMap

```typescript
// ✅ CORRECTO - Procesar archivos en orden
files$.pipe(
  concatMap(file => this.api.uploadFile(file)), // Uno después del otro
).subscribe();
```

**Por qué**: Los archivos deben procesarse en orden (ej: dependencias).

#### 4. Login → exhaustMap

```typescript
// ✅ CORRECTO - Ignorar clicks mientras se procesa
loginClick$.pipe(
  exhaustMap(() => this.api.login(credentials)), // Ignora clicks adicionales
).subscribe();
```

**Por qué**: Evitar múltiples intentos de login simultáneos.

### Antipatrón: Operador incorrecto

```typescript
// ❌ INCORRECTO - mergeMap en búsqueda
searchInput$.pipe(
  mergeMap(query => this.api.search(query)), // ❌ No cancela
).subscribe(results => {
  // Bug: Resultados de búsquedas viejas pueden llegar después
  // y sobrescribir los nuevos
  this.store.setResults(results);
});

// ✅ CORRECTO
searchInput$.pipe(
  switchMap(query => this.api.search(query)), // ✅ Cancela anteriores
).subscribe(results => this.store.setResults(results));
```

---

## Cancelación

### ✅ unsubscribe SÍ cancela HTTP

```typescript
const sub = this.http.get('/api/users').subscribe();
sub.unsubscribe(); // ✅ Cancela la petición HTTP
```

### ✅ switchMap cancela automáticamente

```typescript
searchInput$.pipe(
  switchMap(query => this.api.search(query))
).subscribe();

// Si llega un nuevo query, la petición anterior se cancela automáticamente
```

### ⚠️ Si tienes que "ignorar respuestas viejas", el diseño está mal

```typescript
// ❌ INCORRECTO - Tracking manual de request ID
let currentRequestId = 0;

searchInput$.pipe(
  mergeMap(query => {
    const requestId = ++currentRequestId;
    return this.api.search(query).pipe(
      map(results => ({ results, requestId }))
    );
  })
).subscribe(({ results, requestId }) => {
  if (requestId === currentRequestId) { // ❌ Lógica de cancelación manual
    this.store.setResults(results);
  }
});

// ✅ CORRECTO - switchMap maneja la cancelación
searchInput$.pipe(
  switchMap(query => this.api.search(query))
).subscribe(results => this.store.setResults(results));
```

---

## Tiempo (no solo delay)

### RxJS controla

- **Cuándo** ocurre algo
- **Qué pasa** si ocurre otra vez
- **Qué pasa** si ocurre demasiado rápido

### Operadores de tiempo

| Operador | Uso | Ejemplo |
|----------|-----|---------|
| `debounceTime(ms)` | Esperar silencio | Input de búsqueda |
| `throttleTime(ms)` | Máximo 1 por intervalo | Scroll infinito |
| `auditTime(ms)` | Último del intervalo | Actualizar UI |
| `delay(ms)` | Retrasar emisión | Animaciones |
| `timeout(ms)` | Cancelar si tarda mucho | API lenta |

### Ejemplos

#### Input → debounceTime

```typescript
// ✅ CORRECTO - Esperar a que el usuario deje de escribir
searchInput$.pipe(
  debounceTime(300), // 300ms de silencio
  switchMap(query => this.api.search(query))
).subscribe();
```

**Comportamiento**:
```
Teclas:  a─n─g─u─l─a─r────────────
         ↓ ↓ ↓ ↓ ↓ ↓ ↓
         ────────────────300ms─→ Búsqueda "angular"
```

#### Scroll → auditTime

```typescript
// ✅ CORRECTO - Actualizar posición máximo cada 100ms
fromEvent(window, 'scroll').pipe(
  auditTime(100),
  map(() => window.scrollY)
).subscribe(scrollY => this.store.setScrollPosition(scrollY));
```

#### Click agresivo → throttleTime

```typescript
// ✅ CORRECTO - Máximo 1 click por segundo
saveButton$.pipe(
  throttleTime(1000),
  switchMap(() => this.api.save())
).subscribe();
```

#### Backend lento → timeout + retry

```typescript
// ✅ CORRECTO - Timeout y retry con backoff
this.api.getUsers().pipe(
  timeout(5000), // 5 segundos máximo
  retry({
    count: 3,
    delay: (error, retryCount) => {
      logger.warn(`Retry ${retryCount} after timeout`);
      return timer(retryCount * 1000); // 1s, 2s, 3s
    }
  })
).subscribe();
```

---

## Errores

### Principios

1. **Error esperado ≠ crash**: Los errores son parte del flujo
2. **Error es parte del flujo**: Modelar con RxJS
3. **Retry sin backoff = mala práctica**: Siempre usar exponential backoff
4. **RxJS describe el error, la UI decide qué mostrar**

### Manejo de errores

```typescript
// ✅ CORRECTO - Manejo completo de errores
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  loadUsers(): void {
    this.store.setLoading(true);

    this.api.getUsers().pipe(
      // Retry con backoff exponencial
      retry({
        count: 3,
        delay: (error, retryCount) => {
          if (error.status === 401) {
            return throwError(() => error); // No retry en 401
          }
          const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
          logger.warn(`Retry ${retryCount} in ${delayMs}ms`);
          return timer(delayMs);
        }
      }),
      // Catch error y transformar
      catchError((error) => {
        logger.error('Error loading users:', error);
        this.store.setError(this.getErrorMessage(error));
        this.store.setLoading(false);
        return EMPTY; // Completa el Observable
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users) => {
        this.store.setUsers(users);
        this.store.setLoading(false);
        this.store.setError(null);
      }
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Sin conexión a internet';
      if (error.status === 404) return 'Recurso no encontrado';
      if (error.status === 500) return 'Error del servidor';
      return error.error?.message || 'Error desconocido';
    }
    return 'Error inesperado';
  }
}
```

### Antipatrón: Crash sin manejo

```typescript
// ❌ INCORRECTO - Error no manejado
this.api.getUsers().subscribe({
  next: (users) => this.store.setUsers(users),
  // ❌ No hay error handler
});

// ✅ CORRECTO - Siempre manejar errores
this.api.getUsers().pipe(
  catchError(error => {
    this.store.setError(error);
    return EMPTY;
  })
).subscribe({
  next: (users) => this.store.setUsers(users)
});
```

---

## Frontera RxJS ↔ Signals (sagrada)

### Principios

1. **RxJS termina antes del template**
2. **Signals entran antes del template**
3. **No mezclar Signals dentro de pipes**
4. **No usar Observables como estado**

### ✅ CORRECTO - Puente limpio

```typescript
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  // Signals (estado)
  readonly users = this.store.users;
  readonly loading = this.store.loading;

  // RxJS (efectos)
  loadUsers(): void {
    this.store.setLoading(true);

    this.api.getUsers().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users) => {
        // Puente: RxJS → Signal
        this.store.setUsers(users);
        this.store.setLoading(false);
      }
    });
  }
}

// Template consume Signals
@Component({
  template: `
    {{ users() }}
    {{ loading() }}
  `
})
export class UsersComponent {
  private facade = inject(UsersFacade);
  readonly users = this.facade.users;
  readonly loading = this.facade.loading;
}
```

### ❌ INCORRECTO - Mezclar en pipes

```typescript
// ❌ INCORRECTO - Signal dentro de pipe
searchInput$.pipe(
  switchMap(query => {
    const currentUser = this.userSignal(); // ❌ Signal en pipe
    return this.api.search(query, currentUser.id);
  })
).subscribe();

// ✅ CORRECTO - Capturar valor antes
const userId = this.userSignal().id;
searchInput$.pipe(
  switchMap(query => this.api.search(query, userId))
).subscribe();

// ✅ O MEJOR - Usar toObservable + combineLatest
const userId$ = toObservable(this.userSignal).pipe(map(u => u.id));
searchInput$.pipe(
  combineLatestWith(userId$),
  switchMap(([query, userId]) => this.api.search(query, userId))
).subscribe();
```

### ❌ INCORRECTO - async pipe con estado

```typescript
// ❌ INCORRECTO - Observable en template
@Component({
  template: `
    @for (user of users$ | async; track user.id) {
      {{ user.name }}
    }
  `
})
export class UsersComponent {
  users$ = this.api.getUsers(); // ❌ Observable como estado
}

// ✅ CORRECTO - Signal en template
@Component({
  template: `
    @for (user of users(); track user.id) {
      {{ user.name }}
    }
  `
})
export class UsersComponent {
  private facade = inject(UsersFacade);
  readonly users = this.facade.users; // ✅ Signal

  ngOnInit(): void {
    this.facade.loadUsers();
  }
}
```

---

## Arquitectura estable

```
┌─────────────────────────────────────┐
│              UI Event                │
│        (click, input, etc.)          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│            Component                 │
│    (delega a Facade, consume         │
│           Signals)                   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│             Facade                   │
│  ┌───────────────┬────────────────┐ │
│  │               │                │ │
│  ▼               ▼                │ │
│ RxJS          Signals              │ │
│ (tiempo,      (estado)             │ │
│  IO,                               │ │
│  efectos)                          │ │
│  │               │                │ │
│  └───────────────┘                │ │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│            Template                  │
│      {{ signal() }}                  │
└─────────────────────────────────────┘
```

### Ejemplo completo

```typescript
// 1. UI Event
@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button (click)="loadUsers()">Cargar</button>

    @if (loading()) {
      <app-spinner />
    } @else {
      @for (user of users(); track user.id) {
        <app-user-card [user]="user" />
      }
    }
  `
})
export class UsersComponent {
  private facade = inject(UsersFacade);

  // Signals (consumidos por template)
  readonly users = this.facade.users;
  readonly loading = this.facade.loading;

  // Comando
  loadUsers(): void {
    this.facade.loadUsers();
  }
}

// 2. Facade (orquesta RxJS + Signals)
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  // Expone Signals
  readonly users = this.store.users;
  readonly loading = this.store.loading;

  // RxJS para efectos
  loadUsers(): void {
    this.store.setLoading(true);

    this.api.getUsers().pipe(
      retry({ count: 3, delay: 1000 }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users) => {
        // RxJS → Signal
        this.store.setUsers(users);
        this.store.setLoading(false);
      },
      error: (err) => {
        this.store.setError(err);
        this.store.setLoading(false);
      }
    });
  }
}

// 3. Store (solo Signals)
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  setUsers(users: User[]): void {
    this._users.set(users);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }
}
```

---

## Checklist rápido

Una arquitectura correcta cumple:

- [ ] **RxJS no guarda estado**: Usa Signals para estado
- [ ] **Signals dominan UI**: Templates consumen Signals, no Observables
- [ ] **No hay subscribe() arbitrarios**: Siempre con `takeUntilDestroyed`
- [ ] **Cancelación ocurre sola**: Uso correcto de `switchMap`, `exhaustMap`
- [ ] **Cada operador tiene intención clara**: `switchMap`, `mergeMap`, `concatMap`, `exhaustMap`
- [ ] **Manejo de errores explícito**: `catchError`, `retry` con backoff
- [ ] **Tiempo controlado**: `debounceTime`, `throttleTime`, `timeout`
- [ ] **Puente RxJS → Signal limpio**: subscribe actualiza Signal, template consume Signal

---

## Lección clave

> **"RxJS no se aprende memorizando operadores, sino decidiendo qué debe pasar cuando el tiempo entra en conflicto consigo mismo."**

### Preguntas que debes hacerte

1. **¿Qué pasa si llega un evento mientras proceso el anterior?**
   - Cancelar anterior → `switchMap`
   - Procesar ambos → `mergeMap`
   - En orden → `concatMap`
   - Ignorar nuevo → `exhaustMap`

2. **¿Qué pasa si el usuario actúa muy rápido?**
   - Esperar silencio → `debounceTime`
   - Máximo 1 por intervalo → `throttleTime`
   - Último del intervalo → `auditTime`

3. **¿Qué pasa si el servidor es lento?**
   - Timeout → `timeout`
   - Retry → `retry` con backoff
   - Mostrar loading → Signal de loading

4. **¿Qué pasa si hay un error?**
   - Retry → `retry`
   - Transformar → `catchError`
   - Notificar UI → Signal de error

### Mantra final

```
RxJS describe el CÓMO y el CUÁNDO.
Signals describen el QUÉ y el AHORA.
```

---

## El Criterio Definitivo: ¿RxJS o no?

> **"RxJS solo entra cuando el tiempo complica la lógica."**

### Secuencia mental antes de escribir código

```
¿Ocurre en el tiempo?
 └─ no → Signal
 └─ sí →
     ¿Tiene IO, latencia o concurrencia?
       └─ no → probablemente Signal
       └─ sí → RxJS
```

### Ejemplos de decisión

| Situación | ¿Tiempo? | ¿IO/Latencia? | Decisión |
|-----------|----------|---------------|----------|
| Contador de clicks | No | No | Signal |
| Usuario actual | No | No | Signal |
| Formulario activo | No | No | Signal |
| Búsqueda con debounce | Sí | Sí | RxJS |
| HTTP request | Sí | Sí | RxJS |
| Polling cada 30s | Sí | Sí | RxJS |
| Array filtrado | No | No | Signal (computed) |
| WebSocket messages | Sí | Sí | RxJS |

---

## Dónde vive RxJS (frontera final)

### ✅ RxJS SOLO puede vivir aquí

1. **Facades** - Application services que orquestan
2. **Services de aplicación** - Coordinan casos de uso
3. **Adapters** - HTTP, WebSocket, IndexedDB, Service Worker

```typescript
// ✅ CORRECTO - RxJS en Facade
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  search(query: string): void {
    of(query).pipe(
      debounceTime(300),
      switchMap(q => this.api.search(q))
    ).subscribe(results => this.store.setResults(results));
  }
}
```

### ❌ RxJS NUNCA puede vivir aquí

1. **Templates** - Solo Signals
2. **computed()** - Solo operaciones síncronas
3. **effects()** - RxJS no debe entrar
4. **Modelos de dominio** - Solo interfaces y clases puras
5. **Componentes presentacionales** - Solo Inputs/Outputs

```typescript
// ❌ INCORRECTO - RxJS en computed
readonly filtered = computed(() => {
  return this.items$.pipe(  // ❌ Observable en computed
    map(items => items.filter(...))
  );
});

// ✅ CORRECTO - Signal en computed
readonly filtered = computed(() =>
  this.items().filter(...)  // ✅ Signal en computed
);
```

### ⚠️ Si RxJS cruza esta frontera, la app se vuelve frágil

**Por qué**:
- Los templates no pueden cancelar Observables
- Los computed no pueden manejar asincronía
- Los components pierden predictibilidad
- El debugging se vuelve imposible

---

## El Patrón Definitivo de Facade (cerrado)

```typescript
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);
  private destroyRef = inject(DestroyRef);

  // ┌─────────────────────────────────┐
  // │  1. Triggers (eventos internos) │
  // └─────────────────────────────────┘
  private searchTrigger$ = new Subject<string>();
  private refreshTrigger$ = new Subject<void>();

  // ┌─────────────────────────────────┐
  // │  2. Effects (RxJS puro)         │
  // └─────────────────────────────────┘
  constructor() {
    // Effect: Búsqueda
    this.searchTrigger$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.store.setLoading(true)),
      switchMap(query =>
        this.api.search(query).pipe(
          catchError(error => {
            this.store.setError(error);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => this.store.setResults(results));

    // Effect: Refresh
    this.refreshTrigger$.pipe(
      switchMap(() => this.api.getAll()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(users => this.store.setUsers(users));
  }

  // ┌─────────────────────────────────┐
  // │  3. Signals (estado expuesto)   │
  // └─────────────────────────────────┘
  readonly users = this.store.users;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  // ViewModel derivado
  readonly vm = computed(() => ({
    users: this.users(),
    loading: this.loading(),
    error: this.error(),
    isEmpty: this.users().length === 0,
  }));

  // ┌─────────────────────────────────┐
  // │  4. Commands (API pública)      │
  // └─────────────────────────────────┘
  search(query: string): void {
    this.searchTrigger$.next(query);
  }

  refresh(): void {
    this.refreshTrigger$.next();
  }

  clearError(): void {
    this.store.clearError();
  }
}
```

### Reglas duras del patrón

| Regla | Por qué |
|-------|---------|
| ✅ El componente no sabe de RxJS | Simplicidad, testeo |
| ✅ El facade no expone Observables | Frontera clara |
| ✅ El facade sí expone Signals y métodos | API predecible |
| ✅ Triggers son privados | Encapsulación |
| ✅ Effects se suscriben en constructor | Ciclo de vida claro |

### Esto hace a la app

- ✅ **Estable** - Cambios centralizados
- ✅ **Testeable** - Mocks simples
- ✅ **Refactorizable** - Cambiar RxJS sin tocar UI

---

## Orquestación de Múltiples Efectos

### Regla: Un efecto = una intención

```typescript
// ❌ INCORRECTO - Mega-pipe confuso
this.trigger$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  tap(() => this.store.setLoading(true)),
  switchMap(query => this.api.search(query)),
  retry(3),
  catchError(err => {
    this.store.setError(err);
    return EMPTY;
  }),
  tap(results => this.store.setResults(results)),
  switchMap(results => this.api.getDetails(results[0].id)),
  tap(details => this.store.setDetails(details)),
  // ... más operadores
).subscribe();

// ✅ CORRECTO - Efectos separados con intención clara
// Effect 1: Búsqueda
this.searchTrigger$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => this.searchUsers(query))
).subscribe();

// Effect 2: Cargar detalles cuando hay selección
this.store.selectedUser$.pipe(
  filter(user => user !== null),
  switchMap(user => this.loadDetails(user.id))
).subscribe();

// Effect 3: Refrescar cada 5 minutos
interval(5 * 60 * 1000).pipe(
  switchMap(() => this.refresh())
).subscribe();
```

### Criterio de separación

**Si necesitas comentarios para entender el pipe → sepáralo.**

```typescript
// ❌ RED FLAG - Necesitas comentarios
this.data$.pipe(
  // Primero debounce para evitar spam
  debounceTime(300),
  // Luego validar
  filter(x => x.length > 3),
  // Ahora buscar
  switchMap(x => this.api.search(x)),
  // Si falla, reintentar
  retry(3),
  // Si sigue fallando, mostrar error
  catchError(err => { /* ... */ })
).subscribe();

// ✅ CORRECTO - Intención clara sin comentarios
private searchWithValidation(query: string): Observable<Result[]> {
  return of(query).pipe(
    debounceTime(300),
    filter(q => q.length > 3),
    switchMap(q => this.api.search(q)),
    retry(3),
    catchError(err => this.handleSearchError(err))
  );
}
```

---

## Performance Real (sin mitos)

### Lo que NO importa tanto

- ❌ "Muchos Observables" - No es problema
- ❌ "Muchos operadores" - No afecta si están bien usados
- ❌ "RxJS es pesado" - Solo si lo usas mal

### Lo que SÍ importa

| Factor | Impacto | Solución |
|--------|---------|----------|
| **Cancelación incorrecta** | Alto | `switchMap`, `takeUntilDestroyed` |
| **Trabajo innecesario** | Alto | `distinctUntilChanged`, `debounceTime` |
| **Requests duplicadas** | Alto | `shareReplay`, cache layer |
| **Recalcular estado** | Medio | `computed` en lugar de pipes |
| **Memory leaks** | Alto | `takeUntilDestroyed` SIEMPRE |

### Ejemplos de optimización

```typescript
// ❌ INCORRECTO - Re-ejecuta HTTP en cada suscripción
readonly users$ = this.http.get<User[]>('/api/users');

// Componente A se suscribe → HTTP request
// Componente B se suscribe → HTTP request (duplicado ❌)

// ✅ CORRECTO - Comparte resultado
readonly users$ = this.http.get<User[]>('/api/users').pipe(
  shareReplay(1) // ✅ Solo 1 request, compartido
);
```

```typescript
// ❌ INCORRECTO - No cancela búsquedas anteriores
searchInput$.pipe(
  mergeMap(query => this.api.search(query))
).subscribe();
// Usuario escribe "angular" → 7 requests en paralelo ❌

// ✅ CORRECTO - Cancela búsquedas anteriores
searchInput$.pipe(
  switchMap(query => this.api.search(query))
).subscribe();
// Usuario escribe "angular" → 1 request (los otros 6 cancelados) ✅
```

### 📌 RxJS bien usado reduce trabajo, no lo aumenta

---

## Versionado y Estabilidad Futura

### Por qué este enfoque es estable

| Fundamento | Estado |
|------------|--------|
| **Signals** | Estado oficial de Angular 19+ |
| **RxJS** | Capa de tiempo estándar del ecosistema |
| **HttpClient** | Basado en Observables, no va a cambiar |
| **No depende de librerías externas** | Solo Angular + RxJS |

### Angular puede cambiar APIs, pero este modelo mental NO cambia

```typescript
// Si Angular cambia la API de Signals...
// Antes
readonly users = signal<User[]>([]);

// Después (hipotético)
readonly users = newSignalApi<User[]>([]);

// El modelo mental sigue igual:
// - Signal para estado
// - RxJS para tiempo/IO
// - Facade orquesta
```

### Migración futura

Si aparece una tecnología nueva que reemplace RxJS:

✅ **Fácil migrar** - Solo cambiar Facades
✅ **UI no se toca** - Sigue consumiendo Signals
✅ **Tests no cambian** - Mismos contratos

---

## Checklist: ¿Cerraste RxJS?

Puedes decir que dominaste RxJS si cumples:

### ✅ Decisiones

- [ ] **Sabes decidir RxJS vs Signal sin dudar** - Criterio claro
- [ ] **No usas RxJS como store** - BehaviorSubject eliminado
- [ ] **Cancelación ocurre sola** - `switchMap`, `takeUntilDestroyed`

### ✅ Arquitectura

- [ ] **No tienes race conditions** - Concurrencia controlada
- [ ] **Puedes testear flujos sin Angular** - Lógica pura
- [ ] **Tus componentes son "tontos"** - Solo consumen Signals

### ✅ Comunicación

- [ ] **Tu arquitectura es explicable en una pizarra** - Modelo mental claro
- [ ] **Otros devs entienden tu código** - Sin magia

### Si una falla → vuelve a esa parte

No sigas avanzando si no dominas lo básico.

---

## Anti-Regla Final (la más peligrosa)

### ❌ "Esto funciona, así que está bien"

En Angular moderno:

| | |
|---|---|
| ✅ **Lo correcto funciona mejor** | Predecible, testeable, mantenible |
| ❌ **Lo incorrecto falla tarde** | En producción, bajo carga |

### RxJS mal usado no falla rápido - falla en producción

```typescript
// ❌ "Funciona" en desarrollo
this.data$ = this.http.get('/api/data');

// Problemas que aparecen en producción:
// - Memory leaks después de 2 horas de uso
// - Race conditions con usuarios rápidos
// - Requests duplicadas bajo carga
// - Cancelación incorrecta causando bugs raros
```

### Ejemplos de "funciona pero está mal"

| Código | ¿Funciona? | Problema real |
|--------|------------|---------------|
| `subscribe()` sin `takeUntilDestroyed` | Sí | Memory leak en rutas |
| `mergeMap` en búsqueda | Sí | Resultados fuera de orden |
| `BehaviorSubject` como estado | Sí | Mutabilidad no controlada |
| `async` pipe con estado | Sí | Re-ejecuta HTTP sin control |

---

## Frase de Cierre

> **RxJS gobierna el tiempo.**
> **Signals gobiernan el estado.**
> **Angular gobierna la orquestación.**

**Cuando ese triángulo está claro, la app se vuelve predecible.**

### El triángulo de estabilidad

```
         Angular
        /      \
       /        \
      /          \
   RxJS -------- Signals
  (tiempo)      (estado)
```

- **RxJS** decide **cuándo** y **cómo** ocurren las cosas
- **Signals** representan **qué** ES actualmente
- **Angular** orquesta la **coordinación** entre ambos

### Última regla

Si no puedes explicar tu arquitectura en 3 minutos con este triángulo, algo está mal.

**Simplifica hasta que puedas.**
