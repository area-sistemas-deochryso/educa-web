# 120 — FE Design System F5.3.1 · feedback-reports

> **Creado**: 2026-05-07 · **Cerrado**: 2026-05-07 · **Estado**: ✅ shipped · **Modo**: `/execute` → `/validate`

## Plan

Plan 20 F5.3.1 — Migrar `/intranet/admin/feedback-reports` al design-system canónico (referencia `/intranet/admin/usuarios`).

Task: `.claude/tasks/design-system-from-usuarios.md` (F5.3.1).

## Scope

| Cambio | Archivo |
|---|---|
| Reemplazar `<header class="page-header">` custom por `<app-page-header>` con botón refresh proyectado (B2) | `feedback-reports.component.html`, `.ts` (import) |
| Renombrar `.filters` → `.filters-bar` canónica (B6): border, padding, `btn-clear` con `margin-left: auto` y `opacity 0.5→1` en hover | `feedback-reports.component.html`, `.scss` |
| Eliminar bloque `.page-header { ... }` custom del SCSS | `feedback-reports.component.scss` |
| Migrar tokens hardcoded `#d97706` → `var(--yellow-700)`, `#fef3c7` → `var(--yellow-100)`, `#78350f` → `var(--yellow-800)` (D - tokens de color) | `feedback-reports.component.scss` |
| Migrar `rgba(220, 38, 38, ...)` → `color-mix(in srgb, var(--red-600), transparent)` (B9) | `feedback-reports.component.scss` |

## Out of scope

- Tags de estado (NUEVO/REVISADO/...) — son operativos críticos (admin escanea), **mantienen `severity` sin `tag-neutral`** (audit F2.2 ya cubrió este criterio).
- Drawer detalle, confirmDialog, lógica TS — sin cambios.
- Search-box (B6) — feedback-reports no filtra por texto, no aplica.

## Validación

- `npm run lint` limpio en archivos tocados.
- `npm run build:nossr` (config dev sin SSR) o equivalente pasa.
- Visual: header igual a `/usuarios`, filter-bar con border + clear-button a la derecha.

## Resultado

- 3 archivos modificados en `feedback-reports/` (html + ts + scss).
- Lint ✅ clean · Build ✅ OK (warnings ESM pre-existentes + bundle budget; warning de `SkeletonLoaderComponent` no usado en `sender-stats-tile.component.ts` es pre-existente, fuera de scope).
- Sin tests nuevos: refactor visual sin cambio funcional.
- Commit con código + brief move + maestro update + task update en un solo commit.

## Aprendizaje transferible

Patrón de migración mecánica F5.3.x replicable en las 7 sub-fases restantes (attendances, email-outbox, vistas, cursos, stats residuales, horarios, campus):

1. **Header**: cambiar `<header class="page-header">` por `<app-page-header icon="..." title="..." subtitle="...">` con botones proyectados como `ng-content`. Importar `PageHeaderComponent` desde `@shared/components` (re-export del intranet-shared, patrón canónico del proyecto). Eliminar el bloque `.page-header { ... }` custom del SCSS.
2. **Filter bar**: renombrar `.filters` (o equivalente) a `.filters-bar` con anatomía B6: wrapper con `border + padding + border-radius:10px`, hijo `.filter-dropdowns` (flex con gap), botón `.btn-clear` con `margin-left:auto + opacity:0.5→1` en hover. Si la página no tiene búsqueda por texto, omitir search-box (no es obligatorio).
3. **Tokens hardcoded**: grep `#[0-9a-f]{3,6}` en el SCSS. Migrar a tokens del tema según mapa canónico (D): `#d97706→var(--yellow-700)`, `#dc2626→var(--red-600)`, `#fef3c7→color-mix(yellow-500 15%, transparent)`, `rgba(220,38,38,N)→color-mix(red-600 N%, transparent)`. Sass color functions y Canvas API son excepciones documentadas.
4. **Tags operativos críticos** (estado de reporte/asistencia/aprobación/error severity): mantienen `severity` sin `tag-neutral` — el admin escanea estos y el color es información, no ruido.
5. **Validación**: lint + build alcanzan; no se requieren tests nuevos para refactor visual.
