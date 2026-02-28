# Cookie Auth Migration — Reglas de Implementación

> **Objetivo**: Migrar JWT de localStorage/sessionStorage a HttpOnly + Secure cookies.
> **Estado**: Fase 1 completada. Fases 2-5 pendientes.
> **Principio**: Este documento define REGLAS y CONTRATOS, no código rígido. Leer el estado actual del archivo antes de modificar.

---

## Fase 1: Proxy Same-Origin ✅ COMPLETADO

Archivos ya modificados:
- `proxy.conf.json` (creado)
- `angular.json` (proxyConfig agregado)
- `environment.development.ts` (apiUrl → `''`)
- `environment.ts` (apiUrl → `''`)

---

## Fase 2: Backend — Cookie Auth Infrastructure

### Decisiones de diseño (inmutables)

| Decisión | Valor | Razón |
|----------|-------|-------|
| Cookie del JWT | `educa_auth`, HttpOnly, Secure, SameSite=Lax | JS nunca ve el token |
| Cookie CSRF | `XSRF-TOKEN`, NO HttpOnly (JS debe leerla), Secure, SameSite=Lax | Angular lo lee y envía como header |
| Header CSRF | `X-XSRF-TOKEN` | Angular estándar |
| Cookie device ID | `educa_device_id`, NO HttpOnly, Secure, SameSite=Lax, Expires=1 año | Agrupar sesiones por navegador |
| RememberMe TTL | 30 días (Expires en cookie) | Session cookie si rememberMe=false |
| Session store | In-memory ConcurrentDictionary (v1), migrar a DB si es necesario | Simplicidad inicial |
| Backward compat | `OnMessageReceived` acepta cookie (prioridad 1) Y Authorization header (prioridad 2) | Deploy sin downtime |

### 2.1 CREAR: Constants de cookie

**Archivo**: `Constants/Auth/CookieConfig.cs`

**Contrato**:
- Clase estática con constantes para nombres de cookies, headers, y TTLs
- Constantes: `AuthCookieName`, `CsrfCookieName`, `CsrfHeaderName`, `DeviceIdCookieName`
- TTLs: `RememberMeExpiry` (30 días), `DeviceIdExpiry` (365 días)

### 2.2 CREAR: Cookie Auth Service

**Archivos**: `Interfaces/Services/ICookieAuthService.cs` + `Services/Auth/CookieAuthService.cs`

**Contrato — métodos requeridos**:

| Método | Responsabilidad |
|--------|----------------|
| `SetAuthCookie(HttpResponse, string token, bool rememberMe)` | Setea cookie `educa_auth` con HttpOnly+Secure+SameSite=Lax. Si rememberMe → Expires=30 días, sino → session cookie |
| `ClearAuthCookie(HttpResponse)` | Elimina cookie `educa_auth` (Expires=pasado) |
| `GetTokenFromCookie(HttpRequest)` | Lee cookie `educa_auth`, retorna token o null |
| `SetCsrfCookie(HttpResponse)` | Genera GUID, setea cookie `XSRF-TOKEN` (NO HttpOnly) |
| `EnsureDeviceId(HttpRequest, HttpResponse)` | Lee o genera `educa_device_id`. Retorna el device ID |

**Reglas de implementación**:
- Inyectar `IHttpContextAccessor` solo si es necesario; preferir recibir `HttpResponse`/`HttpRequest` como parámetro
- Cookie options: `Path = "/"`, `SameSite = SameSiteMode.Lax`
- En desarrollo: `Secure = false` (localhost no tiene HTTPS real). En producción: `Secure = true`
- Usar `CookieConfig` constants, no hardcodear strings

### 2.3 CREAR: Session Store Service

**Archivos**: `Interfaces/Services/ISessionStoreService.cs` + `Services/Auth/SessionStoreService.cs`

**Propósito**: Almacenar sesiones server-side para multi-usuario (switch sin re-login).

**Modelo de datos (in-memory)**:
```
StoredSession {
    Id: string (GUID)
    DeviceId: string (de la cookie educa_device_id)
    Token: string (el JWT)
    NombreCompleto: string
    Rol: string
    EntityId: int
    SedeId: int
    CreatedAt: DateTime
    ExpiresAt: DateTime? (null = no expira, o usar JWT expiry si se habilita)
}
```

**Contrato — métodos requeridos**:

| Método | Responsabilidad |
|--------|----------------|
| `StoreSession(StoredSession)` | Guardar sesión. Si ya existe una del mismo deviceId+rol+entityId, reemplazar |
| `GetSessionsByDevice(string deviceId)` | Retornar lista de sesiones para un device |
| `GetSession(string sessionId)` | Retornar una sesión por ID, o null |
| `RemoveSession(string sessionId)` | Eliminar sesión específica |
| `RemoveSessionsByDevice(string deviceId)` | Eliminar todas las sesiones de un device |
| `CleanExpired()` | Limpiar sesiones expiradas (llamar periódicamente) |

**Reglas de implementación**:
- Usar `ConcurrentDictionary<string, StoredSession>` para thread safety
- `StoreSession` debe verificar que no se duplique (mismo device + mismo usuario/rol)
- Key de deduplicación: `{deviceId}_{rol}_{entityId}`
- `CleanExpired()` puede ser llamado por Hangfire job o al inicio de cada request a /sessions
- Registrar como Singleton en DI (estado compartido entre requests)

### 2.4 CREAR: DTO de sesión almacenada

**Archivo**: `DTOs/Auth/StoredSessionDto.cs`

**Contrato**:
```csharp
public class StoredSessionDto
{
    public string SessionId { get; set; } = "";
    public string NombreCompleto { get; set; } = "";
    public string Rol { get; set; } = "";
    public int EntityId { get; set; }
    public int SedeId { get; set; }
}
```

### 2.5 CREAR: CSRF Validation Middleware

**Archivo**: `Middleware/CsrfValidationMiddleware.cs`

**Contrato**:
- Solo valida en métodos mutantes: POST, PUT, DELETE, PATCH
- Excluir: `/api/Auth/login` (no tiene CSRF cookie aún)
- Leer cookie `XSRF-TOKEN` y header `X-XSRF-TOKEN`
- Si no coinciden → 403 Forbidden
- Si la request no tiene cookie CSRF → skip (backward compat con clientes que aún usan Authorization header)

**Reglas de implementación**:
- Registrar DESPUÉS de `UseAuthentication()` y `UseAuthorization()` en el pipeline
- Usar `CookieConfig` constants
- Log warning cuando falla validación (no error, puede ser ataque o config incorrecta)

### 2.6 MODIFICAR: DTOs de Auth

**Archivo**: El archivo donde están `LoginDto` y `LoginResponseDto` (actualmente `DTOs/Auth/LoginDto.cs`)

**Cambios**:

| DTO | Cambio |
|-----|--------|
| `LoginDto` | AGREGAR: `public bool RememberMe { get; set; }` |
| `LoginResponseDto` | AGREGAR: `public bool Success { get; set; }`. MANTENER `Token` temporalmente para backward compat |

**Regla**: NO eliminar el campo `Token` de `LoginResponseDto` todavía. Se elimina en Fase 5 (transición).

### 2.7 MODIFICAR: AuthController

**Archivo**: `Controllers/Auth/AuthController.cs`

**Cambios en endpoints existentes**:

| Endpoint | Cambio |
|----------|--------|
| `POST /login` | Después de generar JWT, llamar `cookieAuthService.SetAuthCookie()`, `SetCsrfCookie()`, `EnsureDeviceId()`, y `sessionStoreService.StoreSession()`. Agregar `Success = true` al response. MANTENER token en body para backward compat |
| `GET /perfil` | Sin cambios (ya lee de JWT claims) |
| `POST /verificar` | Leer token de cookie vía `cookieAuthService.GetTokenFromCookie()` como fallback si el body está vacío |

**Nuevos endpoints**:

| Endpoint | Responsabilidad |
|----------|----------------|
| `POST /logout` | `[Authorize]`. Llamar `cookieAuthService.ClearAuthCookie()`. Obtener deviceId de cookie, llamar `sessionStoreService.RemoveSession(activeSessionId)` |
| `GET /sessions` | `[Authorize]`. Leer `educa_device_id` de cookie, llamar `sessionStoreService.GetSessionsByDevice(deviceId)`. Retornar `List<StoredSessionDto>` |
| `POST /switch-session/{sessionId}` | Leer sesión del store, validar que el token almacenado siga vigente, llamar `SetAuthCookie()` con el token de esa sesión. Retornar `StoredSessionDto` con los datos del nuevo usuario |

**Reglas de implementación**:
- Inyectar `ICookieAuthService` y `ISessionStoreService` en el constructor
- Los nuevos endpoints usan `[Authorize]` excepto `/login`
- `/switch-session` debe validar que la sesión pertenece al device actual (comparar deviceId de cookie con deviceId de la sesión)
- `/logout` solo elimina la sesión activa, no todas las sesiones del device

### 2.8 MODIFICAR: Program.cs

**Cambios en DI**:
```
Registrar:
- ICookieAuthService → CookieAuthService (Scoped)
- ISessionStoreService → SessionStoreService (Singleton)
```

**Cambios en JWT config** — modificar `OnMessageReceived` del `JwtBearerEvents`:

```
Regla de prioridad:
1. Leer cookie "educa_auth" → si existe, usar como token
2. Si no hay cookie, dejar que el comportamiento default de JWT Bearer lea el header Authorization
3. Mantener la lógica existente de SignalR query string
```

**Agregar middleware CSRF**:
```
Orden en pipeline:
... UseAuthentication() ...
... UseAuthorization() ...
app.UseMiddleware<CsrfValidationMiddleware>();  // DESPUÉS de auth
... MapControllers() ...
```

**CORS**: Ya tiene `.AllowCredentials()`. Verificar que siga presente.

---

## Fase 3: Frontend — Migrar a Cookie Auth

### Decisiones de diseño (inmutables)

| Decisión | Valor | Razón |
|----------|-------|-------|
| `withCredentials: true` | En TODAS las requests | Cookie viaja automáticamente |
| XSRF config | `cookieName: 'XSRF-TOKEN'`, `headerName: 'X-XSRF-TOKEN'` | Angular estándar, match con backend |
| Token en JS | NUNCA — eliminado de AuthUser, storage, interceptor | Punto central de la migración |
| Login success | `response.success` (boolean) en vez de `response.token` (string) | Token ya no viene en body |
| Multi-sesión | `getSessions()` + `switchSession()` reemplazan autofill basado en tokens | Server-side, sin exponer passwords |

### 3.1 CREAR: Credentials Interceptor

**Archivo**: `src/app/core/interceptors/credentials/credentials.interceptor.ts`

**Contrato**:
- Functional interceptor (`HttpInterceptorFn`)
- Clona cada request con `{ withCredentials: true }`
- Exportar desde barrel `src/app/core/interceptors/index.ts`

### 3.2 MODIFICAR: `app.config.ts`

**Cambios**:
1. Importar `credentialsInterceptor` desde `@core/interceptors`
2. Importar `withXsrfConfiguration` desde `@angular/common/http`
3. Agregar `credentialsInterceptor` como PRIMER interceptor del array
4. Agregar `withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })` dentro de `provideHttpClient()`

**Regla**: Leer el archivo actual antes de modificar — pueden haber cambiado los interceptors.

### 3.3 MODIFICAR: `auth.models.ts`

**Cambios**:

| Interface | Cambio |
|-----------|--------|
| `LoginRequest` | AGREGAR campo `rememberMe: boolean` |
| `LoginResponse` | ELIMINAR `token: string`. AGREGAR `success: boolean` |
| `AuthUser` | ELIMINAR `token: string` |
| `VerifyTokenResponse` | ELIMINAR interface completa (ya no se usa) |
| Nuevo: `StoredSession` | `{ sessionId: string, nombreCompleto: string, rol: string, entityId: number, sedeId: number }` |

**Regla**: Leer el archivo actual primero. Si hay campos nuevos que se agregaron, mantenerlos.

### 3.4 MODIFICAR: `auth-api.service.ts`

**Cambios**:

| Método | Cambio |
|--------|--------|
| `login()` | El request ahora incluye `rememberMe`. Cookie se setea por el servidor automáticamente |
| `getProfile()` | Sin cambios (cookie viaja sola) |
| `verifyToken(token: string)` | ELIMINAR — ya no se envía token como body |
| Nuevo: `logout()` | `POST /api/Auth/logout` con body vacío |
| Nuevo: `getSessions()` | `GET /api/Auth/sessions`, retorna `StoredSession[]` |
| Nuevo: `switchSession(sessionId)` | `POST /api/Auth/switch-session/{sessionId}`, retorna `StoredSession` |

**Regla**: Leer el archivo actual. Si hay métodos nuevos que se agregaron, mantenerlos.

### 3.5 MODIFICAR: `auth.service.ts`

**Cambios mayores**:

| Área | Cambio |
|------|--------|
| `get token()` | ELIMINAR — token ya no es accesible desde JS |
| `login()` | Detectar éxito con `response.success` en vez de `response.token` |
| `handleSuccessfulLogin()` | Solo guardar user info (sin token) en storage. Eliminar `storage.setToken()` |
| `logout()` | Llamar `api.logout()` (fire-and-forget) para que el servidor limpie la cookie. Luego limpiar estado local |
| `verifyToken()` | Llamar `api.getProfile()` — la cookie viaja sola. Sin parámetro de token |
| `verifyAllStoredTokens()` | ELIMINAR — reemplazado por `getSessions()` |
| `verifyTokenForAutofill()` | ELIMINAR — reemplazado por sessions |
| Nuevo: `getSessions()` | Delegar a `api.getSessions()` |
| Nuevo: `switchSession(sessionId)` | Llama API, actualiza user info local y reactive state |
| `isAuthenticated` bootstrap | Cambiar de `storage.hasToken()` a `storage.hasUserInfo()` |

**Regla**: Leer el archivo actual completo. Pueden haber cambiado firmas o agregado métodos nuevos. Preservar todo lo que no sea token-related.

### 3.6 MODIFICAR: `auth.interceptor.ts`

**Cambio**: Simplificar a no-op (pass-through). Ya no agrega `Authorization: Bearer`. La cookie viaja sola gracias a `credentialsInterceptor`.

**Regla**: Mantener el interceptor como no-op durante transición. Eliminar en Fase 5.

### 3.7 MODIFICAR: `auth.store.ts`

**Cambios**:
- ELIMINAR computed `token` (si existe — lee `store.user()?.token`)
- `onInit`: Cambiar `storage.hasToken()` por `storage.hasUserInfo()`

**Regla**: Leer archivo actual. Si hay nuevos computed o methods, mantenerlos.

### 3.8 MODIFICAR: `session-storage.service.ts`

**Cambios — ELIMINAR todo lo relacionado a tokens**:

| Eliminar | Razón |
|----------|-------|
| `SESSION_KEYS.TOKEN` | Token ya no se guarda en sessionStorage |
| `LOCAL_KEYS.TOKEN` | Token ya no se guarda en localStorage |
| `LOCAL_KEYS.REMEMBER_TOKEN` | RememberMe es via cookie, no localStorage |
| Métodos: `getToken()`, `setToken()`, `removeToken()`, `hasToken()` | Token en HttpOnly cookie |
| Métodos: `getRememberToken()`, `clearRememberToken()`, `getAllPersistentTokens()` | Sessions server-side |

**Agregar**:
- `hasUserInfo(): boolean` — verifica si hay user info almacenada (reemplaza `hasToken()`)

**Simplificar**:
- `clearAuth()`: Solo limpia user info, no tokens
- `setUser()`: Ya no necesita lógica de token asociada

**Regla**: Este archivo es grande (~585 líneas). Leerlo completo antes de modificar. Pueden haber cambiado keys o agregado nuevos métodos para otros datos. Solo tocar lo relacionado a tokens.

### 3.9 MODIFICAR: `storage.service.ts`

**Cambios — ELIMINAR facade methods de token**:
- `getToken()`, `setToken()`, `removeToken()`, `hasToken()`
- `getRememberToken()`, `clearRememberToken()`, `getAllPersistentTokens()`

**Agregar**:
- `hasUserInfo(): boolean` — delega a `sessionStorage.hasUserInfo()`

**Regla**: Leer archivo actual (~680 líneas). Solo tocar métodos de token. Mantener todo lo demás.

### 3.10 MODIFICAR: `auth/index.ts` (barrel export)

**Cambios**:
- Agregar export de `StoredSession`
- Eliminar export de `VerifyTokenResponse` (si existe)
- Agregar export de `AuthApiService` (si no está)

### 3.11 MODIFICAR: Login Component

**Archivo**: `src/app/features/intranet/pages/login/login-intranet.component.ts`

**Cambios**:

| Área | Cambio |
|------|--------|
| Tipo de rememberedUsers | `VerifyTokenResponse[]` → `StoredSession[]` |
| `loadRememberedUsers()` | Cambiar `verifyAllStoredTokens()` → `getSessions()` |
| `autofillFromUser()` | Reescribir como `autofillFromSession()` — sessions no tienen password, solo pre-llenar rol |
| `tryAutocompleteFromDni()` | ELIMINAR o simplificar — no hay passwords en sessions |
| `onLogin()` success check | `response.token` → `response.success` |
| Nuevo: `quickLogin(session)` | Llama `authService.switchSession(session.sessionId)`, navega a intranet. Sin password |
| Imports | Eliminar `VerifyTokenResponse`, agregar `StoredSession` |

**Regla**: Leer el componente actual completo. El template HTML puede haber cambiado. Adaptar los cambios al estado actual.

### 3.12 MODIFICAR: Intranet Layout

**Archivo**: `src/app/shared/components/layout/intranet-layout/intranet-layout.component.ts`

**Cambio mínimo**: `authService.logout()` internamente ahora hace POST al backend. El layout no necesita cambiar su llamada a `logout()`.

**Regla**: Verificar que el método `logout()` del layout no haga nada extra con tokens. Si lo hace, limpiar.

---

## Fase 4: CSRF Protection

Ya implementada dentro de las fases 2-3:

1. **Backend**: `CsrfValidationMiddleware` valida `X-XSRF-TOKEN` header contra cookie `XSRF-TOKEN`
2. **Backend**: `CookieAuthService.SetCsrfCookie()` setea cookie en login
3. **Frontend**: `withXsrfConfiguration()` en `app.config.ts` — Angular lee cookie y envía header automáticamente

---

## Fase 5: Transición (Backward Compatibility)

### Deploy Order

1. **Deploy backend primero**: Acepta AMBOS (cookie y Authorization header)
2. **Deploy frontend**: Usa cookies, deja de enviar Authorization header
3. **1 semana después**: Cleanup

### Cleanup (1 semana post-deploy)

| Eliminar | Archivo |
|----------|---------|
| `authInterceptor` (ya es no-op) | Frontend: `auth.interceptor.ts` |
| Campo `Token` de `LoginResponseDto` | Backend: DTOs de auth |
| Fallback de Authorization header en `OnMessageReceived` | Backend: `Program.cs` |
| Campo `Success` (token ya no existe, todo login exitoso retorna datos) | Backend: `LoginResponseDto` |

---

## Verificación Final

```
[ ] Login → DevTools > Cookies: educa_auth con HttpOnly=true, Secure=true
[ ] Login → DevTools > Network: NO hay header Authorization en requests
[ ] Login → DevTools > Application > localStorage/sessionStorage: NO hay tokens
[ ] Login con rememberMe=true → cerrar browser → reabrir → sigue autenticado
[ ] Login con rememberMe=false → cerrar browser → reabrir → NO autenticado
[ ] Logout → cookie eliminada, redirect a login
[ ] CSRF: curl POST sin header X-XSRF-TOKEN → 403
[ ] Multi-sesión: Login user A, login user B → GET /sessions muestra ambos
[ ] Switch: POST /switch-session/{id} → cookie cambia, UI muestra nuevo usuario
[ ] 401 en cualquier endpoint → redirect a login
```

---

## Inventario de Archivos

### Backend — CREAR (7 archivos)
| # | Archivo | Sección |
|---|---------|---------|
| 1 | `Constants/Auth/CookieConfig.cs` | 2.1 |
| 2 | `Interfaces/Services/ICookieAuthService.cs` | 2.2 |
| 3 | `Services/Auth/CookieAuthService.cs` | 2.2 |
| 4 | `Interfaces/Services/ISessionStoreService.cs` | 2.3 |
| 5 | `Services/Auth/SessionStoreService.cs` | 2.3 |
| 6 | `DTOs/Auth/StoredSessionDto.cs` | 2.4 |
| 7 | `Middleware/CsrfValidationMiddleware.cs` | 2.5 |

### Backend — MODIFICAR (3 archivos)
| # | Archivo | Sección |
|---|---------|---------|
| 1 | `DTOs/Auth/LoginDto.cs` (o donde estén los DTOs de auth) | 2.6 |
| 2 | `Controllers/Auth/AuthController.cs` | 2.7 |
| 3 | `Program.cs` | 2.8 |

### Frontend — CREAR (1 archivo)
| # | Archivo | Sección |
|---|---------|---------|
| 1 | `core/interceptors/credentials/credentials.interceptor.ts` | 3.1 |

### Frontend — MODIFICAR (9 archivos)
| # | Archivo | Sección |
|---|---------|---------|
| 1 | `app.config.ts` | 3.2 |
| 2 | `core/services/auth/auth.models.ts` | 3.3 |
| 3 | `core/services/auth/auth-api.service.ts` | 3.4 |
| 4 | `core/services/auth/auth.service.ts` | 3.5 |
| 5 | `core/interceptors/auth/auth.interceptor.ts` | 3.6 |
| 6 | `core/store/auth/auth.store.ts` | 3.7 |
| 7 | `core/services/storage/session-storage.service.ts` | 3.8 |
| 8 | `core/services/storage/storage.service.ts` | 3.9 |
| 9 | `features/intranet/pages/login/login-intranet.component.ts` | 3.11 |

### Config (Fase 1 — completado)
| # | Archivo | Estado |
|---|---------|--------|
| 1 | `proxy.conf.json` | ✅ |
| 2 | `angular.json` | ✅ |
| 3 | `environment.ts` | ✅ |
| 4 | `environment.development.ts` | ✅ |

---

## Reglas de Implementación

### Para Claude (o quien implemente):

1. **SIEMPRE leer el archivo actual antes de modificar** — el backend puede haber cambiado
2. **Solo tocar lo relacionado a tokens/auth** — preservar todo lo demás intacto
3. **Respetar las reglas del backend** (ver `.claude/rules/backend.md`): Controller delega, Service decide, Repository accede
4. **Respetar las reglas del frontend** (ver `.claude/rules/`): Facade+Store, signals privados, OnPush
5. **No hardcodear strings** — usar constants (`CookieConfig`, `CookieNames`)
6. **Thread safety** en session store — ConcurrentDictionary, no Dictionary
7. **Backward compat obligatoria** — el backend debe aceptar ambos mecanismos durante transición

### Orden de implementación:

```
Backend primero (puede deployarse independiente):
  2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 → 2.8

Frontend después (depende del backend):
  3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10 → 3.11

Cleanup (1 semana post-deploy):
  Fase 5
```
