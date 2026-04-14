// * Tests for UsersStore — validates feature-specific behavior.
// Base CRUD primitives (setItems/addItem/updateItem/removeItem/filters/pagination/form)
// are covered by base-crud.store.spec.ts; here we only test what UsersStore adds.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersStore } from './usuarios.store';
import { UsuarioDetalle, UsuarioLista, UsuariosEstadisticas } from '../models';
import { DebugService } from '@core/helpers';

// #endregion

// #region Test fixtures
const noopLog = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn(), time: vi.fn(), once: vi.fn() };
const mockDebug = { dbg: () => noopLog } as unknown as DebugService;

const mockUsuarios: UsuarioLista[] = [
	{ id: 1, dni: '11111111', nombres: 'Juan', apellidos: 'Pérez', nombreCompleto: 'Juan Pérez', rol: 'Director', estado: true, fechaRegistro: '2025-01-01', sedeId: 1, rowVersion: 'v1' },
	{ id: 2, dni: '22222222', nombres: 'María', apellidos: 'García', nombreCompleto: 'María García', rol: 'Profesor', estado: true, fechaRegistro: '2025-01-01', sedeId: 1, rowVersion: 'v1' },
	{ id: 3, dni: '33333333', nombres: 'Pedro', apellidos: 'López', nombreCompleto: 'Pedro López', rol: 'Estudiante', estado: false, fechaRegistro: '2025-01-01', sedeId: 1, rowVersion: 'v1' },
];

const mockStats: UsuariosEstadisticas = {
	totalUsuarios: 3, totalDirectores: 1, totalAsistentesAdministrativos: 0,
	totalPromotores: 0, totalProfesores: 1, totalApoderados: 0, totalEstudiantes: 1,
	usuariosActivos: 2, usuariosInactivos: 1,
};

const mockDetalle: UsuarioDetalle = {
	...mockUsuarios[1],
	contrasena: 'pass123',
	telefono: '999888777',
	correo: 'maria@test.com',
};
// #endregion

// #region Tests
describe('UsersStore', () => {
	let store: UsersStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				UsersStore,
				{ provide: DebugService, useValue: mockDebug },
			],
		});
		store = TestBed.inject(UsersStore);
	});

	// #region Initial state (feature-specific)
	describe('initial state (feature-specific)', () => {
		it('should have empty salones and filter salones', () => {
			expect(store.salones()).toEqual([]);
			expect(store.salonesFilter()).toEqual([]);
		});

		it('should show skeletons initially with no phase ready', () => {
			expect(store.showSkeletons()).toBe(true);
			expect(store.statsReady()).toBe(false);
			expect(store.tableReady()).toBe(false);
		});

		it('should have drawers/import closed and no selected user', () => {
			expect(store.detailDrawerVisible()).toBe(false);
			expect(store.importDialogVisible()).toBe(false);
			expect(store.importLoading()).toBe(false);
			expect(store.importResult()).toBeNull();
			expect(store.selectedUsuario()).toBeNull();
		});

		it('should have no role/salon filters', () => {
			expect(store.filterRol()).toBeNull();
			expect(store.filterSalonId()).toBeNull();
		});
	});
	// #endregion

	// #region Feature-specific setters
	describe('feature setters', () => {
		it('sets salones and filter salones independently', () => {
			store.setSalones([{ id: 1 }] as never);
			store.setSalonesFilter([{ id: 2 }, { id: 3 }] as never);
			expect(store.salones()).toHaveLength(1);
			expect(store.salonesFilter()).toHaveLength(2);
		});

		it('tracks progressive skeleton phases', () => {
			store.setStatsReady(true);
			expect(store.statsReady()).toBe(true);
			expect(store.tableReady()).toBe(false);

			store.setTableReady(true);
			store.setShowSkeletons(false);
			expect(store.tableReady()).toBe(true);
			expect(store.showSkeletons()).toBe(false);
		});

		it('updates role and salon filters', () => {
			store.setFilterRol('Profesor');
			store.setFilterSalonId(7);
			expect(store.filterRol()).toBe('Profesor');
			expect(store.filterSalonId()).toBe(7);
		});

		it('manages import dialog state', () => {
			store.setImportLoading(true);
			store.setImportResult({ exitosos: 5, fallidos: 0 } as never);
			expect(store.importLoading()).toBe(true);
			expect(store.importResult()).toEqual({ exitosos: 5, fallidos: 0 });
		});
	});
	// #endregion

	// #region Feature-specific dialogs and drawers
	describe('feature dialogs', () => {
		it('openNewDialog resets selection and form, opens dialog', () => {
			store.openNewDialog();
			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(false);
			expect(store.selectedUsuario()).toBeNull();
			expect(store.formData().dni).toBe('');
			expect(store.formData().estado).toBe(true);
		});

		it('openEditDialog populates form from detalle and sets isEditing', () => {
			store.openEditDialog(mockDetalle);
			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.selectedUsuario()).toEqual(mockDetalle);
			expect(store.formData().dni).toBe('22222222');
			expect(store.formData().nombres).toBe('María');
			expect(store.formData().correo).toBe('maria@test.com');
		});

		it('opens and closes detail drawer with selected user', () => {
			store.openDetailDrawer(mockDetalle);
			expect(store.detailDrawerVisible()).toBe(true);
			expect(store.selectedUsuario()).toEqual(mockDetalle);

			store.closeDetailDrawer();
			expect(store.detailDrawerVisible()).toBe(false);
		});

		it('opens import dialog clearing previous result', () => {
			store.setImportResult({ exitosos: 3, fallidos: 1 } as never);
			store.openImportDialog();
			expect(store.importDialogVisible()).toBe(true);
			expect(store.importResult()).toBeNull();

			store.closeImportDialog();
			expect(store.importDialogVisible()).toBe(false);
		});

		it('exposes confirm dialog aliases', () => {
			store.openConfirmDialogVisible();
			expect(store.confirmDialogVisible()).toBe(true);

			store.closeConfirmDialogVisible();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Feature-specific mutations
	describe('feature mutations', () => {
		it('toggleEstadoUsuario flips estado of the target user only', () => {
			store.setItems(mockUsuarios);
			store.toggleEstadoUsuario(1);
			expect(store.items().find((u) => u.id === 1)?.estado).toBe(false);
			expect(store.items().find((u) => u.id === 2)?.estado).toBe(true);
		});

		it('toggleEstadoUsuario is a no-op for missing id', () => {
			store.setItems(mockUsuarios);
			store.toggleEstadoUsuario(999);
			expect(store.items().every((u, i) => u.estado === mockUsuarios[i].estado)).toBe(true);
		});

		it('triggerRefresh increments refreshCounter monotonically', () => {
			const initial = store.refreshCounter();
			store.triggerRefresh();
			store.triggerRefresh();
			expect(store.refreshCounter()).toBe(initial + 2);
		});
	});
	// #endregion

	// #region onClearFiltros override
	describe('onClearFiltros override', () => {
		it('clearFiltros clears base filters plus role and salon filters', () => {
			store.setSearchTerm('test');
			store.setFilterEstado(false);
			store.setFilterRol('Profesor');
			store.setFilterSalonId(5);
			store.setPage(4);

			store.clearFiltros();

			expect(store.searchTerm()).toBe('');
			expect(store.filterEstado()).toBeNull();
			expect(store.filterRol()).toBeNull();
			expect(store.filterSalonId()).toBeNull();
			expect(store.page()).toBe(1);
		});
	});
	// #endregion

	// #region Role-based computed
	describe('role-based computed', () => {
		it('isEstudiante is true only when rol=Estudiante', () => {
			store.openNewDialog();
			store.updateFormDataWithPolicies({ rol: 'Estudiante' });
			expect(store.isEstudiante()).toBe(true);
			expect(store.isProfesor()).toBe(false);
		});

		it('isProfesor is true only when rol=Profesor', () => {
			store.openNewDialog();
			store.updateFormDataWithPolicies({ rol: 'Profesor' });
			expect(store.isProfesor()).toBe(true);
			expect(store.isEstudiante()).toBe(false);
		});
	});
	// #endregion

	// #region updateFormDataWithPolicies (business rules)
	describe('updateFormDataWithPolicies applies role constraints', () => {
		it('clears salones when switching from Profesor to a non-teaching role', () => {
			store.openNewDialog();
			store.updateFormDataWithPolicies({ rol: 'Profesor', salones: [{ salonId: 5, esTutor: true }] });
			expect(store.formData().salones).toHaveLength(1);

			store.updateFormDataWithPolicies({ rol: 'Director' });
			expect(store.formData().salones).toBeUndefined();
			expect(store.formData().salonId).toBeUndefined();
		});

		it('clears salones and keeps salonId intent when switching Profesor → Estudiante', () => {
			store.openNewDialog();
			store.updateFormDataWithPolicies({ rol: 'Profesor', salones: [{ salonId: 5, esTutor: true }] });
			store.updateFormDataWithPolicies({ rol: 'Estudiante' });
			expect(store.formData().salones).toBeUndefined();
		});
	});
	// #endregion

	// #region Validation computed
	describe('validation computed', () => {
		it('dniError surfaces invalid dni', () => {
			store.openNewDialog();
			store.updateFormDataWithPolicies({ dni: '123' });
			expect(store.dniError()).not.toBeNull();

			store.updateFormDataWithPolicies({ dni: '12345678' });
			expect(store.dniError()).toBeNull();
		});

		it('correoError surfaces invalid email shape', () => {
			store.openNewDialog();
			store.updateFormDataWithPolicies({ correo: 'no-arroba' });
			expect(store.correoError()).not.toBeNull();

			store.updateFormDataWithPolicies({ correo: 'ok@test.com' });
			expect(store.correoError()).toBeNull();
		});
	});
	// #endregion

	// #region ViewModel composition
	describe('vm composition', () => {
		it('vm exposes items, stats, UI state and form together', () => {
			store.setItems(mockUsuarios);
			store.setEstadisticas(mockStats);
			store.setLoading(true);
			store.setSearchTerm('maria');

			const vm = store.vm();
			expect(vm.usuarios).toHaveLength(3);
			expect(vm.estadisticas).toEqual(mockStats);
			expect(vm.hasEstadisticas).toBe(true);
			expect(vm.loading).toBe(true);
			expect(vm.searchTerm).toBe('maria');
			expect(vm.isEditing).toBe(false);
		});

		it('vm reflects editing mode after openEditDialog', () => {
			store.openEditDialog(mockDetalle);
			const vm = store.vm();
			expect(vm.isEditing).toBe(true);
			expect(vm.selectedUsuario).toEqual(mockDetalle);
			expect(vm.dialogVisible).toBe(true);
		});
	});
	// #endregion
});
// #endregion
