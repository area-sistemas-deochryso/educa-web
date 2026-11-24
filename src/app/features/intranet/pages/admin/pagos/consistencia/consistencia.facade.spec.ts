import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CargosSinMatricula, MatriculadosSinCargo } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { ConsistenciaFacade } from './consistencia.facade';

const sinCargo: MatriculadosSinCargo = {
	anio: 2027,
	total: 1,
	salones: [{ salonId: 3, nombre: '5TO PRIMARIA B' }],
	filas: {
		data: [{ estudianteId: 280, estudiante: 'Pérez, Ana', salonId: 3, salon: '5TO PRIMARIA B' }],
		total: 1,
		page: 1,
		pageSize: 20,
	},
};

const sinMatricula: CargosSinMatricula = {
	anio: 2027,
	alumnos: 1,
	cargos: 2,
	filas: {
		data: [{ estudianteId: 9, estudiante: 'Ruiz, Luis', cargos: 2, detalle: [] }],
		total: 1,
		page: 1,
		pageSize: 20,
	},
};

function crear(api: Partial<Record<'matriculadosSinCargo' | 'cargosSinMatricula', () => unknown>>) {
	TestBed.configureTestingModule({
		providers: [ConsistenciaFacade, { provide: PagosApiService, useValue: api }],
	});
	return TestBed.inject(ConsistenciaFacade);
}

describe('ConsistenciaFacade', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('arranca en «matriculados sin cargo», carga la primera página y toma los salones del servidor', () => {
		const matriculadosSinCargo = vi.fn(() => of(sinCargo));
		const facade = crear({ matriculadosSinCargo });

		facade.reload();

		expect(matriculadosSinCargo).toHaveBeenCalledWith({ buscar: '', salonId: null, page: 1, pageSize: 20 });
		expect(facade.total()).toBe(1);
		expect(facade.anio()).toBe(2027);
		expect(facade.salones()).toEqual(sinCargo.salones);
	});

	it('«cargos sin matrícula» no manda salón aunque haya uno elegido, y vuelve a la página 1', () => {
		const matriculadosSinCargo = vi.fn(() => of(sinCargo));
		const cargosSinMatricula = vi.fn(() => of(sinMatricula));
		const facade = crear({ matriculadosSinCargo, cargosSinMatricula });
		facade.setSalon(3);
		facade.setPage(2, 20);

		facade.setVista('sin-matricula');

		expect(cargosSinMatricula).toHaveBeenCalledWith({ buscar: '', salonId: null, page: 1, pageSize: 20 });
		expect(facade.page()).toBe(1);
		expect(facade.total()).toBe(1);
		expect(facade.filasSinMatricula()).toHaveLength(1);
	});

	it('el salón elegido no cuenta como filtro activo en «cargos sin matrícula»', () => {
		const facade = crear({
			matriculadosSinCargo: () => of(sinCargo),
			cargosSinMatricula: () => of(sinMatricula),
		});
		facade.setSalon(3);
		expect(facade.hasFilters()).toBe(true);

		facade.setVista('sin-matricula');

		expect(facade.hasFilters()).toBe(false);
	});

	it('una sola consulta por pausa de escritura y vuelve a la página 1', () => {
		const matriculadosSinCargo = vi.fn(() => of(sinCargo));
		const facade = crear({ matriculadosSinCargo });
		facade.setPage(3, 20);
		matriculadosSinCargo.mockClear();

		facade.onSearchInput('p');
		facade.onSearchInput('pe');
		facade.onSearchInput('pere');
		vi.advanceTimersByTime(300);

		expect(matriculadosSinCargo).toHaveBeenCalledTimes(1);
		expect(matriculadosSinCargo).toHaveBeenCalledWith({ buscar: 'pere', salonId: null, page: 1, pageSize: 20 });
	});

	it('marca error si la consulta falla y no reintenta', () => {
		const matriculadosSinCargo = vi.fn(() => throwError(() => new Error('500')));
		const facade = crear({ matriculadosSinCargo });

		facade.reload();

		expect(facade.error()).toBe(true);
		expect(facade.loading()).toBe(false);
		expect(matriculadosSinCargo).toHaveBeenCalledTimes(1);
	});
});
