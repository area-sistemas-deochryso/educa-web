# Brief 245 — F13 F4: WAL / Offline / Cache Tests

<!-- minimal-from-go -->

- **Plan**: F13 §F4 (`plan/test-frontend-gaps.md`)
- **Scope**: Extend WAL specs to cover the 6 documented scenarios + gaps in coalescer, cache invalidator, facade helper
- **Modo sugerido**: `/execute`

## Target files (new specs)

1. `wal-coalescer.service.spec.ts` — duplicate UPDATE detection, payload merge, cleanup callbacks
2. `wal-cache-invalidator.service.spec.ts` — WAL_CACHE_MAP lookup, endpoint fallback, cross-tab invalidation
3. `wal-facade-helper.service.spec.ts` — complete: optimistic apply/rollback, server-confirmed, offline queue trigger
4. `wal.service.spec.ts` — extend: status transitions, retry backoff, cleanup TTL, schema migrations, hasPendingForResource

## Done-when (from plan)

- WAL specs cover all 6 scenarios: apply-ok, apply-fail, create-with-id, offline-queue, SWR-stale, IndexedDB-corrupt
- Full test suite passes green with no regressions
