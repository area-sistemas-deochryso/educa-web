# 742 — FE: lectura de mensajes de error ignora `detail` (login 401 y `extractErrorMessage`)

> **Origen**: Educa.API chat 740 · commit d5884f5a · 2026-09-30 (+ coord b527794)
> **MODO SUGERIDO**: `/investigate` → `/execute`
> **Repo afectado**: `educa-web`

## Contexto del cambio

El BE emite `ProblemDetails` RFC 7807 para todo 4xx/5xx (INV-PD01; INV-PD03 cerrada, único residual es un 202). El campo de mensaje es `detail`; `mensaje`/`message` ya no existen salvo en ese residual.

## Impacto en este repo

1. `src/app/core/services/auth/auth.service.ts:~106` — login 401/400 lee `error.error?.mensaje || UI_AUTH_MESSAGES.loginError`. `AuthFacadeService` lanza `UnauthorizedException` → body con `detail`, sin `mensaje`: siempre se muestra el texto genérico (bug preexistente desde 2026-05-19). Usar `parseProblemDetails(error).detail`.
2. `src/app/core/helpers/error.utils.ts::extractErrorMessage` — lee `mensaje`/`message`/`errors`, no `detail`/`title`. Afecta facades de email-outbox, explicaciones, horarios (`horario-error.utils.ts`). Verificar cuáles muestran hoy un mensaje genérico y unificar con `parseProblemDetails`.
3. Verificar `errors`: el BE emite `errors` como `List<string>` en `BusinessRuleException` (array) y como dict `{campo:[msg]}` solo en `ValidationProblemDetails`; `parseProblemDetails` ignora el array.

Contrato: `educa-coord/contracts/api-protocol.md` (actualizado) y `invariants/problem-details.md`.

> **Validación prod**: ⏳ pendiente desde 2026-09-30 — login con credenciales incorrectas debe mostrar el `detail` del BE (no el texto genérico).
> **Derivado**: [743](../open/743-fe-error-policy-resolvemessage-fallback-inalcanzable.md)
