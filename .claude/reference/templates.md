# Optimización de Templates

## Principio fundamental

> **No usar funciones en el template, solo valores predecibles**

El motor de Change Detection necesita valores que pueda comparar eficientemente. Las funciones se ejecutan en cada ciclo de detección.

## Valores predecibles vs funciones en template

```typescript
// ✅ CORRECTO - Valores predecibles
template: `
  <div>{{ userName() }}</div>                    <!-- Signal -->
  <div>{{ fullName() }}</div>                    <!-- Computed signal -->
  <div>{{ users().length }}</div>                <!-- Signal con propiedad -->
  <div>{{ isActive() ? 'Activo' : 'Inactivo' }}</div>  <!-- Ternario simple -->
`

// ❌ INCORRECTO - Funciones en template (se ejecutan en CADA change detection)
template: `
  <div>{{ getUserName() }}</div>
  <div>{{ formatDate(date) }}</div>
  <div>{{ users.filter(u => u.active).length }}</div>
`
```

### Solución: siempre `computed()` o pipe puro

```typescript
// ❌ getter → ✅ computed
// get userName(): string { return this.user().name.toUpperCase(); }
readonly userName = computed(() => this.user().name.toUpperCase());

// ❌ método en template → ✅ computed
// {{ getFullName(user) }}
readonly fullName = computed(() => `${this.user().firstName} ${this.user().lastName}`);

// ❌ lógica inline → ✅ computed
// {{ users().filter(u => u.role === 'admin').map(u => u.name).join(', ') }}
readonly adminNames = computed(() =>
  this.users().filter(u => u.role === 'admin').map(u => u.name).join(', ')
);
```

**Excepción**: Event handlers `(click)="save()"` SÍ son métodos, no computed.

---

## Control Flow

```html
<!-- ✅ CORRECTO - @if/@else if encadenado -->
@if (loading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else if (data().length === 0) {
  <app-empty-state />
} @else {
  <app-data-list [items]="data()" />
}

<!-- ❌ INCORRECTO - Múltiples @if separados con condiciones redundantes -->
```

## @for - trackBy obligatorio

```html
<!-- ✅ track con id único -->
@for (user of users(); track user.id) { <app-user-card [user]="user" /> }

<!-- ⚠️ $index si no hay id -->
@for (item of items(); track $index) { <div>{{ item }}</div> }

<!-- ❌ Sin track correcto — re-renderiza TODO el array -->
```

Con `track user.id`, Angular solo re-renderiza elementos que cambiaron. Sin track correcto, re-renderiza TODOS.

---

## Pipes - Siempre puros

```typescript
// ✅ Pipe puro (default) — solo se ejecuta cuando el input cambia
@Pipe({ name: 'formatCurrency', standalone: true, pure: true })
export class FormatCurrencyPipe implements PipeTransform {
  transform(value: number): string { return `S/ ${value.toFixed(2)}`; }
}

// ❌ Pipe impuro (pure: false) — se ejecuta en CADA change detection
// Solución: usar computed() en lugar de pipe impuro
readonly activeUsers = computed(() => this.users().filter(u => u.active));
```

---

## Contenización - Aislar librerías externas

> **Usar todo lo puro que se pueda y contenizar aquello que se desconoce**

```typescript
// Wrapper con Default para librería externa
@Component({
  changeDetection: ChangeDetectionStrategy.Default,  // NO OnPush
  template: `<div #chart></div>`,
})
export class ExternalChartComponent { /* código imperativo */ }

// Componente padre puede ser OnPush
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-external-chart [data]="chartData()" />`,
})
export class DashboardComponent { }
```

---

## Resumen de decisiones

| Situación | Solución |
|-----------|----------|
| Valor derivado de signals | `computed()` |
| Transformación simple | Pipe puro |
| Filtrado/ordenamiento | `computed()` o pipe puro |
| Librería externa | Wrapper component con Default |
| Lógica de negocio | Facade service + computed signals |
| Array rendering | `@for` con `track` único |
| Condicionales múltiples | `@if @else if @else` anidado |
