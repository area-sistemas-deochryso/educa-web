import { describe, expect, it } from 'vitest';

import {
	type DatosBloqueo,
	type EntradaPasos,
	type NumeroPaso,
	type PasoAnio,
	anioSinConfigurar,
	armarPasos,
	avisosGeneracion,
	bloqueoGeneracion,
	mensajeCambiosSinGuardar,
	nombresSecciones,
	seccionesSinGuardar,
	textoAnioSinConfigurar,
} from './configurar-anio.logic';
import type { CoberturaMontos } from './montos-anio.logic';

// #region Datos
const COMPLETA: CoberturaMontos = { vacia: false, completa: true, faltantes: [] };
const VACIA: CoberturaMontos = {
	vacia: true,
	completa: false,
	faltantes: ['Matrícula', 'Inscripción', 'Pensión'],
};

const SIN_BLOQUEO: DatosBloqueo = {
	cargando: false,
	errorParametros: false,
	hayParametros: true,
	sinGuardar: [],
};

/** Un año con todo guardado; cada caso cambia solo lo que prueba. */
function entrada(cambios: Partial<EntradaPasos> = {}): EntradaPasos {
	return {
		parametros: { estado: 'lista', guardados: true },
		montos: { estado: 'lista', cobertura: COMPLETA },
		cronograma: { estado: 'lista', cuotasGuardadas: 10 },
		sinGuardar: [],
		bloqueo: null,
		cargosCreados: null,
		...cambios,
	};
}

function anioVacio(): EntradaPasos {
	return entrada({
		parametros: { estado: 'lista', guardados: false },
		montos: { estado: 'lista', cobertura: VACIA },
		cronograma: { estado: 'lista', cuotasGuardadas: 0 },
		bloqueo: bloqueoGeneracion({ ...SIN_BLOQUEO, hayParametros: false }),
	});
}

const paso = (pasos: PasoAnio[], numero: NumeroPaso): PasoAnio | undefined =>
	pasos.find((p) => p.numero === numero);

const actuales = (pasos: PasoAnio[]): number[] =>
	pasos.filter((p) => p.actual).map((p) => p.numero);
// #endregion

describe('armarPasos — guía de «Configurar año»', () => {
	it('un año vacío: el paso 1 es el actual y «Generar» está bloqueado por los parámetros', () => {
		const pasos = armarPasos(anioVacio());

		expect(pasos.map((p) => p.destino)).toEqual([
			'parametros-title',
			'montos-title',
			'cronograma-title',
			'generar-title',
		]);
		expect(actuales(pasos)).toEqual([1]);
		expect(paso(pasos, 1)).toMatchObject({
			estado: 'pendiente',
			etiqueta: 'Pendiente',
			severidad: 'warn',
			detalle: 'Pago mínimo por partes y recargo por cuota vencida.',
		});
		expect(paso(pasos, 2)?.detalle).toBe('Ningún concepto tiene monto todavía.');
		expect(paso(pasos, 3)?.detalle).toBe('Faltan las fechas de las 10 cuotas.');
		expect(paso(pasos, 4)).toMatchObject({
			estado: 'bloqueado',
			etiqueta: 'Bloqueado',
			severidad: 'secondary',
			detalle: 'Necesita los parámetros (paso 1).',
		});
	});

	it('un año completo: el paso 4 es el actual y está disponible', () => {
		const pasos = armarPasos(entrada());

		expect(actuales(pasos)).toEqual([4]);
		expect(pasos.slice(0, 3).map((p) => p.etiqueta)).toEqual(['Listo', 'Listo', 'Listo']);
		expect(paso(pasos, 1)?.detalle).toBe('Guardados.');
		expect(paso(pasos, 2)?.detalle).toBe('Todos los conceptos tienen monto.');
		expect(paso(pasos, 3)?.detalle).toBe('10 cuotas con fecha.');
		expect(paso(pasos, 4)).toMatchObject({
			estado: 'disponible',
			etiqueta: 'Disponible',
			severidad: 'info',
			detalle: 'Calcula la vista previa y genera.',
		});
	});

	it('con cambios, los pasos afectados dicen «Sin guardar» y «Generar» se bloquea por eso', () => {
		const sinGuardar = ['montos', 'cronograma'] as const;
		const pasos = armarPasos(
			entrada({ sinGuardar, bloqueo: bloqueoGeneracion({ ...SIN_BLOQUEO, sinGuardar }) }),
		);

		expect(paso(pasos, 1)?.estado).toBe('listo');
		for (const n of [2, 3] as const) {
			expect(paso(pasos, n)).toMatchObject({
				estado: 'sin-guardar',
				etiqueta: 'Sin guardar',
				severidad: 'info',
				detalle: 'Tienes cambios sin guardar.',
			});
		}
		expect(actuales(pasos)).toEqual([2]);
		expect(paso(pasos, 4)?.detalle).toBe('Guarda o descarta los cambios antes.');
	});

	it('con cambios en los parámetros, «Generar» no ofrece descartar: esa sección no tiene «Descartar cambios»', () => {
		for (const sinGuardar of [['parametros'], ['parametros', 'cronograma']] as const) {
			const pasos = armarPasos(
				entrada({ sinGuardar, bloqueo: bloqueoGeneracion({ ...SIN_BLOQUEO, sinGuardar }) }),
			);

			expect(paso(pasos, 4)?.detalle).toBe('Guarda los cambios antes.');
		}
	});

	it('si el cronograma no se pudo leer, el paso 3 dice «Error» y es el que sigue', () => {
		const pasos = armarPasos(entrada({ cronograma: { estado: 'error', cuotasGuardadas: 0 } }));

		expect(paso(pasos, 3)).toMatchObject({
			estado: 'error',
			etiqueta: 'Error',
			severidad: 'danger',
			detalle: 'No se pudo cargar: usa «Volver a cargar».',
		});
		expect(actuales(pasos)).toEqual([3]);
	});

	it('si los montos no se pudieron leer, el paso 2 dice «Error»', () => {
		const pasos = armarPasos(entrada({ montos: { estado: 'error', cobertura: VACIA } }));

		expect(paso(pasos, 2)).toMatchObject({
			etiqueta: 'Error',
			detalle: 'No se pudieron cargar: usa «Volver a cargar».',
		});
	});

	it('si los parámetros no se pudieron leer, el paso 1 dice «Error» y «Generar» lo nombra', () => {
		const bloqueo = bloqueoGeneracion({
			...SIN_BLOQUEO,
			errorParametros: true,
			hayParametros: false,
		});
		const pasos = armarPasos(
			entrada({ parametros: { estado: 'error', guardados: false }, bloqueo }),
		);

		expect(paso(pasos, 1)).toMatchObject({
			estado: 'error',
			etiqueta: 'Error',
			severidad: 'danger',
		});
		expect(actuales(pasos)).toEqual([1]);
		expect(bloqueo?.causa).toBe('error-parametros');
		expect(paso(pasos, 4)?.detalle).toBe('Vuelve a cargar los parámetros (paso 1).');
	});

	it('con cargos creados en esta visita, el paso 4 dice «Hecho», en singular o plural', () => {
		expect(paso(armarPasos(entrada({ cargosCreados: 1 })), 4)).toMatchObject({
			estado: 'hecho',
			etiqueta: 'Hecho',
			severidad: 'success',
			detalle: 'Se creó 1 cargo en esta visita.',
		});
		expect(paso(armarPasos(entrada({ cargosCreados: 30 })), 4)?.detalle).toBe(
			'Se crearon 30 cargos en esta visita.',
		);
	});

	it('montos o cronograma a medias dicen «Incompleto» con lo que falta (INV-PG06, INV-PG05)', () => {
		const pasos = armarPasos(
			entrada({
				montos: {
					estado: 'lista',
					cobertura: {
						vacia: false,
						completa: false,
						faltantes: ['Inscripción', 'Pensión (Primaria y Secundaria)'],
					},
				},
				cronograma: { estado: 'lista', cuotasGuardadas: 7 },
			}),
		);

		expect(paso(pasos, 2)).toMatchObject({
			estado: 'incompleto',
			etiqueta: 'Incompleto',
			severidad: 'warn',
			detalle: 'Falta: Inscripción y Pensión (Primaria y Secundaria).',
		});
		expect(paso(pasos, 3)?.detalle).toBe('Tiene 7 de 10 cuotas.');
		expect(actuales(pasos)).toEqual([2]);
	});

	it('mientras carga, los pasos dicen «Cargando» y «Generar» espera', () => {
		const pasos = armarPasos(
			entrada({
				parametros: { estado: 'cargando', guardados: false },
				montos: { estado: 'cargando', cobertura: VACIA },
				cronograma: { estado: 'cargando', cuotasGuardadas: 0 },
				bloqueo: bloqueoGeneracion({ ...SIN_BLOQUEO, cargando: true }),
			}),
		);

		expect(pasos.slice(0, 3).map((p) => p.etiqueta)).toEqual([
			'Cargando',
			'Cargando',
			'Cargando',
		]);
		expect(paso(pasos, 4)?.detalle).toBe('Cargando la configuración…');
		expect(actuales(pasos)).toEqual([1]);
	});
});

describe('bloqueoGeneracion — solo bloquea lo que haría fallar o copiar datos no guardados', () => {
	it('respeta la precedencia: cargando → error de parámetros → sin parámetros → sin guardar', () => {
		const todo: DatosBloqueo = {
			cargando: true,
			errorParametros: true,
			hayParametros: false,
			sinGuardar: ['montos'],
		};

		expect(bloqueoGeneracion(todo)?.causa).toBe('cargando');
		expect(bloqueoGeneracion({ ...todo, cargando: false })?.causa).toBe('error-parametros');
		expect(bloqueoGeneracion({ ...todo, cargando: false, errorParametros: false })?.causa).toBe(
			'sin-parametros',
		);
		expect(bloqueoGeneracion({ ...SIN_BLOQUEO, sinGuardar: ['montos'] })?.causa).toBe(
			'sin-guardar',
		);
		expect(bloqueoGeneracion(SIN_BLOQUEO)).toBeNull();
	});

	it('cada causa explica la regla en palabras', () => {
		expect(bloqueoGeneracion({ ...SIN_BLOQUEO, hayParametros: false })?.texto).toBe(
			'Primero guarda los parámetros del año (paso 1): sin ellos no se pueden generar cargos.',
		);
		expect(bloqueoGeneracion({ ...SIN_BLOQUEO, errorParametros: true })?.texto).toBe(
			'No se pudieron leer los parámetros del año (paso 1). Vuelve a cargarlos: sin ellos no se pueden generar cargos.',
		);
		expect(
			bloqueoGeneracion({ ...SIN_BLOQUEO, sinGuardar: ['montos', 'cronograma'] })?.texto,
		).toBe(
			'Tienes cambios sin guardar en los montos y el cronograma. Guárdalos o descártalos antes de generar: los cargos se crean con lo guardado.',
		);
	});

	it('con cambios en los parámetros solo pide guardarlos: esa sección no tiene «Descartar cambios»', () => {
		expect(bloqueoGeneracion({ ...SIN_BLOQUEO, sinGuardar: ['parametros'] })?.texto).toBe(
			'Tienes cambios sin guardar en los parámetros. Guárdalos antes de generar: los cargos se crean con lo guardado.',
		);
		expect(
			bloqueoGeneracion({ ...SIN_BLOQUEO, sinGuardar: ['parametros', 'montos'] })?.texto,
		).toBe(
			'Tienes cambios sin guardar en los parámetros y los montos. Guárdalos antes de generar: los cargos se crean con lo guardado.',
		);
	});

	it('que falten montos o cronograma no bloquea: solo se avisa', () => {
		expect(bloqueoGeneracion(SIN_BLOQUEO)).toBeNull();
		expect(
			avisosGeneracion(
				{ estado: 'lista', cobertura: VACIA },
				{ estado: 'lista', cuotasGuardadas: 0 },
			),
		).toHaveLength(2);
	});
});

describe('avisosGeneracion — lo que se omitirá al generar', () => {
	it('nombra los montos que faltan y la falta de cronograma (INV-PG06, INV-PG05)', () => {
		expect(
			avisosGeneracion(
				{
					estado: 'lista',
					cobertura: {
						vacia: false,
						completa: false,
						faltantes: ['Pensión (Secundaria)'],
					},
				},
				{ estado: 'lista', cuotasGuardadas: 0 },
			),
		).toEqual([
			'Faltan montos de Pensión (Secundaria): esos cargos se omitirán al generar (paso 2).',
			'Sin cronograma no se generan las cuotas de pensión; matrícula e inscripción sí (paso 3).',
		]);
	});

	it('un cronograma incompleto dice cuántas cuotas tiene', () => {
		expect(
			avisosGeneracion(
				{ estado: 'lista', cobertura: COMPLETA },
				{ estado: 'lista', cuotasGuardadas: 7 },
			),
		).toEqual([
			'El cronograma tiene 7 de 10 cuotas: complétalo en el paso 3 para generar todas las pensiones.',
		]);
	});

	it('sin avisos con todo completo, ni con una lectura en curso o fallida', () => {
		expect(
			avisosGeneracion(
				{ estado: 'lista', cobertura: COMPLETA },
				{ estado: 'lista', cuotasGuardadas: 10 },
			),
		).toEqual([]);
		expect(
			avisosGeneracion(
				{ estado: 'error', cobertura: VACIA },
				{ estado: 'cargando', cuotasGuardadas: 0 },
			),
		).toEqual([]);
	});
});

describe('cambios sin guardar', () => {
	it('las secciones salen en el orden de los pasos', () => {
		expect(seccionesSinGuardar({ cronograma: true, parametros: true, montos: false })).toEqual([
			'parametros',
			'cronograma',
		]);
		expect(
			seccionesSinGuardar({ parametros: false, montos: false, cronograma: false }),
		).toEqual([]);
	});

	it('el aviso nombra las secciones y el año', () => {
		expect(mensajeCambiosSinGuardar(['montos', 'cronograma'], 2027)).toBe(
			'Tienes cambios sin guardar en los montos y el cronograma de 2027. Si continúas, se pierden.',
		);
		expect(nombresSecciones(['parametros', 'montos', 'cronograma'])).toBe(
			'los parámetros, los montos y el cronograma',
		);
	});
});

describe('anioSinConfigurar', () => {
	it('solo con las tres lecturas completas y nada guardado', () => {
		expect(anioSinConfigurar(anioVacio())).toBe(true);
		expect(
			anioSinConfigurar({ ...anioVacio(), parametros: { estado: 'lista', guardados: true } }),
		).toBe(false);
		expect(
			anioSinConfigurar({ ...anioVacio(), montos: { estado: 'lista', cobertura: COMPLETA } }),
		).toBe(false);
		expect(
			anioSinConfigurar({
				...anioVacio(),
				cronograma: { estado: 'lista', cuotasGuardadas: 10 },
			}),
		).toBe(false);
	});

	it('una lectura fallida o en curso no presenta el año como vacío: no se sabe qué hay guardado', () => {
		expect(
			anioSinConfigurar({
				...anioVacio(),
				parametros: { estado: 'error', guardados: false },
			}),
		).toBe(false);
		expect(
			anioSinConfigurar({
				...anioVacio(),
				parametros: { estado: 'cargando', guardados: false },
			}),
		).toBe(false);
		expect(
			anioSinConfigurar({ ...anioVacio(), montos: { estado: 'error', cobertura: VACIA } }),
		).toBe(false);
		expect(
			anioSinConfigurar({
				...anioVacio(),
				cronograma: { estado: 'cargando', cuotasGuardadas: 0 },
			}),
		).toBe(false);
	});

	it('el texto guía explica el orden y qué se omite', () => {
		expect(textoAnioSinConfigurar(2027)).toBe(
			'El año 2027 todavía no está configurado: sigue los pasos en orden. Generar exige los parámetros; sin montos o sin cronograma, esos cargos se omiten.',
		);
	});
});

describe('textos visibles', () => {
	it('explican la regla en palabras, sin códigos de invariante', () => {
		const entradas: EntradaPasos[] = [
			anioVacio(),
			entrada(),
			entrada({ cargosCreados: 3 }),
			entrada({ cronograma: { estado: 'error', cuotasGuardadas: 0 } }),
			entrada({ parametros: { estado: 'error', guardados: false } }),
		];
		const bloqueos: DatosBloqueo[] = [
			{ ...SIN_BLOQUEO, cargando: true },
			{ ...SIN_BLOQUEO, errorParametros: true },
			{ ...SIN_BLOQUEO, hayParametros: false },
			{ ...SIN_BLOQUEO, sinGuardar: ['parametros', 'montos', 'cronograma'] },
		];
		const textos = [
			...entradas.flatMap((e) =>
				armarPasos(e).flatMap((p) => [p.titulo, p.etiqueta, p.detalle]),
			),
			...bloqueos.map((b) => bloqueoGeneracion(b)?.texto ?? ''),
			...avisosGeneracion(
				{ estado: 'lista', cobertura: VACIA },
				{ estado: 'lista', cuotasGuardadas: 4 },
			),
			mensajeCambiosSinGuardar(['parametros'], 2027),
			textoAnioSinConfigurar(2027),
		];

		expect(textos.filter((t) => /INV-/.test(t))).toEqual([]);
		expect(textos.every((t) => t.length > 0)).toBe(true);
	});
});
