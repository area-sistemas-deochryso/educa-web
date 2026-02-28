# RxJS en Angular Moderno

> **"RxJS modela eventos en el tiempo y efectos (IO). Signals modelan estado actual. Nunca compiten."**

## Regla de oro

| Pregunta | Tecnología |
|----------|-----------|
| ¿Esto ES un valor actual? | Signal |
| ¿Esto OCURRE en el tiempo? | RxJS |
| ¿Tiene duración/cancelación? | RxJS |
| ¿Se deriva síncronamente? | Signal (computed) |
| ¿Requiere IO/red/storage? | RxJS |

## Decisiones HTTP

| Situación | RxJS | Signal |
|-----------|------|--------|
| Búsqueda | `debounceTime` + `switchMap` | `results`, `loading` |
| Load inicial | `retry` + `catchError` | `data`, `loading`, `error` |
| Polling | `interval` + `switchMap` | `latestData`, `lastUpdate` |
| Upload archivo | `exhaustMap` | `progress`, `status` |
| Multiple requests | `forkJoin` o `combineLatest` | `allData`, `loading` |
| Infinite scroll | `mergeMap` (acumular) | `items`, `hasMore` |

## Concurrencia — "Si eliges mal, el bug será intermitente."

| Intención | Operador | Cuándo usar |
|-----------|----------|-------------|
| Solo importa el **último** | `switchMap` | Búsqueda, autocompletado |
| **Todos** importan | `mergeMap` | Guardar logs, analytics |
| En **orden** estricto | `concatMap` | Importar archivos secuenciales |
| Ignorar mientras uno **corre** | `exhaustMap` | Login, submit (evitar doble click) |

```typescript
// ❌ mergeMap en búsqueda: resultados viejos sobrescriben nuevos
searchInput$.pipe(mergeMap(q => this.api.search(q)))
  .subscribe(results => this.store.setResults(results));

// ✅ switchMap cancela búsquedas anteriores
searchInput$.pipe(switchMap(q => this.api.search(q)))
  .subscribe(results => this.store.setResults(results));
```

## Tiempo y errores

| Operador | Uso |
|----------|-----|
| `debounceTime(ms)` | Esperar silencio (input de búsqueda) |
| `throttleTime(ms)` | Máximo 1 por intervalo (scroll) |
| `auditTime(ms)` | Último del intervalo (UI updates) |
| `timeout(ms)` | Cancelar si tarda mucho (API lenta) |

```typescript
// ❌ Error no manejado
this.api.getUsers().subscribe({ next: (users) => this.store.setUsers(users) });

// ✅ Retry con backoff + error como estado
this.api.getUsers().pipe(
  retry({ count: 3, delay: (err, n) => {
    if (err.status === 401) return throwError(() => err);
    return timer(Math.min(1000 * Math.pow(2, n), 10000));
  }}),
  catchError(error => { this.store.setError(this.getErrorMessage(error)); return EMPTY; }),
  takeUntilDestroyed(this.destroyRef)
).subscribe(users => this.store.setUsers(users));
```

## Frontera RxJS - Signals

RxJS termina antes del template. No mezclar Signals dentro de pipes. No usar Observables como estado.
```typescript
// ❌ Signal dentro de pipe
searchInput$.pipe(
  switchMap(query => {
    const currentUser = this.userSignal(); // Signal en pipe
    return this.api.search(query, currentUser.id);
  })
).subscribe();

// ✅ toObservable + combineLatest
const userId$ = toObservable(this.userSignal).pipe(map(u => u.id));
searchInput$.pipe(
  combineLatestWith(userId$),
  switchMap(([query, userId]) => this.api.search(query, userId))
).subscribe();

// ❌ BehaviorSubject como estado
private usersSubject = new BehaviorSubject<User[]>([]);
readonly users$ = this.usersSubject.asObservable();

// ✅ Signal para estado
private readonly _users = signal<User[]>([]);
readonly users = this._users.asReadonly();
```

## Dónde vive RxJS
| ✅ SOLO aquí | ❌ NUNCA aquí |
|-------------|-------------|
| Facades, Services de aplicación | Templates, `computed()` |
| Adapters (HTTP, WS, IndexedDB) | `effect()`, Componentes presentacionales |

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
      debounceTime(300),
      distinctUntilChanged(),
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

**Reglas**: El componente no sabe de RxJS. El facade no expone Observables. Triggers son privados. Effects se suscriben en constructor. Un efecto = una intención (si necesitas comentarios para entender el pipe, sepáralo).

## Checklist

- [ ] **RxJS no guarda estado**: Usa Signals, no BehaviorSubject
- [ ] **Signals dominan UI**: Templates consumen Signals, no Observables
- [ ] **No hay subscribe() sin `takeUntilDestroyed`**
- [ ] **Cancelación ocurre sola**: `switchMap`, `exhaustMap`
- [ ] **Cada operador tiene intención clara**: `switchMap` vs `mergeMap` vs `concatMap` vs `exhaustMap`
- [ ] **Manejo de errores explícito**: `catchError` + `retry` con backoff
- [ ] **Tiempo controlado**: `debounceTime`, `throttleTime`, `timeout`
- [ ] **Puente RxJS - Signal limpio**: subscribe actualiza Signal, template consume Signal

> **RxJS describe el COMO y el CUANDO. Signals describen el QUE y el AHORA.**
