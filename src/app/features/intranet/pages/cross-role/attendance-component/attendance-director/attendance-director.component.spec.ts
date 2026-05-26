// * Tests for AttendanceDirectorComponent shell — submenú Estudiantes/Profesores.
// * Plan 21 Chat 3: el shell solo delega a sub-componentes; la lógica de
// * estudiantes se probó en attendance-director-estudiantes.component.spec.ts.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { testProviders } from '@test';
import { StorageService } from '@core/services';

import { AttendanceDirectorComponent } from './attendance-director.component';
import { AsistenciaProfesorApiService, AttendanceService } from '@intranet-shared/services';
// #endregion

describe('AttendanceDirectorComponent (shell)', () => {
	let component: AttendanceDirectorComponent;
	let fixture: ComponentFixture<AttendanceDirectorComponent>;

	beforeEach(async () => {
		const asistenciaServiceMock: Partial<AttendanceService> = {
			getGradosSeccionesDisponibles: vi.fn().mockReturnValue(of([])),
			getReporteDirector: vi.fn().mockReturnValue(of([])),
			getAsistenciaDiaDirector: vi.fn().mockReturnValue(
				of({ estudiantes: [], estadisticas: null }),
			),
			getEstadosValidos: vi.fn().mockReturnValue(of([])),
		};

		const storageServiceMock: Partial<StorageService> = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			getSelectedGradoSeccionDirector: vi.fn().mockReturnValue(null),
			setSelectedGradoSeccionDirector: vi.fn(),
			getSelectedEstudianteDirectorId: vi.fn().mockReturnValue(null),
			setSelectedEstudianteDirectorId: vi.fn(),
			hasUserInfo: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			clearAuth: vi.fn(),
			clearPermisos: vi.fn(),
		};

		const profesorApiMock: Partial<AsistenciaProfesorApiService> = {
			listarProfesores: vi.fn().mockReturnValue(
				of({
					data: [],
					total: 0,
					page: 1,
					pageSize: 25,
					totalPages: 0,
					hasNextPage: false,
					hasPreviousPage: false,
				}),
			),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceDirectorComponent],
			providers: [
				...testProviders,
				{ provide: AttendanceService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: AsistenciaProfesorApiService, useValue: profesorApiMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceDirectorComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should default to "estudiantes" submenu', () => {
		expect(component.selectedSubMenu()).toBe('estudiantes');
	});

	it('should toggle submenu selection', () => {
		component.setSubMenu('profesores');
		expect(component.selectedSubMenu()).toBe('profesores');

		component.setSubMenu('estudiantes');
		expect(component.selectedSubMenu()).toBe('estudiantes');
	});
});
