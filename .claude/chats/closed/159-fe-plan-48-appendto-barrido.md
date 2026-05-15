# 159 — Plan 48: barrido `appendTo="body"` en 7 `p-select`

> **Repo destino**: `educa-web`
> **Creado**: 2026-05-13 · **Cerrado**: 2026-05-15 · **Estado**: ✅ shipped.
> **MODO SUGERIDO**: `/execute`

## Cierre

- **Inventario real**: 4 archivos (drift bajó de 7 → 4 desde 2026-05-13).
- **Tags modificados**: 5
  - `attendance-table.component.html` — 2 (`hijosOptions`, `monthOptions`)
  - `permisos-usuarios.component.html` — 1 (filter rol)
  - `usuario-form-dialog.component.html` — 1 (campo rol)
  - `login-intranet.component.html` — 1 (selector rol)
- **Verificación**: re-grep retorna 0 instancias de `<p-select` sin `appendTo` en `src/**/*.html`. Lint limpio.
- **Aprendizaje transferible**: el inventario oportunístico al arrancar (no al planificar) evita trabajar sobre números viejos. Drift natural cerró 3 archivos entre 2026-05-13 y 2026-05-15 sin acción explícita.

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
