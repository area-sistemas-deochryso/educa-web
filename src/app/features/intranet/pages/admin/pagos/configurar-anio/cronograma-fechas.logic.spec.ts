import { describe, expect, it } from 'vitest';

import {
	diaDeLaSemana,
	diasEntre,
	esFechaIso,
	etiquetaSugerida,
	fechaConDiaLargo,
	fechaSugerida,
	numeroDiaSemana,
} from './cronograma-fechas.logic';

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('cronograma-fechas.logic · sugerencias (U4)', () => {
	it('las etiquetas van de Marzo a Diciembre, con «Setiembre» en la cuota 7', () => {
		expect(NUMEROS.map(etiquetaSugerida)).toEqual([
			'Marzo',
			'Abril',
			'Mayo',
			'Junio',
			'Julio',
			'Agosto',
			'Setiembre',
			'Octubre',
			'Noviembre',
			'Diciembre',
		]);
	});

	it('2026 reproduce el cronograma de TEST (seed-887): fin de mes, el 15 en julio, agosto y diciembre', () => {
		expect(NUMEROS.map((n) => fechaSugerida(2026, n))).toEqual([
			'2026-03-31',
			'2026-04-30',
			'2026-05-29',
			'2026-06-30',
			'2026-07-15',
			'2026-08-14',
			'2026-09-30',
			'2026-10-30',
			'2026-11-30',
			'2026-12-15',
		]);
	});

	it('2027: un sábado o un domingo pasan al viernes anterior (08-15 y 10-31 caen domingo)', () => {
		expect(NUMEROS.map((n) => fechaSugerida(2027, n))).toEqual([
			'2027-03-31',
			'2027-04-30',
			'2027-05-31',
			'2027-06-30',
			'2027-07-15',
			'2027-08-13',
			'2027-09-30',
			'2027-10-29',
			'2027-11-30',
			'2027-12-15',
		]);
	});

	it('ninguna fecha sugerida cae en fin de semana', () => {
		for (const anio of [2026, 2027, 2028]) {
			const dias = NUMEROS.map((n) => numeroDiaSemana(fechaSugerida(anio, n)));
			expect(dias.filter((d) => d === 0 || d === 6)).toEqual([]);
		}
	});
});

describe('cronograma-fechas.logic · lectura', () => {
	it('el día de la semana va largo y en español', () => {
		expect(diaDeLaSemana('2027-03-31')).toBe('miércoles');
		expect(diaDeLaSemana('2027-08-13')).toBe('viernes');
		expect(numeroDiaSemana('2026-05-30')).toBe(6);
		expect(numeroDiaSemana('2026-05-31')).toBe(0);
	});

	it('la fecha completa lleva el día largo, también desde el formato del BE', () => {
		expect(fechaConDiaLargo('2027-03-31')).toBe('miércoles 31/03/2027');
		expect(fechaConDiaLargo('2027-03-31T00:00:00')).toBe('miércoles 31/03/2027');
	});

	it('esFechaIso acepta un día que existe y rechaza el resto', () => {
		expect(esFechaIso('2027-03-31')).toBe(true);
		expect(esFechaIso('2028-02-29')).toBe(true);
		expect(esFechaIso('2027-02-30')).toBe(false);
		expect(esFechaIso('2027-02-29')).toBe(false);
		expect(esFechaIso('31/03/2027')).toBe(false);
		expect(esFechaIso('20271-03-31')).toBe(false);
		expect(esFechaIso('')).toBe(false);
	});

	it('diasEntre es negativo si la fecha nueva es anterior y cruza meses sin correrse', () => {
		expect(diasEntre('2027-03-31', '2027-03-29')).toBe(-2);
		expect(diasEntre('2027-03-31', '2027-04-02')).toBe(2);
		expect(diasEntre('2027-03-31', '2027-03-31')).toBe(0);
		expect(diasEntre('2027-10-29', '2027-11-01')).toBe(3);
	});
});
