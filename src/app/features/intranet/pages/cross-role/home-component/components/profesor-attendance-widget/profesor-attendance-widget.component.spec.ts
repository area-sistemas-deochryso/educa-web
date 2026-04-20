// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { ProfesorAttendanceWidgetComponent } from './profesor-attendance-widget.component';
import {
	AttendanceService,
	AsistenciaProfesorApiService,
} from '@shared/services/attendance';
import {
	SalonProfesor,
	AsistenciaDiaConEstadisticas,
	AsistenciaProfesorDto,
	AsistenciaDetalle,
} from '@data/models/attendance.models';

// #endregion
// #region Fixtures
const salonTutor: SalonProfesor = {
	salonId: 1,
	grado: '4to',
	gradoCodigo: '4',
	seccion: 'B',
	nombreSalon: '4to B',
	anio: 2026,
	esTutor: true,
	totalEstudiantes: 20,
	estudiantes: [],
};

const asistenciaDia: AsistenciaDiaConEstadisticas = {
	estudiantes: [],
	estadisticas: {
		total: 20,
		asistio: 15,
		tardanza: 3,
		falta: 2,
		justificado: 0,
		pendiente: 0,
	},
};

const miAsistenciaDetalle: AsistenciaDetalle = {
	asistenciaId: 99,
	fecha: '2026-04-20',
	sede: 'Principal',
	horaEntrada: '07:45',
	horaSalida: '14:05',
	estado: 'Completa',
	observacion: null,
	estadoCodigo: 'A',
	estadoDescripcion: 'Asistió',
	puedeJustificar: false,
	esJustificado: false,
	estadoIngreso: 'A',
	estadoSalida: 'A',
};

const miDto: AsistenciaProfesorDto = {
	profesorId: 11,
	dni: '12345678',
	nombreCompleto: 'Prof Tutor',
	sede: 'Principal',
	sedeId: 1,
	tipoPersona: 'P',
	asistencias: [miAsistenciaDetalle],
};

// #endregion
// #region Implementation
describe('ProfesorAttendanceWidgetComponent', () => {
	let component: ProfesorAttendanceWidgetComponent;
	let fixture: ComponentFixture<ProfesorAttendanceWidgetComponent>;
	let attendanceMock: {
		getSalonesProfesor: ReturnType<typeof vi.fn>;
		getAsistenciaDia: ReturnType<typeof vi.fn>;
	};
	let profesorApiMock: { obtenerMiAsistenciaDia: ReturnType<typeof vi.fn> };

	const bootstrap = async () => {
		await TestBed.configureTestingModule({
			imports: [ProfesorAttendanceWidgetComponent],
			providers: [
				...testProviders,
				{ provide: AttendanceService, useValue: attendanceMock },
				{ provide: AsistenciaProfesorApiService, useValue: profesorApiMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ProfesorAttendanceWidgetComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
		await fixture.whenStable();
	};

	beforeEach(() => {
		attendanceMock = {
			getSalonesProfesor: vi.fn(),
			getAsistenciaDia: vi.fn(),
		};
		profesorApiMock = { obtenerMiAsistenciaDia: vi.fn() };
	});

	describe('profesor tutor', () => {
		it('should load both mi asistencia and mi salon', async () => {
			attendanceMock.getSalonesProfesor.mockReturnValue(of([salonTutor]));
			attendanceMock.getAsistenciaDia.mockReturnValue(of(asistenciaDia));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(miDto));

			await bootstrap();

			expect(component.loading()).toBe(false);
			expect(component.hasSalonData()).toBe(true);
			expect(component.salonLabel()).toBe('4to B');
			expect(component.stats()).toEqual(asistenciaDia.estadisticas);
			expect(component.miAsistencia()).toEqual(miAsistenciaDetalle);
			expect(component.miEstadoCodigo()).toBe('A');
			expect(component.miEstadoLabel()).toBe('Asistió');
			expect(component.miEstadoClass()).toBe('estado-asistio');
		});
	});

	describe('profesor no tutor', () => {
		it('should load only mi asistencia (no salon section, no getAsistenciaDia call)', async () => {
			attendanceMock.getSalonesProfesor.mockReturnValue(of([]));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(miDto));

			await bootstrap();

			expect(component.loading()).toBe(false);
			expect(component.hasSalonData()).toBe(false);
			expect(component.salon()).toBeNull();
			expect(component.stats()).toBeNull();
			expect(component.miAsistencia()).toEqual(miAsistenciaDetalle);
			expect(attendanceMock.getAsistenciaDia).not.toHaveBeenCalled();
		});

		it('should ignore non-tutor salones (esTutor === false)', async () => {
			const salonNoTutor: SalonProfesor = { ...salonTutor, esTutor: false };
			attendanceMock.getSalonesProfesor.mockReturnValue(of([salonNoTutor]));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(miDto));

			await bootstrap();

			expect(component.hasSalonData()).toBe(false);
			expect(attendanceMock.getAsistenciaDia).not.toHaveBeenCalled();
		});
	});
});
// #endregion
