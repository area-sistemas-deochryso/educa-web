import { describe, expect, it } from 'vitest';

import type { CuotaCronograma } from '@data/models';
import {
	type BorradorCronograma,
	type FilaCuota,
	armarPayloadCronograma,
	conEtiqueta,
	conFecha,
	cuotasConError,
	faltantesCronograma,
	filasCronograma,
	hayCambiosCronograma,
	motivoNoRevisarCronograma,
	numerosLegibles,
	rellenarFechas,
} from './cronograma-anio.logic';
import { etiquetaSugerida, fechaSugerida } from './cronograma-fechas.logic';

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const cuota = (
	numero: number,
	fecha: string,
	etiqueta = etiquetaSugerida(numero),
): CuotaCronograma => ({
	numero,
	etiqueta,
	fechaVencimiento: `${fecha}T00:00:00`,
	rowVersion: `v${numero}`,
});

/** 2027 guardado con las fechas habituales: 03-31, 04-30, 05-31, 06-30, 07-15, 08-13, 09-30, 10-29, 11-30, 12-15. */
const guardado2027 = (): CuotaCronograma[] => NUMEROS.map((n) => cuota(n, fechaSugerida(2027, n)));

const filasDe = (
	borrador: BorradorCronograma,
	cuotas: CuotaCronograma[] = guardado2027(),
): FilaCuota[] => filasCronograma(2027, cuotas, borrador);

const fila = (filas: FilaCuota[], numero: number): FilaCuota => {
	const encontrada = filas.find((f) => f.numero === numero);
	if (!encontrada) throw new Error(`no existe la cuota ${numero}`);
	return encontrada;
};

describe('cronograma-anio.logic · filas', () => {
	it('un año sin cronograma da 10 filas con la etiqueta del mes, sin fecha, sin cambios y todas por guardar', () => {
		const filas = filasCronograma(2027, [], {});

		expect(filas.map((f) => f.numero)).toEqual(NUMEROS);
		expect(filas.map((f) => f.etiqueta)).toEqual(NUMEROS.map(etiquetaSugerida));
		expect(filas.every((f) => f.fecha === '' && f.dia === null && f.guardada === null)).toBe(
			true,
		);
		expect(filas.every((f) => !f.editada && f.cambiada)).toBe(true);
		expect(filas.every((f) => f.errorEtiqueta === null && f.errorFecha === null)).toBe(true);
		expect(hayCambiosCronograma(filas)).toBe(false);
	});

	it('la fecha del BE (`T00:00:00`) se lee como YYYY-MM-DD y se muestra completa con su día (C11)', () => {
		const filas = filasDe({}, [cuota(1, '2027-03-31')]);

		expect(fila(filas, 1)).toMatchObject({
			fecha: '2027-03-31',
			baseFecha: '2027-03-31',
			dia: 'miércoles 31/03/2027',
			cambiada: false,
			fechaDescribedBy: 'cuota-1-dia',
		});
		expect(fila(filas, 2).cambiada).toBe(true);
	});

	it('arma los ids de cada campo para label y aria-describedby', () => {
		expect(fila(filasDe({}), 4).ids).toEqual({
			etiqueta: 'cuota-4-etiqueta',
			fecha: 'cuota-4-fecha',
			dia: 'cuota-4-dia',
			errorEtiqueta: 'cuota-4-error-etiqueta',
			errorFecha: 'cuota-4-error-fecha',
			avisoEtiqueta: 'cuota-4-aviso-etiqueta',
			avisoFecha: 'cuota-4-aviso-fecha',
		});
	});
});

describe('cronograma-anio.logic · errores de fila (INV-PG05)', () => {
	it('una etiqueta de más de 30 caracteres después de recortar es error y se enlaza al campo', () => {
		const filas = filasDe({
			1: { etiqueta: `  ${'x'.repeat(31)} ` },
			2: { etiqueta: ` ${'y'.repeat(30)} ` },
		});

		expect(fila(filas, 1).errorEtiqueta).toBe(
			'La etiqueta admite hasta 30 caracteres (tiene 31).',
		);
		expect(fila(filas, 1).etiquetaDescribedBy).toBe('cuota-1-error-etiqueta');
		expect(fila(filas, 2).errorEtiqueta).toBeNull();
		expect(fila(filas, 2).etiquetaDescribedBy).toBeNull();
	});

	it('la etiqueta vacía o con solo espacios marca el campo (C15) y la informa el motivo', () => {
		const filas = filasDe({ 2: { etiqueta: '   ' } });

		expect(fila(filas, 2).errorEtiqueta).toBe(
			'Cada cuota necesita una etiqueta, por ejemplo «Marzo».',
		);
		expect(fila(filas, 2).etiquetaDescribedBy).toBe('cuota-2-error-etiqueta');
		expect(faltantesCronograma(filas).etiquetas).toEqual([2]);
		expect(motivoNoRevisarCronograma(filas, false)).toBe('Falta la etiqueta de la cuota 2.');
	});

	it('una fecha de otro año', () => {
		expect(fila(filasDe({ 1: { fecha: '2026-03-31' } }), 1).errorFecha).toBe(
			'La fecha debe caer en 2027.',
		);
	});

	it('una fecha que no existe', () => {
		expect(fila(filasDe({ 1: { fecha: '2027-02-30' } }), 1).errorFecha).toBe(
			'La fecha no es válida: revisa el día, el mes y el año.',
		);
	});

	it('un empate con la cuota anterior nombra esa cuota y marca solo la posterior', () => {
		const filas = filasDe({ 2: { fecha: '2027-03-31' } });

		expect(fila(filas, 1).errorFecha).toBeNull();
		expect(fila(filas, 2).errorFecha).toBe(
			'Vence el mismo día que la cuota 1: cada cuota debe vencer después de la anterior.',
		);
		expect(fila(filas, 2).fechaDescribedBy).toBe('cuota-2-dia cuota-2-error-fecha');
	});

	it('una fecha anterior a la de la cuota anterior cita esa fecha con su día largo', () => {
		const filas = filasDe({ 2: { fecha: '2027-03-30' } });

		expect(fila(filas, 2).errorFecha).toBe(
			'Debe vencer después de la cuota 1 (miércoles 31/03/2027).',
		);
	});

	it('si la cuota anterior no tiene fecha, compara con la más cercana que sí la tiene', () => {
		const filas = filasDe({ 2: { fecha: '' }, 3: { fecha: '2027-03-15' } });

		expect(fila(filas, 2).errorFecha).toBeNull();
		expect(fila(filas, 3).errorFecha).toBe(
			'Debe vencer después de la cuota 1 (miércoles 31/03/2027).',
		);
	});

	it('cuotasConError cuenta las filas marcadas', () => {
		expect(cuotasConError(filasDe({}))).toBe(0);
		expect(
			cuotasConError(filasDe({ 2: { fecha: '2027-03-31' }, 5: { fecha: '2026-07-15' } })),
		).toBe(2);
	});
});

describe('cronograma-anio.logic · avisos (no bloquean)', () => {
	it('una fecha en sábado o en domingo avisa y se enlaza al campo', () => {
		const filas = filasDe({ 1: { fecha: '2027-03-27' } }, []);
		const domingo = filasDe({ 1: { fecha: '2027-03-28' } }, []);

		expect(fila(filas, 1).avisoFecha).toBe(
			'Cae sábado: el colegio suele moverla al viernes anterior.',
		);
		expect(fila(filas, 1).fechaDescribedBy).toBe('cuota-1-dia cuota-1-aviso-fecha');
		expect(fila(domingo, 1).avisoFecha).toBe(
			'Cae domingo: revisa si corresponde el viernes anterior.',
		);
	});

	it('una fecha con error no suma el aviso de fin de semana', () => {
		const filas = filasDe({ 1: { fecha: '2027-04-03' }, 2: { fecha: '2027-04-03' } }, []);

		expect(fila(filas, 1).avisoFecha).toBe(
			'Cae sábado: el colegio suele moverla al viernes anterior.',
		);
		expect(fila(filas, 2).errorFecha).not.toBeNull();
		expect(fila(filas, 2).avisoFecha).toBeNull();
	});

	it('una etiqueta repetida (sin distinguir mayúsculas ni espacios) avisa en las dos cuotas', () => {
		const filas = filasDe({ 2: { etiqueta: ' marzo ' } });

		expect(fila(filas, 1).avisoEtiqueta).toBe('Otra cuota también se llama «Marzo».');
		expect(fila(filas, 2).avisoEtiqueta).toBe('Otra cuota también se llama «marzo».');
		expect(fila(filas, 2).etiquetaDescribedBy).toBe('cuota-2-aviso-etiqueta');
		expect(fila(filas, 3).avisoEtiqueta).toBeNull();
	});
});

describe('cronograma-anio.logic · borrador (D3)', () => {
	it('conEtiqueta y conFecha quitan el campo cuando el valor vuelve exactamente a la base', () => {
		const marzo = fila(filasDe({}), 1);

		let borrador = conEtiqueta({}, marzo, 'Marzo 2027');
		borrador = conFecha(borrador, marzo, '2027-03-30');
		expect(borrador).toEqual({ 1: { etiqueta: 'Marzo 2027', fecha: '2027-03-30' } });

		borrador = conEtiqueta(borrador, marzo, 'Marzo');
		expect(borrador).toEqual({ 1: { fecha: '2027-03-30' } });

		borrador = conFecha(borrador, marzo, '2027-03-31');
		expect(borrador).toEqual({});
	});

	it('un espacio al final se conserva mientras se tipea, pero no cuenta como cambio', () => {
		const borrador = conEtiqueta({}, fila(filasDe({}), 1), 'Marzo ');
		const filas = filasDe(borrador);

		expect(borrador).toEqual({ 1: { etiqueta: 'Marzo ' } });
		expect(fila(filas, 1).etiqueta).toBe('Marzo ');
		expect(fila(filas, 1).editada).toBe(false);
		expect(hayCambiosCronograma(filas)).toBe(false);
	});

	it('vaciar una fecha guardada es un cambio y la informa el motivo', () => {
		const filas = filasDe({ 3: { fecha: '' } });

		expect(fila(filas, 3).editada).toBe(true);
		expect(fila(filas, 3).errorFecha).toBeNull();
		expect(motivoNoRevisarCronograma(filas, false)).toBe('Falta la fecha de la cuota 3.');
	});

	it('rellenarFechas completa solo las vacías y nunca pisa una fecha tipeada (U4)', () => {
		const tipeada: BorradorCronograma = { 3: { fecha: '2027-05-20' } };

		const borrador = rellenarFechas(2027, filasCronograma(2027, [], tipeada), tipeada);

		expect(borrador[3]).toEqual({ fecha: '2027-05-20' });
		expect(borrador[6]).toEqual({ fecha: '2027-08-13' });
		expect(Object.keys(borrador)).toHaveLength(10);
	});

	it('rellenarFechas pasa por conFecha: si la sugerida es la guardada, el campo sale del borrador (C16)', () => {
		const vaciada: BorradorCronograma = {
			2: { fecha: '' },
			4: { etiqueta: 'Junio (1)', fecha: '' },
		};

		const borrador = rellenarFechas(2027, filasDe(vaciada), vaciada);

		expect(borrador).toEqual({ 4: { etiqueta: 'Junio (1)' } });
	});
});

describe('cronograma-anio.logic · motivo para no revisar', () => {
	it.each<[string, BorradorCronograma, CuotaCronograma[] | null, string]>([
		[
			'sin las 10 fechas',
			{},
			[],
			'Faltan las fechas de las 10 cuotas: escríbelas o usa «Proponer fechas habituales».',
		],
		['sin una fecha', { 3: { fecha: '' } }, null, 'Falta la fecha de la cuota 3.'],
		[
			'sin varias fechas',
			{ 3: { fecha: '' }, 4: { fecha: '' }, 7: { fecha: '' } },
			null,
			'Faltan las fechas de las cuotas 3, 4 y 7.',
		],
		['sin una etiqueta', { 2: { etiqueta: '' } }, null, 'Falta la etiqueta de la cuota 2.'],
		[
			'sin varias etiquetas',
			{ 2: { etiqueta: '' }, 5: { etiqueta: ' ' } },
			null,
			'Faltan las etiquetas de las cuotas 2 y 5.',
		],
		[
			'con una cuota marcada',
			{ 2: { fecha: '2027-03-31' } },
			null,
			'Corrige la cuota marcada para revisar los cambios.',
		],
		[
			'con varias cuotas marcadas',
			{ 2: { fecha: '2027-03-31' }, 5: { fecha: '2026-07-15' } },
			null,
			'Corrige las 2 cuotas marcadas para revisar los cambios.',
		],
	])('%s', (_caso, borrador, cuotas, motivo) => {
		expect(motivoNoRevisarCronograma(filasDe(borrador, cuotas ?? guardado2027()), false)).toBe(
			motivo,
		);
	});

	it('la base incierta manda sobre todo lo demás', () => {
		expect(motivoNoRevisarCronograma(filasCronograma(2027, [], {}), true)).toBe(
			'Vuelve a leer el cronograma antes de guardar: no se pudo confirmar qué quedó guardado.',
		);
	});

	it('un cronograma completo y válido no tiene motivo', () => {
		expect(
			motivoNoRevisarCronograma(filasDe({ 1: { fecha: '2027-03-30' } }), false),
		).toBeNull();
	});

	it('numerosLegibles une en español', () => {
		expect(numerosLegibles([3])).toBe('3');
		expect(numerosLegibles([3, 4])).toBe('3 y 4');
		expect(numerosLegibles([3, 4, 7])).toBe('3, 4 y 7');
	});
});

describe('cronograma-anio.logic · payload (INV-PG05, INV-S05)', () => {
	it('van las 10 cuotas en orden, con la etiqueta recortada, la fecha YYYY-MM-DD y el rowVersion de cada una', () => {
		const desordenadas = guardado2027().reverse();
		const filas = filasCronograma(2027, desordenadas, { 1: { etiqueta: '  Marzo 2027 ' } });

		const payload = armarPayloadCronograma(2027, filas);

		expect(payload.anio).toBe(2027);
		expect(payload.cuotas.map((c) => c.numero)).toEqual(NUMEROS);
		expect(payload.cuotas[0]).toEqual({
			numero: 1,
			etiqueta: 'Marzo 2027',
			fechaVencimiento: '2027-03-31',
			rowVersion: 'v1',
		});
		expect(payload.cuotas.map((c) => c.rowVersion)).toEqual(NUMEROS.map((n) => `v${n}`));
		expect(payload.cuotas.every((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.fechaVencimiento))).toBe(
			true,
		);
	});

	it('en un año nuevo las 10 van con rowVersion nulo, nunca vacío', () => {
		const borrador = rellenarFechas(2027, filasCronograma(2027, [], {}), {});

		const payload = armarPayloadCronograma(2027, filasCronograma(2027, [], borrador));

		expect(payload.cuotas).toHaveLength(10);
		expect(payload.cuotas.every((c) => c.rowVersion === null)).toBe(true);
		expect(payload.cuotas[6]).toMatchObject({
			etiqueta: 'Setiembre',
			fechaVencimiento: '2027-09-30',
		});
	});

	it('si faltan cuotas guardadas (solo posible por SQL), esas van con rowVersion nulo y las demás con el suyo', () => {
		const siete = guardado2027().slice(0, 7);

		const payload = armarPayloadCronograma(2027, filasDe({}, siete));

		expect(payload.cuotas.map((c) => c.rowVersion)).toEqual([
			'v1',
			'v2',
			'v3',
			'v4',
			'v5',
			'v6',
			'v7',
			null,
			null,
			null,
		]);
	});
});
