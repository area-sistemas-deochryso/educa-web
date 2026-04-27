> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Validación prod**: ✅ verificada 2026-04-27 — endpoint /api/sistema/correlation/{id} responde con shape esperado.
> **Plan**: 32 · **Chat**: 3 · **Fase**: BE · **Estado**: 🟡 WIP — código escrito en local sin commit, falta validar build + tests + commit + actualizar maestro.

---

# Plan 32 Chat 3 BE — Endpoint `/correlation/{id}` (close-out: validar + commit)

## PLAN FILE

- `../../educa-web/.claude/plan/correlation-id-links.md` — sección **"Chat 3 BE — Endpoint `/correlation/{id}` + índices BD"**.
- Maestro: `../../educa-web/.claude/plan/maestro.md` — fila Plan 32 + bloque Notas.
- Reglas: `../../educa-web/.claude/rules/business-rules.md` §INV-S07 + §INV-RU05 + §INV-D08.
- Reglas backend: `../../educa-web/.claude/rules/backend.md` § "Cap 300 líneas BE" + § "Manejo de Errores".

## OBJETIVO

**El código del Chat 3 BE ya está escrito en local en `Educa.API master`** durante una sesión previa. Falta:

1. Validar `dotnet build` limpio (estaba bloqueado por lock de `Educa.API.exe` PID local).
2. Correr suite BE completa (~1379 baseline + 17 nuevos esperados verdes).
3. Commit en `Educa.API master`.
4. Actualizar `correlation-id-links.md` + maestro + commit FE de docs en `educa-web main`.
5. Mover este brief a `educa-web/.claude/chats/closed/`.

## PRE-WORK OBLIGATORIO

### 1. Verificar estado local sin tocar nada

```bash
cd /c/Users/Asus\ Ryzen\ 9/EducaWeb/Educa.API
git status
```

**Esperado** (los 9 archivos del Chat 3 BE escritos en sesión previa):

```
modified:   Educa.API/Extensions/ServiceExtensions.cs
Untracked:
  Educa.API/DTOs/Sistema/CorrelationSnapshotDto.cs
  Educa.API/DTOs/Sistema/CorrelationErrorLogDto.cs
  Educa.API/DTOs/Sistema/CorrelationRateLimitEventDto.cs
  Educa.API/DTOs/Sistema/CorrelationReporteUsuarioDto.cs
  Educa.API/DTOs/Sistema/CorrelationEmailOutboxDto.cs
  Educa.API/Interfaces/Services/Sistema/ICorrelationService.cs
  Educa.API/Services/Sistema/CorrelationService.cs
  Educa.API/Services/Sistema/CorrelationSnapshotFactory.cs
  Educa.API/Controllers/Sistema/CorrelationController.cs
  Educa.API.Tests/Services/Sistema/CorrelationServiceTests.cs
  Educa.API.Tests/Controllers/Sistema/CorrelationControllerAuthorizationTests.cs
```

Si `git status` está limpio o difiere mucho de esto, **avisar al usuario** — alguien committeó/borró el trabajo previo y este brief queda desactualizado.

### 2. Detener API local antes de buildear

El último intento de build falló por lock del binario:

```
error MSB3027: No se pudo copiar ... Educa.API.exe ... bloqueado por: "Educa.API (PID xxxx)"
```

Pedirle al usuario:

> "¿Está corriendo `dotnet run` o el debugger de VS sobre Educa.API? Necesito detenerlo (Ctrl+C en la terminal o Stop en VS) antes del build/tests para evitar el lock del .exe."

Si el lock persiste tras "detenido", verificar con:

```bash
tasklist //FI "IMAGENAME eq Educa.API.exe"  # Windows
```

Y matar el proceso con:

```bash
taskkill //F //PID <pid>
```

### 3. Confirmar índices BD ya creados

Durante la sesión previa el usuario corrió los 2 `CREATE INDEX` faltantes (Plan 32 Chat 3 cubre las 4 tablas; 2 índices ya existían — `IX_ErrorLog_CorrelationId` y `IX_REU_CorrelationId` — y los otros 2 los creó manualmente). Re-validar con:

```sql
SELECT t.name AS TablaName, i.name AS IndiceName, ic.key_ordinal,
       c.name AS ColumnaName, i.has_filter, i.filter_definition
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE t.name IN ('ErrorLog', 'RateLimitEvent', 'REU_ReporteUsuario', 'EmailOutbox')
  AND c.name LIKE '%CorrelationId%'
ORDER BY t.name, i.name, ic.key_ordinal;
```

Esperado: **4 filas** (una por tabla), cada una con `has_filter = 1` y `filter_definition = ([..._CorrelationId] IS NOT NULL)`.

Si falta alguno, ejecutar el faltante:

```sql
-- Solo los que el SELECT no devuelva
CREATE NONCLUSTERED INDEX IX_RateLimitEvent_CorrelationId
    ON RateLimitEvent(REL_CorrelationId)
    WHERE REL_CorrelationId IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_EmailOutbox_CorrelationId
    ON EmailOutbox(EO_CorrelationId)
    WHERE EO_CorrelationId IS NOT NULL;
```

## ALCANCE

Sin código nuevo. Solo validación + commits + docs.

| Acción | Detalle |
|--------|---------|
| `dotnet build Educa.API/Educa.API.csproj` | Sin warnings nuevos sobre la baseline |
| `dotnet build Educa.API.Tests/Educa.API.Tests.csproj` | Compila tests |
| `dotnet test Educa.API.Tests/Educa.API.Tests.csproj --filter "FullyQualifiedName~Correlation"` | Filtra solo los 17 tests nuevos del Chat 3, validar 17/17 verdes |
| `dotnet test Educa.API.Tests/Educa.API.Tests.csproj --no-build` | Suite completa, 1379 (baseline Chat 2) + 17 = **1396 verdes** |
| `git commit` en `Educa.API master` | Commit message del bloque "COMMIT MESSAGE sugerido" |
| Actualizar `correlation-id-links.md` | Marcar Chat 3 ✅ con commit hash + tests count + sección "Resultado real" |
| Actualizar `maestro.md` | Fila Plan 32 a ~70% + nota nueva en bloque Notas |
| Commit en `educa-web main` | Docs del plan/maestro + mover este brief a `closed/` |

## TESTS QUE DEBEN ESTAR VERDES

| # | Test | Archivo |
|---|------|---------|
| 1-9 | Service: vacío, mix 4 fuentes, filtro por id, DNI mask, anónimo, cap 100, contexto disposed, truncado descripción, truncado ultimoError | `Educa.API.Tests/Services/Sistema/CorrelationServiceTests.cs` |
| 10-17 | Controller authz: tiene `[Authorize(Administrativos)]`, rechaza Profesor/Apoderado/Estudiante, endpoint existe, id vacío→400, id whitespace→400, id excede cap→400, id válido→delega trim al service | `Educa.API.Tests/Controllers/Sistema/CorrelationControllerAuthorizationTests.cs` |

Si **alguno** falla, NO commitear. Diagnosticar, fixear, re-correr suite. Solo commitear con todos los nuevos verdes Y suite completa sin regresiones.

## REGLAS OBLIGATORIAS

| Regla | Aplicación |
|-------|-----------|
| `INV-S07` | El service ya tiene try/catch por query + try/catch global. Confirmar en code review que el commit lo respeta antes de mergear |
| `INV-D08` | Endpoint retorna `ApiResponse<CorrelationSnapshotDto>` |
| `INV-D09` | Las 4 tablas consultadas NO tienen soft-delete (`ErrorLog`, `RateLimitEvent`, `REU_ReporteUsuario`, `EmailOutbox`) — no aplica filtro `_Estado=true` |
| `INV-RU05` | Reportes anónimos linkeables igual con DNI null (test 5 del service lo cubre) |
| Cap 300 BE | `CorrelationService.cs` está en 239 líneas. Confirmar con `wc -l` antes de commitear que no se infló |
| `rules/backend.md` § Migraciones | Los 4 índices están creados manualmente. NO mostrar scripts SQL en el commit (ya ejecutados) |
| Commit style | Inglés, español solo entre `"..."`, **NUNCA `Co-Authored-By`**, subject ≤ 72 chars |

## APRENDIZAJES TRANSFERIBLES (del chat anterior, sesión 2026-04-25)

1. **Lock del `.exe` durante build**: si el usuario tiene `dotnet run` o un debugger de VS corriendo, el build falla con `MSB3027` y `MSB3021` por intento de copiar `apphost.exe → Educa.API.exe`. Pedir explícitamente al usuario que pause antes de buildear. Esto NO es bug — el código compila igual, solo el step final de copy falla.

2. **Naming inconsistente del índice de ReporteUsuario**: el índice ya existente se llama `IX_REU_CorrelationId` (sin sufijo `_ReporteUsuario`). Los 2 índices nuevos del Chat 3 sí siguen el patrón `IX_<TablaName>_CorrelationId`. No consolidar — el existente quedó así.

3. **Tabla `REU_ReporteUsuario` (no `ReporteUsuario`)**: el modelo `ReporteUsuario.cs` usa `[Table("REU_ReporteUsuario")]`. El SELECT inicial fallaba si solo buscaba `'ReporteUsuario'`. El brief del Chat 3 (en el plan file) tenía esta inconsistencia y se descubrió en sesión.

4. **Ya existían 2 de los 4 índices** antes de este plan: `IX_ErrorLog_CorrelationId` y `IX_REU_CorrelationId`. El Chat 3 BE solo creó los otros 2 (`IX_RateLimitEvent_CorrelationId` + `IX_EmailOutbox_CorrelationId`). Documentar eso en el commit + plan file.

5. **Patrón Plan 30 Chat 4 establecido y seguido**:
   - `*SnapshotFactory.BuildEmpty(eco, generatedAt)` para fallback INV-S07.
   - `ApplicationDbContext` directo, sin repositorios separados (queries simples + secuenciales — DbContext no es thread-safe).
   - `[Authorize(Roles = Roles.Administrativos)]` a nivel clase del controller.
   - Tests authz por reflection sobre `AuthorizeAttribute` (mismo helper `GetAuthorizeAttribute()` + `AllowedRoles()`).

6. **Cap 100 filas por tabla en CorrelationService** (defensivo): un mismo CorrelationId raramente genera más de 1-3 filas, pero un id corrupto o cargado de retries podría inflar la respuesta. Cap fijo, no paginado. Truncado de campos libres a 200 chars.

7. **DNI ya enmascarado al insertar en `ErrorLog`** (lo hace `EmailFailureLogger`). Por eso la query del service NO vuelve a aplicar `DniHelper.Mask` sobre `ERL_UsuarioDni`. En cambio, `RateLimitEvent` y `ReporteUsuario` SÍ persisten DNI crudo, así que el service enmascara ANTES de devolver al admin.

8. **Plan 32 Chat 2 BE cerrado** previamente (commit `1ca1098`): `EmailOutbox.EO_CorrelationId` ya existe + el hook ya popula filas nuevas. Chat 3 BE puede consumir esa columna en la query de `EmailOutbox` sin pre-condiciones adicionales.

9. **Suite BE baseline al cierre del Chat 2**: 1379 verdes. Chat 3 BE agrega 17 (9 service + 8 controller). Esperado al final del Chat 3: **1396 verdes**.

10. **El brief asumía 1373 baseline**, pero al momento de validar Chat 3 ya estamos en 1379 (Chat 2 BE agregó 6). Recalcular: 1379 + 17 = 1396.

## FUERA DE ALCANCE

- **Chat 4 FE** (hub page + pill + wiring) es el chat siguiente, en `educa-web main`, brief separado.
- **Migrar `EmailFailureLogger.ExtractCorrelationId`** para usar `HttpContext.Items[CorrelationIdMiddleware.CorrelationIdItemKey]` en vez de leer `X-Correlation-Id` del request header — deuda detectada en Chat 2, sigue fuera de scope (chat dedicado).
- **Backfill histórico** de `EO_CorrelationId` — imposible (no se puede inventar el id), aceptado en `/design`.
- **Endpoint nuevo de listado admin del outbox** — `EmailOutboxListaDto.CorrelationId` ya se expone vía `EmailOutboxService.ListarAsync` desde Chat 2; Chat 4 FE lo consume directo.

## CRITERIOS DE CIERRE

- [ ] `git status` confirma los 9 archivos del Chat 3 BE en local (5 DTOs + interface + service + factory + controller + service.test + controller.test + DI).
- [ ] API local detenida; `dotnet build` limpio sin warnings nuevos.
- [ ] Filtro `Correlation` corre 17/17 verdes.
- [ ] Suite BE completa: **1396 verdes** (1379 baseline + 17 nuevos), 0 fallidos.
- [ ] Cap 300 respetado: `wc -l Services/Sistema/CorrelationService.cs` ≤ 300.
- [ ] 4 índices confirmados en BD (`SELECT` del Pre-work devuelve 4 filas).
- [ ] Commit en `Educa.API master` con el mensaje del bloque siguiente.
- [ ] Actualizar `correlation-id-links.md` (Chat 3 ✅ + sección "Resultado real" + commit hash).
- [ ] Actualizar `maestro.md` (fila Plan 32 a ~70% + nota nueva en bloque Notas).
- [ ] Commit FE docs en `educa-web main`.
- [ ] Mover este brief de `educa-web/.claude/chats/044-...md` a `educa-web/.claude/chats/closed/`.
- [ ] Decidir con el usuario: ¿generar brief 045 para Chat 4 FE inmediatamente, o esperar?

## COMMIT MESSAGE sugerido

Backend (`Educa.API master`):

```
feat(sistema): Plan 32 Chat 3 — correlation hub endpoint

GET /api/sistema/correlation/{id} aggregates the 4 telemetry
sources that share a CorrelationId (ErrorLog, RateLimitEvent,
"REU_ReporteUsuario", EmailOutbox) into a single snapshot for
the admin hub page (Plan 32 Chat 4 FE).

Architecture follows the Plan 30 canonical pattern:
ApplicationDbContext directly, sequential AsNoTracking queries
(DbContext is not thread-safe), each query wrapped in its own
try/catch returning an empty list on failure (INV-S07 per
table). A global try/catch around the snapshot build covers
edge cases via CorrelationSnapshotFactory.BuildEmpty.

Defensive caps: 100 rows per source, 200 chars on free-text
fields ("ERL_Mensaje", "EO_UltimoError", "REU_Descripcion",
"REU_Propuesta"). Email destinatario and DNIs masked before
leaving the service; "ERL_UsuarioDni" already comes masked
from EmailFailureLogger so it is not re-masked.

Controller validates the path id (non-empty + 64 char defensive
cap) before delegating; trims whitespace. Returns ApiResponse
of CorrelationSnapshotDto (INV-D08). [Authorize(Roles=
Administrativos)] mirrors the rest of the Sistema namespace.

DB indexes: 2 of 4 already existed (IX_ErrorLog_CorrelationId,
IX_REU_CorrelationId, both filtered IS NOT NULL). The other
two were created manually by the user during this chat:
IX_RateLimitEvent_CorrelationId and IX_EmailOutbox_CorrelationId
(same filtered IS NOT NULL pattern, low write cost, big help on
read latency once the tables grow).

17 new tests: 9 service (empty universe, full mix, id filter,
DNI mask, anonymous report INV-RU05, 100-row cap, disposed
context fallback, description truncate, ultimoError truncate)
+ 8 controller (authz reflection + 4 contract tests on path id).
Suite: 1396 BE green (baseline 1379 + 17 new).

CorrelationService.cs: 239 lines (cap 300 respected). All
sub-DTOs are flat — no nested objects in the snapshot.

Precondition of Plan 32 Chat 4 FE.
```

Reglas de commit respetadas:

- Inglés imperativo (`add`, no `added`).
- Español solo entre `"..."` (`"REU_ReporteUsuario"`, `"ERL_Mensaje"`, etc.).
- **Sin `Co-Authored-By`**.
- Subject `feat(sistema): Plan 32 Chat 3 — correlation hub endpoint` = 60 chars ≤ 72 ✅.

Frontend (`educa-web main`):

```
docs(plan): Plan 32 Chat 3 BE cerrado — correlation hub endpoint

Updates correlation-id-links.md (Chat 3 marked done with
commit hash + result table covering the 4 indexes status, file
count, defensive caps and test count) and maestro.md (Plan 32
row promoted to ~70% with Chat 3 closing note + new note at
the top of the Notas block summarizing the chat outcome).

Brief moved to .claude/chats/closed/044-plan-32-...md.

Backend commit: <hash> (Educa.API master). Suite 1396 BE green
(baseline 1379 + 17 new on Correlation tests).

Next: Chat 4 FE — hub page /intranet/admin/correlation/:id +
reusable pill + query param sync in 4 dashboards (error-logs,
rate-limit-events, feedback-reports, email-outbox).
```

Reglas: inglés, sin `Co-Authored-By`, subject 65 chars ≤ 72 ✅.

## CIERRE

Al cerrar el chat, pedirle al usuario feedback sobre:

1. **Commit hash del BE**: anotarlo en el commit FE (placeholder `<hash>`) y en el plan/maestro.
2. **Suite final exacta**: confirmar el número (esperado 1396; si llegan más tests por race con otros chats, ajustar).
3. **Generar brief 045 para Chat 4 FE inmediatamente**: el último chat grande del Plan 32 (cierra el plan al 100%). Es un chat extenso (~18-22 archivos FE) — recomendar abrirlo en una sesión limpia.
4. **¿Promover Plan 32 Chat 4 FE al top 3 del maestro**? Cola actual: (1) Plan 31 Chat 2 BE bloqueado, (2) Plan 30 FE Chat 3+4 combinados, (3) Plan 24 Chat 4 (B) BE+OPS. El Chat 4 FE de Plan 32 no necesita estar en top 3 si se ejecuta en cuanto Chat 3 BE cierre.
5. **Verificación post-deploy** (cuando se pushee): probar `GET /api/sistema/correlation/{id}` con un id real (lookup vía `SELECT ERL_CorrelationId FROM ErrorLog WHERE ERL_CorrelationId IS NOT NULL TOP 1`) y confirmar que las 4 secciones del response llegan con el shape esperado por Chat 4 FE.

Recordar al usuario: después de cerrar este chat, **mover el brief a `educa-web/.claude/chats/closed/`** y actualizar la cola top 3 del maestro si decide promover Chat 4 FE.
