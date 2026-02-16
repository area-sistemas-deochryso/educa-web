# Regiones en TypeScript (// #region)

## Principio fundamental

> **"Regiones para navegar rápido, no para esconder código."**

TypeScript soporta `// #region` y `// #endregion` nativamente. VS Code las renderiza como secciones colapsables en el editor.

---

## Sintaxis

```typescript
// #region Nombre de la sección
// ... código ...
// #endregion
```

VS Code muestra un icono de colapso (`▶`) al lado de `// #region`, permitiendo plegar toda la sección.

---

## Cuándo usar regiones

| Situación | Usar region |
|-----------|-------------|
| Archivo > 100 líneas con secciones lógicas claras | Si |
| Store con estado + computed + comandos | Si |
| Facade con triggers + effects + commands | Si |
| Componente con signals + lifecycle + handlers | Si |
| Archivo corto (< 80 lineas) con pocas secciones | No |
| Dentro de una función/método | No |

---

## Regiones vs Separadores `// ============`

Las regiones **reemplazan** los separadores `// ============` como mecanismo principal de organización.

```typescript
// ❌ ANTES - Solo visual, no colapsable
// ============ Estado privado ============
private readonly _users = signal<User[]>([]);
private readonly _loading = signal(false);

// ============ Lecturas públicas ============
readonly users = this._users.asReadonly();
readonly loading = this._loading.asReadonly();

// ✅ AHORA - Colapsable en VS Code
// #region Estado privado
private readonly _users = signal<User[]>([]);
private readonly _loading = signal(false);
// #endregion

// #region Lecturas públicas
readonly users = this._users.asReadonly();
readonly loading = this._loading.asReadonly();
// #endregion
```

---

## Regiones estándar por tipo de archivo

### Store (`.store.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class UsuariosStore {
  // #region Estado privado
  private readonly _usuarios = signal<Usuario[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _dialogVisible = signal(false);
  private readonly _formData = signal<Partial<Usuario>>({});
  // #endregion

  // #region Lecturas públicas (readonly)
  readonly usuarios = this._usuarios.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly dialogVisible = this._dialogVisible.asReadonly();
  readonly formData = this._formData.asReadonly();
  // #endregion

  // #region Computed
  readonly activeUsuarios = computed(() =>
    this.usuarios().filter((u) => u.estado)
  );

  readonly estadisticas = computed(() => ({
    total: this.usuarios().length,
    activos: this.activeUsuarios().length,
  }));
  // #endregion

  // #region ViewModel
  readonly vm = computed(() => ({
    usuarios: this.usuarios(),
    loading: this.loading(),
    error: this.error(),
    dialogVisible: this.dialogVisible(),
    estadisticas: this.estadisticas(),
  }));
  // #endregion

  // #region Comandos de mutación
  setUsuarios(usuarios: Usuario[]): void {
    this._usuarios.set(usuarios);
  }

  updateUsuario(id: number, updates: Partial<Usuario>): void {
    this._usuarios.update((list) =>
      list.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  }

  removeUsuario(id: number): void {
    this._usuarios.update((list) => list.filter((u) => u.id !== id));
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }
  // #endregion

  // #region Comandos de UI
  openDialog(): void {
    this._dialogVisible.set(true);
  }

  closeDialog(): void {
    this._dialogVisible.set(false);
    this._formData.set({});
  }

  setFormData(data: Partial<Usuario>): void {
    this._formData.set(data);
  }
  // #endregion
}
```

| Region | Contenido |
|--------|-----------|
| Estado privado | `private readonly _signal = signal(...)` |
| Lecturas publicas (readonly) | `.asReadonly()` expuestos |
| Computed | `computed()` derivados |
| ViewModel | `vm = computed(() => ({...}))` |
| Comandos de mutacion | Metodos `set*`, `update*`, `remove*` |
| Comandos de UI | Metodos `open*`, `close*`, `toggle*` |

---

### Facade (`.facade.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class UsuariosFacade {
  // #region Dependencias
  private api = inject(UsuariosApiService);
  private store = inject(UsuariosStore);
  private errorHandler = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  // #endregion

  // #region Estado expuesto
  readonly vm = this.store.vm;
  readonly loading = this.store.loading;
  // #endregion

  // #region Comandos CRUD
  loadUsuarios(): void {
    this.store.setLoading(true);
    this.api.getAll().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (data) => {
        this.store.setUsuarios(data);
        this.store.setLoading(false);
      },
      error: (err) => this.handleError(err),
    });
  }

  /**
   * CREAR: Refetch items only (necesita ID del servidor)
   */
  create(data: CreateUsuarioDto): void { /* ... */ }

  /**
   * EDITAR: Mutacion quirurgica (no refetch)
   */
  update(id: number, data: UpdateUsuarioDto): void { /* ... */ }

  /**
   * ELIMINAR: Mutacion quirurgica + stats incrementales
   */
  delete(item: Usuario): void { /* ... */ }
  // #endregion

  // #region Comandos de UI
  openNewDialog(): void {
    this.store.clearFormData();
    this.store.openDialog();
  }

  openEditDialog(item: Usuario): void {
    this.store.setFormData(item);
    this.store.openDialog();
  }

  closeDialog(): void {
    this.store.closeDialog();
  }
  // #endregion

  // #region Helpers privados
  private refreshItemsOnly(): void { /* ... */ }

  private handleError(err: unknown): void {
    logger.error('Error:', err);
    this.errorHandler.showError('Error', 'No se pudo completar la operacion');
    this.store.setLoading(false);
  }
  // #endregion
}
```

| Region | Contenido |
|--------|-----------|
| Dependencias | `inject()` de servicios |
| Estado expuesto | Signals/vm del store re-exportados |
| Comandos CRUD | `load`, `create`, `update`, `delete` |
| Comandos de UI | `openDialog`, `closeDialog`, etc. |
| Helpers privados | Metodos `private` de soporte |

---

### Component (`.component.ts`)

```typescript
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [/* ... */],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit {
  // #region Dependencias
  private facade = inject(UsuariosFacade);
  private confirmationService = inject(ConfirmationService);
  // #endregion

  // #region Estado del facade
  readonly vm = this.facade.vm;
  // #endregion

  // #region Estado local
  readonly searchQuery = signal('');
  readonly selectedTab = signal(0);
  // #endregion

  // #region Computed locales
  readonly filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.vm().usuarios.filter((u) =>
      u.nombre.toLowerCase().includes(query)
    );
  });
  // #endregion

  // #region Lifecycle
  ngOnInit(): void {
    this.facade.loadUsuarios();
  }
  // #endregion

  // #region Event handlers
  onSave(data: CreateUsuarioDto): void {
    this.facade.create(data);
  }

  onEdit(item: Usuario): void {
    this.facade.openEditDialog(item);
  }

  onDelete(item: Usuario): void {
    this.confirmationService.confirm({
      message: `Eliminar ${item.nombre}?`,
      accept: () => this.facade.delete(item),
    });
  }
  // #endregion

  // #region Dialog handlers
  onDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeDialog();
    }
  }
  // #endregion
}
```

| Region | Contenido |
|--------|-----------|
| Dependencias | `inject()` |
| Estado del facade | Signals/vm del facade |
| Estado local | Signals UI locales del componente |
| Computed locales | `computed()` del componente |
| Lifecycle | `ngOnInit`, `ngOnDestroy`, etc. |
| Event handlers | Metodos llamados desde template |
| Dialog handlers | Sincronizacion de overlays |

---

### Service API (`.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class UsuariosApiService {
  // #region Dependencias
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/usuarios`;
  // #endregion

  // #region Consultas (GET)
  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.baseUrl);
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/${id}`);
  }
  // #endregion

  // #region Comandos (POST/PUT/DELETE)
  create(data: CreateUsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(this.baseUrl, data);
  }

  update(id: number, data: UpdateUsuarioDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  // #endregion
}
```

| Region | Contenido |
|--------|-----------|
| Dependencias | `inject()`, URLs base |
| Consultas (GET) | Metodos de lectura |
| Comandos (POST/PUT/DELETE) | Metodos de escritura |

---

## Regiones en HTML templates

Para templates grandes (> 80 lineas), usar comentarios HTML con region:

```html
<!-- #region Header -->
<div class="header">
  <h1>{{ vm().title }}</h1>
  <button pButton label="Nuevo" (click)="onNew()"></button>
</div>
<!-- #endregion -->

<!-- #region Stats -->
<div class="stats-grid">
  @for (stat of vm().stats; track stat.id) {
    <app-stat-card [data]="stat" />
  }
</div>
<!-- #endregion -->

<!-- #region Filtros -->
<div class="filters">
  <p-select [options]="roles()" [(ngModel)]="selectedRole" appendTo="body" />
</div>
<!-- #endregion -->

<!-- #region Tabla -->
<p-table [value]="filteredItems()" [paginator]="true" [rows]="10">
  <!-- ... -->
</p-table>
<!-- #endregion -->

<!-- #region Dialogs -->
<p-dialog
  [visible]="vm().dialogVisible"
  (visibleChange)="onDialogVisibleChange($event)"
>
  <!-- ... -->
</p-dialog>

<p-confirmDialog (onHide)="onConfirmDialogHide()" />
<!-- #endregion -->
```

---

## Regiones en SCSS

```scss
// #region Variables y Host
:host {
  display: block;
  padding: 1rem;
}
// #endregion

// #region Header
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
// #endregion

// #region Stats grid
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
// #endregion

// #region Overrides PrimeNG
::ng-deep {
  .p-datatable .p-datatable-thead > tr > th {
    background-color: var(--surface-50);
  }
}
// #endregion

// #region Responsive
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
// #endregion
```

---

## Reglas de uso

### Si hacer

- Usar regiones en archivos > 100 lineas con secciones claras
- Nombrar regiones descriptivamente (no genericas)
- Mantener consistencia con las regiones estandar por tipo de archivo
- Colapsar regiones en VS Code para navegar rapido

### No hacer

- Regiones dentro de funciones/metodos
- Regiones para 1-2 lineas de codigo
- Regiones para esconder codigo muerto
- Nombres genericos como "Otros" o "Misc"

---

## Transicion desde separadores

Al editar archivos existentes, **reemplazar** separadores `// ============` por regiones gradualmente:

```typescript
// ❌ ANTES
// ============ Estado privado ============
private readonly _users = signal<User[]>([]);
// ============ Lecturas publicas ============
readonly users = this._users.asReadonly();

// ✅ AHORA
// #region Estado privado
private readonly _users = signal<User[]>([]);
// #endregion

// #region Lecturas publicas
readonly users = this._users.asReadonly();
// #endregion
```

**No mezclar** ambos estilos en el mismo archivo. Si tocas un archivo, migra todas las secciones a regiones.

---

## Checklist

```
[ ] Archivo > 100 lineas? → Usar regiones
[ ] Regiones siguen las estandar del tipo de archivo?
[ ] Nombres descriptivos (no genericos)?
[ ] No hay regiones dentro de funciones?
[ ] No hay mezcla de // ============ y // #region en el mismo archivo?
[ ] Cada region tiene su // #endregion correspondiente?
```
