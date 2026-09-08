# Plan de Patrones de Diseño — Frontend (Angular 21)

> **Estado**: Pendiente
> **Prioridad**: Media-alta (mejora mantenibilidad y consistencia)
> **Estimación**: Incremental — se aplica conforme se toca cada módulo
> **Principio**: "Adoptar el patrón cuando el dolor lo justifique, no por elegancia."

---

## Estado Actual del Frontend

| Patrón | Estado | Cobertura |
|--------|--------|-----------|
| Facade + Store | ✅ Implementado | ~70% de features CRUD |
| BaseCrudStore | ✅ Existe | ~30% de stores lo extienden |
| BaseCrudFacade | ✅ Existe | Pocos facades lo usan |
| WAL (Optimistic UI) | ✅ Implementado | ~50% de mutaciones |
| Adapters | ⚠️ Parcial | Solo date, grade-scale. Sin estándar |
| Strategy por rol | ❌ No existe | `@if (rol === 'X')` en templates |
| Presenter | ❌ No existe | Computeds complejos en facades |

---

## Patrón 1 — Strategy por Rol (Prioridad Alta)

### Problema

Componentes cross-role (asistencia, horarios, calificaciones) tienen lógica condicional dispersa:

```typescript
// Actual — repetido en templates y facades
@if (rol() === 'Director') { /* columnas admin */ }
@else if (rol() === 'Profesor') { /* columnas profesor */ }
// ... en 10+ lugares del mismo componente
```

### Solución

Interfaz de estrategia + implementaciones por rol + factory:

```
features/cross-role/attendance/
├── strategies/
│   ├── attendance.strategy.ts          # Interfaz
│   ├── director-attendance.strategy.ts # Impl Director
│   ├── teacher-attendance.strategy.ts  # Impl Profesor
│   └── student-attendance.strategy.ts  # Impl Estudiante
├── services/
│   └── attendance-strategy.factory.ts  # Factory basado en AuthStore.rol
```

```typescript
// attendance.strategy.ts
export interface AttendanceStrategy {
  readonly columns: ColumnDef[];
  readonly actions: ActionDef[];
  canEdit(): boolean;
  canExport(): boolean;
  getFilters(): FilterDef[];
}

// attendance-strategy.factory.ts
@Injectable({ providedIn: 'root' })
export class AttendanceStrategyFactory {
  private authStore = inject(AuthStore);

  create(): AttendanceStrategy {
    switch (this.authStore.rol()) {
      case 'Director': return new DirectorAttendanceStrategy();
      case 'Profesor': return new TeacherAttendanceStrategy();
      case 'Estudiante': return new StudentAttendanceStrategy();
      default: return new StudentAttendanceStrategy();
    }
  }
}
```

### Dónde aplicar

| Módulo cross-role | @if por rol actuales | Beneficio |
|-------------------|---------------------|-----------|
| **Asistencia diaria** | ~8 condicionales | Alto — 3 vistas muy distintas |
| **Horarios** | ~5 condicionales | Medio — Director edita, resto consulta |
| **Calificaciones** | ~6 condicionales | Alto — Profesor registra, Estudiante consulta |
| **Home intranet** | ~4 condicionales | Bajo — solo quick access y stats |

### Fases

```
F1.1 [ ] Definir interfaz AttendanceStrategy con columns, actions, canEdit, getFilters
F1.2 [ ] Implementar DirectorAttendanceStrategy, TeacherAttendanceStrategy
F1.3 [ ] Crear AttendanceStrategyFactory con inyección de AuthStore
F1.4 [ ] Refactorizar attendance-director y attendance-profesor para consumir strategy
F1.5 [ ] Aplicar mismo patrón a horarios (ScheduleStrategy)
F1.6 [ ] Aplicar a calificaciones cuando se toque el módulo
```

### Regla de adopción

> Aplicar Strategy cuando un componente tiene **3+ bloques @if sobre el mismo campo de rol** que cambian estructura (columnas, acciones, filtros). Si solo cambia un botón, un `@if` simple basta.

---

## Patrón 2 — Adapter Estandarizado (Prioridad Media)

### Problema

La transformación API DTO → ViewModel está dispersa en facades, stores y componentes. Cuando el backend cambia un DTO, hay que buscar en 3+ archivos.

### Solución

Adapters tipados con interfaz base. Cada feature con transformación no trivial tiene su adapter.

```
@data/adapters/
├── base.adapter.ts              # Interfaz genérica (ya existe)
├── date.adapter.ts              # Transformación de fechas (ya existe)
├── grade-scale.adapter.ts       # Escalas de calificación (ya existe)
├── attendance.adapter.ts        # NUEVO: API → AttendanceViewModel
├── user.adapter.ts              # NUEVO: API → UserViewModel
└── schedule.adapter.ts          # NUEVO: API → ScheduleViewModel
```

```typescript
// base.adapter.ts (refinar el existente)
export abstract class BaseAdapter<TApi, TVm> {
  abstract adapt(dto: TApi): TVm;
  adaptMany(dtos: TApi[]): TVm[] { return dtos.map(d => this.adapt(d)); }
}

// attendance.adapter.ts
@Injectable({ providedIn: 'root' })
export class AttendanceAdapter extends BaseAdapter<AsistenciaApiDto, AttendanceRowVm> {
  adapt(dto: AsistenciaApiDto): AttendanceRowVm {
    return {
      ...dto,
      statusLabel: ATTENDANCE_STATUS_MAP[dto.estado],
      statusSeverity: ATTENDANCE_SEVERITY_MAP[dto.estado],
      horaEntrada: dto.horaEntrada ? formatTime(dto.horaEntrada) : '—',
      horaSalida: dto.horaSalida ? formatTime(dto.horaSalida) : '—',
    };
  }
}
```

### Dónde se llama el adapter

En el **facade** (o data facade), nunca en el store ni en el componente:

```typescript
// attendance-data.facade.ts
loadAttendance(): void {
  this.api.getAttendance(params).subscribe(data => {
    const adapted = this.adapter.adaptMany(data);
    this.store.setItems(adapted);
  });
}
```

### Fases

```
F2.1 [ ] Refinar BaseAdapter con adaptMany y tipado genérico
F2.2 [ ] Crear AttendanceAdapter (estado → label/severity, horas → formato)
F2.3 [ ] Crear UserAdapter (rol → badge, estado → label)
F2.4 [ ] Migrar transformaciones del facade de asistencia al adapter
F2.5 [ ] Migrar transformaciones del facade de usuarios al adapter
F2.6 [ ] Documentar patrón en architecture.md
```

### Regla de adopción

> Crear adapter cuando la transformación API→VM involucra **mapeo de estados, formateo de fechas/horas, o cálculo de campos derivados** que no vienen del backend. Si solo es spread `{...dto}` sin transformación, no hace falta adapter.

---

## Patrón 3 — Presenter para Computed Complejos (Prioridad Baja)

### Problema

Facades acumulan computeds de presentación que no son lógica de negocio ni IO:

```typescript
// Actual — en el facade
readonly formattedAverage = computed(() => {
  const avg = this.store.average();
  return avg >= 14 ? `✓ ${avg.toFixed(1)}` : `✗ ${avg.toFixed(1)}`;
});
```

### Solución

Servicio Presenter puro (sin IO, sin estado, solo transformación para la vista):

```typescript
@Injectable({ providedIn: 'root' })
export class GradesPresenter {
  formatAverage(avg: number): string {
    return avg >= 14 ? `✓ ${avg.toFixed(1)}` : `✗ ${avg.toFixed(1)}`;
  }

  getStatusColor(avg: number): 'success' | 'warning' | 'danger' {
    if (avg >= 14) return 'success';
    if (avg >= 11) return 'warning';
    return 'danger';
  }

  buildGradeSummary(grades: GradeDto[]): GradeSummaryVm {
    // Agrupación, cálculos de porcentaje, etc.
  }
}
```

### Cuándo extraer a Presenter vs dejar en Facade

| Señal | Dónde va |
|-------|----------|
| Transformación pura (sin IO ni estado) | Presenter |
| Depende de signals del store | `computed()` en facade |
| Usado por 2+ features | Presenter en `@shared/services/` |
| Solo formateo simple (1 línea) | Pipe puro |

### Fases

```
F3.1 [ ] Identificar facades con 3+ computeds de presentación pura
F3.2 [ ] Extraer GradesPresenter (calificaciones)
F3.3 [ ] Extraer AttendancePresenter (asistencia — estados, colores, resúmenes)
F3.4 [ ] Evaluar si vale Presenter para usuarios y horarios
```

### Regla de adopción

> Crear Presenter cuando un facade tiene **5+ computeds de formateo/presentación** que no dependen de estado reactivo. Si son 1-2 computeds simples, dejarlos en el facade.

---

## Patrón 4 — Estandarizar BaseCrudStore y BaseCrudFacade (Prioridad Alta)

### Problema

Cada nuevo módulo CRUD reimplementa el mismo boilerplate de signals, mutations, dialog state. `BaseCrudStore` y `BaseCrudFacade` existen pero pocos módulos los usan.

### Estado actual de adopción

| Módulo CRUD admin | Usa BaseCrudStore | Usa BaseCrudFacade | WAL |
|-------------------|-------------------|-------------------|-----|
| Usuarios | ❌ Store propio | ❌ Multi-facade propio | ⚠️ Parcial |
| Cursos | ❌ Store propio | ❌ Facade propio | ⚠️ Parcial |
| Salones | ❌ Store propio | ❌ Facade propio | ✅ |
| Horarios | ❌ Store propio | ❌ Facade propio | ✅ |
| Eventos Calendario | ❌ Store propio | ❌ Facade propio | ✅ |
| Notificaciones Admin | ❌ Store propio | ❌ Facade propio | ✅ |
| Asistencia Admin | ❌ Store propio | ❌ Multi-facade propio | ✅ |

### Fases

```
F4.1 [ ] Auditar BaseCrudStore — verificar que cubre: items, loading, error, dialog, confirmDialog, stats, formData, selectedItem
F4.2 [ ] Auditar BaseCrudFacade — verificar que cubre: walCreate, walUpdate, walToggle, walDelete, loadItems, loadStats
F4.3 [ ] Migrar Cursos (módulo simple) como piloto → medir reducción de líneas
F4.4 [ ] Migrar Eventos Calendario
F4.5 [ ] Migrar Notificaciones Admin
F4.6 [ ] Evaluar migración de Usuarios y Salones (complejos, multi-facade)
F4.7 [ ] Documentar "cuándo extender base vs custom" en crud-patterns.md
```

### Regla de adopción

> Usar BaseCrudStore/Facade cuando el módulo es **CRUD estándar con tabla + dialog + stats**. No usar para: dashboards, chat, wizards, reportes read-only, módulos con UX no estándar.

---

## Orden de Ejecución

```
Patrón 4 (Base abstractions) ← Mayor reducción de boilerplate, menos riesgo
  ↓
Patrón 1 (Strategy por rol) ← Resuelve dolor real en cross-role
  ↓
Patrón 2 (Adapters)         ← Incremental, al tocar cada feature
  ↓
Patrón 3 (Presenter)        ← Solo si facades crecen mucho
```

**Regla general**: Adoptar el patrón **cuando toquemos el módulo** por otra razón (bug, feature, refactor). No crear PRs dedicados solo para migrar un patrón — eso es churn sin valor inmediato.

---

## Relación con Tasks Existentes

| Task | Relación |
|------|----------|
| `enforcement-reglas.md` Fase 3 (tipos semánticos) | Los adapters son el lugar natural para aplicar tipos semánticos |
| `enforcement-reglas.md` Fase 5 (barrel exports) | Los adapters y strategies necesitan barrel exports correctos |
| `architecture.md` (taxonomía) | Strategy y Presenter son subtipos de Facade/Helper en la taxonomía |

---

## Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Líneas por store CRUD nuevo | ~150-200 | ~30-50 (extends Base) |
| Líneas por facade CRUD nuevo | ~200-300 | ~50-80 (extends Base) |
| `@if (rol === ...)` en cross-role | ~20+ dispersos | 0 (strategy decide) |
| Archivos tocados al cambiar un DTO | 3-5 (facade + store + components) | 1 (adapter) |
| Computeds de presentación en facades | ~5-10 por facade | 0-2 (resto en presenter) |
