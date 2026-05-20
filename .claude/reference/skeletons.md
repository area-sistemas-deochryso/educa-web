# Skeleton Screens Obligatorios

## Principio fundamental

> **"Todo elemento UI que reciba datos cargados desde API DEBE tener espacio reservado y un skeleton."**

Sin excepciones. Si carga datos asincrónicamente, debe reservar espacio (evitar CLS) y mostrar skeleton.

---

## Componentes Shared (3 niveles)

### Nivel 1: `app-skeleton-loader` (Primitiva base)

```html
<app-skeleton-loader variant="text" width="200px" height="16px" />
<app-skeleton-loader variant="circle" width="48px" height="48px" />
<app-skeleton-loader variant="rect" width="120px" height="40px" />
<app-skeleton-loader variant="card" height="200px" />
```

**Ubicación**: `@shared/components/skeleton-loader/`

### Nivel 2: `app-table-skeleton` (Tablas configurables)

```html
<app-table-skeleton [columns]="columns" [rows]="10" minHeight="420px" />
```

| Input | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| `columns` | `SkeletonColumnDef[]` | *requerido* | Definicion de columnas |
| `rows` | `number` | `10` | Filas de skeleton |
| `minHeight` | `string` | `'420px'` | Altura minima |
| `showHeader` | `boolean` | `true` | Mostrar fila de header |

**Tipos de celda (`SkeletonCellType`)**:

| Tipo | Renderiza | Uso tipico |
|------|-----------|------------|
| `text` | Barra de texto | Campos simples (DNI, fecha) |
| `text-subtitle` | Texto + subtitulo | Nombre + info secundaria |
| `avatar-text` | Circulo + nombre + subtitulo | Columnas con avatar |
| `badge` | Rectangulo pequeno | Tags, estados, roles |
| `actions` | 3 circulos en fila | Botones de accion |

### Nivel 2: `app-stats-skeleton` (Cards de estadisticas)

```html
<app-stats-skeleton [count]="4" iconPosition="left" [showDescription]="false" />
```

| Input | Tipo | Default |
|-------|------|---------|
| `count` | `number` | `4` |
| `iconPosition` | `'left' \| 'right'` | `'left'` |
| `showDescription` | `boolean` | `false` |
| `minColumnWidth` | `string` | `'200px'` |

---

## Regla de Uso Obligatorio

| Tipo de seccion | Skeleton a usar |
|-----------------|-----------------|
| Tabla con datos | `app-table-skeleton` con `SkeletonColumnDef[]` |
| Cards de estadisticas/KPIs | `app-stats-skeleton` con config |
| Filtros con opciones dinamicas | `app-skeleton-loader` variant `rect` |
| Dialogs con detalle | `app-skeleton-loader` combinados |
| Grids/listas de cards | `app-skeleton-loader` variant `card` |

---

## Patron principal: Tabla con skeleton

```typescript
readonly tableColumns: SkeletonColumnDef[] = [
  { width: '50px', cellType: 'text' },
  { width: 'flex', cellType: 'avatar-text' },
  { width: '100px', cellType: 'badge' },
  { width: '120px', cellType: 'actions' },
];
```

```html
@if (loading()) {
  <app-table-skeleton [columns]="tableColumns" [rows]="10" />
} @else {
  <p-table [value]="items()">...</p-table>
}
```

---

## Mapeo de Columnas de Tabla a `SkeletonColumnDef`

| Contenido de la columna | `cellType` | `width` |
|--------------------------|------------|---------|
| Numero de fila (#) | `text` | `'50px'` - `'80px'` |
| Texto simple (DNI, fecha) | `text` | `'80px'` - `'120px'` |
| Nombre + subtitulo | `text-subtitle` | `'flex'` |
| Avatar + nombre + subtitulo | `avatar-text` | `'flex'` |
| Badge/tag/estado | `badge` | `'80px'` - `'120px'` |
| Botones de accion | `actions` | `'100px'` - `'140px'` |

Usar `'flex'` para la columna principal que debe expandirse. Pixeles fijos para ancho conocido.

### minHeight recomendado

| Seccion | minHeight |
|---------|-----------|
| Tabla completa | `420px` |
| Tabla pequena | `300px` |
| Stats cards | `140px` |
| Filtros | `60px` |
| Dialog contenido | `300px` |

---

## Referencia de Columnas por Modulo

```typescript
// Usuarios (6 cols): #(text 80), DNI(text 100), Nombre(avatar-text flex), Rol(badge 120), Estado(badge 100), Acciones(actions 140)
// Horarios (8 cols): Dia(text 80), Horario(text 100), Salon(text 110), Curso(badge 100), Profesor(avatar-text flex), Est.(text 90), Estado(badge 90), Acciones(actions 120)
// Asistencia (5 cols): #(text 50), Estudiante(text-subtitle flex), Entrada(text 100), Salida(text 100), Estado(badge 80)
```

---

## Anti-patrones (resumen)

| Anti-patron | Solucion |
|-------------|----------|
| Skeleton hardcodeado con CSS propio | Usar shared components configurados |
| Solo spinner sin reservar espacio | Skeleton que replica estructura |
| Sin minHeight | Siempre agregar minHeight |
| Duplicar CSS entre skeletons | Reutilizar shared components |

Si un patron de skeleton se repite en 3+ features y no se ajusta a los existentes, crear nuevo componente shared en `@shared/components/{tipo}-skeleton/`.

---

## Checklist

```
SKELETON OBLIGATORIO
[ ] Cada seccion con datos de API tiene skeleton?
[ ] Se usa app-table-skeleton / app-stats-skeleton / app-skeleton-loader?
[ ] El skeleton tiene minHeight para reservar espacio?

REUTILIZACION
[ ] Se usan shared components (no CSS custom)?
[ ] Patron repetido 3x+ tiene su propio shared component?
```

> **"Si carga datos, tiene skeleton. Si no tiene skeleton, no esta listo para produccion."**
