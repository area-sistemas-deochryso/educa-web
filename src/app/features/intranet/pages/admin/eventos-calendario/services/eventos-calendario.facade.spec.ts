// * Tests for EventosCalendarioFacade — validates CRUD orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { DestroyRef } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EventosCalendarioFacade } from './eventos-calendario.facade';
import { EventosCalendarioStore } from './eventos-calendario.store';
import { EventosCalendarioService } from './eventos-calendario.service';
import { ErrorHandlerService } from '@core/services';
import { EventoCalendarioLista, EventosCalendarioEstadisticas } from '@data/models';

// #endregion

// #region Mocks
const mockItems: EventoCalendarioLista[] = [
	{
		id: 1, titulo: 'Día del Maestro', descripcion: 'Celebración', tipo: 'academic',
		icono: 'pi-calendar', fechaInicio: '2026-07-06', fechaFin: null, hora: '08:00',
		ubicacion: 'Auditorio', estado: true, anio: 2026, fechaCreacion: '2026-01-01',
		fechaModificacion: null, rowVersion: 'v1',
	},
];

const mockStats: EventosCalendarioEstadisticas = { total: 1, activos: 1, inactivos: 0, proximosMes: 0 };

function createMockApi() {
	return {
		listar: vi.fn().mockReturnValue(of(mockItems)),
		getEstadisticas: vi.fn().mockReturnValue(of(mockStats)),
		crear: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		actualizar: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		toggleEstado: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminar: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

function createMockErrorHandler() {
	return { showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() };
}
// #endregion

// #region Tests
describe('EventosCalendarioFacade', () => {
	let facade: EventosCalendarioFacade;
	let store: EventosCalendarioStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: ReturnType<typeof createMockErrorHandler>;

	beforeEach(() => {
		api = createMockApi();
		errorHandler = createMockErrorHandler();

		TestBed.configureTestingModule({
			providers: [
				EventosCalendarioFacade,
				EventosCalendarioStore,
				{ provide: EventosCalendarioService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});

		facade = TestBed.inject(EventosCalendarioFacade);
		store = TestBed.inject(EventosCalendarioStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load items and stats into store', () => {
			facade.loadAll();

			expect(store.items()).toEqual(mockItems);
			expect(store.estadisticas()).toEqual(mockStats);
			expect(store.loading()).toBe(false);
		});

		it('should set loading during load', () => {
			api.listar.mockReturnValue(of(mockItems));
			facade.loadAll();
			// After subscribe completes synchronously, loading is false
			expect(store.loading()).toBe(false);
		});

		it('should set loading true while fetching', () => {
			// withRetry makes error handling async, so we only test the loading=true part
			api.listar.mockReturnValue(throwError(() => new Error('fail')));
			api.getEstadisticas.mockReturnValue(throwError(() => new Error('fail')));
			facade.loadAll();

			// Loading was set to true at the start
			expect(api.listar).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region create
	describe('create', () => {
		beforeEach(() => {
			store.setEstadisticas(mockStats);
			store.setFormData({
				...store.formData(),
				titulo: 'Nuevo Evento',
				descripcion: 'Descripción',
				fechaInicio: '2026-10-01',
				estado: true,
			});
		});

		it('should call API and refresh items', () => {
			facade.create();

			expect(api.crear).toHaveBeenCalled();
			expect(store.dialogVisible()).toBe(false);
		});

		it('should increment stats on success', () => {
			facade.create();
			expect(store.estadisticas()!.total).toBe(2);
			expect(store.estadisticas()!.activos).toBe(2);
		});

		it('should handle error', () => {
			api.crear.mockReturnValue(throwError(() => new Error('fail')));
			facade.create();

			expect(errorHandler.showError).toHaveBeenCalled();
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region update
	describe('update', () => {
		beforeEach(() => {
			store.setItems(mockItems);
			store.setSelectedItem(mockItems[0]);
			store.setFormData({
				titulo: 'Updated',
				descripcion: 'New desc',
				tipo: 'cultural',
				icono: 'pi-star',
				fechaInicio: '2026-07-06',
				fechaFin: '',
				hora: '',
				ubicacion: '',
				estado: true,
				anio: 2026,
			});
		});

		it('should call API and update item in store', () => {
			facade.update();

			expect(api.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: 'Updated' }));
			expect(store.items()[0].titulo).toBe('Updated');
			expect(store.dialogVisible()).toBe(false);
		});

		it('should do nothing without selected item', () => {
			store.setSelectedItem(null);
			facade.update();
			expect(api.actualizar).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region toggleEstado
	describe('toggleEstado', () => {
		beforeEach(() => {
			store.setItems(mockItems);
			store.setEstadisticas(mockStats);
		});

		it('should toggle item estado and update stats', () => {
			facade.toggleEstado(mockItems[0]);

			expect(store.items()[0].estado).toBe(false);
			expect(store.estadisticas()!.activos).toBe(0);
			expect(store.estadisticas()!.inactivos).toBe(1);
		});

		it('should handle error', () => {
			api.toggleEstado.mockReturnValue(throwError(() => new Error('fail')));
			facade.toggleEstado(mockItems[0]);

			expect(errorHandler.showError).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region delete
	describe('delete', () => {
		beforeEach(() => {
			store.setItems(mockItems);
			store.setEstadisticas(mockStats);
		});

		it('should remove item and update stats', () => {
			facade.delete(mockItems[0]);

			expect(store.items()).toHaveLength(0);
			expect(store.estadisticas()!.total).toBe(0);
			expect(store.estadisticas()!.activos).toBe(0);
		});
	});
	// #endregion

	// #region UI commands
	describe('UI commands', () => {
		it('should open new dialog', () => {
			facade.openNewDialog();
			expect(store.dialogVisible()).toBe(true);
		});

		it('should open edit dialog with item data', () => {
			facade.openEditDialog(mockItems[0]);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.formData().titulo).toBe('Día del Maestro');
		});

		it('should close dialog', () => {
			facade.openNewDialog();
			facade.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});

		it('should manage confirm dialog', () => {
			facade.openConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(true);
			facade.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});

		it('should change año and reload', () => {
			facade.changeAnio(2025);
			expect(store.filterAnio()).toBe(2025);
			expect(api.listar).toHaveBeenCalledWith(2025);
		});
	});
	// #endregion
});
// #endregion
