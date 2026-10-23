// * Tests for the partial-average helpers (INV-C12): coverage 0 %, partial, 100 %.
// #region Imports
import { describe, expect, it } from 'vitest';

import type { ConfiguracionCalificacionListDto } from '@data/models';
import {
	calcularCoberturaPorPesos,
	calcularPromedioParcial,
	formatEquivalenteNumerico,
	getRotuloParcial,
} from './calificacion-config.utils';
// #endregion

describe('calcularPromedioParcial (INV-C12)', () => {
	it('returns null with no graded evaluations (coverage 0 %)', () => {
		expect(calcularPromedioParcial([])).toBeNull();
	});

	it('normalizes by the graded weight, not the whole course', () => {
		// Una nota de 15.5 con peso 20 %: el parcial es 15.5, no 3.1 (el acumulado de INV-C04).
		expect(calcularPromedioParcial([{ nota: 15.5, peso: 0.2 }])).toBe(15.5);
	});

	it('weights several graded evaluations and rounds to 1 decimal', () => {
		expect(
			calcularPromedioParcial([
				{ nota: 16, peso: 0.3 },
				{ nota: 14, peso: 0.2 },
			]),
		).toBe(15.2);
	});

	it('equals the official average when weights add up to 1', () => {
		expect(
			calcularPromedioParcial([
				{ nota: 10, peso: 0.5 },
				{ nota: 20, peso: 0.5 },
			]),
		).toBe(15);
	});
});

describe('calcularCoberturaPorPesos (INV-C12)', () => {
	it('is 0 with no graded evaluations', () => {
		expect(calcularCoberturaPorPesos([])).toBe(0);
	});

	it('is the graded weight as a rounded percentage', () => {
		expect(calcularCoberturaPorPesos([{ peso: 0.2 }])).toBe(20);
		expect(calcularCoberturaPorPesos([{ peso: 0.3 }, { peso: 0.25 }])).toBe(55);
	});

	it('caps at 100 when weights overshoot', () => {
		expect(calcularCoberturaPorPesos([{ peso: 0.7 }, { peso: 0.6 }])).toBe(100);
	});
});

describe('getRotuloParcial (INV-C12)', () => {
	it('labels the partial average while coverage is below 100 %', () => {
		expect(getRotuloParcial(20)).toBe('Parcial · 20 % evaluado');
	});

	it('has no label at 100 % coverage', () => {
		expect(getRotuloParcial(100)).toBeNull();
	});
});

describe('formatEquivalenteNumerico', () => {
	const literal = { tipoCalificacion: 'LITERAL', literales: [{ letra: 'A' }] } as unknown as ConfiguracionCalificacionListDto;
	const numerica = { tipoCalificacion: 'NUMERICO', literales: [] } as unknown as ConfiguracionCalificacionListDto;

	it('shows the number next to the letter on the literal scale', () => {
		expect(formatEquivalenteNumerico(16.4, literal)).toBe('16.4');
		expect(formatEquivalenteNumerico(15, literal)).toBe('15.0');
	});

	it('has no equivalent on the numeric scale or without config', () => {
		expect(formatEquivalenteNumerico(16.4, numerica)).toBeNull();
		expect(formatEquivalenteNumerico(16.4, null)).toBeNull();
	});

	it('has no equivalent without a grade', () => {
		expect(formatEquivalenteNumerico(null, literal)).toBeNull();
	});
});
