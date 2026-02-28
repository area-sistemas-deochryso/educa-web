# Sincronización de Estado en Diálogos y Drawers

## ANTI-PATRÓN CRÍTICO: NUNCA usar @if con Overlays

**REGLA FUNDAMENTAL**: Los componentes overlay de PrimeNG (`p-dialog`, `p-drawer`, `p-confirmDialog`, `p-sidebar`) **NUNCA** deben estar envueltos en `@if`. Causa: scroll desaparece, timing issues, cleanup incompleto, backdrop queda visible.

Un dialog cerrado solo agrega ~200 bytes al DOM. PrimeNG no renderiza el contenido cuando `[visible]="false"`.

```html
<!-- ❌ INCORRECTO -->
@if (vm().dialogVisible) {
  <p-dialog [visible]="vm().dialogVisible">...</p-dialog>
}

<!-- ✅ CORRECTO - Siempre en el DOM -->
<p-dialog [visible]="vm().dialogVisible" (visibleChange)="onDialogVisibleChange($event)">
  ...
</p-dialog>
```

---

## Problema de Sincronización

Los overlays pueden cerrarse por X, backdrop o ESC sin actualizar el store. **Solución**: NUNCA usar `[(visible)]`, SIEMPRE separar `[visible]` y `(visibleChange)`.

---

## Patrón por Tipo de Overlay

### Dialog / Drawer / Sidebar

```html
<p-dialog
  [visible]="vm().dialogVisible"
  (visibleChange)="onDialogVisibleChange($event)"
  [modal]="true"
>
  <!-- Contenido -->
</p-dialog>
```

```typescript
onDialogVisibleChange(visible: boolean): void {
  if (!visible) {
    this.facade.closeDialog();
  }
}
```

El mismo patrón aplica para `p-drawer` y `p-sidebar` con `(visibleChange)`.

### ConfirmDialog (especial)

Siempre en el DOM, usa `ConfirmationService`. El estado se cierra **solo** en `onConfirmDialogHide`, NO en accept/reject.

```html
<!-- ✅ Siempre en el DOM, NUNCA dentro de @if -->
<p-confirmDialog (onHide)="onConfirmDialogHide()" />
```

```typescript
deleteItem(item: Item): void {
  this.facade.openConfirmDialog();

  this.confirmationService.confirm({
    message: `¿Eliminar ${item.name}?`,
    header: 'Confirmar Eliminación',
    accept: () => {
      this.facade.delete(item);
      // ❌ NO cerrar aquí - se cierra en onConfirmDialogHide
    },
  });
}

onConfirmDialogHide(): void {
  this.facade.closeConfirmDialog();
}
```

---

## Store Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class MyStore {
  private readonly _dialogVisible = signal(false);
  readonly dialogVisible = this._dialogVisible.asReadonly();

  openDialog(): void { this._dialogVisible.set(true); }
  closeDialog(): void { this._dialogVisible.set(false); }
  // Repetir para drawer, confirmDialog, etc.
}
```

## Facade Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class MyFacade {
  private store = inject(MyStore);
  readonly vm = this.store.vm;

  openNewDialog(): void {
    this.store.clearFormData();
    this.store.openDialog();
  }

  closeDialog(): void {
    this.store.closeDialog();
    this.store.clearFormData(); // Cleanup opcional
  }

  openConfirmDialog(): void { this.store.openConfirmDialog(); }
  closeConfirmDialog(): void { this.store.closeConfirmDialog(); }
}
```

---

## Checklist de Implementación

### Template
```
[ ] Separar [visible] y (visibleChange) - NO usar [(visible)]
[ ] Handler (visibleChange)="onXxxVisibleChange($event)"
[ ] ConfirmDialog: (onHide)="onConfirmDialogHide()"
[ ] NINGÚN overlay dentro de @if
```

### Component
```
[ ] onXxxVisibleChange(visible): if (!visible) { facade.closeXxx() }
[ ] onConfirmDialogHide(): facade.closeConfirmDialog()
```

### Store
```
[ ] Signal privado + asReadonly() para cada visibilidad
[ ] Comandos open/close explícitos
```

### Facade
```
[ ] Métodos de apertura/cierre que deleguen al store
[ ] Cleanup opcional al cerrar (formData, selectedItem)
```

---

## Búsqueda de Violaciones

```bash
# Buscar @if con overlays
grep -r "@if.*dialogVisible\|@if.*drawerVisible\|@if.*confirmDialogVisible" src/

# Buscar two-way binding incorrecto
grep -r "\[\(visible\)\]" src/
```

**Aplicar en**: `p-dialog`, `p-drawer`, `p-sidebar`, `p-confirmDialog`, `p-overlayPanel`, cualquier overlay PrimeNG.
