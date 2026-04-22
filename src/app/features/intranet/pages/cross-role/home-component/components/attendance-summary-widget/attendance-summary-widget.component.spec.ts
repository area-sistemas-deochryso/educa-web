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

	// #region Plan 27 · INV-C11 — widget respeta filtro del BE

	it('INV-C11: consume getEstadisticasDirector (endpoint ya filtrado por GRA_Orden >= 8 en Chat 2)', async () => {
		attendanceMock.getEstadisticasDirector.mockReturnValue(of(estudiantesStats));
		profesorApiMock.obtenerAsistenciaDiaProfesoresDirector.mockReturnValue(
			of(profesoresResponse),
		);

		await bootstrap();

		// El widget NO debe llamar a otro endpoint que pudiera traer grados bajos —
		// el contrato es "totalEstudiantes y conEntrada ya vienen filtrados por el BE".
		expect(attendanceMock.getEstadisticasDirector).toHaveBeenCalledTimes(1);
	});

	it('INV-C11: numerador y denominador del widget provienen del mismo stats filtrado', async () => {
		// Si ambos vienen del mismo objeto EstadisticasDia, el ratio es consistente —
		// no se puede mezclar "estudiantes con entrada (filtrado)" con "total sin filtro".
		const statsFiltrado: EstadisticasDia = {
			fecha: '2026-04-20',
			totalEstudiantes: 50, // solo GRA_Orden >= 8
			conEntrada: 40,
			asistenciasCompletas: 35,
			faltas: 10,
			porcentajeAsistencia: 80,
		};
		attendanceMock.getEstadisticasDirector.mockReturnValue(of(statsFiltrado));
		profesorApiMock.obtenerAsistenciaDiaProfesoresDirector.mockReturnValue(
			of(profesoresResponse),
		);

		await bootstrap();

		const stats = component.estStats();
		expect(stats?.totalEstudiantes).toBe(50);
		expect(stats?.conEntrada).toBe(40);
		// El porcentaje refleja el universo filtrado, no el total del colegio.
		expect(stats?.porcentajeAsistencia).toBe(80);
	});

	// #endregion
});
// #endregion
