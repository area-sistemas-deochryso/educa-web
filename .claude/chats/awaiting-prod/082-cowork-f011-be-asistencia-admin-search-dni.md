> **Repo destino**: BE (`Educa.API`, branch `master`).
> **Plan**: — (hallazgo Cowork pre-deploy 2026-04-29, no asociado a plan formal).
> **Creado**: 2026-04-30 · **Chat**: 1 · **Estado**: ✅ cerrado local 2026-04-30 (`Educa.API master`, commit `c4eb865`). Awaiting prod.
> **Origen**: `educa-web/.claude/claude-cowork/SETUP-COWORK.md` §7 F-011 (Alto).

---

# F-011 · Filtro `search` de `/asistencia-admin/dia` no busca por DNI

## OBJETIVO

Extender el predicado `search` de los listados admin de asistencia (estudiantes y profesores) para que también matchee por **DNI** (exacto y parcial) y por **nombre completo concatenado**. Hoy solo matchea sobre `Nombres` o `Apellidos` por separado, lo que rompe el deep-link "Editar en admin" desde la vista cross-role `/intranet/asistencia` → `/admin/asistencias?dni=...`.

Sin esto, el flujo principal de corrección administrativa (Director ve tardanza/falta en cross-role → click pencil → corrige en admin) muestra "No hay registros" aunque la fila exista.

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → cierre.

Razón: causa raíz aislada con líneas exactas (`AsistenciaAdminQueryRepository.cs:75` y `:156-157`). No hay diseño que decidir; es extender un predicado existente. Tests ya cubrirían el caso (agregar 3 nuevos).

## PRE-WORK OBLIGATORIO

- Leer `Educa.API/Repositories/Asistencias/AsistenciaAdminQueryRepository.cs` completo (entender ambos métodos `ListarEstudiantesDelDiaAsync` y `ListarProfesoresDelDiaAsync`).
- Confirmar shape del request: `Educa.API/Controllers/Asistencias/AsistenciaAdminController.cs` endpoint `GET /api/asistencia-admin/dia`.
- Revisar tests existentes del repo en `Educa.API.Tests/Repositories/Asistencias/` (si existen) para seguir el patrón.

## ALCANCE

| Archivo | Cambio | Líneas estimadas |
|---|---|---|
| `Educa.API/Repositories/Asistencias/AsistenciaAdminQueryRepository.cs:75` | Extender predicado estudiantes: agregar `EST_DNI.Contains(term)` y match concatenado `(EST_Nombres + " " + EST_Apellidos).Contains(term)` | +6 |
| `Educa.API/Repositories/Asistencias/AsistenciaAdminQueryRepository.cs:156-157` | Mismo predicado para profesores con `PRO_DNI` y concatenación | +6 |
| `Educa.API.Tests/Repositories/Asistencias/AsistenciaAdminQueryRepositoryTests.cs` (si existe; si no, crearlo) | 3 tests: search=DNI exacto / DNI parcial / "Nombres Apellidos" concatenado | +60 |

⚠️ **DNI encriptado**: según memoria del proyecto (`project_encrypted_fields_in_queries.md`), `EST_DNI` y `PRO_DNI` son AES-256 binario. Antes de escribir el predicado, **verificar en SSMS** si la columna se filtra por valor encriptado o por hash. Si es por hash o columna shadow, usar el campo correcto.

Si `EST_DNI`/`PRO_DNI` están encriptadas y NO existe columna de búsqueda derivada, el alcance cambia: **escalar a `/ask`** y proponer alternativas (índice de hash determinista, columna `*_DniBusqueda` plain, o restringir el search por DNI a un hash exacto sin `Contains`).

## TESTS MÍNIMOS

| Input | Resultado esperado |
|---|---|
| `GET /asistencia-admin/dia?fecha=2026-04-29&tipoPersona=P&search=76357038` | Devuelve la fila del profesor RAMIREZ (1 registro). |
| `GET ...&search=763` | Devuelve la fila de RAMIREZ (DNI parcial). |
| `GET ...&search=ramirez bernardo` | Devuelve la fila aunque el orden no matchee `Nombres + Apellidos` exacto (probar concatenación). |
| `GET ...&search=RAMIREZ` (existente) | Sigue devolviendo 1 (regresión del comportamiento previo). |
| `GET ...&search=ramirez` (existente, lower) | Sigue devolviendo 1 (case-insensitive). |

## REGLAS OBLIGATORIAS

- `rules/backend.md` — **300 líneas duras** por archivo `.cs`. Si tras el cambio el repo supera, dividir según la guía (probable: `AsistenciaAdminQueryRepository.cs` ya es candidato a partirse en `*StudentQueries.cs` + `*TeacherQueries.cs`). Validar el conteo antes de cerrar.
- `rules/backend.md` — `AsNoTracking()` obligatorio en queries read-only (mantener si ya está).
- `rules/backend.md` — Repository solo queries, sin lógica de negocio.
- `rules/business-rules.md` INV-D09 — Filtros sobre tablas con `_Estado` deben respetar el soft-delete actual. No tocar la lógica de `_Estado`.
- `rules/business-rules.md` INV-C11 — Estudiantes con `GRA_Orden < 8` siguen excluidos del listado del día. El nuevo predicado de DNI **no** debe abrir un bypass al filtro temporal. Verificar que el `WHERE` del filtro INV-C11 sigue antes/junto con el predicado de search.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

- **Cowork ya verificó la causa raíz por curl**: search por nombre funciona case-insensitive (`RAMIREZ` y `ramirez`), pero search por DNI (exacto o parcial) devuelve 0. La discrepancia es del predicado, no del case-folding.
- **F-010 depende de este fix**: el deep-link cross-role → admin pasa `?dni=...&fecha=...&tipoPersona=...`. Hasta que `search` matchee DNI, el dialog no se podría auto-abrir aunque se implementara F-010.
- **Patrón roto consistente en estudiantes y profesores**: ambos métodos del repo tienen el mismo bug. Aplicar la corrección sistemática (regla de `backend.md`) — grep por `.Contains(term)` en el resto del backend para detectar el patrón en otros listados (`UsuariosRepository`, `ConsultaAsistenciaRepository`, etc.).
- **Credenciales test**: DNI `74125896` / pwd `12349898` / rol Director. Caso vivo verificado: profesor RAMIREZ BERNARDO JOSE DANIEL DNI `76357038`, fecha `2026-04-29`, salón 5to Primaria A, entrada 07:32.
- **Endpoint exacto**: `GET /api/asistencia-admin/dia?fecha={iso}&tipoPersona={E|P}&search={term}` (kebab-case en BE, según override de Cowork).

## FUERA DE ALCANCE

- F-003 (SignalR `/asistenciahub` 404) — distinta capa, distinto mecanismo, abrir brief separado si el usuario lo pide.
- F-010 (deep-link auto-abrir dialog) — FE, depende de este fix; abrir brief FE después de validar este.
- Refactor general de búsqueda en otros repositorios (`UsuariosRepository`, `ConsultaAsistenciaRepository`) — listar como red flag pero no tocar en este chat. Si se ve el mismo patrón roto, dejar nota en `tasks/`.
- División de `AsistenciaAdminQueryRepository.cs` en sub-archivos — solo si tras el cambio supera 300 líneas. Si ya está cerca del límite, dividir en commit aparte.

## VALIDACIÓN FINAL

```bash
cd ../Educa.API/Educa.API
dotnet build                                                    # 0 warnings nuevos
dotnet test --filter "AsistenciaAdminQueryRepository"           # tests nuevos verdes + regresión
```

Manual (con backend local en `https://localhost:7102`):

1. Login Director (`74125896` / `12349898`).
2. `curl -k "https://localhost:7102/api/asistencia-admin/dia?fecha=2026-04-29&tipoPersona=P&search=76357038"` → debe devolver 1 fila (RAMIREZ).
3. Mismo con `search=763` → 1 fila.
4. Mismo con `search=ramirez` → 1 fila (regresión).
5. Smoke navegador: `/intranet/asistencia` → tab Profesores → click pencil RAMIREZ → la vista admin debe mostrar la fila (no "No hay registros").

## CRITERIOS DE CIERRE

- [ ] `dotnet build` y `dotnet test` verdes.
- [ ] 3 tests nuevos en `AsistenciaAdminQueryRepositoryTests.cs`.
- [ ] Smoke manual del deep-link cross-role → admin pasa.
- [ ] Archivos repo siguen ≤ 300 líneas (regla dura backend.md). Si no, dividir en commit aparte.
- [ ] Brief movido `running/` → `awaiting-prod/` (espera smoke prod por el usuario).
- [ ] Maestro: agregar entrada bajo "Hallazgos Cowork pre-deploy 2026-04-29" si no existe esa sección.
- [ ] Commit final único: código + tests + move del brief + nota en `claude-cowork/SETUP-COWORK.md` §8 Hallazgos verificados (cuando se verifique post-deploy).

## COMMIT MESSAGE sugerido

```
fix(asistencia-admin): include DNI and full name in /dia search predicate

The search filter only matched against Nombres or Apellidos separately,
breaking the cross-role deep link to admin (?dni=...) and forcing manual
re-search by name. Extends both student and teacher list queries to also
match against DNI (exact and partial) and the concatenated full name.
```

(Ver `~/.claude/rules/commit-style.md` — sin `Co-Authored-By`, subject ≤ 72.)

## CIERRE

Pedir al usuario:

1. Confirmar smoke en producción tras el deploy: cross-role → click pencil profesor → admin muestra la fila.
2. Si DNI estaba encriptado y hubo que escalar, validar que la decisión adoptada (hash, columna plain, o restricción) cumple con la auditoría de seguridad del proyecto.
3. Mover el hallazgo F-011 desde §7 a §8 ("Hallazgos verificados") en `claude-cowork/SETUP-COWORK.md` con hash del commit.
