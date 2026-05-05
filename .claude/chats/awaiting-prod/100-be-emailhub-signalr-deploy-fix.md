# 100 · BE · EmailHub SignalR `/hubs/email-alerts` 403 en prod (fix de 078)

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-04 · **Actualizado**: 2026-05-05 — el código real es **403, no 404** · **Modo sugerido**: `/investigate` → `/execute`
> **Origen**: smoke Cowork 2026-05-04 caso EM-9 🟡 push roto + probe PowerShell 2026-05-05

## Hallazgo

`POST /hubs/email-alerts/negotiate` → **403 Forbidden** en producción Azure App Service (PowerShell con cookie auth válida 2026-05-05). Cowork había reportado 404 — fue impreciso.

Resultado: `app-email-defer-fail-banner` (FE 076 + 080) cae a **polling 60s** y nunca recibe el push instantáneo de `DeferFailStatusUpdated`. INV-MAIL04 documenta el push como mecanismo activo, polling como fallback — actualmente solo el fallback está vivo.

**Implicancia del 403 vs 404**: el hub **SÍ está mapeado** (`MapHub<EmailHub>("/hubs/email-alerts")` quedó en `Program.cs`). El problema es **auth del negotiate**, no deploy faltante. Esto descarta las hipótesis 1, 2 y 5 del análisis original.

## Hipótesis a investigar (revisadas tras probe 2026-05-05)

Con el 403 confirmado, las hipótesis restantes son:

1. ⭐ **CSRF rechaza el POST**: `CsrfValidationMiddleware` (registrado en `Program.cs`, ver `Middleware/CsrfValidationMiddleware.cs`) exige header `X-CSRF-Token` en POST/PUT/DELETE. El SignalR JS client en el FE manda el negotiate como POST normal. Si el cliente FE no agrega el header, el middleware corta antes del hub. **Hipótesis principal**.
2. **AuthorizeAttribute en EmailHub más restrictivo de lo esperado**: el hub puede tener `[Authorize(Roles = "Director")]` o policy custom. Si el JWT no matchea, devuelve 403. Verificar `Hubs/EmailHub.cs`.
3. **CORS preflight**: el OPTIONS antes del POST falla en CORS y el navegador termina recibiendo 403. (Menos probable desde PowerShell que no hace preflight, pero el síntoma del browser podría ser distinto.)

**Hipótesis ya descartadas** (eran del análisis pre-probe, ya no aplican):
- ~~MapHub faltante~~ — el 403 implica routing OK.
- ~~Build no incluye el hub~~ — mismo razonamiento.
- ~~Path mismatch~~ — la ruta sí matchea.
- ~~Deploy parcial~~ — el binario tiene el hub.

## Diagnóstico inicial

```bash
# Confirmar si el hub está en master
cd Educa.API/Educa.API
grep -rn "MapHub\|EmailHub" Program.cs Hubs/

# Confirmar deploy timestamp
# (necesita acceso Azure — pedir al usuario)

# Confirmar negotiate path desde FE
grep -rn "email-alerts\|EmailHub" educa-web/src/app/core/services/
```

## Repro mínimo

1. DevTools Network en `/intranet/admin/monitoreo/correos` (donde está el banner B9).
2. Confirmar `POST /hubs/email-alerts/negotiate` → 404.
3. Probar otros hubs existentes (`/chathub`, `/asistenciahub`) — si esos sí funcionan, el problema es 100% del nuevo hub, no de SignalR en general.

## Scope del fix

**Investigate**:
- Verificar `Program.cs` por `MapHub<EmailHub>(...)`.
- Verificar `Hubs/EmailHub.cs` existe y se incluye en el build.
- Verificar el path declarado en FE matche con el BE.
- Verificar que la versión deployada en Azure incluya el commit del hub.

**Execute** (depende del hallazgo):
- Hipótesis 1/4: agregar/corregir línea de `MapHub` en Program.cs.
- Hipótesis 2: verificar `.csproj` includes.
- Hipótesis 3: ajustar CORS/Auth.
- Hipótesis 5: redeploy.

## Tests

- Tests de integración del hub usando `HubConnectionBuilder` en TestServer.
- Smoke browser caso EM-9 debe pasar el push (no solo polling).

## Severidad

**Media** — el banner sigue funcionando vía polling 60s (degraded gracefully). Pero el delay de 60s es notable cuando el contador defer/fail dispara y el push debería ser inmediato. **Bloquea cierre formal del Plan 39 Chat B (078)** hasta resolver.

## Referencias

- Brief original: `awaiting-prod/078-plan-39-chat-b-be-emailhub-signalr-push.md` (mantener en awaiting-prod hasta resolver el fix).
- INV-MAIL04 (`rules/business-rules.md` §15.14): "push SignalR vía EmailHub cuando el contador o el handler 4.2.2 disparan".
- Patrón de hubs: `Hubs/ChatHub.cs`, `Hubs/AsistenciaHub.cs` como referencias de wiring correcto.

---

## Resolución (2026-05-05, cerrado local)

**Causa raíz**: `EmailHub` (Plan 39 Chat B 078) se mapeó en `PipelineExtensions.cs:141` sin agregar `/hubs/email-alerts` a las **5 listas paralelas** que ya cubrían `/chathub` + `/asistenciahub`. Cada omisión genera un síntoma distinto en una capa distinta — bug en cascada, no un único punto.

**Cascada de bugs encontrados** (todos del mismo patrón omisión-de-paridad):

| Capa | Archivo | Síntoma observable | Fix |
| --- | --- | --- | --- |
| 1. CSRF middleware (BE) | `Educa.API/Middleware/CsrfValidationMiddleware.cs:35` | POST negotiate con cookie auth → **403 "CSRF token requerido"** (probe PowerShell 2026-05-05) | `+ "/hubs/email-alerts"` en `ExcludedPaths` |
| 2. JWT query fallback (BE) | `Educa.API/Extensions/AuthenticationExtensions.cs:59-60` | WebSocket sin cookie (mobile/Capacitor) → 401 al hub | `+ path.StartsWithSegments("/hubs/email-alerts")` en el fallback `?access_token=` |
| 3. Proxy dev local (FE) | `proxy.conf.json` | FE en localhost:4201 no podía testear el fix BE — proxy no ruteaba `/hubs/*` a localhost:7102 | `+ "/hubs"` proxy con `ws: true` |
| 4. Netlify SPA fallback (FE) | `src/_redirects:6` | En prod, `/hubs/email-alerts/negotiate` caía al SPA fallback `/loader.html` → cliente SignalR ve HTML como **404** (síntoma original que reportó Cowork EM-9) | `+ /hubs/* → educa1.azurewebsites.net/hubs/:splat` |
| 5. Netlify build redirects (FE) | `netlify.toml:78` | Misma causa que (4), capa de `force = true` | `+ /hubs/* redirect` con `force = true` |

**Capas 4 y 5 explican el "404" original de Cowork**: la request en prod ni siquiera llegaba al backend. Capa 1 (el 403 del probe PowerShell) era un bug distinto que solo se vio cuando el probe pegó directo a Azure saltándose Netlify. Sin las 5 capas alineadas, la app vivía en alguno de esos dos errores según ruta.

**Validación local**: `dotnet build` 0 errores · 1616/1616 tests BE verdes (sin regresión). FE no requiere cambios en el código del cliente — `EmailHubService` ya estaba correcto, el problema era 100% routing/middleware.

**Pendiente post-deploy** (`/verify 100`):
1. DevTools en `/intranet/admin/monitoreo/correos/dashboard` (tab "Mapa de envío"): `POST /hubs/email-alerts/negotiate` debe retornar **200** con `connectionToken`.
2. Console: log `[EmailHub:Service] connected`.
3. `EmailMonitoreoFacade` debe llamar `stopDeferFailPolling()` (signal de que el push está activo y el polling fallback de 60s se desactivó).
4. Si el contador defer/fail dispara WARNING/CRITICAL durante el smoke, el banner B9 debe actualizarse instantáneamente (no esperar 60s).

**Aprendizaje transferible**: cuando se agrega un hub SignalR con un path nuevo, hay **5 listas paralelas** que necesitan la entrada. Documentado como receta en este brief — la próxima vez que se agregue un hub, replicar ChatHub/AsistenciaHub en las 5 capas, no solo en `MapHub<>()`.

**Scope creep descubierto al validar localmente** (Cowork 2026-05-05, NO parte de este brief):
- Sub-tab Cuarentena: FE pide `/api/sistema/email-outbox/quarantine`, BE expone `/api/sistema/email-quarantine` → 404.
- Sub-tab Dominios pausados: misma desalineación de prefix.
- Sub-tab Eventos defer: FE pide `/api/sistema/email-outbox/defer-events`, **BE no tiene controller** → 404.

→ Reformular brief `099-fe-email-quarantine-tab-not-mounted-fix.md` con estos 3 findings reales en el siguiente chat (la hipótesis original "tab no monta" era imprecisa — las tabs sí montan, fallan las requests HTTP).

