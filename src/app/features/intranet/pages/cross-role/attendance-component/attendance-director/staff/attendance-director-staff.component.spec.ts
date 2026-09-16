// * Tests for AttendanceDirectorStaffComponent — cubre el camino default
// * (AsistenciaStaffApiService) y el override por `loader` (683 F9 caso 3:
// * consolidación con el ex-AttendanceDirectorAsistentesAdminComponent).
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

import { testProviders } from '@test';
import { ErrorHandlerService } from '@core/services';
import { AsistenciaStaffApiService } from '@intranet-shared/services';
import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';

import { AttendanceDirectorStaffComponent } from './attendance-director-staff.component';
import { AttendanceDirectorPersonaLoader } from './attendance-director-persona-loader';
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

const estadisticasVacias = {
	total: 0,
	asistio: 0,
	tardanza: 0,
	falta: 0,
	justificado: 0,
	pendiente: 0,
};
// #endregion

describe('AttendanceDirectorStaffComponent', () => {
	let fixture: ComponentFixture<AttendanceDirectorStaffComponent>;
	let staffApiMock: Partial<AsistenciaStaffApiService>;

	beforeEach(async () => {
		staffApiMock = {
			obtenerAsistenciaDiaStaffDirector: vi
				.fn()
				.mockReturnValue(of({ staff: [], estadisticas: estadisticasVacias })),
			listarStaff: vi.fn().mockReturnValue(of([])),
		};

		const attendanceDataServiceMock: Partial<AttendanceDataService> = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi.fn().mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		const errorHandlerMock: Partial<ErrorHandlerService> = {
			handleHttpError: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceDirectorStaffComponent],
			providers: [
				...testProviders,
				provideRouter([]),
				{ provide: AsistenciaStaffApiService, useValue: staffApiMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceDirectorStaffComponent);
	});

	it('should create with a required tipoPersona and no loader (staff default)', () => {
		fixture.componentRef.setInput('tipoPersona', 'C');
		fixture.detectChanges();

		expect(fixture.componentInstance).toBeTruthy();
		expect(staffApiMock.obtenerAsistenciaDiaStaffDirector).toHaveBeenCalledWith('C', expect.any(Date));
	});

	it('should use the injected loader instead of AsistenciaStaffApiService when provided', () => {
		const loader: AttendanceDirectorPersonaLoader = {
			dia: vi.fn().mockReturnValue(of({ personas: [], estadisticas: estadisticasVacias })),
			mes: vi.fn().mockReturnValue(of([])),
		};

		fixture.componentRef.setInput('tipoPersona', 'A');
		fixture.componentRef.setInput('loader', loader);
		fixture.detectChanges();

		expect(loader.dia).toHaveBeenCalled();
		expect(staffApiMock.obtenerAsistenciaDiaStaffDirector).not.toHaveBeenCalled();
	});
});
