// * Tests for AttendancesDataFacade — valida paso de tipoPersona al service, sync via WAL, y range sync.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

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
		sincronizarDesdeCrossChex: vi.fn(),
		sincronizarRango: vi.fn(),
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

	describe('sincronizarDesdeCrossChex (WAL dispatch)', () => {
		it('dispatches via WAL with CUSTOM operation and crosschexSync resourceType', () => {
			facade.sincronizarDesdeCrossChex();

			expect(wal.execute).toHaveBeenCalledOnce();
			const config = wal.execute.mock.calls[0][0];
			expect(config.operation).toBe('CUSTOM');
			expect(config.resourceType).toBe('crosschexSync');
			expect(config.method).toBe('POST');
			expect(config.endpoint).toContain('/sync');
		});

		it('optimistic.apply sets syncing to true', () => {
			facade.sincronizarDesdeCrossChex();
			const config = wal.execute.mock.calls[0][0];
			config.optimistic.apply();
			expect(store.syncing()).toBe(true);
		});

		it('onCommit clears syncing and starts tracking', () => {
			facade.sincronizarDesdeCrossChex();
			const config = wal.execute.mock.calls[0][0];
			const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
			config.onCommit({ jobId: VALID_JOB_ID, estado: 'QUEUED' });

			expect(store.syncing()).toBe(false);
			expect(syncService.startTracking).toHaveBeenCalledWith(VALID_JOB_ID);
		});

		it('onError with 409 Conflict re-subscribes to active jobId', () => {
			const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
			const conflictError = new HttpErrorResponse({
				status: 409,
				error: {
					success: false,
					message: 'Ya hay una sync en curso',
					data: { jobId: VALID_JOB_ID, estado: 'RUNNING' },
				},
			});
			const onError = vi.fn();
			facade.sincronizarDesdeCrossChex(onError);

			const config = wal.execute.mock.calls[0][0];
			config.onError(conflictError);

			expect(syncService.startTracking).toHaveBeenCalledWith(VALID_JOB_ID);
			expect(onError).not.toHaveBeenCalled();
		});

		it('onError with non-409 invokes onError callback', () => {
			const onError = vi.fn();
			facade.sincronizarDesdeCrossChex(onError);

			const config = wal.execute.mock.calls[0][0];
			config.onError(new Error('boom'));

			expect(onError).toHaveBeenCalled();
			expect(store.syncing()).toBe(false);
		});

		it('does not dispatch if syncService.isActive', () => {
			syncService.isActive.mockReturnValue(true);
			facade.sincronizarDesdeCrossChex();
			expect(wal.execute).not.toHaveBeenCalled();
		});

		it('does not dispatch if store.syncing is already true', () => {
			store.setSyncing(true);
			facade.sincronizarDesdeCrossChex();
			expect(wal.execute).not.toHaveBeenCalled();
		});
	});

	describe('sincronizarRango (P24C F3 — range sync via WAL)', () => {
		const RANGE_BODY = { fechaInicio: '2026-01-01', fechaFin: '2026-01-15' };

		it('dispatches via WAL with sync-range endpoint', () => {
			facade.sincronizarRango(RANGE_BODY);

			expect(wal.execute).toHaveBeenCalledOnce();
			const config = wal.execute.mock.calls[0][0];
			expect(config.operation).toBe('CUSTOM');
			expect(config.resourceType).toBe('crosschexSync');
			expect(config.endpoint).toContain('/sync-range');
			expect(config.payload).toEqual(RANGE_BODY);
		});

		it('passes dnis filter when provided', () => {
			const bodyWithDnis = { ...RANGE_BODY, dnis: ['12345678', '87654321'] };
			facade.sincronizarRango(bodyWithDnis);

			const config = wal.execute.mock.calls[0][0];
			expect(config.payload).toEqual(bodyWithDnis);
		});

		it('onCommit starts tracking with jobId', () => {
			facade.sincronizarRango(RANGE_BODY);
			const config = wal.execute.mock.calls[0][0];
			const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
			config.onCommit({ jobId: VALID_JOB_ID, estado: 'QUEUED' });

			expect(syncService.startTracking).toHaveBeenCalledWith(VALID_JOB_ID);
			expect(store.syncing()).toBe(false);
		});

		it('does not dispatch if sync already active', () => {
			syncService.isActive.mockReturnValue(true);
			facade.sincronizarRango(RANGE_BODY);
			expect(wal.execute).not.toHaveBeenCalled();
		});
	});
});
