# 100 · BE · EmailHub SignalR `/hubs/email-alerts` 404 en prod (fix de 078)

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-04 · **Modo sugerido**: `/investigate` → `/execute`
> **Origen**: smoke Cowork 2026-05-04 caso EM-9 🟡 push roto + brief 078 ❌

## Hallazgo

`POST /hubs/email-alerts/negotiate` → **404** en producción Azure App Service.

Resultado: `app-email-defer-fail-banner` (FE 076 + 080) cae a **polling 60s** y nunca recibe el push instantáneo de `DeferFailStatusUpdated`. INV-MAIL04 documenta el push como mecanismo activo, polling como fallback — actualmente solo el fallback está vivo.

El brief 078 (Plan 39 Chat B) se cerró local y se subió a master, pero el hub no responde en prod.

## Hipótesis a investigar

1. **`MapHub` faltante en Program.cs**: el hub se registró en DI (`AddSignalR().AddHubOptions<EmailHub>(...)`) pero la línea `app.MapHub<EmailHub>("/hubs/email-alerts");` no se agregó o se agregó en una rama distinta a `master`.
2. **Build de Azure no incluye el hub**: el `.csproj` no incluyó el archivo `EmailHub.cs` (`*.cs` glob debería capturarlo, pero verificar).
3. **CORS/Auth bloqueando antes de matchear la ruta**: el middleware de CORS o `AuthorizeAttribute` rechaza el negotiate antes de llegar al routing. 404 vs 401/403 importa para diagnóstico — Cowork reportó 404 → probable que la ruta no esté mapeada.
4. **Path mismatch**: el FE manda a `/hubs/email-alerts` pero el BE registró `/hub/email-alerts` (singular) o `/api/hubs/email-alerts`.
5. **Deploy parcial**: el binario actual en Azure es de un commit anterior al de 078 (verificar timestamp del deploy slot).

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
