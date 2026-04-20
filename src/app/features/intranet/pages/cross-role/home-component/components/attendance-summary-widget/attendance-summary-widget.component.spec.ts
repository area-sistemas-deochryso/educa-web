// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { testProviders } from '@test';
import { AttendanceSummaryWidgetComponent } from './attendance-summary-widget.component';
import {
	AttendanceService,
	AsistenciaProfesorApiService,
} from '@shared/services/attendance';
import {
	EstadisticasDia,
	AsistenciaDiaProfesoresConEstadisticas,
} from '@data/models/attendance.models';

// #endregion
// #region Fixtures
const estudiantesStats: EstadisticasDia = {
	fecha: '2026-04-20',
	totalEstudiantes: 100,
	conEntrada: 90,
	asistenciasCompletas: 80,
	faltas: 10,
	porcentajeAsistencia: 90,
};

const profesoresResponse: AsistenciaDiaProfesoresConEstadisticas = {
	profesores: [],
	estadisticas: {
		total: 20,
		asistio: 15,
		tardanza: 3,
		falta: 2,
		justificado: 0,
		pendiente: 0,
	},
};

// #endregion
// #region Implementation
describe('AttendanceSummaryWidgetComponent', () => {
	let component: AttendanceSummaryWidgetComponent;
	let fixture: ComponentFixture<AttendanceSummaryWidgetComponent>;
	let attendanceMock: { getEstadisticasDirector: ReturnType<typeof vi.fn> };
	let profesorApiMock: { obtenerAsistenciaDiaProfesoresDirector: ReturnType<typeof vi.fn> };

	const bootstrap = async () => {
		await TestBed.configureTestingModule({
			imports: [AttendanceSummaryWidgetComponent],
			providers: [
				...testProviders,
				{ provide: AttendanceService, useValue: attendanceMock },
				{ provide: AsistenciaProfesorApiService, useValue: profesorApiMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceSummaryWidgetComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
		await fixture.whenStable();
	};

	beforeEach(() => {
		attendanceMock = { getEstadisticasDirector: vi.fn() };
		profesorApiMock = { obtenerAsistenciaDiaProfesoresDirector: vi.fn() };
	});

	it('should populate both sections when both calls succeed', async () => {
		attendanceMock.getEstadisticasDirector.mockReturnValue(of(estudiantesStats));
		profesorApiMock.obtenerAsistenciaDiaProfesoresDirector.mockReturnValue(
			of(profesoresResponse),
		);

		await bootstrap();

		expect(component.loading()).toBe(false);
		expect(component.estStats()).toEqual(estudiantesStats);
		expect(component.profStats()).toEqual(profesoresResponse.estadisticas);
		expect(component.profPresentes()).toBe(18);
		expect(component.profPorcentaje()).toBe(90);
	});

	it('should show estudiantes empty when that call fails but profesores succeeds', async () => {
		attendanceMock.getEstadisticasDirector.mockReturnValue(
			throwError(() => new Error('fail')),
		);
		profesorApiMock.obtenerAsistenciaDiaProfesoresDirector.mockReturnValue(
			of(profesoresResponse),
		);

		await bootstrap();

		expect(component.loading()).toBe(false);
		expect(component.estStats()).toBeNull();
		expect(component.profStats()).toEqual(profesoresResponse.estadisticas);
	});

	it('should show profesores empty when that call fails but estudiantes succeeds', async () => {
		attendanceMock.getEstadisticasDirector.mockReturnValue(of(estudiantesStats));
		profesorApiMock.obtenerAsistenciaDiaProfesoresDirector.mockReturnValue(
			throwError(() => new Error('fail')),
		);

		await bootstrap();

		expect(component.loading()).toBe(false);
		expect(component.estStats()).toEqual(estudiantesStats);
		expect(component.profStats()).toBeNull();
	});
});
// #endregion
