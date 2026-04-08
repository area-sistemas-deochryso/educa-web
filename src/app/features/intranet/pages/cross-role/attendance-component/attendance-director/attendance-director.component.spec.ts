// * Tests for AttendanceDirectorComponent — component creation and dependency injection.
// NOTE: This component uses scoped providers (AttendanceViewController, AttendancePdfService,
// AttendanceStatsService) and complex template dependencies that make deep unit testing
// impractical without E2E. Tests verify creation and basic DI.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { AttendanceDirectorComponent } from './attendance-director.component';
import { AsistenciaService, StorageService } from '@core/services';
import { AttendanceDataService } from '../../../../services/attendance/attendance-data.service';

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

// #region Tests
describe('AttendanceDirectorComponent', () => {
	let component: AttendanceDirectorComponent;
	let fixture: ComponentFixture<AttendanceDirectorComponent>;

	beforeEach(async () => {
		const asistenciaServiceMock: Partial<AsistenciaService> = {
			getGradosSeccionesDisponibles: vi.fn().mockReturnValue(of([])),
			getReporteDirector: vi.fn().mockReturnValue(of([])),
			getAsistenciaDiaDirector: vi.fn().mockReturnValue(of([])),
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
			processAsistencias: vi.fn().mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceDirectorComponent],
			providers: [
				...testProviders,
				{ provide: AsistenciaService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceDirectorComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should have initial empty gradosSecciones', () => {
		expect(component.gradosSecciones()).toEqual([]);
	});
});
// #endregion
