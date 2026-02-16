# Lazy Rendering y Skeleton Screens

## Objetivo

Sistema genérico para mejorar **Speed Index** de Lighthouse usando skeleton screens y renderizado progresivo.

---

## Componente Base: `<app-lazy-content>`

Wrapper genérico que maneja automáticamente skeleton → contenido real.

### API

```typescript
@Component({
  selector: 'app-lazy-content',
})
export class LazyContentComponent {
  readonly loading = input<boolean>(false);      // Estado de carga
  readonly minHeight = input<number | undefined>();  // Altura mínima (evita CLS)
  readonly hideDelay = input<number>(50);        // Delay antes de ocultar skeleton
}
```

### Anatomía

```html
<app-lazy-content [loading]="loading()" [minHeight]="420">
  <!-- Skeleton (mostrado mientras loading=true) -->
  <ng-template #skeleton>
    <app-my-custom-skeleton />
  </ng-template>

  <!-- Contenido real (mostrado cuando loading=false) -->
  <ng-template #content>
    <p-table [value]="data()">...</p-table>
  </ng-template>
</app-lazy-content>
```

---

## Patrones de Uso

### 1. Tabla con datos

```html
<!-- ✅ PATRÓN: Tabla -->
<app-lazy-content [loading]="vm().loading" [minHeight]="420">
  <ng-template #skeleton>
    <app-table-skeleton [rows]="10" [columns]="6" />
  </ng-template>

  <ng-template #content>
    <p-table
      [value]="vm().filteredData"
      [paginator]="true"
      [rows]="10"
    >
      <!-- ... -->
    </p-table>
  </ng-template>
</app-lazy-content>
```

**Cuándo usar**: Cualquier tabla que carga datos desde API.

**Skeleton sugerido**: Replica la estructura de la tabla (header + N filas).

---

### 2. Stats Cards / KPIs

```html
<!-- ✅ PATRÓN: Stats Cards -->
<app-lazy-content [loading]="vm().statsLoading" [minHeight]="140">
  <ng-template #skeleton>
    <div class="stats-grid">
      @for (_ of [1,2,3,4]; track $index) {
        <div class="stat-card">
          <app-skeleton-loader variant="text" width="80px" height="14px" />
          <app-skeleton-loader variant="text" width="60px" height="32px" />
          <app-skeleton-loader variant="text" width="120px" height="12px" />
        </div>
      }
    </div>
  </ng-template>

  <ng-template #content>
    <div class="stats-grid">
      @for (stat of vm().stats; track stat.id) {
        <div class="stat-card">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.value }}</span>
        </div>
      }
    </div>
  </ng-template>
</app-lazy-content>
```

**Cuándo usar**: Dashboards, KPIs, métricas que cargan desde API.

**Skeleton sugerido**: Grid de cards con texto placeholder.

---

### 3. Filtros que dependen de data

```html
<!-- ✅ PATRÓN: Filtros -->
<app-lazy-content [loading]="vm().filtersLoading" [minHeight]="60">
  <ng-template #skeleton>
    <div class="filters-row">
      <app-skeleton-loader variant="rect" width="200px" height="40px" />
      <app-skeleton-loader variant="rect" width="150px" height="40px" />
      <app-skeleton-loader variant="rect" width="150px" height="40px" />
    </div>
  </ng-template>

  <ng-template #content>
    <div class="filters-row">
      <p-select
        [options]="vm().rolesOptions"
        [(ngModel)]="selectedRol"
        placeholder="Filtrar por rol"
      />
      <p-select
        [options]="vm().estadoOptions"
        [(ngModel)]="selectedEstado"
        placeholder="Estado"
      />
      <button pButton label="Aplicar" (click)="applyFilters()" />
    </div>
  </ng-template>
</app-lazy-content>
```

**Cuándo usar**: Filtros que necesitan opciones desde API (roles, categorías, etc.).

**Skeleton sugerido**: Rectángulos del tamaño de los dropdowns/inputs.

---

### 4. Dialog/Modal con datos

```html
<!-- ✅ PATRÓN: Dialog -->
<p-dialog [(visible)]="vm().dialogVisible" [modal]="true">
  <app-lazy-content [loading]="vm().detailLoading" [minHeight]="300">
    <ng-template #skeleton>
      <div class="detail-skeleton">
        <app-skeleton-loader variant="circle" width="80px" height="80px" />
        <app-skeleton-loader variant="text" width="200px" height="24px" />
        <app-skeleton-loader variant="text" width="150px" height="16px" />
        <!-- ... más campos -->
      </div>
    </ng-template>

    <ng-template #content>
      <div class="detail-content">
        <img [src]="vm().detail.avatar" width="80" height="80" />
        <h2>{{ vm().detail.nombre }}</h2>
        <p>{{ vm().detail.descripcion }}</p>
        <!-- ... más campos -->
      </div>
    </ng-template>
  </app-lazy-content>
</p-dialog>
```

**Cuándo usar**: Diálogos que cargan detalles desde API al abrirse.

**Skeleton sugerido**: Estructura similar al contenido real (avatar, textos, etc.).

---

### 5. Containers/Sections dinámicas

```html
<!-- ✅ PATRÓN: Container con múltiples elementos -->
<app-lazy-content [loading]="vm().sectionLoading" [minHeight]="500">
  <ng-template #skeleton>
    <div class="section-skeleton">
      <app-skeleton-loader variant="text" width="300px" height="32px" />
      <div class="grid">
        @for (_ of [1,2,3,4,5,6]; track $index) {
          <app-skeleton-loader variant="card" height="200px" />
        }
      </div>
    </div>
  </ng-template>

  <ng-template #content>
    <div class="section">
      <h2>{{ vm().section.title }}</h2>
      <div class="grid">
        @for (item of vm().section.items; track item.id) {
          <app-item-card [item]="item" />
        }
      </div>
    </div>
  </ng-template>
</app-lazy-content>
```

**Cuándo usar**: Secciones completas que dependen de datos (grids, listas, galerías).

**Skeleton sugerido**: Grid de cards o lista de items.

---

## Renderizado Progresivo (Multi-Fase)

Para páginas con múltiples secciones que cargan en secuencia.

### Store Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class MyPageStore {
  // Estados por fase
  private readonly _statsReady = signal(false);
  private readonly _filtersReady = signal(false);
  private readonly _tableReady = signal(false);

  readonly statsReady = this._statsReady.asReadonly();
  readonly filtersReady = this._filtersReady.asReadonly();
  readonly tableReady = this._tableReady.asReadonly();

  // Comandos
  setStatsReady(ready: boolean): void {
    this._statsReady.set(ready);
  }

  setFiltersReady(ready: boolean): void {
    this._filtersReady.set(ready);
  }

  setTableReady(ready: boolean): void {
    this._tableReady.set(ready);
  }
}
```

### Facade Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class MyPageFacade {
  private store = inject(MyPageStore);
  private api = inject(MyApiService);

  loadData(): void {
    // Fase 1: Stats (rápido)
    this.api.getStats().subscribe(stats => {
      this.store.setStats(stats);
      this.store.setStatsReady(true);

      // Fase 2: Filters (medio)
      this.api.getFilterOptions().subscribe(options => {
        this.store.setFilterOptions(options);
        this.store.setFiltersReady(true);

        // Fase 3: Table (pesado)
        this.api.getData().subscribe(data => {
          this.store.setData(data);
          this.store.setTableReady(true);
        });
      });
    });
  }
}
```

### Template Pattern

```html
<!-- Fase 1: Stats -->
<app-lazy-content [loading]="!vm().statsReady" [minHeight]="140">
  <ng-template #skeleton>
    <app-stats-skeleton />
  </ng-template>
  <ng-template #content>
    <app-stats [data]="vm().stats" />
  </ng-template>
</app-lazy-content>

<!-- Fase 2: Filters -->
<app-lazy-content [loading]="!vm().filtersReady" [minHeight]="60">
  <ng-template #skeleton>
    <app-filters-skeleton />
  </ng-template>
  <ng-template #content>
    <app-filters [options]="vm().filterOptions" />
  </ng-template>
</app-lazy-content>

<!-- Fase 3: Table -->
<app-lazy-content [loading]="!vm().tableReady" [minHeight]="420">
  <ng-template #skeleton>
    <app-table-skeleton />
  </ng-template>
  <ng-template #content>
    <p-table [value]="vm().data">...</p-table>
  </ng-template>
</app-lazy-content>
```

---

## Skeletons Reutilizables

### Skeleton Base (`SkeletonLoaderComponent`)

```html
<!-- Texto -->
<app-skeleton-loader variant="text" width="200px" height="16px" />

<!-- Círculo (avatares) -->
<app-skeleton-loader variant="circle" width="48px" height="48px" />

<!-- Rectángulo (botones, inputs) -->
<app-skeleton-loader variant="rect" width="120px" height="40px" />

<!-- Card -->
<app-skeleton-loader variant="card" height="200px" />
```

### Skeletons Compuestos (por dominio)

Crear skeletons específicos para cada sección:

```typescript
// app/features/usuarios/components/usuarios-table-skeleton.component.ts
@Component({
  selector: 'app-usuarios-table-skeleton',
  template: `
    <div class="table-skeleton">
      <!-- Header -->
      <div class="header-row">
        @for (_ of [1,2,3,4,5]; track $index) {
          <app-skeleton-loader variant="text" width="80%" height="16px" />
        }
      </div>
      <!-- Rows -->
      @for (_ of [1,2,3,4,5,6,7,8,9,10]; track $index) {
        <div class="data-row">
          <app-skeleton-loader variant="circle" width="40px" height="40px" />
          <app-skeleton-loader variant="text" width="60%" height="16px" />
          <app-skeleton-loader variant="rect" width="80px" height="24px" />
        </div>
      }
    </div>
  `,
})
export class UsuariosTableSkeletonComponent {}
```

---

## Checklist de Implementación

Para agregar lazy rendering a cualquier componente:

### 1. Identificar secciones cargables

```
[ ] ¿Esta sección carga datos desde API?
[ ] ¿Es una tabla/lista?
[ ] ¿Son filtros que dependen de opciones dinámicas?
[ ] ¿Es un diálogo que carga detalles?
[ ] ¿Es un container con datos variables?
```

### 2. Agregar estado de carga al Store

```typescript
// En el store
private readonly _sectionReady = signal(false);
readonly sectionReady = this._sectionReady.asReadonly();

setSectionReady(ready: boolean): void {
  this._sectionReady.set(ready);
}
```

### 3. Actualizar estado en el Facade

```typescript
// En el facade
loadData(): void {
  this.api.getData().subscribe(data => {
    this.store.setData(data);
    this.store.setSectionReady(true); // ✅ Marcar como lista
  });
}
```

### 4. Crear skeleton específico

```typescript
// components/my-section-skeleton.component.ts
@Component({
  selector: 'app-my-section-skeleton',
  template: `
    <!-- Réplica visual de la sección -->
  `,
})
export class MySectionSkeletonComponent {}
```

### 5. Envolver contenido en `<app-lazy-content>`

```html
<app-lazy-content [loading]="!vm().sectionReady" [minHeight]="420">
  <ng-template #skeleton>
    <app-my-section-skeleton />
  </ng-template>
  <ng-template #content>
    <!-- Contenido real -->
  </ng-template>
</app-lazy-content>
```

### 6. Verificar métricas

```bash
npx lighthouse http://localhost:4201/my-page --view
```

✅ Speed Index < 2.5s
✅ CLS < 0.1
✅ LCP < 2.5s

---

## Buenas Prácticas

### ✅ DO

| Práctica | Descripción |
|----------|-------------|
| **Espacio reservado** | Siempre usar `minHeight` para evitar CLS |
| **Skeleton realista** | Que replique la estructura del contenido real |
| **Renderizado progresivo** | Crítico primero, pesado después |
| **Skeletons por dominio** | Crear skeletons específicos reutilizables |
| **Loading granular** | Un estado de loading por sección |

### ❌ DON'T

| Anti-patrón | Por qué |
|-------------|---------|
| Sin `minHeight` | Causa layout shifts (CLS alto) |
| Skeleton genérico | No replica la UI real |
| Todo junto | Bloquea Speed Index |
| Loading global | No permite renderizado progresivo |
| Sin delay al ocultar | Puede causar flash de contenido |

---

## Resumen

**Para cualquier sección que cargue datos:**

1. ✅ Crear skeleton específico
2. ✅ Agregar estado `sectionReady` al store
3. ✅ Actualizar estado cuando data llegue (facade)
4. ✅ Envolver en `<app-lazy-content>`
5. ✅ Reservar espacio con `minHeight`
6. ✅ Verificar métricas en Lighthouse

**Resultado**: Speed Index alto, CLS bajo, mejor UX.
