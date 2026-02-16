# Skeleton Screens Obligatorios

## Principio fundamental

> **"Todo elemento UI que reciba datos cargados desde API DEBE tener espacio reservado y un skeleton."**

Sin excepciones. Si un componente muestra datos que se cargan asincrónicamente, debe reservar espacio (evitar CLS) y mostrar un skeleton mientras carga.

---

## Componentes Shared Disponibles

El sistema de skeletons se basa en **3 niveles** de componentes reutilizables:

### Nivel 1: `app-skeleton-loader` (Primitiva base)

Bloque atómico de skeleton. Todos los skeletons compuestos lo usan internamente.

```html
<!-- Texto -->
<app-skeleton-loader variant="text" width="200px" height="16px" />

<!-- Círculo (avatares) -->
<app-skeleton-loader variant="circle" width="48px" height="48px" />

<!-- Rectángulo (botones, inputs, badges) -->
<app-skeleton-loader variant="rect" width="120px" height="40px" />

<!-- Card -->
<app-skeleton-loader variant="card" height="200px" />
```

**Ubicación**: `@shared/components/skeleton-loader/`

### Nivel 2: `app-table-skeleton` (Tablas configurables)

Skeleton de tabla completamente configurable via column definitions.

```typescript
import { TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

// Definir columnas que replican la tabla real
readonly columns: SkeletonColumnDef[] = [
  { width: '80px', cellType: 'text' },
  { width: 'flex', cellType: 'avatar-text' },
  { width: '100px', cellType: 'badge' },
  { width: '120px', cellType: 'actions' },
];
```

```html
<app-table-skeleton [columns]="columns" [rows]="10" minHeight="420px" />
```

**Inputs disponibles**:

| Input | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| `columns` | `SkeletonColumnDef[]` | *requerido* | Definicion de columnas |
| `rows` | `number` | `10` | Filas de skeleton |
| `minHeight` | `string` | `'420px'` | Altura minima (reserva espacio) |
| `showHeader` | `boolean` | `true` | Mostrar fila de header |

**Tipos de celda (`SkeletonCellType`)**:

| Tipo | Renderiza | Uso tipico |
|------|-----------|------------|
| `text` | Barra de texto | Campos simples (DNI, fecha, numero) |
| `text-subtitle` | Texto principal + subtitulo | Nombre + info secundaria |
| `avatar-text` | Circulo + nombre + subtitulo | Columnas con avatar de usuario |
| `badge` | Rectangulo pequeno | Tags, estados, roles |
| `actions` | 3 circulos en fila | Botones de accion |

**Ubicacion**: `@shared/components/table-skeleton/`

### Nivel 2: `app-stats-skeleton` (Cards de estadisticas)

Skeleton de grid de cards de estadisticas configurable.

```html
<!-- 5 cards con icono a la derecha y descripcion -->
<app-stats-skeleton [count]="5" iconPosition="right" [showDescription]="true" />

<!-- 4 cards con icono a la izquierda, sin descripcion -->
<app-stats-skeleton [count]="4" iconPosition="left" />
```

**Inputs disponibles**:

| Input | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| `count` | `number` | `4` | Cantidad de cards |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Posicion del icono |
| `showDescription` | `boolean` | `false` | Mostrar linea de descripcion |
| `minColumnWidth` | `string` | `'200px'` | Ancho minimo de columna en grid |

**Ubicacion**: `@shared/components/stats-skeleton/`

---

## Regla de Uso Obligatorio

### Toda seccion que carga datos DEBE tener skeleton

| Tipo de seccion | Skeleton a usar |
|-----------------|-----------------|
| Tabla con datos | `app-table-skeleton` con `SkeletonColumnDef[]` |
| Cards de estadisticas/KPIs | `app-stats-skeleton` con config apropiada |
| Filtros con opciones dinamicas | `app-skeleton-loader` (variant `rect`) |
| Dialogs con detalle | `app-skeleton-loader` combinados |
| Grids/listas de cards | `app-skeleton-loader` (variant `card`) |
| Secciones custom unicas | Composicion con `app-skeleton-loader` |

---

## Patrones de Implementacion

### Patron 1: Tabla con skeleton (mas comun)

Para cualquier `p-table` que carga datos desde API.

**Paso 1**: Definir columnas en el componente TS

```typescript
import { TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

// Las columnas deben replicar la estructura de la tabla real
readonly tableColumns: SkeletonColumnDef[] = [
  { width: '50px', cellType: 'text' },            // #
  { width: 'flex', cellType: 'avatar-text' },      // Nombre + avatar
  { width: '100px', cellType: 'text' },            // DNI
  { width: '100px', cellType: 'badge' },           // Estado
  { width: '120px', cellType: 'actions' },         // Acciones
];
```

**Paso 2**: Usar en el template

```html
@if (loading()) {
  <app-table-skeleton [columns]="tableColumns" [rows]="10" />
} @else {
  <p-table [value]="items()">
    <!-- ... tabla real ... -->
  </p-table>
}
```

**Paso 3**: Agregar import al componente

```typescript
@Component({
  imports: [
    TableSkeletonComponent,
    // ... otros imports
  ],
})
```

### Patron 2: Stats cards con skeleton

Para secciones de estadisticas o KPIs.

```html
@if (loading()) {
  <app-stats-skeleton [count]="4" iconPosition="left" />
} @else {
  <div class="stats-grid">
    @for (stat of estadisticas(); track stat.label) {
      <app-stat-card [stat]="stat" />
    }
  </div>
}
```

### Patron 3: Skeleton inline con primitivas

Para secciones unicas que no se ajustan a tabla ni stats.

```html
@if (loading()) {
  <div class="custom-skeleton">
    <app-skeleton-loader variant="circle" width="80px" height="80px" />
    <app-skeleton-loader variant="text" width="200px" height="24px" />
    <app-skeleton-loader variant="text" width="150px" height="16px" />
    <app-skeleton-loader variant="rect" width="100%" height="200px" />
  </div>
} @else {
  <!-- contenido real -->
}
```

### Patron 4: Wrapper thin component (para reutilizar)

Cuando el mismo skeleton se usa en multiples lugares, crear un wrapper delgado.

```typescript
// mi-feature-table-skeleton.component.ts
@Component({
  selector: 'app-mi-feature-table-skeleton',
  standalone: true,
  imports: [TableSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-table-skeleton [columns]="columns" [rows]="8" />',
  styles: ':host { display: block; }',
})
export class MiFeatureTableSkeletonComponent {
  readonly columns: SkeletonColumnDef[] = [
    { width: '80px', cellType: 'text' },
    { width: 'flex', cellType: 'avatar-text' },
    { width: '100px', cellType: 'badge' },
    { width: '120px', cellType: 'actions' },
  ];
}
```

---

## Como Mapear Columnas de Tabla a `SkeletonColumnDef`

Analiza tu tabla real y mapea cada `<th>` a un `SkeletonColumnDef`:

| Contenido de la columna | `cellType` | `width` |
|--------------------------|------------|---------|
| Numero de fila (#) | `text` | `'50px'` - `'80px'` |
| Texto simple (DNI, fecha, hora) | `text` | `'80px'` - `'120px'` |
| Nombre + subtitulo (persona + email/DNI) | `text-subtitle` | `'flex'` |
| Avatar + nombre + subtitulo | `avatar-text` | `'flex'` |
| Badge/tag/estado | `badge` | `'80px'` - `'120px'` |
| Botones de accion | `actions` | `'100px'` - `'140px'` |

**Regla para `width`**: Usa `'flex'` para la columna principal que debe expandirse. Usa pixeles fijos para columnas de ancho conocido.

---

## Reservacion de Espacio (minHeight)

**OBLIGATORIO**: Todo skeleton debe reservar espacio para evitar layout shifts (CLS).

```html
<!-- En app-table-skeleton ya tiene minHeight por defecto (420px) -->
<app-table-skeleton [columns]="columns" minHeight="300px" />

<!-- En skeletons inline, usar el contenedor padre -->
<div class="section" [style.min-height.px]="420">
  @if (loading()) {
    <!-- skeleton -->
  } @else {
    <!-- contenido -->
  }
</div>
```

| Tipo de seccion | minHeight recomendado |
|-----------------|----------------------|
| Tabla completa | `420px` |
| Tabla pequena (5-6 filas) | `300px` |
| Stats cards | `140px` |
| Filtros | `60px` |
| Dialog contenido | `300px` |

---

## Extension del Sistema de Skeletons

### Cuando los componentes actuales NO son suficientes

Si encuentras un patron de UI que se repite en 3+ lugares y no se ajusta a `app-table-skeleton` ni `app-stats-skeleton`, crea un **nuevo componente shared generalizado**.

### Criterio para crear un nuevo skeleton shared

| Pregunta | Si la respuesta es SI |
|----------|-----------------------|
| Se repite en 3+ features? | Crear componente shared |
| Es estructuralmente diferente a tabla y stats? | Crear nuevo tipo |
| Puede parametrizarse con inputs? | Hacerlo configurable |
| Solo se usa 1-2 veces? | Composicion inline con `app-skeleton-loader` |

### Proceso para crear nuevo skeleton shared

1. **Identificar el patron repetido** - Documentar los 3+ lugares donde aparece
2. **Extraer configuracion variable** - Que cambia entre cada uso (count, layout, sizes)
3. **Crear en `@shared/components/{tipo}-skeleton/`** siguiendo la estructura existente:

```
src/app/shared/components/{tipo}-skeleton/
├── {tipo}-skeleton.component.ts      # Inputs configurables
├── {tipo}-skeleton.component.html    # Template con @switch/@for
├── {tipo}-skeleton.component.scss    # Estilos base
└── index.ts                          # Barrel export
```

4. **Exportar desde barrel** - Agregar en `@shared/components/index.ts`
5. **Documentar** - Agregar el nuevo tipo en esta regla

### Tipos de skeleton que podrian necesitarse a futuro

| Tipo potencial | Caso de uso | Cuando crearlo |
|----------------|-------------|----------------|
| `app-calendar-skeleton` | Grids de calendario mensual | Si se repiten 3+ calendarios |
| `app-list-skeleton` | Listas verticales con avatar/icono | Si se repiten 3+ listas similares |
| `app-form-skeleton` | Formularios con labels + inputs | Si dialogs con detalle se repiten |
| `app-card-grid-skeleton` | Grids de cards (dashboard) | Si se repiten 3+ dashboards |
| `app-timeline-skeleton` | Lineas de tiempo/historiales | Si se repiten 3+ timelines |

### Ejemplo: Crear un `app-list-skeleton`

```typescript
// Hipotetico - solo crear cuando se necesite en 3+ lugares
@Component({
  selector: 'app-list-skeleton',
  standalone: true,
  imports: [SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list-skeleton" [style.min-height]="minHeight()">
      @for (_ of rowArray(); track $index) {
        <div class="list-item">
          @if (showAvatar()) {
            <app-skeleton-loader variant="circle" width="40px" height="40px" />
          }
          <div class="list-item__content">
            <app-skeleton-loader variant="text" width="70%" height="16px" />
            @if (showSubtitle()) {
              <app-skeleton-loader variant="text" width="40%" height="12px" />
            }
          </div>
          @if (showAction()) {
            <app-skeleton-loader variant="rect" width="32px" height="32px" />
          }
        </div>
      }
    </div>
  `,
})
export class ListSkeletonComponent {
  readonly rows = input(5);
  readonly showAvatar = input(true);
  readonly showSubtitle = input(true);
  readonly showAction = input(false);
  readonly minHeight = input('300px');
  readonly rowArray = computed(() => Array(this.rows()));
}
```

---

## Anti-patrones

### 1. NO crear skeletons hardcodeados por feature

```typescript
// ❌ INCORRECTO - Skeleton hardcodeado con CSS propio
@Component({
  selector: 'app-mi-feature-skeleton',
  template: `
    <div class="skeleton-container">
      <div class="skeleton-row" *ngFor="let _ of [1,2,3,4,5]">
        <div class="skeleton-cell"></div>  <!-- 50+ lineas de CSS custom -->
        <div class="skeleton-cell"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-container { ... }  /* 80+ lineas duplicadas */
    .skeleton-row { ... }
    .skeleton-cell { ... }
  `]
})
export class MiFeatureSkeletonComponent {}
```

```typescript
// ✅ CORRECTO - Usar shared component configurado
@Component({
  selector: 'app-mi-feature-skeleton',
  template: '<app-table-skeleton [columns]="columns" [rows]="8" />',
  styles: ':host { display: block; }',
})
export class MiFeatureSkeletonComponent {
  readonly columns: SkeletonColumnDef[] = [
    { width: '80px', cellType: 'text' },
    { width: 'flex', cellType: 'avatar-text' },
    { width: '100px', cellType: 'badge' },
  ];
}
```

### 2. NO omitir skeleton cuando hay loading

```html
<!-- ❌ INCORRECTO - Solo spinner sin reservar espacio -->
@if (loading()) {
  <p-progressSpinner />
} @else {
  <p-table [value]="items()">...</p-table>
}

<!-- ❌ INCORRECTO - Sin skeleton ni espacio reservado -->
@if (!loading()) {
  <p-table [value]="items()">...</p-table>
}

<!-- ✅ CORRECTO - Skeleton que replica la estructura -->
@if (loading()) {
  <app-table-skeleton [columns]="columns" [rows]="10" />
} @else {
  <p-table [value]="items()">...</p-table>
}
```

### 3. NO olvidar reservar espacio

```html
<!-- ❌ INCORRECTO - Sin minHeight -->
<app-table-skeleton [columns]="columns" />

<!-- ✅ CORRECTO - Con espacio reservado -->
<app-table-skeleton [columns]="columns" minHeight="300px" />
```

### 4. NO duplicar CSS entre skeletons

Si necesitas estilos nuevos para un skeleton, verifica primero si el componente shared existente puede cubrir tu caso con los inputs disponibles. Solo crear CSS custom para layouts verdaderamente unicos.

---

## Referencia Rapida de Columnas por Modulo

### Usuarios (6 columnas)

```typescript
readonly columns: SkeletonColumnDef[] = [
  { width: '80px', cellType: 'text' },           // #
  { width: '100px', cellType: 'text' },           // DNI
  { width: 'flex', cellType: 'avatar-text' },     // Nombre + avatar
  { width: '120px', cellType: 'badge' },          // Rol
  { width: '100px', cellType: 'badge' },          // Estado
  { width: '140px', cellType: 'actions' },        // Acciones
];
```

### Horarios (8 columnas)

```typescript
readonly columns: SkeletonColumnDef[] = [
  { width: '80px', cellType: 'text' },            // Dia
  { width: '100px', cellType: 'text' },           // Horario
  { width: '110px', cellType: 'text' },           // Salon
  { width: '100px', cellType: 'badge' },          // Curso
  { width: 'flex', cellType: 'avatar-text' },     // Profesor
  { width: '90px', cellType: 'text' },            // Estudiantes
  { width: '90px', cellType: 'badge' },           // Estado
  { width: '120px', cellType: 'actions' },        // Acciones
];
```

### Asistencia dia (5 columnas)

```typescript
readonly columns: SkeletonColumnDef[] = [
  { width: '50px', cellType: 'text' },            // #
  { width: 'flex', cellType: 'text-subtitle' },   // Estudiante + DNI
  { width: '100px', cellType: 'text' },           // Entrada
  { width: '100px', cellType: 'text' },           // Salida
  { width: '80px', cellType: 'badge' },           // Estado
];
```

---

## Checklist para Nuevos Componentes

Al crear cualquier componente que carga datos:

```
SKELETON OBLIGATORIO
[ ] Cada seccion que carga datos tiene su skeleton?
[ ] El skeleton replica la estructura visual del contenido real?
[ ] Se usa app-table-skeleton para tablas? (con SkeletonColumnDef[])
[ ] Se usa app-stats-skeleton para cards de stats?
[ ] Se usa app-skeleton-loader para secciones custom unicas?
[ ] El skeleton tiene minHeight para reservar espacio?

REUTILIZACION
[ ] Se reutilizan los shared components en lugar de crear CSS custom?
[ ] Si el patron se repite 3+ veces, se creo un nuevo shared component?
[ ] Los wrappers thin solo definen columnas/config, sin CSS propio?

ESPACIO RESERVADO (CLS)
[ ] Tablas: minHeight >= 300px?
[ ] Stats: minHeight >= 140px?
[ ] Filtros: minHeight >= 60px?
[ ] Dialogs: minHeight >= 300px?
```

---

## Busqueda de Violaciones

```bash
# Buscar componentes con loading que no tienen skeleton
grep -rn "loading()" src/ --include="*.html" | grep -v "skeleton"

# Buscar @if con loading sin skeleton sibling
grep -rn "@if.*loading" src/ --include="*.html"

# Buscar spinners solos (deberian tener skeleton)
grep -rn "p-progressSpinner" src/ --include="*.html"
```

---

## Resumen

| Necesito skeleton para... | Usar |
|---------------------------|------|
| Tabla (`p-table`) | `app-table-skeleton` + `SkeletonColumnDef[]` |
| Cards de stats/KPIs | `app-stats-skeleton` + config |
| Seccion custom unica | `app-skeleton-loader` combinados |
| Patron que se repite 3x+ | Crear nuevo shared component |
| Filtros dinamicos | `app-skeleton-loader` variant `rect` |

### Frase clave

> **"Si carga datos, tiene skeleton. Si no tiene skeleton, no esta listo para produccion."**
