<!-- created: 2026-08-11 -->

# estudiante-audit-promedio-rojo-confuso

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🔴 (UX con impacto emocional real en usuarios menores — no es solo estética).
> **Tipo**: decisión de producto tomada (2026-08-11) — listo para `/design` antes de `/execute` (toca ≥3 superficies: notas de estudiante + 2 vistas del profesor, ver [`profesor-audit-promedio-confuso.md`](profesor-audit-promedio-confuso.md)).

## Reproducción

1. Loguear como estudiante con exactamente 1 de N evaluaciones calificadas (usado: tarea calificada 18.0/20, peso 20% del curso — resto del curso sin evaluaciones publicadas aún).
2. Ir a "Mis Calificaciones" (`/intranet/estudiante/notas`) o al tab "Notas" dentro de "Mis Salones".
3. Ver "PROMEDIO GENERAL" en rojo grande: **3.6**.
4. Ver debajo: "20% del curso evaluado (faltan 0 de 1 evaluaciones)".

**Actual**: el "3.6" es el promedio ponderado incluyendo el 80% del curso todavía sin evaluar (con peso 0 implícito), coloreado en rojo — el mismo color que usaría para "nota reprobatoria real". La única nota real que existe es 18/20 (excelente). No hay ninguna distinción visual entre "vas mal" y "todavía no hay suficiente información para promediar".

**Por qué importa (perspectiva de rol)**: el usuario de esta pantalla es, en la mayoría de los casos, un chico de primaria o secundaria mirando su propia nota. Un número grande en rojo se lee como señal de alarma sin necesidad de leer el texto explicativo chico debajo — y niños de primaria en particular pueden no leer o no entender la letra pequeña que aclara el contexto. El riesgo es autoestima/ansiedad innecesaria por una lectura errónea de una UI, no un problema de "falta de dato".

## Decisión tomada (2026-08-11)

El modelo de cálculo **no cambia**: "PROMEDIO GENERAL" sigue siendo el promedio ponderado sobre el 100% del curso, tratando lo aún no evaluado como 0 — es matemáticamente correcto (promedio ponderado final, "a falta de más notas queda donde queda") y se mantiene exactamente igual. Lo que se corrige es exclusivamente la comunicación visual: el color de alarma se aplicaba sobre ese número sin considerar cuánta información real lo respalda.

**Fix decidido — desacoplar el color de la cobertura evaluada** (antes "Alternativa 1" de este brief):

- Definir un umbral de **% de curso evaluado** (punto de partida propuesto: **50%** — ajustable, no es un valor de negocio cerrado ni parte de esta decisión).
- **Por debajo del umbral**: el número se sigue mostrando igual (ej. 3.6), pero en color **neutro** (gris/azul), con un ícono de "provisional" — nunca rojo ni verde, sin importar el valor.
- **En o por encima del umbral**: se aplica el semáforo real (rojo si es bajo, verde si es alto) — a esa altura el promedio ya es representativo y la alarma está justificada.
- El texto de apoyo (relacionado: [`estudiante-audit-evaluaciones-pendientes-texto.md`](estudiante-audit-evaluaciones-pendientes-texto.md)) debería reforzar esto cuando está bajo el umbral, ej. "Promedio provisional — se actualizará conforme se califiquen más evaluaciones" en vez de solo el % evaluado.

Explícitamente **descartadas**: mostrar dos números en paralelo (antes alternativa 2 — confunde más de lo que aclara para el público objetivo) y cambiar el criterio de color a "promedio de lo evaluado únicamente" (antes alternativa 3 — eso cambiaría el número mostrado, no solo su color, y no era lo pedido).

## Alcance confirmado en el audit de profesor

El mismo "3.6" en rojo aparece también en las vistas del profesor ("Notas por Estudiante" y "Notas del Salón" dentro de "Mis Salones") — ver [`profesor-audit-promedio-confuso.md`](profesor-audit-promedio-confuso.md). El fix debe implementarse una sola vez y consumirse desde las 3 superficies, no duplicarse.

## Componente probable

`pages/estudiante/notas/` (ya identificado como "split sano" en `intranet-fe-polish-W21.md`) — lógica de color del promedio general, probablemente un breakpoint de umbral (`< 11` → rojo, o similar) aplicado sin considerar `% evaluado`. Ideal: extraer a una función/pipe compartida con las 2 vistas del profesor.

## Criterio de cierre

- Umbral de % evaluado definido y aplicado de forma centralizada (no una condición hardcodeada por página).
- Con el dato de prueba de esta sesión (18/20 en 20% del curso, por debajo del umbral propuesto de 50%): el número se muestra en color neutro, no rojo, en las 3 superficies (estudiante + 2 vistas de profesor).
- Con un curso que supere el umbral y tenga promedio real bajo: sigue mostrando rojo (no se pierde la alarma legítima).

## Out-of-scope

- Rediseño completo de la pantalla de calificaciones — solo el criterio de color/mensaje del promedio general.
- Cambiar el modelo de cálculo del promedio — se mantiene el ponderado sobre el 100% del curso, sin cambios.
