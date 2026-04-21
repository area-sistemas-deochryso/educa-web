// #region Imports
import { describe, expect, it } from 'vitest';

import { TipoFalloSeverityPipe } from './tipo-fallo-severity.pipe';
// #endregion

// #region Tests
describe('TipoFalloSeverityPipe', () => {
	const pipe = new TipoFalloSeverityPipe();

	it('should return "danger" for FAILED_INVALID_ADDRESS', () => {
		expect(pipe.transform('FAILED_INVALID_ADDRESS')).toBe('danger');
	});

	it('should return "danger" for FAILED_NO_EMAIL', () => {
		expect(pipe.transform('FAILED_NO_EMAIL')).toBe('danger');
	});

	it('should return "danger" for FAILED_MAILBOX_FULL', () => {
		expect(pipe.transform('FAILED_MAILBOX_FULL')).toBe('danger');
	});

	it('should return "danger" for FAILED_REJECTED', () => {
		expect(pipe.transform('FAILED_REJECTED')).toBe('danger');
	});

	it('should return "warn" for FAILED_UNKNOWN', () => {
		expect(pipe.transform('FAILED_UNKNOWN')).toBe('warn');
	});

	it('should return "warn" for FAILED_TRANSIENT', () => {
		expect(pipe.transform('FAILED_TRANSIENT')).toBe('warn');
	});

	it('should return "info" for TRANSIENT', () => {
		expect(pipe.transform('TRANSIENT')).toBe('info');
	});

	it('should return "info" for null', () => {
		expect(pipe.transform(null)).toBe('info');
	});

	it('should return "info" for undefined', () => {
		expect(pipe.transform(undefined)).toBe('info');
	});

	it('should return "info" for unknown strings (safe default)', () => {
		expect(pipe.transform('BOGUS_VALUE')).toBe('info');
	});
});
// #endregion
