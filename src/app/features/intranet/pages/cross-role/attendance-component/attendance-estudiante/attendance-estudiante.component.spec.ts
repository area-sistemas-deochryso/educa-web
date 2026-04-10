// * Tests for AttendanceEstudianteComponent — validates data loading and state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { provideZonelessChangeDetection, DestroyRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AttendanceEstudianteComponent } from './attendance-estudiante.component';
import { AttendanceService, AttendanceSignalRService } from '@core/services';
import { AttendanceDataService } from '../../../../services/attendance/attendance-data.service';
import { AuthStore } from '@core/store';

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

const mockResumen = {
	estudianteId: 1,
	detalle: [
		{
			fecha: new Date(2026, 0, 27),
			horaEntrada: new Date(2026, 0, 27, 8, 0),
			horaSalida: new Date(2026, 0, 27, 14, 0),
		},
	],
	conteoEstados: {},
};
// #endregion

// #region Tests
describe('AttendanceEstudianteComponent', () => {
	let component: AttendanceEstudianteComponent;
	let asistenciaServiceMock: Partial<AttendanceService>;
	let attendanceDataServiceMock: Partial<AttendanceDataService>;

	beforeEach(() => {
		asistenciaServiceMock = {
			getMisAsistencias: vi.fn().mockReturnValue(of(mockResumen)),
			getEstadosValidos: vi.fn().mockReturnValue(of([])),
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
				AttendanceEstudianteComponent,
				{ provide: AttendanceService, useValue: asistenciaServiceMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
				{ provide: AuthStore, useValue: { user: () => ({ nombreCompleto: 'Test User' }) } },
				{ provide: AttendanceSignalRService, useValue: { connect: vi.fn().mockResolvedValue(undefined), asistenciaRegistrada$: new Subject() } },
			],
		});

		component = TestBed.inject(AttendanceEstudianteComponent);
	});

	it('should be created', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize loading as false', () => {
		expect(component.loading()).toBe(false);
	});

	it('should load asistencias on init', () => {
		component.ngOnInit();
		expect(asistenciaServiceMock.getMisAsistencias).toHaveBeenCalled();
	});

	it('should set hasData to true when detalle is non-empty', () => {
		component.ngOnInit();
		expect(component.hasData()).toBe(true);
	});

	it('should set hasData to false when detalle is empty', () => {
		asistenciaServiceMock.getMisAsistencias = vi.fn().mockReturnValue(
			of({ estudianteId: 1, detalle: [] }),
		);

		component.ngOnInit();
		expect(component.hasData()).toBe(false);
	});

	it('should set hasData to false when response is null', () => {
		asistenciaServiceMock.getMisAsistencias = vi.fn().mockReturnValue(of(null));

		component.ngOnInit();
		expect(component.hasData()).toBe(false);
	});

	it('should call processAsistencias with current month and year', () => {
		const now = new Date();
		const currentMonth = now.getMonth() + 1;
		const currentYear = now.getFullYear();

		component.ngOnInit();

		expect(attendanceDataServiceMock.processAsistencias).toHaveBeenCalledWith(
			mockResumen.detalle,
			currentMonth,
			currentYear,
			'Test User',
			mockResumen.conteoEstados,
		);
	});

	it('should reload on reload()', () => {
		component.reload();
		expect(asistenciaServiceMock.getMisAsistencias).toHaveBeenCalled();
	});

	it('should call getMisAsistencias with new month on onIngresosMonthChange', () => {
		component.ngOnInit();
		(asistenciaServiceMock.getMisAsistencias as any).mockClear();

		component.onIngresosMonthChange(5);

		expect(asistenciaServiceMock.getMisAsistencias).toHaveBeenCalledWith(5, expect.any(Number));
	});

	it('should call getMisAsistencias with new month on onSalidasMonthChange', () => {
		component.ngOnInit();
		(asistenciaServiceMock.getMisAsistencias as any).mockClear();

		component.onSalidasMonthChange(8);

		expect(asistenciaServiceMock.getMisAsistencias).toHaveBeenCalledWith(8, expect.any(Number));
	});
});
// #endregion
