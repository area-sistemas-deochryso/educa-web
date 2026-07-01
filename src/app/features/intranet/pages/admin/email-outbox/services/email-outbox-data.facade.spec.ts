// * Plan 22 Chat B — tests del throttle widget en EmailOutboxDataFacade.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

// * Imports directos (no el barrel @core/services) para evitar side effects al montar TestBed.
import { ErrorHandlerService } from '@core/services/error';
import { StorageService } from '@core/services/storage';

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
		count: vi.fn().mockReturnValue(of(0)),
		estadisticas: vi.fn().mockReturnValue(of(null)),
		tendencias: vi.fn().mockReturnValue(of([])),
		obtenerHtml: vi.fn().mockReturnValue(of(null)),
		reintentar: vi.fn().mockReturnValue(of(true)),
		throttleStatus: vi.fn().mockReturnValue(of(makeStatus())),
		deferFailStatus: vi.fn().mockReturnValue(of(null)),
	};
}

function createMockStorage() {
	return {
		getThrottleWidgetAutoRefresh: vi.fn().mockReturnValue(false),
		setThrottleWidgetAutoRefresh: vi.fn(),
		getThrottleWidgetCollapsed: vi.fn().mockReturnValue(false),
		setThrottleWidgetCollapsed: vi.fn(),
		getDeferFailWidgetAutoRefresh: vi.fn().mockReturnValue(false),
		setDeferFailWidgetAutoRefresh: vi.fn(),
		getDeferFailWidgetCollapsed: vi.fn().mockReturnValue(false),
		setDeferFailWidgetCollapsed: vi.fn(),
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
			'Error',
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

// Plan 43 Chat 4.1b — paginación server-side variante B
describe('EmailOutboxDataFacade — paginación + filtros server-side (Plan 43 Chat 4.1b)', () => {
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

	it('loadData dispatch items + count + stats + tendencias en paralelo', () => {
		api.count.mockReturnValueOnce(of(42));

		facade.loadData();

		expect(api.listar).toHaveBeenCalledTimes(1);
		expect(api.count).toHaveBeenCalledTimes(1);
		expect(api.estadisticas).toHaveBeenCalledTimes(1);
		expect(api.tendencias).toHaveBeenCalledTimes(1);
		expect(store.totalCount()).toBe(42);
		expect(store.tableReady()).toBe(true);
		expect(store.statsReady()).toBe(true);
	});

	it('loadData incluye tipoFallo + correlationId en filtros enviados al BE', () => {
		store.setFilterTipoFallo('FAILED_INVALID_ADDRESS');
		store.setFilterCorrelationId('abc-123');

		facade.loadData();

		expect(api.listar).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoFallo: 'FAILED_INVALID_ADDRESS',
				correlationId: 'abc-123',
				page: 1,
				pageSize: 25,
			}),
		);
		expect(api.count).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoFallo: 'FAILED_INVALID_ADDRESS',
				correlationId: 'abc-123',
			}),
		);
	});

	it('loadData fail-safe: count=null cuando el endpoint devuelve null', () => {
		api.count.mockReturnValueOnce(of(null));

		facade.loadData();

		expect(store.totalCount()).toBeNull();
		// El estimate progresivo (offset + items.length) se calcula en el computed.
		expect(store.totalRecordsEstimate()).toBeGreaterThanOrEqual(0);
	});

	it('loadPage actualiza page+pageSize y SOLO llama listar (NO count)', () => {
		// Cargar primero para tener tableReady=true (sino el guard ignora el bounce).
		facade.loadData();
		api.listar.mockClear();
		api.count.mockClear();

		facade.loadPage(3, 50);

		expect(store.page()).toBe(3);
		expect(store.pageSize()).toBe(50);
		expect(api.listar).toHaveBeenCalledTimes(1);
		expect(api.listar).toHaveBeenCalledWith(
			expect.objectContaining({ page: 3, pageSize: 50 }),
		);
		expect(api.count).not.toHaveBeenCalled();
	});

	it('loadPage guard idempotente: ignora el bounce inicial de p-table (misma page+pageSize tras loadData)', () => {
		facade.loadData(); // tableReady=true, page=1, pageSize=25
		api.listar.mockClear();
		api.count.mockClear();

		// p-table emite onLazyLoad inicial con los mismos parámetros — debe ignorarse.
		facade.loadPage(1, 25);

		expect(api.listar).not.toHaveBeenCalled();
	});

	it('clearFilters resetea todos los filtros + page=1 y dispara loadData', () => {
		store.setFilterTipoFallo('FAILED_REJECTED');
		store.setFilterCorrelationId('xyz');
		store.setSearchTerm('foo');
		store.setPage(5);
		api.listar.mockClear();
		api.count.mockClear();

		facade.clearFilters();

		expect(store.filterTipoFallo()).toBeNull();
		expect(store.filterCorrelationId()).toBeNull();
		expect(store.searchTerm()).toBe('');
		expect(store.page()).toBe(1);
		expect(api.listar).toHaveBeenCalledTimes(1);
		expect(api.count).toHaveBeenCalledTimes(1);
	});

	it('onFilterTipoFalloChange (bug fix): ahora SÍ dispara loadData + resetea page=1', () => {
		store.setPage(7);
		api.listar.mockClear();
		api.count.mockClear();

		facade.onFilterTipoFalloChange('FAILED_UNKNOWN');

		expect(store.filterTipoFallo()).toBe('FAILED_UNKNOWN');
		expect(store.page()).toBe(1);
		expect(api.listar).toHaveBeenCalledTimes(1);
		expect(api.count).toHaveBeenCalledTimes(1);
	});

	it('onFilterCorrelationIdChange setea + dispara loadData + resetea page=1', () => {
		store.setPage(3);
		api.listar.mockClear();
		api.count.mockClear();

		facade.onFilterCorrelationIdChange('corr-456');

		expect(store.filterCorrelationId()).toBe('corr-456');
		expect(store.page()).toBe(1);
		expect(api.listar).toHaveBeenCalledTimes(1);
		expect(api.count).toHaveBeenCalledTimes(1);
	});
});
