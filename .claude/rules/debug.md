# Sistema de Debug Avanzado

## Objetivo

El `DebugService` proporciona debugging granular con **filtrado por tags** para obtener información detallada del estado de la aplicación en desarrollo sin contaminar producción.

---

## Principio Fundamental

> **"Logger para comunicación general, Debug para investigación específica."**

- **logger**: Logs generales que pueden aparecer en producción (solo `logger.error()`)
- **debug**: Información detallada **solo en desarrollo** con control granular por tags

---

## Cuándo Usar Debug vs Logger

| Situación | Usar |
|-----------|------|
| Error crítico que debe verse en producción | `logger.error()` |
| Warning general | `logger.warn()` |
| Información general de desarrollo | `logger.log()` |
| **Investigar flujo específico** | **`debug`** |
| **Timing de operaciones** | **`debug.time()`** |
| **Debugging de RxJS streams** | **`debug.tapDbg()`** |
| **Debugging de effects** | **`debug.effectDbg()`** |
| **Logs que solo quiero ver a veces** | **`debug` con tags** |

---

## Configuración

### 1. Setup básico (ya configurado globalmente)

```typescript
// Ya está en app.config.ts
import { DEBUG_CONFIG, DebugConfig } from '@core/helpers';

const debugConfig: DebugConfig = {
  enabled: true,
  minLevel: 'INFO',
  defaultPattern: '', // Sin filtro por defecto
  storageKey: 'DEBUG',
  enableStackInTrace: false,
};

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: DEBUG_CONFIG, useValue: debugConfig },
    // ...
  ]
};
```

### 2. Activar tags en runtime

**En la consola del navegador:**

```javascript
// Activar tags específicos
localStorage.setItem('DEBUG', 'KARDEX*,ASISTENCIA:*');

// Activar todos los tags
localStorage.setItem('DEBUG', '*');

// Activar UI pero excluir UI:Noisy
localStorage.setItem('DEBUG', 'UI:*,-UI:Noisy*');

// Desactivar todos
localStorage.removeItem('DEBUG');

// Recargar para aplicar cambios
location.reload();
```

### 3. Patterns de filtrado

| Pattern | Descripción |
|---------|-------------|
| `*` | Todos los tags |
| `KARDEX*` | Todos los tags que empiezan con "KARDEX" |
| `UI:*` | Todos los tags que empiezan con "UI:" |
| `-UI:Noisy*` | Excluir tags que empiezan con "UI:Noisy" |
| `KARDEX*,UI:*,-UI:Noisy*` | Múltiples reglas (separadas por coma o espacio) |

**Regla**: Los exclude (`-`) tienen prioridad sobre los include.

---

## API del DebugService

### Básico: `dbg(tag, scope?)`

```typescript
import { inject } from '@angular/core';
import { DebugService } from '@core/helpers';

export class MiComponente {
  private debug = inject(DebugService);
  private log = this.debug.dbg('UI:MiComponente');

  ngOnInit(): void {
    // INFO - información general
    this.log.info('Componente inicializado', { data: this.data() });

    // WARN - advertencia
    this.log.warn('Datos vacíos', { count: 0 });

    // ERROR - error pero no crítico
    this.log.error('Error al cargar', { error });

    // TRACE - información muy detallada
    this.log.trace('Valor de signal', { value: this.mySignal() });
  }
}
```

### Timing: `time()` y `timeAsync()`

```typescript
// Timing síncrono
const result = this.log.time('calculateTotal', () => {
  return this.items().reduce((sum, i) => sum + i.price, 0);
});
// Output: [UI:MiComponente] time:calculateTotal { ms: 0.42 }

// Timing asíncrono
const data = await this.log.timeAsync('loadData', async () => {
  return await this.api.getData().toPromise();
});
// Output: [UI:MiComponente] timeAsync:loadData { ms: 234.56 }
```

### Once: `once()`

Útil para logs que solo queremos ver una vez (ej: en loops).

```typescript
// En un computed que se ejecuta muchas veces
readonly filtered = computed(() => {
  const items = this.items();
  this.log.once('filter-called', 'Filtrado ejecutado', { count: items.length });
  return items.filter(i => i.active);
});
// Solo imprime la primera vez que se ejecuta
```

---

## Debugging de RxJS

### `tapDbg()` - Ver emisiones de un Observable

```typescript
import { inject } from '@angular/core';
import { DebugService } from '@core/helpers';

export class MiService {
  private debug = inject(DebugService);

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`/api/users?q=${query}`).pipe(
      // Muestra next, error, complete
      this.debug.tapDbg('API:Users', 'searchUsers'),
      map(users => users.filter(u => u.active)),
      this.debug.tapDbg('API:Users', 'afterFilter'),
    );
  }
}

// Output (con localStorage.DEBUG = 'API:*'):
// [API:Users] next:searchUsers [{ id: 1, ... }, { id: 2, ... }]
// [API:Users] next:afterFilter [{ id: 1, ... }]
// [API:Users] complete:afterFilter
```

### `track$()` - Trackear Observable completo

```typescript
loadUsers(): void {
  this.api.getUsers().pipe(
    // Muestra: start, ttf (time to first), count, total time
    this.debug.track$('API:Users', 'loadUsers'),
    takeUntilDestroyed(this.destroyRef),
  ).subscribe(users => this.store.setUsers(users));
}

// Output:
// [API:Users] track:start:loadUsers
// [API:Users] track:ttf:loadUsers { ms: 234.56 }
// [API:Users] track:end:loadUsers { count: 1, ms: 234.56 }
```

### `dbgSub()` - Wrapper de subscribe con debug

```typescript
const log = this.debug.dbg('API:Users');

this.api.getUsers().subscribe(
  this.debug.dbgSub('API:Users', {
    next: (users) => {
      this.store.setUsers(users);
    },
    error: (err) => {
      this.store.setError(err);
    },
    complete: () => {
      this.store.setLoading(false);
    },
  }, 'loadUsers')
);

// Output:
// [API:Users] sub:next:loadUsers [{ id: 1, ... }]
// [API:Users] sub:complete:loadUsers
```

---

## Debugging de Signals

### `effectDbg()` - Wrapper de effect con debug

```typescript
export class MiComponente {
  private debug = inject(DebugService);
  private log = this.debug.dbg('UI:MiComponente');

  constructor() {
    // Effect normal
    effect(() => {
      const value = this.mySignal();
      console.log('Effect ejecutado', value); // ❌ Siempre imprime
    });

    // Effect con debug
    this.debug.effectDbg('UI:MiComponente', 'watchMySignal', (onCleanup) => {
      const value = this.mySignal();
      this.log.trace('Signal cambió', { value });

      onCleanup(() => {
        this.log.trace('Cleanup ejecutado');
      });
    });
  }
}

// Output (solo si localStorage.DEBUG = 'UI:*'):
// [UI:MiComponente] effect:run:watchMySignal { run: 1 }
// [UI:MiComponente] Signal cambió { value: 'foo' }
// [UI:MiComponente] effect:cleanup:watchMySignal { run: 1 }
// [UI:MiComponente] effect:run:watchMySignal { run: 2 }
```

---

## Convenciones de Tags

### Estructura de Tags

```
<DOMINIO>:<ENTIDAD>::<SCOPE>
```

| Parte | Descripción | Ejemplo |
|-------|-------------|---------|
| DOMINIO | Módulo/área de la app | `UI`, `API`, `STORE`, `KARDEX`, `ASISTENCIA` |
| ENTIDAD | Componente/servicio específico | `Users`, `Table`, `Facade` |
| SCOPE (opcional) | Sub-contexto | `ngOnInit`, `loadData` |

### Ejemplos de Tags Recomendados

```typescript
// UI Components
this.debug.dbg('UI:UsersTable');
this.debug.dbg('UI:UsersTable', 'loadData');

// Stores
this.debug.dbg('STORE:Users');
this.debug.dbg('STORE:Users', 'setUsers');

// Facades
this.debug.dbg('FACADE:Users');
this.debug.dbg('FACADE:Users', 'loadUsers');

// API Services
this.debug.dbg('API:Users');
this.debug.dbg('API:Users', 'getUsers');

// Features específicos
this.debug.dbg('KARDEX:Movements');
this.debug.dbg('ASISTENCIA:MonthView');
```

### Patterns de Activación Comunes

```javascript
// Debuggear un feature completo
localStorage.setItem('DEBUG', 'KARDEX*');

// Debuggear toda la capa de UI
localStorage.setItem('DEBUG', 'UI:*');

// Debuggear API calls
localStorage.setItem('DEBUG', 'API:*');

// Debuggear stores
localStorage.setItem('DEBUG', 'STORE:*');

// Debuggear todo excepto traces muy verbosos
localStorage.setItem('DEBUG', '*,-*:Trace*');

// Debuggear múltiples dominios
localStorage.setItem('DEBUG', 'KARDEX*,ASISTENCIA*,API:*');
```

---

## Casos de Uso Comunes

### 1. Investigar por qué un computed no se actualiza

```typescript
readonly filteredUsers = computed(() => {
  const users = this.users();
  const query = this.searchQuery();

  this.log.trace('computed:filteredUsers ejecutado', {
    usersCount: users.length,
    query,
  });

  return users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );
});

// Activa con: localStorage.DEBUG = 'STORE:Users'
// Verás cada vez que el computed se ejecuta
```

### 2. Trackear cuánto tarda una operación

```typescript
saveUser(user: User): void {
  this.log.time('saveUser', () => {
    this.store.setLoading(true);
    this.api.saveUser(user).subscribe({
      next: () => {
        this.store.setLoading(false);
        this.log.info('Usuario guardado', { id: user.id });
      },
    });
  });
}

// Output: [FACADE:Users] time:saveUser { ms: 0.12 }
```

### 3. Ver todos los eventos de un stream RxJS

```typescript
this.searchQuery$.pipe(
  this.debug.tapDbg('UI:Search', 'query$'),
  debounceTime(300),
  this.debug.tapDbg('UI:Search', 'afterDebounce'),
  switchMap(q => this.api.search(q)),
  this.debug.tapDbg('UI:Search', 'afterAPI'),
).subscribe();

// Activa con: localStorage.DEBUG = 'UI:Search'
// Verás cada emisión en cada paso del pipe
```

### 4. Debuggear effects que se ejecutan muchas veces

```typescript
constructor() {
  this.debug.effectDbg('STORE:Users', 'syncWithAPI', (onCleanup) => {
    const criteria = this.criteria();
    this.log.trace('Criteria cambió, cargando...', { criteria });

    this.api.getUsers(criteria).subscribe(users => {
      this.setUsers(users);
    });
  });
}

// Verás cada ejecución del effect con su número de run
```

### 5. Logs que solo quiero ver a veces (no siempre)

```typescript
// En lugar de comentar/descomentar console.logs
ngOnInit(): void {
  // console.log('Init', this.data()); // ❌ Comentar/descomentar manualmente

  this.log.info('Init', { data: this.data() }); // ✅ Controlar con localStorage
}

// Cuando quiero ver: localStorage.DEBUG = 'UI:MiComponente'
// Cuando no: localStorage.removeItem('DEBUG')
```

---

## Niveles de Debug

| Nivel | Peso | Cuándo usar |
|-------|------|-------------|
| `ERROR` | 0 | Errores no críticos (no usar `logger.error` si no es para prod) |
| `WARN` | 1 | Advertencias (datos inesperados, deprecations) |
| `INFO` | 2 | **Default** - Información general (inicialización, operaciones) |
| `TRACE` | 3 | Información muy detallada (cada emisión, cada computed) |

### Configurar nivel mínimo

```typescript
// En debug config
const debugConfig: DebugConfig = {
  minLevel: 'INFO', // Solo INFO, WARN, ERROR (no TRACE)
};

// O en runtime (no implementado aún, pero posible)
```

### Stack traces en TRACE

```typescript
const debugConfig: DebugConfig = {
  enableStackInTrace: true, // Agrega stack trace en logs TRACE
};

this.log.trace('Valor', { value: 42 });
// Output incluirá:
//   at MiComponente.ngOnInit (...)
//   at ...
```

**⚠️ Warning**: Stack traces tienen costo de performance. Solo activar cuando sea necesario.

---

## Reglas de Uso

### ✅ SÍ usar debug para

- **Investigar flujos complejos** (RxJS, effects, computed)
- **Timing de operaciones** (performance profiling)
- **Logs que solo quiero ver a veces** (controlados por tags)
- **Información muy detallada** (valores intermedios, estados)
- **Debugging temporal** (agregar debug, investigar, remover)

### ❌ NO usar debug para

- **Errores críticos de producción** → usar `logger.error()`
- **Logs permanentes** → usar `logger`
- **Logs que siempre deben verse** → usar `logger`
- **Analytics** → usar servicio de analytics
- **Monitoring** → usar servicio de monitoring

### ⚠️ Debug vs Logger

| | Debug | Logger |
|---|-------|--------|
| **Ambiente** | Solo development | Development + production |
| **Control** | Tags + localStorage | Siempre activo |
| **Propósito** | Investigación temporal | Comunicación permanente |
| **Output** | Solo cuando tag activo | Siempre (excepto en prod) |
| **Performance** | Costo cuando activo | Costo siempre |

---

## Ejemplos Completos

### Ejemplo 1: Component con debug

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { DebugService } from '@core/helpers';

@Component({
  selector: 'app-users-table',
  // ...
})
export class UsersTableComponent {
  private debug = inject(DebugService);
  private log = this.debug.dbg('UI:UsersTable');

  readonly users = signal<User[]>([]);
  readonly searchQuery = signal('');

  readonly filteredUsers = computed(() => {
    const users = this.users();
    const query = this.searchQuery();

    // Solo se imprime si localStorage.DEBUG incluye 'UI:UsersTable'
    this.log.trace('computed:filteredUsers', {
      usersCount: users.length,
      query,
    });

    return this.log.time('filterUsers', () =>
      users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()))
    );
  });

  ngOnInit(): void {
    this.log.info('Componente inicializado', {
      usersCount: this.users().length,
    });

    this.loadUsers();
  }

  loadUsers(): void {
    this.log.info('Cargando usuarios...');

    this.log.timeAsync('loadUsers', async () => {
      const users = await this.api.getUsers().toPromise();
      this.users.set(users);
      this.log.info('Usuarios cargados', { count: users.length });
    });
  }

  onSearch(query: string): void {
    this.log.info('Búsqueda', { query });
    this.searchQuery.set(query);
  }
}

// Para activar todos los logs:
// localStorage.DEBUG = 'UI:UsersTable'
//
// Para activar solo INFO y superiores (sin TRACE):
// Configurar minLevel: 'INFO' en debug config
```

### Ejemplo 2: Service con debug de RxJS

```typescript
import { Injectable, inject } from '@angular/core';
import { DebugService } from '@core/helpers';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private http = inject(HttpClient);
  private debug = inject(DebugService);

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`/api/users?q=${query}`).pipe(
      // Track completo del observable
      this.debug.track$('API:Users', 'searchUsers'),

      // Ver emisiones específicas
      this.debug.tapDbg('API:Users', 'rawResponse'),

      map(users => users.filter(u => u.active)),

      this.debug.tapDbg('API:Users', 'afterFilter'),

      catchError(err => {
        this.debug.dbg('API:Users').error('Error en búsqueda', err);
        return EMPTY;
      }),
    );
  }
}

// Para ver todos los API calls:
// localStorage.DEBUG = 'API:*'
```

### Ejemplo 3: Store con debug de effects

```typescript
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { DebugService } from '@core/helpers';

@Injectable({ providedIn: 'root' })
export class UsersStore {
  private api = inject(UsersApiService);
  private debug = inject(DebugService);
  private log = this.debug.dbg('STORE:Users');

  private readonly _users = signal<User[]>([]);
  private readonly _criteria = signal<SearchCriteria>({ role: 'all' });

  readonly users = this._users.asReadonly();
  readonly criteria = this._criteria.asReadonly();

  readonly activeUsers = computed(() => {
    const users = this.users();
    this.log.trace('computed:activeUsers', { count: users.length });

    return this.log.time('filterActive', () =>
      users.filter(u => u.active)
    );
  });

  constructor() {
    // Effect con debug
    this.debug.effectDbg('STORE:Users', 'syncWithAPI', (onCleanup) => {
      const criteria = this.criteria();
      this.log.info('Criteria cambió, cargando...', { criteria });

      this.api.searchUsers(criteria.role || 'all').subscribe(users => {
        this.setUsers(users);
      });
    });
  }

  setUsers(users: User[]): void {
    this.log.info('setUsers', { count: users.length });
    this._users.set(users);
  }

  setCriteria(criteria: SearchCriteria): void {
    this.log.info('setCriteria', { criteria });
    this._criteria.set(criteria);
  }
}

// Para ver todo el store:
// localStorage.DEBUG = 'STORE:Users'
```

---

## Tips y Tricks

### 1. Ver solo ciertos métodos

```typescript
// Usar scope para diferenciar
private log = this.debug.dbg('UI:UsersTable');

loadUsers(): void {
  const scopedLog = this.debug.dbg('UI:UsersTable', 'loadUsers');
  scopedLog.info('Iniciando carga...');
}

// Activar solo loadUsers:
// localStorage.DEBUG = 'UI:UsersTable::loadUsers'
```

### 2. Debugging condicional

```typescript
// Debug solo si hay error
if (result.error) {
  this.log.error('Error encontrado', { error: result.error });
}

// Debug solo en casos específicos
if (this.users().length === 0) {
  this.log.warn('Sin usuarios', { criteria: this.criteria() });
}
```

### 3. Combinar con logger

```typescript
// Error crítico → logger (siempre visible)
logger.error('Error crítico en API', error);

// Debug detallado → debug (solo cuando investigo)
this.log.trace('Request details', { url, params, headers });
```

### 4. Debugging en loops (usar once)

```typescript
// ❌ INCORRECTO - imprime en cada iteración
this.items().forEach(item => {
  this.log.trace('Processing item', { item }); // 1000 logs
  this.process(item);
});

// ✅ CORRECTO - imprime solo la primera vez
this.log.once('process-items', 'Processing items', {
  count: this.items().length,
});
this.items().forEach(item => this.process(item));
```

---

## Checklist de Implementación

Antes de agregar debug a un componente/servicio:

- [ ] ¿Este log es para investigación temporal? → Debug
- [ ] ¿Este log debe verse siempre? → Logger
- [ ] ¿Definí un tag claro? (ej: `UI:UsersTable`)
- [ ] ¿Usé el nivel correcto? (INFO por defecto, TRACE para muy detallado)
- [ ] ¿Probé activar/desactivar con localStorage?
- [ ] ¿El log tiene información útil? (no solo strings)
- [ ] ¿Limpié los debug después de resolver el issue?

---

## Limpieza de Debug

**⚠️ IMPORTANTE**: Los logs de debug son para **investigación temporal**.

### Cuándo remover debug

- ✅ **Mantener**: Debug que documenta flujos complejos (timing, RxJS)
- ❌ **Remover**: Debug agregado para investigar un bug específico
- ✅ **Mantener**: Debug de performance (time, timeAsync)
- ❌ **Remover**: Debug de "console.log replacement"

### Antes de commit

```bash
# Buscar logs de debug temporales
git diff | grep "this.log.trace"
git diff | grep "debug.dbg"

# Revisar si son necesarios o temporales
```

---

## Resumen de Decisiones

| Necesito... | Usar |
|-------------|------|
| Log permanente visible siempre | `logger.log()` |
| Error crítico de producción | `logger.error()` |
| Investigar flujo específico | `debug.dbg('TAG').info()` |
| Ver emisiones de Observable | `debug.tapDbg('TAG')` |
| Trackear Observable completo | `debug.track$('TAG')` |
| Ver ejecuciones de effect | `debug.effectDbg('TAG')` |
| Medir tiempo de operación | `debug.time()` / `timeAsync()` |
| Log solo la primera vez | `debug.once()` |
| Control granular por área | localStorage.DEBUG con patterns |

### Frase clave

> **"Logger comunica, Debug investiga."**

- **Logger**: Comunicación permanente del estado de la app
- **Debug**: Investigación temporal con control granular por tags
