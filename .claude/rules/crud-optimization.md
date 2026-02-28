# Optimización Quirúrgica de CRUD

## Principio Fundamental

> **"No recargar lo que puedes actualizar quirúrgicamente."**

Cada operación CRUD debe actualizar **solo** el registro afectado, no toda la tabla.

---

## Estrategias por Operación

| Operación | Estrategia | Refetch | Stats | Por qué |
|-----------|-----------|---------|-------|---------|
| **Crear** | Refetch items only | ✅ Items | ✅ Incremental | Necesitamos ID del servidor |
| **Editar** | Mutación local | ❌ No | ❌ No necesario | Ya tenemos ID y campos |
| **Toggle** | Mutación local | ❌ No | ✅ Incremental | Ya tenemos ID y campo |
| **Eliminar** | Mutación local | ❌ No | ✅ Incremental | Ya tenemos ID |

> **"Si tienes el ID y sabes qué cambió, no necesitas refetch."**

---

## Store con Mutaciones Quirúrgicas

```typescript
@Injectable({ providedIn: 'root' })
export class MiStore {
  private readonly _items = signal<Item[]>([]);
  readonly items = this._items.asReadonly();

  addItem(item: Item): void {
    this._items.update((items) => [item, ...items]);
  }

  updateItem(id: number, updates: Partial<Item>): void {
    this._items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  }

  toggleItemEstado(id: number): void {
    this._items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, estado: !i.estado } : i))
    );
  }

  removeItem(id: number): void {
    this._items.update((items) => items.filter((i) => i.id !== id));
  }

  incrementarEstadistica(campo: keyof Estadisticas, delta: number): void {
    this._estadisticas.update((stats) => {
      if (!stats) return stats;
      return { ...stats, [campo]: stats[campo] + delta };
    });
  }
}
```

---

## Facade con Estrategias por Operación

```typescript
@Injectable({ providedIn: 'root' })
export class MiFacade {
  private api = inject(MiApiService);
  private store = inject(MiStore);

  // CREAR: Refetch solo items (necesitamos ID del servidor)
  create(data: CreateData): void {
    this.store.setLoading(true);
    this.api.create(data).subscribe({
      next: () => {
        this.refreshItemsOnly();
        this.store.incrementarEstadistica('totalItems', 1);
      },
      error: (err) => this.handleError(err),
    });
  }

  // EDITAR: Mutación quirúrgica local (no refetch)
  update(id: number, data: UpdateData): void {
    this.store.setLoading(true);
    this.api.update(id, data).subscribe({
      next: () => {
        this.store.updateItem(id, data);
        this.store.setLoading(false);
      },
      error: (err) => this.handleError(err),
    });
  }

  // TOGGLE/ELIMINAR: Mismo patrón - mutación quirúrgica + stats incrementales

  private refreshItemsOnly(): void {
    this.api.getAll().subscribe({
      next: (items) => {
        this.store.setItems(items);
        this.store.setLoading(false);
      },
      error: (err) => this.handleError(err),
    });
  }

  private handleError(err: unknown): void {
    logger.error('Error:', err);
    this.errorHandler.showError('Error', 'No se pudo completar la operación');
    this.store.setLoading(false);
  }
}
```

---

## Tabla con Persistencia de Estado

```html
<p-table [value]="items()" [paginator]="true" [rows]="10"
  stateStorage="session" stateKey="mi-tabla-state">
</p-table>
```

Mantiene paginación, ordenamiento y filas por página entre operaciones CRUD.

---

## Checklist de Implementación

### Store
```
[ ] addItem(item), updateItem(id, updates), toggleItem(id), removeItem(id)
[ ] incrementarEstadistica(campo, delta)
```

### Facade
```
[ ] CREAR: refreshItemsOnly() + stats incrementales
[ ] EDITAR: store.updateItem() + NO refetch
[ ] TOGGLE: store.toggleItem() + stats incrementales
[ ] ELIMINAR: store.removeItem() + stats incrementales
[ ] Método refreshItemsOnly() privado
```

### Tabla
```
[ ] stateStorage="session" + stateKey="mi-tabla-state"
```

### Verificación
```
[ ] Editar/Toggle/Eliminar NO recargan tabla
[ ] Crear solo recarga lista (sin resetear stats/skeletons)
[ ] Estadísticas se actualizan correctamente
```

## Resumen de Decisiones

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cuándo refetch completo? | Nunca - usar `loadData()` solo en `ngOnInit` |
| ¿Cuándo refetch items only? | Solo en CREAR (necesitamos ID del servidor) |
| ¿Cuándo mutación local? | EDITAR, TOGGLE, ELIMINAR (ya tenemos el ID) |
| ¿Refetch estadísticas? | Nunca - usar actualización incremental |
| ¿Persistir estado de tabla? | Siempre - usar `stateStorage="session"` |
