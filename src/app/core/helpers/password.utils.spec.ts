// * Tests for password.utils — default password generation with a random segment.
// #region Imports
import { describe, expect, it } from 'vitest';

import { generatePassword } from './password.utils';

// #endregion

// #region Tests
describe('password.utils', () => {
	describe('generatePassword', () => {
		it('should return empty string when apellidos is too short', () => {
			expect(generatePassword('G', '72345678')).toBe('');
		});

		it('should return empty string when dni has fewer than 4 digits', () => {
			expect(generatePassword('Garcia Lopez', '123')).toBe('');
		});

		it('should start with the first 2 letters of apellidos in uppercase', () => {
			const result = generatePassword('Garcia Lopez', '72345678');
			expect(result.slice(0, 2)).toBe('GA');
		});

		it('should include the last 4 digits of the dni', () => {
			const result = generatePassword('Garcia Lopez', '72345678');
			expect(result).toContain('5678');
		});

		it('should have length 10', () => {
			const result = generatePassword('Garcia Lopez', '72345678');
			expect(result).toHaveLength(10);
		});

		it('should satisfy INV-S10/INV-S11 in 20 runs (no lowercase, min length 6, digit and special char)', () => {
			for (let i = 0; i < 20; i++) {
				const result = generatePassword('Garcia Lopez', '72345678');
				expect(result.length).toBeGreaterThanOrEqual(6);
				expect(/[a-z]/.test(result)).toBe(false);
				expect(/[A-Z]/.test(result)).toBe(true);
				expect(/[0-9]/.test(result)).toBe(true);
				expect(/[!@#$%^&*(),.?":{}|<>]/.test(result)).toBe(true);
			}
		});

		it('should uppercase a lowercase apellidos prefix', () => {
			expect(generatePassword('garcia', '72345678').slice(0, 2)).toBe('GA');
		});

		it('should produce different results across calls (real randomness, not deterministic)', () => {
			const results = new Set(
				Array.from({ length: 20 }, () => generatePassword('Garcia Lopez', '72345678')),
			);
			expect(results.size).toBeGreaterThan(1);
		});

		it('should strip non-digit characters from dni before taking the last 4', () => {
			const result = generatePassword('Garcia Lopez', '723-4567-8');
			expect(result).toContain('5678');
		});
	});
});
// #endregion
