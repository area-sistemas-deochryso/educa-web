# CRUD Patterns — Store, Facade, Enforcement

> Consolida: mutaciones quirúrgicas, base abstractions, enforcement de errores comunes y quality gate.

## Principios

- **"No recargar lo que puedes actualizar quirúrgicamente."**
- **"Si 80% del código es idéntico entre features, el 80% debería vivir en una base class."**
- **"Funciona es condición necesaria, no suficiente."**

---

## Estrategias CRUD por Operación

| Operación | Estrategia | Refetch | Stats |
|-----------|-----------|---------|-------|
| **Crear** | Refetch items only | ✅ Items | ✅ Incremental |
| **Editar** | Mutación local | ❌ No | ❌ No |
| **Toggle** | Mutación local | ❌ No | ✅ Incremental |
| **Eliminar** | Mutación local | ❌ No | ✅ Incremental |

> Si tienes el ID y sabes qué cambió, no necesitas refetch.

---

## Store Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class MiStore {
  // #region Estado privado
  private readonly _items = signal<Item[]>([]);
  private readonly _loading = signal(false);
  private readonly _dialogVisible = signal(false);
  // #endregion

  // #region Lecturas públicas
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly dialogVisible = this._dialogVisible.asReadonly();
  // #endregion

  // #region Mutaciones quirúrgicas
  setItems(items: Item[]): void { this._items.set(items); }
  addItem(item: Item): void { this._items.update(list => [item, ...list]); }
  updateItem(id: number, updates: Partial<Item>): void {
    this._items.update(list => list.map(i => i.id === id ? { ...i, ...updates } : i));
  }
  removeItem(id: number): void {
    this._items.update(list => list.filter(i => i.id !== id));
  }
  toggleEstado(id: number): void {
    this._items.update(list => list.map(i => i.id === id ? { ...i, estado: !i.estado } : i));
  }
  incrementarEstadistica(campo: keyof Stats, delta: number): void {
    this._estadisticas.update(s => s ? { ...s, [campo]: s[campo] + delta } : s);
  }
  // #endregion
}
```

## Facade Pattern

### Facade simple (features pequeños)

```typescript
@Injectable({ providedIn: 'root' })
export class MiFacade {
  // CREAR: Refetch solo items (necesitamos ID del servidor)
  create(data: CreateData): void {
    this.api.create(data).subscribe({
      next: () => {
        this.refreshItemsOnly();
        this.store.incrementarEstadistica('total', 1);
      },
    });
  }

  // EDITAR: Mutación quirúrgica (no refetch)
  update(id: number, data: UpdateData): void {
    this.api.update(id, data).subscribe({
      next: () => this.store.updateItem(id, data),
    });
  }

  // TOGGLE/ELIMINAR: Mutación quirúrgica + stats incrementales
  // (mismo patrón que editar)
}
```

### Multi-Facade (features CRUD admin complejos)

Para módulos con muchas responsabilidades, dividir en 3 facades:

| Facade | Archivo | Responsabilidad |
|--------|---------|----------------|
| **Data** | `*-data.facade.ts` | Carga: `loadEstadisticas()`, `loadItems()`, `refreshItemsOnly()` |
| **CRUD** | `*-crud.facade.ts` | Operaciones: `save()`, `delete()`, `toggle()`, `importar()` |
| **UI** | `*-ui.facade.ts` | Estado UI: `openNewDialog()`, `openEditDialog()`, `openDetailDrawer()` |

```typescript
// Data facade — solo carga
@Injectable({ providedIn: 'root' })
export class MiDataFacade {
  loadEstadisticas(): void { /* ... */ }
  loadItems(): void { /* ... */ }
  refreshItemsOnly(): void { /* ... */ }
}

// CRUD facade — operaciones con WAL
@Injectable({ providedIn: 'root' })
export class MiCrudFacade {
  private walHelper = inject(WalFacadeHelper);

  save(data: FormData): void {
    if (this.store.isEditing()) {
      this.update(this.store.selectedItem()!.id, data);
    } else {
      this.create(data);
    }
  }

  delete(item: Item): void {
    this.walHelper.execute({
      operation: 'DELETE',
      resourceType: 'items',
      request$: this.api.delete(item.id),
      onCommit: () => {
        this.store.removeItem(item.id);
        this.store.incrementarEstadistica('total', -1);
      },
    });
  }
}

// UI facade — dialogs y drawers
@Injectable({ providedIn: 'root' })
export class MiUiFacade {
  openNewDialog(): void { this.store.clearFormData(); this.store.openDialog(); }
  openEditDialog(item: Item): void { /* ... */ }
  closeDialog(): void { this.store.closeDialog(); }
}
```

> **Cuándo dividir**: Cuando un solo facade supera ~200 líneas o tiene 3+ responsabilidades distintas (data, crud, ui). Features simples usan 1 facade.

### WAL Integration (Write-Ahead Log)

Las operaciones de mutación usan `WalFacadeHelper` para optimistic updates con rollback:

```typescript
this.walHelper.execute({
  operation: 'UPDATE',
  resourceType: 'items',
  request$: this.api.update(id, data),
  onCommit: () => this.store.updateItem(id, data),
  onError: (error) => this.errorHandler.handle(error),
});
```

Ubicación del helper: `@core/services/wal/wal-facade-helper.ts`

---

## BaseCrudStore (para features CRUD admin estándar)

Ubicación: `@core/store/base/base-crud.store.ts`. Incluye: loading/error signals, dialog visibility, CRUD mutations, estadísticas incrementales, form data management.

### Cuándo usar vs no usar

| ✅ SÍ usar | ❌ NO usar |
|---|---|
| CRUD admin estándar (listar, crear, editar, toggle, eliminar) | Dashboard, Chat, Calendario |
| Tiene dialog + confirmDialog | Wizard multi-step |
| Tiene estadísticas | Read-only (Reportes, Kardex) |

### Store concreto extiende base

```typescript
@Injectable({ providedIn: 'root' })
export class CursosStore extends BaseCrudStore<CursoListaDto, CursoFormData, CursosEstadisticas> {
  protected getDefaultFormData(): CursoFormData { return { nombre: '', nivel: null }; }
  // Solo código ESPECÍFICO de cursos
}
```

---

## Anti-Patrones a Prevenir

### 1. God Component (estado + HTTP + lógica + UI en componente)
**Fix**: Siempre Facade + Store para módulos CRUD admin.

### 2. Signal público mutable en store
**Fix**: `private readonly _signal` + `.asReadonly()` + métodos de mutación.

### 3. Funciones/getters en template
**Fix**: Siempre `computed()`. Excepción: event handlers `(click)="save()"`.

### 4. `loadData()` después de editar/toggle/eliminar
**Fix**: Mutación quirúrgica local. Solo refetch en CREAR.

### 5. `confirm()` nativo del navegador
**Fix**: PrimeNG `p-confirmDialog` con `ConfirmationService`. Siempre en DOM, nunca en `@if`.

### 6. `appendTo="body"` faltante en dropdowns
**Fix**: SIEMPRE en `p-select`, `p-multiselect`, `p-calendar`.

### 7. Templates repetitivos 3x+
**Fix**: Extraer sub-componente presentacional.

### 8. `any` en código nuevo
**Fix**: Tipar correctamente. `unknown` en catch es aceptable.

### 9. ViewModel con 50+ propiedades
**Fix**: Agrupar en sub-ViewModels por responsabilidad.

### 10. `.subscribe()` sin `takeUntilDestroyed`
**Fix**: Todo `.subscribe()` en components y facades DEBE tener `.pipe(takeUntilDestroyed(this.destroyRef))`. Inyectar `DestroyRef` si no existe.

---

## Límites de Tamaño

| Tipo | OK | Warning | Bloqueo |
|------|-------|---------|---------|
| Funciones | ≤ 30 ln | 31-50 ln | > 50 ln |
| Archivos TS | ≤ 200 ln | 201-350 ln | > 500 ln |
| Templates HTML | ≤ 150 ln | 151-250 ln | > 250 ln |
| Backend (Service) | ≤ 300 ln | 300-600 ln | > 1000 ln |

---

## Checklist Pre-Push

```
ARQUITECTURA
[ ] CRUD admin usa Facade + Store? (no god component)
[ ] Signals privados con asReadonly() en stores?
[ ] Component solo consume facade?
[ ] Mutaciones quirúrgicas para edit/toggle/delete?

TEMPLATE
[ ] No hay funciones en bindings? (solo computed/signals)
[ ] Bloques repetidos 3x+ en sub-componentes?
[ ] Dropdowns tienen appendTo="body"?
[ ] Botones solo-icono tienen aria-label vía pt?
[ ] Dialogs NO dentro de @if?

CALIDAD
[ ] Ninguna función > 50 líneas?
[ ] Ningún archivo > 500 líneas?
[ ] No hay any en código nuevo?
[ ] No se modificó funcionalidad existente sin necesidad?
```
