# Estado y Signals

## Principio

> **"Arquitectura = decidir quién puede cambiar qué, y cuándo."**

## Clasificación de Estado

| Tipo | Vive en | Ejemplo |
|------|---------|---------|
| **UI Local** | Componente (`signal()`) | `isExpanded`, hover, focus |
| **Ephemeral** | Provider en componente (`@Injectable()` sin `providedIn`) | Wizard multi-step |
| **Feature** | Store (`providedIn: 'root'`) | Lista, filtros, paginación |
| **App** | Core stores / NgRx Signals | Auth, permisos, conectividad |

**Regla: 1 concepto = 1 dueño.** El componente consume readonly, nunca duplica el estado.

## Signal vs RxJS — Cuándo usar cada uno

| Pregunta | Tecnología |
|----------|-----------|
| ¿Es un valor actual? | Signal (`signal()`, `computed()`) |
| ¿Ocurre en el tiempo? (debounce, retry, cancel) | RxJS |
| ¿Requiere IO/red/storage? | RxJS en facade → signal en store |
| ¿Se deriva síncronamente? | `computed()` |

## Reglas de Signals

```typescript
// ✅ CORRECTO — privado + asReadonly + mutación via métodos
private readonly _users = signal<User[]>([]);
readonly users = this._users.asReadonly();
readonly activeUsers = computed(() => this.users().filter(u => u.active));
setUsers(users: User[]): void { this._users.set(users); }

// ❌ INCORRECTO — signal público mutable
readonly users = signal<User[]>([]); // Cualquiera puede .set()
```

**DO**: Signals para estado síncrono, `computed()` para derivados puros, `effect()` solo para sincronizar con DOM/storage/analytics.

**DON'T**: Signals como streams de eventos (usar `Subject`), `effect()` para derivar datos (usar `computed()`), exponer signals mutables, `BehaviorSubject` como estado (usar signal), `detectChanges()`/`markForCheck()`.

## Frontera RxJS → Signals

RxJS termina antes del template. No mezclar signals dentro de pipes.

```typescript
// ❌ Signal dentro de pipe
searchInput$.pipe(switchMap(query => {
  const user = this.userSignal(); // Signal en pipe
  return this.api.search(query, user.id);
}));

// ✅ toObservable + combineLatest
const userId$ = toObservable(this.userSignal).pipe(map(u => u.id));
searchInput$.pipe(
  combineLatestWith(userId$),
  switchMap(([query, userId]) => this.api.search(query, userId))
);
```

## Concurrencia RxJS

| Intención | Operador |
|-----------|----------|
| Solo importa el **último** (búsqueda) | `switchMap` |
| **Todos** importan (analytics) | `mergeMap` |
| En **orden** estricto (importar archivos) | `concatMap` |
| Ignorar mientras uno **corre** (submit) | `exhaustMap` |

## Pipeline Canónico

```
UI Event → Facade (comando) → Store (intención) → Gateway/IO → Store (resultado) → ViewModel → Template
```

## Patrón Facade

```typescript
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);
  private destroyRef = inject(DestroyRef);
  private searchTrigger$ = new Subject<string>();

  constructor() {
    this.searchTrigger$.pipe(
      debounceTime(300), distinctUntilChanged(),
      tap(() => this.store.setLoading(true)),
      switchMap(query =>
        this.api.search(query).pipe(
          catchError(error => { this.store.setError(error); return EMPTY; })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => this.store.setResults(results));
  }

  readonly vm = computed(() => ({
    users: this.store.users(),
    loading: this.store.loading(),
    error: this.store.error(),
  }));

  search(query: string): void { this.searchTrigger$.next(query); }
}
```

**Reglas**: Componente no sabe de RxJS. Facade no expone Observables. Triggers privados. Un efecto = una intención.

## Checklist

```
[ ] 1 solo dueño por concepto de estado?
[ ] Store no tiene mutación pública? (private + asReadonly)
[ ] UI solo conoce Facade?
[ ] Signals para estado, RxJS para tiempo/IO?
[ ] Template consume ViewModel (computed)?
[ ] No hay subscribe() sin takeUntilDestroyed?
[ ] Cada operador RxJS tiene intención clara?
[ ] No hay BehaviorSubject como estado? (usar signal)
[ ] No hay funciones/getters en template? (usar computed)
```
