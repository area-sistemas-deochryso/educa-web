# 458 — Selector de calificación literal en `calificar-dialog.component`

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-16 · **Modo sugerido**: `/execute` (diseño ya cerrado en `educa-coord` brief 445)
> **Plan**: `../educa-coord/plans/xrepo-88-calificacion-literal-modal-calificar.md`
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - `src/app/features/intranet/**/calificar-dialog/calificar-dialog.component.html`
>   - `src/app/features/intranet/**/calificar-dialog/calificar-dialog.component.ts`
>   - `src/app/features/intranet/**/calificar-dialog/calificar-dialog.helpers.ts`

## Contexto

`calificar-dialog.component` ya recibe el input `calificacionConfig` (bug de wiring resuelto en brief 449). El componente siempre renderiza `p-inputNumber` para cargar la nota, sin importar si el nivel está configurado como `tipoCalificacion === 'LITERAL'`. El backend no necesita cambios — la nota se sigue guardando como `decimal` numérico; la letra es una vista derivada por rango (`ConfiguracionCalificacionLiteral.CCL_NotaMinima/CCL_NotaMaxima`).

### Severidad confirmada en vivo (2026-07-17, auditoría visual, ver brief 464 estudiante — este hallazgo es de profesor)

Se verificó contra `TEST DB` (curso `Arte`, nivel `INICIAL 3 AÑOS B`, profesor `MENDO CALDERON MARIELA`) que este bug **no es solo cosmético** — rompe activamente la clasificación aprobado/desaprobado:

1. `GET /api/ConfiguracionCalificacion/nivel/Inicial?anio=2026` devuelve literales (`AD`, `A`, `B`, `C`) **sin** `notaMinima`/`notaMaxima` (los campos no vienen en el DTO).
2. `LiteralScale.findLiteral()` (`data/adapters/grade/literal-scale.adapter.ts:56-65`) exige `literal.notaMinima !== null && literal.notaMaxima !== null` para poder mapear una nota numérica a una letra. Sin esos campos, **nunca encuentra coincidencia**.
3. `classify()` cae al fallback `{ esAprobatoria: false, label: '-' }` — es decir, **cualquier nota numérica ingresada en el modal (18.0, 20.0, lo que sea) se clasifica como "desaprobada"**, porque el modal deja ingresar un número (bug de este brief) en un curso que el sistema espera calificar por letra.
4. Confirmado en pantalla: modal "Calificar" mostró `"0 aprobados · 1 desaprobados"` con la única nota registrada siendo **18.0/20** — contradicción directa, visible para cualquier profesor de nivel Inicial que abra el modal de calificar.
5. **No es un caso aislado de Inicial**: se reprodujo el mismo patrón en el curso `QA E2E Curso Prueba` (`1RO PRIMARIA A`, 20 estudiantes) — misma nota 18.0 clasificada como "0 aprobados / 1 desaprobados". Se verificó `GET /api/ConfiguracionCalificacion/nivel/Primaria?anio=2026`: también `tipoCalificacion: "LITERAL"`, también sin `notaMinima`/`notaMaxima` en los literales. **Es sistemático en todo el entorno de prueba actual, no exclusivo de un nivel** — cualquier curso configurado como LITERAL sin rangos numéricos rompe la clasificación de aprobado/desaprobado para toda nota ingresada vía el input numérico.

**Implicación para el fix**: no alcanza con agregar el selector de letras en el modal (scope original). También hay que decidir qué pasa con los literales que ya vienen sin `notaMinima`/`notaMaxima` desde el backend — si el selector de letra reemplaza el input numérico, el profesor ya no depende de `findLiteral()` para clasificar (selecciona la letra directo, que ya trae `esAprobatoria` explícito), así que el fix de UI probablemente resuelve esto de forma incidental. Pero verificar que no queden otros puntos del código (reportes, boletas, notificaciones a apoderados) que sigan llamando `classify()`/`isNotaAprobada()` sobre notas numéricas de cursos LITERAL sin pasar por el selector — esos seguirían rotos del mismo modo.

### Causa raíz confirmada: gap de UI, no de datos (2026-07-17, auditoría Director)

Verificado en vivo (rol Director, `SANCHEZ QUISPE MARIA OTILIA`) que el problema **no es que falten datos de rango en la BD de prueba** — es que la UI de administración nunca ofrece cómo cargarlos:

- `config-calificacion-dialog.component.ts` (diálogo "Config Calificaciones" en `Gestión de Salones` → nivel Inicial/Primaria/Secundaria) define `LiteralRow` con `notaMinima: number | null` y `notaMaxima: number | null` (líneas 24-29), y los inicializa siempre en `null` — tanto en `defaultLiterales()` (líneas 171-177) como al agregar un literal nuevo (líneas 149-154).
- El **template del diálogo no renderiza ningún input** para `notaMinima`/`notaMaxima` — solo expone `letra`, `descripcion`, el checkbox `esAprobatoria` y `orden` (confirmado visualmente: 4 filas AD/A/B/C, cada una con 2 campos de texto + 1 checkbox + orden, sin campo numérico de rango).
- Conclusión: aunque un Director o Administrador quisiera corregir el bug de "0 aprobados" manualmente desde la UI (cargando los rangos faltantes), **no puede** — el campo no existe en el formulario, pese a que el modelo y el backend sí lo soportan. El fix de este brief (selector de letra en `calificar-dialog`) resuelve el síntoma para el flujo de calificar, pero el diálogo de configuración también necesita los 2 inputs numéricos si se quiere permitir configurar el rango sin ir directo a la base de datos.

Diseño completo y decisiones de producto ya resueltas en `xrepo-88-calificacion-literal-modal-calificar.md` §§ "Propuesta de contrato" y "Decisiones tomadas". Resumen de las decisiones:

1. **Valor numérico por letra**: punto medio del rango — `(CCL_NotaMinima + CCL_NotaMaxima) / 2`.
2. **Stat "Prom: X.X"**: se oculta cuando el modo es Literal.
3. **Sin convivencia de modos** dentro de un mismo nivel — la config sigue siendo por nivel+año, no requiere UI para elegir modo por curso.
4. **Notas históricas**: no se tocan, sin backfill.

## Scope

- En los 3 puntos de entrada de nota del componente (individual, grupal, override de miembro): agregar rama condicional — cuando `calificacionConfig()?.tipoCalificacion === 'LITERAL'` y `literales.length > 0`, reemplazar `p-inputNumber` por un selector (`p-select`) de literales ordenados por `CCL_Orden`. En cualquier otro caso (incluido `LITERAL` sin literales configurados), fallback a `p-inputNumber` — mismo comportamiento de fallback que ya usa `grade-scale.factory.ts`, mantener consistencia.
- Al seleccionar una letra: calcular `(CCL_NotaMinima + CCL_NotaMaxima) / 2` y asignarlo al mismo campo `nota` que ya usa el resto del componente (stats, `p-tag` de severidad, payload de guardado vía `updateNota`/`updateGrupoNota`/`updateMiembroOverride`).
- Al abrir el diálogo con una nota ya guardada: usar `LiteralScale.findLiteral(nota)` (ya implementado, no requiere código nuevo) para preseleccionar la letra correspondiente en el dropdown.
- En `calificar-dialog.helpers.ts` (`calcIndividualStats`/`calcGrupoStats`): ocultar el stat "Prom: X.X" del header cuando el modo es Literal (decisión #2). `aprobados`/`desaprobados` siguen funcionando sin cambios (ya delegan a `LiteralScale` internamente).

## Out of scope

- Cambios de backend — `CalificarEstudianteDto`, `CalificarLoteDto`, `CalificarGrupoDto`, `ActualizarNotaDto` quedan igual.
- Backfill de notas históricas.
- Soporte de modo mixto (literal + numérico) dentro de un mismo nivel.

## Criterio de cierre

- [ ] Selector de letras visible y funcional en los 3 puntos de entrada, solo cuando `tipoCalificacion === 'LITERAL'`.
- [ ] Guardar una nota vía letra persiste el punto medio del rango correcto en `nota`.
- [ ] Abrir el diálogo con una nota ya guardada en un curso Literal preselecciona la letra correcta.
- [ ] Stat "Prom: X.X" oculto en modo Literal, visible sin cambios en modo Numérico.
- [ ] Fallback a `p-inputNumber` cuando `tipoCalificacion === 'LITERAL'` sin literales configurados.
- [ ] Build + lint + tests OK. Verificado en vivo contra `INICIAL 3 AÑOS B` (TEST DB).

## Tiempo estimado

~45-60 min (3 puntos de entrada + helper de stats, sin cambio de backend).
