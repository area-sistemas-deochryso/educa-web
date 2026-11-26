import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MisPagos } from '@data/models';
import { MisPagosApiService } from './mis-pagos-api.service';
import { MisPagosFacade } from './mis-pagos.facade';

const CUENTA: MisPagos = {
	fecha: '2026-11-26T00:00:00',
	estudiante: 'Ana Pérez',
	salon: '1A',
	tieneCargosEnRevision: false,
	deudaVencida: 0,
	pendienteTotal: 300,
	cargos: [],
	pagos: [],
};

describe('MisPagosFacade', () => {
	let facade: MisPagosFacade;
	let api: { estadoCuenta: ReturnType<typeof vi.fn> };

	function crear(respuesta: unknown): void {
		api = { estadoCuenta: vi.fn().mockReturnValue(respuesta) };
		TestBed.configureTestingModule({
			providers: [MisPagosFacade, { provide: MisPagosApiService, useValue: api }],
		});
		facade = TestBed.inject(MisPagosFacade);
	}

	beforeEach(() => TestBed.resetTestingModule());

	it('carga la cuenta y apaga el loading', () => {
		crear(of(CUENTA));
		facade.cargar();

		expect(api.estadoCuenta).toHaveBeenCalledTimes(1);
		expect(facade.cuenta()).toEqual(CUENTA);
		expect(facade.loading()).toBe(false);
		expect(facade.error()).toBeNull();
	});

	it('el 403 de «ver como» se explica en pantalla y no deja datos viejos', () => {
		crear(throwError(() => ({ status: 403, error: { errorCode: 'PAGO_MIS_PAGOS_SIN_VER_COMO' } })));
		facade.cargar();

		expect(facade.cuenta()).toBeNull();
		expect(facade.error()?.titulo).toContain('Ver como');
		expect(facade.error()?.reintentable).toBe(false);
		expect(facade.loading()).toBe(false);
		// 4xx nunca se reintenta: una sola llamada.
		expect(api.estadoCuenta).toHaveBeenCalledTimes(1);
	});

	it('un rol que no es Estudiante (403) no reintenta', () => {
		crear(throwError(() => ({ status: 403, error: { errorCode: 'PAGO_MIS_PAGOS_SOLO_ESTUDIANTE' } })));
		facade.cargar();

		expect(facade.error()?.titulo).toBe('Esta pantalla es solo para estudiantes');
		expect(api.estadoCuenta).toHaveBeenCalledTimes(1);
	});

	it('recargar tras un error limpia el error', () => {
		crear(throwError(() => ({ status: 401 })));
		facade.cargar();
		expect(facade.error()?.titulo).toBe('Tu sesión venció');

		api.estadoCuenta.mockReturnValue(of(CUENTA));
		facade.cargar();

		expect(facade.error()).toBeNull();
		expect(facade.cuenta()).toEqual(CUENTA);
	});
});
