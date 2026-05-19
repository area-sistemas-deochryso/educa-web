# 195 — Plan 41 Chat 11 · FE auto-refresh opt-in del hub Correlación

> **Validación prod**: ✅ verificada 2026-05-19 — Toggle default `aria-pressed="false"` + `aria-label="Activar auto-refresh cada 30 segundos"`. Click alterna estado y class (`p-button-text` ↔ `p-button-outlined`). Cowork BD-PROD-RO.
> **Creado**: 2026-05-19 · **Cerrado local**: 2026-05-19 · **Estado**: ✅ awaiting-prod (smoke browser pendiente).
> **Plan**: [`../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md`](../../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md) §F5 Chat 11.
> **Modo ejecutado**: `/execute` → `/validate`.

## Scope

Switch en el header de `/intranet/admin/correlation/:id` que dispara `loadSnapshot` cada **30s** mientras esté activo. Pausa al cambiar de tab vía `visibilitychange`. Persistido en `PreferencesStorageService` (default **off**).

## Archivos esperados

- `src/app/core/services/storage/preferences-storage.service.ts` — nueva key + get/set.
- `src/app/core/services/storage/storage.service.ts` — passthrough.
- `src/app/features/intranet/pages/admin/correlation/correlation.component.ts` — signal `autoRefresh`, handler toggle, polling, listener visibilitychange, cleanup.
- `src/app/features/intranet/pages/admin/correlation/correlation.component.html` — botón toggle en header (al lado del view-toggle / antes de "Exportar JSON").
- `src/app/features/intranet/pages/admin/correlation/correlation.component.scss` — estilo del toggle si hace falta.
- `src/app/features/intranet/pages/admin/correlation/correlation.component.spec.ts` — +tests (init from storage, toggle persiste, polling start/stop, pause on hidden).

## Criterios de cierre

- Toggle visible y operativo en el header.
- Default off (primera carga sin preferencia previa).
- Mientras está ON: dispara `loadSnapshot` cada 30s con el `:id` actual.
- Mientras el doc está `hidden` (otra tab), no dispara — vuelve a disparar al volver a `visible` (con un `loadSnapshot` inmediato).
- Cleanup en `destroyRef` (`clearInterval` + `removeEventListener`).
- Tests vitest verdes (suite del componente).
- Lint + tsc limpios.

## Patrón de referencia

`RuntimeHealthFacade.startPolling/stopPolling` (`src/app/features/intranet/pages/admin/sistema/runtime-health/services/runtime-health.facade.ts:74-84`) — pero implementado en el component (no facade) porque el estado depende del `:id` de la ruta.

## Resultado

### Archivos modificados

- `src/app/core/services/storage/preferences-storage.service.ts` — key `CORRELATION_AUTO_REFRESH` + `get/setCorrelationAutoRefresh()` (default `false`).
- `src/app/core/services/storage/storage.service.ts` — passthrough + `eslint-disable max-lines` justificado (facade thin: cada preferencia agrega 2 passthroughs sobre 300 ln).
- `src/app/features/intranet/pages/admin/correlation/correlation.component.ts` — signal `autoRefresh` inicializada desde storage, `pollHandle` + `visibilityListener` privados, métodos `onToggleAutoRefresh()` / `startPolling()` / `stopPolling()` / `refreshIfVisible()` / `attachVisibilityListener()` / `detachVisibilityListener()`, cleanup en `destroyRef.onDestroy`.
- `src/app/features/intranet/pages/admin/correlation/correlation.component.html` — botón toggle entre "Exportar JSON" y refresh manual, ícono dinámico (`pi-play`/`pi-pause`), `aria-pressed` + tooltip + aria-label dinámicos según estado.
- `src/app/features/intranet/pages/admin/correlation/correlation.component.spec.ts` — +6 tests en bloque "Plan 41 Chat 11 — auto-refresh opt-in" (init off, toggle persist, polling start every 30s, stop on toggle off, no fire on `document.hidden`, init from storage on).

### Decisiones tomadas

- **Implementado en el component, no en el facade** — el polling depende del `:id` de la ruta, que vive en el component. Mover al facade implicaría que el facade conozca la ruta o que el component empuje el `id` cada refresh. El runtime-health facade es la excepción porque su recurso es global (snapshot del runtime), no per-id.
- **Pausa por `document.hidden` se chequea dentro del callback de `setInterval`**, no se pausa el interval entero. Eso evita race entre `visibilitychange` y el tick — si el tab vuelve a visible justo entre dos ticks, el próximo tick verifica `!hidden` y dispara. El listener de `visibilitychange` solo agrega un refresh inmediato al volver a visible (en lugar de esperar hasta 30s).
- **`POLL_INTERVAL_MS = 30_000`** literal en el component — no se expone como config porque el plan ya define el valor explícito. Si en el futuro se quiere variable, ascenderlo a una constante del feature.
- **Default `false`** — opt-in deliberado. La carga del snapshot ya pega 4 endpoints; auto-refresh por defecto multiplicaría el load del BE sin que el admin lo haya pedido.

### Aprendizajes transferibles

- **Polling + visibilitychange en components Angular** — patrón canónico: `pollHandle` + `visibilityListener` privados, cleanup en `destroyRef.onDestroy()` (NO `ngOnDestroy` — usar el hook moderno), check `typeof document !== 'undefined'` para SSR safety.
- **Tests con `vi.useFakeTimers()` y `setInterval`** — wrap en `try/finally` con `vi.useRealTimers()` para no contaminar specs siguientes. `vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)` es la forma limpia de simular tab oculto sin tocar el global.
- **Escape hatch `max-lines` en facades thin** — cuando un facade-passthrough crece 1 línea sobre 300, el escape con justificación es preferible a partir el facade. Esa partición rompe el contrato "single entry-point" sin ganancia real.

### Validación (local 2026-05-19)

| Check | Resultado |
| --- | --- |
| `vitest run correlation.component.spec` | ✅ 16/16 (10 originales + 6 nuevos) |
| `eslint` (5 archivos tocados) | ✅ 0 err (1 disable justificado) |
| `tsc --noEmit` | ✅ 0 err |

### Verificación post-deploy (smoke browser)

1. Cargar `/intranet/admin/correlation/:id` con un correlation id real.
2. Verificar que el botón "Auto-refresh (30s)" aparece en el header entre "Exportar JSON" y el refresh manual, con ícono `pi-play` y `aria-pressed=false`.
3. Click → ícono cambia a `pi-pause`, `aria-pressed=true`. Verificar Network tab: nueva request al snapshot endpoint a los ~30s.
4. Cambiar a otra tab del browser, esperar 30s, volver a la tab del hub → debería disparar refresh inmediato al volver visible (no esperar al próximo tick).
5. Refresh F5 → el toggle conserva su estado (persistencia en localStorage `educa_pref_correlation_auto_refresh`).
6. Click toggle OFF → no más requests automáticas a partir de ahí.
