> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 34 · **Chat**: 2 · **Fase**: F1 BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 34 Chat 2 — `ErrorGroup`: modelo + migración SQL + UPSERT en `ErrorLogService`

## PLAN FILE

Ruta del plan: `../../educa-web/.claude/plan/saneamiento-errores.md` — sección **"Chat 2 BE — Modelo + migración SQL + UPSERT en `ErrorLogService`"**.

Maestro: `../../educa-web/.claude/plan/maestro.md` — Plan 34 (renglón en inventario).

## OBJETIVO

Convertir `ErrorLog` de "lista plana inmutable" a "ocurrencias agrupadas por bug": agregar la tabla `ErrorGroup` y modificar el path crítico de inserts (`ErrorLogService.RegistrarErrorFrontendAsync` + `RegistrarErrorBackendAsync`) para hacer UPSERT al grupo antes de insertar la ocurrencia. Esto habilita los chats siguientes (Chat 3 BE = endpoints de gestión, Chats 4-5 FE = tabla + Kanban).

## PRE-WORK OBLIGATORIO

**Antes de tocar cualquier C#**, mostrar al usuario el script SQL completo para que lo inspeccione y lo ejecute manualmente en BD prueba (regla `backend.md` § Migraciones — "NUNCA ejecutar scripts SQL sin mostrarlos al usuario primero"):

```sql
-- 1. Tabla nueva
CREATE TABLE ErrorGroup (
    ERG_CodID                  BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ERG_Fingerprint            CHAR(64) NOT NULL,
    ERG_Severidad              NVARCHAR(20) NOT NULL,
    ERG_MensajeRepresentativo  NVARCHAR(500) NOT NULL,
    ERG_Url                    NVARCHAR(500) NOT NULL,
    ERG_HttpStatus             INT NULL,
    ERG_ErrorCode              NVARCHAR(50) NULL,
    ERG_Origen                 NVARCHAR(20) NOT NULL,
    ERG_Estado                 NVARCHAR(20) NOT NULL DEFAULT 'NUEVO',
    ERG_Observacion            NVARCHAR(1000) NULL,
    ERG_PrimeraFecha           DATETIME2 NOT NULL,
    ERG_UltimaFecha            DATETIME2 NOT NULL,
    ERG_ContadorTotal          INT NOT NULL DEFAULT 1,
    ERG_ContadorPostResolucion INT NOT NULL DEFAULT 0,
    ERG_RowVersion             ROWVERSION NOT NULL,
    ERG_UsuarioReg             NVARCHAR(100) NOT NULL DEFAULT 'sistema',
    ERG_FechaReg               DATETIME2 NOT NULL,
    ERG_UsuarioMod             NVARCHAR(100) NULL,
    ERG_FechaMod               DATETIME2 NULL
);

-- 2. Índices
CREATE UNIQUE INDEX UX_ErrorGroup_Fingerprint ON ErrorGroup(ERG_Fingerprint);
CREATE INDEX IX_ErrorGroup_Estado_UltimaFecha ON ErrorGroup(ERG_Estado, ERG_UltimaFecha DESC);

-- 3. FK opcional desde ErrorLog (nullable para legacy)
ALTER TABLE ErrorLog ADD ERL_ERG_CodID BIGINT NULL;
ALTER TABLE ErrorLog ADD CONSTRAINT FK_ErrorLog_ErrorGroup
    FOREIGN KEY (ERL_ERG_CodID) REFERENCES ErrorGroup(ERG_CodID) ON DELETE CASCADE;
CREATE INDEX IX_ErrorLog_ErrorGroup ON ErrorLog(ERL_ERG_CodID);
```

**Confirmaciones a pedir al usuario antes de ejecutar el script**:

1. ¿BD prueba lista para recibir DDL?
2. ¿Confirma valores default de `ERG_UsuarioReg` (`'sistema'`) o prefiere otro literal?
3. ¿Confirma `ON DELETE CASCADE` (al borrar grupo se borran sus ocurrencias y breadcrumbs)?

Una vez ejecutado en BD, pedir al usuario:
- `SELECT TOP 5 * FROM ErrorGroup` — vacío al inicio
- `EXEC sp_help 'ErrorLog'` o equivalente — confirmar que tiene `ERL_ERG_CodID NULL` y la FK

## ALCANCE

| # | Archivo | Tipo | Estimado |
|---|---------|------|----------|
| 1 | `Educa.API/Models/Sistema/ErrorGroup.cs` | Nuevo | ~70 ln |
| 2 | `Educa.API/Models/Sistema/ErrorLog.cs` | Modificar (+1 propiedad + navigation) | +10 ln |
| 3 | `Educa.API/Constants/Sistema/ErrorGroupEstados.cs` | Nuevo (mismo patrón que `ReporteUsuarioEstados`) | ~25 ln |
| 4 | `Educa.API/Helpers/Sanitization/ErrorFingerprintCalculator.cs` | Nuevo (función pura) | ~80 ln |
| 5 | `Educa.API/Data/ApplicationDbContext.cs` | +1 `DbSet<ErrorGroup>` + Fluent API si hace falta | +10 ln |
| 6 | `Educa.API/Services/Sistema/ErrorLogService.cs` | Modificar `RegistrarErrorFrontendAsync` + `RegistrarErrorBackendAsync` con UPSERT | +80 ln (cap 300 ln total — service actual ~380 ln, considerar partial `.Upsert.cs` si se pasa) |
| 7 | `Educa.API.Tests/Helpers/Sanitization/ErrorFingerprintCalculatorTests.cs` | Nuevo | ~120 ln |
| 8 | `Educa.API.Tests/Services/Sistema/ErrorLogServiceUpsertTests.cs` | Nuevo | ~250 ln |

**Modelo `ErrorGroup` debe incluir**:

- 4 campos de auditoría estándar (`ERG_UsuarioReg`, `ERG_FechaReg`, `ERG_UsuarioMod`, `ERG_FechaMod`) — INV-D02
- `[Timestamp] [Column("ERG_RowVersion")] public byte[] ERG_RowVersion` — habilita optimistic concurrency en Chat 3
- Navigation `public ICollection<ErrorLog> Ocurrencias { get; set; } = new List<ErrorLog>();`
- Defaults razonables (`ERG_Estado = ErrorGroupEstados.Nuevo`, fechas con `DateTimeHelper.PeruNow()`) — INV-D04

**Lógica del UPSERT en `ErrorLogService`** (núcleo del chat):

```
1. Calcular fingerprint con ErrorFingerprintCalculator.Compute(severidad, mensaje, url, httpStatus, errorCode)
2. Iniciar transacción explícita (using var tx = await _context.Database.BeginTransactionAsync())
3. Buscar grupo por fingerprint con FirstOrDefaultAsync (NO AsNoTracking — vamos a mutar)
4. Si NO existe:
   - Crear nuevo ErrorGroup con Estado=NUEVO, ContadorTotal=1, ContadorPostResolucion=0,
     PrimeraFecha=ahora, UltimaFecha=ahora, MensajeRepresentativo=mensaje truncado
   - SaveChangesAsync para obtener ERG_CodID
5. Si SÍ existe:
   - ContadorTotal++, UltimaFecha=ahora
   - Si Estado == RESUELTO: cambiar a NUEVO, ContadorPostResolucion++,
     LogInformation("ErrorGroup {Id} reabierto post-resolución, ContadorPost={N}", ...)
   - Si Estado == IGNORADO: NO tocar Estado (las ocurrencias se persisten igual)
6. Insertar ErrorLog (con todos los campos actuales) + ERL_ERG_CodID = grupo.ERG_CodID
7. SaveChangesAsync + tx.CommitAsync
8. Si cualquier paso falla: tx.RollbackAsync + LogWarning + propagar excepción para que el catch externo
   (en ErrorLogController y GlobalExceptionMiddleware) la silencie como hoy → INV-ET01/ET02 intactos
```

**`ErrorFingerprintCalculator.Compute` debe**:

- Recibir: `string severidad, string? mensaje, string? url, int? httpStatus, string? errorCode`
- Normalizar `mensaje`: lowercase, regex strip de `Guid` (`[a-f0-9]{8}-[a-f0-9]{4}-...`), strip de IDs largos (`\b\d{6,}\b`), strip de fechas ISO (`\d{4}-\d{2}-\d{2}T?...`), colapsar whitespace
- Normalizar `url`: lowercase, strip query string (todo después de `?`), reemplazar segmentos numéricos por `:id` (regex `/\d+`)
- Concatenar con separador unicode improbable (ej: `␀`) para evitar colisiones
- Retornar SHA-256 hex lowercase (64 chars)
- Funcion **pura** y **estática**: sin DI, sin estado, sin IO. Determinística para mismo input

## TESTS MÍNIMOS

### `ErrorFingerprintCalculatorTests`

| # | Caso | Esperado |
|---|------|----------|
| 1 | Compute("ERROR", "msg", "/api/x", 500, "EX01") dos veces | Misma huella |
| 2 | Compute(ERROR, "Cannot read prop x of undefined", "/api/horarios/123", 500, null) y Compute(ERROR, "Cannot read prop x of undefined", "/api/horarios/456", 500, null) | Misma huella (URL normalizada) |
| 3 | Compute con mensaje que tiene GUID `Error abc12345-67ab-cdef-0123-456789abcdef` y misma sin GUID | Misma huella (GUID stripped) |
| 4 | Compute con httpStatus distinto | Distinta huella |
| 5 | Compute con severidad distinta | Distinta huella |
| 6 | Compute con mensaje null y mensaje "" | Misma huella |
| 7 | Compute con URL `/api/USERS?cb=1234` y `/api/users` | Misma huella (lowercase + strip query) |
| 8 | Output siempre 64 chars hex lowercase | Sí |
| 9 | Compute con mensaje que tiene fecha ISO `Failed at 2026-04-25T15:30:00.123Z processing` y misma sin fecha | Misma huella |

### `ErrorLogServiceUpsertTests`

Usar `TestDbContextFactory` (patrón existente — ver `EmailOutboxServiceEnqueueCorrelationTests` del Plan 32 Chat 2 como referencia para mocking de `IHttpContextAccessor` y EF InMemory).

| # | Caso | Esperado |
|---|------|----------|
| 1 | Insert primer error → ErrorGroup count = 1 con Estado=NUEVO, ContadorTotal=1, ContadorPostResolucion=0 | Grupo creado |
| 2 | Insert dos errores con mismo fingerprint → ErrorGroup count = 1 con ContadorTotal=2 | Solo 1 grupo |
| 3 | Insert error con grupo existente en estado RESUELTO → grupo pasa a NUEVO + ContadorPostResolucion=1 | Reapertura auto + log |
| 4 | Insert error con grupo existente en estado IGNORADO → grupo sigue IGNORADO + ContadorTotal++ | NO reapertura |
| 5 | Insert que falla en la transacción (simular DbUpdateException en SaveChanges) → rollback completo, ningún grupo ni ocurrencia persistida | Atomicidad |
| 6 | Insert error frontend con todos los campos opcionales en null → no explota, fingerprint determinístico | Robustez |
| 7 | Insert error backend desde excepción → severidad calculada según httpStatus (500 → CRITICAL, 409 → WARNING) | Lógica preservada del service actual |
| 8 | Insert error con grupo existente en estado VISTO/EN_PROGRESO → grupo NO cambia estado, solo ContadorTotal++ y UltimaFecha | Estados activos no se reabren ni se silencian |
| 9 | Insert con breadcrumbs → ErrorLog persistido con FK a grupo + N breadcrumbs colgando del ErrorLog (no del grupo) — INV-ET04 | Estructura preservada |

**Tests de regresión obligatorios**: verificar que `ErrorLog` legacy sin grupo (con `ERL_ERG_CodID = NULL`) sigue siendo válido en BD y queries existentes (`ObtenerErroresRecientesAsync`) siguen funcionando aunque la columna nueva sea NULL.

## REGLAS OBLIGATORIAS

- **Cap 300 líneas** por archivo (`backend.md` regla dura). `ErrorLogService.cs` actual = ~380 líneas; agregar UPSERT lo desborda. **Usar partial class** `ErrorLogService.Upsert.cs` para aislar la lógica nueva (mismo patrón que `EmailOutboxService.Enqueue.cs` del Plan 32). Alternativa: extraer helper privado a archivo separado si la partial no encaja.
- **INV-ET01 / INV-ET02 intactos**: persistencia fire-and-forget. Si la transacción del UPSERT falla, propagar excepción para que `ErrorLogController.ReportarError` y `GlobalExceptionMiddleware` la atrapen como hoy. Resultado para el cliente: idéntico (HTTP 201/respuesta de error sin afectarse).
- **INV-D02**: auditoría completa en `ErrorGroup` (4 campos). El service usa `DateTimeHelper.PeruNow()` para `ERG_FechaReg` y `ERG_UltimaFecha`.
- **INV-D04**: fechas en hora Perú (UTC-5). `DateTimeHelper.PeruNow()` ya está en uso en `ErrorLog`.
- **INV-D05**: `AsNoTracking()` solo en queries de lectura. El UPSERT debe trackear el grupo para mutarlo.
- **Soft delete N/A**: `ErrorGroup` se elimina físicamente vía purga (Chat 3). NO agregar `ERG_Estado` booleano de activo/inactivo — el `Estado` es semántico (NUEVO/VISTO/etc.), no soft delete.
- **DI**: agregar `DbSet<ErrorGroup>` al `ApplicationDbContext`. Service ya está registrado, no requiere cambios en `ServiceExtensions`.
- **Logging estructurado** con placeholders, no string interpolation: `_logger.LogInformation("ErrorGroup {Id} reabierto post-resolución", grupo.ERG_CodID)`.

## APRENDIZAJES TRANSFERIBLES (del Chat 1 /design)

- **Patrón `ReporteUsuario` como referencia 1:1**: la máquina de estados, la columna `RowVersion`, la observación opcional, el patrón de transiciones — todo está en `Models/Sistema/ReporteUsuario.cs` + `Constants/Sistema/ReporteUsuarioTipos.cs`. Replicar la estructura, NO inventar.
- **Patrón Plan 32 Chat 2 partial class**: `EmailOutboxService.Enqueue.cs` aisla lógica nueva sin desbordar el cap 300. Aplicar el mismo patrón a `ErrorLogService.Upsert.cs`.
- **`TestDbContextFactory`**: el helper de tests con EF InMemory ya está en `Educa.API.Tests/`. Algunos modelos con `[Timestamp] RowVersion` requieren ajuste en el factory (ver patrones existentes con `EmailOutbox`/`EmailBlacklist`/`REU_RowVersion` del Plan 32 Chat 3). `ErrorGroup` tendrá `ERG_RowVersion` y necesitará la misma relajación.
- **Reapertura auto desde RESUELTO** es la única transición que el UPSERT muta. Las demás transiciones (`NUEVO → VISTO`, `VISTO → EN_PROGRESO`, etc.) llegan vía endpoint del Chat 3 con validación de RowVersion. Este chat NO valida transiciones de cambios manuales — solo la auto-reapertura RESUELTO → NUEVO.
- **`MensajeRepresentativo` del grupo**: usar el mensaje del PRIMER insert truncado a 500 chars. NO reescribirlo en cada nueva ocurrencia (el mensaje crudo de cada ocurrencia ya queda en `ErrorLog.ERL_Mensaje`). El `MensajeRepresentativo` es el "título" del bug en la UI.
- **`Url` del grupo**: usar la URL normalizada del primer insert (con `:id` en vez de número). Si el primer match a la huella vino con `/api/users/123`, el grupo guarda `/api/users/:id`.

## FUERA DE ALCANCE

- **Endpoints de gestión** (`GET /error-groups`, `PATCH /{id}/estado`, etc.) — son del **Chat 3 BE**.
- **Purga selectiva por estado** (`ErrorLogPurgeJob` modificación) — Chat 3 BE.
- **Backfill de errores existentes**: NO se hace (decisión 8 del /design). Errores actuales con `ERL_ERG_CodID = NULL` se siguen purgando con la regla vieja de 7 días.
- **DTOs nuevos** (`ErrorGroupListaDto`, `OcurrenciaListaDto`, etc.) — Chat 3 BE.
- **Frontend** (vista tabla + Kanban) — Chats 4-5 FE.
- **`business-rules.md` `§19 Saneamiento de errores` + `INV-ET03/04/05/06/07`**: documentación se hace en Chat 3 cuando los endpoints están listos. Este chat solo deja las semillas en el código.
- **`ReporteUsuario` u otras tablas**: no se tocan.

## CRITERIOS DE CIERRE

- [ ] Script SQL mostrado al usuario y ejecutado por él en BD prueba (con confirmaciones del PRE-WORK)
- [ ] Modelo `ErrorGroup.cs` creado con auditoría completa + RowVersion + navigation a `ErrorLog`
- [ ] `ErrorLog.cs` con `ERL_ERG_CodID` opcional + navigation a `ErrorGroup`
- [ ] `ErrorGroupEstados.cs` con const strings + array `Validos[]`
- [ ] `ErrorFingerprintCalculator.cs` puro, determinístico, 64 chars hex lowercase
- [ ] `ApplicationDbContext` con `DbSet<ErrorGroup>`
- [ ] `ErrorLogService` (o partial `.Upsert.cs`) con UPSERT atómico + reapertura auto + log
- [ ] Cap 300 líneas respetado en cada archivo
- [ ] `ErrorFingerprintCalculatorTests` con 9 casos verdes
- [ ] `ErrorLogServiceUpsertTests` con 9 casos verdes
- [ ] Suite BE completa verde (~+18 tests sobre baseline; baseline actual ~1397 verdes post-Plan 32 Chat 3)
- [ ] Build sin warnings nuevos
- [ ] Verificación post-deploy: `SELECT TOP 5 * FROM ErrorGroup ORDER BY ERG_CodID DESC` después de generar 1-2 errores manuales (POST a `/api/sistema/errors` o forzando un 500) muestra que se crearon
- [ ] Commit con mensaje sugerido abajo
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat
- [ ] Actualizar `educa-web/.claude/plan/maestro.md` (renglón Plan 34): pasar % de 20% a ~40%, marcar "Chat 2 BE ✅ cerrado <fecha>"
- [ ] Actualizar la cola "📋 Próximos 3 chats" del maestro: agregar Plan 34 Chat 3 BE al final si la prioridad lo justifica

## COMMIT MESSAGE sugerido

```
feat(error-trace): introduce "ErrorGroup" with fingerprint upsert

Add a new "ErrorGroup" table that aggregates "ErrorLog" occurrences sharing
the same fingerprint. The fingerprint is precomputed via
"ErrorFingerprintCalculator" using SHA-256 over (severidad, normalize(mensaje),
normalize(url), httpStatus, errorCode). Each insert now opens a transaction,
upserts the group, increments counters and reopens the group from "RESUELTO"
back to "NUEVO" (incrementing ContadorPostResolucion); "IGNORADO" is never
reopened.

Existing rows keep "ERL_ERG_CodID" as NULL and continue to be purged by the
legacy 7-day rule until they fall off naturally. Persistence remains
fire-and-forget (INV-ET01/INV-ET02): a failure in the upsert transaction is
logged and swallowed by the existing controller catch.

Includes "ErrorGroupEstados" constants, RowVersion on the new table for
upcoming Chat 3 endpoints, and 18 tests covering fingerprint determinism,
upsert paths, and reopen-vs-ignore semantics.
```

## CIERRE

Al cerrar este chat, pedir feedback al usuario sobre:

1. ¿El SQL se ejecutó sin issues en producción cuando llegue el deploy? (verificación in-situ post-deploy del usuario, no del chat)
2. ¿La normalización de la huella (`ErrorFingerprintCalculator.normalize`) deja errores que **deberían** agruparse pero quedan en grupos distintos? Si aparecen casos en producción, abrir un follow-up para refinar regex sin tocar el algoritmo de hash.
3. ¿El partial class `ErrorLogService.Upsert.cs` quedó claro o conviene extraer a un helper estático aparte (`ErrorLogUpsertHelper`)? Decisión local del chat — documentar la elegida en este archivo antes de moverlo a `closed/`.
4. ¿Listo para `/next-chat plan 34` que generaría el brief de Chat 3 BE (endpoints + purga selectiva + DTOs)?

---

## NOTAS DE EJECUCIÓN (2026-04-25)

**Decisión sobre el partial vs helper estático (punto 3 del CIERRE):**

Se eligió **partial class `ErrorLogService.Upsert.cs`** (mismo patrón que `EmailOutboxService.Enqueue.cs` del Plan 32). Razones:

- El UPSERT es lógica de instancia (necesita `_context` y `_logger` inyectados); un helper estático obligaría a pasarlos como parámetros y rompería simetría con `EmailOutboxService.Enqueue.cs`.
- El refactor requirió **además** dividir `ErrorLogService` en 3 partials porque el archivo original ya estaba en 380 líneas (deuda preexistente al cap 300):
  - `ErrorLogService.cs` (235 ln) — Dependencias + Registro de errores + Purga + Helpers privados
  - `ErrorLogService.Consultas.cs` (164 ln) — `Obtener*Async` + `AplicarFiltros` (split por dominio lectura/escritura)
  - `ErrorLogService.Upsert.cs` (113 ln) — núcleo del chat: `PersistErrorLogWithGroupAsync`
- Cap 300 respetado en los 3 partials.

**Decisión sobre transacción explícita:**

El brief sugería `using var tx = await _context.Database.BeginTransactionAsync()`. Se reemplazó por **una única `SaveChangesAsync`** que agrupa el INSERT/UPDATE del grupo y el INSERT del ErrorLog en la transacción implícita del provider SQL Server. Razones:

- EF Core ya envuelve cada `SaveChangesAsync` en una transacción del provider relacional.
- El provider InMemory de tests **lanza excepción** al llamar `BeginTransactionAsync` sin suprimir warnings — la simplificación evita configurar warnings ignore en `TestDbContextFactory`.
- La lógica de race condition entre lectura `FirstOrDefaultAsync` y escritura es la misma con o sin `BeginTransactionAsync` explícita (READ COMMITTED por defecto). Aceptable para telemetría fire-and-forget — la próxima ocurrencia ya encuentra el grupo creado.

Documentado en el comentario de clase de `ErrorLogService.Upsert.cs`.

**Resultados:**

- ✅ Build: 0 errores, 0 warnings nuevos (los 19 preexistentes se mantienen).
- ✅ Tests nuevos: 24 (9 fingerprint + 15 upsert con `[Theory]` expandido — el brief estimaba ~+18, sobrepasamos por las teorías).
- ✅ Suite BE completa: 1421 passing / 0 failing (baseline post-Plan 32 Chat 3 era ~1397).
- ✅ Cap 300 respetado en los 5 archivos nuevos/modificados.
- ⏳ Verificación post-deploy SQL: pendiente del usuario al deployar a producción.

**Archivos tocados:** 9 (1 SQL ejecutado por usuario + 5 nuevos C# + 3 modificados existentes + 2 tests nuevos).
