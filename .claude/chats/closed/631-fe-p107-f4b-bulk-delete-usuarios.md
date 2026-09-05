# 631 — P107 F4b FE: UI de borrado masivo (Usuarios)

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` (Fase F4, segunda vuelta — Usuarios)
> **Creado**: 2026-09-04 · **Estado**: ✅ cerrado 2026-09-05 — 630 (BE) shipped, verificado en vivo.
> **MODO SUGERIDO**: `/design` → `/execute`
> **exclusive**: `false`
> **modules**: `dev-tooling`
> **touches**:
>   - `educa-web`: sección de "herramientas de prueba" — UI de borrado masivo para Usuarios, complementa la de Salones/Cursos (brief 629) y la de creación (brief 627)

## OBJETIVO

Exponer desde "herramientas de prueba" el borrado masivo de Usuarios marcados como datos de prueba, consumiendo el endpoint que construye 630 (BE, hermano). Con esto, F4 queda completo para las 3 entidades de P107 (Salones+Cursos ya cerrado vía 628/629).

## PRE-WORK OBLIGATORIO

- Confirmar el estado y contrato real de 630 antes de implementar las llamadas — si 630 todavía no cerró, coordinar alcance (se puede avanzar el shell de UI sin las llamadas reales, pero no cerrar este brief sin integración real contra el BE).
- Revisar `BulkDeleteActionComponent` (brief 629) como base directa — mismo componente reusable, mismo criterio (botón + `edu-confirm-dialog` + resultado por fila).

## ALCANCE

- Instanciar `BulkDeleteActionComponent` (o extenderlo si hace falta) en la sección de creación masiva de Usuarios (brief 627).
- Extender `BulkTestDataApiService`/`BulkTestDataFacade` con `eliminarUsuariosPrueba()` (DELETE sin body), mismo patrón que `eliminarSalonesPrueba()`/`eliminarCursosPrueba()`.
- Confirmación explícita antes de ejecutar el borrado.

## FUERA DE ALCANCE

- Salones y Cursos — ya tienen UI de borrado (629), no se tocan.
- El endpoint en sí — eso es 630 (BE).

## VALIDACIÓN FINAL

- Borrar en bloque usuarios de prueba generados previamente (vía 627), incluyendo al menos un rol Director-family, y confirmar que desaparecen de `/intranet/admin/usuarios`.
- Caso de rechazo (dependencia real, si aplica) mostrado con mensaje claro.
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [x] UI de borrado masivo funcional para Usuarios.
- [x] Verificado en vivo contra 630 ya cerrado, incluyendo un rol Director-family.
- [x] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F4 Usuarios marcado, **F4 y P107 quedan 100% completos**).
- [x] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [x] Brief movido `open/` → `closed/`.

## RESULTADO

Mismo patrón exacto que 629 (Salones+Cursos): `BulkDeleteActionComponent` instanciado en `UsuariosBulkCreateComponent`, `BulkTestDataApiService`/`BulkTestDataFacade` extendidos con `eliminarUsuariosPrueba()` (DELETE sin body). Lint/build/test unitarios verdes (1 test flaky no relacionado, `eslint-config-guards.spec.ts`, pasa aislado). Verificado en vivo FE+BE local (`BusinessTestMode=true`, `TestConnection`): generado 1 usuario Director de prueba, borrado masivo eliminó exactamente 1 (segunda corrida, limpia); primera corrida eliminó 7 (incluía remanentes de verificaciones previas de 627). **F4 y P107 quedan 100% completos** (Salones+Cursos+Usuarios, creación+borrado, BE+FE).

## COMMIT MESSAGE sugerido

```
feat(dev-tooling): add bulk test-data delete UI for usuarios (P107 F4b FE)
```

## CIERRE

Al cerrar (junto con 630), P107 queda completo en las 4 fases para las 3 entidades. Único pendiente fuera de este plan: `/verify-prod` de 624, y el hallazgo derivado (no bloqueante) de `/intranet/admin/cursos` sin invalidar stats.
