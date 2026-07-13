# 431 — P84 F5 follow-up: drawer de Horarios no muestra la acción navegable

> **Repos afectados**: `educa-web`.
> **Plan**: [`educa-coord/plans/xrepo-84-orientacion-flujo-academico.md`](../../../educa-coord/plans/xrepo-84-orientacion-flujo-academico.md) — follow-up de F5 (brief 430, ya cerrado).
> **Creado**: 2026-07-10 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/investigate` (confirmar mecanismo del panel de error del drawer) seguido de `/execute`.
> **exclusive**: `false`.
> **touches**: `educa-web`: `src/app/features/intranet/pages/admin/schedules/components/horario-detail-drawer/**` (panel de error al cambiar profesor), posiblemente su facade/service asociado.

## Hallazgo (verificado en vivo, TEST DB, `UseTestEnv=true`)

Reproducido en `/admin/horarios` → detalle de un horario en salón "Tutor pleno" → "Cambiar Profesor" a alguien distinto del tutor:

- El error `INV_AS01_TUTOR_PLENO` se dispara correctamente (400, mensaje pedagógico correcto, la asignación inválida es rechazada — nada se corrompe).
- **El toast/banner que se muestra ahí NO trae el botón de acción navegable** que sí aparece cuando el mismo error ocurre desde `/admin/salones` (P71's patrón, extendido por F5/brief 430).

## Causa raíz (confirmada por código, no solo por inspección visual)

- `TutorPlenoValidator.Ensure()` (Domain, `Educa.API`) — el validador que usa el flujo de Horarios (`HorarioAsignacionService`) — **sí** incluye `SuggestedAction("Asignar tutor en Salones", "/admin/salones")` en la excepción. No es un gap de F2/BE.
- `ErrorHandlerService.handleHttpError()` (FE, brief 430) **sí** tiene el wiring correcto: prefiere `suggestedAction` del BE, cae al mapa `UI_ERROR_CODE_ACTIONS` si no viene.
- Con ambos lados del contrato bien cableados, la ausencia del botón en este punto específico indica que el panel de error dentro de `horario-detail-drawer` (el que aparece al fallar "Cambiar Profesor") **no pasa por el toast global de `ErrorHandlerService`** — probablemente maneja el error de forma local/inline dentro del propio drawer, sin soporte para `action`.

## Scope

1. Confirmar en el código de `horario-detail-drawer` (o su facade/service) cómo se captura y muestra el error de "Cambiar Profesor" — identificar si hay un `catchError`/subscribe local que bypasea `ErrorHandlerService`.
2. Si es así, migrar ese punto al mismo patrón de notificación accionable (`ErrorHandlerService.showNotification` o equivalente) que ya usa el resto de la app, en vez de mantener un banner local sin acción.
3. Verificar en vivo que el botón "Ir a Salones" (o donde corresponda tras resolver la ruta divergente ya documentada en brief 430) aparece también en este flujo.

## Pre-work

- Leer `error-handler.service.ts` (patrón de doble capa, brief 430) para reusar el mismo mecanismo.
- Leer `horario-detail-drawer.component.ts` completo — localizar el punto exacto donde se muestra el error de "Cambiar Profesor" (no aparece en un grep simple de `catchError`/`error` en el `.ts` del componente — puede vivir en un servicio/facade asociado).
- Revisar si el hallazgo de ruta divergente de brief 430 (`/admin/salones` vs `/intranet/admin/usuarios`) ya se resolvió antes de decidir a dónde debe apuntar el botón aquí.

## Out of scope

- Cambiar el mensaje pedagógico existente — solo agregar la acción navegable donde falta.
- Resolver la ruta divergente si todavía no se resolvió (brief separado, ya anotado en 430).

## Criterio de cierre

- [x] El error `INV_AS01_TUTOR_PLENO` disparado desde el drawer de Horarios muestra la misma acción navegable que en Salones.
- [x] FE: lint + build + tests OK.
- [x] Verificado visualmente en browser.

## Tiempo estimado

~30-45 min (una vez confirmado el mecanismo exacto del panel de error local).

## Resolución (2026-07-13)

Causa raíz confirmada: `SchedulesAssignmentService.asignarProfesor()` usa `WalFacadeHelper.execute()`, que marca sus requests con `X-Skip-Error-Toast` — el interceptor HTTP global (`errorInterceptor` → `ErrorHandlerService.handleHttpError()`, el que sí resuelve `suggestedAction`) se salta esas requests a propósito, delegando el toast al `onError` local del facade. Ese `onError` llamaba a `facadeErrorHandler.handle()` (`@core/helpers/error-policy.ts`), que solo hacía `errorHandler.showError(summary, message)` **sin** acción — el mismo `showError`/`showWarning` sí acepta un parámetro `action`, simplemente nadie lo estaba calculando en esa capa.

Fix (`src/app/core/helpers/error-policy.ts`): `facadeErrorHandler` ahora acepta un `router` opcional en su config; cuando se provee, `handle()` resuelve la misma `suggestedAction` (BE vía `parseProblemDetails`, INV-PD05, con fallback a `UI_ERROR_CODE_ACTIONS`) que ya resuelve `handleHttpError()`, y la pasa como `action` a `showError`/`showWarning`. Cambio no rompe consumidores existentes de `facadeErrorHandler` que no pasan `router` (comportamiento idéntico al actual).

`src/app/features/intranet/pages/admin/schedules/services/horarios-assignment.service.ts`: inyecta `Router` y lo pasa a su `facadeErrorHandler({..., router: this.router})`. Único consumidor tocado — el resto de facades que usan `facadeErrorHandler` quedan sin cambios de comportamiento (scope acotado al drawer de Horarios, per brief).

Verificado en vivo (browser, TEST DB `UseTestEnv=true`): salón "INICIAL 3 AÑOS A" (modo Tutor pleno, tutor RAMOS VERA DURBY ANGELICA) → asignar profesor distinto desde `/admin/horarios` → toast "En este salón (tutor pleno), el profesor del horario debe ser el tutor asignado" con botón **"Asignar tutor en Salones"** visible (confirmado 2 veces, antes ausente). Sin errores de consola.

Lint + build + suite completa (225 archivos, 2343 tests) OK tras el fix. Un fix de test inicial: mi primer intento pasaba `undefined, undefined` explícitos a `showError`/`showWarning` cuando no había acción, lo que rompía 2 specs con `toHaveBeenCalledWith` estricto (`email-outbox-data.facade.spec.ts`); corregido llamando con la aridad exacta según si hay `action` o no.
