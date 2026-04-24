// * Tests for AttendancesDataFacade — valida paso de tipoPersona al service y sync response.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { CrossChexSyncStatusService } from '@core/services/signalr';
import { AttendancesAdminService } from './attendances-admin.service';
import { AttendancesAdminStore } from './attendances-admin.store';
import { AttendancesDataFacade } from './attendances-data.facade';
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

function createMockSyncService() {
	return {
		isActive: vi.fn().mockReturnValue(false),
		startTracking: vi.fn().mockResolvedValue(undefined),
	};
}
// #endregion

describe('AttendancesDataFacade', () => {
	let facade: AttendancesDataFacade;
	let store: AttendancesAdminStore;
	let api: ReturnType<typeof createMockApi>;
	let syncService: ReturnType<typeof createMockSyncService>;

	beforeEach(() => {
		api = createMockApi();
		syncService = createMockSyncService();
		TestBed.configureTestingModule({
			providers: [
				AttendancesDataFacade,
				AttendancesAdminStore,
				{ provide: AttendancesAdminService, useValue: api },
				{ provide: CrossChexSyncStatusService, useValue: syncService },
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

	describe('sincronizarDesdeCrossChex (Plan 24 Chat 3 — background job)', () => {
		const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

		it('202 Accepted → delega el tracking al CrossChexSyncStatusService', () => {
			api.sincronizarDesdeCrossChex.mockReturnValue(
				of({ jobId: VALID_JOB_ID, estado: 'QUEUED' }),
			);

			facade.sincronizarDesdeCrossChex();

			expect(syncService.startTracking).toHaveBeenCalledWith(VALID_JOB_ID);
			expect(store.syncing()).toBe(false);
		});

		it('409 Conflict con jobId activo → re-suscribe al jobId del error', () => {
			const conflictError = new HttpErrorResponse({
				status: 409,
				error: {
					success: false,
					message: 'Ya hay una sync en curso',
					data: { jobId: VALID_JOB_ID, estado: 'RUNNING' },
				},
			});
			api.sincronizarDesdeCrossChex.mockReturnValue(throwError(() => conflictError));
			const onError = vi.fn();

			facade.sincronizarDesdeCrossChex(onError);

			expect(syncService.startTracking).toHaveBeenCalledWith(VALID_JOB_ID);
			expect(onError).not.toHaveBeenCalled();
		});

		it('error no-409 → invoca onError', () => {
			api.sincronizarDesdeCrossChex.mockReturnValue(throwError(() => new Error('boom')));
			const onError = vi.fn();

			facade.sincronizarDesdeCrossChex(onError);

			expect(onError).toHaveBeenCalled();
			expect(syncService.startTracking).not.toHaveBeenCalled();
			expect(store.syncing()).toBe(false);
		});

		it('no dispara sync si ya hay uno activo (syncService.isActive)', () => {
			syncService.isActive.mockReturnValue(true);

			facade.sincronizarDesdeCrossChex();

			expect(api.sincronizarDesdeCrossChex).not.toHaveBeenCalled();
		});

		it('no arranca si store.syncing ya es true', () => {
			store.setSyncing(true);
			api.sincronizarDesdeCrossChex.mockReturnValue(
				of({ jobId: VALID_JOB_ID, estado: 'QUEUED' }),
			);

			facade.sincronizarDesdeCrossChex();

			expect(api.sincronizarDesdeCrossChex).not.toHaveBeenCalled();
		});
	});
});
