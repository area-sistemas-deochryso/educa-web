# Domain Modeling — Interfaces, Entidades y Tipos

## Principio Fundamental

> **"Un tipo nombrado es una decisión de diseño. Un `any` inline es deuda técnica."**

Cada concepto del dominio debe tener **un nombre**, **una ubicación** y **un dueño**. Si un tipo aparece en 2+ lugares, es un concepto del dominio que merece su propio archivo.

---

## Jerarquía de Tipos (4 Capas)

| Capa | Ubicación | Responsabilidad | Ejemplo |
|------|-----------|-----------------|---------|
| **Domain** | `@data/models/` | Entidades del negocio compartidas entre features | `HorarioResponseDto`, `NivelEducativo` |
| **Shared** | `@shared/models/` | Contratos UI reutilizables (opciones, formularios, estadísticas) | `SelectOption<T>`, `StatsBase`, `FormState<T>` |
| **Feature** | `features/*/models/` o `features/*/services/*.models.ts` | DTOs y tipos específicos del feature | `CursoFormData`, `CursosEstadisticas` |
| **Component** | Inline en `.component.ts` | Tipos efímeros de un solo componente | Input/output shapes de presentational components |

### Regla de Ascenso

```
Si un tipo se usa en 1 componente → inline en component (capa 4)
Si un tipo se usa en 1 feature (store+facade+components) → feature models (capa 3)
Si un tipo se usa en 2+ features → @shared/models/ o @data/models/ (capa 1-2)
Si un tipo representa una entidad de negocio → @data/models/ SIEMPRE (capa 1)
```

**NUNCA** duplicar un tipo. Si lo necesitas en otro lugar, asciéndelo.

---

## Convenciones de Naming

### Archivos

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Modelos de dominio | `{entidad}.models.ts` | `horario.models.ts` |
| Modelos compartidos UI | `{concepto}.models.ts` | `form.models.ts`, `table.models.ts` |
| Modelos de feature | `{feature}.models.ts` | `cursos.models.ts` |
| Interfaces de contrato | `{contrato}.interfaces.ts` | `crud-store.interfaces.ts` |

**PROHIBIDO**: `.interface.ts` para DTOs (usar `.models.ts`). Reservar `.interfaces.ts` solo para contratos abstractos (base classes, DI tokens).

### Tipos

| Tipo | Sufijo | Ejemplo |
|------|--------|---------|
| DTO de lista (API → UI) | `*ListaDto` o `*ListDto` | `CursoListaDto` |
| DTO de detalle (API → UI) | `*DetalleDto` | `CursoDetalleDto` |
| DTO de creación (UI → API) | `Crear*Request` | `CrearCursoRequest` |
| DTO de actualización (UI → API) | `Actualizar*Request` | `ActualizarCursoRequest` |
| Formulario (estado UI) | `*FormData` | `CursoFormData` |
| Estadísticas | `*Estadisticas` | `CursosEstadisticas` |
| Opciones de select | `SelectOption<T>` | (genérico compartido) |
| Configuración | `*Config` | `NivelGradoConfig` |
| ViewModel | `*Vm` | `CursosVm` (si se exporta) |

---

## Tipos Compartidos Obligatorios (@shared/models/)

### 1. SelectOption — NUNCA reinventar

```typescript
// @shared/models/select-option.models.ts
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface GroupedSelectOption<T = string> {
  label: string;
  items: SelectOption<T>[];
}

// Para casos donde el backend devuelve { id, nombre }
export interface IdNameOption {
  id: number;
  nombre: string;
}

// Helper para convertir
export function toSelectOption(item: IdNameOption): SelectOption<number> {
  return { label: item.nombre, value: item.id };
}
```

**PROHIBIDO**: Definir `GradoOption`, `SeccionOption`, `NivelOption` con shapes `{ label, value }` — usar `SelectOption<T>`.

### 2. StatsBase — Estadísticas con contrato

```typescript
// @shared/models/stats.models.ts
export interface StatsBase {
  total: number;
  activos: number;
  inactivos: number;
}

export interface StatsWithTrend extends StatsBase {
  tendencia?: 'up' | 'down' | 'stable';
  porcentajeActivos?: number;
}
```

Features extienden con campos específicos:

```typescript
// features/admin/cursos/models/cursos.models.ts
export interface CursosEstadisticas extends StatsBase {
  porNivel: Record<NivelEducativo, number>;
}
```

### 3. FormState — Estado de formularios

```typescript
// @shared/models/form.models.ts
export interface FormMeta {
  isEditing: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}
```

### 4. PaginationState — Paginación uniforme

```typescript
// @shared/models/pagination.models.ts
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationState;
}
```

### 5. ApiError — Errores tipados

```typescript
// @shared/models/api-error.models.ts
export interface ApiError {
  status: number;
  message: string;
  details?: string;
  field?: string;
}
```

---

## Entidades de Dominio (@data/models/)

### Cuándo crear un modelo de dominio

| Criterio | Sí | No |
|----------|----|----|
| ¿Lo devuelve la API? | ✅ Domain model | |
| ¿Lo usan 2+ features? | ✅ Domain model | |
| ¿Representa una entidad de negocio? | ✅ Domain model | |
| ¿Es solo UI de un componente? | | ❌ Inline o feature |
| ¿Es estado del formulario? | | ❌ Feature model |

### Estructura de un modelo de dominio

```typescript
// @data/models/curso.models.ts

// --- Response DTOs (API → Frontend) ---
export interface CursoListaDto {
  id: number;
  nombre: string;
  nivel: NivelEducativo;
  estado: boolean;
  totalEstudiantes: number;
}

export interface CursoDetalleDto extends CursoListaDto {
  descripcion: string;
  grados: GradoDto[];
  fechaCreacion: string;
}

// --- Request DTOs (Frontend → API) ---
export interface CrearCursoRequest {
  nombre: string;
  nivel: NivelEducativo;
  gradoIds: number[];
}

export interface ActualizarCursoRequest extends Partial<CrearCursoRequest> {
  id: number;
}

// --- Enums y constantes del dominio ---
export const NIVELES_EDUCATIVOS = ['Inicial', 'Primaria', 'Secundaria'] as const;
export type NivelEducativo = (typeof NIVELES_EDUCATIVOS)[number];
```

---

## Reglas de Ubicación

### Feature Models — cuando el tipo NO se comparte

```typescript
// features/admin/cursos/services/cursos.models.ts (o models/cursos.models.ts)

// OK aquí: solo lo usa este feature
export interface CursoFormData {
  nombre: string;
  nivel: NivelEducativo | null;
  gradoIds: number[];
}

export interface CursosFilterState {
  searchTerm: string;
  filterEstado: boolean | null;
  filterNivel: NivelEducativo | null;
}
```

### Component Inline — solo para componentes presentacionales aislados

```typescript
// OK inline: solo este componente lo usa, es su contrato de input
@Component({ selector: 'app-curso-card' })
export class CursoCardComponent {
  readonly curso = input.required<CursoListaDto>(); // Tipo viene de @data/models
  readonly onEdit = output<number>();
}
```

**PROHIBIDO inline**: Tipos que se usan en store, facade Y template del mismo feature → extraer a `*.models.ts` del feature.

---

## Anti-Patrones

### 1. Tipo duplicado con diferente nombre

```typescript
// ❌ INCORRECTO — mismo concepto, 3 nombres
// grades-modal.component.ts
interface Evaluation { name: string; grade: number; }
// evaluations-accordion.component.ts
interface EvaluationItem { nombre: string; nota: number; }
// tasks-modal.component.ts
interface TaskEvaluation { name: string; grade: number; editable: boolean; }

// ✅ CORRECTO — un tipo, variantes explícitas
// @data/models/calificacion.models.ts
export interface EvaluacionBase {
  nombre: string;
  nota: number;
}
export interface EvaluacionEditable extends EvaluacionBase {
  editable: boolean;
  notaTemporal?: number;
}
```

### 2. Tipo inline en facade para respuesta API

```typescript
// ❌ INCORRECTO — tipo de API escondido en facade
// videoconferencias.facade.ts
interface JaaSTokenResponse { token: string; room: string; }

// ✅ CORRECTO — extraer a models
// videoconferencias.models.ts
export interface JaaSTokenResponse { token: string; room: string; }
```

### 3. `Record<string, any>` o shapes anónimas

```typescript
// ❌ INCORRECTO
const filters: Record<string, any> = { estado: true, nivel: 'Primaria' };

// ✅ CORRECTO
const filters: CursosFilterState = { searchTerm: '', filterEstado: true, filterNivel: 'Primaria' };
```

### 4. Tipos genéricos que deberían ser específicos

```typescript
// ❌ INCORRECTO — pierde información del dominio
readonly options = signal<{ label: string; value: string }[]>([]);

// ✅ CORRECTO — usa tipo compartido
readonly options = signal<SelectOption<string>[]>([]);
```

---

## Checklist de Code Review

```
UBICACIÓN
[ ] ¿Tipo usado en 2+ features? → @data/models/ o @shared/models/
[ ] ¿Tipo usado en 1 feature (store+facade+template)? → feature/models/ o feature/services/*.models.ts
[ ] ¿Tipo solo en 1 componente presentacional? → inline OK

NAMING
[ ] ¿Archivos usan .models.ts? (no .interface.ts para DTOs)
[ ] ¿DTOs siguen convención Lista/Detalle/Crear/Actualizar?
[ ] ¿No hay reinvención de SelectOption, StatsBase, PaginationState?

DUPLICACIÓN
[ ] ¿No existe ya un tipo equivalente en otra ubicación?
[ ] ¿Si existe duplicado, se consolidó en la capa correcta?

TIPADO
[ ] ¿No hay any, Record<string, any>, o shapes anónimas?
[ ] ¿Enums usan patrón const + type?
[ ] ¿Interfaces API separadas de interfaces UI?
```

---

## Migración de Código Existente

### Prioridad 1: Consolidar duplicados existentes

| Tipo duplicado | Ubicaciones actuales | Destino |
|----------------|---------------------|---------|
| `Evaluation` / `EvaluationItem` | 3 componentes | `@data/models/calificacion.models.ts` |
| `ModuloVistas` | store + utils | `@data/models/permisos.models.ts` |
| `GradoOption` (label/value) | 2 componentes | `@shared/models/select-option.models.ts` → `SelectOption` |
| `CalendarDay` | 2 componentes | `@shared/models/calendar.models.ts` |

### Prioridad 2: Crear tipos compartidos faltantes

- `@shared/models/select-option.models.ts`
- `@shared/models/stats.models.ts`
- `@shared/models/form.models.ts`
- `@shared/models/pagination.models.ts`

### Prioridad 3: Extraer tipos inline de facades

- Mover `JaaSTokenResponse` → `videoconferencias.models.ts`
- Mover `LoginResponse` → `auth.models.ts`
- Mover `HorarioDto` inline → `@data/models/horario.models.ts`

> **Regla de migración**: Al tocar un archivo que tiene tipos inline duplicados, consolidarlos en ese mismo PR. No crear PRs solo de "mover tipos" — hacerlo incrementalmente.
