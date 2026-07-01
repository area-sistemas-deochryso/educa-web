// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { testProviders } from '@test';
import { AttendanceSummaryWidgetComponent } from './attendance-summary-widget.component';
import { DirectorAttendanceApiService } from '@intranet-shared/services';
import { EstadisticasMultiRolDia, EstadisticasRol } from '@data/models';

// #endregion
// #region Fixtures
const estudiantesRol: EstadisticasRol = {
	tipoPersona: 'E',
	total: 100,
	conEntrada: 90,
	completas: 80,
	tardanza: 5,
	faltas: 10,
	porcentaje: 90,
};

const profesoresRol: EstadisticasRol = {
	tipoPersona: 'P',
	total: 20,
	conEntrada: 18,
	completas: 15,
	tardanza: 3,
	faltas: 2,
	porcentaje: 90,
};

const multiRolResponse: EstadisticasMultiRolDia = {
	fecha: '2026-04-20',
	roles: [estudiantesRol, profesoresRol],
};

// #endregion
// #region Implementation
describe('AttendanceSummaryWidgetComponent', () => {
	let component: AttendanceSummaryWidgetComponent;
	let fixture: ComponentFixture<AttendanceSummaryWidgetComponent>;
	let directorApiMock: { getEstadisticasMultiRol: ReturnType<typeof vi.fn> };

	const bootstrap = async () => {
		await TestBed.configureTestingModule({
			imports: [AttendanceSummaryWidgetComponent],
			providers: [
				...testProviders,
				{ provide: DirectorAttendanceApiService, useValue: directorApiMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceSummaryWidgetComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
		await fixture.whenStable();
	};

	beforeEach(() => {
		directorApiMock = { getEstadisticasMultiRol: vi.fn() };
	});

	it('should populate roles when API succeeds', async () => {
		directorApiMock.getEstadisticasMultiRol.mockReturnValue(of(multiRolResponse));

		await bootstrap();

		expect(component.loading()).toBe(false);
		expect(component.roles().length).toBe(2);
		expect(component.roles()[0].tipoPersona).toBe('E');
		expect(component.roles()[0].label).toBe('Estudiantes');
		expect(component.roles()[1].tipoPersona).toBe('P');
		expect(component.roles()[1].label).toBe('Profesores');
	});

	it('should set loading false and empty roles when API fails', async () => {
		directorApiMock.getEstadisticasMultiRol.mockReturnValue(
			throwError(() => new Error('fail')),
		);

		await bootstrap();

		expect(component.loading()).toBe(false);
		expect(component.roles()).toEqual([]);
	});

	it('should set loading false and empty roles when API returns null', async () => {
		directorApiMock.getEstadisticasMultiRol.mockReturnValue(of(null));

		await bootstrap();

		expect(component.loading()).toBe(false);
		expect(component.roles()).toEqual([]);
	});

	// #region INV-C11 — widget respects BE filter

	it('INV-C11: calls getEstadisticasMultiRol exactly once', async () => {
		directorApiMock.getEstadisticasMultiRol.mockReturnValue(of(multiRolResponse));

		await bootstrap();

		expect(directorApiMock.getEstadisticasMultiRol).toHaveBeenCalledTimes(1);
	});

	it('INV-C11: stats come from the same multi-rol response (consistent ratio)', async () => {
		const filteredRol: EstadisticasRol = {
			tipoPersona: 'E',
			total: 50,
			conEntrada: 40,
			completas: 35,
			tardanza: 3,
			faltas: 10,
			porcentaje: 80,
		};
		directorApiMock.getEstadisticasMultiRol.mockReturnValue(
			of({ fecha: '2026-04-20', roles: [filteredRol, profesoresRol] }),
		);

		await bootstrap();

		const estRole = component.roles().find((r) => r.tipoPersona === 'E');
		expect(estRole?.stats.total).toBe(50);
		expect(estRole?.stats.conEntrada).toBe(40);
		expect(estRole?.stats.porcentaje).toBe(80);
	});

	// #endregion
});
// #endregion
