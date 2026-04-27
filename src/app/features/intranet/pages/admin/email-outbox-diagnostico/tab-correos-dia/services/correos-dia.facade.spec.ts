import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';

import { DiagnosticoCorreosDiaDto } from '../models/correos-dia.models';

import { CorreosDiaFacade } from './correos-dia.facade';
import { CorreosDiaService } from './correos-dia.service';
import { CorreosDiaStore } from './correos-dia.store';

function makeDto(overrides: Partial<DiagnosticoCorreosDiaDto> = {}): DiagnosticoCorreosDiaDto {
	return {
		fecha: '2026-04-27',
		sedeId: null,
		resumen: {
			entradasMarcadas: 10,
			estudiantesConEntrada: 10,
			estudiantesFueraDeAlcance: 0,
			estudiantesSinCorreoApoderado: 0,
			correosApoderadosBlacklisteados: 0,
			correosEnviados: 10,
			correosFallidos: 0,
			correosPendientes: 0,
			correosFaltantes: 0,
		},
		estudiantesSinCorreo: [],
		apoderadosBlacklisteados: [],
		entradasSinCorreoEnviado: [],
		entradasConCorreoEnviado: [],
		generatedAt: '2026-04-27T07:30:00',
		...overrides,
	};
}

function createMockApi() {
	return {
		obtenerDiagnostico: vi.fn().mockReturnValue(of(makeDto())),
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

describe('CorreosDiaFacade', () => {
	let facade: CorreosDiaFacade;
	let store: CorreosDiaStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: ReturnType<typeof createMockErrorHandler>;

	beforeEach(() => {
		api = createMockApi();
		errorHandler = createMockErrorHandler();
		TestBed.configureTestingModule({
			providers: [
				CorreosDiaFacade,
				CorreosDiaStore,
				{ provide: CorreosDiaService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(CorreosDiaFacade);
		store = TestBed.inject(CorreosDiaStore);
	});

	it('loadData happy path: setLoading(true) → setDto(dto) → setLoading(false)', () => {
		const dto = makeDto({ resumen: { ...makeDto().resumen, correosEnviados: 42 } });
		api.obtenerDiagnostico.mockReturnValueOnce(of(dto));

		facade.loadData();

		expect(api.obtenerDiagnostico).toHaveBeenCalledWith(undefined, null);
		expect(store.dto()).toBe(dto);
		expect(store.loading()).toBe(false);
		expect(store.error()).toBeNull();
	});

	it('loadData propaga fecha y sedeId del store al service', () => {
		store.setFechaConsulta('2026-04-20');
		store.setSedeId(7);

		facade.loadData();

		expect(api.obtenerDiagnostico).toHaveBeenCalledWith('2026-04-20', 7);
	});

	it('loadData con error 400 FECHA_FUTURA_INVALIDA: dispara toast + setError', () => {
		const errorResponse = new HttpErrorResponse({
			error: { errorCode: 'FECHA_FUTURA_INVALIDA' },
			status: 400,
			statusText: 'Bad Request',
		});
		api.obtenerDiagnostico.mockReturnValueOnce(throwError(() => errorResponse));

		facade.loadData();

		expect(store.loading()).toBe(false);
		expect(store.error()).toBe('FECHA_FUTURA_INVALIDA');
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Diagnóstico del día',
			expect.stringContaining('posterior a hoy'),
		);
	});

	it('loadData con error 500 desconocido: setError(UNKNOWN) + toast genérico', () => {
		api.obtenerDiagnostico.mockReturnValueOnce(throwError(() => new Error('boom')));

		facade.loadData();

		expect(store.loading()).toBe(false);
		expect(store.error()).toBe('UNKNOWN');
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Diagnóstico del día',
			expect.stringContaining('No se pudo'),
		);
	});

	it('setFecha actualiza el store y dispara loadData', () => {
		facade.setFecha('2026-04-15');

		expect(store.fechaConsulta()).toBe('2026-04-15');
		expect(api.obtenerDiagnostico).toHaveBeenCalledWith('2026-04-15', null);
	});

	it('refresh re-llama loadData con los filtros actuales', () => {
		store.setFechaConsulta('2026-04-15');
		facade.refresh();

		expect(api.obtenerDiagnostico).toHaveBeenCalledWith('2026-04-15', null);
	});
});
