# Test now — awaiting-prod ya en producción (2026-05-04)

> **Estado**: 21 briefs en `awaiting-prod/`. **Todo deployeado**: FE Netlify + BE Azure al día con `origin/main` + `origin/master`. Cowork puede arrancar sin esperar nada.
> **Companion de**: `post-deploy-awaiting-prod.md` — este archivo no duplica pasos, los referencia. Cuando un caso diga "ver Caso WAL-1 en post-deploy-awaiting-prod.md", abrí ese archivo y seguí esos pasos.
> **Operador**: Cowork (Claude in Chrome, browser MCP `work aqui m` deviceId `30baf13d`).

## Cómo leer este archivo

Cada caso tiene un sello:

- **🟢 NOW** — testeable inmediatamente, todo determinístico. Hacelo ya.
- **🟡 NOW-partial** — la parte browser se puede hacer ya; queda un check residual al usuario (SQL / Hangfire screenshot / paciencia).
- **🔴 WAIT** — esperá. Razón explicada caso por caso.

Cuando termines `🟢` y `🟡` → reportá al usuario. Los `🔴` los completa él (o vos en una corrida posterior cuando se cumpla la condición).

## Pre-flight (5 min, antes de empezar)

| Check | Cómo | Si falla |
|---|---|---|
| FE prod sirve build nuevo | Hard reload (Ctrl+Shift+R) en Netlify prod, console buscar build hash o `WAL_DEFAULTS.schemaVersion=1` | Esperar 2-3 min más, reintentar |
| BE Azure responde con código nuevo | `POST /api/auth/login` 200 + headers `X-Schema-Version` presente (Plan 094) | Pedir al usuario que confirme deploy Azure App Service |
| Service Worker activado | `Application → Service Workers` status `activated and is running` | Reload, si no se activa pedir al usuario |
| Login Director sin tipear credenciales | Click directo en card guardada "ADMINISTRADOR EL DIRECTOR" | Si no aparece la card guardada, login manual con DNI 74125896 / 12349898 |

---

## 🟢 NOW — bloque WAL (browser-only, 5 casos)

> Todos estos viven 100% en el cliente: IndexedDB + cache invalidation + leader election + cross-tab. No dependen de ningún async externo.

| ID en post-deploy-awaiting-prod.md | Brief | Sello | Notas |
|---|---|---|---|
| WAL-1 (cross-tab refetch) | 091 | 🟢 | Empezar por acá. Setup más liviano. Validar en 2 features distintas como el caso pide. |
| WAL-2 (banner REQUIRES_MIGRATION) | 097 | 🟢 | Requiere inyectar entry stale en IDB con el snippet del Caso WAL-2. Tip: no usar `deleteDatabase`, usar `clear()` (limitación 6.2 SETUP-COWORK §6.2). |
| WAL-3 (M1 reconciliation IN_FLIGHT stale) | 092 | 🟡 | El **happy path** se puede provocar manualmente: marcar entry como `IN_FLIGHT` con timestamp >5min en IDB y reload. La reconciliation real bajo race entre commit y reload es difícil de reproducir — para eso aceptar telemetry monitoring 30d (ver brief 092). Hacé el happy path manual y reportá. |
| WAL-3 circuit breaker (M2) | 092 | 🟢 | Provocable forzando 5 fallos consecutivos en un endpoint (DevTools Network → Block request URL → editar 5 veces). Confirmar que circuit abre y los siguientes intentos no llegan al BE. |
| WAL-4 (M3 IDB → InMemory fallback) | 093 | 🟢 | Provocable bloqueando IDB: en consola `indexedDB.open = () => { throw new Error('blocked'); }` antes de cargar la app, después F5. La app debe loguear `[WAL-DB] falling back to in-memory` y seguir operando sin persistencia. |
| WAL-6 (M4 schema fingerprint match) | 094 | 🟢 | Validar el **happy path**: al cargar la app, console debe loggear `[WAL-Schema] fingerprint match — using cached version` (o equivalente del Caso WAL-6). Confirma que el FE leyó el header `X-Schema-Version` del BE y matchea. |
| WAL-6 (M4 mismatch real) | 094 | 🔴 WAIT | Requiere que el BE bumpee el schema version en un siguiente deploy. Hoy match=match. Diferir hasta próxima migración real. |
| WAL-5 (Firefox / quota llena) | 093 | 🟡 | Limitación del MCP: Cowork opera en Chrome perfil Sistemas, no en Firefox. La parte de quota llena (`navigator.storage.estimate()` cerca del 100%) sí se puede simular en Chrome con DevTools "Application → Storage → Clear site data → Clear" + dispatch artificial de `QuotaExceededError`. Hacé lo que se pueda en Chrome y reportá lo que necesita Firefox/humano. |

**Orden sugerido**: WAL-1 → WAL-2 → WAL-3 happy path → WAL-3 circuit breaker → WAL-4 → WAL-6 happy path. Eso cubre el 80% del subsistema WAL en ~30-40 min.

---

## 🟢 NOW — bloque Email/Outbox FE (browser admin pages, 4 casos)

> Las UIs admin nuevas. El BE detrás está deployado, podés interactuar normalmente.

| Caso en post-deploy-awaiting-prod.md | Brief | Sello | Notas |
|---|---|---|---|
| EM-4 (FE quarantine tab admin) | 068 | 🟢 | Navegar a `/intranet/admin/email-outbox` → tab "Cuarentena". Validar que aparece, las filas de IDs en cuarentena se muestran con `RetryAfter` formateado, y los botones de acción funcionan. |
| EM-6 (FE blacklist tab admin) | 075 | 🟢 | Mismo `/intranet/admin/email-outbox` → tab "Blacklist". Validar listado, filtros por motivo (BOUNCE_5XX / BOUNCE_MAILBOX_FULL / MANUAL / FORMAT_INVALID), CRUD endpoints conectados. |
| EM-9 (banner B9 + toast SignalR cross-páginas) | 076, 080 | 🟢 | Navegar a las 5 páginas admin con el banner: bandeja, dashboard-día, diagnóstico, auditoría, monitoreo-hub. Confirmar que `app-email-defer-fail-banner` se muestra cuando `defer-fail-status` devuelve WARNING/CRITICAL, y que el banner se actualiza vía push SignalR (no solo polling 60s). Para forzar push: ver Caso EM-9 detalle (DevTools Network → confirmar `/hubs/email-alerts/negotiate`). |
| EM-10 (FE dashboard tiles monitoreo) | 079 | 🟢 | Navegar a `/intranet/admin/email-outbox/monitoreo`. Validar 5 tiles: sender-stats, top-destinatarios, serie-temporal, dominios-receptores, candidatos-blacklist. Cada tile debe cargar datos del BE 077 y respetar caps (limit ≤ 50, ventana ≤ 30d). |
| EM-11 (BE monitoreo endpoints reachability) | 077 | 🟢 | Cubierto indirectamente por EM-10. Si EM-10 carga datos OK, los 5 endpoints están vivos. |

**Orden sugerido**: EM-10 (dashboard, prueba 5 endpoints juntos) → EM-9 (banner cross-páginas) → EM-6 (blacklist) → EM-4 (quarantine).

---

## 🟢 NOW — bloque Otros (2 casos browser-only)

| Caso | Brief | Sello | Notas |
|---|---|---|---|
| O-1 (asistencia admin search por DNI) | 082 | 🟢 | Navegar a `/intranet/admin/asistencias` → buscar por DNI parcial (ej: `74125`). Validar que devuelve resultados parciales, que el modelo polimórfico (E/P) se distingue correctamente, y que el endpoint respeta INV-AD06 (rol Director). |
| O-2 (cursos rowVersion concurrency) | 088 | 🟢 | Caso 3 del WAL Integration Smoke (`wal-integration-smoke.md`): 2 tabs editando el mismo curso. Tab A guarda → Tab B con rowVersion vieja guarda → debe ver toast de conflicto + entry WAL `status: 'CONFLICT'`. Si pasa, valida 088 + cierra el bug que el smoke había detectado. |

---

## 🟡 NOW-partial — bloque Email backend (2 casos)

> Podés validar el "código está vivo y responde" desde browser, pero el comportamiento end-to-end requiere algo del usuario.

| Caso | Brief | Sello | Qué hacer ahora vs después |
|---|---|---|---|
| EM-2 (DeferEvent parser persiste) | 066 | 🟡 | **Ahora**: confirmá que el endpoint `GET /api/sistema/email-outbox/defer-events` (o equivalente del brief 066) responde 200 sin error, y que el BE no tira excepciones en el deploy. **Después**: el usuario corre query SQL para ver si `EmailDeferEvent` se llena con NDRs reales. Criterio: extender +7d antes de declarar regresión si no hay NDRs en la ventana. |
| EM-8 (mailbox-full → blacklist auto) | 072 | 🟡 | **Ahora**: confirmá que la tabla `EmailBlacklist` es accesible vía endpoint del CRUD (Caso EM-6 ya valida esto). **Después**: el usuario inserta 2 filas sintéticas con `EO_TipoFallo = 'FAILED_MAILBOX_FULL'` con SQL para forzar el handler, o esperar 4.2.2 real en sandbox. |

---

## 🔴 WAIT — bloque Hangfire + telemetría + bumps async (5 casos)

> Estos NO los puede hacer Cowork. Son responsabilidad del usuario o de tiempo natural. Marcalos como "no-browser" en el reporte y avanzá.

| Caso | Brief | Razón |
|---|---|---|
| EM-1 (Hangfire `bounce-parser-imap` registrado) | 069 | Requiere acceso a `/hangfire` con cuenta admin Azure. Pedir al usuario screenshot del job listed + last run timestamp. |
| EM-3 (Hangfire release jobs) | 067 | Mismo `/hangfire` — jobs `email-quarantine-release` y `email-domain-pause-release` deben aparecer y haber corrido al menos una vez. |
| EM-5 (CHECK constraint EmailQuarantine) | 067 | Query SQL Azure (`SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('EmailQuarantine')`). Pedir al usuario. |
| EM-7 (BlacklistAutoCleanupJob ejecutado) | 074 | Hangfire diario 03:00 hora Perú. Pedir al usuario que confirme `last successful run` en `/hangfire/recurring`. |
| WAL-6 mismatch real M4 | 094 | Ver WAL-6 arriba — requiere bump de schemaVersion en próximo deploy. Diferir. |

---

## Plan de acción

1. **Pre-flight** (5 min) — validá los 4 checks de la tabla inicial. Si alguno falla, parar y avisar al usuario.
2. **WAL** (~35 min) — orden: WAL-1, WAL-2, WAL-3 happy path, WAL-3 circuit breaker, WAL-4, WAL-6 happy path.
3. **Email FE** (~25 min) — orden: EM-10, EM-9, EM-6, EM-4.
4. **Otros** (~10 min) — O-1, O-2.
5. **Email parcial** (~10 min) — EM-2 (endpoint vivo), EM-8 (CRUD vivo).
6. **Reportá al usuario** con el resumen de abajo.
7. **Los `🔴 WAIT`** quedan para el usuario.

**Tiempo total estimado**: ~85 min de browser activo.

## Formato del reporte

Cuando termines, mandá al usuario en este formato:

```
## Smoke post-deploy 2026-05-04

✅ Verde (X casos):
- WAL-1 ✅ usuarios + schedules
- WAL-2 ✅ banner aparece y es dismissible
- WAL-3 happy ✅ / circuit ✅
- WAL-4 ✅ fallback funciona
- WAL-6 happy ✅
- EM-10 ✅ 5 tiles cargan
- EM-9 ✅ banner + push SignalR
- EM-6 ✅ blacklist CRUD
- EM-4 ✅ quarantine tab
- O-1 ✅
- O-2 ✅

🟡 Parcial (entrego al humano):
- EM-2 endpoint OK, queda query SQL para confirmar persistencia con NDRs reales
- EM-8 CRUD OK, queda fixture SQL para handler

🔴 Pendiente (humano):
- EM-1, EM-3, EM-5, EM-7 — Hangfire / SQL
- WAL-6 mismatch — próximo deploy

❌ Fallas detectadas (con repro):
- <ninguna esperada — completar acá si aparece>
```

## Comandos `/verify` cuando todo verde

Una vez Cowork reporta verde + el usuario completa los 🟡 y 🔴, el usuario tipea:

```
/verify 091   # WAL cross-tab (verde)
/verify 097   # WAL banner migración (verde)
/verify 092   # WAL M1+M2 (verde + telemetry 30d aceptado)
/verify 093   # WAL M3 IDB fallback (verde)
/verify 094   # WAL M4 schema (verde happy path; mismatch diferido)
/verify 075   # FE blacklist tab (verde)
/verify 068   # FE quarantine tab (verde)
/verify 076   # banner B9 toast SignalR (verde)
/verify 080   # banner cross-páginas (verde)
/verify 077   # BE monitoreo endpoints (verde indirecto vía 079)
/verify 078   # BE EmailHub SignalR (verde indirecto vía 076/080)
/verify 079   # FE dashboard tiles (verde)
/verify 082   # asistencia search-DNI (verde)
/verify 088   # cursos rowVersion (verde)

# Los siguientes esperan al humano:
# /verify 066 — DeferEvent persiste (extendido +7d si no hay NDRs)
# /verify 067 — quarantine + domain pause (Hangfire + SQL)
# /verify 069 — bounce parser IMAP (Hangfire screenshot)
# /verify 072 — mailbox-full handler (SQL fixture)
# /verify 073 — blacklist CRUD (cubierto por 075 indirecto, confirmar)
# /verify 074 — blacklist auto-cleanup (Hangfire 03:00)
```

## Limitaciones conocidas (recordatorio)

Patrones útiles ya documentados en `SETUP-COWORK.md` §6.2:

- IndexedDB inspect sin `deleteDatabase` — usar `clear()` o snippet del SETUP.
- `window.fetch` interceptor (Angular usa `withFetch`, `XMLHttpRequest` NO funciona).
- PrimeNG `p-select` workaround si `form_input` falla.
- Cookie XSRF para POST/PUT/DELETE manual.
- Reload mata fetch overrides — re-inyectar.
