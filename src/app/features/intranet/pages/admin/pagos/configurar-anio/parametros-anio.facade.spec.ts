import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { ParametroAnio } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { ParametrosAnioFacade } from './parametros-anio.facade';

const parametros = (rowVersion: string): ParametroAnio => ({
	anio: 2026,
	pagoMinimoPartes: 20,
	montoRecargo: 5,
	fechaInicial: null,
	rowVersion,
});

const datos = { anio: 2026, pagoMinimoPartes: 20, montoRecargo: 5, fechaInicial: null };

function crear(api: Record<string, unknown>) {
	TestBed.configureTestingModule({ providers: [ParametrosAnioFacade, { provide: PagosApiService, useValue: api }] });
	return TestBed.inject(ParametrosAnioFacade);
}

describe('ParametrosAnioFacade', () => {
	it('carga los parámetros del año', () => {
		const facade = crear({ parametrosAnio: () => of(parametros('v1')) });

		facade.cargar(2026);

		expect(facade.parametros()?.rowVersion).toBe('v1');
		expect(facade.cargando()).toBe(false);
		expect(facade.error()).toBeNull();
	});

	it('un año sin fila (404) no es un error: el formulario queda para crearlo', () => {
		const facade = crear({
			parametrosAnio: () => throwError(() => ({ status: 404, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } })),
		});

		facade.cargar(2027);

		expect(facade.parametros()).toBeNull();
		expect(facade.error()).toBeNull();
		expect(facade.cargando()).toBe(false);
	});

	it('otro error al cargar deja un mensaje', () => {
		const facade = crear({ parametrosAnio: () => throwError(() => ({ status: 500 })) });

		facade.cargar(2026);

		expect(facade.error()).toBe('No se pudieron cargar los parámetros del año.');
	});

	it('al crear el año envía rowVersion nulo; al editar, el último leído', () => {
		const guardarParametrosAnio = vi.fn(() => of(parametros('v2')));
		const facade = crear({ parametrosAnio: () => of(parametros('v1')), guardarParametrosAnio });

		facade.guardar(datos);
		expect(guardarParametrosAnio).toHaveBeenLastCalledWith(expect.objectContaining({ rowVersion: null }));
		expect(facade.parametros()?.rowVersion).toBe('v2');
		expect(facade.guardado()).toBe(true);

		facade.guardar(datos);
		expect(guardarParametrosAnio).toHaveBeenLastCalledWith(expect.objectContaining({ rowVersion: 'v2' }));
	});

	it('un 409 de competencia relee el año para tener el rowVersion vigente y avisa', () => {
		const parametrosAnio = vi.fn().mockReturnValueOnce(of(parametros('v1'))).mockReturnValueOnce(of(parametros('v9')));
		const guardarParametrosAnio = vi.fn(() =>
			throwError(() => ({ status: 409, error: { errorCode: 'PAGO_PARAMETRO_CONFLICTO' } })),
		);
		const facade = crear({ parametrosAnio, guardarParametrosAnio });
		facade.cargar(2026);

		facade.guardar(datos);

		expect(guardarParametrosAnio).toHaveBeenCalledTimes(1);
		expect(facade.parametros()?.rowVersion).toBe('v9');
		expect(facade.error()).toContain('Otra persona modificó');
		expect(facade.guardado()).toBe(false);
	});

	it('un rechazo de regla no relee ni reintenta', () => {
		const parametrosAnio = vi.fn(() => of(parametros('v1')));
		const guardarParametrosAnio = vi.fn(() =>
			throwError(() => ({ status: 400, error: { errorCode: 'PAGO_PARAMETRO_VALOR_INVALIDO' } })),
		);
		const facade = crear({ parametrosAnio, guardarParametrosAnio });
		facade.cargar(2026);

		facade.guardar(datos);

		expect(parametrosAnio).toHaveBeenCalledTimes(1);
		expect(guardarParametrosAnio).toHaveBeenCalledTimes(1);
		expect(facade.error()).toContain('dos decimales');
	});

	it('ignora un segundo guardado mientras hay uno en curso', () => {
		const guardarParametrosAnio = vi.fn(() => NEVER);
		const facade = crear({ parametrosAnio: () => of(parametros('v1')), guardarParametrosAnio });
		facade.cargar(2026);

		facade.guardar(datos);
		facade.guardar(datos);

		expect(guardarParametrosAnio).toHaveBeenCalledTimes(1);
	});

	it('descarta la respuesta de un año que ya no está elegido', () => {
		const facade = crear({ parametrosAnio: (anio: number) => (anio === 2026 ? NEVER : of({ ...parametros('v7'), anio: 2027 })) });

		facade.cargar(2026);
		facade.cargar(2027);

		expect(facade.parametros()?.anio).toBe(2027);
	});
});
