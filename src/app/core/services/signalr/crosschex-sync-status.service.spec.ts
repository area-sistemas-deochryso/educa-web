// * Tests for CrossChexSyncStatusService — Plan 24 Chat 3.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HubConnectionState } from '@microsoft/signalr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@config/environment';
import { AttendanceSignalRService } from './attendance-signalr.service';
import { CrossChexSyncStatusService } from './crosschex-sync-status.service';
import {
	CrossChexSyncStatusDto,
	SyncEstado,
} from './crosschex-sync-status.models';
// #endregion

// #region Fixtures

const VALID_JOB_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
const OTHER_JOB_ID = 'f0e1d2c3b4a59687aabbccddeeff0011';
const STORAGE_KEY = 'educa_crosschex_sync_job';

interface FakeHubConnection {
	state: HubConnectionState;
	invoke: ReturnType<typeof vi.fn>;
	on: ReturnType<typeof vi.fn>;
	off: ReturnType<typeof vi.fn>;
	handlers: Map<string, (payload: unknown) => void>;
	trigger: (event: string, payload: unknown) => void;
}

function createFakeHub(): FakeHubConnection {
	const handlers = new Map<string, (payload: unknown) => void>();
	return {
		state: HubConnectionState.Connected,
		invoke: vi.fn().mockResolvedValue(undefined),
		on: vi.fn().mockImplementation((event: string, handler: (p: unknown) => void) => {
			handlers.set(event, handler);
		}),
		off: vi.fn().mockImplementation((event: string) => {
			handlers.delete(event);
		}),
		handlers,
		trigger(event, payload) {
			const h = handlers.get(event);
			if (h) h(payload);
		},
	};
}

function buildDto(over: Partial<CrossChexSyncStatusDto> = {}): CrossChexSyncStatusDto {
	return {
		jobId: VALID_JOB_ID,
		estado: 'RUNNING',
		pagina: 1,
		totalPaginas: 5,
		fase: 'DESCARGANDO',
		mensaje: null,
		iniciadoEn: '2026-04-24T10:00:00',
		finalizadoEn: null,
		error: null,
		...over,
	};
}

// #endregion

describe('CrossChexSyncStatusService', () => {
	let service: CrossChexSyncStatusService;
	let hub: FakeHubConnection;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		sessionStorage.removeItem(STORAGE_KEY);
		hub = createFakeHub();

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: AttendanceSignalRService,
					useValue: {
						ensureConnected: vi.fn().mockResolvedValue(hub),
					},
				},
			],
		});

		service = TestBed.inject(CrossChexSyncStatusService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	// #region startTracking

	describe('startTracking', () => {
		it('persiste el jobId en sessionStorage y suscribe al hub', async () => {
			await service.startTracking(VALID_JOB_ID);

			expect(sessionStorage.getItem(STORAGE_KEY)).toBe(VALID_JOB_ID);
			expect(hub.invoke).toHaveBeenCalledWith('SubscribeToSyncJob', VALID_JOB_ID);
			expect(hub.on).toHaveBeenCalledWith('SyncProgress', expect.any(Function));
		});

		it('es idempotente con el mismo jobId (no re-suscribe)', async () => {
			await service.startTracking(VALID_JOB_ID);
			await service.startTracking(VALID_JOB_ID);

			expect(hub.invoke).toHaveBeenCalledTimes(1);
		});

		it('desuscribe el job anterior antes de suscribir uno nuevo', async () => {
			await service.startTracking(VALID_JOB_ID);
			await service.startTracking(OTHER_JOB_ID);

			expect(hub.invoke).toHaveBeenCalledWith('UnsubscribeFromSyncJob', VALID_JOB_ID);
			expect(hub.invoke).toHaveBeenCalledWith('SubscribeToSyncJob', OTHER_JOB_ID);
		});

		it('ignora jobIds inválidos (no matchean regex)', async () => {
			await service.startTracking('not-a-hex-32');

			expect(hub.invoke).not.toHaveBeenCalled();
			expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		});
	});

	// #endregion

	// #region Eventos SyncProgress

	describe('evento SyncProgress', () => {
		it('RUNNING actualiza el signal status', async () => {
			await service.startTracking(VALID_JOB_ID);
			hub.trigger('SyncProgress', buildDto({ estado: 'RUNNING', pagina: 3 }));

			expect(service.status()?.estado).toBe('RUNNING');
			expect(service.status()?.pagina).toBe(3);
			expect(service.hasActiveJob()).toBe(true);
		});

		it('COMPLETED emite terminal$, limpia storage y hasActiveJob=false', async () => {
			const terminalEvents: SyncEstado[] = [];
			service.terminal$.subscribe(({ status }) => terminalEvents.push(status.estado));

			await service.startTracking(VALID_JOB_ID);
			hub.trigger('SyncProgress', buildDto({ estado: 'COMPLETED' }));

			expect(terminalEvents).toEqual(['COMPLETED']);
			expect(service.status()?.estado).toBe('COMPLETED');
			expect(service.hasActiveJob()).toBe(false);
			expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		});

		it('FAILED emite terminal$ con el error del DTO', async () => {
			const terminalEvents: CrossChexSyncStatusDto[] = [];
			service.terminal$.subscribe(({ status }) => terminalEvents.push(status));

			await service.startTracking(VALID_JOB_ID);
			hub.trigger(
				'SyncProgress',
				buildDto({ estado: 'FAILED', error: 'Timeout upstream', mensaje: null }),
			);

			expect(terminalEvents.length).toBe(1);
			expect(terminalEvents[0].error).toBe('Timeout upstream');
			expect(service.hasActiveJob()).toBe(false);
		});

		it('ignora eventos de otros jobs que no trackeamos', async () => {
			await service.startTracking(VALID_JOB_ID);
			hub.trigger('SyncProgress', buildDto({ jobId: OTHER_JOB_ID, estado: 'RUNNING' }));

			expect(service.status()).toBeNull();
		});

		it('soporta payloads PascalCase del hub (normalización)', async () => {
			await service.startTracking(VALID_JOB_ID);
			hub.trigger('SyncProgress', {
				JobId: VALID_JOB_ID,
				Estado: 'RUNNING',
				Pagina: 2,
				TotalPaginas: 4,
				Fase: 'DESCARGANDO',
				Mensaje: null,
				IniciadoEn: '2026-04-24T10:00:00',
				FinalizadoEn: null,
				Error: null,
			});

			expect(service.status()?.pagina).toBe(2);
			expect(service.status()?.totalPaginas).toBe(4);
		});
	});

	// #endregion

	// #region rehydrate

	describe('rehydrate', () => {
		it('sin jobId en storage → no-op', async () => {
			await service.rehydrate();
			httpMock.expectNone(() => true);
			expect(service.status()).toBeNull();
		});

		it('con jobId + status RUNNING → re-suscribe al hub', async () => {
			sessionStorage.setItem(STORAGE_KEY, VALID_JOB_ID);
			await service.rehydrate();

			const req = httpMock.expectOne(
				`${environment.apiUrl}/api/asistencia-admin/sync/${VALID_JOB_ID}/status`,
			);
			req.flush(buildDto({ estado: 'RUNNING' }));
			await Promise.resolve();

			expect(service.status()?.estado).toBe('RUNNING');
			expect(service.hasActiveJob()).toBe(true);
		});

		it('con jobId + status COMPLETED → emite terminal$ y limpia storage', async () => {
			sessionStorage.setItem(STORAGE_KEY, VALID_JOB_ID);

			const terminalEvents: SyncEstado[] = [];
			service.terminal$.subscribe(({ status }) => terminalEvents.push(status.estado));

			await service.rehydrate();
			const req = httpMock.expectOne(
				`${environment.apiUrl}/api/asistencia-admin/sync/${VALID_JOB_ID}/status`,
			);
			req.flush(buildDto({ estado: 'COMPLETED' }));

			expect(terminalEvents).toEqual(['COMPLETED']);
			expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		});

		it('con jobId inválido (no hex) → limpia storage sin llamar API', async () => {
			sessionStorage.setItem(STORAGE_KEY, 'garbage');
			await service.rehydrate();

			httpMock.expectNone(() => true);
			expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		});
	});

	// #endregion

	// #region stopTracking

	describe('stopTracking', () => {
		it('desuscribe, limpia storage y resetea signal', async () => {
			await service.startTracking(VALID_JOB_ID);
			hub.trigger('SyncProgress', buildDto({ estado: 'RUNNING' }));

			await service.stopTracking();

			expect(hub.invoke).toHaveBeenCalledWith('UnsubscribeFromSyncJob', VALID_JOB_ID);
			expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
			expect(service.status()).toBeNull();
			expect(service.trackingJobId()).toBeNull();
		});

		it('no-op si no hay nada trackeando', async () => {
			await service.stopTracking();
			expect(hub.invoke).not.toHaveBeenCalled();
		});
	});

	// #endregion
});
