import { TestBed } from '@angular/core/testing';
import { NEVER, Subject, TimeoutError, of, throwError } from 'rxjs';
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
		expect(facade.estado()).toBe('lista');
		expect(facade.error()).toBeNull();
	});

	it('un año sin fila (404) no es un error: el formulario queda para crearlo', () => {
		const facade = crear({
			parametrosAnio: () => throwError(() => ({ status: 404, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } })),
		});

		facade.cargar(2027);

		expect(facade.parametros()).toBeNull();
		expect(facade.error()).toBeNull();
		expect(facade.estado()).toBe('lista');
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

describe('ParametrosAnioFacade — estado de la lectura (P123 F3)', () => {
	it('arranca en «cargando» antes de la primera lectura, para que la guía no muestre «Pendiente»', () => {
		const facade = crear({});

		expect(facade.estado()).toBe('cargando');
	});

	it('queda «lista» al leer, y también en un año sin fila (404): ahí se crea', () => {
		const facade = crear({
			parametrosAnio: (anio: number) =>
				anio === 2026
					? of(parametros('v1'))
					: throwError(() => ({ status: 404, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } })),
		});

		facade.cargar(2026);
		expect(facade.estado()).toBe('lista');

		facade.cargar(2027);
		expect(facade.estado()).toBe('lista');
	});

	it('otro error de lectura deja «error» con su mensaje, y «Volver a cargar» lee de nuevo', () => {
		const parametrosAnio = vi
			.fn()
			.mockReturnValueOnce(throwError(() => ({ status: 500 })))
			.mockReturnValueOnce(of(parametros('v1')));
		const facade = crear({ parametrosAnio });
		facade.cargar(2026);

		expect(facade.estado()).toBe('error');
		expect(facade.error()).toBe('No se pudieron cargar los parámetros del año.');

		facade.recargar();

		expect(parametrosAnio).toHaveBeenCalledTimes(2);
		expect(parametrosAnio).toHaveBeenLastCalledWith(2026);
		expect(facade.estado()).toBe('lista');
		expect(facade.error()).toBeNull();
		expect(facade.parametros()?.rowVersion).toBe('v1');
	});

	it('un timeout al leer (sin status) da el mensaje de red', () => {
		const facade = crear({ parametrosAnio: () => throwError(() => new TimeoutError()) });

		facade.cargar(2026);

		expect(facade.estado()).toBe('error');
		expect(facade.error()).toContain('No hubo respuesta del servidor');
	});

	it('un error que llega tarde de un año que ya no está elegido se descarta', () => {
		const lectura2026 = new Subject<ParametroAnio>();
		const facade = crear({
			parametrosAnio: (anio: number) => (anio === 2026 ? lectura2026 : of({ ...parametros('v7'), anio: 2027 })),
		});
		facade.cargar(2026);
		facade.cargar(2027);

		lectura2026.error({ status: 500 });

		expect(facade.estado()).toBe('lista');
		expect(facade.error()).toBeNull();
		expect(facade.parametros()?.anio).toBe(2027);
	});

	it.each<[string, (vieja: Subject<ParametroAnio>) => void]>([
		['un error', (vieja) => vieja.error(new TimeoutError())],
		['una respuesta', (vieja) => vieja.next(parametros('v1'))],
	])('%s que llega tarde de una lectura vieja del mismo año (2026 → 2027 → 2026) no pisa la vigente', (_caso, llegaTarde) => {
		const vieja = new Subject<ParametroAnio>();
		const parametrosAnio = vi
			.fn()
			.mockReturnValueOnce(vieja)
			.mockReturnValueOnce(of({ ...parametros('v7'), anio: 2027 }))
			.mockReturnValueOnce(of(parametros('v2')));
		const facade = crear({ parametrosAnio });
		facade.cargar(2026);
		facade.cargar(2027);
		facade.cargar(2026);

		llegaTarde(vieja);

		expect(facade.estado()).toBe('lista');
		expect(facade.error()).toBeNull();
		expect(facade.parametros()?.rowVersion).toBe('v2');
	});
});

describe('ParametrosAnioFacade — relectura tras guardar (INV-S05)', () => {
	const NO_GUARDADOS =
		'No hubo respuesta del servidor y los parámetros no quedaron guardados: tus cambios siguen en pantalla. Revísalos y vuelve a guardar.';

	it('un timeout y otro rowVersion con los valores enviados: el PUT se aplicó y se informa como guardado', () => {
		const parametrosAnio = vi
			.fn()
			.mockReturnValueOnce(of(parametros('v1')))
			.mockReturnValueOnce(of(parametros('v2')));
		const guardarParametrosAnio = vi.fn(() => throwError(() => new TimeoutError()));
		const facade = crear({ parametrosAnio, guardarParametrosAnio });
		facade.cargar(2026);

		facade.guardar(datos);

		expect(guardarParametrosAnio).toHaveBeenCalledTimes(1);
		expect(parametrosAnio).toHaveBeenCalledTimes(2);
		expect(facade.parametros()?.rowVersion).toBe('v2');
		expect(facade.guardado()).toBe(true);
		expect(facade.error()).toBeNull();
		expect(facade.guardando()).toBe(false);
	});

	it('un timeout y el mismo rowVersion: el PUT no se aplicó, la base no se toca y lo dice', () => {
		const leido = parametros('v1');
		const parametrosAnio = vi.fn().mockReturnValueOnce(of(leido)).mockReturnValueOnce(of(parametros('v1')));
		const facade = crear({ parametrosAnio, guardarParametrosAnio: () => throwError(() => new TimeoutError()) });
		facade.cargar(2026);

		facade.guardar({ ...datos, pagoMinimoPartes: 7 });

		expect(parametrosAnio).toHaveBeenCalledTimes(2);
		// La misma referencia: el formulario es un `linkedSignal` sobre `parametros` y conserva lo escrito.
		expect(facade.parametros()).toBe(leido);
		expect(facade.guardado()).toBe(false);
		expect(facade.error()).toBe(NO_GUARDADOS);
	});

	it('un 5xx y el mismo rowVersion: la base no se toca y queda el mensaje genérico', () => {
		const leido = parametros('v1');
		const parametrosAnio = vi.fn().mockReturnValueOnce(of(leido)).mockReturnValueOnce(of(parametros('v1')));
		const facade = crear({ parametrosAnio, guardarParametrosAnio: () => throwError(() => ({ status: 503 })) });
		facade.cargar(2026);

		facade.guardar({ ...datos, pagoMinimoPartes: 7 });

		expect(facade.parametros()).toBe(leido);
		expect(facade.guardado()).toBe(false);
		expect(facade.error()).toBe('No se pudieron guardar los parámetros. Revisa los datos e intenta de nuevo.');
	});

	it('un 5xx y otro rowVersion con otros valores: adopta los del servidor y avisa que otra persona los cambió', () => {
		const parametrosAnio = vi
			.fn()
			.mockReturnValueOnce(of(parametros('v1')))
			.mockReturnValueOnce(of({ ...parametros('v2'), pagoMinimoPartes: 30 }));
		const facade = crear({ parametrosAnio, guardarParametrosAnio: () => throwError(() => ({ status: 500 })) });
		facade.cargar(2026);

		facade.guardar({ ...datos, pagoMinimoPartes: 7 });

		expect(facade.parametros()).toMatchObject({ rowVersion: 'v2', pagoMinimoPartes: 30 });
		expect(facade.guardado()).toBe(false);
		expect(facade.error()).toBe(
			'Otra persona modificó los parámetros al mismo tiempo. Se recargaron: revísalos y vuelve a guardar.',
		);
	});

	it('al crear el año, un timeout y un 404 al releer: la fila no se creó y lo escrito sigue', () => {
		const parametrosAnio = vi.fn(() =>
			throwError(() => ({ status: 404, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } })),
		);
		const guardarParametrosAnio = vi.fn(() => throwError(() => new TimeoutError()));
		const facade = crear({ parametrosAnio, guardarParametrosAnio });
		facade.cargar(2027);

		facade.guardar({ ...datos, anio: 2027 });

		expect(guardarParametrosAnio).toHaveBeenLastCalledWith(expect.objectContaining({ rowVersion: null }));
		expect(parametrosAnio).toHaveBeenCalledTimes(2);
		expect(facade.parametros()).toBeNull();
		expect(facade.guardado()).toBe(false);
		expect(facade.error()).toBe(NO_GUARDADOS);
	});

	it.each([0, 500, 503])('con status %i también relee una vez, sin reintentar el PUT', (status) => {
		const parametrosAnio = vi.fn(() => of(parametros('v1')));
		const guardarParametrosAnio = vi.fn(() => throwError(() => ({ status })));
		const facade = crear({ parametrosAnio, guardarParametrosAnio });
		facade.cargar(2026);

		facade.guardar(datos);

		expect(guardarParametrosAnio).toHaveBeenCalledTimes(1);
		expect(parametrosAnio).toHaveBeenCalledTimes(2);
	});

	it('si la relectura falla, el mensaje del guardado se conserva y se puede volver a intentar', () => {
		const parametrosAnio = vi
			.fn()
			.mockReturnValueOnce(of(parametros('v1')))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })));
		const guardarParametrosAnio = vi.fn(() => throwError(() => ({ status: 0 })));
		const facade = crear({ parametrosAnio, guardarParametrosAnio });
		facade.cargar(2026);

		facade.guardar(datos);

		expect(facade.error()).toContain('No hubo respuesta del servidor');
		expect(facade.estado()).toBe('lista');
		expect(facade.guardando()).toBe(false);
		expect(facade.parametros()?.rowVersion).toBe('v1');
	});
});
