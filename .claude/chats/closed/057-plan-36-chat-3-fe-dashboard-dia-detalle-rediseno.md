> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 3 · **Fase**: F3 (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: ✅ cerrado local 2026-04-27.
> **Validación prod**: ✅ verificada 2026-04-28 — dashboard del día funcional (resumen + detalle de fallos, 0 fallos hoy). Pendiente: otra fase de rediseño no crítica para pulir layout (no bloqueante, abrir chat futuro cuando aplique).

---

# Plan 36 Chat 3 — Rediseño Dashboard del Día (tab Detalle de fallos)

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #2.

## OBJETIVO

Rediseñar **solo el tab "Detalle de fallos"** del componente `email-outbox-dashboard-dia` en `/intranet/admin/monitoreo/correos/dashboard`. Reformatear como dashboard, no como tabla amontonada.

## HALLAZGOS DEL CHAT 1

- Tab "Resumen" está excelente — **NO TOCAR**.
- Tab "Detalle de fallos" hoy se ve caótico/amontonado. Tiene: tabla "Correos que fallaron" (vacía hoy = 0 en estado FAILED), tabla "Por tipo" con agregación por `EO_Tipo`, tabla "Bounces acumulados" (top 50 destinatarios con 2+ rebotes).
- Necesita formato dashboard: cards de KPI, gráficos cuando aplica, jerarquía clara.

## RESTRICCIÓN DURA

Sin tocar funcionalidad. Solo HTML/SCSS del tab Detalle. La carga de datos (3 queries del facade) queda intacta.

## REGLAS

- [`rules/design-system.md`](../../rules/design-system.md) §B3 (stat-card) y §B4 (tabla).
- Tab transparente probablemente ya resuelto por Chat 2 (056) — verificar antes de arrancar; si no, resolver acá.

## VALIDACIÓN

`npm run lint` · `npm run build` · `npm test` · browser manual del tab.

## POST-DEPLOY GATE

Sí — verificación visual del usuario.
