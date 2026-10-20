# Plan Maestro — Orden y Dependencias

> **Inicio**: 2026-04-14 · **Última limpieza**: 2026-09-22
> **Principio rector**: "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real."
> **Scope**: solo trabajo FE-only. BE-only → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md). Cross-repo → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md).
> **Historial**: todos los planes 100% cerrados (BAudit2 12/12, BAudit3 6/6, xP79, xP107, xP22/43/53, etc.) se movieron a [`history/planes-cerrados.md`](../history/planes-cerrados.md) en esta limpieza (2026-09-22).

<!-- INDEX:START -->
| Key | Plan | Estado | Notas |
|-----|------|--------|-------|
| F1 | Enforcement de Reglas | ~95% | F1-F3 ✅ · F4 parcial (F4.4-F4.5 🔒) · F5 bloqueado por Plan 4 BE |
| F5 | Consolidación Frontend | ⏳ 0% | Tras Plan 4 BE |
| F8 | Design Patterns Backend | Incremental | Al tocar módulos |
| F9 | Design Patterns Frontend | Incremental | Al tocar módulos |
| xP41 | → Correlation Hub (coord) | ver P41 en coord (F4/F6 diseñadas, briefs 848-851; F5 materializado) | puede tocar FE — ver maestro coord |
| xP50 | FE cohesion & coupling refactor (coord) | ✅ CERRADO (2026-09-25) — F1-F3a-F3b ✅ · F4 ❌ descartado | Service move + email consolidation |
<!-- INDEX:END -->

---

## Inventario de planes FE

> Planes BE-only y cross-repo están referenciados acá. Detalle histórico de todos los cerrados en [`history/planes-cerrados.md`](../history/planes-cerrados.md).

| Key | Plan | Estado |
|-----|------|--------|
| F1 | Enforcement de Reglas | ~95% completo |
| F5 | Consolidación Frontend | Bloqueado por Plan 4 BE |
| F8 | Design Patterns Backend | Incremental |
| F9 | Design Patterns Frontend | Incremental |
| xP41 | Correlation Hub (coord) | → ver maestro coord |
| xP50 | FE cohesion & coupling refactor (coord) | ✅ CERRADO (2026-09-25) |

---

## 📋 Cola priorizada

**Briefs en `open/` (2026-10-20)**: 852 (piloto de Signal Forms, P70 F4, baja). 847 (bucle de POST `/vista`, P110 F14) ✅ cerrado 2026-10-20 en `chat/847-…`, pendiente `/wt-merge`. Resto de la cola vacío — todos los planes Tier 0 (BAudit2, BAudit3) cerraron en 2026-09-22. `xP50` (todas sus fases FE) cerró completo el 2026-09-25. Siguientes candidatos:

1. **xP41 F4b/F6b** (briefs 849 y 851 en coord, tras 848/850 BE) — puntero `educa-coord`
2. **F1 F4.4-F4.5** (INV-T*, INV-M* tests) — bloqueado por Plan 2/B BE
3. **F5** (Consolidación FE) — bloqueado por Plan 4 BE

---

## 🔧 Hallazgos Cowork pendientes

- ⏳ **F-010 FE** — auto-abrir dialog de edición admin desde deep-link cross-role. Depende de F-011 BE desplegado.

Historial: ver [`claude-cowork/reporte-cowork-2026-05-19.md`](../claude-cowork/reporte-cowork-2026-05-19.md).

---

## Bloqueos activos

| Si cierro… | Desbloqueo… |
|------------|-------------|
| Plan 2/B (state machines BE) | Plan 1 F4.4 (INV-T* tests) |
| Plan 3 F3.5 (diseño UI matrícula) | Plan 3 F4 (implementación matrícula) |
| Plan 3 F4 (matrícula) | Plan 1 F4.5 (INV-M*) |
| Carril B sustancialmente | Plan 10 F1+ (flujos alternos completo) |

---

## Carriles (contexto histórico)

### Carril A — Features ✅ CERRADO (2026-04-16)

Plan 6 completado. 1321 tests.

### Carril D — Confiabilidad sistémica

→ Cerrados: Plan 15 F1-F2 ✅, Plan 16 F1 ✅, Plan 12 F1 ✅, Plan 10 P0 ✅.

### Carril B — Deuda técnica

→ BE-only: Plan 2/B (state machines), Plan 2/C (split >300 ln), Plan 4 (consolidación BE).

### Carril C — Diferido

→ Esperando decisiones arquitectónicas.
