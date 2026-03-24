# Tipos Semánticos — Reemplazar Primitivas por Tipos con Significado

## Principio

> **"Si una primitiva necesita explicación frecuente, merece un tipo propio."**

Reemplazar `string`, `number` y `boolean` genéricos por tipos que expresen la semántica del dominio.

---

## Patrón: `const + type`

```typescript
// ✅ CORRECTO — const array + type derivado
export const APROBACION_ESTADOS = ['APROBADO', 'DESAPROBADO', 'PENDIENTE'] as const;
export type AprobacionEstado = (typeof APROBACION_ESTADOS)[number];

// ❌ INCORRECTO — string genérico
estado: string;
```

**Por qué `const + type` y no `enum`**: Consistente con el patrón existente del proyecto (`NivelEducativo`), tree-shakeable, y compatible con PrimeNG que espera strings en options.

---

## Tipos Semánticos Existentes

| Tipo | Valores | Ubicación | Uso |
|------|---------|-----------|-----|
| `AppUserRoleValue` | `'Director' \| 'Profesor' \| 'Apoderado' \| 'Estudiante' \| 'Asistente Administrativo'` | `@shared/constants/app-roles.ts` | Rol de usuario en toda la app |
| `NivelEducativo` | `'Inicial' \| 'Primaria' \| 'Secundaria'` | `@data/models/salon.models.ts` | Nivel educativo del salón |
| `DiaSemana` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7` | `@data/models/horario.models.ts` | Día de la semana (1=Lun, 7=Dom) |
| `AprobacionEstado` | `'APROBADO' \| 'DESAPROBADO' \| 'PENDIENTE'` | `@data/models/salon.models.ts` | Estado de aprobación de estudiante |
| `PeriodoCierreEstado` | `'CERRADO' \| 'ABIERTO'` | `@data/models/salon.models.ts` | Estado de cierre de periodo académico |
| `TipoCalificacion` | `'NUMERICO' \| 'LITERAL'` | `@data/models/salon.models.ts` | Tipo de sistema de calificación |
| `TipoEntradaCalendario` | `'holiday' \| 'event'` | `@data/models/eventos-calendario.models.ts` | Tipo de entrada en calendario (feriado vs evento) |
| `TipoEventoCalendario` | `'academic' \| 'cultural' \| 'sports' \| 'meeting' \| 'other'` | `@data/models/eventos-calendario.models.ts` | Categoría del evento |
| `NotificacionTipo` | `'matricula' \| 'pago' \| 'academico' \| 'festividad' \| 'evento'` | `@data/models/notificaciones-admin.models.ts` | Tipo de notificación |
| `NotificacionPrioridad` | `'low' \| 'medium' \| 'high' \| 'urgent'` | `@data/models/notificaciones-admin.models.ts` | Prioridad de notificación |
| `HorarioVistaType` | `'semanal' \| 'lista'` | `horarios/models/horario.interface.ts` | Vista activa del módulo horarios |
| `AttendanceStatus` | `'T' \| 'A' \| 'F' \| 'N' \| 'J' \| '-' \| 'X'` | `attendance.types.ts` | Estado de asistencia diaria |
| `EstadoAsistenciaCurso` | `'P' \| 'T' \| 'F'` | `asistencia-curso.models.ts` | Estado de asistencia en curso |

---

## Cuándo Crear un Tipo Semántico

### ✅ SÍ crear cuando

| Señal | Ejemplo |
|-------|---------|
| Campo `string` con valores finitos conocidos | `estado: 'APROBADO' \| 'DESAPROBADO'` |
| Mismo conjunto de strings comparado en 2+ archivos | `=== 'CERRADO'` en store + template |
| Campo de DTO que el backend envía como enum/string fijo | `tipo`, `estado`, `tipoCalificacion` |
| Magic strings en `switch/case` o `@if` | `case 'NUMERICO':` |

### ❌ NO crear cuando

| Señal | Ejemplo |
|-------|---------|
| String verdaderamente libre (nombre, descripción) | `nombre: string` → dejar como `string` |
| Solo 1 archivo usa el valor | Mantener inline como literal |
| Valor viene de input del usuario sin restricción | `observacion: string` |
| Crear wrapper sin comportamiento ni valor real | `type StudentName = string` → innecesario |

---

## Dónde Ubicar

| Alcance | Ubicación |
|---------|-----------|
| Usado en 2+ features o es entidad de dominio | `@data/models/{dominio}.models.ts` |
| Usado solo en 1 feature | `features/*/models/*.models.ts` |
| Usado solo en 1 componente | Inline en el componente |

---

## Cómo Aplicar en DTOs

```typescript
// ✅ CORRECTO — DTO tipado
export interface AprobacionEstudianteListDto {
  estado: AprobacionEstado;  // Solo acepta 'APROBADO' | 'DESAPROBADO' | 'PENDIENTE'
}

// ❌ INCORRECTO — string genérico
export interface AprobacionEstudianteListDto {
  estado: string;  // Acepta cualquier string
}
```

## Cómo Aplicar en Signals

```typescript
// ✅ CORRECTO — Signal tipado
readonly tipoCalificacion = signal<TipoCalificacion>('LITERAL');

// ❌ INCORRECTO — Signal genérico
readonly tipoCalificacion = signal<string>('LITERAL');
```

## Cómo Aplicar en Parámetros

```typescript
// ✅ CORRECTO — Parámetro tipado
onAprobar(estado: AprobacionEstado): void { }

// ❌ INCORRECTO — String literal union repetido
onAprobar(estado: 'APROBADO' | 'DESAPROBADO'): void { }
```

---

## Beneficios

- **Autocompletado**: IDE sugiere solo valores válidos
- **Errores en compilación**: Typos detectados antes de runtime
- **Documentación implícita**: El tipo dice qué valores existen
- **Refactor seguro**: Cambiar un valor actualiza todos los usos

---

## Checklist

```
DETECCIÓN
[ ] ¿Hay campos string en DTOs con valores finitos conocidos?
[ ] ¿Hay comparaciones de strings mágicos en templates o stores?
[ ] ¿El mismo conjunto de strings se repite en 2+ archivos?

IMPLEMENTACIÓN
[ ] ¿Tipo definido como const array + type derivado?
[ ] ¿Ubicado en @data/models/ si es compartido?
[ ] ¿DTOs actualizados para usar el tipo en vez de string?
[ ] ¿Signals y parámetros actualizados?
[ ] ¿Re-exportado en barrel files del feature?
```
