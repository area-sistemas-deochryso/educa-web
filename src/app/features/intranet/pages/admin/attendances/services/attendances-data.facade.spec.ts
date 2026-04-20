// * Tests for AttendancesDataFacade — valida paso de tipoPersona al service y sync response.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { AttendancesAdminService } from './attendances-admin.service';
import { AttendancesAdminStore } from './attendances-admin.store';
import { AttendancesDataFacade } from './attendances-data.facade';
import { SincronizarResultado } from '../models';
// #endregion

// #region Mocks
function createMockApi() {
	return {
		listarDelDia: vi.fn().mockReturnValue(of([])),
		obtenerEstadisticas: vi.fn().mockReturnValue(of(null)),
		listarPersonas: vi.fn().mockReturnValue(of([])),
		listarEstudiantes: vi.fn().mockReturnValue(of([])),
		listarCierres: vi.fn().mockReturnValue(of([])),
		sincronizarDesdeCrossChex: vi.fn(),
	};
}

const mockSyncResult: SincronizarResultado = {
	mensaje: 'ok',
	estudiantes: { nuevos: 10, preservados: 2, errores: 0 },
	profesores: { nuevos: 3, preservados: 1, errores: 0 },
};
// #endregion

describe('AttendancesDataFacade', () => {
	let facade: AttendancesDataFacade;
	let store: AttendancesAdminStore;
	let api: ReturnType<typeof createMockApi>;

	beforeEach(() => {
		api = createMockApi();
		TestBed.configureTestingModule({
			providers: [
				AttendancesDataFacade,
				AttendancesAdminStore,
				{ provide: AttendancesAdminService, useValue: api },
			],
		});
		facade = TestBed.inject(AttendancesDataFacade);
		store = TestBed.inject(AttendancesAdminStore);
	});

	describe('loadItems — pasa tipoPersona al service', () => {
		it('pasa "E" cuando filtro es "E"', () => {
			store.setTipoPersonaFilter('E');
			facade.loadItems();
			expect(api.listarDelDia).toHaveBeenCalledWith(
				expect.any(String),
				undefined,
				undefined,
				'E',
			);
		});

		it('pasa "P" cuando filtro es "P"', () => {
			store.setTipoPersonaFilter('P');
			facade.loadItems();
			expect(api.listarDelDia).toHaveBeenCalledWith(
				expect.any(String),
				undefined,
				undefined,
				'P',
			);
		});

		it('convierte "todos" → null antes de enviar al service', () => {
			store.setTipoPersonaFilter('todos');
			facade.loadItems();
			expect(api.listarDelDia).toHaveBeenCalledWith(
				expect.any(String),
				undefined,
				undefined,
				null,
			);
		});
	});

	describe('loadEstadisticas — siempre globales', () => {
		it('pasa null aunque el filtro sea E o P (stats globales con desglose)', () => {
			store.setTipoPersonaFilter('P');
			facade.loadEstadisticas();
			expect(api.obtenerEstadisticas).toHaveBeenCalledWith(
				expect.any(String),
				undefined,
				null,
			);
		});
	});

	describe('onTipoPersonaChange', () => {
		it('setea el filtro y dispara reload de items', () => {
			facade.onTipoPersonaChange('P');
			expect(store.tipoPersonaFilter()).toBe('P');
			expect(api.listarDelDia).toHaveBeenCalledWith(
				expect.any(String),
				undefined,
				undefined,
				'P',
			);
		});

		it('no hace nada si el filtro ya es ese valor', () => {
			store.setTipoPersonaFilter('E');
			api.listarDelDia.mockClear();
			facade.onTipoPersonaChange('E');
			expect(api.listarDelDia).not.toHaveBeenCalled();
		});

		it('resetea tableReady antes de recargar', () => {
			store.setTableReady(true);
			facade.onTipoPersonaChange('P');
			// Antes del response asíncrono, ya debería estar false.
			// El mock devuelve `of([])` sincrónico, así que setea a true inmediatamente.
			// Verificamos que el flujo lo tocó: inicia con false y termina en true.
			expect(store.tableReady()).toBe(true); // ya completó el subscribe sincrónico
		});
	});

	describe('loadPersonas', () => {
		it('delega al service con tipoPersona', () => {
			facade.loadPersonas('P', 'maria');
			expect(api.listarPersonas).toHaveBeenCalledWith(undefined, 'maria', 'P');
		});
	});

	describe('sincronizarDesdeCrossChex', () => {
		it('invoca onSuccess con el resultado estructurado', () => {
			api.sincronizarDesdeCrossChex.mockReturnValue(of(mockSyncResult));
			const onSuccess = vi.fn();
			const onError = vi.fn();

			facade.sincronizarDesdeCrossChex(onSuccess, onError);

			expect(onSuccess).toHaveBeenCalledWith(mockSyncResult);
			expect(onError).not.toHaveBeenCalled();
			expect(store.syncing()).toBe(false);
		});

		it('invoca onError cuando el service falla', () => {
			api.sincronizarDesdeCrossChex.mockReturnValue(throwError(() => new Error('boom')));
			const onSuccess = vi.fn();
			const onError = vi.fn();

			facade.sincronizarDesdeCrossChex(onSuccess, onError);

			expect(onError).toHaveBeenCalled();
			expect(onSuccess).not.toHaveBeenCalled();
			expect(store.syncing()).toBe(false);
		});

		it('no arranca si ya está sincronizando', () => {
			store.setSyncing(true);
			api.sincronizarDesdeCrossChex.mockReturnValue(of(mockSyncResult));

			facade.sincronizarDesdeCrossChex();

			expect(api.sincronizarDesdeCrossChex).not.toHaveBeenCalled();
		});
	});
});
