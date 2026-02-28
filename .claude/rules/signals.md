# Signals en Angular

## Principio fundamental

```
Signal = valor + dependencias + scheduler
Signals = estado sincrono derivable
RxJS = tiempo, async, IO, streams
```

> **"Signals no simplifican el diseno. Solo hacen visibles los malos disenos mas rapido."**

---

## Tipos de Signals

### 1. `signal()` - Estado mutable controlado

**Mantra**: *Guarda el valor actual, no lo que ocurrio.*

```typescript
// ✅ CORRECTO - Signal privado con readonly
export class UsersStore {
  private readonly _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();

  setUsers(users: User[]): void { this._users.set(users); }
}

// ❌ INCORRECTO - Signal publico mutable
export class UsersStore {
  readonly users = signal<User[]>([]); // Cualquiera puede mutar
}
```

| Regla | |
|-------|---|
| ✅ Solo estado sincrono | ❌ NO hacer IO dentro de mutaciones |
| ✅ Mutacion con `.set()` / `.update()` | ❌ NO exponer signal mutable como publico |

### 2. `computed()` - Derivacion pura

**Mantra**: *Formula, no procedimiento.*

```typescript
// ✅ CORRECTO - Derivacion pura sin side effects
readonly sortedUsers = computed(() =>
  [...this.users()].sort((a, b) => a.name.localeCompare(b.name))
);

// ❌ INCORRECTO - Side effects en computed
readonly totalPrice = computed(() => {
  const total = this.items().reduce((sum, i) => sum + i.price, 0);
  console.log('Total:', total); // ❌ Side effect
  return total;
});
```

| Regla | |
|-------|---|
| ✅ Operaciones puras, siempre devuelve algo | ❌ NO mutar estado, NO IO, NO logs |
| ✅ Sin efectos secundarios | ❌ NO logica de negocio pesada |

### 3. `effect()` - Puente con el mundo real

**Mantra**: *Conecta mundos, no modela estado.*

```typescript
// ✅ CORRECTO - Sincronizacion con DOM/storage
effect(() => {
  const dark = this.isDark();
  document.body.classList.toggle('dark-mode', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
});

// ❌ INCORRECTO - Derivacion que deberia ser computed
effect(() => {
  this.total.set(this.items().reduce((sum, i) => sum + i.price, 0));
});
```

| Regla | |
|-------|---|
| ✅ Sincronizar con DOM, storage, analytics | ❌ NO devolver datos (no es funcion) |
| ✅ Puede tener side effects (es su proposito) | ❌ NO logica de negocio ni calculos |

---

## DO / DON'T

### ✅ SÍ HACER

| Regla | Ejemplo |
|-------|---------|
| Signals solo para estado sincrono | `signal(false)`, `signal<User[]>([])` |
| RxJS solo para tiempo, async e IO | `debounceTime`, `switchMap`, `retry` en facades |
| Scope correcto antes de crear signal | Componente / Feature store / Core store |
| Encapsular: privado + asReadonly + metodos | `_users` privado, `users` readonly, `setUsers()` |
| OnPush sin tricks (no `markForCheck`) | Signals + OnPush = reactivo automatico |
| Mutaciones explicitas via metodos | `selectRow(id)`, `clearSelection()` |

### ❌ NO HACER

| Regla | Por que |
|-------|---------|
| NO signals como streams de eventos | Usar RxJS `Subject` para eventos con timing |
| NO effect() para derivar datos | Usar `computed()` en su lugar |
| NO exponer signals mutables en stores | Siempre `private _signal` + `.asReadonly()` |
| NO estado UI en servicios singleton | Estado UI vive en el componente, no en root service |
| NO abusar de `toSignal()`/`toObservable()` | Son puentes, no cimientos; disenar desde el inicio |
| NO mezclar RxJS y signals sin frontera clara | RxJS produce en facade, Signal guarda en store |
| NO computed() pesados (loops, IO) | Dividir en computed ligeros o usar cache |
| NO `detectChanges()`/`markForCheck()` | Si los necesitas, el diseno esta mal |

---

## Tabla de Decision: Signal vs RxJS

| Necesito... | Usar |
|-------------|------|
| Estado UI local (expandido, hover) | `signal()` en componente |
| Estado compartido (usuarios, permisos) | `signal()` en store service |
| Valor derivado (filtrado, conteo) | `computed()` |
| Sincronizar con DOM/storage | `effect()` |
| Stream de eventos (clicks, input) | RxJS `Subject` |
| HTTP/async | RxJS → `signal()` via facade |
| Tiempo (debounce/retry/polling) | RxJS → `signal()` via facade |

### Criterio rapido

```
¿Es un valor actual? → Signal
¿Es un flujo en el tiempo? → RxJS
```

---

## Sintomas y Causas

| Sintoma | Causa real |
|---------|------------|
| Se renderiza de mas | Scope incorrecto del signal |
| Se actualiza sin razon | Dependencias mal disenadas en computed |
| Se vuelve impredecible | Mutabilidad sin control (signal publico) |

---

## Checklist de Diseno

### Estado

- [ ] ¿Es estado sincrono? (si no, usar RxJS)
- [ ] ¿Scope correcto? (componente / feature / app)
- [ ] ¿Un solo dueno por concepto?
- [ ] ¿Mutacion via metodos explicitos?

### Derivaciones

- [ ] ¿Derivacion pura en `computed()`?
- [ ] ¿Sin side effects?
- [ ] ¿Operacion ligera? (si pesada, dividir o cachear)

### Arquitectura

- [ ] ¿Componente solo consume signals (no muta stores)?
- [ ] ¿Store es readonly desde fuera?
- [ ] ¿Frontera RxJS → Signal clara? (facade produce, store guarda)
- [ ] ¿OnPush funciona sin `markForCheck()`?
