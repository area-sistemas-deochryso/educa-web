> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 24 · **Chat**: 2 · **Fase**: F2.BE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #2 (el #1 es Plan 29 Chat 3 OPS, no es código).

---

# Plan 24 Chat 2 — Backend SignalR broadcast del progreso del sync CrossChex

## PLAN FILE

- Plan canónico: **inline en el maestro** (no tiene archivo separado). Ver [`../../educa-web/.claude/plan/maestro.md`](../../educa-web/.claude/plan/maestro.md) sección **"🟡 Plan 24 — Sincronización CrossChex en Background Job"** — Chat 2.
- Estado del Plan 24 tras Chat 1 cerrado 2026-04-23: **~25%** (1 de 4 chats). Commit BE del Chat 1: `299db24` en `Educa.API master`.

> **Nota**: Este chat es **ejecución pura**. El contrato `CrossChexSyncStatusDto` ya existe (lo definió Chat 1) — este chat debe reusarlo tal cual, no redefinirlo. Si surge la tentación de cambiar el shape, parar y avisar al usuario.

## OBJETIVO

Agregar broadcast de progreso SignalR desde el `CrossChexSyncJobRunner` (creado en Chat 1) hacia el `AsistenciaHub` existente. El frontend del Chat 3 podrá suscribirse a un grupo `sync-{jobId}` y recibir eventos `"SyncProgress"` en tiempo real en vez de polear cada 2-5s.

- **Evento nuevo**: `"SyncProgress"` emitido al grupo `"sync-{jobId}"` con payload **idéntico** a `CrossChexSyncStatusDto` (misma forma que devuelve `GET /sync/{jobId}/status`).
- **Métodos nuevos en `AsistenciaHub`**: `SubscribeToSyncJob(string jobId)` y `UnsubscribeFromSyncJob(string jobId)` que hagan `Groups.AddToGroupAsync` / `RemoveFromGroupAsync` con nombre `"sync-{jobId}"`.
- **Invariante del contrato**: lo que se emite por el hub es **bit-a-bit** lo mismo que responde el GET status. Un cliente que alterne entre polling y push debe ver el mismo shape sin adaptadores.

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** `Educa.API/Services/Asistencias/CrossChexSyncJobRunner.cs` (creado en Chat 1) — identificar las 4 transiciones donde se persiste estado a BD:
   - Inicio: `CSJ_Estado = "RUNNING"` + Fase `DESCARGANDO`
   - Callback de página: `CSJ_Pagina`, `CSJ_TotalPaginas`, Fase actualizada
   - Éxito: `CSJ_Estado = "COMPLETED"` + Fase `COMPLETADO`
   - Fallo: `CSJ_Estado = "FAILED"` + Fase `ERROR` + `CSJ_Error`
   - Cada una debe emitir el evento SignalR **después** del `SaveChangesAsync` (para que BD y hub emitan la misma versión).
2. **Leer** `Educa.API/Hubs/AsistenciaHub.cs` completo — confirmar autenticación (`[Authorize]` a nivel hub), grupos existentes por `sedeId`, método `OnConnectedAsync`. Los grupos `"sync-{jobId}"` conviven con los grupos de sede.
3. **Leer** `Educa.API/DTOs/AsistenciaAdmin/CrossChexSyncStatusDto.cs` (creado en Chat 1) — este DTO es el payload EXACTO. No agregar campos, no quitar, no renombrar.
4. **Leer** `Educa.API/Services/Comunicacion/ChatNotificationService.cs` — ejemplo de patrón `IHubContext<T>` inyectado + `SendAsync` a un grupo. Usarlo como plantilla de convención.
5. **Leer** `Educa.API/Controllers/Asistencias/AsistenciaAdminController.cs` endpoint `ObtenerEstadoSync` — construcción del DTO a partir de la entity. Reusar esa misma proyección en el runner (idealmente extraer a un helper estático compartido si aparece 2+ veces).

## DECISIONES A VALIDAR CON EL USUARIO (antes de tocar código)

Solo 3 decisiones no triviales:

1. **Nombre del grupo SignalR**: `"sync-{jobId}"` o `"crosschex-sync-{jobId}"`.
   - El JobId es GUID 32 chars — ambos funcionan. El prefijo más corto es más barato en ancho de banda (cientos de bytes).
   - **Recomendación**: `"sync-{jobId}"` — el hub `AsistenciaHub` es del dominio asistencia; "sync" sin prefijo redundante.
2. **Evento al conectarse: ¿emitir estado actual al suscriptor nuevo?**
   - Sí: cuando un cliente llama `SubscribeToSyncJob(jobId)` y ya hay un job corriendo, emitirle el estado actual para que no espere el siguiente update (~30s si está en medio del delay).
   - No: el cliente hace 1 GET status manual al suscribirse y luego depende del hub.
   - **Recomendación**: **Sí** — mejor UX, costo minúsculo (1 query + 1 mensaje al connectionId específico, no al grupo).
3. **Broadcast al marcar `QUEUED` (creación inicial desde controller)**:
   - El runner se ejecuta en Hangfire tras encolar; entre POST `/sync` y el primer evento RUNNING hay un gap de 0-500ms (Hangfire poll interval).
   - Opción A: emitir `QUEUED` desde el controller mismo (inyectar `IHubContext`) — cliente ve feedback inmediato.
   - Opción B: no emitir `QUEUED`; el primer evento es `RUNNING` del runner. El cliente ya tiene el jobId del 202 Accepted.
   - **Recomendación**: **B** — simple, el cliente muestra "Encolando…" localmente hasta que llegue el primer `SyncProgress`. Evita acoplar el controller al hub. Chat 3 FE puede manejar el estado "pre-SignalR-ready" con UI local.

Durante el chat, el usuario debe aceptar/ajustar cada una antes de que se escriba código.

## ALCANCE

### Archivos a crear

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|-----------------:|
| 1 | `Services/Asistencias/CrossChexSyncStatusDtoMapper.cs` (opcional) | Helper estático `ToDto(CrossChexSyncJob job)` — reusado por runner y controller para garantizar 1:1 shape | ~25 |

> El helper se crea **solo si** el mapeo aparece 2+ veces (runner + controller). Si aparece 1 vez, inline es más simple.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `Services/Asistencias/CrossChexSyncJobRunner.cs` | Inyectar `IHubContext<AsistenciaHub>`. Emitir `SyncProgress` tras cada `SaveChangesAsync` (4 puntos). Fire-and-forget: envolver cada emisión en `try/catch` con `LogWarning`, NO propagar al job (INV-S07). |
| `Hubs/AsistenciaHub.cs` | Agregar 2 métodos públicos: `SubscribeToSyncJob(string jobId)` y `UnsubscribeFromSyncJob(string jobId)`. Validar formato del jobId (32 hex chars) para no crear grupos arbitrarios. Si decisión 2 = Sí, también lookupear el job actual y emitir estado al `Context.ConnectionId`. |
| `Controllers/Asistencias/AsistenciaAdminController.cs` | Posible refactor: si el mapper helper se crea, usarlo aquí también (controller ya construye el DTO en `ObtenerEstadoSync`). |

### Contrato del evento (debe coincidir 1:1 con GET status)

```csharp
// Emitido al grupo "sync-{jobId}" en 4 momentos:
await _hub.Clients
    .Group($"sync-{job.CSJ_JobId}")
    .SendAsync("SyncProgress", new CrossChexSyncStatusDto
    {
        JobId = job.CSJ_JobId,
        Estado = job.CSJ_Estado,             // "RUNNING" | "COMPLETED" | "FAILED"
        Pagina = job.CSJ_Pagina,
        TotalPaginas = job.CSJ_TotalPaginas,
        Fase = job.CSJ_Fase,
        Mensaje = job.CSJ_Mensaje,
        IniciadoEn = job.CSJ_IniciadoEn,
        FinalizadoEn = job.CSJ_FinalizadoEn,
        Error = job.CSJ_Error,
    }, ct);
```

El hub entrega al grupo `"sync-{jobId}"` — solo los connectionIds suscritos lo reciben. Una sede diferente (grupo `"sede-{n}"`) NO se entera.

### Validación del jobId en el hub

```csharp
public async Task SubscribeToSyncJob(string jobId)
{
    // Evitar creación de grupos arbitrarios por clientes maliciosos.
    if (string.IsNullOrWhiteSpace(jobId) ||
        jobId.Length != 32 ||
        !System.Text.RegularExpressions.Regex.IsMatch(jobId, "^[a-f0-9]{32}$"))
    {
        throw new HubException("JobId inválido");
    }
    await Groups.AddToGroupAsync(Context.ConnectionId, $"sync-{jobId}");
    _logger.LogInformation("ConnectionId {Cid} suscrito a sync {JobId}", Context.ConnectionId, jobId);
}
```

## TESTS MÍNIMOS

| Caso | Setup | Esperado |
|------|-------|----------|
| `SubscribeToSyncJob` con jobId válido agrega al grupo | Mock `IGroupManager.AddToGroupAsync` | 1 llamada a `AddToGroupAsync(connectionId, "sync-{jobId}")` |
| `SubscribeToSyncJob` con jobId inválido lanza `HubException` | `jobId = "NOT-HEX"`, `""`, 33 chars | `HubException` lanzada, grupo no agregado |
| `UnsubscribeFromSyncJob` remueve del grupo | Mock | 1 llamada a `RemoveFromGroupAsync(connectionId, "sync-{jobId}")` |
| Runner emite `SyncProgress` en RUNNING | Mock `IHubContext`, sync retorna OK | Al menos 1 llamada a `SendAsync("SyncProgress", ...)` tras marcar RUNNING |
| Runner emite `SyncProgress` en cada página del callback | Mock sync invoca callback 3x | 3 `SendAsync("SyncProgress", ...)` adicionales |
| Runner emite `SyncProgress` en COMPLETED | Happy path | Último `SendAsync` con `Estado = "COMPLETED"` |
| Runner emite `SyncProgress` en FAILED | Sync lanza exception | `SendAsync` con `Estado = "FAILED"` + `Error != null` |
| Fallo de hub NO falla el job | Mock `SendAsync` lanza exception | Job termina en COMPLETED igualmente, `LogWarning` emitido, sin re-throw |

Framework: xUnit + FluentAssertions + Moq + `TestDbContextFactory` (ya soporta `CSJ_RowVersion`). Authz reflection: el hub ya tiene `[Authorize]` a nivel clase — reusar el pattern de `AsistenciaAdminControllerAuthorizationTests` si no hay test de hub authz aún.

## REGLAS OBLIGATORIAS

- **Cap 300 líneas** por archivo `.cs`. Runner ya ronda ~230 líneas tras Chat 1 — el broadcast suma ~20 líneas. Vigilar. Si se acerca, extraer el `EmitirProgresoAsync` a un método privado.
- **INV-S07** (fire-and-forget): un error al enviar por el hub NUNCA falla el job. Try/catch con `LogWarning`, no `LogError`, y continuar.
- **INV-D08**: el evento `SyncProgress` NO envuelve en `ApiResponse<T>` — los eventos SignalR son streams de payload directo, no HTTP envelopes. El GET status sí mantiene `ApiResponse<CrossChexSyncStatusDto>`.
- **Reuso del DTO**: `CrossChexSyncStatusDto` es la única shape. Si aparece tentación de crear `SyncProgressEvent` distinto, parar y avisar.
- **Validación de jobId en el hub**: el cliente no puede crear grupos arbitrarios — valida formato `^[a-f0-9]{32}$` antes de `AddToGroupAsync`. Rechaza con `HubException`.
- **Logger structured**: `_logger.LogInformation("[CrossChexSyncJob] Broadcast {Fase} -> grupo sync-{JobId}", job.CSJ_Fase, job.CSJ_JobId)`. NUNCA interpolación.
- **CancellationToken**: `SendAsync` acepta CT — propagar el `ct` del runner. Si el hub está caído, el send fallará rápido.
- **Ningún secreto** en logs. DNI del solicitante enmascarado con `DniHelper.Mask` (ya usado en Chat 1).

## APRENDIZAJES TRANSFERIBLES (del Plan 24 Chat 1 cerrado 2026-04-23)

1. **El runner ya tiene el pattern de tracked entity**: `_db.CrossChexSyncJob.FirstOrDefaultAsync(...)` trae la entity tracked; mutar campos y `SaveChangesAsync`. No crear un DbContext paralelo para el broadcast — reusar la misma instancia tracked.
2. **Callback async ya existe**: `Func<int, int, Task>? onPageProgress` en `CrossChexApiService.GetDayRecordsAsync` y `AsistenciaSyncService.SobreescribirDesdeCrossChexAsync`. El runner usa ese hook para persistir a BD; aquí se agrega un `await _hub.Clients.Group(...).SendAsync(...)` después del `SaveChangesAsync` dentro del mismo callback.
3. **TestDbContextFactory relajado**: `CSJ_RowVersion` ya está marcado `IsRequired(false)` para InMemory (Chat 1 lo agregó). Tests del runner pueden crear/actualizar jobs sin preocuparse del timestamp.
4. **Pattern de mock para `IHubContext<T>`**: ver `AsistenciaControllerTests` (Chat 1 lo usa para webhook fan-out) — `Mock<IHubContext<X>>` + `Mock<IHubClients>` + `Mock<IClientProxy>`. Reusar boilerplate.
5. **Grupos SignalR en Azure**: Azure SignalR Service maneja grupos distribuidos — agregar/remover de grupo es async y puede tardar 50-200ms en Azure. No asumir operación sync.
6. **Contrato ya existe, no redefinirlo**: `CrossChexSyncStatusDto` en `DTOs/AsistenciaAdmin/CrossChexSyncStatusDto.cs`. El evento `"SyncProgress"` emite esta misma shape. Si el FE Chat 3 pide un campo nuevo, se agrega al DTO (afecta tanto GET como broadcast simultáneamente).
7. **Rate limit del GET status queda útil**: aun con SignalR, el FE puede hacer 1 GET inicial al suscribirse para ver estado previo (si el job ya está en página 3, no tiene que esperar al próximo evento). El hub no reemplaza al GET, lo complementa.
8. **Auto-emisión al suscribirse (decisión 2)**: si se acepta, el hub hace 1 query extra + 1 send. El query sobrecarga del jobRepo es trivial (`GetByJobIdAsync` AsNoTracking). Ventaja: el FE no tiene que hacer GET manual después de subscribe.

## FUERA DE ALCANCE

- **Frontend** — Plan 24 Chat 3 (pantalla admin con `p-progressBar` + suscripción al hub en servicio singleton). Chat 2 solo cambia BE. El contrato emitido debe ser suficiente para que Chat 3 funcione sin pedir nuevos campos.
- **Reducir `Task.Delay(30000)`** — Plan 24 Chat 4 valida si se puede reducir a 5-10s. Chat 2 conserva el delay actual.
- **Cancelación de job desde el hub** — fuera de scope. No agregar `CancelSync(jobId)` todavía. El campo `CSJ_HangfireJobId` está reservado pero no se expone.
- **Auto-suscripción al grupo de la sede** — el evento `SyncProgress` va SOLO al grupo `"sync-{jobId}"`. No broadcast a toda la sede (sería ruido para otros admins que no dispararon el sync).
- **Persistir eventos de SignalR en BD** — los eventos son efímeros. La BD ya tiene el estado actualizado (`CrossChexSyncJob`); el hub es solo el canal push.
- **Otros planes** — este chat toca solo el runner + hub + (opcional) mapper. No toca Plan 22, 26, 27, 28, 29.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 10 min)
[ ] Leer CrossChexSyncJobRunner.cs (4 transiciones donde se persiste estado)
[ ] Leer AsistenciaHub.cs (grupos existentes, autenticación)
[ ] Leer CrossChexSyncStatusDto.cs (payload exacto a reusar)
[ ] Leer ChatNotificationService.cs (patrón IHubContext<T>)
[ ] Confirmar con el usuario las 3 DECISIONES antes de codear

CÓDIGO
[ ] Runner modificado: 4 broadcasts tras cada SaveChangesAsync (RUNNING, callback, COMPLETED, FAILED)
[ ] Cada broadcast envuelto en try/catch con LogWarning (fire-and-forget)
[ ] Hub modificado: 2 métodos Subscribe/Unsubscribe con validación regex de jobId
[ ] Si decisión 2 = Sí: hub emite estado actual al connectionId suscriptor nuevo
[ ] (Opcional) Mapper estático si runner + controller duplican proyección DTO
[ ] Cap 300 líneas respetado en todos los archivos

TESTS
[ ] 3 tests de hub (subscribe válido, subscribe inválido, unsubscribe)
[ ] 4 tests de runner (broadcast en 4 transiciones usando mock IHubContext)
[ ] 1 test de resiliencia (hub falla → job COMPLETED igual, LogWarning emitido)
[ ] dotnet test verde — suite BE ≥ 1302 baseline + ~8 esperados = 1310

DESIGN SYSTEM / CONTRATO
[ ] Evento "SyncProgress" emite CrossChexSyncStatusDto SIN MODIFICAR (mismo shape que GET)
[ ] Grupo SignalR: "sync-{jobId}" (decisión 1 recomendada)
[ ] Validación regex ^[a-f0-9]{32}$ en hub — rechaza jobId arbitrarios

INVARIANTES
[ ] INV-S07 preservado: fallo del hub NO falla el job
[ ] INV-AD01/AD03 sin cambios: runner sigue delegando en IAsistenciaSyncService
[ ] Autz del hub: [Authorize] a nivel clase ya cubre los 2 métodos nuevos (4 roles admin)

VALIDACIÓN
[ ] dotnet build limpio
[ ] dotnet test verde con deltas esperados
[ ] Smoke manual con Postman/wscat contra dev:
    1. Conectar al hub como admin autenticado
    2. SubscribeToSyncJob(jobId-de-un-sync-real)
    3. Disparar POST /sync
    4. Observar evento "SyncProgress" por cada página
    5. Verificar payload idéntico a GET /sync/{jobId}/status

MAESTRO
[ ] maestro.md Plan 24: ~25% → ~50% (Chat 2 de 4)
[ ] cola top 3 actualizada: Chat 2 removido, Chat 3 FE promueve a #2

COMMIT
[ ] Un solo commit en Educa.API master con subject sugerido abajo
[ ] Mover este archivo a educa-web/.claude/chats/closed/033-plan-24-chat-2-be-signalr-broadcast-progreso.md en el commit docs del maestro
```

## COMMIT MESSAGE sugerido

### Commit BE (Educa.API master)

**Subject** (≤ 72 chars):

```
feat(asistencias): Plan 24 Chat 2 — broadcast CrossChex sync progress
```

**Body**:

```
Add SignalR broadcast of CrossChex sync progress. The runner created
in Chat 1 now emits "SyncProgress" to group "sync-{jobId}" after every
state transition persisted to "CrossChexSyncJob". The frontend in
Chat 3 can subscribe via "AsistenciaHub" and receive live updates
instead of polling.

 - "AsistenciaHub" exposes "SubscribeToSyncJob" / "UnsubscribeFromSyncJob"
   guarded by a "^[a-f0-9]{32}$" regex on "jobId" to prevent arbitrary
   group creation. Inherits "[Authorize]" at class level.
 - "CrossChexSyncJobRunner" emits "SyncProgress" at 4 points: after
   marking RUNNING, on each page of the progress callback, on
   COMPLETED, and on FAILED. Each emission wrapped in try/catch with
   LogWarning — a hub failure never fails the job ("INV-S07").
 - Payload is "CrossChexSyncStatusDto" bit-for-bit identical to the
   response of "GET /sync/{jobId}/status" — a client can alternate
   polling and push without reshaping.
 - (Optional) Subscribe-time replay: when a client subscribes while a
   job is active, the hub sends the current state to the specific
   "Context.ConnectionId" so the UI fills immediately instead of
   waiting for the next update.
 - "Task.Delay(30000)" still untouched — Chat 4.

Tests:
 - 3 hub tests (subscribe/unsubscribe/regex reject).
 - 5 runner tests (4 transitions emit + 1 resilience when hub throws).

Suite "<baseline>+<delta> BE verdes" ("dotnet test"). Build OK.
Plan 24 row from ~25% to ~50% — Chat 2 of 4 closed.
```

**Recordatorios** (skill `commit`):

- Inglés imperativo (`add`, `emit`, `expose`, `inherit`).
- Español solo entre `"..."` para dominio (`"AsistenciaHub"`, `"CrossChexSyncJobRunner"`, `"SubscribeToSyncJob"`, `"SyncProgress"`, `"CrossChexSyncStatusDto"`, `"INV-S07"`, `"sync-{jobId}"`, `"Task.Delay(30000)"`).
- NUNCA `Co-Authored-By`.

### Commit docs-maestro (separado, repo `educa-web`)

Este chat es BE puro en `Educa.API master`. El maestro vive en `educa-web` — un commit aparte **en el otro repo** actualiza Plan 24 (de ~25% a ~50%) + cola top 3 (remover Chat 2, promover Chat 3 FE a #2 si aplica) + mueve `033-plan-24-chat-2-be-signalr-broadcast-progreso.md` a `closed/`.

**Subject**:

```
docs(maestro): Plan 24 Chat 2 F2.BE ✅ cerrado — commit <HASH> en Educa.API
```

**Body**: resumen + link al commit del BE + cola top 3 actualizada (remover Chat 2, promover Chat 3 FE a #2, discutir slot #3 con usuario).

## CIERRE

Feedback a pedir al cerrar el Chat 33 (Plan 24 Chat 2):

1. **Decisiones tomadas** — ¿cuál fue la elección final para las 3 DECISIONES? Anotar si alguna cambió durante el chat (especialmente 2 auto-emisión al suscribirse y 3 broadcast al QUEUED).
2. **Smoke test real contra dev** — conectarse al hub con `wscat` o el script de prueba que tenga el proyecto, disparar sync, grabar el stream de eventos. Anotar: cuántos eventos llegan, intervalo promedio, si alguno se pierde tras el `Task.Delay(30000)` (posible timeout de conexión en Azure SignalR con conexiones inactivas).
3. **Contrato suficiente para Chat 3 FE?** — si el Chat 3 FE descubre que necesita un campo nuevo (ej: `"ProgresoPorcentual"`, `"RegistrosProcesados"`), se agrega a `CrossChexSyncStatusDto` y queda disponible en ambos canales (GET + hub) simultáneamente. Documentar en el maestro si pasó.
4. **Tests baseline** — confirmar delta final (~8 esperados: 3 hub + 4 runner + 1 resiliencia). Si bajó, anotar razón.
5. **Próximo chat tras 33** — Plan 24 Chat 3 (Frontend con `p-progressBar` + suscripción hub en servicio singleton). Va al repo `educa-web main`. Consume el contrato `CrossChexSyncStatusDto` creado en Chat 1 + hub eventos creados en Chat 2.
6. **Slot #3 del top 3** — al cerrar este chat, el usuario debe decidir qué entra al slot #3 abierto. Candidatos: Plan 28 Chat 3 BE (si llegó la validación del jefe Plan 27), Plan 26 F3 (si llegó telemetría suficiente), Design System F5.3, Carril D Ola 2+. Proponer al cerrar.