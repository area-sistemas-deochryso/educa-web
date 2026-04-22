// * Plan 22 Chat B — tests del throttle widget en EmailOutboxDataFacade.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

// * Imports directos (no el barrel @core/services) para evitar side effects al montar TestBed.
import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { StorageService } from '@core/services/storage/storage.service';

import { EmailOutboxApiService } from './email-outbox.service';
import { EmailOutboxStore } from './email-outbox.store';
import { EmailOutboxDataFacade } from './email-outbox-data.facade';
import { ThrottleStatus } from '../models/throttle-status.models';
// #endregion

// #region Mocks
function makeStatus(overrides: Partial<ThrottleStatus> = {}): ThrottleStatus {
	return {
		senders: [
			{ address: 's0@***.com', index: 0, count: 5, limit: 50, saturated: false },
		],
		domainCount: 5,
		domainLimit: 200,
		perSenderLimit: 50,
		throttleEnabled: true,
		nowUtc: '2026-04-22T12:00:00',
		...overrides,
	};
}

function createMockApi() {
	return {
		listar: vi.fn().mockReturnValue(of([])),
		estadisticas: vi.fn().mockReturnValue(of(null)),
		tendencias: vi.fn().mockReturnValue(of([])),
		obtenerHtml: vi.fn().mockReturnValue(of(null)),
		reintentar: vi.fn().mockReturnValue(of(true)),
		throttleStatus: vi.fn().mockReturnValue(of(makeStatus())),
	};
}

function createMockStorage() {
	return {
		getThrottleWidgetAutoRefresh: vi.fn().mockReturnValue(false),
		setThrottleWidgetAutoRefresh: vi.fn(),
		getThrottleWidgetCollapsed: vi.fn().mockReturnValue(false),
		setThrottleWidgetCollapsed: vi.fn(),
	};
}

function createMockErrorHandler() {
	return {
		showError: vi.fn(),
		showSuccess: vi.fn(),
		showWarning: vi.fn(),
		handle: vi.fn(),
	};
}
// #endregion

describe('EmailOutboxDataFacade — throttle widget', () => {
	let facade: EmailOutboxDataFacade;
	let store: EmailOutboxStore;
	let api: ReturnType<typeof createMockApi>;
	let storage: ReturnType<typeof createMockStorage>;
	let errorHandler: ReturnType<typeof createMockErrorHandler>;

	beforeEach(() => {
		api = createMockApi();
		storage = createMockStorage();
		errorHandler = createMockErrorHandler();
		TestBed.configureTestingModule({
			providers: [
				EmailOutboxDataFacade,
				EmailOutboxStore,
				{ provide: EmailOutboxApiService, useValue: api },
				{ provide: StorageService, useValue: storage },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(EmailOutboxDataFacade);
		store = TestBed.inject(EmailOutboxStore);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('loadThrottleStatus: setLoading(true) antes + setThrottleStatus(data) + setLoading(false) después', () => {
		facade.loadThrottleStatus();

		expect(api.throttleStatus).toHaveBeenCalledTimes(1);
		expect(store.throttleStatus()).not.toBeNull();
		expect(store.throttleStatus()!.domainCount).toBe(5);
		expect(store.throttleLoading()).toBe(false);
	});

	it('loadThrottleStatus con error: setLoading(false) + notifica toast', () => {
		api.throttleStatus.mockReturnValueOnce(throwError(() => new Error('500')));

		facade.loadThrottleStatus();

		expect(store.throttleStatus()).toBeNull();
		expect(store.throttleLoading()).toBe(false);
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Throttle',
			expect.stringContaining('No se pudo'),
		);
	});

	it('setThrottleAutoRefresh(true): persiste en prefs + arranca polling que repite cada 30s', () => {
		vi.useFakeTimers();

		facade.setThrottleAutoRefresh(true);
		expect(storage.setThrottleWidgetAutoRefresh).toHaveBeenCalledWith(true);
		expect(store.throttleAutoRefresh()).toBe(true);

		// El facade NO debe llamar loadThrottleStatus al activar el toggle — solo cuando
		// expira el primer tick del interval.
		expect(api.throttleStatus).toHaveBeenCalledTimes(0);

		vi.advanceTimersByTime(30_000);
		expect(api.throttleStatus).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(30_000);
		expect(api.throttleStatus).toHaveBeenCalledTimes(2);
	});

	it('setThrottleAutoRefresh(false): persiste + detiene polling (no hay más calls tras avanzar timers)', () => {
		vi.useFakeTimers();
		facade.setThrottleAutoRefresh(true);
		vi.advanceTimersByTime(30_000);
		expect(api.throttleStatus).toHaveBeenCalledTimes(1);

		facade.setThrottleAutoRefresh(false);
		expect(storage.setThrottleWidgetAutoRefresh).toHaveBeenLastCalledWith(false);
		expect(store.throttleAutoRefresh()).toBe(false);

		vi.advanceTimersByTime(120_000);
		expect(api.throttleStatus).toHaveBeenCalledTimes(1);
	});

	it('setThrottleCollapsed persiste la preferencia y actualiza el store', () => {
		facade.setThrottleCollapsed(true);

		expect(store.throttleCollapsed()).toBe(true);
		expect(storage.setThrottleWidgetCollapsed).toHaveBeenCalledWith(true);
	});

	it('initThrottleWidget hidrata collapsed + autoRefresh desde prefs y dispara loadThrottleStatus', () => {
		storage.getThrottleWidgetAutoRefresh.mockReturnValueOnce(true);
		storage.getThrottleWidgetCollapsed.mockReturnValueOnce(true);

		facade.initThrottleWidget();

		expect(store.throttleAutoRefresh()).toBe(true);
		expect(store.throttleCollapsed()).toBe(true);
		expect(api.throttleStatus).toHaveBeenCalledTimes(1);
	});
});
