# Brief 188 — Polish W21 · `appendTo="body"` en `p-calendar`

> **Branch**: `main`.
> **Plan**: [`plan/intranet-fe-polish-W21.md`](../../plan/intranet-fe-polish-W21.md) · F4 (brief derivado del audit F1).
> **Task base**: [`tasks/polish-W21-appendto-calendars.md`](../../tasks/polish-W21-appendto-calendars.md).
> **Creado**: 2026-05-18 · **Chat**: 1 · **Estado**: ⏳ pendiente arrancar.

---

## OBJETIVO

Agregar `appendTo="body"` a los 2 `<p-calendar>` del `attendance-summary-panel` (profesor/cursos) para evitar clipping en contenedores con `overflow: hidden`.

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → cierre. Razón: 2 ediciones puntuales con criterio claro, no requiere diseño ni investigación.

## PRE-WORK OBLIGATORIO

- `rules/primeng.md` §"Regla CRÍTICA: appendTo='body' en Dropdowns".

## ALCANCE

| Archivo | Líneas | Cambio |
|---|---|---|
| `src/app/features/intranet/pages/profesor/cursos/components/attendance-summary-panel/attendance-summary-panel.component.html` | 11, 21 | Agregar `appendTo="body"` a los 2 `<p-calendar>` (fechaInicio + fechaFin) |

Estimación: <15 min, 2 atributos.

## VALIDACIÓN FINAL

- `grep -rn "<p-calendar" src/app/features/intranet/pages/` retorna 0 instancias sin `appendTo="body"`.
- `npm run lint` limpio.
- Smoke manual (opcional): abrir el rango de fechas dentro de cualquier dialog que use el panel y verificar que el calendario se renderiza completo.

## CRITERIOS DE CIERRE

- [ ] 2 instancias listadas tienen `appendTo="body"`.
- [ ] Lint limpio.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único con código + move + update maestro.

## COMMIT MESSAGE sugerido

`fix(intranet/cursos): appendTo="body" en p-calendar del attendance summary (polish W21)`

## CIERRE

Confirmar al usuario: "¿corro `/end` con commit local FE?".
