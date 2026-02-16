# Optimización de Templates

## Principio fundamental

> **No usar funciones en el template, solo valores predecibles**

El motor de Change Detection necesita valores que pueda comparar eficientemente. Las funciones se ejecutan en cada ciclo de detección.

## ✅ CORRECTO - Valores predecibles

```typescript
@Component({
  template: `
    <div>{{ userName() }}</div>                    <!-- Signal -->
    <div>{{ userAge }}</div>                       <!-- Property -->
    <div>{{ fullName }}</div>                      <!-- Computed signal -->
    <div>{{ users().length }}</div>                <!-- Signal con propiedad -->
    <div>{{ isActive() ? 'Activo' : 'Inactivo' }}</div>  <!-- Ternario simple -->
  `
})
export class UserComponent {
  // Signals - valores reactivos
  readonly userName = signal('Juan');
  readonly isActive = signal(true);
  readonly users = signal<User[]>([]);

  // Computed signals - valores derivados
  readonly fullName = computed(() =>
    `${this.firstName()} ${this.lastName()}`
  );

  // Properties - valores simples
  readonly userAge = 25;
}
```

## ❌ INCORRECTO - Funciones en template

```typescript
@Component({
  template: `
    <!-- ❌ Se ejecuta en cada change detection -->
    <div>{{ getUserName() }}</div>
    <div>{{ formatDate(date) }}</div>
    <div>{{ calculateTotal() }}</div>
    <div>{{ users.filter(u => u.active).length }}</div>
  `
})
export class UserComponent {
  getUserName(): string { /* ... */ }
  formatDate(date: Date): string { /* ... */ }
  calculateTotal(): number { /* ... */ }
}
```

## Solución: Computed signals o pipes puros

```typescript
@Component({
  template: `
    <!-- ✅ Computed signal -->
    <div>{{ userName() }}</div>
    <div>{{ formattedDate() }}</div>
    <div>{{ total() }}</div>
    <div>{{ activeUsersCount() }}</div>

    <!-- ✅ O usar pipe puro -->
    <div>{{ date | date:'short' }}</div>
  `
})
export class UserComponent {
  readonly userName = computed(() => this.user().name);
  readonly formattedDate = computed(() => formatDate(this.date()));
  readonly total = computed(() => this.items().reduce((sum, i) => sum + i.price, 0));
  readonly activeUsersCount = computed(() =>
    this.users().filter(u => u.active).length
  );
}
```

## Control Flow - Anidar correctamente @if @else

```typescript
// ✅ CORRECTO - Anidamiento claro
@Component({
  template: `
    @if (loading()) {
      <app-spinner />
    } @else if (error()) {
      <app-error [message]="error()" />
    } @else if (data().length === 0) {
      <app-empty-state />
    } @else {
      <app-data-list [items]="data()" />
    }
  `
})

// ❌ INCORRECTO - Múltiples @if separados
@Component({
  template: `
    @if (loading()) {
      <app-spinner />
    }
    @if (!loading() && error()) {
      <app-error />
    }
    @if (!loading() && !error() && data().length === 0) {
      <app-empty-state />
    }
    @if (!loading() && !error() && data().length > 0) {
      <app-data-list />
    }
  `
})
```

## @for - trackBy es MÁS IMPORTANTE que el recorrido

```typescript
// ✅ CORRECTO - trackBy con id único
@Component({
  template: `
    @for (user of users(); track user.id) {
      <app-user-card [user]="user" />
    }
  `
})

// ⚠️ ACEPTABLE - trackBy con $index si no hay id
@Component({
  template: `
    @for (item of items(); track $index) {
      <div>{{ item }}</div>
    }
  `
})

// ❌ INCORRECTO - Sin trackBy (rendimiento pobre)
@Component({
  template: `
    @for (user of users(); track user) {
      <app-user-card [user]="user" />
    }
  `
})
```

### Por qué trackBy es crítico

- Angular usa `track` para identificar elementos del array
- Con `track` correcto, Angular solo re-renderiza elementos que cambiaron
- Sin `track` o con `track` incorrecto, Angular re-renderiza TODO el array

```typescript
// Ejemplo del impacto
readonly users = signal<User[]>([]);

// Usuario agrega un nuevo user al final
this.users.update(users => [...users, newUser]);

// ✅ Con track user.id: Solo renderiza el nuevo card
// ❌ Sin track: Re-renderiza TODOS los cards (lento)
```

## Pipes - Prácticamente siempre usar pipes puros

### ✅ CORRECTO - Pipe puro (default)

```typescript
@Pipe({
  name: 'formatCurrency',
  standalone: true,
  pure: true  // Default - no hace falta especificarlo
})
export class FormatCurrencyPipe implements PipeTransform {
  transform(value: number): string {
    return `S/ ${value.toFixed(2)}`;
  }
}

// Uso en template
<div>{{ price() | formatCurrency }}</div>
```

### ❌ INCORRECTO - Pipe impuro (evitar)

```typescript
@Pipe({
  name: 'filterActive',
  standalone: true,
  pure: false  // ❌ Se ejecuta en cada change detection
})
export class FilterActivePipe implements PipeTransform {
  transform(users: User[]): User[] {
    return users.filter(u => u.active);
  }
}
```

### Solución: Computed signal en lugar de pipe impuro

```typescript
@Component({
  template: `
    <!-- ✅ Computed signal - solo recalcula cuando users cambia -->
    @for (user of activeUsers(); track user.id) {
      <app-user-card [user]="user" />
    }
  `
})
export class UsersComponent {
  readonly users = signal<User[]>([]);
  readonly activeUsers = computed(() =>
    this.users().filter(u => u.active)
  );
}
```

## Contenización - Aislar lo que no controlamos

> **Usar todo lo puro que se pueda y contenizar aquello que se desconoce o no depende de nosotros**

### Wrapper components para librerías externas

```typescript
// ✅ CORRECTO - Wrapper component con Default
@Component({
  selector: 'app-external-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,  // NO OnPush
  template: `<div #chart></div>`
})
export class ExternalChartComponent {
  @ViewChild('chart') chartEl!: ElementRef;
  @Input() data!: ChartData;

  ngAfterViewInit(): void {
    // Código imperativo de librería externa
    new ExternalChart(this.chartEl.nativeElement, this.data);
  }
}

// El componente padre puede ser OnPush
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ExternalChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,  // ✅ OnPush aquí
  template: `
    <app-external-chart [data]="chartData()" />
  `
})
export class DashboardComponent {
  readonly chartData = signal<ChartData>({ /* ... */ });
}
```

## Resumen de decisiones

| Situación | Solución |
|-----------|----------|
| Valor derivado de signals | `computed()` |
| Transformación simple | Pipe puro |
| Filtrado/ordenamiento | `computed()` o pipe puro |
| Formateo complejo | Pipe puro + service helper |
| Librería externa | Wrapper component con Default |
| Lógica de negocio | Facade service + computed signals |
| Array rendering | `@for` con `track` único |
| Condicionales múltiples | `@if @else if @else` anidado |

## Antipatrones comunes

### ❌ Funciones getter

```typescript
// ❌ INCORRECTO
get userName(): string {
  return this.user().name.toUpperCase();
}

// ✅ CORRECTO
readonly userName = computed(() => this.user().name.toUpperCase());
```

### ❌ Métodos en template

```typescript
// ❌ INCORRECTO
<div>{{ getFullName(user) }}</div>

// ✅ CORRECTO
readonly fullName = computed(() =>
  `${this.user().firstName} ${this.user().lastName}`
);
<div>{{ fullName() }}</div>
```

### ❌ Lógica compleja en template

```typescript
// ❌ INCORRECTO
<div>
  {{ users().filter(u => u.role === 'admin').map(u => u.name).join(', ') }}
</div>

// ✅ CORRECTO
readonly adminNames = computed(() =>
  this.users()
    .filter(u => u.role === 'admin')
    .map(u => u.name)
    .join(', ')
);
<div>{{ adminNames() }}</div>
```

## Herramientas de debugging

### Angular DevTools

```bash
# Instalar extensión de Chrome/Firefox
# Ver:
# - Change Detection cycles
# - Component tree
# - Signals dependency graph
```

### OnPush debugging

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent {
  constructor() {
    if (isDevMode()) {
      // Verificar que OnPush funciona correctamente
      logger.debug('Component usando OnPush');
    }
  }
}
```
