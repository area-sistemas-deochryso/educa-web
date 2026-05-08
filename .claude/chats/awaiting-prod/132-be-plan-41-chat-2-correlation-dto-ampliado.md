# 132 · Plan 41 Chat 2 — F2 BE DTO ampliado del snapshot correlation

> **Creado**: 2026-05-08 · **Estado**: ⏳ pendiente arrancar · **Repo**: `Educa.API` (master) — solo BE
> **Plan**: [Plan 41 — Trazabilidad y Observabilidad del Hub de Correlación](../../plan/correlation-hub-observability.md)
> **Origen**: F2 del Plan 41. Chat 1 (brief 131) dejó el FE con timeline cronológico y banner de cap. F2 abre la página como **grafo navegable**: cada fila debe poder saltar al detalle del agrupador (ErrorGroup, bandeja del destinatario, reporte de usuario), y el admin debe ver "otros correlation IDs del mismo usuario" para reconstruir contexto sesional. Resuelve **brecha #4** (sin grafo de relaciones), **brecha #5** parcial (vista por usuario) y **brecha #7** (outbox-chain visible).

## Modo sugerido

`/execute` directo. Decisión arquitectural ya zanjada en el plan dedicado — el chat es ejecución BE acotada: extender DTO + 1 query nueva (relatedCorrelationIds) + LEFT JOIN sobre ErrorGroup. Sin migración SQL (campos opcionales en DTO).

## Objetivo

Ampliar `CorrelationSnapshotDto` con 3 piezas de información que F2 FE (Chat 3) consume para construir enlaces salientes:

1. **`errorGroupCode?: string | null`** por cada `CorrelationErrorLogDto` — el `ERG_Fingerprint` (o código equivalente que use el Kanban admin) del `ErrorGroup` al que pertenece el ErrorLog. Vía `LEFT JOIN` en la query que ya popula `errorLogs`.
2. **Confirmar `entidadOrigen` en `CorrelationEmailOutboxDto`** — el campo ya existe en el DTO (línea 66 del modelo FE). Validar que el BE lo está mapeando desde `EmailOutbox.EO_TipoEntidadOrigen` y que llega serializado en el JSON. Si ya está, agregar test de contrato. Si no, agregarlo.
3. **`relatedCorrelationIds: string[]`** — los últimos **5 distinct correlationIds** del mismo `usuarioDni` (cualquiera de las 4 tablas) en las **últimas 2 horas**, **excluyendo** el correlationId consultado. Cap 5. Vacío `[]` si no hay match o si no hay `usuarioDni` (correlations anónimos). Sub-query independiente con `INV-S07` fail-safe.

Endpoint mantiene shape — los campos nuevos son opcionales (`errorGroupCode` nullable, `relatedCorrelationIds` puede ser `[]`). Cliente FE pre-Chat 3 sigue funcionando sin cambios.

## Alcance — qué SÍ y qué NO

### SÍ entra al chat

1. Ampliar **DTO BE** `CorrelationErrorLogDto` con `ErrorGroupCode: string?`.
2. Ampliar **DTO BE** `CorrelationSnapshotDto` con `RelatedCorrelationIds: List<string>` (default `new()`).
3. Ampliar **DTO FE** equivalente (`correlation.models.ts`) — solo tipos opcionales para que `Chat 3 FE` pueda consumirlos cuando llegue.
4. **Query LEFT JOIN** `ErrorLog × ErrorGroup` por `ERL_ERG_CodID` (FK existente, ver `INV-ET03/INV-ET04`). Devolver `ERG_Fingerprint` (truncado a primeros N chars si hace falta — confirmar formato del Kanban admin).
5. **Query nueva** `relatedCorrelationIds`:
   - Input: `usuarioDni` (extraído del primer evento del snapshot que tenga DNI no-null), `correlationIdConsultado`, `desde = now - 2h`.
   - Output: hasta 5 `correlationId` `DISTINCT` ordenados por fecha desc.
   - Fuente: `UNION DISTINCT` sobre las 4 tablas (`ErrorLog.ERL_CorrelationId`, `RateLimitEvent.RLE_CorrelationId`, `ReporteUsuario.REU_CorrelationId`, `EmailOutbox.EO_CorrelationId`).
   - Filtros: `usuario_dni = @dni AND fecha >= @desde AND correlation_id != @consultado AND correlation_id IS NOT NULL`.
   - Cap `TOP 5` en SQL.
   - **Fail-safe** (`INV-S07`): try/catch en el service — si falla, retornar `[]` y loggear `Warning`. NO falla el snapshot completo.
6. **Confirmar `entidadOrigen` en `CorrelationEmailOutboxDto`**: si ya está mapeado, agregar test de contrato. Si no, mapearlo desde `EO_TipoEntidadOrigen`.
7. **Tests**:
   - `errorGroupCode` poblado cuando el ErrorLog tiene grupo · `null` cuando es legacy huérfano (`ERL_ERG_CodID = NULL`).
   - `relatedCorrelationIds` cap 5 + ventana 2h + exclude self + sin DNI → `[]`.
   - Fail-safe: si la query related falla (mock), el snapshot sigue devolviendo las 4 secciones.
   - Contract test: `entidadOrigen` aparece serializado en el JSON.
8. **Smoke local**: `GET /api/sistema/correlation/{id}` con un correlation que tenga ErrorLog → ver `errorGroupCode` poblado + `relatedCorrelationIds` con valores reales en la BD de dev.

### NO entra (queda para fases siguientes)

- **Cambios FE** (sección "Otros correlation IDs", botones "Ver grupo de errores" / "Ver bandeja", chips con `<app-correlation-id-pill>`) — son **Chat 3 F2 FE** (brief próximo).
- **Persistir RequestMetric** — F3.
- **Breadcrumbs cliente** — F4.
- **Search global** — F5.
- **SignalR/WAL** — F6.
- **Migración SQL** — los campos nuevos son DTO-only, no requieren ALTER TABLE.

## Pre-work obligatorio

Lectura previa antes de tocar código:

1. **`Educa.API/Controllers/Sistema/CorrelationController.cs`** — endpoint actual.
2. **`Educa.API/Services/Sistema/CorrelationService.cs`** — 4 queries fail-safe del Plan 32.
3. **`Educa.API/DTOs/Sistema/CorrelationSnapshotDto.cs`** (o ubicación equivalente) — DTO actual.
4. **`Educa.API/Models/Sistema/ErrorGroup.cs`** + `ErrorLog.cs` — para confirmar la FK `ERL_ERG_CodID` y formato de `ERG_Fingerprint`.
5. **`educa-web/src/app/features/intranet/pages/admin/correlation/models/correlation.models.ts`** — DTOs FE espejo, para mantener nombres consistentes.
6. **`Educa.API/.claude/rules/business-rules.md` §15.12 (INV-ET01..ET07)** — invariantes de ErrorLog/ErrorGroup que aplican.
7. **`Educa.API/.claude/decisions/`** — buscar ADR del Plan 32 si existe, para confirmar contrato del snapshot.

## Contexto técnico

### DTO ampliado (BE)

```csharp
public class CorrelationErrorLogDto
{
    // ... campos existentes ...
    public string? ErrorGroupCode { get; set; }   // NUEVO — null si ERL_ERG_CodID = NULL (legacy huérfano)
}

public class CorrelationSnapshotDto
{
    public string CorrelationId { get; set; } = "";
    public DateTime GeneratedAt { get; set; }
    public List<CorrelationErrorLogDto> ErrorLogs { get; set; } = new();
    public List<CorrelationRateLimitEventDto> RateLimitEvents { get; set; } = new();
    public List<CorrelationReporteUsuarioDto> ReportesUsuario { get; set; } = new();
    public List<CorrelationEmailOutboxDto> EmailOutbox { get; set; } = new();
    public List<string> RelatedCorrelationIds { get; set; } = new();   // NUEVO
}
```

### Query relatedCorrelationIds (esqueleto)

```csharp
private async Task<List<string>> GetRelatedCorrelationIdsAsync(
    string? usuarioDni,
    string correlationIdConsultado,
    CancellationToken cancellationToken)
{
    if (string.IsNullOrEmpty(usuarioDni)) return new();

    try
    {
        var desde = DateTime.UtcNow.AddHours(-2);

        // UNION DISTINCT sobre las 4 tablas, ordenado por fecha desc, cap 5
        // Implementación en EF Core con .Union() o SQL crudo si la performance lo justifica.

        return await query.Take(5).ToListAsync(cancellationToken);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "[CorrelationService] relatedCorrelationIds fail-safe");
        return new();   // INV-S07
    }
}
```

### Cómo extraer `usuarioDni` del snapshot

El `usuarioDni` debe salir del **primer evento con DNI no-null** del snapshot ya cargado. Orden recomendado (estabilidad):

1. `errorLogs` con `usuarioDni != null`.
2. `rateLimitEvents` con `usuarioDni != null`.
3. `reportesUsuario` con `usuarioDni != null`.
4. `emailOutbox` no aplica (lleva `destinatarioMasked`, no DNI directo).

Si ninguno tiene DNI → `relatedCorrelationIds = []`.

**Atención**: el DNI en BD viene **encriptado AES-256** (`EST_DNI`/`PRO_DNI` binarios) o **hasheado SHA-256** para búsquedas. Confirmar qué campo usa la query del Plan 32 para enmascarar el DNI ya — la related query tiene que matchear sobre el **mismo campo** (probablemente el hash o el masked, no el DNI plano).

## Archivos a crear / tocar

### Nuevos

Ninguno — los archivos existen, solo se extienden.

### Modificados (BE)

| Archivo | Cambio |
|---------|--------|
| `Educa.API/DTOs/Sistema/CorrelationErrorLogDto.cs` | Agregar `ErrorGroupCode` opcional. |
| `Educa.API/DTOs/Sistema/CorrelationSnapshotDto.cs` | Agregar `RelatedCorrelationIds`. |
| `Educa.API/Services/Sistema/CorrelationService.cs` | LEFT JOIN ErrorGroup en query errorLogs + nuevo método `GetRelatedCorrelationIdsAsync` + integrarlo en `GetSnapshotAsync`. |
| `Educa.API/Repositories/Sistema/CorrelationRepository.cs` | (si la query vive en repo) método nuevo + extensión de query existente. |
| `Educa.API.Tests/Sistema/CorrelationServiceTests.cs` | +5 tests aprox (errorGroupCode populated/null/legacy + related cap+ventana+exclude+sin-dni + fail-safe). |
| `Educa.API.Tests/Sistema/CorrelationContractTests.cs` (si existe, sino crear) | Test de contrato — `entidadOrigen` aparece serializado. |

### Modificados (FE — espejo de tipos)

| Archivo | Cambio |
|---------|--------|
| `educa-web/src/app/features/intranet/pages/admin/correlation/models/correlation.models.ts` | `CorrelationErrorLogDto.errorGroupCode?: string \| null` + `CorrelationSnapshot.relatedCorrelationIds?: string[]` (opcional para no romper el FE actual). |

## Plan de ejecución (orden recomendado)

1. **Pre-work**: leer los 7 archivos del bloque arriba. Confirmar formato de `ERG_Fingerprint` (¿hash completo? ¿truncado?) y campo de DNI usado en queries actuales.
2. **DTO BE**: agregar `ErrorGroupCode` y `RelatedCorrelationIds` con defaults seguros (`null` y `new()`).
3. **Query LEFT JOIN ErrorGroup**: extender el método que ya popula `errorLogs` para traer `ERG_Fingerprint` vía join. Mapear a `ErrorGroupCode` en el DTO.
4. **Query relatedCorrelationIds**: implementar `GetRelatedCorrelationIdsAsync` con try/catch fail-safe. Verificar performance con índices existentes — si lentito, considerar índice nuevo en `(usuario_dni, fecha)` por tabla (documentar como SQL script futuro, no aplicar ahora salvo que p95 > 500ms).
5. **Integrar en `GetSnapshotAsync`**: tras cargar las 4 secciones, extraer `usuarioDni` del primer evento con DNI no-null y disparar `GetRelatedCorrelationIdsAsync`. Asignar al snapshot.
6. **Confirmar `entidadOrigen`**: revisar mapeo en `CorrelationEmailOutboxDto`. Agregar test de contrato.
7. **Tests** (`CorrelationServiceTests.cs`):
   - `errorGroupCode` populated cuando hay grupo.
   - `errorGroupCode` null cuando ERL_ERG_CodID = NULL.
   - `relatedCorrelationIds` cap 5.
   - `relatedCorrelationIds` ventana 2h excluye older.
   - `relatedCorrelationIds` excluye el id consultado.
   - `relatedCorrelationIds` retorna [] sin DNI.
   - Fail-safe: mock que lanza excepción → snapshot completo igual + warning loggeado.
8. **Build + tests**:
   ```
   dotnet build Educa.API
   dotnet test Educa.API.Tests --filter "FullyQualifiedName~CorrelationService"
   ```
9. **Smoke local** vs SQL Server local o Azure dev:
   - Visitar `GET /api/sistema/correlation/{id}` con un correlation real que tenga ErrorLog asociado a un grupo.
   - Verificar JSON: `errorLogs[0].errorGroupCode` poblado, `relatedCorrelationIds` con valores reales si el usuario tiene actividad en últimas 2h.
10. **DTO FE espejo**: agregar campos opcionales en `correlation.models.ts` (no rompe Chat 3 — es preparación).
11. **Commit único** con BE + DTO FE espejo en el mismo commit.

## Tests mínimos

| Caso | Resultado esperado |
|------|--------------------|
| Snapshot con ErrorLog vinculado a ErrorGroup | `errorLogs[0].errorGroupCode = "<fingerprint>"` |
| Snapshot con ErrorLog huérfano (`ERL_ERG_CodID = NULL`) | `errorLogs[0].errorGroupCode = null` |
| Usuario con 7 correlations en últimas 2h | `relatedCorrelationIds.length == 5` (cap), excluye el consultado |
| Usuario sin actividad reciente | `relatedCorrelationIds = []` |
| Correlation anónimo (sin DNI en ningún evento) | `relatedCorrelationIds = []` (early return) |
| Mock query related lanza excepción | Snapshot completo igual + log warning + `relatedCorrelationIds = []` |
| Contract: serialización JSON de EmailOutbox | `entidadOrigen` presente en el response body |

## Reglas obligatorias

- **`backend.md`**: archivo .cs ≤ 300 líneas (regla dura). Si el service supera, dividir por responsabilidad (ver §"Cómo dividir un service > 300 líneas" del backend.md). El service del Plan 32 ya está cerca del umbral — confirmar al leer.
- **Controller delgado**: el endpoint solo delega al service. Sin lógica nueva en el controller.
- **`AsNoTracking()`** en queries read-only (ya aplicado en Plan 32, mantener).
- **`CancellationToken`** propagado desde el controller hasta el `ToListAsync(cancellationToken)` (Plan 40 F3).
- **Fail-safe (`INV-S07`)**: la query related no puede romper el snapshot. Try/catch obligatorio.
- **Structured logging**: `_logger.LogWarning(ex, "...")` con placeholders, nunca string interpolation.
- **DNI enmascarado** en logs: si la query loggea el `usuarioDni`, usar `DniHelper.Mask(dni)`.
- **`ApiResponse<T>`**: el endpoint sigue retornando `ApiResponse<CorrelationSnapshotDto>` — mantener envelope.

## APRENDIZAJES TRANSFERIBLES (del chat 131 — Plan 41 F1)

Hechos no obvios descubiertos en el chat anterior que el FE F2 (Chat 3) va a consumir y que este BE Chat 2 debe respetar:

1. **`SECTION_DEFENSIVE_CAP = 100`** ya está en el FE (`correlation.models.ts`). El BE devuelve hasta 100 filas por sección. Confirmar que las queries del Plan 32 ya cappean a 100 — si no, agregarlo.
2. **El campo `entidadOrigen` ya existe en `CorrelationEmailOutboxDto` FE** (línea 66 del modelo) — el BE lo está enviando o no, validar.
3. **Outbox: `fechaEnvio ?? fechaReg`** — el FE ya hace este fallback en el timeline. El BE manda ambos campos siempre.
4. **DNI en queries**: el Plan 32 ya enmascara DNI con `***1234` upstream. La related query debe matchear sobre el mismo campo (hash o masked) que las queries existentes — leer cómo lo hace el service actual antes de implementar.
5. **El tipo discriminado FE `TimelineEvent`** mezcla los 4 arrays — F2 FE va a renderizar enlaces salientes en el mismo timeline. Cada `kind` en el FE necesita un campo concreto para construir el link (`errorGroupCode` para `error`, `entidadOrigen + entidadId` para `outbox`, etc.).
6. **Toggle persistente Timeline ↔ Sección**: ya está en `PreferencesStorageService` (key `educa_pref_correlation_view_mode`, default `timeline`). Chat 3 FE va a operar sobre cualquiera de las dos vistas — el BE no decide.
7. **Banner cap-aware**: ya existe en el FE. Si el BE empieza a devolver `relatedCorrelationIds` con cap 5, considerar si el FE necesita banner equivalente. **Decisión sugerida**: NO — cap 5 es muy pequeño y se entiende visualmente. Documentar.
8. **Chat 131 cerró a `awaiting-prod/`** (no `closed/`) — gate post-deploy del proyecto. Si Chat 2 ship antes de que 131 valide en prod, el FE va a tener tipos opcionales sin uso real hasta que F2 FE Chat 3 cierre. Es OK — campos opcionales no rompen nada.

## Fuera de alcance

- **Migración SQL**: los campos nuevos son DTO-only. NO modificar `ErrorLog`, `ErrorGroup`, ni ninguna tabla.
- **Performance index nuevo**: solo medir, no aplicar índice nuevo en este chat. Si p95 de la related query supera 500ms, anotar para Plan 41 deuda técnica futura.
- **FE F2 enlaces salientes** (botones "Ver grupo de errores", chips de related): **Chat 3 FE** (próximo brief).
- **F3-F6**: fuera del alcance de F2.
- **Refactor del service del Plan 32**: solo extender. Si supera 300 líneas tras los cambios, dividir por responsabilidad pero sin tocar lógica preexistente.

## Validación final

- [ ] `dotnet build Educa.API` compila.
- [ ] `dotnet test Educa.API.Tests --filter "FullyQualifiedName~CorrelationService"` verde (incluye los 7 tests nuevos).
- [ ] `dotnet test Educa.API.Tests` no introduce regresiones nuevas (master tiene ~8 fallos preexistentes documentados en Plan 40 F2/F4 / Plan 28 — mismo set).
- [ ] Smoke local: `GET /api/sistema/correlation/{id}` con un correlation real → JSON con `errorGroupCode` poblado en al menos un errorLog y `relatedCorrelationIds` con datos si el usuario tiene actividad reciente.
- [ ] DTO FE espejo (`correlation.models.ts`) actualizado con campos opcionales — el FE compila sin cambios.
- [ ] Sin migración SQL pendiente.
- [ ] Lint BE limpio (no aplica analizador específico, pero respetar 300 líneas/archivo).

## Criterios de cierre

- [ ] Validación final pasa.
- [ ] Maestro actualizado: Plan 41 Chat 2 BE marcado ✅ awaiting-prod (gate post-deploy del Educa.API).
- [ ] Plan file `correlation-hub-observability.md`: F2 BE marcado, brechas #4/#5/#7 → "F2 BE listo, pendiente F2 FE Chat 3".
- [ ] Brief 132 movido `running/` → `awaiting-prod/`.
- [ ] **Commit único** Educa.API que incluye DTO + service + tests + DTO FE espejo + brief move + maestro update + plan file update.

## COMMIT MESSAGE sugerido

```
feat(correlation): extend snapshot DTO with errorGroupCode + relatedCorrelationIds

Plan 41 F2 BE — adds errorGroupCode (LEFT JOIN ErrorGroup) per ErrorLog and
relatedCorrelationIds (last 5 distinct correlationIds of the same user in
last 2h, excluding self). Both optional, no SQL migration. INV-S07 fail-safe
on the related query — if it fails, snapshot keeps the 4 sections.

Closes brief 132 to awaiting-prod (post-deploy gate). Unblocks Plan 41
Chat 3 F2 FE (outgoing links + chips of related IDs).
```

## Cierre

Al cerrar este chat con `/end`:

- **Pedir feedback al usuario**: ¿el `relatedCorrelationIds` por usuario+ventana 2h se siente útil, o conviene cambiar el alcance (ej. por sesión, ventana mayor, otro filtro)? Es la primera vez que el hub ofrece "vista por usuario" — confirmar que el ángulo es el correcto antes de F2 FE Chat 3.
- **Marcar brechas #4 (parcial)**, **#5 (parcial)**, **#7 (parcial)** en `correlation-hub-observability.md`. Cierran del todo cuando F2 FE Chat 3 hace ship.
- **Siguiente brief candidato**: **133 · Plan 41 Chat 3 FE** — botones "Ver grupo de errores" / "Ver bandeja del destinatario" / "Ver reporte de usuario" + sección "Otros correlation IDs de este usuario" con `<app-correlation-id-pill>`. NO materializar acá — espera cierre + verify de este Chat 2 BE.

---

## Cierre — 2026-05-08 awaiting-prod

**Estado**: ✅ Validación local pasa. Suite BE 1689/1697 (8 fallos preexistentes Plan 40 F2 sin tocar — mismos 8 documentados en briefs 126/127). FE `tsc --noEmit` limpio. Smoke con BD real pendiente post-deploy.

**Decisiones de implementación tomadas**:

1. **Boundary extraction** — `CorrelationService` + `GetRelatedCorrelationIdsAsync` inline daba 332 líneas, sobre el cap 300. Extraído a `CorrelationRelatedResolver` (tipo Boundary/Stateless documentado en `architecture.md`): stateless, devuelve `List<string>` vía interfaz `ICorrelationRelatedResolver`, el caller orquesta. Final: service 253 líneas + resolver 119 líneas. Es el patrón que `architecture.md` documenta para flujos de borde extraíbles sin trasladar dependencias.

2. **Match cross-tabla por últimos 4 dígitos del DNI** — descubrimiento del pre-work: `ErrorLog` stora DNI ya enmascarado (`***1234`), `RateLimitEvent` y `ReporteUsuario` storan raw (8 digits) y enmascaran al leer. No se puede comparar igualdad cross-tabla. Solución: extraer los últimos 4 chars del masked (cualquier source) y matchear con `EndsWith(lastFour)` — EF Core lo traduce a `LIKE '%1234'` y funciona contra ambos storages. Documentado inline en `CorrelationRelatedResolver.ResolveDniLastFour()`. **Ruido aceptado**: 2 personas con últimos-4 idénticos colisionan (probabilidad ~1/10000) — cap 5 acota el daño.

3. **`ErrorGroupCode` = primeros 12 chars del fingerprint** — coincide con `FingerprintCorto` que el Kanban admin (`ErrorGroupListaDto`) muestra como debug visual. FE Chat 3 puede usarlo de filtro o display directo. Si el routing del Kanban requiere el `id` (long), Chat 3 puede agregar un campo extra sin romper compat.

4. **EmailOutbox no contribuye a `relatedCorrelationIds`** — el modelo no tiene DNI directo (solo `EO_Destinatario` que es email). Brief lo había anticipado. Quedan 3 tablas en el UNION (Error/RateLimit/Reporte).

5. **`entidadOrigen` ya estaba mapeado** — el campo BE es `EO_EntidadOrigen` (no `EO_TipoEntidadOrigen` como decía el brief — typo del brief). El mapping a DTO ya estaba implementado en Plan 32. Solo se agregó test contract.

6. **`Include(e => e.ErrorGroup)` defensivo** — la projection `e.ErrorGroup != null ? e.ErrorGroup.ERG_Fingerprint... : null` funciona en SQL Server sin Include (EF traduce a LEFT JOIN), pero el provider InMemory de los tests sin Include puede dejar la navegación null aunque el FK esté seteado. Include garantiza ambos paths.

**Tests agregados (7+1)**: errorGroupCode populated · null cuando huérfano · relatedCorrelationIds cap 5 ordenado por fecha · ventana 2h excluye older · sin DNI retorna [] · correlation anónimo retorna [] · resolver disposed → snapshot completo + related []. + 1 contract test entidadOrigen serializado.

**Archivos finales**:
- BE: 6 modificados + 2 nuevos (resolver + interface) en `Educa.API/master`.
- FE: 1 modificado en `educa-web/main` (DTO espejo opcional).

**Pendiente post-deploy**:
- Smoke `GET /api/sistema/correlation/{id}` con correlation real que tenga ErrorLog vinculado a ErrorGroup → confirmar `errorGroupCode` poblado.
- Smoke con usuario que tenga ≥2 correlations distintos en última hora → confirmar `relatedCorrelationIds` no vacío.
- `/verify 132` → ✅ mueve a `closed/`, ❌ a `running/` con motivo.

**Feedback solicitado al usuario**: ¿el alcance de `relatedCorrelationIds` (mismo usuario, ventana 2h, cap 5) se siente útil, o lo cambiamos antes de F2 FE Chat 3? Una vez que Chat 3 lo consuma, refactorear es más caro.
