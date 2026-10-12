import { describe, expect, it } from 'vitest';
import { PORCENTAJE_MAXIMO, PORCENTAJE_MINIMO, pesoAPorcentaje, porcentajeAPeso } from './peso-porcentaje';

describe('peso-porcentaje', () => {
	it('exposes the percentage range derived from the 0-1 contract', () => {
		expect(PORCENTAJE_MINIMO).toBe(1);
		expect(PORCENTAJE_MAXIMO).toBe(100);
	});

	it('loads an existing 0-1 weight as an integer percentage (never 20 vs 0.20 swapped)', () => {
		expect(pesoAPorcentaje(0.2)).toBe(20);
		expect(pesoAPorcentaje(0.15)).toBe(15);
		expect(pesoAPorcentaje(1)).toBe(100);
		expect(pesoAPorcentaje(0.01)).toBe(1);
	});

	it('sends a percentage as the 0-1 contract without floating point noise', () => {
		expect(porcentajeAPeso(20)).toBe(0.2);
		expect(porcentajeAPeso(15)).toBe(0.15);
		expect(porcentajeAPeso(7)).toBe(0.07);
		expect(porcentajeAPeso(100)).toBe(1);
	});

	it('round-trips every integer percentage in range', () => {
		for (let pct = PORCENTAJE_MINIMO; pct <= PORCENTAJE_MAXIMO; pct++) {
			expect(pesoAPorcentaje(porcentajeAPeso(pct))).toBe(pct);
		}
	});
});
