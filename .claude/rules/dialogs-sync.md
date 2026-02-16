# Sincronización de Estado en Diálogos y Drawers

## ⚠️ ANTI-PATRÓN CRÍTICO: NUNCA usar @if con Overlays

**REGLA FUNDAMENTAL**: Los componentes overlay de PrimeNG (`p-dialog`, `p-drawer`, `p-confirmDialog`, `p-sidebar`) **NUNCA** deben estar envueltos en `@if`.

### ❌ INCORRECTO - Envolver en @if

```html
<!-- ❌ NO HACER ESTO -->
@if (vm().dialogVisible) {
  <p-dialog [visible]="vm().dialogVisible">
    <!-- ... -->
  </p-dialog>
}

@if (vm().drawerVisible) {
  <p-drawer [visible]="vm().drawerVisible">
    <!-- ... -->
  </p-drawer>
}
```

### ✅ CORRECTO - Siempre en el DOM

```html
<!-- ✅ CORRECTO - Dialog siempre en el DOM -->
<p-dialog [visible]="vm().dialogVisible" (visibleChange)="onDialogVisibleChange($event)">
  <!-- ... -->
</p-dialog>

<!-- ✅ CORRECTO - Drawer siempre en el DOM -->
<p-drawer [visible]="vm().drawerVisible" (visibleChange)="onDrawerVisibleChange($event)">
  <!-- ... -->
</p-drawer>

<!-- ✅ CORRECTO - ConfirmDialog siempre en el DOM -->
<p-confirmDialog (onHide)="onConfirmDialogHide()" />
```

### Por qué es un problema

| Síntoma | Causa |
| ------- | ----- |
| **Scroll desaparece** | Angular destruye el componente antes de que PrimeNG pueda limpiar `overflow: hidden` del body |
| **Timing issues** | El componente no existe cuando se intenta abrir (primer clic falla) |
| **Cleanup incompleto** | PrimeNG no puede ejecutar su lógica de limpieza al destruirse |
| **Backdrop queda visible** | El modal-mask no se elimina correctamente |

### Costo de tenerlo siempre en DOM

**Bajo**: Un dialog cerrado solo agrega ~200 bytes al DOM. PrimeNG no renderiza el contenido cuando `[visible]="false"`.

```html
<!-- Con visible=false, Angular NO evalúa el contenido interno -->
<p-dialog [visible]="false">
  <div><!-- Esto NO se renderiza hasta visible=true --></div>
</p-dialog>
```

**Beneficio vs Costo**: El overhead es mínimo, pero previene bugs críticos de UX.

---

## Problema de Sincronización

Los componentes de PrimeNG (Dialog, Drawer, ConfirmDialog, Sidebar) pueden cerrarse de múltiples formas:

1. ✅ Clic en botón "Cancelar" → Estado sincronizado
2. ❌ Clic en "X" → Estado puede quedar desincronizado
3. ❌ Clic fuera del modal (backdrop) → Estado puede quedar desincronizado
4. ❌ Tecla ESC → Estado puede quedar desincronizado

### Síntoma

```typescript
// Store
dialogVisible = true;

// Usuario presiona ESC o cierra con X
// El dialog se cierra visualmente...
// PERO dialogVisible sigue en true ❌
```

**Consecuencias:**
- El estado no refleja la realidad
- Si el usuario intenta abrir el dialog de nuevo, puede no funcionar
- Lógica dependiente del estado falla

---

## Solución: Patrón de Sincronización

### ❌ INCORRECTO - Two-way binding

```html
<!-- El problema con [(visible)] -->
<p-dialog [(visible)]="vm().dialogVisible">
  <!-- ... -->
</p-dialog>
```

**Por qué falla:**
- `[(visible)]` es two-way binding (sintaxis de Angular)
- Cuando el usuario cierra con X/ESC/backdrop, PrimeNG actualiza el binding
- PERO no hay garantía de que el store se actualice correctamente
- El binding solo actualiza la propiedad directamente, no llama métodos del facade

### ✅ CORRECTO - Event handlers explícitos

```html
<!-- Separar [visible] y (visibleChange) -->
<p-dialog
  [visible]="vm().dialogVisible"
  (visibleChange)="onDialogVisibleChange($event)"
>
  <!-- ... -->
</p-dialog>
```

```typescript
// En el componente
onDialogVisibleChange(visible: boolean): void {
  if (!visible) {
    // Siempre sincronizar con el facade/store
    this.facade.closeDialog();
  }
}
```

---

## Patrón Universal para Todos los Diálogos

### 1. Dialog (p-dialog)

#### Template

```html
<p-dialog
  [visible]="vm().dialogVisible"
  (visibleChange)="onDialogVisibleChange($event)"
  [modal]="true"
>
  <!-- Contenido -->
  <ng-template #footer>
    <button pButton (click)="closeDialog()">Cancelar</button>
    <button pButton (click)="save()">Guardar</button>
  </ng-template>
</p-dialog>
```

#### Component

```typescript
export class MyComponent {
  private facade = inject(MyFacade);
  readonly vm = this.facade.vm;

  /**
   * Handler para sincronizar estado del dialog
   * Se dispara cuando se cierra por cualquier medio:
   * - X, ESC, backdrop, botón cancelar
   */
  onDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeDialog();
    }
  }

  closeDialog(): void {
    this.facade.closeDialog();
  }

  save(): void {
    this.facade.save();
  }
}
```

---

### 2. Drawer (p-drawer)

#### Template

```html
<p-drawer
  [visible]="vm().drawerVisible"
  (visibleChange)="onDrawerVisibleChange($event)"
  position="right"
  [modal]="true"
>
  <!-- Contenido -->
</p-drawer>
```

#### Component

```typescript
onDrawerVisibleChange(visible: boolean): void {
  if (!visible) {
    this.facade.closeDrawer();
  }
}
```

---

### 3. ConfirmDialog (p-confirmDialog)

ConfirmDialog es especial porque no usa `[(visible)]`, usa el servicio `ConfirmationService`.

#### Template

**CRÍTICO**: NUNCA envolver `<p-confirmDialog>` en `@if`. El componente debe estar siempre en el DOM.

```html
<!-- ✅ CORRECTO - Siempre en el DOM -->
<p-confirmDialog (onHide)="onConfirmDialogHide()" />

<!-- ❌ INCORRECTO - Envuelto en @if -->
@if (vm().confirmDialogVisible) {
  <p-confirmDialog (onHide)="onConfirmDialogHide()" />
}
```

**Por qué:** Si el componente no está en el DOM cuando se llama `confirmationService.confirm()`, el diálogo no se mostrará. Esto causa timing issues donde el primer clic no funciona (renderiza el componente) pero el segundo sí (componente ya en DOM).

#### Component

**IMPORTANTE**: El estado se cierra **solo** en `onConfirmDialogHide`, no en los callbacks de `accept`/`reject`.

```typescript
export class MyComponent {
  private confirmationService = inject(ConfirmationService);
  private facade = inject(MyFacade);

  deleteItem(item: Item): void {
    const header = 'Confirmar Eliminación';

    // ✅ Paso 1: Abrir estado ANTES de mostrar el diálogo
    this.facade.openConfirmDialog();

    // ✅ Paso 2: Mostrar confirm dialog
    this.confirmationService.confirm({
      message: `¿Eliminar ${item.name}?`,
      header,
      accept: () => {
        this.facade.delete(item);
        // ❌ NO cerrar aquí - se cierra en onConfirmDialogHide
      },
      reject: () => {
        // ❌ NO cerrar aquí - se cierra en onConfirmDialogHide
      },
    });
  }

  /**
   * Handler para cerrar estado cuando se cierra por cualquier medio
   * - Accept
   * - Reject
   * - ESC
   * - Backdrop
   */
  onConfirmDialogHide(): void {
    this.facade.closeConfirmDialog();
  }
}
```

**Por qué NO cerrar en accept/reject:**

| Problema | Solución |
|----------|----------|
| ❌ Llamadas duplicadas a `closeConfirmDialog()` | ✅ Un solo punto de cierre: `onConfirmDialogHide` |
| ❌ Race condition si usuario cierra con ESC y luego hace clic rápido | ✅ El cierre está centralizado |
| ❌ Estado puede quedar inconsistente | ✅ Siempre se cierra cuando el diálogo desaparece |
```

---

### 4. Sidebar (p-sidebar)

#### Template

```html
<p-sidebar
  [visible]="vm().sidebarVisible"
  (visibleChange)="onSidebarVisibleChange($event)"
  position="left"
>
  <!-- Contenido -->
</p-sidebar>
```

#### Component

```typescript
onSidebarVisibleChange(visible: boolean): void {
  if (!visible) {
    this.facade.closeSidebar();
  }
}
```

---

## Store Pattern

### Estado de UI para diálogos

```typescript
@Injectable({ providedIn: 'root' })
export class MyStore {
  // Estados de visibilidad
  private readonly _dialogVisible = signal(false);
  private readonly _drawerVisible = signal(false);
  private readonly _confirmDialogVisible = signal(false);

  readonly dialogVisible = this._dialogVisible.asReadonly();
  readonly drawerVisible = this._drawerVisible.asReadonly();
  readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();

  // Comandos
  openDialog(): void {
    this._dialogVisible.set(true);
  }

  closeDialog(): void {
    this._dialogVisible.set(false);
  }

  openDrawer(): void {
    this._drawerVisible.set(true);
  }

  closeDrawer(): void {
    this._drawerVisible.set(false);
  }

  openConfirmDialog(): void {
    this._confirmDialogVisible.set(true);
  }

  closeConfirmDialog(): void {
    this._confirmDialogVisible.set(false);
  }
}
```

---

## Facade Pattern

### Comandos de UI

```typescript
@Injectable({ providedIn: 'root' })
export class MyFacade {
  private store = inject(MyStore);

  readonly vm = this.store.vm;

  // Dialog
  openNewDialog(): void {
    this.store.clearFormData();
    this.store.openDialog();
  }

  openEditDialog(item: Item): void {
    this.store.setFormData(item);
    this.store.openDialog();
  }

  closeDialog(): void {
    this.store.closeDialog();
    // ✅ Opcional: Limpiar datos del formulario
    this.store.clearFormData();
  }

  // Drawer
  openDrawer(item: Item): void {
    this.store.setSelectedItem(item);
    this.store.openDrawer();
  }

  closeDrawer(): void {
    this.store.closeDrawer();
    // ✅ Opcional: Limpiar selección
    this.store.clearSelectedItem();
  }

  // ConfirmDialog
  openConfirmDialog(): void {
    this.store.openConfirmDialog();
  }

  closeConfirmDialog(): void {
    this.store.closeConfirmDialog();
  }
}
```

---

## Checklist de Implementación

Para cualquier componente con diálogos:

### 1. Template

```
✅ Separar [visible] y (visibleChange)
✅ NO usar [(visible)]
✅ Agregar handler (visibleChange)="onXxxVisibleChange($event)"
✅ Para ConfirmDialog: (onHide)="onConfirmDialogHide()"
```

### 2. Component

```
✅ Agregar método onXxxVisibleChange(visible: boolean)
✅ Dentro del handler: if (!visible) { facade.closeXxx() }
✅ Para ConfirmDialog: onConfirmDialogHide() { facade.closeConfirmDialog() }
```

### 3. Store

```
✅ Signal privado: _dialogVisible = signal(false)
✅ Readonly público: dialogVisible = this._dialogVisible.asReadonly()
✅ Comandos: openDialog(), closeDialog()
```

### 4. Facade

```
✅ Métodos de apertura: openDialog(), openDrawer(), etc.
✅ Métodos de cierre: closeDialog(), closeDrawer(), etc.
✅ Opcional: Limpiar datos al cerrar (formData, selectedItem, etc.)
```

---

## Casos de Uso Comunes

### Dialog con formulario

```typescript
// Facade
closeDialog(): void {
  this.store.closeDialog();
  this.store.clearFormData(); // ✅ Limpiar formulario
}
```

### Drawer con detalles

```typescript
// Facade
closeDrawer(): void {
  this.store.closeDrawer();
  this.store.clearSelectedItem(); // ✅ Limpiar selección
}
```

### ConfirmDialog con operación asíncrona

```typescript
// Component
deleteItem(item: Item): void {
  this.facade.openConfirmDialog();

  this.confirmationService.confirm({
    message: `¿Eliminar ${item.name}?`,
    accept: () => {
      this.facade.delete(item); // Async operation
      this.facade.closeConfirmDialog();
    },
    reject: () => {
      this.facade.closeConfirmDialog();
    },
  });
}
```

---

## Testing

### Verificar sincronización

```typescript
// Simular cierre con ESC
component.onDialogVisibleChange(false);
expect(facade.closeDialog).toHaveBeenCalled();

// Simular cierre con backdrop
component.onDrawerVisibleChange(false);
expect(facade.closeDrawer).toHaveBeenCalled();

// Simular cierre de confirm dialog
component.onConfirmDialogHide();
expect(facade.closeConfirmDialog).toHaveBeenCalled();
```

---

## Resumen

| Acción del Usuario | Sin Patrón | Con Patrón |
|--------------------|------------|------------|
| Clic en Cancelar | ✅ Sincronizado | ✅ Sincronizado |
| Clic en X | ❌ Desincronizado | ✅ Sincronizado |
| Clic en backdrop | ❌ Desincronizado | ✅ Sincronizado |
| Presionar ESC | ❌ Desincronizado | ✅ Sincronizado |

**Beneficios:**
- ✅ Estado siempre sincronizado
- ✅ Lógica centralizada en facade
- ✅ Fácil de testear
- ✅ Consistente en toda la app
- ✅ Sin edge cases

**Aplicar en:**
- `p-dialog`
- `p-drawer`
- `p-sidebar`
- `p-confirmDialog` (con `onHide`)
- `p-overlayPanel` (con `onHide`)
- Cualquier componente overlay de PrimeNG

---

## Checklist Final de Validación

### ❌ RED FLAGS - CORREGIR INMEDIATAMENTE

```text
[ ] ¿Hay algún @if envolviendo <p-dialog>? → ELIMINAR @if
[ ] ¿Hay algún @if envolviendo <p-drawer>? → ELIMINAR @if
[ ] ¿Hay algún @if envolviendo <p-confirmDialog>? → ELIMINAR @if
[ ] ¿Se usa [(visible)] en lugar de [visible]? → SEPARAR en [visible] y (visibleChange)
[ ] ¿El scroll desaparece al cerrar dialogs? → Verificar que NO haya @if
```

### ✅ PATRÓN CORRECTO

```typescript
// Template
<p-dialog
  [visible]="vm().dialogVisible"  ✅ One-way binding
  (visibleChange)="onDialogVisibleChange($event)"  ✅ Event handler
>
  <!-- ... -->
</p-dialog>

// Component
onDialogVisibleChange(visible: boolean): void {
  if (!visible) {
    this.facade.closeDialog();  ✅ Sincroniza con store
  }
}

// Store
private readonly _dialogVisible = signal(false);  ✅ Privado
readonly dialogVisible = this._dialogVisible.asReadonly();  ✅ Readonly

// Facade
closeDialog(): void {
  this.store.closeDialog();  ✅ Método explícito
  this.store.clearFormData();  ✅ Cleanup opcional
}
```

### 🔍 Comandos de Búsqueda (para Code Review)

```bash
# Buscar anti-patrón @if con overlays
grep -r "@if.*dialogVisible\|@if.*drawerVisible\|@if.*confirmDialogVisible" src/

# Buscar two-way binding incorrecto
grep -r "\[\(visible\)\]" src/

# Verificar que p-confirmDialog esté siempre en DOM
grep -r "<p-confirmDialog" src/
```
