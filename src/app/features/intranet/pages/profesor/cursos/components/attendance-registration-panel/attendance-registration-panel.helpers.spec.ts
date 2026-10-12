// * Tests for findNearestValidDate — bidirectional "go to valid date" shortcut helper.
// #region Imports
import { describe, expect, it } from 'vitest';

import { findNearestValidDate } from './attendance-registration-panel.helpers';

// #endregion

// #region Tests
describe('findNearestValidDate', () => {
	it('returns the same date when it already matches the target day', () => {
		// 2026-07-16 is a Thursday (day 4)
		const from = new Date(2026, 6, 16);
		const result = findNearestValidDate(from, 4);
		expect(result.getDate()).toBe(16);
	});

	it('searches forward when the nearest match is ahead', () => {
		// 2026-07-16 is Thursday (4); Friday (5) is 1 day ahead vs 6 days back
		const from = new Date(2026, 6, 16);
		const result = findNearestValidDate(from, 5);
		expect(result.getDate()).toBe(17);
	});

	it('searches backward when the nearest match is behind', () => {
		// 2026-07-16 is Thursday (4); Wednesday (3) is 1 day back vs 6 days ahead
		const from = new Date(2026, 6, 16);
		const result = findNearestValidDate(from, 3);
		expect(result.getDate()).toBe(15);
	});

	it('picks the strictly closer direction even when both are multi-day', () => {
		// 2026-07-16 is Thursday (4); Monday (1) is 3 days back (13) vs 4 days forward (20).
		const from = new Date(2026, 6, 16);
		const result = findNearestValidDate(from, 1);
		expect(result.getDate()).toBe(13);
	});

	describe('with notAfter (no future dates)', () => {
		it('falls back to the previous occurrence when the nearest match is in the future', () => {
			// Monday 2026-10-12: nearest Thursday is the 15th (3 ahead) -> must be Thursday 08/10.
			const monday = new Date(2026, 9, 12);
			const result = findNearestValidDate(monday, 4, monday);
			expect(result.getMonth()).toBe(9);
			expect(result.getDate()).toBe(8);
		});

		it('returns today when today is a schedule day', () => {
			const thursday = new Date(2026, 9, 15);
			const result = findNearestValidDate(thursday, 4, thursday);
			expect(result.getDate()).toBe(15);
		});

		it('keeps the nearest match when it is not in the future', () => {
			// Wednesday 14/10 -> nearest Thursday is 15th (future); nearest Tuesday is 13th (past).
			const wednesday = new Date(2026, 9, 14);
			expect(findNearestValidDate(wednesday, 2, wednesday).getDate()).toBe(13);
		});
	});
});
// #endregion
