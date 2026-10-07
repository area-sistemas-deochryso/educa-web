// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { EstudianteAttendanceWidgetComponent } from './estudiante-attendance-widget.component';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import { MiAsistenciaCursoResumenDto } from '@features/intranet/pages/estudiante/models/estudiante.models';
import { formatDateISO } from '@intranet-shared/helpers';

// #endregion
// #region Fixtures
const HOY = formatDateISO(new Date());

const buildResumen = (overrides: Partial<MiAsistenciaCursoResumenDto> = {}): MiAsistenciaCursoResumenDto => ({
	cursoId: 5,
	horarioId: 10,
	cursoNombre: 'Biología',
	salonDescripcion: '1ro A',
	totalPresente: 1,
	totalTarde: 0,
	totalFalto: 0,
	totalClases: 1,
	detalle: [{ asistenciaCursoId: 1, fecha: `${HOY}T00:00:00`, estado: 'J', justificacion: null }],
	...overrides,
});

// #endregion
// #region Implementation
describe('EstudianteAttendanceWidgetComponent', () => {
	let fixture: ComponentFixture<EstudianteAttendanceWidgetComponent>;
	let component: EstudianteAttendanceWidgetComponent;
	let apiMock: { getMiAsistenciaActiva: ReturnType<typeof vi.fn> };

	const bootstrap = async (resumen: MiAsistenciaCursoResumenDto | undefined) => {
		apiMock.getMiAsistenciaActiva.mockReturnValue(of({ resumen }));
		await TestBed.configureTestingModule({
			imports: [EstudianteAttendanceWidgetComponent],
			providers: [...testProviders, { provide: EstudianteApiService, useValue: apiMock }],
		}).compileComponents();

		fixture = TestBed.createComponent(EstudianteAttendanceWidgetComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
		await fixture.whenStable();
	};

	beforeEach(() => {
		apiMock = { getMiAsistenciaActiva: vi.fn() };
	});

	it('should match today when fecha comes with time from the backend', async () => {
		await bootstrap(buildResumen());

		expect(component.estadoHoy()).toBe('J');
		expect(component.hasDataHoy()).toBe(true);
	});

	it('should match today when fecha comes without time', async () => {
		await bootstrap(buildResumen({ detalle: [{ asistenciaCursoId: 1, fecha: HOY, estado: 'T', justificacion: null }] }));

		expect(component.estadoHoy()).toBe('T');
	});

	it('should show empty state when there is no record for today', async () => {
		await bootstrap(
			buildResumen({ detalle: [{ asistenciaCursoId: 1, fecha: '2020-01-01T00:00:00', estado: 'A', justificacion: null }] }),
		);

		expect(component.hasDataHoy()).toBe(false);
		expect(fixture.nativeElement.textContent).toContain('Sin datos de asistencia para hoy');
	});

	it('should render the neutral chip when cursoId is null', async () => {
		await bootstrap(buildResumen({ cursoId: null }));

		expect(component.cursoId()).toBeNull();
		expect(component.hasDataHoy()).toBe(true);
		expect(fixture.nativeElement.textContent).toContain('Biología');
	});
});
// #endregion
