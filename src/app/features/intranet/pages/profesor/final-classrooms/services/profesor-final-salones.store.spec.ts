// * Tests for TeacherFinalClassroomsStore — validates professor final grades state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { TeacherFinalClassroomsStore } from './profesor-final-salones.store';

// #endregion

// #region Test fixtures
const mockSalones = [
	{ id: 1, gradoOrden: 1, totalEstudiantes: 25, aprobados: 20, desaprobados: 3, pendientes: 2 },
	{ id: 2, gradoOrden: 2, totalEstudiantes: 28, aprobados: 22, desaprobados: 4, pendientes: 2 },
	{ id: 3, gradoOrden: 5, totalEstudiantes: 30, aprobados: 25, desaprobados: 3, pendientes: 2 },
	{ id: 4, gradoOrden: 10, totalEstudiantes: 35, aprobados: 28, desaprobados: 5, pendientes: 2 },
] as never[];

const mockPeriodos = [
	{ id: 1, nivel: 'Inicial', anio: 2026, estadoCierre: 'ABIERTO' },
	{ id: 2, nivel: 'Primaria', anio: 2026, estadoCierre: 'CERRADO' },
] as never[];
// #endregion

// #region Tests
describe('TeacherFinalClassroomsStore', () => {
	let store: TeacherFinalClassroomsStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [TeacherFinalClassroomsStore] });
		store = TestBed.inject(TeacherFinalClassroomsStore);
	});

	// #region Filtrado por nivel
	describe('salonesFiltrados', () => {
		beforeEach(() => {
			store.setSalones(mockSalones);
		});

		it('should filter Inicial (gradoOrden 1-3)', () => {
			store.setSelectedNivel('Inicial');
			expect(store.salonesFiltrados()).toHaveLength(2);
		});

		it('should filter Primaria (gradoOrden 4-9)', () => {
			store.setSelectedNivel('Primaria');
			expect(store.salonesFiltrados()).toHaveLength(1);
		});

		it('should filter Secundaria (gradoOrden >= 10)', () => {
			store.setSelectedNivel('Secundaria');
			expect(store.salonesFiltrados()).toHaveLength(1);
		});
	});
	// #endregion

	// #region Estadísticas
	describe('estadisticas', () => {
		it('should compute from filtered salones', () => {
			store.setSalones(mockSalones);
			store.setSelectedNivel('Inicial');

			const stats = store.estadisticas();
			expect(stats.totalSalones).toBe(2);
			expect(stats.totalEstudiantes).toBe(53);
		});
	});
	// #endregion

	// #region nivelesDisponibles
	describe('nivelesDisponibles', () => {
		it('should return available niveles from salones', () => {
			store.setSalones(mockSalones);
			const niveles = store.nivelesDisponibles();

			expect(niveles).toEqual(['Inicial', 'Primaria', 'Secundaria']);
		});

		it('should return only present niveles', () => {
			store.setSalones([mockSalones[0], mockSalones[1]] as never[]);
			expect(store.nivelesDisponibles()).toEqual(['Inicial']);
		});

		it('should return empty for no salones', () => {
			expect(store.nivelesDisponibles()).toEqual([]);
		});
	});
	// #endregion

	// #region Periodo / Config
	describe('periodo and config', () => {
		it('should find periodo by nivel and year', () => {
			store.setPeriodos(mockPeriodos);
			store.setFiltroAnio(2026);
			store.setSelectedNivel('Inicial');

			expect(store.periodoActual()?.estadoCierre).toBe('ABIERTO');
		});

		it('should detect closed periodo', () => {
			store.setPeriodos(mockPeriodos);
			store.setFiltroAnio(2026);

			store.setSelectedNivel('Primaria');
			expect(store.periodoCerrado()).toBe(true);

			store.setSelectedNivel('Inicial');
			expect(store.periodoCerrado()).toBe(false);
		});
	});
	// #endregion

	// #region Dialog management
	describe('salon dialog', () => {
		it('should open with salon id', () => {
			store.openSalonDialog(3);
			expect(store.salonDialogVisible()).toBe(true);
			expect(store.selectedSalonId()).toBe(3);
		});

		it('should close and clean up', () => {
			store.openSalonDialog(3);
			store.setAprobaciones([{ estudianteId: 1 }] as never[]);
			store.closeSalonDialog();

			expect(store.salonDialogVisible()).toBe(false);
			expect(store.selectedSalonId()).toBeNull();
			expect(store.aprobaciones()).toEqual([]);
		});
	});
	// #endregion

	// #region Mutación quirúrgica
	describe('updateAprobacion', () => {
		it('should update specific student', () => {
			store.setAprobaciones([
				{ estudianteId: 1, estado: 'P' },
				{ estudianteId: 2, estado: 'P' },
			] as never[]);

			store.updateAprobacion(1, { estado: 'A' } as never);

			const aprob = store.aprobaciones() as unknown as { estudianteId: number; estado: string }[];
			expect(aprob.find((a) => a.estudianteId === 1)?.estado).toBe('A');
			expect(aprob.find((a) => a.estudianteId === 2)?.estado).toBe('P');
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state', () => {
			store.setSalones(mockSalones);
			store.setSelectedNivel('Inicial');
			const vm = store.vm();

			expect(vm.salones).toHaveLength(2);
			expect(vm.estadisticas.totalSalones).toBe(2);
			expect(vm.nivelesDisponibles).toContain('Inicial');
		});
	});
	// #endregion
});
// #endregion
