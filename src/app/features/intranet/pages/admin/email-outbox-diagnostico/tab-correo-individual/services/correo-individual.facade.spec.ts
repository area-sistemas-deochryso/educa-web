import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';

import {
	BuscarPersonasResponseDto,
	EmailDiagnosticoDto,
	PersonaConCorreoDto,
} from '../models/correo-individual.models';

import { CorreoIndividualFacade } from './correo-individual.facade';
import { CorreoIndividualService } from './correo-individual.service';
import { CorreoIndividualStore } from './correo-individual.store';

function makeDto(overrides: Partial<EmailDiagnosticoDto> = {}): EmailDiagnosticoDto {
	return {
		correoConsultado: 'a@b.com',
		resumen: {
			totalIntentos: 3,
			enviados: 2,
			fallidos: 1,
			pendientes: 0,
			primerIntento: '2026-04-01T08:00:00',
			ultimoIntento: '2026-04-27T07:30:00',
			mostrandoUltimos: 3,
		},
		historia: [],
		blacklist: null,
		personasAsociadas: [],
		generatedAt: '2026-04-27T07:30:00',
		...overrides,
	};
}

function makePersona(overrides: Partial<PersonaConCorreoDto> = {}): PersonaConCorreoDto {
	return {
		tipoPersona: 'E',
		id: 1,
		dniMasked: '***1234',
		nombreCompleto: 'Garcia, Ana',
		campo: 'EST_CorreoApoderado',
		correo: 'apo@example.com',
		correoMasked: 'a***@example.com',
		...overrides,
	};
}

function createMockApi() {
	return {
		obtenerDiagnostico: vi.fn().mockReturnValue(of(makeDto())),
		buscarPersonas: vi
			.fn()
			.mockReturnValue(
				of<BuscarPersonasResponseDto>({ query: '', total: 0, personas: [] }),
			),
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

describe('CorreoIndividualFacade', () => {
	let facade: CorreoIndividualFacade;
	let store: CorreoIndividualStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: ReturnType<typeof createMockErrorHandler>;

	beforeEach(() => {
		api = createMockApi();
		errorHandler = createMockErrorHandler();
		TestBed.configureTestingModule({
			providers: [
				CorreoIndividualFacade,
				CorreoIndividualStore,
				{ provide: CorreoIndividualService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(CorreoIndividualFacade);
		store = TestBed.inject(CorreoIndividualStore);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('buscar happy path: trim + envía al BE + setDto + setLoading(false)', () => {
		const dto = makeDto({ correoConsultado: 'foo@bar.com' });
		api.obtenerDiagnostico.mockReturnValueOnce(of(dto));

		facade.buscar('  foo@bar.com  ');

		expect(api.obtenerDiagnostico).toHaveBeenCalledWith('foo@bar.com');
		expect(store.dto()).toBe(dto);
		expect(store.loading()).toBe(false);
		expect(store.error()).toBeNull();
	});

	it('buscar con string vacío rechaza sin pegar al BE (CORREO_REQUERIDO)', () => {
		facade.buscar('');

		expect(api.obtenerDiagnostico).not.toHaveBeenCalled();
		expect(store.error()).toBe('CORREO_REQUERIDO');
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Diagnóstico por correo',
			expect.stringContaining('obligatorio'),
		);
	});

	it('buscar con formato inválido (sin @) rechaza sin pegar al BE (CORREO_INVALIDO)', () => {
		facade.buscar('no-arroba');

		expect(api.obtenerDiagnostico).not.toHaveBeenCalled();
		expect(store.error()).toBe('CORREO_INVALIDO');
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Diagnóstico por correo',
			expect.stringContaining('formato válido'),
		);
	});

	it('buscar con error 400 CORREO_INVALIDO del BE: setError + toast con mensaje del server', () => {
		const errorResponse = new HttpErrorResponse({
			error: {
				errorCode: 'CORREO_INVALIDO',
				message: 'Mensaje custom del server',
			},
			status: 400,
			statusText: 'Bad Request',
		});
		api.obtenerDiagnostico.mockReturnValueOnce(throwError(() => errorResponse));

		facade.buscar('a@b.com');

		expect(store.error()).toBe('CORREO_INVALIDO');
		expect(store.loading()).toBe(false);
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Diagnóstico por correo',
			'Mensaje custom del server',
		);
	});

	it('buscar con error 500 desconocido: setError(UNKNOWN) + toast genérico', () => {
		api.obtenerDiagnostico.mockReturnValueOnce(throwError(() => new Error('boom')));

		facade.buscar('a@b.com');

		expect(store.error()).toBe('UNKNOWN');
		expect(store.loading()).toBe(false);
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Diagnóstico por correo',
			expect.stringContaining('No se pudo'),
		);
	});

	it('limpiar resetea dto, error y correoInput', () => {
		store.setDto(makeDto());
		store.setError('CORREO_INVALIDO');
		store.setCorreoInput('foo@bar.com');

		facade.limpiar();

		expect(store.dto()).toBeNull();
		expect(store.error()).toBeNull();
		expect(store.correoInput()).toBe('');
	});

	// #region Typeahead — Plan 36 Chat 4b
	it('onTypeaheadQuery con < 2 chars no llama al BE y limpia sugerencias', () => {
		vi.useFakeTimers();
		store.setSugerencias([makePersona()], 1);

		facade.onTypeaheadQuery('a');
		vi.advanceTimersByTime(400);

		expect(api.buscarPersonas).not.toHaveBeenCalled();
		expect(store.sugerencias()).toEqual([]);
		expect(store.sugerenciasTotal()).toBe(0);
	});

	it('onTypeaheadQuery con ≥ 2 chars hace debounce y llama al BE', () => {
		vi.useFakeTimers();
		const response: BuscarPersonasResponseDto = {
			query: 'gar',
			total: 1,
			personas: [makePersona({ nombreCompleto: 'Garcia, Ana' })],
		};
		api.buscarPersonas.mockReturnValueOnce(of(response));

		facade.onTypeaheadQuery('gar');
		expect(api.buscarPersonas).not.toHaveBeenCalled();

		vi.advanceTimersByTime(400);

		expect(api.buscarPersonas).toHaveBeenCalledWith('gar');
		expect(store.sugerencias()).toEqual(response.personas);
		expect(store.sugerenciasTotal()).toBe(1);
		expect(store.loadingSugerencias()).toBe(false);
	});

	it('seleccionarPersona setea correoInput y dispara buscar()', () => {
		const persona = makePersona({ correo: 'foo@bar.com' });
		const dto = makeDto({ correoConsultado: 'foo@bar.com' });
		api.obtenerDiagnostico.mockReturnValueOnce(of(dto));

		facade.seleccionarPersona(persona);

		expect(store.correoInput()).toBe('foo@bar.com');
		expect(api.obtenerDiagnostico).toHaveBeenCalledWith('foo@bar.com');
		expect(store.dto()).toBe(dto);
	});

	it('onTypeaheadQuery con error del BE limpia sugerencias y no propaga', () => {
		vi.useFakeTimers();
		api.buscarPersonas.mockReturnValueOnce(throwError(() => new Error('500')));
		store.setSugerencias([makePersona()], 1);

		facade.onTypeaheadQuery('garcia');
		vi.advanceTimersByTime(400);

		expect(store.sugerencias()).toEqual([]);
		expect(store.loadingSugerencias()).toBe(false);
	});
	// #endregion
});
