> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 4 · **Fase**: F4.FE (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: ⏳ pendiente arrancar · **Bloqueado por**: Chat 4b BE (058) deployed + verificado.

---

# Plan 36 Chat 4 FE — Rediseño Diagnóstico de Correos

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #3.

## OBJETIVO

Mejorar visualmente la página `/intranet/admin/monitoreo/correos/diagnostico` (componente `email-outbox-diagnostico`):

1. **Más visual** en general — el "gap del día" (sub-tab) está bien; el "diagnóstico por correo" necesita iteración.
2. **Sugerencias en el buscador** del diagnóstico por correo (typeahead). Consume el endpoint nuevo del Chat 4b BE (058).
3. **Búsqueda por apellidos/nombres** además de correo.

## BLOQUEO

No arrancar hasta que Chat 4b BE (058) esté en `closed/` o `awaiting-prod/` con verificación pasada. El endpoint nuevo es prerrequisito.

## OUT OF SCOPE

- Slow request inicial (BE, fuera de Plan 36).
- Sub-tab "gap del día" no se toca.

## REGLAS

- [`rules/design-system.md`](../../rules/design-system.md) — typeahead vía `p-autocomplete` con `appendTo="body"` ([`primeng.md`](../../rules/primeng.md)).
- Tab transparente verificar (probable ya resuelto por chat previo).

## VALIDACIÓN

`npm run lint` · `npm run build` · `npm test` (+tests nuevos para autocomplete y mapping del response BE).

## POST-DEPLOY GATE

Sí — verificación end-to-end con el endpoint BE en prod.
