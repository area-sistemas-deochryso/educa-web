> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Origen**: hallazgo derivado del brief [598](../closed/598-meta-refresh-post-589.md) (meta-refresh post-589) — fuera de su scope cerrado.

# 658 — Audit: `design-system.md` tiene ~69 referencias a tags/clases PrimeNG que ya no existen en el código

## Contexto

598 corrigió las referencias a `p-tag`/`tag-neutral` (el hallazgo puntual de 589). Al verificar si quedaban más referencias sueltas a PrimeNG en el doc, apareció algo más grande: `design-system.md` (1222 líneas) tiene **69 matches** de `p-button`/`p-table`/`p-dialog`/`p-select`/`pButton`, y al menos `<p-table>` y `<p-dialog>` como **elementos de template ya no existen en el código** (0 matches de `<p-table`/`<p-dialog` en `src/app/features/intranet`, vs. 229 usos de `<edu-table`/`<edu-dialog`/`<edu-button`/`<edu-select`).

598 no lo resolvió porque su scope estaba cerrado a los 3 hallazgos de la auditoría 597 (tag-neutral), y esto es sustancialmente más grande que "2-3 referencias sueltas" — amerita su propio brief.

## Items

- [ ] Barrido completo de `design-system.md`: cada bloque de código (`<p-table>`, `<p-dialog>`, `<p-button ...>`/`pButton`, `<p-select>`, clases `.p-button-*`, `.p-dialog-*`) — migrar al equivalente `edu-ui` (`<edu-table>`, `<edu-dialog>`, `<edu-button>`, `<edu-select>`, clases `edu-*`).
- [ ] Confirmar contra código real cuál es el naming vigente de cada clase/selector (`edu-button`/`edu-dialog` scss classnames pueden diferir del nombre del componente — verificar en `edu-ui` vendorizado o `src/app/shared`).
- [ ] Sección 8 (Tokens de color, D) ya documenta el shim `--p-*` — **no tocar esa sección**, es intencional (compat layer real, no doc desactualizado).
- [ ] Actualizar línea 7 y 11 ("fuente de verdad para overrides de PrimeNG") si el override global ya no es sobre PrimeNG sino sobre `edu-ui`.

## Qué NO hacer

- No tocar la sección de tokens de color (`--p-*` shim) — es documentación de un compat layer vigente, no un residuo de PrimeNG.
- No expandir a otros docs de `.claude/reference/` — este brief es solo `design-system.md`.

## Modo sugerido

`/execute` (posible `/investigate` corto primero para confirmar naming exacto de clases `edu-*` contra el código real antes de escribir los ejemplos).
