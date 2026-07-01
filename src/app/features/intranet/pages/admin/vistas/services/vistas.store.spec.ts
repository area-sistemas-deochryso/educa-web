// * Tests for VistasStore — validates capability catalog state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { VistasStore } from './vistas.store';
import { CapabilityCatalogItem } from '@core/services';

// #endregion

// #region Test fixtures
const mockItems: CapabilityCatalogItem[] = [
	{ id: 1, codigo: 'USR_VIEW', nombre: 'Ver Usuarios', modulo: 'admin', descripcion: 'Listar usuarios', orden: 1, ruta: 'intranet/admin/usuarios', estado: true },
	{ id: 2, codigo: 'CRS_VIEW', nombre: 'Ver Cursos', modulo: 'admin', descripcion: 'Listar cursos', orden: 2, ruta: 'intranet/admin/cursos', estado: true },
	{ id: 3, codigo: 'SAL_VIEW', nombre: 'Ver Salones', modulo: 'admin', descripcion: '', orden: 3, ruta: null, estado: true },
	{ id: 4, codigo: 'HOR_VIEW', nombre: 'Ver Horarios', modulo: 'profesor', descripcion: 'Horarios profesor', orden: 4, ruta: 'intranet/profesor/horarios', estado: true },
];

const mockStats = {
	total: 4,
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
			expect(store.formData()).toEqual({ codigo: '', nombre: '', modulo: '', descripcion: '', ruta: '' });
		});

		it('should have default estadisticas', () => {
			expect(store.estadisticas()).toEqual({
				total: 0,
				totalModulos: 0,
				modulos: [],
			});
		});

		it('should have null filter modulo', () => {
			expect(store.filterModulo()).toBeNull();
		});

		it('should have default ruta filter', () => {
			expect(store.filterRuta()).toBe('all');
		});
	});
	// #endregion

	// #region Filter modulo
	describe('filterModulo', () => {
		it('should set and clear filter modulo', () => {
			store.setFilterModulo('admin');
			expect(store.filterModulo()).toBe('admin');

			store.setFilterModulo(null);
			expect(store.filterModulo()).toBeNull();
		});

		it('should clear filter modulo on clearFiltros', () => {
			store.setFilterModulo('admin');
			store.setSearchTerm('test');

			store.clearFiltros();

			expect(store.filterModulo()).toBeNull();
			expect(store.searchTerm()).toBe('');
		});

		it('should clear filter ruta on clearFiltros', () => {
			store.setFilterRuta('with');

			store.clearFiltros();

			expect(store.filterRuta()).toBe('all');
		});
	});
	// #endregion

	// #region Computed — modulosOptions
	describe('modulosOptions', () => {
		it('should return "Todos" option when no stats', () => {
			const options = store.modulosOptions();
			expect(options).toHaveLength(1);
			expect(options[0]).toEqual({ label: 'Todos los módulos', value: null });
		});

		it('should build options from estadisticas modulos', () => {
			store.setEstadisticas(mockStats);

			const options = store.modulosOptions();
			expect(options).toHaveLength(3);
			expect(options[0]).toEqual({ label: 'Todos los módulos', value: null });
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

		it('should be invalid with only codigo', () => {
			store.setFormData({ codigo: 'TEST', nombre: '', modulo: '', descripcion: '', ruta: '' });
			expect(store.isFormValid()).toBe(false);
		});

		it('should be invalid with only nombre', () => {
			store.setFormData({ codigo: '', nombre: 'Test', modulo: '', descripcion: '', ruta: '' });
			expect(store.isFormValid()).toBe(false);
		});

		it('should be invalid without modulo', () => {
			store.setFormData({ codigo: 'TEST', nombre: 'Test', modulo: '', descripcion: '', ruta: '' });
			expect(store.isFormValid()).toBe(false);
		});

		it('should be valid with codigo, nombre, and modulo', () => {
			store.setFormData({ codigo: 'TEST', nombre: 'Test', modulo: 'admin', descripcion: '', ruta: '' });
			expect(store.isFormValid()).toBe(true);
		});

		it('should be invalid with whitespace-only values', () => {
			store.setFormData({ codigo: '  ', nombre: '  ', modulo: '  ', descripcion: '', ruta: '' });
			expect(store.isFormValid()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — itemsWithRoute
	describe('itemsWithRoute', () => {
		it('should compute segmento from ruta', () => {
			store.setItems(mockItems);
			const items = store.itemsWithRoute();

			expect(items[0].segmento).toBe('admin');
			expect(items[3].segmento).toBe('profesor');
		});

		it('should set segmento null when no ruta', () => {
			store.setItems(mockItems);
			const items = store.itemsWithRoute();

			expect(items[2].segmento).toBeNull();
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state into vm', () => {
			store.setItems(mockItems);
			store.setEstadisticas(mockStats);
			store.setSearchTerm('test');
			store.setFilterModulo('admin');

			const vm = store.vm();

			expect(vm.items).toHaveLength(4);
			expect(vm.loading).toBe(false);
			expect(vm.error).toBeNull();
			expect(vm.searchTerm).toBe('test');
			expect(vm.filterModulo).toBe('admin');
			expect(vm.filterRuta).toBe('all');
			expect(vm.dialogVisible).toBe(false);
			expect(vm.isEditing).toBe(false);
			expect(vm.isFormValid).toBe(false);
			expect(vm.modulosOptions).toHaveLength(3);
			expect(vm.confirmDialogVisible).toBe(false);
		});
	});
	// #endregion

	// #region Dialog reset
	describe('closeDialog resets form to defaults', () => {
		it('should reset form data on close', () => {
			store.setFormData({ codigo: 'dirty', nombre: 'Dirty', modulo: 'admin', descripcion: 'Desc', ruta: 'x/y' });
			store.openDialog();
			store.closeDialog();

			expect(store.formData()).toEqual({ codigo: '', nombre: '', modulo: '', descripcion: '', ruta: '' });
		});
	});
	// #endregion

	// #region Filter ruta
	describe('filterRuta', () => {
		it('should set filter ruta', () => {
			store.setFilterRuta('with');
			expect(store.filterRuta()).toBe('with');

			store.setFilterRuta('without');
			expect(store.filterRuta()).toBe('without');
		});
	});
	// #endregion
});
// #endregion
