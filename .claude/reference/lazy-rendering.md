# Lazy Rendering y Skeleton Screens

## Objetivo

Sistema genérico para mejorar **Speed Index** de Lighthouse usando skeleton screens y renderizado progresivo.

> **Regla complementaria**: Ver `@.claude/rules/skeletons.md` para los componentes shared de skeleton disponibles.

---

## Componente Base: `<app-lazy-content>`

Wrapper genérico que maneja skeleton → contenido real.

```typescript
@Component({ selector: 'app-lazy-content' })
export class LazyContentComponent {
  readonly loading = input<boolean>(false);
  readonly minHeight = input<number | undefined>();
  readonly hideDelay = input<number>(50);
}
```

### Anatomía

```html
<app-lazy-content [loading]="loading()" [minHeight]="420">
  <ng-template #skeleton>
    <app-table-skeleton [columns]="columns" [rows]="10" />
  </ng-template>
  <ng-template #content>
    <p-table [value]="data()">...</p-table>
  </ng-template>
</app-lazy-content>
```

---

## 5 Patrones de Uso

### 1. Tabla con datos (ejemplo completo)

```html
<app-lazy-content [loading]="vm().loading" [minHeight]="420">
  <ng-template #skeleton>
    <app-table-skeleton [columns]="tableColumns" [rows]="10" />
  </ng-template>
  <ng-template #content>
    <p-table [value]="vm().filteredData" [paginator]="true" [rows]="10">...</p-table>
  </ng-template>
</app-lazy-content>
```

### 2. Stats Cards / KPIs

Usar `<app-stats-skeleton [count]="4" iconPosition="left" />` dentro de `#skeleton`. Para dashboards y métricas desde API.

### 3. Filtros dinámicos

Usar `<app-skeleton-loader variant="rect" width="200px" height="40px" />` para cada filtro. Para filtros con opciones desde API.

### 4. Dialog/Modal con datos

Envolver contenido del dialog en `<app-lazy-content>` con skeleton de primitivas (`circle`, `text`). Para diálogos que cargan detalles al abrirse.

### 5. Containers/Secciones dinámicas

Composición con `<app-skeleton-loader variant="card" />` en grid. Para secciones completas con grids, listas, galerías.

---

## Renderizado Progresivo (Multi-Fase)

Para páginas con múltiples secciones que cargan en secuencia.

### Store: un signal `ready` por fase

```typescript
private readonly _statsReady = signal(false);
private readonly _filtersReady = signal(false);
private readonly _tableReady = signal(false);
// + readonly + setters
```

### Facade: cargar en secuencia

```typescript
loadData(): void {
  this.api.getStats().subscribe(stats => {
    this.store.setStats(stats);
    this.store.setStatsReady(true);
    // Fase 2: filtros, luego Fase 3: tabla...
  });
}
```

### Template: cada fase independiente

```html
<app-lazy-content [loading]="!vm().statsReady" [minHeight]="140">
  <ng-template #skeleton><app-stats-skeleton [count]="4" /></ng-template>
  <ng-template #content><app-stats [data]="vm().stats" /></ng-template>
</app-lazy-content>

<app-lazy-content [loading]="!vm().tableReady" [minHeight]="420">
  <ng-template #skeleton><app-table-skeleton [columns]="cols" [rows]="10" /></ng-template>
  <ng-template #content><p-table [value]="vm().data">...</p-table></ng-template>
</app-lazy-content>
```

---

## Jerarquía de Skeleton Shared

```
app-skeleton-loader           <- Primitiva base (text, circle, rect, card)
  |-- app-table-skeleton      <- Tablas configurables via SkeletonColumnDef[]
  |-- app-stats-skeleton      <- Cards de estadísticas configurables
```

Ver `@.claude/rules/skeletons.md` para documentación completa.

---

## Checklist de Implementación

```
1. IDENTIFICAR
[ ] ¿Carga datos desde API? ¿Tabla, stats, filtros, dialog, container?

2. ELEGIR SKELETON
[ ] Tabla -> app-table-skeleton | Stats -> app-stats-skeleton | Custom -> app-skeleton-loader

3. STORE: agregar estado de carga
   private readonly _sectionReady = signal(false);

4. FACADE: actualizar estado cuando data llegue
   this.store.setSectionReady(true);

5. TEMPLATE: envolver en <app-lazy-content>
   [loading]="!vm().sectionReady" [minHeight]="420"

6. VERIFICAR MÉTRICAS
   Speed Index < 2.5s | CLS < 0.1 | LCP < 2.5s
```

### Reglas clave

- **SIEMPRE** usar `minHeight` para evitar CLS
- **SIEMPRE** usar shared components (no CSS custom de skeleton)
- **SIEMPRE** un estado de loading por sección (no loading global)
- **NUNCA** usar spinner solo (no reserva espacio ni replica estructura)
