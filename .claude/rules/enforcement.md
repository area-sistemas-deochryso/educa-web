# Enforcement — Errores Comunes a Prevenir

## Objetivo

> **"Las reglas existen pero no siempre se aplican. Este archivo lista los errores reales encontrados en el codebase para que NO se repitan."**

Este archivo complementa las reglas existentes con **checks concretos** basados en problemas detectados en code review.

---

## 1. Todo módulo CRUD admin DEBE usar Facade + Store

### ❌ Anti-patrón: "God Component"

Componentes que hacen todo internamente: estado, HTTP, lógica de negocio, UI.

```typescript
// ❌ INCORRECTO — Component hace todo
@Component({})
export class CursosComponent {
  cursos = signal<Curso[]>([]);        // ❌ Estado en componente
  loading = signal(false);              // ❌ Estado en componente
  dialogVisible = signal(false);        // ❌ UI state en componente

  loadData(): void {                    // ❌ HTTP directo
    this.cursosService.getCursos().subscribe(/*...*/);
  }

  saveCurso(): void {                   // ❌ Lógica de negocio en componente
    this.cursosService.crearCurso(data).subscribe(() => {
      this.loadData();                  // ❌ Refetch completo
    });
  }
}
```

### ✅ Patrón correcto: Facade + Store + Component

```
mi-feature/
├── mi-feature.component.ts       # Solo consume facade, delega todo
├── mi-feature.component.html
├── mi-feature.component.scss
├── components/                    # Sub-componentes presentacionales
│   ├── mi-feature-form-dialog/
│   └── mi-feature-table/
└── services/
    ├── mi-feature.store.ts        # Estado reactivo (signals privados)
    └── mi-feature.facade.ts       # Orquestación (RxJS → signals)
```

### Checklist antes de crear un módulo admin

```
[ ] ¿Tiene Store con signals privados + asReadonly()?
[ ] ¿Tiene Facade que orquesta API → Store?
[ ] ¿El componente solo consume facade.vm y llama facade.métodos()?
[ ] ¿Usa mutaciones quirúrgicas para editar/toggle/eliminar?
[ ] ¿Usa refetch solo para crear (necesita ID del servidor)?
```

---

## 2. Signals SIEMPRE privados en stores/services

### ❌ INCORRECTO

```typescript
@Injectable({ providedIn: 'root' })
export class MiStore {
  cursos = signal<Curso[]>([]);     // ❌ Público mutable
  loading = signal(false);           // ❌ Público mutable
  dialogVisible = signal(false);     // ❌ Público mutable
}
```

### ✅ CORRECTO

```typescript
@Injectable({ providedIn: 'root' })
export class MiStore {
  private readonly _cursos = signal<Curso[]>([]);
  readonly cursos = this._cursos.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  setCursos(cursos: Curso[]): void {
    this._cursos.set(cursos);
  }
}
```

**Excepción**: Signals en componentes para estado UI local (`isExpanded`, `searchTerm`) pueden ser públicos porque su scope es el componente mismo.

---

## 3. NUNCA funciones/getters en template — SIEMPRE computed

### ❌ INCORRECTO

```typescript
// Método en la clase
isFormValid(): boolean {
  return !!this.formData().nombre?.trim();
}
```

```html
<!-- Se ejecuta en CADA ciclo de Change Detection -->
<button [disabled]="!isFormValid()">Guardar</button>
```

### ✅ CORRECTO

```typescript
// Computed — se recalcula solo cuando las dependencias cambian
readonly isFormValid = computed(() => !!this.formData().nombre?.trim());
```

```html
<button [disabled]="!isFormValid()">Guardar</button>
```

### Búsqueda de violaciones

```bash
# Buscar métodos usados en template (no event handlers)
# Si un método retorna un valor y se usa en binding → debe ser computed
grep -r "\[disabled\]=\"!.*()\"" src/ --include="*.html"
grep -r "{{ .*() }}" src/ --include="*.html"
```

**Excepción**: Event handlers `(click)="save()"` SÍ son métodos, no computed.

---

## 4. NUNCA `loadData()` después de editar/toggle/eliminar

### ❌ INCORRECTO

```typescript
saveCurso(): void {
  this.api.update(id, data).subscribe(() => {
    this.loadData(); // ❌ Refetch completo
  });
}

toggleEstado(curso: Curso): void {
  this.api.toggle(curso.id).subscribe(() => {
    this.loadData(); // ❌ Refetch completo para 1 campo
  });
}
```

### ✅ CORRECTO

```typescript
// EDITAR → mutación quirúrgica
update(id: number, data: UpdateData): void {
  this.api.update(id, data).subscribe(() => {
    this.store.updateItem(id, data);    // Solo 1 fila
    this.store.setLoading(false);
  });
}

// TOGGLE → mutación quirúrgica
toggleEstado(item: Item): void {
  this.api.toggle(item.id).subscribe(() => {
    this.store.toggleItemEstado(item.id); // Solo 1 campo
    this.store.incrementarEstadistica('activos', item.estado ? -1 : 1);
  });
}

// CREAR → refetch solo items (necesita ID del servidor)
create(data: CreateData): void {
  this.api.create(data).subscribe(() => {
    this.refreshItemsOnly();              // Solo la lista, no stats ni skeletons
    this.store.incrementarEstadistica('total', 1);
  });
}
```

---

## 5. NUNCA `confirm()` nativo — SIEMPRE PrimeNG `p-confirmDialog`

### ❌ INCORRECTO

```typescript
deleteCurso(curso: Curso): void {
  if (confirm('¿Eliminar?')) {  // ❌ Diálogo nativo del navegador
    this.api.delete(curso.id).subscribe(/*...*/);
  }
}
```

### ✅ CORRECTO

```typescript
deleteCurso(curso: Curso): void {
  this.facade.openConfirmDialog();

  this.confirmationService.confirm({
    message: `¿Eliminar ${curso.nombre}?`,
    header: 'Confirmar Eliminación',
    accept: () => this.facade.delete(curso),
  });
}

onConfirmDialogHide(): void {
  this.facade.closeConfirmDialog();
}
```

```html
<!-- Siempre en el DOM, nunca dentro de @if -->
<p-confirmDialog (onHide)="onConfirmDialogHide()" />
```

---

## 6. `appendTo="body"` en TODOS los dropdowns sin excepción

### Búsqueda de violaciones

```bash
# Buscar p-select/p-multiselect/p-calendar SIN appendTo
grep -rn "<p-select" src/ --include="*.html" | grep -v "appendTo"
grep -rn "<p-multiselect" src/ --include="*.html" | grep -v "appendTo"
grep -rn "<p-calendar" src/ --include="*.html" | grep -v "appendTo"
```

Si aparece alguno sin `appendTo="body"`, es un bug.

---

## 7. Templates repetitivos → extraer sub-componente

### Regla: Si un bloque HTML se repite 3+ veces → sub-componente

```html
<!-- ❌ INCORRECTO — Mismo bloque repetido para Inicial, Primaria, Secundaria -->
@if (gradosInicial().length > 0) {
  <div class="grados-section">
    <h4><i class="pi pi-star"></i> Inicial</h4>
    <div class="grados-grid">
      @for (grado of selectedGradosInicial(); track grado.id) {
        <!-- 15 líneas de template -->
      }
    </div>
  </div>
}
<!-- Se repite 3x más para Primaria y Secundaria... -->
```

```html
<!-- ✅ CORRECTO — Sub-componente reutilizable -->
@for (nivel of niveles(); track nivel.key) {
  <app-grados-level-section
    [title]="nivel.title"
    [icon]="nivel.icon"
    [grados]="nivel.grados"
    [severity]="nivel.severity"
    (remove)="removeGrado($event)"
  />
}
```

### Umbral

| Repeticiones | Acción |
|-------------|--------|
| 1-2x | OK, dejar inline |
| 3x+ | Extraer sub-componente presentacional |
| 5x+ | Extraer + parametrizar con inputs |

---

## 8. Tipado estricto — NUNCA `any` en código nuevo

### ❌ INCORRECTO

```typescript
private calculateEstadisticas(horarios: any[]): void { // ❌ any
  const stats = {
    total: horarios.length,
  };
}

private handleApiError(err: any, accion: string): void { // ❌ any
  const mensaje = err?.error?.message;
}
```

### ✅ CORRECTO

```typescript
private calculateEstadisticas(horarios: HorarioResponseDto[]): void {
  const stats: HorariosEstadisticas = {
    total: horarios.length,
  };
}

private handleApiError(err: HttpErrorResponse | Error, accion: string): void {
  const mensaje = err instanceof HttpErrorResponse
    ? err.error?.message
    : err.message;
}
```

### Excepciones aceptables

- `$any()` en template para castear tipo genérico de child output → aceptable con comentario
- `unknown` en catch → aceptable (es el tipo correcto de catch)

---

## 9. ViewModel no debe exceder ~20 propiedades

### ❌ INCORRECTO — VM con 50+ propiedades

```typescript
readonly vm = computed(() => ({
  horarios: ...,
  horariosFiltrados: ...,
  horariosSemanales: ...,
  horarioDetalle: ...,
  estadisticas: ...,
  loading: ...,
  statsLoading: ...,
  detailLoading: ...,
  dialogVisible: ...,
  // ... 40 propiedades más
}));
```

### ✅ CORRECTO — Agrupar en sub-ViewModels

```typescript
// Sub-VMs agrupados por responsabilidad
readonly dataVm = computed(() => ({
  horarios: this.horarios(),
  horariosFiltrados: this.horariosFiltrados(),
  isEmpty: this.horarios().length === 0,
}));

readonly uiVm = computed(() => ({
  loading: this.loading(),
  dialogVisible: this.dialogVisible(),
  vistaActual: this.vistaActual(),
}));

readonly formVm = computed(() => ({
  formData: this.formData(),
  formValid: this.formValid(),
  wizardStep: this.wizardStep(),
}));

// VM principal compone los sub-VMs
readonly vm = computed(() => ({
  ...this.dataVm(),
  ...this.uiVm(),
  ...this.formVm(),
}));
```

**Beneficio**: Cada sub-VM solo se recalcula cuando sus dependencias cambian, no cuando cambia cualquier signal del store.

---

## Checklist de Code Review Frontend

Antes de aprobar cualquier PR en frontend:

```
ARQUITECTURA
[ ] ¿Módulo CRUD usa Facade + Store? (no god component)
[ ] ¿Signals son privados con asReadonly() en stores/services?
[ ] ¿Component solo consume facade, no hace HTTP directo?
[ ] ¿Usa mutaciones quirúrgicas? (no loadData después de edit/toggle/delete)

TEMPLATE
[ ] ¿No hay funciones/getters en bindings? (solo computed o signals)
[ ] ¿Bloques repetidos 3x+ están en sub-componentes?
[ ] ¿p-select/p-multiselect/p-calendar tienen appendTo="body"?
[ ] ¿Botones solo-icono tienen aria-label vía pt?
[ ] ¿Dialogs NO están dentro de @if?

TIPADO
[ ] ¿No hay any en código nuevo?
[ ] ¿VM tiene máximo ~20 propiedades o usa sub-VMs?

UI
[ ] ¿Usa p-confirmDialog en vez de confirm() nativo?
[ ] ¿Overlays usan [visible] + (visibleChange), no [(visible)]?
```
