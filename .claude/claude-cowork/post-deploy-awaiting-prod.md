# Post-deploy validation — awaiting-prod (20 briefs)

> **Cuándo correr**: inmediatamente después de un deploy completo (FE Netlify + BE Azure). Cada caso pasa → `/verify <NNN>` ✅ → mueve a `closed/`.
> **Operador**: Cowork (browser QA) o humano siguiendo este checklist. Algunos casos requieren coordinación con humano (acceso SQL/SSH/Hangfire) — marcados `⚠️ no-browser` o `⚠️ requiere coordinación`.
> **Tiempo total estimado**: ~3-4 h browser + ~30 min coordinación con humano (queries SQL, observación de Hangfire, prueba IMAP real).
> **Login**: Chrome perfil `Sistemas` (`area.sistemas.min@gmail.com`). Browser MCP: **`work aqui m`** (deviceId `30baf13d`). Credenciales test: DNI `74125896` / pwd `12349898` / rol Director.
> **URLs**: FE prod = pedir al usuario antes de tocar. BE prod = `https://educacom.azurewebsites.net`.

## Setup global (1 vez)

1. Abrir Chrome perfil Sistemas, navegar a la URL de FE prod, login Director (sesión guardada — un click).
2. **DevTools abierto** desde el primer paso (no después — `read_console_messages` y `read_network_requests` arrancan tracking en la primera llamada):
   - `Network` (filtro `Fetch/XHR`)
   - `Console` (sin filtro inicial; cuando arranquen casos WAL filtrar por `[WAL`)
   - `Application → IndexedDB` para casos WAL
   - `Application → Storage` para casos WAL Resilience M3
3. Si el deploy FE acaba de terminar, primer reload puede tirar mismatches de cache. Hacer **un hard reload** (Ctrl+Shift+R) antes de empezar.
4. Confirmar SW activo: `Application → Service Workers` → status `activated and is running`. Si no, reload otra vez.

## Pre-flight — health checks de infra (5 min, antes de empezar)

| Check | Cómo | Si falla |
|---|---|---|
| BE Azure responde | Network del login en FE prod → `POST /api/auth/login` 200 | Pedir al usuario que confirme deploy de Azure App Service |
| FE Netlify sirve build nuevo | Console: buscar `WAL_DEFAULTS.schemaVersion` o build hash conocido | Hard reload + chequear `_redirects` y `netlify.toml` |
| Hangfire dashboard activo | ⚠️ no-browser — pedir al usuario screenshot de `/hangfire` (jobs `bounce-parser-imap`, `email-quarantine-release`, `email-domain-pause-release`, `blacklist-auto-cleanup`) | Si alguno no está registrado, el chat correspondiente no pasa |
| SQL migrations ejecutadas | ⚠️ no-browser — pedir al usuario que corra los SELECT de inspección listados en cada caso BE | Bloquea el deploy del binario respectivo |

---

## WAL — resilience M1-M4 + cross-tab + banner migración (briefs 091×2, 092, 093, 094)

> **Antes de arrancar este bloque**: los 5 briefs WAL tocan los mismos archivos del WAL engine. Validarlos en el orden listado evita falsos positivos por estado residual de IDB. Empezar con IDB limpia: `Application → IndexedDB → educa-wal-db → tx.objectStore('wal-entries').clear()` (no `deleteDatabase` — devuelve `blocked` mientras la app la tiene abierta).

### Caso WAL-1 — Cross-tab refetch en facades nuevos (091 cross-tab)

> **Cubre**: 16 facades wireados con `WalCrossTabRefetchService` que antes no refetcheaban tras commit del leader. Confirma que el handoff cross-tab actualiza UI sin F5 manual.

**Precondición**: 2 tabs abiertos en `/intranet/admin/usuarios`, mismo browser, misma sesión.

**Pasos**:
1. Identificar leader: en consola de cada tab buscar `[WAL-Leader] became leader` vs `follower`.
2. En el follower (tab B): editar un usuario (cambiar nombre o toggle estado), guardar.
3. Esperar ~1-2s.
4. Sin recargar, mirar la fila en tab A (leader).

**Confirmación pasa**:
- Tab A muestra el cambio sin F5 manual.
- Console tab A: `[WAL] entry committed by other tab, invalidating cache resourceType=usuarios` seguido de un GET refetch silencioso (sin loading flicker).
- Network tab A: 1 GET `/api/sistema/usuarios?...` con respuesta fresca.

**Confirmación falla**:
- Tab A sigue mostrando el dato viejo hasta navegar/F5 → wiring no aplicado a `usuarios-data.facade.ts` o el `resourceType` del subscribe no matchea el del `wal.execute`.

**Repetir mínimo en 2 features más** (rotar entre): `/intranet/admin/schedules` (multi-facade), `/intranet/admin/permissions-roles`, `/intranet/admin/error-groups`, o `/intranet/profesor/cursos` si hay 2do usuario profesor.

---

### Caso WAL-2 — Banner REQUIRES_MIGRATION visible (091 banner-migration)

> **Cubre**: `WalMigrationBannerComponent` montado en `IntranetLayout`. Banner B9 yellow que aparece cuando hay entries con `schemaVersion` viejo.

**Precondición**: IDB con 0 entries `REQUIRES_MIGRATION` (limpiar primero con `clear()`). Sin sessionStorage de dismiss previo.

**Pasos**:
1. Inyectar entry en IDB con `schemaVersion: 0` (current = 1) y `status: 'PENDING'`. Snippet:
   ```js
   new Promise(res => {
     const r = indexedDB.open('educa-wal-db');
     r.onsuccess = () => {
       const db = r.result;
       const tx = db.transaction(['wal-entries'], 'readwrite');
       tx.objectStore('wal-entries').add({
         id: crypto.randomUUID(),
         schemaVersion: 0,
         status: 'PENDING',
         operation: 'UPDATE',
         resourceType: 'usuarios',
         retryCount: 0,
       });
       tx.oncomplete = () => { db.close(); res('ok'); };
     };
   })
   ```
2. F5 (recargar).
3. Observar arriba del header.

**Confirmación pasa**:
- Banner amarillo visible con texto sobre migraciones pendientes + ícono `pi pi-exclamation-triangle`.
- Botón "Descartar entradas" presente; click lo limpia y banner desaparece.
- Botón X cierra el banner; reload trae el banner de vuelta (sessionStorage solo dura la sesión actual con la X aplicada).
- A11y: contraste suficiente del texto sobre el `color-mix` yellow.

**Confirmación falla**:
- Banner no aparece tras reload → componente no montado en layout, o `WalStatusFacade.hasMigrations` no se está actualizando.

---

### Caso WAL-3 — Reconciliación post-reload (092 M1)

> **Cubre**: commit huérfano (entry IN_FLIGHT que sobrevive reload) → `WalReconciler.notifyOrphanedCommit` invalida cache y dispara refetch automático de URLs cacheadas matching el `resourceType`.

**Precondición**: `/intranet/admin/cursos` cargado, IDB limpia.

**Pasos**:
1. Editar un curso (cambiar nombre), click guardar.
2. Antes de que el toast de éxito aparezca (~200ms), F5 inmediato.
3. Tras reload, observar la fila del curso editado.

**Confirmación pasa**:
- La fila ya muestra el valor del servidor sin F5 adicional.
- Console: `[WAL] commit sin callback registrado, reconciler ejecutando refetchByPattern` o equivalente.
- Network: GET fresco a `/api/sistema/cursos` poco después del reload.

**Confirmación falla**:
- La fila muestra el valor viejo hasta navegar manualmente → `WalReconciler` no se invocó o `sw.refetchByPattern` no encuentra el patrón.

⚠️ **Variante difícil de reproducir**: el commit debe ocurrir DURANTE el reload window. Si tu BE local responde en <50ms, hay que matar el dotnet a mano para forzar la ventana. En prod la latencia natural lo hace observable. Si no se puede repro, marcar como pendiente y observar en analytics 30d (criterio de éxito documentado en M1).

---

### Caso WAL-4 — Circuit breaker abierto (092 M2)

> **Cubre**: 5 fallos retryable consecutivos abren el circuit. Banner "Modo degradado" aparece. Click "Reintentar ahora" fuerza half-open.

**Precondición**: IDB limpia. Console abierta.

**Pasos**:
1. Inyectar interceptor de `window.fetch` que retorne 503 para POST/PUT/DELETE de `/api/sistema/cursos`:
   ```js
   const orig = window.fetch;
   window.fetch = (input, init) => {
     const url = typeof input === 'string' ? input : input.url;
     if (/\/api\/sistema\/cursos/.test(url) && init?.method && init.method !== 'GET')
       return Promise.resolve(new Response('{"error":"down"}', { status: 503 }));
     return orig(input, init);
   };
   ```
2. Crear 5 cursos rápidos (cada uno acumula 1 fallo retryable tras max retries).
3. Esperar el banner.

**Confirmación pasa**:
- Banner B9 "Modo degradado / Reintentar ahora" aparece arriba del header.
- Console: `[WAL] circuit breaker OPEN`.
- Crear un 6to curso → la entry queda en `PENDING` pero NO sale a la red (circuit detiene el processing).
- Click "Reintentar ahora" → restaurar `window.fetch = orig` antes → la sonda half-open va a la red, si responde 200 cierra el circuit, banner desaparece.

**Confirmación falla**:
- Banner no aparece tras 5 fallos → threshold incorrecto o `recordFailure` no se llama desde el engine.
- Banner aparece con 4xx → el handler está contando errors no-retryable (4xx no debería abrir circuit, INV-WAL-RES04).

---

### Caso WAL-5 — InMemoryStrategy fallback (093 M3)

> **Cubre**: cuando IndexedDB no inicializa (privado / quota lleno / 5s timeout) → swap transparente a `InMemoryStrategy`, banner "Modo reducido", mutaciones siguen funcionando dentro de la sesión.

**Precondición**: ⚠️ requiere navegador en **modo privado/incognito** (Firefox bloquea IDB en privado más confiable que Chrome). En Chrome incognito IDB sí funciona — usar Firefox para este caso.

**Pasos**:
1. Abrir Firefox modo privado, navegar a FE prod, login Director.
2. Ir a `/intranet/admin/cursos`, observar arriba del header.
3. Crear un curso optimista.
4. Cerrar y reabrir el navegador (perdiendo la sesión privada).

**Confirmación pasa**:
- Banner "Modo reducido" visible al cargar.
- Console: `[WAL-Storage] IndexedDB unavailable, fallback to in-memory` o equivalente.
- `walStatusStore.mode === 'ephemeral'` (verificable en consola: `window.angular?.getInjector...`, o más simple: el banner mismo confirma).
- Crear curso → POST sale 200, fila aparece. Tras cerrar y reabrir, la cola se perdió (esperado en `ephemeral`).

**Confirmación falla**:
- App rompe al iniciar / errors rojos en consola por `dbReady` undefined → strategy pattern roto.
- Banner no aparece → `walStatusStore.setMode('ephemeral')` no se invocó en el catch del init.

⚠️ **Si Firefox modo privado deja IDB funcionar**: simular quota lleno en Chrome → DevTools → Application → Storage → click "Clear storage" + check "Application data" pero antes ir a `chrome://settings/content/all` y bloquear cookies/storage para el dominio. Más fácil: marcar el caso como pendiente y observar telemetry post-deploy.

---

### Caso WAL-6 — Schema fingerprint coordinado FE+BE (094 M4)

> **Cubre**: header `X-Schema-Version` en request/response. Cache miss selectivo cuando la versión del FE no matchea la del BE.

**Precondición**: deploy coordinado FE+BE. Verificar antes que ambos tengan el mismo número en `/api/sistema/usuarios` (FE: `src/app/shared/constants/api-schema-versions.ts`, BE: `Educa.API/Constants/Sistema/ApiSchemaVersions.cs`).

**Pasos**:
1. Login Director, ir a `/intranet/admin/usuarios`.
2. Network → inspeccionar un GET a `/api/sistema/usuarios`. Confirmar request header `X-Schema-Version: 1` y response header `X-Schema-Version: 1`.
3. Console del SW: filtrar por `[SW]` o `[Cache]` → confirmar cache HIT en segundo reload.
4. ⚠️ **simular mismatch**: en consola, sobreescribir el map FE para forzar v=2:
   ```js
   // Pseudocode — el map vive como const importado, no se puede modificar runtime sin patch
   ```
   En la práctica, este caso solo se verifica con un deploy real que bumpee la versión de un endpoint. Para smoke post-deploy: confirmar que los headers viajan en ambas direcciones.

**Confirmación pasa**:
- Headers `X-Schema-Version` presentes en request y response del primer GET.
- Cache HIT en segundo reload (sin mismatch artificial).
- Si BE no envía el header (inspeccionar respuesta de algún endpoint que no esté en `ApiSchemaVersions`): FE no rompe, asume v=1.

**Confirmación falla**:
- Header missing en request → interceptor `api-response.interceptor.ts` no lee el map.
- Header missing en response → `SchemaVersionMiddleware` no registrado o no matchea el endpoint.

⚠️ **Test de invalidación selectiva real**: requiere coordinar dos deploys (uno bumpea, observar cache miss del endpoint, resto sigue cached). Marcar como `⚠️ requiere coordinación con próximo deploy` y validar entonces.

---

## Email outbox — defer/fail + bounce parser + monitoreo (briefs 066-080)

> **Bloque más grande**. Tiene capas BE (parser IMAP, handlers, endpoints, jobs Hangfire, hub SignalR) y FE (3 tabs admin, 6 tiles dashboard, banner cross-páginas, listener SignalR). El admin operativo es `/intranet/admin/email-outbox`, `/intranet/admin/monitoreo/correos/dashboard`, `/intranet/admin/monitoreo/correos/quarantine`, `/intranet/admin/monitoreo/correos/domain-pauses`, `/intranet/admin/monitoreo/correos/defer-events`, `/intranet/admin/monitoreo/correos/blacklist`, `/intranet/admin/monitoreo/correos/auditoria`.

### Caso EM-1 — Bounce parser Hangfire activo (069)

> **Cubre**: job `bounce-parser-imap` registrado en Hangfire con cron `*/5 * * * *`, credenciales IMAP cargadas.

⚠️ **no-browser** — pedir al usuario:

1. Abrir `/hangfire` con cuenta Director del Azure App Service.
2. Sección "Recurring Jobs" → confirmar `bounce-parser-imap` listado, próxima ejecución dentro de 5 min.
3. Click en el job → "Trigger now" → ver que aparezca en "Succeeded jobs" tras unos segundos sin red.
4. Compartir screenshot o copiar la entrada de Succeeded.

**Confirmación pasa**: job registrado + 1 ejecución manual exitosa sin red en logs.

**Confirmación falla**: job no listado → falta deploy del binario nuevo o `HangfireExtensions.cs` no llama `RecurringJob.AddOrUpdate` para `BounceParser`.

---

### Caso EM-2 — `EmailDeferEvent` recibe filas tras NDR real (066)

> **Cubre**: parser detecta NDRs `Action: delayed` y `5.x.x`/`5.2.2`/`exceeded max defers`, persiste en tabla nueva con tipo correcto.

⚠️ **no-browser + tiempo real** — requiere coordinación con humano:

1. Esperar a que el job IMAP haya corrido al menos 1 ciclo post-deploy (≥5 min).
2. Pedirle al usuario que ejecute en SQL Azure:
   ```sql
   SELECT TOP 20 EDE_TipoEvento, EDE_Destinatario, EDE_DominioReceptor, EDE_StatusCode, EDE_Fecha
   FROM EmailDeferEvent
   ORDER BY EDE_Fecha DESC;
   ```
3. Esperar ≥1 fila con un `EDE_TipoEvento` válido (`WARNING_DELAYED_24H`, `WARNING_DELAYED_72H`, `DOMAIN_BLOCKED`, `MAILBOX_FULL_TRANSIENT`, `SOFT_BOUNCE_RECURRENT`).

**Confirmación pasa**: ≥1 fila persistida tras 24h en producción con `EDE_Detectado='parser-imap'`.

**Confirmación falla**: tabla vacía pasadas 24h → SQL migration no ejecutada, parser no encuentra NDRs delayed reales, o detector no matchea diagnostic-codes del MTA cPanel real (ajustar regex post-mortem).

---

### Caso EM-3 — Quarantine + domain-pause (067) endpoints + jobs

> **Cubre**: `EmailQuarantine` y `EmailRecipientDomainPause` con UPSERT idempotente, jobs `email-quarantine-release` / `email-domain-pause-release` cron `*/15 * * * *`, endpoints admin GET/POST/DELETE.

**Pasos browser**:
1. Login Director, navegar a `/intranet/admin/monitoreo/correos/quarantine` (si la feature flag está ON).
2. Confirmar que la tabla carga (vacía o con filas).
3. Click "Agregar manualmente" → dialog B8 con destinatario + motivo MANUAL + duración → guardar.
4. La fila aparece optimista (WAL apply), Network muestra POST 201 (o 200) a `/api/sistema/email-outbox/quarantine`.
5. Click "Liberar" en la fila → ConfirmationService → fila pasa a estado "Liberada" o desaparece según filtro activo.

⚠️ **no-browser**: confirmar con usuario en Hangfire que `email-quarantine-release` y `email-domain-pause-release` están registrados con cron `*/15 * * * *`.

⚠️ **flag feature**: si en `environment.ts` los 3 flags `emailQuarantineTab/emailDomainPausesTab/emailDeferEventsTab` están en `false` (default prod), las pestañas no aparecen — pedir al usuario que decida si se activan o queda dormido. Marcar como `⚠️ pendiente decisión de activación`.

**Confirmación pasa**: tabla carga, agregar manual funciona, liberar funciona, audit `EQU_FechaLiberacion` y `EQU_MotivoLiberacion='MANUAL_RELEASE'` quedan poblados (verificable con SQL si se quiere precisión, o vía drawer detalle B10).

---

### Caso EM-4 — UI tabs Cuarentena/Dominios/Defer-events (068)

> **Cubre**: 3 routing-based tabs en `/intranet/admin/monitoreo/correos/*` con feature flags + permisos dedicados (`ADMIN_EMAIL_QUARANTINE` etc).

**Pasos**:
1. ⚠️ activar feature flags en `environment.ts` (pedir al usuario) si no están ON.
2. Navegar a las 3 rutas:
   - `/intranet/admin/monitoreo/correos/quarantine` → tabla server-paginated, filtros activa/motivo, dialog agregar, drawer detalle.
   - `/intranet/admin/monitoreo/correos/domain-pauses` → tabla simple, agregar manual, banner cuando ≥3 pauses simultáneos.
   - `/intranet/admin/monitoreo/correos/defer-events` → timeline 24h, multiselect tipo, exportar CSV.
3. Cross-link: en `/email-outbox` con `defer-fail-status-widget` en WARNING/CRITICAL → click navega a `/defer-events?desde=hoy`.
4. Banner DOMAIN_BLOCKED: si hay evento en últimas 12h, banner crítico arriba.

**Confirmación pasa**: las 3 vistas cargan sin 404/500, paginación server-side respeta filtros, drawer abre con info-list B10.

**Confirmación falla**: ruta 404 → falta registrar children en `correos-shell` o falta permiso. Filtros no aplican → `ListarPaginadoAsync` del repo BE no lee los query params correctamente.

---

### Caso EM-5 — `MailboxFullBlacklistHandler` ventana 24h (072)

> **Cubre**: 2 hits 4.2.2 en 24h → fila en `EmailBlacklist` con `EBL_MotivoBloqueo='BOUNCE_MAILBOX_FULL'`. Confirmación de migración SQL `plan38_chat2_AddBounceMailboxFullMotivo.sql`.

⚠️ **no-browser** — coordinar con usuario:

1. Verificar CHECK constraint actualizada:
   ```sql
   SELECT name, definition FROM sys.check_constraints WHERE name = 'CK_EmailBlacklist_Motivo';
   -- Esperado: 5 motivos incluyendo BOUNCE_MAILBOX_FULL
   ```
2. Esperar a que un destinatario real con buzón lleno acumule 2 hits 4.2.2 en 24h (puede tardar días si no hay incidente activo). Para acelerar: pedir al usuario un fixture sintético en `EmailOutbox` con 2 filas `EO_TipoFallo='FAILED_MAILBOX_FULL'`, mismo `EO_Destinatario`, dentro de 24h. El próximo ciclo del worker (o reproceso manual) debería disparar el handler.
3. Verificar fila en `EmailBlacklist`:
   ```sql
   SELECT TOP 5 EBL_Correo, EBL_MotivoBloqueo, EBL_FechaReg, EBL_UltimoError
   FROM EmailBlacklist
   WHERE EBL_MotivoBloqueo = 'BOUNCE_MAILBOX_FULL'
   ORDER BY EBL_FechaReg DESC;
   ```

**Confirmación pasa**: ≥1 fila con motivo correcto + audit completo.

**Confirmación falla**: CHECK constraint sin el motivo nuevo → SQL no se ejecutó, deploy del binario rompe inserts. Sin filas tras incidentes reales → orden de invocación del handler incorrecto en `EmailOutboxWorker` (handler nuevo debe ir antes del handler 5xx).

---

### Caso EM-6 — Blacklist CRUD endpoints (073)

> **Cubre**: `POST /api/sistema/email-blacklist` para agregar manual + `GET` paginado server-side con filtros `estado | motivo | q | page | pageSize`.

**Pasos browser** (DevTools Network + Console):
1. Login Director.
2. Desde la consola con CSRF cookie + credentials:
   ```js
   const csrf = document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('XSRF-TOKEN='))?.split('=')[1];
   await fetch('/api/sistema/email-blacklist', {
     method:'POST',
     headers:{'Content-Type':'application/json','X-XSRF-TOKEN':csrf},
     credentials:'include',
     body: JSON.stringify({ correo:'smoke-test@example.com', motivo:'MANUAL', observacion:'cowork smoke 2026-05-04' })
   }).then(r => r.json());
   ```
3. Esperado: 201 (o 200) con `{ data: { id: ..., correo: 'smoke-test@example.com', motivo: 'MANUAL', motivoLabel: 'Manual', estado: true, ... } }`.
4. GET paginado con filtros:
   ```js
   await fetch('/api/sistema/email-blacklist?estado=activa&q=smoke&page=1&pageSize=10', { credentials:'include' }).then(r => r.json());
   ```
5. Esperado: `{ data: { data: [...], page:1, pageSize:10, total:1 } }`.
6. Limpieza: `DELETE /api/sistema/email-blacklist/smoke-test@example.com`.
7. Edge case: POST con motivo `BOUNCE_5XX` → 400 con `code: MOTIVO_NO_PERMITIDO_MANUAL`. POST con `pageSize=200` → cap a 100.

**Confirmación pasa**: los 4 endpoints (POST manual, GET paginado, DELETE, edge case 400) responden según contrato.

**Confirmación falla**: 401/403 → `[Authorize(Roles = Administrativos)]` no aplicado. 500 → service no valida motivo. Sin field `motivoLabel` → DTO no expuso D20.

---

### Caso EM-7 — Blacklist auto-cleanup job (074)

> **Cubre**: job `blacklist-auto-cleanup` cron `0 3 * * *` (Lima), despeja entradas `BOUNCE_MAILBOX_FULL` con >7d sin actividad.

⚠️ **no-browser**:

1. `/hangfire` → confirmar `blacklist-auto-cleanup` registrado con próximo run a las 03:00 hora Perú.
2. Insertar fila de prueba SQL con `EBL_FechaUltimoFallo = DATEADD(day, -10, GETDATE())`, `EBL_MotivoBloqueo='BOUNCE_MAILBOX_FULL'`, `EBL_Estado=1`.
3. Trigger manual: en `/hangfire` click en el job → "Trigger now".
4. Verificar SQL:
   ```sql
   SELECT EBL_Correo, EBL_Estado, EBL_UsuarioMod, EBL_FechaMod
   FROM EmailBlacklist WHERE EBL_Correo = 'smoke-cleanup@example.com';
   -- Esperado: EBL_Estado = 0, EBL_UsuarioMod = 'blacklist-auto-cleanup'
   ```

**Confirmación pasa**: fila pasa a `EBL_Estado=0` con audit completo.

**Confirmación falla**: job no listado → falta registrarlo en `HangfireExtensions.cs`. Job listado pero no actúa → `MarcarDespejadasPorAntiguedadAsync` mal implementado.

---

### Caso EM-8 — Tab Blacklist UI admin (075)

> **Cubre**: 4to tab "Blacklist" en `/intranet/admin/email-outbox` con tabla server-paginated, dialog agregar (motivos solo `MANUAL`/`BULK_IMPORT`), drawer detalle, deeplink `?tab=blacklist&action=add&correo=...`.

**Pasos**:
1. Login Director, navegar a `/intranet/admin/email-outbox`.
2. Confirmar 4 tabs visibles (Bandeja, Cuarentena, Dominios, Blacklist) con la flag activa.
3. Click "Blacklist" → tabla server-paginated carga.
4. Filtrar por `estado=activa&motivo=MANUAL&q=test` → URL refleja query params, tabla actualiza.
5. Click "+ Agregar" → dialog B8 con `<p-select>` de motivo solo lista `MANUAL` y `BULK_IMPORT`.
6. Llenar form, guardar → fila aparece optimista, toast éxito, WAL apply (verificable en IDB `wal-entries` con `resourceType: 'email-blacklist'`).
7. Click "Despejar" en una fila → ConfirmationService → fila desaparece con animación, total decrementa.
8. Test deeplink: navegar a `/intranet/admin/email-outbox?tab=blacklist&action=add&correo=cross-link@example.com` → tab Blacklist activo + dialog abierto con form prefilled.

**Confirmación pasa**: los 8 pasos verdes, tabla server-paginated correcta, deeplink prefill funciona.

**Confirmación falla**: tab no aparece → flag o permiso no concedido. Form sin prefill → `route.snapshot.queryParamMap.get('correo')` no leído. `<p-select>` lista todos los motivos → filter en el dialog component faltante.

---

### Caso EM-9 — Banner B9 + toast SignalR cross-páginas (076 + 080)

> **Cubre**: `app-email-defer-fail-banner` (smart, shared) montado en 5 páginas admin. SignalR `/hubs/email-alerts` con 3 eventos (`BlacklistEntryCreated`, `DeferFailStatusUpdated`, `CandidatoBlacklistDetectado`).

**Pasos**:
1. Login Director.
2. Navegar a `/intranet/admin/email-outbox`. Network → confirmar WebSocket abierto a `/hubs/email-alerts/negotiate` 200 + WSS upgrade.
3. Console: filtrar `[EmailHub]` o `SignalR` → confirmar `JoinAlertsGroup` invocado.
4. Si el contador defer/fail está en CRITICAL (≥5/5) → banner B9 danger visible arriba con `aria-live="assertive"` y emoji/icono critical.
5. Si solo WARNING (60-100%) → banner B9 warn visible.
6. Si OK (<60%) → banner oculto.
7. ⚠️ **simulación de evento**: si no hay incidente activo, pedir al usuario que dispare desde BE (insert `EmailBlacklist` manual con motivo BOUNCE_5XX → trigger del handler) para validar que el toast `key='email-outbox-alerts'` aparece en la bandeja sin duplicar con el toast global.
8. Banner aparece también en las otras 4 páginas: `/email-outbox-dashboard-dia`, `/email-outbox-diagnostico`, `/auditoria-correos`, `/monitoreo-hub`.

**Confirmación pasa**: WebSocket conectado, banner visible solo cuando WARNING/CRITICAL, toast push funciona, banner cross-página coherente.

**Confirmación falla**:
- WebSocket 404 → `app.MapHub<EmailHub>("/hubs/email-alerts")` no registrado o BE no deployado. Cae a polling 30s del endpoint `defer-fail-status` (verificar Network) — funcional pero no real-time.
- Banner ausente con WARNING activo → `EmailMonitoreoFacade.deferFailStatus()` no se actualiza, o el banner shared no consume el computed `isVisible`.

---

### Caso EM-10 — Endpoints monitoreo + cache (077)

> **Cubre**: 5 endpoints `GET /api/sistema/email-outbox/monitoreo/{sender-stats|top-destinatarios|serie-temporal|dominios-receptores|candidatos-blacklist}` con caché en memoria por método (TTL diferenciado), caps defensivos en input.

**Pasos browser** (DevTools Network):
1. Login Director, navegar a `/intranet/admin/monitoreo/correos/dashboard` → tab "Mapa de envío" (Caso EM-11 valida la UI; aquí solo confirmamos los GETs).
2. Network → 5 GETs disparados al cargar el tab. Inspeccionar cada uno:
   - `/sender-stats?ventanaDias=7` → 200, JSON con stats.
   - `/top-destinatarios?ventanaDias=7&limit=10` → 200, lista.
   - `/serie-temporal?granularidad=hour` → 200, puntos.
   - `/dominios-receptores?ventanaDias=7` → 200.
   - `/candidatos-blacklist?umbralHits=2&ventanaHoras=24` → 200.
3. Recargar la página dentro del TTL (5min sender-stats, 60s serie-temporal hora) → segundo GET vuelve <50ms del HTTP cache propio o del IMemoryCache (response time visible en Network).
4. Edge case caps: probar desde consola `fetch('/api/sistema/email-outbox/monitoreo/top-destinatarios?ventanaDias=999&limit=999', { credentials:'include' }).then(r=>r.json())` → respuesta clamp a `ventanaDias=30, limit=50`.
5. Auth: probar mismo endpoint con sesión Profesor → 403.

**Confirmación pasa**: 5 endpoints 200 con shape de DTO esperado, caps aplican, auth restrictiva.

**Confirmación falla**: 500 con NRE → query LINQ con índice missing — confirmar `plan39_chat2_AddDashboardIndex.sql` ejecutado en Azure (pre-req duro). Cache no aplica → falta `IMemoryCache.GetOrCreateAsync`.

---

### Caso EM-11 — Dashboard 6 tiles + cross-link Bloquear (079)

> **Cubre**: tab "Mapa de envío" en `/intranet/admin/monitoreo/correos/dashboard`. 6 tiles con skeletons independientes, layout responsivo, CTAs "Bloquear" desde top-destinatarios y candidatos.

**Pasos**:
1. Login Director, navegar a `/intranet/admin/monitoreo/correos/dashboard`.
2. Click tab "Mapa de envío" → 6 tiles aparecen con skeletons primero, luego data.
3. Layout test:
   - Desktop (≥1200px): 2 cols × 3 filas, tile A (Defer/Fail) sticky top-left.
   - Tablet (768-1199): 1 col × 6 filas con tile A sticky.
   - Mobile (<768): accordion colapsable.
4. Tile D (Top destinatarios): click "Bloquear" en una fila → navega a `/intranet/admin/email-outbox?tab=blacklist&action=add&correo=<destinatario>` → dialog abierto con prefill (validado en EM-8).
5. Tile F (Candidatos): mismo patrón.
6. Tile C (Serie temporal): toggle hora/día → reload de data.
7. ⚠️ **F-012/F-013 conocidos**: el chart "Serie temporal" tiene etiquetas de eje X pegadas (`14:0015:0016:00`). NO bloqueante — hallazgo abierto en SETUP-COWORK §7.
8. ⚠️ **F-017 conocido**: warning Angular `SkeletonLoaderComponent is not used` en `sender-stats-tile`. NO bloqueante.

**Confirmación pasa**: 6 tiles cargan, layout responsivo correcto, deeplink Bloquear funciona, listener SignalR recibe `CandidatoBlacklistDetectado` (refleja banner B9).

**Confirmación falla**: tile no carga → error en facade o endpoint Caso EM-10 falla. Layout roto → grid no respeta breakpoints. Bloquear navega a tab incorrecto → query params mal formateados.

---

### Caso EM-12 — Banner cross-páginas + tile auditoría (080)

> **Cubre**: shared component `app-email-defer-fail-banner` montado en 5 páginas. Refactor que removió banner local efímero del Plan 38 Chat 6.

**Pasos**: validado en gran parte por EM-9. Adicional:
1. Navegar entre las 5 páginas con banner activo (forzar mismatch para que aparezca, ver paso 7 EM-9 si aplica). Confirmar que el banner está en TODAS sin recargar.
2. `/intranet/admin/monitoreo/correos/auditoria`: confirmar tile "Aceptado por Exim ≠ entregado" con disclaimer *"Cifras estimadas — confirm delivery requiere acceso a logs Exim (Plan 39 Chat E pendiente)"*.

⚠️ **Tile aceptado vs entregado pospuesto**: el brief documenta que la métrica gap requiere Plan 39 Chat E (importador SSH Exim, en HOLD). El tile placeholder NO se entregó por decisión de cierre. Confirmar con usuario si verificar la ausencia o si se prefiere ver placeholder.

**Confirmación pasa**: banner shared visible en 5 páginas. Refactor de `email-outbox.component` no rompió toasts existentes.

**Confirmación falla**: banner solo aparece en 1 página → `<app-email-defer-fail-banner>` no montado en las otras 4 plantillas. Toasts duplican → `MessageService.add` con key wrong en algún listener residual.

---

## Otros — asistencia search-DNI (082), cursos rowVersion (088)

### Caso O-1 — Asistencia admin search por DNI (082)

> **Cubre**: predicado `search` de `/api/asistencia-admin/dia` ahora matchea por DNI exacto, DNI parcial y nombre concatenado.

**Pasos browser** (curl-like en consola):
1. Login Director.
2. Network o consola con credentials:
   ```js
   const f = '2026-04-29';  // ajustar a fecha con datos reales
   await fetch(`/api/asistencia-admin/dia?fecha=${f}&tipoPersona=P&search=76357038`, { credentials:'include' }).then(r => r.json());
   // Esperado: data con 1 fila (RAMIREZ BERNARDO JOSE DANIEL)
   await fetch(`/api/asistencia-admin/dia?fecha=${f}&tipoPersona=P&search=763`, { credentials:'include' }).then(r => r.json());
   // Esperado: data con 1 fila (DNI parcial)
   await fetch(`/api/asistencia-admin/dia?fecha=${f}&tipoPersona=P&search=ramirez bernardo`, { credentials:'include' }).then(r => r.json());
   // Esperado: data con 1 fila (concatenación)
   await fetch(`/api/asistencia-admin/dia?fecha=${f}&tipoPersona=P&search=RAMIREZ`, { credentials:'include' }).then(r => r.json());
   // Esperado: data con 1 fila (regresión nombre puro funciona igual)
   ```
3. Test deep-link end-to-end: `/intranet/asistencia` → 5to Primaria A → tab Profesores → click pencil en RAMIREZ → aterriza en `/admin/asistencias?tab=gestion&tipoPersona=P&dni=76357038&fecha=2026-04-29` → tabla muestra la fila (no "No hay registros").

**Confirmación pasa**: 4 búsquedas devuelven 1 fila + deep-link cross-role → admin muestra la fila.

**Confirmación falla**: search por DNI 0 filas → fix BE no deployado o `EST_DNI`/`PRO_DNI` están encriptados y el predicado `Contains` no aplica sobre AES-256 (en ese caso, escalar — el brief lo previó como riesgo, ver memoria `project_encrypted_fields_in_queries.md`).

⚠️ **DNI encriptado riesgo conocido**: si los tests pasan localmente pero fallan en prod, es probablemente porque la columna en prod es AES-256 y el `LIKE` no matchea. Reportar al usuario; no es bug del fix sino de la asunción inicial.

---

### Caso O-2 — Cursos rowVersion enforce 409 (088)

> **Cubre**: `PUT /api/sistema/cursos/{id}/actualizar` con rowVersion stale ahora devuelve 409 Conflict (antes devolvía 200 silenciosamente).

**Pasos**:
1. Login Director, navegar a `/intranet/admin/cursos`.
2. Identificar un curso real, copiar su `id` y `rowVersion` actual desde Network o consola.
3. Desde consola, fetch directo con rowVersion conocidamente stale:
   ```js
   const csrf = document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('XSRF-TOKEN='))?.split('=')[1];
   await fetch('/api/sistema/cursos/<ID>/actualizar', {
     method:'PUT',
     headers:{'Content-Type':'application/json','X-XSRF-TOKEN':csrf},
     credentials:'include',
     body: JSON.stringify({ id:<ID>, nombre:'concurrency-test', rowVersion:'AAAAAAAAAQE=' })
   }).then(r => ({ status: r.status, body: r.json ? r.json() : null }));
   ```
4. Esperado: `status: 409` con cuerpo tipado (e.g. `{ error: 'CONCURRENCY_CONFLICT', ... }`).
5. Test FE end-to-end (Caso 3 del WAL smoke): 2 tabs editando el mismo curso. Tab A edita y guarda. Tab B (con rowVersion vieja) edita y guarda → debería ver toast de conflicto + entry WAL `status: 'CONFLICT'`, NO `FAILED`.

**Confirmación pasa**: 409 devuelto + entry WAL `CONFLICT` + rollback al snapshot del tab A.

**Confirmación falla**: 200 OK con rowVersion stale → fix BE no deployado o `IsRowVersion()` faltando en `CursoConfiguration.cs`.

---

## Cierre

### Si todos los casos pasan ✅

Tipear secuencialmente (orden libre):

```
/verify 066
/verify 067
/verify 068
/verify 069
/verify 072
/verify 073
/verify 074
/verify 075
/verify 076
/verify 077
/verify 078
/verify 079
/verify 080
/verify 082
/verify 088
/verify 091   # banner-requires-migration
/verify 091   # cross-tab-wire-remaining-facades  ⚠️ mismo NNN — coordinar con usuario
/verify 092
/verify 093
/verify 094
```

⚠️ **Conflicto NNN 091**: hay dos briefs distintos con NNN=091. El comando `/verify 091` no puede distinguirlos. Pedir al usuario que renumere uno de ellos a `097` antes de cerrar (095 y 096 ya están tomados por los briefs BE runtime-health + load-control en `open/`).

### Si algún caso falla ❌

`/verify <NNN>` con `❌ rollback <motivo>` → mueve a `running/` con motivo registrado. Casos típicos:

- **Falla en EM-1/EM-7 (Hangfire)**: rollback de deploy BE; pedir al usuario que confirme variable `Email__BounceParser__Enabled` en App Service.
- **Falla en EM-2 (DeferEvent vacío 24h)**: NO bloquea — puede ser ausencia de NDRs reales en la ventana. Marcar como "verificación extendida +7d".
- **Falla en WAL-3 (M1 reconciliación)**: difícil de reproducir local. Aceptar telemetry monitoring 30d como criterio alternativo (ver criterio de éxito en M1).
- **Falla en EM-9 (SignalR)**: si `/hubs/email-alerts/negotiate` 404 → BE 078 no deployado. NO bloquea el resto de casos email — hay polling fallback. Verificar nuevamente tras deploy de 078.

### Casos marcados `⚠️ no-browser` o `requiere coordinación`

| Caso | Razón | Quién |
|---|---|---|
| EM-1 (Hangfire `bounce-parser-imap`) | Acceso a `/hangfire` | Usuario con cuenta Director Azure |
| EM-2 (DeferEvent persiste) | Query SQL Azure + esperar NDRs reales | Usuario |
| EM-3 (Hangfire release jobs) | Acceso a `/hangfire` | Usuario |
| EM-5 (CHECK constraint + insert sintético) | Query SQL Azure + fixture manual | Usuario |
| EM-7 (Trigger manual job + verificar SQL) | Acceso a `/hangfire` + SQL | Usuario |
| WAL-5 (Firefox modo privado / quota lleno) | Otro browser / simulación storage | Cowork puede intentar pero entorno limitado |
| WAL-6 (mismatch real schema fingerprint) | Requiere segundo deploy con bump | Próximo deploy |
| EM-12 (tile aceptado vs entregado) | Plan 39 Chat E HOLD | Decisión usuario |

---

## Notas operativas para Cowork

- **Reload mata `window.fetch` overrides**: re-inyectar después de cada F5 (limitación 6.3 del SETUP).
- **`tabs_create_mcp` no hereda sesión**: re-loguear en tab nuevo o usar el tab original.
- **`computer-use` bloqueado tier read en Chrome**: toda interacción debe ir vía `mcp__Claude_in_Chrome__*`.
- **PrimeNG `p-select` workaround**: si `form_input` falla con "SPAN is not a supported form input", usar `javascript_tool` con `dispatchEvent('change')` sobre el `<select>` nativo.
- **Cookie XSRF para POST/PUT/DELETE manual**: snippet en SETUP §6.2.
- **DELETE de cursos es soft**: `CUR_Estado=false`, NO purga física. Si el smoke crea cursos de prueba, NO va a haber forma de limpiarlos físicamente sin SQL directo del usuario.
