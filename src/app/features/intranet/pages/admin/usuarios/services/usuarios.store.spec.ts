// * Tests for UsuariosStore — validates user management state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsuariosStore } from './usuarios.store';
import { UsuarioDetalle, UsuarioLista, UsuariosEstadisticas } from '../models';
import { DebugService } from '@core/helpers';

// #endregion

// #region Test fixtures
const noopLog = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn(), time: vi.fn(), once: vi.fn() };
const mockDebug = { dbg: () => noopLog } as unknown as DebugService;

const mockUsuarios: UsuarioLista[] = [
	{ id: 1, dni: '11111111', nombres: 'Juan', apellidos: 'Pérez', nombreCompleto: 'Juan Pérez', rol: 'Director', estado: true, sedeId: 1, rowVersion: 'v1' },
	{ id: 2, dni: '22222222', nombres: 'María', apellidos: 'García', nombreCompleto: 'María García', rol: 'Profesor', estado: true, sedeId: 1, rowVersion: 'v1' },
	{ id: 3, dni: '33333333', nombres: 'Pedro', apellidos: 'López', nombreCompleto: 'Pedro López', rol: 'Estudiante', estado: false, sedeId: 1, rowVersion: 'v1' },
];

const mockStats: UsuariosEstadisticas = {
	totalUsuarios: 3, totalDirectores: 1, totalAsistentesAdministrativos: 0,
	totalProfesores: 1, totalApoderados: 0, totalEstudiantes: 1,
	totalActivos: 2, totalInactivos: 1,
};

const mockDetalle: UsuarioDetalle = {
	...mockUsuarios[1],
	contrasena: 'pass123',
	telefono: '999888777',
	correo: 'maria@test.com',
};
// #endregion

// #region Tests
describe('UsuariosStore', () => {
	let store: UsuariosStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				UsuariosStore,
				{ provide: DebugService, useValue: mockDebug },
			],
		});
		store = TestBed.inject(UsuariosStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty data', () => {
			expect(store.usuarios()).toEqual([]);
			expect(store.estadisticas()).toBeNull();
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('should have default UI state', () => {
			expect(store.dialogVisible()).toBe(false);
			expect(store.detailDrawerVisible()).toBe(false);
			expect(store.importDialogVisible()).toBe(false);
			expect(store.isEditing()).toBe(false);
		});

		it('should have default pagination', () => {
			expect(store.page()).toBe(1);
			expect(store.pageSize()).toBe(10);
			expect(store.totalRecords()).toBe(0);
		});

		it('should have default filters', () => {
			expect(store.searchTerm()).toBe('');
			expect(store.filterRol()).toBeNull();
			expect(store.filterEstado()).toBeNull();
		});

		it('should show skeletons initially', () => {
			expect(store.showSkeletons()).toBe(true);
			expect(store.statsReady()).toBe(false);
			expect(store.tableReady()).toBe(false);
		});
	});
	// #endregion

	// #region CRUD mutations
	describe('CRUD mutations', () => {
		it('should set usuarios', () => {
			store.setUsuarios(mockUsuarios);
			expect(store.usuarios()).toHaveLength(3);
		});

		it('should add usuario at beginning', () => {
			store.setUsuarios(mockUsuarios);
			const nuevo: UsuarioLista = { id: 4, dni: '44444444', nombres: 'Ana', apellidos: 'Ruiz', nombreCompleto: 'Ana Ruiz', rol: 'Apoderado', estado: true, sedeId: 1, rowVersion: 'v1' };
			store.addUsuario(nuevo);

			expect(store.usuarios()[0].id).toBe(4);
			expect(store.usuarios()).toHaveLength(4);
		});

		it('should update usuario by id', () => {
			store.setUsuarios(mockUsuarios);
			store.updateUsuario(2, { nombres: 'María Luisa' });

			expect(store.usuarios().find((u) => u.id === 2)?.nombres).toBe('María Luisa');
			expect(store.usuarios().find((u) => u.id === 1)?.nombres).toBe('Juan');
		});

		it('should toggle estado', () => {
			store.setUsuarios(mockUsuarios);
			store.toggleEstadoUsuario(1);

			expect(store.usuarios().find((u) => u.id === 1)?.estado).toBe(false);
		});

		it('should remove usuario', () => {
			store.setUsuarios(mockUsuarios);
			store.removeUsuario(2);

			expect(store.usuarios()).toHaveLength(2);
			expect(store.usuarios().find((u) => u.id === 2)).toBeUndefined();
		});
	});
	// #endregion

	// #region Estadísticas
	describe('estadísticas', () => {
		it('should set estadisticas', () => {
			store.setEstadisticas(mockStats);
			expect(store.estadisticas()).toEqual(mockStats);
		});

		it('should increment estadistica', () => {
			store.setEstadisticas(mockStats);
			store.incrementarEstadistica('totalUsuarios', 1);
			expect(store.estadisticas()!.totalUsuarios).toBe(4);
		});

		it('should not crash with null stats', () => {
			store.incrementarEstadistica('totalUsuarios', 1);
			expect(store.estadisticas()).toBeNull();
		});
	});
	// #endregion

	// #region Filters
	describe('filters', () => {
		it('should set filters', () => {
			store.setSearchTerm('juan');
			store.setFilterRol('Director');
			store.setFilterEstado(true);

			expect(store.searchTerm()).toBe('juan');
			expect(store.filterRol()).toBe('Director');
			expect(store.filterEstado()).toBe(true);
		});

		it('should clear all filters and reset page', () => {
			store.setSearchTerm('test');
			store.setFilterRol('Profesor');
			store.setFilterEstado(false);
			store.setPage(5);

			store.clearFilters();

			expect(store.searchTerm()).toBe('');
			expect(store.filterRol()).toBeNull();
			expect(store.filterEstado()).toBeNull();
			expect(store.page()).toBe(1);
		});
	});
	// #endregion

	// #region Dialog commands
	describe('dialog commands', () => {
		it('should open new dialog with empty form', () => {
			store.openNewDialog();

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(false);
			expect(store.selectedUsuario()).toBeNull();
			expect(store.formData().dni).toBe('');
			expect(store.formData().estado).toBe(true);
		});

		it('should open edit dialog with user data', () => {
			store.openEditDialog(mockDetalle);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.selectedUsuario()).toEqual(mockDetalle);
			expect(store.formData().dni).toBe('22222222');
			expect(store.formData().nombres).toBe('María');
			expect(store.formData().correo).toBe('maria@test.com');
		});

		it('should close dialog', () => {
			store.openNewDialog();
			store.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});

		it('should open/close detail drawer', () => {
			store.openDetailDrawer(mockDetalle);
			expect(store.detailDrawerVisible()).toBe(true);
			expect(store.selectedUsuario()).toEqual(mockDetalle);

			store.closeDetailDrawer();
			expect(store.detailDrawerVisible()).toBe(false);
		});

		it('should open/close confirm dialog', () => {
			store.openConfirmDialogVisible();
			expect(store.vm().confirmDialogVisible).toBe(true);

			store.closeConfirmDialogVisible();
			expect(store.vm().confirmDialogVisible).toBe(false);
		});

		it('should open/close import dialog', () => {
			store.openImportDialog();
			expect(store.importDialogVisible()).toBe(true);
			expect(store.importResult()).toBeNull();

			store.closeImportDialog();
			expect(store.importDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Form mutations
	describe('updateFormData', () => {
		it('should update partial form data', () => {
			store.openNewDialog();
			store.updateFormData({ nombres: 'Carlos' });

			expect(store.formData().nombres).toBe('Carlos');
			expect(store.formData().dni).toBe('');
		});

		it('should clear salon fields when rol changes to non-Profesor/Estudiante', () => {
			store.openNewDialog();
			store.updateFormData({ rol: 'Profesor', salonId: 5, esTutor: true });
			store.updateFormData({ rol: 'Director' });

			expect(store.formData().salonId).toBeUndefined();
			expect(store.formData().esTutor).toBeUndefined();
		});

		it('should clear esTutor when salon is set to null', () => {
			store.openNewDialog();
			store.updateFormData({ rol: 'Profesor', salonId: 5, esTutor: true });
			store.updateFormData({ salonId: null as unknown as number });

			expect(store.formData().esTutor).toBeUndefined();
		});
	});
	// #endregion

	// #region Computed — role checks
	describe('role-based computed', () => {
		it('should detect estudiante role', () => {
			store.openNewDialog();
			store.updateFormData({ rol: 'Estudiante' });
			expect(store.isEstudiante()).toBe(true);
			expect(store.isProfesor()).toBe(false);
		});

		it('should detect profesor role', () => {
			store.openNewDialog();
			store.updateFormData({ rol: 'Profesor' });
			expect(store.isProfesor()).toBe(true);
			expect(store.isEstudiante()).toBe(false);
		});
	});
	// #endregion

	// #region Sub-ViewModels
	describe('sub-viewmodels', () => {
		it('should compose dataVm', () => {
			store.setUsuarios(mockUsuarios);
			store.setEstadisticas(mockStats);
			const vm = store.dataVm();

			expect(vm.usuarios).toHaveLength(3);
			expect(vm.isEmpty).toBe(false);
			expect(vm.hasEstadisticas).toBe(true);
		});

		it('should compose uiVm', () => {
			store.setLoading(true);
			store.setSearchTerm('test');
			const vm = store.uiVm();

			expect(vm.loading).toBe(true);
			expect(vm.searchTerm).toBe('test');
		});

		it('should compose full vm', () => {
			store.setUsuarios(mockUsuarios);
			const vm = store.vm();

			expect(vm.usuarios).toHaveLength(3);
			expect(vm.loading).toBe(false);
			expect(vm.isEditing).toBe(false);
		});
	});
	// #endregion

	// #region Skeleton state
	describe('skeleton state', () => {
		it('should track progressive loading', () => {
			store.setStatsReady(true);
			expect(store.statsReady()).toBe(true);
			expect(store.tableReady()).toBe(false);

			store.setTableReady(true);
			expect(store.tableReady()).toBe(true);

			store.setShowSkeletons(false);
			expect(store.showSkeletons()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
