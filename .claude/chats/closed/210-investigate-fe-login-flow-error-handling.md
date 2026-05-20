# 210 — Investigate FE: login page flow, sessions check, post-login error

> **Plan**: `educa-coord/plans/xrepo-48-login-auth-resilience.md` (F1 FE)
> **Creado**: 2026-05-20 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/investigate`
> **touches**: `src/app/features/intranet/pages/login/**`, `src/app/core/auth/**`, `src/app/core/interceptors/**`, `src/app/core/guards/**`

## Context

Production monitoring shows two FE-visible issues on the login flow:

1. **Expired cookie sent with login request**: The `educa_auth` HttpOnly cookie contains an expired JWT. When the FE POSTs to `/api/Auth/login`, the browser automatically includes this cookie. The BE rejects the request. The FE can't clear the cookie directly (HttpOnly), so the expired token persists.

2. **Post-login error on success**: Sentry breadcrumb (12/05) shows: `GET /api/Auth/sessions` returns 200 (1770ms) → 4.5 min later `STATE_CHANGE "Login exitoso"` → `POST /api/Auth/login` 200 (3184ms) → **error**. The login succeeds (HTTP 200), the state changes, but then something in the FE response processing throws.

User-confirmed: login fails with expired token, works after clearing it and waiting for rate limit. Reproduces with different expired tokens.

## Questions to answer

### 1. Login page initialization
- What happens when the user navigates to `/intranet/login`?
- Does the login component or a guard call `GET /api/Auth/sessions` on load?
- If sessions returns a valid session, does it redirect? What if the session is expired?

### 2. Cookie lifecycle
- The `educa_auth` cookie is HttpOnly — the FE can't read or delete it via JavaScript. How is it expected to be cleared? Only by the BE on logout?
- When the user's session expires naturally (no explicit logout), does the cookie persist in the browser until its `Max-Age`/`Expires`?
- Is there a call to the BE to clear cookies before login POST (e.g., a pre-login logout call)?

### 3. HTTP interceptor behavior on login
- Does the Angular HTTP interceptor apply to the login request?
- If the interceptor detects a 401 response, does it trigger the refresh flow — even on the login endpoint?
- Could the interceptor be retrying the login request with the expired token, creating a loop that eventually triggers rate limiting?

### 4. Post-login response handling
- What does the login component do with the 200 response? (Store permissions, navigate, set state.)
- What could throw AFTER a successful 200? (Navigation error, permission parsing, session storage write, redirect guard re-evaluating the new session.)
- Is there a `.subscribe()` or `async/await` with an error handler that Sentry captures?

### 5. Sessions endpoint purpose
- What does `GET /api/Auth/sessions` return?
- When is it called? (Page load? Guard? Timer?)
- How does its response interact with the login flow?

## Pre-work

- Read contract `educa-coord/contracts/auth.md` for the refresh flow and cookie definitions.

## Deliverable

A findings report with:
- The exact login page lifecycle (from navigation to redirect post-login).
- Whether expired cookies are cleared before login (and how, given HttpOnly).
- Root cause of the post-login error.
- Recommended fix approach (to feed F3 of plan xrepo-48).

## Out of scope

- Implementing fixes (that's F3).
- Backend auth middleware (brief 209 covers that in Educa.API).
- Non-login auth flows (SignalR, password recovery).

## Criterio de cierre

- [ ] All 5 question groups answered with file:line evidence.
- [ ] Root cause identified for post-login error.
- [ ] Cookie lifecycle mapped (creation → expiration → cleanup).
- [ ] Fix approach documented for plan F3 handoff.

## Tiempo estimado

~30 min.
