// * Tests for PermisosRolesStore — validates role permissions state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PermisosRolesStore } from './permisos-roles.store';
import { PermisoRol, Vista } from '@core/services';
import { UiMappingService } from '@shared/services';

// #endregion

// #region Test fixtures
const mockVistas: Vista[] = [
	{ id: 1, ruta: 'intranet/admin/usuarios', nombre: 'Usuarios', estado: 1 },
	{ id: 2, ruta: 'intranet/admin/cursos', nombre: 'Cursos', estado: 1 },
	{ id: 3, ruta: 'intranet/profesor/horarios', nombre: 'Horarios', estado: 1 },
	{ id: 4, ruta: 'intranet/profesor/asistencia', nombre: 'Asistencia', estado: 1 },
];

const mockPermisos: PermisoRol[] = [
	{ id: 1, rol: 'Director', vistas: ['intranet/admin/usuarios', 'intranet/admin/cursos'] },
	{ id: 2, rol: 'Profesor', vistas: ['intranet/profesor/horarios', 'intranet/profesor/asistencia'] },
];

class MockUiMappingService {
	getModuloFromRuta(ruta: string): string {
		const parts = ruta.split('/');
		return parts.length >= 2 ? parts[1] : ruta;
	}

	getVistasCountLabel(count: number): string {
		return `${count} vista${count !== 1 ? 's' : ''}`;
	}
}
// #endregion

// #region Tests
describe('PermisosRolesStore', () => {
	let store: PermisosRolesStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				PermisosRolesStore,
				{ provide: UiMappingService, useClass: MockUiMappingService },
			],
		});
		store = TestBed.inject(PermisosRolesStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty permisos and vistas', () => {
			expect(store.permisosRol()).toEqual([]);
			expect(store.vistas()).toEqual([]);
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
			expect(store.selectedPermiso()).toBeNull();
			expect(store.selectedRol()).toBeNull();
			expect(store.selectedVistas()).toEqual([]);
		});
	});
	// #endregion

	// #region Data commands
	describe('data commands', () => {
		it('should set permisos rol', () => {
			store.setPermisosRol(mockPermisos);
			expect(store.permisosRol()).toEqual(mockPermisos);
		});

		it('should set vistas', () => {
			store.setVistas(mockVistas);
			expect(store.vistas()).toEqual(mockVistas);
		});

		it('should set loading and error', () => {
			store.setLoading(true);
			expect(store.loading()).toBe(true);

			store.setError('Error');
			expect(store.error()).toBe('Error');

			store.clearError();
			expect(store.error()).toBeNull();
		});
	});
	// #endregion

	// #region Mutaciones quirúrgicas
	describe('surgical mutations', () => {
		it('should remove permiso and decrement total', () => {
			store.setPermisosRol(mockPermisos);
			store.setPaginationData(1, 10, 2);

			store.removePermiso(1);

			expect(store.permisosRol()).toHaveLength(1);
			expect(store.permisosRol()[0].rol).toBe('Profesor');
			expect(store.totalRecords()).toBe(1);
		});

		it('should add permiso and increment total', () => {
			store.setPermisosRol([mockPermisos[1]]);
			store.setPaginationData(1, 10, 1);

			store.addPermiso(mockPermisos[0]);

			expect(store.permisosRol()).toHaveLength(2);
			expect(store.permisosRol()[0].rol).toBe('Director');
			expect(store.totalRecords()).toBe(2);
		});

		it('should not go below 0 on totalRecords', () => {
			store.setPaginationData(1, 10, 0);
			store.removePermiso(999);
			expect(store.totalRecords()).toBe(0);
		});
	});
	// #endregion

	// #region Computed — estadísticas
	describe('estadísticas', () => {
		it('should compute from vistas and totalRecords', () => {
			store.setVistas(mockVistas);
			store.setPaginationData(1, 10, 2);

			const stats = store.estadisticas();
			expect(stats.totalRoles).toBe(2);
			expect(stats.totalVistas).toBe(4);
			expect(stats.totalModulos).toBe(2);
		});
	});
	// #endregion

	// #region Computed — rolesNoConfigurados
	describe('rolesNoConfigurados', () => {
		it('should return roles without permisos', () => {
			store.setPermisosRol(mockPermisos);

			const noConfigurados = store.rolesNoConfigurados();
			expect(noConfigurados).not.toContain('Director');
			expect(noConfigurados).not.toContain('Profesor');
		});

		it('should build select options from unconfigured roles', () => {
			store.setPermisosRol(mockPermisos);

			const options = store.rolesSelectOptions();
			options.forEach((opt) => {
				expect(opt).toHaveProperty('label');
				expect(opt).toHaveProperty('value');
				expect(opt.label).toBe(opt.value);
			});
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
			store.setVistasBusqueda('test');
			store.setActiveModuloIndex(2);
			store.openDialog();

			store.closeDialog();

			expect(store.vistasBusqueda()).toBe('');
			expect(store.activeModuloIndex()).toBe(0);
		});

		it('should open detail drawer with permiso', () => {
			store.openDetailDrawer(mockPermisos[0]);

			expect(store.detailDrawerVisible()).toBe(true);
			expect(store.selectedPermiso()).toEqual(mockPermisos[0]);
		});

		it('should close detail drawer', () => {
			store.openDetailDrawer(mockPermisos[0]);
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

	// #region Vista toggling
	describe('toggleVista', () => {
		it('should add vista when not selected', () => {
			store.toggleVista('intranet/admin/usuarios');
			expect(store.selectedVistas()).toContain('intranet/admin/usuarios');
		});

		it('should remove vista when already selected', () => {
			store.setSelectedVistas(['intranet/admin/usuarios', 'intranet/admin/cursos']);
			store.toggleVista('intranet/admin/usuarios');

			expect(store.selectedVistas()).not.toContain('intranet/admin/usuarios');
			expect(store.selectedVistas()).toContain('intranet/admin/cursos');
		});
	});
	// #endregion

	// #region toggleAllVistasModulo
	describe('toggleAllVistasModulo', () => {
		const modulosVistas = [
			{
				nombre: 'admin',
				vistas: [
					{ ruta: 'intranet/admin/usuarios', nombre: 'Usuarios' },
					{ ruta: 'intranet/admin/cursos', nombre: 'Cursos' },
				],
				seleccionadas: 0,
			},
		];

		it('should select all vistas in module when none selected', () => {
			store.setModulosVistas(modulosVistas);
			store.setActiveModuloIndex(0);

			store.toggleAllVistasModulo();

			expect(store.selectedVistas()).toContain('intranet/admin/usuarios');
			expect(store.selectedVistas()).toContain('intranet/admin/cursos');
		});

		it('should deselect all vistas in module when all selected', () => {
			store.setModulosVistas(modulosVistas);
			store.setActiveModuloIndex(0);
			store.setSelectedVistas(['intranet/admin/usuarios', 'intranet/admin/cursos']);

			store.toggleAllVistasModulo();

			expect(store.selectedVistas()).not.toContain('intranet/admin/usuarios');
			expect(store.selectedVistas()).not.toContain('intranet/admin/cursos');
		});

		it('should do nothing when activeIndex out of range', () => {
			store.setModulosVistas(modulosVistas);
			store.setActiveModuloIndex(5);

			store.toggleAllVistasModulo();

			expect(store.selectedVistas()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — isAllModuloSelected
	describe('isAllModuloSelected', () => {
		const modulosVistas = [
			{
				nombre: 'admin',
				vistas: [
					{ ruta: 'intranet/admin/usuarios', nombre: 'Usuarios' },
					{ ruta: 'intranet/admin/cursos', nombre: 'Cursos' },
				],
				seleccionadas: 0,
			},
		];

		it('should return false when no vistas selected', () => {
			store.setModulosVistas(modulosVistas);
			expect(store.isAllModuloSelected()).toBe(false);
		});

		it('should return false when partially selected', () => {
			store.setModulosVistas(modulosVistas);
			store.setSelectedVistas(['intranet/admin/usuarios']);
			expect(store.isAllModuloSelected()).toBe(false);
		});

		it('should return true when all selected', () => {
			store.setModulosVistas(modulosVistas);
			store.setSelectedVistas(['intranet/admin/usuarios', 'intranet/admin/cursos']);
			expect(store.isAllModuloSelected()).toBe(true);
		});
	});
	// #endregion

	// #region Computed — vistasCountLabel
	describe('vistasCountLabel', () => {
		it('should show singular for 1 vista', () => {
			store.setSelectedVistas(['intranet/admin/usuarios']);
			expect(store.vistasCountLabel()).toBe('1 vista');
		});

		it('should show plural for multiple vistas', () => {
			store.setSelectedVistas(['a', 'b', 'c']);
			expect(store.vistasCountLabel()).toBe('3 vistas');
		});
	});
	// #endregion

	// #region Pagination
	describe('pagination', () => {
		it('should set pagination data', () => {
			store.setPaginationData(2, 20, 50);

			expect(store.page()).toBe(2);
			expect(store.pageSize()).toBe(20);
			expect(store.totalRecords()).toBe(50);
		});

		it('should set page independently', () => {
			store.setPage(3);
			expect(store.page()).toBe(3);
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state', () => {
			store.setPermisosRol(mockPermisos);
			store.setVistas(mockVistas);
			store.setPaginationData(1, 10, 2);

			const vm = store.vm();

			expect(vm.permisosRol).toHaveLength(2);
			expect(vm.loading).toBe(false);
			expect(vm.estadisticas.totalRoles).toBe(2);
			expect(vm.dialogVisible).toBe(false);
			expect(vm.page).toBe(1);
		});
	});
	// #endregion
});
// #endregion
