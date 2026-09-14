# 682 — Audit F8: Performance — `@defer` transversal + bug de lazy-loading + leaks

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F8)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**:
>   - `src/app/features/intranet/intranet.routes.ts`
>   - `src/app/features/intranet/pages/cross-role/campus-navigation/components/campus-3d-view/services/campus-scene-builder.service.ts`, `campus-3d-view.component.ts`
>   - `src/app/features/intranet/pages/admin/monitoreo/services/monitoreo-hub-badges.facade.ts`
>   - `src/app/core/services/cache/cache-version-manager.service.ts`
>   - Dashboards de admin y páginas públicas (candidatos a `@defer`)

## Origen

Hallazgos de `/audit` (2026-09-12), categorías "Bug"/"Performance" — 4 hallazgos agrupados por ser todos de performance/carga.

## Scope

1. **`intranet.routes.ts` — bug de lazy-loading**: las rutas `profesor/*` y `estudiante/*` importan todas el mismo barrel (`import('./pages/profesor')`/`import('./pages/estudiante')`) en vez de un import directo por componente. El bundler colapsa esto en un chunk único: visitar **una sola** ruta del rol descarga el bundle de las 8 páginas. El resto de rutas del archivo sí usa import directo (patrón correcto ya presente como referencia — `ayuda`, `justificacion-asistencia`, `admin/*`). Fix: cambiar cada entrada a `import('./pages/profesor/attendance/teacher-attendance.component').then(m => m.TeacherAttendanceComponent)`, etc.
2. **`campus-scene-builder.service.ts:17-247`** — `buildScene()` hace `scene.remove(c)` pero nunca `geometry.dispose()`/`material.dispose()`; cada rebuild deja recursos GPU huérfanos. Fix: `dispose()` explícito antes de remover.
3. **`campus-3d-view.component.ts:151-174`** — `ngAfterViewInit` reconstruye la escena manualmente además del `effect()` del constructor que ya la reconstruye — posible doble construcción en el primer render. Fix: confirmar y eliminar la construcción redundante.
4. **`monitoreo-hub-badges.facade.ts:79-93`** — 10 llamadas HTTP en paralelo por cada refresh (el doble de lo necesario: varios endpoints se llaman dos veces solo para computar delta hoy-vs-ayer). Fix: evaluar si el backend puede devolver el delta directamente, reduciendo a la mitad las llamadas.
5. **`cache-version-manager.service.ts:52-71`** — invalida módulos en loop `for...of` con `await` secuencial en vez de `Promise.all`, serializando el arranque. Fix: paralelizar con `Promise.all`.
6. **Ausencia de `@defer`** en dashboards pesados de `admin/` (email-outbox, error-groups, email-outbox-dashboard-dia, admin-rendimiento) y en secciones below-the-fold de páginas públicas (home, levels). `attendance-panel` ya usa `@defer (on viewport)` correctamente — usarlo como referencia. Fix: introducir `@defer` en las secciones/gráficos no críticos identificados en el audit.

## Pre-work

- Punto 1 es el de mayor impacto medible (afecta bundle size real de cada visita de rol) — priorizar primero y verificar con `bundle-report`/`source-map-explorer` (scripts ya presentes en `package.json`) antes/después.
- Punto 4 requiere confirmar con el backend si es viable devolver el delta directamente, o si el fix queda solo del lado FE (reducir llamadas duplicadas sin cambiar contrato).
- Punto 6 es el de mayor volumen — priorizar las páginas de mayor tráfico (home, dashboards de admin más visitados) si no se cubre el 100% en este brief.

## Out of scope

- Rediseño de los dashboards — solo introducir `@defer` sin cambiar la estructura visual.
- El resto de hallazgos del audit (ver plan).

## Criterio de cierre

- [ ] Punto 1 verificado con `npm run bundle-check` — bundle de visitar una sola ruta de rol ya no incluye las 8 páginas.
- [ ] Puntos 2-3 verificados con memory profiler (sin leak de GPU tras navegación repetida al campus 3D).
- [ ] Punto 4-5 verificados (menos requests HTTP concurrentes, arranque de `cache-version-manager` más rápido).
- [ ] Punto 6: al menos los dashboards de mayor tráfico con `@defer` aplicado, documentando qué queda pendiente si no se cubre el 100%.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F8 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~3h.
