> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo. El backend ya está desplegado y commited en `Educa.API master`.
> **Plan**: 22 · **Chat**: B · **Fase**: F5.6 (parte DeferFailStatus) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 22 Chat B FE — Widget `DeferFailStatus` (complementar widget throttle ya existente)

## PLAN FILE

- Maestro: `.claude/plan/maestro.md` → fila **22** del inventario + sección **🔴 Plan 29** (el endpoint nuevo quedó dentro de Plan 29 Chat 2.6, pero el consumidor FE es Plan 22 Chat B).
- Contexto de chats anteriores (leer solo si hace falta):
  - `.claude/chats/closed/011-plan-22-chat-a-be-smtp-throttle-multisender.md` — Plan 22 Chat A BE (endpoint `/api/email-outbox/throttle-status`).
  - `.claude/chats/closed/012-plan-22-chat-a-cierre-tests-sql-deploy.md` — cierre Chat A con nota explícita de que el widget Chat B quedó pendiente.
  - `.claude/chats/closed/027-plan-29-chat-2-6-be-defer-fail-status-endpoint.md` — chat BE que acabó de cerrar el endpoint `DeferFailStatus`.
- Commits clave ya en `Educa.API master`:
  - `7b2a962` (Plan 29 Chat 2.6) — endpoint nuevo `GET /api/sistema/email-outbox/defer-fail-status`.
  - Chat A de Plan 22 — endpoint existente `GET /api/email-outbox/throttle-status`.

## OBJETIVO

Agregar un widget admin `DeferFailStatusWidget` en la página `/intranet/admin/email-outbox` que consuma el endpoint nuevo `GET /api/sistema/email-outbox/defer-fail-status` y muestre:

1. **Status global** (OK/WARNING/CRITICAL) con semáforo de color, calculado en backend por bandas del threshold cPanel.
2. **Contador hora actual** (DeferFailCount / Threshold + PercentUsed + HourStart).
3. **Breakdown 24h** por estado y tipo de fallo (Sent/Pending/Retrying + 5 variantes FAILED).
4. **Resumen blacklist** (TotalActivos + 4 motivos + Oldest/Newest).

Debe convivir con el `ThrottleStatusWidget` ya existente (Plan 22 Chat A) en la misma página — uno mide throttle per-sender, el otro mide defer/fail a nivel dominio. Ambos polean cada 30-60s.

## PRE-WORK OBLIGATORIO

### 1. Revisar el shape real del endpoint BE

Leer los 4 archivos del backend para replicar el modelo FE 1:1:

- `Educa.API/DTOs/Notifications/DeferFailStatusDto.cs`
- `Educa.API/DTOs/Notifications/CurrentHourStatus.cs`
- `Educa.API/DTOs/Notifications/WindowStats.cs`
- `Educa.API/DTOs/Notifications/BlacklistSummary.cs`

Todos usan `sealed class` con `required init` — mapear a `interface` TypeScript con camelCase.

### 2. Confirmar con el usuario

- **Intervalo de polling**: ¿30s, 60s, o configurable por el admin vía un toggle en el widget? El `ThrottleStatusWidget` ya tiene `autoRefresh` + `collapsed` — espejar ese comportamiento.
- **Ubicación visual**: ¿widget arriba del chart de tendencia y al lado del throttle, o en un tab/acordeón aparte? Depende de cómo está hoy la página.
- **Banda WARNING inferior**: el backend usa 60% como umbral. Si el admin quiere visualizar también a 40% con un tono amarillo suave (WARN light), avisar antes.

### 3. Probar el endpoint manualmente

```bash
# Como Director autenticado (cookie educa_auth):
curl -X GET https://educacom.azurewebsites.net/api/sistema/email-outbox/defer-fail-status \
  -H "Cookie: educa_auth=<token>"
```

Esperado: `200 OK` con `ApiResponse<DeferFailStatusDto>`. Como Profesor/Apoderado: `403`.

## ALCANCE

### Archivos a CREAR

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|------------------|
| 1 | `src/app/features/intranet/pages/admin/email-outbox/models/defer-fail-status.models.ts` | DTOs TS (4 interfaces + tipo `DeferFailStatusLevel = 'OK' \| 'WARNING' \| 'CRITICAL'`) | ~60 |
| 2 | `src/app/features/intranet/pages/admin/email-outbox/components/defer-fail-status-widget/defer-fail-status-widget.component.ts` | Widget presentacional (input `status`, `loading`, `autoRefresh`, `collapsed`; outputs `refresh`, `autoRefreshChange`, `collapsedChange`) | ~130 |
| 3 | `*/defer-fail-status-widget.component.html` | Template con 3 secciones: CurrentHour + 24h breakdown + Blacklist summary | ~80 |
| 4 | `*/defer-fail-status-widget.component.scss` | Overrides PrimeNG (sin fondos blancos, tokens `var(--red-600)`/`--blue-800`/`--green-500` según semáforo) | ~100 |
| 5 | `*/defer-fail-status-widget.component.spec.ts` | Vitest — patrón del `throttle-status-widget.component.spec.ts` | ~100 |

### Archivos a MODIFICAR

| # | Archivo | Cambio |
|---|---------|--------|
| 6 | `src/app/features/intranet/pages/admin/email-outbox/services/email-outbox.service.ts` | Agregar método `getDeferFailStatus(): Observable<DeferFailStatusDto>` (HTTP GET al endpoint nuevo) |
| 7 | `src/app/features/intranet/pages/admin/email-outbox/services/email-outbox-data.facade.ts` | Agregar signal `deferFailStatus` + método `refreshDeferFailStatus()` + polling auto-refresh (mismo patrón que `ThrottleStatus`) |
| 8 | `src/app/features/intranet/pages/admin/email-outbox/services/email-outbox.store.ts` | Agregar `_deferFailStatus` signal privado + `asReadonly()` expuesto + setter |
| 9 | `*/email-outbox.component.html` | Agregar `<app-defer-fail-status-widget>` al lado o debajo de `<app-throttle-status-widget>` |
| 10 | `*/email-outbox.component.ts` | Consumir `deferFailStatus` + handlers |
| 11 | `.claude/plan/maestro.md` | Marcar Plan 22 Chat B F5.6 ✅ cerrado, fila 22 a ~85% |

### Shape TS del modelo

```typescript
// models/defer-fail-status.models.ts
export type DeferFailStatusLevel = 'OK' | 'WARNING' | 'CRITICAL';

export interface CurrentHourStatus {
  deferFailCount: number;
  threshold: number;
  percentUsed: number;
  hourStart: string;  // ISO Peru time
}

export interface WindowStats {
  total: number;
  sent: number;
  pending: number;
  retrying: number;
  failedInvalidAddress: number;
  failedNoEmail: number;
  failedBlacklisted: number;
  failedThrottleHost: number;
  failedOther: number;
}

export interface BlacklistSummary {
  totalActivos: number;
  byReasonBounce5xx: number;
  byReasonManual: number;
  byReasonBulkImport: number;
  byReasonFormatInvalid: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export interface DeferFailStatus {
  status: DeferFailStatusLevel;
  currentHour: CurrentHourStatus;
  last24h: WindowStats;
  blacklist: BlacklistSummary;
  generatedAt: string;
}
```

### Patrón de llamada HTTP

```typescript
// email-outbox.service.ts
getDeferFailStatus(): Observable<DeferFailStatus> {
  // ApiResponse<T> viene auto-unwrapped por el interceptor:
  return this.http.get<DeferFailStatus>(
    `${this.baseUrl}/sistema/email-outbox/defer-fail-status`
  );
}
```

**⚠️ Importante**: el base URL del service actual probablemente termina en `/email-outbox` (para el endpoint throttle). Confirmar en el service antes de construir la URL — puede que necesites un segundo `baseUrl` o un path absoluto `/api/sistema/email-outbox/defer-fail-status`.

## TESTS MÍNIMOS

### Widget (`defer-fail-status-widget.component.spec.ts`)

| Caso | Input | Assertion |
|------|-------|-----------|
| Loading state | `loading = true`, `status = null` | Muestra skeleton (app-skeleton-loader) |
| Status OK | `status.status = 'OK'`, percentUsed = 30 | Tag verde, icono check |
| Status WARNING | `status.status = 'WARNING'`, percentUsed = 80 | Tag amarillo, icono exclamation |
| Status CRITICAL | `status.status = 'CRITICAL'`, percentUsed = 100 | Tag rojo, icono ban |
| Breakdown 24h renderiza todos los tipos | `last24h = {...9 fields...}` | Todos los contadores visibles |
| Blacklist vacía | `blacklist.totalActivos = 0` | Mensaje "Sin bloqueos activos" |
| Emit refresh | Click botón | `refresh.emit()` disparado |
| Emit autoRefreshChange | Toggle switch | `autoRefreshChange.emit(true)` |
| Emit collapsedChange | Click colapso | `collapsedChange.emit(true)` |

Patrón exacto: copiar `throttle-status-widget.component.spec.ts` y adaptar inputs.

## REGLAS OBLIGATORIAS

### Arquitectura FE

- **Widget presentacional puro**: solo `input()` + `output()`. NO inyecta servicios. NO accede al store directamente. OnPush obligatorio.
- **Facade orquesta**: `email-outbox-data.facade.ts` polea el endpoint, setea signal en store, expone readonly al componente de página.
- **Store no hace HTTP**: señal privada + `asReadonly()` + setter método. Sin `.subscribe()` en el store (regla ESLint `layer-enforcement`).
- **Sin `any`**: tipar con el modelo `DeferFailStatus`.

### Design system (reglas `design-system.md`)

- **Transparencia obligatoria**: cards del widget con `background: transparent` + borde `var(--surface-300)` (no islas blancas).
- **Tokens semánticos**, NO hex literals:
  - Status OK → `var(--green-500)` / `var(--green-600)`
  - Status WARNING → `var(--yellow-500)` / `var(--yellow-700)`
  - Status CRITICAL → `var(--red-500)` / `var(--red-600)` (NO `#dc2626` literal)
  - Acentos sobre fondo claro → `var(--blue-800)` (NO celeste del tema Aura)
- **Alert banners con `color-mix()`** si haces una "zona crítica" destacada:
  ```scss
  background: color-mix(in srgb, var(--red-500) 15%, transparent);
  border: 1px solid var(--red-500);
  ```
- **Labels UPPERCASE**: usar utility `.label-uppercase` para títulos de sección del widget.
- **Botones icon-only**: `[pt]="{ root: { 'aria-label': '...' } }"` obligatorio (reglas `a11y.md`).

### Comunicación con BE

- El endpoint BE devuelve `ApiResponse<DeferFailStatusDto>`. El interceptor HTTP ya hace unwrap — tipar como `Observable<DeferFailStatus>` directo.
- Retry: `withRetry` del proyecto NO reintenta 429. El endpoint está protegido por GlobalLimiter (200 GETs/min) → prácticamente imposible pegar con el widget cada 30s.
- Fail-safe: si el BE devuelve `Status = "CRITICAL"` con counters en 0 es probablemente un error interno del backend (cayó en el catch de INV-S07). La UI debería mostrar un banner sutil "Error de telemetría — verifica logs" si detecta este patrón (CRITICAL + all counters = 0 + blacklist.totalActivos = 0).

### Polling y lifecycle

- Auto-refresh default: **60s** (coherente con widget throttle). Preference persistida con `PreferencesStorageService` si existe ya patrón para el throttle widget.
- `takeUntilDestroyed(this.destroyRef)` en todos los `interval()` / `timer()` del facade.
- Al destruir la página (`ngOnDestroy`), detener el polling — el facade debe gestionar esto.

## APRENDIZAJES TRANSFERIBLES (del chat BE 2.6)

### Endpoint ya confirmado

- Route: `GET /api/sistema/email-outbox/defer-fail-status` (namespace `sistema/`, distinto del throttle que vive en `/api/email-outbox/throttle-status`).
- Auth: `[Authorize(Roles = Roles.Administrativos)]` — 4 roles admin. Profesor/Apoderado/Estudiante reciben 403.
- Rate limit: sin decorador especial; GlobalLimiter (200/min per-user) basta.
- Response shape: `ApiResponse<DeferFailStatusDto>`. El service BE tiene `try/catch` global (INV-S07) — nunca 500 por error interno.

### Semántica de "cuenta para cPanel"

El contador `currentHour.deferFailCount` excluye 3 tipos que NO cruzaron al SMTP:

- `FAILED_INVALID_ADDRESS` (rechazado pre-envío por formato)
- `FAILED_NO_EMAIL` (sin correo registrado)
- `FAILED_BLACKLISTED` (bloqueado pre-envío por EmailBlacklist)

Estos 3 SÍ aparecen en `last24h.failedInvalidAddress / failedNoEmail / failedBlacklisted` para que el admin los vea, pero no consumen quota del dominio. El widget puede visualizarlos con un estilo "informativo" distinto de los que sí cuentan (throttle, other, unknown).

### `FailedOther` es catch-all

Agrupa `FAILED_UNKNOWN`, `FAILED_MAILBOX_FULL`, `FAILED_REJECTED`, `FAILED_QUOTA_EXCEEDED` y cualquier tipo futuro. Todos cuentan para cPanel. El widget puede mostrarlos en un tooltip "Otros" si quieres mantener 5 tipos visibles en vez de 8.

### `Retrying` como métrica separada

El usuario expresó preocupación sobre retry automático (5/h por dominio + 7 buzones → retries automáticos pueden agotar quota rápido). El widget debería exponer `retrying` de forma prominente (no colgado dentro de "otros") porque es la cola pendiente que — si se migra a retry manual en un chat futuro — el admin debe resolver a mano.

### Estructura FE existente que debes respetar

- Página admin ya lista: `src/app/features/intranet/pages/admin/email-outbox/`.
- Widget gemelo ya existe: `components/throttle-status-widget/` (107 líneas) — copiar el patrón 1:1 (inputs readonly, computed severity, outputs para refresh/toggle).
- Facade ya existe: `services/email-outbox-data.facade.ts` — agregar rama paralela a la que ya polea throttle.
- Service ya existe: `services/email-outbox.service.ts` — agregar un método más con HTTP GET al nuevo endpoint.

### Tests FE: Vitest + signals

El proyecto usa Vitest con jsdom. Patrón para signals en tests:
```typescript
const fixture = TestBed.createComponent(DeferFailStatusWidgetComponent);
fixture.componentRef.setInput('status', mockStatus);
fixture.componentRef.setInput('loading', false);
fixture.detectChanges();
```

## FUERA DE ALCANCE

- **Chat 3 OPS del Plan 29** (negociación con hosting para subir threshold) — no es código.
- **Chat 4 docs del Plan 29** (`INV-MAIL01/02/03/04` en `business-rules.md §18`) — chat separado después del OPS.
- **Retry manual en worker BE** — decisión arquitectónica futura, no entra aquí. Este widget solo VISIBILIZA la métrica para facilitar esa futura decisión.
- **Cache/invalidación con SWR** — el widget polea cada 60s, no necesita cache persistente en IndexedDB (es telemetría volátil).
- **Página admin de EmailBlacklist** (deuda D2 del Plan 29) — chat separado, el widget solo muestra el resumen.
- **BE changes** — el endpoint ya está desplegado. Si descubres un gap, abre chat nuevo al backend, no toques Educa.API desde este chat.

## CRITERIOS DE CIERRE

```
PRE-WORK
[ ] Modelo BE leído (4 DTOs) + shape TS replicado 1:1
[ ] Usuario confirmó intervalo polling (default 60s) y ubicación visual del widget
[ ] Endpoint probado manualmente con cookie auth — 200 OK + shape correcto

CÓDIGO
[ ] defer-fail-status.models.ts con 4 interfaces + type DeferFailStatusLevel
[ ] Widget presentacional con inputs/outputs idénticos al throttle-status-widget
[ ] Service con método getDeferFailStatus() — URL absoluta /api/sistema/email-outbox/defer-fail-status
[ ] Facade poleando cada 60s con takeUntilDestroyed
[ ] Store con signal privado + asReadonly()
[ ] Componente page integrando el widget nuevo al lado/debajo del throttle
[ ] Tokens semánticos (var(--red-600), etc.) — NO hex literals
[ ] Transparencia en cards — NO fondos blancos
[ ] aria-labels en todos los botones icon-only

TESTS
[ ] ≥ 9 tests en defer-fail-status-widget.component.spec.ts cubriendo los 9 casos
[ ] Suite FE verde (vitest) — baseline actual + tests nuevos
[ ] npm run lint limpio

VALIDACIÓN
[ ] ng build limpio
[ ] Manual smoke test: abrir /intranet/admin/email-outbox como Director → widget renderiza con datos reales (actualmente Status=OK + counters casi todos en 0)
[ ] Verificar con DevTools Network que el endpoint pega cada 60s
[ ] Verificar en DevTools que se envía cookie auth (educa_auth)

COMMIT
[ ] Un solo commit FE con mensaje sugerido
[ ] Mover este archivo a .claude/chats/closed/028-plan-22-chat-b-fe-defer-fail-status-widget.md
[ ] Actualizar maestro.md Plan 22 fila 22: F5.6 Chat B ✅ cerrado, % a ~85%

POST-DEPLOY
[ ] Validar widget con datos reales durante 24-48h — confirmar que el polling no satura el GlobalLimiter del BE
[ ] Si Status=CRITICAL aparece en prod sin cascada real (falso positivo), investigar el catch del service BE
```

## COMMIT MESSAGE sugerido

**Subject** (≤ 72 chars):

```
feat(email-outbox): Plan 22 Chat B — add "DeferFailStatus" widget
```

**Body**:

```
Close Plan 22 Chat B F5.6 FE — widget complementario al
"ThrottleStatusWidget" que consume el endpoint
"GET /api/sistema/email-outbox/defer-fail-status" (Plan 29 Chat 2.6
BE, commit 7b2a962 en Educa.API).

Add new widget "DeferFailStatusWidget" in /intranet/admin/email-outbox
that visualizes:
 - Current hour defer/fail counter vs "EmailSettings.DeferFailThresholdPerHour"
   (semaphore OK/WARNING/CRITICAL via backend-computed bands).
 - Last 24h breakdown by "EO_Estado" + "EO_TipoFallo" — highlights
   "Retrying" as a separate metric to surface the queue that a future
   manual-retry migration would need to resolve.
 - Active blacklist summary by "EBL_MotivoBloqueo".

Facade polls every 60s with "takeUntilDestroyed". Widget is pure
presentational (OnPush, input/output only). Service adds one HTTP GET
to absolute path "/api/sistema/email-outbox/defer-fail-status"
(different namespace than existing "/api/email-outbox/throttle-status").

Tests: +N spec cases in "defer-fail-status-widget.component.spec.ts"
(loading, OK/WARNING/CRITICAL render, breakdown 24h, empty blacklist,
refresh/toggle outputs). Lint clean, build OK.

Unblocks the full Plan 22 Chat B scope — throttle per-sender and
defer/fail per-domain are now visible side by side in the admin page.
```

**Recordatorios (skill `commit`)**:

- Inglés imperativo.
- Español solo entre `"..."` para términos de dominio (`"ThrottleStatusWidget"`, `"EO_Estado"`, `"EBL_MotivoBloqueo"`, `"EmailSettings.DeferFailThresholdPerHour"`, `"Retrying"`).
- NUNCA `Co-Authored-By`.

## CIERRE

Feedback a pedir al usuario al cerrar el Chat 22-B:

1. **Coherencia visual con widget throttle** — ¿ambos widgets se leen como "misma familia" (tipografía, espaciado, colores del semáforo alineados)? Si no, refinar antes de ir a docs.
2. **Utilidad del counter `Retrying`** — ¿el admin lo encuentra informativo o le suma ruido? Si lo ignora en producción, colapsarlo dentro de "otros". Si lo consulta, dejarlo prominente para habilitar la eventual migración a retry manual.
3. **Polling rate** — ¿60s es suficiente o el admin quiere 30s cuando el Status es WARNING/CRITICAL? (Adaptive polling: acelerar cuando hay señales rojas). Este refinamiento es chat futuro, no entra aquí.
4. **Próximo del Plan 29** — con Plan 22 Chat B cerrado, reabrir Chat 3 OPS (negociación hosting) o Chat 4 docs (`INV-MAIL01/02/03/04`). Orden depende de si el OPS ya negoció el threshold.