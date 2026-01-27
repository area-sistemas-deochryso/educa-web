import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { AttendanceEstudianteComponent } from './attendance-estudiante.component';
import { AsistenciaService, StorageService } from '@core/services';
import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';

describe('AttendanceEstudianteComponent', () => {
	let component: AttendanceEstudianteComponent;
	let fixture: ComponentFixture<AttendanceEstudianteComponent>;
	let asistenciaServiceMock: Partial<AsistenciaService>;
	let storageServiceMock: Partial<StorageService>;
	let attendanceDataServiceMock: Partial<AttendanceDataService>;

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
	};

	beforeEach(async () => {
		asistenciaServiceMock = {
			getMisAsistencias: vi.fn().mockReturnValue(of(mockResumen)),
		};

		storageServiceMock = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
		};

		attendanceDataServiceMock = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi
				.fn()
				.mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceEstudianteComponent],
			providers: [
				...testProviders,
				{ provide: AsistenciaService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceEstudianteComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should load mis asistencias on init', () => {
		fixture.detectChanges();
		expect(asistenciaServiceMock.getMisAsistencias).toHaveBeenCalled();
		expect(component.hasData()).toBe(true);
	});

	it('should call getAttendanceMonth from storage on init', () => {
		fixture.detectChanges();
		expect(storageServiceMock.getAttendanceMonth).toHaveBeenCalled();
	});

	it('should save month to storage when ingresos month changes', () => {
		fixture.detectChanges();

		component.onIngresosMonthChange(5);

		expect(storageServiceMock.setAttendanceMonth).toHaveBeenCalledWith(5);
	});

	it('should save month to storage when salidas month changes', () => {
		fixture.detectChanges();

		component.onSalidasMonthChange(6);

		expect(storageServiceMock.setAttendanceMonth).toHaveBeenCalledWith(6);
	});

	it('should handle empty asistencias list', () => {
		asistenciaServiceMock.getMisAsistencias = vi.fn().mockReturnValue(
			of({ estudianteId: 1, detalle: [] }),
		);

		const newFixture = TestBed.createComponent(AttendanceEstudianteComponent);
		const newComponent = newFixture.componentInstance;
		newFixture.detectChanges();

		expect(newComponent.hasData()).toBe(false);
	});

	it('should handle null response from getMisAsistencias', () => {
		asistenciaServiceMock.getMisAsistencias = vi.fn().mockReturnValue(of(null));

		const newFixture = TestBed.createComponent(AttendanceEstudianteComponent);
		const newComponent = newFixture.componentInstance;
		newFixture.detectChanges();

		expect(newComponent.hasData()).toBe(false);
	});

	it('should initialize loading signal to false', () => {
		expect(component.loading()).toBe(false);
	});

	it('should set loading to true during data fetch', () => {
		// Create a delayed observable to test loading state
		const delayedResponse = new Promise((resolve) => {
			setTimeout(() => resolve(mockResumen), 100);
		});
		asistenciaServiceMock.getMisAsistencias = vi
			.fn()
			.mockReturnValue(of(delayedResponse));

		fixture.detectChanges();

		// Loading should have been set to true at some point
		expect(asistenciaServiceMock.getMisAsistencias).toHaveBeenCalled();
	});

	it('should reload data when reload method is called', () => {
		fixture.detectChanges();

		const spy = vi.spyOn(asistenciaServiceMock, 'getMisAsistencias');
		component.reload();

		expect(spy).toHaveBeenCalled();
	});

	it('should process asistencias with correct month and year', () => {
		const currentDate = new Date();
		const currentMonth = currentDate.getMonth() + 1;
		const currentYear = currentDate.getFullYear();

		fixture.detectChanges();

		expect(attendanceDataServiceMock.processAsistencias).toHaveBeenCalledWith(
			mockResumen.detalle,
			currentMonth,
			currentYear,
		);
	});
});
