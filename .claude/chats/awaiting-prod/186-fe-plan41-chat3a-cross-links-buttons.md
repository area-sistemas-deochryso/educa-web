# Brief 186 — Plan 41 Chat 3a · Botones de navegación cruzada en secciones del hub

> **Creado**: 2026-05-18 · **Estado**: ✅ cerrado local 2026-05-18, awaiting-prod.
> **Resultado**: 3 sub-components con botón "Acciones" + handler `Router.navigate` con queryParams (`fingerprint`, `destinatario`, `id`). 3 specs vitest nuevos: 8 tests propios + 3 timeline existente = 11/11 verdes. Lint ✅, build prod ✅. `rate-limit-section` sin botón (confirmado: no hay vista admin filtrable por evento individual). Aria-label vía `pt` passthrough (a11y.md). Desviación documentada: rutas destino usan los redirects legacy `/trazabilidad-errores`, `/email-outbox`, `/reportes-usuario` (el codebase no tiene `/error-groups` ni `/feedback-reports/<id>` como rutas directas); reports usa `?id=` queryParam ya que no existe ruta detalle. **Pendiente smoke browser tras deploy** — verificar que los 3 botones navegan correctamente y que las páginas destino filtran por los queryParams enviados (`fingerprint`, `destinatario`, `id`).
> **Plan padre**: [`educa-coord/plans/xrepo-41-correlation-hub-observability.md`](../../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md) — F2 Chat 3 (sub-pieza a)
> **MODO SUGERIDO**: `/execute` → `/validate`
> **Esfuerzo estimado**: medio (~60 min — patrón repetido en 3 sub-components)

## Origen

Chat 3 del Plan 41 F2 (subdividido en 3a + 3b). El BE Chat 2 (brief 132) agregó `errorGroupCode?` al DTO `CorrelationErrorLogDto` (primeros 12 chars del fingerprint, FK al Kanban admin de ErrorGroups). Los otros campos para navegación cruzada (`destinatarioMasked`, `id` de reportes y outbox) ya estaban en el snapshot.

## Scope

Cada fila de las 3 sub-secciones (errors / emails / reports) debe tener un botón secundario que lleva al dashboard admin filtrado por la entidad correspondiente.

### Mapping de botones por sección

| Sección | Botón | Ruta destino | Disabled cuando |
| --- | --- | --- | --- |
| `correlation-errors-section` | "Ver grupo de errores" (icon `pi pi-sitemap`) | `/intranet/admin/error-groups?fingerprint=<errorGroupCode>` | `errorGroupCode` nullish |
| `correlation-emails-section` | "Ver bandeja del destinatario" (icon `pi pi-inbox`) | `/intranet/admin/email-outbox?destinatario=<destinatarioMasked>` | nunca (siempre hay destinatario) |
| `correlation-reports-section` | "Ver reporte" (icon `pi pi-external-link`) | `/intranet/admin/feedback-reports/<id>` | nunca (id always present) |

> Nota: la sección `correlation-rate-limit-section` **no** lleva botón — no hay vista admin filtrable por evento individual de rate-limit que tenga sentido como destino. Confirmar revisando el componente; si tiene un destino natural, agregar; si no, dejar sin botón.

### UI

Botón `p-button-text p-button-sm` con icono + label en la misma fila, alineado a la derecha. Acceder vía `aria-label` (`pt` passthrough — ver `rules/a11y.md`). Click navega con `Router.navigate` y `queryParams` cuando aplica.

## Archivos a tocar

| Archivo | Cambio |
| --- | --- |
| `correlation-errors-section.component.ts` + `.html` + `.spec.ts` | Botón "Ver grupo", computed `canGoToGroup(row)`, handler `onGoToGroup(row)` |
| `correlation-emails-section.component.ts` + `.html` + `.spec.ts` | Botón "Ver bandeja", handler `onGoToOutbox(row)` |
| `correlation-reports-section.component.ts` + `.html` + `.spec.ts` | Botón "Ver reporte", handler `onGoToReport(row)` |
| `correlation-rate-limit-section.*` | Solo si se decide agregar destino; default: sin cambio |

## DTOs disponibles (ya en FE)

```typescript
// correlation.models.ts
interface CorrelationErrorLogDto {
  id: number;
  errorGroupCode?: string | null;   // <-- usado para el botón
  // ...
}
interface CorrelationEmailOutboxDto {
  id: number;
  destinatarioMasked: string;   // <-- usado para queryParam
  // ...
}
interface CorrelationReporteUsuarioDto {
  id: number;   // <-- usado para path param
  // ...
}
```

## Reglas relevantes

- `rules/a11y.md` — botones con icono Y label texto → no requieren `pt` aria-label, pero si quedan solo-icono en mobile, **sí**
- `rules/design-system.md` §B7 — usar `p-button-text p-button-sm` para acción secundaria, ubicación derecha de la fila
- `rules/templates.md` — handler como método (event handler permitido), NO computed por fila

## Tests esperados (por sección)

- Botón renderiza
- Click llama `router.navigate(...)` con la ruta y queryParams correctos
- Botón disabled o no renderizado cuando `errorGroupCode` es nullish (errors section)
- aria-label correcto

## Validación

```bash
npm test -- correlation
npx eslint src/app/features/intranet/pages/admin/correlation
npm run build
```

## Criterio de cierre

- [ ] 3 sub-components con botón funcional + tests (~9 tests nuevos verdes)
- [ ] Lint clean, build prod ok
- [ ] Brief movido a `awaiting-prod/` con nota "pendiente smoke browser tras deploy"

## Riesgos / fuera de scope

- **NO** tocar `correlation.component` ni la sección "Otros correlation IDs" — eso es brief 185 (Chat 3b).
- **NO** modificar el DTO ni el endpoint BE — los campos ya están.
- **NO** crear vistas filtradas nuevas — las páginas destino (`/intranet/admin/error-groups`, `/email-outbox`, `/feedback-reports/:id`) ya existen y aceptan los query params. Si una no aceptara, documentar y reportar en lugar de implementar el filtro en la página destino (fuera de scope).

## Dependencias

- Brief 185 puede correr antes o después (independientes — tocan archivos distintos).
- BE Chat 2 (brief 132) debe estar verificado en prod para que `errorGroupCode` venga poblado en data real (en awaiting-prod desde 2026-05-12). Tests con mocks funcionan independientemente.
