# Plan 35 — Rediseño UX/UI del submódulo "Monitoreo"

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Plan**: 35 · Fecha creación: 2026-04-27 · Estado: ⏳ pendiente arrancar
> **Repo**: `educa-web` (main) — FE-only, 1 chat
> **Prioridad**: media.

---

## Problem

El dropdown "Sistema → Monitoreo" tiene 7 items planos sin jerarquía visual. El admin no puede escanear rápido, 4 entradas son de correos pero no se ven juntas, no hay landing que oriente, y las 3 páginas de email-outbox son rutas hermanas sin parent route (no se navega como tabs aunque conceptualmente lo son).

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Grouping | 3 dominios: Correos (4 páginas), Incidencias (2), Seguridad (1) | División natural por intención del admin; cada cluster responde una pregunta única |
| Entry point | 1 sola entrada "Monitoreo" en el dropdown → hub landing | Soluciona el problema raíz (7 items planos). Hub = momento de orientación |
| Internal navigation | Tabs shells en Correos e Incidencias via router-outlet | Conserva código de páginas existentes intacto; shell es solo navegación |
| URL compatibility | 7 URLs viejas mantenidas como redirects | No romper bookmarks ni links en correos/Slack |
| Hub content | 3 cards grandes (icono + título + descripción + sub-links). Sin badges KPI en fase 1 | KPI requeriría endpoint por feature; mantener fase 1 simple |
| Tab ↔ URL sync | Tab activo sincronizado con URL (no estado local) | Permite deep-link, refresh y back/forward sin perder estado |
| Permissions | Hub protegido con OR de permisos hijos; cards/tabs sin permiso se ocultan | Reutiliza mecanismo existente de `intranet-menu.config.ts` |
| Existing page logic | No tocar lógica interna de las 6 páginas | Lower-risk: refactor puramente estructural |
| Breadcrumbs | Sin breadcrumbs en fase 1 | Page-header + tabs ya da contexto; redundante en estructura plana |

---

## Phases

### Phase 1 — Implementación completa (1 chat FE)

1. Crear routes anidadas con lazy loading (hub + 3 children: correos shell, incidencias shell, seguridad).
2. Crear hub landing con 3 cards layout (Design System §B3).
3. Crear shells de Correos e Incidencias con tabs + router-outlet (tab sync via URL).
4. Registrar rutas en intranet routes + agregar 7 redirects de URLs viejas.
5. Colapsar menú: 7 entradas → 1 entrada "Monitoreo" apuntando al hub.
6. Validar: lint + build + test + browser check (6 URLs viejas + 7 nuevas + tabs).

---

## Done-when

- Click en menú "Sistema → Monitoreo" abre el hub con 3 cards.
- Tabs en Correos e Incidencias navegan sin recargar datos.
- Las 7 URLs viejas redirigen correctamente a las nuevas.
- Refresh en cualquier sub-ruta nueva carga el tab correcto.
- Permisos: usuario sin permiso no ve la card correspondiente.
- Lint, build y tests verdes. Browser check: 6 páginas existentes sin diferencia funcional.

---

## Out of scope

- Tocar lógica interna de las 6 páginas existentes.
- Badges KPI en las cards del hub (fase 2 futura).
- Mover el correlation hub (`/admin/correlation/:id`) dentro de Monitoreo.

---

## Reversibility

100% reversible: revertir el commit restaura las 7 rutas originales como primarias. Sin pérdida de datos — refactor puramente estructural.
