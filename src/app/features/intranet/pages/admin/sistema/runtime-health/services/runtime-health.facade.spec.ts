// * Brief 102 — tests del facade de runtime health (load + polling + preferencias).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { StorageService } from '@core/services/storage/storage.service';

import { RuntimeHealthFacade } from './runtime-health.facade';
import { RuntimeHealthService } from './runtime-health.service';
import { RuntimeHealthStore } from './runtime-health.store';
import { RuntimeHealthSnapshot } from '../models/runtime-health.models';
// #endregion

// #region Helpers
function makeSnapshot(): RuntimeHealthSnapshot {
	return {
		generatedAt: '2026-05-05T10:00:00',
		pattern: 'OK',
		patternReason: 'all metrics within thresholds',
		threadPool: {
			workerThreadsBusy: 0,
			workerThreadsMax: 100,
			completionPortBusy: 0,
			completionPortMax: 100,
			queueLength: 0,
			completedItemsCount: 0,
		},
		requests: { inFlight: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, countLast5Min: 0 },
		db: {
			activeConnections: 0,
			pooledConnections: 0,
			avgLatencyMs: 0,
			p95LatencyMs: 0,
		},
		gc: {
			gen0Collections: 0,
			gen1Collections: 0,
			gen2Collections: 0,
			heapSizeBytes: 0,
			totalAllocatedBytes: 0,
		},
	};
}

function mockApi() {
	return {
		getSnapshot: vi.fn().mockReturnValue(of(makeSnapshot())),
	};
}

function mockStorage() {
	return {
		getRuntimeHealthWidgetAutoRefresh: vi.fn().mockReturnValue(false),
		setRuntimeHealthWidgetAutoRefresh: vi.fn(),
		getRuntimeHealthWidgetCollapsed: vi.fn().mockReturnValue(false),
		setRuntimeHealthWidgetCollapsed: vi.fn(),
	};
}
// #endregion

describe('RuntimeHealthFacade', () => {
	let api: ReturnType<typeof mockApi>;
	let prefs: ReturnType<typeof mockStorage>;
	let facade: RuntimeHealthFacade;
	let store: RuntimeHealthStore;

	beforeEach(() => {
		api = mockApi();
		prefs = mockStorage();

		TestBed.configureTestingModule({
			providers: [
				RuntimeHealthFacade,
				RuntimeHealthStore,
				{ provide: RuntimeHealthService, useValue: api },
				{ provide: StorageService, useValue: prefs },
			],
		});
		facade = TestBed.inject(RuntimeHealthFacade);
		store = TestBed.inject(RuntimeHealthStore);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('init carga snapshot y respeta preferencia de autoRefresh=false', () => {
		facade.init();
		expect(api.getSnapshot).toHaveBeenCalledTimes(1);
		expect(store.snapshot()).not.toBeNull();
		expect(store.autoRefresh()).toBe(false);
	});

	it('init con autoRefresh=true arranca polling cada 60s', () => {
		vi.useFakeTimers();
		prefs.getRuntimeHealthWidgetAutoRefresh.mockReturnValue(true);

		facade.init();
		expect(api.getSnapshot).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(60_000);
		expect(api.getSnapshot).toHaveBeenCalledTimes(2);

		vi.advanceTimersByTime(60_000);
		expect(api.getSnapshot).toHaveBeenCalledTimes(3);
	});

	it('setAutoRefresh persiste preferencia y togglea polling', () => {
		vi.useFakeTimers();
		facade.init();
		expect(api.getSnapshot).toHaveBeenCalledTimes(1);

		facade.setAutoRefresh(true);
		expect(prefs.setRuntimeHealthWidgetAutoRefresh).toHaveBeenCalledWith(true);
		vi.advanceTimersByTime(60_000);
		expect(api.getSnapshot).toHaveBeenCalledTimes(2);

		facade.setAutoRefresh(false);
		expect(prefs.setRuntimeHealthWidgetAutoRefresh).toHaveBeenCalledWith(false);
		vi.advanceTimersByTime(120_000);
		// El interval se canceló: count no aumenta
		expect(api.getSnapshot).toHaveBeenCalledTimes(2);
	});

	it('setCollapsed persiste preferencia', () => {
		facade.setCollapsed(true);
		expect(store.collapsed()).toBe(true);
		expect(prefs.setRuntimeHealthWidgetCollapsed).toHaveBeenCalledWith(true);
	});

	it('load setea error cuando el API falla', () => {
		api.getSnapshot.mockReturnValueOnce(throwError(() => new Error('boom')));
		facade.load();
		expect(store.error()).toContain('No se pudo cargar');
		expect(store.loading()).toBe(false);
	});
});
