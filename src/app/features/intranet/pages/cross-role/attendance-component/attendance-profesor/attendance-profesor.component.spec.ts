// * Tests for AttendanceProfesorComponent — component creation and DI.
// NOTE: Uses scoped providers (AttendanceViewController) that make deep testing impractical.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { testProviders } from '@test';
import { AttendanceProfesorComponent } from './attendance-profesor.component';
import { AttendanceService, StorageService, UserProfileService } from '@core/services';
import { AttendanceDataService } from '../../../../services/attendance/attendance-data.service';

// #endregion

// #region Tests
describe('AttendanceProfesorComponent', () => {
	let component: AttendanceProfesorComponent;
	let fixture: ComponentFixture<AttendanceProfesorComponent>;

	const emptyTable = {
		title: 'Test',
		selectedMonth: 1,
		selectedYear: 2026,
		weeks: [],
		counts: { T: 0, A: 0, F: 0, N: 0, '-': 0, X: 0 },
		columnTotals: [],
		grandTotal: '0/0',
	};

	beforeEach(async () => {
		const asistenciaServiceMock: Partial<AttendanceService> = {
			getSalonesProfesor: vi.fn().mockReturnValue(of([])),
			getSalonesProfesorPorHorario: vi.fn().mockReturnValue(of([])),
			getAsistenciasGrado: vi.fn().mockReturnValue(of([])),
			getAsistenciaDia: vi.fn().mockReturnValue(of([])),
			descargarPdfAsistenciaDia: vi.fn().mockReturnValue(of(new Blob())),
			getEstadosValidos: vi.fn().mockReturnValue(of([])),
		};

		const storageServiceMock: Partial<StorageService> = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			getSelectedSalonId: vi.fn().mockReturnValue(null),
			setSelectedSalonId: vi.fn(),
			getSelectedEstudianteId: vi.fn().mockReturnValue(null),
			setSelectedEstudianteId: vi.fn(),
			hasUserInfo: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			clearAuth: vi.fn(),
			clearPermisos: vi.fn(),
		};

		const attendanceDataServiceMock: Partial<AttendanceDataService> = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi.fn().mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceProfesorComponent],
			providers: [
				...testProviders,
				{ provide: AttendanceService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: UserProfileService, useValue: { userName: signal('Prof. García') } },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceProfesorComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize with empty salones', () => {
		expect(component.salones()).toEqual([]);
	});
});
// #endregion
