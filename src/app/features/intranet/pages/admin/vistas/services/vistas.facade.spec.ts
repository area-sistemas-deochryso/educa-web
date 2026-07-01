// * Tests for VistasFacade — validates capability CRUD orchestration with WAL.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { VistasFacade } from './vistas.facade';
import { VistasStore } from './vistas.store';
import { PermissionsService, CapabilityCatalogItem } from '@core/services';
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

// #region Mocks
const mockItems: CapabilityCatalogItem[] = [
	{ id: 1, codigo: 'USR_VIEW', nombre: 'Ver Usuarios', modulo: 'admin', descripcion: 'Listar usuarios', orden: 1, ruta: 'intranet/admin/usuarios', estado: true },
	{ id: 2, codigo: 'CRS_VIEW', nombre: 'Ver Cursos', modulo: 'admin', descripcion: 'Listar cursos', orden: 2, ruta: null, estado: true },
];

function createMockApi() {
	return {
		getCapabilityCatalog: vi.fn().mockReturnValue(of(mockItems)),
		createCapability: vi.fn().mockReturnValue(of(mockItems[0])),
		updateCapability: vi.fn().mockReturnValue(of(mockItems[0])),
		deleteCapability: vi.fn().mockReturnValue(of('ok')),
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
				{ provide: SwService, useValue: { invalidateCacheByPattern: vi.fn().mockResolvedValue(0) } },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
				{ provide: ActivityTrackerService, useValue: { track: vi.fn() } },
			],
		});

		facade = TestBed.inject(VistasFacade);
		store = TestBed.inject(VistasStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load capabilities and stats into store', () => {
			facade.loadAll();

			expect(store.items()).toEqual(mockItems);
			expect(store.estadisticas()).toBeDefined();
			expect(store.estadisticas()!.total).toBe(2);
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

		it('should open edit dialog with capability data', () => {
			facade.openEditDialog(mockItems[0]);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.formData().codigo).toBe('USR_VIEW');
			expect(store.formData().nombre).toBe('Ver Usuarios');
			expect(store.formData().modulo).toBe('admin');
			expect(store.selectedItem()).toEqual(mockItems[0]);
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

	// #region saveCapability dispatch
	describe('saveCapability', () => {
		it('should call WAL create when not editing', () => {
			facade.openNewDialog();
			store.setFormData({ codigo: 'NEW_CAP', nombre: 'New', modulo: 'admin', descripcion: '', ruta: '' });

			facade.saveCapability();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'CREATE' }),
			);
		});

		it('should call WAL update when editing', () => {
			facade.openEditDialog(mockItems[0]);

			facade.saveCapability();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'UPDATE' }),
			);
		});
	});
	// #endregion

	// #region WAL optimistic operations
	describe('WAL optimistic', () => {
		beforeEach(() => {
			store.setItems(mockItems);
			store.setEstadisticas({ total: 2, totalModulos: 1, modulos: ['admin'] });
		});

		it('should close dialog on create', () => {
			facade.openNewDialog();
			store.setFormData({ codigo: 'TEST', nombre: 'Test', modulo: 'admin', descripcion: '', ruta: '' });

			facade.saveCapability();

			expect(store.dialogVisible()).toBe(false);
		});

		it('should close dialog on update', () => {
			facade.openEditDialog(mockItems[0]);

			facade.saveCapability();

			expect(store.dialogVisible()).toBe(false);
		});

		it('should remove item on delete', () => {
			facade.delete(mockItems[0]);

			expect(store.items()).toHaveLength(1);
		});
	});
	// #endregion

	// #region Filters
	describe('filters', () => {
		it('should set search and trigger refresh', () => {
			facade.setSearchTerm('admin');
			expect(store.searchTerm()).toBe('admin');
			expect(store.page()).toBe(1);
			expect(api.getCapabilityCatalog).toHaveBeenCalled();
		});

		it('should set filter modulo and trigger refresh', () => {
			facade.setFilterModulo('admin');
			expect(store.filterModulo()).toBe('admin');
			expect(api.getCapabilityCatalog).toHaveBeenCalled();
		});

		it('should set filter ruta and trigger refresh', () => {
			facade.setFilterRuta('with');
			expect(store.filterRuta()).toBe('with');
			expect(api.getCapabilityCatalog).toHaveBeenCalled();
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
			expect(api.getCapabilityCatalog).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region updateFormField
	describe('updateFormField', () => {
		it('should update a single form field', () => {
			facade.updateFormField('nombre', 'Updated');
			expect(store.formData().nombre).toBe('Updated');
		});
	});
	// #endregion
});
// #endregion
