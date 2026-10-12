# 02 — Parcial y cobertura por periodo (extensión de INV-C12)

> Propuesta independiente (NO es el brief 792, que es P110-F10 FE profesor). Scope cross-repo FE+BE explícito, decidido por el usuario 2026-10-12; aún sin brief ni número. Continúa [01-color-cobertura-promedio](01-color-cobertura-promedio.md) y el diseño P110-F1.

## Problema

INV-C12 normalizó el promedio **general** del curso que ve el estudiante, pero dejó "semana y periodo" bajo INV-C04 (Σ nota×peso sin normalizar). En la ficha del curso, cada periodo muestra esa suma acumulada: un periodo con una sola "A" de peso 20 % se ve como un número bajo y en rojo (el mismo defecto H18, un nivel más abajo). En la misma fila conviven el chip general ya normalizado y los chips de periodo sin normalizar.

## Opciones

- **A — Parcial + cobertura por periodo, calculados por el BE** (misma regla que el general). Pros: coherente con INV-C12, el FE no recalcula, un solo rótulo. Contras: cambia el contrato `mis-notas` (cross-repo) y hay que definir la base de la cobertura por periodo.
- **B — Solo FE: ocultar el número de periodo mientras falte cobertura.** Pros: sin BE. Contras: el estudiante pierde información, y el FE necesitaría derivar cobertura (prohibido por INV-C12).
- **C — Dejar INV-C04 en periodo y rotularlo "acumulado".** Pros: cero cálculo nuevo. Contras: sigue siendo una cifra que se lee como promedio.

## Recomendación

**A.** Es la extensión natural de INV-C12 y mantiene la regla "el BE calcula, el FE presenta". B contradice el invariante; C no resuelve la lectura engañosa.

## Decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Alcance | Parcial + cobertura por periodo, solo presentación al estudiante | El oficial, el cierre y la aprobación siguen en INV-C04 (no se toca) |
| Dueño del cálculo | Backend | Regla vigente de INV-C12 |
| Repos | Cross-repo explícito: coord (invariante) → BE → FE | Decisión del usuario |
| Base de la cobertura por periodo | **Relativa al periodo** (decidido 2026-10-12): peso calificado ÷ peso de las evaluaciones existentes en el periodo | Permite llegar a 100 % y que el rótulo desaparezca; es contrato, caro de revertir |
| Aditivo en el contrato | Los campos nuevos se agregan; el `promedio` actual de periodo se conserva | Compatibilidad con FE desplegado y con vistas del profesor |

## Fases funcionales

- **F0 — Contrato.** Actualizar el invariante INV-C12 en educa-coord (alcance, definición de cobertura por periodo, rótulo) y corregir la discrepancia de la jerarquía de promedios solo si está dentro del alcance. `depends_on: []`
- **F1 — Backend.** El BE entrega, por periodo, el parcial y la cobertura con la misma regla del general, por todos los caminos que hoy arman el promedio por periodo (el camino EF y el camino por SP). Tests nombrando el ID del invariante. `depends_on: [F0]`
- **F2 — Frontend.** La ficha del curso presenta cada periodo con el parcial y rótulo "Parcial · X % evaluado" mientras la cobertura sea < 100 %, "Sin calificar" con 0 %, con escala del curso y semáforo sobre el parcial. El simulador mantiene su regla. `depends_on: [F1]`
- **F3 — Verificación y cierre de docs.** Smoke con datos reales (local + BBDD), actualizar catálogo de contratos y registro de invariantes. `depends_on: [F2]`

Orden: contrato primero (CHARTER); BE antes que FE porque el FE consume campos que aún no existen; sin paralelismo real entre F1 y F2.

## Done-when

- Un periodo con una sola evaluación calificada ya no muestra una cifra acumulada engañosa: muestra el parcial con su cobertura.
- Con cobertura completa del periodo el rótulo desaparece y parcial = oficial del periodo.
- Con 0 % el estudiante ve "Sin calificar", nunca una cifra.
- El promedio oficial, el cierre del periodo, la aprobación y las vistas del profesor no cambian.

## Riesgos y observaciones

- **Base de la cobertura por periodo.** En el curso, los pesos son fracciones absolutas que suman 1.0, por eso Σpeso×100 funciona como cobertura. En un periodo no existe esa referencia: sus evaluaciones no suman 1.0 y el profesor las va creando durante el periodo. Dos lecturas posibles: (1) cobertura = peso calificado ÷ peso de las evaluaciones existentes en el periodo (puede llegar a 100 % aunque queden evaluaciones por crear); (2) cobertura absoluta = aporte al curso (nunca llega a 100 % en un periodo y el rótulo no desaparecería). Hay que elegir antes de F0.
- Hay más de un camino de construcción del promedio por periodo en el BE; un cambio parcial dejaría respuestas inconsistentes según el origen de datos.
- La jerarquía documentada ("curso = media de periodos") difiere del cálculo real; no mezclar su corrección con este trabajo salvo decisión explícita.
- El FE desplegado debe seguir funcionando con una respuesta BE aditiva, y el BE con un FE que aún no lee los campos nuevos.

## Fuera de alcance

Promedio por semana; vistas de profesor y admin; cierre de periodo, aprobación y reportes; corrección de la jerarquía de promedios; simulador salvo alineación visual.

## Reglas e invariantes

INV-C04, INV-C12, INV-U06 (escala), aprobacion.md, CHARTER (invariante primero), `one-repo-one-chat` (scope cross-repo explícito), rate/API contract aditivo.
