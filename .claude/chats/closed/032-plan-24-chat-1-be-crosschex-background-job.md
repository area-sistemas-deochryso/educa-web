> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 24 · **Chat**: 1 · **Fase**: F1.BE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #2 (el #1 es Plan 29 Chat 3 OPS, no es código).

---

# Plan 24 Chat 1 — Backend job + status endpoint para sync CrossChex

## PLAN FILE

- Plan canónico: **inline en el maestro** (no tiene archivo separado). Ver [`../../educa-web/.claude/plan/maestro.md`](../../educa-web/.claude/plan/maestro.md) sección **"🟡 Plan 24 — Sincronización CrossChex en Background Job"** (líneas 637-673).
- Este chat ejecuta **solo el Chat 1** de los 4 diseñados en el plan. Los chats 2-4 siguen después:
  - Chat 2: SignalR broadcast de progreso (reusa `AsistenciaHub`)
  - Chat 3: Frontend `p-progressBar` + suscripción hub en servicio singleton
  - Chat 4: Validar si `Task.Delay(30000)` se puede reducir a 5-10s + deploy

> **Nota**: Este Chat 1 es `/design` con implementación mínima BE. Antes de tocar código, el chat **debe validar con el usuario 8 decisiones explícitas** (ver sección DECISIONES). No improvisar.

## OBJETIVO

Mover `AsistenciaSyncService.SobreescribirDesdeCrossChexAsync` de ejecución síncrona (bloquea el request 2+ minutos) a background task con Hangfire, exponiendo un endpoint de status consultable. Deja el `AsistenciaHub` sin cambiar — el broadcast de progreso se diseña en Chat 2.

- **Endpoint nuevo**: `POST /api/asistencia-admin/sync` retorna `202 Accepted { jobId, estado: "QUEUED" }` sin bloquear.
- **Endpoint nuevo**: `GET /api/asistencia-admin/sync/{jobId}/status` retorna `{ jobId, estado: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED", pagina, totalPaginas, fase, mensaje, iniciadoEn, finalizadoEn }`.
- **Deuda aceptada**: hasta Chat 2 (SignalR) el frontend tendrá que hacer polling del endpoint de status. El diseño del status DTO debe ser suficientemente expresivo para NO bloquear el Chat 3 FE (progreso visible con polling hasta que SignalR entre).

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** `Educa.API/Services/Integraciones/CrossChexApiService.cs` (específicamente `GetDayRecordsAsync` alrededor de la línea 231 — el `Task.Delay(30000)` entre páginas). Confirmar:
   - ¿Dónde está el delay exactamente?
   - ¿Cómo se emiten las páginas (yield? lista?) — afecta cómo el job reporta progreso.
2. **Leer** `Educa.API/Services/Asistencias/AsistenciaSyncService.cs` entre líneas 118-199 (`SobreescribirDesdeCrossChexAsync`). Confirmar:
   - Dependencias (`DbContext`, `ICrossChexApiService`, `IEmailOutboxService`, etc.) — Hangfire crea un scope nuevo, hay que asegurar que todas sean `Scoped` o `Transient`.
   - Si el método ya captura excepciones o si las propaga.
3. **Leer** `Educa.API/Controllers/Asistencias/AsistenciaAdminController.cs` líneas 104-111 (endpoint actual síncrono). Ver cómo está autorizado y qué devuelve hoy.
4. **Leer** `Educa.API/Extensions/HangfireExtensions.cs` para entender el patrón existente (5 jobs ya registrados: `SincronizarAsistenciaMatutina`, `SincronizarVespertinaParteA/B`, `LimpiarRefreshTokens`, `LimpiarIdempotencyKeys`). El nuevo job sigue el mismo pattern.
5. **Leer** `business-rules.md` §1.8-1.10 (INV-AD01, INV-AD02, INV-AD03) para asegurar que el cambio a background NO rompe estas invariantes (cierre mensual, precedencia manual, vías de mutación).

## DECISIONES A VALIDAR CON EL USUARIO (antes de tocar código)

El plan lista el alcance pero hay 8 decisiones no triviales que el design debe resolver **explícitamente** antes de ejecutar:

1. **Persistencia del status del job**: ¿En memoria (`IMemoryCache` con TTL 24h) o en tabla nueva (`CrossChexSyncJob`)?
   - Memoria: más simple, se pierde en restart (acceptable — sync puntual).
   - Tabla: auditable, sobrevive restart, pero requiere migración SQL.
   - **Recomendación**: empezar con memoria (Chat 1 scope mínimo), migrar a tabla solo si el Chat 4 detecta que hace falta auditoría.
2. **JobId**: ¿El id que devuelve Hangfire (string alfanumérico) o un GUID propio?
   - Hangfire: gratis, pero acopla el contrato al framework.
   - GUID propio: desacopla, pero requiere mapeo a Hangfire Id internamente.
   - **Recomendación**: GUID propio — el frontend no debe saber de Hangfire.
3. **Concurrencia**: ¿Se permite disparar un segundo sync si el primero está `RUNNING`?
   - No: devolver `409 Conflict` con el `jobId` del que está corriendo.
   - Sí: encolar el segundo. Riesgo de duplicación de escrituras.
   - **Recomendación**: NO permitir simultáneos (mismo comportamiento que hoy de facto — el sync se usa manualmente).
4. **Autenticación del status endpoint**: ¿Solo el usuario que disparó el sync puede consultarlo o cualquier admin?
   - Cualquier admin: más simple, el `jobId` es aleatorio.
   - Solo el disparador: guardar `iniciadoPorDni` y validar.
   - **Recomendación**: cualquier admin (4 roles administrativos) — consistente con el actual alcance read-only de la pantalla.
5. **TTL del status**: ¿Cuánto tiempo se conserva el resultado tras `COMPLETED`/`FAILED`?
   - 24h: suficiente para auditoría diaria.
   - 1h: libera memoria pero cercano a cero valor post-sync.
   - **Recomendación**: 24h — cheap y útil.
6. **`Task.Delay(30000)` entre páginas**: ¿Se conserva en este chat o se reduce?
   - Plan 24 Chat 4 lo valida específicamente — **NO tocar en Chat 1**.
   - Deja el delay tal cual, solo se mueve al background.
7. **Correo de resumen al finalizar**: ¿El job envía un correo al admin cuando termina?
   - Si: usar `IEmailOutboxService.EnqueueAsync` con `TipoEntidadOrigen = "CrossChexSyncJob"` (fire-and-forget, INV-S07).
   - No: el admin ya ve el resultado en la UI via polling/SignalR.
   - **Recomendación**: NO en Chat 1 — el admin está viendo la pantalla; el correo agrega carga al outbox sin valor claro. Si el Chat 4 descubre que se usa mucho y el admin dispara y se va, considerar ahí.
8. **Rate limit de los dos endpoints nuevos**: ¿Política?
   - `POST /sync`: `batch` (5/min) con override `[RateLimitOverride(3.0)]` para admin (15/min efectivo — generoso).
   - `GET /sync/{jobId}/status`: `reads` estándar (200/min por userId) — el FE puede polear cada 2-5s sin saturar.

Durante el chat, el usuario debe aceptar/ajustar cada una antes de que se escriba código.

## ALCANCE

### Archivos a crear

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|-----------------:|
| 1 | `Services/Asistencias/CrossChexSyncJobStatus.cs` | POCO con `JobId`, `Estado`, `Pagina`, `TotalPaginas`, `Fase`, `Mensaje`, `IniciadoEn`, `FinalizadoEn`, `Error` | ~25 |
| 2 | `Services/Asistencias/CrossChexSyncJobStore.cs` + interface | Persistencia in-memory con `IMemoryCache` + TTL 24h. Métodos: `Register(jobId)`, `UpdateProgress(jobId, pagina, totalPaginas, fase)`, `Complete(jobId)`, `Fail(jobId, error)`, `Get(jobId)`, `IsRunning()` | ~60-80 |
| 3 | `Services/Asistencias/CrossChexSyncJob.cs` + interface | Método `EjecutarAsync(string jobId, DateTime fecha, string dniSolicitante)` invocable por Hangfire. Internamente llama a `AsistenciaSyncService.SobreescribirDesdeCrossChexAsync` y reporta progreso al store. | ~70-90 |
| 4 | `DTOs/Asistencias/CrossChexSyncStatusDto.cs` | DTO del response del endpoint status (no exponer POCO interno) | ~20 |
| 5 | `DTOs/Asistencias/CrossChexSyncAceptadoDto.cs` | DTO del response del endpoint POST (`jobId`, `estado`) | ~12 |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `Controllers/Asistencias/AsistenciaAdminController.cs` | Reemplazar endpoint síncrono actual por versión que encola en Hangfire y retorna `202 Accepted`. Agregar nuevo `GET /sync/{jobId}/status`. Ambos `[Authorize(Roles = Roles.Administrativos)]`. Rate limit según decisión 8. |
| `Extensions/RepositoryExtensions.cs` o `ServiceExtensions.cs` | DI: registrar `ICrossChexSyncJobStore` como **singleton** (persistencia in-memory compartida) + `ICrossChexSyncJob` como `Scoped`. |
| `Services/Asistencias/AsistenciaSyncService.cs` | Exponer un **callback opcional** de progreso (ej: `Action<SyncProgress>? onProgress = null`) en `SobreescribirDesdeCrossChexAsync` para que el job pueda reportar al store sin acoplar el service al job. |
| `Services/Integraciones/CrossChexApiService.cs` (si necesario) | Mismo patrón — expose progreso por página sin acoplar al store. |

### Forma del DTO de status (1:1 con lo que retorna el GET)

```csharp
public sealed class CrossChexSyncStatusDto
{
    public required string JobId { get; init; }
    public required string Estado { get; init; }  // "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"
    public int? Pagina { get; init; }
    public int? TotalPaginas { get; init; }
    public string? Fase { get; init; }            // "DESCARGANDO" | "PROCESANDO" | "COMPLETADO" | "ERROR"
    public string? Mensaje { get; init; }         // ej: "Descargando página 3/5 — esperando CrossChex…"
    public DateTime IniciadoEn { get; init; }
    public DateTime? FinalizadoEn { get; init; }
    public string? Error { get; init; }           // Solo en FAILED, mensaje seguro (nunca ex.Message crudo)
}
```

El chat 3 FE (siguiente) consumirá este contrato tal cual vía polling, y Chat 2 emitirá el mismo contrato vía SignalR.

## TESTS MÍNIMOS

| Caso | Setup | Esperado |
|------|-------|----------|
| `POST /sync` con admin válido encola en Hangfire y devuelve `202 + jobId` | Mock `ICrossChexSyncJobStore.Register()` | Status 202, body tiene `jobId` string, store llamado con el mismo |
| `POST /sync` con job ya `RUNNING` rechaza | Store dice `IsRunning() = true` | Status 409, body con el `jobId` existente |
| `POST /sync` sin rol admin devuelve 403 | Simular usuario Profesor | Status 403 |
| `GET /sync/{jobId}/status` devuelve estado actual | Pre-poblar store con job `RUNNING`, `pagina=3` | Status 200, DTO con `estado=RUNNING`, `pagina=3` |
| `GET /sync/{jobId}/status` con id inexistente → 404 | Store vacío | Status 404 |
| Job ejecuta happy path: callback progreso → store actualiza | Mock `ICrossChexApiService` con 3 páginas fake | Store pasa por `RUNNING pagina=1/3, 2/3, 3/3` → `COMPLETED` |
| Job captura excepción y marca `FAILED` | Mock API que lanza `HttpRequestException` | Store termina con `FAILED`, error mensaje seguro (no `ex.Message` crudo), `LogError` con stack |
| Autorización reflection: 4 roles admin pass, Profesor/Estudiante/Apoderado reject | Reflection sobre ambos endpoints | 7 tests (mismo pattern que Plan 22 Chat 5) |

Framework: xUnit + FluentAssertions + `TestDbContextFactory`.

## REGLAS OBLIGATORIAS

- **Cap 300 líneas** por archivo `.cs` (regla dura en `backend.md`). Ningún archivo nuevo debe acercarse — si pasa, dividir por responsabilidad.
- **`AsNoTracking()`** en toda query read-only (no aplica directamente aquí — el job escribe — pero sí si se lee `Asistencia` existente para merge).
- **INV-AD01**: el job debe llamar al mismo `AsistenciaSyncService.SobreescribirDesdeCrossChexAsync` — **NO** escribir directo a `AsistenciaPersona`. La invariante es "toda mutación pasa por `IAsistenciaService` o `IAsistenciaAdminService`"; el job es un caller más de `IAsistenciaService`.
- **INV-AD02**: los registros con `ASP_OrigenManual = true` se descartan silenciosamente en `AsistenciaService.RegistrarAsistencia` — el job no necesita hacer nada especial, el service ya lo maneja.
- **INV-AD03**: si un registro cae en un mes con `CierreAsistenciaMensual` activo, el service lanza `BusinessRuleException("ASISTENCIA_MES_CERRADO")`. El job debe **continuar con las demás páginas** y reportar el total de rechazados al final en `CrossChexSyncJobStatus.Mensaje` ("3 registros rechazados por cierre mensual").
- **INV-ET02**: errores del job se persisten en `ErrorLog` fire-and-forget. Si persistir falla, no falla el job.
- **INV-S07**: correo de resumen (si decisión 7 = sí) es fire-and-forget — no falla el job.
- **Logger structured**: `_logger.LogInformation("[CrossChexSyncJob] Página {Pagina}/{Total} procesada", pagina, totalPaginas)`. NUNCA interpolación de strings.
- **Hangfire scope**: la clase del job NO guarda `DbContext` en campo. Inyecta `IServiceScopeFactory` y crea scope dentro del método `EjecutarAsync`. Mismo patrón de `ReporteUsuarioPurgeJob` si existe, sino de los 5 jobs ya registrados.
- **CancellationToken**: el método `EjecutarAsync` acepta `CancellationToken` (Hangfire lo provee) y lo propaga a `CrossChexApiService`. Si el admin cancela el job (no en scope de este chat, pero el hook debe existir), respetamos.
- **Ningún secreto** en logs. DNI del solicitante enmascarado (`DniHelper.Mask`).

## APRENDIZAJES TRANSFERIBLES (del Plan 22 Chat 6 FE cerrado 2026-04-23)

1. **Contrato DTO debe ser camelCase-friendly**: el FE consume DTOs en camelCase (Newtonsoft ASP.NET Core 3+ default). No agregar `[JsonProperty]` explícito salvo que haga falta.
2. **Enmascarar DNI con `DniHelper.Mask()`** antes de exponer en cualquier DTO. En el status del job, si decides exponer `iniciadoPorDni`, siempre enmascarado.
3. **Tests authz por reflection**: el Plan 22 Chat 5 y otros recientes usan el patrón de `ControllerAuthorizationTests` con reflection. Mismo patrón aquí: 4 roles admin pass + 3 no-admin rejected por endpoint. Mantiene el cap de líneas sin repetir boilerplate por cada endpoint.
4. **`ApiResponse<T>`**: todos los endpoints devuelven `ApiResponse<T>` (INV-D08). Aquí también — el `202 Accepted` puede envolver su DTO, y el `200 OK` del status igual.
5. **Rate limit `reports` / `batch`**: Plan 26 F2 Chat 2 introdujo policies nuevas. El `POST /sync` calza en `batch` (operación pesada + infrecuente). Ver `Program.cs` para las policies vigentes.
6. **Pre-work = fuente de verdad**: el brief del Chat 5 BE confirmó universo 192 filas ANTES de diseñar, evitó sobre-ingeniería (sin paginación). Aquí el pre-work es leer los 3 archivos referenciados antes de diseñar.
7. **Universo de sincronización esperado**: Plan 21 BE confirmó que el dispatch polimórfico trae ~500 personas/día (profesores + estudiantes). 5 páginas de 100. El status debe ser expresivo con `pagina/totalPaginas` — no bastará un booleano "done".
8. **Memory referenced**: `project_email_audit_universe.md` tiene datos de campo histórico. No hay memoria específica del sync CrossChex hoy — el job actual no logea progreso auditable. Tras este chat, considerar crear `project_crosschex_sync_job.md` con los tiempos promedio observados.

## FUERA DE ALCANCE

- **SignalR broadcast** — Plan 24 Chat 2 lo agrega. Chat 1 diseña el contrato del status DTO que Chat 2 reusará en `SyncProgress` hub event.
- **Frontend cambios** — Plan 24 Chat 3 (pantalla admin con `p-progressBar`). Chat 1 solo cambia contratos BE.
- **Reducir `Task.Delay(30000)`** — Plan 24 Chat 4 valida si se puede reducir. Chat 1 conserva el delay actual.
- **Migración a persistencia SQL del status** — si la decisión 1 es "memoria", Chat 1 NO crea tabla. Deuda técnica documentada para post-Chat 4 si aplica.
- **Cancelación de job en curso** — fuera de scope. El endpoint accept solo crea; no hay `DELETE /sync/{jobId}`. Si el admin quiere, reinicia el servidor (Hangfire reanuda el job) o espera el timeout natural del job.
- **Webhook reverso de CrossChex a Educa** — tema diferente (Plan 21 polimórfico ya lo cubre). Plan 24 es solo para la lectura batch que hoy es síncrona.
- **Plan 22** — Plan 22 ya cerró al 100% (Chat 6 F4.FE 2026-04-23). Aquí no se tocan correos de asistencia.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 15 min)
[ ] Leer CrossChexApiService.GetDayRecordsAsync (ubicar Task.Delay y forma de emitir páginas)
[ ] Leer AsistenciaSyncService.SobreescribirDesdeCrossChexAsync (dependencias + excepciones)
[ ] Leer AsistenciaAdminController endpoint actual sync (104-111)
[ ] Leer HangfireExtensions pattern de los 5 jobs existentes
[ ] Confirmar con el usuario las 8 DECISIONES antes de codear

CÓDIGO
[ ] 5 archivos nuevos creados (POCO status + store + job + 2 DTOs)
[ ] 2-4 archivos modificados (controller + DI + service + API service si aplica)
[ ] Registro DI: store como singleton, job como scoped
[ ] Endpoint POST /sync con [RateLimitOverride] según decisión 8
[ ] Endpoint GET /sync/{jobId}/status con política reads
[ ] Both endpoints [Authorize(Roles = Roles.Administrativos)] a nivel controller ya existente
[ ] Cap 300 líneas respetado (ningún archivo cerca del límite)
[ ] CancellationToken propagado job → CrossChexApiService
[ ] Hangfire scope con IServiceScopeFactory (no guardar DbContext en campo)

TESTS
[ ] 6 tests funcionales (POST 202, POST 409, POST 403, GET 200, GET 404, progress callback)
[ ] 1 test de excepción (job FAILED captura error sin exponer stack)
[ ] 7 tests authz reflection (4 admin pass + 3 no-admin reject × 2 endpoints consolidados)
[ ] dotnet test verde — suite BE ≥ 1295 baseline + 14 esperados

DESIGN SYSTEM / CONTRATO
[ ] DTO de status expresivo suficiente para Chat 3 FE (pagina/totalPaginas/fase/mensaje)
[ ] Forma camelCase-friendly (no PropertyNamingPolicy override)
[ ] ApiResponse<T> envuelve ambos endpoints (INV-D08)

INVARIANTES
[ ] INV-AD01 preservado: job llama IAsistenciaService, NO mutations directas
[ ] INV-AD03 preservado: cierre mensual rechaza página, job continúa con siguientes
[ ] INV-S07: correo de resumen fire-and-forget (si decisión 7 = sí)
[ ] INV-ET02: errores del job persisten ErrorLog fire-and-forget

VALIDACIÓN
[ ] dotnet build limpio
[ ] dotnet test verde con deltas esperados
[ ] Swagger muestra los 2 endpoints nuevos con shape correcta
[ ] Smoke manual contra dev: POST devuelve jobId → polling GET muestra progreso → llega a COMPLETED

MAESTRO
[ ] maestro.md fila 24 actualizada: 0% → ~25% (Chat 1 de 4)
[ ] cola top 3 actualizada: Chat 1 removido, Chat 2 promueve a #2 si aplica

COMMIT
[ ] Un solo commit en Educa.API master con subject sugerido abajo
[ ] Mover este archivo a educa-web/.claude/chats/closed/032-plan-24-chat-1-be-crosschex-background-job.md en un commit separado del FE (o en el mismo del BE si el usuario prefiere)
```

## COMMIT MESSAGE sugerido

### Commit BE (Educa.API master)

**Subject** (≤ 72 chars):

```
feat(asistencias): Plan 24 Chat 1 — move CrossChex sync to Hangfire job
```

**Body**:

```
Move "AsistenciaSyncService.SobreescribirDesdeCrossChexAsync" from
synchronous controller action to background Hangfire job. The admin
no longer waits 2+ minutes on a blocked request — "POST" returns
"202 Accepted" with a "jobId" and the admin polls the new status
endpoint. Chat 2 will add SignalR broadcast; Chat 3 the frontend
progress bar; Chat 4 validates the "Task.Delay(30000)" between pages.

 - New endpoint "POST /api/asistencia-admin/sync" under
   "[Authorize(Roles = Roles.Administrativos)]" + rate limit "batch"
   (x3.0 admin override). Returns "202 Accepted" with "jobId".
 - New endpoint "GET /api/asistencia-admin/sync/{jobId}/status"
   returns current phase, page progress and terminal status.
 - "409 Conflict" if a previous job is still "RUNNING" (no
   concurrent syncs — matches de-facto current behavior).
 - "CrossChexSyncJobStore" persists status in-memory with 24h TTL —
   simple; migrates to SQL table only if Chat 4 telemetry shows
   audit need.
 - "CrossChexSyncJob" wraps the existing service with a progress
   callback. Hangfire scope created via "IServiceScopeFactory" per
   the pattern used by the 5 jobs already registered.
 - "Task.Delay(30000)" between pages preserved — reducing it is
   explicitly scoped to Chat 4.

Invariants preserved: "INV-AD01" (job calls "IAsistenciaService",
not direct writes), "INV-AD03" (monthly close rejection continues
with remaining pages), "INV-S07"/"INV-ET02" fire-and-forget for
email and error log.

Tests:
 - 7 functional tests covering 202/409/403/200/404 paths + happy
   progress callback + "FAILED" on exception.
 - 7 authz reflection tests (4 admin roles pass + 3 non-admin reject
   consolidated across both endpoints).

Suite "<baseline>+<delta> BE verdes" ("dotnet test"). Build OK.
Plan 24 fila 24 from 0% to ~25% — Chat 1 of 4 closed.
```

**Recordatorios** (skill `commit`):

- Inglés imperativo (`move`, `add`, `return`, `preserve`).
- Español solo entre `"..."` para dominio (`"AsistenciaSyncService.SobreescribirDesdeCrossChexAsync"`, `"asistencia-admin"`, `"Roles.Administrativos"`, `"CrossChexSyncJobStore"`, `"CrossChexSyncJob"`, `"INV-AD01"`, `"IAsistenciaService"`, `"Task.Delay(30000)"`, etc.).
- NUNCA `Co-Authored-By`.

### Commit docs-maestro (separado, repo `educa-web`)

Este chat es BE puro en `Educa.API master`. El maestro vive en `educa-web` — un commit aparte **en el otro repo** actualiza fila 24 + cola top 3 + mueve `032-plan-24-chat-1-be-crosschex-background-job.md` a `closed/`.

**Subject**:

```
docs(maestro): Plan 24 Chat 1 F1.BE ✅ cerrado — commit <HASH> en Educa.API
```

**Body**: resumen + link al commit del BE + cola top 3 actualizada (remover Chat 1, promover Chat 2 SignalR a #2 si aplica, discutir slot #3 con usuario).

## CIERRE

Feedback a pedir al cerrar el Chat 32 (Plan 24 Chat 1):

1. **Decisiones tomadas** — ¿cuál fue la elección final para las 8 DECISIONES? Anotar si alguna cambió durante el chat (especialmente 1 persistence y 7 correo resumen).
2. **Tiempos reales observados** — cuando el admin dispare el sync por primera vez en dev, anotar: páginas recibidas, segundos por página sin contar `Task.Delay`, total end-to-end. Esos números informan Chat 4 (¿se puede bajar `Task.Delay` a 5-10s?). Si los tiempos son muy distintos del estimado (~2 min para 5 páginas), actualizar memory o crear `project_crosschex_sync_job.md`.
3. **Tests baseline** — confirmar delta final de tests (~14 esperados: 7 funcionales + 7 authz). Si bajó por consolidación, anotar razón.
4. **Próximo chat tras 32** — Plan 24 Chat 2 (SignalR broadcast). Depende 100% del contrato `CrossChexSyncStatusDto` creado en este chat — si el shape quedó distinto a lo propuesto, documentarlo en el maestro para que el Chat 2 no redescubra.
5. **Slot #3 del top 3** — al cerrar este chat, el usuario debe decidir qué entra al slot #3 abierto desde cierre de Plan 22. Candidatos: Plan 28 Chat 3 BE (si llegó la validación del jefe Plan 27), Plan 26 F3 (si llegó telemetría suficiente), Design System F5.3, Carril D Ola 2+. Proponer al cerrar.
