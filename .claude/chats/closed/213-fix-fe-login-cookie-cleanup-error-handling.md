# 213 — Fix FE: pre-login cookie cleanup + error handling hardening

> **Plan**: `educa-coord/plans/xrepo-48-login-auth-resilience.md` (F3 FE)
> **Creado**: 2026-05-20 · **Estado**: ✅ closed 2026-05-28 (prod verified, commit `5471fdc`).
> **Validación prod**: ✅ 2026-05-28 (pilot session: login con cookie expirado OK, refresh regenera cookie, sessions no dispara forceLogout).
> **MODO SUGERIDO**: `/execute`
> **Depende de**: 210 (investigate — completado)
> **touches**: `core/interceptors/error/error.interceptor.ts`, `core/interceptors/credentials/credentials.interceptor.ts`, `features/intranet/pages/login/login-intranet.component.ts`, `core/services/auth/auth.service.ts`

## Context

Brief 210 (investigate FE) identificó una "Cookie Hygiene Gap" como causa raíz de los HTTP 0 en producción:

1. **`credentialsInterceptor` envía cookies expiradas con el login POST** — `withCredentials: true` se aplica a TODOS los requests sin excepción, incluyendo login y refresh. El BE recibe la cookie `educa_auth` expirada junto al POST de login.

2. **GET `/sessions` en `ngOnInit` del login puede disparar refresh → forceLogout** — la página de login llama `loadStoredSessions()` al inicializar, que hace GET /api/Auth/sessions. Si hay cookie expirada, el error interceptor intenta refresh → falla → `forceLogout()`. Pero `/sessions` NO está en `SKIP_REFRESH_URLS`, así que entra al flujo de refresh innecesariamente.

3. **`handleSuccessfulLogin()` no tiene try/catch en `storage.setUser()`** — si el storage está lleno o falla, el login reporta éxito al BE pero la app no completa la sesión. Esto explica el breadcrumb de Sentry: `POST /login 200 → error`.

4. **No hay mecanismo para limpiar cookies HttpOnly antes del login** — JavaScript no puede borrar `educa_auth` (es HttpOnly). El único camino es llamar al endpoint de logout del BE (que sí puede limpiar las cookies via `Set-Cookie`) o un endpoint dedicado de cookie-clear.

## Changes

### 1. Add `/sessions` to `SKIP_REFRESH_URLS` (~2 min)

**File**: `core/interceptors/error/error.interceptor.ts:19`

```typescript
// BEFORE
const SKIP_REFRESH_URLS = ['/login', '/verificar', '/logout', '/refresh'];

// AFTER
const SKIP_REFRESH_URLS = ['/login', '/verificar', '/logout', '/refresh', '/sessions'];
```

**Efecto**: GET /sessions en la página de login no dispara el flujo de refresh si hay cookie expirada. Recibe 200 (sin auth) o 401 que se ignora silenciosamente — ambos son OK para la página de login donde solo se intenta cargar sesiones previas como convenience.

### 2. Skip `withCredentials` for public auth endpoints (~5 min)

**File**: `core/interceptors/credentials/credentials.interceptor.ts`

El interceptor actual aplica `withCredentials: true` incondicionalmente. Para login y refresh, enviar cookies expiradas es el problema. Agregar early-exit:

```typescript
// BEFORE
const cloned = req.clone({ withCredentials: true });
return next(cloned);

// AFTER
const publicAuthPaths = ['/api/Auth/login', '/api/Auth/refresh', '/api/Auth/mobile/login'];
const isPublicAuth = publicAuthPaths.some(p => req.url.includes(p));

if (isPublicAuth) {
  return next(req); // No enviar cookies — login/refresh no las necesitan
}

const cloned = req.clone({ withCredentials: true });
return next(cloned);
```

**Efecto**: el POST de login ya no envía la cookie `educa_auth` expirada. El BE no la ve, no la valida, no falla. Este es el fix principal del HTTP 0.

**Precaución**: verificar que login y refresh no dependen de `educa_device` cookie (que también se enviaría con `withCredentials`). Si `educa_device` es necesario en login para device tracking, usar un approach alternativo: enviar el device ID en el body del login en lugar de depender de la cookie.

### 3. Pre-login cookie clear via silent logout (~10 min)

**File**: `features/intranet/pages/login/login-intranet.component.ts`

Antes del POST de login, llamar al endpoint de logout para que el BE limpie las cookies HttpOnly expiradas. Esto es defense-in-depth — el fix 2 ya evita que se envíen, pero este paso asegura que el browser las descarte.

```typescript
// En onLogin(), antes de authService.login():
async onLogin(): Promise<void> {
  // Clear any stale HttpOnly cookies before attempting login
  await this.authService.silentPreLoginCleanup();

  // Proceed with login
  this.authService.login(this.loginForm.value).subscribe({
    // ...existing handlers
  });
}
```

**En auth.service.ts** o **auth-api.service.ts**:

```typescript
silentPreLoginCleanup(): Promise<void> {
  // POST /api/Auth/logout with withCredentials to clear server-side cookies
  // Fire-and-forget: if it fails (no session to clear), that's fine
  return firstValueFrom(
    this.http.post('/api/Auth/logout', {}, { withCredentials: true })
  ).catch(() => {
    // Expected to fail if no active session — ignore
  });
}
```

**Alternativa más limpia**: crear un endpoint BE dedicado `POST /api/Auth/clear-cookies` que solo emita `Set-Cookie` con `Max-Age=0` sin validar sesión. Más semántico pero requiere cambio BE — evaluar si vale la pena vs reusar logout.

**Decisión**: usar logout silencioso primero (no requiere cambio BE). Si el BE devuelve 401 en logout sin sesión activa, el catch lo absorbe. Verificar que el endpoint de logout emita `Set-Cookie` de limpieza incluso cuando no hay sesión válida.

### 4. Wrap `storage.setUser()` in try/catch (~5 min)

**File**: `core/services/auth/auth.service.ts:213-238` (`handleSuccessfulLogin`)

```typescript
// BEFORE (líneas ~220-225)
this.storage.setUser(user, rememberMe);

// AFTER
try {
  this.storage.setUser(user, rememberMe);
} catch (e) {
  logger.error('[Auth] Failed to persist user session:', e);
  // Session is valid server-side but couldn't be stored locally.
  // Continue — the user is logged in, but may need to re-login
  // if they close the tab (acceptable degradation).
}
```

**Efecto**: un storage lleno o corrupto no rompe el flujo post-login. El usuario queda logueado en memoria (la sesión server-side es válida), aunque sin persistencia local — al cerrar tab pierde sesión. Es degradación aceptable vs crashear silenciosamente.

### 5. Add `/switch-session` to `SKIP_REFRESH_URLS` (~1 min)

**File**: `core/interceptors/error/error.interceptor.ts:19`

Además de `/sessions`, agregar `/switch-session` por consistencia con los endpoints que manejan su propio flujo de auth:

```typescript
const SKIP_REFRESH_URLS = ['/login', '/verificar', '/logout', '/refresh', '/sessions', '/switch-session'];
```

**Razón**: switch-session emite nuevas cookies — si el token actual expiró mid-operación, el refresh intercept puede competir con el nuevo token que switch-session está emitiendo. Mejor dejarlo manejar su propio error.

## Pre-work

- [ ] Leer findings completos de brief 210 (este brief asume que ya están disponibles).
- [ ] Verificar si `POST /api/Auth/logout` emite `Set-Cookie` de limpieza cuando NO hay sesión activa (si devuelve 401 sin limpiar cookies, la alternativa 3 no sirve y se necesita endpoint dedicado BE o solo depender del fix 2).
- [ ] Verificar si `educa_device` cookie es necesaria en el POST de login (afecta la implementación del fix 2).

## Validation

- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` pasa sin errores.
- [ ] Test manual: login con cookie `educa_auth` expirada → 200 OK, sesión inicia correctamente.
- [ ] Test manual: login sin cookies → 200 OK (no regresión).
- [ ] Test manual: login → cerrar tab → reabrir → login de nuevo → funciona (cookie cleanup no deja estado roto).
- [ ] Test manual: GET /sessions en página de login con cookie expirada → no dispara forceLogout.
- [ ] Test manual: switch-session con cookie válida → sigue funcionando.
- [ ] Test manual: refresh flow normal (token expira mid-navegación) → sigue funcionando (solo login/refresh/sessions se excluyen del credential interceptor, el resto sigue enviando cookies).

## Prioridad de los fixes

| # | Fix | Impacto | Riesgo |
|---|-----|---------|--------|
| 2 | Skip `withCredentials` en login/refresh | **CRÍTICO** — elimina la causa raíz del HTTP 0 | Bajo (solo 3 endpoints excluidos) |
| 1 | `/sessions` en SKIP_REFRESH_URLS | **ALTO** — evita forceLogout pre-login | Mínimo (1 línea) |
| 4 | try/catch en storage.setUser | **MEDIO** — evita post-login crash | Mínimo |
| 3 | Pre-login cookie clear | **BAJO** — defense-in-depth, no estrictamente necesario si fix 2 está | Medio (depende de comportamiento del logout endpoint) |
| 5 | `/switch-session` en SKIP_REFRESH_URLS | **BAJO** — preventivo | Mínimo |

Si el tiempo es limitado, fixes 2 + 1 + 4 resuelven el problema. Fix 3 es nice-to-have. Fix 5 es preventivo.

## Out of scope

- Backend auth pipeline changes (brief 211).
- Backend latency optimization (brief 212).
- Rate limiting tuning.
- Frontend loading states / UX during login (visual improvements).
- SignalR token handling.

## Tiempo estimado

~25 min (fixes 1-5) + tiempo de pre-work para verificar comportamiento del logout endpoint.
