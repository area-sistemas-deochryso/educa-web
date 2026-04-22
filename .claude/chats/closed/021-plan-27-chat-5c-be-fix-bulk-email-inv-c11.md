> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 27 · **Chat**: 5c · **Fase**: gap fix post-auditoría · **Estado**: ⏳ pendiente arrancar.

---

# Plan 27 Chat 5c — Fix `INV-C11` en envío masivo admin (`AsistenciaAdminBulkEmailService`)

## PLAN FILE

**Maestro**: `../../educa-web/.claude/plan/maestro.md` § "🟢 Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria en adelante)".

Secciones relevantes del maestro:

- Fila **Plan 27** del inventario — agregar Chat 5c al resumen como "gap fix bulk email" tras Chat 5b.
- "Plan de ejecución (confirmado post-Chat 1)" — agregar fila Chat 5c después de Chat 5b.

**Reglas BE a consultar**:

- `../../educa-web/.claude/rules/business-rules.md` — documento destino del cambio menor en docs. §1.11 "Filtro temporal por grado — INV-C11" + §15.4 fila `INV-C11`.
- `Educa.API/.claude/rules/backend.md` — convenciones de naming, AsNoTracking, soft-delete `INV-D09`.
- `Educa.API/.claude/rules/data.md` — reglas de queries + proyecciones sobre relaciones.

Chats previos del Plan 27 (todos ✅ cerrados):

- Chat 1 `/design` — `.claude/chats/closed/016-plan-27-chat-1-design-asistencia-filtro-grado.md`
- Chat 2 `/execute` BE — `.claude/chats/closed/017-plan-27-chat-2-be-filtro-grado-asistencia-diaria.md` (commit `2738eaf` en master)
- Chat 3 `/execute` BE — `.claude/chats/closed/018-plan-27-chat-3-be-reportes-filtro-grado.md` (commit `19e74d5` en master)
- Chat 4 `/execute` FE+BE — `.claude/chats/closed/019-plan-27-chat-4-fe-banner-self-service-widget.md` (commits `a967e21` BE + `3c5061e` FE)
- Chat 5 cierre docs — `.claude/chats/closed/020-plan-27-chat-5-cierre-docs-inv-c11.md` (commit `4e32963` en main)
- **Chat 5b** (gap fix post-docs) — commits `2221af9` BE + `d69ea8f` FE (2026-04-22). NO tuvo chat file propio — se resolvió en el mismo chat de Chat 5 al detectar huecos durante la auditoría.

## OBJETIVO

Cerrar el último hueco de `INV-C11` en correos de asistencia: el endpoint admin de **reenvío masivo** (`POST /api/AsistenciaAdmin/correos-masivos`) no propaga `GraOrden` al early-return de `EmailNotificationService`. Un admin que seleccione registros históricos de estudiantes con `GRA_Orden < 8` y pida "reenviar correos" hoy los envía igual, violando `INV-C11`.

Esto se detectó durante la auditoría de correos post-Chat 5b. El resto del filtro (webhook + admin CRUD correcciones) ya está correcto.

## PRE-WORK OBLIGATORIO

### 1. Confirmar que los commits Plan 27 previos están pusheados al final del chat

Al cerrar Chat 5c, **tanto `master` como `main`** tienen cambios de Plan 27 pendientes de push. Según la política del usuario (deploy solo lunes/jueves) el push coordinado se hace después. Durante el chat, solo commitear local.

```bash
# En Educa.API
git log --oneline master origin/master..master | head -10

# En educa-web
git log --oneline main origin/main..main | head -10
```

### 2. Baselines BE + FE al arrancar

```bash
# En Educa.API
dotnet test --nologo --verbosity quiet
# Esperado: 1161 verdes (post Chat 5b)

# En educa-web
npm test -- --run
# Esperado: 1509 verdes (post Chat 5b)
```

Si alguna baseline difiere, actualizar las cifras del commit final.

## ALCANCE

### Archivos a modificar (BE)

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `Educa.API/Interfaces/Repositories/Asistencias/IAsistenciaAdminRepository.cs` | Agregar `int? GraOrden` al record `AsistenciaEmailDataRow` (líneas 56-65) | +1 |
| `Educa.API/Repositories/Asistencias/AsistenciaAdminRepository.cs` | Actualizar queries `GetEmailDataByIdAsync` (línea 39) y `GetEmailDataByIdsAsync` (línea 65) con join + proyección de `GraOrden` | +20-25 |
| `Educa.API/Services/Asistencias/AsistenciaAdmin/AsistenciaAdminBulkEmailService.cs` | Pasar `asistencia.GraOrden` en las 2 invocaciones a `_emailService.EnviarNotificacionAsistencia` (líneas 57-59, 64-66) | +2 |

### Archivos a crear (tests BE)

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `Educa.API.Tests/Repositories/Asistencias/AsistenciaAdminRepositoryPlan27Tests.cs` (nuevo) o agregar al spec existente | Tests que validan el join: (a) estudiante con salón activo → `GraOrden` correcto, (b) estudiante sin salón activo → `GraOrden = null` (INV-D09), (c) estudiante con salón soft-deleted → se ignora | +80-100 |
| Opcional: `Educa.API.Tests/Services/Asistencias/AsistenciaAdmin/AsistenciaAdminBulkEmailServiceTests.cs` (si no existe) | Mock `IEmailNotificationService.EnviarNotificacionAsistencia` y verificar que recibe `graOrden` propagado (no null). 1-2 tests | +50-70 |

### Archivos a modificar (docs en educa-web)

Trabajando desde BE con path relativo `../../educa-web/...`.

| Archivo | Acción | Líneas |
|---------|--------|--------|
| `../../educa-web/.claude/rules/business-rules.md` — §1.11 tabla "Dónde se aplica" fila "Correos" | Sumar mención explícita a `AsistenciaAdminBulkEmailService.EnviarCorreosMasivosAsync` al enforcement | +1 sub-item |
| `../../educa-web/.claude/rules/business-rules.md` — §15.4 fila `INV-C11` | Actualizar enforcement map sumando `AsistenciaAdminBulkEmailService` a la lista junto a las 2 funciones existentes de `EmailNotificationService` | ~10 chars |
| `../../educa-web/.claude/plan/maestro.md` — Plan de ejecución del Plan 27 | Agregar fila "Chat 5c — Gap fix bulk email" después de Chat 5b, marcada ✅ con baseline final 1163 verdes BE (o lo que resulte) | +1 fila |
| `../../educa-web/.claude/plan/maestro.md` — bloque "Foco" + fila resumen Plan 27 del inventario | Actualizar referencia al baseline post-5c | ~20 chars |

### Mover chat file al cerrar

```bash
mv "../../educa-web/.claude/chats/021-plan-27-chat-5c-be-fix-bulk-email-inv-c11.md" \
   "../../educa-web/.claude/chats/closed/"
```

## Forma concreta de los cambios

### 1. Record `AsistenciaEmailDataRow` (interfaz)

```csharp
// Interfaces/Repositories/Asistencias/IAsistenciaAdminRepository.cs
public sealed record AsistenciaEmailDataRow(
    int AsistenciaId,
    int EstudianteId,
    string EstudianteNombres,
    string EstudianteApellidos,
    string? CorreoApoderado,
    DateTime Fecha,
    DateTime? HoraEntrada,
    DateTime? HoraSalida,
    string SedeNombre,
    int? GraOrden);  // ← NUEVO · Plan 27 Chat 5c · INV-C11
```

### 2. Query `GetEmailDataByIdsAsync`

Agregar subquery para `GraOrden` — evita un inner join que filtre registros sin salón activo. Patrón: left-lookup vía correlated subquery. Referencia en el mismo repo: `AsistenciaAdminRepository.GetGraOrdenEstudianteActivoAsync` (existe desde Chat 2).

```csharp
// Repositories/Asistencias/AsistenciaAdminRepository.cs
public async Task<List<AsistenciaEmailDataRow>> GetEmailDataByIdsAsync(
    List<int> asistenciaIds, CancellationToken ct = default)
{
    var anioActual = DateTimeHelper.PeruNow().Year;

    return await (
        from ap in _context.AsistenciaPersona.AsNoTracking()
        where asistenciaIds.Contains(ap.ASP_CodID)
           && ap.ASP_TipoPersona == TipoPersona.Estudiante
        join e in _context.Estudiante.AsNoTracking()
            on ap.ASP_PersonaCodID equals e.EST_CodID
        join s in _context.Sede.AsNoTracking()
            on ap.ASP_SED_CodID equals s.SED_CodID
        select new AsistenciaEmailDataRow(
            ap.ASP_CodID,
            e.EST_CodID,
            e.EST_Nombres,
            e.EST_Apellidos,
            e.EST_CorreoApoderado,
            ap.ASP_Fecha,
            ap.ASP_HoraEntrada,
            ap.ASP_HoraSalida,
            s.SED_Nombre,
            // Plan 27 · INV-C11: GraOrden del salón activo del año actual;
            // null si el estudiante no tiene salón activo (INV-D09).
            _context.EstudianteSalon
                .Where(es => es.ESS_EST_CodID == e.EST_CodID
                          && es.ESS_Estado == true
                          && es.Salon.SAL_Estado == true
                          && es.Salon.SAL_Anio == anioActual)
                .Select(es => (int?)es.Salon.Grado.GRA_Orden)
                .FirstOrDefault()))
        .ToListAsync(ct);
}
```

Replicar el mismo patrón en `GetEmailDataByIdAsync` (singular) para simetría aunque hoy no tenga consumidores.

### 3. Service que pasa `GraOrden`

```csharp
// Services/Asistencias/AsistenciaAdmin/AsistenciaAdminBulkEmailService.cs
if (asistencia.HoraEntrada.HasValue)
{
    await _emailService.EnviarNotificacionAsistencia(
        emailApoderado, nombre, "entrada",
        asistencia.Fecha, asistencia.HoraEntrada.Value, asistencia.SedeNombre,
        asistencia.GraOrden);  // ← NUEVO · Plan 27 Chat 5c
}

if (asistencia.HoraSalida.HasValue)
{
    await _emailService.EnviarNotificacionAsistencia(
        emailApoderado, nombre, "salida",
        asistencia.Fecha, asistencia.HoraSalida.Value, asistencia.SedeNombre,
        asistencia.GraOrden);  // ← NUEVO · Plan 27 Chat 5c
}
```

## TESTS MÍNIMOS

### Repositorio (obligatorio — 3 tests)

**En `Educa.API.Tests/Repositories/Asistencias/AsistenciaAdminRepositoryPlan27Tests.cs`** (nuevo archivo, InMemory):

```
Seed: Sede + Grado (6 = 3ro Prim · 10 = 1ro Sec) + Salon + Estudiante + EstudianteSalon + AsistenciaPersona.

Test 1 — GetEmailDataByIdsAsync_EstudianteEnSalonActivo_ProyectaGraOrden
  Input: estudiante con ESS_Estado=true, Salon GRA_Orden=10
  Expected: AsistenciaEmailDataRow.GraOrden == 10

Test 2 — GetEmailDataByIdsAsync_EstudianteSinSalonActivo_GraOrdenNull_INV_D09
  Input: ESS_Estado=false (soft-deleted) o estudiante sin EstudianteSalon
  Expected: AsistenciaEmailDataRow.GraOrden == null

Test 3 — GetEmailDataByIdsAsync_EstudianteEnGradoBajoUmbral_GraOrdenReportado
  Input: estudiante con Salon GRA_Orden=6 (3ro Prim)
  Expected: AsistenciaEmailDataRow.GraOrden == 6
  (El repo NO filtra — reporta el orden real; el service aplica el early-return en EmailNotificationService)
```

### Service (opcional pero recomendado — 2 tests)

**En `Educa.API.Tests/Services/Asistencias/AsistenciaAdmin/AsistenciaAdminBulkEmailServiceTests.cs`** (nuevo si no existe):

```
Mock IAsistenciaAdminRepository.GetEmailDataByIdsAsync + IEmailNotificationService.

Test 1 — EnviarCorreosMasivosAsync_PropagaGraOrden_AlEmailService
  Input: AsistenciaEmailDataRow con GraOrden=6
  Expected: _emailService.EnviarNotificacionAsistencia recibe graOrden == 6 (no null)

Test 2 — EnviarCorreosMasivosAsync_ConGraOrdenNull_PropagaNull
  Input: AsistenciaEmailDataRow con GraOrden=null
  Expected: _emailService.EnviarNotificacionAsistencia recibe graOrden == null
  (Service no decide — propaga lo que el repo devuelve; la decisión vive en EmailNotificationService)
```

**Baseline esperada**: BE 1161 → ~1164 (+3 tests repo) o ~1166 (+5 tests con los del service).

## REGLAS OBLIGATORIAS

- **`AsNoTracking()`** en ambas queries (está en las originales; no romper).
- **`INV-D09`** — la subquery filtra `ESS_Estado=true && Salon.SAL_Estado=true && SAL_Anio=anioActual` para respetar soft-delete. Si no se filtra, podría devolverse `GraOrden` de un salón histórico incorrecto.
- **Cap 300 líneas** — `AsistenciaAdminRepository.cs` hoy está por debajo del cap; el fix agrega ~20 líneas, seguir debajo.
- **Fuente única de verdad** — `UmbralGradoAsistenciaDiaria` en `AsistenciaGrados` no se toca. El fix solo propaga `GraOrden`; la decisión del early-return vive en `EmailNotificationService` (no duplicar).
- **Commit message en inglés** (skill `commit`), términos de dominio entre comillas (`"AsistenciaAdminBulkEmailService"`, `"INV-C11"`, `"GraOrden"`).
- **NUNCA `Co-Authored-By`** (regla de la skill `commit`).

## APRENDIZAJES TRANSFERIBLES (del chat actual)

### 1. Auditar siempre los paths "no CRUD" de correos

Chat 2 aplicó el filtro en el webhook + `AsistenciaAdminCrudHelpers.NotificarCorreccionAsync` (vía `AsistenciaAdminEmailNotifier`). Chat 5b extendió a stats. La auditoría de Chat 5c reveló que `AsistenciaAdminBulkEmailService` (el path de envío masivo) quedó fuera del filtro porque su data source es una proyección dedicada que no traía `GraOrden`.

**Lección**: cualquier servicio que envíe correos desde un DTO de proyección propia (no desde la entidad) debe verificar que la proyección incluya los campos del filtro. Grep futuro útil:

```bash
grep -rn "IEmailNotificationService.Enviar" Educa.API/ --include="*.cs"
```

Hoy son solo los 4 callers mapeados; mañana podría haber más.

### 2. La constante `UmbralGradoAsistenciaDiaria` y el nombre del campo DTO

En el backend se llama `UmbralGradoAsistenciaDiaria` (`AsistenciaGrados`) y los DTOs usan `GraOrden` (no `GradoOrden`). En el FE la constante espejo es `UMBRAL_GRADO_ASISTENCIA_DIARIA` (UPPER_SNAKE_CASE) y los modelos usan `graOrden` (camelCase). Respetar al escribir nuevos campos.

### 3. `GetEmailDataByIdAsync` (singular) es deadcode pero se mantiene

El método singular está declarado en la interfaz y existe implementación, pero grep confirma que **no tiene consumidores** activos. Se mantiene por simetría con el plural. Aplicar el mismo fix en ambos para evitar deuda asimétrica.

### 4. `GetGraOrdenEstudianteActivoAsync` ya existe

Puede inspirar la forma del join pero **no se reutiliza** desde `GetEmailDataByIdsAsync` por dos razones:

- Una proyección EF Core con subquery es más eficiente que 1 + N llamadas (imaginar bulk de 50 asistencias → 50 round trips extra).
- El patrón read/write en los repos ya tiene una duplicación deliberada similar (documentada en `business-rules.md §1.11`); agregar otra en el mismo repo sería consistente, no anti-patrón.

### 5. Chat 5b ya estableció el precedente de "gap fix post-auditoría"

El maestro.md ya tiene fila "Chat 5b — Gap fix" en el plan de ejecución. Chat 5c se modela igual: fila "Chat 5c — Gap fix bulk email" con los baselines finales.

## FUERA DE ALCANCE

- **Frontend** — ningún cambio. El FE solo gatilla el endpoint, no lee `GraOrden` del bulk response.
- **Otros endpoints de correo** — ya auditados y correctos. El bulk es el único hueco identificado.
- **Plan de reversión** — ya documentado en §1.11; no re-escribir.
- **Tests del early-return en `EmailNotificationService`** — ya existen en `EmailNotificationServiceTests.cs` (5 tests que cubren graOrden 4/10/null × 2 métodos).
- **Consolidar los 2 lookups `GetGraOrden*`** — deuda técnica menor, no es scope de este chat.
- **Plan 22/24/26** — frentes paralelos, no tocar.

## CRITERIOS DE CIERRE

```
PRE-WORK
[ ] Baselines iniciales BE 1161 + FE 1509 confirmados
[ ] Commits Plan 27 previos (2221af9 BE + d69ea8f FE) confirmados en local

CÓDIGO BE
[ ] AsistenciaEmailDataRow tiene nuevo campo `int? GraOrden`
[ ] GetEmailDataByIdsAsync joins / subquery para GraOrden con INV-D09
[ ] GetEmailDataByIdAsync (singular) mismo patrón
[ ] AsistenciaAdminBulkEmailService pasa asistencia.GraOrden en las 2 invocaciones

TESTS BE
[ ] 3 tests de repo (salón activo, null INV-D09, grado bajo umbral)
[ ] (Opcional) 2 tests de service (propaga GraOrden / propaga null)
[ ] Baseline final: BE 1161 → ≥1164 verdes

DOCS (educa-web)
[ ] business-rules.md §1.11 — fila "Correos" menciona AsistenciaAdminBulkEmailService
[ ] business-rules.md §15.4 — fila INV-C11 enforcement suma el bulk
[ ] maestro.md — Chat 5c agregado al plan de ejecución (fila nueva tras Chat 5b)
[ ] maestro.md — baseline final en la línea "Fecha/última revisión"
[ ] maestro.md — bloque Plan 27 actualizado con Chat 5c

CIERRE
[ ] Suite BE + FE verde al final (sin regresiones)
[ ] Commit BE: "feat(asistencia): Plan 27 Chat 5c — propagate GraOrden through bulk email path"
[ ] Commit FE (docs + maestro): "docs(asistencia): Plan 27 Chat 5c closed — bulk email gap fixed"
[ ] Mover `021-plan-27-chat-5c-...md` a `.claude/chats/closed/` al cerrar
[ ] Reportar al usuario: ¿algún path de correo más que auditar antes de archivar Plan 27?
```

## COMMIT MESSAGE sugerido

Dos commits — uno BE (el fix real) y uno FE (solo docs + maestro).

### Backend (`Educa.API`)

```text
feat(asistencia): Plan 27 Chat 5c — propagate "GraOrden" through bulk email path

Close the last "INV-C11" gap found during the post-Chat 5b audit. The
"POST /api/AsistenciaAdmin/correos-masivos" endpoint lets an admin
re-send attendance emails in bulk, but its data source
("GetEmailDataByIdsAsync") projected a dedicated DTO that did not carry
"GraOrden", so the 2 downstream calls to
"IEmailNotificationService.EnviarNotificacionAsistencia" passed null —
the early-return in that service NEVER fired, and emails went out even
for students with "GRA_Orden < UmbralGradoAsistenciaDiaria".

- "AsistenciaEmailDataRow" record gains "int? GraOrden" (populated via
  a correlated subquery against "EstudianteSalon + Salon + Grado"
  filtered by "ESS_Estado=true + SAL_Estado=true + SAL_Anio=anioActual"
  per "INV-D09"; null when the student has no active classroom).
- Both "GetEmailDataByIdAsync" (singular, currently unused) and
  "GetEmailDataByIdsAsync" (plural, used by the bulk service) apply
  the same projection for symmetry.
- "AsistenciaAdminBulkEmailService" now forwards "asistencia.GraOrden"
  on both the "entrada" and "salida" calls.

Tests: new "AsistenciaAdminRepositoryPlan27Tests" covers projection
for active classroom / null / low-grade cases. Service-level test
added to confirm that "GraOrden" is forwarded verbatim (null or not)
to the email service — the decision still lives in
"EmailNotificationService" so the unit tests there are unchanged.

Baseline: 1161 → ~1164 tests green.
```

### Frontend (`educa-web` — solo docs)

```text
docs(asistencia): Plan 27 Chat 5c closed — bulk email "INV-C11" gap fixed

Document the last "INV-C11" gap found during the Chat 5b audit and
closed in the backend by commit NNNNNNN:

- "business-rules.md §1.11" — "Dónde se aplica" table now mentions
  "AsistenciaAdminBulkEmailService.EnviarCorreosMasivosAsync"
  explicitly alongside the 2 existing "EmailNotificationService"
  functions.
- "business-rules.md §15.4" — "INV-C11" enforcement map adds the bulk
  service to the email-path list.
- "maestro.md" — Chat 5c row added to "Plan de ejecución" marked ✅
  closed with final baseline BE ~1164 + FE 1509 tests green; Plan 27
  block updated; "Foco" adjusted. Plan 27 remains pending only "jefe
  post-deploy validation" before archiving in
  "history/planes-cerrados.md".

No code changes. FE baselines unchanged at 1509.
```

## CIERRE

Al terminar Chat 5c, pedir al usuario:

1. **¿Hay otro path de correo o notificación que el Chat 5b/5c pasó por alto?** — aunque la auditoría cubrió `EmailNotificationService`, callers directos e indirectos, falta confirmar que no haya jobs de Hangfire, workers o handlers de SignalR que despachen correos por cuenta propia. Si el usuario sabe de alguno (ej: un recordatorio semanal, un reporte agendado), abrir chat aparte.
2. **¿Seguimos con push + deploy + validación del jefe?** — post Chat 5c, todos los frentes de código del Plan 27 están cerrados. Lo que queda es push coordinado (master + main) + deploy + smoke tests post-deploy.
3. **¿Abrir el chat de "operaciones post-deploy"?** — una vez pusheado y deployado, generar un chat file con el checklist de smoke tests (fue propuesto al cerrar Chat 5 pero quedó en stand-by esperando que el código estuviera 100% completo — que es ahora).

Si cierre limpio + tests verdes + commits hechos + maestro actualizado → **Plan 27 COMPLETO en código**. Pendiente solo la validación del jefe post-deploy para archivar.