# Business Rules — educa-web

## REST Contracts FE↔BE

**`INV-CONTRACT01`** (JSON casing, camelCase) and **`INV-CONTRACT02`** (CORS Expose-Headers) are cross-repo wire contracts — single source of truth is `../educa-coord/contracts/api-protocol.md` (per `COORD.md` §1.3, same criterion applied to `INV-VIEWAS01` above). Read them on-demand when adding a BE response header or touching (de)serialization.

### INV-CONTRACT03 — WAL endpoint persistence casing (superseded 2026-09-16)

`WalEntry.endpoint` is persisted **preserving the original casing** — `WalService.append()` does **not** lowercase it. This was tried (commit `4d44d790`, 2026-05-09) and reverted 4 days later (commit `8b2ccc85`, "fix (wal-lowercase error)") because lowercasing the full path broke `/api/sistema/usuarios/{rol}/{id}`, where the backend compares `rol` case-sensitively (`IUsuarioRolStrategy.SoportaRol`, e.g. `"Estudiante"`). `wal.service.spec.ts` carries an explicit regression test for this (`preserves casing in path segments that are case-sensitive in the backend`).

**Why this invariant no longer applies**: `api-schema-versions.ts`'s `getSchemaVersion()` normalizes its input with `.toLowerCase()` internally before matching — it doesn't need a lowercase input. It's also only called from `schema-version.interceptor.ts` against the outgoing HTTP request path, never against `WalEntry.endpoint` from the WAL/IndexedDB. There is no code path where `WalEntry.endpoint` casing is looked up against anything — it's only used verbatim to replay the HTTP call (`wal-http.helper.ts`). Re-normalizing it would reintroduce the role-casing bug.

Found stale during [brief 689](../chats/closed/689-audit-tests-f1-inv-contract03-wal-casing.md) (audit-tests F1) — the audit that spawned that brief assumed this doc was still accurate; investigation showed the code and its test are correct, and this doc was the actual staleness.

## Identity & "ver como" (view-as)

**`INV-VIEWAS01`** — cross-repo invariant (has a BE clause via `ResolveViewAsIdentity()`), lives in `../educa-coord/invariants/permisos.md` (single source of truth per `COORD.md` §1.3). Read it on-demand whenever you touch identity resolution, a per-user cache (in-memory, IndexedDB/SW), a role-dispatcher component, or an identity display label under `ViewAsContextService`.
