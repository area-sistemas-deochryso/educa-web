// #region Imports
import { describe, expect, it } from 'vitest';

import { createDateRange, isDateInRange, validateDateRange } from './date-range.utils';
// #endregion

// #region Tests
describe('date-range.utils', () => {
	const d = (iso: string) => new Date(iso);

	describe('validateDateRange', () => {
		it('devuelve null para un rango válido', () => {
			expect(validateDateRange('2026-03-01T00:00:00', '2026-03-31T00:00:00')).toBeNull();
		});

		it('acepta fin igual a inicio (invariante fin >= inicio)', () => {
			expect(validateDateRange(d('2026-03-01T10:00:00'), d('2026-03-01T10:00:00'))).toBeNull();
		});

		it.each([null, undefined, ''])('inicio %p es requerido', (start) => {
			expect(validateDateRange(start, '2026-03-01')).toEqual({
				field: 'start',
				message: 'Fecha de inicio requerida',
			});
		});

		it.each([null, undefined, ''])('fin %p es requerido', (end) => {
			expect(validateDateRange('2026-03-01', end)).toEqual({
				field: 'end',
				message: 'Fecha de fin requerida',
			});
		});

		it('inicio inválido', () => {
			expect(validateDateRange('no-es-fecha', '2026-03-01')?.field).toBe('start');
		});

		it('fin inválido', () => {
			expect(validateDateRange('2026-03-01', 'no-es-fecha')?.field).toBe('end');
		});

		it('fin anterior a inicio → error de rango', () => {
			expect(validateDateRange('2026-03-10T00:00:00', '2026-03-09T00:00:00')?.field).toBe('range');
		});

		it('prioriza inicio requerido sobre fin requerido', () => {
			expect(validateDateRange(null, null)?.field).toBe('start');
		});
	});

	describe('createDateRange', () => {
		it('devuelve el rango cuando es válido', () => {
			const start = d('2026-03-01T00:00:00');
			const end = d('2026-03-02T00:00:00');
			expect(createDateRange(start, end)).toEqual({ start, end });
		});

		it('lanza con el mensaje de validación cuando es inválido', () => {
			expect(() => createDateRange(d('2026-03-02T00:00:00'), d('2026-03-01T00:00:00'))).toThrow(
				/DateRange inválido: La fecha de fin/,
			);
		});
	});

	describe('isDateInRange', () => {
		const range = { start: d('2026-03-01T00:00:00'), end: d('2026-03-31T00:00:00') };

		it('incluye ambos extremos', () => {
			expect(isDateInRange(d('2026-03-01T00:00:00'), range)).toBe(true);
			expect(isDateInRange(d('2026-03-31T00:00:00'), range)).toBe(true);
		});

		it('incluye una fecha interior', () => {
			expect(isDateInRange(d('2026-03-15T12:00:00'), range)).toBe(true);
		});

		it('excluye fechas fuera del rango', () => {
			expect(isDateInRange(d('2026-02-28T23:59:59'), range)).toBe(false);
			expect(isDateInRange(d('2026-03-31T00:00:01'), range)).toBe(false);
		});
	});
});
// #endregion
