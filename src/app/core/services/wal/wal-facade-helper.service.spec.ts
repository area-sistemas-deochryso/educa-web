// * Tests for WalFacadeHelper — WAL protected mutations (optimistic, server-confirmed, fallback).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalFacadeHelper } from './wal-facade-helper.service';
import { WalService } from './wal.service';
import { WalSyncEngine } from './wal-sync-engine.service';
import { WalStatusStore } from './wal-status.store';
import { WalEntry, WalProcessResult } from './models';
import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { ActivityTrackerService } from '@core/services/error/activity-tracker.service';
import { SwService } from '@features/intranet/services/sw/sw.service';

// #endregion

// #region Mocks
const mockEntry: WalEntry = {
	id: 'test-uuid-1',
	timestamp: Date.now(),
	operation: 'UPDATE',
	resourceType: 'horarios',
	resourceId: 42,
	endpoint: '/api/horario/42',
	method: 'PUT',
	payload: { nombre: 'Test' },
	status: 'PENDING',
	retries: 0,
	maxRetries: 5,
};

function createConfig(overrides: Record<string, unknown> = {}) {
	return {
		operation: 'UPDATE' as const,
		resourceType: 'horarios',
		resourceId: 42,
		endpoint: '/api/horario/42',
		method: 'PUT' as const,
		payload: { nombre: 'Test' },
		http$: vi.fn().mockReturnValue(of({ id: 42, nombre: 'Test' })),
		onCommit: vi.fn(),
		onError: vi.fn(),
		optimistic: {
			apply: vi.fn(),
			rollback: vi.fn(),
		},
		...overrides,
	};
}
// #endregion

// #region Tests
describe('WalFacadeHelper', () => {
	let helper: WalFacadeHelper;
	let walMock: Partial<WalService>;
	let syncEngineMock: Partial<WalSyncEngine>;
	let statusStoreMock: Partial<WalStatusStore>;
	let swMock: Partial<SwService>;
	let errorHandlerMock: Partial<ErrorHandlerService>;
	let activityTrackerMock: Partial<ActivityTrackerService>;
	let entryProcessed$: Subject<WalProcessResult>;

	beforeEach(() => {
		entryProcessed$ = new Subject<WalProcessResult>();

		walMock = {
			append: vi.fn().mockResolvedValue(mockEntry),
		};

		syncEngineMock = {
			registerCallbacks: vi.fn(),
			processAllPending: vi.fn().mockResolvedValue(undefined),
			entryProcessed$: entryProcessed$.asObservable(),
		};

		statusStoreMock = {
			refresh: vi.fn(),
		};

		swMock = {
			isOnline: true,
		};

		errorHandlerMock = {
			showInfo: vi.fn(),
			showWarning: vi.fn(),
		};

		activityTrackerMock = {
			track: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				WalFacadeHelper,
				{ provide: WalService, useValue: walMock },
				{ provide: WalSyncEngine, useValue: syncEngineMock },
				{ provide: WalStatusStore, useValue: statusStoreMock },
				{ provide: SwService, useValue: swMock },
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
				{ provide: ActivityTrackerService, useValue: activityTrackerMock },
			],
		});

		helper = TestBed.inject(WalFacadeHelper);
	});

	it('should be created', () => {
		expect(helper).toBeTruthy();
	});

	// #region Optimistic flow (default)
	describe('optimistic flow (default)', () => {
		it('should call optimistic.apply immediately before WAL append', async () => {
			const config = createConfig();

			await helper.execute(config);

			expect(config.optimistic.apply).toHaveBeenCalled();
			expect(walMock.append).toHaveBeenCalled();
		});

		it('should append entry to WAL with correct params', async () => {
			const config = createConfig();

			await helper.execute(config);

			expect(walMock.append).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'UPDATE',
					resourceType: 'horarios',
					resourceId: 42,
					endpoint: '/api/horario/42',
					method: 'PUT',
					payload: { nombre: 'Test' },
				}),
			);
		});

		it('should register callbacks with sync engine', async () => {
			const config = createConfig();

			await helper.execute(config);

			expect(syncEngineMock.registerCallbacks).toHaveBeenCalledWith(
				mockEntry.id,
				expect.objectContaining({
					http$: config.http$,
					onCommit: config.onCommit,
					onError: config.onError,
					rollback: config.optimistic.rollback,
				}),
			);
		});

		it('should trigger processAllPending when online', async () => {
			const config = createConfig();

			await helper.execute(config);

			expect(syncEngineMock.processAllPending).toHaveBeenCalled();
		});

		it('should show offline message and skip processing when offline', async () => {
			(swMock as Record<string, unknown>).isOnline = false;
			const config = createConfig();

			await helper.execute(config);

			expect(syncEngineMock.processAllPending).not.toHaveBeenCalled();
			expect(errorHandlerMock.showInfo).toHaveBeenCalledWith(
				'Sin conexion',
				expect.any(String),
			);
			expect(statusStoreMock.refresh).toHaveBeenCalled();
		});

		it('should track WAL operation via activityTracker', async () => {
			const config = createConfig();

			await helper.execute(config);

			expect(activityTrackerMock.track).toHaveBeenCalledWith(
				'WAL_OPERATION',
				expect.stringContaining('UPDATE horarios'),
			);
		});
	});
	// #endregion

	// #region Optimistic without resourceId (CREATE)
	describe('optimistic CREATE (no resourceId)', () => {
		it('should work without resourceId for CREATE operations', async () => {
			const config = createConfig({
				operation: 'CREATE',
				resourceId: undefined,
				optimistic: undefined,
			});

			await helper.execute(config);

			expect(walMock.append).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'CREATE',
					resourceId: undefined,
				}),
			);
		});
	});
	// #endregion

	// #region Server-confirmed flow
	describe('server-confirmed flow', () => {
		it('should NOT call optimistic.apply for server-confirmed', async () => {
			const config = createConfig({ consistencyLevel: 'server-confirmed' });

			await helper.execute(config);

			expect(config.optimistic.apply).not.toHaveBeenCalled();
			expect(walMock.append).not.toHaveBeenCalled();
		});

		it('should call http$ directly and onCommit on success', async () => {
			const serverResult = { id: 42, nombre: 'Updated' };
			const config = createConfig({
				consistencyLevel: 'server-confirmed',
				http$: vi.fn().mockReturnValue(of(serverResult)),
			});

			await helper.execute(config);

			expect(config.http$).toHaveBeenCalled();
			expect(config.onCommit).toHaveBeenCalledWith(serverResult);
		});

		it('should call onError when http$ fails', async () => {
			const error = new Error('Server error');
			const config = createConfig({
				consistencyLevel: 'server-confirmed',
				http$: vi.fn().mockReturnValue(throwError(() => error)),
			});

			await helper.execute(config);

			expect(config.onError).toHaveBeenCalledWith(error);
			expect(config.onCommit).not.toHaveBeenCalled();
		});

		it('should show offline warning for server-confirmed when offline', async () => {
			(swMock as Record<string, unknown>).isOnline = false;
			const config = createConfig({ consistencyLevel: 'server-confirmed' });

			await helper.execute(config);

			expect(errorHandlerMock.showWarning).toHaveBeenCalledWith(
				'Sin conexion',
				expect.any(String),
			);
			expect(config.http$).not.toHaveBeenCalled();
		});

		it('should also use server-confirmed path for serialized level', async () => {
			const serverResult = { id: 42 };
			const config = createConfig({
				consistencyLevel: 'serialized',
				http$: vi.fn().mockReturnValue(of(serverResult)),
			});

			await helper.execute(config);

			expect(walMock.append).not.toHaveBeenCalled();
			expect(config.onCommit).toHaveBeenCalledWith(serverResult);
		});
	});
	// #endregion

	// #region Fallback (IndexedDB unavailable)
	describe('fallback when WAL append fails', () => {
		it('should execute http$ directly when IndexedDB append fails', async () => {
			walMock.append = vi.fn().mockRejectedValue(new Error('IDB unavailable'));
			const serverResult = { id: 42 };
			const config = createConfig({
				http$: vi.fn().mockReturnValue(of(serverResult)),
			});

			await helper.execute(config);

			// apply was called (optimistic), then fallback kicks in
			expect(config.optimistic.apply).toHaveBeenCalled();
			expect(config.http$).toHaveBeenCalled();
			expect(config.onCommit).toHaveBeenCalledWith(serverResult);
		});

		it('should rollback and call onError when fallback http$ fails', async () => {
			walMock.append = vi.fn().mockRejectedValue(new Error('IDB unavailable'));
			const error = new Error('Network error');
			const config = createConfig({
				http$: vi.fn().mockReturnValue(throwError(() => error)),
			});

			await helper.execute(config);

			expect(config.optimistic.rollback).toHaveBeenCalled();
			expect(config.onError).toHaveBeenCalledWith(error);
		});

		it('should show quota warning for QuotaExceededError', async () => {
			const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
			walMock.append = vi.fn().mockRejectedValue(quotaError);
			const config = createConfig();

			await helper.execute(config);

			expect(errorHandlerMock.showWarning).toHaveBeenCalledWith(
				'Almacenamiento lleno',
				expect.any(String),
			);
		});
	});
	// #endregion

	// #region postReloadCommit$
	describe('postReloadCommit$', () => {
		it('should emit entryId for committed entries without callback', () => {
			const results: string[] = [];
			helper.postReloadCommit$('horarios').subscribe((id) => results.push(id));

			entryProcessed$.next({
				status: 'COMMITTED',
				entryId: 'entry-1',
				resourceType: 'horarios',
				hadCallback: false,
			});

			expect(results).toEqual(['entry-1']);
		});

		it('should NOT emit for entries with callback', () => {
			const results: string[] = [];
			helper.postReloadCommit$('horarios').subscribe((id) => results.push(id));

			entryProcessed$.next({
				status: 'COMMITTED',
				entryId: 'entry-2',
				resourceType: 'horarios',
				hadCallback: true,
			});

			expect(results).toEqual([]);
		});

		it('should NOT emit for different resourceType', () => {
			const results: string[] = [];
			helper.postReloadCommit$('horarios').subscribe((id) => results.push(id));

			entryProcessed$.next({
				status: 'COMMITTED',
				entryId: 'entry-3',
				resourceType: 'usuarios',
				hadCallback: false,
			});

			expect(results).toEqual([]);
		});

		it('should NOT emit for non-COMMITTED statuses', () => {
			const results: string[] = [];
			helper.postReloadCommit$('horarios').subscribe((id) => results.push(id));

			entryProcessed$.next({ status: 'FAILED', entryId: 'entry-4', error: 'err' });

			expect(results).toEqual([]);
		});
	});
	// #endregion
});
// #endregion
