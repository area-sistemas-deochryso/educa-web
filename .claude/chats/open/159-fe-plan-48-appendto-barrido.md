# 159 — Plan 48: barrido `appendTo="body"` en 7 `p-select`

> **Repo destino**: `educa-web`
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`

## Scope

Ejecutar el Plan 48 ([appendto-barrido.md](../../plan/appendto-barrido.md)):

1. **F1** — inventario exacto con `Grep` (la cifra de 7 archivos puede haber cambiado desde 2026-05-13).
2. **F2** — agregar `appendTo="body"` a cada `<p-select` que no lo tenga.
3. **F3** — re-grep para confirmar 0 instancias restantes + lint.

## Out of scope

- `p-multiselect`, `p-dropdown`, `p-calendar` — solo `p-select` en este chat (mismo criterio aplica si aparecen, pero el inventario fue específico de `p-select`).
- Refactorizar componentes que usen los `p-select` afectados.

## Criterio de cierre

- 0 archivos en `src/**/*.html` con `<p-select` y sin `appendTo`.
- Lint pasa.

## Tiempo estimado

~30 min.
