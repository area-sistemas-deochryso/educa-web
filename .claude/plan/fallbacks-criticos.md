# Plan 10 — Fallbacks críticos FE

> **Inicio**: 2026-05-26 · **Estado**: en progreso
> **Scope**: protección de flujos críticos del FE contra fallos de red, API y estados vacíos.

## Fases

### P0.1 — Protección de mutaciones

**Intent**: las mutaciones WAL (asistencia, CRUD admin) deben tener timeout HTTP y feedback de error accionable (no toast genérico de 5s).

- WAL HTTP timeout — `sendWalEntryRequest` cuelga indefinidamente sin timeout.
- Mutation error UX — toast genérico sin distinción de causa ni botón "Reintentar".

### P0.2 — Resiliencia de sesión y red ✅

**Intent**: el usuario debe saber si está offline, si el servidor cayó, y si su sesión expiró, con acciones claras en cada caso.

- ✅ Error interceptor — `classifyError()` distingue offline/timeout/server-unreachable/server-error/client-error (brief 262).
- ✅ Token refresh offline — toast "Sesión expirada" antes de forceLogout (brief 262).
- ✅ SignalR UI — signal `disconnected` + banner rojo en connection-status-indicator (brief 262).

### P0.3 — UI defensiva en páginas admin

**Intent**: ninguna página admin debe mostrar spinner eterno o tabla vacía sin contexto cuando la API falla.

- Error signals en stores que no los tienen (email-outbox, feedback-reports, etc.).
- Bloques `@if error` en templates de páginas admin.
- `#emptymessage` en tablas p-table sin empty state.

## Dependencias

- Ninguna externa. Local FE puro.
- P0.3 se beneficia de patrones establecidos en P0.1 (error handling).
