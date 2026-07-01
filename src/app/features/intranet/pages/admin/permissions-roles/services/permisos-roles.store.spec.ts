// * Tests for PermissionsRolesStore — validates role-capability state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PermissionsRolesStore, type ModuloCapabilities } from './permisos-roles.store';
import { CapabilityCatalogItem, RolCapabilityMatrixRow } from '@core/services';

// #endregion

// #region Test fixtures
const mockCatalog: CapabilityCatalogItem[] = [
	{ id: 1, codigo: 'USR_VIEW', nombre: 'Ver usuarios', modulo: 'admin', descripcion: 'Ver lista de usuarios', orden: 1 } as CapabilityCatalogItem,
	{ id: 2, codigo: 'USR_EDIT', nombre: 'Editar usuarios', modulo: 'admin', descripcion: 'Editar datos de usuario', orden: 2 } as CapabilityCatalogItem,
	{ id: 3, codigo: 'HOR_VIEW', nombre: 'Ver horarios', modulo: 'profesor', descripcion: 'Ver horarios', orden: 1 } as CapabilityCatalogItem,
	{ id: 4, codigo: 'ASI_VIEW', nombre: 'Ver asistencia', modulo: 'profesor', descripcion: 'Ver asistencia', orden: 2 } as CapabilityCatalogItem,
];

const mockMatrixRows: RolCapabilityMatrixRow[] = [
	{ rolId: 1, rolNombre: 'Director', capabilityIds: [1, 2] },
	{ rolId: 2, rolNombre: 'Profesor', capabilityIds: [3, 4] },
];
// #endregion

// #region Tests
describe('PermissionsRolesStore', () => {
	let store: PermissionsRolesStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [PermissionsRolesStore],
		});
		store = TestBed.inject(PermissionsRolesStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty matrix and catalog', () => {
			expect(store.matrixRows()).toEqual([]);
			expect(store.catalog()).toEqual([]);
		});

		it('should have default UI state', () => {
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
			expect(store.dialogVisible()).toBe(false);
			expect(store.detailDrawerVisible()).toBe(false);
			expect(store.confirmDialogVisible()).toBe(false);
			expect(store.isEditing()).toBe(false);
		});

		it('should have default selections', () => {
			expect(store.selectedRow()).toBeNull();
			expect(store.selectedCapIds()).toEqual([]);
		});
	});
	// #endregion

	// #region Data commands
	describe('data commands', () => {
		it('should set matrix rows', () => {
			store.setMatrixRows(mockMatrixRows);
			expect(store.matrixRows()).toEqual(mockMatrixRows);
		});

		it('should set catalog', () => {
			store.setCatalog(mockCatalog);
			expect(store.catalog()).toEqual(mockCatalog);
		});

		it('should set loading and error', () => {
			store.setLoading(true);
			expect(store.loading()).toBe(true);

			store.setError('Error');
			expect(store.error()).toBe('Error');

			store.clearError();
			expect(store.error()).toBeNull();
		});

		it('should update row capabilities by rolId', () => {
			store.setMatrixRows(mockMatrixRows);
			store.updateRowCapabilities(1, [1, 2, 3]);

			const updated = store.matrixRows().find((r) => r.rolId === 1);
			expect(updated?.capabilityIds).toEqual([1, 2, 3]);
		});

		it('should not modify other rows on update', () => {
			store.setMatrixRows(mockMatrixRows);
			store.updateRowCapabilities(1, [1, 2, 3]);

			const other = store.matrixRows().find((r) => r.rolId === 2);
			expect(other?.capabilityIds).toEqual([3, 4]);
		});
	});
	// #endregion

	// #region Computed — estadísticas
	describe('estadísticas', () => {
		it('should compute from catalog and matrix', () => {
			store.setCatalog(mockCatalog);
			store.setMatrixRows(mockMatrixRows);

			const stats = store.estadisticas();
			expect(stats.totalRoles).toBe(2);
			expect(stats.totalCapabilities).toBe(4);
			expect(stats.totalModulos).toBe(2);
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialog management', () => {
		it('should open and close main dialog', () => {
			store.openDialog();
			expect(store.dialogVisible()).toBe(true);

			store.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});

		it('should reset search and index on close', () => {
			store.setCapBusqueda('test');
			store.setActiveModuloIndex(2);
			store.openDialog();

			store.closeDialog();

			expect(store.capBusqueda()).toBe('');
			expect(store.activeModuloIndex()).toBe(0);
		});

		it('should open detail drawer with row', () => {
			store.openDetailDrawer(mockMatrixRows[0]);

			expect(store.detailDrawerVisible()).toBe(true);
			expect(store.selectedRow()).toEqual(mockMatrixRows[0]);
		});

		it('should close detail drawer', () => {
			store.openDetailDrawer(mockMatrixRows[0]);
			store.closeDetailDrawer();

			expect(store.detailDrawerVisible()).toBe(false);
		});

		it('should open and close confirm dialog', () => {
			store.openConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(true);

			store.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Capability toggling
	describe('toggleCapability', () => {
		const modulosVistas: ModuloCapabilities[] = [
			{
				nombre: 'Admin',
				capabilities: [mockCatalog[0], mockCatalog[1]],
				seleccionadas: 0,
				total: 2,
			},
		];

		it('should add capability when not selected', () => {
			store.setModulosCapabilities(modulosVistas);
			store.toggleCapability(1);
			expect(store.selectedCapIds()).toContain(1);
		});

		it('should remove capability when already selected', () => {
			store.setModulosCapabilities(modulosVistas);
			store.setSelectedCapIds([1, 2]);
			store.toggleCapability(1);

			expect(store.selectedCapIds()).not.toContain(1);
			expect(store.selectedCapIds()).toContain(2);
		});
	});
	// #endregion

	// #region toggleAllCapabilitiesModulo
	describe('toggleAllCapabilitiesModulo', () => {
		const modulosVistas: ModuloCapabilities[] = [
			{
				nombre: 'Admin',
				capabilities: [mockCatalog[0], mockCatalog[1]],
				seleccionadas: 0,
				total: 2,
			},
		];

		it('should select all capabilities in module when none selected', () => {
			store.setModulosCapabilities(modulosVistas);
			store.setActiveModuloIndex(0);

			store.toggleAllCapabilitiesModulo();

			expect(store.selectedCapIds()).toContain(1);
			expect(store.selectedCapIds()).toContain(2);
		});

		it('should deselect all capabilities in module when all selected', () => {
			store.setModulosCapabilities(modulosVistas);
			store.setActiveModuloIndex(0);
			store.setSelectedCapIds([1, 2]);

			store.toggleAllCapabilitiesModulo();

			expect(store.selectedCapIds()).not.toContain(1);
			expect(store.selectedCapIds()).not.toContain(2);
		});

		it('should do nothing when activeIndex out of range', () => {
			store.setModulosCapabilities(modulosVistas);
			store.setActiveModuloIndex(5);

			store.toggleAllCapabilitiesModulo();

			expect(store.selectedCapIds()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — isAllModuloSelected
	describe('isAllModuloSelected', () => {
		const modulosVistas: ModuloCapabilities[] = [
			{
				nombre: 'Admin',
				capabilities: [mockCatalog[0], mockCatalog[1]],
				seleccionadas: 0,
				total: 2,
			},
		];

		it('should return false when no capabilities selected', () => {
			store.setModulosCapabilities(modulosVistas);
			expect(store.isAllModuloSelected()).toBe(false);
		});

		it('should return false when partially selected', () => {
			store.setModulosCapabilities(modulosVistas);
			store.setSelectedCapIds([1]);
			expect(store.isAllModuloSelected()).toBe(false);
		});

		it('should return true when all selected', () => {
			store.setModulosCapabilities(modulosVistas);
			store.setSelectedCapIds([1, 2]);
			expect(store.isAllModuloSelected()).toBe(true);
		});
	});
	// #endregion

	// #region Computed — capsCountLabel
	describe('capsCountLabel', () => {
		it('should show singular for 1 capability', () => {
			store.setSelectedCapIds([1]);
			expect(store.capsCountLabel()).toBe('1 capability seleccionada');
		});

		it('should show plural for multiple capabilities', () => {
			store.setSelectedCapIds([1, 2, 3]);
			expect(store.capsCountLabel()).toBe('3 capabilitys seleccionadas');
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state', () => {
			store.setCatalog(mockCatalog);
			store.setMatrixRows(mockMatrixRows);

			const vm = store.vm();

			expect(vm.matrixRows).toHaveLength(2);
			expect(vm.catalog).toHaveLength(4);
			expect(vm.loading).toBe(false);
			expect(vm.estadisticas.totalRoles).toBe(2);
			expect(vm.dialogVisible).toBe(false);
		});
	});
	// #endregion
});
// #endregion
