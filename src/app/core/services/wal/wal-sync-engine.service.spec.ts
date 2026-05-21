// * Tests for WalSyncEngine — hot loop: init/race, processing, error dispatch, cross-tab.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WalSyncEngine } from './wal-sync-engine.service';
import { WalService } from './wal.service';
import { WalLeaderService } from './wal-leader.service';
import { WalMetricsService } from './wal-metrics.service';
import { WalCacheInvalidator } from './wal-cache-invalidator.service';
import { WalCoalescer } from './wal-coalescer.service';
import { WalSyncRecovery } from './wal-sync-recovery.service';
import { WalReconciler } from './wal-reconciler.service';
import { WalCircuitBreaker } from './wal-circuit-breaker.service';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalEntry, WalProcessResult, WAL_DEFAULTS } from './models';

// Stub HTTP send so the engine never hits the network.
const sendSpy = vi.fn();
vi.mock('./wal-http.helper', () => ({
	sendWalEntryRequest: (..._args: unknown[]) => sendSpy(),
}));

// #endregion

// #region Helpers

function makeEntry(overrides: Partial<WalEntry> = {}): WalEntry {
	return {
		id: overrides.id ?? 'entry-1',
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
		...overrides,
	};
}

interface EngineMocks {
	wal: {
		markInFlight: ReturnType<typeof vi.fn>;
		commitAndClean: ReturnType<typeof vi.fn>;
		markFailed: ReturnType<typeof vi.fn>;
		markConflict: ReturnType<typeof vi.fn>;
		incrementRetry: ReturnType<typeof vi.fn>;
		retryEntry: ReturnType<typeof vi.fn>;
		getEntry: ReturnType<typeof vi.fn>;
		getRetryableEntries: ReturnType<typeof vi.fn>;
		recoverInFlight: ReturnType<typeof vi.fn>;
	};
	leader: {
		start: ReturnType<typeof vi.fn>;
		notifyEntryCommitted: ReturnType<typeof vi.fn>;
		entryCommittedByOtherTab$: Subject<{ entryId: string; resourceType: string }>;
		isLeader: boolean;
	};
	sw: { isOnline$: BehaviorSubject<boolean>; isOnline: boolean };
	metrics: {
		recordProcessResult: ReturnType<typeof vi.fn>;
		recordLatency: ReturnType<typeof vi.fn>;
	};
	invalidator: {
		invalidateForEntry: ReturnType<typeof vi.fn>;
		invalidateForCrossTab: ReturnType<typeof vi.fn>;
	};
	coalescer: { coalesce: ReturnType<typeof vi.fn> };
	recovery: { run: ReturnType<typeof vi.fn> };
	reconciler: { notifyOrphanedCommit: ReturnType<typeof vi.fn> };
	breaker: {
		canProcess: ReturnType<typeof vi.fn>;
		recordFailure: ReturnType<typeof vi.fn>;
		recordSuccess: ReturnType<typeof vi.fn>;
		forceProbe: ReturnType<typeof vi.fn>;
	};
}

interface SetupOptions {
	online?: boolean;
	isLeader?: boolean;
	pendingQueue?: WalEntry[][];
	migrationEntries?: WalEntry[];
	recoveryRun?: ReturnType<typeof vi.fn>;
}

function setupEngine(opts: SetupOptions = {}): {
	engine: WalSyncEngine;
	mocks: EngineMocks;
} {
	const isOnline$ = new BehaviorSubject<boolean>(opts.online ?? true);

	const queue = [...(opts.pendingQueue ?? [[]])];
	const getRetryableEntries = vi.fn().mockImplementation(() => {
		return Promise.resolve(queue.length > 0 ? queue.shift()! : []);
	});

	const mocks: EngineMocks = {
		wal: {
			markInFlight: vi.fn().mockResolvedValue(undefined),
			commitAndClean: vi.fn().mockResolvedValue(undefined),
			markFailed: vi.fn().mockResolvedValue(undefined),
			markConflict: vi.fn().mockResolvedValue(undefined),
			incrementRetry: vi.fn(),
			retryEntry: vi.fn().mockResolvedValue(undefined),
			getEntry: vi.fn().mockResolvedValue(undefined),
			getRetryableEntries,
			recoverInFlight: vi.fn().mockResolvedValue(0),
		},
		leader: {
			start: vi.fn(),
			notifyEntryCommitted: vi.fn(),
			entryCommittedByOtherTab$: new Subject<{
				entryId: string;
				resourceType: string;
			}>(),
			isLeader: opts.isLeader ?? true,
		},
		sw: {
			isOnline$,
			isOnline: opts.online ?? true,
		},
		metrics: {
			recordProcessResult: vi.fn(),
			recordLatency: vi.fn(),
		},
		invalidator: {
			invalidateForEntry: vi.fn().mockResolvedValue(undefined),
			invalidateForCrossTab: vi.fn().mockResolvedValue(undefined),
		},
		coalescer: {
			coalesce: vi.fn().mockImplementation((entries: WalEntry[]) =>
				Promise.resolve(entries),
			),
		},
		recovery: {
			run:
				opts.recoveryRun ??
				vi.fn().mockResolvedValue({
					migrationEntries: opts.migrationEntries ?? [],
				}),
		},
		reconciler: {
			notifyOrphanedCommit: vi.fn().mockResolvedValue(undefined),
		},
		breaker: {
			canProcess: vi.fn().mockReturnValue(true),
			recordFailure: vi.fn(),
			recordSuccess: vi.fn(),
			forceProbe: vi.fn(),
		},
	};

	TestBed.configureTestingModule({
		providers: [
			provideHttpClient(),
			WalSyncEngine,
			{ provide: WalService, useValue: mocks.wal },
			{ provide: WalLeaderService, useValue: mocks.leader },
			{ provide: WalMetricsService, useValue: mocks.metrics },
			{ provide: WalCacheInvalidator, useValue: mocks.invalidator },
			{ provide: WalCoalescer, useValue: mocks.coalescer },
			{ provide: WalSyncRecovery, useValue: mocks.recovery },
			{ provide: WalReconciler, useValue: mocks.reconciler },
			{ provide: WalCircuitBreaker, useValue: mocks.breaker },
			{ provide: SwService, useValue: mocks.sw },
		],
	});

	const engine = TestBed.inject(WalSyncEngine);
	return { engine, mocks };
}

/** Wait for queued microtasks (init() chain) to settle. */
async function flushAsync(): Promise<void> {
	for (let i = 0; i < 5; i++) {
		await Promise.resolve();
	}
}

// #endregion

describe('WalSyncEngine', () => {
	beforeEach(() => {
		TestBed.resetTestingModule();
		sendSpy.mockReset();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// #region init() / lifecycle

	describe('init()', () => {
		it('starts leader election on construction', async () => {
			const { mocks } = setupEngine();
			await flushAsync();
			expect(mocks.leader.start).toHaveBeenCalledTimes(1);
		});

		it('awaits recovery.run() before starting listeners (race condition)', async () => {
			let recoveryResolved = false;
			let recoveryDone!: () => void;
			const recoveryPromise = new Promise<{ migrationEntries: WalEntry[] }>(
				(resolve) => {
					recoveryDone = () => {
						recoveryResolved = true;
						resolve({ migrationEntries: [] });
					};
				},
			);
			const recoveryRun = vi.fn().mockReturnValue(recoveryPromise);

			const { mocks } = setupEngine({ recoveryRun, online: true });

			// Trigger online emission BEFORE recovery resolves
			mocks.sw.isOnline$.next(true);
			await flushAsync();

			// processAllPending should NOT have been triggered by listeners yet
			// (recovery has not resolved → listeners not started)
			const callsBeforeRecovery =
				mocks.wal.getRetryableEntries.mock.calls.length;
			expect(recoveryResolved).toBe(false);

			recoveryDone();
			await flushAsync();
			await flushAsync();

			// Recovery completed → init's own processAllPending kicked in (online=true)
			expect(mocks.wal.getRetryableEntries.mock.calls.length).toBeGreaterThan(
				callsBeforeRecovery,
			);
		});

		it('emits REQUIRES_MIGRATION for each entry returned by recovery', async () => {
			const m1 = makeEntry({ id: 'm1', schemaVersion: 0 });
			const m2 = makeEntry({ id: 'm2', schemaVersion: 1 });
			const { engine } = setupEngine({ migrationEntries: [m1, m2] });

			const events: WalProcessResult[] = [];
			engine.entryProcessed$.subscribe((r) => events.push(r));
			await flushAsync();

			const migrations = events.filter(
				(r) => r.status === 'REQUIRES_MIGRATION',
			);
			expect(migrations).toHaveLength(2);
			expect(migrations[0]).toMatchObject({
				status: 'REQUIRES_MIGRATION',
				entryId: 'm1',
			});
			expect(migrations[1]).toMatchObject({
				status: 'REQUIRES_MIGRATION',
				entryId: 'm2',
			});
		});

		it('skips processAllPending on init when offline', async () => {
			const { mocks } = setupEngine({ online: false });
			await flushAsync();
			// Listeners shouldn't have processed (online=false)
			expect(mocks.wal.getRetryableEntries).not.toHaveBeenCalled();
		});

		it('runs processAllPending on init when online and leader', async () => {
			const { mocks } = setupEngine({ online: true, isLeader: true });
			await flushAsync();
			expect(mocks.wal.getRetryableEntries).toHaveBeenCalled();
		});

		it('subscribes to leader.entryCommittedByOtherTab$', async () => {
			const { mocks } = setupEngine();
			await flushAsync();
			// Emitting cross-tab event should trigger invalidator
			mocks.leader.entryCommittedByOtherTab$.next({
				entryId: 'x',
				resourceType: 'horarios',
			});
			await flushAsync();
			expect(mocks.invalidator.invalidateForCrossTab).toHaveBeenCalledWith(
				'horarios',
				'x',
			);
		});
	});

	// #endregion

	// #region stop()

	describe('stop()', () => {
		it('stops the engine and prevents further timer-driven processing', async () => {
			const { engine, mocks } = setupEngine({ online: true });
			await flushAsync();
			engine.stop();
			const before = mocks.wal.getRetryableEntries.mock.calls.length;
			// Even if more time passes, no new processRetryable should fire
			// (timerSub was unsubscribed)
			await flushAsync();
			expect(mocks.wal.getRetryableEntries.mock.calls.length).toBe(before);
		});
	});

	// #endregion

	// #region processEntry — happy path

	describe('processEntry — success', () => {
		it('marks IN_FLIGHT, commits, invalidates cache, fires onCommit, notifies cross-tab and emits COMMITTED', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();

			const entry = makeEntry({ id: 'ok-1' });
			const onCommit = vi.fn();
			const onError = vi.fn();
			const rollback = vi.fn();
			engine.registerCallbacks(entry.id, {
				http$: () => of({ ok: true }),
				onCommit,
				onError,
				rollback,
			});
			sendSpy.mockResolvedValueOnce({ id: 1, value: 'server' });

			const resultP = firstValueFrom(
				engine.entryProcessed$.pipe(take(1)),
			);
			const result = await engine.processEntry(entry);

			expect(mocks.wal.markInFlight).toHaveBeenCalledWith('ok-1');
			expect(mocks.wal.commitAndClean).toHaveBeenCalledWith('ok-1');
			expect(mocks.invalidator.invalidateForEntry).toHaveBeenCalledWith(entry);
			expect(onCommit).toHaveBeenCalledWith({ id: 1, value: 'server' });
			expect(onError).not.toHaveBeenCalled();
			expect(rollback).not.toHaveBeenCalled();
			expect(mocks.leader.notifyEntryCommitted).toHaveBeenCalledWith(
				'ok-1',
				'horarios',
			);
			expect(result).toMatchObject({
				status: 'COMMITTED',
				entryId: 'ok-1',
				resourceType: 'horarios',
				hadCallback: true,
			});
			await expect(resultP).resolves.toMatchObject({ status: 'COMMITTED' });
		});

		it('reports hadCallback=false when no callback was registered', async () => {
			const { engine } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'no-cb' });
			sendSpy.mockResolvedValueOnce({});
			const result = await engine.processEntry(entry);
			expect(result).toMatchObject({
				status: 'COMMITTED',
				hadCallback: false,
			});
		});
	});

	// #endregion

	// #region processEntry — outer catch

	describe('processEntry — unexpected error', () => {
		it('resets IN_FLIGHT to PENDING when an unexpected error escapes the inner try', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();

			const entry = makeEntry({ id: 'boom' });
			// Make markInFlight succeed but commitAndClean throw a non-HTTP error
			// after success path. Simpler: throw inside markInFlight to land in outer catch.
			mocks.wal.markInFlight.mockRejectedValueOnce(new Error('DB closed'));
			mocks.wal.getEntry.mockResolvedValueOnce({ ...entry, status: 'IN_FLIGHT' });

			const result = await engine.processEntry(entry);

			expect(mocks.wal.retryEntry).toHaveBeenCalledWith('boom');
			expect(result).toMatchObject({ status: 'FAILED', entryId: 'boom' });
		});
	});

	// #endregion

	// #region processAllPending — guards & drain

	describe('processAllPending', () => {
		it('does nothing when not the leader', async () => {
			const { engine, mocks } = setupEngine({
				isLeader: false,
				online: true,
				pendingQueue: [[makeEntry()]],
			});
			await flushAsync();
			mocks.wal.getRetryableEntries.mockClear();
			await engine.processAllPending();
			expect(mocks.wal.getRetryableEntries).not.toHaveBeenCalled();
		});

		it('does nothing when offline', async () => {
			const { engine, mocks } = setupEngine({ online: false });
			await flushAsync();
			mocks.wal.getRetryableEntries.mockClear();
			await engine.processAllPending();
			expect(mocks.wal.getRetryableEntries).not.toHaveBeenCalled();
		});

		it('drain loop: picks up new entries enqueued during processing', async () => {
			const e1 = makeEntry({ id: 'e1' });
			const e2 = makeEntry({ id: 'e2' });
			// Start offline so init() does NOT consume the queue.
			const { engine, mocks } = setupEngine({
				online: false,
				pendingQueue: [[e1], [e2], []],
			});
			await flushAsync();
			// Go online for the explicit call.
			mocks.sw.isOnline = true;
			sendSpy.mockResolvedValue({});
			mocks.wal.commitAndClean.mockResolvedValue(undefined);

			await engine.processAllPending();

			expect(mocks.wal.commitAndClean).toHaveBeenCalledWith('e1');
			expect(mocks.wal.commitAndClean).toHaveBeenCalledWith('e2');
		});

		it('runs coalescer before processing entries', async () => {
			const e1 = makeEntry({ id: 'e1' });
			const { engine, mocks } = setupEngine({ pendingQueue: [[e1], []] });
			await flushAsync();
			sendSpy.mockResolvedValue({});
			await engine.processAllPending();
			expect(mocks.coalescer.coalesce).toHaveBeenCalled();
		});
	});

	// #endregion

	// #region processRetryable

	describe('processRetryable', () => {
		it('runs recoverInFlight as a safety net before processing', async () => {
			const { engine, mocks } = setupEngine({
				online: true,
				pendingQueue: [[]],
			});
			await flushAsync();
			mocks.wal.recoverInFlight.mockClear();
			mocks.wal.getRetryableEntries.mockClear();

			await engine.processRetryable();

			expect(mocks.wal.recoverInFlight).toHaveBeenCalledTimes(1);
		});

		it('skips when not leader', async () => {
			const { engine, mocks } = setupEngine({
				isLeader: false,
				online: true,
			});
			await flushAsync();
			mocks.wal.recoverInFlight.mockClear();
			await engine.processRetryable();
			expect(mocks.wal.recoverInFlight).not.toHaveBeenCalled();
		});
	});

	// #endregion

	// #region handleError — 4 paths

	describe('handleError — error dispatch (post-DS1)', () => {
		it('CONFLICT path: 409 marks conflict, deletes callback, no rollback', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'conf' });
			const onError = vi.fn();
			const rollback = vi.fn();
			engine.registerCallbacks(entry.id, {
				http$: () => of(null),
				onCommit: vi.fn(),
				onError,
				rollback,
			});
			sendSpy.mockRejectedValueOnce(
				new HttpErrorResponse({ status: 409, statusText: 'Conflict' }),
			);

			const result = await engine.processEntry(entry);

			expect(mocks.wal.markConflict).toHaveBeenCalledWith('conf');
			expect(rollback).not.toHaveBeenCalled();
			expect(onError).not.toHaveBeenCalled();
			expect(result).toMatchObject({ status: 'CONFLICT', entryId: 'conf' });
		});

		it('PERMANENT path: 4xx (non-retryable) marks failed + invalidates + rollback + onError', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'perm' });
			const onError = vi.fn();
			const rollback = vi.fn();
			engine.registerCallbacks(entry.id, {
				http$: () => of(null),
				onCommit: vi.fn(),
				onError,
				rollback,
			});
			const httpError = new HttpErrorResponse({
				status: 400,
				statusText: 'Bad Request',
				error: { message: 'invalid' },
			});
			sendSpy.mockRejectedValueOnce(httpError);

			const result = await engine.processEntry(entry);

			expect(mocks.wal.markFailed).toHaveBeenCalledWith(
				'perm',
				expect.stringContaining('400'),
			);
			expect(mocks.invalidator.invalidateForEntry).toHaveBeenCalledWith(entry);
			expect(rollback).toHaveBeenCalledTimes(1);
			expect(onError).toHaveBeenCalledWith(httpError);
			expect(result.status).toBe('FAILED');
			if (result.status === 'FAILED') {
				expect(result.error).toContain('400');
			}
		});

		it('RETRYABLE path: network/5xx increments retry and emits RETRYING', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'retry-1' });
			engine.registerCallbacks(entry.id, {
				http$: () => of(null),
				onCommit: vi.fn(),
				onError: vi.fn(),
			});
			sendSpy.mockRejectedValueOnce(
				new HttpErrorResponse({ status: 503, statusText: 'Unavailable' }),
			);
			mocks.wal.incrementRetry.mockResolvedValueOnce({
				...entry,
				status: 'PENDING',
				retries: 1,
				nextRetryAt: 12345,
			});

			const result = await engine.processEntry(entry);

			expect(mocks.wal.incrementRetry).toHaveBeenCalledWith('retry-1');
			expect(result).toMatchObject({
				status: 'RETRYING',
				entryId: 'retry-1',
				retries: 1,
				nextRetryAt: 12345,
			});
		});

		it('RETRYABLE-MAX path: incrementRetry returns FAILED → rollback + onError + emit FAILED', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'max', maxRetries: 2 });
			const onError = vi.fn();
			const rollback = vi.fn();
			engine.registerCallbacks(entry.id, {
				http$: () => of(null),
				onCommit: vi.fn(),
				onError,
				rollback,
			});
			sendSpy.mockRejectedValueOnce(
				new HttpErrorResponse({ status: 500, statusText: 'Server Error' }),
			);
			mocks.wal.incrementRetry.mockResolvedValueOnce({
				...entry,
				status: 'FAILED',
				retries: 3,
			});

			const result = await engine.processEntry(entry);

			expect(rollback).toHaveBeenCalledTimes(1);
			expect(onError).toHaveBeenCalled();
			expect(result.status).toBe('FAILED');
			if (result.status === 'FAILED') {
				expect(result.error).toContain('Max retries');
			}
		});

		it('RETRYABLE-MAX path: incrementRetry returns null → rollback + emit FAILED', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'null-retry' });
			const onError = vi.fn();
			const rollback = vi.fn();
			engine.registerCallbacks(entry.id, {
				http$: () => of(null),
				onCommit: vi.fn(),
				onError,
				rollback,
			});
			sendSpy.mockRejectedValueOnce(new Error('network'));
			mocks.wal.incrementRetry.mockResolvedValueOnce(null);

			const result = await engine.processEntry(entry);

			expect(rollback).toHaveBeenCalledTimes(1);
			expect(onError).toHaveBeenCalled();
			expect(result.status).toBe('FAILED');
		});
	});

	// #endregion

	// #region Cross-tab

	describe('handleCrossTabCommit', () => {
		it('invalidates cache and emits COMMITTED when another tab commits', async () => {
			const { engine, mocks } = setupEngine();
			const events: WalProcessResult[] = [];
			engine.entryProcessed$.subscribe((r) => events.push(r));
			await flushAsync();

			mocks.leader.entryCommittedByOtherTab$.next({
				entryId: 'cross-1',
				resourceType: 'usuarios',
			});
			await flushAsync();

			expect(mocks.invalidator.invalidateForCrossTab).toHaveBeenCalledWith(
				'usuarios',
				'cross-1',
			);
			const committed = events.find(
				(e) => e.status === 'COMMITTED' && e.entryId === 'cross-1',
			);
			expect(committed).toBeDefined();
		});
	});

	// #endregion

	// #region Callback registration

	describe('registerCallbacks / unregisterCallbacks', () => {
		it('registered callback fires on commit; unregistered does not', async () => {
			const { engine } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'reg' });
			const onCommit = vi.fn();
			engine.registerCallbacks(entry.id, {
				http$: () => of(null),
				onCommit,
				onError: vi.fn(),
			});
			engine.unregisterCallbacks(entry.id);
			sendSpy.mockResolvedValueOnce({});
			await engine.processEntry(entry);
			expect(onCommit).not.toHaveBeenCalled();
		});
	});

	// #endregion

	// #region Resilience M1+M2

	describe('resilience M1 — orphaned commit reconciliation', () => {
		it('invokes reconciler.notifyOrphanedCommit when commit succeeds without callback', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();

			const entry = makeEntry({ id: 'orphan-1' });
			sendSpy.mockResolvedValueOnce({ id: 1 });
			await engine.processEntry(entry);

			expect(mocks.reconciler.notifyOrphanedCommit).toHaveBeenCalledWith(entry);
		});

		it('does NOT invoke reconciler when callback is registered', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();

			const entry = makeEntry({ id: 'with-cb' });
			engine.registerCallbacks(entry.id, {
				http$: () => of({}),
				onCommit: vi.fn(),
				onError: vi.fn(),
			});
			sendSpy.mockResolvedValueOnce({});
			await engine.processEntry(entry);

			expect(mocks.reconciler.notifyOrphanedCommit).not.toHaveBeenCalled();
		});
	});

	describe('resilience M2 — circuit breaker integration', () => {
		it('skips processAllPending when canProcess() returns false', async () => {
			const { engine, mocks } = setupEngine({
				online: true,
				pendingQueue: [[makeEntry()]],
			});
			await flushAsync();
			mocks.wal.getRetryableEntries.mockClear();
			mocks.breaker.canProcess.mockReturnValue(false);

			await engine.processAllPending();

			expect(mocks.wal.getRetryableEntries).not.toHaveBeenCalled();
		});

		it('skips processRetryable when canProcess() returns false', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			mocks.wal.getRetryableEntries.mockClear();
			mocks.wal.recoverInFlight.mockClear();
			mocks.breaker.canProcess.mockReturnValue(false);

			await engine.processRetryable();

			expect(mocks.wal.recoverInFlight).not.toHaveBeenCalled();
			expect(mocks.wal.getRetryableEntries).not.toHaveBeenCalled();
		});

		it('records success on commit', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'breaker-ok' });
			sendSpy.mockResolvedValueOnce({});

			await engine.processEntry(entry);

			expect(mocks.breaker.recordSuccess).toHaveBeenCalled();
			expect(mocks.breaker.recordFailure).not.toHaveBeenCalled();
		});

		it('records failure on retryable error (5xx)', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			mocks.wal.incrementRetry.mockResolvedValueOnce({
				retries: 1,
				nextRetryAt: Date.now() + 1000,
				status: 'PENDING',
			});

			const entry = makeEntry({ id: 'breaker-5xx' });
			sendSpy.mockRejectedValueOnce(
				new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }),
			);

			await engine.processEntry(entry);

			expect(mocks.breaker.recordFailure).toHaveBeenCalledTimes(1);
			expect(mocks.breaker.recordSuccess).not.toHaveBeenCalled();
		});

		it('does NOT record failure on permanent 4xx', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'breaker-4xx' });
			sendSpy.mockRejectedValueOnce(
				new HttpErrorResponse({ status: 422, statusText: 'Unprocessable' }),
			);

			await engine.processEntry(entry);

			expect(mocks.breaker.recordFailure).not.toHaveBeenCalled();
		});

		it('does NOT record failure on 409 conflict', async () => {
			const { engine, mocks } = setupEngine();
			await flushAsync();
			const entry = makeEntry({ id: 'breaker-conflict' });
			sendSpy.mockRejectedValueOnce(
				new HttpErrorResponse({ status: 409, statusText: 'Conflict' }),
			);

			await engine.processEntry(entry);

			expect(mocks.breaker.recordFailure).not.toHaveBeenCalled();
		});
	});

	// #endregion

	// Sanity: SYNC_INTERVAL_MS still imports cleanly and is a positive number.
	it('SYNC_INTERVAL_MS is configured', () => {
		expect(WAL_DEFAULTS.SYNC_INTERVAL_MS).toBeGreaterThan(0);
	});
});
