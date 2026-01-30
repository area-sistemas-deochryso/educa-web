# Optimización Quirúrgica de CRUD

## Principio Fundamental

> **"No recargar lo que puedes actualizar quirúrgicamente."**

Cada operación CRUD debe actualizar **solo** el registro afectado, no toda la tabla.

---

## Anti-Patrón: Recarga Completa

```typescript
// ❌ INCORRECTO - Recarga todo después de cada operación
saveUsuario(): void {
  this.api.save(data).subscribe(() => {
    this.loadData(); // ❌ Recarga completa: stats + tabla + skeletons
  });
}

toggleEstado(usuario: Usuario): void {
  this.api.toggle(usuario.id).subscribe(() => {
    this.loadData(); // ❌ Recarga completa solo para 1 campo
  });
}
```

**Problemas**:
- ❌ Re-renderiza toda la tabla
- ❌ Resetea paginación, ordenamiento, filtros
- ❌ Flash visual (skeleton → contenido)
- ❌ Recarga estadísticas innecesariamente
- ❌ Lento (~2-3 segundos)

---

## Patrón Correcto: Mutaciones Quirúrgicas

### 1. Store con Mutaciones Quirúrgicas

```typescript
@Injectable({ providedIn: 'root' })
export class MiStore {
  private readonly _items = signal<Item[]>([]);
  readonly items = this._items.asReadonly();

  // ✅ Mutación quirúrgica: Agregar 1 item
  addItem(item: Item): void {
    this._items.update((items) => [item, ...items]);
  }

  // ✅ Mutación quirúrgica: Actualizar 1 item
  updateItem(id: number, updates: Partial<Item>): void {
    this._items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  }

  // ✅ Mutación quirúrgica: Toggle 1 campo
  toggleItemEstado(id: number): void {
    this._items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, estado: !i.estado } : i))
    );
  }

  // ✅ Mutación quirúrgica: Eliminar 1 item
  removeItem(id: number): void {
    this._items.update((items) => items.filter((i) => i.id !== id));
  }

  // ✅ Actualización incremental de estadísticas
  incrementarEstadistica(campo: keyof Estadisticas, delta: number): void {
    this._estadisticas.update((stats) => {
      if (!stats) return stats;
      return { ...stats, [campo]: stats[campo] + delta };
    });
  }
}
```

### 2. Facade con Estrategias por Operación

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
        // Refetch solo items (sin resetear skeletons ni stats)
        this.refreshItemsOnly();
        // Actualizar stats incrementalmente
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
        // ✅ Mutación quirúrgica: actualizar solo este item
        this.store.updateItem(id, {
          nombre: data.nombre,
          descripcion: data.descripcion,
          // ... campos actualizados
        });
        this.store.setLoading(false);
      },
      error: (err) => this.handleError(err),
    });
  }

  // TOGGLE: Mutación quirúrgica local (no refetch)
  toggleEstado(item: Item): void {
    this.store.setLoading(true);
    const nuevoEstado = !item.estado;

    this.api.toggleEstado(item.id, nuevoEstado).subscribe({
      next: () => {
        // ✅ Mutación quirúrgica: toggle solo este item
        this.store.toggleItemEstado(item.id);

        // Actualizar stats incrementalmente
        if (nuevoEstado) {
          this.store.incrementarEstadistica('activos', 1);
          this.store.incrementarEstadistica('inactivos', -1);
        } else {
          this.store.incrementarEstadistica('activos', -1);
          this.store.incrementarEstadistica('inactivos', 1);
        }

        this.store.setLoading(false);
      },
      error: (err) => this.handleError(err),
    });
  }

  // ELIMINAR: Mutación quirúrgica local (no refetch)
  delete(item: Item): void {
    this.store.setLoading(true);
    this.api.delete(item.id).subscribe({
      next: () => {
        // ✅ Mutación quirúrgica: eliminar solo este item
        this.store.removeItem(item.id);

        // Actualizar stats incrementalmente
        this.store.incrementarEstadistica('totalItems', -1);
        if (item.estado) {
          this.store.incrementarEstadistica('activos', -1);
        } else {
          this.store.incrementarEstadistica('inactivos', -1);
        }

        this.store.setLoading(false);
      },
      error: (err) => this.handleError(err),
    });
  }

  // Refetch solo items (sin resetear skeletons ni estadísticas)
  private refreshItemsOnly(): void {
    this.store.setLoading(true);
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

### 3. Tabla con Persistencia de Estado

```html
<p-table
  [value]="items()"
  [paginator]="true"
  [rows]="10"
  stateStorage="session"
  stateKey="mi-tabla-state"
>
  <!-- ... -->
</p-table>
```

**Beneficios**:
- ✅ Mantiene paginación actual
- ✅ Mantiene ordenamiento
- ✅ Mantiene filas por página
- ✅ Persiste en sessionStorage

---

## Estrategias por Operación

| Operación | Estrategia | Refetch | Stats | Resultado |
|-----------|-----------|---------|-------|-----------|
| **Crear** | Refetch items only | ✅ Items | ✅ Incremental | Solo lista se recarga |
| **Editar** | Mutación local | ❌ No | ❌ No necesario | Solo 1 fila actualizada |
| **Toggle** | Mutación local | ❌ No | ✅ Incremental | Solo 1 campo actualizado |
| **Eliminar** | Mutación local | ❌ No | ✅ Incremental | Solo 1 fila eliminada |

### ¿Por qué refetch en crear?

**Crear**: Necesitamos el **ID** generado por el servidor

```typescript
// ❌ NO PODEMOS: Crear localmente sin ID
addItem({ nombre: 'Nuevo' }); // ¿Qué ID le ponemos?

// ✅ CORRECTO: Refetch para obtener el ID real
this.api.create(data).subscribe(() => {
  this.refreshItemsOnly(); // Obtiene el item con ID del servidor
});
```

### ¿Por qué no refetch en editar/toggle/eliminar?

Porque **ya tenemos el ID** y sabemos exactamente qué cambió:

```typescript
// ✅ EDITAR: Sabemos el ID y qué campos cambiaron
updateItem(42, { nombre: 'Nuevo nombre' });

// ✅ TOGGLE: Sabemos el ID y qué campo cambió
toggleItemEstado(42); // estado: true → false

// ✅ ELIMINAR: Sabemos el ID a eliminar
removeItem(42);
```

---

## Actualización Incremental de Estadísticas

### ❌ INCORRECTO: Refetch estadísticas

```typescript
// Después de cada operación
this.api.getEstadisticas().subscribe(stats => {
  this.store.setEstadisticas(stats); // ❌ Llamada HTTP innecesaria
});
```

### ✅ CORRECTO: Actualización incremental

```typescript
// Crear usuario
this.store.incrementarEstadistica('totalUsuarios', 1);
this.store.incrementarEstadistica('usuariosActivos', 1); // Siempre activo
if (data.rol === 'Director') {
  this.store.incrementarEstadistica('totalDirectores', 1);
}

// Toggle estado
if (nuevoEstado) {
  // Se activó
  this.store.incrementarEstadistica('usuariosActivos', 1);
  this.store.incrementarEstadistica('usuariosInactivos', -1);
} else {
  // Se desactivó
  this.store.incrementarEstadistica('usuariosActivos', -1);
  this.store.incrementarEstadistica('usuariosInactivos', 1);
}

// Eliminar
this.store.incrementarEstadistica('totalUsuarios', -1);
if (usuario.estado) {
  this.store.incrementarEstadistica('usuariosActivos', -1);
} else {
  this.store.incrementarEstadistica('usuariosInactivos', -1);
}
```

---

## Métricas de Éxito

### Antes de la optimización

| Operación | Tiempo | Requests HTTP | Renderizaciones |
|-----------|--------|---------------|-----------------|
| Editar | ~2s | 2 (update + getAll) | Toda la tabla |
| Toggle | ~2s | 2 (toggle + getAll) | Toda la tabla |
| Eliminar | ~2s | 2 (delete + getAll) | Toda la tabla |
| Crear | ~2s | 2 (create + getAll) | Toda la tabla |

**Total**: 8 requests HTTP, 4 recargas completas

### Después de la optimización

| Operación | Tiempo | Requests HTTP | Renderizaciones |
|-----------|--------|---------------|-----------------|
| Editar | ~200ms | 1 (update) | 1 fila |
| Toggle | ~200ms | 1 (toggle) | 1 campo |
| Eliminar | ~200ms | 1 (delete) | 1 fila |
| Crear | ~500ms | 2 (create + getAll) | Solo lista |

**Total**: 5 requests HTTP, 3 actualizaciones quirúrgicas + 1 refetch parcial

**Mejora**: ~90-95% más rápido, ~40% menos requests HTTP

---

## Checklist de Implementación

### 1. Store

```
[ ] Agregar mutaciones quirúrgicas:
    [ ] addItem(item)
    [ ] updateItem(id, updates)
    [ ] toggleItem(id) - si aplica
    [ ] removeItem(id)
[ ] Agregar incrementarEstadistica(campo, delta)
```

### 2. Facade

```
[ ] CREAR: Usar refreshItemsOnly() + actualizar stats
[ ] EDITAR: Usar store.updateItem() + NO refetch
[ ] TOGGLE: Usar store.toggleItem() + actualizar stats
[ ] ELIMINAR: Usar store.removeItem() + actualizar stats
[ ] Agregar método refreshItemsOnly() privado
```

### 3. Tabla

```
[ ] Agregar stateStorage="session"
[ ] Agregar stateKey="mi-tabla-state"
```

### 4. Verificación

```
[ ] Editar NO recarga tabla (mantiene página/ordenamiento)
[ ] Toggle NO recarga tabla
[ ] Eliminar NO recarga tabla
[ ] Crear solo recarga lista (sin resetear stats/skeletons)
[ ] Estadísticas se actualizan correctamente
[ ] Performance: ~90% más rápido
```

---

## Casos Especiales

### Relaciones complejas

Si actualizar un item requiere recalcular relaciones complejas:

```typescript
// OPCIÓN A: Refetch parcial
updateItem(id: number, data: UpdateData): void {
  this.api.update(id, data).subscribe(() => {
    // Refetch solo items relacionados
    this.refreshItemsOnly();
  });
}

// OPCIÓN B: Actualización en cascada
updateItem(id: number, data: UpdateData): void {
  this.api.update(id, data).subscribe(() => {
    // Actualizar item principal
    this.store.updateItem(id, data);

    // Actualizar items relacionados
    this.store.updateRelatedItems(id, data);
  });
}
```

### Validación post-operación

Si necesitas validar el resultado del servidor:

```typescript
updateItem(id: number, data: UpdateData): void {
  this.api.update(id, data).subscribe({
    next: (response) => {
      // ✅ CORRECTO: Usar datos del servidor si son diferentes
      this.store.updateItem(id, response.data);
    }
  });
}
```

---

## Resumen de Decisiones

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cuándo refetch completo? | Nunca - usar loadData() solo en ngOnInit |
| ¿Cuándo refetch items only? | Solo en CREAR (necesitamos ID del servidor) |
| ¿Cuándo mutación local? | EDITAR, TOGGLE, ELIMINAR (ya tenemos el ID) |
| ¿Refetch estadísticas? | Nunca - usar actualización incremental |
| ¿Persistir estado de tabla? | Siempre - usar stateStorage="session" |

### Frase clave

> **"Si tienes el ID y sabes qué cambió, no necesitas refetch."**
