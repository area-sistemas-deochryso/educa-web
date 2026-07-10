// #region Imports
import { DestroyRef, Injectable, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { BaseCrudFacade, type BaseCrudFacadeConfig, type EstadisticaKeys, type PaginatedResult } from './base-crud.facade';
import { BaseCrudStore } from '@core/store';
import { ErrorHandlerService, ActivityTrackerService } from '@core/services/error';
import { SwService } from '@core/services/sw';
import { WalFacadeHelper, WalCrossTabRefetchService } from '@core/services/wal';

vi.mock('@core/helpers', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		withRetry: () => <T>(source: import('rxjs').Observable<T>) => source,
	};
});
// #endregion

// #region Test types
interface TestItem {
	id: number;
	nombre: string;
	estado: boolean;
}

interface TestForm {
	nombre: string;
}

interface TestStats {
	total: number;
	activos: number;
	inactivos: number;
}
// #endregion

// #region Test store
@Injectable()
class TestStore extends BaseCrudStore<TestItem, TestForm, TestStats> {
	constructor() {
		super({ nombre: '' }, { total: 0, activos: 0, inactivos: 0 });
	}

	protected override getDefaultFormData(): TestForm {
		return { nombre: '' };
	}
}
// #endregion

// #region Test facade
@Injectable()
class TestCrudFacade extends BaseCrudFacade<TestItem, TestForm, TestStats> {
	override readonly store = inject(TestStore) as unknown as BaseCrudStore<TestItem, TestForm, TestStats>;
	override readonly config: BaseCrudFacadeConfig = {
		tag: 'TestFacade',
		resourceType: 'test-items',
		apiUrl: '/api/test-items',
		loadErrorMessage: 'Error al cargar items',
	};

	fetchItems$ = vi.fn<[], ReturnType<typeof of<PaginatedResult<TestItem>>>>();
	fetchEstadisticas$ = vi.fn<[], ReturnType<typeof of<TestStats>>>();

	constructor() {
		super();
		this.initErrorHandler();
		this.initCrossTabRefetch();
	}

	protected override fetchItems() { return this.fetchItems$(); }
	protected override fetchEstadisticas() { return this.fetchEstadisticas$(); }

	// Expose protected methods
	doWalCreate(payload: unknown, http$: () => ReturnType<typeof of>, suffix?: string): void {
		this.walCreate(payload, http$, suffix);
	}

	doWalUpdate(id: number, payload: unknown, updates: Partial<TestItem>, http$: () => ReturnType<typeof of>, suffix?: string): void {
		this.walUpdate(id, payload, updates, http$, suffix);
	}

	doWalToggle(
		item: TestItem,
		payload: unknown,
		http$: () => ReturnType<typeof of>,
		statsKeys: EstadisticaKeys,
		toggleFn: (id: number) => void,
	): void {
		this.walToggle(item, payload, http$, statsKeys, toggleFn);
	}

	doWalDelete(
		item: TestItem,
		http$: () => ReturnType<typeof of>,
		statsKeys: EstadisticaKeys,
		suffix?: string,
		mode?: 'soft' | 'hard',
	): void {
		this.walDelete(item, http$, statsKeys, suffix, mode);
	}

	doRefreshEstadisticas(): void {
		this.refreshEstadisticas();
	}

	doSilentRefreshAfterCrud(): void {
		this.silentRefreshAfterCrud();
	}

	doGetCachePattern(): string {
		return this.getCachePattern();
	}
}
// #endregion

// #region Test fixtures
function makePaginatedResult(items: TestItem[] = []): PaginatedResult<TestItem> {
	return { data: items, page: 1, pageSize: 10, total: items.length };
}

function makeStats(overrides: Partial<TestStats> = {}): TestStats {
	return { total: 10, activos: 7, inactivos: 3, ...overrides };
}

const SAMPLE_ITEM: TestItem = { id: 1, nombre: 'Item 1', estado: true };
const SAMPLE_ITEM_2: TestItem = { id: 2, nombre: 'Item 2', estado: false };
// #endregion

// #region NoCrossTab facade (for crossTabRefetch === false test)
@Injectable()
class NoCrossTabFacade extends BaseCrudFacade<TestItem, TestForm, TestStats> {
	override readonly store = inject(TestStore) as unknown as BaseCrudStore<TestItem, TestForm, TestStats>;
	override readonly config: BaseCrudFacadeConfig = {
		tag: 'NoCrossTabFacade',
		resourceType: 'test-items',
		apiUrl: '/api/test-items',
		loadErrorMessage: 'Error',
		crossTabRefetch: false,
	};

	constructor() {
		super();
		this.initErrorHandler();
		this.initCrossTabRefetch();
	}

	protected override fetchItems() { return of(makePaginatedResult()); }
	protected override fetchEstadisticas() { return of(makeStats()); }
}
// #endregion

// #region Tests
describe('BaseCrudFacade', () => {
	let facade: TestCrudFacade;
	let store: TestStore;
	let errorHandlerMock: { showError: ReturnType<typeof vi.fn> };
	let swServiceMock: { invalidateCacheByPattern: ReturnType<typeof vi.fn> };
	let crossTabRefetchMock: { subscribe: ReturnType<typeof vi.fn> };
	let activityTrackerMock: { track: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		errorHandlerMock = { showError: vi.fn() };
		swServiceMock = { invalidateCacheByPattern: vi.fn().mockResolvedValue(0) };
		crossTabRefetchMock = { subscribe: vi.fn() };
		activityTrackerMock = { track: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				TestStore,
				TestCrudFacade,
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
				{ provide: SwService, useValue: swServiceMock },
				{ provide: WalFacadeHelper, useValue: { execute: vi.fn() } },
				{ provide: WalCrossTabRefetchService, useValue: crossTabRefetchMock },
				{ provide: ActivityTrackerService, useValue: activityTrackerMock },
				{ provide: DestroyRef, useValue: { onDestroy: vi.fn() } },
			],
		});

		store = TestBed.inject(TestStore);
		facade = TestBed.inject(TestCrudFacade);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// #region loadAll
	describe('loadAll', () => {
		it('sets loading true and clears error on start', () => {
			const setLoadingSpy = vi.spyOn(store, 'setLoading');
			const clearErrorSpy = vi.spyOn(store, 'clearError');
			facade.fetchItems$.mockReturnValue(of(makePaginatedResult()));
			facade.fetchEstadisticas$.mockReturnValue(of(makeStats()));

			facade.loadAll();

			expect(clearErrorSpy).toHaveBeenCalled();
			expect(setLoadingSpy).toHaveBeenCalledWith(true);
		});

		it('on success sets items, pagination, stats, and loading false', () => {
			const items = [SAMPLE_ITEM, SAMPLE_ITEM_2];
			const paginated = { data: items, page: 2, pageSize: 5, total: 20 };
			const stats = makeStats();
			facade.fetchItems$.mockReturnValue(of(paginated));
			facade.fetchEstadisticas$.mockReturnValue(of(stats));

			facade.loadAll();

			expect(store.items()).toEqual(items);
			expect(store.page()).toBe(2);
			expect(store.pageSize()).toBe(5);
			expect(store.totalRecords()).toBe(20);
			expect(store.estadisticas()).toEqual(stats);
			expect(store.loading()).toBe(false);
		});

		it('on error shows error toast, sets error message, and loading false', () => {
			facade.fetchItems$.mockReturnValue(throwError(() => new Error('network')));
			facade.fetchEstadisticas$.mockReturnValue(of(makeStats()));

			facade.loadAll();

			expect(errorHandlerMock.showError).toHaveBeenCalled();
			expect(store.error()).toBe('Error al cargar items');
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region loadPage
	describe('loadPage', () => {
		it('sets page, pageSize, and refreshes items', () => {
			const setPageSpy = vi.spyOn(store, 'setPage');
			const setPageSizeSpy = vi.spyOn(store, 'setPageSize');
			facade.fetchItems$.mockReturnValue(of(makePaginatedResult()));

			facade.loadPage(3, 25);

			expect(setPageSpy).toHaveBeenCalledWith(3);
			expect(setPageSizeSpy).toHaveBeenCalledWith(25);
		});
	});
	// #endregion

	// #region refresh
	describe('refresh', () => {
		it('invalidates SW cache then calls loadAll', async () => {
			facade.fetchItems$.mockReturnValue(of(makePaginatedResult([SAMPLE_ITEM])));
			facade.fetchEstadisticas$.mockReturnValue(of(makeStats()));

			facade.refresh();

			expect(swServiceMock.invalidateCacheByPattern).toHaveBeenCalledWith('/test-items');
			await vi.waitFor(() => {
				expect(store.items()).toEqual([SAMPLE_ITEM]);
			});
		});
	});
	// #endregion

	// #region getCachePattern
	describe('getCachePattern', () => {
		it('returns lowercase resourceType', () => {
			expect(facade.doGetCachePattern()).toBe('/test-items');
		});
	});
	// #endregion

	// #region Dialog delegation
	describe('dialog delegation', () => {
		it('openEditDialog tracks activity, sets selected item, form data, isEditing, opens dialog', () => {
			facade.openEditDialog(SAMPLE_ITEM);

			expect(activityTrackerMock.track).toHaveBeenCalledWith(
				'USER_ACTION',
				expect.stringContaining('Editar'),
				expect.objectContaining({ action: 'click' }),
			);
			expect(store.selectedItem()).toEqual(SAMPLE_ITEM);
			expect(store.isEditing()).toBe(true);
			expect(store.dialogVisible()).toBe(true);
		});

		it('openNewDialog tracks activity, closes then opens dialog', () => {
			store.openDialog();
			expect(store.dialogVisible()).toBe(true);

			facade.openNewDialog();

			expect(activityTrackerMock.track).toHaveBeenCalledWith(
				'USER_ACTION',
				expect.stringContaining('Crear'),
				expect.objectContaining({ action: 'click' }),
			);
			expect(store.dialogVisible()).toBe(true);
		});

		it('closeDialog delegates to store', () => {
			store.openDialog();
			facade.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});

		it('openConfirmDialog tracks activity and delegates to store', () => {
			facade.openConfirmDialog();

			expect(activityTrackerMock.track).toHaveBeenCalledWith(
				'USER_ACTION',
				expect.stringContaining('Confirmar'),
				expect.objectContaining({ action: 'click' }),
			);
			expect(store.confirmDialogVisible()).toBe(true);
		});

		it('closeConfirmDialog delegates to store', () => {
			store.openConfirmDialog();
			facade.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Filters
	describe('filters', () => {
		it('setSearchTerm sets term, resets page to 1, refreshes', () => {
			store.setPage(5);
			facade.fetchItems$.mockReturnValue(of(makePaginatedResult()));

			facade.setSearchTerm('test');

			expect(store.searchTerm()).toBe('test');
			expect(store.page()).toBe(1);
		});

		it('setFilterEstado sets filter, resets page to 1, refreshes', () => {
			store.setPage(3);
			facade.fetchItems$.mockReturnValue(of(makePaginatedResult()));

			facade.setFilterEstado(true);

			expect(store.filterEstado()).toBe(true);
			expect(store.page()).toBe(1);
		});

		it('clearFilters clears filtros and refreshes', () => {
			store.setSearchTerm('old');
			store.setFilterEstado(false);
			facade.fetchItems$.mockReturnValue(of(makePaginatedResult()));

			facade.clearFilters();

			expect(store.searchTerm()).toBe('');
			expect(store.filterEstado()).toBeNull();
		});
	});
	// #endregion

	// #region WAL CRUD
	describe('WAL CRUD delegation', () => {
		it('walCreate delegates to crudOps.walCreate with correct params', () => {
			const walCreateSpy = vi.spyOn(facade['crudOps'], 'walCreate');
			const payload = { nombre: 'Nuevo' };
			const http$ = () => of({});

			facade.doWalCreate(payload, http$);

			expect(walCreateSpy).toHaveBeenCalledWith(
				payload,
				http$,
				expect.objectContaining({ endpointSuffix: 'crear' }),
			);
		});

		it('walCreate uses custom endpointSuffix', () => {
			const walCreateSpy = vi.spyOn(facade['crudOps'], 'walCreate');
			facade.doWalCreate({}, () => of({}), 'custom-crear');

			expect(walCreateSpy).toHaveBeenCalledWith(
				{},
				expect.any(Function),
				expect.objectContaining({ endpointSuffix: 'custom-crear' }),
			);
		});

		it('walUpdate delegates to crudOps.walUpdate', () => {
			const walUpdateSpy = vi.spyOn(facade['crudOps'], 'walUpdate');
			const updates: Partial<TestItem> = { nombre: 'Editado' };

			facade.doWalUpdate(1, { nombre: 'Editado' }, updates, () => of({}));

			expect(walUpdateSpy).toHaveBeenCalledWith(
				1,
				{ nombre: 'Editado' },
				updates,
				expect.any(Function),
				expect.objectContaining({ endpointSuffix: '1/actualizar' }),
			);
		});

		it('walToggle delegates to crudOps.walToggle with stats delta', () => {
			const walToggleSpy = vi.spyOn(facade['crudOps'], 'walToggle');
			const statsKeys: EstadisticaKeys = { total: 'total', activos: 'activos', inactivos: 'inactivos' };
			const toggleFn = vi.fn();

			facade.doWalToggle(SAMPLE_ITEM, {}, () => of({}), statsKeys, toggleFn);

			expect(walToggleSpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: 1 }),
				{},
				expect.any(Function),
				toggleFn,
				expect.objectContaining({ statsDelta: expect.any(Function) }),
			);
		});

		it('walDelete soft delegates to crudOps.walDeleteSoft', () => {
			const walDeleteSoftSpy = vi.spyOn(facade['crudOps'], 'walDeleteSoft');
			const statsKeys: EstadisticaKeys = { total: 'total', activos: 'activos', inactivos: 'inactivos' };

			facade.doWalDelete(SAMPLE_ITEM, () => of({}), statsKeys);

			expect(walDeleteSoftSpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: 1 }),
				expect.any(Function),
				expect.objectContaining({ statsDelta: expect.any(Function) }),
			);
		});

		it('walDelete hard delegates to crudOps.walDeleteHard', () => {
			const walDeleteHardSpy = vi.spyOn(facade['crudOps'], 'walDeleteHard');
			const statsKeys: EstadisticaKeys = { total: 'total', activos: 'activos', inactivos: 'inactivos' };

			facade.doWalDelete(SAMPLE_ITEM, () => of({}), statsKeys, undefined, 'hard');

			expect(walDeleteHardSpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: 1 }),
				expect.any(Function),
				expect.objectContaining({ statsDelta: expect.any(Function) }),
			);
		});
	});
	// #endregion

	// #region refreshEstadisticas
	describe('refreshEstadisticas', () => {
		it('fetches and sets stats on success', () => {
			const stats = makeStats({ total: 42 });
			facade.fetchEstadisticas$.mockReturnValue(of(stats));

			facade.doRefreshEstadisticas();

			expect(store.estadisticas()).toEqual(stats);
		});

		it('shows error on failure', () => {
			facade.fetchEstadisticas$.mockReturnValue(throwError(() => new Error('fail')));

			facade.doRefreshEstadisticas();

			expect(errorHandlerMock.showError).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region silentRefreshAfterCrud
	describe('silentRefreshAfterCrud', () => {
		it('refreshes items without setting loading', () => {
			const setLoadingSpy = vi.spyOn(store, 'setLoading');
			facade.fetchItems$.mockReturnValue(of(makePaginatedResult([SAMPLE_ITEM])));

			facade.doSilentRefreshAfterCrud();

			expect(store.items()).toEqual([SAMPLE_ITEM]);
			expect(setLoadingSpy).not.toHaveBeenCalledWith(true);
		});
	});
	// #endregion

	// #region initCrossTabRefetch
	describe('initCrossTabRefetch', () => {
		it('subscribes to cross-tab refetch with correct resourceType', () => {
			expect(crossTabRefetchMock.subscribe).toHaveBeenCalledWith(
				expect.objectContaining({
					resourceType: 'test-items',
					refetchItems: expect.any(Function),
					refetchStats: expect.any(Function),
				}),
			);
		});

		it('skips subscription when config.crossTabRefetch is false', () => {
			const localCrossTabMock = { subscribe: vi.fn() };

			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					TestStore,
					NoCrossTabFacade,
					{ provide: ErrorHandlerService, useValue: errorHandlerMock },
					{ provide: SwService, useValue: swServiceMock },
					{ provide: WalFacadeHelper, useValue: { execute: vi.fn() } },
					{ provide: WalCrossTabRefetchService, useValue: localCrossTabMock },
					{ provide: ActivityTrackerService, useValue: activityTrackerMock },
					{ provide: DestroyRef, useValue: { onDestroy: vi.fn() } },
				],
			});

			TestBed.inject(NoCrossTabFacade);

			expect(localCrossTabMock.subscribe).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region resolveEstadoActivo
	describe('resolveEstadoActivo (via walToggle stats delta)', () => {
		it('treats boolean true as activo', () => {
			const incrementSpy = vi.spyOn(store, 'incrementarEstadistica');
			vi.spyOn(facade['crudOps'], 'walToggle').mockImplementation(
				(_item, _payload, _http$, _toggleFn, options) => {
					options?.statsDelta?.(1);
				},
			);

			const statsKeys: EstadisticaKeys = { total: 'total', activos: 'activos', inactivos: 'inactivos' };
			facade.doWalToggle({ id: 1, nombre: 'A', estado: true }, {}, () => of({}), statsKeys, vi.fn());

			expect(incrementSpy).toHaveBeenCalledWith('activos', -1);
			expect(incrementSpy).toHaveBeenCalledWith('inactivos', 1);
		});

		it('treats boolean false as inactivo', () => {
			const incrementSpy = vi.spyOn(store, 'incrementarEstadistica');
			vi.spyOn(facade['crudOps'], 'walToggle').mockImplementation(
				(_item, _payload, _http$, _toggleFn, options) => {
					options?.statsDelta?.(1);
				},
			);

			const statsKeys: EstadisticaKeys = { total: 'total', activos: 'activos', inactivos: 'inactivos' };
			facade.doWalToggle({ id: 2, nombre: 'B', estado: false }, {}, () => of({}), statsKeys, vi.fn());

			expect(incrementSpy).toHaveBeenCalledWith('activos', 1);
			expect(incrementSpy).toHaveBeenCalledWith('inactivos', -1);
		});

		it('treats number 1 as activo', () => {
			const incrementSpy = vi.spyOn(store, 'incrementarEstadistica');
			vi.spyOn(facade['crudOps'], 'walToggle').mockImplementation(
				(_item, _payload, _http$, _toggleFn, options) => {
					options?.statsDelta?.(1);
				},
			);

			const statsKeys: EstadisticaKeys = { total: 'total', activos: 'activos', inactivos: 'inactivos' };
			const numericItem = { id: 3, nombre: 'C', estado: 1 as unknown as boolean };
			facade.doWalToggle(numericItem, {}, () => of({}), statsKeys, vi.fn());

			expect(incrementSpy).toHaveBeenCalledWith('activos', -1);
			expect(incrementSpy).toHaveBeenCalledWith('inactivos', 1);
		});

		it('treats number 0 as inactivo', () => {
			const incrementSpy = vi.spyOn(store, 'incrementarEstadistica');
			vi.spyOn(facade['crudOps'], 'walToggle').mockImplementation(
				(_item, _payload, _http$, _toggleFn, options) => {
					options?.statsDelta?.(1);
				},
			);

			const statsKeys: EstadisticaKeys = { total: 'total', activos: 'activos', inactivos: 'inactivos' };
			const numericItem = { id: 4, nombre: 'D', estado: 0 as unknown as boolean };
			facade.doWalToggle(numericItem, {}, () => of({}), statsKeys, vi.fn());

			expect(incrementSpy).toHaveBeenCalledWith('activos', 1);
			expect(incrementSpy).toHaveBeenCalledWith('inactivos', -1);
		});
	});
	// #endregion

	// #region mapItemToFormData
	describe('mapItemToFormData (via openEditDialog)', () => {
		it('maps item to form data by default (identity)', () => {
			facade.openEditDialog(SAMPLE_ITEM);
			expect(store.formData()).toEqual(SAMPLE_ITEM);
		});
	});
	// #endregion
});
// #endregion
