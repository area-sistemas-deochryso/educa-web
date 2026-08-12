<!-- created: 2026-08-11 -->

# estudiante-audit-evaluaciones-pendientes-texto

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🟡 (lenguaje ambiguo, no bug funcional).

## Reproducción

1. Loguear como estudiante, ir a "Mis Calificaciones" (`/intranet/estudiante/notas`).
2. Leer el texto bajo el promedio general: **"20% del curso evaluado (faltan 0 de 1 evaluaciones)"**.

**Actual**: la frase "faltan 0 de 1 evaluaciones" es ambigua incluso para un adulto en primera lectura — no queda claro si significa "ya se calificó todo lo que existe" (correcto) o "todavía no se publicó ninguna evaluación" (lectura errónea posible, casi opuesta). Requiere releer para entender que "1 evaluación" es el total de evaluaciones *creadas hasta ahora* (no el total del curso), y que "faltan 0" es bueno.

**Esperado**: redacción que no dependa de hacer la resta mental "0 de 1" para entender el estado. Ejemplos de dirección (a validar con producto, no prescriptivo):

- "1 de 1 evaluación calificada. El resto del curso todavía no tiene evaluaciones publicadas."
- Separar en dos líneas: "Evaluaciones calificadas: 1/1" + "Cobertura del curso: 20%" (explicando que cobertura ≠ evaluaciones pendientes de corregir).

## Perspectiva de rol

Para un estudiante de primaria (lector aún en desarrollo), esta frase con doble negación implícita ("faltan 0") es más carga cognitiva que la mayoría del resto de la pantalla. Para secundaria el problema es menor pero sigue existiendo la ambigüedad semántica real (no es solo "vocabulario difícil", es una frase objetivamente confusa).

## Decisión tomada (2026-08-12)

Redacción en dos líneas separadas (reemplaza la frase única actual "20% del curso evaluado (faltan 0 de 1 evaluaciones)"):

- "Evaluaciones calificadas: 1/1"
- "Cobertura del curso: 20%"

Conserva ambos datos (al día con lo calificado + % de cobertura real) sin requerir resta mental. Implementar junto con [`estudiante-audit-promedio-rojo-confuso.md`](estudiante-audit-promedio-rojo-confuso.md) — mismo componente, mismo `/design`.

## Componente probable

Mismo componente que `estudiante-audit-promedio-rojo-confuso` — `pages/estudiante/notas/` — es el texto que acompaña el mismo bloque de promedio general. Resolver en el mismo brief de implementación ya que tocan el mismo componente y la misma sección visual.

## Criterio de cierre

- Texto en dos líneas ("Evaluaciones calificadas: X/Y" + "Cobertura del curso: Z%") implementado, sin doble negación ni resta implícita.
- Mismo criterio aplicado consistentemente en las 3 vistas donde aparece este texto (Mis Calificaciones standalone, tab Notas dentro de Mis Salones, y el modal de curso vía Mis Cursos → Mis Calificaciones).

## Out-of-scope

- El bug de color del promedio (`estudiante-audit-promedio-rojo-confuso`) — relacionado pero es una decisión de producto separada, aunque compartan componente.
