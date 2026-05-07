# Post-deploy validation — awaiting-prod (18 briefs, 2026-05-06)

> **Cuándo correr**: tras el deploy del 2026-05-06 (FE Netlify + BE Azure). Cada caso pasa → `/verify <NNN>` ✅ en chat Claude Code → mueve a `closed/`.
> **Operador**: Cowork (browser QA). Los casos `⚠️ no-browser` requieren coordinación con humano (k6, SQL Azure, Hangfire) y se listan al final como tabla resumen.
> **Tiempo total estimado**: ~2-3h browser + ~3-4h coordinación humano (corridas k6 + queries SQL).
> **Login**: Chrome perfil `Sistemas` (`area.sistemas.min@gmail.com`). Browser MCP: **`work aqui m`** (deviceId `30baf13d`). Credenciales test Director: pedir al usuario antes de empezar.
> **URLs**: FE prod = pedir al usuario. BE prod = `https://educacom.azurewebsites.net`.

---

## Setup global (1 vez, ~5 min)

1. Abrir Chrome perfil Sistemas, navegar a la URL de FE prod, login Director.
2. **DevTools abierto desde el primer paso** (no después — tracking de console/network arranca en la primera llamada):
   - Network (filtro `Fetch/XHR`)
   - Console (sin filtro inicial; cuando arranquen casos WAL filtrar por `[WAL`)
   - Application → IndexedDB para casos WAL
   - Application → Service Workers (status `activated and is running`)
3. Hard reload (Ctrl+Shift+R) para garantizar build nuevo del deploy.
4. Confirmar SW activo. Si "redundant" o "waiting", reload otra vez.

### Pre-flight de infra (humano antes de empezar)

| Check | Cómo | Si falla |
|---|---|---|
| BE Azure responde | Network del login → `POST /api/auth/login` 200 | Confirmar deploy de App Service en Azure Portal |
| FE Netlify sirve build nuevo | Console: confirmar build hash actual | Hard reload + chequear `_redirects`/`netlify.toml` |
| Hangfire dashboard activo | ⚠️ no-browser — pedir screenshot de `/hangfire` con jobs `bounce-parser-imap`, `email-quarantine-release`, `email-domain-pause-release`, `blacklist-auto-cleanup` registrados | Si alguno no está, EM-1/EM-3/EM-7 del doc viejo no pasan |
| `UseTestEnv` apagado | Chequear que rate limits operativos están activos (no 5000/min) | El deploy del 2026-05-06 lo cambió a `false` — confirmar en App Service config |

---

## Casos browser (9 — Cowork puede ejecutar)

### CASO 066 — Email defer events tab UI

> **Cubre**: Plan 37 Chat 1 BE parser extension. La tabla `EmailDeferEvent` debería tener filas tras 24h post-deploy si hay tráfico real de NDRs.

**Pasos browser**:
1. Login Director.
2. Navegar a `/intranet/admin/monitoreo/correos/defer-events`.
3. Si **404 o redirige a home**: feature flag `emailDeferEventsTab` está OFF en `environment.ts` prod. Marcar como `⚠️ pendiente activación de flag` y avanzar.
4. Si **monta**: confirmar tabla server-paginated con filtros `tipo` (multi-select) y rango fecha. Puede estar vacía si no hubo NDRs en 24h — eso es válido.
5. Network: GET a `/api/sistema/email-outbox/defer-events?...` debe devolver 200 con shape `{ data: { data: [], page: 1, pageSize: 20, total: 0 } }`.
6. Cross-link: en `/intranet/admin/email-outbox`, si banner `defer-fail-status` está en WARNING/CRITICAL, click → debe navegar acá con query params.

**Pasa ✅**: tab monta + GET 200 + cross-link funciona (o flag OFF documentado).
**Falla ❌**: 404 con flag ON, o 500 en el GET.

⚠️ **Persistencia real de NDRs** requiere SQL Azure y ≥24h de tráfico — humano (sección final).

---

### CASO 068 — Quarantine tab UI

> **Cubre**: Plan 37 Chat 3 FE quarantine admin visibility.

**Pasos**:
1. Login Director.
2. Navegar a `/intranet/admin/monitoreo/correos/quarantine`.
3. Si **404 o redirige a home**: feature flag `emailQuarantineTab` OFF. Marcar `⚠️ pendiente activación` y avanzar.
4. Si **monta**:
   - Tabla server-paginated con filtros `activa | motivo`.
   - Botón "+ Agregar manualmente" → abre dialog B8 con destinatario + motivo MANUAL + duración.
   - Llenar form, guardar → fila aparece optimista (WAL apply, IDB tiene entry `resourceType: 'email-quarantine'`), Network POST 201 a `/api/sistema/email-outbox/quarantine`.
   - Click "Liberar" → ConfirmationService → fila desaparece o pasa a "Liberada".
5. **Cleanup**: liberar la fila smoke creada para no dejar basura en prod.

**Pasa ✅**: monta + agregar funciona + liberar funciona.
**Falla ❌**: 404 con flag ON, o WAL no aplica optimista.

---

### CASO 078 / 100 — EmailHub SignalR `/hubs/email-alerts`

> **Cubre**: 078 = deploy del hub. 100 = fix del 403 en negotiate (CSRF / Authorize).

**Pasos** (los 2 briefs se validan juntos porque son la misma URL):

1. Login Director, navegar a `/intranet/admin/email-outbox`.
2. **Network → filtrar `negotiate`**:
   - `POST /hubs/email-alerts/negotiate?negotiateVersion=1` → status esperado **200**.
   - Si **404**: hub no mapeado → BE deploy faltante (rollback 078).
   - Si **403**: CSRF o Authorize bloquea → fix de 100 no aplicado o no funciona en prod.
3. Si negotiate 200 → **Network → filtrar `WS`**: debe aparecer un WebSocket abierto (o SSE/longpolling según transport — prod Netlify NO soporta WS, va a fallback automático).
4. Console: filtrar `SignalR` o `[EmailHub]` → confirmar `JoinAlertsGroup` invocado.
5. Si el contador defer/fail está en WARNING/CRITICAL: banner `app-email-defer-fail-banner` aparece arriba con `aria-live` adecuado.
6. **Polling fallback**: si SignalR falla, Network debe mostrar polling cada 60s a `/api/sistema/email-outbox/defer-fail-status`. El sistema NO debe romper, solo cae al fallback.

**Pasa ✅**: negotiate 200 + transport conectado (WS/SSE/longpolling) + banner reactivo si aplica.
**Falla ❌**: negotiate 403/404 (= 100 no fixed o 078 no deployado), o app crashea cuando el hub falla.

---

### CASO 082 — Asistencia admin search por DNI

> **Cubre**: predicado `search` de `/api/asistencia-admin/dia` matcheaba solo nombre. Fix: matchear DNI exacto, parcial y nombre concatenado.

**Pasos** (DevTools Console con sesión activa):

1. Login Director.
2. Confirmar fecha con datos reales (consultar al usuario; pedir un DNI de profesor real o usar el test del brief si sigue válido).
3. Desde consola:
   ```js
   const fecha = '2026-04-29';  // ajustar
   const dniReal = '76357038';   // ajustar
   const tests = [dniReal, dniReal.slice(0, 3), 'ramirez bernardo', 'RAMIREZ'];
   for (const q of tests) {
     const r = await fetch(`/api/asistencia-admin/dia?fecha=${fecha}&tipoPersona=P&search=${encodeURIComponent(q)}`,
       { credentials:'include' }).then(r => r.json());
     console.log(q, '→', r.data?.length ?? 0, 'filas');
   }
   ```
4. Las 4 búsquedas deben devolver ≥1 fila.
5. Test deep-link end-to-end: `/intranet/asistencia` → 5to Primaria A → tab Profesores → click pencil en RAMIREZ → aterriza en `/admin/asistencias?tab=gestion&tipoPersona=P&dni=...&fecha=...` → tabla muestra la fila (NO "No hay registros").

**Pasa ✅**: 4 búsquedas con resultado + deep-link cross-role funciona.
**Falla ❌**: search por DNI 0 filas → AES-256 en `PRO_DNI` rompe `Contains` (riesgo conocido en `project_encrypted_fields_in_queries.md`). Reportar al usuario; no es bug del fix.

---

### CASO 091 / 098 — WAL cross-tab refetch end-to-end

> **Cubre**: 091 wireó `WalCrossTabRefetchService` en 18 facades. 098 fixea que el refetch end-to-end NO disparaba (Tab B mantenía total stale >8s).

**Precondición**: 2 tabs en mismo browser, misma sesión. IDB limpia (`Application → IndexedDB → educa-wal-db → wal-entries → clear`).

**Pasos**:

1. 2 tabs abiertos en `/intranet/admin/cursos`.
2. Console en ambos: `localStorage.setItem('DEBUG', 'WAL:*')`. Reload.
3. Identificar leader vs follower: console buscar `[WAL-Leader] became leader` vs `follower`.
4. En **leader** (tab A): crear curso `SMOKE-CT-001`.
5. Tab A console: confirmar `[WAL] entry committed` + `[WAL-Leader] broadcasting commit`.
6. Esperar ~1-2s. **Sin recargar**, mirar tab B (follower).
7. Tab B console: debe aparecer `[WAL] entry committed by other tab, refetch resourceType=Curso` (o equivalente con `cursos`).
8. Tab B network: debe haber 1 GET silencioso a `/api/sistema/cursos` con respuesta fresca.
9. Tab B UI: contador "Total Cursos" debe incrementar (verificar valor antes/después en stat-card).
10. **Asimetría items vs stats** (clave del fix de 098): el contador debe actualizar, no solo la lista.

**Repetir mínimo en 1 feature más** (rotar): `/intranet/admin/usuarios` o `/intranet/admin/schedules`.

**Pasa ✅**: lista + contador del follower actualizan sin F5 en ~1-2s.
**Falla ❌**:
- Sin `entry committed by other tab` en console → leader no broadcasta (volver a 098).
- Aparece broadcast pero contador stale → wiring sin `refetchStats` (regresión del fix).

**Cleanup**: eliminar `SMOKE-CT-001` (delete soft, queda en BD).

---

### CASO 099 — Tab Cuarentena monta correctamente

> **Cubre**: bug donde `/intranet/admin/monitoreo/correos/cuarentena` redirigía a home pública. Tab faltaba en `correos-shell`.

**Pasos**:
1. Login Director.
2. Navegar a `/intranet/admin/monitoreo/correos/cuarentena` directamente por URL.
3. Confirmar **NO** redirige a home pública.
4. Confirmar tab "Cuarentena" visible en el shell `correos-shell` junto con: Bandeja, Dashboard del día, Diagnóstico, Auditoría, Blacklist.
5. Click en el tab → tabla carga (server-paginated, vacía o con filas).

**Pasa ✅**: URL directa monta + tab visible en shell.
**Falla ❌**: redirige a home → feature flag/permiso/routing aún no fixed.

⚠️ Este caso solapa con CASO 068 — si 068 pasa, este pasa por extensión.

---

### CASO 102 — Runtime health endpoint + widget admin

> **Cubre**: endpoint `/api/sistema/runtime-health` + clasificador A/B/C + widget FE.

**Pasos**:

1. Login Director.
2. **Endpoint directo** (Network o consola):
   ```js
   await fetch('/api/sistema/runtime-health', { credentials:'include' }).then(r => r.json());
   ```
   Esperado: 200 con shape `{ classification: 'A'|'B'|'C', metrics: { p50, p95, p99, inFlight, sqlPool: {...} }, ... }`.
3. **NO debe ser 500** (bug 1 del chat 108 estaba "policy global no registrada" — ya fixed con `[DisableRateLimiting]`).
4. **Widget admin**: navegar a la página del dashboard de monitoreo (consultar al usuario la URL exacta — probablemente `/intranet/admin/monitoreo/runtime-health` o similar). Si existe widget:
   - Tile con clasificación A/B/C visible.
   - Métricas p50/p95/p99 actualizan periódicamente.
   - Skeleton aparece en la primera carga.

**Pasa ✅**: endpoint 200 + widget renderiza si existe.
**Falla ❌**: 500 en el endpoint → bug 1 del 108 regresó. 403 → falta `[Authorize(Roles = Administrativos)]`.

---

## Coordinación con humano (9 — no-browser)

Los siguientes briefs requieren k6, SQL Azure, dotnet test o acceso directo. Cowork no los puede ejecutar; reportar al humano para que los corra.

| Brief | Tipo | Qué necesita | Notas |
|---|---|---|---|
| 103 (F1 Concurrency global N=140) | k6 | Correr `scripts/load-tests/f6a/01-saturacion-concurrencia-global.js` contra prod con N=250 VUs. Verificar que llegan 503 (no 500) cuando saturan, `Retry-After` presente | Test ya existe en repo; confirmar que la corrida en prod replica el comportamiento del test integration `Plan40F1ConcurrencyGlobalIntegrationTests` |
| 104 (F2 Bulkheads) | k6 | Saturar cada bulkhead (pagos/reports/notif/uploads/bio) y verificar 503 por categoría + aislamiento (saturar reports no afecta pagos) | 6 tests integration ya verde; falta validación con tráfico real |
| 105 (F3a HttpClient + reporte timeouts) | SQL + browser | Ejecutar reporte pesado (`/intranet/admin/reportes-asistencia/...`) con rango grande (≥30 días). Verificar que NO timeoutea a 30s default; permite hasta 60s. Network: confirmar response time | Cowork PUEDE ejecutar el reporte si el humano provee el rango. Marcar el caso como mixto |
| 106 (F4 Backpressure dinámico) | k6 + browser | Saturar bulkhead → response 503 debe traer `Retry-After: <segundos>` calculado como `max(1, ceil(p95 × 1.5))`, NO valor fijo | Confirmable parcialmente desde browser tras saturación humana |
| 107 (F5 Polly resilience HttpClient) | k6 + mock | Mockear CrossChex/WhatsApp/JaaS down → verificar Polly hace 3 retries con jitter, breaker abre tras 10 fails consecutivos | Requiere harness de mock externo |
| 108 (F6a calibración sintética) | k6 | Re-correr esc 02/03 (saturación-pagos, aislamiento-bulkheads) en prod con bugs BE fixados | Bugs BE ya están en `cee1ef2` deployado; pendiente re-corrida |
| 110 (F3b CT cascade restantes) | dotnet test | Correr `Plan40F3CancellationTests` en repo BE; verificar que cancelar query con `cts.Cancel()` libera conexión | Test unit, no requiere prod |
| 111 (F6a esc 04/05/06) | k6 | Correr esc 04 (saturación combinada login+reportes+notif), 05 (cancelación cliente), 06 (Polly CrossChex con stub) | Esc 04/05/06 ya cerrados localmente; pendiente validación en prod |
| 112 (F6a esc 06 polly crosschex) | k6 + flag BE | Activar `Diagnostics:ForceCrossChexFailure=true` temporalmente en App Service → correr `06-polly-crosschex.js` → verificar 3 retries + breaker abre + recovery tras desactivar flag | Flag ya está como `false` en `appsettings.Development.json` deployado; falta activarla en App Service config para la corrida |

**Recomendación**: agrupar todos los k6 en una sesión humana de ~2h con el flag BE bajo control.

---

## Cierre

### Si todos los browser-cases pasan ✅

```
/verify 066    # si flag emailDeferEventsTab decidido
/verify 068    # si flag emailQuarantineTab decidido
/verify 078    # = CASO 078/100 negotiate 200
/verify 082    # search DNI
/verify 091    # cross-tab refetch
/verify 098    # = 091 (asimetría items vs stats fixed)
/verify 099    # tab cuarentena monta
/verify 100    # = CASO 078/100 (mismo caso)
/verify 102    # runtime-health endpoint
```

### Si algún caso falla ❌

`/verify <NNN>` con `❌ rollback <motivo>`. El brief vuelve a `running/` con motivo registrado.

### Casos esperando humano (no `/verify` aún)

- 103, 104, 105, 106, 107, 108, 110, 111, 112 → tras corrida k6/SQL del humano, este chat (o uno nuevo) hace los `/verify`.

### Doc anterior

`post-deploy-awaiting-prod.md` (2026-05-04) ya cubrió 13 briefs que pasaron a `closed/` desde entonces. Mantener como referencia histórica; no re-ejecutar.

---

## Notas operativas para Cowork (recordatorio)

- **Reload mata `window.fetch` overrides**: re-inyectar después de cada F5.
- **`tabs_create_mcp` no hereda sesión**: re-loguear o usar el tab original.
- **`computer-use` bloqueado tier read en Chrome**: toda interacción vía `mcp__Claude_in_Chrome__*`.
- **PrimeNG `p-select` workaround**: si `form_input` falla con "SPAN is not a supported", usar `javascript_tool` con `dispatchEvent('change')` sobre el `<select>` nativo.
- **Cookie XSRF para POST/PUT/DELETE manual**: snippet en SETUP §6.2.
- **DELETE soft**: cualquier curso/registro creado para smoke queda en BD con `_Estado=false`. Si conviene, pedir al usuario limpieza SQL.
