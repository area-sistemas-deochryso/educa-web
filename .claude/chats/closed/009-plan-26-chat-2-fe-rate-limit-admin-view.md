> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 26 · **Chat**: 2 · **Fase**: F1.5 + F1.6 (+ coord deploy SQL prod) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 26 Chat 2 — Rate limit admin view (FE: stats + tabla + filtros + feature flag)

## PLAN FILE

`educa-web/.claude/plan/maestro.md` → sección **"🔵 Plan 26 — Rate limiting flexible"** → **F1 — Telemetría sobre policies actuales** → sub-items **F1.5** (vista admin FE) + **F1.6** (feature flag + menú).

Path relativo desde `educa-web`: `.claude/plan/maestro.md`.

## OBJETIVO

Exponer al Director/Admin una vista operativa de quién/qué está hitting 429 **sin cambiar ninguna policy**. El objetivo es acumular 1-2 semanas de datos reales (volumen, roles, endpoints, picos por hora) para calibrar los multipliers de F2.

## PRE-WORK OBLIGATORIO (COORDINACIÓN BE + OPS)

### 1. Script SQL en producción (pendiente del Chat 1)

El Chat 1 ejecutó el `CREATE TABLE RateLimitEvent` **solo en BD de prueba**. Antes de codear esta vista, confirmar con el usuario si está listo el deploy a producción. El BE ya está desplegado asumiendo que la tabla existe (el middleware falla silenciosamente si no está, por INV-ET02, pero la vista admin va a devolver lista vacía hasta entonces).

Script a ejecutar en producción:

```sql
CREATE TABLE RateLimitEvent (
    REL_CodID BIGINT IDENTITY(1,1) PRIMARY KEY,
    REL_CorrelationId NVARCHAR(50) NULL,
    REL_Endpoint NVARCHAR(200) NOT NULL,
    REL_HttpMethod NVARCHAR(10) NOT NULL,
    REL_Policy NVARCHAR(50) NULL,
    REL_UsuarioDni NVARCHAR(8) NULL,
    REL_UsuarioRol NVARCHAR(50) NULL,
    REL_LimiteEfectivo INT NULL,
    REL_TokensConsumidos INT NULL,
    REL_FueRechazado BIT NOT NULL,
    REL_IpAddress NVARCHAR(45) NULL,
    REL_Fecha DATETIME2 NOT NULL
);

CREATE INDEX IX_RateLimitEvent_Fecha_Rechazado
    ON RateLimitEvent (REL_Fecha DESC) INCLUDE (REL_FueRechazado);

CREATE INDEX IX_RateLimitEvent_UsuarioDni_Fecha
    ON RateLimitEvent (REL_UsuarioDni, REL_Fecha DESC)
    WHERE REL_UsuarioDni IS NOT NULL;

CREATE INDEX IX_RateLimitEvent_Endpoint_Fecha
    ON RateLimitEvent (REL_Endpoint, REL_Fecha DESC);
```

**No ejecutar sin confirmación del usuario.**

### 2. Smoke test del endpoint BE en prod

Una vez creada la tabla + deploy BE en Azure:

```bash
# Como Director autenticado (cookie educa_auth)
curl -X GET 'https://educacom.azurewebsites.net/api/sistema/rate-limit-events?take=10' \
  --cookie "educa_auth=<token>"
```

Esperado: `ApiResponse<List<RateLimitEventListaDto>>` con lista vacía (aún no hay 429 capturados) o algunos eventos si ya hubo tráfico real.

### 3. Endpoint adicional de stats (BE — posible pieza pequeña en este chat)

La vista necesita agregados ligeros (top rol, top endpoint, total 24h). Opciones:

- **A**: calcular client-side sobre la lista traída (si take=500 alcanza para 24h). **Prefiere A si el volumen inicial es bajo**.
- **B**: agregar endpoint `GET /api/sistema/rate-limit-events/stats` que devuelva `{ total24h, topRol[], topEndpoint[], porHora[] }`.

Decidir al inicio del chat basándose en el volumen real que se vea en BD de prueba. Si 429 <= 100/día → A. Si >= 500/día → B.

## ALCANCE

### Archivos nuevos FE

| Archivo | Rol | Líneas est. |
|---------|-----|-------------|
| `src/app/features/intranet/pages/admin/rate-limit-events/rate-limit-events.component.ts` | Page (smart) | ~180 |
| `src/app/features/intranet/pages/admin/rate-limit-events/rate-limit-events.component.html` | Template | ~200 |
| `src/app/features/intranet/pages/admin/rate-limit-events/rate-limit-events.component.scss` | Estilos | ~60 |
| `src/app/features/intranet/pages/admin/rate-limit-events/services/rate-limit-events.service.ts` | API gateway | ~40 |
| `src/app/features/intranet/pages/admin/rate-limit-events/services/rate-limit-events.store.ts` | State signals | ~80 |
| `src/app/features/intranet/pages/admin/rate-limit-events/services/rate-limit-events.facade.ts` | Orquestación (load + filters) | ~90 |
| `src/app/features/intranet/pages/admin/rate-limit-events/components/rate-limit-stats/rate-limit-stats.component.ts` | Stats cards presentational | ~60 |
| `src/app/features/intranet/pages/admin/rate-limit-events/components/rate-limit-stats/rate-limit-stats.component.html` | Template | ~80 |
| `src/app/features/intranet/pages/admin/rate-limit-events/components/rate-limit-table/rate-limit-table.component.ts` | Tabla presentational | ~90 |
| `src/app/features/intranet/pages/admin/rate-limit-events/components/rate-limit-table/rate-limit-table.component.html` | Template | ~140 |
| `src/app/features/intranet/pages/admin/rate-limit-events/components/rate-limit-filters/rate-limit-filters.component.ts` | Filtros presentational | ~70 |
| `src/app/features/intranet/pages/admin/rate-limit-events/components/rate-limit-filters/rate-limit-filters.component.html` | Template | ~80 |
| `src/app/features/intranet/pages/admin/rate-limit-events/models/rate-limit-event.models.ts` | DTOs + tipos semánticos | ~40 |
| `src/app/features/intranet/pages/admin/rate-limit-events/index.ts` | Barrel | ~5 |

### Archivos modificados FE

| Archivo | Cambio |
|---------|--------|
| `src/app/config/environment.ts` + `environment.development.ts` | Agregar flag `rateLimitMonitoring: false/true` |
| `src/app/features/intranet/intranet.routes.ts` | Nueva ruta `admin/rate-limit-events` gated por `environment.features.rateLimitMonitoring` |
| `src/app/features/intranet/shared/config/intranet-menu.config.ts` | Agregar item en módulo `Sistema` grupo `Monitoreo` (ver `rules/menu-modules.md`) |
| `src/app/features/intranet/shared/components/intranet-layout/...` (si aplica) | No esperado — la ruta sola con el flag alcanza |

### Opcional BE (si se decide por opción B de stats)

| Archivo | Cambio |
|---------|--------|
| `Educa.API/Controllers/Sistema/RateLimitEventsController.cs` | Agregar `GET /stats?horas=24` endpoint |
| `Educa.API/Interfaces/Services/Sistema/IRateLimitTelemetryService.cs` | `Task<RateLimitStatsDto> GetStatsAsync(int horas)` |
| `Educa.API/Services/Sistema/RateLimitTelemetryService.cs` | Implementación agregados con `GroupBy` sobre `AsNoTracking()` |
| `Educa.API/Interfaces/Repositories/Sistema/IRateLimitEventRepository.cs` | `Task<RateLimitStatsRaw> GetStatsRawAsync(DateTime desde)` |
| `Educa.API/Repositories/Sistema/RateLimitEventRepository.cs` | Query agregada |
| `Educa.API/DTOs/Sistema/RateLimitStatsDto.cs` | DTO `{ total, totalRechazados, topRoles[], topEndpoints[] }` |

Tests BE asociados (~5 casos). **Solo si se elige opción B.**

### Tests nuevos FE (Vitest)

- `rate-limit-events.facade.spec.ts` (~5 tests): carga con filtros, maneja error, estado de loading
- `rate-limit-events.store.spec.ts` (~4 tests): mutaciones signals
- `rate-limit-stats.component.spec.ts` (~3 tests): render de stats cards + cálculos client-side (si opción A)
- `rate-limit-table.component.spec.ts` (~3 tests): render + emit de eventos (ver detalle, etc.)
- `rate-limit-filters.component.spec.ts` (~3 tests): emit de cambios, reset

## ESPECIFICACIÓN UI (pegar literal en el chat nuevo)

### Ruta

`/intranet/admin/rate-limit-events` — gated por `environment.features.rateLimitMonitoring`.

### Layout

Seguir el estándar `design-system.md` (páginas B1-B11) — misma estructura que `/intranet/admin/usuarios` o `/intranet/admin/error-logs`:

1. **`<app-page-header>`** — icon `pi pi-shield`, title "Telemetría de Rate Limiting", subtitle "Observabilidad de respuestas 429". Acciones: botón refresh icon-only (con `pt` + `aria-label`).
2. **Stats section** (B3) — 4 cards:
   - **Total 24h** — `total` (rechazos + warnings), sublabel "últimas 24 horas"
   - **Rechazados 24h** — `totalRechazados`, variante `stat--critical` si > 50
   - **Top rol** — `topRoles[0].rol`, sublabel `topRoles[0].total + " eventos"`
   - **Top endpoint** — `topEndpoints[0].endpoint` (truncado con ellipsis), sublabel `topEndpoints[0].total + " eventos"`
3. **Filter bar** (B6) — search (por endpoint), dropdowns (rol, policy, soloRechazados bool), date range picker para `desde`/`hasta`, clear button.
4. **Tabla** (B4) — columnas: Fecha · HttpMethod · Endpoint · Policy · Rol · DNI (ya enmascarado) · Rechazado (badge rojo si `FueRechazado`) · IpAddress · CorrelationId (truncado + tooltip). Paginación 20/página. Headers UPPERCASE con `label-uppercase`.
5. **Drawer detalle** (B10) al click en fila — muestra todos los campos incluido `correlationId` completo (clickable para copy to clipboard) + link "Buscar en ErrorLog" (abre admin/error-logs filtrado por ese correlationId, si el feature está disponible).
6. **Sin dialogs de edición** — esta vista es **solo lectura**.

### Tipos semánticos (propuesta)

En `models/rate-limit-event.models.ts`:

```typescript
export const RATE_LIMIT_POLICIES = [
  'global-read', 'global-write', 'login', 'refresh', 'biometric', 'feedback', 'heavy'
] as const;
export type RateLimitPolicy = (typeof RATE_LIMIT_POLICIES)[number];

export interface RateLimitEventListaDto {
  id: number;
  correlationId: string | null;
  endpoint: string;
  httpMethod: string;
  policy: string | null;  // libre: puede venir null si fue GlobalLimiter
  usuarioDniMasked: string | null;  // "***5678" o null
  usuarioRol: string | null;
  limiteEfectivo: number | null;
  tokensConsumidos: number | null;
  fueRechazado: boolean;
  ipAddress: string | null;
  fecha: string;  // ISO string desde BE
}

export interface RateLimitEventFiltro {
  dni?: string;
  rol?: AppUserRoleValue | null;
  endpoint?: string;
  policy?: RateLimitPolicy | null;
  soloRechazados?: boolean;
  desde?: Date | null;
  hasta?: Date | null;
  take?: number;  // default 200
}
```

### Feature flag

```typescript
// environment.ts (producción) — arrancar false
features: {
  ...,
  rateLimitMonitoring: false,
}

// environment.development.ts — habilitado para QA
features: {
  ...,
  rateLimitMonitoring: true,
}
```

### Menú (`intranet-menu.config.ts`)

Agregar item:

```typescript
{
  label: 'Rate Limit',
  routerLink: '/intranet/admin/rate-limit-events',
  icon: 'pi pi-shield',
  modulo: 'sistema',
  group: { label: 'Monitoreo' },
  featureFlag: 'rateLimitMonitoring',
  roles: [Roles.Director, Roles.AsistenteAdministrativo, Roles.Promotor, Roles.CoordinadorAcademico],
}
```

Verificar si `featureFlag` ya es un campo soportado en el builder del menú. Si no, agregar lógica: items con flag `undefined` siempre aparecen; items con flag solo si `environment.features[flag]` es `true`.

## TESTS MÍNIMOS

### Facade

1. `load(filtro)` sin filtros → llama al service con `take=200` por defecto; setea items y `loading=false` al terminar
2. `load()` con 429 del backend → setea `error` y no propaga
3. `updateFilter(partial)` → dispara `load` con filtro mergeado (debounce 300ms si se implementa)
4. `clearFilters()` → resetea filtros a default y dispara `load`

### Store

1. `setItems(lista)` → `items()` refleja la lista
2. `setLoading(true/false)` → toggle correcto
3. `setFilter(partial)` → merge de `partial` sobre `filter()` actual

### Components presentational

1. `rate-limit-stats`: dado `{ total, totalRechazados, topRoles, topEndpoints }` input, renderiza 4 cards con valores correctos
2. `rate-limit-table`: click en fila emite `rowSelected` con el evento completo
3. `rate-limit-filters`: cambio en dropdown emite `filterChange` con el delta

### Guards menú

1. Con `rateLimitMonitoring = false` → item NO aparece en el menú ni la ruta es alcanzable
2. Con `rateLimitMonitoring = true` + rol Director → item aparece; ruta accede
3. Rol Profesor/Estudiante/Apoderado → 403 (guardado por backend con `[Authorize(Roles.Administrativos)]`)

## REGLAS OBLIGATORIAS

### Arquitectura

- Standalone components con `OnPush`
- Facade + Store pattern (`rules/architecture.md` + `rules/crud-patterns.md`)
- `Signals` para estado local + ViewModel (`readonly vm = computed(...)`)
- `takeUntilDestroyed(this.destroyRef)` en todas las subscripciones del facade

### Design System

- Páginas B1-B11 de `rules/design-system.md` (container con border no background, page-header, stat cards, filter bar, tabla, drawer de detalle)
- **Azul oscuro `#1e40af`/`var(--blue-800)` sobre fondo claro**, nunca celeste del tema (`rules/a11y.md` §Azul sobre fondo claro)
- `<p-tag>` con `styleClass="tag-neutral"` para rol/policy (informativo); con `severity="danger"` sin `tag-neutral` para "Rechazado" (crítico/operativo)
- Botón refresh icon-only → `[pt]="{ root: { 'aria-label': 'Refrescar' } }"` (a11y)
- Dropdowns con `appendTo="body"` siempre (`rules/primeng.md`)

### Otras

- `logger` nunca `console.log` (`rules/code-style.md`)
- Nombres de archivos kebab-case en inglés; rutas URL en español (`rules/code-language.md`)
- DTOs consumen la respuesta del BE que ya viene con DNI enmascarado — **no intentar desenmascarar ni loggear DNI crudo**
- Feature flag respetado tanto en menú como en ruta
- Skeleton mientras carga datos (`rules/skeletons.md` + `rules/lazy-rendering.md`) — usar `<app-table-skeleton>` y `<app-stats-skeleton>`
- `rules/templates.md` — sin funciones en bindings; solo `computed()` y signals
- `rules/eslint.md` — respetar layer-enforcement: component no importa HttpClient ni Store directo

## APRENDIZAJES TRANSFERIBLES (del Chat 1 BE)

1. **Tabla `RateLimitEvent` ya existe** en BD de prueba con convención `REL_` (alineada con `ErrorLog.ERL_`). En producción queda pendiente de deploy coord (ver PRE-WORK §1).
2. **Endpoint BE ya vivo**: `GET /api/sistema/rate-limit-events` con filtros `dni/rol/endpoint/policy/soloRechazados/desde/hasta/take`, `[Authorize(Roles = Roles.Administrativos)]`, `[EnableRateLimiting("heavy")]`. Response: `ApiResponse<List<RateLimitEventListaDto>>`.
3. **DNI viene enmascarado** en el DTO (`usuarioDniMasked: "***5678"`). No hay campo con DNI crudo. Para filtrar por DNI, el request acepta DNI completo (el service lo normaliza con `DniHelper.Normalizar()` antes de comparar).
4. **Campo `policy` puede ser `null`** — el `GlobalLimiter` del rate limiter nativo no tiene nombre, así que cuando es rechazado por él, el middleware persiste `policy = null`. Mostrar como "—" o "global" en la UI.
5. **Campo `fueRechazado`**: hoy SIEMPRE `true` (F1 solo persiste rechazos). El campo queda como `false` para F2 cuando se habilite early warning. La columna y filtro existen, pero en la vista actual todos los eventos son rechazos.
6. **Middleware fire-and-forget**: la persistencia ocurre en `Task.Run` con scope propio. En producción con volumen bajo esperar ~50-100ms de delay antes de que el evento aparezca en el endpoint GET.
7. **`correlationId`** se toma del response header `X-Correlation-Id` que setea `CorrelationIdMiddleware`. Cruzable con `ErrorLog.ERL_CorrelationId` (si el 429 también generó un error log — casi nunca pasa, pero el link es útil como fallback).
8. **Rate limit del propio endpoint**: el GET de esta vista usa policy `heavy` (5 req/min por userId). En el dev, refreshes rápidos pueden chocar con eso. **No es bug**, es intencional para no colapsarse a sí mismo. El FE debe manejar 429 en la carga con retry educado (esperar `Retry-After` header).
9. **ApiResponse unwrap**: el `httpInterceptor` de `apiResponse` desenvuelve `{ success: true, data: [...] }` automáticamente. El service FE llama `http.get<RateLimitEventListaDto[]>(url)` — NO `http.get<ApiResponse<...>>()`.
10. **Testing BE backbone**: `TestDbContextFactory` + `ControllerTestBase` + `ClaimsPrincipalBuilder` ya existen. No montar `WebApplicationFactory` para tests adicionales — usar reflection (como hicieron `AsistenciaAdminControllerAuthorizationTests` y `RateLimitEventsControllerAuthorizationTests` creado en Chat 1).
11. **Rutas de plan**: este chat NO cierra Plan 26 F1. Cierra F1.5 + F1.6 que son los dos items FE pendientes. Con Chat 2 cerrado, F1 pasa a 100% y Plan 26 queda en ~15-20% (quedan F2-F5).
12. **Deploy coord**: BE ya desplegado en Azure (teóricamente, aún no confirmado con usuario). SQL prod pendiente. Deploy FE es independiente (Netlify) — puede ir antes o después del SQL. Si FE va primero sin tabla, el endpoint devolverá lista vacía (sin crashear).

## FUERA DE ALCANCE

- **F2 en adelante** — cualquier cambio a policies o multipliers de rol. Esta vista es **solo observación**.
- **Early warning >80%** — diferido a F2. El middleware ya tiene método `LogEarlyWarningAsync` pero sin llamador; no activar en este chat.
- **Acciones sobre eventos** — bloquear usuario, exportar a Excel, etc. Versión actual solo muestra datos. Exportación se añade si F1 expone necesidad real.
- **Gráfico de timeline** — no en este chat. Si los stats client-side son simples (cards), no forzar chart.js / primeng-chart. Si se pide, es scope de un Chat 3.
- **Endpoint de stats B si el volumen lo amerita** — decidir al inicio. Si se agrega, queda en alcance BE **solo** en este chat, no en uno separado.
- **Cambios en `RateLimitingExtensions.cs`** — las 6 policies actuales NO se tocan.
- **Job de purga** — diferido a F5 o a un chat específico cuando la tabla tenga volumen real (30+ días).

## CRITERIOS DE CIERRE

```
[ ] Usuario confirmó si ejecutó CREATE TABLE en producción (o si se difiere — en cuyo caso la vista va a mostrar lista vacía pero funciona)
[ ] Ruta /intranet/admin/rate-limit-events gated por feature flag rateLimitMonitoring
[ ] Menú: item nuevo en módulo Sistema grupo Monitoreo, solo visible con flag on + rol admin
[ ] Stats cards renderizan total/rechazados/top-rol/top-endpoint (client-side si opción A, desde endpoint si opción B)
[ ] Filtros funcionan: búsqueda por endpoint, dropdowns rol + policy + soloRechazados, date range
[ ] Tabla con paginación PrimeNG, skeleton loader, y tag-neutral/critical según el caso
[ ] Drawer de detalle con todos los campos + botón copy-to-clipboard del correlationId
[ ] DNI siempre viene enmascarado del BE — nunca mostrar crudo ni loggear
[ ] Profesor/Estudiante/Apoderado con flag on → 403 desde BE (verificado con curl o manual)
[ ] Smoke test manual: generar un 429 en dev (golpear /api/reports/heavy 6 veces) → ver el evento aparecer en la vista admin
[ ] Tests FE verdes (~18 nuevos, 0 regresiones sobre baseline actual)
[ ] Lint + build FE limpios
[ ] Si se optó por opción B stats → tests BE verdes (~5 nuevos) + build BE limpio
[ ] Plan maestro actualizado: F1.5 ✅ + F1.6 ✅ + Plan 26 pasa a ~20-25% con F1 100%
[ ] Mover este archivo a educa-web/.claude/chats/closed/ al cerrar el chat
[ ] Commit FE (+ BE si aplica) con mensajes sugeridos abajo
```

## COMMIT MESSAGE sugerido

### FE (obligatorio — repo `educa-web`, branch `main`)

Subject (≤ 72 chars):

```
feat(admin): Plan 26 Chat 2 — rate limit admin view + "rateLimitMonitoring" flag
```

Body:

```
Ship admin-only page "/intranet/admin/rate-limit-events" behind feature
flag "rateLimitMonitoring" (off in prod, on in dev). Shows stats cards
(total, rejected, top role, top endpoint), filter bar (endpoint search,
role, policy, rejected-only, date range), and paginated table of events
fed by "GET /api/sistema/rate-limit-events".

Menu entry added under "Sistema" > "Monitoreo" group, gated by the flag
and visible only to "Roles.Administrativos".

Detail drawer exposes full "correlationId" for cross-lookup with
"ErrorLog" when needed. DNI stays masked end-to-end — backend already
returns "***NNNN" in the DTO and the UI never handles the raw value.

Closes Plan 26 F1.5 and F1.6. F1 reaches 100%; Plan 26 moves to ~20%.
Next: F2 (role multiplier + endpoint override) once telemetry has
captured 1-2 weeks of real traffic.

Respects design-system B1-B11, a11y rules (aria-label on icon-only
buttons, blue-800 over light surfaces, never theme primary). Component
uses facade + store pattern with OnPush and signals.
```

### BE (solo si se agrega endpoint `/stats` — opción B — repo `Educa.API`, branch `master`)

Subject (≤ 72 chars):

```
feat(sistema): Plan 26 Chat 2 — rate limit stats endpoint
```

Body:

```
Add "GET /api/sistema/rate-limit-events/stats?horas=24" returning an
aggregated snapshot (total, totalRechazados, topRoles, topEndpoints)
for the admin dashboard view.

Uses "AsNoTracking()" + "GroupBy" over the "IX_RateLimitEvent_Fecha"
index. Same "[Authorize(Roles = Roles.Administrativos)]" +
"[EnableRateLimiting("heavy")]" as the list endpoint.

Respects INV-D05 (read-only queries), INV-D08 ("ApiResponse<T>"), and
the 300-line cap.
```

**Reglas del skill `commit`**: inglés imperativo, español solo entre `"..."` para términos de dominio que viven en código/BD/UI (`"rateLimitMonitoring"`, `"Roles.Administrativos"`, `"/intranet/admin/rate-limit-events"`, `"GET /api/sistema/rate-limit-events"`), **NUNCA `Co-Authored-By`**, subject ≤ 72 chars.

## CIERRE

Al terminar, confirmar con el usuario:

1. **Deploy SQL en producción** — ¿se ejecutó? Si no, agendar ventana (lunes/jueves) para deploy coord SQL + redeploy BE + redeploy FE con flag on en dev, off en prod. **Recomendación**: activar flag en prod solo cuando el usuario quiera ver la vista; mientras tanto está en modo "captura silenciosa" (BE poblando tabla, FE dormido tras flag off).
2. **Retención** — ¿90 días o 30 días inicial? Si la tabla crece rápido (>5000 eventos/día), considerar job de purga nocturno en un Chat 2.5 o esperar a F5.
3. **Timeline para F2** — ¿1 semana de observación o 2? Feedback a pedir al usuario: qué 5 endpoints aparecen más veces rechazados y qué rol los ejecuta. Ese dato calibra los multipliers iniciales.
4. **Opción A vs B (stats)** — reportar qué se eligió y por qué. Si fue A (client-side), documentar el umbral de take (200) y avisar que si el volumen crece, se migra a B.
5. **Hallazgos sorprendentes** — cualquier endpoint que aparezca rechazado que **no debería** (ej: un GET que se pensaba barato y está en `global-read` golpeado). Reportar como input para F2.
