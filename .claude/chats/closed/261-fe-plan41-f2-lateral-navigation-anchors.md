# Brief 261 — P41 F2 FE: Lateral navigation anchors in correlation hub

<!-- minimal-from-go -->

> **Plan**: [xrepo-41 §F2](../../educa-coord/plans/xrepo-41-correlation-hub-observability.md)
> **Fase**: F2 — Lateral navigation anchors
> **Dependencia**: F1 ✅ (brief 131), F2 BE ✅ (brief 132)

## MODO SUGERIDO

`/execute` — BE already shipped extended snapshot with error group codes + related correlation IDs. FE consumes and renders navigation.

## CONTEXTO DEL CAMBIO

F2 BE (brief 132) extended the correlation snapshot to include:
- Error group code associated with each error log entry (navigational join)
- List of other correlation IDs sharing the same user identity within a 2h window (capped)

## SCOPE FE

- Render outbound navigation buttons from each event row → error group Kanban, email outbox filtered by recipient, feedback report detail.
- Sidebar section listing related correlation IDs when snapshot includes them.
- Follow existing hub patterns from F1 (brief 131).

## HALLAZGOS DE INVESTIGACIÓN

**Estado pre-chat**: los DTOs ya tienen `errorGroupCode` (en `CorrelationErrorLogDto`) y `relatedCorrelationIds` (en `CorrelationSnapshot`). Los **section view components** ya tienen navigation buttons. La sección de related IDs ya se renderiza en el main component. **El gap real es que el timeline view (default) no tiene navigation anchors en las filas de eventos.**

**Archivos tocados**:
- `correlation-timeline-section.component.ts` — inject Router, add `onGoToGroup`, `onGoToReport`, `onGoToOutbox`, import ButtonModule
- `correlation-timeline-section.component.html` — add `timeline-event__actions` div per event kind (error → "Ver grupo", reporte → "Ver reporte", outbox → "Ver en bandeja")
- `correlation-timeline-section.component.scss` — add `.timeline-event__actions` flex layout

**Rutas de navegación** (idénticas a section components):
- Error → `/intranet/admin/trazabilidad-errores?fingerprint=<errorGroupCode>`
- Reporte → `/intranet/admin/reportes-usuario?id=<id>`
- Outbox → `/intranet/admin/email-outbox?destinatario=<destinatarioMasked>`

**Rate-limit events no tienen destino de navegación** — no hay página de detalle para rate-limit. Se omite el action button coherente con section view.
