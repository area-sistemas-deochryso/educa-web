// * Tests for the literal-scale letter lookup with decimal grades (INV-C13).
// #region Imports
import { describe, expect, it } from 'vitest';

import type { ConfiguracionLiteralDto } from '@data/models';

import { LiteralScale } from './literal-scale.adapter';
import { VigesimalScale } from './vigesimal-scale.adapter';
// #endregion

// #region Fixtures
function literal(
	orden: number,
	letra: string,
	notaMinima: number,
	notaMaxima: number,
	esAprobatoria: boolean,
): ConfiguracionLiteralDto {
	return { id: orden, letra, descripcion: letra, notaMinima, notaMaxima, orden, esAprobatoria };
}

// Escala de Primaria 2026: AD 18-20, A 14-17, B 11-13, C 0-10.
const PRIMARIA = [
	literal(1, 'AD', 18, 20, true),
	literal(2, 'A', 14, 17, true),
	literal(3, 'B', 11, 13, false),
	literal(4, 'C', 0, 10, false),
];

// Escala con hueco entre enteros: el 10 no pertenece a ningun rango.
const CON_HUECO = [
	literal(1, 'AD', 18, 20, true),
	literal(2, 'A', 14, 16, true),
	literal(3, 'B', 11, 12, false),
	literal(4, 'C', 0, 9, false),
];

// Fixture compartida de INV-C13: [nota, letra esperada].
const FIXTURE_INV_C13: [number, string][] = [
	[0, 'C'],
	[10, 'C'],
	[10.4, 'C'],
	[10.5, 'B'],
	[10.9, 'B'],
	[11, 'B'],
	[13.4, 'B'],
	[13.5, 'A'],
	[13.9, 'A'],
	[14, 'A'],
	[17.4, 'A'],
	[17.5, 'AD'],
	[17.9, 'AD'],
	[18, 'AD'],
	[20, 'AD'],
];
// #endregion

describe('LiteralScale — letra con decimales (INV-C13)', () => {
	const scale = new LiteralScale(PRIMARIA);

	it.each(FIXTURE_INV_C13)('format(%s) -> %s', (nota, letra) => {
		expect(scale.format(nota)).toBe(letra);
	});

	it.each(FIXTURE_INV_C13)('classify(%s) uses the letter %s', (nota, letra) => {
		expect(scale.classify(nota).label.startsWith(`${letra} - `)).toBe(true);
	});

	it('isAprobatoria follows the letter, not the raw decimal', () => {
		expect(scale.isAprobatoria(10.4)).toBe(false); // C
		expect(scale.isAprobatoria(13.4)).toBe(false); // B
		expect(scale.isAprobatoria(13.5)).toBe(true); // A
		expect(scale.isAprobatoria(17.4)).toBe(true); // A
	});

	it('the H27 case: a partial of 10.3 is a C, not "10.3"', () => {
		expect(scale.format(10.3)).toBe('C');
	});

	it('findLiteral does not mutate the grade it receives', () => {
		const nota = 10.3;
		scale.findLiteral(nota);
		expect(nota).toBe(10.3);
	});
});

describe('LiteralScale — escala con huecos entre enteros (INV-C13)', () => {
	const scale = new LiteralScale(CON_HUECO);

	it('falls back to the figure with 1 decimal when the rounded integer has no range', () => {
		expect(scale.findLiteral(10.3)).toBeNull();
		expect(scale.format(10.3)).toBe('10.3');
		expect(scale.format(9.6)).toBe('9.6'); // redondea a 10: hueco
	});

	it('classify returns the neutral classification without a letter', () => {
		expect(scale.classify(10.3)).toEqual({
			severity: 'secondary',
			cssClass: '',
			label: '-',
			esAprobatoria: false,
		});
		expect(scale.isAprobatoria(10.3)).toBe(false);
	});

	it('still resolves the letters on both sides of the gap', () => {
		expect(scale.format(9.4)).toBe('C');
		expect(scale.format(10.5)).toBe('B');
	});
});

describe('VigesimalScale — sin cambios (INV-C13)', () => {
	it('keeps formatting the numeric grade with 1 decimal', () => {
		expect(new VigesimalScale().format(10.3)).toBe('10.3');
	});
});
