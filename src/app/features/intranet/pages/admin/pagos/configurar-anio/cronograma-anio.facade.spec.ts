import { TestBed } from '@angular/core/testing';
import { NEVER, type Observable, Subject, TimeoutError, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type {
	ConfiguracionAnio,
	CuotaCronograma,
	GuardarCronogramaAnioPayload,
} from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { CronogramaAnioFacade } from './cronograma-anio.facade';
import { etiquetaSugerida, fechaSugerida } from './cronograma-fechas.logic';

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Cronograma guardado con las fechas habituales; `cambios` pisa la fecha de algunas cuotas. */
const cronograma = (
	anio: number,
	version = 'v',
	cambios: Record<number, string> = {},
): CuotaCronograma[] =>
	NUMEROS.map((n) => ({
		numero: n,
		etiqueta: etiquetaSugerida(n),
		fechaVencimiento: `${cambios[n] ?? fechaSugerida(anio, n)}T00:00:00`,
		rowVersion: `${version}${n}`,
	}));

const configuracion = (anio: number, cuotas: CuotaCronograma[] = []): ConfiguracionAnio => ({
	anio,
	conceptos: [
		{
			conceptoId: 1,
			codigo: 'MATRICULA',
			nombre: 'Matricula',
			soloAlumnosNuevos: false,
			montos: [],
		},
	],
	cronograma: cuotas,
});

type Respuesta = Observable<ConfiguracionAnio>;

function crear(api: Record<string, unknown>) {
	TestBed.configureTestingModule({
		providers: [CronogramaAnioFacade, { provide: PagosApiService, useValue: api }],
	});
	return TestBed.inject(CronogramaAnioFacade);
}

/** Un año 2027 ya guardado, con la cuota 1 adelantada al 30/03 y lista para revisar y guardar. */
function conCambioListo(
	configuracionAnio: (anio: number) => Respuesta,
	guardarCronogramaAnio: (payload: GuardarCronogramaAnioPayload) => Respuesta,
) {
	const facade = crear({ configuracionAnio, guardarCronogramaAnio });
	facade.cargar(2027);
	facade.editarFecha(1, '2027-03-30');
	expect(facade.revisar()).toBe(true);
	facade.guardar();
	return facade;
}

describe('CronogramaAnioFacade · lectura', () => {
	it('carga el cronograma del año y queda lista sin cambios', () => {
		const facade = crear({
			configuracionAnio: () => of(configuracion(2027, cronograma(2027))),
		});

		facade.cargar(2027);

		expect(facade.estado()).toBe('lista');
		expect(facade.cuotas()).toHaveLength(10);
		expect(facade.existe()).toBe(true);
		expect(facade.hayCambios()).toBe(false);
		expect(facade.filas()[0].dia).toBe('miércoles 31/03/2027');
	});

	it('un año sin cronograma no es un error: 10 filas por completar', () => {
		const facade = crear({ configuracionAnio: () => of(configuracion(2027)) });

		facade.cargar(2027);

		expect(facade.estado()).toBe('lista');
		expect(facade.existe()).toBe(false);
		expect(facade.filas()).toHaveLength(10);
		expect(facade.hayFechasVacias()).toBe(true);
		expect(facade.mensaje()).toBeNull();
	});

	it('un error al cargar deja el estado en error con su mensaje, sin reintentar', () => {
		const configuracionAnio = vi.fn(() => throwError(() => ({ status: 500 })));
		const facade = crear({ configuracionAnio });

		facade.cargar(2027);

		expect(configuracionAnio).toHaveBeenCalledTimes(1);
		expect(facade.estado()).toBe('error');
		expect(facade.mensaje()).toEqual({
			severidad: 'danger',
			texto: 'No se pudo cargar el cronograma del año.',
		});
	});

	it('«Volver a cargar» lee otra vez el mismo año', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))));
		const facade = crear({ configuracionAnio });
		facade.cargar(2027);

		facade.recargar();

		expect(configuracionAnio).toHaveBeenLastCalledWith(2027);
		expect(facade.estado()).toBe('lista');
		expect(facade.mensaje()).toBeNull();
	});

	it('descarta la respuesta de un año que ya no está elegido (C14)', () => {
		const viejo = new Subject<ConfiguracionAnio>();
		const facade = crear({
			configuracionAnio: (anio: number) =>
				anio === 2026 ? viejo : of(configuracion(2027, cronograma(2027))),
		});

		facade.cargar(2026);
		facade.cargar(2027);
		viejo.next(configuracion(2026, cronograma(2026, 'x')));
		viejo.error({ status: 500 });

		expect(facade.estado()).toBe('lista');
		expect(facade.cuotas()[0]).toMatchObject({
			fechaVencimiento: '2027-03-31T00:00:00',
			rowVersion: 'v1',
		});
		expect(facade.mensaje()).toBeNull();
	});

	it.each<[string, (vieja: Subject<ConfiguracionAnio>) => void]>([
		['un error', (vieja) => vieja.error(new TimeoutError())],
		['una respuesta', (vieja) => vieja.next(configuracion(2027, cronograma(2027, 'x')))],
	])('%s que llega tarde de una lectura vieja del mismo año (2027 → 2026 → 2027) no pisa la vigente ni lo escrito', (_caso, llegaTarde) => {
		const vieja = new Subject<ConfiguracionAnio>();
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(vieja)
			.mockReturnValueOnce(of(configuracion(2026, cronograma(2026))))
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))));
		const facade = crear({ configuracionAnio });
		facade.cargar(2027);
		facade.cargar(2026);
		facade.cargar(2027);
		facade.editarFecha(1, '2027-03-30');

		llegaTarde(vieja);

		expect(facade.estado()).toBe('lista');
		expect(facade.mensaje()).toBeNull();
		expect(facade.hayCambios()).toBe(true);
		expect(facade.cuotas()[0].rowVersion).toBe('v1');
	});
});

describe('CronogramaAnioFacade · edición', () => {
	it('una etiqueta sugerida sin tocar no da cambios; una fecha sí, y volver a la base los quita', () => {
		const facade = crear({ configuracionAnio: () => of(configuracion(2027)) });
		facade.cargar(2027);

		expect(facade.hayCambios()).toBe(false);
		facade.editarFecha(1, '2027-03-31');
		expect(facade.hayCambios()).toBe(true);
		facade.editarFecha(1, '');
		expect(facade.hayCambios()).toBe(false);
	});

	it('proponerFechas completa solo las fechas vacías (U4)', () => {
		const facade = crear({ configuracionAnio: () => of(configuracion(2027)) });
		facade.cargar(2027);
		facade.editarFecha(3, '2027-05-20');

		facade.proponerFechas();

		expect(facade.filas().map((f) => f.fecha.slice(5))).toEqual([
			'03-31',
			'04-30',
			'05-20',
			'06-30',
			'07-15',
			'08-13',
			'09-30',
			'10-29',
			'11-30',
			'12-15',
		]);
		expect(facade.hayFechasVacias()).toBe(false);
	});

	it('descartar vacía el borrador', () => {
		const facade = crear({
			configuracionAnio: () => of(configuracion(2027, cronograma(2027))),
		});
		facade.cargar(2027);
		facade.editarEtiqueta(2, 'Abril (2.ª)');

		facade.descartar();

		expect(facade.hayCambios()).toBe(false);
		expect(facade.filas()[1].etiqueta).toBe('Abril');
	});

	it('no edita antes de terminar de cargar', () => {
		const facade = crear({ configuracionAnio: () => NEVER });
		facade.cargar(2027);

		facade.editarFecha(1, '2027-03-31');
		facade.proponerFechas();

		expect(facade.hayCambios()).toBe(false);
	});
});

describe('CronogramaAnioFacade · revisión', () => {
	it('con una cuota marcada no abre la revisión y explica por qué', () => {
		const guardarCronogramaAnio = vi.fn();
		const facade = crear({
			configuracionAnio: () => of(configuracion(2027, cronograma(2027))),
			guardarCronogramaAnio,
		});
		facade.cargar(2027);
		facade.editarFecha(2, '2027-03-31');

		expect(facade.revisar()).toBe(false);
		expect(facade.revision()).toBeNull();
		expect(facade.motivoNoRevisar()).toBe('Corrige la cuota marcada para revisar los cambios.');
	});

	it('sin cambios no abre la revisión, y guardar sin revisión no llama al API', () => {
		const guardarCronogramaAnio = vi.fn();
		const facade = crear({
			configuracionAnio: () => of(configuracion(2027, cronograma(2027))),
			guardarCronogramaAnio,
		});
		facade.cargar(2027);

		expect(facade.revisar()).toBe(false);
		facade.guardar();

		expect(guardarCronogramaAnio).not.toHaveBeenCalled();
	});

	it('la revisión congela el payload y bloquea la edición hasta volver a editar', () => {
		const facade = crear({
			configuracionAnio: () => of(configuracion(2027, cronograma(2027))),
		});
		facade.cargar(2027);
		facade.editarFecha(1, '2027-03-30');

		expect(facade.revisar()).toBe(true);
		facade.editarFecha(1, '2027-03-29');
		expect(facade.revision()?.payload.cuotas[0].fechaVencimiento).toBe('2027-03-30');

		facade.volverAEditar();
		facade.editarFecha(1, '2027-03-29');
		expect(facade.filas()[0].fecha).toBe('2027-03-29');
	});
});

describe('CronogramaAnioFacade · guardado (INV-PG05, INV-S05)', () => {
	it('en un año nuevo el PUT lleva las 10 cuotas con rowVersion nulo y toma solo el cronograma de la respuesta', () => {
		const guardarCronogramaAnio = vi.fn((_payload: GuardarCronogramaAnioPayload) =>
			of(configuracion(2027, cronograma(2027))),
		);
		const facade = crear({
			configuracionAnio: () => of(configuracion(2027)),
			guardarCronogramaAnio,
		});
		facade.cargar(2027);
		facade.proponerFechas();

		expect(facade.revisar()).toBe(true);
		expect(facade.revision()?.creacion).toBe(true);
		facade.guardar();

		const payload = guardarCronogramaAnio.mock.calls[0][0];
		expect(payload.anio).toBe(2027);
		expect(payload.cuotas).toHaveLength(10);
		expect(payload.cuotas.every((c) => c.rowVersion === null)).toBe(true);
		expect(facade.cuotas()).toHaveLength(10);
		expect(facade.hayCambios()).toBe(false);
		expect(facade.revision()).toBeNull();
		expect(facade.mensaje()).toEqual({
			severidad: 'success',
			texto: 'Se guardó el cronograma de 2027: 10 cuotas.',
		});
	});

	it('al editar, el PUT lleva el rowVersion leído de cada cuota', () => {
		const guardarCronogramaAnio = vi.fn((_payload: GuardarCronogramaAnioPayload) =>
			of(configuracion(2027, cronograma(2027, 'w', { 1: '2027-03-30' }))),
		);
		const facade = conCambioListo(
			() => of(configuracion(2027, cronograma(2027))),
			guardarCronogramaAnio,
		);

		const payload = guardarCronogramaAnio.mock.calls[0][0];
		expect(payload.cuotas.map((c) => c.rowVersion)).toEqual(NUMEROS.map((n) => `v${n}`));
		expect(payload.cuotas[0].fechaVencimiento).toBe('2027-03-30');
		expect(facade.cuotas()[0].rowVersion).toBe('w1');
		expect(facade.mensaje()?.texto).toBe(
			'Se guardaron los cambios del cronograma. Las cuotas ya generadas toman las fechas nuevas.',
		);
	});

	it('un 409 relee una vez, conserva lo escrito y muestra el mensaje del código', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))))
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027, 'w'))));
		const guardarCronogramaAnio = vi.fn(() =>
			throwError(() => ({ status: 409, error: { errorCode: 'PAGO_CRONOGRAMA_CONFLICTO' } })),
		);

		const facade = conCambioListo(configuracionAnio, guardarCronogramaAnio);

		expect(guardarCronogramaAnio).toHaveBeenCalledTimes(1);
		expect(configuracionAnio).toHaveBeenCalledTimes(2);
		expect(facade.filas()[0].fecha).toBe('2027-03-30');
		expect(facade.revision()).toBeNull();
		expect(facade.mensaje()).toEqual({
			severidad: 'danger',
			texto: 'Otra persona cambió el cronograma de este año mientras editabas. Se cargaron sus fechas y tus cambios siguen en pantalla: revísalos y vuelve a guardar.',
		});
		expect(facade.revisar()).toBe(true);
		expect(facade.revision()?.payload.cuotas[0].rowVersion).toBe('w1');
	});

	it('si lo releído ya trae lo escrito, avisa que ya está guardado y vacía el borrador', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))))
			.mockReturnValueOnce(
				of(configuracion(2027, cronograma(2027, 'w', { 1: '2027-03-30' }))),
			);

		const facade = conCambioListo(configuracionAnio, () => throwError(() => ({ status: 0 })));

		expect(facade.hayCambios()).toBe(false);
		expect(facade.mensaje()).toEqual({
			severidad: 'success',
			texto: 'El cronograma que escribiste ya está guardado.',
		});
	});

	it.each<[string, () => unknown, string]>([
		[
			'sin respuesta (status 0)',
			() => ({ status: 0 }),
			'No hubo respuesta del servidor y el cronograma no quedó guardado: tus cambios siguen en pantalla. Revísalo y vuelve a guardar.',
		],
		[
			'timeout sin status (C19)',
			() => new TimeoutError(),
			'No hubo respuesta del servidor y el cronograma no quedó guardado: tus cambios siguen en pantalla. Revísalo y vuelve a guardar.',
		],
		[
			'error del servidor (5xx)',
			() => ({ status: 503 }),
			'No se pudo guardar el cronograma. Tus cambios siguen en pantalla: revísalos e intenta de nuevo.',
		],
	])('%s: relee una vez y, si sigue habiendo diferencias, lo dice', (_caso, error, mensaje) => {
		const configuracionAnio = vi.fn(() => of(configuracion(2027, cronograma(2027))));
		const guardarCronogramaAnio = vi.fn(() => throwError(error));

		const facade = conCambioListo(configuracionAnio, guardarCronogramaAnio);

		expect(guardarCronogramaAnio).toHaveBeenCalledTimes(1);
		expect(configuracionAnio).toHaveBeenCalledTimes(2);
		expect(facade.hayCambios()).toBe(true);
		expect(facade.mensaje()).toEqual({ severidad: 'danger', texto: mensaje });
	});

	it('un 400 de regla no relee ni reintenta y conserva lo escrito', () => {
		const configuracionAnio = vi.fn(() => of(configuracion(2027, cronograma(2027))));
		const guardarCronogramaAnio = vi.fn(() =>
			throwError(() => ({
				status: 400,
				error: { errorCode: 'PAGO_CRONOGRAMA_FUERA_DE_ORDEN' },
			})),
		);

		const facade = conCambioListo(configuracionAnio, guardarCronogramaAnio);

		expect(guardarCronogramaAnio).toHaveBeenCalledTimes(1);
		expect(configuracionAnio).toHaveBeenCalledTimes(1);
		expect(facade.filas()[0].fecha).toBe('2027-03-30');
		expect(facade.mensaje()?.texto).toBe(
			'Cada cuota debe vencer después de la anterior: las fechas van en orden y no pueden repetirse.',
		);
	});

	it('si la relectura falla, la base queda incierta hasta «Volver a leer»', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))));

		const facade = conCambioListo(configuracionAnio, () => throwError(() => ({ status: 0 })));

		expect(facade.baseIncierta()).toBe(true);
		expect(facade.puedeRevisar()).toBe(false);
		expect(facade.motivoNoRevisar()).toBe(
			'Vuelve a leer el cronograma antes de guardar: no se pudo confirmar qué quedó guardado.',
		);
		expect(facade.mensaje()?.texto).toBe(
			'No se pudo confirmar qué quedó guardado. Usa «Volver a leer» antes de guardar de nuevo.',
		);

		facade.volverALeer();

		expect(configuracionAnio).toHaveBeenCalledTimes(3);
		expect(facade.baseIncierta()).toBe(false);
		expect(facade.puedeRevisar()).toBe(true);
		expect(facade.mensaje()).toEqual({
			severidad: 'info',
			texto: 'Se volvió a leer el cronograma: revisa tus cambios y vuelve a guardar.',
		});
	});

	it('«Volver a leer» sin nada escrito (después de descartar) no dice que algo quedó guardado', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))));
		const facade = conCambioListo(configuracionAnio, () => throwError(() => new TimeoutError()));
		expect(facade.baseIncierta()).toBe(true);
		facade.descartar();

		facade.volverALeer();

		expect(configuracionAnio).toHaveBeenCalledTimes(3);
		expect(facade.baseIncierta()).toBe(false);
		expect(facade.hayCambios()).toBe(false);
		expect(facade.mensaje()).toBeNull();
	});

	it('«Volver a leer» con una relectura en curso no pide otra', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValue(NEVER);
		const facade = conCambioListo(configuracionAnio, () => throwError(() => ({ status: 0 })));

		facade.volverALeer();
		facade.volverALeer();

		expect(configuracionAnio).toHaveBeenCalledTimes(3);
		expect(facade.releyendo()).toBe(true);
	});

	it('un segundo guardar con el primero en curso no envía otro PUT', () => {
		const guardarCronogramaAnio = vi.fn(() => NEVER);

		const facade = conCambioListo(
			() => of(configuracion(2027, cronograma(2027))),
			guardarCronogramaAnio,
		);
		facade.guardar();

		expect(guardarCronogramaAnio).toHaveBeenCalledTimes(1);
		expect(facade.ocupado()).toBe(true);
	});

	it('el PUT no se corta si la sección se destruye a mitad del guardado (C24), y su error ya no relee', () => {
		const put = new Subject<ConfiguracionAnio>();
		const relectura = new Subject<ConfiguracionAnio>();
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(configuracion(2027, cronograma(2027))))
			.mockReturnValueOnce(relectura);
		conCambioListo(configuracionAnio, () => put);

		TestBed.resetTestingModule();

		expect(put.observed).toBe(true);
		put.error({ status: 0 });
		expect(relectura.observed).toBe(false);
	});

	it('una lectura en curso sí se corta al destruir la sección', () => {
		const lectura = new Subject<ConfiguracionAnio>();
		const facade = crear({ configuracionAnio: () => lectura });
		facade.cargar(2027);
		expect(lectura.observed).toBe(true);

		TestBed.resetTestingModule();

		expect(lectura.observed).toBe(false);
	});
});
