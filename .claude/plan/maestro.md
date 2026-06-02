# Plan Maestro — Orden y Dependencias

> **Inicio**: 2026-04-14 · **Última limpieza**: 2026-06-02
> **Principio rector**: "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real."
> **Scope**: solo trabajo FE-only. BE-only → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md). Cross-repo → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md).

<!-- INDEX:START -->
| Key | Plan | Estado | Notas |
|-----|------|--------|-------|
| F1 | Enforcement de Reglas | ~95% | F1-F3 ✅ · F4 parcial (F4.4-F4.5 🔒) · F5 awaiting-prod · F5.3 ✅ |
| F5 | Consolidación Frontend | ⏳ 0% | Tras Plan 4 BE |
| F8 | Design Patterns Backend | Incremental | Al tocar módulos |
| F9 | Design Patterns Frontend | Incremental | Al tocar módulos |
| xP41 | → Correlation Hub (coord) | F1 ✅ · F2 FE ✅ · F3 BE next | ver P41 |
| xP22 | → Endurecimiento correos (coord) | **F3.FE brief 284** (TipoFallo UI) | ver P22 |
| xP42 | → Casing contratos (coord) | Sin trabajo FE pendiente | ver P42 |
| xP43 | → Monitoreo Cowork (coord) | **F5:5.2 FE brief 285** (heatmap + bundle) · 4.1→6.2 pendientes | ver P43 |
| xP45 | → Monitoreo incidencias (coord) | P45:F2.2:FE ⏳ | ver P45 |
| xP52 | → Email outbox retry + diagnostics (coord) | F3-F5 FE ✅ awaiting-prod (275, 277, 279) | ver P52 |
| xP53 | → Duplicate person validation (coord) | F3 FE ✅ awaiting-prod (281) | ver P53 |
| xP54 | → Attendance grade filter (coord) | F3 FE ✅ closed (282) | ver P54 |
<!-- INDEX:END -->

---

## [INV] Inventario de planes FE

> Planes BE-only y cross-repo migrados 2026-05-15 (ADR-0002). Archivados en [history/planes-cerrados.md](../history/planes-cerrados.md).

| Key | # | Plan | Estado | Notas |
|-----|---|------|--------|-------|
| F1 | 1 | Enforcement de Reglas | ~95% | F1-F3 ✅ · F4 parcial (F4.4-F4.5 🔒) · F5 awaiting-prod (brief 137). F5.3 ✅ (3/3 batches) |
| F5 | 5 | Consolidación Frontend | ⏳ 0% | Tras Plan 4 BE |
| F8 | 8 | Design Patterns Backend | Incremental | Al tocar módulos |
| F9 | 9 | Design Patterns Frontend | Incremental | Al tocar módulos |

**Archivados**: P51 (Reporte Mensual ✅ `86bab2e0`), F13 (Test Gaps ✅ brief 247), F46/F47/F48 (barridos ✅ 2026-05-15).

Planes cross-repo con sub-chats FE pendientes: **41** (Correlation Hub), **42** (Casing contratos), **43** (Monitoreo Cowork — Chat 5.1 FE ✅, quedan 4.1→6.2). Completados recientemente: **P52** (F3-F5 FE awaiting-prod), **P53** (F3 FE awaiting-prod), **P54** (F3 FE closed). Detalle en sección Referencias cross-repo.

---

## 📋 Cola priorizada (qué arrancar próximo)

> **Política de orden**: la cola se ordena por **impacto de desbloqueo** — cuántas tareas downstream libera cada ítem. Consolida Carriles + Hallazgos + WAL audit.

### 🔽 Orden de ejecución (por impacto de desbloqueo)

> **Columna `Desbloquea`**: número de tareas/fases downstream que dependen de que este ítem se complete. Score más alto = ejecutar primero.

#### Tier 1 — Alto impacto (desbloquean ≥3 ítems)

| Pos | Key | Plan | Próximo paso concreto | Repo | Desbloquea | Gate |
|---|---|---|---|---|---|---|
| 1 | xP41 | Correlation Hub | F3 BE (persist request lifecycle) — prioridad en coord | xrepo | 4 (F3-F6) | libre |

#### Tier 2 — Impacto medio (desbloquean 1-2 ítems o alto valor)

| Pos | Key | Plan | Próximo paso concreto | Repo | Desbloquea | Gate |
|---|---|---|---|---|---|---|
| 2 | xP45 | Monitoreo incidencias | F2.2:FE — JOIN endpoint `/full` + vista por evento + tabla Trace | xrepo | 0 (leaf, alto valor usuario) | libre (P45:F5:BE ✅) |
| 3 | P10 | Fallbacks críticos | P0.4+ FE (P0.1 ✅ brief 249, P0.2 ✅ brief 262, P0.3 ✅ brief 263) | local | 1 (Plan 10 F1+) | libre |

#### Tier 3 — Independientes (sin downstream)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 4 | P15 | Release ops | F3-F5 (post-deploy + rollback + runbook) — puntero coord | libre |

#### Tier 4 — Bloqueados / baja prioridad

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 5 | xP43 | Monitoreo Cowork | Sub-chats FE (4.1→6.2) — Chat 5.1 FE ✅ | ⏸️ espera F1 F5.3 + otros |
| 6 | F5 | Consolidación FE | Completa tras Plan 4 BE | ⏸️ tras Plan 4 BE |
| 7 | P3 | Matrícula | F3.5 → F4 diseño + implementación UI | 🔒 diseño UI pendiente |
| 8 | P10 | Flujos alternos | F1+ completo (tras Carril B sustancialmente) | 🔒 Carril B |
| 9 | F-010 | Hallazgo Cowork | Auto-abrir dialog edición admin deep-link cross-role | ⏸️ F-011 BE |

#### Tier 5 — Incrementales (al tocar módulos)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 10 | F8 | Design Patterns BE | Aplicar al tocar módulos BE | incremental |
| 11 | F9 | Design Patterns FE | Aplicar al tocar módulos FE | incremental |

**Siguiente accionable**: **xP41** (pos 1) — Correlation Hub F3 BE (persist request lifecycle). **xP45 F2.2:FE** (pos 2) — JOIN `/full` + vista por evento.

### 🟣 Verificaciones post-deploy (`/verify <NNN>`)

6 briefs en `awaiting-prod/`:

| Brief | Scope |
|-------|-------|
| `169` | Plan 43 Chat 3.1b FE: SMTP response en drawers monitoreo |
| `268` | WAL migration: 6 mutaciones profesor (academico) |
| `275` | P52 F3 FE: retry UI + diagnostic drawer |
| `277` | P52 F4 FE: SMTP code filter + sender failure tile |
| `279` | P52 F5 FE: attendance gap tile in dashboard día |
| `281` | P53 F3 FE: duplicate person confirmation dialog |

Movidos a `closed/` (sync 2026-06-01): 119 (WAL DELETE audit), 137 (F5 wrappers), 147 (P43 Chat 2.1 FE), 199 (F-021 deep-link), 213 (login cookie), 134 (P28 Chat 4), 140 (F-018 botón).

### Notas operativas

- **`running/`**: vacío · **`open/`**: 2 briefs (284, 285) · **`waiting/`**: vacío · **`troubles/`**: vacío
- **Último cierre**: 282 (P54 F3 FE attendance grade filter alignment) → closed/ 2026-06-01
- **Último saneamiento**: 2026-06-02 — pilot session: materialized briefs 284 (P22 F3.FE) + 285 (P43 F5:5.2 FE). Old briefs 281/282 cleaned from open/ (already in awaiting-prod/closed).

---

## 🔧 Hallazgos Cowork pendientes

- ⏳ **F-010 FE** — auto-abrir dialog de edición admin desde deep-link cross-role. Depende de F-011 BE desplegado.

Hallazgos cerrados y Cowork 2026-05-19: ver [history/planes-cerrados.md](../history/planes-cerrados.md) y [`claude-cowork/reporte-cowork-2026-05-19.md`](../claude-cowork/reporte-cowork-2026-05-19.md).

---

## Bloqueos activos

| Si cierro… | Desbloqueo… |
|------------|-------------|
| Plan 2/B (state machines BE) | Plan 1 F4.4 (INV-T* tests) |
| Plan 3 F3.5 (diseño UI matrícula) | Plan 3 F4 (implementación matrícula) |
| Plan 3 F4 (matrícula) | Plan 1 F4.5 (INV-M*) |
| Carril B sustancialmente | Plan 10 F1+ (flujos alternos completo) |

---

## Carriles

> Ítems activos consolidados en §Cola priorizada. Carriles preservados como contexto histórico.

### Carril A — Features ✅ CERRADO (2026-04-16)

Plan 6 completado. 1321 tests. Detalle en §Inventario (archivados inline).

### Carril D — Confiabilidad sistémica

→ En cola: F13 (pos 7), P15 F3-F5 (pos 8), P10 P0 (pos 4).
Cerrados: Plan 15 F1 ✅ · F2 ✅. Plan 16 F1 ✅ (BE-only). Plan 12 F1 ✅ (BE-only).
BE-only (no en cola FE): Plan 16 F2-F5, Plan 12 F2-F5, Plan 7 F1-F2. Cross-repo: Plan 14 F1-F6.

### Carril B — Deuda técnica

→ En cola: F1 F5.3 (pos 1), F5 (pos 10).
BE-only (no en cola FE): Plan 2/B (state machines), Plan 2/C (split >300 ln), Plan 4 (consolidación BE).

### Carril C — Diferido

→ En cola: Plan 3 F3.5→F4 (pos 11), Plan 10 F1+ (pos 12), F8/F9 (pos 14-15).

---

## Auditoría WAL + Cache (standalone) — ✅ CERRADA

Completada 2026-05-26. H1+H8+H9 ✅, H7 ✅ (brief 124), H2-H6 archivado.

---

## Deuda SQL en BD de prueba (no bloqueante)

- [ ] Agregar columnas `ERL_RequestBody/Headers/ResponseBody` a `ErrorLog` en BD prueba
- [ ] DROP `Asistencia_deprecated_2026_04` ~2026-06-20

## Pendiente futuro (seguridad, sin presión)

- [ ] Rotar credential Firebase en Firebase Console (expuesta en git history BE)
- [ ] `git rm --cached` del JSON de Firebase + actualizar Azure env var

---

## Notas de ubicación

- `educa-web/.claude/plan/` — planes FE de alcance amplio
- `educa-web/.claude/tasks/` — tareas transversales
- `Educa.API/.claude/plan/` — planes BE exclusivos
- `educa-coord/plans/` — planes cross-repo
