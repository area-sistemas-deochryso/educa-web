// * Tests for AttendanceApoderadoComponent — validates child selection and data loading.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AttendanceApoderadoComponent } from './attendance-apoderado.component';
import { AttendanceService, StorageService, HijoApoderado } from '@core/services';
import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';

// #endregion

// #region Mocks
const mockHijos: HijoApoderado[] = [
	{ estudianteId: 1, dni: '12345678', nombreCompleto: 'Juan Pérez', grado: 1, seccion: 'A', relacion: 'Hijo' },
	{ estudianteId: 2, dni: '87654321', nombreCompleto: 'María Pérez', grado: 2, seccion: 'B', relacion: 'Hija' },
];

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
describe('AttendanceApoderadoComponent', () => {
	let component: AttendanceApoderadoComponent;
	let asistenciaServiceMock: Partial<AttendanceService>;
	let storageServiceMock: Partial<StorageService>;
	let attendanceDataServiceMock: Partial<AttendanceDataService>;

	beforeEach(() => {
		asistenciaServiceMock = {
			getHijos: vi.fn().mockReturnValue(of(mockHijos)),
			getAsistenciaHijo: vi.fn().mockReturnValue(of({ estudianteId: 1, detalle: [], conteoEstados: {} })),
			getEstadosValidos: vi.fn().mockReturnValue(of([])),
		};

		storageServiceMock = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			getSelectedHijoId: vi.fn().mockReturnValue(null),
			setSelectedHijoId: vi.fn(),
			hasUserInfo: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			clearAuth: vi.fn(),
			clearPermisos: vi.fn(),
		};

		attendanceDataServiceMock = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi.fn().mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		TestBed.configureTestingModule({
			providers: [
				provideZonelessChangeDetection(),
				provideHttpClient(),
				provideHttpClientTesting(),
				AttendanceApoderadoComponent,
				{ provide: AttendanceService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		});

		component = TestBed.inject(AttendanceApoderadoComponent);
	});

	it('should be created', () => {
		expect(component).toBeTruthy();
	});

	it('should load hijos on init', () => {
		component.ngOnInit();
		expect(asistenciaServiceMock.getHijos).toHaveBeenCalled();
		expect(component.hijos()).toEqual(mockHijos);
	});

	it('should select first hijo automatically if none stored', () => {
		component.ngOnInit();
		expect(component.selectedHijoId()).toBe(1);
	});

	it('should compute selectedHijo correctly', () => {
		component.ngOnInit();
		expect(component.selectedHijo()?.nombreCompleto).toBe('Juan Pérez');
	});

	it('should call selectHijo and load asistencias', () => {
		component.ngOnInit();
		component.selectHijo(2);

		expect(component.selectedHijoId()).toBe(2);
		expect(storageServiceMock.setSelectedHijoId).toHaveBeenCalledWith(2);
		expect(asistenciaServiceMock.getAsistenciaHijo).toHaveBeenCalled();
	});

	it('should handle empty hijos list', () => {
		asistenciaServiceMock.getHijos = vi.fn().mockReturnValue(of([]));

		component.ngOnInit();

		expect(component.hijos()).toEqual([]);
		expect(component.selectedHijoId()).toBeNull();
	});

	it('should reload data when reload method is called', () => {
		component.ngOnInit();
		(asistenciaServiceMock.getAsistenciaHijo as any).mockClear();

		component.reload();

		expect(asistenciaServiceMock.getAsistenciaHijo).toHaveBeenCalled();
	});
});
// #endregion
