// * Tests for PermissionsRolesFacade — validates UI orchestration and WAL integration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { PermissionsRolesFacade } from './permisos-roles.facade';
import { PermissionsRolesStore } from './permisos-roles.store';
import {
	PermissionsService,
	RolCapabilityMatrixRow,
	CapabilityCatalogItem,
	ErrorHandlerService,
	WalFacadeHelper,
	SwService,
	WalCrossTabRefetchService,
} from '@core/services';

// #endregion

// #region Mocks
const mockCatalog: CapabilityCatalogItem[] = [
	{ id: 1, codigo: 'USR_VIEW', nombre: 'Ver usuarios', modulo: 'admin', orden: 1 } as CapabilityCatalogItem,
	{ id: 2, codigo: 'USR_EDIT', nombre: 'Editar usuarios', modulo: 'admin', orden: 2 } as CapabilityCatalogItem,
	{ id: 3, codigo: 'HOR_VIEW', nombre: 'Ver horarios', modulo: 'profesor', orden: 1 } as CapabilityCatalogItem,
];

const mockMatrixRows: RolCapabilityMatrixRow[] = [
	{ rolId: 1, rolNombre: 'Director', capabilityIds: [1, 2] },
];

function createMockApi() {
	return {
		getCapabilityCatalog: vi.fn().mockReturnValue(of(mockCatalog)),
		getRolCapabilityMatrix: vi.fn().mockReturnValue(of(mockMatrixRows)),
		setRolCapabilities: vi.fn().mockReturnValue(of('ok')),
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
describe('PermissionsRolesFacade', () => {
	let facade: PermissionsRolesFacade;
	let store: PermissionsRolesStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();

		TestBed.configureTestingModule({
			providers: [
				PermissionsRolesFacade,
				PermissionsRolesStore,
				{ provide: PermissionsService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: SwService, useValue: { invalidateCacheByPattern: vi.fn().mockResolvedValue(undefined) } },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
			],
		});

		facade = TestBed.inject(PermissionsRolesFacade);
		store = TestBed.inject(PermissionsRolesStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load catalog and matrix into store', () => {
			facade.loadAll();

			expect(store.catalog()).toEqual(mockCatalog);
			expect(store.matrixRows()).toEqual(mockMatrixRows);
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region UI commands — dialog
	describe('dialog commands', () => {
		it('should open edit dialog with row data', () => {
			store.setCatalog(mockCatalog);
			facade.openEditDialog(mockMatrixRows[0]);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.selectedRow()).toEqual(mockMatrixRows[0]);
			expect(store.selectedCapIds()).toEqual([1, 2]);
		});

		it('should close dialog', () => {
			store.setCatalog(mockCatalog);
			facade.openEditDialog(mockMatrixRows[0]);
			facade.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Detail drawer
	describe('detail drawer', () => {
		it('should open detail', () => {
			facade.openDetail(mockMatrixRows[0]);
			expect(store.detailDrawerVisible()).toBe(true);
			expect(store.selectedRow()).toEqual(mockMatrixRows[0]);
		});

		it('should close detail', () => {
			facade.openDetail(mockMatrixRows[0]);
			facade.closeDetail();
			expect(store.detailDrawerVisible()).toBe(false);
		});

		it('should edit from detail', () => {
			store.setCatalog(mockCatalog);
			facade.openDetail(mockMatrixRows[0]);
			facade.editFromDetail();

			expect(store.detailDrawerVisible()).toBe(false);
			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
		});
	});
	// #endregion

	// #region WAL operations — save capabilities
	describe('WAL operations', () => {
		it('should call WAL execute on save with UPDATE operation', () => {
			store.setCatalog(mockCatalog);
			facade.openEditDialog(mockMatrixRows[0]);

			facade.saveCapabilities();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'UPDATE' }),
			);
		});

		it('should close dialog on save (optimistic)', () => {
			store.setCatalog(mockCatalog);
			facade.openEditDialog(mockMatrixRows[0]);

			facade.saveCapabilities();

			expect(store.dialogVisible()).toBe(false);
		});

		it('should update row capabilities optimistically', () => {
			store.setMatrixRows(mockMatrixRows);
			store.setCatalog(mockCatalog);
			facade.openEditDialog(mockMatrixRows[0]);
			store.setSelectedCapIds([1, 2, 3]);

			facade.saveCapabilities();

			const updated = store.matrixRows().find((r) => r.rolId === 1);
			expect(updated?.capabilityIds).toEqual([1, 2, 3]);
		});
	});
	// #endregion

	// #region Form delegation
	describe('form delegation', () => {
		it('should delegate toggleCapability', () => {
			const modulos = [{
				nombre: 'Admin',
				capabilities: [mockCatalog[0]],
				seleccionadas: 0,
				total: 1,
			}];
			store.setModulosCapabilities(modulos);
			facade.toggleCapability(1);
			expect(store.selectedCapIds()).toContain(1);
		});

		it('should delegate setCapBusqueda', () => {
			facade.setCapBusqueda('user');
			expect(store.capBusqueda()).toBe('user');
		});

		it('should delegate setActiveModuloIndex', () => {
			facade.setActiveModuloIndex(2);
			expect(store.activeModuloIndex()).toBe(2);
		});
	});
	// #endregion
});
// #endregion
