// * Tests for ProfesorStore — validates professor state with computed derivations.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProfesorStore } from './profesor.store';
import { HorarioProfesorDto, SalonTutoriaDto } from '../models';

// #endregion

// #region Test fixtures
const mockHorarios: HorarioProfesorDto[] = [
	{ id: 1, diaSemana: 1, diaSemanaDescripcion: 'Lunes', horaInicio: '08:00', horaFin: '09:30', cursoId: 10, cursoNombre: 'Matemática', salonId: 100, salonDescripcion: '1A - Primaria', profesorId: 1 },
	{ id: 2, diaSemana: 1, diaSemanaDescripcion: 'Lunes', horaInicio: '10:00', horaFin: '11:30', cursoId: 20, cursoNombre: 'Comunicación', salonId: 100, salonDescripcion: '1A - Primaria', profesorId: 1 },
	{ id: 3, diaSemana: 2, diaSemanaDescripcion: 'Martes', horaInicio: '08:00', horaFin: '09:30', cursoId: 10, cursoNombre: 'Matemática', salonId: 200, salonDescripcion: '2A - Primaria', profesorId: 1 },
	{ id: 4, diaSemana: 3, diaSemanaDescripcion: 'Miércoles', horaInicio: '14:00', horaFin: '15:30', cursoId: 30, cursoNombre: 'Ciencias', salonId: 300, salonDescripcion: '3A - Primaria', profesorId: 1 },
] as HorarioProfesorDto[];

const mockTutoria: SalonTutoriaDto = {
	profesorSalonId: 1, profesorId: 1, salonId: 100, salonNombre: '1A',
	grado: '1er Grado', seccion: 'A', esTutor: true,
} as SalonTutoriaDto;
// #endregion

// #region Tests
describe('ProfesorStore', () => {
	let store: ProfesorStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [ProfesorStore] });
		store = TestBed.inject(ProfesorStore);
		store.reset();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty horarios', () => {
			expect(store.horarios()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('should have no tutoría', () => {
			expect(store.salonTutoria()).toBeNull();
		});

		it('should have dialog closed', () => {
			expect(store.salonDialogVisible()).toBe(false);
			expect(store.selectedSalon()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — cursos únicos
	describe('cursos (unique courses)', () => {
		it('should derive unique courses from horarios', () => {
			store.setHorarios(mockHorarios);

			const cursos = store.cursos();
			expect(cursos).toHaveLength(3);
			expect(cursos.map((c) => c.cursoNombre)).toContain('Matemática');
			expect(cursos.map((c) => c.cursoNombre)).toContain('Comunicación');
			expect(cursos.map((c) => c.cursoNombre)).toContain('Ciencias');
		});

		it('should aggregate salones per curso', () => {
			store.setHorarios(mockHorarios);

			const mat = store.cursos().find((c) => c.cursoNombre === 'Matemática');
			expect(mat?.salones).toHaveLength(2);
			expect(mat?.salones).toContain('1A - Primaria');
			expect(mat?.salones).toContain('2A - Primaria');
		});

		it('should not duplicate salones in a curso', () => {
			const duplicated = [...mockHorarios, { ...mockHorarios[0], id: 99 }];
			store.setHorarios(duplicated);

			const mat = store.cursos().find((c) => c.cursoNombre === 'Matemática');
			expect(mat?.salones).toHaveLength(2);
		});
	});
	// #endregion

	// #region Computed — salones únicos
	describe('salones (unique classrooms)', () => {
		it('should derive unique salones from horarios', () => {
			store.setHorarios(mockHorarios);

			const salones = store.salones();
			expect(salones).toHaveLength(3);
		});

		it('should put tutoría salon first', () => {
			store.setHorarios(mockHorarios);
			store.setSalonTutoria(mockTutoria);

			const salones = store.salones();
			expect(salones[0].esTutor).toBe(true);
			expect(salones[0].salonId).toBe(100);
		});

		it('should include courses in each salon', () => {
			store.setHorarios(mockHorarios);

			const salon100 = store.salones().find((s) => s.salonId === 100);
			expect(salon100?.cursos).toHaveLength(2);
			expect(salon100?.cursos.map((c) => c.nombre)).toContain('Matemática');
			expect(salon100?.cursos.map((c) => c.nombre)).toContain('Comunicación');
		});

		it('should not duplicate courses in a salon', () => {
			const duplicated = [...mockHorarios, { ...mockHorarios[0], id: 99 }];
			store.setHorarios(duplicated);

			const salon100 = store.salones().find((s) => s.salonId === 100);
			expect(salon100?.cursos).toHaveLength(2);
		});
	});
	// #endregion

	// #region Computed — horariosPorDia
	describe('horariosPorDia', () => {
		it('should group and sort by day', () => {
			store.setHorarios(mockHorarios);
			const porDia = store.horariosPorDia();

			expect(porDia.get('Lunes')).toHaveLength(2);
			expect(porDia.get('Martes')).toHaveLength(1);
			expect(porDia.get('Miércoles')).toHaveLength(1);
		});

		it('should sort by horaInicio within each day', () => {
			store.setHorarios(mockHorarios);
			const lunes = store.horariosPorDia().get('Lunes')!;

			expect(lunes[0].horaInicio).toBe('08:00');
			expect(lunes[1].horaInicio).toBe('10:00');
		});
	});
	// #endregion

	// #region Computed — cursosForSelectedSalon
	describe('cursosForSelectedSalon', () => {
		it('should return empty when no salon selected', () => {
			store.setHorarios(mockHorarios);
			expect(store.cursosForSelectedSalon()).toEqual([]);
		});

		it('should return courses for selected salon', () => {
			store.setHorarios(mockHorarios);
			const salon = { salonId: 100, salonDescripcion: '1A', cursos: [], esTutor: false, cantidadEstudiantes: 0, estudiantes: [] };
			store.openSalonDialog(salon);

			const cursos = store.cursosForSelectedSalon();
			expect(cursos).toHaveLength(2);
			expect(cursos.map((c) => c.label)).toContain('Matemática');
			expect(cursos.map((c) => c.label)).toContain('Comunicación');
		});
	});
	// #endregion

	// #region Dialog commands
	describe('dialog commands', () => {
		const mockSalon = { salonId: 100, salonDescripcion: '1A', cursos: [], esTutor: false, cantidadEstudiantes: 0, estudiantes: [] };

		it('should open salon dialog', () => {
			store.openSalonDialog(mockSalon);
			expect(store.salonDialogVisible()).toBe(true);
			expect(store.salonDialogLoading()).toBe(true);
			expect(store.selectedSalon()).toEqual(mockSalon);
		});

		it('should close and clean up dialog', () => {
			store.openSalonDialog(mockSalon);
			store.closeSalonDialog();

			expect(store.salonDialogVisible()).toBe(false);
			expect(store.selectedSalon()).toBeNull();
			expect(store.notasSalon()).toBeNull();
			expect(store.notasCursoId()).toBeNull();
		});
	});
	// #endregion

	// #region Loading / Error
	describe('loading and error', () => {
		it('should toggle loading', () => {
			store.setLoading(true);
			expect(store.loading()).toBe(true);
		});

		it('should set and clear error', () => {
			store.setError('Network error');
			expect(store.error()).toBe('Network error');

			store.clearError();
			expect(store.error()).toBeNull();
		});
	});
	// #endregion

	// #region Reset
	describe('reset', () => {
		it('should reset all state', () => {
			store.setHorarios(mockHorarios);
			store.setSalonTutoria(mockTutoria);
			store.setLoading(true);

			store.reset();

			expect(store.horarios()).toEqual([]);
			expect(store.salonTutoria()).toBeNull();
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state', () => {
			store.setHorarios(mockHorarios);
			const vm = store.vm();

			expect(vm.horarios).toHaveLength(4);
			expect(vm.cursos).toHaveLength(3);
			expect(vm.salones).toHaveLength(3);
			expect(vm.isEmpty).toBe(false);
			expect(vm.loading).toBe(false);
		});

		it('should report isEmpty when no horarios', () => {
			expect(store.vm().isEmpty).toBe(true);
		});
	});
	// #endregion
});
// #endregion
