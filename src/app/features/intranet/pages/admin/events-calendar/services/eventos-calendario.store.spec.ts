// * Tests for EventsCalendarStore — validates event-specific CRUD state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EventsCalendarStore } from './eventos-calendario.store';
import { EventoCalendarioLista } from '@data/models';

// #endregion

// #region Test fixtures
const mockEventos: EventoCalendarioLista[] = [
	{
		id: 1, titulo: 'Día del Maestro', descripcion: 'Celebración docente',
		tipo: 'academic', icono: 'pi-calendar', fechaInicio: '2026-07-06',
		fechaFin: null, hora: '08:00', ubicacion: 'Auditorio', estado: true,
		anio: 2026, fechaCreacion: '2026-01-01', fechaModificacion: null, rowVersion: 'v1',
	},
	{
		id: 2, titulo: 'Feria de Ciencias', descripcion: 'Exposición de proyectos',
		tipo: 'cultural', icono: 'pi-star', fechaInicio: '2026-09-15',
		fechaFin: '2026-09-16', hora: '09:00', ubicacion: 'Patio', estado: true,
		anio: 2026, fechaCreacion: '2026-01-01', fechaModificacion: null, rowVersion: 'v1',
	},
	{
		id: 3, titulo: 'Reunión Padres', descripcion: 'Reunión general',
		tipo: 'administrative', icono: 'pi-users', fechaInicio: '2026-03-20',
		fechaFin: null, hora: '18:00', ubicacion: 'Salón', estado: false,
		anio: 2026, fechaCreacion: '2026-01-01', fechaModificacion: null, rowVersion: 'v1',
	},
];
// #endregion

// #region Tests
describe('EventsCalendarStore', () => {
	let store: EventsCalendarStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [EventsCalendarStore],
		});
		store = TestBed.inject(EventsCalendarStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty form with current year', () => {
			const form = store.formData();
			expect(form.titulo).toBe('');
			expect(form.descripcion).toBe('');
			expect(form.tipo).toBe('academic');
			expect(form.anio).toBe(new Date().getFullYear());
		});

		it('should have default estadisticas', () => {
			expect(store.estadisticas()).toEqual({
				total: 0, activos: 0, inactivos: 0, proximosMes: 0,
			});
		});

		it('should have null filter tipo', () => {
			expect(store.filterTipo()).toBeNull();
		});
	});
	// #endregion

	// #region Filtros específicos
	describe('filtros', () => {
		it('should set filter tipo', () => {
			store.setFilterTipo('academic');
			expect(store.filterTipo()).toBe('academic');
		});

		it('should set filter año', () => {
			store.setFilterAnio(2025);
			expect(store.filterAnio()).toBe(2025);
		});

		it('should clear filter tipo on clearFiltros', () => {
			store.setFilterTipo('academic');
			store.setSearchTerm('test');

			store.clearFiltros();

			expect(store.filterTipo()).toBeNull();
			expect(store.searchTerm()).toBe('');
		});

		it('should NOT clear filter año on clearFiltros', () => {
			store.setFilterAnio(2025);
			store.clearFiltros();
			expect(store.filterAnio()).toBe(2025);
		});
	});
	// #endregion

	// #region Computed — isFormValid
	describe('isFormValid', () => {
		it('should be invalid with empty form', () => {
			expect(store.isFormValid()).toBe(false);
		});

		it('should be invalid without fechaInicio', () => {
			store.setFormData({ ...store.formData(), titulo: 'Test', descripcion: 'Desc' });
			expect(store.isFormValid()).toBe(false);
		});

		it('should be valid with titulo, descripcion and fechaInicio', () => {
			store.setFormData({
				...store.formData(),
				titulo: 'Evento',
				descripcion: 'Descripción',
				fechaInicio: '2026-07-06',
			});
			expect(store.isFormValid()).toBe(true);
		});
	});
	// #endregion

	// #region Computed — filteredItems
	describe('filteredItems', () => {
		beforeEach(() => {
			store.setItems(mockEventos);
		});

		it('should return all items without filters', () => {
			expect(store.filteredItems()).toHaveLength(3);
		});

		it('should filter by search term', () => {
			store.setSearchTerm('maestro');
			expect(store.filteredItems()).toHaveLength(1);
			expect(store.filteredItems()[0].titulo).toBe('Día del Maestro');
		});

		it('should filter by estado', () => {
			store.setFilterEstado(false);
			expect(store.filteredItems()).toHaveLength(1);
			expect(store.filteredItems()[0].id).toBe(3);
		});

		it('should filter by tipo', () => {
			store.setFilterTipo('cultural');
			expect(store.filteredItems()).toHaveLength(1);
			expect(store.filteredItems()[0].titulo).toBe('Feria de Ciencias');
		});

		it('should combine multiple filters', () => {
			store.setFilterEstado(true);
			store.setFilterTipo('academic');
			expect(store.filteredItems()).toHaveLength(1);
			expect(store.filteredItems()[0].titulo).toBe('Día del Maestro');
		});

		it('should return empty array when no match', () => {
			store.setSearchTerm('inexistente');
			expect(store.filteredItems()).toHaveLength(0);
		});
	});
	// #endregion

	// #region Mutaciones — toggleItemEstado
	describe('toggleItemEstado', () => {
		it('should toggle boolean estado true → false', () => {
			store.setItems(mockEventos);
			store.toggleItemEstado(1);

			expect(store.items().find((e) => e.id === 1)?.estado).toBe(false);
		});

		it('should toggle boolean estado false → true', () => {
			store.setItems(mockEventos);
			store.toggleItemEstado(3);

			expect(store.items().find((e) => e.id === 3)?.estado).toBe(true);
		});

		it('should do nothing for non-existent id', () => {
			store.setItems(mockEventos);
			store.toggleItemEstado(999);

			expect(store.items()).toEqual(mockEventos);
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state', () => {
			store.setItems(mockEventos);
			store.setFilterTipo('academic');

			const vm = store.vm();

			expect(vm.items).toHaveLength(1);
			expect(vm.filterTipo).toBe('academic');
			expect(vm.loading).toBe(false);
			expect(vm.dialogVisible).toBe(false);
		});
	});
	// #endregion

	// #region getDefaultFormData respects current año filter
	describe('getDefaultFormData uses current filterAnio', () => {
		it('should use filterAnio in default form', () => {
			store.setFilterAnio(2025);
			store.openDialog();
			store.closeDialog();

			expect(store.formData().anio).toBe(2025);
		});
	});
	// #endregion
});
// #endregion
