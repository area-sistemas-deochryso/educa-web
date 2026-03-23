// * Tests for VistasStore — validates vista-specific CRUD state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { VistasStore } from './vistas.store';
import { Vista, VistasEstadisticas } from '@core/services';

// #endregion

// #region Test fixtures
const mockVistas: Vista[] = [
	{ id: 1, ruta: 'intranet/admin/usuarios', nombre: 'Usuarios', estado: 1 },
	{ id: 2, ruta: 'intranet/admin/cursos', nombre: 'Cursos', estado: 1 },
	{ id: 3, ruta: 'intranet/admin/salones', nombre: 'Salones', estado: 0 },
	{ id: 4, ruta: 'intranet/profesor/horarios', nombre: 'Horarios', estado: 1 },
];

const mockStats: VistasEstadisticas = {
	totalVistas: 4,
	vistasActivas: 3,
	vistasInactivas: 1,
	totalModulos: 2,
	modulos: ['admin', 'profesor'],
};
// #endregion

// #region Tests
describe('VistasStore', () => {
	let store: VistasStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [VistasStore],
		});
		store = TestBed.inject(VistasStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have default form data', () => {
			expect(store.formData()).toEqual({ ruta: '', nombre: '', estado: 1 });
		});

		it('should have default estadisticas', () => {
			expect(store.estadisticas()).toEqual({
				totalVistas: 0,
				vistasActivas: 0,
				vistasInactivas: 0,
				totalModulos: 0,
				modulos: [],
			});
		});

		it('should have null filter modulo', () => {
			expect(store.filterModulo()).toBeNull();
		});
	});
	// #endregion

	// #region Filter módulo
	describe('filterModulo', () => {
		it('should set and clear filter módulo', () => {
			store.setFilterModulo('admin');
			expect(store.filterModulo()).toBe('admin');

			store.setFilterModulo(null);
			expect(store.filterModulo()).toBeNull();
		});

		it('should clear filter módulo on clearFiltros', () => {
			store.setFilterModulo('admin');
			store.setSearchTerm('test');

			store.clearFiltros();

			expect(store.filterModulo()).toBeNull();
			expect(store.searchTerm()).toBe('');
		});
	});
	// #endregion

	// #region Computed — modulosOptions
	describe('modulosOptions', () => {
		it('should return "Todos" option when no stats', () => {
			const options = store.modulosOptions();
			expect(options).toHaveLength(1);
			expect(options[0]).toEqual({ label: 'Todos los modulos', value: null });
		});

		it('should build options from estadisticas modulos', () => {
			store.setEstadisticas(mockStats);

			const options = store.modulosOptions();
			expect(options).toHaveLength(3);
			expect(options[0]).toEqual({ label: 'Todos los modulos', value: null });
			expect(options[1]).toEqual({ label: 'Admin', value: 'admin' });
			expect(options[2]).toEqual({ label: 'Profesor', value: 'profesor' });
		});
	});
	// #endregion

	// #region Computed — isFormValid
	describe('isFormValid', () => {
		it('should be invalid with empty form', () => {
			expect(store.isFormValid()).toBe(false);
		});

		it('should be invalid with only ruta', () => {
			store.setFormData({ ruta: 'intranet/test', nombre: '', estado: 1 });
			expect(store.isFormValid()).toBe(false);
		});

		it('should be invalid with only nombre', () => {
			store.setFormData({ ruta: '', nombre: 'Test', estado: 1 });
			expect(store.isFormValid()).toBe(false);
		});

		it('should be valid with ruta and nombre', () => {
			store.setFormData({ ruta: 'intranet/test', nombre: 'Test', estado: 1 });
			expect(store.isFormValid()).toBe(true);
		});

		it('should be invalid with whitespace-only values', () => {
			store.setFormData({ ruta: '  ', nombre: '  ', estado: 1 });
			expect(store.isFormValid()).toBe(false);
		});
	});
	// #endregion

	// #region Mutaciones — toggleVistaEstado
	describe('toggleVistaEstado', () => {
		it('should toggle estado from 1 to 0', () => {
			store.setItems(mockVistas);
			store.toggleVistaEstado(1);

			const vista = store.items().find((v) => v.id === 1);
			expect(vista?.estado).toBe(0);
		});

		it('should toggle estado from 0 to 1', () => {
			store.setItems(mockVistas);
			store.toggleVistaEstado(3);

			const vista = store.items().find((v) => v.id === 3);
			expect(vista?.estado).toBe(1);
		});

		it('should not modify other vistas', () => {
			store.setItems(mockVistas);
			store.toggleVistaEstado(1);

			expect(store.items().find((v) => v.id === 2)?.estado).toBe(1);
			expect(store.items().find((v) => v.id === 3)?.estado).toBe(0);
		});

		it('should do nothing for non-existent id', () => {
			store.setItems(mockVistas);
			store.toggleVistaEstado(999);

			expect(store.items()).toEqual(mockVistas);
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state into vm', () => {
			store.setItems(mockVistas);
			store.setEstadisticas(mockStats);
			store.setSearchTerm('test');
			store.setFilterModulo('admin');

			const vm = store.vm();

			expect(vm.vistas).toEqual(mockVistas);
			expect(vm.loading).toBe(false);
			expect(vm.error).toBeNull();
			expect(vm.searchTerm).toBe('test');
			expect(vm.filterModulo).toBe('admin');
			expect(vm.dialogVisible).toBe(false);
			expect(vm.isEditing).toBe(false);
			expect(vm.isFormValid).toBe(false);
			expect(vm.modulosOptions).toHaveLength(3);
		});
	});
	// #endregion

	// #region Dialog reset
	describe('closeDialog resets form to defaults', () => {
		it('should reset form data on close', () => {
			store.setFormData({ ruta: 'dirty', nombre: 'Dirty', estado: 0 });
			store.openDialog();
			store.closeDialog();

			expect(store.formData()).toEqual({ ruta: '', nombre: '', estado: 1 });
		});
	});
	// #endregion
});
// #endregion
