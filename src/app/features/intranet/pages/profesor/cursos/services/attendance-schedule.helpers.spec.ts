import { describe, expect, it } from 'vitest';

import { isOffScheduleDate } from './attendance-schedule.helpers';

describe('isOffScheduleDate', () => {
	// 2026-10-05 is a Monday.
	it('is false on the scheduled weekday', () => {
		expect(isOffScheduleDate('2026-10-05', 1)).toBe(false);
	});

	it('is true on any other weekday', () => {
		expect(isOffScheduleDate('2026-10-06', 1)).toBe(true);
	});

	it('is false when the course has no expected weekday', () => {
		expect(isOffScheduleDate('2026-10-06', null)).toBe(false);
	});
});
