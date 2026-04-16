// * Tests for NotificacionesAdminFacade — validates notification CRUD orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { NotificacionesAdminFacade } from './notificaciones-admin.facade';
import { NotificacionesAdminStore } from './notificaciones-admin.store';
import { NotificacionesAdminService } from './notificaciones-admin.service';
import { ErrorHandlerService, SwService, WalFacadeHelper } from '@core/services';
import { NotificacionLista, NotificacionesEstadisticas } from '@data/models';

// #endregion

// #region Mocks
const mockItems: NotificacionLista[] = [
	{
		id: 1, titulo: 'Matrícula', mensaje: 'Abierta', tipo: 'evento',
		prioridad: 'high', icono: 'pi-bell', fechaInicio: '2026-01-01',
		fechaFin: '2026-02-28', actionUrl: null, actionText: null,
		dismissible: true, estado: true, anio: 2026,
		fechaCreacion: '2026-01-01', fechaModificacion: null, rowVersion: 'v1',
	},
];

const mockStats: NotificacionesEstadisticas = { total: 1, activas: 1, inactivas: 0, vigentesHoy: 1 };

function createMockApi() {
	return {
		listar: vi.fn().mockReturnValue(of(mockItems)),
		getEstadisticas: vi.fn().mockReturnValue(of(mockStats)),
		crear: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		actualizar: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		toggleEstado: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminar: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

// Controllable WAL mock: captures configs, auto-calls optimistic.apply on execute.
interface WalConfig {
	operation: string;
	optimistic?: { apply: () => void; rollback: () => void };
	onCommit: (result?: unknown) => void;
	onError: (err: unknown) => void;
}

function createControllableWal() {
	const configs: WalConfig[] = [];
	const execute = vi.fn((config: WalConfig) => {
		configs.push(config);
		config.optimistic?.apply();
	});
	return {
		execute,
		last: () => configs[configs.length - 1],
		commit: (result?: unknown) => configs[configs.length - 1].onCommit(result),
		fail: (err: unknown) => {
			const cfg = configs[configs.length - 1];
			cfg.optimistic?.rollback();
			cfg.onError(err);
		},
	};
}

function createMockSwService() {
	return { invalidateCacheByPattern: vi.fn().mockResolvedValue(0), clearCache: vi.fn() };
}
// #endregion

// #region Tests
describe('NotificacionesAdminFacade', () => {
	let facade: NotificacionesAdminFacade;
	let store: NotificacionesAdminStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: { showError: ReturnType<typeof vi.fn> };
	let wal: ReturnType<typeof createControllableWal>;

	beforeEach(() => {
		api = createMockApi();
		errorHandler = { showError: vi.fn(), showSuccess: vi.fn() } as never;
		wal = createControllableWal();

		TestBed.configureTestingModule({
			providers: [
				NotificacionesAdminFacade,
				NotificacionesAdminStore,
				{ provide: NotificacionesAdminService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: SwService, useValue: createMockSwService() },
			],
		});

		facade = TestBed.inject(NotificacionesAdminFacade);
		store = TestBed.inject(NotificacionesAdminStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load items and stats', () => {
			facade.loadAll();

			expect(store.items()).toEqual(mockItems);
			expect(store.estadisticas()).toEqual(mockStats);
			expect(store.loading()).toBe(false);
		});

		it('should call API on load', () => {
			api.listar.mockReturnValue(throwError(() => new Error('fail')));
			api.getEstadisticas.mockReturnValue(throwError(() => new Error('fail')));
			facade.loadAll();

			expect(api.listar).toHaveBeenCalled();
			expect(api.getEstadisticas).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region create
	describe('create', () => {
		beforeEach(() => {
			store.setEstadisticas(mockStats);
			store.setFormData({
				...store.formData(),
				titulo: 'Nueva',
				mensaje: 'Mensaje',
				fechaInicio: '2026-03-01',
				fechaFin: '2026-03-31',
				estado: true,
			});
		});

		it('should execute WAL, close dialog, increment stats optimistically', () => {
			facade.create();

			expect(wal.execute).toHaveBeenCalledTimes(1);
			expect(wal.last().operation).toBe('CREATE');
			expect(store.dialogVisible()).toBe(false);
			expect(store.estadisticas()!.total).toBe(2);
			expect(store.estadisticas()!.activas).toBe(2);
		});

		it('should increment inactivas for inactive notification', () => {
			store.setFormData({ ...store.formData(), estado: false });
			facade.create();

			expect(store.estadisticas()!.inactivas).toBe(1);
		});
	});
	// #endregion

	// #region toggleEstado
	describe('toggleEstado', () => {
		beforeEach(() => {
			store.setItems(mockItems);
			store.setEstadisticas(mockStats);
		});

		it('should toggle and update stats', () => {
			facade.toggleEstado(mockItems[0]);

			expect(store.items()[0].estado).toBe(false);
			expect(store.estadisticas()!.activas).toBe(0);
			expect(store.estadisticas()!.inactivas).toBe(1);
		});
	});
	// #endregion

	// #region delete
	describe('delete', () => {
		beforeEach(() => {
			store.setItems(mockItems);
			store.setEstadisticas(mockStats);
		});

		it('should remove item and decrement stats', () => {
			facade.delete(mockItems[0]);

			expect(store.items()).toHaveLength(0);
			expect(store.estadisticas()!.total).toBe(0);
			expect(store.estadisticas()!.activas).toBe(0);
		});
	});
	// #endregion

	// #region UI commands
	describe('UI commands', () => {
		it('should open edit dialog with data', () => {
			facade.openEditDialog(mockItems[0]);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.formData().titulo).toBe('Matrícula');
			expect(store.formData().fechaInicio).toBe('2026-01-01');
		});

		it('should change año and reload', () => {
			facade.changeAnio(2025);
			expect(store.filterAnio()).toBe(2025);
			expect(api.listar).toHaveBeenCalledWith(2025);
		});
	});
	// #endregion
});
// #endregion
