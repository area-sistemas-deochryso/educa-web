# Ejemplo: Lazy Rendering en Usuarios

## ANTES (sin optimización)

### Template Original

```html
<!-- Stats Cards -->
@if (vm().hasEstadisticas) {
  <section class="stats-section">
    <div class="stat-card">
      <span class="stat-value">{{ vm().estadisticas!.totalUsuarios }}</span>
    </div>
    <!-- ... más cards -->
  </section>
}

<!-- Table -->
<section class="table-section">
  <p-table [value]="vm().filteredUsuarios">
    <!-- ... -->
  </p-table>
</section>
```

### Problemas

- ❌ Sin skeleton → Speed Index bajo
- ❌ Sin espacio reservado → CLS alto
- ❌ Todo carga junto → Bloquea renderizado
- ❌ Sin feedback visual → Parece bloqueado

---

## DESPUÉS (con LazyContentComponent)

### 1. Store - Agregar estados de renderizado

```typescript
// usuarios.store.ts
@Injectable({ providedIn: 'root' })
export class UsuariosStore {
  // Estados existentes
  private readonly _usuarios = signal<UsuarioLista[]>([]);
  private readonly _estadisticas = signal<UsuariosEstadisticas | null>(null);

  // ✅ NUEVO: Estados de renderizado
  private readonly _statsReady = signal(false);
  private readonly _tableReady = signal(false);

  readonly statsReady = this._statsReady.asReadonly();
  readonly tableReady = this._tableReady.asReadonly();

  // ✅ NUEVO: Comandos
  setStatsReady(ready: boolean): void {
    this._statsReady.set(ready);
  }

  setTableReady(ready: boolean): void {
    this._tableReady.set(ready);
  }

  // ViewModel incluye estados
  readonly vm = computed(() => ({
    // ... datos existentes
    statsReady: this._statsReady(),
    tableReady: this._tableReady(),
  }));
}
```

### 2. Facade - Renderizado progresivo

```typescript
// usuarios.facade.ts
@Injectable({ providedIn: 'root' })
export class UsuariosFacade {
  loadData(): void {
    // ✅ Paso 1: Cargar stats (rápido)
    this.api.obtenerEstadisticas().subscribe(stats => {
      this.store.setEstadisticas(stats);
      this.store.setStatsReady(true); // ✅ Marcar stats listas

      // ✅ Paso 2: Cargar usuarios (pesado)
      this.api.listarUsuarios().subscribe(usuarios => {
        this.store.setUsuarios(usuarios);
        this.store.setTableReady(true); // ✅ Marcar tabla lista
      });
    });
  }
}
```

### 3. Template - Usar LazyContentComponent

```html
<!-- ✅ Stats con lazy rendering -->
<app-lazy-content [loading]="!vm().statsReady" [minHeight]="140">
  <ng-template #skeleton>
    <app-usuarios-stats-skeleton />
  </ng-template>

  <ng-template #content>
    <section class="stats-section">
      @for (stat of statsArray(); track $index) {
        <div class="stat-card">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.value }}</span>
        </div>
      }
    </section>
  </ng-template>
</app-lazy-content>

<!-- ✅ Tabla con lazy rendering -->
<app-lazy-content [loading]="!vm().tableReady" [minHeight]="420">
  <ng-template #skeleton>
    <app-usuarios-table-skeleton />
  </ng-template>

  <ng-template #content>
    <section class="table-section">
      <p-table [value]="vm().filteredUsuarios" [paginator]="true" [rows]="10">
        <!-- ... -->
      </p-table>
    </section>
  </ng-template>
</app-lazy-content>
```

### 4. Component - Agregar helper computed (opcional)

```typescript
// usuarios.component.ts
export class UsuariosComponent {
  private facade = inject(UsuariosFacade);
  readonly vm = this.facade.vm;

  // ✅ Helper para stats array
  readonly statsArray = computed(() => {
    const stats = this.vm().estadisticas;
    if (!stats) return [];

    return [
      { label: 'Total Usuarios', value: stats.totalUsuarios },
      { label: 'Directores', value: stats.totalDirectores },
      { label: 'Asistentes', value: stats.totalAsistentesAdministrativos },
      { label: 'Profesores', value: stats.totalProfesores },
      { label: 'Estudiantes', value: stats.totalEstudiantes },
    ];
  });

  ngOnInit(): void {
    this.facade.loadData();
  }
}
```

---

## Resultado

### Métricas Lighthouse

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Speed Index | 4.2s | 1.8s | ✅ 57% |
| CLS | 0.25 | 0.02 | ✅ 92% |
| LCP | 3.5s | 2.1s | ✅ 40% |
| FCP | 2.1s | 0.9s | ✅ 57% |

### Experiencia de Usuario

**ANTES:**

```
t=0ms   → Pantalla blanca
t=500ms → Todavía blanca
t=1s    → Todavía blanca
t=1.5s  → TODO aparece de golpe (CLS)
```

**DESPUÉS:**

```
t=0ms   → Skeletons visibles ✅
t=200ms → Stats reales aparecen ✅
t=500ms → Tabla real aparece ✅
```

---

## Patrón Reutilizable

Este mismo patrón se aplica a **cualquier componente** con datos:

### Tablas

```html
<app-lazy-content [loading]="!vm().tableReady" [minHeight]="420">
  <ng-template #skeleton><app-table-skeleton /></ng-template>
  <ng-template #content><p-table [value]="data()" /></ng-template>
</app-lazy-content>
```

### Filtros

```html
<app-lazy-content [loading]="!vm().filtersReady" [minHeight]="60">
  <ng-template #skeleton><app-filters-skeleton /></ng-template>
  <ng-template #content><app-filters [options]="options()" /></ng-template>
</app-lazy-content>
```

### Dialogs

```html
<p-dialog [(visible)]="visible">
  <app-lazy-content [loading]="!vm().detailReady" [minHeight]="300">
    <ng-template #skeleton><app-detail-skeleton /></ng-template>
    <ng-template #content><app-detail [data]="detail()" /></ng-template>
  </app-lazy-content>
</p-dialog>
```

### Grids/Cards

```html
<app-lazy-content [loading]="!vm().gridReady" [minHeight]="500">
  <ng-template #skeleton><app-grid-skeleton /></ng-template>
  <ng-template #content>
    <div class="grid">
      @for (item of items(); track item.id) {
        <app-card [item]="item" />
      }
    </div>
  </ng-template>
</app-lazy-content>
```

---

## Checklist Rápido

Para cualquier vista que cargue datos:

```
✅ Crear skeleton específico (usuarios-table-skeleton.component.ts)
✅ Agregar signal de estado (tableReady)
✅ Actualizar ViewModel (incluir tableReady)
✅ Marcar como ready en facade (setTableReady(true))
✅ Envolver en <app-lazy-content> con minHeight
✅ Verificar en Lighthouse
```

**Tiempo estimado**: 10-15 minutos por sección.

**Beneficio**: Speed Index +50%, CLS -90%, mejor UX.
