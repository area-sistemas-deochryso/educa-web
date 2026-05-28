# 262 — P10 P0.2: Resiliencia de sesión y red

- **Plan**: [fallbacks-criticos.md](../../plan/fallbacks-criticos.md) — fase P0.2
- **Scope**: Error interceptor (offline vs 5xx vs timeout), token refresh offline, SignalR UI state
- **Modo**: `/design` → `/execute` → `/validate`
- **Prereq**: P0.1 ✅ (brief 249)
- **Estado**: ✅ completado 2026-05-28

## Intent (del plan)

El usuario debe saber si está offline, si el servidor cayó, y si su sesión expiró, con acciones claras en cada caso.

## Sub-items

1. ✅ Error interceptor — `classifyError()` distingue offline/timeout/server-unreachable/server-error/client-error. Offline suprime toasts (Opción A). TimeoutError de RxJS manejado correctamente (era bug de tipado).
2. ✅ Token refresh — toast "Sesión expirada" antes de forceLogout(). El flujo offline-wait ya existía en SessionRefreshService.
3. ✅ SignalR UI — signal `disconnected` (computed: wasConnected && !connected && !reconnecting) en 3 hubs. Banner rojo "Conexión perdida" en connection-status-indicator.

## Decisiones

- **Opción A** (suprimir toasts offline): cuando `navigator.onLine === false`, el interceptor no muestra toast — el offline-indicator banner ya comunica el estado.
- **`_wasConnected` signal**: evita falso positivo de `disconnected` antes de la primera conexión.
