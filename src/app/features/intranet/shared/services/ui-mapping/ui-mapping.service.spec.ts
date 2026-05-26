// * Tests for UiMappingService — validates UI helper mappings.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { UiMappingService } from './ui-mapping.service';

// #endregion

// #region Tests
describe('UiMappingService', () => {
	let service: UiMappingService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [UiMappingService] });
		service = TestBed.inject(UiMappingService);
	});

	// #region getModuloFromRuta
	describe('getModuloFromRuta', () => {
		it('should extract module from intranet route', () => {
			expect(service.getModuloFromRuta('intranet/admin/usuarios')).toBe('admin');
		});

		it('should handle leading slash', () => {
			expect(service.getModuloFromRuta('/intranet/admin/cursos')).toBe('admin');
		});

		it('should extract profesor module', () => {
			expect(service.getModuloFromRuta('intranet/profesor/horarios')).toBe('profesor');
		});

		it('should return first segment for non-intranet routes', () => {
			expect(service.getModuloFromRuta('public/home')).toBe('public');
		});

		it('should return general for empty segments', () => {
			expect(service.getModuloFromRuta('')).toBe('general');
		});
	});
	// #endregion

	// #region getRolSeverity
	describe('getRolSeverity', () => {
		it('should return danger for Director', () => {
			expect(service.getRolSeverity('Director')).toBe('danger');
		});

		it('should return warn for Profesor', () => {
			expect(service.getRolSeverity('Profesor')).toBe('warn');
		});

		it('should return success for Estudiante', () => {
			expect(service.getRolSeverity('Estudiante')).toBe('success');
		});

		it('should return info for Apoderado', () => {
			expect(service.getRolSeverity('Apoderado')).toBe('info');
		});

		it('should return secondary for unknown role', () => {
			expect(service.getRolSeverity('Unknown')).toBe('secondary');
		});
	});
	// #endregion

	// #region getEstadoSeverity
	describe('getEstadoSeverity', () => {
		it('should return success for true/1', () => {
			expect(service.getEstadoSeverity(true)).toBe('success');
			expect(service.getEstadoSeverity(1)).toBe('success');
		});

		it('should return danger for false/0', () => {
			expect(service.getEstadoSeverity(false)).toBe('danger');
			expect(service.getEstadoSeverity(0)).toBe('danger');
		});
	});
	// #endregion

	// #region getModulosCount
	describe('getModulosCount', () => {
		it('should count unique modules', () => {
			const vistas = [
				'intranet/admin/usuarios',
				'intranet/admin/cursos',
				'intranet/profesor/horarios',
			];
			expect(service.getModulosCount(vistas)).toBe(2);
		});

		it('should return 0 for empty array', () => {
			expect(service.getModulosCount([])).toBe(0);
		});
	});
	// #endregion

	// #region getVistasCountLabel
	describe('getVistasCountLabel', () => {
		it('should return singular for 1', () => {
			expect(service.getVistasCountLabel(1)).toBe('1 vista seleccionada');
		});

		it('should return plural for multiple', () => {
			expect(service.getVistasCountLabel(5)).toBe('5 vistas seleccionadas');
		});

		it('should return plural for 0', () => {
			expect(service.getVistasCountLabel(0)).toBe('0 vistas seleccionadas');
		});
	});
	// #endregion

	// #region Evento calendario mappings
	describe('evento calendario mappings', () => {
		it('should return correct severity for evento types', () => {
			expect(service.getEventoTipoSeverity('academic')).toBe('info');
			expect(service.getEventoTipoSeverity('cultural')).toBe('contrast');
			expect(service.getEventoTipoSeverity('sports')).toBe('success');
			expect(service.getEventoTipoSeverity('unknown')).toBe('secondary');
		});

		it('should return correct labels for evento types', () => {
			expect(service.getEventoTipoLabel('academic')).toBe('Académico');
			expect(service.getEventoTipoLabel('cultural')).toBe('Cultural');
			expect(service.getEventoTipoLabel('sports')).toBe('Deportivo');
			expect(service.getEventoTipoLabel('xyz')).toBe('xyz');
		});
	});
	// #endregion

	// #region Notificación mappings
	describe('notificación mappings', () => {
		it('should map tipo severity', () => {
			expect(service.getNotificacionTipoSeverity('matricula')).toBe('info');
			expect(service.getNotificacionTipoSeverity('pago')).toBe('warn');
			expect(service.getNotificacionTipoSeverity('unknown')).toBe('secondary');
		});

		it('should map tipo label', () => {
			expect(service.getNotificacionTipoLabel('matricula')).toBe('Matrícula');
			expect(service.getNotificacionTipoLabel('pago')).toBe('Pago');
			expect(service.getNotificacionTipoLabel('xyz')).toBe('xyz');
		});

		it('should map prioridad severity', () => {
			expect(service.getNotificacionPrioridadSeverity('low')).toBe('info');
			expect(service.getNotificacionPrioridadSeverity('high')).toBe('danger');
			expect(service.getNotificacionPrioridadSeverity('unknown')).toBe('secondary');
		});

		it('should map prioridad label', () => {
			expect(service.getNotificacionPrioridadLabel('low')).toBe('Baja');
			expect(service.getNotificacionPrioridadLabel('high')).toBe('Alta');
			expect(service.getNotificacionPrioridadLabel('xyz')).toBe('xyz');
		});
	});
	// #endregion
});
// #endregion
