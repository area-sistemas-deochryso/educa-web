# Plan Maestro — Orden y Dependencias

> **Inicio**: 2026-04-14 · **Última limpieza**: 2026-06-09
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
| xP22 | → Endurecimiento correos (coord) | F3.FE ✅ awaiting-prod (284) | ver P22 |
| xP43 | → Monitoreo Cowork (coord) | F5:5.2 FE ✅ awaiting-prod (285) · F6.1 FE ✅ awaiting-prod (296) · F6.2 FE ✅ awaiting-prod (297) · F6.3 FE ✅ awaiting-prod (303) · F6.3 follow-up ✅ awaiting-prod (304) | ver P43 |
| xP53 | → Duplicate person validation (coord) | F3 FE ✅ awaiting-prod (281) | ver P53 |
| xPanelAyuda | → Panel de ayuda intranet (coord) | F1-F3 BE ✅ · F4 FE ✅ awaiting-prod (479, `chat/479-fe-panel-ayuda-qa-shell`) · F5 FE ✅ awaiting-prod (480, `chat/480-fe-panel-ayuda-ticket`) · F6 FE ✅ awaiting-prod (481, `chat/481-fe-panel-ayuda-salud-sede`) | ver xrepo-panel-ayuda-intranet |
| xP92 | → Admin "ver como" profesor/estudiante — gate + wrapper de módulo (coord P92 F2) | 🔒 bloqueado por F1 (`Educa.API` 498) — brief 499 sin arrancar | ver P92 |
| xModoInformativo | → Modo informativo interactivo (coord xrepo-96) | F1-F4 ✅ y F7 shell+Inicio (527) ✅ — mergeados a `main` local, sin push. F7 acotado a 3 módulos (Apoderado descartado, backlog tibio); Estudiante es el próximo brief · F5-F6 pendientes | ver xrepo-96 |
| xP79 | → EduUI: PrimeNG replacement library (coord P79 F6) | F1-F5 (librería, `educa-libs`) ✅. F6b-F6g ✅ mergeados a `main` de `educa-libs` (`1c9d3f8`). F6 (swap real acá) 🟢 en `running/` — brief 588 (worktree, ~32 commits). **Los 6 pasos del brief cerrados**: 100% del codebase migrado a `edu-ui`, `primeng`/`@primeng/themes` removidos, shim de color tokens hardcodeado (verificado numéricamente claro+oscuro), 123 archivos de CSS muerto removidos, bundle bajó de ~1.06-1.07MB a 906.32kB (budget warning desaparecido). **Paso 6 encontró y cerró un bug crítico**: `edu-dialog`/`edu-drawer` no tenían slots de header/footer — varios formularios admin tenían los botones Guardar/Cancelar invisibles (F6g cerró el gap en `educa-libs`). Suite unit 100% verde (2529/2529), lint/build finales verdes. e2e Playwright: selectores corregidos, no ejecutables sin backend real (deuda documentada). Brief cerrado (2026-08-25) → `awaiting-prod` (588), pendiente smoke test visual en prod tras deploy. Worktree mergeado a `main` (`78ea1cd9`, merge `chat/588-...` → `integration/588-...` → `main`) y limpiado (`/wt-clean` — branches y directorio eliminados). `exclusive` liberado — chat 345 (P70 Angular22) puede retomar F1. P79 F1-F6 completo salvo `/verify 588` post-deploy. **F8 ✅ cerrado** — brief 589 (auditoría de fidelidad visual 597 en `educa-libs` encontró 3 gaps de causa raíz en `educa-web`, corregidos: `EduSortableColumn` sin importar en `usuarios-table`, `.grados-button` migrado a props semánticas `[outlined]`/`severity` en vez de CSS override, `.tag-neutral` restaurado con selector correcto + `!important` — necesario porque `edu-tag.scss` usa `ViewEncapsulation.Emulated`, que le da al `[data-severity]` del componente más especificidad real que la clase global). Copia vendorizada de `edu-ui` resincronizada (6 componentes: edu-tag/table/message/spinner/skeleton/input-icon). Verificado en vivo local vs `educa.com.pe/intranet` real (switcher de sesión "CODE CLAUDE") sobre las 6 páginas de 597 — sin diferencias nuevas. Sin worktree (`isolation: main`) — el worktree P70 (595) sigue `exclusive: true` sobre `src/**` sin mergear a `main`. **P79 completo** (F1-F8) salvo `/verify 588` post-deploy. | ver xrepo-79 |
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

Planes cross-repo con sub-chats FE pendientes: **41** (Correlation Hub F3-F6), **43** (all phases ✅ awaiting-prod), **50** (F2 brief 305 + F3-F4). Archivados en coord (sync 2026-06-09): P42, P45, P52, P54, P28, P38, P56.

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
#### Tier 3 — Independientes (sin downstream)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 4 | P15 | Release ops | F3-F5 (post-deploy + rollback + runbook) — puntero coord | libre |

#### Tier 4 — Bloqueados / baja prioridad

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 5 | xP43 | Monitoreo Cowork | F6.3 FE ✅ awaiting-prod (303) · student profile page ✅ awaiting-prod (304) | ⏸️ awaiting-prod |
| 6 | F5 | Consolidación FE | Completa tras Plan 4 BE | ⏸️ tras Plan 4 BE |
| 7 | P3 | Matrícula | F3.5 → F4 diseño + implementación UI | 🔒 diseño UI pendiente |
| 8 | P10 | Flujos alternos | F1+ completo (tras Carril B sustancialmente) | 🔒 Carril B |
| 9 | F-010 | Hallazgo Cowork | Auto-abrir dialog edición admin deep-link cross-role | ⏸️ F-011 BE |

#### Tier 5 — Incrementales (al tocar módulos)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 10 | F8 | Design Patterns BE | Aplicar al tocar módulos BE | incremental |
| 11 | F9 | Design Patterns FE | Aplicar al tocar módulos FE | incremental |

**Siguiente accionable**: **xP41** F3 BE (persist request lifecycle). Admin block cerrado (P62-P66 ✅/descartado). P50 F3a ✅ (331 closed).

### 🟣 Verificaciones post-deploy (`/verify <NNN>`)

- ⏳ **462** — soporte táctil `admin/campus` (Pointer Events + pinch-zoom + responsive). Lint/build OK, layout responsive verificado con iframe 375px. Pendiente: QA en vivo de pan/pinch/drag táctil real — bloqueado en la sesión por cuenta de prueba sin `SedeId` (400 en `/api/campus/pisos`).

### Notas operativas

- **`running/`**: vacío · **`open/`**: 2 briefs (577, 578) · **`awaiting-prod/`**: 4 briefs (462, 554, 559, 588) · **`waiting/`**: vacío · **`troubles/`**: vacío
- **Último cierre**: 589 (P79 F8 — fix de consumo `edu-ui` encontrados en auditoría de fidelidad visual 597: sort de `usuarios-table`, botón outline de `cursos`, `.tag-neutral` restaurado con `!important` por especificidad de `ViewEncapsulation.Emulated`; re-sync de 6 componentes vendorizados; verificado en vivo local vs prod) → `closed/`, sin worktree (`isolation: main`), 2026-08-26. P79 completo (F1-F8) salvo `/verify 588` post-deploy.
- **Cierre previo**: 588 (P79 F6 swap — migración completa de PrimeNG a `edu-ui`, 277 archivos, bug crítico de slots header/footer en dialog/drawer encontrado y resuelto vía F6g, 2529/2529 tests, bundle 906.32kB) → `awaiting-prod`, worktree `chat/588-p79-f6-swap-eduui-primeng-migration` mergeado y limpiado, 2026-08-25.
- **Verificación post-deploy 2026-08-20** (`/verify`, disparado desde `/triage`): 461/464/465 pasaron QA en vivo contra TestConnection (backend `dotnet run` local + browser con switcher de login) → `closed/`. 461 con salvedad: el remanente grupo 4 (`videoconferencia-sala`/`campus-3d-view` con sesión real activa) solo se pudo confirmar por código, no en vivo — no reproducible con datos de prueba, igual que en el cierre original.
- **Último saneamiento**: 2026-08-20 — reconciliación manual (sin comando `/sync-maestro` implementado): briefs 332/458/480/481 referenciados como pendientes ya estaban cerrados y purgados en `e0a2b9c6`; se eliminó un duplicado stray sin trackear de 392 en `open/`.

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

→ En cola: F13 (pos 7), P15 F3-F5 (pos 8).
Cerrados: Plan 15 F1 ✅ · F2 ✅. Plan 16 F1 ✅ (BE-only). Plan 12 F1 ✅ (BE-only). Plan 10 P0 ✅ (P0.1-P0.4, brief 560).
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
