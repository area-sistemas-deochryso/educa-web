// #region Imports
import { describe, expect, it } from 'vitest';

import {
	isExactDate,
	isLastDaysOfMonth,
	isMonth,
	isWeekend,
	isWithinDateRange,
	isWithinMonthDays,
} from './notifications-date.utils';
// #endregion

// #region Tests
describe('notifications-date.utils', () => {
	// Mes 1-12 en el helper de test para leer como calendario
	const date = (y: number, m: number, day: number) => new Date(y, m - 1, day);

	describe('isWithinMonthDays', () => {
		it('incluye los límites del rango', () => {
			expect(isWithinMonthDays(date(2026, 3, 5), 5, 10)).toBe(true);
			expect(isWithinMonthDays(date(2026, 3, 10), 5, 10)).toBe(true);
		});

		it('excluye fuera del rango', () => {
			expect(isWithinMonthDays(date(2026, 3, 4), 5, 10)).toBe(false);
			expect(isWithinMonthDays(date(2026, 3, 11), 5, 10)).toBe(false);
		});
	});

	describe('isMonth', () => {
		it('usa mes 1-12 (no 0-11)', () => {
			expect(isMonth(date(2026, 1, 15), 1)).toBe(true);
			expect(isMonth(date(2026, 12, 15), 12)).toBe(true);
			expect(isMonth(date(2026, 3, 15), 2)).toBe(false);
		});
	});

	describe('isWithinDateRange', () => {
		it('rango dentro de un mismo mes', () => {
			expect(isWithinDateRange(date(2026, 3, 10), 3, 5, 3, 15)).toBe(true);
			expect(isWithinDateRange(date(2026, 3, 4), 3, 5, 3, 15)).toBe(false);
			expect(isWithinDateRange(date(2026, 3, 16), 3, 5, 3, 15)).toBe(false);
			expect(isWithinDateRange(date(2026, 4, 10), 3, 5, 3, 15)).toBe(false);
		});

		it('rango entre meses: mes inicial desde startDay', () => {
			expect(isWithinDateRange(date(2026, 3, 20), 3, 20, 5, 10)).toBe(true);
			expect(isWithinDateRange(date(2026, 3, 19), 3, 20, 5, 10)).toBe(false);
		});

		it('rango entre meses: mes final hasta endDay', () => {
			expect(isWithinDateRange(date(2026, 5, 10), 3, 20, 5, 10)).toBe(true);
			expect(isWithinDateRange(date(2026, 5, 11), 3, 20, 5, 10)).toBe(false);
		});

		it('rango entre meses: meses intermedios completos', () => {
			expect(isWithinDateRange(date(2026, 4, 1), 3, 20, 5, 10)).toBe(true);
			expect(isWithinDateRange(date(2026, 4, 30), 3, 20, 5, 10)).toBe(true);
		});

		it('rango entre meses: fuera de los meses extremos', () => {
			expect(isWithinDateRange(date(2026, 2, 25), 3, 20, 5, 10)).toBe(false);
			expect(isWithinDateRange(date(2026, 6, 1), 3, 20, 5, 10)).toBe(false);
		});
	});

	describe('isExactDate', () => {
		it('coincide mes y día sin importar el año', () => {
			expect(isExactDate(date(2026, 7, 28), 7, 28)).toBe(true);
			expect(isExactDate(date(2027, 7, 28), 7, 28)).toBe(true);
		});

		it('falla si difiere mes o día', () => {
			expect(isExactDate(date(2026, 7, 27), 7, 28)).toBe(false);
			expect(isExactDate(date(2026, 8, 28), 7, 28)).toBe(false);
		});
	});

	describe('isLastDaysOfMonth', () => {
		it('últimos 3 días de un mes de 31', () => {
			expect(isLastDaysOfMonth(date(2026, 3, 28), 3)).toBe(false);
			expect(isLastDaysOfMonth(date(2026, 3, 29), 3)).toBe(true);
			expect(isLastDaysOfMonth(date(2026, 3, 31), 3)).toBe(true);
		});

		it('febrero no bisiesto (28 días)', () => {
			expect(isLastDaysOfMonth(date(2026, 2, 25), 3)).toBe(false);
			expect(isLastDaysOfMonth(date(2026, 2, 26), 3)).toBe(true);
		});

		it('febrero bisiesto (29 días)', () => {
			expect(isLastDaysOfMonth(date(2028, 2, 26), 3)).toBe(false);
			expect(isLastDaysOfMonth(date(2028, 2, 27), 3)).toBe(true);
		});
	});

	describe('isWeekend', () => {
		it('sábado y domingo', () => {
			expect(isWeekend(date(2026, 11, 7))).toBe(true);
			expect(isWeekend(date(2026, 11, 8))).toBe(true);
		});

		it('viernes y lunes no', () => {
			expect(isWeekend(date(2026, 11, 6))).toBe(false);
			expect(isWeekend(date(2026, 11, 9))).toBe(false);
		});
	});
});
// #endregion
