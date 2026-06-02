# 296 — P43 F6.1 FE: Unified recipient view page

> **Created**: 2026-06-02
> **Plan**: [xrepo-43](../../../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md) §F6 Chat 6.1
> **Repo**: educa-web
> **Depends on**: brief 295 (P43 F6.1 BE — compositor endpoint)
> **Mode**: `/execute` → `/validate`

---

## Objective

New page in admin monitoreo: unified view per recipient email. Collapses info from 8 existing tabs into 1 focused view per person.

- Tabs: Outbox, Blacklist, Cuarentena, Defer events, Auditoría
- Header: recipient email, total entries, last activity, current blacklist/quarantine status
- Each tab shows filtered entries from the compositor endpoint (brief 295)

## Pre-work

- Verify brief 295 BE endpoint is deployed/available
- Read existing monitoreo module for routing, shell, component patterns

## Validation

- lint + tsc clean
- Browser test: navigate to recipient view, verify all tabs populated, links to detail views work
