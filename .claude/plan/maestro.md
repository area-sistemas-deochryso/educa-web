# Plan Maestro — Orden y Dependencias

> **Fecha**: 2026-04-14
> **Objetivo**: Ordenar los 11 planes dispersos entre `educa-web/.claude/` y `Educa.API/.claude/` en una secuencia con dependencias explícitas.
> **Principio rector** (actualizado 2026-04-16): "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real. La deuda técnica se paga en paralelo, no como prerrequisito."

---

## Inventario de planes (11)

| # | Plan | Repo | Ruta | Estado | % |
|---|------|------|------|--------|---|
| 1 | Enforcement de Reglas | FE | [tasks/enforcement-reglas.md](../tasks/enforcement-reglas.md) | F1-F3 ✅ · F4 parcial ✅ (F4.4-F4.5 🔒) · F5 ⏳ | ~75% |
| 2 | Arquitectura Backend — Opciones A/B/C | BE | [Educa.API/.claude/plan/arquitectura-backend-opciones.md](../../../Educa.API/.claude/plan/arquitectura-backend-opciones.md) | A ✅ · B 🔄 (5/8) · C ⏳ | ~33% |
| 3 | Domain Layer (Opción A) | BE | [Educa.API/.claude/plan/domain-layer.md](../../../Educa.API/.claude/plan/domain-layer.md) | Fases 1-3,5-6 ✅ · F4 🔒 (bloqueada por Matrícula) | ~85% |
| 4 | Consolidación Backend | FE | [plan/consolidacion-backend.md](consolidacion-backend.md) | ⏳ | 0% |
| 5 | Consolidación Frontend | FE | [plan/consolidacion-frontend.md](consolidacion-frontend.md) | ⏳ | 0% |
| 6 | Asignación Profesor-Salón-Curso | BE+FE | [Educa.API/.claude/plan/asignacion-profesor-salon-curso.md](../../../Educa.API/.claude/plan/asignacion-profesor-salon-curso.md) | ✅ F0-F6 cerrado | 100% |
| 7 | Error Trace Backend | BE | [Educa.API/.claude/plan/error-trace-backend.md](../../../Educa.API/.claude/plan/error-trace-backend.md) | ⏳ | 0% |
| 8 | Design Patterns Backend | FE | [tasks/design-patterns-backend.md](../tasks/design-patterns-backend.md) | Incremental | N/A |
| 9 | Design Patterns Frontend | FE | [tasks/design-patterns-frontend.md](../tasks/design-patterns-frontend.md) | Incremental | N/A |
| 10 | Flujos Alternos (resiliencia) | FE | [plan/flujos-alternos.md](flujos-alternos.md) | ⏳ (bloqueado) | 0% |
| 11 | Refactor `eslint.config.js` (fix G10) | FE | [plan/eslint-config-refactor.md](eslint-config-refactor.md) | ✅ F1-F5 (F5.3 tests opcionales sin ejecutar) | ~95% |

**Resumen por carril**: Carril A (features) ~80% · Carril B (deuda) ~50% · Carril C (diferido) 0%
**Total consolidado**: **~45-50%** del plan maestro terminado.

---

## Bloqueos activos (qué desbloquea qué)

> Lectura rápida para elegir próximo chat. Complementa al diagrama de dependencias.

| Si cierro… | Desbloqueo… | Por qué |
|------------|-------------|---------|
| ~~QW3 (specs rotos)~~ | ~~CI verde → F4.6 efectivo~~ | ✅ Cerrado 2026-04-16 |
| Plan 6 F1 (BD ProfesorCurso) | Plan 6 F2+F3 (Domain + Services) | Tabla nueva necesaria para todo lo demás |
| ~~Plan 6 F3 (BE services)~~ | ~~Plan 6 F4 (Frontend)~~ | ✅ Cerrado 2026-04-16 |
| Plan 2/B (3 state machines) | Plan 1 F4.4 (INV-T*) + integración Plan 6 en HorarioStateMachine | Transiciones formales, no bloqueante para Plan 6 core |
| Plan 3 F4 (Matrícula) | Plan 1 F4.5 (INV-M*) | Feature independiente, no bloquea asignación |
| Capas 1-4 cerradas | Plan 10 (Flujos Alternos) | Requisito explícito: "proyecto limpio" |

**Próximo tramo ejecutable — FEATURES FIRST**:

1. ~~**QW3**~~ ✅ (2026-04-16) — CI verde, 0 fallos.
2. ~~**Plan 6 F1**~~ ✅ (2026-04-16) — BD: tabla `ProfesorCurso` + migración + modelo EF.
3. ~~**Plan 6 F2**~~ ✅ (2026-04-16) — Domain validators: 4 archivos + 42 tests. Build OK.
4. ~~**Plan 6 F3**~~ ✅ (2026-04-16) — BE Services: 7 archivos nuevos + 9 modificados. 741 tests OK.
5. ~~**Plan 6 F4**~~ ✅ (2026-04-16) — Frontend: tipos + badges + cursos que dicta en usuarios. 25 archivos, commit `11c1658`.
6. ~~**Plan 6 F5**~~ ✅ (2026-04-16) — Auditoría SQL: 0 violaciones INV-AS01/AS02 en ambas BDs.
7. ~~**Plan 6 F6**~~ ✅ (2026-04-16) — Tests facade (4 nuevos) + invariantes formalizados + error codes mapeados. **Plan 6 CERRADO.**

**En paralelo (deuda técnica, cuando haya bandwidth)**:
- Plan 1 F5.3 (re-exports cleanup, 48 archivos)
- Plan 2/B (state machines restantes)
- Plan 2/C (split archivos >300 líneas BE)

**Bloqueos duros (no ejecutables sin dependencia previa)**:
- Plan 3 F4 🔒 por feature Matrícula (diseño admin UI pendiente)
- Plan 10 🔒 hasta que Capas 1-4 cierren

---

## Secuencia ordenada (3 carriles)

> Reorganizado 2026-04-16: features primero. La arquitectura limpia es un medio, no un fin.

### Carril A — Features (prioridad máxima)

> "Si no hay feature nueva, no hay valor entregado."

- **Plan 6** — Asignación Profesor-Salón-Curso (tutor pleno vs por curso)
  - **Dependencia real**: ninguna dura. La tabla `ProfesorCurso` y los validators son código nuevo que no colisiona con nada existente.
  - **Integración opcional**: Plan 2/B7 (`HorarioStateMachine.→ACTIVO`) puede invocar los validators, pero Plan 6 funciona sin state machine formal — basta con la validación en `HorarioService`.

**Análisis de dependencias de Plan 6**:

| Plan 6 necesita de… | ¿Bloquea? | Razón |
|----------------------|-----------|-------|
| Plan 3 (Domain Layer) | **No** | Plan 6 crea validators nuevos en `Domain/Academico/`, no modifica los existentes |
| Plan 2/B (State Machines) | **No** | La validación se integra en `HorarioService.Crear/Actualizar` directamente, no necesita `HorarioStateMachine` |
| Plan 1 (Enforcement) | **No** | El código nuevo seguirá las reglas ya enforced (capas, imports, etc.) |
| Plan 4/5 (Consolidación) | **No** | Plan 6 crea nuevos archivos, no refactoriza existentes |
| QW3 (CI verde) | **Sí** | CI debe estar verde para detectar regresiones al mergear |

### Carril B — Deuda técnica (en paralelo, cuando haya bandwidth)

> "La deuda se paga mientras se construye, no antes."

- **Plan 1 F5** — Wrappers exclusivos (re-exports cleanup)
- **Plan 2/B** — State Machines (3 faltantes)
- **Plan 2/C** — Split archivos >300 líneas BE
- **Plan 4** — Consolidación Backend
- **Plan 5** — Consolidación Frontend
- **Plan 7** — Error Trace Backend

Estos se ejecutan en chats disponibles entre fases del Carril A, o cuando el Carril A espera feedback/decisiones del negocio.

### Carril C — Diferido (bloqueado o bajo prioridad)

- **Plan 3 F4** — Matrícula (🔒 diseño admin UI pendiente)
- **Plan 10** — Flujos Alternos (🔒 proyecto limpio)
- **Planes 8-9** — Design Patterns (incrementales al tocar módulos)

---

## Diagrama de dependencias (actualizado)

```
CARRIL A — FEATURES (prioridad)

   QW3 (CI verde) ──► Plan 6 F1 (BD) ──► Plan 6 F2 (Domain) ──► Plan 6 F3 (BE Services)
                                                                        │
                                                                        ▼
                                                                  Plan 6 F4 (Frontend)
                                                                        │
                                                                        ▼
                                                                  Plan 6 F5-F6 (Tests + Audit)

CARRIL B — DEUDA TÉCNICA (paralelo)

   Plan 1 F5 (re-exports) ── sin bloqueos, ejecutar cuando haya bandwidth
   Plan 2/B (State Machines) ── desbloquea Plan 1 F4.4 (tests INV-T*)
   Plan 2/C (Split BE) ── sin bloqueos
   Plan 4 (Consolidación BE) ── tras Plan 2/B+C, consume validadores de Plan 6
   Plan 5 (Consolidación FE) ── tras Plan 4 + Plan 6 F4
   Plan 7 (Error Trace) ── paralelo a todo

CARRIL C — DIFERIDO

   Plan 3 F4 (Matrícula) 🔒 ── espera diseño admin UI
   Plan 10 (Flujos Alternos) 🔒 ── espera carriles A+B cerrados
```

---

## Cómo usar este maestro

1. **Al empezar sesión**: revisar el estado de cada plan en la tabla de inventario.
2. **Al elegir trabajo**: respetar las capas. No saltar a Capa 3 si Capa 2 no cerró sus piezas bloqueantes.
3. **Al agregar un plan nuevo**: encajarlo en la capa que le corresponda y declarar sus dependencias explícitas al inicio del archivo (siguiendo el patrón `Coordinación cross-plan:` ya existente).
4. **Al actualizar progreso**: marcar estado (⏳ / 🔄 / ✅ / 🔒) en la tabla de inventario de este archivo.

---

## Checklist ejecutable (tareas chat-sized)

> **Instrucciones para el chat que ejecute cualquier subfase de esta checklist** (aplican siempre, no hace falta repetirlas en el prompt):
>
> 1. Trabajar **una sola subfase por chat**. Si al abrirla se ve que excede el tamaño (≤10 archivos editados, ≤15 mensajes), cortarla y crear sub-bullet nuevo antes de ejecutar.
> 2. Al terminar el trabajo técnico, **antes de dar el cierre**:
>    - Actualizar el **plan base** (el `.md` original referenciado en la tabla de inventario) con el avance/resultado/decisiones tomadas.
>    - Actualizar en este maestro: marcar la subfase ✅ en la checklist y reflejar el nuevo estado en la tabla de inventario.
> 3. Una subfase **no se considera terminada** si falta cualquiera de los dos updates anteriores, aunque el código ya esté commiteado.
> 4. Si se descubren dependencias o bloqueos no previstos, agregarlos como sub-bullet en la misma subfase en lugar de saltar a otra.

---

### Carril A — Features (PRIORIDAD)

#### QW3 — CI verde (prerrequisito para mergear features)

- [x] QW3.1 `horarios.store.spec.ts` (26 fallos) — métodos renombrados en store ✅ (2026-04-16)
- [x] QW3.2 `error.interceptor.spec.ts` (13 fallos) — mocks desactualizados ✅ (2026-04-16)
- [x] QW3.3-QW3.6 Facades + login (6 fallos) — WAL pattern + role count ✅ (2026-04-16)
- [x] QW3.7 Verificar `npm test` con 0 fallos ✅ (2026-04-16) — 108 files, 1317 tests passed

#### Plan 6 — Asignación Profesor-Salón-Curso (tutor pleno vs por curso)

- [x] **F1 — BD** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F1.0 SELECT primero: inspeccionada estructura real de 6 tablas en prueba y producción
  - [x] F1.1 CREATE TABLE ProfesorCurso + 3 índices (único filtrado + 2 de consulta) — ejecutado en ambas BDs
  - [x] F1.2 Migración desde Horario: prueba 3 filas, producción 0 filas (sin horarios activos GRA_Orden ≥ 8)
  - [x] F1.3 Modelo EF (`ProfesorCurso.cs`) + `ProfesorCursoConfiguration.cs` + DbSet + nav properties en Profesor/Curso. Build OK.
  - [x] F1.4 Plan base y maestro actualizados

- [x] **F2 — Domain validators** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F2.1 `ModoAsignacionResolver` — función pura con umbral 7, sección V flexible
  - [x] F2.2 `TutorPlenoValidator` (INV-AS01) — Validar + Ensure con BusinessRuleException
  - [x] F2.3 `ProfesorCursoValidator` (INV-AS02) — Validar + Ensure con BusinessRuleException
  - [x] F2.4 Tests unitarios — 42 tests pasando (3 archivos)
  - [x] F2.5 Plan base + maestro actualizados

- [x] **F3 — Backend Services** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F3.1 `ProfesorCursoService` + `ProfesorCursoRepository` + DTOs (CRUD estándar)
  - [x] F3.2 `ProfesorCursoController` — 4 endpoints (GET profesor, GET curso, POST asignar, DELETE)
  - [x] F3.3 Integrar validators en `HorarioAsignacionService.AsignarProfesorAsync` + `HorarioService.UpdateAsync`
  - [x] F3.4 Regla desactivación tutor mid-año en `ProfesorStrategy.CambiarEstadoAsync`
  - [x] F3.5 Regla eliminar salón tutor pleno con horarios activos en `SalonesService.EliminarAsync`
  - [x] F3.6 DI registration + build OK + 741 tests OK
  - [x] F3.7 Plan base + maestro actualizados

- [x] **F4 — Frontend: horarios + salones + usuarios** (3 chats, repo FE) ✅ (2026-04-16)
  - [x] F4.1 Tipos: `ModoAsignacion` + `resolveModoAsignacion()` en `@data/models/classroom.models.ts`, `ProfesorCursoListaDto` en `profesor-curso.models.ts` ✅ (2026-04-16)
  - [x] F4.2 `modoAsignacion` computed en `SchedulesOptionsStore` + `profesoresParaAsignacion` filtrado por modo + `ProfesorCursoApiService` ✅ (2026-04-16)
  - [x] F4.3 Detail drawer: badge de modo + info contextual (tag Tutor/PorCurso/Flexible con tooltip) ✅ (2026-04-16)
  - [x] F4.4 Badge de modo en tabla de salones admin + `SalonDetailDialog` header ✅ (2026-04-16)
  - [x] F4.5 Sección "Cursos que dicta" en edición de profesor (`/admin/usuarios`) ✅ (2026-04-16)
  - [x] F4.6 Actualizar plan base + maestro ✅ (2026-04-16)

- [x] **F5 — Backfill y auditoría** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F5.1 Query SQL de violaciones existentes INV-AS01/AS02 — ejecutadas en ambas BDs
  - [x] F5.2 Resultado: **0 violaciones** en test y producción. No hay grandfathering que gestionar.
  - [x] F5.3 Actualizar plan base + maestro ✅

- [x] **F6 — Tests E2E + cierre** (1 chat) ✅ (2026-04-16)
  - [x] F6.1 Tests facade FE: 4 tests (INV-AS01 reject, INV-AS02 reject, tutor pleno OK, por curso OK). Suite: 1321 tests, 0 fallos.
  - [x] F6.2 Formalizar INV-AS01/02/03/04/05 en `business-rules.md § 15.12` + actualizar § 5.4 (umbrales corregidos, estado implementado)
  - [x] F6.3 Mapear 4 error codes nuevos en `UI_ERROR_CODES`
  - [x] F6.4 Actualizar plan base + maestro ✅

---

### Carril B — Deuda técnica (en paralelo)

> Estas tareas se ejecutan cuando hay bandwidth entre fases del Carril A, o cuando el Carril A espera feedback/decisiones del negocio.

#### Plan 11 — Refactor `eslint.config.js` ✅ (~95%)

<details><summary>Detalle (cerrado)</summary>

- [x] F1-F4 cerrados
- [x] F5.1-F5.2 cerrados, F5.4 cerrado
- [ ] F5.3 Tests de guardia (opcional)

</details>

#### Plan 1 — Enforcement de Reglas (~75%)

<details><summary>F3 — Lint de capas ✅ (cerrado)</summary>

- [x] F3.1-F3.6 cerrados (2026-04-14 a 2026-04-15). Detalle en [enforcement-reglas.md](../tasks/enforcement-reglas.md).

</details>

<details><summary>F4 — Tests de invariantes (parcial ✅)</summary>

- [x] F4.1 Catálogo (2026-04-15)
- [x] F4.2 Suite Cálculo FE — 35 tests (2026-04-16)
- [x] F4.3 Suite Seguridad FE — 25 tests (2026-04-16)
- [ ] F4.4 Suite Transiciones 🔒 Plan 2/B
- [ ] F4.5 Suite Vacacional/Matrícula 🔒 Plan 2/B + Plan 3 F4
- [x] F4.6 CI gate (2026-04-16) — rojo hasta QW3
- [x] F4.7 Actualizar plan base + maestro

</details>

- [ ] **F5 — Wrappers exclusivos**
  - [x] F5.1-F5.2 cerrados (0 violaciones)
  - [ ] F5.3 Re-exports `@shared` → `@intranet-shared` (48 archivos, 3-4 chats)
  - [ ] F5.4 Actualizar plan base + maestro

#### Plan 2 — Arquitectura Backend B/C

- [ ] **Opción B — State Machines (3 faltantes)** — desbloquea Plan 1 F4.4
  - [ ] B.1-B.6 (ver plan base)

- [ ] **Opción C — Split archivos >300 líneas BE**
  - [ ] C.1-C.6 (ver plan base)

#### Plan 4 — Consolidación Backend (tras Plan 2 + Plan 6 F5)

- [ ] F1-F6 (ver plan base)

#### Plan 5 — Consolidación Frontend (tras Plan 4 + Plan 6 F4)

- [ ] F1-F6 (ver plan base)

#### Plan 7 — Error Trace Backend (paralelo a todo)

- [ ] F1-F6 (ver plan base)

---

### Carril C — Diferido

#### Plan 3 F4 — Matrícula 🔒

- [ ] Espera diseño admin UI + service layer

#### Plan 10 — Flujos Alternos 🔒

- [ ] Espera carriles A+B sustancialmente cerrados

#### Planes 8-9 — Design Patterns

- [ ] Incrementales al tocar cada módulo

---

## Quick wins cerrados

- [x] **QW1 — Migrar `health-permissions` a WAL** ✅ (2026-04-15)
- [x] **QW2 — Limpiar ruido de lint en build artifacts** ✅ (2026-04-15)
- [x] **QW3 — CI verde** ✅ (2026-04-16) — 6 spec files fixed (40 fallos → 0). 108 files, 1317 tests.

---

## Deuda estructural diferida (chat dedicado)

- [ ] **DS1 — Split estructural de `wal-sync-engine.service.ts`** — ver [tasks/wal-sync-engine-split.md](../tasks/wal-sync-engine-split.md)
  - **Origen**: F3.5.B (2026-04-15). Archivo en 303 líneas efectivas (límite 300). Fix temporal con `eslint-disable max-lines` justificado en el encabezado del archivo. No es quick-win: requiere entender el loop del engine + tests mínimos previos + extracción cohesiva (candidato principal: Error Handling como helper puro).
  - **Por qué diferido**: preexistente al F3.5.B, no bloquea ninguna tarea activa, y el escape hatch honesto es preferible a un refactor cosmético que colapse comentarios para pasar el umbral sin resolver el fondo.

---

## Notas de ubicación

- Planes en `educa-web/.claude/plan/` son los de **alcance amplio** (incluyen refs cruzadas al backend).
- Planes en `educa-web/.claude/tasks/` son **transversales al proyecto** pero con granularidad de tarea (enforcement, design patterns).
- Planes en `Educa.API/.claude/plan/` son **exclusivos del backend**.
- Este maestro vive en `educa-web/.claude/plan/maestro.md` porque es el punto donde convergen más referencias cross-repo.
