import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import type { MesesPagados } from '@data/models';
import { ClassroomsAdminApiService } from '@features/intranet/pages/admin/classrooms/services';
import { PagosApiService } from '../services/pagos-api.service';
import { SEARCH_DEBOUNCE_MS } from '../utils/pagos-reports.util';
import { MesesPagadosFacade } from './meses-pagados.facade';

const RESPONSE: MesesPagados = {
	fecha: '2026-11-02',
	anio: 2026,
	anioSinParametros: false,
	anioSinCronograma: false,
	salonId: 7,
	salon: '3A',
	salones: [{ salonId: 7, nombre: '3A' }],
	pensiones: [{ numero: 1, etiqueta: 'Marzo', vencimiento: '2026-03-31' }],
	totales: { alumnos: 1, pensionesPagadas: [1], mesesPagados: 1 },
	filas: [],
};

const SALONES = [
	{ id: 7, grado: '3°', gradoOrden: 3, seccion: 'A', sede: 'Central' },
	{ id: 8, grado: '4°', gradoOrden: 4, seccion: 'A', sede: 'Central' },
];

describe('MesesPagadosFacade', () => {
	let facade: MesesPagadosFacade;
	const api = { mesesPagados: vi.fn(), mesesPagadosExcel: vi.fn(), cortes: vi.fn() };
	const salonesApi = { getSalonesAdmin: vi.fn() };

	beforeEach(() => {
		vi.useFakeTimers();
		api.mesesPagados.mockReset().mockReturnValue(of(RESPONSE));
		api.mesesPagadosExcel.mockReset().mockReturnValue(of({ blob: new Blob(['x']), fileName: 'mp.xlsx' }));
		api.cortes.mockReset().mockReturnValue(of([]));
		salonesApi.getSalonesAdmin.mockReset().mockReturnValue(of(SALONES));
		TestBed.configureTestingModule({
			providers: [
				MesesPagadosFacade,
				{ provide: PagosApiService, useValue: api },
				{ provide: ClassroomsAdminApiService, useValue: salonesApi },
			],
		});
		facade = TestBed.inject(MesesPagadosFacade);
	});

	afterEach(() => vi.useRealTimers());

	it('elige el primer salón del año y consulta con él; el BE exige un salón concreto', () => {
		expect(facade.salonId()).toBe(7);
		expect(api.mesesPagados).toHaveBeenCalledTimes(1);
		expect(api.mesesPagados.mock.calls[0][0]).toMatchObject({ salonId: 7, fecha: null });
		expect(facade.data()).toEqual(RESPONSE);
	});

	it('sin salones no consulta nada', () => {
		api.mesesPagados.mockClear();
		salonesApi.getSalonesAdmin.mockReturnValue(of([]));
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [
				MesesPagadosFacade,
				{ provide: PagosApiService, useValue: api },
				{ provide: ClassroomsAdminApiService, useValue: salonesApi },
			],
		});
		const vacio = TestBed.inject(MesesPagadosFacade);

		expect(vacio.salonId()).toBeNull();
		expect(api.mesesPagados).not.toHaveBeenCalled();
	});

	it('elegir un corte manda esa fecha; volver a «hoy» la quita', () => {
		facade.setSeleccion('2026-10-15');
		expect(api.mesesPagados.mock.calls.at(-1)?.[0]).toMatchObject({ salonId: 7, fecha: '2026-10-15' });

		facade.setSeleccion('hoy');
		expect(api.mesesPagados.mock.calls.at(-1)?.[0].fecha).toBeNull();
	});

	it('dispara UNA consulta por pausa de escritura en la búsqueda', () => {
		api.mesesPagados.mockClear();
		facade.onSearchInput('m');
		vi.advanceTimersByTime(100);
		facade.onSearchInput('mar');
		expect(api.mesesPagados).not.toHaveBeenCalled();

		vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

		expect(api.mesesPagados).toHaveBeenCalledTimes(1);
		expect(api.mesesPagados.mock.calls[0][0].buscar).toBe('mar');
	});

	it('un 404 es «salón sin alumnos», no un error', () => {
		api.mesesPagados.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
		facade.setSalon(8);

		expect(facade.sinAlumnos()).toBe(true);
		expect(facade.error()).toBe(false);
		expect(facade.data()).toBeNull();
	});

	it('otro error marca error y no reintenta solo', () => {
		api.mesesPagados.mockClear();
		api.mesesPagados.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
		facade.setSalon(8);

		expect(facade.error()).toBe(true);
		expect(facade.sinAlumnos()).toBe(false);
		expect(api.mesesPagados).toHaveBeenCalledTimes(1);
	});

	it('exportar usa los mismos filtros que la pantalla', () => {
		facade.setSeleccion('2026-10-15');
		facade.exportExcel();

		expect(api.mesesPagadosExcel.mock.calls[0][0]).toMatchObject({ salonId: 7, fecha: '2026-10-15' });
		expect(facade.exporting()).toBe(false);
		expect(facade.exportError()).toBe(false);
	});

	it('si la exportación falla, lo marca y libera el botón', () => {
		api.mesesPagadosExcel.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
		facade.exportExcel();

		expect(facade.exportError()).toBe(true);
		expect(facade.exporting()).toBe(false);
	});
});
