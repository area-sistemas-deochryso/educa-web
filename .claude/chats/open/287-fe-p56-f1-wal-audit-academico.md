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

## Parallel

This brief can run simultaneously with P45 F2.2 (brief TBD) — different modules, no file overlap.
