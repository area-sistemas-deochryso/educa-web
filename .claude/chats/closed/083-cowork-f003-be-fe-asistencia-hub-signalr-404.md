> **Repo destino**: FE (`educa-web`, branch `main`) — solo dev. **BE intacto**, no requiere cambios.
> **Plan**: — (hallazgo Cowork pre-deploy 2026-04-29, no asociado a plan formal).
> **Creado**: 2026-04-30 · **Chat**: 1 · **Estado**: 🟢 fix aplicado, pendiente smoke + commit.
> **Origen**: `educa-web/.claude/claude-cowork/SETUP-COWORK.md` §7 F-003 (Alto, **CRÍTICO PRE-DEPLOY**).
> **Override**: brief creado con `open/` al límite blando 5/5 — autorizado por el usuario por prioridad pre-deploy.

---

## RESULTADO DEL `/investigate` (2026-05-02)

| Capa | ChatHub | AsistenciaHub | Diagnóstico |
|---|---|---|---|
| BE `MapHub` (`PipelineExtensions.cs:127,131`) | ✅ | ✅ | OK ambos. Hipótesis 1 descartada. |
| FE `proxy.conf.json` | ✅ con `ws:true` | ❌ **FALTA** | **causa raíz única** |
| Netlify `netlify.toml` (líneas 67-77) | ✅ | ✅ | OK ambos |
| Netlify `_redirects` (líneas 5-6) | ✅ | ✅ | OK ambos |
| FE service URL (`attendance-signalr.service.ts:62`) | ✅ | ✅ `/asistenciahub` | OK |

**Causa raíz**: `proxy.conf.json` no tenía la entry para `/asistenciahub`. Solo afecta **dev local** — Netlify ya está bien wireado en prod.

**Implicación de severidad**: F-003 es bug de **dev only**. En producción el SignalR `/asistenciahub` funciona porque las reglas de Netlify ya redirigen al backend Azure. **No es pre-deploy crítico** — Cowork lo vio en `localhost:4201` y asumió que afectaba prod, pero el wiring de prod es independiente del proxy de dev.

## RESULTADO DEL `/execute` (2026-05-02)

Cambio aplicado: 1 archivo, 6 líneas agregadas.

```json
// educa-web/proxy.conf.json — agregada entry /asistenciahub con ws:true
{
  "/asistenciahub": {
    "target": "https://localhost:7102",
    "secure": false,
    "changeOrigin": true,
    "ws": true
  }
}
```

**Fuera de alcance respetado**: NO se agregó `/hubs/email-alerts` (zona de chat 076 en `waiting/`, Plan 39 Chat B). Esa deuda se resuelve cuando 076 reanude tras deploy de 078.

## VALIDACIÓN PENDIENTE (a ejecutar por el usuario)

1. Arrancar BE: `cd ../Educa.API/Educa.API && dotnet run` (puerto 7102).
2. Arrancar FE: `cd educa-web && npm run start` (puerto 4201).
3. Login Director (`74125896`/`12349898`) en `localhost:4201`.
4. Navegar a `/intranet/asistencia` → DevTools Network: `/asistenciahub/negotiate` → **200** (no 404).
5. Verificar en consola: ya no aparecen los 2 errores rojos de SignalR al navegar.
6. Repetir en `/admin/asistencias` y `/admin/permisos-salud`.

## COMMIT PENDIENTE

```
fix(proxy): add /asistenciahub entry to dev proxy

The dev proxy only had /chathub configured, causing 404 on the local
/asistenciahub/negotiate request even though the BE hub was correctly
mapped. Netlify redirects already covered prod — this fix only affects
dev environment. /hubs/email-alerts intentionally excluded (tracked by
chat 076 in waiting/, dependent on Plan 39 Chat B deploy).
```

---

---

# F-003 · SignalR `/asistenciahub` falla con 404 en cada navegación de Seguimiento

## OBJETIVO

Restaurar la conexión SignalR del hub de asistencia. Hoy `POST /asistenciahub/negotiate` devuelve 404 en cada navegación a `/intranet/asistencia`, `/admin/asistencias` y `/admin/permisos-salud`. El Director y los profesores **no reciben actualizaciones en tiempo real** de marcaciones biométricas CrossChex — la página queda con datos estáticos hasta refresh manual.

El hub `AsistenciaHub` ya existe en `Educa.API/Hubs/`. Falta el wiring (mapeo + proxy + URL cliente + redirects de Netlify).

## MODO SUGERIDO

Arrancar con `/investigate` para mapear las 4 capas (mapeo BE, proxy local, URL cliente, redirects prod) y comparar con `ChatHub` que sí funciona. Luego `/execute` con el fix concreto, `/validate` local + smoke prod.

Flujo: `/investigate` → `/execute` → `/validate` → cierre.

Razón: hay 4 hipótesis no descartadas (mapeo BE, proxy FE, URL cliente, redirects Netlify). Antes de tocar código hay que confirmar cuál o cuáles fallan, porque arreglar solo el local sin redirects de Netlify reproduce el bug en prod (anti-patrón "fix incompleto" registrado en `feedback_deploy_full_picture.md`).

## PRE-WORK OBLIGATORIO

1. Leer `Educa.API/Program.cs` completo — buscar **todos** los `MapHub<T>(...)` para comparar el wiring de `ChatHub` vs `AsistenciaHub`.
2. Leer `Educa.API/Hubs/AsistenciaHub.cs` y `Educa.API/Hubs/ChatHub.cs` — confirmar atributos `[Authorize]`, namespaces, herencia de `Hub`.
3. Leer `educa-web/proxy.conf.json` (o equivalente) — verificar entradas para `/chathub` y `/asistenciahub` con `"ws": true` y `"target": "https://localhost:7102"`.
4. Leer `educa-web/src/app/core/services/signalr/asistencia-signalr.service.ts` y `chat-signalr.service.ts` — confirmar URL del cliente y diferencias.
5. Leer `educa-web/netlify.toml` y `educa-web/src/_redirects` — confirmar entradas para `/chathub/*` y `/asistenciahub/*` con `force = true` (memoria del proyecto: rutas de proxy deben estar **en ambos archivos**).
6. Memorias relevantes ya cargadas:
   - Netlify no soporta WebSocket → SignalR usa `ServerSentEvents | LongPolling` en producción.
   - `EmailHub` (Plan 39 Chat B) tiene 404 esperado hasta deploy `awaiting-prod/078`. **No confundir con F-003** — `EmailHub` es otro hub, otro tracking.

## ALCANCE

Capas a verificar (cada una con su archivo). El número final de archivos modificados puede ser 1, 2 o 4 según qué falte.

| Capa | Archivo | Cambio probable |
|---|---|---|
| 1. Mapeo BE | `Educa.API/Program.cs` | Agregar `app.MapHub<AsistenciaHub>("/asistenciahub")` si falta |
| 2. Proxy local FE | `educa-web/proxy.conf.json` | Agregar entrada `/asistenciahub` con `"ws": true` y `"target": "https://localhost:7102"`, `"secure": false`, `"changeOrigin": true` |
| 3. URL cliente | `educa-web/src/app/core/services/signalr/asistencia-signalr.service.ts` | Confirmar que `withUrl(...)` apunta a `/asistenciahub` (no a otra ruta) y usa transports correctos para Capacitor |
| 4. Redirects Netlify | `educa-web/netlify.toml` y `educa-web/src/_redirects` | Reglas de proxy para `/asistenciahub/*` → `https://educacom.azurewebsites.net/asistenciahub/:splat` con `force = true` |

⚠️ **Cross-repo**: tocar BE y FE requiere coordinación. Si solo BE → smoke local FE para verificar. Si solo FE → no requiere deploy BE. Si ambos → coordinar el orden (BE primero, FE después).

## TESTS MÍNIMOS

Manual obligatorio (no hay tests automatizados de SignalR en el proyecto actualmente):

| Paso | Resultado esperado |
|---|---|
| 1. Login Director (`74125896`/`12349898`) en `localhost:4201` | Sesión activa |
| 2. Navegar a `/intranet/asistencia` | DevTools Network: `/asistenciahub/negotiate` → 200 (no 404) |
| 3. DevTools Network → filtrar por `asistenciahub` | Una conexión SSE/LongPolling abierta (frame WebSocket si local lo soporta) |
| 4. Navegar a `/admin/asistencias` y volver a `/intranet/asistencia` | NO se duplican errores 404 en consola; reconexión limpia |
| 5. Marcar asistencia desde otra pestaña/biométrico (o disparar evento BE de prueba) | UI muestra el evento sin refresh manual |
| 6. Verificar `/admin/permisos-salud` | Misma conexión sin 404 |

Smoke prod tras deploy:

| Paso | Resultado esperado |
|---|---|
| 7. Login Director en `https://educa.netlify.app` (o URL real, pedir al usuario) | Network: `/asistenciahub/negotiate` → 200 |
| 8. Confirmar `transport: ServerSentEvents` o `LongPolling` (no WebSocket en Netlify) | Conexión activa en transport degradado |
| 9. Repetir paso 5 en prod si hay biométrico de staging | Evento llega sin refresh |

## REGLAS OBLIGATORIAS

- `rules/backend.md` — Si tocás `Program.cs`, mantener orden de middleware. `MapHub` va con los demás `MapXxx` después de `app.UseRouting()` y `app.UseAuthentication()`/`app.UseAuthorization()`.
- `rules/backend.md` — Si `AsistenciaHub` requiere autorización, mantener `[Authorize]` consistente con `ChatHub`.
- `rules/permissions.md` — `AsistenciaHub` debe respetar la jurisdicción de asistencia (Director/Admin/Profesor según método). No abrir broadcast a roles no autorizados.
- `rules/service-worker.md` — Si el SW intercepta `/asistenciahub/*` (por error), excluirlo del cache. Solo rutas `/api/*` deben ir al SW.
- `rules/communication.md` — Si la causa es ambigüedad de URL del cliente vs el proxy, parar y preguntar al usuario antes de cambiar el contrato del hub.
- Plan 39 Chat B (`awaiting-prod/078`) — registra `EmailHub`. **No mezclar** el wiring de `EmailHub` con `AsistenciaHub`. Son hubs distintos con distinta criticidad.

## APRENDIZAJES TRANSFERIBLES (del chat actual + memoria)

- **`ChatHub` funciona, `AsistenciaHub` no**: el diff de wiring entre ambos es la pista más rápida. Empezar por ahí, no por leer `AsistenciaHub.cs` desde cero.
- **El bug se repite por navegación**: cada change de ruta en el módulo Seguimiento dispara los 2 errores de nuevo. Sugiere que el cliente intenta reconectar en cada activación del componente, lo cual también hay que verificar (¿el service es providedIn:'root' o se reinstancia?).
- **Anti-patrón típico en este proyecto**: arreglar solo BE local + proxy y olvidar `netlify.toml` + `_redirects`. La memoria `feedback_deploy_full_picture.md` lo registra. Validar las 4 capas antes de cerrar.
- **Netlify limita transports**: en prod no hay WebSocket. Si el cliente fuerza `HttpTransportType.WebSockets`, falla en prod aunque local funcione. Verificar `withUrl(..., { transport: HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling })` en el service.
- **CrossChex envía UTC+0**: irrelevante para este bug pero presente en cada flujo de asistencia (memoria del proyecto).
- **Credenciales test**: DNI `74125896` / pwd `12349898` / rol Director.
- **Caso vivo verificado por Cowork** (2026-04-29): 5to Primaria A, profesor RAMIREZ DNI 76357038, fecha 2026-04-29 — usar este contexto para reproducir.

## FUERA DE ALCANCE

- F-011 (search por DNI) — ya tiene brief separado en `082-cowork-f011-be-asistencia-admin-search-dni.md`. NO mezclar fixes en el mismo commit.
- F-002, F-004, F-008, F-015 (medios) — abrir briefs aparte cuando se libere `open/`.
- Refactor del wiring de SignalR a un helper unificado — si los 2-3 hubs (`ChatHub`, `AsistenciaHub`, `EmailHub`) repiten patrones, tomar nota en `tasks/` pero NO refactorizar acá.
- Tests de integración de SignalR — no hay infra hoy en el proyecto. Si se quiere agregar, brief nuevo (Plan 12 o Plan 13).
- Plan 39 Chat B `EmailHub` — está en `awaiting-prod/`. NO tocar.

## VALIDACIÓN FINAL

Local — backend en `https://localhost:7102`, frontend en `localhost:4201`:

```bash
# Backend
cd ../Educa.API/Educa.API
dotnet build                                              # 0 warnings
dotnet run                                                # arranca el API

# Frontend (en otra terminal)
cd educa-web
npm run start                                             # serve con proxy.conf.json
```

Manual — checklist completo de TESTS MÍNIMOS pasos 1-6.

Build prod local (validar Netlify offline):

```bash
cd educa-web
npm run build
# Inspeccionar dist/.../netlify.toml y dist/.../_redirects (si Angular los copia)
```

Pre-deploy:

- [ ] `dotnet build` y `dotnet test` verdes (BE).
- [ ] `npm run lint` y `npm run build` verdes (FE).
- [ ] Smoke local pasos 1-6 OK.
- [ ] Diff revisado: las 4 capas tocadas si correspondía.
- [ ] `netlify.toml` y `_redirects` con `/asistenciahub/*` (memoria del proyecto: ambos).

Post-deploy (en `awaiting-prod/`):

- [ ] Smoke prod pasos 7-9 OK.

## CRITERIOS DE CIERRE

- [ ] Smoke local completo pasa (pasos 1-6).
- [ ] BE: `Program.cs` con `MapHub<AsistenciaHub>` confirmado.
- [ ] FE: `proxy.conf.json` con `/asistenciahub` + `ws: true`.
- [ ] FE: `netlify.toml` y `src/_redirects` con `/asistenciahub/*` (regla `force = true` y target Azure).
- [ ] Brief movido `running/` → `awaiting-prod/` (espera smoke prod).
- [ ] Maestro: agregar entrada bajo "Hallazgos Cowork pre-deploy 2026-04-29" si no existe.
- [ ] **Commit cross-repo**:
  - BE solo: `commit-back` (si solo cambió `Program.cs`).
  - FE solo: `commit-front` (si solo cambió FE).
  - Ambos: dos commits coordinados con mensaje cross-referenciado, ambos en el mismo orden — BE primero, FE después.

## COMMIT MESSAGE sugerido

Si el fix es BE (mapeo faltante):

```
fix(signalr): map AsistenciaHub at /asistenciahub

The hub class existed but was never mapped in Program.cs, causing
404 on /asistenciahub/negotiate from every Seguimiento navigation.
Director and teachers were not receiving real-time CrossChex updates.
```

Si el fix es FE (proxy/redirects faltantes):

```
fix(signalr): proxy and Netlify redirects for /asistenciahub

The dev proxy and Netlify redirects only had /chathub configured.
Adds /asistenciahub with ws:true locally and a forced redirect rule
in netlify.toml + _redirects (both required by project convention)
to forward to Azure backend with SSE/LongPolling transports in prod.
```

Si toca ambos: dos commits con los subjects de arriba, en orden BE → FE.

(Ver `~/.claude/rules/commit-style.md` — sin `Co-Authored-By`, subject ≤ 72.)

## CIERRE

Pedir al usuario:

1. Confirmar smoke en producción (pasos 7-9): login Director en URL prod, navegar a Seguimiento, verificar Network sin 404 y transport degradado a SSE/LongPolling.
2. Si hay biométrico de staging accesible, disparar marcación y confirmar que llega en tiempo real.
3. Mover el hallazgo F-003 desde §7 a §8 ("Hallazgos verificados") en `claude-cowork/SETUP-COWORK.md` con hash(es) del/los commit(s).
4. Confirmar que el SW (service worker) no está cacheando `/asistenciahub/*` por error — abrir DevTools → Application → Service Workers → "Bypass for network" si aparece interferencia.
