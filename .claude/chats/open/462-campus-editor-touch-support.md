# 462 — Soporte táctil y responsive para `admin/campus` (spin-off de 461)

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-17 · **Modo sugerido**: `/design` primero (decisión de arquitectura de interacción: Pointer Events vs mapeo touch→mouse, gestos de pinch-zoom)
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - `src/app/features/intranet/pages/admin/campus/**`

## Contexto

Spin-off del brief 461 (fixes de responsive mobile). El módulo `admin/campus` fue identificado como el problema más grave de la auditoría, pero de tamaño y naturaleza distintos al resto (rework de interacción táctil vs. fixes de CSS de 1-2 líneas) — se decidió en `/design` de 461 separarlo en su propio chat. Ver `.claude/plans/responsive-mobile/01-responsive-mobile-fixes.md` para el contexto completo de la auditoría.

## Scope

Hallazgos confirmados por lectura de código (no verificados en vivo — requiere sesión con plano de salón activo):

- `campus.component.scss`: `display: flex` fijo (sidebar + editor lado a lado), 0 `@media` — no se adapta a pantallas angostas.
- `campus-editor`: canvas SVG de plantas con handlers solo de mouse (`wheel`, `mousedown`, `mousemove`, `mouseup`) — sin `touchstart`/`touchmove`/`touchend`. Inutilizable en tablet/celular táctil.
- `campus-pisos-panel`: `width: 260px` fijo.

## Fuera de alcance

- Cualquier otro módulo de `admin` — ya cubiertos en 461.

## Criterio de cierre

- [ ] Decisión de diseño tomada en `/design`: Pointer Events unificados vs. mapeo touch→mouse equivalente, y comportamiento de pinch-zoom/pan.
- [ ] Canvas SVG del editor responde a interacción táctil (pan, zoom, selección) en dispositivo/viewport móvil.
- [ ] `campus.component.scss` apila sidebar + editor en mobile vía `@media`.
- [ ] `campus-pisos-panel` deja de tener `width` fijo en mobile.
- [ ] Verificado en vivo con el método de iframe (375px) — ver nota de metodología en el brief 461 (`resize_window` no funciona en este entorno; forzar `width` por CSS produce falsos positivos con overlays PrimeNG; usar iframe con browsing context propio).
- [ ] Build + lint OK.

## Tiempo estimado

A definir en `/design` — el rework del editor (soporte táctil de un canvas SVG) probablemente exceda 2h, distinto al resto de fixes de 461 que fueron de minutos.
