# 305 — P50 F2: Barrel-only enforcement for core services and data models

> **Created**: 2026-06-05
> **Plan**: [xrepo-50-fe-cohesion-coupling-refactor](../../../educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md)
> **Phase**: F2 (barrel-only enforcement)
> **Repo**: educa-web
> **Modules**: `infra`
> **Mode**: `/execute` (F1 rules already shipped — `1822fa7`)
> **Depends on**: P50 F1 ✅ (core boundary guardrails shipped)

## Objective

Add ESLint rules that reject any direct import of internal implementation files under `core/services/` and `core/data-models/` (or equivalent barrel-protected paths). Consumers must go through the barrel (`index.ts`). Existing bypass imports get `eslint-disable` suppressions tagged `// P50-F2` as debt markers.

## Scope

- **F2a**: barrel enforcement for `core/services/` — lint rule + suppress existing violations
- **F2b**: barrel enforcement for `core/data-models/` — lint rule + suppress existing violations
- F2a and F2b are independent and can run in parallel within the same chat

## Acceptance criteria

- `ng lint` passes with the new rules active
- Every existing barrel bypass has a tagged suppression (`// P50-F2`)
- `ng build --configuration=production` succeeds
- No new direct imports of internal files under the protected paths are possible without lint failure

## What NOT to do

- Do NOT move files (that's F3)
- Do NOT refactor email admin (that's F3b)
- Do NOT touch view unification (that's F4)
- Do NOT remove any existing functionality

## Pre-work

- Read P50 F1 output: what ESLint plugin infrastructure exists, what rules were added
- Read `core/services/index.ts` and `core/data-models/index.ts` (or equivalent barrels) to understand current exports
- Grep for direct imports bypassing the barrel to estimate suppression count

## Validation

- `ng lint` → 0 errors
- `ng build --configuration=production` → success
- Count of `// P50-F2` suppressions logged in commit message
