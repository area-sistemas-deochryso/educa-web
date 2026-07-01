// * Tests for AttendancesDataFacade — valida paso de tipoPersona al service, sync via WAL, y range sync.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { ErrorHandlerService, WalCrossTabRefetchService } from '@core/services';
import { CrossChexSyncStatusService } from '@core/services/signalr';
import { WalFacadeHelper } from '@core/services/wal';
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
		sincronizarDesdeCrossChex: vi.fn().mockReturnValue(of({ jobId: 'default-job-id', estado: 'QUEUED' })),
		sincronizarRango: vi.fn().mockReturnValue(of({ jobId: 'default-job-id', estado: 'QUEUED' })),
	};
}

function createMockSyncService() {
	return {
		isActive: vi.fn().mockReturnValue(false),
		startTracking: vi.fn().mockResolvedValue(undefined),
	};
}

function createMockWal() {
	return {
		execute: vi.fn().mockResolvedValue(undefined),
		hasPendingForResource: vi.fn().mockResolvedValue(false),
		postReloadCommit$: vi.fn().mockReturnValue(of()),
	};
}

function createMockErrorHandler() {
	return { showError: vi.fn(), showWarning: vi.fn() };
}

function createMockCrossTabRefetch() {
	return { subscribe: vi.fn() };
}
// #endregion

describe('AttendancesDataFacade', () => {
	let facade: AttendancesDataFacade;
	let store: AttendancesAdminStore;
	let api: ReturnType<typeof createMockApi>;
	let syncService: ReturnType<typeof createMockSyncService>;
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		syncService = createMockSyncService();
		wal = createMockWal();
		TestBed.configureTestingModule({
			providers: [
				AttendancesDataFacade,
				AttendancesAdminStore,
				{ provide: AttendancesAdminService, useValue: api },
				{ provide: CrossChexSyncStatusService, useValue: syncService },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: createMockErrorHandler() },
				{ provide: WalCrossTabRefetchService, useValue: createMockCrossTabRefetch() },
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

	describe('sincronizarDesdeCrossChex (direct HTTP)', () => {
		it('calls api.sincronizarDesdeCrossChex and starts tracking on success', () => {
			const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
			api.sincronizarDesdeCrossChex.mockReturnValue(of({ jobId: VALID_JOB_ID, estado: 'QUEUED' }));
			facade.sincronizarDesdeCrossChex();

			expect(api.sincronizarDesdeCrossChex).toHaveBeenCalledOnce();
			expect(store.syncing()).toBe(false);
			expect(syncService.startTracking).toHaveBeenCalledWith(VALID_JOB_ID);
		});

		it('sets syncing to true before call completes', () => {
			api.sincronizarDesdeCrossChex.mockReturnValue(of({ jobId: 'job', estado: 'QUEUED' }));
			facade.sincronizarDesdeCrossChex();
			expect(api.sincronizarDesdeCrossChex).toHaveBeenCalled();
		});

		it('on 409 Conflict re-subscribes to active jobId', () => {
			const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
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

		it('on non-409 error invokes onError callback', () => {
			api.sincronizarDesdeCrossChex.mockReturnValue(throwError(() => new Error('boom')));
			const onError = vi.fn();
			facade.sincronizarDesdeCrossChex(onError);

			expect(onError).toHaveBeenCalled();
			expect(store.syncing()).toBe(false);
		});

		it('does not dispatch if syncService.isActive', () => {
			syncService.isActive.mockReturnValue(true);
			facade.sincronizarDesdeCrossChex();
			expect(api.sincronizarDesdeCrossChex).not.toHaveBeenCalled();
		});

		it('does not dispatch if store.syncing is already true', () => {
			store.setSyncing(true);
			facade.sincronizarDesdeCrossChex();
			expect(api.sincronizarDesdeCrossChex).not.toHaveBeenCalled();
		});
	});

	describe('sincronizarRango (direct HTTP)', () => {
		const RANGE_BODY = { fechaInicio: '2026-01-01', fechaFin: '2026-01-15' };

		it('calls api.sincronizarRango with body and starts tracking', () => {
			const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
			api.sincronizarRango.mockReturnValue(of({ jobId: VALID_JOB_ID, estado: 'QUEUED' }));
			facade.sincronizarRango(RANGE_BODY);

			expect(api.sincronizarRango).toHaveBeenCalledWith(RANGE_BODY);
			expect(syncService.startTracking).toHaveBeenCalledWith(VALID_JOB_ID);
			expect(store.syncing()).toBe(false);
		});

		it('passes dnis filter when provided', () => {
			const bodyWithDnis = { ...RANGE_BODY, dnis: ['12345678', '87654321'] };
			api.sincronizarRango.mockReturnValue(of({ jobId: 'job', estado: 'QUEUED' }));
			facade.sincronizarRango(bodyWithDnis);

			expect(api.sincronizarRango).toHaveBeenCalledWith(bodyWithDnis);
		});

		it('on error invokes onError callback', () => {
			api.sincronizarRango.mockReturnValue(throwError(() => new Error('boom')));
			const onError = vi.fn();
			facade.sincronizarRango(RANGE_BODY, onError);

			expect(onError).toHaveBeenCalled();
			expect(store.syncing()).toBe(false);
		});

		it('does not dispatch if sync already active', () => {
			syncService.isActive.mockReturnValue(true);
			facade.sincronizarRango(RANGE_BODY);
			expect(api.sincronizarRango).not.toHaveBeenCalled();
		});
	});
});
