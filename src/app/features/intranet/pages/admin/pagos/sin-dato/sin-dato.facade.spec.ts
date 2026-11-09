import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SinDato } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { SinDatoFacade } from './sin-dato.facade';

const respuesta: SinDato = {
	fecha: '2026-11-09T00:00:00',
	alumnos: 1,
	cargos: 2,
	salones: [{ salonId: 3, nombre: '5TO PRIMARIA B' }],
	filas: {
		data: [{ estudianteId: 280, estudiante: 'Pérez, Ana', salonId: 3, salon: '5TO PRIMARIA B', cargos: 2, detalle: [] }],
		total: 1,
		page: 1,
		pageSize: 20,
	},
};

function crear(sinDato: () => unknown) {
	TestBed.configureTestingModule({
		providers: [SinDatoFacade, { provide: PagosApiService, useValue: { sinDato } }],
	});
	return TestBed.inject(SinDatoFacade);
}

describe('SinDatoFacade', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('carga la primera página y toma los salones del servidor', () => {
		const sinDato = vi.fn(() => of(respuesta));
		const facade = crear(sinDato);

		facade.reload();

		expect(sinDato).toHaveBeenCalledWith({ buscar: '', salonId: null, page: 1, pageSize: 20 });
		expect(facade.total()).toBe(1);
		expect(facade.salones()).toEqual(respuesta.salones);
	});

	it('una sola consulta por pausa de escritura y vuelve a la página 1', () => {
		const sinDato = vi.fn(() => of(respuesta));
		const facade = crear(sinDato);
		facade.setPage(3, 20);
		sinDato.mockClear();

		facade.onSearchInput('p');
		facade.onSearchInput('pe');
		facade.onSearchInput('pér');
		expect(sinDato).not.toHaveBeenCalled();
		vi.advanceTimersByTime(300);

		expect(sinDato).toHaveBeenCalledTimes(1);
		expect(sinDato).toHaveBeenCalledWith({ buscar: 'pér', salonId: null, page: 1, pageSize: 20 });
	});

	it('cambiar de salón vuelve a la página 1', () => {
		const sinDato = vi.fn(() => of(respuesta));
		const facade = crear(sinDato);
		facade.setPage(2, 20);

		facade.setSalon(3);

		expect(facade.page()).toBe(1);
		expect(sinDato).toHaveBeenLastCalledWith({ buscar: '', salonId: 3, page: 1, pageSize: 20 });
	});

	it('un error no se reintenta: queda marcado para que la persona reintente', () => {
		const sinDato = vi.fn(() => throwError(() => ({ status: 429 })));
		const facade = crear(sinDato);

		facade.reload();

		expect(sinDato).toHaveBeenCalledTimes(1);
		expect(facade.error()).toBe(true);
		expect(facade.loading()).toBe(false);
	});
});
