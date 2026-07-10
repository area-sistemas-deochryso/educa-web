# 430 — P84 F5: mensajes de error accionables (FE)

> **Repos afectados**: `educa-web`.
> **Plan**: [`educa-coord/plans/xrepo-84-orientacion-flujo-academico.md`](../../../educa-coord/plans/xrepo-84-orientacion-flujo-academico.md) — Fase F5 (`depends_on: [F2]`, F2 ✅ cerrada — brief 426, `Educa.API` en `main`).
> **Creado**: 2026-07-10 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`.
> **exclusive**: `false` — puede correr en paralelo con 427 (F4, glosario/tooltip) y 428 (F6, navbar). Sin overlap esperado con 429 (F3, cursos) salvo que F3 dispare el mismo error.
> **touches**: `educa-web`: `src/app/shared/constants/ui-error-messages.ts` (`UI_ERROR_CODE_ACTIONS`), `src/app/core/services/error/error-handler.service.ts`.

## ⚠️ Hallazgo obligatorio a resolver antes de implementar

F2 (`Educa.API`, brief 426, ya en `main`) agrega `ProblemDetails.Extensions["suggestedAction"] = { label, route }` para `INV_AS01_TUTOR_PLENO`, con **`route: "/admin/salones"`** (ver `invariants/problem-details.md` `INV-PD05`).

Pero ya existe, desde P83 F7 (brief 413), un mapeo **hardcodeado en FE** para el mismo `errorCode` en `ui-error-messages.ts:197`:

```ts
export const UI_ERROR_CODE_ACTIONS: Record<string, { label: string; route: string }> = {
	INV_AS01_TUTOR_PLENO: { label: 'Ir a Usuarios', route: '/intranet/admin/usuarios' },
	INV_AS02_PROFESOR_CURSO: { label: 'Ir a Usuarios', route: '/intranet/admin/usuarios' },
};
```

**Las dos rutas no coinciden** (`/admin/salones` vs `/intranet/admin/usuarios`). Antes de consumir el campo nuevo, este chat debe:

1. Confirmar en qué pantalla se resuelve realmente `INV_AS01` — dónde se asigna el `ProfesorSalon.EsTutor` que usa `AsignarProfesorSalonAsync` (`Educa.API/Controllers/Academico/ProfesorSalonController.cs:53-58`). Pista: `educa-web/src/app/features/intranet/pages/admin/users/models/usuarios.models.ts` sugiere que la asignación profesor↔salón se gestiona desde `/intranet/admin/usuarios`, no desde `/admin/salones` — pero verificar en vivo (browser) antes de asumir.
2. Corregir el lado equivocado: si `/intranet/admin/usuarios` es la ruta correcta, actualizar `TutorPlenoValidator.Ensure` en `Educa.API` (brief nuevo o fix rápido dentro de este chat si el scope lo permite) para que el `suggestedAction.route` coincida. Si `/admin/salones` es correcta, actualizar `UI_ERROR_CODE_ACTIONS`.
3. No dejar ambas rutas divergentes en producción — es la causa raíz que F5 existe para prevenir (mensaje sin acción coherente).

## Scope

- Reemplazar (u homogeneizar) la lectura de la acción sugerida en `ErrorHandlerService.handleHttpError` (`error-handler.service.ts:94-105`): hoy resuelve `actionCfg` solo desde `UI_ERROR_CODE_ACTIONS[errorCode]` (mapa hardcodeado FE). Debe preferir `error.error?.suggestedAction` (el campo nuevo de `ProblemDetails`, patrón de doble capa: BE autoritativo, FE fallback) cuando esté presente, y caer al mapa hardcodeado para `errorCode`s que el BE todavía no cubre (ej. `INV_AS02_PROFESOR_CURSO`, que F2 no tocó).
- Mantener el mensaje pedagógico/técnico existente (P71) intacto — este chat solo agrega la acción navegable, no reemplaza el `detail`/mensaje.
- Verificar que el toast siga mostrando el botón de acción correctamente para `INV_AS01_TUTOR_PLENO` una vez reconciliada la ruta.

## Pre-work

- Resolver el hallazgo de ruta divergente (sección de arriba) — **bloqueante**, no ejecutar el resto sin esto resuelto.
- Leer `educa-coord/invariants/problem-details.md` `INV-PD05` (shape exacto de `suggestedAction`).
- Leer `error-handler.service.ts` completo (patrón de doble capa: interceptor + `facadeErrorHandler`, ~96 sitios según brief 408).
- Confirmar en browser (si hay Playwright MCP) el toast actual para `INV_AS01` antes y después del cambio.

## Out of scope

- Extender el consumo a otros errorCode fuera de modo de asignación (fuera de scope de F2 también).
- Cambiar el mensaje pedagógico/técnico ya existente — solo se agrega la acción.
- Migrar `INV_AS02_PROFESOR_CURSO` a un `suggestedAction` del BE — eso requeriría tocar `Educa.API` de nuevo, fuera de este chat FE (evaluar como follow-up si el hallazgo de ruta lo amerita).

## Criterio de cierre

- [x] Ruta divergente `/admin/salones` vs `/intranet/admin/usuarios` investigada — confirmado vía código (no browser) que la asignación `EsTutor`/tutor pleno se gestiona en `usuario-form-dialog` bajo `/intranet/admin/usuarios` (ver `intranet.routes.ts:302`, `usuarios.models.ts`, `usuario-form-dialog.component.html`), no en `/admin/salones`. **Lado equivocado: BE** (`Educa.API/Domain/Academico/TutorPlenoValidator.cs:58`, brief 426) — tiene la ruta incorrecta y le falta el prefijo `/intranet`. No se corrigió en este chat: `Educa.API` está fuera de `touches` de este brief y no está checked out en este worktree (`educa-web` only). **Follow-up requerido**: brief nuevo contra `Educa.API` para corregir `SuggestedAction("Asignar tutor en Salones", "/admin/salones")` → `SuggestedAction("Ir a Usuarios", "/intranet/admin/usuarios")`. Mientras tanto, el fallback FE (`UI_ERROR_CODE_ACTIONS`, ya correcto) sigue mostrando la acción correcta porque el consumo prefiere BE solo cuando está presente — pero con el BE actual, el link mostrado apuntará a `/admin/salones` (incorrecto) hasta que se corrija el follow-up.
- [x] `ErrorHandlerService` consume `suggestedAction` del BE (`problem-details.adapter.ts`, `INV-PD05`) cuando está presente, con fallback al mapa hardcodeado (`UI_ERROR_CODE_ACTIONS`).
- [x] FE: lint + build + tests OK (ver detalle abajo).
- [ ] Verificado visualmente en browser — **NO realizado**: no hay tooling de browser disponible en este agente. Queda pendiente de verificación manual.

## Resultado de la ejecución

- `src/app/core/helpers/problem-details.adapter.ts`: nuevo campo `suggestedAction` en `NormalizedProblemDetails` + extractor `extractSuggestedAction` (lee `ProblemDetails.Extensions.suggestedAction = { label, route }`, `INV-PD05`).
- `src/app/core/services/error/error-handler.service.ts`: `handleHttpError` ahora prefiere `parseProblemDetails(error).suggestedAction` (BE) sobre `UI_ERROR_CODE_ACTIONS[errorCode]` (FE), con fallback cuando el BE no lo envía (ej. `INV_AS02_PROFESOR_CURSO`). Mensaje pedagógico/técnico existente sin cambios.
- `src/app/core/services/error/error-handler.service.spec.ts`: +3 tests (precedencia BE, fallback FE, sin acción cuando no hay match).
- Lint: `bun run lint` → OK, sin hallazgos.
- Build: `bun run build` → OK.
- Tests: `bun run test` (suite completa) → 2329/2330 passed, 1 failed por timeout en `src/eslint-config-guards.spec.ts` (test de infra de ESLint, no relacionado a este cambio); re-ejecutado en aislamiento → 13/13 passed. Sin regresiones atribuibles a este chat.
- Verificación en browser: no realizada (sin tooling disponible en este agente).

## Tiempo estimado

~45-60 min (incluye la investigación de la ruta divergente).
