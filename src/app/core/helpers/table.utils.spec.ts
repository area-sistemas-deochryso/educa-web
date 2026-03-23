// * Tests for table utility functions — validates lazy load pagination calc.
// #region Imports
import { describe, expect, it } from 'vitest';

import { calcPageFromLazyEvent } from './table.utils';

// #endregion

// #region Tests
describe('calcPageFromLazyEvent', () => {
	it('should calculate page 1 for first=0', () => {
		expect(calcPageFromLazyEvent({ first: 0, rows: 10 })).toEqual({ page: 1, rows: 10 });
	});

	it('should calculate page 2 for first=10, rows=10', () => {
		expect(calcPageFromLazyEvent({ first: 10, rows: 10 })).toEqual({ page: 2, rows: 10 });
	});

	it('should calculate page 3 for first=20, rows=10', () => {
		expect(calcPageFromLazyEvent({ first: 20, rows: 10 })).toEqual({ page: 3, rows: 10 });
	});

	it('should handle different page sizes', () => {
		expect(calcPageFromLazyEvent({ first: 50, rows: 25 })).toEqual({ page: 3, rows: 25 });
	});

	it('should default to first=0, rows=10 when undefined', () => {
		expect(calcPageFromLazyEvent({})).toEqual({ page: 1, rows: 10 });
	});

	it('should handle first=0 with custom rows', () => {
		expect(calcPageFromLazyEvent({ first: 0, rows: 20 })).toEqual({ page: 1, rows: 20 });
	});
});
// #endregion
