// * Tests for WalSyncRecovery — boot-time recovery pass for the WAL.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalSyncRecovery } from './wal-sync-recovery.service';
import { WalService } from './wal.service';
import { WalDbService } from './wal-db.service';
import { WalStatusStore } from './wal-status.store';
import { WalEntry } from './models';

// #endregion

// #region Mocks

function makeMigrationEntry(id: string, schemaVersion = 0): WalEntry {
	return {
		id,
		timestamp: Date.now(),
		operation: 'UPDATE',
		resourceType: 'horarios',
		resourceId: 1,
		endpoint: '/api/horario/1',
		method: 'PUT',
		payload: {},
		status: 'PENDING',
		retries: 0,
		maxRetries: 5,
		schemaVersion,
	};
}

function setupSpy(overrides: Partial<Record<string, () => Promise<unknown>>> = {}) {
	const walMock = {
		purgeByResourceType: vi.fn().mockResolvedValue(0),
		recoverInFlight: vi.fn().mockResolvedValue(0),
		cleanup: vi.fn().mockResolvedValue(0),
		checkSchemaMigrations: vi.fn().mockResolvedValue(0),
		getMigrationEntries: vi.fn().mockResolvedValue([] as WalEntry[]),
		...overrides,
	};
	const dbMock = {
		isAvailable: vi.fn().mockResolvedValue(true),
	};
	TestBed.configureTestingModule({
		providers: [
			WalSyncRecovery,
			WalStatusStore,
			{ provide: WalService, useValue: walMock },
			{ provide: WalDbService, useValue: dbMock },
		],
	});
	const store = TestBed.inject(WalStatusStore);
	return { walMock, dbMock, store, recovery: TestBed.inject(WalSyncRecovery) };
}

// #endregion

describe('WalSyncRecovery', () => {
	beforeEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	it('purga resource types migrados a server-confirmed', async () => {
		const { walMock, recovery } = setupSpy();
		await recovery.run();
		expect(walMock.purgeByResourceType).toHaveBeenCalledWith('reporte-usuario');
	});

	it('ejecuta recoverInFlight + cleanup + checkSchemaMigrations en paralelo', async () => {
		const { walMock, recovery } = setupSpy();
		await recovery.run();
		expect(walMock.recoverInFlight).toHaveBeenCalledTimes(1);
		expect(walMock.cleanup).toHaveBeenCalledTimes(1);
		expect(walMock.checkSchemaMigrations).toHaveBeenCalledTimes(1);
	});

	it('NO consulta migration entries cuando checkSchemaMigrations devuelve 0', async () => {
		const { walMock, recovery } = setupSpy();
		const result = await recovery.run();
		expect(walMock.getMigrationEntries).not.toHaveBeenCalled();
		expect(result.migrationEntries).toEqual([]);
	});

	it('expone migration entries cuando hay esquemas pendientes', async () => {
		const entries = [makeMigrationEntry('a', 1), makeMigrationEntry('b', 2)];
		const { walMock, recovery } = setupSpy({
			checkSchemaMigrations: vi.fn().mockResolvedValue(2),
			getMigrationEntries: vi.fn().mockResolvedValue(entries),
		});
		const result = await recovery.run();
		expect(walMock.getMigrationEntries).toHaveBeenCalledTimes(1);
		expect(result.migrationEntries).toEqual(entries);
	});

	it('devuelve { migrationEntries: [] } si una dependencia tira (fail-safe INV-S07)', async () => {
		const { recovery } = setupSpy({
			recoverInFlight: vi.fn().mockRejectedValue(new Error('IndexedDB no disponible')),
		});
		const result = await recovery.run();
		expect(result.migrationEntries).toEqual([]);
	});

	it('captura excepción en getMigrationEntries sin propagar', async () => {
		const { recovery } = setupSpy({
			checkSchemaMigrations: vi.fn().mockResolvedValue(1),
			getMigrationEntries: vi.fn().mockRejectedValue(new Error('boom')),
		});
		const result = await recovery.run();
		expect(result.migrationEntries).toEqual([]);
	});

	it('skipea recovery cuando el storage está en modo ephemeral (INV-WAL-RES08)', async () => {
		const { walMock, store, recovery } = setupSpy();
		store.setMode('ephemeral');
		const result = await recovery.run();
		expect(walMock.purgeByResourceType).not.toHaveBeenCalled();
		expect(walMock.recoverInFlight).not.toHaveBeenCalled();
		expect(walMock.cleanup).not.toHaveBeenCalled();
		expect(walMock.checkSchemaMigrations).not.toHaveBeenCalled();
		expect(result.migrationEntries).toEqual([]);
	});
});
