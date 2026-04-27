> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 2 · **Fase**: F2 (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: ⏳ pendiente arrancar.

---

# Plan 36 Chat 2 — Rediseño Bandeja de Correos

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #1.

Acta del Chat 1: [`.claude/chats/closed/055-plan-36-chat-1-fe-monitoreo-redesign-audit.md`](../closed/055-plan-36-chat-1-fe-monitoreo-redesign-audit.md).

## OBJETIVO

Rediseñar la página `/intranet/admin/monitoreo/correos/bandeja` (componente `email-outbox`). Es la más grande y única que requiere reflujo de layout. Sin tocar lógica de carga/filtros/mutaciones — solo HTML/SCSS y, si hace falta, refactor presentacional.

## HALLAZGOS DEL CHAT 1 (qué arreglar)

1. **Tab transparente** (no blanco) — patrón que probablemente afecte también a otros shells. Si toca `styles.scss` global, anotarlo en el commit para que los chats siguientes (057, 060, 061…) lo skipeen al detectarlo ya resuelto.
2. **Botón Exportar a Excel sin contraste** — aplicar tokens `var(--text-color)` + `var(--surface-300)` per [`design-system.md` §3](../../rules/design-system.md) (botones text/outlined).
3. **Layout muy vertical** — hoy son 4 secciones apiladas: stats + chart + filtros + tabla. Encontrar mejor distribución (ej: stats + chart en row, filtros colapsables, etc).
4. **Header de tabla transparente** — debería ya estar cubierto por [`design-system.md` §1](../../rules/design-system.md). Verificar por qué no aplica.
5. **3 filtros con mismo placeholder y sin labels** — agregar labels (utility `.label-uppercase` per [`design-system.md` §A4](../../rules/design-system.md)) y placeholders distintivos.
6. **Paginador**: cambiar `rowsPerPageOptions` a `[5, 10, 15]` con `rows = 5` por default (hoy probablemente `[10, 25, 50]` o similar).

## OUT OF SCOPE

- Slow request inicial (issue BE) — anotar en `.claude/tasks/be-slow-requests-monitoreo.md` (tarea futura BE).
- Lógica de filtros, mutaciones, llamadas API — no se toca.

## REGLAS DE CÓDIGO

- [`rules/design-system.md`](../../rules/design-system.md) — overrides globales + pautas B1-B11.
- [`rules/a11y.md`](../../rules/a11y.md) — botones icon-only requieren `pt` + `aria-label`.
- [`rules/templates.md`](../../rules/templates.md) — sin funciones en bindings.

## VALIDACIÓN

- `npm run lint` exit 0 (sin warnings nuevos).
- `npm run build` exit 0.
- `npm test` verde (suite actual ~1683).
- Browser manual: cargar página, filtrar, ver tabla, exportar Excel.

## SUGERENCIA POST-DEPLOY GATE

Sí — al cerrar pedir verificación visual del usuario en prod (smoke test browser).
