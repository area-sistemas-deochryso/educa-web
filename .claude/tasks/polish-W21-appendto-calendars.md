<!-- created: 2026-05-18 -->

# polish-W21-appendto-calendars

> **Origen**: F1 audit del plan [`intranet-fe-polish-W21.md`](../plan/intranet-fe-polish-W21.md), 2026-05-18.
> **Severidad**: 🟡 (drift vs `rules/primeng.md` — `p-calendar` sin `appendTo="body"` puede romperse en modales con `overflow: hidden`).

## Scope

Agregar `appendTo="body"` a los `<p-calendar>` que aparecen embebidos en dialogs o contenedores con overflow.

## Hallazgos concretos

| Archivo | Líneas | Componente |
|---|---|---|
| `pages/profesor/cursos/components/attendance-summary-panel/attendance-summary-panel.component.html` | 11, 21 | 2 `<p-calendar>` sin `appendTo="body"` (fechaInicio + fechaFin del rango) |

## Criterio de cierre

- Las 2 instancias listadas tienen `appendTo="body"`.
- Grep final sobre `features/intranet/pages/` retorna 0 `<p-calendar>` sin `appendTo="body"`.

## Pre-work

Ver `rules/primeng.md` §"Regla CRÍTICA: appendTo='body' en Dropdowns".

## Estimación

Trivial (<15 min). 2 ediciones puntuales.
