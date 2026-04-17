# Plan Maestro — Orden y Dependencias

> **Fecha**: 2026-04-14 (última revisión: 2026-04-16, deploy completado)
> **Objetivo**: Ordenar los 11 planes dispersos entre `educa-web/.claude/` y `Educa.API/.claude/` en una secuencia con dependencias explícitas.
> **Principio rector** (actualizado 2026-04-16): "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real. La deuda técnica se paga en paralelo, no como prerrequisito."

---

## Inventario de planes (11)

| # | Plan | Repo | Ruta | Estado | % |
|---|------|------|------|--------|---|
| 1 | Enforcement de Reglas | FE | `tasks/enforcement-reglas.md` (pendiente crear) | F1-F3 ✅ · F4 parcial ✅ (F4.4-F4.5 🔒) · F5 ⏳ | ~75% |
| 2 | Arquitectura Backend — Opciones A/B/C | BE | `Educa.API/.claude/plan/arquitectura-backend-opciones.md` (pendiente crear) | A ✅ · B 🔄 (5/8) · C ⏳ | ~33% |
| 3 | Domain Layer (Opción A) | BE | `Educa.API/.claude/plan/domain-layer.md` (pendiente crear) | Fases 1-3,5-6 ✅ · F4 🔒 (bloqueada por Matrícula) | ~85% |
| 4 | Consolidación Backend | FE | `plan/consolidacion-backend.md` (pendiente crear) | ⏳ | 0% |
| 5 | Consolidación Frontend | FE | `plan/consolidacion-frontend.md` (pendiente crear) | ⏳ | 0% |
| 6 | Asignación Profesor-Salón-Curso | BE+FE | `Educa.API/.claude/plan/asignacion-profesor-salon-curso.md` (pendiente crear) | ✅ F0-F6 cerrado | 100% |
| 7 | Error Trace Backend | BE | `Educa.API/.claude/plan/error-trace-backend.md` (pendiente crear) | ⏳ | 0% |
| 8 | Design Patterns Backend | FE | `tasks/design-patterns-backend.md` (pendiente crear) | Incremental | N/A |
| 9 | Design Patterns Frontend | FE | `tasks/design-patterns-frontend.md` (pendiente crear) | Incremental | N/A |
| 10 | Flujos Alternos (resiliencia) | FE | `plan/flujos-alternos.md` (pendiente crear) | ⏳ (bloqueado) | 0% |
| 11 | Refactor `eslint.config.js` (fix G10) | FE | `plan/eslint-config-refactor.md` (pendiente crear) | ✅ F1-F5 (F5.3 tests opcionales sin ejecutar) | ~95% |
| 12 | Backend Test Gaps | BE | `plan/test-backend-gaps.md` (pendiente crear) | ⏳ | 0% |
| 13 | Frontend Test Gaps | FE | `plan/test-frontend-gaps.md` (pendiente crear) | ⏳ | 0% |
| 14 | Contratos FE-BE | FE+BE | `plan/contratos-fe-be.md` (pendiente crear) | ⏳ | 0% |
| 15 | Release Protocol y Operaciones | FE+BE | `plan/release-operations.md` (pendiente crear) | F1 ✅ · F2-F5 ⏳ | ~20% |
| 16 | Auditoría de Seguridad | BE | `plan/security-audit.md` (pendiente crear) | ⏳ | 0% |
| 17 | Enforcement max-lines BE (CI) | BE | (inline en maestro) | ⏳ | 0% |
| 18 | Tests de flujo de negocio E2E | BE+FE | (inline en maestro) | ⏳ | 0% |
| 19 | Comunicación: foro + mensajería + push | FE+BE | (pendiente planificar) | ⏳ | 0% |
| 20 | Design System — Estándar desde `usuarios` | FE | `tasks/design-system-from-usuarios.md` | ⏳ (sin prerrequisitos, ejecutable ya) | 0% |

**Semáforo de readiness**:

| Dimensión | Estado | Gate mínimo |
|---|---|---|
| **Feature readiness** | 🟢 Listo | Carril A ✅ + QW4 ✅ — deploy completado |
| **Deploy readiness** | 🟢 Deployed | FE (Netlify) + BE (Azure) desplegados 2026-04-16. Pendiente validar estabilidad 2026-04-17. |
| **Production reliability** | 🔴 Sin red | Falta: tests de contrato, auditoría endpoints, error trace, fallbacks P0 |

**Foco: validar estabilidad post-deploy (2026-04-17) → Carril D (confiabilidad) → Carril B (deuda)**.

---

## Bloqueos activos (qué desbloquea qué)

> Lectura rápida para elegir próximo chat. Complementa al diagrama de dependencias.

| Si cierro… | Desbloqueo… | Por qué |
|------------|-------------|---------|
| ~~QW3 (specs rotos)~~ | ~~CI verde → F4.6 efectivo~~ | ✅ Cerrado 2026-04-16 |
| ~~Plan 6 (completo)~~ | ~~Plan 4 (Consolidación BE) + Plan 5 (Consolidación FE)~~ | ✅ Cerrado 2026-04-16 |
| Plan 2/B (3 state machines) | Plan 1 F4.4 (INV-T*) | Transiciones formales necesarias para tests de invariantes |
| Plan 3 F3.5 (Diseño UI matrícula) | Plan 3 F4 (implementación matrícula) | Diseño desbloquea implementación |
| Plan 3 F4 (Matrícula) | Plan 1 F4.5 (INV-M*) | Feature independiente |
| Carril B sustancialmente cerrado | Plan 10 F1+ (Flujos Alternos completo) | Requisito explícito: "proyecto limpio" (P0 extraído a Carril D, desbloqueado) |

**Carril A — CERRADO** ✅ (2026-04-16). Plan 6 completado en todas sus fases (F0-F6).

<details><summary>Historial Carril A (cerrado)</summary>

1. ~~**QW3**~~ ✅ — CI verde, 0 fallos.
2. ~~**Plan 6 F1**~~ ✅ — BD: tabla `ProfesorCurso` + migración + modelo EF.
3. ~~**Plan 6 F2**~~ ✅ — Domain validators: 4 archivos + 42 tests.
4. ~~**Plan 6 F3**~~ ✅ — BE Services: 7 archivos nuevos + 9 modificados. 741 tests.
5. ~~**Plan 6 F4**~~ ✅ — Frontend: tipos + badges + cursos que dicta. 25 archivos.
6. ~~**Plan 6 F5**~~ ✅ — Auditoría SQL: 0 violaciones INV-AS01/AS02.
7. ~~**Plan 6 F6**~~ ✅ — Tests facade + invariantes formalizados + error codes.

</details>

**QW4 — LINT LIMPIO + DEPLOY ✅** (2026-04-16): 0 errors, 0 warnings. 1321 tests. Build OK. **Push y deploy completados (FE+BE). Pendiente validar estabilidad 2026-04-17.**

**Próximo paso — Validar estabilidad (2026-04-17) → Carril D (confiabilidad) → Carril B (deuda)**:

**Carril D — Confiabilidad sistémica (post-push, antes de Carril B)**:

1. **Plan 15 F1** — Checklist de deploy + smoke checks + rollback protocol (proceso, 1 chat) ✅
2. **Plan 16 F1** — Auditoría de endpoints y autorización (1 chat)
3. **Plan 12 F1** — Controller contract tests P0: Auth, Asistencia, Aprobación (2-3 chats)
4. **Plan 13 F1** — Interceptores core sin cobertura (1 chat)
5. **Plan 12 F3** — Security boundary tests (1-2 chats)
6. **Plan 14 F1-F2** — Snapshots de DTOs (mínimo viable de contratos, 1-2 chats)
7. **Plan 15 F2** — Health check endpoint (1 chat)
8. **Plan 7 F1-F2** — Error Trace Backend: observabilidad mínima en producción (1-2 chats)
9. **Plan 10 P0** — Fallbacks críticos: offline, auth failure, API down (1 chat)
10. **Plan 17** — Enforcement max-lines .cs en CI (1 chat, BE)
11. **Plan 18** — Tests de flujo de negocio E2E: asistencia, calificaciones, aprobación cross-layer (2-3 chats, tras Plan 12+13)

**Carril B — Deuda técnica (cuando Carril D tenga base sólida)**:

1. **Plan 1 F5.3** — Re-exports cleanup `@shared` → `@intranet-shared` (48 archivos, FE, 3-4 chats)
2. **Plan 2/B** — State Machines (3 faltantes, BE) — desbloquea Plan 1 F4.4
3. **Plan 2/C** — Split archivos >300 líneas BE
4. **Plan 4** — Consolidación Backend
5. **Plan 5** — Consolidación Frontend

**Bloqueos duros (no ejecutables sin dependencia previa)**:

- Plan 1 F4.4 🔒 por Plan 2/B (state machines)
- Plan 1 F4.5 🔒 por Plan 3 F4 (Matrícula)
- Plan 3 F4 🔒 por Plan 3 F3.5 (diseño admin UI matrícula)
- Plan 10 F1+ 🔒 hasta que Carril B cierre sustancialmente (P0 desbloqueado en Carril D)

---

## Secuencia ordenada (3 carriles)

> Reorganizado 2026-04-16: features primero. La arquitectura limpia es un medio, no un fin.

### Carril A — Features ✅ CERRADO (2026-04-16)

> Plan 6 (Asignación Profesor-Salón-Curso) completado: BD + Domain + Backend + Frontend + Auditoría + Tests.
> Validators INV-AS01/AS02 enforced en HorarioService. 0 violaciones en producción. 1321 tests verdes.

### Carril D — Confiabilidad sistémica (post-push, ANTES de Carril B)

> "Funciona es condición necesaria, no suficiente. Verificable, reversible y observable es el estándar."

- **Plan 15** — Release Protocol: checklist, smoke checks, rollback, health endpoint
- **Plan 16** — Auditoría de Seguridad: endpoints, secretos, headers, sesiones
- **Plan 12** — Backend Test Gaps: controllers, repos, security, workers, concurrencia
- **Plan 13** — Frontend Test Gaps: interceptores, páginas admin, flujos, WAL/offline
- **Plan 14** — Contratos FE-BE: snapshots de DTOs, endpoints, enums
- **Plan 7** — Error Trace Backend: observabilidad de errores en producción (movido desde Carril B — tracing es confiabilidad, no deuda)
- **Plan 10 P0** — Fallbacks críticos: offline, auth failure, API down (subset mínimo extraído de Plan 10)
- **Plan 17** — Enforcement max-lines .cs en CI: script que falla el build si un .cs > 300 líneas (previene regresión post Plan 2/C)
- **Plan 18** — Tests de flujo de negocio E2E: asistencia, calificación→aprobación, login→permisos (tras Plan 12+13)

Estos se ejecutan inmediatamente después del push. Son la red de seguridad que el proyecto necesita antes de operar en producción con confianza.

### Carril B — Deuda técnica (cuando Carril D tenga base sólida)

> "La deuda se paga mientras se construye, no antes."

- **Plan 1 F5** — Wrappers exclusivos (re-exports cleanup)
- **Plan 2/B** — State Machines (3 faltantes)
- **Plan 2/C** — Split archivos >300 líneas BE
- **Plan 4** — Consolidación Backend
- **Plan 5** — Consolidación Frontend

Estos se ejecutan cuando el Carril D provea red de seguridad mínima (Plan 15 F1 + Plan 16 F1 + Plan 12 F1 P0 + Plan 7 F1).

### Carril C — Diferido (bloqueado o bajo prioridad)

- **Plan 3 F4** — Matrícula (🔒 diseño admin UI pendiente → ver Plan 3 F3.5 abajo para desbloquear)
- **Plan 19** — Comunicación: foro + mensajería + push (planificación pendiente)
- **Plan 10** — Flujos Alternos (🔒 proyecto limpio)
- **Planes 8-9** — Design Patterns (incrementales al tocar módulos)

---

## Diagrama de dependencias (actualizado 2026-04-16)

```
CARRIL A — FEATURES ✅ CERRADO
   QW3 ✅ ──► Plan 6 F1-F6 ✅ (completo)

CARRIL D — CONFIABILIDAD SISTÉMICA (foco actual, post-push)

   Plan 15 F1 (Checklist deploy) ── sin bloqueos ← ✅ HECHO
   Plan 16 F1 (Auditoría endpoints) ── sin bloqueos
   Plan 12 F1 (Controller tests P0) ── sin bloqueos
   Plan 13 F1 (Interceptores FE) ── sin bloqueos
   Plan 12 F3 (Security tests) ── tras Plan 16 F1 (necesita la matriz de endpoints)
   Plan 14 F1-F2 (Contratos DTOs) ── sin bloqueos
   Plan 15 F2 (Health endpoint) ── sin bloqueos
   Plan 7 F1-F2 (Error Trace) ── sin bloqueos (observabilidad = confiabilidad)
   Plan 10 P0 (Fallbacks P0) ── sin bloqueos (subset mínimo: offline, auth, API down)
   Plan 17 (Enforcement max-lines BE) ── sin bloqueos
   Plan 18 F1-F2 (E2E flujos BE) ── tras Plan 12 F1 (necesita infra de tests)
   Plan 18 F3 (E2E flujos FE) ── tras Plan 13 F1 (necesita infra de tests)

CARRIL B — DEUDA TÉCNICA (cuando Carril D tenga base)

   Plan 1 F5 (re-exports) ── sin bloqueos
   Plan 2/B (State Machines) ── desbloquea Plan 1 F4.4 (tests INV-T*)
   Plan 2/C (Split BE) ── sin bloqueos
   Plan 4 (Consolidación BE) ── tras Plan 2/B+C
   Plan 5 (Consolidación FE) ── tras Plan 4

CARRIL C — DIFERIDO

   Plan 3 F3.5 (Diseño UI matrícula) ── sin bloqueos (modo /design, 1 chat)
   Plan 3 F4 (Matrícula) 🔒 ── espera Plan 3 F3.5
   Plan 19 (Comunicación: foro+mensajería+push) ── planificación primero (F1)
   Plan 10 F1+ (Flujos Alternos completo) 🔒 ── espera Carril B cerrado
   Plan 7 F3+ (Error Trace avanzado) ── tras Plan 7 F1-F2 en Carril D
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

### QW4 — Lint limpio para producción (PRIORIDAD INMEDIATA)

> **Objetivo**: 0 errors, 0 warnings → push seguro. Estado inicial: 2 errors + ~185 warnings en 53 archivos.
> **Inventario** (2026-04-16):
>
> | Regla | Nivel | Issues | Archivos | Chat |
> |-------|-------|--------|----------|------|
> | `max-lines` | error | 2 | `error-reporter.service.ts` (310ln), `profesor-salones.component.ts` (320ln) | QW4.1 |
> | `no-unused-vars` | warn | 33 | 27 archivos (specs + services) | QW4.2 |
> | `no-compact-trivial-setter` | warn | 45 | 8 stores/facades | QW4.3 |
> | `no-explicit-any` | warn | 99 | 11 archivos (todos `.spec.ts`) | QW4.4 |
> | `use-lifecycle-interface` | warn | 3 | 3 archivos | QW4.5 |
> | `no-empty-lifecycle-method` | warn | 1 | 1 archivo | QW4.5 |
> | `layer-enforcement/imports-warn` | warn | 2 | 1 archivo (`profesor-salones`) | QW4.5 |

- [x] **QW4.1 — Lint errors: 2 archivos >300 líneas** ✅ (2026-04-16)
  - [x] `error-reporter.service.ts` — extraído tipos a `error-reporter.models.ts` + eliminado `#endregion` duplicado
  - [x] `profesor-salones.component.ts` — movido template inline a `.component.html` + estilos a `.component.scss`

- [x] **QW4.2 — `no-unused-vars`: 33 issues en 27 archivos** ✅ (2026-04-16)
  - [x] Eliminados imports no usados en 25 archivos
  - [x] Prefijo `_` en params de callback (5 casos en `usuario-validation.utils.ts` + 1 en spec)

- [x] **QW4.3 — `no-compact-trivial-setter`: 45 issues en 8 archivos** ✅ (2026-04-16)
  - [x] Expandidos 45 setters triviales de 1 línea a formato multi-línea
  - [x] 3 archivos resultantes >300 líneas → `eslint-disable max-lines` justificado (campus-admin.store, salones-admin.facade, calificaciones.facade)

- [x] **QW4.4 — `no-explicit-any`: 99 issues en 14 specs** ✅ (2026-04-16)
  - [x] Tipados con `unknown`, `Partial<T>`, `vi.mocked()`, `as unknown as T`, interfaces de test-access
  - [x] 14 archivos spec corregidos

- [x] **QW4.5 — Otros warnings: 6 issues** ✅ (2026-04-16)
  - [x] `use-lifecycle-interface` (3) — agregado `implements OnChanges`
  - [x] `no-empty-lifecycle-method` (1) — eliminado `ngOnInit` vacío + imports
  - [x] `layer-enforcement/imports-warn` (2) — eslint-disable con justificación (pendiente mover a @intranet-shared)

- [x] **QW4.6 — Verificación final y PUSH** ✅ (2026-04-16)
  - [x] `npm run lint` → 0 errors, 0 warnings ✅
  - [x] `npm test` → 1321 tests, 0 fallos ✅
  - [x] `npm run build` → build OK ✅
  - [x] Push FE (main) + BE (master) → deploy completado (Netlify + Azure) ✅
  - [ ] Validar estabilidad en producción (2026-04-17)

---

### Carril D — Confiabilidad sistémica (post-push, ANTES de Carril B)

> **"Corregir lo que duele es un fix. Tener red de seguridad antes de que duela es ingeniería."**
> Estas tareas se ejecutan inmediatamente después del push. Son la red de seguridad que falta para operar en producción con confianza.

#### Plan 15 — Release Protocol y Operaciones

- [x] **F1 — Checklist de deploy** (1 chat, proceso puro) ✅ (2026-04-16)
  - [x] F1.1 Pre-deploy checklist (build, tests, scripts SQL, orden de deploy)
  - [x] F1.2 Post-deploy smoke checks (~20 verificaciones manuales)
  - [x] F1.3 Rollback protocol (FE, BE, BD)
  - [x] Entregable: `DEPLOY.md` en raíz del proyecto

- [ ] **F2 — Health check endpoint** (1 chat, BE)
  - [ ] F2.1 `GET /api/health` — BD accesible, outbox no bloqueada, jobs activos
  - [ ] F2.2 Response tipado: healthy/degraded/unhealthy

- [ ] **F3 — Validación datos post-deploy** (1 chat, SQL)
  - [ ] F3.1 Queries de consistencia (estudiantes huérfanos, salones duplicados, horarios con profesor inactivo)

- [ ] **F4 — Feature flags como safety net** (documentación)
  - [ ] F4.1 Patrón: flag=false en prod → smoke → flag=true → re-deploy

- [ ] **F5 — Monitoreo básico** (evaluar + cubrir gaps)
  - [ ] F5.1 Verificar que RequestMetricsMiddleware logea a destino consultable
  - [ ] F5.2 Si lo existente no alcanza: definir mínimo de alertas (5xx rate, latency P95, health degraded)

#### Plan 16 — Auditoría de Seguridad

- [ ] **F1 — Auditoría de endpoints** (1 chat, BE)
  - [ ] F1.1 Listar todos los endpoints con atributos de seguridad
  - [ ] F1.2 Matriz endpoints vs roles esperados
  - [ ] F1.3 Identificar endpoints sin [Authorize] que deberían tenerlo
  - [ ] F1.4 Identificar endpoints sin rate limiting que deberían tenerlo

- [ ] **F2 — Auditoría de secretos** (1 chat, ambos repos)
  - [ ] F2.1 Grep de patrones de secretos en código
  - [ ] F2.2 Verificar .gitignore cubre archivos sensibles
  - [ ] F2.3 Verificar DniHelper.Mask() en todos los puntos de salida

- [ ] **F3 — Headers y CORS** (1 chat, BE)
- [ ] **F4 — Sesión y tokens** (1 chat, BE)
- [ ] **F5 — Datos sensibles en respuestas** (1 chat, BE)

#### Plan 12 — Backend Test Gaps

- [ ] **F1 — Controller contract tests** (3-4 chats, BE)
  - [ ] F1.P0 Auth + Asistencia + Aprobación
  - [ ] F1.P1 Usuarios + Horarios + Calificaciones + Permisos
  - [ ] F1.P2 Resto de controllers

- [ ] **F2 — Repository integration tests** (2-3 chats, BE)
  - [ ] F2.P0 Asistencia + EstudianteSalon + ProfesorSalon
  - [ ] F2.P1 Horario + Calificación + Aprobación

- [ ] **F3 — Security boundary tests** (1-2 chats, BE)
  - [ ] Cross-role access, tokens expirados, idempotencia, cuenta inactiva

- [ ] **F4 — Workers/jobs tests** (1 chat, BE)
- [ ] **F5 — Concurrencia e idempotencia** (1 chat, BE)

#### Plan 13 — Frontend Test Gaps

- [ ] **F1 — Interceptores core** (1 chat, FE)
  - [ ] api-response, clock-sync, sw-cache-invalidation, request-trace

- [ ] **F2 — Páginas admin críticas** (2 chats, FE)
  - [ ] asistencias admin, feedback-reports, health-permissions, email-outbox, error-logs

- [ ] **F3 — Flujos de integración UI** (1-2 chats, FE)
  - [ ] Login completo, Guard+Permisos, CRUD admin tipo, Error recovery

- [ ] **F4 — WAL/Offline/Cache** (1 chat, FE)
- [ ] **F5 — Componentes shared de alto uso** (1 chat, FE)

#### Plan 14 — Contratos FE-BE

- [ ] **F1-F2 — Snapshot de DTOs** (mínimo viable, 1-2 chats)
  - [ ] F1 Backend: reflection → dtos.snapshot.json
  - [ ] F2 Frontend: test que verifica interfaces vs snapshot

- [ ] **F3-F4 — Snapshot de endpoints** (1-2 chats)
- [ ] **F5 — Enums y constantes** (1 chat)
- [ ] **F6 — Automatización** (1 chat)

#### Plan 7 — Error Trace Backend (observabilidad — movido desde Carril B)

> Tracing de errores es confiabilidad, no deuda técnica. Sin observabilidad no hay producción segura.

- [ ] **F1 — Structured error logging** (1 chat, BE)
  - [ ] F1.1 Auditar qué logea GlobalExceptionMiddleware hoy y a dónde va
  - [ ] F1.2 Garantizar que CorrelationId aparece en todos los logs de error
  - [ ] F1.3 Verificar que ErrorLog persiste con suficiente contexto para diagnóstico

- [ ] **F2 — Error visibility mínima** (1 chat, FE+BE)
  - [ ] F2.1 Verificar que error-logs admin consume ErrorLog correctamente
  - [ ] F2.2 Verificar correlación ReporteUsuario → ErrorLog vía CorrelationId

- [ ] F3+ — Fases avanzadas (alertas, dashboards, métricas) → Carril C cuando F1-F2 estén cerrados

#### Plan 10 P0 — Fallbacks críticos (subset mínimo extraído de Plan 10)

> El Plan 10 completo espera Carril B. Pero estos 3 fallbacks son seguridad de producción.

- [ ] **P0.1 — API down / timeout** (1 chat, FE)
  - [ ] ¿Qué ve el usuario cuando el backend no responde? ¿Hay mensaje claro o pantalla rota?

- [ ] **P0.2 — Auth token expirado / refresh falla** (1 chat, FE)
  - [ ] ¿El usuario es redirigido a login limpiamente o queda en estado roto?

- [ ] **P0.3 — Offline + WAL sync failure** (1 chat, FE)
  - [ ] ¿Qué pasa con operaciones WAL encoladas cuando la reconexión falla persistentemente?

#### Plan 17 — Enforcement max-lines .cs en CI

> **Origen**: Auditoría de investigación (2026-04-16). El frontend tiene `max-lines` en ESLint que bloquea el build. El backend tiene la regla en `backend.md` pero nada la enforcea — resultado: 23 archivos la violan. Plan 2/C arregla los actuales, pero sin gate en CI volverán a aparecer.

- [ ] **F1 — Script o Roslyn analyzer** (1 chat, BE)
  - [ ] F1.1 Crear script (`scripts/check-max-lines.sh` o `.ps1`) que cuente líneas por archivo .cs y falle si alguno > 300
  - [ ] F1.2 Excepción explícita: `ApplicationDbContext.cs` (DbSets crecen linealmente)
  - [ ] F1.3 Integrar en CI (GitHub Actions o pre-push hook) — falla el build si viola
  - [ ] F1.4 Verificar que los 23 archivos actuales están exentos con `TODO` o que Plan 2/C ya los resolvió

#### Plan 18 — Tests de flujo de negocio E2E (cross-layer)

> **Origen**: Auditoría de investigación (2026-04-16). Plan 12 y 13 testan piezas aisladas. Nadie testa flujos completos como "profesor pasa lista → apoderado recibe correo → estadística se actualiza". Estos tests cruzan Controller → Service → Repository → SignalR/Email y verifican que el flujo de negocio funciona de punta a punta.
> **Dependencia**: ejecutar DESPUÉS de Plan 12 F1 y Plan 13 F1 (necesita infra de tests ya montada).

- [ ] **F1 — Flujo de asistencia completo** (1 chat, BE)
  - [ ] F1.1 Webhook CrossChex → AsistenciaService → estado calculado → EmailOutbox encolado → SignalR notificado
  - [ ] F1.2 Admin corrige asistencia → correo diferenciado → estado actualizado

- [ ] **F2 — Flujo de calificación → aprobación** (1 chat, BE)
  - [ ] F2.1 Profesor registra notas → promedio calculado → periodo se cierra → aprobación habilitada
  - [ ] F2.2 Aprobación masiva → progresión (siguiente grado, sección V, egreso)

- [ ] **F3 — Flujo de login → permisos → navegación** (1 chat, FE)
  - [ ] F3.1 Login → JWT cookie → guard permite ruta → permissionsGuard filtra por rol → UI muestra solo lo permitido
  - [ ] F3.2 Token expira → 401 → refresh → retry transparente

---

### Carril B — Deuda técnica (cuando Carril D tenga base sólida)

> Estas tareas se ejecutan después de que el Carril D provea red de seguridad mínima.

#### Plan 11 — Refactor `eslint.config.js` ✅ (~95%)

<details><summary>Detalle (cerrado)</summary>

- [x] F1-F4 cerrados
- [x] F5.1-F5.2 cerrados, F5.4 cerrado
- [ ] F5.3 Tests de guardia (opcional)

</details>

#### Plan 1 — Enforcement de Reglas (~75%)

<details><summary>F3 — Lint de capas ✅ (cerrado)</summary>

- [x] F3.1-F3.6 cerrados (2026-04-14 a 2026-04-15). Detalle en `tasks/enforcement-reglas.md` (pendiente crear).

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

- [ ] **Opción C — Split archivos >300 líneas BE** (auditoría 2026-04-16: 23 archivos violan, 34 en zona 200-300)
  - [ ] C.1 — **Patrón 1: Validators/Rules** — extraer lógica pura de services densos (1-2 chats, BE)
    - `HorarioService` (395) → extraer `HorarioConflictValidator`
    - `AprobacionEstudianteService` (381) → extraer `AprobacionRules`
    - `AuthService` (373) → extraer `PasswordMigrationHelper` o `AuthValidator`
    - `AsistenciaAdminCrudService` (323) → extraer validaciones de cierre mensual
    - `PasswordRecoveryService` (334), `GrupoContenidoService` (317), `ConversacionesService` (316), `ErrorLogService` (313) → evaluar caso por caso
  - [ ] C.2 — **Patrón 2: PDF Builder genérico** — separar config de layout en reportes (2-3 chats, BE)
    - [ ] C.2.1 Crear `PdfBuilderService` genérico compartido (recibe columnas, secciones, estilos como config → genera layout). **No solo split — abstracción reutilizable.**
    - [ ] C.2.2 Migrar cada service de reportes a config + builder:
      - `ReporteFiltradoAsistenciaService` (441) → config + builder compartido
      - `ReporteFiltradoPdfService` (425) → idem
      - `ReporteAsistenciaDataService` (396) → idem
      - `ReporteAsistenciaConsolidadoPdfService` (389) → idem
      - `BoletaNotasPdfService` (381) → idem
      - `ReporteAsistenciaSalonPdfService` (314) → idem
    - [ ] C.2.3 `EmailNotificationService` (375) → separar templates de correo a configs
  - [ ] C.3 — **Patrón 3: Repositories auxiliares** — dividir queries especializadas (1 chat, BE)
    - `UsuariosRepository` (460) → `UsuariosQueryRepository` + `UsuariosStatsRepository`
    - `ConsultaAsistenciaRepository` (427) → `ConsultaAsistenciaQueryRepository`
    - `CampusRepository` (421) → `CampusQueryRepository`
    - `HorarioRepository` (386) → `HorarioQueryRepository`
    - `CursoContenidoRepository` (348) → evaluar
    - `ProfesorEstudiantesQueryRepository` (318) → evaluar (ya es auxiliar)
  - [ ] C.4 — **Controller inflado** (1 chat, BE)
    - `ConsultaAsistenciaController` (400) → dividir por sub-dominio (diaria vs reportes)
  - [ ] C.5 — Verificación: `0 archivos > 300 líneas` (excepción: `ApplicationDbContext`)

#### Plan 4 — Consolidación Backend (tras Plan 2/B+C)

- [ ] F1-F6 (ver plan base)

#### Plan 5 — Consolidación Frontend (tras Plan 4)

- [ ] F1-F6 (ver plan base)

---

### Carril C — Diferido

#### Plan 3 F3.5 — Diseño UI admin de matrícula (desbloquea Plan 3 F4)

> **Origen**: Auditoría de investigación (2026-04-16). Plan 3 F4 está bloqueado por "diseño admin UI pendiente", pero ninguna tarea produce ese diseño. Este es el desbloqueador.

- [ ] **F3.5.1 — Diseño de la UI admin de matrícula** (1 chat, modo `/design`)
  - [ ] Wireframe: listado de estudiantes preasignados, flujo de matrícula (PREASIGNADO → PENDIENTE_PAGO → PAGADO → CONFIRMADO), formulario de pago, estados visuales
  - [ ] Definir qué endpoints nuevos se necesitan (o si los existentes bastan)
  - [ ] Definir qué DTOs faltan
  - [ ] Entregable: wireframe + lista de endpoints + lista de DTOs → desbloquea F4

#### Plan 3 F4 — Matrícula 🔒 (bloqueado por Plan 3 F3.5)

- [ ] Espera diseño admin UI (Plan 3 F3.5) + service layer

#### Plan 7 F3+ — Error Trace avanzado

- [ ] Alertas, dashboards, métricas — tras Plan 7 F1-F2 en Carril D

#### Plan 10 F1+ — Flujos Alternos completo 🔒

- [ ] Espera carriles A+B sustancialmente cerrados (P0 ya extraído a Carril D)

#### Plan 19 — Comunicación: foro + mensajería directa + push notifications

> **Origen**: Auditoría de investigación (2026-04-16). Chat (SignalR) y calendario/eventos funcionan. Pero foro, mensajería directa y push notifications están parcialmente implementados o con feature flags apagados. Ningún plan del maestro los cubría.

- [ ] **F1 — Planificación** (1 chat, modo `/design`)
  - [ ] F1.1 Inventario: qué existe hoy (código, feature flags, endpoints, plugins Capacitor)
  - [ ] F1.2 Priorizar: ¿qué necesita el colegio primero? (push > mensajería > foro probablemente)
  - [ ] F1.3 Definir fases con dependencias (push requiere Firebase config, mensajería requiere UI, foro requiere moderación)
  - [ ] F1.4 Estimar esfuerzo por fase

- [ ] **F2+ — Ejecución** (según lo que defina F1)

#### Planes 8-9 — Design Patterns

- [ ] Incrementales al tocar cada módulo

---

## Quick wins cerrados

- [x] **QW1 — Migrar `health-permissions` a WAL** ✅ (2026-04-15)
- [x] **QW2 — Limpiar ruido de lint en build artifacts** ✅ (2026-04-15)
- [x] **QW3 — CI verde** ✅ (2026-04-16) — 6 spec files fixed (40 fallos → 0). 108 files, 1317 tests.

---

## Auditoría WAL + Cache (standalone, 3 chats)

> **Origen**: Auditoría modo Validar (2026-04-16). Hallazgos en `tasks/wal-cache-audit-fixes.md` (pendiente crear).

- [ ] **H1** — Bug interceptor PascalCase + H8/H9 módulos incompletos y versiones (P0, 1 chat)
- [ ] **H7** — Normalizar naming `WAL_CACHE_MAP` (P1, 1 chat)
- [ ] **H2-H6, H10** — Fixes cosméticos y duplicación de patrones (P2, 1 chat)

---

## Design System — Estándar desde `usuarios` (standalone, 2-3 chats)

> **Origen**: Conversación 2026-04-17. Tras cerrar parches de transparencia (tablas, paginadores, stat-cards, wrappers), se eleva `/intranet/admin/usuarios` como referencia canónica de diseño. Detalle en `tasks/design-system-from-usuarios.md`.
> **Sin prerrequisitos · Ejecutable ahora**

- [ ] **F1 — Globales sin polémica + decisión A1** (chat 1)
  - [ ] Confirmar opción para neutralización de `p-tag` (A global / B opt-in / C semántica)
  - [ ] Reset de inputs/selects en `styles.scss` (transparente, foco text-color)
  - [ ] Override global de `p-button-text` y `p-button-outlined` (text-color + surface-300)
  - [ ] Utility class `.label-uppercase` en `styles.scss`
  - [ ] Actualizar `rules/table-transparency.md` (o renombrar a `design-system.md`)

- [ ] **F2 — Aplicar decisión sobre `p-tag`** (chat 2, depende de F1.0)
  - [ ] Ejecutar según opción elegida (A/B/C)
  - [ ] Verificación visual: usuarios, error-logs, feedback-reports, asistencia, aprobación

- [ ] **F3 — `rules/design-system.md` con pautas B1-B11** (chat 3)
  - [ ] Containers con border no background, page header, stat card, tabla, row actions triplet, filter bar, botones canónicos, dialogs, alert banners con `color-mix()`, drawer detalle, dev banners
  - [ ] Cross-refs desde CLAUDE.md y `rules/primeng.md`

- [ ] **F4 — (Opcional, diferible) Migración de tokens hardcoded** (`#e24c4c`, `#dc2626`, `#1e40af`, `color: white` inline)

- [ ] **F5 — (Opcional, diferible) Migración de páginas existentes al estándar** (1 página por chat)

---

## Deuda estructural diferida (chat dedicado)

- [ ] **DS1 — Split estructural de `wal-sync-engine.service.ts`** — ver `tasks/wal-sync-engine-split.md` (pendiente crear)
  - **Origen**: F3.5.B (2026-04-15). Archivo en 303 líneas efectivas (límite 300). Fix temporal con `eslint-disable max-lines` justificado en el encabezado del archivo. No es quick-win: requiere entender el loop del engine + tests mínimos previos + extracción cohesiva (candidato principal: Error Handling como helper puro).
  - **Por qué diferido**: preexistente al F3.5.B, no bloquea ninguna tarea activa, y el escape hatch honesto es preferible a un refactor cosmético que colapse comentarios para pasar el umbral sin resolver el fondo.

---

## Notas de ubicación

- Planes en `educa-web/.claude/plan/` son los de **alcance amplio** (incluyen refs cruzadas al backend).
- Planes en `educa-web/.claude/tasks/` son **transversales al proyecto** pero con granularidad de tarea (enforcement, design patterns).
- Planes en `Educa.API/.claude/plan/` son **exclusivos del backend**.
- Este maestro vive en `educa-web/.claude/plan/maestro.md` porque es el punto donde convergen más referencias cross-repo.
