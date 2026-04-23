import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';

import { EmailDashboardDiaDto } from '../models/email-dashboard-dia.models';
import { EmailOutboxDashboardDiaFacade } from './email-outbox-dashboard-dia.facade';
import { EmailOutboxDashboardDiaService } from './email-outbox-dashboard-dia.service';
import { EmailOutboxDashboardDiaStore } from './email-outbox-dashboard-dia.store';

function makeDto(overrides: Partial<EmailDashboardDiaDto> = {}): EmailDashboardDiaDto {
	return {
		fecha: '2026-04-23',
		resumen: {
			enviados: 10,
			fallidos: 2,
			pendientes: 1,
			reintentando: 0,
			formatoInvalido: 1,
			sinCorreo: 0,
			blacklisteados: 0,
			throttleHost: 0,
			otrosFallos: 0,
			deferFailContadorCpanel: 3,
		},
		porHora: [],
		porTipo: [],
		bouncesAcumulados: [],
		generatedAt: '2026-04-23T11:00:00',
		...overrides,
	};
}

function createMockApi() {
	return {
		obtenerDashboardDia: vi.fn().mockReturnValue(of(makeDto())),
		listarFallosDia: vi.fn().mockReturnValue(of([])),
	};
}

function createMockErrorHandler() {
	return {
		showError: vi.fn(),
		showSuccess: vi.fn(),
		showWarning: vi.fn(),
		handle: vi.fn(),
	};
}

describe('EmailOutboxDashboardDiaFacade', () => {
	let facade: EmailOutboxDashboardDiaFacade;
	let store: EmailOutboxDashboardDiaStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: ReturnType<typeof createMockErrorHandler>;

	beforeEach(() => {
		api = createMockApi();
		errorHandler = createMockErrorHandler();
		TestBed.configureTestingModule({
			providers: [
				EmailOutboxDashboardDiaFacade,
				EmailOutboxDashboardDiaStore,
				{ provide: EmailOutboxDashboardDiaService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(EmailOutboxDashboardDiaFacade);
		store = TestBed.inject(EmailOutboxDashboardDiaStore);
	});

	it('loadData: sets loading, calls API without fecha, stores dto and clears loading', () => {
		const dto = makeDto();
		api.obtenerDashboardDia.mockReturnValueOnce(of(dto));

		facade.loadData();

		expect(api.obtenerDashboardDia).toHaveBeenCalledWith(undefined);
		expect(store.dto()).toEqual(dto);
		expect(store.loading()).toBe(false);
		expect(store.error()).toBeNull();
	});

	it('loadData: also populates fallosDia via listarFallosDia', () => {
		const fallos = [
			{
				id: 1,
				tipo: 'ASISTENCIA' as const,
				estado: 'FAILED' as const,
				destinatario: 'x@y.com',
				asunto: 'Falló',
				entidadOrigen: null,
				entidadId: null,
				intentos: 3,
				maxIntentos: 5,
				ultimoError: '5.1.1 mailbox unknown',
				tipoFallo: 'FAILED_INVALID_ADDRESS',
				fechaEnvio: null,
				duracionMs: null,
				usuarioReg: 'sys',
				fechaReg: '2026-04-23T10:00:00',
			},
		];
		api.listarFallosDia.mockReturnValueOnce(of(fallos));

		facade.loadData();

		expect(api.listarFallosDia).toHaveBeenCalledTimes(1);
		expect(store.fallosDia()).toEqual(fallos);
	});

	it('refresh: reuses current fechaConsulta in the next request', () => {
		store.setFechaConsulta('2026-04-22');
		facade.refresh();
		expect(api.obtenerDashboardDia).toHaveBeenCalledWith('2026-04-22');
	});

	it('setFecha: updates fechaConsulta and triggers a new request', () => {
		facade.setFecha('2026-04-20');
		expect(store.fechaConsulta()).toBe('2026-04-20');
		expect(api.obtenerDashboardDia).toHaveBeenCalledWith('2026-04-20');
	});

	it('error FECHA_FUTURA_INVALIDA: shows toast with specific message and sets store.error', () => {
		const err = new HttpErrorResponse({
			status: 400,
			error: { errorCode: 'FECHA_FUTURA_INVALIDA' },
		});
		api.obtenerDashboardDia.mockReturnValueOnce(throwError(() => err));

		facade.loadData();

		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Dashboard de correos',
			'La fecha no puede ser posterior a hoy.',
		);
		expect(store.error()).toBe('FECHA_FUTURA_INVALIDA');
		expect(store.loading()).toBe(false);
	});

	it('error FECHA_DEMASIADO_ANTIGUA: shows 90-day message', () => {
		const err = new HttpErrorResponse({
			status: 400,
			error: { errorCode: 'FECHA_DEMASIADO_ANTIGUA' },
		});
		api.obtenerDashboardDia.mockReturnValueOnce(throwError(() => err));

		facade.loadData();

		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Dashboard de correos',
			'Solo se pueden consultar los últimos 90 días.',
		);
		expect(store.error()).toBe('FECHA_DEMASIADO_ANTIGUA');
	});

	it('error FECHA_FORMATO_INVALIDO: shows format message', () => {
		const err = new HttpErrorResponse({
			status: 400,
			error: { errorCode: 'FECHA_FORMATO_INVALIDO' },
		});
		api.obtenerDashboardDia.mockReturnValueOnce(throwError(() => err));

		facade.loadData();

		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Dashboard de correos',
			'Formato de fecha inválido. Usa yyyy-MM-dd.',
		);
		expect(store.error()).toBe('FECHA_FORMATO_INVALIDO');
	});

	it('unknown error: shows generic message and sets store.error = UNKNOWN', () => {
		api.obtenerDashboardDia.mockReturnValueOnce(
			throwError(() => new HttpErrorResponse({ status: 500 })),
		);

		facade.loadData();

		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Dashboard de correos',
			'No se pudo cargar el dashboard del día. Intenta refrescar.',
		);
		expect(store.error()).toBe('UNKNOWN');
	});
});
