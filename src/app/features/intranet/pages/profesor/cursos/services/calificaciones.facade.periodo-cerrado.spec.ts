// * Tests de H01 (P110-F10): el error de periodo cerrado al crear una evaluación nombra acción, nivel, año y a quién acudir.
// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, WalCrossTabRefetchService, WalFacadeHelper } from '@core/services';
import { CalificacionConfigService } from '@intranet-shared/services/calificacion-config';
import type { CrearCalificacionDto } from '../../models';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CalificacionesFacade } from './calificaciones.facade';
import { CalificacionesStore } from './calificaciones.store';
import { CursoContenidoStore } from './curso-contenido.store';
// #endregion

const DTO = { titulo: 'Examen QA' } as CrearCalificacionDto;

describe('CalificacionesFacade — periodo cerrado al crear evaluación', () => {
	let facade: CalificacionesFacade;
	let store: CalificacionesStore;
	let showError: ReturnType<typeof vi.fn>;
	let execute: ReturnType<typeof vi.fn>;

	function failCreateWith(err: unknown): void {
		facade.crearCalificacion(DTO);
		const config = execute.mock.calls[0][0] as { onError: (e: unknown) => void };
		config.onError(err);
	}

	beforeEach(() => {
		showError = vi.fn();
		execute = vi.fn();

		TestBed.configureTestingModule({
			providers: [
				CalificacionesFacade,
				CalificacionesStore,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: {} },
				{ provide: ErrorHandlerService, useValue: { showError, showWarning: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: { execute } },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
				{ provide: CalificacionConfigService, useValue: {} },
			],
		});
		facade = TestBed.inject(CalificacionesFacade);
		store = TestBed.inject(CalificacionesStore);
	});

	it('tells the teacher the verb, the level and year of the closed period, and who to ask', () => {
		store.setSalonContexto({ grado: '1ro Primaria', anio: 2026 });

		failCreateWith(new HttpErrorResponse({ status: 400, error: { errorCode: 'EVALUACION_PERIODO_CERRADO' } }));

		expect(showError).toHaveBeenCalledWith(
			'Periodo cerrado',
			'No se puede crear la evaluación: el periodo de Primaria 2026 está cerrado. Consulta con administración.',
		);
		expect(store.saving()).toBe(false);
	});

	it('still names the action and who to ask when the salon is not loaded', () => {
		failCreateWith(new HttpErrorResponse({ status: 400, error: { errorCode: 'EVALUACION_PERIODO_CERRADO' } }));

		expect(showError).toHaveBeenCalledWith(
			'Periodo cerrado',
			'No se puede crear la evaluación: el periodo está cerrado. Consulta con administración.',
		);
	});

	it('keeps the generic handling for any other error', () => {
		store.setSalonContexto({ grado: '1ro Primaria', anio: 2026 });

		failCreateWith(new HttpErrorResponse({ status: 400, error: { errorCode: 'EVALUACION_PESO_INVALIDO' } }));

		const [summary, detail] = showError.mock.calls[0];
		expect(summary).not.toBe('Periodo cerrado');
		expect(detail).toBe('El peso está fuera del rango válido.');
	});
});
