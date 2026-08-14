<!-- created: 2026-08-13 -->

# 01 — Color y texto de cobertura del promedio (compartido entre 3 superficies)

> **Origen**: [`estudiante-audit-promedio-rojo-confuso.md`](../../tasks/estudiante-audit-promedio-rojo-confuso.md), [`estudiante-audit-evaluaciones-pendientes-texto.md`](../../tasks/estudiante-audit-evaluaciones-pendientes-texto.md), [`profesor-audit-promedio-confuso.md`](../../tasks/profesor-audit-promedio-confuso.md).
> **Decisión de producto**: ya tomada en los 3 briefs (2026-08-11/12). Este plan es el diseño técnico de *cómo* implementarla una sola vez para las 3 superficies, no una nueva decisión de producto.

## Problema

"PROMEDIO GENERAL" se calcula ponderado sobre el 100% del curso (tratando lo no evaluado como 0 — correcto, no cambia). Pero hoy el color rojo/verde se aplica sobre ese número sin considerar cuánta cobertura real lo respalda: con 1 sola nota (18/20, peso 20%) el promedio da 3.6 y se pinta rojo, igual que una nota reprobatoria real. Esto ocurre en 3 superficies (estudiante, profesor·detalle, profesor·tabla), y en la de estudiante además el texto de apoyo ("faltan 0 de 1 evaluaciones") es ambiguo. La lógica de color hoy vive sólo en la vista de estudiante (`notas-curso-card`); las 2 vistas de profesor no tienen ningún cálculo de cobertura.

## Opciones

**Opción A — Todo cliente, función pura compuesta (recomendada)**
- % de cobertura se sigue calculando en el navegador (mismos datos que ya llegan hoy: evaluaciones con peso + notas por estudiante), igual que ya hace la vista de estudiante.
- La decisión de color se resuelve componiendo la clasificación de nota que ya existe (`clasificarNota`, la misma que usan las 3 superficies para colorear notas individuales) con el % de cobertura.
- El umbral vive como una única constante de código, nombrada, no repetida.
- Costo: bajo. No cruza a Educa.API. No hay coordinación cross-repo.

**Opción B — Cobertura y umbral en backend**
- Educa.API agrega el % de cobertura al DTO de promedio, y el umbral se suma a `ConfiguracionCalificacion` por nivel educativo (mismo lugar donde ya vive `passingGrade`).
- Pros: fuente única del lado servidor, umbral configurable por nivel sin deploy de FE.
- Contras: cruza a un segundo repo (Educa.API), requiere coordinación vía `educa-coord`, y ninguna de las 3 decisiones de producto pide que el umbral sea configurable — el brief de estudiante lo declara explícitamente "no es un valor de negocio cerrado ni parte de esta decisión". Es trabajo no pedido hoy.

## Recomendación

Opción A. Resuelve exactamente lo decidido, sin abrir un frente en Educa.API que nadie pidió. Si en el futuro se decide que el umbral debe ser configurable por nivel, la migración a Opción B no toca los call-sites de las 3 superficies — sólo cambia de dónde sale el número y la constante.

## Decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Composición con la clasificación de nota existente | Función nueva que **envuelve** `clasificarNota` (no le agrega parámetros opcionales) | `clasificarNota`/`getNotaSeverity` ya tiene ~14 call-sites para notas individuales, que no tienen noción de "cobertura" (una nota puntual siempre está 100% cubierta). Agregar cobertura ahí forzaría a todos esos call-sites a pensar en un concepto que no les aplica. |
| Representación del % de cobertura | Entero 0-100 (no fracción 0-1) | Es lo que ya calcula y muestra hoy la vista de estudiante (`Math.round(pesoEvaluado * 100)`) — mantener esa convención evita una conversión extra en el único lugar que ya funciona. |
| Color del estado "provisional" | Reusar el severity `secondary` (gris) que las 3 superficies ya usan para "sin nota" | Ya es gris/neutro, ya existe en el tipo de severity que consumen las 3 superficies (`success \| warn \| danger \| secondary`) — no hace falta un 5to valor. Se distingue de "sin nota" porque el número sigue mostrando el valor real (3.6), no un placeholder. |
| Alcance del texto de dos líneas | Sólo superficie de estudiante | Los 2 briefs de profesor piden color, ninguno pide el texto de cobertura en sus vistas — no hay decisión de producto que lo respalde ahí. |

## Fases funcionales

### F1 — Fórmula de cobertura evaluada
`depends_on: []`

Una función pura, única, que dado el conjunto de evaluaciones de un curso (cada una con su peso) y cuáles de ellas tienen nota registrada para un estudiante puntual, devuelve el % del curso efectivamente evaluado. Reemplaza el cálculo que hoy sólo existe (duplicable) en la vista de estudiante, y que las 2 vistas de profesor no tienen en absoluto.

### F2 — Clasificación de color con cobertura
`depends_on: [F1]`

Una función pura que, dado el promedio calculado y su % de cobertura, decide si se aplica el semáforo real (delegando en la clasificación de nota ya existente) o el estado neutro/"provisional" cuando la cobertura está por debajo del umbral. No cambia el número mostrado — sólo la severidad/color y un indicador de "provisional". El umbral vive como constante nombrada única.

### F3 — Texto de cobertura sin resta implícita
`depends_on: [F1]`

Una función pura que formatea el estado de cobertura en dos líneas explícitas ("Evaluaciones calificadas: X/Y" + "Cobertura del curso: Z%"), reemplazando la frase ambigua actual ("faltan 0 de 1 evaluaciones"). Usa los mismos insumos que deriva F1. Puede ejecutarse en paralelo con F2 — ninguna depende de la otra, ambas sólo de F1.

### F4 — Consumo en las 3 superficies
`depends_on: [F2, F3]`

Reemplaza la lógica de color hoy duplicada (estudiante) o ausente (profesor·detalle, profesor·tabla) por el resultado de F2 en las 3 superficies. Reemplaza el texto ambiguo por el resultado de F3 únicamente en la superficie de estudiante (single componente, ya reutilizado por sus 3 rutas de entrada — no hace falta tocarlo 3 veces). Las vistas de profesor no ganan el texto de dos líneas.

## Done-when

- Con el caso de prueba de los 3 audits (18/20 en 20% del curso, umbral 50%): las 3 superficies muestran color neutro/"provisional" para el promedio general, no rojo.
- Con un promedio real bajo y cobertura ≥ umbral: las 3 superficies siguen mostrando rojo — la alarma legítima no se pierde.
- El número mostrado (ej. "3.6") no cambia en ningún escenario — sólo color/ícono/texto.
- La superficie de estudiante muestra el texto en dos líneas, sin resta implícita, en sus 3 rutas de entrada (standalone, tab de salón, modal de curso).
- El umbral de cobertura existe en un único lugar nombrado en el código, no repetido por superficie.
- Ninguna de las 3 superficies calcula el % de cobertura con una fórmula propia — las 3 consumen la misma función de F1.

## Dependencias

- Datos ya disponibles hoy en las 3 superficies (evaluaciones con peso + notas por estudiante) — sin cambios de API/contrato.
- No depende de Educa.API.
- Relacionado con `ConfiguracionCalificacion` sólo en tanto ya se usa para la escala de notas (vigesimal/literal) — el umbral de cobertura **no** se integra a esa configuración en este alcance.

## Fuera de alcance

- Cambiar el modelo de cálculo del promedio (sigue ponderado sobre el 100% del curso).
- Mostrar dos promedios en paralelo (descartado en la decisión de producto).
- Umbral configurable por nivel/backend (Opción B) — queda como constante de código.
- Agregar el texto de dos líneas a las vistas de profesor.
- Rediseño visual completo de la pantalla de calificaciones.
- El componente `grades-modal` (widget de horario/dashboard) — tiene su propia lógica de color de nota independiente, no es una de las 3 superficies identificadas en los audits. Se detectó durante la investigación pero no forma parte de esta decisión; posible deuda a evaluar aparte.

## Reglas/invariantes aplicables

- **INV-C04** (promedio ponderado, mirror de `PromedioPonderadoCalculator` del backend) — no se toca.
- `coding.md` / `code-language.md` — nombres de función/constante nuevos en inglés, textos de dominio (labels, mensajes) en español.
- `commit-style.md` — al ejecutar.

### Worktree strategy
- **Isolation**: worktree (default)
- **Exclusive**: false — toca sólo `educa-web`, sin overlap conocido con otros chats activos
- **Touches**: capa de utilidades compartidas de calificación (`shared/utils`), componente de tarjeta de notas de estudiante, tabs de notas de profesor (detalle + tabla del salón)
- **Parallel risk**: ninguno detectado

## Contract checklist

- [ ] Existe una función pura para % de cobertura evaluada, consumida por las 3 superficies (ninguna calcula su propia fórmula).
- [ ] Existe una función pura de clasificación de color que compone `clasificarNota` existente y no le agrega parámetros de cobertura directamente.
- [ ] El umbral de cobertura es una única constante nombrada en el código (no un literal repetido).
- [ ] Con cobertura < umbral, la severidad devuelta es `secondary` (neutra) independientemente del valor numérico del promedio.
- [ ] Con cobertura ≥ umbral, la severidad devuelta es la del semáforo real (delegada a `clasificarNota`).
- [ ] El número/valor del promedio mostrado no cambia entre el camino "provisional" y el camino "real".
- [ ] La superficie de estudiante (`notas-curso-card`) reemplaza el texto ambiguo por las dos líneas ("Evaluaciones calificadas: X/Y" + "Cobertura del curso: Z%").
- [ ] Las 2 superficies de profesor (`salon-notas-estudiante-tab`, `salon-notas-tab`) consumen la nueva clasificación de color para el promedio "General" (y, si aplica, por período).
- [ ] Las vistas de profesor no muestran el texto de dos líneas (no está pedido).
