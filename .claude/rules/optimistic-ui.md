# Optimistic UI — WAL Rules

## Endpoint casing in WAL entries

`WalEntry.endpoint` is persisted **preserving its original casing** — `WalService.append()` does not normalize it. See [INV-CONTRACT03](./business-rules.md#inv-contract03--wal-endpoint-persistence-casing-superseded-2026-09-16) for why a prior lowercase-normalization attempt was reverted (it broke a case-sensitive role path segment) and why no consumer actually needs it lowercased.

When adding new WAL-tracked endpoints, don't lowercase the `endpoint` you pass to `wal.execute`/`append` — pass it exactly as the backend expects it on the wire, casing included.
