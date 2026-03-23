// * Tests for NotificacionesAdminStore — validates notification-specific CRUD state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { NotificacionesAdminStore } from './notificaciones-admin.store';
import { NotificacionLista } from '@data/models';

// #endregion

// #region Test fixtures
const mockNotificaciones: NotificacionLista[] = [
	{
		id: 1, titulo: 'Matrícula abierta', mensaje: 'Proceso de matrícula 2026',
		tipo: 'evento', prioridad: 'high', icono: 'pi-bell',
		fechaInicio: '2026-01-01', fechaFin: '2026-02-28',
		actionUrl: '/matricula', actionText: 'Matricularse',
		dismissible: true, estado: true, anio: 2026,
		fechaCreacion: '2026-01-01', fechaModificacion: null, rowVersion: 'v1',
	},
	{
		id: 2, titulo: 'Mantenimiento', mensaje: 'Sistema en mantenimiento',
		tipo: 'sistema', prioridad: 'medium', icono: 'pi-cog',
		fechaInicio: '2026-03-01', fechaFin: '2026-03-02',
		actionUrl: null, actionText: null,
		dismissible: false, estado: true, anio: 2026,
		fechaCreacion: '2026-01-01', fechaModificacion: null, rowVersion: 'v1',
	},
	{
		id: 3, titulo: 'Reunión cancelada', mensaje: 'Se cancela reunión del viernes',
		tipo: 'evento', prioridad: 'low', icono: 'pi-times',
		fechaInicio: '2026-03-15', fechaFin: '2026-03-15',
		actionUrl: null, actionText: null,
		dismissible: true, estado: false, anio: 2026,
		fechaCreacion: '2026-01-01', fechaModificacion: null, rowVersion: 'v1',
	},
];
// #endregion

// #region Tests
describe('NotificacionesAdminStore', () => {
	let store: NotificacionesAdminStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [NotificacionesAdminStore],
		});
		store = TestBed.inject(NotificacionesAdminStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty form with defaults', () => {
			const form = store.formData();
			expect(form.titulo).toBe('');
			expect(form.mensaje).toBe('');
			expect(form.tipo).toBe('evento');
			expect(form.prioridad).toBe('medium');
			expect(form.dismissible).toBe(true);
			expect(form.estado).toBe(true);
			expect(form.anio).toBe(new Date().getFullYear());
		});

		it('should have default estadisticas', () => {
			expect(store.estadisticas()).toEqual({
				total: 0, activas: 0, inactivas: 0, vigentesHoy: 0,
			});
		});
	});
	// #endregion

	// #region Filtros
	describe('filtros', () => {
		it('should set filter tipo', () => {
			store.setFilterTipo('sistema');
			expect(store.filterTipo()).toBe('sistema');
		});

		it('should set filter año', () => {
			store.setFilterAnio(2025);
			expect(store.filterAnio()).toBe(2025);
		});

		it('should clear filter tipo on clearFiltros', () => {
			store.setFilterTipo('sistema');
			store.clearFiltros();
			expect(store.filterTipo()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — isFormValid
	describe('isFormValid', () => {
		it('should be invalid with empty form', () => {
			expect(store.isFormValid()).toBe(false);
		});

		it('should be invalid without all required fields', () => {
			store.setFormData({ ...store.formData(), titulo: 'Test', mensaje: 'Msg' });
			expect(store.isFormValid()).toBe(false);
		});

		it('should be valid with all required fields', () => {
			store.setFormData({
				...store.formData(),
				titulo: 'Test',
				mensaje: 'Message',
				fechaInicio: '2026-01-01',
				fechaFin: '2026-01-31',
			});
			expect(store.isFormValid()).toBe(true);
		});

		it('should be invalid with whitespace-only titulo', () => {
			store.setFormData({
				...store.formData(),
				titulo: '  ',
				mensaje: 'Valid',
				fechaInicio: '2026-01-01',
				fechaFin: '2026-01-31',
			});
			expect(store.isFormValid()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — filteredItems
	describe('filteredItems', () => {
		beforeEach(() => {
			store.setItems(mockNotificaciones);
		});

		it('should return all items without filters', () => {
			expect(store.filteredItems()).toHaveLength(3);
		});

		it('should filter by search term in titulo', () => {
			store.setSearchTerm('matrícula');
			expect(store.filteredItems()).toHaveLength(1);
			expect(store.filteredItems()[0].titulo).toBe('Matrícula abierta');
		});

		it('should filter by search term in mensaje', () => {
			store.setSearchTerm('mantenimiento');
			expect(store.filteredItems()).toHaveLength(1);
		});

		it('should filter by estado', () => {
			store.setFilterEstado(false);
			expect(store.filteredItems()).toHaveLength(1);
			expect(store.filteredItems()[0].id).toBe(3);
		});

		it('should filter by tipo', () => {
			store.setFilterTipo('evento');
			expect(store.filteredItems()).toHaveLength(2);
		});

		it('should combine all filters', () => {
			store.setFilterEstado(true);
			store.setFilterTipo('evento');
			store.setSearchTerm('matrícula');
			expect(store.filteredItems()).toHaveLength(1);
		});
	});
	// #endregion

	// #region Mutaciones — toggleItemEstado
	describe('toggleItemEstado', () => {
		it('should toggle estado', () => {
			store.setItems(mockNotificaciones);
			store.toggleItemEstado(1);
			expect(store.items().find((n) => n.id === 1)?.estado).toBe(false);
		});

		it('should not affect other items', () => {
			store.setItems(mockNotificaciones);
			store.toggleItemEstado(1);
			expect(store.items().find((n) => n.id === 2)?.estado).toBe(true);
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose state correctly', () => {
			store.setItems(mockNotificaciones);
			store.setFilterTipo('evento');

			const vm = store.vm();

			expect(vm.items).toHaveLength(2);
			expect(vm.filterTipo).toBe('evento');
			expect(vm.loading).toBe(false);
		});
	});
	// #endregion
});
// #endregion
