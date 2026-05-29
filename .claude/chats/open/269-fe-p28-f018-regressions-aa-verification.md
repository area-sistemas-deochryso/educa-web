# 269 · FE — Fix F-018 regressions (R1+R2) + verify P28 AA completeness

> **Created**: 2026-05-29 · **Repo**: `educa-web` (main)
> **Mode**: `/investigate` → `/execute` → `/validate`
> **Plan**: 28 · **Closes**: briefs 134 (troubles/) + 140 (troubles/)
> **Origin**: pilot session 2026-05-29. Consolidates two deadlocked briefs into one actionable unit.

## Why this brief exists

Briefs 134 and 140 were in `troubles/` blocking each other:
- 140 (F-018 fix) had 2 regressions found 2026-05-25 → blocked 134's 4b-tab verification
- 134 (P28 Chat 4 AA) couldn't close without 140 resolved → blocked P28

In reality there's no circular dependency — it's a linear chain: fix R1+R2 → verify P28 → close both. This brief executes that chain.

## All shipped code is still in place

Both 134 and 140 had their code shipped to main. What's pending:
- 140: 2 post-deploy regressions need investigation + fix
- 134: verification was inconclusive on 2026-05-25 (4a "dudoso", 4b-tab blocked)

## Tasks

### T1 — Fix R1: "Solo salida" can't select persona (bug)

- **Repro**: Dialog asistencia manual → Tipo registro: "Solo salida" → persona selector doesn't work → Registrar stays disabled
- **Hypothesis**: the `sedeId` fix (brief 140 original fix) covered "Solo entrada" path but the "Solo salida" branch (`tipoRegistro === 'S'`) has an additional unhandled dependency in the `isFormValid` computed
- **Approach**: trace the computed/signal that controls button enablement. Compare `tipoRegistro === 'E'` path (works) vs `'S'` path (broken). Fix the validation branch.

### T2 — Fix R2: manual attendance disappears on reload (bug)

- **Repro**: Register manual attendance → POST returns 200 → reload page → row not visible
- **Hypothesis**: GET endpoint or client-side filter (fecha, tipo, estado, tipoPersona) excludes the newly created record
- **Approach**: check what the POST actually writes (especially fecha, tipoRegistro fields). Then check what the GET filters on. Find the mismatch.

### T3 — Verify 4a: AA self-service routing (verification)

- **Check**: login as AA → navigate to `/intranet/asistencia` → should see self-service view (own attendance), NOT admin panel
- **Context**: code shipped in brief 134 — `isAdminRole` was renamed to `isDirectorPanelRole` excluding AA. The shell branch should route AA to `<app-attendance-asistente-admin-propia />`
- **If broken**: fix the routing branch in `AttendanceComponent`

### T4 — Verify 4b-tab: director AA tab (verification, after T1+T2)

- **Check**: login as Director → `/intranet/admin/asistencias` → tab "Asistentes Administrativos" exists → can register manual attendance for AA
- **Depends on**: T1+T2 resolved (dialog must work for tipoPersona='A')

## Execution plan

1. `/investigate`: grep for the dialog component (asistencia manual / registro manual). Trace R1 (Solo salida validation) and R2 (GET filter mismatch). Also check AA routing in AttendanceComponent.
2. `/execute`: fix R1 + R2. Fix 4a routing if broken.
3. `/validate`: lint + build + test. Manual repro for all 3 tipoPersona (E, P, A) × both tipoRegistro (E, S).

## Key files (from brief 140 context)

- Dialog component: `features/intranet/pages/admin/asistencias/components/` (grep for `asistencia-manual` or `registro-manual`)
- Form validation: signal/computed `isFormValid` or `canSubmit` in the dialog
- Shell routing: `AttendanceComponent` — `isDirectorPanelRole` branch
- Store: `attendances-admin.store.ts`

## On completion

- Close brief 269 → `closed/`
- Close brief 140 (in `troubles/`) → `closed/` with reference to 269
- Close brief 134 (in `troubles/`) → `closed/` with reference to 269
- P28 FE: if all 4 tasks pass, mark Chat 4 FE as complete in maestro

## Out of scope

- PDF/Excel for AAs in director-tab (brief 134 listed as future work)
- Mes paginado in director-tab (needs BE endpoint)
- Tests vitest beyond regression guards
- Chat 6 BE gap-fix (INV-AD08 authorization)
