> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 28 · **Chat**: 2 · **Fase**: BE (modelo + dispatch + queries) · **Estado**: 🔒 **BLOQUEADO hasta validación del jefe del Plan 27 post-deploy**. Arrancar solo cuando el bloqueo se levante.

---

# Plan 28 Chat 2 — BE: `TipoPersona='A'` + dispatch polimórfico + queries extendidas

## PLAN FILE

`../../educa-web/.claude/plan/maestro.md` → sección **"🟢 Plan 28 — Inclusión de Asistentes Administrativos en reportes de profesores"** (Chat 1 ✅ cerrado 2026-04-22 con 8 decisiones). Ver especialmente:

- **Las 8 decisiones (Chat 1 cerrado 2026-04-22)** — bloque con las decisiones 2, 3, 6, 7 que este Chat 2 implementa.
- **Plan de ejecución post-Chat 1 (6 chats confirmados)** — fila "Chat 2 — BE: modelo + dispatch + queries".
- **Checklist pre-Chat 2 `/execute`** — prerrequisitos obligatorios antes de tocar código.
- **Invariantes a formalizar en Chat 5** — `INV-AD08` e `INV-AD09` (aunque se formalizan en Chat 5, este chat implementa su enforcement).

## OBJETIVO

Extender el modelo polimórfico `AsistenciaPersona` con `TipoPersona = 'A'` (Asistente Administrativo), ajustar el dispatch del webhook CrossChex al nuevo orden `Profesor → Director(rol=AA) → Estudiante → rechazar`, y actualizar las queries de asistencia (lectura admin + reportes) para contemplar `'A'`. El resultado habilita que las marcaciones biométricas hoy "rechazadas silenciosamente" de los 4 AAs empiecen a registrarse y aparecer en listados admin.

**Scope estricto**: BE modelo + dispatch + queries. NO tocar correos (Chat 3), NO tocar reportes PDF/Excel (Chat 3), NO tocar FE (Chat 4), NO formalizar invariantes en `business-rules.md` (Chat 5).

## PRE-WORK OBLIGATORIO

> **Nada de esto se salta.** Si el jefe aún no validó Plan 27 post-deploy, **detenerse** y esperar.

### 1. Confirmar desbloqueo

- [ ] Validación del jefe del Plan 27 post-deploy recibida (sin OK, Chat 2 no arranca)

### 2. Verificar estado de los 4 AAs en BD

Mostrar al usuario ANTES de codificar. Ejecutar `SELECT` sobre la BD de desarrollo:

```sql
-- Verifica los 4 AAs esperados activos con rol = 'Asistente Administrativo'
SELECT DIR_CodID, DIR_Nombres, DIR_Apellidos, DIR_Rol, DIR_Estado, DIR_DNI
FROM Director
WHERE DIR_Estado = 1 AND DIR_Rol = 'Asistente Administrativo'
ORDER BY DIR_CodID;
```

Esperado: 4 filas con DNIs válidos de:
- RICARDO REY YARUPAITA MALASQUEZ
- VIVIAN COLET CANCHARI RIVAS
- RAY ORTIZ PEREZ
- DIANA PATRICIA TUESTA MOYOHURA

**Si alguno tiene `DIR_DNI` NULL o 0**, pedir al usuario que cargue los DNIs ANTES de seguir.

### 3. Script de verificación cross-tabla DNI (CRÍTICO)

Un DNI activo no puede existir simultáneamente en `Estudiante + Profesor + Director`. Plan 21 Chat 1 validó E vs P (0 colisiones históricas). Este chat **extiende** la validación al 3er bucket (Director activo).

```sql
-- CROSS-TABLE DNI: verifica 0 colisiones entre los 3 buckets
WITH activos AS (
    SELECT EST_DNI AS DNI, 'Estudiante' AS origen, EST_CodID AS id
    FROM Estudiante WHERE EST_Estado = 1
    UNION ALL
    SELECT PRO_DNI AS DNI, 'Profesor' AS origen, PRO_CodID AS id
    FROM Profesor WHERE PRO_Estado = 1
    UNION ALL
    SELECT DIR_DNI AS DNI, 'Director_AA' AS origen, DIR_CodID AS id
    FROM Director WHERE DIR_Estado = 1 AND DIR_Rol = 'Asistente Administrativo'
)
SELECT DNI, COUNT(*) AS apariciones, STRING_AGG(origen, ', ') AS tablas
FROM activos
GROUP BY DNI
HAVING COUNT(*) > 1;
```

**Esperado**: 0 filas. Si devuelve filas, **detenerse** y reportar al usuario. Resolver antes de continuar.

### 4. Mostrar al usuario el script SQL de migración ANTES de ejecutar

Preparar pero NO ejecutar hasta que el usuario apruebe:

```sql
-- Plan 28 Chat 2 — 2026-04-XX — extender CHECK constraint de AsistenciaPersona
-- Permitir TipoPersona = 'A' (Asistente Administrativo, ver Plan 28 Chat 1 decisión 2).
-- Reversible: volver a CHECK ('E','P') deja los registros 'A' históricos en BD
-- (no se eliminan) pero las queries dejan de mostrarlos.

-- 1. Drop del CHECK actual (nombre exacto a verificar antes con sp_helpconstraint)
ALTER TABLE AsistenciaPersona
    DROP CONSTRAINT CK_AsistenciaPersona_TipoPersona;

-- 2. Re-crear con 'A' permitido
ALTER TABLE AsistenciaPersona
    ADD CONSTRAINT CK_AsistenciaPersona_TipoPersona
    CHECK (ASP_TipoPersona IN ('E', 'P', 'A'));
```

Confirmar nombre exacto del CHECK con:

```sql
SELECT name FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('AsistenciaPersona')
  AND name LIKE '%TipoPersona%';
```

Si el nombre difiere (ej: `CK__Asistencia__ASP_T__XXXX` auto-generado por SQL Server), ajustar el script.

## ALCANCE

### Archivos a crear/modificar

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `Educa.API/Constants/Asistencias/AsistenciaPersonaTipos.cs` (o donde viva la constante del tipo) | Agregar `public const string AsistenteAdmin = "A";` | +3 líneas |
| `Educa.API/Constants/Auth/Roles.cs` | Agregar `public static readonly string[] SupervisoresAsistenteAdmin = { Director, Promotor, CoordinadorAcademico };` | +5 líneas |
| `Educa.API/Repositories/Asistencias/AsistenciaRepository.cs` | Nuevo método `GetAsistenteAdminPorDniAsync(string dni) → Director?` que filtra `DIR_Estado=1 AND DIR_Rol = "Asistente Administrativo"`. `AsNoTracking()`. | +15 líneas |
| `Educa.API/Interfaces/IRepositories/Asistencias/IAsistenciaRepository.cs` | Declarar el nuevo método | +2 líneas |
| `Educa.API/Services/Asistencias/AsistenciaService.cs` → método `ClasificarYRegistrarMarcacionAsync` | Agregar 3er paso en dispatch: después de Profesor, antes de Estudiante, hacer lookup `GetAsistenteAdminPorDniAsync`. Si hit → registrar con `TipoPersona='A'` y `PersonaCodID = Director.DIR_CodID`. Mantener resto del flujo (validadores de coherencia, INV-C10, log enmascarado). | ~20 líneas netas de cambio |
| `Educa.API/Repositories/Asistencias/ConsultaAsistenciaRepository.cs` | Revisar las 6 queries existentes (ver lista más abajo) que filtran por `TipoPersona = 'P'` o hacen JOIN con `Profesor`. Agregar branches / UNION para contemplar `'A'` con JOIN a `Director`. | ~50-80 líneas de cambios (posible split si excede 300) |
| `Educa.API/Repositories/Asistencias/AsistenciaAdminQueryRepository.cs` | Mismo criterio: 2 queries de stats/listado (día estudiantes + estadísticas) profesores → agregar AA. | ~20-30 líneas |
| `Educa.API/Domain/Asistencia/EstadoAsistenciaCalculator.cs` | **Posiblemente ningún cambio**: el branch `'P'` aplica idéntico a `'A'` por decisión 6. Validar con test. Si el switch distingue `'E'` vs `'P'` explícitamente, agregar `'A'` al mismo arm que `'P'`. | 0-3 líneas |
| `Educa.API/Domain/Asistencia/CoherenciaHorariaValidator.cs` | Igual: guard INV-C10 (<05:00) aplica a `'A'` como a `'P'`; guard INV-C09 (<13:55) **NO aplica** (es `'E'`-only). Validar con test. | 0-3 líneas |
| `Educa.API.Tests/Services/Asistencias/AsistenciaServiceDispatchPlan28Tests.cs` | **NUEVO**. Tests del nuevo orden: DNI de profesor → clasificar como `'P'`; DNI de AA → `'A'`; DNI de estudiante → `'E'`; DNI no existente → rechazar. | ~120 líneas |
| `Educa.API.Tests/Repositories/Asistencias/AsistenciaRepositoryPlan28Tests.cs` | **NUEVO**. Tests de `GetAsistenteAdminPorDniAsync`: hit rol AA, miss rol Director (no-AA), miss soft-deleted (`DIR_Estado=0`). | ~80 líneas |
| `Educa.API.Tests/Repositories/Asistencias/ConsultaAsistenciaRepositoryPlan28Tests.cs` | **NUEVO**. Tests de inclusión de `'A'` en las queries modificadas. | ~100 líneas |

### Queries a revisar (tip: grep)

Antes de editar, ejecutar grep para localizar sites que filtran por `TipoPersona`:

```bash
grep -rn "TipoPersona" Educa.API/Repositories/
grep -rn "ASP_TipoPersona" Educa.API/Repositories/
grep -rn "JOIN Profesor" Educa.API/Repositories/Asistencias/
```

Las 6 queries principales de `ConsultaAsistenciaRepository` que Plan 21/23 tocó ya están identificadas en el maestro — revisarlas todas.

### Cap 300 líneas

Si `ConsultaAsistenciaRepository.cs` supera 300 líneas tras los cambios (probable), dividir en `ConsultaAsistenciaQueryRepository.cs` según el patrón de `backend.md` ("Patrón 3: Repository con queries complejas"). NO mezclar el split con los cambios funcionales en el mismo commit — split primero (mismo commit si se puede justificar, de otro modo commit separado).

## TESTS MÍNIMOS

### Dispatch (input → resultado esperado)

| DNI en BD activo | Resultado esperado |
|------------------|-------------------|
| Solo en `Profesor` (rol = profesor) | `TipoPersona='P'`, `PersonaCodID = PRO_CodID` |
| Solo en `Director` con `DIR_Rol = "Asistente Administrativo"` | `TipoPersona='A'`, `PersonaCodID = DIR_CodID` |
| Solo en `Director` con `DIR_Rol = "Director"` (no AA) | Rechazar (HTTP 200 silencioso, log `Information`) |
| Solo en `Estudiante` | `TipoPersona='E'`, `PersonaCodID = EST_CodID` |
| No existe en ninguna tabla activa | Rechazar (HTTP 200 silencioso) |
| DNI en `Profesor` inactivo (`PRO_Estado=0`) + en `Estudiante` activo | `TipoPersona='E'` (soft-deleted no hit) |

### Ventanas horarias — confirmar que `'A'` cae en branch `'P'`

| Input | Esperado |
|-------|----------|
| `TipoPersona='A'`, hora 07:20, periodo regular | Estado `A` (asistió a tiempo — mismo umbral que profesor 07:31) |
| `TipoPersona='A'`, hora 07:45, periodo regular | Estado `T` (tardanza — pasado 07:31) |
| `TipoPersona='A'`, hora 09:45, periodo regular | Estado `F` (falta — pasado 09:30) |
| `TipoPersona='A'`, hora 04:30, periodo regular | `IgnorarAntesDeApertura` (INV-C10 aplica) |
| `TipoPersona='A'`, hora salida 13:30, periodo regular | **Se registra salida** (INV-C09 NO aplica, es `'E'`-only) |

### Queries

- Query admin día estudiantes NO incluye AAs (filtro `TipoPersona='E'` o `'P'`, no `'A'`).
- Query admin día **profesores** → decidir en este chat si incluye AAs o no (afecta Chat 3 reportes). **Recomendación**: separar. Tab admin "Profesores" muestra solo `'P'`; tab separado (o agrupación) muestra `'A'`. Confirmar con usuario antes de codificar si hay duda.

## REGLAS OBLIGATORIAS

- **`business-rules.md §0`** — Núcleo el Salón. `'A'` NO tiene salón ni grado; las queries no pueden asumir JOIN con `Salon` o `Grado` cuando `TipoPersona='A'`. Filtrar antes.
- **`INV-D09`** — Queries sobre tablas de relación filtran `_Estado = true`. Aplica al lookup `Director` (filtrar `DIR_Estado = 1`).
- **`INV-C10`** — Entrada `<05:00` en periodo regular descarta silenciosamente (aplica a `'A'` igual que `'P'`).
- **`INV-C09`** — Salida `<13:55` descarta silenciosamente **solo si `TipoPersona='E'`**. `'A'` y `'P'` no tienen ventana mínima.
- **`INV-C11`** — Filtro `GRA_Orden >= 8` aplica **solo a `'E'`**. No toca `'A'`.
- **`INV-AD06`** — Un profesor no puede autojustificarse ni justificar colegas. Este chat no modifica AsistenciaAdminController (Chat 3), pero el principio queda documentado para Chat 5 que extiende a `INV-AD08` (AA no corrige AA).
- **Cap 300 líneas por archivo `.cs`** — dividir antes de mergear si se supera.
- **`AsNoTracking()`** en queries read-only.
- **Structured logging** — `_logger.LogInformation("Marcación AA registrada {DniMasked} → {DirId}", DniHelper.Mask(dni), dirId);`. NUNCA interpolation.
- **Logs de rechazos** — cuando el dispatch no encuentra el DNI, log `Information` con DNI enmascarado (Plan 21 ya lo hace; verificar que el nuevo 3er paso mantenga el patrón).
- **Fire-and-forget** — si se envía correo (NO debería en Chat 2, eso es Chat 3), nunca debe fallar la operación principal.
- **Corrección sistemática** — al tocar el dispatch, verificar que ningún otro site del código asuma `TipoPersona IN ('E','P')` exclusivo (ej: switch que no tiene default seguro).

## APRENDIZAJES TRANSFERIBLES (del Chat 1)

1. **Los 4 AAs ya marcan hoy en CrossChex** — esas marcaciones caen en el dispatch como rechazadas silenciosamente (HTTP 200 sin registro). Post-deploy de Chat 2, empiezan a registrarse. Puede haber un **primer día con volumen inusual** (16 marcaciones nuevas = 4 entradas + 4 salidas × 2 días si marcaron ayer). Sin impacto en techos SMTP (correos son Chat 3, fuera de scope aquí).
2. **Tabla `Director` tiene el campo rol embebido** — no hay tabla `Rol` separada (ver imagen de tabla mostrada al usuario en Chat 1: campo `DIR_Rol = "Asistente Administrativo"`). Lookup directo por `DIR_Rol = "Asistente Administrativo"`, sin JOIN adicional.
3. **Orden del dispatch cambia respecto al Plan 21** — Plan 21 cerró con `Profesor → Estudiante`. Plan 28 lo pasa a `Profesor → Director(AA) → Estudiante`. Esto **modifica** código estable del Plan 21 — documentar el cambio explícito en el commit message y flagear al reviewer.
4. **Constante `Roles.Administrativos` ya agrupa los 4 roles administrativos** (Director, Asistente Administrativo, Promotor, Coordinador Académico). El `SupervisoresAsistenteAdmin` nuevo es un subconjunto (excluye AA). No consolidar.
5. **`AsistenciaEmailDataRow` tiene `GraOrden`** (heredado de Plan 27 Chat 5c) — cuando `TipoPersona='A'`, `GraOrden` debe ser `null` (no aplica). Preservar INV-C11 para `'E'` y no forzar filtro para `'A'`.
6. **`PersonaAsistenciaContext`** (nombre a verificar con grep) puede requerir `TipoPersona='A'` — extender si aplica para propagar al email notifier (aunque correos son Chat 3, el contexto polimórfico es infra).
7. **`MarcacionAccion` enum** de `CoherenciaHorariaValidator` — probablemente no necesite nuevo miembro. `IgnorarAntesDeApertura` e `IgnorarSalidaTemprana` aplican por tipo persona ya.
8. **4 AAs × test matrix** — los tests de dispatch pueden usar DNIs de fixture constantes (ej: `TestConstants.DniAsistenteAdminRicardo`), no hardcoded. Verificar si ya hay fixture de Director en `Educa.API.Tests/Fixtures/`.

## FUERA DE ALCANCE

- **Correos diferenciados al AA** (INV-AD09) — Chat 3.
- **Reportes PDF/Excel** que incluyan AA — Chat 3.
- **Bandeja admin de correos** filtrando `TipoEntidadOrigen` — Chat 3.
- **Notificaciones admin** que amplían `rol = Profesor` a `{Profesor, AsistenteAdmin}` — Chat 3.
- **FE — badges, self-service generalizado, admin UI** — Chat 4.
- **`business-rules.md §15.9`** — `INV-AD08` e `INV-AD09` se formalizan en Chat 5, no aquí. Este chat solo implementa su enforcement (controller authz en Chat 3, dispatch aquí).
- **Extender scope a Promotor / Coord Académico / Director puro** — decisión 8 de Chat 1: SOLO rol "Asistente Administrativo".
- **Cambios en el FE o contratos DTOs** — Chat 4 decide si los DTOs de respuesta agregan campo `rolDetalle`. Este chat mantiene DTOs actuales.

## CRITERIOS DE CIERRE

```text
[ ] PRE-WORK 1: validación del jefe Plan 27 post-deploy confirmada (sin esto, NO arrancar)
[ ] PRE-WORK 2: SELECT confirma 4 AAs activos con DIR_DNI cargado
[ ] PRE-WORK 3: script cross-table DNI ejecutado → 0 colisiones
[ ] PRE-WORK 4: script SQL de migración CHECK mostrado al usuario y aprobado
[ ] Script SQL de migración ejecutado en BD de desarrollo (no producción aún)
[ ] Constante AsistenciaPersonaTipos.AsistenteAdmin = "A" agregada
[ ] Constante Roles.SupervisoresAsistenteAdmin = {Director, Promotor, Coord Académico} agregada
[ ] Lookup GetAsistenteAdminPorDniAsync implementado en AsistenciaRepository
[ ] Dispatch de AsistenciaService.ClasificarYRegistrarMarcacionAsync extendido en orden Profesor → Director(AA) → Estudiante → rechazar
[ ] 6 queries de ConsultaAsistenciaRepository revisadas + actualizadas (o confirmadas como no afectadas con comentario)
[ ] 2 queries de AsistenciaAdminQueryRepository revisadas
[ ] EstadoAsistenciaCalculator y CoherenciaHorariaValidator verificados (0-3 líneas cambiadas)
[ ] Tests nuevos: AsistenciaServiceDispatchPlan28Tests (dispatch 6 casos)
[ ] Tests nuevos: AsistenciaRepositoryPlan28Tests (lookup 3 casos — hit AA, miss no-AA, miss soft-deleted)
[ ] Tests nuevos: ConsultaAsistenciaRepositoryPlan28Tests (queries con 'A' presente)
[ ] Baseline BE de tests aumenta: 1167 → esperado ~1187-1200 (+20 tests)
[ ] Cap 300 líneas respetado en todos los archivos tocados
[ ] No se modificó business-rules.md (es Chat 5)
[ ] Commit BE con mensaje siguiendo reglas skill commit
[ ] Actualizar maestro.md sección Plan 28 → marcar Chat 2 como ✅ cerrado con fecha y resumen
[ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat
[ ] Generar prompt de Chat 3 con /next-chat (BE reportes + correos + bandeja + notificaciones)
```

## COMMIT MESSAGE sugerido

Un solo commit BE en `Educa.API` (branch `master`):

```
feat(asistencia): Plan 28 Chat 2 — add "TipoPersona='A'" for Asistente Admin
```

Body:

```
Add 3rd polymorphic type 'A' (Asistente Administrativo) to
"AsistenciaPersona". Extends Plan 21 dispatch with 3rd step:
Profesor → Director(rol=AA) → Estudiante → rechazar.

Changes:
- CHECK constraint: ('E','P') → ('E','P','A')
- new "GetAsistenteAdminPorDniAsync" on "IAsistenciaRepository"
  (filters DIR_Estado=1 AND DIR_Rol = "Asistente Administrativo")
- "AsistenciaService.ClasificarYRegistrarMarcacionAsync" reorders
  dispatch (order changes from Plan 21 per business-rules.md §7.1
  "menor a mayor volumen": Profesor → AA → Estudiante)
- 6 queries in "ConsultaAsistenciaRepository" + 2 in
  "AsistenciaAdminQueryRepository" updated to contemplate 'A'
- new "Roles.SupervisoresAsistenteAdmin" constant (subset of
  "Administrativos" used later by Chat 3 authz)
- "'A'" reuses profesor's branches for hour windows (INV-C10 applies,
  INV-C09 is 'E'-only; same calculator + validator)

Tests: +XX (dispatch, lookup, queries). Baseline 1167 → 11XX.

Plan 28 decisiones 2, 3, 6 implemented. Decisión 7 (INV-AD08 authz)
lands in Chat 3 controller. Correos, reportes and FE come in
Chats 3-4.

Refs: educa-web/.claude/plan/maestro.md — Plan 28 section.
```

**Reglas commit (`.claude/skills/commit/SKILL.md`)**:
- Inglés, modo imperativo (`add`, `extend`, no `added`/`extending`).
- Términos de dominio entre `"..."`: `"TipoPersona='A'"`, `"AsistenciaPersona"`, `"Asistente Administrativo"`, `"Roles.SupervisoresAsistenteAdmin"`.
- Subject ≤ 72 caracteres ✅.
- **NUNCA** agregar `Co-Authored-By:`.

## CIERRE

Feedback a pedir al usuario al cerrar el Chat 2:

1. **¿Las marcaciones de los 4 AAs empezaron a registrarse correctamente post-deploy?** (Verificar logs + 1 registro real en `AsistenciaPersona` con `TipoPersona='A'`).
2. **¿El cambio de orden del dispatch (respecto a Plan 21) generó algún issue con marcaciones de profesores?** (Monitorear 24h post-deploy).
3. **Si alguna query de reportes que Chat 3 tocará requiere campo adicional que Chat 2 debió exponer** (ej: `rolDetalle` en DTO, campo de proyección), anotarlo aquí para que Chat 3 no descubra a mitad de camino.
4. **¿Aparece algún AA adicional al que pre-work #2 no detectó?** (Cualquier cambio en la tabla `Director` rol AA post-migración debe re-verificarse cross-table DNI).
5. **¿Hay alguna decisión no obvia que Chat 3 deba conocer** (ej: split de query nueva, helper extraído, nombre de tabla particionado)? Documentarla en `APRENDIZAJES TRANSFERIBLES` del prompt de Chat 3.