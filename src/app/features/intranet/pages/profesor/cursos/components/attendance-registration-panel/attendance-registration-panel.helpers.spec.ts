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
});
// #endregion
