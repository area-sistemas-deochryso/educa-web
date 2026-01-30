# Skill: Optimize CRUD

Optimiza operaciones CRUD con mutaciones quirúrgicas para eliminar recargas innecesarias.

## Cuándo usar

- Feature con tabla CRUD que recarga completamente después de cada operación
- Performance lenta en crear/editar/eliminar/toggle
- Tabla que resetea paginación/ordenamiento después de operaciones
- Estadísticas que se recargan innecesariamente

## Qué hace

1. **Analiza** el patrón actual (store, facade, tabla)
2. **Agrega mutaciones quirúrgicas** al store
3. **Actualiza facade** para usar mutaciones en lugar de loadData()
4. **Implementa actualización incremental** de estadísticas
5. **Agrega persistencia de estado** a la tabla (stateStorage)
6. **Verifica** que funcione correctamente

## Instrucciones

Cuando el usuario invoca `/optimize-crud` o pide optimizar un CRUD:

### 1. Identificar componente

Preguntar al usuario qué feature optimizar si no está claro:

```
¿Qué componente CRUD quieres optimizar?
- Usuarios
- Productos
- Pedidos
- [Otro]
```

### 2. Analizar estado actual

Leer los siguientes archivos (reemplazar `{feature}` con el nombre del feature):

```
src/app/features/*/pages/{feature}/{feature}.store.ts
src/app/features/*/pages/{feature}/{feature}.facade.ts
src/app/features/*/pages/{feature}/components/{feature}-table/{feature}-table.component.html
```

Buscar:
- ❌ `loadData()` después de cada operación CRUD
- ❌ Ausencia de mutaciones quirúrgicas en store
- ❌ Refetch de estadísticas después de operaciones
- ❌ Tabla sin `stateStorage`

### 3. Implementar mutaciones quirúrgicas en Store

Agregar métodos al store siguiendo el patrón de `@.claude/rules/crud-optimization.md`:

```typescript
/**
 * Mutación quirúrgica: Agregar un item al inicio del array
 */
addItem(item: Item): void {
  this._items.update((items) => [item, ...items]);
  this.log.info('Item agregado', { item });
}

/**
 * Mutación quirúrgica: Actualizar un item existente
 */
updateItem(id: number, updates: Partial<Item>): void {
  this._items.update((items) =>
    items.map((i) => (i.id === id ? { ...i, ...updates } : i))
  );
  this.log.info('Item actualizado', { id, updates });
}

/**
 * Mutación quirúrgica: Toggle del estado de un item
 */
toggleItemEstado(id: number): void {
  this._items.update((items) =>
    items.map((i) => (i.id === id ? { ...i, estado: !i.estado } : i))
  );
  this.log.info('Estado de item toggleado', { id });
}

/**
 * Mutación quirúrgica: Eliminar un item del array
 */
removeItem(id: number): void {
  this._items.update((items) => items.filter((i) => i.id !== id));
  this.log.info('Item eliminado', { id });
}

/**
 * Actualización incremental de estadísticas (sin refetch)
 */
incrementarEstadistica(campo: keyof Estadisticas, delta: number): void {
  this._estadisticas.update((stats) => {
    if (!stats) return stats;
    return { ...stats, [campo]: stats[campo] + delta };
  });
}
```

### 4. Actualizar Facade

Reemplazar cada operación CRUD siguiendo la estrategia correcta:

#### CREAR: Refetch items only

```typescript
create(data: CreateData): void {
  this.store.setLoading(true);
  this.api.create(data).subscribe({
    next: () => {
      this.store.closeDialog();
      // Refetch solo items (mantiene estadísticas y sin resetear skeletons)
      this.refreshItemsOnly();
      // Incrementar estadísticas localmente
      this.store.incrementarEstadistica('totalItems', 1);
      this.store.incrementarEstadistica('itemsActivos', 1); // Si aplica
      // Incrementar por tipo si aplica
    },
    error: (err) => this.handleError(err),
  });
}
```

#### EDITAR: Mutación quirúrgica local

```typescript
update(id: number, data: UpdateData): void {
  this.store.setLoading(true);
  this.api.update(id, data).subscribe({
    next: () => {
      // Mutación quirúrgica: actualizar solo el item editado
      this.store.updateItem(id, {
        nombre: data.nombre,
        descripcion: data.descripcion,
        // ... campos actualizados
      });
      this.store.closeDialog();
      this.store.setLoading(false);
    },
    error: (err) => this.handleError(err),
  });
}
```

#### TOGGLE: Mutación quirúrgica local + stats incrementales

```typescript
toggleEstado(item: Item): void {
  this.store.setLoading(true);
  const nuevoEstado = !item.estado;

  this.api.toggleEstado(item.id, nuevoEstado).subscribe({
    next: () => {
      // Mutación quirúrgica: toggle solo el estado del item
      this.store.toggleItemEstado(item.id);

      // Actualizar estadísticas incrementalmente
      if (nuevoEstado) {
        this.store.incrementarEstadistica('itemsActivos', 1);
        this.store.incrementarEstadistica('itemsInactivos', -1);
      } else {
        this.store.incrementarEstadistica('itemsActivos', -1);
        this.store.incrementarEstadistica('itemsInactivos', 1);
      }

      this.store.setLoading(false);
    },
    error: (err) => this.handleError(err),
  });
}
```

#### ELIMINAR: Mutación quirúrgica local + stats incrementales

```typescript
delete(item: Item): void {
  this.store.setLoading(true);
  this.api.delete(item.id).subscribe({
    next: () => {
      // Mutación quirúrgica: eliminar solo el item del array
      this.store.removeItem(item.id);

      // Actualizar estadísticas incrementalmente
      this.store.incrementarEstadistica('totalItems', -1);
      if (item.estado) {
        this.store.incrementarEstadistica('itemsActivos', -1);
      } else {
        this.store.incrementarEstadistica('itemsInactivos', -1);
      }
      // Decrementar por tipo si aplica

      this.store.setLoading(false);
    },
    error: (err) => this.handleError(err),
  });
}
```

#### Agregar método refreshItemsOnly()

```typescript
/**
 * Refresh solo la lista de items (sin resetear skeletons ni estadísticas)
 * Útil para cuando se crea un item y necesitamos el ID del servidor
 */
private refreshItemsOnly(): void {
  this.store.setLoading(true);
  this.api.getAll()
    .pipe(
      catchError((err) => {
        logger.error('Error cargando items:', err);
        this.errorHandler.showError('Error', 'No se pudieron cargar los items');
        return of([] as Item[]);
      }),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe((items) => {
      this.store.setItems(items);
      this.store.setLoading(false);
    });
}
```

### 5. Agregar persistencia de estado a la tabla

Actualizar el template de la tabla:

```html
<p-table
  [value]="items()"
  [paginator]="true"
  [rows]="10"
  [rowsPerPageOptions]="[5, 10, 25, 50]"
  stateStorage="session"
  stateKey="mi-feature-table-state"
>
  <!-- ... -->
</p-table>
```

**IMPORTANTE**: `stateKey` debe ser único por tabla (ej: `usuarios-table-state`, `productos-table-state`)

### 6. Verificar implementación

Crear checklist de verificación:

```
Mutaciones quirúrgicas en Store:
[ ] addItem()
[ ] updateItem()
[ ] toggleItem() - si aplica
[ ] removeItem()
[ ] incrementarEstadistica()

Facade optimizado:
[ ] CREAR: refreshItemsOnly() + stats incrementales
[ ] EDITAR: updateItem() sin refetch
[ ] TOGGLE: toggleItem() + stats incrementales
[ ] ELIMINAR: removeItem() + stats incrementales
[ ] refreshItemsOnly() privado

Tabla con persistencia:
[ ] stateStorage="session"
[ ] stateKey único

Testing manual:
[ ] Editar mantiene paginación/ordenamiento
[ ] Toggle no recarga tabla
[ ] Eliminar no recarga tabla
[ ] Crear solo recarga lista
[ ] Estadísticas se actualizan correctamente
```

### 7. Reportar resultados

Mostrar al usuario:

```markdown
## Optimización Completada ✅

### Cambios implementados:
- Mutaciones quirúrgicas en store (addItem, updateItem, toggleItem, removeItem)
- Facade actualizado para usar mutaciones en lugar de loadData()
- Actualización incremental de estadísticas (sin refetch)
- Persistencia de estado de tabla (sessionStorage)

### Estrategias por operación:
- **Crear**: Refetch solo items (mantiene stats, sin resetear skeletons)
- **Editar**: Mutación local (sin refetch)
- **Toggle**: Mutación local + stats incrementales
- **Eliminar**: Mutación local + stats incrementales

### Performance:
- Mejora estimada: ~90-95% más rápido
- Requests HTTP reducidos: ~40%
- Tabla mantiene estado en todas las operaciones

### Testing:
✅ Editar NO recarga tabla
✅ Toggle NO recarga tabla
✅ Eliminar NO recarga tabla
✅ Crear solo recarga lista
✅ Estadísticas actualizadas correctamente
```

## Reglas importantes

1. **SIEMPRE** leer los archivos antes de modificar
2. **NUNCA** agregar `Co-Authored-By` en commits
3. **SIEMPRE** verificar nombres de campos de estadísticas (ej: `usuariosActivos` vs `totalActivos`)
4. **SIEMPRE** usar `stateKey` único por tabla
5. **SIEMPRE** usar `this.log.info()` para debug en mutaciones
6. **SIEMPRE** mantener el patrón de comentarios en facade (// CREAR, // EDITAR, etc.)

## Notas adicionales

- Si el feature NO tiene estadísticas, omitir actualización incremental
- Si el toggle NO es de estado, adaptar el nombre del método (ej: `toggleItemVisibilidad`)
- Si hay múltiples tipos de items, agregar lógica para cada tipo en stats
- Para relaciones complejas, considerar refetch parcial en lugar de mutación local

## Referencia

Ver documentación completa en: `@.claude/rules/crud-optimization.md`
