// * Tests for ClassroomsAdminFacade.reabrirPeriodoDev — dev-only tool, brief 808 (P110-F18).
// #region Imports
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@config/environment';
import { ErrorHandlerService, SwService } from '@core/services';
import { UI_SALONES_ERROR_DETAILS, UI_SALONES_SUCCESS_MESSAGES } from '@shared/constants';

import { ClassroomsAdminFacade } from './salones-admin.facade';
import { ClassroomsAdminStore } from './salones-admin.store';
// #endregion

const API = environment.apiUrl;
const PERIODO_ID = 7;

const salon = { id: 1, grado: '1er Grado', seccion: 'A', sede: 'Central', estadoCierre: 'ABIERTO' };
const periodoAbierto = { id: PERIODO_ID, nombre: 'Anual', nivel: 'Primaria', anio: 2026, orden: 1, fechaInicio: '2026-03-01', fechaFin: '2026-12-15', estadoCierre: 'ABIERTO' };

describe('ClassroomsAdminFacade.reabrirPeriodoDev', () => {
	let facade: ClassroomsAdminFacade;
	let store: ClassroomsAdminStore;
	let httpMock: HttpTestingController;
	let swService: { invalidateCacheByPattern: ReturnType<typeof vi.fn> };
	let errorHandler: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		swService = { invalidateCacheByPattern: vi.fn().mockResolvedValue(1) };
		errorHandler = { showSuccess: vi.fn(), showError: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: SwService, useValue: swService },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});

		facade = TestBed.inject(ClassroomsAdminFacade);
		store = TestBed.inject(ClassroomsAdminStore);
		httpMock = TestBed.inject(HttpTestingController);
	});

	it('camino feliz: PUT, invalida el caché de salones y recarga salones + periodos', async () => {
		facade.reabrirPeriodoDev(PERIODO_ID);

		const put = httpMock.expectOne(`${API}/api/PeriodoAcademico/${PERIODO_ID}/reabrir-dev`);
		expect(put.request.method).toBe('PUT');
		put.flush(null);

		expect(errorHandler.showSuccess).toHaveBeenCalledWith(
			expect.anything(),
			UI_SALONES_SUCCESS_MESSAGES.periodoReopenedDev,
			6000,
		);
		expect(swService.invalidateCacheByPattern).toHaveBeenCalledWith('/api/AprobacionEstudiante/salones-admin');

		// loadAll corre recién después de la invalidación (promesa resuelta)
		await Promise.resolve();
		await Promise.resolve();
		const salones = httpMock.expectOne((r) => r.url.includes('/api/AprobacionEstudiante/salones-admin'));
		const periodos = httpMock.expectOne((r) => r.url.includes('/api/PeriodoAcademico'));
		const configs = httpMock.expectOne((r) => r.url.includes('/api/ConfiguracionCalificacion'));

		salones.flush([salon]);
		periodos.flush([periodoAbierto]);
		configs.flush([]);

		expect(store.salones()).toHaveLength(1);
		expect(store.periodos()[0].estadoCierre).toBe('ABIERTO');
	});

	it('404 del BE (fuera de Development + UseTestEnv) se muestra como "no disponible", sin recargar', () => {
		facade.reabrirPeriodoDev(PERIODO_ID);

		httpMock
			.expectOne(`${API}/api/PeriodoAcademico/${PERIODO_ID}/reabrir-dev`)
			.flush(null, { status: 404, statusText: 'Not Found' });

		expect(errorHandler.showError).toHaveBeenCalledWith(
			expect.anything(),
			UI_SALONES_ERROR_DETAILS.reopenPeriodoDevUnavailable,
		);
		expect(swService.invalidateCacheByPattern).not.toHaveBeenCalled();
		expect(store.vm().loading).toBe(false);
		httpMock.expectNone((r) => r.url.includes('/api/AprobacionEstudiante/salones-admin'));
	});

	it('otro error HTTP muestra el mensaje genérico y no el de "no disponible"', () => {
		facade.reabrirPeriodoDev(PERIODO_ID);

		httpMock
			.expectOne(`${API}/api/PeriodoAcademico/${PERIODO_ID}/reabrir-dev`)
			.flush(null, { status: 500, statusText: 'Server Error' });

		expect(errorHandler.showError).toHaveBeenCalledWith(expect.anything(), UI_SALONES_ERROR_DETAILS.reopenPeriodoDev);
		expect(store.vm().loading).toBe(false);
	});
});

