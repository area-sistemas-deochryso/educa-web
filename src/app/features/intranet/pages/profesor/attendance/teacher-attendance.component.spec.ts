// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AttendanceCourseFacade } from '../cursos/services/attendance-course.facade';
import { ProfesorFacade } from '../services/profesor.facade';
import { TeacherAttendanceComponent } from './teacher-attendance.component';
// #endregion

// #region Fixtures
const horario = (id: number, cursoId: number, salonId: number) => ({
	id,
	cursoId,
	salonId,
	cursoNombre: `Curso ${cursoId}`,
	salonDescripcion: `Salón ${salonId}`,
	diaSemana: 1,
	diaSemanaDescripcion: 'Lunes',
});
// #endregion

describe('TeacherAttendanceComponent', () => {
	const profesorVm = signal({ loading: false, horarios: [] as ReturnType<typeof horario>[] });
	const asistenciaFacade = {
		vm: signal({ registroData: null }),
		resetAsistencia: vi.fn(),
		loadRegistro: vi.fn(),
	};
	const profesorFacade = { vm: profesorVm, loadData: vi.fn() };

	interface Api {
		selectedHorarioId(): number | null;
		cursoOptions(): { value: number }[];
	}

	function create() {
		const fixture = TestBed.createComponent(TeacherAttendanceComponent);
		fixture.detectChanges();
		TestBed.tick();
		return fixture.componentInstance as unknown as Api;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		profesorVm.set({ loading: false, horarios: [] });
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: ProfesorFacade, useValue: profesorFacade },
				{ provide: AttendanceCourseFacade, useValue: asistenciaFacade },
				{ provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
			],
		});
		TestBed.overrideComponent(TeacherAttendanceComponent, {
			set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
	});

	describe('preselección del curso (H21)', () => {
		it('selecciona el único curso del profesor', () => {
			profesorVm.set({ loading: false, horarios: [horario(7, 1, 10)] });

			expect(create().selectedHorarioId()).toBe(7);
		});

		it('un mismo curso con varias franjas cuenta como un solo curso', () => {
			profesorVm.set({ loading: false, horarios: [horario(7, 1, 10), horario(8, 1, 10)] });

			const api = create();

			expect(api.cursoOptions()).toHaveLength(1);
			expect(api.selectedHorarioId()).toBe(7);
		});

		it('no elige nada cuando hay más de un curso', () => {
			profesorVm.set({ loading: false, horarios: [horario(7, 1, 10), horario(9, 2, 10)] });

			expect(create().selectedHorarioId()).toBeNull();
		});

		it('no elige nada si no hay cursos', () => {
			expect(create().selectedHorarioId()).toBeNull();
		});
	});
});
