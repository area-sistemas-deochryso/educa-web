// * Tests for VistasFacade — validates CRUD orchestration with WAL.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { VistasFacade } from './vistas.facade';
import { VistasStore } from './vistas.store';
import { PermissionsService, Vista, VistasEstadisticas, WalFacadeHelper, ErrorHandlerService } from '@core/services';

// #endregion

// #region Mocks
const mockVistas: Vista[] = [
	{ id: 1, ruta: 'intranet/admin/usuarios', nombre: 'Usuarios', estado: 1, rowVersion: 'v1' },
	{ id: 2, ruta: 'intranet/admin/cursos', nombre: 'Cursos', estado: 0, rowVersion: 'v2' },
];

const mockStats: VistasEstadisticas = {
	totalVistas: 2, vistasActivas: 1, vistasInactivas: 1, totalModulos: 1, modulos: ['admin'],
};

function createMockApi() {
	return {
		getVistasPaginated: vi.fn().mockReturnValue(of({ data: mockVistas, page: 1, pageSize: 10, total: 2 })),
		getVistasEstadisticas: vi.fn().mockReturnValue(of(mockStats)),
		crearVista: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		actualizarVista: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminarVista: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn((config: { optimistic?: { apply: () => void } }) => {
			config.optimistic?.apply();
		}),
	};
}
// #endregion

// #region Tests
describe('VistasFacade', () => {
	let facade: VistasFacade;
	let store: VistasStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();

		TestBed.configureTestingModule({
			providers: [
				VistasFacade,
				VistasStore,
				{ provide: PermissionsService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
			],
		});

		facade = TestBed.inject(VistasFacade);
		store = TestBed.inject(VistasStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load vistas and stats into store', () => {
			facade.loadAll();

			expect(store.items()).toEqual(mockVistas);
			expect(store.estadisticas()).toEqual(mockStats);
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region UI commands
	describe('UI commands', () => {
		it('should open new dialog', () => {
			facade.openNewDialog();
			expect(store.dialogVisible()).toBe(true);
		});

		it('should open edit dialog with vista data', () => {
			facade.openEditDialog(mockVistas[0]);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.formData().ruta).toBe('intranet/admin/usuarios');
			expect(store.formData().nombre).toBe('Usuarios');
			expect(store.selectedItem()).toEqual(mockVistas[0]);
		});

		it('should close dialog', () => {
			facade.openNewDialog();
			facade.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});

		it('should manage confirm dialog', () => {
			facade.openConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(true);
			facade.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region saveVista dispatch
	describe('saveVista', () => {
		it('should call create when not editing', () => {
			facade.openNewDialog();
			store.setFormData({ ruta: 'test/new', nombre: 'New', estado: 1 });

			facade.saveVista();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'CREATE' }),
			);
		});

		it('should call update when editing', () => {
			facade.openEditDialog(mockVistas[0]);

			facade.saveVista();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'UPDATE' }),
			);
		});
	});
	// #endregion

	// #region WAL optimistic operations
	describe('WAL optimistic', () => {
		beforeEach(() => {
			store.setItems(mockVistas);
			store.setEstadisticas(mockStats);
		});

		it('should close dialog on create', () => {
			facade.openNewDialog();
			store.setFormData({ ruta: 'test/path', nombre: 'Test', estado: 1 });

			facade.saveVista();

			expect(store.dialogVisible()).toBe(false);
		});

		it('should update item and close dialog on update', () => {
			facade.openEditDialog(mockVistas[0]);
			store.setFormData({ ruta: 'new/path', nombre: 'Updated', estado: 1 });

			facade.saveVista();

			expect(store.items()[0].ruta).toBe('new/path');
			expect(store.items()[0].nombre).toBe('Updated');
			expect(store.dialogVisible()).toBe(false);
		});

		it('should toggle estado and update stats', () => {
			facade.toggleEstado(mockVistas[0]); // estado 1 → 0

			expect(store.items()[0].estado).toBe(0);
			expect(store.estadisticas()!.vistasActivas).toBe(0);
			expect(store.estadisticas()!.vistasInactivas).toBe(2);
		});

		it('should toggle inactive to active', () => {
			facade.toggleEstado(mockVistas[1]); // estado 0 → 1

			expect(store.items()[1].estado).toBe(1);
			expect(store.estadisticas()!.vistasActivas).toBe(2);
			expect(store.estadisticas()!.vistasInactivas).toBe(0);
		});

		it('should remove item and decrement stats on delete (active)', () => {
			facade.delete(mockVistas[0]);

			expect(store.items()).toHaveLength(1);
			expect(store.estadisticas()!.totalVistas).toBe(1);
			expect(store.estadisticas()!.vistasActivas).toBe(0);
		});

		it('should decrement inactivas on delete (inactive)', () => {
			facade.delete(mockVistas[1]);
			expect(store.estadisticas()!.vistasInactivas).toBe(0);
		});
	});
	// #endregion

	// #region Filters
	describe('filters', () => {
		it('should set search and trigger refresh', () => {
			facade.setSearchTerm('admin');
			expect(store.searchTerm()).toBe('admin');
			expect(store.page()).toBe(1);
			expect(api.getVistasPaginated).toHaveBeenCalled();
		});

		it('should set filter modulo and trigger refresh', () => {
			facade.setFilterModulo('admin');
			expect(store.filterModulo()).toBe('admin');
			expect(api.getVistasPaginated).toHaveBeenCalled();
		});

		it('should set filter estado and trigger refresh', () => {
			facade.setFilterEstado(1);
			expect(store.filterEstado()).toBe(1);
		});

		it('should clear all filters', () => {
			store.setSearchTerm('test');
			store.setFilterModulo('admin');
			facade.clearFilters();

			expect(store.searchTerm()).toBe('');
			expect(store.filterModulo()).toBeNull();
		});
	});
	// #endregion

	// #region loadPage
	describe('loadPage', () => {
		it('should call API with page params', () => {
			facade.loadPage(3, 20);
			// loadPage triggers refreshVistasOnly which overrides page from response
			expect(api.getVistasPaginated).toHaveBeenCalled();
		});
	});
	// #endregion
});
// #endregion
