# P10 P0.1 — Protección de mutaciones WAL

> **Plan**: [fallbacks-criticos.md](../../plan/fallbacks-criticos.md)
> **Fase**: P0.1
> **Creado**: 2026-05-26 · **Cerrado**: 2026-05-26

## Scope

1. **WAL HTTP timeout**: agregar timeout a `sendWalEntryRequest` para que mutaciones no cuelguen indefinidamente.
2. **Mutation error UX**: mejorar feedback de error en facades CRUD para distinguir causa (network, 4xx, 5xx) y ofrecer acción.

## Criterio de cierre

- [x] `sendWalEntryRequest` tiene timeout configurable (default 15s via `WAL_DEFAULTS.HTTP_TIMEOUT_MS`).
- [x] `executeServerConfirmed` y `executeFallback` también tienen timeout.
- [x] `X-Skip-Error-Toast` en requests WAL elimina double-toast (interceptor + facade).
- [x] `TimeoutError` de RxJS mapeado a mensaje amigable en `DEFAULT_ERROR_POLICY`.
- [x] `AttendancesCrudFacade` y `AttendancesCierresFacade` migrados a `facadeErrorHandler`.
- [x] Tests existentes siguen pasando (152/152 WAL, build ✅, lint ✅).

## Hallazgos

- `BaseCrudFacade` (20+ facades) ya usaba `facadeErrorHandler` — solo los facades de asistencia tenían error handling manual.
- El interceptor HTTP mostraba toast + el facade mostraba otro toast = double-toast en cada error WAL. `X-Skip-Error-Toast` lo resuelve.
- `TimeoutError` no es `HttpErrorResponse` — necesita branch aparte en la error policy.

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `core/services/wal/models/wal.models.ts` | `+HTTP_TIMEOUT_MS: 15_000` |
| `core/services/wal/wal-http.helper.ts` | timeout + X-Skip-Error-Toast |
| `core/services/wal/wal-facade-helper.service.ts` | timeout en server-confirmed/fallback |
| `core/helpers/error-policy.ts` | TimeoutError handling |
| `features/.../attendances-crud.facade.ts` | facadeErrorHandler migration |
| `features/.../attendances-cierres.facade.ts` | facadeErrorHandler migration |
