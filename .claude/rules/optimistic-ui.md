# Optimistic UI — WAL Rules

## Endpoint casing in WAL entries

`WalEntry.endpoint` must be persisted in **lowercase** (see [INV-CONTRACT03](./business-rules.md#inv-contract03--wal-endpoint-persistence-casing)). The `WalService.add()` normalizes via `.toLowerCase()` before storage to ensure consistent lookup against `api-schema-versions.ts`.

When adding new WAL-tracked endpoints, use lowercase keys matching the format in `api-schema-versions.ts`.
