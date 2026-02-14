// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { AttendanceDirectorComponent } from './attendance-director.component';
import {
	AsistenciaService,
	StorageService,
	GradoSeccion,
	EstudianteAsistencia,
} from '@core/services';
import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';

// #endregion
// #region Implementation
describe('AttendanceDirectorComponent', () => {
	let component: AttendanceDirectorComponent;
	let fixture: ComponentFixture<AttendanceDirectorComponent>;
	let asistenciaServiceMock: Partial<AsistenciaService>;
	let storageServiceMock: Partial<StorageService>;
	let attendanceDataServiceMock: Partial<AttendanceDataService>;

	const mockGradosSecciones: GradoSeccion[] = [
		{ grado: 1, seccion: 'A' },
		{ grado: 1, seccion: 'B' },
		{ grado: 2, seccion: 'A' },
	];

	const mockEstudiantes: EstudianteAsistencia[] = [
		{
			estudianteId: 1,
			dni: '12345678',
			nombreCompleto: 'Juan PÃƒÂ©rez',
			grado: 1,
			seccion: 'A',
			asistencias: [],
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
			getGradosSeccionesDisponibles: vi.fn().mockReturnValue(of(mockGradosSecciones)),
			getReporteDirector: vi.fn().mockReturnValue(of(mockEstudiantes)),
			getAsistenciaDiaDirector: vi.fn().mockReturnValue(of(mockEstudiantes)),
			descargarPdfAsistenciaDia: vi.fn().mockReturnValue(of(new Blob())),
		};

		storageServiceMock = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			getSelectedGradoSeccionDirector: vi.fn().mockReturnValue(null),
			setSelectedGradoSeccionDirector: vi.fn(),
			getSelectedEstudianteDirectorId: vi.fn().mockReturnValue(null),
			setSelectedEstudianteDirectorId: vi.fn(),
		};

		attendanceDataServiceMock = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi
				.fn()
				.mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
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

	it('should load grados y secciones on init', () => {
		fixture.detectChanges();
		expect(asistenciaServiceMock.getGradosSeccionesDisponibles).toHaveBeenCalled();
		expect(component.gradosSecciones()).toEqual(mockGradosSecciones);
	});

	it('should select first grado/seccion automatically', () => {
		fixture.detectChanges();
		expect(component.selectedGradoSeccion()).toEqual({ grado: 1, seccion: 'A' });
	});


	it('should load estudiantes when grado/seccion is selected', () => {
		fixture.detectChanges();
		expect(asistenciaServiceMock.getReporteDirector).toHaveBeenCalledWith(undefined, 1, 'A');
		expect(component.estudiantes()).toEqual(mockEstudiantes);
	});

	it('should change grado/seccion selection', () => {
		fixture.detectChanges();
		component.selectGradoSeccion({ grado: 2, seccion: 'A' });

		expect(component.selectedGradoSeccion()).toEqual({ grado: 2, seccion: 'A' });
		expect(storageServiceMock.setSelectedGradoSeccionDirector).toHaveBeenCalledWith({
			grado: 2,
			seccion: 'A',
		});
	});

	it('should change view mode to dia', () => {
		fixture.detectChanges();
		component.setViewMode('dia');

		expect(component.viewMode()).toBe('dia');
		expect(asistenciaServiceMock.getAsistenciaDiaDirector).toHaveBeenCalled();
	});

	it('should change view mode back to mes', () => {
		fixture.detectChanges();
		component.setViewMode('dia');
		component.setViewMode('mes');

		expect(component.viewMode()).toBe('mes');
	});

	it('should update fecha dia and reload', () => {
		fixture.detectChanges();
		component.setViewMode('dia');

		const newDate = new Date(2026, 2, 15);
		component.onFechaDiaChange(newDate);

		expect(component.fechaDia()).toEqual(newDate);
		expect(asistenciaServiceMock.getAsistenciaDiaDirector).toHaveBeenCalledTimes(2);
	});

	it('should select estudiante', () => {
		fixture.detectChanges();

		// The component auto-selects the first estudiante during loadEstudiantes
		expect(component.selectedEstudianteId()).toBe(1);
	});

	it('should transform estudiantes to hijos format', () => {
		fixture.detectChanges();
		const hijos = component.estudiantesAsHijos();

		expect(hijos.length).toBe(1);
		expect(hijos[0].nombreCompleto).toBe('Juan PÃƒÂ©rez');
		expect(hijos[0].relacion).toBe('Estudiante');
	});

	it('should download PDF', () => {
		fixture.detectChanges();

		component.descargarPdfAsistenciaDia();

		expect(asistenciaServiceMock.descargarPdfAsistenciaDia).toHaveBeenCalledWith(1, 'A');
	});

	it('should initialize downloadingPdf as false', () => {
		fixture.detectChanges();
		expect(component.downloadingPdf()).toBe(false);
	});

	it('should reload data when reload method is called in mes mode', () => {
		fixture.detectChanges();

		const spyEstudiantes = vi.spyOn(asistenciaServiceMock, 'getReporteDirector');

		component.reload();

		expect(spyEstudiantes).toHaveBeenCalled();
	});

	it('should reload data when reload method is called in dia mode', () => {
		fixture.detectChanges();
		component.setViewMode('dia');

		const spyDia = vi.spyOn(asistenciaServiceMock, 'getAsistenciaDiaDirector');

		component.reload();

		expect(spyDia).toHaveBeenCalled();
	});
});
// #endregion
