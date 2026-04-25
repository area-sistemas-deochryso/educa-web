> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 34 · **Chat**: 3 · **Fase**: F2 BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 34 Chat 3 — `ErrorGroupService` + `ErrorGroupController` + DTOs + purga selectiva

## PLAN FILE

Ruta del plan: `../../educa-web/.claude/plan/saneamiento-errores.md` — sección **"Chat 3 BE — `ErrorGroupService` + Controller + DTOs + purga selectiva"** (≈ líneas 141-192).

Maestro: `../../educa-web/.claude/plan/maestro.md` — fila Plan 34 (40%, post-Chat 2).

## OBJETIVO

Cerrar el dominio backend del Plan 34 exponiendo a admin la gestión de `ErrorGroup` (listar/detalle/cambiar estado/ver ocurrencias) y migrando la purga global de 7 días a purga selectiva por estado del grupo (7/30/180 días). Al cerrar este chat, el backend está completo y los Chats 4-5 FE pueden empezar.

## CONTEXTO HEREDADO DEL CHAT 2 (commit `bcd1532` en `Educa.API master`)

Lo que el Chat 2 BE dejó funcionando — **NO redescubrir, NO modificar salvo donde se indica**:

- **Tabla `ErrorGroup`** ejecutada en BD prueba con auditoría completa + `ERG_RowVersion ROWVERSION` + `UNIQUE INDEX UX_ErrorGroup_Fingerprint` + `IX_ErrorGroup_Estado_UltimaFecha` (este último ya cubre el listado paginado por estado/última fecha).
- **`ErrorLog.ERL_ERG_CodID`** nullable + FK `ON DELETE CASCADE` hacia `ErrorGroup` + `IX_ErrorLog_ErrorGroup`.
- **`Models/Sistema/ErrorGroup.cs`** (91 ln) — auditoría + RowVersion + nav `Ocurrencias`.
- **`Constants/Sistema/ErrorGroupEstados.cs`** — 5 const (`Nuevo/Visto/EnProgreso/Resuelto/Ignorado`) + `HashSet Validos`.
- **`Helpers/Sanitization/ErrorFingerprintCalculator.cs`** — función pura SHA-256 (NO se toca).
- **`Services/Sistema/ErrorLogService`** ya partido en 3 partials (`.cs` 235 ln + `.Consultas.cs` 164 ln + `.Upsert.cs` 113 ln). El UPSERT al grupo se ejecuta en cada insert; reapertura auto desde RESUELTO está implementada.
- **`Data/ApplicationDbContext.cs`** ya expone `DbSet<ErrorGroup> ErrorGroups`.
- **`Tests/Helpers/Db/TestDbContextFactory.cs`** ya relaja `ERG_RowVersion` para EF InMemory.
- **24 tests verdes** del Chat 2 (9 fingerprint + 15 upsert) — los del scope nuevo deben sumarse, no romper estos.

## PRE-WORK OBLIGATORIO (probablemente nada de SQL)

Antes de codificar, **verificar si hace falta un índice extra** corriendo una query estimada de plan en BD prueba:

```sql
-- ¿La query de ocurrencias paginadas del drawer drill-down va a usar el índice IX_ErrorLog_ErrorGroup?
SET STATISTICS IO ON;
SELECT TOP 20 ERL_CodID, ERL_Mensaje, ERL_Url, ERL_Fecha, ERL_HttpStatus
FROM ErrorLog
WHERE ERL_ERG_CodID = 1   -- id ficticio
ORDER BY ERL_Fecha DESC;
SET STATISTICS IO OFF;
```

Si el plan muestra **scan en vez de seek + key lookup pesado**, considerar agregar índice cubriente:

```sql
-- SOLO si el plan lo justifica
CREATE INDEX IX_ErrorLog_ErrorGroup_Fecha
    ON ErrorLog(ERL_ERG_CodID, ERL_Fecha DESC)
    INCLUDE (ERL_Mensaje, ERL_Url, ERL_HttpStatus, ERL_Severidad, ERL_CorrelationId);
```

**NO crear el índice cubriente preventivamente** — solo si el plan estimado falla. La tabla está vacía hoy, así que es más útil esperar 1-2 semanas post-deploy con datos reales y recién entonces revisar.

Para el resto del chat **no hay SQL nuevo** — toda la lógica vive en C#. El delete cascade del FK ya cubre la purga (basta con `_context.ErrorGroups.Where(...).ExecuteDeleteAsync()`).

## ALCANCE

| # | Archivo | Tipo | Estimado |
|---|---------|------|----------|
| 1 | `Educa.API/Domain/StateMachines/ErrorGroupStateMachine.cs` | Nuevo | ~70 ln |
| 2 | `Educa.API/Interfaces/Services/Sistema/IErrorGroupService.cs` | Nuevo | ~25 ln |
| 3 | `Educa.API/Interfaces/Repositories/Sistema/IErrorGroupRepository.cs` | Nuevo | ~20 ln |
| 4 | `Educa.API/Repositories/Sistema/ErrorGroupRepository.cs` | Nuevo (queries `AsNoTracking()` + UpdateAsync con RowVersion) | ~120 ln |
| 5 | `Educa.API/Services/Sistema/ErrorGroupService.cs` | Nuevo (5 métodos: listar, count, detalle, ocurrencias, cambiarEstado) | ~250 ln (cap 300 — split a `.Purga.cs` si se pasa) |
| 6 | `Educa.API/Services/Sistema/ErrorGroupService.Purga.cs` | Nuevo (purga selectiva por estado + cleanup ocurrencias huérfanas legacy) | ~80 ln |
| 7 | `Educa.API/Controllers/Sistema/ErrorGroupController.cs` | Nuevo (5 endpoints) | ~180 ln |
| 8 | `Educa.API/DTOs/Sistema/ErrorGroupListaDto.cs` | Nuevo | ~40 ln |
| 9 | `Educa.API/DTOs/Sistema/ErrorGroupDetalleDto.cs` | Nuevo | ~50 ln |
| 10 | `Educa.API/DTOs/Sistema/OcurrenciaListaDto.cs` | Nuevo | ~30 ln |
| 11 | `Educa.API/DTOs/Sistema/CambiarEstadoErrorGroupDto.cs` | Nuevo | ~25 ln |
| 12 | `Educa.API/Services/Sistema/ErrorLogPurgeJob.cs` | Modificar (delegar la mitad nueva al `ErrorGroupService`; conservar la rama legacy) | +20 ln (actual 19 ln) |
| 13 | `Educa.API/Extensions/RepositoryExtensions.cs` + `ServiceExtensions.cs` | Modificar (registrar interfaces nuevas) | +4 ln |
| 14 | `educa-web/.claude/rules/business-rules.md` | Modificar (agregar `INV-ET03/04/05/06/07` en §15.12 + nueva sección §19 Saneamiento de errores) | +120 ln |
| 15 | `Educa.API.Tests/Services/Sistema/ErrorGroupServiceTests.cs` | Nuevo | ~250 ln |
| 16 | `Educa.API.Tests/Controllers/Sistema/ErrorGroupControllerAuthorizationTests.cs` | Nuevo | ~120 ln |
| 17 | `Educa.API.Tests/Services/Sistema/ErrorGroupPurgaSelectivaTests.cs` | Nuevo | ~150 ln |
| 18 | `Educa.API.Tests/Domain/StateMachines/ErrorGroupStateMachineTests.cs` | Nuevo | ~80 ln |

### Domain layer — máquina de estados (formal, NO inline)

Patrón canónico del proyecto (ver `Domain/StateMachines/ReporteUsuario.cs` como referencia 1:1). El service NO valida transiciones inline con `if/else` — delega al domain layer.

**Matriz de transiciones permitidas para `ErrorGroup`** (defensa en profundidad — la UI Kanban del Chat 5 visualmente filtrará, el BE rechaza con `ConflictException("INV-ET07_TRANSICION_INVALIDA", ...)` lo que llegue mal):

| Desde \ Hacia | NUEVO | VISTO | EN_PROGRESO | RESUELTO | IGNORADO |
|---|:---:|:---:|:---:|:---:|:---:|
| **NUEVO** | — (no-op) | ✅ | ✅ | ✅ | ✅ |
| **VISTO** | ✅ (rebound) | — (no-op) | ✅ | ✅ | ✅ |
| **EN_PROGRESO** | ✅ (rebound) | ✅ (back to triage) | — (no-op) | ✅ | ✅ |
| **RESUELTO** | ✅ (reapertura manual) | ❌ | ❌ | — (no-op) | ❌ |
| **IGNORADO** | ✅ (unignore manual) | ❌ | ❌ | ❌ | — (no-op) |

**Regla del idem (no-op)**: `EnsureTransicionValida(X, X)` retorna OK silencioso (no lanza). El service detecta el no-op y retorna sin tocar BD ni RowVersion.

**Justificación de la matriz**:
- Estados activos (NUEVO/VISTO/EN_PROGRESO) transicionan libremente entre sí — el admin reordena el triage como necesite.
- RESUELTO/IGNORADO son "terminales suaves": solo se reabren a NUEVO. Esto preserva la semántica de "estos son cierres conscientes" — ir directo de RESUELTO a EN_PROGRESO sería confuso (pérdida de la marca de cierre).
- La auto-reapertura RESUELTO → NUEVO (Chat 2) ya pasa por `ErrorLogService.PersistErrorLogWithGroupAsync` y NO usa esta máquina; usa mutación directa porque es flujo automático del UPSERT, no transición de admin.

### Lógica de `ErrorGroupService.CambiarEstadoAsync(grupoId, dto)`

Patrón directo copiado de `ReporteUsuarioService.ActualizarEstadoAsync` (líneas 121-148):

```
1. Validar dto.Estado en ErrorGroupEstados.Validos → ConflictException("INV-ET07_ESTADO_INVALIDO") si no
2. _repo.GetByIdAsync(id) → NotFoundException si null
3. ErrorGroupStateMachine.EnsureTransicionValida(grupo.ERG_Estado, dto.Estado)
   - Si X → X (no-op): retornar early con mensaje "Sin cambios"
   - Si transición no permitida: ConflictException("INV-ET07_TRANSICION_INVALIDA", ...)
4. grupo.ERG_Estado = dto.Estado
5. Si dto.Observacion no vacía: grupo.ERG_Observacion = dto.Observacion.Trim()  (cap 1000)
6. ApplyAuditFields() llena ERG_FechaMod + ERG_UsuarioMod automáticamente vía DbContext
7. _repo.UpdateAsync(grupo, dto.RowVersion) — base repo wraps RowVersion check
   - Si DbUpdateConcurrencyException: ConflictException("INV-ET07_ROW_VERSION_STALE")
8. LogInformation("ErrorGroup {Id} cambiado a {Estado} por {Usuario}", ...)
9. Retornar mensaje "Grupo de errores actualizado a estado {Estado}"
```

**No tocar `ERG_PrimeraFecha` ni `ERG_UltimaFecha` ni contadores** — esos solo los muta el upsert del Chat 2.

### Purga selectiva (cierre del Plan 34 BE)

`ErrorGroupService.Purga.cs` (partial) expone `PurgarGruposPorEstadoAsync()` que el `ErrorLogPurgeJob` llama:

```
Cutoffs (computados con DateTimeHelper.PeruNow()):
  - IGNORADO: AddDays(-7)
  - NUEVO/VISTO/EN_PROGRESO: AddDays(-30)
  - RESUELTO: AddDays(-180)

Por cada grupo a purgar:
  _context.ErrorGroups
    .Where(g => criterio_de_estado_y_cutoff)
    .ExecuteDeleteAsync()
  → CASCADE borra ErrorLogs hijos automáticamente
  → CASCADE de ErrorLog borra ErrorLogDetalles automáticamente

LogInformation por estado: "Purgados {Count} ErrorGroups en estado {Estado}"
Retornar total agregado.
```

**Y la rama legacy** (huérfanos sin grupo) sigue purgando con la regla vieja:

```
_context.ErrorLogs
  .Where(e => e.ERL_ERG_CodID == null && e.ERL_Fecha < cutoff_7_dias)
  .ExecuteDeleteAsync()
```

`ErrorLogPurgeJob` se reescribe a:

```csharp
public async Task PurgarAsync()
{
    await _errorGroupService.PurgarGruposPorEstadoAsync();          // NUEVO
    await _errorLogService.PurgarOcurrenciasHuérfanasAsync(7);      // método nuevo
}
```

`PurgarOcurrenciasHuérfanasAsync(int diasRetencion)` reemplaza al actual `PurgarAntiguosAsync` agregando el filtro `ERL_ERG_CodID == null`. Mantener `PurgarAntiguosAsync` solo si algún test lo usa, marcado `[Obsolete]` para limpiar en un PR futuro.

### Endpoints del controller `/api/sistema/error-groups`

| Verb | Path | Body | Authz | Retorna |
|---|---|---|---|---|
| `GET` | `/` (querystring: `estado?`, `severidad?`, `origen?`, `q?` (búsqueda en mensaje), `pagina`, `pageSize`) | — | `Roles.Director` | `ApiResponse<List<ErrorGroupListaDto>>` |
| `GET` | `/count` (mismos filtros que listar, sin pagina/pageSize) | — | `Roles.Director` | `ApiResponse<int>` (regla `pagination.md` variante B) |
| `GET` | `/{id:long}` | — | `Roles.Director` | `ApiResponse<ErrorGroupDetalleDto>` |
| `GET` | `/{id:long}/ocurrencias?pagina=&pageSize=` | — | `Roles.Director` | `ApiResponse<List<OcurrenciaListaDto>>` |
| `PATCH` | `/{id:long}/estado` | `CambiarEstadoErrorGroupDto { estado, observacion?, rowVersion }` | `Roles.Director` | `ApiResponse<string>` (mensaje) |

**Authz: Director, NO Administrativos** (per INV-ET07: "Solo Director muta"). Los reads tampoco — el panel de saneamiento es estratégico y solo Director lo necesita. Si el AsistenteAdministrativo lo necesitara, se cambia en Chat 4 FE con justificación documentada.

**Validaciones del controller**:
- `pagina >= 1`, `1 <= pageSize <= 100`, defaults 1/20.
- `id > 0` antes del service call (decorado por `:long` además).
- `estado?`, `severidad?`, `origen?` en querystring se trimean y se filtran case-insensitive en el service.
- `q?` (búsqueda en mensaje representativo) se trimea y se rechaza si > 200 chars.

**Rate limit**: heredar el global; sin override específico (no es heavy ni hot path).

### DTOs

```csharp
// ErrorGroupListaDto
public class ErrorGroupListaDto
{
    public long Id { get; set; }
    public string FingerprintCorto { get; set; } = "";   // primeros 12 chars del hex (UI debug)
    public string Severidad { get; set; } = "";
    public string MensajeRepresentativo { get; set; } = "";
    public string Url { get; set; } = "";
    public int? HttpStatus { get; set; }
    public string? ErrorCode { get; set; }
    public string Origen { get; set; } = "";
    public string Estado { get; set; } = "";
    public DateTime PrimeraFecha { get; set; }
    public DateTime UltimaFecha { get; set; }
    public int ContadorTotal { get; set; }
    public int ContadorPostResolucion { get; set; }
    public string RowVersion { get; set; } = "";   // base64 para el FE
}

// ErrorGroupDetalleDto: ErrorGroupListaDto + Observacion + UsuarioMod + FechaMod + TotalOcurrencias (count desde tabla)

// OcurrenciaListaDto: subset de ErrorLogListaDto que el drawer drill-down necesita
//   { Id, CorrelationId, Fecha, HttpMethod, HttpStatus, Mensaje, Url, UsuarioDni (enmascarado), UsuarioRol, TotalBreadcrumbs }

// CambiarEstadoErrorGroupDto
public class CambiarEstadoErrorGroupDto
{
    [Required, StringLength(20)]
    public string Estado { get; set; } = "";

    [StringLength(1000)]
    public string? Observacion { get; set; }

    [Required, StringLength(64)]   // base64 de byte[8] expandido
    public string RowVersion { get; set; } = "";
}
```

## TESTS MÍNIMOS

### `ErrorGroupStateMachineTests` (~6 casos)

| # | Caso | Esperado |
|---|------|----------|
| 1 | NUEVO → VISTO | OK silencioso |
| 2 | NUEVO → IGNORADO | OK silencioso |
| 3 | RESUELTO → NUEVO | OK silencioso (reapertura manual) |
| 4 | RESUELTO → EN_PROGRESO | `ConflictException("INV-ET07_TRANSICION_INVALIDA")` |
| 5 | IGNORADO → VISTO | `ConflictException("INV-ET07_TRANSICION_INVALIDA")` |
| 6 | NUEVO → NUEVO (idem) | OK silencioso (no-op) |

### `ErrorGroupServiceTests` (~10 casos)

Usar `TestDbContextFactory.Create()` (patrón Chat 2 + Plan 32 Chat 3). Stub `ILogger<ErrorGroupService>` con `NullLogger<T>.Instance`.

| # | Caso | Esperado |
|---|------|----------|
| 1 | `ListarGruposAsync` sin filtros (universo 5 grupos en distintos estados) | 5 items, orden `UltimaFecha DESC` |
| 2 | `ListarGruposAsync(estado: "NUEVO")` | Solo grupos NUEVO |
| 3 | `ListarGruposAsync(severidad: "CRITICAL", q: "horarios")` | Match AND case-insensitive |
| 4 | `ObtenerCountAsync` con mismos filtros que listar | Count == count del listado sin paginación |
| 5 | `ObtenerGrupoConOcurrenciasAsync(id, 1, 10)` con grupo de 25 ocurrencias | 10 ocurrencias, orden `ERL_Fecha DESC`, total 25 |
| 6 | `CambiarEstadoAsync(NUEVO → RESUELTO)` con observación + RowVersion correcto | `ERG_Estado = RESUELTO`, `ERG_Observacion` seteada, `FechaMod` actualizada |
| 7 | `CambiarEstadoAsync(NUEVO → EN_PROGRESO)` sin observación | OK; `ERG_Observacion` permanece null |
| 8 | `CambiarEstadoAsync(RESUELTO → EN_PROGRESO)` (transición prohibida) | `ConflictException("INV-ET07_TRANSICION_INVALIDA")` |
| 9 | `CambiarEstadoAsync(NUEVO → VISTO)` con RowVersion stale | `ConflictException("INV-ET07_ROW_VERSION_STALE")` |
| 10 | `CambiarEstadoAsync(NUEVO → NUEVO)` (no-op) | Sin cambio en BD, mensaje "Sin cambios" |

### `ErrorGroupControllerAuthorizationTests` (~7 casos por reflection)

Patrón canónico del proyecto (ver `CorrelationControllerAuthorizationTests` del Plan 32 Chat 3). Validar por reflection que la clase y cada acción tienen `[Authorize(Roles = Roles.Director)]`. 5 tests por endpoint + 2 negativos (Profesor + AsistenteAdministrativo no pueden mutar).

### `ErrorGroupPurgaSelectivaTests` (~7 casos)

| # | Caso | Esperado |
|---|------|----------|
| 1 | Grupo IGNORADO con UltimaFecha hace 6 días | NO se purga |
| 2 | Grupo IGNORADO con UltimaFecha hace 8 días | Se purga |
| 3 | Grupo NUEVO con UltimaFecha hace 25 días | NO se purga |
| 4 | Grupo EN_PROGRESO con UltimaFecha hace 35 días | Se purga |
| 5 | Grupo RESUELTO con UltimaFecha hace 100 días | NO se purga |
| 6 | Grupo RESUELTO con UltimaFecha hace 200 días | Se purga + CASCADE elimina sus ErrorLogs y ErrorLogDetalles |
| 7 | `ErrorLog` legacy con `ERL_ERG_CodID = null` y `ERL_Fecha` hace 10 días | Se purga vía rama legacy del Job |

**Verificación de cascade**: al purgar un grupo con N ocurrencias y M breadcrumbs por ocurrencia, después del `ExecuteDeleteAsync()` consultar `_context.ErrorLogs.Where(e => e.ERL_ERG_CodID == purgedId).Count()` y `_context.ErrorLogDetalles.Where(d => d.ERD_ERL_CodID == ...).Count()` — ambos deben ser 0.

**Limitación de InMemory para CASCADE**: el InMemory provider **NO ejecuta delete cascade automático** (es feature de motor relacional). Hay 2 caminos para el test #6:
- (A) Aceptar que en InMemory el grupo se borra y los ErrorLogs quedan huérfanos. El test del cascade real va al Integration test environment con SQL Server real (no scope de este chat). Documentar la limitación.
- (B) En el test, después de `ExecuteDeleteAsync()` del grupo, simular el cascade borrando ErrorLogs/Detalles a mano, y validar que el conteo final es 0.

**Recomendación**: opción A — documentar la limitación con comentario inline en el test y cubrir el cascade con el invariante FK declarado en BD (verificado por el script SQL del Chat 2 que ya corrió). El test Chat 3 valida la lógica de selección de qué grupos purgar, no el cascade del provider.

## REGLAS OBLIGATORIAS

- **Cap 300 líneas** por archivo (`backend.md` regla dura). Si `ErrorGroupService.cs` se acerca, partir a `.Purga.cs` y/o `.Consultas.cs` con el patrón ya validado en Chat 2.
- **`AsNoTracking()`** en TODA query de lectura del repo (`INV-D05`).
- **`ApiResponse<T>`** en TODOS los endpoints (`INV-D08`).
- **Excepciones tipadas** del proyecto:
  - `NotFoundException("ERROR_GROUP_NOT_FOUND", ...)` cuando el id no existe
  - `ConflictException("INV-ET07_*", ...)` para transiciones inválidas, RowVersion stale, estado inválido
  - El `GlobalExceptionMiddleware` las traduce a 404/409 con `ApiResponse<>` automáticamente — NO hacer try/catch en el controller para esas
- **RowVersion serialización**: usar `Convert.ToBase64String(grupo.ERG_RowVersion ?? Array.Empty<byte>())` en los DTOs (mismo patrón que `ReporteUsuario` línea 280).
- **`StateMachines.ErrorGroup.EnsureTransicionValida`** vive en `Domain/StateMachines/` siguiendo el patrón `Domain/StateMachines/ReporteUsuario.cs` (consultar antes de codificar la matriz). Si el archivo de domain no existe aún, crearlo.
- **DI registration**: `IErrorGroupService` y `IErrorGroupRepository` deben ir en `Extensions/ServiceExtensions.AddApplicationServices` y `Extensions/RepositoryExtensions.AddRepositories` respectivamente. Buscar el bloque donde se registran `IReporteUsuarioService`/`IReporteUsuarioRepository` y agregarse al lado.
- **Logging estructurado** con placeholders, no string interpolation: `_logger.LogInformation("ErrorGroup {Id} cambiado a {Estado} por {Usuario}", ...)`.
- **Rate limit**: heredar el `global` (no usar override). El admin no llama esto en hot path.
- **`InMemory` no soporta cascade** — los tests de purga lo documentan inline como limitación conocida.

## APRENDIZAJES TRANSFERIBLES (del Chat 2 BE — commit `bcd1532`)

- **Patrón `ReporteUsuario` 1:1**: la máquina de estados, `ActualizarEstadoAsync` con RowVersion, `_repo.UpdateAsync(entidad, rowVersion, "XXX_RowVersion")` — todo replicable. Ver `Services/Sistema/ReporteUsuarioService.cs:121-148` y `Repositories/Sistema/ReporteUsuarioRepository.cs:69-72`.
- **Patrón `BaseRepository.UpdateAndSaveAsync`**: maneja la conversión de `string base64 → byte[]` para RowVersion y la `DbUpdateConcurrencyException` automáticamente. NO reinventar.
- **Patrón split en partials**: `ErrorLogService` ya está partido en 3 (Chat 2). Si `ErrorGroupService` excede 300 ln, repetir el patrón con `.Purga.cs` (lectura/escritura/dominio especial separadas).
- **`TestDbContextFactory.Create()`** ya relaja `ERG_RowVersion`. NO agregar nada más al factory para este chat.
- **Tests de authz por reflection**: ver `CorrelationControllerAuthorizationTests.cs` (Plan 32 Chat 3). `[Theory]` sobre 4 roles admin + 3 no-admin + clase tiene `[Authorize]`. Para Chat 3 usaremos `Roles.Director` (no Administrativos) — el `[Theory]` admin se reduce a 1 caso (Director) + 3 negativos (AsistenteAdmin, Profesor, Estudiante).
- **Ordenamiento del listado**: `OrderByDescending(g => g.ERG_UltimaFecha)` cubre el patrón de "qué bug pasó hace menos" — el índice `IX_ErrorGroup_Estado_UltimaFecha` (ya creado) lo cubre.
- **`pagination.md` variante B**: el endpoint `/count` separado con MISMOS filtros que `/listar` es el patrón que el Chat 2 ya aplicó a `error-logs`. Filtros compartidos vía método privado static `AplicarFiltros(IQueryable<ErrorGroup>, ...)` para evitar drift.
- **El admin controller actual de error-logs** vive en `Controllers/Sistema/ErrorLogController.cs`. NO crear `ErrorGroupController` adentro de ese — es archivo separado al lado, route distinta.
- **Chat 2 dejó deuda menor identificada**: `Truncate` y `MaskDni` están duplicados en `ErrorLogService` y se pueden mover a `Helpers/Formatting/` en un futuro PR. NO scope de este chat.

## DOCS — `business-rules.md`

Agregar al final de §15.12 (después de `INV-ET02`):

```markdown
| `INV-ET03` | ErrorGroup | Toda ocurrencia (`ErrorLog`) pertenece a un `ErrorGroup` determinado por `ERG_Fingerprint`. Si el grupo no existe, se crea con estado `NUEVO`. Si existe en estado `RESUELTO`, se reabre a `NUEVO` automáticamente y se incrementa `ERG_ContadorPostResolucion`. Si está en `IGNORADO`, NO se reabre (las ocurrencias se persisten igual para audit trail) | `ErrorLogService.PersistErrorLogWithGroupAsync` (Chat 2) |
| `INV-ET04` | ErrorGroup | El estado del bug vive en `ErrorGroup`, no en ocurrencias individuales. Los breadcrumbs (`ErrorLogDetalle`) siguen vinculados a su ocurrencia | Modelo + UPSERT |
| `INV-ET05` | ErrorGroup | Purga selectiva por estado del grupo: `IGNORADO` → 7 días, `NUEVO/VISTO/EN_PROGRESO` → 30 días, `RESUELTO` → 180 días desde `ERG_UltimaFecha`. El delete del grupo elimina sus ocurrencias y breadcrumbs en cascade. `ErrorLog` con `ERL_ERG_CodID = NULL` (huérfanos legacy) siguen purgándose con la regla vieja de 7 días por `ERL_Fecha` | `ErrorGroupService.PurgarGruposPorEstadoAsync` + `ErrorLogService.PurgarOcurrenciasHuérfanasAsync` |
| `INV-ET06` | ErrorGroup | `ERG_Fingerprint` se computa con `SHA-256(severidad ‖ normalize(mensaje) ‖ normalize(url) ‖ httpStatus ‖ errorCode)` por `ErrorFingerprintCalculator`. Cambiar el algoritmo de normalización requiere job de rehash documentado | `Helpers/Sanitization/ErrorFingerprintCalculator.cs` (Chat 2) |
| `INV-ET07` | ErrorGroup | Transiciones de estado validan `RowVersion` (optimistic concurrency). Solo Director muta. Las únicas transiciones permitidas desde RESUELTO/IGNORADO son hacia NUEVO. Drops desde la UI Kanban a transiciones inválidas se previenen visualmente y el backend rechaza con `ConflictException("INV-ET07_TRANSICION_INVALIDA")` por defensa en profundidad | `ErrorGroupService.CambiarEstadoAsync` + `Domain/StateMachines/ErrorGroup.cs` |
```

Crear nueva sección §19 (después de §18 Correos Salientes), espejando §16 Reportes de Usuario:

```markdown
## 19. Saneamiento de errores con ErrorGroup

> **"Si lo veo, lo resuelvo y vuelve a ocurrir, no quiero ver evento huérfano sino el mismo bug con su historia."**

[1-2 párrafos describiendo el dominio: ErrorGroup como concepto separado de ErrorLog, fingerprint como huella, máquina de estados, purga selectiva, complementariedad con ReporteUsuario y EmailOutbox]

### 19.1 Arquitectura de las 3 capas
[explicar ErrorLog (ocurrencia inmutable) → ErrorGroup (bug agrupado) → admin UI (Chat 4-5 FE)]

### 19.2 Máquina de estados
[matriz de transiciones permitidas, justificación, mención de la auto-reapertura del Chat 2]

### 19.3 Privacidad y retención
[DNIs enmascarados en DTOs, retención por estado, INV-ET05]

### 19.4 Correlación con otras vistas admin
[link a §16 Reportes de Usuario y al hub de correlación del Plan 32]
```

Ambos cambios viven en `educa-web/.claude/rules/business-rules.md` — el chat new tendrá que editar el repo FE además del BE para cerrar el chat correctamente. Esto es **explícito y esperado** (las invariantes son docs cross-repo).

## FUERA DE ALCANCE

- **Frontend (Chat 4 FE + Chat 5 FE)** — vista tabla, drawer, dialog cambio estado, Kanban con drag-drop CDK. Chat 3 BE solo deja los endpoints listos.
- **Backfill de ErrorLog legacy** (decisión 8 del /design del Plan 34): NO se hace. Los huérfanos se purgan con la rama legacy del Job en 7 días.
- **Modificar `ErrorLogService.cs`** salvo el método nuevo `PurgarOcurrenciasHuérfanasAsync` que reemplaza al actual `PurgarAntiguosAsync`. NO tocar Registro/Consultas/Upsert.
- **Cambios al `ErrorFingerprintCalculator`** — quedó cerrado en Chat 2, INV-ET06 lo blinda.
- **Filtro por `correlationId`** en el listado de ErrorGroup — innecesario porque el correlation va al ErrorLog (drill-down en ocurrencias del drawer). El hub de correlación (Plan 32) ya cubre el cross-link.
- **Endpoint para resetear contador `ERG_ContadorPostResolucion`** — fuera de scope; el contador se calcula automáticamente y los admins no lo manipulan.
- **Métricas/dashboard** ("cuántos bugs resueltos esta semana") — fuera de scope; el admin lo deduce visualmente del Kanban.

## CRITERIOS DE CIERRE

- [ ] Pre-work del plan estimado de query corrido en BD prueba (decidir si crear `IX_ErrorLog_ErrorGroup_Fecha` extra — probable que no)
- [ ] `Domain/StateMachines/ErrorGroup.cs` con matriz de transiciones + tests (~6 casos)
- [ ] `ErrorGroupRepository` (queries `AsNoTracking()` + `UpdateAsync` con RowVersion)
- [ ] `ErrorGroupService` (5 métodos públicos) con cap 300 — split a `.Purga.cs` si se pasa
- [ ] `ErrorGroupController` con 5 endpoints + `[Authorize(Roles = Roles.Director)]` + validaciones
- [ ] 4 DTOs nuevos (Lista, Detalle, Ocurrencia, CambiarEstado)
- [ ] `ErrorLogPurgeJob` reescrito a 2 llamadas (selectiva + huérfanos legacy)
- [ ] DI registrado en `RepositoryExtensions` + `ServiceExtensions`
- [ ] `business-rules.md` §15.12 con `INV-ET03/04/05/06/07` agregados
- [ ] `business-rules.md` nueva sección §19 Saneamiento de errores
- [ ] Tests verdes (~+30 sobre baseline post-Chat 2 que es 1421): 6 state machine + 10 service + 7 controller authz + 7 purga selectiva
- [ ] Build sin warnings nuevos
- [ ] Cap 300 ln respetado en cada archivo
- [ ] Commit BE + commit FE (docs) — ambos en commit message canónico
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar
- [ ] Actualizar `educa-web/.claude/plan/maestro.md` (renglón Plan 34): pasar % de 40% a ~60%, marcar "Chat 3 BE ✅ cerrado <fecha>"
- [ ] Actualizar la cola "📋 Próximos 3 chats" del maestro: agregar Plan 34 Chat 4 FE al final si la prioridad lo justifica

## COMMIT MESSAGE sugerido

**Backend** (`Educa.API master`):

```
feat(error-trace): Plan 34 Chat 3 — "ErrorGroup" service + selective purge

Add "ErrorGroupService" + "ErrorGroupController" + "ErrorGroupRepository"
exposing the admin-facing read/write surface for the bug-grouping table
introduced in Chat 2: list with filters + count, detail, paginated
occurrences for the drawer drill-down, and PATCH /estado that validates
RowVersion + delegates the transition matrix to a domain state machine
("Domain/StateMachines/ErrorGroup.cs"). Active states ("NUEVO" / "VISTO" /
"EN_PROGRESO") transition freely between each other; "RESUELTO" and
"IGNORADO" are soft-terminal — they only reopen back to "NUEVO". Invalid
transitions throw "ConflictException(INV-ET07_TRANSICION_INVALIDA)".

Replace the global 7-day purge with selective retention by group state
("IGNORADO" 7d / active 30d / "RESUELTO" 180d, all measured from
"ERG_UltimaFecha"). The "ErrorLogPurgeJob" delegates to two calls:
group-state purge in "ErrorGroupService" (CASCADE removes occurrences and
breadcrumbs) and a legacy branch in "ErrorLogService" that purges orphan
"ErrorLog" rows with "ERL_ERG_CodID = NULL" using the old 7-day rule.

Authorization is "Director"-only (INV-ET07) — read and write. The
"AsistenteAdministrativo" path is left out by design and can be added
later with explicit justification.

Includes ~30 new tests (6 state machine, 10 service, 7 controller authz
by reflection, 7 selective purge with InMemory cascade limitation
documented inline). Backend suite: ~1451 green.
```

**Frontend** (`educa-web main`, docs only — same commit pattern as Plan 34 Chat 2 closure):

```
docs(rules,plan): Plan 34 Chat 3 BE closed (Educa.API <hash>)

Add "INV-ET03" through "INV-ET07" to "business-rules.md" §15.12 covering
fingerprint upsert (INV-ET03/INV-ET06), state-on-group invariant
(INV-ET04), selective retention by state (INV-ET05) and transition matrix
+ RowVersion enforcement (INV-ET07). Add new section §19 "Saneamiento de
errores" mirroring §16 "Reportes de Usuario" — describes the 3-layer
architecture (ErrorLog occurrence / ErrorGroup bug / admin UI), the
state-machine matrix and the cross-link to the correlation hub of Plan 32.

Mark Plan 34 Chat 3 BE as closed in maestro and the plan file. Maestro
Plan 34 row goes from 40% to 60% (1 design + 2 BE chats closed of 5).
Brief moved to "chats/closed/".

Next chat in the plan: Chat 4 FE — admin tabla view + multi-facade +
drawer + dialog cambio estado consuming the 5 endpoints just shipped.
```

## CIERRE

Al cerrar este chat, pedir feedback al usuario sobre:

1. ¿La matriz de transiciones quedó intuitiva o el Kanban del Chat 5 va a necesitar mover X → Y que hoy está prohibido? (si aparecen casos al cablear el FE, abrir follow-up para relajar la matriz — solo afecta el dominio puro).
2. ¿La purga selectiva 7/30/180 es razonable en producción real? Después de 1-2 semanas con datos reales, validar que no esté borrando bugs `IGNORADO` que el admin todavía consultaba (subir a 14 días si aplica).
3. ¿El authz `Director`-only aplica también para reads o algún `AsistenteAdministrativo` querría ver el panel? (decisión documentada: solo Director — fácil de relajar a `Administrativos` en Chat 4 FE si el usuario lo pide).
4. ¿Listo para `/next-chat plan 34` que generaría el brief de Chat 4 FE (vista tabla + drawer + dialog cambio estado, ~18 archivos FE)?
