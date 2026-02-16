# Lazy Rendering y Skeleton Screens

## Objetivo

Sistema genérico para mejorar **Speed Index** de Lighthouse usando skeleton screens y renderizado progresivo.

> **Regla complementaria**: Ver `@.claude/rules/skeletons.md` para los componentes shared de skeleton disponibles y la regla de uso obligatorio.

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
    <app-table-skeleton [columns]="columns" [rows]="10" />
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
<!-- ✅ PATRÓN: Tabla con shared skeleton -->
<app-lazy-content [loading]="vm().loading" [minHeight]="420">
  <ng-template #skeleton>
    <app-table-skeleton [columns]="tableColumns" [rows]="10" />
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

```typescript
// En el componente TS
readonly tableColumns: SkeletonColumnDef[] = [
  { width: '80px', cellType: 'text' },
  { width: 'flex', cellType: 'avatar-text' },
  { width: '100px', cellType: 'badge' },
  { width: '120px', cellType: 'actions' },
];
```

**Cuándo usar**: Cualquier tabla que carga datos desde API.

---

### 2. Stats Cards / KPIs

```html
<!-- ✅ PATRÓN: Stats Cards con shared skeleton -->
<app-lazy-content [loading]="vm().statsLoading" [minHeight]="140">
  <ng-template #skeleton>
    <app-stats-skeleton [count]="4" iconPosition="left" />
  </ng-template>

  <ng-template #content>
    <div class="stats-grid">
      @for (stat of vm().stats; track stat.id) {
        <app-stat-card [data]="stat" />
      }
    </div>
  </ng-template>
</app-lazy-content>
```

**Cuándo usar**: Dashboards, KPIs, métricas que cargan desde API.

---

### 3. Filtros que dependen de data

```html
<!-- ✅ PATRÓN: Filtros con skeleton-loader primitivas -->
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
        appendTo="body"
      />
      <p-select
        [options]="vm().estadoOptions"
        [(ngModel)]="selectedEstado"
        placeholder="Estado"
        appendTo="body"
      />
      <button pButton label="Aplicar" (click)="applyFilters()" />
    </div>
  </ng-template>
</app-lazy-content>
```

**Cuándo usar**: Filtros que necesitan opciones desde API (roles, categorías, etc.).

---

### 4. Dialog/Modal con datos

```html
<!-- ✅ PATRÓN: Dialog con skeleton-loader primitivas -->
<p-dialog
  [visible]="vm().dialogVisible"
  (visibleChange)="onDialogVisibleChange($event)"
  [modal]="true"
>
  <app-lazy-content [loading]="vm().detailLoading" [minHeight]="300">
    <ng-template #skeleton>
      <div class="detail-skeleton">
        <app-skeleton-loader variant="circle" width="80px" height="80px" />
        <app-skeleton-loader variant="text" width="200px" height="24px" />
        <app-skeleton-loader variant="text" width="150px" height="16px" />
      </div>
    </ng-template>

    <ng-template #content>
      <div class="detail-content">
        <img [src]="vm().detail.avatar" width="80" height="80" />
        <h2>{{ vm().detail.nombre }}</h2>
        <p>{{ vm().detail.descripcion }}</p>
      </div>
    </ng-template>
  </app-lazy-content>
</p-dialog>
```

**Cuándo usar**: Diálogos que cargan detalles desde API al abrirse.

---

### 5. Containers/Sections dinámicas

```html
<!-- ✅ PATRÓN: Container con skeleton-loader primitivas -->
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
    <app-stats-skeleton [count]="4" iconPosition="left" />
  </ng-template>
  <ng-template #content>
    <app-stats [data]="vm().stats" />
  </ng-template>
</app-lazy-content>

<!-- Fase 2: Filters -->
<app-lazy-content [loading]="!vm().filtersReady" [minHeight]="60">
  <ng-template #skeleton>
    <div class="filters-row">
      <app-skeleton-loader variant="rect" width="200px" height="40px" />
      <app-skeleton-loader variant="rect" width="150px" height="40px" />
    </div>
  </ng-template>
  <ng-template #content>
    <app-filters [options]="vm().filterOptions" />
  </ng-template>
</app-lazy-content>

<!-- Fase 3: Table -->
<app-lazy-content [loading]="!vm().tableReady" [minHeight]="420">
  <ng-template #skeleton>
    <app-table-skeleton [columns]="tableColumns" [rows]="10" />
  </ng-template>
  <ng-template #content>
    <p-table [value]="vm().data">...</p-table>
  </ng-template>
</app-lazy-content>
```

---

## Componentes Skeleton Shared

### Jerarquía de componentes

```
app-skeleton-loader           ← Primitiva base (text, circle, rect, card)
  ├── app-table-skeleton      ← Tablas configurables via SkeletonColumnDef[]
  └── app-stats-skeleton      ← Cards de estadísticas configurables
```

Ver `@.claude/rules/skeletons.md` para documentación completa de:
- Tipos de celda disponibles (`SkeletonCellType`)
- Interfaz `SkeletonColumnDef`
- Inputs de cada componente
- Cómo mapear columnas de tabla real a skeleton
- Cómo extender el sistema con nuevos tipos

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

### 2. Elegir el skeleton apropiado

```
[ ] ¿Tabla? → app-table-skeleton con SkeletonColumnDef[]
[ ] ¿Stats cards? → app-stats-skeleton con config
[ ] ¿Filtros/inputs? → app-skeleton-loader variant="rect"
[ ] ¿Sección custom? → Composición con app-skeleton-loader
```

### 3. Agregar estado de carga al Store

```typescript
private readonly _sectionReady = signal(false);
readonly sectionReady = this._sectionReady.asReadonly();

setSectionReady(ready: boolean): void {
  this._sectionReady.set(ready);
}
```

### 4. Actualizar estado en el Facade

```typescript
loadData(): void {
  this.api.getData().subscribe(data => {
    this.store.setData(data);
    this.store.setSectionReady(true);
  });
}
```

### 5. Envolver contenido en `<app-lazy-content>`

```html
<app-lazy-content [loading]="!vm().sectionReady" [minHeight]="420">
  <ng-template #skeleton>
    <app-table-skeleton [columns]="columns" [rows]="10" />
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

- Speed Index < 2.5s
- CLS < 0.1
- LCP < 2.5s

---

## Buenas Prácticas

### DO

| Práctica | Descripción |
|----------|-------------|
| **Espacio reservado** | Siempre usar `minHeight` para evitar CLS |
| **Skeleton realista** | Que replique la estructura del contenido real |
| **Shared components** | Usar `app-table-skeleton` y `app-stats-skeleton` |
| **Renderizado progresivo** | Crítico primero, pesado después |
| **Loading granular** | Un estado de loading por sección |

### DON'T

| Anti-patrón | Por qué |
|-------------|---------|
| Sin `minHeight` | Causa layout shifts (CLS alto) |
| CSS de skeleton custom | Usar shared components |
| Todo junto | Bloquea Speed Index |
| Loading global | No permite renderizado progresivo |
| Spinner solo | No reserva espacio ni replica estructura |

---

## Resumen

**Para cualquier sección que cargue datos:**

1. Elegir skeleton apropiado (shared component o composición)
2. Agregar estado `sectionReady` al store
3. Actualizar estado cuando data llegue (facade)
4. Envolver en `<app-lazy-content>`
5. Reservar espacio con `minHeight`
6. Verificar métricas en Lighthouse

**Resultado**: Speed Index alto, CLS bajo, mejor UX.
