import { describe, expect, it } from 'vitest';

import { calcAttendancePercentage } from './attendance-percentage.utils';

describe('calcAttendancePercentage (INV-AC11)', () => {
	it('returns null with no registered classes instead of a false 0 %', () => {
		expect(calcAttendancePercentage(0, 0, 0)).toBeNull();
	});

	it('counts tardiness as attendance', () => {
		expect(calcAttendancePercentage(0, 1, 1)).toBe(100);
		expect(calcAttendancePercentage(8, 1, 10)).toBe(90);
	});

	it('returns a real 0 when there are classes but none attended', () => {
		expect(calcAttendancePercentage(0, 0, 4)).toBe(0);
	});

	it('rounds to the nearest integer', () => {
		expect(calcAttendancePercentage(1, 0, 3)).toBe(33);
		expect(calcAttendancePercentage(2, 0, 3)).toBe(67);
	});
});
