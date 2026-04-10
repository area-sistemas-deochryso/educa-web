// * Tests for StudentClassroomsStore — validates student classroom state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudentClassroomsStore } from './estudiante-salones.store';

// #endregion

// #region Test fixtures
const mockHorarios = [
	{ id: 1, salonId: 100, salonDescripcion: '1A - Primaria', cursoId: 10, cursoNombre: 'Matemática', cantidadEstudiantes: 30 },
	{ id: 2, salonId: 100, salonDescripcion: '1A - Primaria', cursoId: 20, cursoNombre: 'Comunicación', cantidadEstudiantes: 30 },
	{ id: 3, salonId: 100, salonDescripcion: '1A - Primaria', cursoId: 10, cursoNombre: 'Matemática', cantidadEstudiantes: 30 },
	{ id: 4, salonId: 200, salonDescripcion: '2A - Primaria', cursoId: 30, cursoNombre: 'Ciencias', cantidadEstudiantes: 28 },
] as never[];
// #endregion

// #region Tests
describe('StudentClassroomsStore', () => {
	let store: StudentClassroomsStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [StudentClassroomsStore] });
		store = TestBed.inject(StudentClassroomsStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty state', () => {
			expect(store.salones()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
			expect(store.isEmpty()).toBe(true);
		});

		it('should have dialog closed', () => {
			expect(store.dialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — salones from horarios
	describe('salones derivation', () => {
		beforeEach(() => {
			store.setHorarios(mockHorarios);
		});

		it('should derive unique salones', () => {
			expect(store.salones()).toHaveLength(2);
		});

		it('should aggregate unique courses per salon', () => {
			const salon100 = store.salones().find((s) => s.salonId === 100);
			expect(salon100?.cursos).toHaveLength(2);
			expect(salon100?.cursos.map((c) => c.cursoNombre)).toContain('Matemática');
			expect(salon100?.cursos.map((c) => c.cursoNombre)).toContain('Comunicación');
		});

		it('should not duplicate courses', () => {
			const salon100 = store.salones().find((s) => s.salonId === 100);
			const matCount = salon100?.cursos.filter((c) => c.cursoNombre === 'Matemática').length;
			expect(matCount).toBe(1);
		});

		it('should preserve salon metadata', () => {
			const salon200 = store.salones().find((s) => s.salonId === 200);
			expect(salon200?.salonDescripcion).toBe('2A - Primaria');
			expect(salon200?.cantidadEstudiantes).toBe(28);
		});

		it('should not be empty', () => {
			expect(store.isEmpty()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — selectedSalon
	describe('selectedSalon', () => {
		beforeEach(() => {
			store.setHorarios(mockHorarios);
		});

		it('should return null when no salon selected', () => {
			expect(store.selectedSalon()).toBeNull();
		});

		it('should find salon by id after openDialog', () => {
			store.openDialog(100);
			expect(store.selectedSalon()?.salonDescripcion).toBe('1A - Primaria');
		});

		it('should return null for non-existent id', () => {
			store.openDialog(999);
			expect(store.selectedSalon()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — cursosForSelectedSalon
	describe('cursosForSelectedSalon', () => {
		it('should return empty when no salon selected', () => {
			store.setHorarios(mockHorarios);
			expect(store.cursosForSelectedSalon()).toEqual([]);
		});

		it('should return options for selected salon', () => {
			store.setHorarios(mockHorarios);
			store.openDialog(100);

			const opts = store.cursosForSelectedSalon();
			expect(opts).toHaveLength(2);
			expect(opts.map((o) => o.label)).toContain('Matemática');
			expect(opts.map((o) => o.label)).toContain('Comunicación');
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialog management', () => {
		it('should open dialog with salon id', () => {
			store.openDialog(100);
			expect(store.dialogVisible()).toBe(true);
		});

		it('should close dialog and clean up', () => {
			store.openDialog(100);
			store.setAsistenciaData({ totalClases: 10 } as never);
			store.setAsistenciaCursoId(10);
			store.setGruposData({ grupos: [] } as never);
			store.setGruposCursoId(20);

			store.closeDialog();

			expect(store.dialogVisible()).toBe(false);
			expect(store.asistenciaData()).toBeNull();
			expect(store.asistenciaCursoId()).toBeNull();
			expect(store.gruposData()).toBeNull();
			expect(store.gruposCursoId()).toBeNull();
		});
	});
	// #endregion

	// #region Tab data
	describe('tab data', () => {
		it('should manage asistencia state', () => {
			store.setAsistenciaLoading(true);
			expect(store.asistenciaLoading()).toBe(true);

			store.setAsistenciaData({ totalClases: 20 } as never);
			expect(store.asistenciaData()).toEqual({ totalClases: 20 });

			store.setAsistenciaCursoId(10);
			expect(store.asistenciaCursoId()).toBe(10);
		});

		it('should manage grupos state', () => {
			store.setGruposLoading(true);
			expect(store.gruposLoading()).toBe(true);

			store.setGruposData({ grupos: [] } as never);
			expect(store.gruposData()).toEqual({ grupos: [] });
		});

		it('should manage notas state', () => {
			store.setNotasLoading(true);
			expect(store.notasLoading()).toBe(true);

			store.setNotasData([{ cursoNombre: 'Mat' }] as never[]);
			expect(store.notasData()).toHaveLength(1);
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state', () => {
			store.setHorarios(mockHorarios);
			store.openDialog(100);

			const vm = store.vm();
			expect(vm.salones).toHaveLength(2);
			expect(vm.isEmpty).toBe(false);
			expect(vm.dialogVisible).toBe(true);
			expect(vm.selectedSalon?.salonId).toBe(100);
			expect(vm.cursosForSelectedSalon).toHaveLength(2);
		});
	});
	// #endregion
});
// #endregion
