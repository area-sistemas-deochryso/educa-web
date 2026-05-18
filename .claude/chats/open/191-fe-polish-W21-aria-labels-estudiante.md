# Brief 191 — Polish W21 · `aria-label` en botones icon-only (estudiante)

> **Branch**: `main`.
> **Plan**: [`plan/intranet-fe-polish-W21.md`](../../plan/intranet-fe-polish-W21.md) · F4 (brief derivado del audit F1).
> **Task base**: [`tasks/polish-W21-aria-labels-estudiante.md`](../../tasks/polish-W21-aria-labels-estudiante.md).
> **Creado**: 2026-05-18 · **Chat**: 1 · **Estado**: ⏳ pendiente arrancar.

---

## OBJETIVO

Agregar `[pt]="{ root: { 'aria-label': '...' } }"` en botones PrimeNG icon-only de `estudiante/schedules` y `estudiante/notas` para cumplir `rules/a11y.md` (drift 🔴 detectado en F1).

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → cierre. Razón: cambios mecánicos con regla clara; los textos descriptivos salen del contexto del botón.

## PRE-WORK OBLIGATORIO

- `rules/a11y.md` §"Botones PrimeNG con solo iconos" y §"Patrón pt para accesibilidad".

## ALCANCE

| Archivo | Líneas aprox | Botones afectados |
|---|---|---|
| `pages/estudiante/schedules/estudiante-horarios.component.html` | 23-30 | Day selector (Lun, Mar, …) — agregar aria-label descriptivo ("Ver horario del lunes", etc.) |
| `pages/estudiante/notas/...` (todos los `.html` del sub-tree) | TBD | Tags + icon buttons sin `pTooltip` ni `aria-label` |

> **Out-of-scope**: `profesor/grades` — se absorbe en el refactor F3 (brief separado cuando se ejecute).
> **Out-of-scope**: botones que ya tienen `label=` visible.

## TESTS MÍNIMOS

- Smoke manual con reader (NVDA / VoiceOver): cada botón icon-only es anunciado con texto descriptivo.
- O verificación inspeccionando DOM: cada `<button>` tiene atributo `aria-label` no vacío.

## REGLAS OBLIGATORIAS

- `rules/a11y.md` — patrón `pt` para `aria-label`, contraste, tooltip ≠ aria-label.

## VALIDACIÓN FINAL

- `npm run lint` limpio.
- `npm run build` limpio.
- Inspección manual de la página: cada botón icon-only del scope tiene `aria-label`.

## CRITERIOS DE CIERRE

- [ ] Todo botón con `icon=` y sin `label=` en el scope tiene `aria-label` vía `pt`.
- [ ] Day selector de `estudiante/schedules` tiene aria-label completo, no solo la inicial.
- [ ] Si conviven con `pTooltip`, `aria-label` también está presente.
- [ ] Lint + build limpios.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único con código + move + update maestro.

## COMMIT MESSAGE sugerido

`fix(intranet/estudiante): aria-label via pt on icon-only buttons (polish W21)`

## CIERRE

Confirmar al usuario que los aria-labels suenan naturales con screen reader (o al menos describen claramente la acción).
