import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { EstadoCuenta } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { EstadoCuentaFacade } from './estado-cuenta.facade';

function cuenta(estudianteId: number): EstadoCuenta {
	return {
		estudianteId,
		estudiante: `Alumno ${estudianteId}`,
		fecha: '2026-11-09T00:00:00',
		categoria: 'AlDia',
		tieneDatosSinConfirmar: false,
		cargosSinDato: 0,
		deudaVencida: 0,
		pendienteTotal: 0,
		cargos: [],
		pagos: [],
		ajustes: [],
		salonId: null,
		salon: null,
	};
}

function crear(estadoCuenta: (id: number) => unknown) {
	const buscarEstudiantes = vi.fn(() => of([]));
	TestBed.configureTestingModule({
		providers: [EstadoCuentaFacade, { provide: PagosApiService, useValue: { estadoCuenta, buscarEstudiantes } }],
	});
	return { facade: TestBed.inject(EstadoCuentaFacade), buscarEstudiantes };
}

describe('EstadoCuentaFacade', () => {
	it('carga la cuenta completa del alumno', () => {
		const { facade } = crear((id) => of(cuenta(id)));

		facade.cargar(280);

		expect(facade.cuenta()?.estudianteId).toBe(280);
		expect(facade.loading()).toBe(false);
		expect(facade.error()).toBeNull();
	});

	it('descarta la respuesta de un alumno anterior si ya se pidió otro', () => {
		const lento = new Subject<EstadoCuenta>();
		const { facade } = crear((id) => (id === 1 ? lento : of(cuenta(id))));

		facade.cargar(1);
		facade.cargar(2);
		lento.next(cuenta(1));

		expect(facade.cuenta()?.estudianteId).toBe(2);
	});

	it('un 404 dice que no se encontró al alumno y un 500 que no se pudo cargar', () => {
		const { facade } = crear((id) => throwError(() => ({ status: id === 404 ? 404 : 500 })));

		facade.cargar(404);
		expect(facade.error()).toBe('No se encontró al alumno.');
		expect(facade.cuenta()).toBeNull();

		facade.cargar(7);
		expect(facade.error()).toBe('No se pudo cargar el estado de cuenta.');
	});

	it('recargar vuelve a pedir la cuenta completa del último alumno', () => {
		const estadoCuenta = vi.fn((id: number) => of(cuenta(id)));
		const { facade } = crear(estadoCuenta);

		facade.cargar(280);
		facade.recargar();

		expect(estadoCuenta).toHaveBeenCalledTimes(2);
		expect(estadoCuenta).toHaveBeenLastCalledWith(280);
	});

	it('no consulta el buscador con menos de 2 caracteres', () => {
		const { facade, buscarEstudiantes } = crear((id) => of(cuenta(id)));

		facade.buscarEstudiantes(' a ');
		facade.buscarEstudiantes('pé');

		expect(buscarEstudiantes).toHaveBeenCalledTimes(1);
		expect(buscarEstudiantes).toHaveBeenCalledWith('pé');
	});
});
