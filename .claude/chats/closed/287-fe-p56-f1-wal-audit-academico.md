# 287 — P56 F1: WAL audit — academic module (student + professor)

> **Created**: 2026-06-02
> **Plan**: [xrepo-56](../../../../../educa-coord/plans/xrepo-56-wal-audit-academico.md)
> **Phase**: F1 — Map + audit
> **Repo**: educa-web
> **Mode**: `/investigate` → `/audit`

---

## Objective

Audit 14 pages in estudiante/ and profesor/ zones. For each page, determine if mutations block the UI (Level A) or use optimistic state properly.

## Steps

1. Read menu config files at `src/app/features/shared/components/layout/intranet-layout/components/` to map routes → component files
2. For each of the 14 pages, grep for mutation calls (POST/PUT/DELETE, `.subscribe()`, service calls)
3. Check if mutations use WAL facade or direct HTTP calls
4. Classify each page: WAL ✅ | no-block ⚠️ | blocks UI ❌ Level A
5. Produce audit report with fix list for F2

## Pre-work

- Read WAL infrastructure: `src/app/core/wal/` (or wherever the WAL facade lives)
- Understand the optimistic update pattern used in sistema/comunicación modules

## Output

Audit table: 14 pages × classification. Level A pages get individual fix scope estimates.

## Result

**15 pages audited** (7 estudiante + 8 profesor). 10 with mutations, 5 read-only. **0 Level A (blocking UI)** — 100% WAL coverage on all mutations.

### Estudiante (7 pages)

| Page | Mutations | Classification |
|---|---|---|
| Cursos | upload/delete archivos + tareas | ✅ WAL (deletes WAL; uploads blob→POST chain) |
| Notas | none (local simulator) | ⚠️ Read-only |
| Foro | enviarMensaje, crearConversacion | ✅ WAL |
| Mensajería | enviarMensaje, crearConversacion | ✅ WAL |
| Salones | none | ⚠️ Read-only |
| Horarios | none | ⚠️ Read-only |
| Asistencia | none | ⚠️ Read-only |

### Profesor (8 pages)

| Page | Mutations | Classification |
|---|---|---|
| Cursos | CRUD contenido, semanas, archivos, tareas | ✅ WAL |
| Salones | CRUD grupos, assign/remove students, drag-drop, salon notes, health permissions | ✅ WAL |
| Foro | delegates to SalonForoTabComponent | ✅ WAL |
| Mensajería | delegates to SalonMensajeriaTabComponent | ✅ WAL |
| Horarios | none | ⚠️ Read-only |
| Asistencia | registrar asistencia curso | ✅ WAL |
| Calificaciones | CRUD calificaciones, batch grading, periods | ✅ WAL |
| Final Salones | aprobar estudiante, aprobación masiva | ✅ WAL |

### Minor findings (no Level A)

1. `health-permissions.facade.ts` — `onError` only logs, no user-facing toast
2. `health-permissions.facade.ts` — `crearJustificacion` rollback empty (dialog stays closed on failure)
3. `estudiante-cursos.facade.ts` — orphaned blob if upload OK but registration fails (acceptable with TTL)

### F2 scope

No Level A pages to fix. Minor findings are UX polish, not WAL gaps.

## Parallel

This brief can run simultaneously with P45 F2.2 (brief TBD) — different modules, no file overlap.
