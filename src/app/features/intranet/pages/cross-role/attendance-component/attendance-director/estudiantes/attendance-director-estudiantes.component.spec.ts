// * Tests for AttendanceDirectorEstudiantesComponent — extracted in Plan 21 Chat 3.
// * Same contract as the old AttendanceDirectorComponent pre-refactor.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { testProviders } from '@test';
import { AttendanceService, StorageService } from '@core/services';
import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';

import { AttendanceDirectorEstudiantesComponent } from './attendance-director-estudiantes.component';
// #endregion

// #region Mocks
const emptyTable = {
	title: 'Test',
	selectedMonth: 1,
	selectedYear: 2026,
	weeks: [],
	counts: { T: 0, A: 0, F: 0, N: 0, '-': 0, X: 0 },
	columnTotals: [],
	grandTotal: '0/0',
};
// #endregion

describe('AttendanceDirectorEstudiantesComponent', () => {
	let component: AttendanceDirectorEstudiantesComponent;
	let fixture: ComponentFixture<AttendanceDirectorEstudiantesComponent>;

	beforeEach(async () => {
		const asistenciaServiceMock: Partial<AttendanceService> = {
			getGradosSeccionesDisponibles: vi.fn().mockReturnValue(of([])),
			getReporteDirector: vi.fn().mockReturnValue(of([])),
			getAsistenciaDiaDirector: vi.fn().mockReturnValue(
				of({ estudiantes: [], estadisticas: null }),
			),
			descargarPdfAsistenciaDia: vi.fn().mockReturnValue(of(new Blob())),
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

		const attendanceDataServiceMock: Partial<AttendanceDataService> = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi
				.fn()
				.mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceDirectorEstudiantesComponent],
			providers: [
				...testProviders,
				{ provide: AttendanceService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceDirectorEstudiantesComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should have initial empty gradosSecciones', () => {
		expect(component.gradosSecciones()).toEqual([]);
	});
});
