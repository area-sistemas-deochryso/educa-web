// Tests for calificacion utils — invariante INV-C04 (promedio = Σ(nota × peso), redondeo 1 decimal,
// pesos NO normalizados) y INV-T04 parcial (ventana de edición de 2 meses desde fechaCalificacion).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calcularPromedioPonderado, esNotaEditable } from './calificacion.utils';

describe('calcularPromedioPonderado — INV-C04', () => {
	it('retorna null para lista vacía', () => {
		expect(calcularPromedioPonderado([])).toBeNull();
	});

	it('calcula promedio ponderado con pesos que suman 1.0', () => {
		const notas = [
			{ nota: 15, peso: 0.5 },
			{ nota: 10, peso: 0.5 },
		];
		expect(calcularPromedioPonderado(notas)).toBe(12.5);
	});

	it('NO normaliza pesos que no suman 1.0 (fiel al backend)', () => {
		// Si normalizara, el promedio sería (15*0.2 + 10*0.2) / 0.4 = 12.5.
		// Como no normaliza: 15*0.2 + 10*0.2 = 5.0.
		const notas = [
			{ nota: 15, peso: 0.2 },
			{ nota: 10, peso: 0.2 },
		];
		expect(calcularPromedioPonderado(notas)).toBe(5.0);
	});

	it('redondea a 1 decimal (half-away-from-zero)', () => {
		// 0.333... * 20 + 0.333... * 18 + 0.333... * 16 = 17.99..., redondea a 18.0
		const notas = [
			{ nota: 20, peso: 0.333 },
			{ nota: 18, peso: 0.333 },
			{ nota: 16, peso: 0.334 },
		];
		const result = calcularPromedioPonderado(notas);
		expect(result).toBeCloseTo(18.0, 1);
	});

	it('maneja una sola nota con peso 1.0', () => {
		expect(calcularPromedioPonderado([{ nota: 14, peso: 1.0 }])).toBe(14);
	});

	it('acepta peso fraccionario mínimo', () => {
		expect(calcularPromedioPonderado([{ nota: 20, peso: 0.01 }])).toBe(0.2);
	});
});

describe('esNotaEditable — INV-T04 parcial (ventana de edición 2 meses)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('retorna true para nota dentro de los 2 meses', () => {
		vi.setSystemTime(new Date('2026-03-01T10:00:00Z'));
		expect(esNotaEditable('2026-02-15')).toBe(true);
	});

	it('retorna false para nota más vieja que 2 meses', () => {
		vi.setSystemTime(new Date('2026-05-01T10:00:00Z'));
		expect(esNotaEditable('2026-02-15')).toBe(false);
	});

	it('retorna true para nota del mismo día', () => {
		vi.setSystemTime(new Date('2026-04-15T10:00:00Z'));
		expect(esNotaEditable('2026-04-15')).toBe(true);
	});

	it('retorna false justo pasado el límite de 2 meses', () => {
		vi.setSystemTime(new Date('2026-04-16T10:00:00Z'));
		expect(esNotaEditable('2026-02-15')).toBe(false);
	});
});
