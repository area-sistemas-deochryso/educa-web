# Comentarios en Código

## Principio fundamental

> **"Comentarios mínimos pero útiles que permitan ubicar fácilmente qué se hace."**

Los comentarios deben:
- ✅ Facilitar la navegación rápida del código
- ✅ Explicar el "por qué", no el "qué" (cuando el código no es obvio)
- ✅ Marcar secciones lógicas
- ❌ NO describir lo obvio
- ❌ NO ser redundantes con el código

---

## Cuándo comentar

### ✅ SÍ comentar

| Situación | Ejemplo |
|-----------|---------|
| **Secciones lógicas** | Agrupar bloques relacionados |
| **Decisiones no obvias** | Por qué se eligió un approach específico |
| **Workarounds** | Soluciones temporales o hacks necesarios |
| **Validaciones complejas** | Reglas de negocio no evidentes |
| **APIs públicas** | Servicios, métodos públicos, interfaces |

### ❌ NO comentar

| Situación | Por qué |
|-----------|---------|
| Código auto-explicativo | `// Incrementar contador` antes de `count++` |
| Nombres descriptivos | Si la variable/función explica su propósito |
| Código temporal | Comentar código en lugar de eliminarlo |
| Obviedades | `// Constructor` antes del constructor |

---

## Patrones por tipo de archivo

### TypeScript - Servicios y Stores

```typescript
// ============ Estado privado ============
private readonly _users = signal<User[]>([]);
private readonly _loading = signal(false);

// ============ Lecturas públicas (readonly) ============
readonly users = this._users.asReadonly();
readonly loading = this._loading.asReadonly();

// ============ Computed - Validaciones ============
readonly emailError = computed(() => {
  // Validar formato de email
  const email = this._formData().email || '';
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? null : 'Formato de email inválido';
});

// ============ Comandos de mutación ============
setUsers(users: User[]): void {
  this._users.set(users);
}

/**
 * Mutación quirúrgica: Actualizar un usuario específico sin refetch
 */
updateUser(id: number, updates: Partial<User>): void {
  this._users.update((users) =>
    users.map((u) => (u.id === id ? { ...u, ...updates } : u))
  );
}
```

**Reglas para servicios/stores**:
- ✅ Separadores de sección con `// ============`
- ✅ Documentar mutaciones quirúrgicas con `/** */`
- ✅ Comentar validaciones no obvias
- ❌ NO comentar getters/setters simples

### TypeScript - Componentes

```typescript
export class UserFormComponent {
  private facade = inject(UsersFacade);
  private userProfile = inject(UserProfileService);

  // ============ Signals del store ============
  readonly users = this.facade.users;
  readonly loading = this.facade.loading;

  // ============ Estado local del componente ============
  readonly isExpanded = signal(false);
  readonly selectedId = signal<string | null>(null);

  // ============ Computed - UI state ============
  readonly canEditPassword = computed(() =>
    this.userProfile.userRole() === 'Director'
  );

  readonly isEmpty = computed(() => this.users().length === 0);

  // ============ Lifecycle ============
  ngOnInit(): void {
    this.facade.loadUsers();
  }

  // ============ Event handlers ============
  onSave(): void {
    this.facade.saveUser(this.formData());
  }

  onCancel(): void {
    this.facade.closeDialog();
  }

  // ============ Helpers privados ============
  private validateForm(): boolean {
    // Lógica de validación específica del componente
    return true;
  }
}
```

**Reglas para componentes**:
- ✅ Separar secciones: Signals, Estado local, Computed, Lifecycle, Handlers, Helpers
- ✅ Comentar computed complejos
- ❌ NO comentar cada método event handler obvio

### TypeScript - Facades

```typescript
export class UsersFacade {
  private api = inject(UsersApiService);
  private store = inject(UsersStore);

  // ============ Exponer estado del store ============
  readonly users = this.store.users;
  readonly loading = this.store.loading;
  readonly vm = this.store.vm;

  // ============ Comandos CRUD ============

  /**
   * CREAR: Refetch para obtener ID del servidor + actualizar stats
   */
  create(data: CreateData): void {
    this.store.setLoading(true);
    this.api.create(data).subscribe({
      next: () => {
        this.refreshItemsOnly();
        this.store.incrementarEstadistica('total', 1);
      },
      error: (err) => this.handleError(err),
    });
  }

  /**
   * EDITAR: Mutación quirúrgica (no refetch)
   */
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

  /**
   * ELIMINAR: Mutación quirúrgica + stats incrementales
   */
  delete(item: Item): void {
    this.api.delete(item.id).subscribe({
      next: () => {
        this.store.removeItem(item.id);
        this.store.incrementarEstadistica('total', -1);
      },
      error: (err) => this.handleError(err),
    });
  }

  // ============ Helpers privados ============
  private refreshItemsOnly(): void {
    // Refetch solo items sin resetear skeletons ni stats
    this.api.getAll().subscribe((items) => {
      this.store.setItems(items);
      this.store.setLoading(false);
    });
  }
}
```

**Reglas para facades**:
- ✅ Documentar estrategia de cada operación CRUD (refetch vs mutación)
- ✅ Separar secciones: Estado expuesto, Comandos, Helpers
- ✅ Explicar por qué se hace refetch o mutación local

### HTML Templates

```html
<!-- ============ Header ============ -->
<div class="header">
  <h1>{{ title() }}</h1>
</div>

<!-- ============ Stats cards ============ -->
<div class="stats-grid">
  @for (stat of stats(); track stat.id) {
    <app-stat-card [data]="stat" />
  }
</div>

<!-- ============ Filtros ============ -->
<div class="filters">
  <!-- Filtro por rol -->
  <p-select
    [options]="rolesOptions()"
    [(ngModel)]="selectedRole"
    placeholder="Filtrar por rol"
  />

  <!-- Filtro por estado -->
  <p-select
    [options]="estadoOptions"
    [(ngModel)]="selectedEstado"
    placeholder="Estado"
  />
</div>

<!-- ============ Tabla principal ============ -->
<p-table
  [value]="filteredUsers()"
  [paginator]="true"
  [rows]="10"
  stateStorage="session"
  stateKey="users-table-state"
>
  <!-- Columnas -->
  <ng-template pTemplate="header">
    <tr>
      <th>Nombre</th>
      <th>Email</th>
      <th>Acciones</th>
    </tr>
  </ng-template>

  <!-- Filas -->
  <ng-template pTemplate="body" let-user>
    <tr>
      <td>{{ user.nombre }}</td>
      <td>{{ user.email }}</td>
      <td>
        <!-- Editar -->
        <button
          pButton
          icon="pi pi-pencil"
          (click)="edit(user)"
          [pt]="{ root: { 'aria-label': 'Editar' } }"
        ></button>

        <!-- Eliminar -->
        <button
          pButton
          icon="pi pi-trash"
          (click)="delete(user)"
          [pt]="{ root: { 'aria-label': 'Eliminar' } }"
        ></button>
      </td>
    </tr>
  </ng-template>
</p-table>

<!-- ============ Dialogs ============ -->
<!-- Dialog para crear/editar -->
<app-user-form-dialog
  [visible]="dialogVisible()"
  (save)="onSave($event)"
  (cancel)="onCancel()"
/>

<!-- ConfirmDialog para eliminar -->
<p-confirmDialog />
```

**Reglas para templates**:
- ✅ Separar secciones visuales grandes: Header, Stats, Filtros, Tabla, Dialogs
- ✅ Comentar grupos de filtros o botones relacionados
- ✅ Comentar botones con solo iconos (además del aria-label)
- ❌ NO comentar cada binding simple
- ❌ NO comentar estructuras obvias de PrimeNG

### SCSS

```scss
// ============ Variables del componente ============
:host {
  display: block;
  padding: 1rem;
}

// ============ Header ============
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
  }
}

// ============ Stats grid ============
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

// ============ Tabla ============
::ng-deep {
  // Sobrescribir estilos de PrimeNG solo cuando sea necesario
  .p-datatable {
    .p-datatable-thead > tr > th {
      background-color: var(--surface-50);
    }
  }
}

// ============ Dialog ============
.dialog-content {
  padding: 1rem;

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;

    // Campo que ocupa 2 columnas
    .full-width {
      grid-column: 1 / -1;
    }
  }
}

// ============ Estados ============
.loading-state {
  opacity: 0.5;
  pointer-events: none;
}

.error-state {
  color: var(--red-500);
  padding: 1rem;
  border: 1px solid var(--red-300);
  border-radius: 4px;
}
```

**Reglas para SCSS**:
- ✅ Separar secciones por componente visual
- ✅ Comentar overrides de PrimeNG (::ng-deep)
- ✅ Comentar casos especiales (full-width, hacks necesarios)
- ❌ NO comentar cada propiedad CSS obvia

---

## Formato de comentarios

### Separadores de sección

```typescript
// ============ Nombre de la sección ============
```

**Usar para**:
- Agrupar bloques lógicos grandes
- Separar responsabilidades distintas
- Facilitar navegación rápida

### Comentarios inline

```typescript
// Comentario corto que explica por qué
const result = complexCalculation(); // Explicación si no es obvio
```

**Usar para**:
- Decisiones no obvias
- Workarounds necesarios
- Validaciones de negocio

### Documentación de métodos (JSDoc)

```typescript
/**
 * Descripción breve de qué hace el método
 *
 * @param id - ID del usuario a actualizar
 * @param updates - Campos a actualizar
 *
 * Nota: No hace refetch, usa mutación quirúrgica para mejor performance
 */
updateUser(id: number, updates: Partial<User>): void {
  // ...
}
```

**Usar para**:
- APIs públicas (métodos públicos de servicios)
- Métodos con lógica compleja
- Explicar estrategias de implementación

---

## Ejemplos completos

### ✅ CORRECTO - Comentarios útiles

```typescript
export class UsersStore {
  // ============ Estado privado ============
  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);

  // ============ Lecturas públicas ============
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();

  // ============ Computed - Derivados ============
  readonly activeUsers = computed(() =>
    this.users().filter((u) => u.active)
  );

  // ============ Validaciones ============
  readonly emailError = computed(() => {
    const email = this._formData().email || '';

    // Requerido para todos los roles excepto Estudiante
    if (!email && this.role() !== 'Estudiante') {
      return 'Email es obligatorio';
    }

    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Formato inválido';
  });

  // ============ Comandos de mutación ============

  /**
   * Mutación quirúrgica: actualiza solo el usuario especificado
   * sin refetch completo para mejor performance
   */
  updateUser(id: number, updates: Partial<User>): void {
    this._users.update((users) =>
      users.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  }
}
```

### ❌ INCORRECTO - Comentarios innecesarios

```typescript
export class UsersStore {
  // Signal privado de usuarios
  private readonly _users = signal<User[]>([]);

  // Signal privado de loading
  private readonly _loading = signal(false);

  // Getter público de usuarios
  readonly users = this._users.asReadonly();

  // Getter público de loading
  readonly loading = this._loading.asReadonly();

  // Computed que filtra usuarios activos
  readonly activeUsers = computed(() =>
    // Filtra el array de usuarios
    this.users().filter((u) => u.active) // Devuelve solo activos
  );

  // Método para actualizar usuario
  updateUser(id: number, updates: Partial<User>): void {
    // Actualiza el signal de usuarios
    this._users.update((users) =>
      // Mapea el array
      users.map((u) =>
        // Si el ID coincide
        (u.id === id
          // Devuelve el usuario actualizado
          ? { ...u, ...updates }
          // Sino devuelve el usuario sin cambios
          : u)
      )
    );
  }
}
```

---

## Reglas específicas por contexto

### Stores y Services

```
✅ Separar secciones con // ============
✅ Documentar mutaciones quirúrgicas con /** */
✅ Comentar validaciones de negocio complejas
✅ Explicar por qué no se hace refetch
❌ NO comentar cada getter/setter
❌ NO explicar código obvio de signals
```

### Components

```
✅ Separar: Signals, Estado local, Computed, Lifecycle, Handlers
✅ Comentar computed no triviales
✅ Documentar métodos de validación complejos
❌ NO comentar event handlers simples
❌ NO describir cada property
```

### Facades

```
✅ Documentar estrategia de cada operación CRUD
✅ Explicar cuándo se hace refetch vs mutación local
✅ Comentar helpers privados no obvios
❌ NO documentar métodos que solo delegan
```

### Templates HTML

```
✅ Separar secciones visuales grandes
✅ Comentar grupos de filtros/botones
✅ Explicar @if/@for con lógica compleja
❌ NO comentar cada binding
❌ NO describir estructura obvia de PrimeNG
```

### SCSS

```
✅ Separar por componente visual
✅ Comentar overrides de ::ng-deep
✅ Explicar hacks necesarios
❌ NO comentar cada propiedad CSS
❌ NO describir layouts obvios
```

---

## Checklist de revisión

Antes de commitear, verifica:

- [ ] ¿Hay separadores de sección donde ayudan a navegar?
- [ ] ¿Los comentarios explican "por qué" en lugar de "qué"?
- [ ] ¿Las decisiones no obvias están documentadas?
- [ ] ¿Los workarounds tienen explicación?
- [ ] ¿Las APIs públicas tienen JSDoc?
- [ ] ¿Se evitaron comentarios redundantes?
- [ ] ¿Se evitaron obviedades?
- [ ] ¿El código puede entenderse sin los comentarios?

---

## Resumen

| Tipo | Cuándo usar |
|------|-------------|
| `// ============` | Separadores de sección |
| `// Comentario` | Explicar "por qué" inline |
| `/** JSDoc */` | Documentar APIs públicas |
| ❌ Nada | Código auto-explicativo |

**Frase clave**: *"Comentar lo justo para navegar rápido y entender decisiones no obvias."*
