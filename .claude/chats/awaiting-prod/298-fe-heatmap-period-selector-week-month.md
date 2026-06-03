> **Branch**: `main`
> **Plan**: —
> **Creado**: 2026-06-03 · **Chat**: 1 · **Estado**: ⏳ pendiente arrancar.
> **exclusive**: false · **isolation**: worktree · **touches**: `features/intranet/monitoreo/error-groups` · **hot-paths**: —

---

# Heatmap: selector de periodo semana/mes

## OBJETIVO

Agregar un selector de periodo (semana/mes) al heatmap de error-groups en el frontend. El backend ya expone el parámetro (commit `cfad82d` en `master`), falta consumirlo desde el FE.

## MODO SUGERIDO

Arrancar con `/investigate`. Flujo: `/investigate` → `/execute` → `/validate` → cierre. Razón: hay que verificar qué cambió en el endpoint BE (shape del param, valores posibles) antes de implementar el control UI.

## PRE-WORK OBLIGATORIO

- Leer commit `cfad82d` en Educa.API para entender el parámetro expuesto (nombre, tipo, valores válidos, default).
- Leer el componente heatmap actual para entender cómo se pasan parámetros al endpoint.
- Leer `reference/design-system.md` — el selector va en una página intranet.

## ALCANCE

- Componente heatmap (agregar control de periodo — probablemente `p-selectbutton` o `p-dropdown`).
- Store/facade que invoca el endpoint (agregar parámetro de periodo al request).
- Adapter/model si el DTO cambió.

## TESTS MÍNIMOS

- Selector renderiza con opciones semana/mes.
- Cambiar periodo dispara nueva request con el parámetro correcto.
- Default coherente con el backend (verificar cuál es en la investigación).

## REGLAS OBLIGATORIAS

- `code-style.md` — OnPush, standalone, inject(), logger.
- `code-language.md` — código en inglés, UI en español ("Semana", "Mes").
- `reference/design-system.md` — tokens de color, componentes PrimeNG.
- `reference/a11y.md` — aria-label en el selector.

## IMPLEMENTATION DETAIL (ADR-0006)

Concrete context from the closing BE chat:
- **BE commit**: `cfad82d` on `master` — adds period parameter to heatmap endpoint.
- **Current FE state**: heatmap exists in error-groups but has no period selector; uses a fixed period.
- **DayOfWeek fix**: same commit also fixed a DayOfWeek bug in the heatmap — FE may need to verify alignment.

## APRENDIZAJES TRANSFERIBLES

- El commit BE `cfad82d` tiene el mensaje `feat(error-groups): add event view, trace/group tabs, heatmap DayOfWeek fix` — el selector de periodo fue parte de un commit más grande. Investigar qué parte del diff corresponde al periodo.
- El heatmap ya tenía un bug de DayOfWeek que se corrigió en el mismo commit — validar que el FE refleje el fix correctamente.

## FUERA DE ALCANCE

- Event view y trace/group tabs (otras features del mismo commit BE — tienen sus propios briefs).
- Refactor del heatmap más allá del selector.
- Cambios en el endpoint BE.

## VALIDACIÓN FINAL

- [ ] `npx ng build` sin errores.
- [ ] `npx ng lint` limpio.
- [ ] Smoke test manual: abrir heatmap, cambiar semana↔mes, verificar que los datos cambian.
- [ ] Verificar que DayOfWeek se muestra correcto en ambos periodos.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único.

## COMMIT MESSAGE sugerido

```
feat(error-groups): add week/month period selector to heatmap
```

## CIERRE

Pedir al usuario smoke test en browser: cambiar periodo y confirmar que el heatmap refleja datos distintos.
