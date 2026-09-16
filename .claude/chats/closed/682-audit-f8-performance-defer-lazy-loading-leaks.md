# 682 — Audit F8: Performance — `@defer` transversal + bug de lazy-loading + leaks

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F8)
> **Creado**: 2026-09-12 · **Estado**: 🟡 ejecutado, pendiente `/end`.
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

- [x] Punto 1: `intranet.routes.ts` — las 16 rutas de `profesor/*` y `estudiante/*` ahora importan cada componente directo (mismo patrón que `ayuda`/`admin/*`), en vez del barrel `./pages/profesor`/`./pages/estudiante`. Verificado con `npm run build`: ya no existe un chunk único combinando las 8 páginas de un rol (antes se habría visto un chunk "profesor"/"estudiante" con el peso de las 8; ahora cada página resuelve a su propio chunk, ej. `profesor-cursos-component` 94.90 kB standalone).
- [x] Puntos 2-3: `campus-scene-builder.service.ts` — `buildScene()` ahora hace `traverse()` + dispose de geometry/material (con cuidado especial: NO se disposea `Sprite.geometry`, que es estática y compartida por todas las instancias de THREE.Sprite — solo se disposea su material/textura). `campus-3d-view.component.ts` — se agregó dedupe por referencia (`lastBuiltNodes`/`lastBuiltEdges`) para que el `effect()` del constructor no reconstruya la escena que `ngAfterViewInit` ya construyó en el primer render, sin romper rebuilds legítimos cuando `nodes`/`edges` cambian de verdad. No verificado con memory profiler en vivo (fuera de alcance de esta sesión sin browser); la lógica de dispose sigue el patrón estándar de three.js.
- [ ] **Punto 4 — NO implementado, requiere coordinación con backend**: investigado `EmailOutboxService.ObtenerEstadisticasAsync` en `Educa.API` — cuando se llama sin `desde`/`hasta`, el backend devuelve el **total histórico** (`OutboxTotal`), no "hoy". Es decir, `bandejaRes` (sin fechas) y `bandejaTodayRes` (`today,today`) **no son duplicados** — devuelven datos distintos y ambos se usan (uno para el badge, otro para el delta). Lo mismo aplica presumiblemente a `errorGroups.getCount()`. El hallazgo original del audit asumía que eran llamadas redundantes; no lo son sin cambiar semántica de badges. Reducir las 10 llamadas paralelas de forma segura requiere que backend exponga el delta directamente (como ya sugería el pre-work del brief) — queda como deuda documentada, no bug de FE. **No tocar `monitoreo-hub-badges.facade.ts` sin ese cambio de contrato.**
- [x] Punto 5: `cache-version-manager.service.ts` — invalidación de módulos paralelizada con `Promise.all` en vez de `await` secuencial dentro del `for...of`.
- [x] Punto 6 (parcial, priorizando mayor tráfico per pre-work): `@defer (on viewport)` agregado en `home.html` (5 secciones below-the-fold: about/courses/counter/testimonials/cta, hero queda eager) y en `admin-rendimiento.component.html` (cada `app-admin-rendimiento-curso-card`, que renderiza un chart Chart.js por curso — potencialmente muchos cursos). **Pendiente sin cubrir**: `email-outbox-dashboard-dia` (contenido ya está tab-gated por `edu-tabpanel`, no se pudo confirmar sin inspeccionar la librería si ya lazy-renderea tabs inactivos — no se tocó para evitar romper esa librería a ciegas), `error-groups` (vistas ya mutuamente excluyentes por `@if viewMode()`, sin ganancia clara de `@defer` adicional), páginas `levels/*` (contenido estático sin sub-componentes propios — `@defer` no genera bundle-splitting real ahí, solo beneficio marginal de render).
- [x] Build + lint + tests OK (`npm run build`, `npm run lint`, `npm run test -- --run` — 2583/2584 verdes; 1 falla era `eslint-config-guards.spec.ts` timeout bajo carga del suite completo, reproducido en aislado y pasa en 2.3s — flaky no relacionado a este cambio).
- [ ] Plan actualizado: F8 → ✅ (pendiente, se hace en `/end`).
- [ ] Maestro actualizado (pendiente, se hace en `/end`).

## Nota de cierre — alcance real vs brief original

El brief original estimaba "resolver" el punto 4 como parte del criterio de cierre. La investigación del código backend mostró que el hallazgo del audit estaba mal diagnosticado (asumía llamadas duplicadas que no lo son). Se documenta la corrección del diagnóstico en vez de aplicar un fix FE que hubiera cambiado semántica de datos sin autorización. Si se quiere perseguir la reducción real de llamadas, el siguiente paso es un brief de `Educa.API` que agregue un endpoint/parámetro de delta directo — cross-repo, fuera de alcance de este chat (`educa-web` only).

## Tiempo estimado

~3h.
