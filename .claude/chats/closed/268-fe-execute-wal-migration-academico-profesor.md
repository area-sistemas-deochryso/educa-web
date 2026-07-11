# 268 · FE — Execute WAL migration: 6 mutaciones profesor (academico)

> **Branch**: `main`
> **Plan**: — (audit-driven, no plan file)
> **Creado**: 2026-05-29 · **Chat**: 2 (handoff from 267-audit) · **Estado**: shipped
> **Validación prod**: ⏳ pendiente desde 2026-05-29

> **Worktree**:
> - `exclusive`: true
> - `isolation`: worktree
> - `touches`: [`features/intranet/pages/profesor`]
> - `hot-paths`: [`features/intranet`]

---

## PLAN FILE

No hay plan file. El audit 267 descubrio las 6 mutaciones sin WAL en el modulo academico (zona profesor). El design completo esta en la seccion IMPLEMENTATION DETAIL de este brief.

The plan is for **intent + decisions only** — do not follow file paths or signatures from it as instructions. Investigate the current codebase.

## OBJETIVO

Migrar 6 mutaciones POST/PUT/DELETE en zona profesor a WAL (`WalFacadeHelper.execute()`). Elimina HTTP directo con `.subscribe()` en facades que deberian usar optimistic/server-confirmed.

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` -> `/validate` -> cierre.
Razon: design completo, patron WAL validado en decenas de facades, trabajo mecanico.

## PRE-WORK OBLIGATORIO

1. Leer `src/app/core/services/wal/wal-facade-helper.service.ts` — entender `execute()` API y `postReloadCommit$()`.
2. Leer `src/app/core/services/wal/models/wal.models.ts` — shape de `WalMutationConfig`.
3. Leer un ejemplo de facade que YA usa WAL con optimistic: `src/app/features/intranet/pages/profesor/classrooms/services/health-permissions.facade.ts` lineas 103-121 (`crearPermisoSalida`).
4. Leer un ejemplo de WAL con server-confirmed (si existe) o ver `wal-facade-helper.service.ts` lineas 156-173 (`executeServerConfirmed`).

## ALCANCE

### Archivos a modificar (4 facades + 1 store)

| Archivo | Mutaciones a migrar | Consistency |
|---|---|---|
| `pages/profesor/cursos/services/attendance-course.facade.ts` | `registrar()` (~L91-120) | `optimistic` |
| `pages/profesor/final-classrooms/services/profesor-final-salones.facade.ts` | `aprobarEstudiante()` (~L119-141), `aprobarMasivo()` (~L143-169) | `server-confirmed` |
| `pages/profesor/classrooms/services/health-permissions.facade.ts` | `anularPermisoSalida()` (~L123-134), `anularJustificacion()` (~L158-169) | `optimistic` |
| `pages/profesor/services/profesor.facade.ts` | `saveNotaSalon()` (~L143-167) | `optimistic` |
| `pages/profesor/classrooms/services/health-permissions.store.ts` | Agregar getters `getPermisoSalidaById()`, `getJustificacionById()` (para rollback) | — |

### Archivos que NO se tocan

- Componentes (`.component.ts`) — interfaz facade no cambia
- Templates (`.component.html`) — mismos signals
- API services (`*-api.service.ts`) — los `http$` se pasan como callbacks
- Stores (excepto health-permissions.store.ts para getters de rollback)

## IMPLEMENTATION DETAIL (ADR-0006)

### Mutation 1: `AttendanceCourseFacade.registrar()` -> WAL optimistic

**File**: `pages/profesor/cursos/services/attendance-course.facade.ts`

Cambios:
- Inyectar `WalFacadeHelper` y `WalCrossTabRefetchService` via `inject()`
- Agregar `private readonly apiUrl = \`\${environment.apiUrl}/api/AsistenciaCurso\``
- Import `environment` from `@config`
- Reemplazar `.subscribe()` por `wal.execute()`:
  - `operation: 'CREATE'`, `resourceType: 'asistenciaCurso'`
  - `endpoint: \`\${this.apiUrl}/horario/\${horarioId}/registrar\``
  - `method: 'POST'`, `payload: dto`
  - `http$: () => this.api.registrarAsistenciaCurso(horarioId, dto)`
  - `optimistic.apply()`: `this.store.setRegistroSaving(true)` (feedback visual inmediato)
  - `optimistic.rollback()`: `this.store.setRegistroSaving(false)`
  - `onCommit()`: `this.store.setRegistroSaving(false)` + toast success
  - `onError()`: toast error (rollback ya restaura saving=false)
- Agregar subscription a `postReloadCommit$('asistenciaCurso')` en constructor o init
- Remover `takeUntilDestroyed` de la mutation (WAL maneja lifecycle)
- Actualizar comentario L88 (ya dice "WAL" pero no lo implementaba)
- Remover `DestroyRef` SOLO si no lo usa ningun otro metodo — verificar antes. `loadRegistro` y `loadResumen` lo usan, asi que DestroyRef se queda.

### Mutation 2-3: `TeacherFinalClassroomsFacade.aprobarEstudiante/Masivo()` -> WAL server-confirmed

**File**: `pages/profesor/final-classrooms/services/profesor-final-salones.facade.ts`

Cambios:
- Inyectar `WalFacadeHelper` via `inject()`
- Import `WalFacadeHelper` from `@core/services`
- Import `environment` from `@config`
- **Remover ESLint disable comment** (lineas 1-6) — ya no aplica porque pasa por WAL
- Agregar `private readonly apiUrl = \`\${environment.apiUrl}/api/AprobacionEstudiante\``
- `aprobarEstudiante()`:
  - `operation: 'UPDATE'`, `resourceType: 'aprobacionEstudiante'`, `resourceId: dto.estudianteId`
  - `consistencyLevel: 'server-confirmed'` — NO optimistic block
  - `endpoint: this.apiUrl`, `method: 'POST'`, `payload: dto`
  - `http$: () => this.api.aprobarEstudiante(dto)`
  - `onCommit(ok)`: if ok -> `store.updateAprobacion()` + `refreshSalones()`; else -> toast error
  - `onError()`: toast error
  - Nota: `aprobarEstudiante` API devuelve `Observable<boolean>` (wrapped con catchError -> of(false)). El `http$` retorna boolean. `onCommit` recibe el boolean.
- `aprobarMasivo()`:
  - `operation: 'CREATE'`, `resourceType: 'aprobacionEstudiante'`
  - `consistencyLevel: 'server-confirmed'`
  - `endpoint: \`\${this.apiUrl}/masivo\``, `method: 'POST'`, `payload: dto`
  - `http$: () => this.api.aprobarMasivo(dto)`
  - Mantener `store.setAprobacionesLoading(true)` ANTES del `wal.execute()` call
  - `onCommit(resultado)`: if resultado -> toast success + `loadAprobaciones()` + `refreshSalones()`; else -> toast error. Siempre `setAprobacionesLoading(false)`.
  - `onError()`: toast error + `setAprobacionesLoading(false)`
- Agregar cross-tab refetch subscription para `aprobacionEstudiante` -> `loadAll()`

### Mutation 4-5: `HealthPermissionsFacade.anularPermisoSalida/Justificacion()` -> WAL optimistic

**File**: `pages/profesor/classrooms/services/health-permissions.facade.ts`

Cambios (WAL ya inyectado — `private wal = inject(WalFacadeHelper)`):
- `anularPermisoSalida(id)`:
  - Capturar permiso antes de borrar: `const cached = this.store.getPermisoSalidaById(id)`
  - `operation: 'DELETE'`, `resourceType: 'permisos-salud-salida'`, `resourceId: id`
  - `endpoint: \`\${this.apiUrl}/salida/\${id}\``, `method: 'DELETE'`
  - `http$: () => this.api.anularPermisoSalida(id)`
  - `optimistic.apply()`: `this.store.removePermisoSalida(id)` (item desaparece inmediatamente)
  - `optimistic.rollback()`: `if (cached) this.store.addPermisoSalida(cached)` (restaurar si falla)
  - `onCommit()`: log success
  - `onError()`: log error (rollback ya restauro el item)
- `anularJustificacion(id)`: mismo patron con `removeJustificacion`/`addJustificacion`
- Remover las `.subscribe()` chains de ambos metodos

**File**: `pages/profesor/classrooms/services/health-permissions.store.ts`
- Agregar: `getPermisoSalidaById(id: number)` — busca en la lista actual y devuelve el item (para cache pre-rollback)
- Agregar: `getJustificacionById(id: number)` — idem
- Verificar que `addPermisoSalida()` y `addJustificacion()` existen como metodos publicos del store (usados por el create que ya funciona con WAL). Si no, crearlos.

### Mutation 6: `ProfesorFacade.saveNotaSalon()` -> WAL optimistic

**File**: `pages/profesor/services/profesor.facade.ts`

Cambios:
- Inyectar `WalFacadeHelper` via `inject()`
- Import `WalFacadeHelper` from `@core/services`
- Import `environment` from `@config`
- Agregar `private readonly calificacionUrl = \`\${environment.apiUrl}/api/Calificacion\``
- Capturar nota previa: leer del store antes del apply (necesita getter — verificar si el store expone algo como `getNotaEstudiante(estudianteId, calificacionId)`)
- `saveNotaSalon()`:
  - La bifurcacion POST/DELETE se resuelve dentro de `http$`:
  - `operation: nota === null ? 'DELETE' : 'UPDATE'`
  - `resourceType: 'calificacionSalon'`, `resourceId: calificacionId`
  - `endpoint`: depende de nota — `\`\${calUrl}/\${calId}/calificar\`` o `\`\${calUrl}/\${calId}/estudiante/\${estId}\``
  - `method: nota === null ? 'DELETE' : 'POST'`
  - `http$: () => nota === null ? this.api.eliminarNotaEstudiante(...) : this.api.calificarLote(...)`
  - `optimistic.apply()`: `this.store.updateNotaEstudiante(estudianteId, calificacionId, nota)` (UI muestra nota inmediatamente)
  - `optimistic.rollback()`: `this.store.updateNotaEstudiante(estudianteId, calificacionId, previousNota)`
  - `onCommit()`: noop (optimistic ya actualizo)
  - `onError()`: toast error
- Si el store no expone getter para nota previa, agregar uno a `profesor.store.ts`

### Resource types registrados

| Resource type | Operaciones | Cross-tab refetch |
|---|---|---|
| `asistenciaCurso` | registrar | Si, reload registro |
| `aprobacionEstudiante` | aprobar, aprobarMasivo | Si, reload salones |
| `permisos-salud-salida` | crear (existente), anular (nuevo) | Ya existe |
| `permisos-salud-justificacion` | crear (existente), anular (nuevo) | Ya existe |
| `calificacionSalon` | saveNota | Si, reload notas |

### Architectural observations

- `WalFacadeHelper.execute()` es async void — no bloquea. Las facades lo invocan sin await.
- `consistencyLevel: 'server-confirmed'` bypasses WAL IndexedDB (no persiste offline). Solo da tracking + error handling unificado. Ver `wal-facade-helper.service.ts` L156-173.
- Las facades profesor estan todas en `providedIn: 'root'` — no tienen lifecycle scope. Las subscriptions de cross-tab refetch usan `DestroyRef` del facade (que para root services se destruye con la app).
- ESLint rule `wal/no-direct-mutation-subscribe` ya existe y detectara regresiones futuras.

## APRENDIZAJES TRANSFERIBLES

1. **Zona estudiante 100% limpia** — 7 paginas auditadas, 4 read-only + 3 con WAL correcto. No tocar.
2. **Zona profesor**: 5 de 8 paginas ya usan WAL correctamente. Solo 3 paginas con problemas (asistencia, final-salones, salones).
3. **`health-permissions.facade.ts` ya inyecta WAL** — no agregar import nuevo, solo usar `this.wal`.
4. **`attendance-course.facade.ts` tiene comentario L88 que dice "WAL" pero no lo implementa** — actualizar comentario o remover (el codigo se explica solo).
5. **ESLint disable en `profesor-final-salones.facade.ts` (L1-6)** — remover al migrar a WAL. La justificacion de invariantes sigue siendo valida, pero ahora se expresa via `consistencyLevel: 'server-confirmed'` que es la forma canonica.
6. **`aprobarEstudiante` API devuelve `Observable<boolean>`** (catchError -> of(false) en la API service). El `onCommit` recibe `boolean`, no void. Manejar el caso `false` como error funcional.
7. **`aprobarMasivo` API devuelve `Observable<BatchCommandResult | null>`** (catchError -> of(null)). Mismo patron: null = error funcional.

## FUERA DE ALCANCE

- Zona estudiante — ya limpia
- Zona admin — ya verificada OK en brief origen
- Sistema, comunicacion, seguimiento, inicio — ya verificados OK
- Level B/C improvements (podria ser mas rapido pero no bloquea)
- Nuevas features WAL — usar la infra existente tal cual

## TESTS MINIMOS

1. **Lint**: `npx ng lint` — sin errores nuevos. La rule `wal/no-direct-mutation-subscribe` NO deberia disparar en los archivos modificados.
2. **Build**: `npx ng build` — sin errores.
3. **Existing tests**: `npx vitest run` — sin regresiones.
4. **Manual** (si dev server disponible): navegar a `/intranet/profesor/asistencia`, registrar asistencia, verificar que el UI responde inmediatamente (optimistic).

## REGLAS OBLIGATORIAS

- `code-style.md`: `inject()` sobre constructores, `logger` no `console`, alias imports.
- `code-language.md`: variables en ingles, UI en espanol.
- WAL `endpointSuffix` siempre explicito (ver `feedback_wal_endpoint_suffix.md`).

## VALIDACION FINAL

```bash
npx ng lint
npx ng build --configuration=production
npx vitest run
```

## CRITERIOS DE CIERRE

- [ ] 6 mutaciones migradas a WAL.
- [ ] ESLint disable removido de `profesor-final-salones.facade.ts`.
- [ ] Lint + build + tests pasan.
- [ ] Brief movido `running/` -> `closed/`.
- [ ] Commit final unico.

## COMMIT MESSAGE sugerido

```
feat(wal): migrate 6 professor mutations to WAL optimistic/server-confirmed

Attendance registration, student approval (individual + batch),
health permission annulments, and salon grade save now use
WalFacadeHelper.execute() instead of direct HTTP subscribe.
```

## CIERRE

Confirmar que el lint rule `wal/no-direct-mutation-subscribe` no dispara en los archivos tocados. Preguntar al usuario si quiere smoke test manual.
