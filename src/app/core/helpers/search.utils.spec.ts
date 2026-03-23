// * Tests for search utility functions — validates pure search helpers.
// #region Imports
import { describe, expect, it } from 'vitest';

import { searchMatch, searchMatchAny } from './search.utils';

// #endregion

// #region Tests
describe('searchMatch', () => {
	it('should match case-insensitively', () => {
		expect(searchMatch('Juan Pérez', 'juan')).toBe(true);
		expect(searchMatch('Juan Pérez', 'PÉREZ')).toBe(true);
	});

	it('should return false for null/undefined text', () => {
		expect(searchMatch(null, 'test')).toBe(false);
		expect(searchMatch(undefined, 'test')).toBe(false);
	});

	it('should return true for empty term', () => {
		expect(searchMatch('anything', '')).toBe(true);
	});

	it('should return false for non-matching text', () => {
		expect(searchMatch('Juan', 'Pedro')).toBe(false);
	});

	it('should match partial strings', () => {
		expect(searchMatch('Matemática Avanzada', 'matem')).toBe(true);
	});
});

describe('searchMatchAny', () => {
	it('should match if any text matches', () => {
		expect(searchMatchAny(['Juan', 'DNI: 12345'], '12345')).toBe(true);
		expect(searchMatchAny(['Evento A', 'Descripción B'], 'desc')).toBe(true);
	});

	it('should return false if none match', () => {
		expect(searchMatchAny(['Juan', 'Pedro'], 'María')).toBe(false);
	});

	it('should handle null/undefined texts in array', () => {
		expect(searchMatchAny([null, undefined, 'Match'], 'match')).toBe(true);
		expect(searchMatchAny([null, undefined], 'test')).toBe(false);
	});

	it('should return true for empty term', () => {
		expect(searchMatchAny(['anything'], '')).toBe(true);
	});

	it('should return true for empty array with empty term', () => {
		expect(searchMatchAny([], '')).toBe(true);
	});
});
// #endregion
