import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalService } from './wal.service';
import { WalDbService } from './wal-db.service';
import { WalEntry, WAL_DEFAULTS, CURRENT_WAL_SCHEMA_VERSION } from './models';

function makeEntry(overrides: Partial<WalEntry> = {}): WalEntry {
	return {
		id: 'entry-1',
		timestamp: Date.now(),
		operation: 'UPDATE',
		resourceType: 'horarios',
		resourceId: 42,
		endpoint: '/api/horario/42',
		method: 'PUT',
		payload: { nombre: 'Test' },
		status: 'PENDING',
		retries: 0,
		maxRetries: WAL_DEFAULTS.MAX_RETRIES,
		schemaVersion: CURRENT_WAL_SCHEMA_VERSION,
		...overrides,
	};
}

function createDbMock() {
	const store = new Map<string, WalEntry>();
	return {
		put: vi.fn((e: WalEntry) => { store.set(e.id, { ...e }); return Promise.resolve(); }),
		get: vi.fn((id: string) => Promise.resolve(store.get(id) ? { ...store.get(id)! } : undefined)),
		delete: vi.fn((id: string) => { store.delete(id); return Promise.resolve(); }),
		getPending: vi.fn(() => Promise.resolve([...store.values()].filter((e) => e.status === 'PENDING'))),
		getFailed: vi.fn(() => Promise.resolve([...store.values()].filter((e) => e.status === 'FAILED'))),
		getRetryable: vi.fn(() => Promise.resolve([])),
		getByStatus: vi.fn((s: string) => Promise.resolve([...store.values()].filter((e) => e.status === s))),
		hasActiveByResourceType: vi.fn(() => Promise.resolve(false)),
		count: vi.fn(() => Promise.resolve(0)),
		deleteCommittedOlderThan: vi.fn(() => Promise.resolve(0)),
		purgeByResourceType: vi.fn(() => Promise.resolve(0)),
		_store: store,
	};
}

describe('WalService', () => {
	let service: WalService;
	let db: ReturnType<typeof createDbMock>;

	beforeEach(() => {
		db = createDbMock();

		TestBed.configureTestingModule({
			providers: [
				WalService,
				{ provide: WalDbService, useValue: db },
			],
		});

		service = TestBed.inject(WalService);
	});

	// #region append
	describe('append', () => {
		it('persists the endpoint preserving the original casing', async () => {
			const entry = await service.append({
				operation: 'UPDATE',
				resourceType: 'usuarios',
				endpoint: '/api/Sistema/Usuarios/42',
				method: 'PUT',
				payload: { id: 42 },
			});

			expect(entry.endpoint).toBe('/api/Sistema/Usuarios/42');
			expect(db.put).toHaveBeenCalledTimes(1);
			const persisted = db.put.mock.calls[0][0] as WalEntry;
			expect(persisted.endpoint).toBe('/api/Sistema/Usuarios/42');
		});

		it('preserves casing in path segments that are case-sensitive in the backend', async () => {
			const entry = await service.append({
				operation: 'UPDATE',
				resourceType: 'usuarios',
				endpoint: '/api/sistema/usuarios/Estudiante/240',
				method: 'PUT',
				payload: { dni: '79474395' },
			});

			expect(entry.endpoint).toBe('/api/sistema/usuarios/Estudiante/240');
		});

		it('preserves query string casing as well', async () => {
			const entry = await service.append({
				operation: 'CREATE',
				resourceType: 'errors',
				endpoint: '/api/sistema/errors?correlationId=ABC123',
				method: 'POST',
				payload: { msg: 'x' },
			});

			expect(entry.endpoint).toBe('/api/sistema/errors?correlationId=ABC123');
		});

		it('sets PENDING status, retries=0, and current schema version', async () => {
			const entry = await service.append({
				operation: 'CREATE',
				resourceType: 'usuarios',
				endpoint: '/api/usuarios',
				method: 'POST',
				payload: {},
			});

			expect(entry.status).toBe('PENDING');
			expect(entry.retries).toBe(0);
			expect(entry.schemaVersion).toBe(CURRENT_WAL_SCHEMA_VERSION);
		});

		it('uses default maxRetries when not provided', async () => {
			const entry = await service.append({
				operation: 'UPDATE',
				resourceType: 'horarios',
				endpoint: '/api/horario/1',
				method: 'PUT',
				payload: {},
			});

			expect(entry.maxRetries).toBe(WAL_DEFAULTS.MAX_RETRIES);
		});

		it('respects custom maxRetries', async () => {
			const entry = await service.append({
				operation: 'UPDATE',
				resourceType: 'horarios',
				endpoint: '/api/horario/1',
				method: 'PUT',
				payload: {},
				maxRetries: 10,
			});

			expect(entry.maxRetries).toBe(10);
		});
	});
	// #endregion

	// #region Status Transitions
	describe('status transitions', () => {
		beforeEach(async () => {
			const entry = makeEntry();
			db._store.set(entry.id, entry);
		});

		it('markInFlight sets status to IN_FLIGHT', async () => {
			await service.markInFlight('entry-1');

			const updated = db.put.mock.calls[0][0] as WalEntry;
			expect(updated.status).toBe('IN_FLIGHT');
		});

		it('markCommitted sets status and committedAt', async () => {
			await service.markCommitted('entry-1');

			const updated = db.put.mock.calls[0][0] as WalEntry;
			expect(updated.status).toBe('COMMITTED');
			expect(updated.committedAt).toBeGreaterThan(0);
		});

		it('markFailed sets status, failedAt, and error', async () => {
			await service.markFailed('entry-1', 'Network error');

			const updated = db.put.mock.calls[0][0] as WalEntry;
			expect(updated.status).toBe('FAILED');
			expect(updated.failedAt).toBeGreaterThan(0);
			expect(updated.error).toBe('Network error');
		});

		it('markConflict sets status and error message', async () => {
			await service.markConflict('entry-1');

			const updated = db.put.mock.calls[0][0] as WalEntry;
			expect(updated.status).toBe('CONFLICT');
			expect(updated.error).toContain('409');
		});

		it('commitAndClean deletes the entry', async () => {
			await service.commitAndClean('entry-1');

			expect(db.delete).toHaveBeenCalledWith('entry-1');
		});

		it('no-ops when entry not found', async () => {
			await service.markInFlight('nonexistent');
			await service.markCommitted('nonexistent');
			await service.markFailed('nonexistent', 'err');
			await service.markConflict('nonexistent');

			expect(db.put).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Retry Management
	describe('retry management', () => {
		it('increments retries and sets exponential backoff', async () => {
			db._store.set('r1', makeEntry({ id: 'r1', retries: 0, maxRetries: 5 }));

			const updated = await service.incrementRetry('r1');

			expect(updated!.retries).toBe(1);
			expect(updated!.status).toBe('PENDING');
			expect(updated!.nextRetryAt).toBeGreaterThan(Date.now());
		});

		it('marks FAILED when max retries exceeded', async () => {
			db._store.set('r2', makeEntry({ id: 'r2', retries: 1, maxRetries: 2 }));

			const updated = await service.incrementRetry('r2');

			expect(updated!.status).toBe('FAILED');
			expect(updated!.error).toContain('Max retries');
			expect(updated!.failedAt).toBeGreaterThan(0);
		});

		it('caps backoff at MAX_BACKOFF_MS', async () => {
			db._store.set('r3', makeEntry({ id: 'r3', retries: 20, maxRetries: 100 }));

			const updated = await service.incrementRetry('r3');
			const backoff = updated!.nextRetryAt! - Date.now();

			expect(backoff).toBeLessThanOrEqual(WAL_DEFAULTS.MAX_BACKOFF_MS + 50);
		});

		it('retryEntry resets a FAILED entry to PENDING', async () => {
			db._store.set('r4', makeEntry({
				id: 'r4', status: 'FAILED', retries: 5, error: 'err', failedAt: Date.now(),
			}));

			await service.retryEntry('r4');

			const updated = db.put.mock.calls[0][0] as WalEntry;
			expect(updated.status).toBe('PENDING');
			expect(updated.retries).toBe(0);
			expect(updated.error).toBeUndefined();
			expect(updated.failedAt).toBeUndefined();
		});

		it('discardEntry deletes the entry', async () => {
			await service.discardEntry('any-id');
			expect(db.delete).toHaveBeenCalledWith('any-id');
		});
	});
	// #endregion

	// #region Schema Migration
	describe('schema migration', () => {
		it('marks old-version entries as REQUIRES_MIGRATION', async () => {
			const old = makeEntry({ id: 'old', schemaVersion: 0 });
			db._store.set('old', old);

			const count = await service.checkSchemaMigrations();

			expect(count).toBe(1);
			const updated = db.put.mock.calls[0][0] as WalEntry;
			expect(updated.status).toBe('REQUIRES_MIGRATION');
		});

		it('skips entries at current schema version', async () => {
			db._store.set('current', makeEntry({ id: 'current', schemaVersion: CURRENT_WAL_SCHEMA_VERSION }));

			const count = await service.checkSchemaMigrations();

			expect(count).toBe(0);
		});

		it('discardMigrationEntries removes all REQUIRES_MIGRATION entries', async () => {
			db._store.set('m1', makeEntry({ id: 'm1', status: 'REQUIRES_MIGRATION' as WalEntry['status'] }));
			db._store.set('m2', makeEntry({ id: 'm2', status: 'REQUIRES_MIGRATION' as WalEntry['status'] }));

			const count = await service.discardMigrationEntries();

			expect(count).toBe(2);
			expect(db.delete).toHaveBeenCalledTimes(2);
		});
	});
	// #endregion

	// #region Cleanup
	describe('cleanup', () => {
		it('delegates to db.deleteCommittedOlderThan with correct cutoff', async () => {
			db.deleteCommittedOlderThan.mockResolvedValue(3);

			const deleted = await service.cleanup();

			expect(deleted).toBe(3);
			const cutoff = db.deleteCommittedOlderThan.mock.calls[0][0] as number;
			expect(cutoff).toBeLessThanOrEqual(Date.now() - WAL_DEFAULTS.COMMITTED_TTL_MS + 50);
		});

		it('purgeByResourceType delegates to db', async () => {
			db.purgeByResourceType.mockResolvedValue(5);

			const purged = await service.purgeByResourceType('horarios');

			expect(purged).toBe(5);
			expect(db.purgeByResourceType).toHaveBeenCalledWith('horarios');
		});
	});
	// #endregion

	// #region Queries
	describe('queries', () => {
		it('getStats aggregates counts by status', async () => {
			db.count.mockImplementation((status: string) => {
				const counts: Record<string, number> = { PENDING: 3, IN_FLIGHT: 1, FAILED: 2, COMMITTED: 10, CONFLICT: 0 };
				return Promise.resolve(counts[status] ?? 0);
			});

			const stats = await service.getStats();

			expect(stats).toEqual({ pending: 3, inFlight: 1, failed: 2, committed: 10, conflict: 0 });
		});

		it('hasPendingForResource delegates to db', async () => {
			db.hasActiveByResourceType.mockResolvedValue(true);

			const result = await service.hasPendingForResource('horarios');

			expect(result).toBe(true);
			expect(db.hasActiveByResourceType).toHaveBeenCalledWith('horarios');
		});
	});
	// #endregion

	// #region recoverInFlight
	describe('recoverInFlight', () => {
		it('resets IN_FLIGHT entries to PENDING', async () => {
			const inflight = makeEntry({ id: 'if1', status: 'IN_FLIGHT' });
			db._store.set('if1', inflight);

			const count = await service.recoverInFlight();

			expect(count).toBe(1);
			const updated = db.put.mock.calls[0][0] as WalEntry;
			expect(updated.status).toBe('PENDING');
			expect(updated.nextRetryAt).toBeUndefined();
		});
	});
	// #endregion
});
