import { TestBed } from '@angular/core/testing';
import { NEVER, Subject, TimeoutError, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type {
	ConceptoConMontos,
	ConfiguracionAnio,
	MontoConcepto,
	NivelEducativo,
} from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { MontosAnioFacade } from './montos-anio.facade';
import { TEXTOS_MONTOS } from './montos-resumen.logic';

// #region Datos
function monto(
	conceptoId: number,
	valor: number,
	rowVersion: string,
	nivel?: NivelEducativo,
): MontoConcepto {
	return nivel
		? { conceptoId, nivel, monto: valor, rowVersion }
		: { conceptoId, monto: valor, rowVersion };
}

const matricula = (montos: MontoConcepto[] = []): ConceptoConMontos => ({
	conceptoId: 1,
	codigo: 'MATRICULA',
	nombre: 'Matricula',
	soloAlumnosNuevos: false,
	montos,
});
const inscripcion = (montos: MontoConcepto[] = []): ConceptoConMontos => ({
	conceptoId: 2,
	codigo: 'INSCRIPCION',
	nombre: 'Inscripcion',
	soloAlumnosNuevos: true,
	montos,
});
const pension = (montos: MontoConcepto[] = []): ConceptoConMontos => ({
	conceptoId: 3,
	codigo: 'PENSION',
	nombre: 'Pension',
	soloAlumnosNuevos: false,
	montos,
});
const pensionPorNivel = (secundaria = 320, rowVersion = 'p3'): ConceptoConMontos =>
	pension([
		monto(3, 280, 'p1', 'Inicial'),
		monto(3, 320, 'p2', 'Primaria'),
		monto(3, secundaria, rowVersion, 'Secundaria'),
	]);

const config = (conceptos: ConceptoConMontos[], anio = 2027): ConfiguracionAnio => ({
	anio,
	conceptos,
	cronograma: [],
});

/** Matrícula general guardada, inscripción vacía y pensión por nivel. */
const base = (secundaria = 320, rowVersion = 'p3'): ConfiguracionAnio =>
	config([
		matricula([monto(1, 320, 'm1')]),
		inscripcion(),
		pensionPorNivel(secundaria, rowVersion),
	]);

const SECUNDARIA = '3|Secundaria';
const CONFLICTO = { status: 409, error: { errorCode: 'PAGO_MONTO_CONFLICTO' } };
const TEXTO_CONFLICTO =
	'Otra persona cambió los montos de este año mientras editabas. Se cargaron sus valores y tus cambios siguen en pantalla: revísalos y vuelve a guardar.';
// #endregion

function crear(api: Record<string, unknown>) {
	TestBed.configureTestingModule({
		providers: [MontosAnioFacade, { provide: PagosApiService, useValue: api }],
	});
	return TestBed.inject(MontosAnioFacade);
}

/** Carga 2027, escribe Secundaria y deja abierta la revisión. */
function enRevision(facade: MontosAnioFacade, texto = '350'): void {
	facade.cargar(2027);
	facade.editar(SECUNDARIA, texto);
	expect(facade.revisar()).toBe(true);
}

describe('MontosAnioFacade · lectura', () => {
	it('carga el año y queda lista; un año sin montos no es un error', () => {
		const facade = crear({
			configuracionAnio: () => of(config([matricula(), inscripcion(), pension()])),
		});

		facade.cargar(2027);

		expect(facade.estado()).toBe('lista');
		expect(facade.conceptos()).toHaveLength(3);
		expect(facade.cobertura().vacia).toBe(true);
		expect(facade.hayCambios()).toBe(false);
		expect(facade.mensaje()).toBeNull();
	});

	it('un error de carga deja el estado en error, con mensaje y una sola llamada', () => {
		const configuracionAnio = vi.fn(() => throwError(() => ({ status: 500 })));
		const facade = crear({ configuracionAnio });

		facade.cargar(2027);

		expect(facade.estado()).toBe('error');
		expect(facade.mensaje()).toEqual({
			severidad: 'danger',
			texto: 'No se pudieron cargar los montos del año.',
		});
		expect(configuracionAnio).toHaveBeenCalledTimes(1);
	});

	it('«Volver a cargar» pide el mismo año otra vez', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(base()));
		const facade = crear({ configuracionAnio });
		facade.cargar(2027);

		facade.recargar();

		expect(configuracionAnio).toHaveBeenLastCalledWith(2027);
		expect(facade.estado()).toBe('lista');
		expect(facade.mensaje()).toBeNull();
	});

	it('descarta la respuesta de un año que ya no está elegido', () => {
		const de2026 = new Subject<ConfiguracionAnio>();
		const facade = crear({
			configuracionAnio: (anio: number) => (anio === 2026 ? de2026 : of(base())),
		});

		facade.cargar(2026);
		facade.cargar(2027);
		de2026.next(config([matricula()], 2026));

		expect(facade.estado()).toBe('lista');
		expect(facade.conceptos().map((c) => c.codigo)).toEqual([
			'MATRICULA',
			'INSCRIPCION',
			'PENSION',
		]);
		expect(facade.conceptos()[0].montos).toHaveLength(1);
	});

	it('cambiar de año descarta el borrador', () => {
		const facade = crear({ configuracionAnio: () => of(base()) });
		facade.cargar(2027);
		facade.editar(SECUNDARIA, '350');

		facade.cargar(2026);

		expect(facade.hayCambios()).toBe(false);
	});

	it.each<[string, (vieja: Subject<ConfiguracionAnio>) => void]>([
		['un error', (vieja) => vieja.error(new TimeoutError())],
		['una respuesta', (vieja) => vieja.next(base(300, 'viejo'))],
	])('%s que llega tarde de una lectura vieja del mismo año (2027 → 2026 → 2027) no pisa la vigente ni lo escrito', (_caso, llegaTarde) => {
		const vieja = new Subject<ConfiguracionAnio>();
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(vieja)
			.mockReturnValueOnce(of(config([matricula()], 2026)))
			.mockReturnValueOnce(of(base()));
		const facade = crear({ configuracionAnio });
		facade.cargar(2027);
		facade.cargar(2026);
		facade.cargar(2027);
		facade.editar(SECUNDARIA, '350');

		llegaTarde(vieja);

		expect(facade.estado()).toBe('lista');
		expect(facade.mensaje()).toBeNull();
		expect(facade.hayCambios()).toBe(true);
		expect(facade.conceptos()[2].montos[2]).toMatchObject({ monto: 320, rowVersion: 'p3' });
	});
});

describe('MontosAnioFacade · edición y revisión', () => {
	it('con errores no abre la revisión y explica por qué', () => {
		const facade = crear({ configuracionAnio: () => of(base()) });
		facade.cargar(2027);
		facade.editar(SECUNDARIA, 'abc');

		expect(facade.revisar()).toBe(false);
		expect(facade.revision()).toBeNull();
		expect(facade.puedeRevisar()).toBe(false);
		expect(facade.motivoNoRevisar()).toBe('Corrige el monto marcado para revisar los cambios.');
	});

	it('la revisión congela un payload con solo lo cambiado (INV-S05)', () => {
		const facade = crear({ configuracionAnio: () => of(base()) });
		facade.cargar(2027);
		facade.editar('3|Inicial', '280');
		facade.editar(SECUNDARIA, '350');

		expect(facade.revisar()).toBe(true);
		expect(facade.revision()?.payload).toEqual({
			anio: 2027,
			montos: [{ conceptoId: 3, nivel: 'Secundaria', monto: 350, rowVersion: 'p3' }],
		});
	});

	it('sin cambios no abre la revisión ni llama al API', () => {
		const guardarMontosAnio = vi.fn(() => of(base()));
		const facade = crear({ configuracionAnio: () => of(base()), guardarMontosAnio });
		facade.cargar(2027);

		expect(facade.revisar()).toBe(false);
		facade.guardar();

		expect(guardarMontosAnio).not.toHaveBeenCalled();
	});

	it('guardar sin revisión no llama al PUT', () => {
		const guardarMontosAnio = vi.fn(() => of(base()));
		const facade = crear({ configuracionAnio: () => of(base()), guardarMontosAnio });
		facade.cargar(2027);
		facade.editar(SECUNDARIA, '350');

		facade.guardar();

		expect(guardarMontosAnio).not.toHaveBeenCalled();
	});

	it('durante la revisión no se edita; «Seguir editando» vuelve al borrador', () => {
		const facade = crear({ configuracionAnio: () => of(base()) });
		enRevision(facade);

		facade.editar(SECUNDARIA, '999');
		expect(facade.revision()?.payload.montos[0].monto).toBe(350);

		facade.volverAEditar();
		expect(facade.revision()).toBeNull();
		expect(facade.cambios()[0].ahoraCentavos).toBe(35000);
	});

	it('descartar vacía el borrador', () => {
		const facade = crear({ configuracionAnio: () => of(base()) });
		facade.cargar(2027);
		facade.editar(SECUNDARIA, '350');

		facade.descartar();

		expect(facade.hayCambios()).toBe(false);
		expect(facade.filas()[2].celdas[3].texto).toBe('320.00');
	});
});

describe('MontosAnioFacade · guardar', () => {
	it('toma los conceptos de la respuesta, vacía el borrador y avisa', () => {
		const guardarMontosAnio = vi.fn(() => of(base(350, 'p3b')));
		const facade = crear({ configuracionAnio: () => of(base()), guardarMontosAnio });
		enRevision(facade);

		facade.guardar();

		expect(guardarMontosAnio).toHaveBeenCalledTimes(1);
		expect(facade.conceptos()[2].montos[2]).toMatchObject({ monto: 350, rowVersion: 'p3b' });
		expect(facade.hayCambios()).toBe(false);
		expect(facade.revision()).toBeNull();
		expect(facade.guardando()).toBe(false);
		expect(facade.mensaje()).toEqual({
			severidad: 'success',
			texto: 'Se guardó 1 monto. Los cargos ya generados conservan su monto; los que se generen desde ahora usan este.',
		});
	});

	it('un 409 hace un solo PUT y una relectura, conserva lo escrito y lo dice (INV-S05)', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(base()))
			.mockReturnValueOnce(of(base(330, 'p3x')));
		const guardarMontosAnio = vi.fn(() => throwError(() => CONFLICTO));
		const facade = crear({ configuracionAnio, guardarMontosAnio });
		enRevision(facade);

		facade.guardar();

		expect(guardarMontosAnio).toHaveBeenCalledTimes(1);
		expect(configuracionAnio).toHaveBeenCalledTimes(2);
		expect(facade.hayCambios()).toBe(true);
		expect(facade.revision()).toBeNull();
		expect(facade.mensaje()).toEqual({ severidad: 'danger', texto: TEXTO_CONFLICTO });
		// La base nueva trae la versión de la otra persona: el próximo PUT la lleva.
		expect(facade.revisar()).toBe(true);
		expect(facade.revision()?.payload.montos[0].rowVersion).toBe('p3x');
	});

	it('si lo releído ya trae lo escrito, avisa que ya estaba guardado', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(base()))
			.mockReturnValueOnce(of(base(350, 'p3x')));
		const facade = crear({
			configuracionAnio,
			guardarMontosAnio: () => throwError(() => CONFLICTO),
		});
		enRevision(facade);

		facade.guardar();

		expect(facade.hayCambios()).toBe(false);
		expect(facade.mensaje()).toEqual({
			severidad: 'success',
			texto: TEXTOS_MONTOS.yaGuardados,
		});
	});

	it.each([
		['sin respuesta', { status: 0 }],
		['timeout del interceptor, sin status', new TimeoutError()],
		['error del servidor', { status: 503 }],
	])('%s: relee una vez y conserva lo escrito', (_caso, error) => {
		const configuracionAnio = vi.fn(() => of(base()));
		const guardarMontosAnio = vi.fn(() => throwError(() => error));
		const facade = crear({ configuracionAnio, guardarMontosAnio });
		enRevision(facade);

		facade.guardar();

		expect(guardarMontosAnio).toHaveBeenCalledTimes(1);
		expect(configuracionAnio).toHaveBeenCalledTimes(2);
		expect(facade.hayCambios()).toBe(true);
		expect(facade.mensaje()?.severidad).toBe('danger');
	});

	it('sin respuesta y con diferencias tras releer, afirma que no se guardó', () => {
		const facade = crear({
			configuracionAnio: () => of(base()),
			guardarMontosAnio: () => throwError(() => new TimeoutError()),
		});
		enRevision(facade);

		facade.guardar();

		expect(facade.mensaje()?.texto).toBe(
			'No hubo respuesta del servidor y los montos no quedaron guardados: tus cambios siguen en pantalla. Revísalos y vuelve a guardar.',
		);
	});

	it('un 400 de regla no relee ni reintenta y conserva lo escrito', () => {
		const configuracionAnio = vi.fn(() => of(base()));
		const guardarMontosAnio = vi.fn(() =>
			throwError(() => ({ status: 400, error: { errorCode: 'PAGO_CONFIG_MONTO_INVALIDO' } })),
		);
		const facade = crear({ configuracionAnio, guardarMontosAnio });
		enRevision(facade);

		facade.guardar();

		expect(guardarMontosAnio).toHaveBeenCalledTimes(1);
		expect(configuracionAnio).toHaveBeenCalledTimes(1);
		expect(facade.hayCambios()).toBe(true);
		expect(facade.mensaje()).toEqual({
			severidad: 'danger',
			texto: 'Cada monto debe ser mayor que S/ 0.00, tener como máximo dos decimales y no pasar de S/ 99,999,999.99.',
		});
	});

	it('un concepto desactivado relee, descarta lo escrito para él y lo nombra', () => {
		const sinInscripcion = config([matricula([monto(1, 320, 'm1')]), pensionPorNivel()]);
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(base()))
			.mockReturnValueOnce(of(sinInscripcion));
		const guardarMontosAnio = vi.fn(() =>
			throwError(() => ({
				status: 400,
				error: { errorCode: 'PAGO_MONTO_CONCEPTO_INVALIDO' },
			})),
		);
		const facade = crear({ configuracionAnio, guardarMontosAnio });
		facade.cargar(2027);
		facade.editar('2|todos', '150');
		facade.editar(SECUNDARIA, '350');
		facade.revisar();

		facade.guardar();

		expect(configuracionAnio).toHaveBeenCalledTimes(2);
		expect(facade.conceptos().map((c) => c.codigo)).toEqual(['MATRICULA', 'PENSION']);
		expect(facade.cambios().map((c) => c.clave)).toEqual([SECUNDARIA]);
		expect(facade.mensaje()).toEqual({
			severidad: 'danger',
			texto: 'Uno de los conceptos ya no existe o fue desactivado, así que no admite montos. Se recargó la lista de conceptos: revisa los montos y vuelve a guardar. Se descartaron los montos que escribiste para Inscripción.',
		});
	});

	it('si lo único escrito era del concepto desactivado, nunca dice que ya está guardado', () => {
		const sinInscripcion = config([matricula([monto(1, 320, 'm1')]), pensionPorNivel()]);
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(base()))
			.mockReturnValueOnce(of(sinInscripcion));
		const facade = crear({
			configuracionAnio,
			guardarMontosAnio: () =>
				throwError(() => ({
					status: 400,
					error: { errorCode: 'PAGO_MONTO_CONCEPTO_INVALIDO' },
				})),
		});
		facade.cargar(2027);
		facade.editar('2|todos', '150');
		facade.revisar();

		facade.guardar();

		expect(facade.hayCambios()).toBe(false);
		expect(facade.mensaje()?.severidad).toBe('danger');
		expect(facade.mensaje()?.texto).not.toBe(TEXTOS_MONTOS.yaGuardados);
		expect(facade.mensaje()?.texto).toContain(
			'Se descartaron los montos que escribiste para Inscripción.',
		);
	});

	it('si la relectura falla, la base queda incierta hasta «Volver a leer»', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(base()))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(base(330, 'p3x')));
		const facade = crear({
			configuracionAnio,
			guardarMontosAnio: () => throwError(() => CONFLICTO),
		});
		enRevision(facade);

		facade.guardar();

		expect(facade.baseIncierta()).toBe(true);
		expect(facade.motivoNoRevisar()).toBe(
			'Vuelve a leer los montos antes de guardar: no se pudo confirmar qué quedó guardado.',
		);
		expect(facade.puedeRevisar()).toBe(false);
		expect(facade.mensaje()).toEqual({
			severidad: 'danger',
			texto: TEXTOS_MONTOS.sinConfirmar,
		});

		facade.volverALeer();

		expect(configuracionAnio).toHaveBeenCalledTimes(3);
		expect(facade.baseIncierta()).toBe(false);
		expect(facade.hayCambios()).toBe(true);
		expect(facade.mensaje()).toEqual({ severidad: 'info', texto: TEXTOS_MONTOS.releidos });
		expect(facade.puedeRevisar()).toBe(true);
	});

	it('«Volver a leer» sin nada escrito (después de descartar) no dice que algo quedó guardado', () => {
		const configuracionAnio = vi
			.fn()
			.mockReturnValueOnce(of(base()))
			.mockReturnValueOnce(throwError(() => ({ status: 0 })))
			.mockReturnValueOnce(of(base()));
		const facade = crear({
			configuracionAnio,
			guardarMontosAnio: () => throwError(() => new TimeoutError()),
		});
		enRevision(facade);
		facade.guardar();
		expect(facade.baseIncierta()).toBe(true);
		facade.descartar();

		facade.volverALeer();

		expect(configuracionAnio).toHaveBeenCalledTimes(3);
		expect(facade.baseIncierta()).toBe(false);
		expect(facade.hayCambios()).toBe(false);
		expect(facade.mensaje()).toBeNull();
	});

	it('ignora un segundo guardado mientras hay uno en curso', () => {
		const guardarMontosAnio = vi.fn(() => NEVER);
		const facade = crear({ configuracionAnio: () => of(base()), guardarMontosAnio });
		enRevision(facade);

		facade.guardar();
		facade.guardar();

		expect(guardarMontosAnio).toHaveBeenCalledTimes(1);
		expect(facade.ocupado()).toBe(true);
		facade.editar(SECUNDARIA, '999');
		facade.volverAEditar();
		expect(facade.revision()).not.toBeNull();
	});

	it('una respuesta que llega después de salir de la pantalla ya no relee', () => {
		const respuesta = new Subject<ConfiguracionAnio>();
		const configuracionAnio = vi.fn(() => of(base()));
		const facade = crear({ configuracionAnio, guardarMontosAnio: () => respuesta });
		enRevision(facade);
		facade.guardar();

		TestBed.resetTestingModule();
		respuesta.error({ status: 0 });

		expect(configuracionAnio).toHaveBeenCalledTimes(1);
	});
});
