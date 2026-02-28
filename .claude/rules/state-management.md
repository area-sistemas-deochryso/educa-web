# Gestion de Estado y Servicios

## 0. Objetivo

Disenar **propiedad del estado** y **fronteras de responsabilidad** para:

- Minimizar Change Detection
- Evitar duplicacion de verdad
- Separar estado, tiempo e IO

> **Principio fundamental**: "Arquitectura = decidir quien puede cambiar que, y cuando."

---

## 1. Clasificacion de Estado (unica verdad por concepto)

| Tipo | Vive en | Persiste | Ejemplo |
|------|---------|----------|---------|
| **UI Local** | Componente | No persiste navegacion | `isExpanded`, hover, focus |
| **Ephemeral / Scoped** | Provider en componente (`@Injectable()` sin `providedIn`) | Durante el flujo | Wizard multi-step, modal con tabs |
| **Feature State** | Store del feature (`providedIn: 'root'`) | Navegacion interna del modulo | Lista, filtros, paginacion |
| **App State** | Core stores / NgRx Signals | Toda la aplicacion | Auth, tenant, conectividad |

**Regla: 1 concepto = 1 dueno.** El componente consume readonly desde el store, nunca duplica el estado.

---

## 2. Roles de Servicios

Ver `@.claude/rules/architecture.md` para taxonomia completa.

| Tipo | Estado | IO | UI |
|------|--------|----|----|
| Utility | No | No | No |
| Gateway | No* | Si | No |
| State/Store | Si | No | No |
| Facade | No** | Si | Si |
| Ephemeral | Si | No | Si |

\* Puede tener cache interno, pero no expone estado reactivo a UI
\*\* Muy poco, solo orquestacion

---

## 3. Contrato Store (shape estandar)

```typescript
interface StoreState<T> {
  criteria: SearchCriteria;
  page: { index: number; size: number; sortBy?: string; sortOrder?: 'asc' | 'desc' };
  entitiesById: Record<string, T>;
  result: { ids: string[]; total: number };
  selection: Set<string>;
  status: { loading: boolean; error: string | null; stale: boolean };
}

interface StoreVM<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  hasSelection: boolean;
  selectedItems: T[];
}
```

```typescript
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();

  readonly activeUsers = computed(() => this.users().filter(u => u.active));

  readonly vm = computed(() => ({
    users: this.users(),
    loading: this.loading(),
    isEmpty: this.users().length === 0,
  }));

  setUsers(users: User[]): void { this._users.set(users); }
  setLoading(loading: boolean): void { this._loading.set(loading); }
}
```

---

## 4. Lecturas vs Escrituras

```typescript
// CORRECTO - Lecturas readonly
private readonly _users = signal<User[]>([]);
readonly users = this._users.asReadonly();
readonly activeUsers = computed(() => this.users().filter(u => u.active));

// INCORRECTO - Mutacion publica
readonly users = signal<User[]>([]); // Cualquiera puede hacer .set()
```

> **"Un servicio no es estado; es una fuente de estado."** El componente lee desde la fuente, nunca muta directamente.

---

## 5. Draft vs Committed

- **Draft** (UI/Ephemeral): Editable, sucio, no dispara IO. Vive en el componente o servicio scoped.
- **Committed** (Store): Dispara busqueda/carga. Vive en el store.

**Regla**: No mezclar draft con estado productivo. Draft en componente, committed en store.

---

## 6. Signals vs RxJS

| Usar Signals para | Usar RxJS para |
|-------------------|----------------|
| Estado actual | Tiempo (debounce, throttle) |
| Derivados sincronos | IO asincrono |
| ViewModel | Cancelacion (switchMap) |
| Change Detection | Retry/error handling |
| | Combinacion de streams |

---

## 7. Pipeline Canonico

```
UI Event (click, input)
         |
         v
Facade (comando de intencion)
         |
         v
Store (intencion): setCriteria(), setLoading()
         |
         v
Gateway / Cache / IO: fetch data, call API
         |
         v
Store (materializacion): setResult(), setError()
         |
         v
ViewModel: computed(() => ({ ... }))
         |
         v
Template: {{ vm().users }}
```

---

## 8. Checklist de Validacion

- [ ] Un solo dueno por concepto?
- [ ] Store no tiene mutacion publica?
- [ ] UI solo conoce Facade?
- [ ] Draft separado del committed?
- [ ] Signals para estado, RxJS para tiempo/IO?
- [ ] Template consume ViewModel?

### Red flags vs Green flags

```
RED FLAGS                              GREEN FLAGS
.set() expuesto en servicio            readonly signals
multiples duenos del mismo concepto    computed para derivados
logica de negocio en componente        comandos claros (load, save, delete)
draft mezclado con store               1 dueno por estado
RxJS para estado sincrono              draft en componente/ephemeral
funciones en template                  pipeline canonico respetado
```

---

## 9. Antipatrones Comunes

| Antipatron | Correccion |
|------------|------------|
| Estado duplicado (`activeUsers = signal([])`) | Usar `computed()` derivado |
| Logica/HTTP en componente | Delegar a facade |
| Signal publico mutable | `private _signal` + `.asReadonly()` |
| Cache sin invalidacion | TTL + invalidacion explicita |

---

## Resumen de Decisiones

| Pregunta | Respuesta |
|----------|-----------|
| Estado UI? | Componente (signal local) |
| Estado del feature? | Store (signals privados) |
| Como expongo estado? | readonly + computed |
| Como muto estado? | Comandos (metodos) |
| Cuando Signals? | Estado actual + derivados |
| Cuando RxJS? | Tiempo + IO + cancelacion |
| Draft o Committed? | Draft en UI, Committed en Store |
| Que consume el template? | ViewModel (computed) |
