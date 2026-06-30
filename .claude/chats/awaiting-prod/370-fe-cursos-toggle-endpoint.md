# 370 — FE: consume dedicated cursos toggle endpoint

> **Origen**: Educa.API chat 369 · commit `3582fb18` · 2026-06-26
> **Repos afectados**: `educa-web`
> **MODO SUGERIDO**: `/execute`

## Contexto del cambio

Backend added `PATCH /api/sistema/cursos/{id}/toggle-estado` to avoid `DbUpdateConcurrencyException` from rapid toggling via the full PUT update endpoint. The new endpoint returns `{ estado: bool, rowVersion: string }`.

## Impacto en este repo

- Update cursos service to call `PATCH /{id}/toggle-estado` instead of PUT for toggle operations.
- Update the rowVersion in local state from the response to keep concurrency consistent.
- The existing PUT endpoint is unchanged — only toggle uses the new PATCH.

## Scope

- [x] Service method for toggle call.
- [x] Wire up in cursos list/detail component toggle button.
- [x] Update rowVersion from response.

## Tiempo estimado

~30 min.

> **Validación prod**: ⏳ pendiente desde 2026-06-27
