// * Tests for estado.utils — pure functions for estado label/severity/icon mapping.
// #region Imports
import { describe, expect, it } from 'vitest';

import {
	getEstadoConfig,
	getEstadoLabel,
	getEstadoSeverity,
	getEstadoToggleIcon,
	getEstadoToggleLabel,
} from './estado.utils';

// #endregion

// #region Tests
describe('estado.utils', () => {
	// #region getEstadoLabel
	describe('getEstadoLabel', () => {
		it('should return "Activo" for true', () => {
			expect(getEstadoLabel(true)).toBe('Activo');
		});

		it('should return "Inactivo" for false', () => {
			expect(getEstadoLabel(false)).toBe('Inactivo');
		});

		it('should return "Activo" for truthy number (1)', () => {
			expect(getEstadoLabel(1)).toBe('Activo');
		});

		it('should return "Inactivo" for 0', () => {
			expect(getEstadoLabel(0)).toBe('Inactivo');
		});
	});
	// #endregion

	// #region getEstadoSeverity
	describe('getEstadoSeverity', () => {
		it('should return "success" for active', () => {
			expect(getEstadoSeverity(true)).toBe('success');
		});

		it('should return "danger" for inactive', () => {
			expect(getEstadoSeverity(false)).toBe('danger');
		});
	});
	// #endregion

	// #region getEstadoConfig
	describe('getEstadoConfig', () => {
		it('should return full config for active', () => {
			const config = getEstadoConfig(true);

			expect(config.label).toBe('Activo');
			expect(config.severity).toBe('success');
			expect(config.icon).toContain('check');
			expect(config.toggleLabel).toBe('Desactivar');
		});

		it('should return full config for inactive', () => {
			const config = getEstadoConfig(false);

			expect(config.label).toBe('Inactivo');
			expect(config.severity).toBe('danger');
			expect(config.icon).toContain('times');
			expect(config.toggleLabel).toBe('Activar');
		});
	});
	// #endregion

	// #region getEstadoToggleIcon
	describe('getEstadoToggleIcon', () => {
		it('should return ban icon for active (action: deactivate)', () => {
			expect(getEstadoToggleIcon(true)).toContain('ban');
		});

		it('should return check icon for inactive (action: activate)', () => {
			expect(getEstadoToggleIcon(false)).toContain('check');
		});
	});
	// #endregion

	// #region getEstadoToggleLabel
	describe('getEstadoToggleLabel', () => {
		it('should return "Desactivar" for active', () => {
			expect(getEstadoToggleLabel(true)).toBe('Desactivar');
		});

		it('should return "Activar" for inactive', () => {
			expect(getEstadoToggleLabel(false)).toBe('Activar');
		});
	});
	// #endregion
});
// #endregion
