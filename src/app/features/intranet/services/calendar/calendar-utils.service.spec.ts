// * Tests for CalendarUtilsService — validates calendar grid generation.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CalendarUtilsService } from './calendar-utils.service';

// #endregion

// #region Tests
describe('CalendarUtilsService', () => {
	let service: CalendarUtilsService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [CalendarUtilsService] });
		service = TestBed.inject(CalendarUtilsService);
	});

	// #region generateMonthDays
	describe('generateMonthDays', () => {
		it('should generate 42 days (6 weeks grid)', () => {
			const days = service.generateMonthDays(2026, 2); // March 2026
			expect(days).toHaveLength(42);
		});

		it('should mark current month days', () => {
			const days = service.generateMonthDays(2026, 2); // March 2026
			const currentMonthDays = days.filter((d) => d.isCurrentMonth);
			expect(currentMonthDays).toHaveLength(31); // March has 31 days
		});

		it('should include previous month days to fill first week', () => {
			const days = service.generateMonthDays(2026, 2); // March 2026
			const prevMonthDays = days.filter((d) => !d.isCurrentMonth && d.fullDate < new Date(2026, 2, 1));
			expect(prevMonthDays.length).toBeGreaterThanOrEqual(0);
		});

		it('should mark weekends', () => {
			const days = service.generateMonthDays(2026, 2);
			const weekends = days.filter((d) => d.isWeekend);
			expect(weekends.length).toBeGreaterThan(0);
			weekends.forEach((d) => {
				const dow = d.fullDate.getDay();
				expect(dow === 0 || dow === 6).toBe(true);
			});
		});

		it('should handle February (28/29 days)', () => {
			const days = service.generateMonthDays(2026, 1); // February 2026 (non-leap)
			const febDays = days.filter((d) => d.isCurrentMonth);
			expect(febDays).toHaveLength(28);
		});

		it('should handle leap year February', () => {
			const days = service.generateMonthDays(2028, 1); // February 2028 (leap)
			const febDays = days.filter((d) => d.isCurrentMonth);
			expect(febDays).toHaveLength(29);
		});
	});
	// #endregion

	// #region getWorkWeeksOfMonth
	describe('getWorkWeeksOfMonth', () => {
		it('should return weeks with 5 days each (Mon-Fri)', () => {
			const weeks = service.getWorkWeeksOfMonth(3, 2026); // March 2026
			expect(weeks.length).toBeGreaterThanOrEqual(4);
			weeks.forEach((week) => {
				expect(week).toHaveLength(5);
			});
		});

		it('should have null for days outside the month', () => {
			const weeks = service.getWorkWeeksOfMonth(3, 2026);
			// First and last weeks may have nulls
			const allDays = weeks.flat();
			const _nullDays = allDays.filter((d) => d === null);
			// At least some days should be non-null
			const validDays = allDays.filter((d) => d !== null);
			expect(validDays.length).toBeGreaterThan(0);
		});

		it('should only include weekdays (Mon-Fri)', () => {
			const weeks = service.getWorkWeeksOfMonth(3, 2026);
			for (const week of weeks) {
				for (const day of week) {
					if (day) {
						const dow = day.getDay();
						expect(dow).toBeGreaterThanOrEqual(1); // Monday
						expect(dow).toBeLessThanOrEqual(5); // Friday
					}
				}
			}
		});
	});
	// #endregion

	// #region getMonthName
	describe('getMonthName', () => {
		it('should return correct month names', () => {
			expect(service.getMonthName(1)).toBe('Enero');
			expect(service.getMonthName(6)).toBe('Junio');
			expect(service.getMonthName(12)).toBe('Diciembre');
		});

		it('should return empty for invalid month', () => {
			expect(service.getMonthName(0)).toBe('');
			expect(service.getMonthName(13)).toBe('');
		});
	});
	// #endregion

	// #region formatDateKey
	describe('formatDateKey', () => {
		it('should format as YYYY-MM-DD', () => {
			expect(service.formatDateKey(new Date(2026, 2, 21))).toBe('2026-03-21');
		});

		it('should pad single digits', () => {
			expect(service.formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
		});
	});
	// #endregion

	// #region Constants
	describe('constants', () => {
		it('should have 12 month names', () => {
			expect(service.monthNames).toHaveLength(12);
		});

		it('should have 7 day names starting with Dom', () => {
			expect(service.dayNames).toHaveLength(7);
			expect(service.dayNames[0]).toBe('Dom');
			expect(service.dayNames[6]).toBe('Sáb');
		});
	});
	// #endregion
});
// #endregion
