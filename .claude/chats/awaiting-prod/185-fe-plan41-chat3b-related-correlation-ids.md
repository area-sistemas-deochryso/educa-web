# Brief 185 — Plan 41 Chat 3b · Sección "Otros correlation IDs" en hub

> **Creado**: 2026-05-18 · **Cerrado local**: 2026-05-18 · **Estado**: ⏳ awaiting-prod — pendiente smoke browser tras deploy.
> **Plan padre**: [`educa-coord/plans/xrepo-41-correlation-hub-observability.md`](../../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md) — F2 Chat 3 (sub-pieza b)
> **MODO SUGERIDO**: `/execute` → `/validate`
> **Esfuerzo estimado**: bajo (~30 min — un solo componente, lógica chica)

## Origen

Chat 3 del Plan 41 F2 (subdividido en 3a + 3b al arrancar). El BE Chat 2 (brief 132, awaiting-prod 2026-05-12) agregó `relatedCorrelationIds: string[]` al DTO `CorrelationSnapshot` — UNION de Error/RateLimit/Reporte cap 5, ventana 2h, match por últimos 4 dígitos del DNI. **El campo ya está en el modelo FE espejo** (`correlation.models.ts:101`).

## Scope

Renderizar `relatedCorrelationIds` como sección visible en el hub de correlación, usando el componente `<app-correlation-id-pill>` existente.

### Comportamiento

1. **Sección nueva** en `correlation.component.html` con título "Otros correlation IDs de este usuario (últimas 2h)".
2. **Solo visible** cuando `snapshot.relatedCorrelationIds?.length > 0` (no renderizar la sección si está vacío o ausente — compatibilidad con BE pre-Plan 41).
3. **Lista de chips** con `<app-correlation-id-pill [id]="id" [compact]="true" />` (un pill por id; `compact` trunca a 8 chars con tooltip).
4. **Ubicación visual**: aside derecho o al final del hub — decisión del implementador según layout actual. Probable: al final, después de las secciones de eventos, antes del footer si lo hay.

## Archivos a tocar

| Archivo | Cambio |
| --- | --- |
| `src/app/features/intranet/pages/admin/correlation/correlation.component.ts` | computed `hasRelatedIds`, computed `relatedIds` (alias seguro), import del pill |
| `src/app/features/intranet/pages/admin/correlation/correlation.component.html` | bloque `@if (hasRelatedIds())` con chips |
| `src/app/features/intranet/pages/admin/correlation/correlation.component.scss` | layout de la sección (grid de chips, gap, padding) |
| `src/app/features/intranet/pages/admin/correlation/correlation.component.spec.ts` | tests: oculta sección si vacío/ausente, renderiza N pills si N ids, pills compact |

## DTO disponible (ya en FE)

```typescript
// src/app/features/intranet/pages/admin/correlation/models/correlation.models.ts:87
export interface CorrelationSnapshot {
  correlationId: string;
  // ... otras secciones
  relatedCorrelationIds?: string[];  // <-- el campo a consumir
}
```

## Pill component (ya existe, no tocar)

`src/app/shared/components/correlation-id-pill/correlation-id-pill.component.ts`

```typescript
selector: 'app-correlation-id-pill'
inputs: id (required), compact (default false)
behavior: click navega a /intranet/admin/correlation/:id; styleClass tag-neutral; aria-label dinámico
```

## Diseño visual

Aplicar `rules/design-system.md` §B11 (sección con border + label uppercase) y §7 (tokens de color, sin hex literal). Wrap de chips con `flex-wrap: wrap; gap: 0.5rem`. Si la lista es vacía: la sección **no se renderiza**, no mostrar empty-state.

## Reglas relevantes (leer si aplica)

- `rules/design-system.md` §B11 (alert banners / secciones laterales), §7 (tokens)
- `rules/a11y.md` — el pill ya trae aria-label
- `rules/state-management.md` — `computed()` sobre `snapshot()`

## Tests esperados

- `hasRelatedIds()` true cuando `relatedCorrelationIds = ['a','b']` → renderiza 2 pills
- `hasRelatedIds()` false cuando `relatedCorrelationIds = []` → no renderiza la sección
- `hasRelatedIds()` false cuando `relatedCorrelationIds = undefined` → no renderiza la sección
- Cada pill recibe `[compact]="true"`

## Validación

```bash
npm test -- correlation.component
npx eslint src/app/features/intranet/pages/admin/correlation
npm run build
```

## Criterio de cierre

- [ ] Bloque condicional en HTML con chips renderizados
- [ ] computed que protege el opcional (`?.length`)
- [ ] +3 tests verdes en `correlation.component.spec.ts`
- [ ] Lint clean, build prod ok
- [ ] Brief movido a `awaiting-prod/` con nota "pendiente smoke browser tras deploy"

## Riesgos / fuera de scope

- **NO** tocar las 3 secciones existentes (`correlation-errors-section`, `correlation-emails-section`, `correlation-reports-section`) — eso es brief 186 (Chat 3a).
- **NO** modificar el pill component (ya funciona — brief 180 lo usa).
- **NO** agregar endpoint nuevo — el campo ya viene en `/correlation/:id` desde Chat 2 BE.

## Próximo

Tras este brief: ejecutar brief 186 (Chat 3a — cross-links buttons en las 3 sub-secciones).
