// #region Imports
import { describe, expect, it } from 'vitest';

import { TipoFalloLabelPipe } from './tipo-fallo-label.pipe';
// #endregion

// #region Tests
describe('TipoFalloLabelPipe', () => {
	const pipe = new TipoFalloLabelPipe();

	it('should return "Dirección inválida" for FAILED_INVALID_ADDRESS', () => {
		expect(pipe.transform('FAILED_INVALID_ADDRESS')).toBe('Dirección inválida');
	});

	it('should return "Sin correo" for FAILED_NO_EMAIL', () => {
		expect(pipe.transform('FAILED_NO_EMAIL')).toBe('Sin correo');
	});

	it('should return "Bandeja llena" for FAILED_MAILBOX_FULL', () => {
		expect(pipe.transform('FAILED_MAILBOX_FULL')).toBe('Bandeja llena');
	});

	it('should return "Rechazado por servidor" for FAILED_REJECTED', () => {
		expect(pipe.transform('FAILED_REJECTED')).toBe('Rechazado por servidor');
	});

	it('should return "Error desconocido" for FAILED_UNKNOWN', () => {
		expect(pipe.transform('FAILED_UNKNOWN')).toBe('Error desconocido');
	});

	it('should return "Transitorio agotado" for FAILED_TRANSIENT', () => {
		expect(pipe.transform('FAILED_TRANSIENT')).toBe('Transitorio agotado');
	});

	it('should return "En reintento" for TRANSIENT', () => {
		expect(pipe.transform('TRANSIENT')).toBe('En reintento');
	});

	it('should return "Sin clasificar" for null', () => {
		expect(pipe.transform(null)).toBe('Sin clasificar');
	});

	it('should return "Sin clasificar" for undefined', () => {
		expect(pipe.transform(undefined)).toBe('Sin clasificar');
	});

	it('should return the raw value for unknown strings (forward-compat)', () => {
		expect(pipe.transform('BOGUS_VALUE')).toBe('BOGUS_VALUE');
	});
});
// #endregion
