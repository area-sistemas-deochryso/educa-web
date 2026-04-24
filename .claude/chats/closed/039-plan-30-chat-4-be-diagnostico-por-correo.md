> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 30 · **Chat**: 4 · **Fase**: F4.BE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #1.

---

# Plan 30 Chat 4 — BE: búsqueda diagnóstico por correo específico

## PLAN FILE

Plan canónico: inline en `../../educa-web/.claude/plan/maestro.md` sección
**"🟡 Plan 30 — Dashboard Visibilidad Admin"**. Este chat es **F4.BE** (cierra
el plan al 100% del back; FE posterior).

Después de este chat el Plan 30 pasa a ~95% (solo FE del Chat 3 queda como
tarea opcional para cuando el admin pida pantalla).

## OBJETIVO

Agregar el endpoint `GET /api/sistema/email-outbox/diagnostico?correo={email}`
que responde en una sola request al dolor #3 del admin: **"¿qué pasó con
`rey.ichigo@hotmail.com`?"**. Reemplaza las queries manuales **M1-M8** que
hoy se ejecutan una por una en SSMS para cruzar outbox + blacklist + a qué
persona(s) pertenece el correo.

**Alcance explícito**: solo BE. El FE consumidor (pantalla admin con cuadro
de búsqueda) es deuda posterior que entra a la cola cuando el admin pida.

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** `Educa.API/Controllers/Sistema/EmailOutboxController.cs` —
   contar líneas actuales. Ya tiene `listar`, `throttle-status`,
   `defer-fail-status`, `dashboard-dia`, `reintentar`. Si está bajo ~250
   líneas, agregar el nuevo endpoint al mismo controller (ruta `/diagnostico`
   bajo `api/sistema/email-outbox`). Si supera el cap con el agregado,
   extraer los nuevos endpoints a controller separado
   `EmailOutboxDiagnosticoController` bajo la misma ruta base.

2. **Leer** `Educa.API/Services/Notifications/EmailDashboardDiaService.cs`
   y `Educa.API/Services/Sistema/DiagnosticoCorreosDiaService.cs` — los dos
   services del Plan 30 ya cerrados. Este chat sigue el **mismo molde**:
   service con `ApplicationDbContext` inyectado (sin repo separado), DTO
   compuesto bajo `DTOs/Sistema/` o `DTOs/Notifications/`, fail-safe INV-S07
   vía factory de snapshot vacío.

3. **Verificar existencia de tabla archive**:

   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'EmailOutbox%';
   ```

   Si existe `EmailOutboxArchive` o similar, incluirla en la historia
   completa. Si no existe, documentarlo y trabajar solo con `EmailOutbox`
   vigente (ajustar alcance quitando la mención a archive del DTO y del
   commit message).

4. **Verificar nombres de campo de correo** en cada tabla de persona:

   ```sql
   SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME IN ('Estudiante','Profesor','Director','Apoderado')
      AND COLUMN_NAME LIKE '%Correo%';
   ```

   Del Chat 3 ya se confirmó `EST_CorreoApoderado` (`Estudiante`). Para
   `Profesor` debería ser `PRO_Correo`, `Director` → `DIR_Correo`,
   `Apoderado` → `APO_Correo` — confirmar antes de codear.

5. **Leer** `Educa.API/Services/Sistema/DiagnosticoCorreosDiaCorrelator.cs`
   — el helper `NormalizarCorreo` (`Trim().ToLowerInvariant()`) es el mismo
   que debe aplicarse aquí al input del admin antes de cualquier query.

6. **Ejecutar SQL de referencia** en dev/prod para dimensionar respuesta:

   ```sql
   -- Universo típico: un correo "hot" con muchos intentos
   SELECT TOP 100 EO_Estado, COUNT(*)
     FROM EmailOutbox
    GROUP BY EO_Estado
    ORDER BY 2 DESC;

   SELECT EO_Destinatario, COUNT(*) AS Intentos
     FROM EmailOutbox
    GROUP BY EO_Destinatario
    HAVING COUNT(*) > 20
    ORDER BY COUNT(*) DESC;
   ```

   Usar el resultado para decidir el cap `MaxHistoriaFilas` (ver §Decisiones).

## DECISIONES A VALIDAR CON EL USUARIO (antes de tocar código)

5 decisiones no triviales. **Todas con recomendación del plan — el usuario
puede aceptar el lote completo o ajustar**.

1. **Cap de filas en la historia**: retornar las últimas N filas del outbox
   para el destinatario. Si un correo tiene 300 intentos históricos, no
   tiene sentido devolverlos todos en una request.
   - **Recomendación**: **últimas 50 filas** ordenadas `EO_FechaReg DESC`.
     Cubre dos semanas típicas para un destinatario saturado. Si el admin
     necesita más, puede filtrar por fecha en un endpoint separado (deuda
     futura, no entra a este chat).

2. **Campos del `HistoriaItem`**: qué traer por cada intento. El HTML
   completo (`EO_CuerpoHtml`) sería ruido e inflaría la respuesta.
   - **Recomendación**: solo metadatos — `Fecha`, `Tipo`, `Asunto`,
     `Estado`, `TipoFallo?`, `Intentos`, `UltimoError?` (truncado a 200
     chars), `Remitente?`, `BounceSource?`, `BounceDetectedAt?`. **No** incluir
     `CuerpoHtml` ni `Bcc`.

3. **Paginación o cap hard**: ¿query param `?limit=N` o fijo en la config
   del service?
   - **Recomendación**: **fijo en config** (`EmailSettings.DiagnosticoMaxFilas
     = 50`, fallback a const si la config no está). Un endpoint de
     diagnóstico ad-hoc no necesita paginación dinámica — si el admin
     necesita todo, ve a SSMS. Mantiene el endpoint trivial de cachear
     eventualmente.

4. **¿Enmascarar el correo de entrada en la respuesta?**: el admin escribió
   el correo completo en el query string — ya lo conoce.
   - **Recomendación**: **devolver crudo el correo consultado** (echo en
     `CorreoConsultado`). Pero **enmascarar** DNIs de personas asociadas
     (respetar INV-D09 spirit). Correos de otras personas asociadas (poco
     común pero puede pasar si el correo está duplicado) también crudos —
     la fuga de privacidad está acotada al correo que el admin ya tipeó.

5. **Rate limit**: hereda del global o override específico?
   - **Recomendación**: **sin override**. El endpoint es diagnóstico
     puntual — el admin busca un correo concreto, no hace polling. El
     global del rol admin (200/min) sobra. Si aparece abuso, se agrega
     después.

Durante el chat, el usuario acepta/ajusta antes de que se escriba código.

## ALCANCE

### Archivos a crear

| # | Archivo | Rol | Líneas est. |
|---|---------|-----|-----------:|
| 1 | `DTOs/Sistema/EmailDiagnosticoDto.cs` | DTO compuesto (CorreoConsultado + resumen + historia[] + blacklist? + personasAsociadas[]) | ~40 |
| 2 | `DTOs/Sistema/EmailDiagnosticoResumen.cs` | Totales por estado sobre TODA la historia (no solo las N visibles) + fecha primer/último intento | ~35 |
| 3 | `DTOs/Sistema/EmailDiagnosticoHistoriaItem.cs` | Un intento (Fecha, Tipo, Asunto, Estado, TipoFallo, Intentos, UltimoError, Remitente, BounceSource, BounceDetectedAt) | ~40 |
| 4 | `DTOs/Sistema/EmailDiagnosticoBlacklist.cs` | Estado actual blacklist (Activo/Despejado + motivo + fechas) — nullable cuando el correo nunca fue blacklisteado | ~25 |
| 5 | `DTOs/Sistema/EmailDiagnosticoPersonaAsociada.cs` | Persona con el correo (TipoPersona "E"/"P"/"D"/"APO", Id, DniMasked, NombreCompleto, Campo — qué campo lo tiene) | ~30 |
| 6 | `Interfaces/Services/Sistema/IEmailDiagnosticoService.cs` | Contrato | ~15 |
| 7 | `Services/Sistema/EmailDiagnosticoService.cs` | Orquestador — 4-5 queries secuenciales + agregación + fail-safe INV-S07 | ~220 |
| 8 | `Services/Sistema/EmailDiagnosticoSnapshotFactory.cs` | Factory del DTO vacío para INV-S07 | ~35 |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `Controllers/Sistema/EmailOutboxController.cs` | Agregar `[HttpGet("diagnostico")] public async Task<IActionResult> ObtenerDiagnosticoPorCorreo([FromQuery] string correo, CancellationToken ct)` — validar input (no vacío, regex rudimentario `contains @`, max 200 chars), llamar service, envolver en `ApiResponse<EmailDiagnosticoDto>`. Si líneas superan ~280, extraer a controller nuevo (ver §PRE-WORK punto 1). |
| `Extensions/ServiceExtensions.cs` | `services.AddScoped<IEmailDiagnosticoService, EmailDiagnosticoService>();` después del registro de `IDiagnosticoCorreosDiaService`. |

### Shape del DTO (tentativo — ajustable en el chat)

```csharp
public sealed class EmailDiagnosticoDto
{
    /// <summary>Correo normalizado (trim + lower) — eco del input.</summary>
    public required string CorreoConsultado { get; init; }

    public required EmailDiagnosticoResumen Resumen { get; init; }
    public required List<EmailDiagnosticoHistoriaItem> Historia { get; init; }

    /// <summary>Null si el correo nunca fue blacklisteado.</summary>
    public EmailDiagnosticoBlacklist? Blacklist { get; init; }

    public required List<EmailDiagnosticoPersonaAsociada> PersonasAsociadas { get; init; }

    public required DateTime GeneratedAt { get; init; }
}

public sealed class EmailDiagnosticoResumen
{
    public required int TotalIntentos;       // Todas las filas del destinatario
    public required int Enviados;
    public required int Fallidos;
    public required int Pendientes;          // PENDING + RETRYING
    public required DateTime? PrimerIntento; // EO_FechaReg más antiguo
    public required DateTime? UltimoIntento;
    public required int MostrandoUltimos;    // Min(TotalIntentos, MaxHistoriaFilas)
}
```

### Algoritmo del service

```
1. Normalizar correo input (Trim + ToLowerInvariant). Si vacío → throw ArgumentException (controller responde 400).
2. Query 1: EmailOutbox con EO_Destinatario normalizado == input, AsNoTracking, GROUP BY EO_Estado → resumen agregado (usa índice existente IX_EmailOutbox_Destinatario si existe, sino scan).
3. Query 2: EmailOutbox del destinatario ORDER BY EO_FechaReg DESC LIMIT MaxHistoriaFilas → historia drill-down.
4. Query 3: EmailBlacklist con EBL_Correo normalizado == input (cualquier EBL_Estado) → null si no existe.
5. Query 4: Estudiante con LOWER(TRIM(EST_CorreoApoderado)) == input AND EST_Estado, AsNoTracking.
6. Query 5: Profesor con LOWER(TRIM(PRO_Correo)) == input AND PRO_Estado.
7. Query 6: Director con LOWER(TRIM(DIR_Correo)) == input AND DIR_Estado.
8. (Opcional si existe Apoderado.APO_Correo) Query 7: Apoderado.
9. Proyectar historia a DTO (trunc EO_UltimoError a 200 chars).
10. Enmascarar DNIs en PersonasAsociadas via DniHelper.Mask.
11. Todo en try/catch global → fallback EmailDiagnosticoSnapshotFactory.BuildEmpty(correo, now) + LogWarning (INV-S07).
```

**Nota EF**: las queries 4-7 usan `.Where(x => (x.Campo != null ? x.Campo.Trim().ToLower() : "") == inputNormalizado)`. EF core traduce a SQL con `LOWER()` y `LTRIM(RTRIM())`. Alternativa si performance es pobre: bajar lookup por `.EndsWith(dominio) || .StartsWith(local)` no sirve — mantener el compare directo. Si BD tiene índice collation case-insensitive, el Trim es suficiente.

## TESTS MÍNIMOS

| # | Caso | Setup | Esperado |
|---|------|-------|----------|
| 1 | Correo inexistente (ni outbox, ni blacklist, ni persona) | BD con filas de otros correos | Resumen en ceros · Historia vacía · Blacklist null · PersonasAsociadas vacías |
| 2 | Correo con historia mixta SENT + FAILED | 3 SENT + 2 FAILED (distintos tipos fallo) | Resumen con `Enviados=3 Fallidos=2 TotalIntentos=5` · Historia ordenada por fecha desc · HistoriaItem con EO_TipoFallo para los FAILED |
| 3 | Correo blacklisteado | 1 fila EmailBlacklist EBL_Estado=true MOTIVO_BOUNCE_5XX | Blacklist no-null con MotivoBloqueo correcto |
| 4 | Correo que estuvo blacklisteado pero fue despejado | 1 fila EBL_Estado=false | Blacklist no-null con Estado "DESPEJADO" |
| 5 | Correo asociado a estudiante | Seed Estudiante con EST_CorreoApoderado=X | PersonasAsociadas[0] TipoPersona="E" con DNI enmascarado |
| 6 | Correo duplicado entre estudiante y profesor | Mismo correo en EST_CorreoApoderado y PRO_Correo | PersonasAsociadas tiene 2 entradas (una por tabla) |
| 7 | Normalización input | Input `"  Rey.Ichigo@Hotmail.com  "` con fila en `"rey.ichigo@hotmail.com"` | Match exitoso, `CorreoConsultado` devuelve normalizado |
| 8 | Cap MaxHistoriaFilas respetado | Seed 100 filas del destinatario | Historia con exactamente 50 · Resumen.MostrandoUltimos=50 · Resumen.TotalIntentos=100 |
| 9 | UltimoError truncado | FAILED con EO_UltimoError de 500 chars | HistoriaItem.UltimoError length ≤ 200 |
| 10 | INV-S07 resiliencia — contexto disposed | `_context.Dispose()` antes de invocar service | Retorna DTO fail-safe en ceros, no lanza |
| 11 | Authz — rol admin retorna 200 | reflection sobre controller | Controller tiene `[Authorize(Roles = Roles.Administrativos)]` |
| 12 | Authz — rol no-admin rechazado | Theory con Profesor/Apoderado/Estudiante | No están en el set de roles autorizados |
| 13 | Controller valida correo vacío | `GET /diagnostico?correo=` | 400 con `errorCode = "CORREO_REQUERIDO"` |
| 14 | Controller valida correo sin @ | `GET /diagnostico?correo=nosoy-correo` | 400 con `errorCode = "CORREO_INVALIDO"` |

**Framework**: xUnit + FluentAssertions + `TestDbContextFactory.Create()` (el
`RelaxedDbContext` relaja `EO_RowVersion` y `EBL_RowVersion` — descubierto en
Chat 3). Authz reflection siguiendo `SistemaAsistenciaDiagnosticoControllerAuthorizationTests.cs`.

**Baseline esperado**: 1355 BE + ~14 nuevos = **~1369**.

## REGLAS OBLIGATORIAS

- **Cap 300 líneas por archivo `.cs`**. Service estimado en ~220 — si supera,
  extraer `NormalizadorCorreo` o `PersonaLookupAggregator` a clase pura.
- **`AsNoTracking()`** obligatorio en TODAS las queries (read-only).
- **INV-D09** — filtrar `_Estado = true` en todas las tablas de persona (ya
  documentado en `backend.md`).
- **INV-S07** — try/catch global en `GetDiagnosticoAsync` → factory vacío +
  LogWarning. Nunca 500 por fallo de agregación.
- **INV-D08** — respuesta envuelta en `ApiResponse<T>.Ok(...)`.
- **DNI enmascarado** en PersonasAsociadas via `DniHelper.Mask`.
- **Normalización input**: `Trim().ToLowerInvariant()` antes de cualquier
  query (reusar la lógica del `DiagnosticoCorreosDiaCorrelator` del Chat 3
  si conviene extraerla a helper `EmailNormalizationHelper` — decisión
  abierta, no forzada).
- **Logger structured**: `_logger.LogInformation("[EmailDiagnostico] Correo {CorreoMasked} → {Total} intentos, blacklist {Bl}, personas {N}", EmailHelper.Mask(input), total, blIsNotNull, personas.Count)` (enmascarar correo en logs).
- **Read-only**: no muta EmailOutbox, EmailBlacklist ni ninguna tabla de persona.

## APRENDIZAJES TRANSFERIBLES (del Chat 3 cerrado 2026-04-24)

### Estructura del proyecto

- **DI Scoped** va en `Educa.API/Extensions/ServiceExtensions.cs`, sección
  `#region Business Services` cerca del `// Plan 30 Chat 1` ya registrado.
- **Interfaces** bajo `Interfaces/Services/Sistema/`.
- **DTOs** bajo `DTOs/Sistema/` — un archivo por clase (regla `backend.md`).
- **Service** bajo `Services/Sistema/` — mismo namespace. Inyecta
  `ApplicationDbContext` directo (sin repo separado; es el patrón canónico
  del Plan 30 establecido en Chat 1).
- **Snapshot factory** en `Services/Sistema/*SnapshotFactory.cs` con
  modificador `internal static` para mantener el service bajo el cap 300.

### Patrones descubiertos / reutilizables

- **`TestDbContextFactory.Create()`** relaja `EO_RowVersion` y `EBL_RowVersion`
  para InMemory. Instanciar `ApplicationDbContext` directo SIN el factory
  falla con `Required properties '{'EO_RowVersion'}' are missing`. Usar
  siempre el factory para tests que seedean outbox o blacklist.
- **Normalización correo** `str.Trim().ToLowerInvariant()` — ya implementado
  como privado en `DiagnosticoCorreosDiaCorrelator.NormalizarCorreo`. Si se
  reusa en Chat 4, extraer a helper compartido `Helpers/Formatting/EmailNormalizationHelper.cs`.
- **Authz reflection pattern** — `SistemaAsistenciaDiagnosticoControllerAuthorizationTests.cs`
  (este controller) y `AsistenciaAdminControllerAuthorizationTests.cs` son
  el molde. Copy-paste cambiando el tipo del controller y se cubren 3 facts +
  2 theory con 7 inline data (4 admin + 3 no-admin).
- **`TryResolverFecha`** del `EmailOutboxController` (helper privado) es
  el estándar para validación de fecha. Para este chat no aplica — pero
  si se suman otros endpoints con fecha, reusarlo con copy-paste justificado.
- **`EmailHelper.Mask(string)`** enmascara correos con formato `j***z@dominio.com`
  (primera + última letra del local + dominio crudo). Para correo sin local
  < 4 chars devuelve `***@dominio`. Probado en tests del Chat 3.
- **`DniHelper.Mask(string)`** enmascara DNI a `***1234` (últimos 4 dígitos).

### Correlación outbox

- Los correos de tipo `ASISTENCIA` se insertan con `EO_EntidadOrigen="Asistencia"`
  y `EO_EntidadId=null` (descubierto al auditar `EmailNotificationService.cs`
  línea 73). No se puede joinear por `EntidadId` para esos tipos — correlación
  debe ser por destinatario + ventana temporal. Este chat NO necesita esa
  correlación cruzada porque el universo es "todo lo del destinatario".

### Decisiones del Chat 3 que aplican

- El patrón de **DbContext directo sin repo separado** se mantiene —
  simplifica tests y evita acoplamiento innecesario para endpoints read-only
  de agregación.
- **Cap 300 líneas se respeta dividiendo por responsabilidad** (Chat 3
  extrajo `DiagnosticoCorreosDiaCorrelator` cuando el service llegó a 419
  líneas). Aplicar el mismo criterio si el diagnóstico service crece.
- **Tests con 10 service + 3 authz (con `[Theory]` = 6 + 2 fact = 13 totales
  incluyendo inline data) es la norma** en Plan 30 — 19 tests finales en
  Chat 3, estimar ~14 para Chat 4.

## FUERA DE ALCANCE

- ❌ **Pantalla FE** que consuma el endpoint — deuda posterior, NO en este
  chat. Se sube a la cola cuando el admin pida.
- ❌ **Endpoint para reintentar todos los FAILED del destinatario** — feature
  separado, no pertenece a diagnóstico read-only.
- ❌ **Búsqueda por sub-string** (`?correo=gmail.com`) — solo match exacto
  del destinatario normalizado.
- ❌ **Histórico más allá de `EmailOutbox` vigente** — si existe
  `EmailOutboxArchive`, se incluye; si no, se trabaja solo con la tabla
  viva (ver PRE-WORK).
- ❌ **Paginación dinámica de historia** — cap fijo en 50. Si el admin
  pide más, abrir chat nuevo para parametrización.
- ❌ **Endpoint de "correos en blacklist" listado paginado** — eso ya existe
  (ver `EmailBlacklistController` si aplica).
- ❌ **Cambios en `EmailOutbox`, `EmailBlacklist`, `Estudiante`, `Profesor`,
  `Director` o `Apoderado`**. Read-only puro.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 10 min)
[ ] Leer EmailOutboxController.cs (líneas actuales vs cap 300)
[ ] Leer EmailDashboardDiaService.cs (patrón canónico Plan 30)
[ ] Verificar existencia EmailOutboxArchive (SQL INFORMATION_SCHEMA)
[ ] Verificar PRO_Correo + DIR_Correo + APO_Correo (SQL)
[ ] Confirmar las 5 DECISIONES con usuario antes de codear

CÓDIGO
[ ] 5 DTOs creados bajo DTOs/Sistema/ (1 archivo por clase)
[ ] IEmailDiagnosticoService interface
[ ] EmailDiagnosticoService con DbContext + fail-safe INV-S07
[ ] EmailDiagnosticoSnapshotFactory (BuildEmpty)
[ ] Endpoint en EmailOutboxController (o controller nuevo si supera cap)
[ ] DI registrado en ServiceExtensions.cs
[ ] Normalización correo aplicada consistentemente
[ ] DNI enmascarado en PersonasAsociadas
[ ] UltimoError truncado 200 chars
[ ] Historia cap 50 respetado
[ ] Cap 300 líneas en todos los archivos

TESTS
[ ] 14 casos del checklist pasan (10 service + 4 authz/controller)
[ ] Uso de TestDbContextFactory.Create() (NO ApplicationDbContext directo)
[ ] dotnet test verde — suite ~1355 baseline + ~14 = ~1369

INVARIANTES
[ ] INV-S07 preservado (fallo de agregación → DTO ceros, nunca 500)
[ ] INV-D05 AsNoTracking() en TODAS las queries
[ ] INV-D08 ApiResponse<T> en controller
[ ] INV-D09 filtrar _Estado = true en tablas de persona

VALIDACIÓN
[ ] dotnet build limpio sin warnings nuevos
[ ] dotnet test verde con delta esperado
[ ] Smoke manual con Postman contra dev:
    1. GET /api/sistema/email-outbox/diagnostico?correo=algunoreal@dominio.com → 200 con estructura
    2. GET ...?correo= → 400 CORREO_REQUERIDO
    3. GET ...?correo=nosoy → 400 CORREO_INVALIDO
    4. Authenticar como Profesor → 403

MAESTRO
[ ] maestro.md Plan 30: ~75% → ~95% (solo FE del Chat 3 queda fuera)
[ ] Cola top 3 actualizada — Plan 30 Chat 4 sale, Plan 31 Chat 2 sube a #1
    (condicional a push del commit c46dfa0), o pasa a evaluarse otro item

COMMIT
[ ] Commit único en Educa.API master con mensaje del §COMMIT MESSAGE
[ ] Mover este archivo a educa-web/.claude/chats/closed/ en commit docs maestro
```

## COMMIT MESSAGE sugerido

### Commit BE (Educa.API master)

**Subject** (≤ 72 chars):

```
feat(sistema): Plan 30 Chat 4 — email-outbox diagnostico por correo
```

**Body**:

```
Add GET /api/sistema/email-outbox/diagnostico?correo={email} for admin
visibility on the full history of a single recipient. Replaces the
manual set of 8 SQL queries ("M1/M2/.../M8") that the admin runs every
time a parent complains about a missing email.

 - "EmailDiagnosticoDto" returns a composed payload: echo of the
   normalized "CorreoConsultado", aggregated "Resumen" (totals by
   state + first/last attempt), last 50 rows of "Historia"
   ("EO_Asunto"/"EO_Estado"/"EO_TipoFallo"/"EO_UltimoError" truncated
   to 200 chars), active "Blacklist" row (nullable when the address
   was never blocked), and the list of "PersonasAsociadas" where the
   address lives today ("Estudiante"/"Profesor"/"Director"/"Apoderado").
 - "EmailDiagnosticoService" runs 4-6 sequential "AsNoTracking()"
   queries against "EmailOutbox", "EmailBlacklist" and the person
   tables, normalizing the input via Trim + lower to tolerate
   admin typos. Global try/catch returns a zeroed DTO via
   "EmailDiagnosticoSnapshotFactory.BuildEmpty" on failure
   ("INV-S07"): the admin sees empty history instead of a 500.
 - DNIs exposed in "PersonasAsociadas" go through "DniHelper.Mask"
   before serialization ("INV-D09" spirit).
 - Endpoint sits under "[Authorize(Roles = Roles.Administrativos)]"
   (inherits from the controller). Input validation rejects empty
   and malformed emails with "CORREO_REQUERIDO" / "CORREO_INVALIDO"
   error codes.
 - Read-only: does not mutate any table.

Tests:
 - 10 service tests covering empty universe, mixed SENT/FAILED
   history, active/cleared blacklist, normalization, cap of 50
   rows respected, "UltimoError" truncation, and INV-S07
   resilience (disposed context).
 - 2 controller contract tests (empty and malformed "correo").
 - 2 authz tests by reflection (admin roles allowed, non-admin
   rejected).

Suite "1355 → ~1369 BE verdes" ("dotnet test"). Build OK.
Plan 30 row from ~75% to ~95% — Chat 4 of 4 (only the FE consumer
remains as later debt).
```

### Commit docs-maestro (separado, repo educa-web)

**Subject**:

```
docs(maestro): Plan 30 Chat 4 F4.BE ✅ cerrado — diagnostico por correo
```

Cuerpo corto explicando cierre + commit hash + baseline tests.

## CIERRE

Feedback a pedir al cerrar este chat:

1. **Decisiones aceptadas vs ajustadas** — registrar cuál de las 5 recomendaciones
   quedó igual y cuáles ajustó el usuario (especialmente cap 50 y campos
   del HistoriaItem).
2. **Existencia de archive** — si se confirmó `EmailOutboxArchive`, anotar
   si se incluyó en el service. Si no, anotar que se difiere y cómo.
3. **Shape útil para FE futuro** — ¿el admin ya puede imaginar la pantalla
   de búsqueda con este shape, o falta algún campo?
4. **Tests baseline** — confirmar delta final (~14 esperados). Si subió/bajó,
   documentar razón.
5. **Próximo chat** — con Plan 30 a ~95%, los candidatos fuertes para la
   cola top 3 pasan a ser:
    - Plan 31 Chat 2 BE (si el push del Chat 1 `c46dfa0` ya ocurrió y el
      header `X-Educa-Outbox-Id` está validado en Roundcube).
    - Plan 30 FE del Chat 3 + Chat 4 (pantallas admin que consumen ambos
      endpoints) — un solo chat si son liviables.
    - Plan 24 Chat 4 BE (validación `Task.Delay(30000)` — cierra Plan 24).
6. **Telemetría post-deploy** — si el admin adopta el endpoint rápido y
   encuentra casos que el DTO no cubre, abrir chat de ajuste menor antes
   de cerrar el Plan 30 al 100%.
