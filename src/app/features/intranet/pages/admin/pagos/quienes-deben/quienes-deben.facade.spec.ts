import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import type { QuienesDeben } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { QuienesDebenFacade, SEARCH_DEBOUNCE_MS } from './quienes-deben.facade';

const RESPONSE: QuienesDeben = {
	fecha: '2026-11-02',
	anioSinParametros: false,
	totales: { alumnos: 1, cuotas: 1, deuda: 100 },
	salones: [{ salonId: 7, nombre: '3A' }],
	filas: { data: [], total: 0, page: 1, pageSize: 20 },
};

describe('QuienesDebenFacade', () => {
	let facade: QuienesDebenFacade;
	const api = { deben: vi.fn(), debenExcel: vi.fn() };

	beforeEach(() => {
		vi.useFakeTimers();
		api.deben.mockReset().mockReturnValue(of(RESPONSE));
		api.debenExcel.mockReset().mockReturnValue(of({ blob: new Blob(['x']), fileName: 'deben.xlsx' }));
		TestBed.configureTestingModule({
			providers: [QuienesDebenFacade, { provide: PagosApiService, useValue: api }],
		});
		facade = TestBed.inject(QuienesDebenFacade);
	});

	afterEach(() => vi.useRealTimers());

	it('dispara UNA consulta por pausa de escritura, no una por tecla', () => {
		facade.onSearchInput('m');
		vi.advanceTimersByTime(100);
		facade.onSearchInput('ma');
		vi.advanceTimersByTime(100);
		facade.onSearchInput('mar');
		expect(api.deben).not.toHaveBeenCalled();

		vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

		expect(api.deben).toHaveBeenCalledTimes(1);
		expect(api.deben.mock.calls[0][0].buscar).toBe('mar');
	});

	it('cambiar fecha, salón u orden vuelve a la página 1', () => {
		facade.setPage(3, 20);
		facade.setFecha('2026-10-15');
		expect(facade.page()).toBe(1);

		facade.setPage(4, 20);
		facade.setSalon(7);
		expect(facade.page()).toBe(1);

		facade.setPage(5, 20);
		facade.toggleSort('deuda');
		expect(facade.page()).toBe(1);
		expect(api.deben.mock.calls.at(-1)?.[0]).toMatchObject({ orden: 'deuda', descendente: false, page: 1 });
	});

	it('la búsqueda también vuelve a la página 1', () => {
		facade.setPage(3, 20);
		facade.onSearchInput('ana');
		vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
		expect(facade.page()).toBe(1);
		expect(api.deben.mock.calls.at(-1)?.[0]).toMatchObject({ buscar: 'ana', page: 1 });
	});

	it('toggleSort alterna asc, desc y sin orden', () => {
		facade.toggleSort('atraso');
		expect([facade.orden(), facade.descendente()]).toEqual(['atraso', false]);
		facade.toggleSort('atraso');
		expect([facade.orden(), facade.descendente()]).toEqual(['atraso', true]);
		facade.toggleSort('atraso');
		expect([facade.orden(), facade.descendente()]).toEqual([null, false]);
	});

	it('Exportar envía los mismos filtros sin page ni pageSize', () => {
		facade.setFecha('2026-10-15');
		facade.setSalon(7);
		facade.toggleSort('deuda');
		facade.toggleSort('deuda');
		facade.setPage(2, 50);

		facade.exportExcel();

		const sent = api.debenExcel.mock.calls[0][0];
		expect(sent).toEqual({ fecha: '2026-10-15', buscar: '', salonId: 7, orden: 'deuda', descendente: true });
		expect('page' in sent).toBe(false);
		expect('pageSize' in sent).toBe(false);
	});

	it('marca error de exportación sin reintentar', () => {
		api.debenExcel.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
		facade.exportExcel();
		expect(facade.exportError()).toBe(true);
		expect(facade.exporting()).toBe(false);
		expect(api.debenExcel).toHaveBeenCalledTimes(1);
	});

	it.each([400, 429])('no reintenta ante %i: una sola llamada y estado de error', (status) => {
		api.deben.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));

		facade.reload();
		vi.advanceTimersByTime(60_000);

		expect(api.deben).toHaveBeenCalledTimes(1);
		expect(facade.error()).toBe(true);
		expect(facade.loading()).toBe(false);
	});

	it('Reintentar manual vuelve a consultar y limpia el error', () => {
		api.deben.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
		facade.reload();
		api.deben.mockReturnValue(of(RESPONSE));
		facade.reload();
		expect(api.deben).toHaveBeenCalledTimes(2);
		expect(facade.error()).toBe(false);
		expect(facade.salones()).toEqual(RESPONSE.salones);
	});
});
