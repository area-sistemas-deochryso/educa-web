# 713 — P107 F6 FE: UI de borrado masivo para Matrículas y Calificaciones

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-107-entorno-dev-datos-prueba.md` (Fase F6)
> **Creado**: 2026-09-25 · **Cerrado**: 2026-09-26 · **Estado**: ✅ shipped y verificado en vivo. Bloqueadores 712 (`Educa.API`) y 711 (`educa-web`) cerraron el 2026-09-25, desbloqueando este chat.
> **MODO SUGERIDO**: `/execute` — mismo patrón ya probado dos veces (629, 631).

## CONTEXTO

Cierra el par F5/F6 de P107 para Matrículas y Calificaciones. Reusa `BulkDeleteActionComponent` (botón + `edu-confirm-dialog` + resultado por fila) ya construido en F4, instanciándolo desde los componentes de Matrículas/Calificaciones que cree el brief 711.

## OBJETIVO

Extender `BulkTestDataApiService`/`BulkTestDataFacade` con `eliminarMatriculasPrueba()`/`eliminarCalificacionesPrueba()` (DELETE sin body), e instanciar `BulkDeleteActionComponent` en los componentes correspondientes.

## OUT OF SCOPE

- Cualquier lógica de orden de dependencia entre Matrículas y Calificaciones — la resuelve el BE (brief 712); el FE solo dispara y muestra el resultado.
- Cambios a la UI de borrado de Usuarios/Salones/Cursos (629/631) ya shipeada.

## Criterio de cierre

- [x] FE: lint + build OK.
- [x] Verificado en vivo (FE+BE local, `BusinessTestMode=true`, `TestConnection`): borrado masivo de datos de prueba generados por 711 confirmado en las pantallas admin correspondientes.
- [x] Plan 107 (`educa-coord`) actualizado — con esto, F5+F6 quedan completos (BE+FE) y el plan puede reevaluarse como cerrado de verdad, contra el done-when expandido de §4.

## Resultado (2026-09-26)

`BulkTestDataApiService`/`BulkTestDataFacade` extendidos con `eliminarMatriculasPrueba()` (`DELETE api/sistema/salones/prueba/matriculas/eliminar`) y `eliminarCalificacionesPrueba()` (`DELETE api/Calificacion/prueba/eliminar`) — rutas confirmadas contra el resultado real de 712 (distintas a las asumidas originalmente en este brief). `BulkDeleteActionComponent` instanciado en `MatriculasBulkCreateComponent` y `CalificacionesBulkCreateComponent`, mismo patrón que 629/631.

**Validación**: lint ✅ (0 errores), build ✅ (0 errores, solo warnings preexistentes no relacionados), test suite ✅ (2695/2695 pass).

**Verificación en vivo** (FE `:4201` + BE `:5139`, `BusinessTestMode=true`, `TestConnection`): generadas 5 calificaciones (colapsaron en 1 `Calificacion`) y 1 matrícula sintética. Borrado ejecutado en el orden documentado por 712 (Calificaciones antes que Matrículas) — ambos confirmaron "1 eliminados" sin errores de consola ni de backend; logs del BE confirmaron las rutas exactas invocadas.

**Plan 107 actualizado** (`educa-coord/plans/xrepo/100-119/xrepo-107-entorno-dev-datos-prueba.md`) — F5+F6 quedan 100% completos (BE+FE, 5 entidades). Único pendiente real del plan: ítem #1 de §3.1 (624 en `awaiting-prod`, ajeno a este tooling).

## ⚠️ Docs flagged for review (skipped)
<!-- doc-watch-skipped -->

Doc-watch matcheó estos docs contra los archivos tocados (globs amplios — lectura: falsos positivos, ningún cambio de negocio real, solo wiring de un componente reusable ya shipeado en F4). Skipped a pedido del usuario — revisar si el próximo chat toca estas áreas:

| Doc | Repo | Glob que matcheó | Motivo del match |
|---|---|---|---|
| context/domain.md | educa-web | `src/app/features/intranet/**` | Glob amplio, cubre todo `intranet/` |
| reference/a11y.md | educa-web | `src/app/**/*.html` | HTML tocado, pero sin elementos interactivos nuevos crudos |
| reference/design-system.md | educa-web | `src/app/features/intranet/**/*.html` | HTML tocado, sin cambios de estilo/tokens |
| reference/state-management.md | educa-web | `src/app/**/*.facade.ts` | `bulk-test-data.facade.ts` tocado, patrón repetido sin cambio arquitectónico |
| invariants/matricula.md | educa-coord | `**/*[Mm]atricula*` | Nombre de archivo contiene "matricula", sin cambio de invariante de negocio |
| invariants/calificaciones.md | educa-coord | `**/*[Cc]alificacion*` | Nombre de archivo contiene "calificacion", sin cambio de invariante de negocio |
