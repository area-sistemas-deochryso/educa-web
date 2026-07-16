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
