# 131 · Plan 41 Chat 1 — F1 Timeline cronológico unificado en Hub Correlation

> **Creado**: 2026-05-08 · **Estado**: ⏳ pendiente arrancar · **Repo**: `educa-web` (main) — solo FE
> **Plan**: [Plan 41 — Trazabilidad y Observabilidad del Hub de Correlación](../../plan/correlation-hub-observability.md)
> **Origen**: F1 del Plan 41. Página `/intranet/admin/correlation/:id` (Plan 32 shipped) renderiza 4 secciones independientes ordenadas cada una por su `Fecha`. El admin tiene que cruzar mentalmente 4 timestamps para reconstruir qué pasó primero. Resuelve **brecha #1** (sin timeline cronológico) y **brecha #12** (cap defensivo de 100 filas invisible en la UI).

## Modo sugerido

`/execute` directo. La decisión arquitectural ya quedó zanjada en el plan dedicado — el chat es ejecución acotada de 1 componente nuevo + toggle + banner.

## Objetivo

Agregar al hub correlation una **vista timeline** que mezcla los 4 arrays del snapshot (`errorLogs`, `rateLimitEvents`, `reportesUsuario`, `emailOutbox`) ordenados cronológicamente, con codificación visual por tipo. Toggle entre **Vista timeline** (default nueva) y **Vista por sección** (la actual). Banner informativo cuando una sección viene capeada al límite.

## Alcance — qué SÍ y qué NO

### SÍ entra al chat

1. **Componente nuevo** `correlation-timeline-section/` standalone, OnPush.
2. **Computed** que mezcla los 4 arrays en un único `TimelineEvent[]` ordenado por fecha descendente, con tipo discriminado.
3. **Render** como steps verticales con icono + color por tipo (error / rate-limit / reporte / outbox), badge de severidad cuando aplica, link al detalle interno (no salidas externas — esas son F2).
4. **Toggle** "Vista timeline ↔ Vista por sección" en el header del hub, persistido en `PreferencesStorageService` con key `correlation:viewMode`. Default: `timeline`.
5. **Banner cap-aware**: cuando alguna de las 4 listas tiene `length >= SECTION_DEFENSIVE_CAP` (100), mostrar banner azul al inicio de la sección/timeline indicando que hay datos truncados.
6. **Tests unitarios**: del computed que ordena + del toggle que persiste + del banner cuando hay cap.

### NO entra (queda para fases siguientes)

- Enlaces salientes a otras vistas admin (ErrorGroup, bandeja destinatario, otros correlation del usuario) — F2.
- Sección "Request principal" en header — F3.
- Breadcrumbs del cliente — F4.
- Search / export / auto-refresh — F5.
- Cualquier cambio en BE — F1 es 100% FE.

## Contexto técnico

### Snapshot actual (sin cambios)

`CorrelationSnapshot` definido en `src/app/features/intranet/pages/admin/correlation/models/correlation.models.ts:80`:

```typescript
interface CorrelationSnapshot {
  correlationId: string;
  generatedAt: string;
  errorLogs: CorrelationErrorLogDto[];           // tiene .fecha
  rateLimitEvents: CorrelationRateLimitEventDto[]; // tiene .fecha
  reportesUsuario: CorrelationReporteUsuarioDto[]; // tiene .fechaReg
  emailOutbox: CorrelationEmailOutboxDto[];      // tiene .fechaReg + .fechaEnvio
}
```

### Tipo discriminado a definir

```typescript
type TimelineEventKind = 'error' | 'rate-limit' | 'reporte' | 'outbox';

interface TimelineEvent {
  kind: TimelineEventKind;
  fecha: string;          // ISO timestamp para ordenar
  payload: CorrelationErrorLogDto | CorrelationRateLimitEventDto
         | CorrelationReporteUsuarioDto | CorrelationEmailOutboxDto;
}
```

### Mapeo de fecha por tipo (importante)

| Tipo | Campo a usar como `fecha` |
|------|----------------------------|
| `error` | `errorLogs[i].fecha` |
| `rate-limit` | `rateLimitEvents[i].fecha` |
| `reporte` | `reportesUsuario[i].fechaReg` |
| `outbox` | `emailOutbox[i].fechaEnvio ?? emailOutbox[i].fechaReg` (preferir envío real, fallback a registro) |

### Codificación visual por tipo

| Kind | Icono PrimeNG | Color (token D del design-system) |
|------|---------------|-----------------------------------|
| `error` | `pi pi-exclamation-circle` | `var(--red-600)` |
| `rate-limit` | `pi pi-shield` | `var(--yellow-700)` |
| `reporte` | `pi pi-comment` | `var(--blue-800)` |
| `outbox` | `pi pi-envelope` | `var(--green-600)` o `var(--red-600)` si `estado === 'FAILED' \|\| estado === 'FAILED_BLACKLISTED'` |

Tokens según `rules/design-system.md §8` — NO hex literal.

### Persistencia del toggle

Usar `PreferencesStorageService` (`@core/services/storage`):

```typescript
storage.setPreference('correlation:viewMode', 'timeline' | 'section');
storage.getPreference<'timeline' | 'section'>('correlation:viewMode');
```

Default si no hay preferencia: `'timeline'`.

### Banner de cap

Usar el patrón B9 del design-system (alert banner con `color-mix()`, fondo blue-100, color blue-800, icono `pi pi-info-circle`). Texto:

> ⚠️ Una o más secciones llegaron al cap defensivo de 100 filas. Hay datos truncados — usá filtros más específicos en la fuente original o búsqueda futura (Plan 41 F5).

## Archivos a crear / tocar

### Nuevos

```
src/app/features/intranet/pages/admin/correlation/components/correlation-timeline-section/
  ├── correlation-timeline-section.component.ts
  ├── correlation-timeline-section.component.html
  ├── correlation-timeline-section.component.scss
  ├── correlation-timeline-section.component.spec.ts
  └── index.ts
```

### Modificados

| Archivo | Cambio |
|---------|--------|
| `correlation.component.ts` | Inyectar `PreferencesStorageService`, signal `viewMode`, signal `hasCap` (computed sobre vm), método `onToggleView()`. |
| `correlation.component.html` | Toggle en header (botón pButton group) + condicional `@if (viewMode() === 'timeline')` para timeline-section, `@else` para las 4 secciones existentes. Banner cap arriba de todo. |
| `correlation.component.scss` | Estilos del toggle + banner. |
| `correlation.component.spec.ts` | Test del toggle persistente. |
| `models/correlation.models.ts` | Agregar tipos `TimelineEvent`, `TimelineEventKind` y constantes `TIMELINE_ICON_MAP`, `TIMELINE_COLOR_MAP`. |
| `services/correlation.facade.ts` o `correlation.store.ts` | Computed `timelineEvents` que mezcla las 4 listas + `hasDefensiveCap` boolean. |

## Plan de ejecución (orden recomendado)

1. **Definir tipos** `TimelineEvent` + maps en `correlation.models.ts`.
2. **Computed** `timelineEvents` y `hasDefensiveCap` en facade o store (revisar dónde viven los otros computed del feature — probablemente facade.vm).
3. **Componente** `correlation-timeline-section` con su template + scss + tests del computed.
4. **Toggle** en `correlation.component.ts` + persistencia.
5. **Banner cap** arriba del contenido.
6. **Tests** del componente nuevo + del toggle persistente.
7. **Lint + build local**:

   ```
   npx eslint src/app/features/intranet/pages/admin/correlation/ --quiet
   npm run build:cap   # para validar SSR-compat (correlation es deep-link admin)
   npx vitest run src/app/features/intranet/pages/admin/correlation/
   ```

8. **Smoke manual** en navegador `npm run start` (puerto 4201):
   - Visitar `/intranet/admin/error-logs`, agarrar un correlation con varias entradas, abrir hub.
   - Ver timeline default. Toggle a sección. Recargar página → toggle persiste.
   - Forzar (manualmente vía DevTools mock) una sección con 100 filas y validar que aparece banner.

## Verificación al cerrar

- [ ] `npm run lint` limpio (cero warnings nuevos).
- [ ] `npx vitest run` verde sobre el feature correlation.
- [ ] `npm run build:cap` compila (SSR-safe — el componente no usa `window` ni `document` directos sin guards).
- [ ] Smoke manual: timeline default + toggle persiste + banner aparece con cap.
- [ ] Sin cambios en otros features (validar `git diff --stat` solo toca `pages/admin/correlation/`).

## Cierre y siguiente

Al cerrar este chat con `/end`:

- Marcar **brecha #1** y **brecha #12** como ✅ en `plan/correlation-hub-observability.md` "Estado de brechas".
- F1 al 100% del Plan 41.
- Siguiente brief candidato: **132 · Plan 41 Chat 2 BE** — DTO ampliado con `errorGroupCode`, `entidadOrigen` y `relatedCorrelationIds`. (No materializar acá — espera cierre + verify de este Chat 1.)

## Notas operativas

- Componente OnPush por taxonomía (Presentational + container que consume del facade). Ver `rules/architecture.md §"Taxonomía de Componentes"`.
- `track` en `@for` sobre `event.kind + event.fecha + payload.id` para que Angular no re-renderice todo cuando llega snapshot nuevo.
- Tests con Vitest + jsdom siguiendo el patrón existente en `correlation.component.spec.ts`.
- Sin cambios en `CorrelationFacade`, `CorrelationService`, `CorrelationStore` que afecten el contrato — solo agregar computed nuevo.
