// * Tests for AsistenciaCursoStore — validates attendance registration state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AsistenciaCursoStore } from './asistencia-curso.store';

// #endregion

// #region Test fixtures
const mockRegistroData = {
	fecha: '2026-03-21',
	estudiantes: [
		{ estudianteId: 1, nombre: 'Juan', estado: 'P', justificacion: null },
		{ estudianteId: 2, nombre: 'María', estado: 'T', justificacion: 'Tráfico' },
		{ estudianteId: 3, nombre: 'Pedro', estado: 'F', justificacion: 'Enfermedad' },
		{ estudianteId: 4, nombre: 'Ana', estado: 'P', justificacion: null },
	],
};
// #endregion

// #region Tests
describe('AsistenciaCursoStore', () => {
	let store: AsistenciaCursoStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [AsistenciaCursoStore] });
		store = TestBed.inject(AsistenciaCursoStore);
		store.reset();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.registroData()).toBeNull();
			expect(store.registroLoading()).toBe(false);
			expect(store.registroSaving()).toBe(false);
			expect(store.resumen()).toBeNull();
			expect(store.resumenLoading()).toBe(false);
		});

		it('should have empty registro stats', () => {
			expect(store.registroStats()).toEqual({ total: 0, presentes: 0, tardes: 0, faltas: 0 });
		});

		it('should have empty estudiantes', () => {
			expect(store.registroEstudiantes()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — registroEstudiantes
	describe('registroEstudiantes', () => {
		it('should derive from registroData', () => {
			store.setRegistroData(mockRegistroData as never);
			expect(store.registroEstudiantes()).toHaveLength(4);
		});

		it('should return empty when null', () => {
			expect(store.registroEstudiantes()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — registroStats
	describe('registroStats', () => {
		it('should compute attendance stats', () => {
			store.setRegistroData(mockRegistroData as never);
			const stats = store.registroStats();

			expect(stats.total).toBe(4);
			expect(stats.presentes).toBe(2);
			expect(stats.tardes).toBe(1);
			expect(stats.faltas).toBe(1);
		});
	});
	// #endregion

	// #region Surgical mutations
	describe('updateEstudianteEstado', () => {
		beforeEach(() => {
			store.setRegistroData(mockRegistroData as never);
		});

		it('should update single student estado', () => {
			store.updateEstudianteEstado(1, 'F');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; estado: string }[];
			expect(est.find((e) => e.estudianteId === 1)?.estado).toBe('F');
		});

		it('should clear justification when set to P', () => {
			store.updateEstudianteEstado(3, 'P');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; justificacion: string | null }[];
			expect(est.find((e) => e.estudianteId === 3)?.justificacion).toBeNull();
		});

		it('should preserve justification when set to non-P', () => {
			store.updateEstudianteEstado(2, 'F');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; justificacion: string | null }[];
			expect(est.find((e) => e.estudianteId === 2)?.justificacion).toBe('Tráfico');
		});

		it('should update stats after estado change', () => {
			store.updateEstudianteEstado(1, 'F');
			const stats = store.registroStats();

			expect(stats.presentes).toBe(1);
			expect(stats.faltas).toBe(2);
		});

		it('should handle null registroData', () => {
			store.setRegistroData(null);
			store.updateEstudianteEstado(1, 'F');
			expect(store.registroData()).toBeNull();
		});
	});
	// #endregion

	// #region updateEstudianteJustificacion
	describe('updateEstudianteJustificacion', () => {
		it('should update justification text', () => {
			store.setRegistroData(mockRegistroData as never);
			store.updateEstudianteJustificacion(1, 'Motivo personal');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; justificacion: string | null }[];
			expect(est.find((e) => e.estudianteId === 1)?.justificacion).toBe('Motivo personal');
		});

		it('should clear justification with null', () => {
			store.setRegistroData(mockRegistroData as never);
			store.updateEstudianteJustificacion(2, null);

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; justificacion: string | null }[];
			expect(est.find((e) => e.estudianteId === 2)?.justificacion).toBeNull();
		});
	});
	// #endregion

	// #region Loading states
	describe('loading states', () => {
		it('should manage registro loading', () => {
			store.setRegistroLoading(true);
			expect(store.registroLoading()).toBe(true);
		});

		it('should manage registro saving', () => {
			store.setRegistroSaving(true);
			expect(store.registroSaving()).toBe(true);
		});

		it('should manage resumen loading', () => {
			store.setResumenLoading(true);
			expect(store.resumenLoading()).toBe(true);
		});
	});
	// #endregion

	// #region Reset
	describe('reset', () => {
		it('should reset all state', () => {
			store.setRegistroData(mockRegistroData as never);
			store.setRegistroLoading(true);
			store.setResumen({ total: 10 } as never);

			store.reset();

			expect(store.registroData()).toBeNull();
			expect(store.registroLoading()).toBe(false);
			expect(store.resumen()).toBeNull();
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose state', () => {
			store.setRegistroData(mockRegistroData as never);
			const vm = store.vm();

			expect(vm.registroEstudiantes).toHaveLength(4);
			expect(vm.registroStats.total).toBe(4);
			expect(vm.registroLoading).toBe(false);
		});
	});
	// #endregion
});
// #endregion
