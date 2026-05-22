# Plan Maestro — Orden y Dependencias

> **Inicio**: 2026-04-14 · **Última limpieza**: 2026-05-22
> **Principio rector**: "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real."
> **Scope**: solo trabajo FE-only. BE-only → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md). Cross-repo → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md).

<!-- INDEX:START -->
| Key | Plan | Estado | Notas |
|-----|------|--------|-------|
| F1 | Enforcement de Reglas | ~92% | F1-F3 ✅ · F4 parcial · F5 awaiting-prod · F5.3 batch 1/3 ✅ |
| F5 | Consolidación Frontend | ⏳ 0% | Tras Plan 4 BE |
| F8 | Design Patterns Backend | Incremental | Al tocar módulos |
| F9 | Design Patterns Frontend | Incremental | Al tocar módulos |
| F13 | Frontend Test Gaps | ⏳ 0% | F1-F5 pendientes |
| F46 | Drift documental `.claude/` FE | ✅ archived | Cerrado 2026-05-15 |
| F47 | Links rotos maestro | ✅ archived | Cerrado 2026-05-15 |
| F48 | Barrido `appendTo="body"` | ✅ archived | Cerrado 2026-05-15 |
| xP41 | → Correlation Hub (coord) | F1 timeline FE ⏳ | ver P41 |
| xP42 | → Casing contratos (coord) | Sin trabajo FE pendiente | ver P42 |
| xP43 | → Monitoreo Cowork (coord) | Sub-chats FE pendientes | ver P43 |
| xP45 | → Monitoreo incidencias (coord) | P45:F2.2:FE ⏳ | ver P45 |
<!-- INDEX:END -->

---

## [INV] Inventario de planes FE

> Planes BE-only y cross-repo migrados 2026-05-15 (ADR-0002). Archivados en [history/planes-cerrados.md](../history/planes-cerrados.md).

| Key | # | Plan | Estado | Notas |
|-----|---|------|--------|-------|
| F1 | 1 | Enforcement de Reglas | ~92% | F1-F3 ✅ · F4 parcial (F4.4-F4.5 🔒) · F5 awaiting-prod (brief 137). F5.3 batch 1/3 ✅ (brief 217) — batch 2 components + batch 3 services pendientes |
| F5 | 5 | Consolidación Frontend | ⏳ 0% | Tras Plan 4 BE |
| F8 | 8 | Design Patterns Backend | Incremental | Al tocar módulos |
| F9 | 9 | Design Patterns Frontend | Incremental | Al tocar módulos |
| F13 | 13 | Frontend Test Gaps | ⏳ 0% | F1 interceptores, F2 páginas admin, F3 flujos, F4 WAL, F5 shared |
| F46 | 46 | Drift documental `.claude/` FE | ✅ 100% | Cerrado 2026-05-15 |
| F47 | 47 | Links rotos maestro | ✅ 100% | Cerrado 2026-05-15 |
| F48 | 48 | Barrido `appendTo="body"` | ✅ 100% | Cerrado 2026-05-15 |

Planes cross-repo con sub-chats FE pendientes: **41** (Correlation Hub), **42** (Casing contratos), **43** (Monitoreo Cowork). Detalle en sección Referencias cross-repo.

---

## 📋 Cola priorizada (qué arrancar próximo)

> **Política de orden**: la cola se ordena por **impacto de desbloqueo** — cuántas tareas downstream libera cada ítem. Consolida Carriles + Hallazgos + WAL audit.

### 🔽 Orden de ejecución (por impacto de desbloqueo)

> **Columna `Desbloquea`**: número de tareas/fases downstream que dependen de que este ítem se complete. Score más alto = ejecutar primero.

#### Tier 1 — Alto impacto (desbloquean ≥3 ítems)

| Pos | Key | Plan | Próximo paso concreto | Repo | Desbloquea | Gate |
|---|---|---|---|---|---|---|
| 1 | F1 | Enforcement de Reglas | F5.3 batch 2 — components re-exports (~20-30 archivos) | local | ~4 (xP43 Chats 3.2, 4.1, 6.1+) | libre |
| 2 | xP41 | Correlation Hub | F1 timeline FE + F2-F6 — prioridad en coord | xrepo | 5 (Chat 9 + F2-F6) | libre |

#### Tier 2 — Impacto medio (desbloquean 1-2 ítems o alto valor)

| Pos | Key | Plan | Próximo paso concreto | Repo | Desbloquea | Gate |
|---|---|---|---|---|---|---|
| 3 | xP45 | Monitoreo incidencias | F2.2:FE — JOIN endpoint `/full` + vista por evento + tabla Trace | xrepo | 0 (leaf, alto valor usuario) | libre (P45:F5:BE ✅) |
| 4 | P10 | Fallbacks críticos | P0.1-P0.3 FE | local | 1 (Plan 10 F1+) | libre |

#### Tier 3 — Closers (cierran un plan completo)

| Pos | Key | Plan | Próximo paso concreto | Cierra | Gate |
|---|---|---|---|---|---|
| 5 | H7 | WAL audit | Normalizar naming `WAL_CACHE_MAP` (P1, 1 chat) | WAL audit | libre |
| 6 | H2-H6 | WAL audit | Fixes cosméticos (P2, 1 chat) | WAL audit | libre |

#### Tier 4 — Independientes (sin downstream)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 7 | F13 | FE Test Gaps | F1-F5 (interceptores, páginas admin, flujos, WAL, shared) | libre |
| 8 | P15 | Release ops | F3-F5 (post-deploy + rollback + runbook) — puntero coord | libre |

#### Tier 5 — Bloqueados / baja prioridad

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 9 | xP43 | Monitoreo Cowork | Sub-chats FE (3.2→6.2) — prioridad en coord | ⏸️ espera F1 F5.3 + otros |
| 10 | F5 | Consolidación FE | Completa tras Plan 4 BE | ⏸️ tras Plan 4 BE |
| 11 | P3 | Matrícula | F3.5 → F4 diseño + implementación UI | 🔒 diseño UI pendiente |
| 12 | P10 | Flujos alternos | F1+ completo (tras Carril B sustancialmente) | 🔒 Carril B |
| 13 | F-010 | Hallazgo Cowork | Auto-abrir dialog edición admin deep-link cross-role | ⏸️ F-011 BE |

#### Tier 6 — Incrementales (al tocar módulos)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 14 | F8 | Design Patterns BE | Aplicar al tocar módulos BE | incremental |
| 15 | F9 | Design Patterns FE | Aplicar al tocar módulos FE | incremental |

**Siguiente accionable**: **F1 F5.3** (pos 1) — re-exports, desbloquea xP43 sub-chats. **xP45 F2.2:FE** (pos 3) — JOIN `/full` + vista por evento.

### 🟣 Verificaciones post-deploy (`/verify <NNN>`)

8 briefs en `awaiting-prod/`:

| Brief | Scope |
|-------|-------|
| `119` | WAL DELETE audit soft vs hard |
| `134` | Plan 28 Chat 4a+4b: self-service AA + tab director-profesores |
| `137` | Plan 1 F5: hardening de wrappers (barrel + lint) |
| `140` | Fix F-018: botón "Registrar" disabled en asistencia manual (tipoPersona=A) |
| `147` | Plan 43 Chat 2.1 FE: badge transiente + textarea blacklist + link auditoría |
| `169` | Plan 43 Chat 3.1b FE: SMTP response en drawers monitoreo |
| `199` | F-021: deep-link `/intranet/admin/usuarios?dni=X&autoOpen=true` |
| `213` | Fix FE: pre-login cookie cleanup + error handling hardening |

### Notas operativas

- **`running/`**: vacío · **`open/`**: vacío · **`waiting/`**: 2 briefs BE (081, 109)
- **Último saneamiento**: 2026-05-22

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

Plan 6 completado. 1321 tests. Detalle en [history/planes-cerrados.md](../history/planes-cerrados.md).

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

## Auditoría WAL + Cache (standalone)

- [x] H1+H8+H9 ✅ (2026-05-04)
- → En cola: H7 (pos 5), H2-H6/H10 (pos 6).

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
