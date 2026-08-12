<!-- created: 2026-08-11 -->

# profesor-audit-promedio-confuso

> **Origen**: F1 audit funcional del plan [`audit-profesor-navegacion-2026-08.md`](../plan/audit-profesor-navegacion-2026-08.md).
> **Severidad**: 🔴 (el profesor puede comunicarle mal a un padre el desempeño real de su hijo si confía en el color sin mirar el detalle).
> **Tipo**: decisión de producto ya tomada (2026-08-11) — ver [`estudiante-audit-promedio-rojo-confuso.md`](estudiante-audit-promedio-rojo-confuso.md) para el detalle completo de la decisión. Este brief es la aplicación del mismo fix en las 2 superficies del lado profesor.

## Reproducción

1. Loguear como profesor, ir a "Mi Aula" → "Mis Salones" → abrir "1RO PRIMARIA A - 2026" → tab "Notas por Estudiante" → seleccionar ALCALA SANDOVAL DANIELA.
2. Ver "Promedios" → "GENERAL": **3.6** en rojo (misma alumna con 18/20 en su única evaluación calificada, peso 20% del curso).
3. Mismo dato visible en el mismo modal, tab "Notas del Salón" (vista tabular de los 20 estudiantes) — columna "General" en rojo para Daniela.

**Actual**: exactamente el mismo problema documentado del lado estudiante ([`estudiante-audit-promedio-rojo-confuso.md`](estudiante-audit-promedio-rojo-confuso.md)), visible también en 2 pantallas del profesor.

**Por qué se abre un brief separado en vez de solo tocar la pantalla de estudiante**: el fix decidido (desacoplar color de % de cobertura evaluada) debe aplicarse en 3 superficies con la misma lógica — si solo se corrige la vista de estudiante, el profesor sigue viendo la señal de alarma falsa y puede transmitirla a un padre sin saber que es prematura.

## Decisión aplicable (heredada del brief de estudiante)

- No cambia el número mostrado (sigue siendo el promedio ponderado sobre el 100% del curso).
- Por debajo del umbral de cobertura acordado (punto de partida: 50% del curso evaluado): color neutro, no rojo/verde, en ambas vistas de profesor.
- En o sobre el umbral: semáforo real.

## Componente probable

- Modal de salón → tab "Notas por Estudiante" (componente de detalle por alumno, dentro de `pages/profesor/salones/` o equivalente).
- Modal de salón → tab "Notas del Salón" (vista tabular) — probablemente comparte la misma función de color que la anterior si está bien factorizado, o la duplica si no.

## Criterio de cierre

- Idealmente: una sola función/pipe de "color de promedio según cobertura" consumida por las 3 superficies (estudiante + 2 de profesor), no 3 implementaciones sueltas.
- Con el dato de prueba de esta sesión, ninguna de las 3 superficies muestra rojo para Daniela.

## Out-of-scope

- Cambiar el cálculo del promedio en sí — ver brief de estudiante, el modelo se mantiene.
