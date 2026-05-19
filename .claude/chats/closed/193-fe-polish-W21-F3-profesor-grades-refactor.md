# Brief 193 — Polish W21 F3 · refactor `profesor/grades`

> **Creado**: 2026-05-19 · **Cerrado**: 2026-05-19 (closed) · **Modo**: /execute → /validate

## Contexto

Sub-plan W21 F3 ([plan/intranet-fe-polish-W21.md §F3](../../plan/intranet-fe-polish-W21.md)). Auditoría F1 marcó `profesor/grades` como 🟡 global con 🔴 en skeletons y aria-label. El archivo es un componente único con template + estilos inline (290 ln). El patrón espejo a seguir es `estudiante/notas` (ya partido sano).

## Scope

Refactor de `src/app/features/intranet/pages/profesor/grades/profesor-calificaciones.component.ts`:

1. Extraer template inline → `profesor-calificaciones.component.html`.
2. Extraer estilos inline → `profesor-calificaciones.component.scss`.
3. Reemplazar `p-progressSpinner` (2 ocurrencias: pageLoading + contenidoLoading) por `app-skeleton-loader` (combinación rect + card siguiendo patrón de `estudiante/notas`).
4. Mover `p-confirmDialog` fuera del `@if (contenido())` (dialogs-sync.md: PrimeNG overlays nunca dentro de `@if`).
5. Verificar `appendTo="body"` en el `p-select` (ya presente).

## Out-of-scope

- No partir en sub-components nuevos. La lógica del `.ts` ya delega en sub-components de `../cursos/components/` (panel, dialogs).
- No tocar los custom dialogs (`app-calificar-dialog`, etc.) — su visibilidad depende de `contenido()` no-null y mover requiere refactor adicional.
- No tocar facade/store/services.

## Validación

- `npm run lint` limpio.
- `npx tsc --noEmit` o `ng build` sin errores.
- Selector `app-teacher-grades` sigue funcional (búsqueda de imports en `intranet.routes.ts`).

## Referencias

- Plan W21: `.claude/plan/intranet-fe-polish-W21.md`.
- Patrón espejo: `src/app/features/intranet/pages/estudiante/notas/`.
- Reglas: `rules/skeletons.md`, `rules/dialogs-sync.md`, `rules/design-system.md`.

## Resultado

- **Archivos**: `profesor-calificaciones.component.{ts,html,scss}` — 3 archivos (era 1). El `.ts` bajó de 290 → 211 ln al sacar template + estilos inline.
- **Skeletons**: 2× `p-progressSpinner` → `app-skeleton-loader` (rect 280×40 + card 240 para pageLoading; rect 240×32 + card 280 para contenidoLoading), siguiendo patrón de `estudiante/notas`. Removido `ProgressSpinnerModule` de imports.
- **Dialogs-sync**: `p-confirmDialog` movido fuera del `@if (contenido())` — ahora siempre en el DOM. Los 3 custom dialogs (`app-evaluacion-form-dialog`, `app-calificar-dialog`, `app-periodos-config-dialog`) **quedaron dentro del `@if`** porque tipan `[contenidoId]="contenido()!.id"` y `[semanas]="contenido()!.semanas"`; sacarlos requiere que esos sub-components manejen `null` en sus inputs — fix arquitectural fuera de scope F3.
- **Validación**: `npx eslint` limpio · `npx tsc --noEmit -p tsconfig.app.json` limpio · selector `app-teacher-grades` + export `TeacherGradesComponent` intactos (ruta `intranet.routes.ts:21` no requiere cambios).

## Aprendizajes transferibles

- Cuando se hace split de template inline → `.html`, el `.ts` mantiene exactamente la misma API pública (selector, clase, inputs/outputs). La ruta sigue funcionando sin tocar `intranet.routes.ts`.
- Los custom dialog wrappers que tipan inputs como `contenido()!.id` con non-null assertion son la otra cara del trade-off `dialogs-sync`: para sacar el dialog del `@if` hay que pagar el costo de que el sub-component acepte null. En este chat se priorizó el fix donde el costo era cero (`p-confirmDialog` PrimeNG directo) y se documentó el resto como deuda explícita.

## Deuda residual (post-W21)

- Custom dialogs (`evaluacion-form-dialog`, `calificar-dialog`, `periodos-config-dialog`) siguen dentro de `@if (contenido())`. Si en el futuro se quiere `dialogs-sync` 100% compliance, hay que hacer que esos sub-components manejen `[contenidoId]: number | null` y `[semanas]: SemanaDto[] | null` con guards internos.
