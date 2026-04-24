> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 24 · **Chat**: 3 · **Fase**: F3.FE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #1.

---

# Plan 24 Chat 3 — FE: Progreso visible de sync CrossChex + navegación libre

## PLAN FILE

- Plan canónico: **inline en el maestro** bajo sección **"🟡 Plan 24 — Sincronización CrossChex en Background Job"** (`.claude/plan/maestro.md` líneas ~637-692).
- Origen: UX actual bloquea al Director 2+ minutos con un spinner indefinido cada vez que sincroniza CrossChex. Chats 1 y 2 del BE cerrados: sync ahora corre en Hangfire + broadcast SignalR del progreso. Este chat reemplaza el spinner por un `p-progressBar` con mensaje dinámico y permite que el admin navegue libremente mientras el sync corre en background.

## OBJETIVO

Reemplazar el spinner bloqueante de `POST /api/asistencia-admin/sync` por una UX no-bloqueante:

1. Al disparar sync, la UI recibe `202 Accepted { jobId, estado: "QUEUED" }` y muestra un `p-progressBar` inline en la página de asistencias con estado/fase/mensaje.
2. La suscripción al `AsistenciaHub` vive en un **servicio singleton** (`providedIn: 'root'`) → sobrevive navegación. El admin puede salir de `/intranet/admin/asistencias` y volver — sigue viendo el progreso.
3. Eventos `"SyncProgress"` del hub actualizan el signal central de estado. La UI es reactiva.
4. Al recibir `COMPLETED` → toast success + refetch de la tabla. Al recibir `FAILED` → toast error con `error` del DTO.
5. Si el admin refresca la página mientras hay job activo, `POST /sync` devuelve `409 Conflict` con el `jobId` existente → la UI lee el jobId de la respuesta, se suscribe al hub y retoma el progreso. Alternativamente, si navegar no conserva el jobId en memoria, hay `GET /sync/{jobId}/status` como fallback.

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** `src/app/features/intranet/pages/admin/attendances/attendances.component.ts:209-225` — método `onSincronizar()` actual. Replicar la intención pero dispatcheando al nuevo facade.
2. **Leer** `src/app/features/intranet/pages/admin/attendances/services/attendances-data.facade.ts:129-154` — el `.subscribe()` directo a `POST /sync`. Se reemplaza por: emitir al servicio singleton → suscripción hub + update del signal.
3. **Leer** `src/app/core/services/signalr/` — estructura completa. Ya existe `SignalRService` (chat) y `AsistenciaSignalRService`. Usar el segundo como base; **no crear uno nuevo** salvo que la responsabilidad no quepa.
4. **Leer** `Educa.API/Hubs/AsistenciaHub.cs` (referencia BE) — métodos `SubscribeToSyncJob(jobId)` y `UnsubscribeFromSyncJob(jobId)`. Regex `^[a-f0-9]{32}$` en BE rechaza jobIds inválidos con `HubException` — el FE debe enviar el jobId exacto como string de 32 chars hex.
5. **Leer** `Educa.API/DTOs/Asistencias/CrossChexSyncStatusDto.cs` (referencia BE) — el shape exacto del payload. Campos: `jobId`, `estado` (`QUEUED|RUNNING|COMPLETED|FAILED`), `paginaActual`, `totalPaginas`, `fase`, `mensaje`, `error`, `fechaInicio`, `fechaFin`. El FE crea una interface mirror.
6. **Leer** `src/app/features/intranet/pages/cross-role/attendance-component/services/asistencia-signalr.service.ts` (si existe) — patrón de suscripción al hub + takeUntilDestroyed.
7. **Leer** `.claude/rules/state-management.md` + `.claude/rules/architecture.md` sección "State / Store" — regla: signal privado + `asReadonly()` + triggers `Subject`; nunca exponer el observable del hub.
8. **Leer** `.claude/rules/primeng.md` — `p-progressBar` import + API (`value` input, `mode="indeterminate"` para fase QUEUED sin páginas aún).

## DECISIONES A VALIDAR CON EL USUARIO (antes de tocar código)

5 decisiones no triviales. **Todas con recomendación del brief** — el usuario puede aceptar el lote completo o ajustar.

1. **Ubicación del signal global de sync**: servicio nuevo en `@core/services/signalr/crosschex-sync-status.service.ts` vs extender `AsistenciaSignalRService` existente.
   - **Recomendación**: **servicio nuevo** dedicado (`CrossChexSyncStatusService`). Razón: el feature es específico y singleton con ciclo de vida propio (un job activo a la vez). Mezclar con asistencia real-time genera acoplamiento innecesario. El nuevo servicio reusa la conexión `HubConnection` del hub ya existente (no abre segunda conexión).

2. **Persistencia del jobId activo**: solo en signal (pierde en refresh) vs signal + sessionStorage para recuperación.
   - **Recomendación**: **signal + sessionStorage**. Si el admin refresca F5, se lee el jobId del storage, se llama `GET /sync/{jobId}/status` para rehidrar el estado, y se resuscribe al hub. Si `status === COMPLETED` o `FAILED`, se muestra el estado final y se limpia el storage.

3. **Ubicación visual del progress bar**: dentro del header de la tabla de asistencias vs banner full-width arriba de toda la página vs toast persistente global.
   - **Recomendación**: **banner full-width arriba de la página**, pero **inline** (no fixed overlay). Cuando el admin navega fuera de `/intranet/admin/asistencias`, el banner NO lo sigue (el toast success/error al COMPLETED/FAILED sí es global). El banner vive en `attendances.component.html`. Si se quiere visibilidad cross-página, se puede agregar un chip global en la esquina del header del layout — **fuera de alcance de este chat**.

4. **Comportamiento al disparar un segundo sync con uno activo**: bloquear el botón vs permitir + mostrar toast del 409 vs confirmar con dialog.
   - **Recomendación**: **botón deshabilitado** mientras `estado !== COMPLETED && estado !== FAILED` con tooltip "Hay un sync en curso". Al completar, se rehabilita. Si por alguna razón el frontend pierde el estado (raro) y el usuario clickea, el 409 del BE devuelve el jobId existente → el facade reusa ese jobId en lugar de tirar error.

5. **Mensaje del progress bar según fase**: formato exacto.
   - **Recomendación**: seguir la tabla del plan:
     - `QUEUED`: "Encolando sincronización…" + bar indeterminate
     - `RUNNING` sin página: "Iniciando…" + bar indeterminate
     - `RUNNING` con página: "Descargando página {paginaActual}/{totalPaginas} — esperando CrossChex…" + bar `value = paginaActual / totalPaginas * 100`
     - `RUNNING` fase "procesando": "Procesando {X} registros…" (X del campo `mensaje` si el BE lo incluye)
     - `COMPLETED`: banner se oculta + toast success "Sincronización completada. Refrescando tabla…"
     - `FAILED`: banner se pinta en rojo + toast error con `error` del DTO. Botón "Reintentar" dispara nuevo sync.

Durante el chat, el usuario acepta/ajusta las 5 decisiones antes de escribir código.

## ALCANCE

### Archivos a crear

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|------:|
| 1 | `src/app/core/services/signalr/crosschex-sync-status.service.ts` | Servicio singleton — signal central + suscripción hub + sessionStorage | ~180 |
| 2 | `src/app/core/services/signalr/crosschex-sync-status.models.ts` | Interface mirror de `CrossChexSyncStatusDto` + tipo `SyncEstado` | ~40 |
| 3 | `src/app/features/intranet/pages/admin/attendances/components/crosschex-sync-banner/crosschex-sync-banner.component.ts` + `.html` + `.scss` | Banner full-width con `p-progressBar` + estado + botón reintentar | ~150 |
| 4 | `src/app/core/services/signalr/crosschex-sync-status.service.spec.ts` | Tests del servicio (hub connect, events, storage, recovery) | ~180 |
| 5 | `src/app/features/intranet/pages/admin/attendances/components/crosschex-sync-banner/crosschex-sync-banner.component.spec.ts` | Tests de render por fase (QUEUED/RUNNING/COMPLETED/FAILED) | ~100 |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/features/intranet/pages/admin/attendances/services/attendances-data.facade.ts` | `onSincronizar()` ya no hace `.subscribe()` bloqueante. Llama `POST /sync`, extrae `jobId` de la respuesta (o del 409), y se lo pasa al `CrossChexSyncStatusService.startTracking(jobId)`. |
| `src/app/features/intranet/pages/admin/attendances/attendances.component.ts` | Import del nuevo banner + servicio. Método `onSincronizar()` dispara el sync. `disabled` del botón lee `syncService.isActive()`. |
| `src/app/features/intranet/pages/admin/attendances/attendances.component.html` | `<app-crosschex-sync-banner />` arriba de la tabla (visible solo si `syncService.hasActiveJob()`). |
| `src/app/core/services/signalr/index.ts` | Exportar el nuevo servicio. |
| `src/app/core/services/storage/storage.service.ts` + `session-storage.service.ts` | 2 métodos nuevos: `getCrossChexJobId()` / `setCrossChexJobId(id \| null)`. Key: `educa_crosschex_sync_job`. |

### Contrato de modelos (mirror del BE)

```typescript
// @core/services/signalr/crosschex-sync-status.models.ts
export type SyncEstado = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface CrossChexSyncStatusDto {
  jobId: string;              // 32 hex chars
  estado: SyncEstado;
  paginaActual: number | null;
  totalPaginas: number | null;
  fase: string | null;        // libre: "Descargando", "Procesando", etc.
  mensaje: string | null;
  error: string | null;       // solo si estado = FAILED
  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface IniciarSyncResponse {
  jobId: string;
  estado: 'QUEUED';
}

// 409 Conflict devuelve este shape:
export interface SyncConflictResponse {
  jobId: string;
  estado: SyncEstado;
  mensaje: string;
}
```

### Estructura del servicio singleton

```typescript
@Injectable({ providedIn: 'root' })
export class CrossChexSyncStatusService {
  // state
  private readonly _status = signal<CrossChexSyncStatusDto | null>(null);
  readonly status = this._status.asReadonly();
  readonly hasActiveJob = computed(() => {
    const s = this._status();
    return s !== null && s.estado !== 'COMPLETED' && s.estado !== 'FAILED';
  });
  readonly isActive = this.hasActiveJob; // alias semántico

  // commands
  startTracking(jobId: string): void { ... }  // suscribe hub + guarda storage
  stopTracking(): void { ... }               // unsubscribe + limpia storage + clear signal
  rehydrate(): void { ... }                  // ngDoBootstrap → lee storage → GET status → start
}
```

## TESTS MÍNIMOS

| Caso | Setup | Esperado |
|------|-------|----------|
| `startTracking(jobId)` suscribe al hub | Hub mock | `hub.invoke('SubscribeToSyncJob', jobId)` llamado 1 vez |
| Evento `SyncProgress` RUNNING actualiza signal | Emit payload desde mock hub | `status().estado === 'RUNNING'`, `paginaActual` seteado |
| Evento `SyncProgress` COMPLETED limpia storage | Emit con `estado: COMPLETED` | `status().estado === 'COMPLETED'`, `hasActiveJob() === false`, `storage.getCrossChexJobId() === null` |
| `startTracking` llamado dos veces seguidas con distinto jobId | — | Primero `UnsubscribeFromSyncJob(jobId1)` luego `SubscribeToSyncJob(jobId2)` |
| `rehydrate()` con jobId en storage + status COMPLETED | Mock `GET /status` devuelve COMPLETED | Banner muestra estado final + toast success + limpia storage |
| `rehydrate()` con jobId en storage + status RUNNING | Mock GET devuelve RUNNING | Se resuscribe al hub + banner visible |
| Banner render QUEUED | Signal con `estado: QUEUED` | Progress bar indeterminate + texto "Encolando…" |
| Banner render RUNNING con páginas | `paginaActual=3, totalPaginas=5` | Progress bar con `value=60`, texto "Descargando página 3/5…" |
| Banner render FAILED con error | `estado: FAILED, error: "Timeout"` | Banner rojo + botón "Reintentar" + texto del error |
| Facade dispatcha sync — 202 Accepted | Mock devuelve `{ jobId, estado: QUEUED }` | `syncService.startTracking(jobId)` llamado |
| Facade dispatcha sync — 409 Conflict con jobId activo | Mock devuelve 409 con `jobId` existente | `syncService.startTracking(jobId-existente)` llamado, no se muestra toast error |
| Botón sync disabled mientras hay job activo | `syncService.isActive() === true` | Button disabled + tooltip "Hay un sync en curso" |

Framework: **Vitest** + `@angular/core/testing` + jsdom. Mock del hub via fake `HubConnection` que expone `invoke()` + `on()` + trigger manual de eventos.

**Baseline esperado**: suite FE actual (1554) + 8-12 tests nuevos → ~1564 verdes.

## REGLAS OBLIGATORIAS

**Arquitectura & Stack**:
- Componente standalone + `ChangeDetectionStrategy.OnPush` en banner y attendances.component (ya lo tiene).
- `inject()` over constructor. `DestroyRef` via inject. `takeUntilDestroyed(this.destroyRef)` en TODO `.subscribe()`.
- Imports con alias (`@core`, `@shared`, `@features/intranet/*`, `@data`, `@config`) — regla `code-style.md`.
- **Signals** para estado. Signal privado `_status` + `.asReadonly()` + `computed` derivados.
- **Logger** (`@core/helpers/logs`), nunca `console.log`. Tag: `logger.tagged('CrossChexSync:Service', ...)`.
- **Cap 300 líneas** por archivo TS (regla ESLint `max-lines`).

**SignalR**:
- Reusar la `HubConnection` del hub existente — no abrir conexión secundaria. Si `AsistenciaSignalRService` ya maneja el hub, inyectar ese servicio y usar su método de exposición.
- `subscribe` / `unsubscribe` con guard de idempotencia (no duplicar suscripciones si `startTracking` se llama dos veces con el mismo jobId).
- Manejar `hubConnection.onclose` + reconnect — cuando el hub se reconecta, resuscribir al grupo si hay jobId activo.

**Design system** (ver `design-system.md`):
- Banner con **border + radius, NO background liso** salvo cuando `FAILED` (usar `color-mix()` con `--red-500` al 12%).
- `p-progressBar` default (tema Aura) + override local del color de track si hace falta — ver B9 (alert banners).
- Botón "Reintentar" con `p-button-outlined p-button-danger p-button-sm` + `[pt]` aria-label.
- **Tokens de color** (sección 8): `var(--red-500)`, `var(--red-600)`, `var(--green-600)`, `var(--blue-800)` — **NO hex literal**.
- Texto del mensaje: 0.9rem normal. Fase en 0.8rem secondary.

**PrimeNG**:
- Import `ProgressBarModule` en el banner component.
- Botón icon-only con `[pt]="{ root: { 'aria-label': 'Reintentar sincronización' } }"`.

**Templates** (`templates.md`):
- Todo binding usa **signal directo** o **computed** — nunca funciones en template.
- `@if @else if @else` encadenado para las 4 fases (QUEUED/RUNNING/COMPLETED/FAILED).
- NO getters en template.

**Optimistic UI / WAL**:
- **NO aplica** — este flujo es notification/read-only (el único write es `POST /sync` que ya es async). El facade NO usa `WalFacadeHelper`. Ver `optimistic-ui.md` — aplica solo a mutaciones con rollback posible.

**Rate limiting**:
- `POST /sync` tiene rate limit `batch` + `[RateLimitOverride(3.0)]` = 15/min (5× el base). 429 al disparar rápido: mostrar toast + deshabilitar botón durante el `Retry-After`.

**a11y**:
- Progress bar con `aria-valuenow` / `aria-valuemax` — PrimeNG lo hace por default cuando usás `value`.
- Mensaje del estado anunciado a lectores via `aria-live="polite"` en el banner.

**Storage**:
- Key `educa_crosschex_sync_job` en `sessionStorage` — el job muere con la sesión. Si se quiere persistir entre cierres del navegador, migrar a `localStorage` en un chat posterior.

## APRENDIZAJES TRANSFERIBLES (del Plan 30 Chat 2 FE cerrado hoy)

**Sobre PrimeNG + View Encapsulation** (que pueden ahorrar horas):

1. **SVG custom dentro de Angular**: si vas a renderizar `<rect>`, `<text>`, etc. dentro de un SVG con `@for`, los estilos del `.scss` con `.chart-svg .mi-clase` **no se aplican** por ViewEncapsulation emulado. Solución: `<style>` interno al SVG (parseado por el navegador fuera del scope Angular). Para `p-progressBar` **no aplica** — el componente maneja sus estilos.
2. **PrimeNG `.p-datatable-table-container` trae scroll horizontal por default**. Si usas `table` en el banner o algo similar, overridear con `overflow-x: hidden !important` + specificity alta. Para el progress bar no aplica.
3. **Patrón `:host ::ng-deep .componente-primeng` con `!important`** gana a la mayoría de resets de PrimeNG 21. Usar cuando los estilos globales del tema Aura ganan sobre los del componente.
4. **Feature flag pattern**: este chat NO necesita feature flag (el sync ya existía, estamos mejorando UX). Pero si el usuario pide un rollout gradual, ver patrón usado en Plan 30 Chat 2 (`emailOutboxDashboardDia` en `environment.ts` + `environment.development.ts` + spread condicional en routes).

**Sobre signals + reactive services**:

5. **Signal central en servicio singleton**: patrón canónico del proyecto. Private `_signal` + `.asReadonly()` + `computed` derivados. Componentes consumen via `inject()`.
6. **Toast service**: `ErrorHandlerService.showSuccess(summary, detail, life)` y `showError(summary, detail, life)`. Fire-and-forget — el service maneja la integración con PrimeNG `MessageService` via `ToastContainerComponent` global.
7. **Logger tagged pattern**: `logger.tagged('CrossChexSync:Service', 'info', 'mensaje', { ctx })` — permite filtrar por tag en dev tools.

**Sobre tests**:

8. **Vitest + TestBed**: `TestBed.configureTestingModule({ providers: [ServiceUnderTest, { provide: Dep, useValue: mock } ] })` y `TestBed.inject()`. Hub mock: crear un objeto con `invoke: vi.fn()` y `on: vi.fn()` que guarda callbacks, luego disparar manualmente con el payload deseado.
9. **Componentes standalone en spec**: `imports: [ComponentUnderTest]` directo, sin NgModule. `fixture.componentRef.setInput('name', value)` para inputs `input()` / `input.required()`.

**Sobre el BE del Plan 24 (para entender el contrato)**:

10. **`POST /sync` devuelve 202 Accepted + body**: `{ jobId, estado: "QUEUED" }`. Rate limit = `batch` + `[RateLimitOverride(3.0)]` = 15/min.
11. **`POST /sync` con job activo devuelve 409 Conflict + body**: `{ jobId, estado, mensaje }`. El FE debe leer el `jobId` del 409 y suscribirse — es UX conveniente, no error.
12. **`GET /sync/{jobId}/status` siempre responde**: sirve para rehidratar tras refresh F5. Policy `reads`.
13. **Emisiones del hub en 4 momentos**: QUEUED inicial (desde controller), RUNNING (al iniciar runner), `onPageProgress` (cada página), COMPLETED o FAILED. Total 3-N eventos por sync.
14. **Grupo SignalR = `"crosschex-sync-{jobId}"`** — prefijo largo. El jobId es un string de 32 hex chars.
15. **Hub methods**: `SubscribeToSyncJob(jobId: string)` y `UnsubscribeFromSyncJob(jobId: string)`. Validación regex del BE: si el jobId no matchea `^[a-f0-9]{32}$`, tira `HubException`.
16. **Payload del evento `"SyncProgress"`**: `CrossChexSyncStatusDto` tal cual. Mismo shape que `GET /sync/{jobId}/status`.
17. **INV-S07**: el BE protege el envío del hub con try/catch + LogWarning — si SignalR cae, el job SIGUE corriendo. El FE puede caer en un gap informativo breve. Solución defensiva: polling fallback cada 15-30s como red de seguridad (fuera de alcance de este chat salvo pedido).

## FUERA DE ALCANCE

- **Polling fallback cuando el hub se desconecta** — si el hub tiene issues, el FE queda sin info pero el job sigue. Agregar polling `GET /status` cada 30s como backup es deuda técnica menor; evaluar post-deploy si pasa.
- **Chip global de sync en el header del layout** — por ahora el banner vive solo en `/intranet/admin/asistencias`. Si el admin navega fuera, no ve el progress. Toast success/error al COMPLETED/FAILED sí es global.
- **Cancelar sync desde el FE** — no hay endpoint `DELETE /sync/{jobId}` en el BE; no se puede cancelar. Si se pide, es un Chat 4+.
- **Validar `Task.Delay(30000)` entre páginas** — Plan 24 Chat 4 BE. No tocar acá.
- **Historial de syncs** — no hay pantalla para ver jobs pasados. Si se pide, otro chat.
- **Feature flag** — no se necesita. El feature reemplaza funcionalidad existente (sync ya existía), no agrega una pantalla nueva.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 10 min)
[ ] Leer attendances.component.ts / facade (patrón actual de onSincronizar)
[ ] Leer asistencia-signalr.service (patrón de hub connection y subscribe/on)
[ ] Leer business-rules.md sección INV-S07 (fire-and-forget del hub)
[ ] Confirmar con usuario las 5 DECISIONES antes de codear

CÓDIGO
[ ] Models mirror del DTO (SyncEstado type + CrossChexSyncStatusDto + Iniciar/Conflict responses)
[ ] CrossChexSyncStatusService singleton con signal privado + asReadonly + computed hasActiveJob/isActive
[ ] startTracking / stopTracking / rehydrate implementados con storage + hub
[ ] AttendancesDataFacade.onSincronizar refactorizado para usar el servicio (maneja 202 + 409)
[ ] CrossChexSyncBannerComponent standalone OnPush con p-progressBar + 4 estados + aria-live
[ ] AttendancesComponent integra el banner + disabled del botón sync
[ ] Storage methods en StorageService + SessionStorageService
[ ] Rehydrate disparado en app initializer o en AttendancesComponent ngOnInit (decisión 2)
[ ] Cap 300 líneas en todos los archivos

TESTS
[ ] Service spec — hub subscribe/unsubscribe, eventos, storage, recovery
[ ] Banner spec — render por los 4 estados
[ ] Integration spec del facade (opcional — 202 y 409 flows)
[ ] npm test verde — delta esperado +8 a +12

DESIGN SYSTEM
[ ] Banner con border + color-mix() según estado (B9)
[ ] Botones icon-only con [pt] aria-label
[ ] Tokens de color (no hex literal)
[ ] aria-live polite en el banner para accesibilidad

VALIDACIÓN
[ ] npm run lint limpio (ningún warning nuevo)
[ ] npm run build limpio
[ ] npm test verde
[ ] Dev server: flujo manual
    1. Disparar sync → botón deshabilita + banner aparece con QUEUED
    2. Recibir primer RUNNING → bar indeterminate + mensaje "Iniciando…"
    3. Recibir RUNNING con páginas → bar % + "Descargando página X/Y…"
    4. Recibir COMPLETED → toast success + banner se oculta + tabla refetch + botón habilitado
    5. Navegar a otra página admin → volver a asistencias → banner sigue visible si job activo
    6. Refresh F5 mientras job activo → banner reaparece con estado actualizado
    7. Botón disabled mientras activo con tooltip correcto
    8. Simular FAILED → toast error + banner rojo + botón "Reintentar" funcional

MAESTRO
[ ] Actualizar cola: remover Plan 24 Chat 3 FE, agregar Plan 24 Chat 4 BE (validar Task.Delay + deploy)
[ ] Plan 24 row: ~50% → ~75% (Chat 3 de 4)
[ ] Si apareció feedback visual extra no cubierto → documentar como deuda

COMMIT
[ ] Un solo commit en educa-web main con subject sugerido abajo
[ ] Mover este archivo a educa-web/.claude/chats/closed/ en el commit docs del maestro
```

## COMMIT MESSAGE sugerido

### Commit FE (educa-web main)

**Subject** (≤ 72 chars):

```
feat(admin): Plan 24 Chat 3 — show CrossChex sync progress live
```

**Body**:

```
Replace the blocking spinner on "POST /api/asistencia-admin/sync"
with a non-blocking UX backed by SignalR (delivered by Plan 24
Chat 2 BE, commit 513c6cc in Educa.API master):

 - New singleton "CrossChexSyncStatusService" in @core/services/signalr
   subscribes to the "AsistenciaHub" group
   "crosschex-sync-{jobId}" and exposes a reactive signal with the
   live "CrossChexSyncStatusDto" shape.
 - Session-storage persistence of the active jobId — if the admin
   refreshes or leaves the page, the banner rehydrates from
   "GET /sync/{jobId}/status" on return.
 - New "CrossChexSyncBannerComponent" inside the attendances page
   shows a "p-progressBar" with four states: "QUEUED" (indeterminate),
   "RUNNING" (with page x/y percentage), "COMPLETED" (success toast
   + auto-hide + table refetch) and "FAILED" (red banner + retry
   button + error toast).
 - "AttendancesDataFacade.onSincronizar" no longer blocks —
   dispatches to the service and handles both 202 Accepted
   { jobId, estado: QUEUED } and 409 Conflict (existing job) by
   resubscribing to the returned jobId.
 - Sync button disabled while "syncService.isActive()" with tooltip
   "Hay un sync en curso".
 - "aria-live='polite'" on the banner for screen-reader announcements.

Tests:
 - Service: hub subscribe/unsubscribe, "SyncProgress" events,
   storage persistence, rehydrate-on-refresh.
 - Banner: render per state ("QUEUED" / "RUNNING" w/ pages /
   "COMPLETED" / "FAILED").
 - Facade flows: 202 Accepted and 409 Conflict.

Suite +8 to +12 tests, all green ("npm test"). Plan 24 row ~50%
→ ~75%.
```

### Commit docs-maestro (mismo repo, commit separado)

**Subject**:

```
docs(maestro): Plan 24 Chat 3 F3.FE ✅ cerrado — sync progress live
```

## CIERRE

Feedback a pedir al cerrar el Chat 36 (Plan 24 Chat 3 FE):

1. **Decisiones finales** — registrar las 5 decisiones aceptadas/ajustadas durante el chat.
2. **Chip global o no** — tras usar el banner una semana, ¿hace falta un chip en el layout header para ver el progress cross-página? Si sí, micro-chat dedicado.
3. **Polling fallback** — si SignalR tiene issues intermitentes en prod, evaluar agregar polling `GET /status` cada 30s como backup.
4. **Velocidad percibida** — el admin nota mejora real en la UX vs antes? Bench subjetivo: "antes 2 min bloqueado sin info" vs "ahora veo el progreso y puedo navegar". Esto informa si Plan 24 Chat 4 BE (revisar `Task.Delay` 30s → 5-10s) aporta valor marginal o es el acelerador real.
5. **Próximo chat** — el candidato natural es:
   - **Plan 24 Chat 4 BE** — validar rate limit real + revisar `Task.Delay(30000)` + deploy final. Último chat del Plan 24, cierra el feature.
6. **Mover brief** — `git mv .claude/chats/036-plan-24-chat-3-fe-progress-crosschex-sync.md .claude/chats/closed/` en el commit docs.
