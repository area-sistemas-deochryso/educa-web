> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 5 · **Fase**: F5 (`/execute`) · **Creado**: 2026-04-27 · **Estado**: ✅ cerrado local 2026-04-27.
> **Validación prod**: ⏳ pendiente desde 2026-04-27 — smoke test del menú/ruta `/intranet/admin/monitoreo/correos/auditoria` post-deploy.

---

# Plan 36 Chat 5 FE — Auditoría de Correos: flag flip + revisión visual

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #4.

## OBJETIVO

Hacer visible la página `/intranet/admin/monitoreo/correos/auditoria` (componente `auditoria-correos`) flipeando el feature flag.

## BLOQUEADOR DETECTADO EN CHAT 1

`auditoriaCorreos: false` en [`src/app/config/environment.ts`](../../../src/app/config/environment.ts) línea 34. En `environment.development.ts` está en `true`. Por eso el usuario no la ve en prod.

## CAMBIO PUNTUAL

```diff
// src/app/config/environment.ts
- auditoriaCorreos: false,
+ auditoriaCorreos: true,
```

La página es read-only (Plan 22 Chat 6 F4.FE), sin riesgo de mutación. Ya está testeada (16 tests Plan 22).

## DESPUÉS DEL FLIP

Hacer `npm start` y verificar visualmente que la página carga, los stats responden, los filtros funcionan. Si en la inspección visual aparecen problemas de diseño (no reportados en Chat 1 porque el usuario no la podía ver), abrir Chat 5b para rediseño. Si está OK, cerrar.

## REGLAS

- [`rules/feature-flags.md`](../../rules/feature-flags.md) — patrón estándar.

## VALIDACIÓN

`npm run lint` · `npm run build` · `npm test`.

## POST-DEPLOY GATE

Sí — hace falta verificar en prod que la ruta resuelve y el menú muestra el item.
