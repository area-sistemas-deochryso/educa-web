<!-- created: 2026-08-11 -->

# profesor-audit-notas-select-placeholder

> **Origen**: F1 audit funcional del plan [`audit-profesor-navegacion-2026-08.md`](../plan/audit-profesor-navegacion-2026-08.md).
> **Severidad**: 🟢 (detalle de UI, no bloquea ningún flujo).

## Reproducción

1. Loguear como profesor, ir a "Mis Cursos" (o "Mis Salones") → abrir un curso con estudiantes sin calificar → tab "Calificaciones" → click en el ícono de calificar de una evaluación.
2. Ver la columna "Nota (0-20)": el estudiante ya calificado muestra "AD" (con el numérico "18.0" al lado); los estudiantes sin nota muestran el select con el texto **"L..."** truncado.

**Actual**: "L..." es un placeholder cortado (probablemente el nombre de la primera opción de la lista o un texto tipo "Elegir...", truncado por el ancho fijo del select) — no comunica claramente "sin calificar todavía".

**Esperado**: un placeholder corto que entre en el ancho actual del select sin truncarse, ej. "Sin nota" o un ícono "–".

## Componente probable

Modal "Calificar: [nombre de evaluación]" — select de nota por estudiante, mismo componente usado tanto desde "Mis Cursos" como desde "Mis Salones → Notas por Estudiante".

## Criterio de cierre

- El placeholder del select se lee completo, sin truncarse, para los ~20 estudiantes sin nota del dato de prueba de esta sesión.

## Out-of-scope

- El resto del flujo de calificar (guardar, observaciones) — funciona correctamente.
