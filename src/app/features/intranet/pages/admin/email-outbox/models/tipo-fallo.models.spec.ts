// #region Imports
import { describe, expect, it } from 'vitest';

import { esPermanente } from './tipo-fallo.models';
// #endregion

// #region Tests
describe('esPermanente', () => {
	it('should return true for FAILED_INVALID_ADDRESS', () => {
		expect(esPermanente('FAILED_INVALID_ADDRESS')).toBe(true);
	});

	it('should return true for FAILED_NO_EMAIL', () => {
		expect(esPermanente('FAILED_NO_EMAIL')).toBe(true);
	});

	it('should return true for FAILED_MAILBOX_FULL', () => {
		expect(esPermanente('FAILED_MAILBOX_FULL')).toBe(true);
	});

	it('should return true for FAILED_REJECTED', () => {
		expect(esPermanente('FAILED_REJECTED')).toBe(true);
	});

	it('should return false for FAILED_UNKNOWN (admin can retry)', () => {
		expect(esPermanente('FAILED_UNKNOWN')).toBe(false);
	});

	it('should return false for FAILED_TRANSIENT (admin can force retry)', () => {
		expect(esPermanente('FAILED_TRANSIENT')).toBe(false);
	});

	it('should return false for TRANSIENT', () => {
		expect(esPermanente('TRANSIENT')).toBe(false);
	});

	it('should return false for null', () => {
		expect(esPermanente(null)).toBe(false);
	});

	it('should return false for undefined', () => {
		expect(esPermanente(undefined)).toBe(false);
	});

	it('should return false for unknown strings (conservative default)', () => {
		expect(esPermanente('BOGUS_VALUE')).toBe(false);
	});
});
// #endregion
