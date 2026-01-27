import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { AttendanceApoderadoComponent } from './attendance-apoderado.component';
import { AsistenciaService, StorageService, HijoApoderado } from '@core/services';
import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';

describe('AttendanceApoderadoComponent', () => {
	let component: AttendanceApoderadoComponent;
	let fixture: ComponentFixture<AttendanceApoderadoComponent>;
	let asistenciaServiceMock: Partial<AsistenciaService>;
	let storageServiceMock: Partial<StorageService>;
	let attendanceDataServiceMock: Partial<AttendanceDataService>;

	const mockHijos: HijoApoderado[] = [
		{
			estudianteId: 1,
			dni: '12345678',
			nombreCompleto: 'Juan Pérez',
			grado: 1,
			seccion: 'A',
			relacion: 'Hijo',
		},
		{
			estudianteId: 2,
			dni: '87654321',
			nombreCompleto: 'María Pérez',
			grado: 2,
			seccion: 'B',
			relacion: 'Hija',
		},
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

	beforeEach(async () => {
		asistenciaServiceMock = {
			getHijos: vi.fn().mockReturnValue(of(mockHijos)),
			getAsistenciaHijo: vi.fn().mockReturnValue(
				of({
					estudianteId: 1,
					detalle: [],
				}),
			),
		};

		storageServiceMock = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			getSelectedHijoId: vi.fn().mockReturnValue(null),
			setSelectedHijoId: vi.fn(),
		};

		attendanceDataServiceMock = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi
				.fn()
				.mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceApoderadoComponent],
			providers: [
				...testProviders,
				{ provide: AsistenciaService, useValue: asistenciaServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: AttendanceDataService, useValue: attendanceDataServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceApoderadoComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should load hijos on init', () => {
		fixture.detectChanges();
		expect(asistenciaServiceMock.getHijos).toHaveBeenCalled();
		expect(component.hijos()).toEqual(mockHijos);
	});

	it('should select first hijo automatically if none selected', () => {
		fixture.detectChanges();
		expect(component.selectedHijoId()).toBe(1);
	});

	it('should compute selectedHijo correctly', () => {
		fixture.detectChanges();
		expect(component.selectedHijo()?.nombreCompleto).toBe('Juan Pérez');
	});

	it('should call selectHijo and load asistencias', () => {
		fixture.detectChanges();
		component.selectHijo(2);

		expect(component.selectedHijoId()).toBe(2);
		expect(storageServiceMock.setSelectedHijoId).toHaveBeenCalledWith(2);
		expect(asistenciaServiceMock.getAsistenciaHijo).toHaveBeenCalled();
	});

	it('should call getAttendanceMonth from storage on init', () => {
		fixture.detectChanges();
		expect(storageServiceMock.getAttendanceMonth).toHaveBeenCalled();
	});

	it('should save month to storage when month changes', () => {
		fixture.detectChanges();

		component.onIngresosMonthChange(5);

		// Storage should be called
		expect(storageServiceMock.setAttendanceMonth).toHaveBeenCalled();
	});

	it('should handle empty hijos list', () => {
		asistenciaServiceMock.getHijos = vi.fn().mockReturnValue(of([]));

		const newFixture = TestBed.createComponent(AttendanceApoderadoComponent);
		const newComponent = newFixture.componentInstance;
		newFixture.detectChanges();

		expect(newComponent.hijos()).toEqual([]);
		expect(newComponent.selectedHijoId()).toBeNull();
	});

	it('should reload data when reload method is called', () => {
		fixture.detectChanges();

		const spy = vi.spyOn(asistenciaServiceMock, 'getAsistenciaHijo');
		component.reload();

		expect(spy).toHaveBeenCalled();
	});
});
