> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo. El trabajo es **backend puro** — FE (pantalla admin consumidora) sale en Plan 22 Chat 6 posterior.
> **Plan**: 22 · **Chat**: 5 · **Fase**: F4.BE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #2 (el #1 es OPS, no es código).

---

# Plan 22 Chat 5 — F4.BE Endpoint de auditoría preventiva de correos

## PLAN FILE

- Plan Educa.API: `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` → sección **"Chat 5 — F4.BE: Auditoría retroactiva endpoint"** (líneas 487-571).
- Maestro cross-repo: `../../educa-web/.claude/plan/maestro.md` → fila **22** del inventario (`95%`) y **cola de 3 chats posición #2**. Este chat cierra Plan 22 a ~97%; el Chat 6 FE (`educa-web`) lo lleva a 100%.
- Contexto de chats cerrados (referencia — NO re-derivar wording):
  - `educa-web/.claude/chats/closed/020-plan-22-chat-1-be-validacion-ascii-rfc.md` — crea `EmailValidator.Validate()` que este chat reusa.
  - `educa-web/.claude/chats/closed/021-plan-22-chat-2-be-clasificacion-smtp.md` — columna `EO_TipoFallo` y helper `SmtpErrorClassifier` (no toca este chat, pero confirma que el helper `EmailValidator` ya está en prod).
  - `educa-web/.claude/chats/closed/029-plan-29-chat-4-docs-correos-smtp-invariantes.md` — formalizó `INV-MAIL01` que este chat aplica retroactivamente (los correos inválidos YA no cruzan al outbox, pero los que están en BD siguen inválidos — este endpoint los expone al admin para corregir en la fuente).

## OBJETIVO

Endpoint admin read-only que lista todos los correos en BD (apoderados + profesores + campo directo de estudiante) que hoy fallan el validador de formato `EmailValidator.Validate()`. Permite al director/admin corregir el dato de origen antes de que el outbox lo rechace silenciosamente por `INV-MAIL01`.

- Endpoint: `GET /api/sistema/auditoria-correos-asistencia`
- Authz: `[Authorize(Roles = Roles.Administrativos)]` (Director + Asistente Administrativo + Promotor + Coordinador Académico).
- Scope: **solo registros activos** (`_Estado = 1`). Los inactivos son historia, no acción.
- **Fuera de scope**: la pantalla FE consumidora va en Chat 6 posterior (repo `educa-web`).

## PRE-WORK OBLIGATORIO (regla DB-SELECT-first)

**NO escribir código sin ejecutar primero estas queries sobre la BD y confirmar resultados con el usuario.** El nombre de las columnas varía entre convenciones (`EST_CorreoApoderado` vs `EST_Correo_Apoderado`, etc.) y no sirve asumir.

### Query 1 — Confirmar nombres exactos de columnas

```sql
-- ¿Cómo se llama la columna de correo en cada tabla?
SELECT 'Estudiante' AS tabla, name FROM sys.columns
WHERE object_id = OBJECT_ID('Estudiante') AND name LIKE '%Correo%';
-- Esperado: EST_CorreoApoderado (confirmar — puede haber 2+ columnas relacionadas con correo)

SELECT 'Apoderado' AS tabla, name FROM sys.columns
WHERE object_id = OBJECT_ID('Apoderado') AND name LIKE '%Correo%';
-- Esperado: APO_Correo

SELECT 'Profesor' AS tabla, name FROM sys.columns
WHERE object_id = OBJECT_ID('Profesor') AND name LIKE '%Correo%';
-- Esperado: PRO_Correo
```

### Query 2 — Universo a auditar (conteo)

```sql
SELECT
  (SELECT COUNT(*) FROM Estudiante WHERE EST_Estado = 1 AND EST_CorreoApoderado IS NOT NULL AND EST_CorreoApoderado <> '') AS estudiantes_con_correo_apoderado,
  (SELECT COUNT(*) FROM Apoderado  WHERE APO_Estado = 1 AND APO_Correo           IS NOT NULL AND APO_Correo           <> '') AS apoderados_con_correo,
  (SELECT COUNT(*) FROM Profesor   WHERE PRO_Estado = 1 AND PRO_Correo           IS NOT NULL AND PRO_Correo           <> '') AS profesores_con_correo;
```

### Query 3 — Sample de inválidos detectados por heurística LIKE

Estos son los candidatos más obvios (cualquier carácter no-ASCII imprimible 0x20-0x7E). El `EmailValidator` del service capturará más casos (regex RFC 5322), pero esto da idea del orden de magnitud.

```sql
SELECT TOP 20 EST_CodID, EST_CorreoApoderado
FROM Estudiante
WHERE EST_Estado = 1
  AND EST_CorreoApoderado IS NOT NULL
  AND EST_CorreoApoderado LIKE '%[^ -~]%';

SELECT TOP 20 APO_CodID, APO_Correo
FROM Apoderado
WHERE APO_Estado = 1
  AND APO_Correo IS NOT NULL
  AND APO_Correo LIKE '%[^ -~]%';

SELECT TOP 20 PRO_CodID, PRO_Correo
FROM Profesor
WHERE PRO_Estado = 1
  AND PRO_Correo IS NOT NULL
  AND PRO_Correo LIKE '%[^ -~]%';
```

### Preguntas a resolver con los resultados

1. **Universo total** — ¿orden de magnitud correcto? Si estudiantes sale > 10.000 el endpoint necesita paginación; si sale < 2.000 puede ser un `List<T>` completo.
2. **Casos inválidos reales** — ¿los correos que salen en Query 3 son tipográficamente reparables (`papañ@gmail.com` → `papa@gmail.com`) o son errores más graves (correos vacíos disfrazados, texto libre como "no tiene")?
3. **¿Hay `EST_Correo` (correo directo del estudiante, no del apoderado)?** — Si sí, hay que decidir si se audita también. La decisión del plan (Chat 1) fue auditar solo el que se usa para notificaciones: `EST_CorreoApoderado`. Confirmar que sigue vigente.
4. **¿Hay correos con espacios al final / inicio?** — Los `LIKE '%[^ -~]%'` no atrapan eso (el espacio es ASCII imprimible). El `EmailValidator` sí. Confirmar que el service aplica `Trim()` o lo deja fallar como está (depende de F1).

## ALCANCE

### Archivos a crear

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|-----------------:|
| 1 | `Educa.API/DTOs/Sistema/AuditoriaCorreoAsistenciaDto.cs` | DTO de respuesta por fila: `{ TipoOrigen: "Estudiante"/"Apoderado"/"Profesor", EntidadId: int, Dni: string (enmascarado), NombreCompleto: string, CorreoActual: string (enmascarado), TipoFallo: string, Razon: string }` | ~20-25 |
| 2 | `Educa.API/Interfaces/Repositories/Sistema/IAuditoriaCorreosRepository.cs` | Contrato | ~15 |
| 3 | `Educa.API/Interfaces/Services/Sistema/IAuditoriaCorreosService.cs` | Contrato | ~15 |
| 4 | `Educa.API/Repositories/Sistema/AuditoriaCorreosRepository.cs` | 3 queries read-only con `AsNoTracking()` (Estudiante, Apoderado, Profesor). Filtros: `_Estado = 1`, correo no null/vacío. Proyecta a una tupla/record interno con los campos necesarios | ~100-130 |
| 5 | `Educa.API/Services/Sistema/AuditoriaCorreosService.cs` | Combina el repository + `EmailValidator.Validate()` de F1 en memoria. Solo devuelve las filas donde el validador reporta fallo. Enmascara DNI y correo antes de retornar (INV-S: no exponer datos sensibles crudos) | ~80-100 |
| 6 | `Educa.API/Controllers/Sistema/AuditoriaCorreosController.cs` | `[Route("api/sistema/auditoria-correos-asistencia")]` + `[Authorize(Roles = Roles.Administrativos)]`. Un solo endpoint `GET` que delega al service y envuelve en `ApiResponse<List<AuditoriaCorreoAsistenciaDto>>` (INV-D08) | ~50-70 |
| 7 | `Educa.API.Tests/Services/Sistema/AuditoriaCorreosServiceTests.cs` | Integration con `TestDbContextFactory` | ~120-140 |
| 8 | `Educa.API.Tests/Controllers/Sistema/AuditoriaCorreosControllerAuthorizationTests.cs` | Authz por reflection (espejo de `AsistenciaAdminControllerAuthorizationTests`) | ~60-80 |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `Educa.API/Program.cs` | Registrar `IAuditoriaCorreosService` + `IAuditoriaCorreosRepository` en DI (scoped). |
| `Educa.API/Constants/Auth/Roles.cs` | Verificar que `Roles.Administrativos` ya existe (agregado por Plan 21/23). Si existe, no tocar. Si no, **investigar antes** — probablemente el símbolo es otro (p. ej. `Roles.Director + "," + Roles.AsistenteAdministrativo + ...`). NO introducir constante nueva sin confirmar convención vigente. |

### Estructura del DTO

```csharp
// Educa.API/DTOs/Sistema/AuditoriaCorreoAsistenciaDto.cs
namespace Educa.API.DTOs.Sistema;

public sealed class AuditoriaCorreoAsistenciaDto
{
    public required string TipoOrigen      { get; init; } // "Estudiante" | "Apoderado" | "Profesor"
    public required int    EntidadId       { get; init; } // EST_CodID / APO_CodID / PRO_CodID
    public required string Dni             { get; init; } // enmascarado via DniHelper.Mask()
    public required string NombreCompleto  { get; init; }
    public required string CorreoActual    { get; init; } // enmascarado (ver abajo)
    public required string TipoFallo       { get; init; } // valor de EmailValidator (FailedNoEmail/FailedInvalidAddress/...)
    public required string Razon           { get; init; } // texto humano corto — "Contiene caracteres no-ASCII", "Formato inválido (falta @)", etc.
}
```

### Enmascaramiento de correo (regla de privacidad)

El endpoint lo consume el admin, pero el correo puede aparecer en logs/screenshots/tickets. Enmascarar con el patrón:

- `papanoel@gmail.com` → `pa***el@gmail.com` (primeros 2 + `***` + últimos 2 de la parte local, dominio completo).
- Correo muy corto (< 4 chars en la parte local) → `***@dominio`.
- Correo sin `@` → `***` (no se adivina estructura).

Helper privado en el service, o extender `DniHelper.Mask()` con un método `MaskEmail()` si encaja. Decidir en el chat — si el helper queda ≤ 15 líneas, inline; si crece, archivo aparte en `Educa.API/Helpers/Formatting/EmailMasker.cs`.

## TESTS MÍNIMOS

### Integration (service) — `AuditoriaCorreosServiceTests.cs`

Casos con `TestDbContextFactory`:

| Caso | Setup | Esperado |
|------|-------|----------|
| Estudiante con apoderado correo válido | `EST_CorreoApoderado = "papa@gmail.com"` + `EST_Estado = 1` | **NO** aparece |
| Estudiante con apoderado correo inválido (ñ) | `EST_CorreoApoderado = "papañ@gmail.com"` + `EST_Estado = 1` | Aparece con `TipoOrigen = "Estudiante"`, DNI/correo enmascarados |
| Estudiante con correo NULL | `EST_CorreoApoderado = null` | NO aparece (nada que validar) |
| Estudiante con correo vacío | `EST_CorreoApoderado = ""` | NO aparece (tratar igual que null — el outbox no intenta enviar) |
| Estudiante inactivo con correo inválido | `EST_Estado = 0` + correo inválido | NO aparece (respeta INV-D03 / scope "solo activos") |
| Apoderado con correo válido | `APO_Correo = "mama@hotmail.com"` + `APO_Estado = 1` | NO aparece |
| Apoderado con correo inválido (falta `@`) | `APO_Correo = "mamagmail.com"` | Aparece con `TipoOrigen = "Apoderado"` |
| Profesor con correo inválido (espacio) | `PRO_Correo = "prof @colegio.edu.pe"` | Aparece con `TipoOrigen = "Profesor"` |
| Resultado vacío (universo sano) | BD sin inválidos | Service retorna `List<>` vacía, NO null (INV-D08) |
| Orden de resultados | 1 de cada tipo inválido | Orden determinista (sugerencia: por `TipoOrigen` alfabético, luego por `EntidadId`) |

### Authorization — `AuditoriaCorreosControllerAuthorizationTests.cs`

Pattern de reflection (ver `AsistenciaAdminControllerAuthorizationTests` como referencia):

| Rol | Esperado |
|-----|----------|
| Director | 200 OK |
| Asistente Administrativo | 200 OK |
| Promotor | 200 OK |
| Coordinador Académico | 200 OK |
| Profesor | 403 Forbidden |
| Estudiante | 403 Forbidden |
| Apoderado | 403 Forbidden |
| Anónimo (sin token) | 401 Unauthorized |

## REGLAS OBLIGATORIAS

- **INV-D03** Soft-delete: filtrar `_Estado = 1` en las 3 queries. Registros inactivos NO aparecen en la auditoría.
- **INV-D05** `AsNoTracking()` en **todas** las queries del repository.
- **INV-D08** Respuesta envuelta en `ApiResponse<T>`.
- **INV-S** (privacidad):
  - DNI enmascarado con `DniHelper.Mask()` (siempre `***1234`) antes de retornar al cliente.
  - Correo enmascarado con el helper que decidas (inline o `EmailMasker.cs`).
  - Logs internos (si los hay) usan los mismos valores enmascarados — nunca crudos.
- **Cap 300 líneas** por archivo `.cs`. Ninguno debería acercarse — el controller es delgado, el service es orquestación, el repository son 3 queries simples.
- **INV-MAIL01 coherencia**: el validador que usa este endpoint debe ser el mismo `EmailValidator.Validate()` que usa `EmailOutboxService.EnqueueAsync`. **No duplicar reglas ni regex** — si el endpoint acepta un correo que el outbox rechazaría, es bug.
- **Excepciones tipadas**: si algo falla, lanzar `BusinessRuleException` / `NotFoundException` según corresponda. `GlobalExceptionMiddleware` las captura.
- **Naming**: `AuditoriaCorreosController` / `AuditoriaCorreosService` / `AuditoriaCorreosRepository` — consistente con el plan. El DTO es `AuditoriaCorreoAsistenciaDto` (singular, sufijo `Dto`).

## APRENDIZAJES TRANSFERIBLES (del trabajo reciente)

1. **Plan 29 cerrado 2026-04-23** — ya hay 5 commits recientes tocando `EmailOutboxService`, `EmailValidator`, `IEmailBlacklistService` (Chats 2/2.5/2.6 + 4 docs). Antes de codificar, hacer `git log --oneline -15 Educa.API/Helpers/Formatting/EmailValidator.cs` para confirmar que el helper no cambió firma desde F1. Si cambió, adaptar el uso.

2. **Suite BE está en 1274 verdes** (post Chat 2.6). Cualquier test nuevo debe mantener esa cifra + delta positivo. Ejecutar `dotnet test` **antes** de empezar a modificar para tener baseline.

3. **`Roles.Administrativos`** ya se usa en `EmailBlacklistController` y `AsistenciaAdminController`. Copiar el `[Authorize(Roles = Roles.Administrativos)]` literal — no inventar variante.

4. **`ApiResponse<T>`** es la envoltura estándar (INV-D08). Los controllers del Plan 29 Chats 2/2.6 son buenos ejemplos de la firma `ActionResult<ApiResponse<T>>` + `Ok(ApiResponse<T>.Success(data, "Mensaje"))`.

5. **`TestDbContextFactory`** es el helper introducido en Plan 22 Chat 1 (F1). Vive en `Educa.API.Tests/Helpers/` y ya lo usan los tests de `EmailOutboxService` / `EmailOutboxWorker` / `EmailFailureLogger`. Reusar — no crear uno nuevo.

6. **Pattern de tests de authz por reflection** — `AsistenciaAdminControllerAuthorizationTests.cs` es el canónico (Plan 23). Lee el atributo `[Authorize(Roles = ...)]` de la clase del controller y verifica que cada rol esperado esté incluido. Sin arrancar `TestServer`.

7. **Pre-work SQL es decisión del usuario** — el plan dice "mostrar queries al usuario y confirmar antes de codificar". No saltar ese paso aunque los nombres parezcan obvios — la tabla `Estudiante` puede tener 2+ columnas con `Correo` en el nombre (ej: `EST_Correo` propio del estudiante + `EST_CorreoApoderado` del apoderado).

8. **`EmailValidator.Validate()` ya está extendido** — en Plan 29 Chat 2.5 se extendió a todos los tipos de correo (ya no hay whitelist). O sea: este endpoint lo puede llamar indistintamente para apoderado/profesor/estudiante sin ramificar por tipo.

9. **`DniHelper.Mask()`** vive en `Educa.API/Helpers/`. Patrón: `***1234` (últimos 4 dígitos). Para correo NO existe helper análogo — decidir en el chat si crear `EmailMasker.cs` o hacer método privado en el service.

10. **El plan file está en Educa.API**, no en educa-web. Ruta desde BE: `.claude/plan/asistencia-correos-endurecimiento.md`. Ruta desde este brief: `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`.

## FUERA DE ALCANCE

- **Pantalla FE** `/intranet/admin/auditoria-correos` — va en Plan 22 Chat 6 (repo `educa-web`, chat posterior a este).
- **Corrección masiva** — este endpoint es read-only; el admin edita registro por registro vía las pantallas existentes (`/admin/usuarios`, etc.). No agregar `POST /corregir` ni import batch.
- **Whitelist de correos permitidos** — el scope es solo los que `EmailValidator` rechaza hoy. Si un correo pasa el validador pero rebota en runtime por otra razón, ese es problema de INV-MAIL02 (auto-blacklist) — no de este endpoint.
- **Notificación al apoderado** (ej: "tu correo está mal, corrígelo") — fuera de alcance. Es decisión de negocio futura, no infraestructura.
- **Métricas/dashboard** — el endpoint es una lista, no un histograma. Si se quieren agregados (cuántos inválidos por tipo), hacerlo en el FE como stat card de la misma pantalla.
- **Paginación server-side** — si el universo resulta ser < 2.000 filas totales (confirmar en pre-work), omitir paginación. Si resulta > 5.000, agregar `?skip&take` + `X-Total-Count` header en este chat. Entre 2.000 y 5.000 decidir en el chat con el dato real.

## CRITERIOS DE CIERRE

```
PRE-WORK
[ ] Queries 1-3 ejecutadas sobre BD de prueba (o producción read-only) — resultados compartidos con el usuario
[ ] Confirmado que los nombres de columnas son EST_CorreoApoderado / APO_Correo / PRO_Correo (o ajustar plan si difieren)
[ ] Confirmado universo total (< 2.000 filas → sin paginación; caso contrario aplicar paginación)
[ ] Confirmado que scope sigue siendo EST_CorreoApoderado (no EST_Correo directo del estudiante)

CÓDIGO
[ ] 8 archivos nuevos creados (2 interfaces + repo + service + controller + DTO + 2 tests)
[ ] Program.cs registra IAuditoriaCorreosService + IAuditoriaCorreosRepository en DI
[ ] Roles.Administrativos verificado (no modificar si existe)
[ ] Todos los archivos ≤ 300 líneas

VALIDACIÓN
[ ] dotnet build limpio — 0 warnings, 0 errors
[ ] dotnet test todos verdes — suite ≥ 1274 baseline + 10-15 nuevos esperados
[ ] Integration tests cubren los 10 casos de la tabla (válido, inválido por tipo, null, vacío, inactivo, orden)
[ ] Authz tests cubren los 8 roles de la tabla (4 OK + 3 Forbidden + 1 Unauthorized)
[ ] AsNoTracking() en las 3 queries del repository (verificado por grep)
[ ] DNI y correo enmascarados en el DTO retornado (verificado en integration tests)

MAESTRO
[ ] maestro.md fila 22 actualizada: ~95% → ~97% con nota "Chat 5 F4.BE cerrado, Chat 6 F4.FE pendiente"
[ ] maestro.md cola top 3 actualizada: Chat 5 removido del #2, Chat 6 promovido a #2 (o nuevo item al final si aplica)
[ ] maestro.md Foco actualizado reflejando cierre de Chat 5 BE

COMMIT
[ ] Un solo commit en Educa.API master con el mensaje sugerido abajo
[ ] Mover este archivo a educa-web/.claude/chats/closed/030-plan-22-chat-5-be-auditoria-correos.md
[ ] Commit docs maestro en educa-web main (separado del BE) con el subject sugerido
```

## COMMIT MESSAGE sugerido

### Commit BE (Educa.API master)

**Subject** (≤ 72 chars):

```
feat(auditoria): Plan 22 Chat 5 — add "auditoria-correos-asistencia" endpoint
```

**Body**:

```
Close Plan 22 Chat 5 F4.BE. Add read-only admin endpoint that surfaces
all active "Estudiante"/"Apoderado"/"Profesor" rows whose email column
fails "EmailValidator.Validate()" (the same validator that
"EmailOutboxService.EnqueueAsync" applies — "INV-MAIL01").

 - "GET /api/sistema/auditoria-correos-asistencia" with
   "[Authorize(Roles = Roles.Administrativos)]".
 - Repository: 3 queries with "AsNoTracking()" over "Estudiante",
   "Apoderado" and "Profesor" filtered by "_Estado = 1" and non-empty
   email. Projects to an internal record.
 - Service: combines the repository with "EmailValidator.Validate()"
   in memory. Returns only rows where the validator reports failure.
 - DTO "AuditoriaCorreoAsistenciaDto" masks DNI via "DniHelper.Mask()"
   and email via "EmailMasker" (new helper / inline depending on size)
   before reaching the client — admin never sees raw PII in the
   response.
 - Response wrapped in "ApiResponse<List<AuditoriaCorreoAsistenciaDto>>"
   ("INV-D08").

Tests:
 - 10 integration tests covering valid/invalid/null/empty/inactive
   for each of the 3 sources + empty-universe + deterministic ordering.
 - 8 authorization tests by reflection mirroring
   "AsistenciaAdminControllerAuthorizationTests" — 4 administrative
   roles pass, 3 non-admin roles return 403, anonymous returns 401.

Suite "<baseline>+<delta> verdes" ("dotnet test"). Cap 300 lines
respected on every new file. Plan 22 fila 22 a ~97%; Chat 6 F4.FE
(pantalla admin en "educa-web") cierra el plan a 100%.
```

### Commit docs (educa-web main, separado)

**Subject** (≤ 72 chars):

```
docs(maestro): Plan 22 Chat 5 F4.BE ✅ cerrado — commit <hash> en Educa.API
```

**Body**: 3-5 líneas con fila 22 a ~97%, cola top 3 actualizada, Foco actualizado.

**Recordatorios** (skill `commit`):

- Inglés imperativo (`add`, `close`, `mask`).
- Español solo entre `"..."` para dominio (`"EmailValidator.Validate()"`, `"EmailOutboxService.EnqueueAsync"`, `"INV-MAIL01"`, `"AsistenciaAdminControllerAuthorizationTests"`, `"AuditoriaCorreoAsistenciaDto"`, `"Administrativos"`, `"DniHelper.Mask()"`).
- NUNCA `Co-Authored-By`.

## CIERRE

Feedback a pedir al cerrar el Chat 30 (Plan 22 Chat 5):

1. **Resultados del pre-work SQL** — ¿el universo fue del tamaño esperado? Si fue mucho mayor (> 5k), dejar nota en el maestro para que Chat 6 FE aplique paginación del lado UI (el endpoint ya la tendría).
2. **¿Se creó `EmailMasker.cs` o quedó inline?** — Si es archivo aparte, anotarlo en el commit para que Chat 6 FE sepa que ese helper existe y **no duplique** enmascaramiento en frontend.
3. **¿Apareció algún caso no contemplado en el validador?** — Ej: correos con `<>` o `"..."` que F1 no consideró. Si sí, decisión: ¿extender `EmailValidator` en este chat (scope creep) o abrir micro-chat posterior?
4. **Próximo chat tras 30** — Plan 22 Chat 6 F4.FE (repo `educa-web`). Depende de que el endpoint BE esté desplegado en un ambiente accesible al FE. ¿Deploy de 30 antes de arrancar 31, o desarrollo FE contra staging/mock?
