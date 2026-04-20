// * Tests for AttendanceDirectorProfesoresComponent — rediseño Plan 21 Chat 7.
// * Verifica que el shell contract (setViewMode/reload) dispara la carga del modo activo
// * y que el componente inicializa en modo día consumiendo el endpoint nuevo.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { testProviders } from '@test';
import { AsistenciaProfesorApiService } from '@shared/services/attendance';
import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';

import { AttendanceDirectorProfesoresComponent } from './attendance-director-profesores.component';
// #endregion

// #region Mocks
const emptyTable = {
	title: 'Test',
	selectedMonth: 4,
	selectedYear: 2026,
	weeks: [],
	counts: { T: 0, A: 0, F: 0, J: 0, '-': 0, X: 0 },
	columnTotals: [],
	grandTotal: '0/0',
};

const diaVacio = {
	profesores: [],
	estadisticas: { total: 0, asistio: 0, tardanza: 0, falta: 0, justificado: 0, pendiente: 0 },
};
// #endregion

describe('AttendanceDirectorProfesoresComponent', () => {
	let component: AttendanceDirectorProfesoresComponent;
	let fixture: ComponentFixture<AttendanceDirectorProfesoresComponent>;
	let apiMock: { [k in keyof AsistenciaProfesorApiService]?: ReturnType<typeof vi.fn> };

	beforeEach(async () => {
		apiMock = {
			obtenerAsistenciaDiaProfesoresDirector: vi.fn().mockReturnValue(of(diaVacio)),
			listarProfesores: vi.fn().mockReturnValue(
				of({ data: [], pagination: { page: 1, pageSize: 500, total: 0, totalPages: 0 } }),
			),
			descargarPdfReporteFiltradoProfesores: vi.fn().mockReturnValue(of(new Blob())),
			descargarPdfProfesorMes: vi.fn().mockReturnValue(of(new Blob())),
		};

		const dataServiceMock: Partial<AttendanceDataService> = {
			createEmptyTable: vi.fn().mockReturnValue(emptyTable),
			processAsistencias: vi
				.fn()
				.mockReturnValue({ ingresos: emptyTable, salidas: emptyTable }),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceDirectorProfesoresComponent],
			providers: [
				...testProviders,
				{ provide: AsistenciaProfesorApiService, useValue: apiMock },
				{ provide: AttendanceDataService, useValue: dataServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceDirectorProfesoresComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize in day mode and call obtenerAsistenciaDiaProfesoresDirector on init', () => {
		fixture.detectChanges();

		expect(component.viewMode()).toBe('dia');
		expect(apiMock.obtenerAsistenciaDiaProfesoresDirector).toHaveBeenCalledTimes(1);
		expect(component.profesoresDia()).toEqual([]);
		expect(component.estadisticasDia().total).toBe(0);
	});

	it('should call listarProfesores when setViewMode switches to month', () => {
		fixture.detectChanges();
		expect(apiMock.listarProfesores).not.toHaveBeenCalled();

		component.setViewMode('mes');

		expect(component.viewMode()).toBe('mes');
		expect(apiMock.listarProfesores).toHaveBeenCalledTimes(1);
	});
});
