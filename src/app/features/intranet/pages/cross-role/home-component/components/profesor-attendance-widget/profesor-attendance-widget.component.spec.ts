// #region Imports
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { testProviders } from '@test';
import { UserProfileService } from '@core/services/user';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import { ProfesorHorarioHomeService } from '../../services/profesor-horario-home.service';
import { ProfesorAttendanceWidgetComponent } from './profesor-attendance-widget.component';
import {
	AttendanceService,
	AsistenciaProfesorApiService,
} from '@intranet-shared/services';
import {
	SalonProfesor,
	AsistenciaDiaConEstadisticas,
	AsistenciaProfesorDto,
	AsistenciaDetalle,
} from '@data/models';

// #endregion
// #region Fixtures
const salonTutor: SalonProfesor = {
	salonId: 1,
	grado: '1ro Secundaria',
	gradoCodigo: '1',
	graOrden: 10,
	seccion: 'B',
	nombreSalon: '1ro Secundaria B',
	anio: 2026,
	esTutor: true,
	totalEstudiantes: 20,
	estudiantes: [],
};

const salonTutorFueraAlcance: SalonProfesor = {
	salonId: 2,
	grado: '1ro Primaria',
	gradoCodigo: '1',
	graOrden: 4,
	seccion: 'A',
	nombreSalon: '1ro Primaria A',
	anio: 2026,
	esTutor: true,
	totalEstudiantes: 22,
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
	let horarios: HorarioProfesorDto[];

	const bootstrap = async () => {
		await TestBed.configureTestingModule({
			imports: [ProfesorAttendanceWidgetComponent],
			providers: [
				...testProviders,
				provideRouter([]),
				{ provide: UserProfileService, useValue: { entityId: () => 7 } },
				{ provide: ProfesorHorarioHomeService, useValue: { getHorarios: () => of(horarios) } },
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
		horarios = [];
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('profesor tutor', () => {
		it('should load both mi asistencia and mi salon', async () => {
			attendanceMock.getSalonesProfesor.mockReturnValue(of([salonTutor]));
			attendanceMock.getAsistenciaDia.mockReturnValue(of(asistenciaDia));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(miDto));

			await bootstrap();

			expect(component.loading()).toBe(false);
			expect(component.hasSalonData()).toBe(true);
			expect(component.salonLabel()).toBe('1ro Secundaria B');
			expect(component.stats()).toEqual(asistenciaDia.estadisticas);
			expect(component.miAsistencia()).toEqual(miAsistenciaDetalle);
			expect(component.miEstadoCodigo()).toBe('A');
			expect(component.miEstadoLabel()).toBe('Asistió');
			expect(component.miEstadoClass()).toBe('estado-asistio');
		});
	});

	describe('Plan 27 · INV-C11 — salón tutor fuera de alcance', () => {
		it('should flag salonFueraAlcance=true when tutor salon has graOrden < 5', async () => {
			attendanceMock.getSalonesProfesor.mockReturnValue(of([salonTutorFueraAlcance]));
			attendanceMock.getAsistenciaDia.mockReturnValue(of(asistenciaDia));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(miDto));

			await bootstrap();

			expect(component.hasSalonData()).toBe(true);
			expect(component.salonFueraAlcance()).toBe(true);
			expect(component.salonLabel()).toBe('1ro Primaria A');
		});

		it('should flag salonFueraAlcance=false when tutor salon has graOrden >= 5', async () => {
			attendanceMock.getSalonesProfesor.mockReturnValue(of([salonTutor]));
			attendanceMock.getAsistenciaDia.mockReturnValue(of(asistenciaDia));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(miDto));

			await bootstrap();

			expect(component.salonFueraAlcance()).toBe(false);
		});
	});

	describe('sin marcación propia (vacío útil)', () => {
		const clase = (partial: Partial<HorarioProfesorDto>): HorarioProfesorDto =>
			({
				id: 5,
				cursoId: 10,
				salonId: 100,
				diaSemana: 1,
				horaInicio: '08:00',
				horaFin: '09:00',
				cursoNombre: 'Física',
				salonDescripcion: 'Salón',
				...partial,
			}) as HorarioProfesorDto;
		const empty = () => (fixture.nativeElement as HTMLElement).querySelector('.widget-empty')?.textContent?.trim();
		const link = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.clase-asistencia-link');

		beforeEach(() => {
			attendanceMock.getSalonesProfesor.mockReturnValue(of([]));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(null));
			vi.useFakeTimers({ toFake: ['Date'] });
		});

		it('día de semana con clase pendiente → mensaje de causa y link a Asistencia de esa clase', async () => {
			vi.setSystemTime(new Date(2026, 8, 28, 7, 0, 0)); // lunes 07:00
			horarios = [clase({})];

			await bootstrap();

			expect(empty()).toContain('Aún no hay una marcación');
			expect(link()?.getAttribute('href')).toBe('/intranet/profesor/cursos/10/100/asistencia?horarioId=5');
		});

		it('elige la clase en curso, no la ya terminada', async () => {
			vi.setSystemTime(new Date(2026, 8, 28, 10, 30, 0));
			horarios = [
				clase({ id: 1, cursoId: 1, salonId: 11, horaInicio: '08:00', horaFin: '09:00' }),
				clase({ id: 2, cursoId: 2, salonId: 22, horaInicio: '10:00', horaFin: '11:00' }),
			];

			await bootstrap();

			expect(link()?.getAttribute('href')).toBe('/intranet/profesor/cursos/2/22/asistencia?horarioId=2');
		});

		it('sin clases pendientes hoy → solo mensaje, sin link', async () => {
			vi.setSystemTime(new Date(2026, 8, 28, 15, 0, 0));
			horarios = [clase({})];

			await bootstrap();

			expect(empty()).toContain('Aún no hay una marcación');
			expect(link()).toBeNull();
		});

		it('fin de semana → mensaje de fin de semana, sin link', async () => {
			vi.setSystemTime(new Date(2026, 9, 17, 10, 0, 0)); // sábado
			horarios = [clase({})];

			await bootstrap();

			expect(empty()).toContain('fin de semana');
			expect(link()).toBeNull();
		});

		it('clase sin salón no genera link', async () => {
			vi.setSystemTime(new Date(2026, 8, 28, 7, 0, 0));
			horarios = [clase({ salonId: 0 })];

			await bootstrap();

			expect(link()).toBeNull();
		});

		it('con marcación propia no se muestra el vacío ni el link', async () => {
			vi.setSystemTime(new Date(2026, 8, 28, 7, 0, 0));
			profesorApiMock.obtenerMiAsistenciaDia.mockReturnValue(of(miDto));
			horarios = [clase({})];

			await bootstrap();

			expect(link()).toBeNull();
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
