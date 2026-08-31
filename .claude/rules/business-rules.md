# Business Rules — educa-web

## REST Contracts FE↔BE

**`INV-CONTRACT01`** (JSON casing, camelCase) and **`INV-CONTRACT02`** (CORS Expose-Headers) are cross-repo wire contracts — single source of truth is `../educa-coord/contracts/api-protocol.md` (per `COORD.md` §1.3, same criterion applied to `INV-VIEWAS01` above). Read them on-demand when adding a BE response header or touching (de)serialization.

### INV-CONTRACT03 — WAL endpoint persistence casing

`WalEntry.endpoint` is persisted in **lowercase** to match the keys in `api-schema-versions.ts`. The `WalService.add()` normalizes with `.toLowerCase()` before storage.

**Rationale**: `api-schema-versions.ts` defines endpoint keys in lowercase. A case mismatch causes invisible cache misses in the WAL lookup — the entry exists but is never found.

## Identity & "ver como" (view-as)

**`INV-VIEWAS01`** — cross-repo invariant (has a BE clause via `ResolveViewAsIdentity()`), lives in `../educa-coord/invariants/permisos.md` (single source of truth per `COORD.md` §1.3). Read it on-demand whenever you touch identity resolution, a per-user cache (in-memory, IndexedDB/SW), a role-dispatcher component, or an identity display label under `ViewAsContextService`.
