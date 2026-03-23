// * Tests for PermisosUsuariosStore — validates user permissions state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PermisosUsuariosStore } from './permisos-usuarios.store';
import { PermisoUsuario, Vista } from '@core/services';

// #endregion

// #region Test fixtures
const mockPermisos: PermisoUsuario[] = [
	{ id: 1, usuarioId: 10, rol: 'Director', vistas: ['intranet/admin/usuarios'], nombreUsuario: 'Juan Pérez' },
	{ id: 2, usuarioId: 20, rol: 'Profesor', vistas: ['intranet/profesor/horarios'], nombreUsuario: 'María García' },
	{ id: 3, usuarioId: 30, rol: 'Profesor', vistas: ['intranet/profesor/asistencia'], nombreUsuario: 'Pedro López' },
];

const mockVistas: Vista[] = [
	{ id: 1, ruta: 'intranet/admin/usuarios', nombre: 'Usuarios', estado: 1 },
	{ id: 2, ruta: 'intranet/admin/cursos', nombre: 'Cursos', estado: 1 },
];

const mockModulosVistas = [
	{
		nombre: 'admin',
		vistas: mockVistas,
		seleccionadas: 0,
		total: 2,
	},
];
// #endregion

// #region Tests
describe('PermisosUsuariosStore', () => {
	let store: PermisosUsuariosStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [PermisosUsuariosStore],
		});
		store = TestBed.inject(PermisosUsuariosStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty data', () => {
			expect(store.permisosUsuario()).toEqual([]);
			expect(store.vistas()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('should have empty selections', () => {
			expect(store.selectedPermiso()).toBeNull();
			expect(store.selectedUsuarioId()).toBeNull();
			expect(store.selectedRol()).toBeNull();
			expect(store.selectedVistas()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — filteredPermisos
	describe('filteredPermisos', () => {
		beforeEach(() => {
			store.setPermisosUsuario(mockPermisos);
		});

		it('should return all without filters', () => {
			expect(store.filteredPermisos()).toHaveLength(3);
		});

		it('should filter by search (nombreUsuario)', () => {
			store.setSearchTerm('juan');
			expect(store.filteredPermisos()).toHaveLength(1);
			expect(store.filteredPermisos()[0].nombreUsuario).toBe('Juan Pérez');
		});

		it('should filter by rol', () => {
			store.setFilterRol('Profesor');
			expect(store.filteredPermisos()).toHaveLength(2);
		});

		it('should combine filters', () => {
			store.setFilterRol('Profesor');
			store.setSearchTerm('maría');
			expect(store.filteredPermisos()).toHaveLength(1);
		});
	});
	// #endregion

	// #region Surgical mutations
	describe('surgical mutations', () => {
		it('should remove permiso', () => {
			store.setPermisosUsuario(mockPermisos);
			store.removePermisoUsuario(2);

			expect(store.permisosUsuario()).toHaveLength(2);
			expect(store.permisosUsuario().find((p) => p.id === 2)).toBeUndefined();
		});

		it('should add permiso at beginning', () => {
			store.setPermisosUsuario([mockPermisos[1]]);
			store.addPermisoUsuario(mockPermisos[0]);

			expect(store.permisosUsuario()).toHaveLength(2);
			expect(store.permisosUsuario()[0].id).toBe(1);
		});
	});
	// #endregion

	// #region Vista toggling
	describe('toggleVista', () => {
		it('should add vista', () => {
			store.toggleVista('intranet/admin/usuarios');
			expect(store.selectedVistas()).toContain('intranet/admin/usuarios');
		});

		it('should remove vista if already selected', () => {
			store.setSelectedVistas(['intranet/admin/usuarios', 'intranet/admin/cursos']);
			store.toggleVista('intranet/admin/usuarios');

			expect(store.selectedVistas()).not.toContain('intranet/admin/usuarios');
			expect(store.selectedVistas()).toContain('intranet/admin/cursos');
		});
	});
	// #endregion

	// #region toggleAllVistasModulo
	describe('toggleAllVistasModulo', () => {
		it('should select all when none selected', () => {
			store.setModulosVistas(mockModulosVistas);
			store.setActiveModuloIndex(0);

			store.toggleAllVistasModulo();

			expect(store.selectedVistas()).toContain('intranet/admin/usuarios');
			expect(store.selectedVistas()).toContain('intranet/admin/cursos');
		});

		it('should deselect all when all selected', () => {
			store.setModulosVistas(mockModulosVistas);
			store.setActiveModuloIndex(0);
			store.setSelectedVistas(['intranet/admin/usuarios', 'intranet/admin/cursos']);

			store.toggleAllVistasModulo();

			expect(store.selectedVistas()).toEqual([]);
		});

		it('should do nothing for out-of-range index', () => {
			store.setModulosVistas(mockModulosVistas);
			store.setActiveModuloIndex(5);
			store.toggleAllVistasModulo();
			expect(store.selectedVistas()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — isAllModuloSelected
	describe('isAllModuloSelected', () => {
		it('should be false when none selected', () => {
			store.setModulosVistas(mockModulosVistas);
			expect(store.isAllModuloSelected()).toBe(false);
		});

		it('should be true when all selected', () => {
			store.setModulosVistas(mockModulosVistas);
			store.setSelectedVistas(['intranet/admin/usuarios', 'intranet/admin/cursos']);
			expect(store.isAllModuloSelected()).toBe(true);
		});
	});
	// #endregion

	// #region Filters
	describe('filters', () => {
		it('should clear filters', () => {
			store.setSearchTerm('test');
			store.setFilterRol('Director');

			store.clearFilters();

			expect(store.searchTerm()).toBe('');
			expect(store.filterRol()).toBeNull();
		});
	});
	// #endregion

	// #region Reset dialog state
	describe('resetDialogState', () => {
		it('should reset all dialog-related state', () => {
			store.setSelectedPermiso(mockPermisos[0]);
			store.setSelectedUsuarioId(10);
			store.setSelectedRol('Director');
			store.setSelectedVistas(['a', 'b']);
			store.setIsEditing(true);

			store.resetDialogState();

			expect(store.selectedPermiso()).toBeNull();
			expect(store.selectedUsuarioId()).toBeNull();
			expect(store.selectedRol()).toBeNull();
			expect(store.selectedVistas()).toEqual([]);
			expect(store.isEditing()).toBe(false);
			expect(store.modulosVistas()).toEqual([]);
			expect(store.vistasBusqueda()).toBe('');
		});
	});
	// #endregion

	// #region updateModuloCount
	describe('updateModuloCount', () => {
		it('should update seleccionadas count per module', () => {
			store.setModulosVistas(mockModulosVistas);
			store.setSelectedVistas(['intranet/admin/usuarios']);

			store.updateModuloCount();

			expect(store.modulosVistas()[0].seleccionadas).toBe(1);
		});
	});
	// #endregion
});
// #endregion
