> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 8 · **Fase**: F8 (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: ✅ cerrado local 2026-04-28.
> **Validación prod**: ⏳ pendiente desde 2026-04-28.

---

# Plan 36 Chat 8 FE — Rate Limit Events: agregar dato intentos vs umbral

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #7.

## OBJETIVO

Agregar a la página `/intranet/admin/monitoreo/seguridad/rate-limit` (componente `rate-limit-events`) un dato útil: **cuántos intentos hubo y cuál era el umbral máximo en el lapso de tiempo** del evento. Hoy la tabla solo muestra el evento aislado (que ocurrió un 429), pero no contextualiza vs el umbral.

## VERIFICAR AL ARRANCAR

¿El BE ya devuelve los campos `intentos` + `umbral` + `lapsoSegundos` en `RateLimitEventDto`? Si **sí** → solo agregar columna(s) al template. Si **no** → derivar Chat 8b BE en `Educa.API` para extender el DTO antes de continuar.

Pre-work obligatorio:
1. Leer `RateLimitEventDto` en BE (path típico: `Educa.API/DTOs/Sistema/RateLimitEventDto.cs`).
2. Leer `RateLimitEventListaDto` en FE (`@data/models/rate-limit-event.models.ts` o similar).
3. Confirmar shape antes de implementar.

## RESTRICCIÓN

- Sin cambios en lógica de filtros/carga.
- Si requiere endpoint BE nuevo, parar y derivar.

## REGLAS

- [`rules/design-system.md`](../../rules/design-system.md) §B4 (tabla).

## VALIDACIÓN

`npm run lint` · `npm run build` · `npm test`.

## POST-DEPLOY GATE

Sí — verificación visual de la columna nueva con datos reales.
