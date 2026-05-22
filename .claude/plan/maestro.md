# Plan Maestro — Orden y Dependencias

> **Inicio**: 2026-04-14 · **Última limpieza**: 2026-05-22
> **Principio rector**: "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real."
> **Scope**: solo trabajo FE-only. BE-only → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md). Cross-repo → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md).

<!-- INDEX:START -->
| Key | Plan | Estado | Notas |
|-----|------|--------|-------|
| F1 | Enforcement de Reglas | ~90% | F1-F3 ✅ · F4 parcial · F5 awaiting-prod |
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
| F1 | 1 | Enforcement de Reglas | ~90% | F1-F3 ✅ · F4 parcial (F4.4-F4.5 🔒) · F5 awaiting-prod (brief 137). F5.3 re-exports pendiente |
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

> Formato: `N. [Plan · Chat · Tipo] — scope — razón de prioridad`.

### 🟢 Pullable FE-only

_(Vacía — no hay trabajo FE-only desbloqueado en este momento.)_

### ⏸️ Future FE-only (bloqueado por BE u otro)

- **[xP45] P45:F2.2:FE — UI rework `/incidencias/errores`** — JOIN endpoint `/full` + vista por evento `ErrorLog` + tab Trace real. Libre (P45:F5:BE ✅ shipped). Sub-plan en [`educa-coord/plans/xrepo-45-monitoreo-incidencias-rework.md`](../../../educa-coord/plans/xrepo-45-monitoreo-incidencias-rework.md) §F2.

### 🔗 Referencias cross-repo (sub-chats FE de planes cross-repo)

> Prioridad global en [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md). Acá solo para visibilidad.

- **[xP43] Monitoreo Cowork** → [`xrepo-43`](../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md). Sub-chats FE pendientes:
  - Chat 3.2 (Detalle correo + buscador A4+A5) — espera F1
  - Chat 4.1 (Filtros + paginación Bandeja A2+B5) — espera F1
  - Chat 4.2 (Filtros server-side Errores A9+A10+B5) — depende Chat 1.2
  - Chat 4.3 (Acciones inline reintentar/blacklist/export B6) — depende F3
  - Chat 5.1 (Sparklines KPI B8) — depende Chat 1.1
  - Chat 5.2 (Heatmap latencia + bundle telemetría B9+B10) — depende Chat 1.2+1.3
  - Chat 6.1 (Vista unificada por destinatario B1) — depende F1+F3+F4
  - Chat 6.2 (Links bidireccionales + Gap accionable B12) — depende 6.1+4.3
- **[xP41] Correlation Hub** → [`xrepo-41`](../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md). Próximo FE: Chat 9 (search global) ⏳ requiere BE.
- **[xP42] Casing contratos** → [`xrepo-42`](../../../educa-coord/plans/xrepo-42-case-drift.md). Sin trabajo FE pendiente; P42:F2:BE en cola BE.

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

### Carril A — Features ✅ CERRADO (2026-04-16)

Plan 6 completado. 1321 tests. Detalle en [history/planes-cerrados.md](../history/planes-cerrados.md).

### Carril D — Confiabilidad sistémica

> Checklist ejecutable. Una subfase por chat. Al cerrar: actualizar plan base + maestro.

**Plan 15 — Release Protocol**: F1 ✅ · F2 ✅ · F3-F5 ⏳
**Plan 16 — Auditoría Seguridad**: F1 ✅ · F2-F5 ⏳ (BE-only, vive en maestro BE)
**Plan 12 — BE Test Gaps**: F1 ✅ (764 tests) · F2-F5 ⏳ (BE-only)
**Plan 13 — FE Test Gaps**: F1-F5 ⏳
**Plan 14 — Contratos FE-BE**: F1-F6 ⏳ (cross-repo)
**Plan 7 — Error Trace**: F1-F2 ⏳ (BE-only) · F3+ diferido
**Plan 10 P0 — Fallbacks críticos**: P0.1-P0.3 ⏳ (FE)

### Carril B — Deuda técnica (tras Carril D base)

- Plan 1 F5.3 — re-exports `@shared` → `@intranet-shared` (48 archivos, 3-4 chats)
- Plan 2/B — State Machines (3 faltantes, BE) — desbloquea Plan 1 F4.4
- Plan 2/C — Split archivos >300 ln BE
- Plan 4 — Consolidación BE
- Plan 5 — Consolidación FE

### Carril C — Diferido

- Plan 3 F3.5 → F4 — Matrícula (🔒 diseño UI pendiente)
- Plan 10 F1+ — Flujos alternos completo (🔒 Carril B)
- Planes 8-9 — Design Patterns (incrementales)

---

## Auditoría WAL + Cache (standalone)

- [x] H1+H8+H9 ✅ (2026-05-04)
- [ ] H7 — Normalizar naming `WAL_CACHE_MAP` (P1, 1 chat)
- [ ] H2-H6, H10 — Fixes cosméticos (P2, 1 chat)

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
