# 294 — P41 F2 FE: Lateral navigation anchors in correlation hub

> **Created**: 2026-06-02
> **Plan**: [xrepo-41](../../../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md) §F2
> **Phase**: F2 FE — lateral navigation
> **Repo**: educa-web
> **Depends on**: brief 289 (P41 F1 FE ✅) + P41 F2 BE ✅ (awaiting-prod, chat 132)
> **Mode**: `/execute` → `/validate`

---

## Objective

Render outbound navigation buttons from each event row in the correlation hub:
- To error group Kanban (by group code)
- To email outbox filtered by recipient
- To feedback report detail

Sidebar section listing related correlation IDs when the snapshot includes them (data added by F2 BE).

## Pre-work

- Read F1 timeline component (brief 289 output) for the event row structure
- Read F2 BE snapshot response shape to understand new fields (group code, related correlations)
- Read existing Kanban, outbox, feedback routes for link targets

## Validation

- lint + tsc clean
- Browser test: open hub, verify navigation buttons work, related correlations sidebar populated
