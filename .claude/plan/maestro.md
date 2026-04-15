# Plan Maestro — Orden y Dependencias

> **Fecha**: 2026-04-14
> **Objetivo**: Ordenar los 11 planes dispersos entre `educa-web/.claude/` y `Educa.API/.claude/` en una secuencia con dependencias explícitas.
> **Principio rector**: "Primero enforcement (base), luego arquitectura (backend → frontend), luego features cross-cutting, y al final resiliencia."

---

## Inventario de planes (11)

| # | Plan | Repo | Ruta | Estado |
|---|------|------|------|--------|
| 1 | Enforcement de Reglas | FE | [tasks/enforcement-reglas.md](../tasks/enforcement-reglas.md) | F1-F2 ✅ · F3.1-F3.3 ✅ · F3.4-F5 ⏳ (22 violaciones destapadas catalogadas) |
| 2 | Arquitectura Backend — Opciones A/B/C | BE | [Educa.API/.claude/plan/arquitectura-backend-opciones.md](../../../Educa.API/.claude/plan/arquitectura-backend-opciones.md) | A ✅ · B 🔄 · C ⏳ |
| 3 | Domain Layer (Opción A) | BE | [Educa.API/.claude/plan/domain-layer.md](../../../Educa.API/.claude/plan/domain-layer.md) | Fases 1-3,5-6 ✅ · F4 🔒 |
| 4 | Consolidación Backend | FE | [plan/consolidacion-backend.md](consolidacion-backend.md) | ⏳ |
| 5 | Consolidación Frontend | FE | [plan/consolidacion-frontend.md](consolidacion-frontend.md) | ⏳ |
| 6 | Asignación Profesor-Salón-Curso | BE | [Educa.API/.claude/plan/asignacion-profesor-salon-curso.md](../../../Educa.API/.claude/plan/asignacion-profesor-salon-curso.md) | F0 ✅ · F1-6 ⏳ |
| 7 | Error Trace Backend | BE | [Educa.API/.claude/plan/error-trace-backend.md](../../../Educa.API/.claude/plan/error-trace-backend.md) | ⏳ |
| 8 | Design Patterns Backend | FE | [tasks/design-patterns-backend.md](../tasks/design-patterns-backend.md) | Incremental |
| 9 | Design Patterns Frontend | FE | [tasks/design-patterns-frontend.md](../tasks/design-patterns-frontend.md) | Incremental |
| 10 | Flujos Alternos (resiliencia) | FE | [plan/flujos-alternos.md](flujos-alternos.md) | ⏳ (bloqueado) |
| 11 | Refactor `eslint.config.js` (fix G10) | FE | [plan/eslint-config-refactor.md](eslint-config-refactor.md) | ✅ F1-F5 (2026-04-15: re-exports cubiertos; F5.3 tests opcionales sin ejecutar) |

---

## Secuencia ordenada (5 capas)

### Capa 1 — Base: Enforcement (fundacional)

> "Una regla que no se enforce es una sugerencia."

- **Plan 1** — Enforcement de Reglas (F3: lint de capas · F4: tests de invariantes · F5: wrappers exclusivos)
- **Plan 11** — Refactor `eslint.config.js` (fix G10) — **bloqueante parcial de Plan 1 F3.3 y F3.5**

**Por qué primero**: toda capa siguiente se apoya en que las reglas se puedan romper sin darse cuenta. F1-F2 ya protegen imports y tamaños; falta cerrar el perímetro.

**Sobre Plan 11**: durante F3.3 del Plan 1 se detectó que ESLint flat config sobreescribe `no-restricted-imports` entre bloques que matchean el mismo archivo. El bloque de barrel enforcement (último) invalida las reglas intermedias para archivos en `features/**`. Hasta arreglar G10, gran parte del enforcement de capas es decorativo para código productivo. Plan 11 es chat-sized y de alta prioridad.

---

### Capa 2 — Arquitectura Backend (núcleo de invariantes)

> "Si el dominio no está limpio, el frontend hereda caos."

Orden acordado en **Plan 2**:

1. **Plan 3** — Domain Layer (Opción A) — casi completo, solo falta F4 (Matrícula, bloqueada por feature)
2. **Plan 2/B** — State Machines formalizadas — 5/8 integradas, 3 pendientes
3. **Plan 2/C** — División de archivos >300 líneas — pendiente
4. **Plan 4** — Consolidación Backend — limpieza arquitectónica interna (consume salidas de A/B/C)

**Dependencia dura**: Plan 6 (Asignación) agrega validadores a Plan 3 (`TutorPlenoValidator`, `ModoAsignacionResolver`). Ejecutar Plan 6 **después** de que Domain Layer esté estable, pero **antes** de Consolidación Backend Fase 6 (que audita `HorarioAsignacionService`).

---

### Capa 3 — Arquitectura Frontend

- **Plan 5** — Consolidación Frontend

**Por qué después del backend**: el FE consume DTOs y state machines del BE. Si el backend se está limpiando, consolidar FE antes genera retrabajo.

**Dependencia cross-plan**: Fase 4 de Plan 5 agrega `modoAsignacion` computed que depende de Plan 6 Fase 4.

---

### Capa 4 — Feature cross-cutting y observabilidad

- **Plan 6** — Asignación Profesor-Salón-Curso (transversal: BD + BE + FE)
- **Plan 7** — Error Trace Backend (observabilidad de producción)

**Plan 6 antes que Consolidación BE Fase 6 y FE Fase 6** (ver coordinaciones en los headers de cada plan).

**Plan 7 es independiente** — se puede ejecutar en paralelo con cualquier capa una vez que F1 (enforcement) deje el middleware estable.

---

### Capa 5 — Patrones continuos y resiliencia

- **Planes 8 y 9** — Design Patterns (BE/FE) — se aplican **incrementalmente** al tocar cada módulo, no son fases dedicadas
- **Plan 10** — Flujos Alternos — requisito explícito: "proyecto limpio". Ejecutar **último**.

---

## Diagrama de dependencias

```
Capa 1: ENFORCEMENT
   Plan 11 (Fix G10 eslint.config) ──► Plan 1 (Enforcement: F3.3→F3.5)
             │
             ▼
Capa 2: BACKEND CORE
   Plan 3 (Domain) ──► Plan 2/B (State Machines) ──► Plan 2/C (Split) ──► Plan 4 (Consolidación BE)
             │                                                                    ▲
             └──────────────► Plan 6 (Asignación) ─────────────────────────────┐  │
                                      │                                         │  │
                                      ▼                                         │  │
Capa 3: FRONTEND          Plan 5 (Consolidación FE) ◄─────────────────────────┘  │
                                                                                  │
Capa 4: OBSERVABILIDAD    Plan 7 (Error Trace) ── paralelo a cualquier capa       │
                                                                                  │
Capa 5: PATRONES + RESILIENCIA                                                    │
        Planes 8-9 (Design Patterns) ── continuos, al tocar cada módulo ◄─────────┘
        Plan 10 (Flujos Alternos) ── bloqueado hasta que Capas 1-4 estén cerradas
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

### Capa 1 — Enforcement

#### Plan 11 — Refactor `eslint.config.js` (fix G10) — ejecutar PRIMERO

- [x] F1 Spike y decisión — **Opción B (plugin `layer-enforcement`)** el 2026-04-14. Mezcla de severidades (profesor warn vs resto error) + combinatoria admin/profesor/estudiante × component/store/facade hace inviable Opción A.
- [x] F2 Inventario de patterns a consolidar — tabla `LAYER_RULES` con 7 entries (shared, component, store, facade-cross, admin, profesor, estudiante)
- [x] F3 Implementación — plugin local `layer-enforcement` con 2 reglas (`imports-error`, `imports-warn`) en `eslint.config.js`. Removidos los 7 bloques overrideados por barrel. Verificado con `--print-config` y lint completo (detecta ~28 violaciones pre-existentes que eran invisibles).
- [x] F4 Reenganche con Plan 1 (2026-04-14): 3 `eslint-disable` huérfanos removidos de `shared/{components,directives,pipes}/index.ts`; `rules/eslint.md` actualizado (tabla, ejemplos, excepciones); G5/G6/G9 confirmados efectivos; 22 violaciones destapadas catalogadas por categoría y linkeadas a Plan 1 F3.5 (lotes A-D). Gap anotado: `layer-enforcement` solo hookea `ImportDeclaration`, no re-exports.
- [x] **F5 — Extender plugin a re-exports + tests de guardia** (2026-04-15)
  - [x] F5.1 `layer-enforcement` ahora cubre `ExportAllDeclaration` y `ExportNamedDeclaration` con `source`. Handler `checkNode` compartido por las 3 formas. `hasImportedName` actualizado para `ExportSpecifier.local.name`.
  - [x] F5.2 Escape hatch `/* eslint-disable layer-enforcement/imports-error -- Razón: shim temporal... */` agregado en los 3 barrels. Los 15 re-exports ahora detectados y silenciados con deuda visible.
  - [ ] F5.3 Tests de guardia (opcional — no ejecutado; el lint sobre los barrels cumple como regression test implícito).
  - [x] F5.4 `rules/eslint.md` actualizado: limitación removida, tabla de excepciones refleja el nuevo estado.

Ver [plan/eslint-config-refactor.md](eslint-config-refactor.md).

#### Plan 1 — Enforcement de Reglas

- [ ] **F3 — Lint de capas**
  - [x] F3.1 Inventariar reglas `no-restricted-imports` actuales vs faltantes (doc corto en el plan base) — ver [enforcement-reglas.md § Fase 1.5](../tasks/enforcement-reglas.md)
  - [x] F3.2 Regla: components no importan `HttpClient` ni `*.store.ts` (ya parcial) — cerrar gaps detectados en F3.1 — G2 (document.cookie), G3 (WAL internals), G4 (Cache internals) cerrados. G1 movido a F3.5.
  - [x] F3.3 Cerrada (2026-04-14) — G9 efectivo; G5/G6 efectivos tras fix G10 (Plan 11); destapa 22 violaciones que pasan a F3.5.
  - [ ] F3.4 Regla: `shared/` no importa `features/*` ni `@intranet-shared` — auditar violaciones y listarlas. Nota: `layer-enforcement/shared-no-features` ya bloquea `ImportDeclaration`; auditar también `export * from` (no detectado por el plugin).
  - [ ] **F3.5 — Corregir violaciones destapadas + G1 + G5/G6** (lotes chat-sized)
    - [ ] F3.5.A Lote A — Components importando stores (12 archivos): ctest-k6 (4), videoconferencias, simulador-notas, profesor-salones, profesor-foro, profesor-calificaciones, salon-estudiantes-dialog, permisos-detail-drawer, attachments-modal. Fix: migrar a facade.
    - [ ] F3.5.B Lote B — Stores → services (3 archivos): `wal-status.store` (2), `campus-navigation.store` (1). Fix: mover IO al facade.
    - [ ] F3.5.C Lote C — Cross-feature admin↔estudiante (7 imports en 4 archivos): `admin/health-permissions` (→ profesor), `estudiante/cursos/curso-content-readonly-dialog` (→ profesor). Decidir: subir a `@intranet-shared` o escape justificado.
    - [ ] F3.5.D Lote D — G1 heredado (8 components importando `*-api.service` directo, de F3.2). Fix: migrar a facade por módulo.
    - [ ] F3.5.E Verificar `npx eslint .` con 0 errores de `layer-enforcement/imports-error`.
  - [ ] F3.6 Actualizar plan base + maestro

- [ ] **F4 — Tests de invariantes**
  - [ ] F4.1 Catalogar INV-* testeable vs no testeable (tabla en plan base)
  - [ ] F4.2 Suite de tests para INV-C01..C08 (asistencia, cálculo)
  - [ ] F4.3 Suite de tests para INV-U01..U06 (unicidad/horarios)
  - [ ] F4.4 Suite de tests para INV-T01..T06 (transiciones de estado)
  - [ ] F4.5 Suite de tests para INV-V01..V03 + INV-M01..M04
  - [ ] F4.6 CI gate que corra la suite y falle en rojo
  - [ ] F4.7 Actualizar plan base + maestro

- [ ] **F5 — Wrappers exclusivos**
  - [ ] F5.1 Auditar consumidores directos de `localStorage`/`sessionStorage`/`console` (grep + lista)
  - [ ] F5.2 Migrar consumidores restantes a `StorageService` / `logger`
  - [ ] F5.3 Eliminar re-exports temporales `@shared` → `@intranet-shared`
  - [ ] F5.4 Actualizar plan base + maestro

---

### Capa 2 — Backend Core

#### Plan 3 — Domain Layer (Opción A)

- [ ] **F4 — Matrícula (bloqueada por feature)**
  - [ ] F4.1 Cerrar diseño de servicios + UI admin (ver Plan de Matrícula)
  - [ ] F4.2 Migración de `ESS_EstadoMatricula` (script SQL)
  - [ ] F4.3 Implementar state machine de matrícula (sección 14.2)
  - [ ] F4.4 Tests de invariantes INV-M01..M04
  - [ ] F4.5 Actualizar plan base + maestro

#### Plan 2 — Arquitectura Backend Opciones B/C

- [ ] **Opción B — State Machines (3 faltantes)**
  - [ ] B.1 Identificar las 3 state machines no integradas (listar en plan base)
  - [ ] B.2 Integrar state machine #1 (un chat)
  - [ ] B.3 Integrar state machine #2 (un chat)
  - [ ] B.4 Integrar state machine #3 (un chat)
  - [ ] B.5 Tests de transición para cada una
  - [ ] B.6 Actualizar plan base + maestro

- [ ] **Opción C — División de archivos >300 líneas**
  - [ ] C.1 Listar archivos >300 líneas (script + tabla en plan base)
  - [ ] C.2 Dividir lote 1 (3-5 archivos por chat, por dominio)
  - [ ] C.3 Dividir lote 2
  - [ ] C.4 Dividir lote N… (continuar hasta cerrar la lista)
  - [ ] C.5 Agregar regla ESLint/analyzer que bloquee nuevos >300 líneas
  - [ ] C.6 Actualizar plan base + maestro

#### Plan 6 — Asignación Profesor-Salón-Curso (debe ejecutarse antes de Plan 4 F6)

- [ ] **F1 — Modelado**
  - [ ] F1.1 Decidir columna `ModoAsignacion` (Grado vs derivada) — documentar en plan base
  - [ ] F1.2 Script SQL de migración (si aplica)
  - [ ] F1.3 Actualizar plan base + maestro

- [ ] **F2 — Domain validators**
  - [ ] F2.1 `TutorPlenoValidator` (INV-AS01)
  - [ ] F2.2 `ModoAsignacionResolver`
  - [ ] F2.3 Tests de validadores
  - [ ] F2.4 Actualizar plan base + maestro

- [ ] **F3 — Services**
  - [ ] F3.1 Integrar validadores en `HorarioAsignacionService`
  - [ ] F3.2 Integrar en servicios de creación/update de horarios
  - [ ] F3.3 Tests de integración
  - [ ] F3.4 Actualizar plan base + maestro

- [ ] **F4 — API/DTOs**
  - [ ] F4.1 Exponer `modoAsignacion` en DTOs de Salón/Grado
  - [ ] F4.2 Endpoint de consulta si aplica
  - [ ] F4.3 Actualizar plan base + maestro

- [ ] **F5 — Backfill y datos**
  - [ ] F5.1 Auditar horarios existentes que violen INV-AS01
  - [ ] F5.2 Script de corrección o reporte para admin
  - [ ] F5.3 Actualizar plan base + maestro

- [ ] **F6 — UI admin diferenciada** (tras Plan 5 F4)
  - [ ] F6.1 Diseño de UI por grado
  - [ ] F6.2 Implementación
  - [ ] F6.3 Actualizar plan base + maestro

#### Plan 4 — Consolidación Backend (tras Plan 3, 2/B, 2/C, 6 F5)

- [ ] **F1 — Inventario + criterios**
  - [ ] F1.1 Inventario de services/repos con duplicación o acoplamiento (plan base)
  - [ ] F1.2 Actualizar plan base + maestro

- [ ] **F2-F5 — Consolidaciones por dominio** (un dominio por chat)
  - [ ] F2 Asistencia
  - [ ] F3 Académico (cursos/salones/horarios)
  - [ ] F4 Calificaciones
  - [ ] F5 Notificaciones/Comunicación
  - [ ] Cada una: consolidar → tests → actualizar plan base + maestro

- [ ] **F6 — Audit HorarioAsignacionService** (depende de Plan 6 F5)
  - [ ] F6.1 Revisar con validadores ya en su lugar
  - [ ] F6.2 Refactor si aplica
  - [ ] F6.3 Actualizar plan base + maestro

---

### Capa 3 — Frontend

#### Plan 5 — Consolidación Frontend (tras Capa 2 estable)

- [ ] **F1 — Inventario**
  - [ ] F1.1 Mapa de features con god components, duplicados, facades monolíticos
  - [ ] F1.2 Actualizar plan base + maestro

- [ ] **F2 — Domain modeling**
  - [ ] F2.1 Extraer tipos duplicados a `@data/models` / `@shared/models` (lote 1)
  - [ ] F2.2 Lote 2
  - [ ] F2.3 Tipos semánticos faltantes
  - [ ] F2.4 Actualizar plan base + maestro

- [ ] **F3 — Facades multi (admin CRUD)**
  - [ ] F3.1 Módulo #1 (un chat: data/crud/ui split + WAL)
  - [ ] F3.2 Módulo #2
  - [ ] F3.3 Módulo #N…
  - [ ] F3.4 Actualizar plan base + maestro

- [ ] **F4 — `modoAsignacion` computed** (depende de Plan 6 F4)
  - [ ] F4.1 Signal + computed en stores relevantes
  - [ ] F4.2 Consumir en UI de horarios/salones
  - [ ] F4.3 Actualizar plan base + maestro

- [ ] **F5 — Cleanup**
  - [ ] F5.1 Eliminar código muerto identificado
  - [ ] F5.2 Actualizar plan base + maestro

- [ ] **F6 — Split de archivos >300 líneas (FE)**
  - [ ] F6.1 Listar archivos FE que violen `max-lines: 300` (script + tabla en plan base). Al 2026-04-14: `core/services/wal/wal-sync-engine.service.ts` (303), `features/intranet/pages/profesor/classrooms/profesor-salones.component.ts` (321). Esta lista crecerá cuando se arregle G10 y las reglas de capa empiecen a detectar patrones que hoy son invisibles.
  - [ ] F6.2 Dividir lote 1 (un archivo por chat si son grandes; pequeños agrupados)
  - [ ] F6.3 Dividir lote N…
  - [ ] F6.4 Actualizar plan base + maestro

---

### Capa 4 — Observabilidad

#### Plan 7 — Error Trace Backend (paralelo a Capas 2-3)

- [ ] F1 Tabla `ErrorLog` + migración
- [ ] F2 Middleware de captura + correlation
- [ ] F3 Endpoint admin de consulta
- [ ] F4 UI admin de visualización
- [ ] F5 Retención + purga
- [ ] F6 Actualizar plan base + maestro (al final de cada F)

---

### Capa 5 — Patrones continuos + Resiliencia

#### Planes 8-9 — Design Patterns (incrementales)

- [ ] Al tocar cada módulo, aplicar patrones aplicables y marcar en los planes 8/9

#### Plan 10 — Flujos Alternos (último, bloqueado)

- [ ] F1 Desbloqueo: confirmar Capas 1-4 cerradas
- [ ] F2 Inventario de flujos alternos por módulo
- [ ] F3-Fn Implementación por módulo (un chat cada uno)
- [ ] Fn+1 Actualizar plan base + maestro

---

## Quick wins / Deuda detectada (ejecutables fuera de capas)

> Tareas chat-sized **sin dependencias** que arreglan errores pre-existentes ya detectados por lint. Pueden ejecutarse en cualquier momento que haya bandwidth — no bloquean ni son bloqueadas por ninguna capa.

- [ ] **QW1 — Migrar `health-permissions` a WAL (optimistic UI)**
  - [ ] QW1.1 Archivo `features/intranet/pages/admin/health-permissions/services/admin-health-permissions.facade.ts` — migrar `crearPermisoSalida` (línea 103) y `crearJustificacion` (línea 127) a `wal.execute()` con optimistic apply/rollback. Ver [rules/optimistic-ui.md](../rules/optimistic-ui.md).
  - [ ] QW1.2 Archivo `features/intranet/pages/profesor/classrooms/services/health-permissions.facade.ts` — migrar `crearPermisoSalida` (línea 87) y `crearJustificacion` (línea 122) al mismo patrón.
  - [ ] QW1.3 Verificar `npx eslint` deja 0 errores de `wal/no-direct-mutation-subscribe` en estos archivos.
  - [ ] QW1.4 Actualizar maestro marcando QW1 ✅.

---

## Notas de ubicación

- Planes en `educa-web/.claude/plan/` son los de **alcance amplio** (incluyen refs cruzadas al backend).
- Planes en `educa-web/.claude/tasks/` son **transversales al proyecto** pero con granularidad de tarea (enforcement, design patterns).
- Planes en `Educa.API/.claude/plan/` son **exclusivos del backend**.
- Este maestro vive en `educa-web/.claude/plan/maestro.md` porque es el punto donde convergen más referencias cross-repo.
