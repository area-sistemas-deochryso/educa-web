import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentAttendanceComponent } from './student-attendance.component';
import { EstudianteFacade } from '../services/estudiante.facade';
import { DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SecurityContext } from '@angular/core';

const mockEstudianteFacade = {
	getMiAsistenciaActiva: vi.fn(() => of({ horarios: [] })),
	getMiAsistencia: vi.fn(),
	getMisSolicitudes: vi.fn(),
	crearSolicitudJustificacion: vi.fn(),
};

const mockDestroyRef = {
	onDestroy: vi.fn(),
};

const mockActivatedRoute = {
	snapshot: {
		queryParamMap: {
			get: vi.fn(() => null),
		},
	},
};

describe('StudentAttendanceComponent', () => {
	let fixture: ComponentFixture<StudentAttendanceComponent>;
	let component: StudentAttendanceComponent;
	let api: EstudianteFacade;

	beforeEach(() => {
		vi.clearAllMocks();

		TestBed.configureTestingModule({
			imports: [StudentAttendanceComponent],
			providers: [
				{ provide: EstudianteFacade, useValue: mockEstudianteFacade },
				{ provide: DestroyRef, useValue: mockDestroyRef },
				{ provide: ActivatedRoute, useValue: mockActivatedRoute },
			],
		});

		fixture = TestBed.createComponent(StudentAttendanceComponent);
		component = fixture.componentInstance;
		api = TestBed.inject(EstudianteFacade);
	});

	it('debe crear el componente', () => {
		expect(component).toBeTruthy();
	});

	it('debe inicializar con estado vacío', () => {
		expect(component.selectedHorarioId()).toBeNull();
		expect(component.asistencia()).toBeNull();
		expect(component.pageLoading()).toBe(false);
		expect(component.horariosError()).toBeNull();
	});

	it('debe cargar solicitudes en ngOnInit', () => {
		vi.mocked(api.getMisSolicitudes).mockReturnValue(of([]));
		component.ngOnInit();
		expect(api.getMisSolicitudes).toHaveBeenCalled();
	});

	it('debe cargar asistencia cuando se selecciona un horario', () => {
		const asistencia = {
			cursoId: 1,
			horarioId: 5,
			cursoNombre: 'Matemáticas',
			salonDescripcion: '1ro A',
			totalPresente: 10,
			totalTarde: 3,
			totalFalto: 1,
			totalClases: 14,
			detalle: [],
		};
		vi.mocked(api.getMiAsistencia).mockReturnValue(of(asistencia));

		component.onCursoChange(5);

		expect(component.selectedHorarioId()).toBe(5);
		expect(api.getMiAsistencia).toHaveBeenCalledWith(5);
		expect(component.asistencia()).toEqual(asistencia);
	});

	it('debe manejar error al cargar asistencia', () => {
		vi.mocked(api.getMiAsistencia).mockReturnValue(throwError(() => new Error('Error')));
		component.selectedHorarioId.set(5);
		expect(() => component.onRetryAsistencia()).not.toThrow();
	});

	it('debe obtener etiqueta de estado', () => {
		expect(component.getEstadoLabel('P')).toBeTruthy();
		expect(component.getEstadoLabel('T')).toBeTruthy();
		expect(component.getEstadoLabel('F')).toBeTruthy();
		expect(component.getEstadoLabel('J')).toBeTruthy();
		expect(component.getEstadoLabel('X')).toBeTruthy();
	});

	it('debe obtener severidad de estado', () => {
		expect(component.getEstadoSeverity('P')).toBe('success');
		expect(component.getEstadoSeverity('T')).toBe('warn');
		expect(component.getEstadoSeverity('F')).toBe('danger');
		expect(component.getEstadoSeverity('J')).toBe('info');
		expect(component.getEstadoSeverity('X')).toBe('info');
	});

	it('debe obtener estado de justificación - con justificación', () => {
		const item = {
			asistenciaCursoId: 1,
			fecha: '2026-03-15',
			estado: 'P',
			justificacion: 'Justificado por enfermedad',
		} as any;
		expect(component.getJustificacionState(item)).toEqual({
			kind: 'text',
			text: 'Justificado por enfermedad',
		});
	});

	it('debe obtener estado de justificación - sin justificación', () => {
		const item = {
			asistenciaCursoId: 1,
			fecha: '2026-03-15',
			estado: 'P',
			justificacion: null,
		} as any;
		expect(component.getJustificacionState(item)).toEqual({ kind: 'dash' });
	});

	it('debe abrir dialog de justificar', () => {
		const item = { asistenciaCursoId: 1, fecha: '2026-03-15', estado: 'F', justificacion: null } as any;
		component.onAbrirJustificar(item);
		expect(component.justificarDialogVisible()).toBe(true);
		expect(component.justificarContext()?.asistenciaCursoId).toBe(1);
		expect(component.justificarContext()?.fecha).toBe('2026-03-15');
	});

	it('debe cerrar dialog de justificar', () => {
		component._justificarDialogVisible.set(true);
		component._justificarContext.set({ asistenciaCursoId: 1, fecha: '2026-03-15', motivoRechazoAnterior: null } as any);
		component.onJustificarDialogVisibleChange(false);
		expect(component.justificarDialogVisible()).toBe(false);
		expect(component.justificarContext()).toBeNull();
	});

	it('debe guardar justificación', () => {
		const payload = { asistenciaCursoId: 1, formData: new FormData() } as any;
		const solicitudCreada = { asistenciaCursoId: 1, estado: 'PENDIENTE' } as any;
		vi.mocked(api.crearSolicitudJustificacion).mockReturnValue(of(solicitudCreada));

		component.onGuardarJustificacion(payload);

		expect(api.crearSolicitudJustificacion).toHaveBeenCalledWith(payload.formData);
		expect(component.solicitudSaving()).toBe(false);
		expect(component.justificarDialogVisible()).toBe(false);
		expect(component.justificarContext()).toBeNull();
		expect(component.solicitudes()).toHaveLength(1);
		expect(component.solicitudes()[0]).toEqual(solicitudCreada);
	});

	it('debe manejar error al guardar justificación', () => {
		const payload = { asistenciaCursoId: 1, formData: new FormData() } as any;
		vi.mocked(api.crearSolicitudJustificacion).mockReturnValue(throwError(() => new Error('Error')));
		component.onGuardarJustificacion(payload);
		expect(component.solicitudSaving()).toBe(false);
	});

	it('debe calcular porcentaje de asistencia', () => {
		vi.mocked(component as any).asistencia = vi.fn(() => ({
			totalPresente: 10,
			totalTarde: 3,
			totalClases: 13,
		}));
		const porcentaje = component.porcentaje();
		expect(porcentaje).toBe(100);
	});

	it('debe retornar null de porcentaje cuando no hay clases', () => {
		vi.mocked(component as any).asistencia = vi.fn(() => ({
			totalPresente: 0,
			totalTarde: 0,
			totalClases: 0,
		}));
		const porcentaje = component.porcentaje();
		expect(porcentaje).toBeNull();
	});

	it('debe calcular cursoOptions deduplicando por cursoId+salonId', () => {
		vi.mocked(component as any)._horarios = vi.fn(() => [
			{ id: 1, cursoId: 1, cursoNombre: 'Matemáticas', salonId: 1, salonDescripcion: '1ro A' },
			{ id: 2, cursoId: 1, cursoNombre: 'Matemáticas', salonId: 1, salonDescripcion: '1ro A' },
			{ id: 3, cursoId: 2, cursoNombre: 'Ciencias', salonId: 2, salonDescripcion: '2do B' },
		]);
		const opciones = component.cursoOptions();
		expect(opciones).toHaveLength(2);
		expect(opciones[0].label).toBe('Ciencias - 2do B');
		expect(opciones[1].label).toBe('Matemáticas - 1ro A');
	});

	it('debe calcular selectedNivel basado en horario seleccionado', () => {
		vi.mocked(component as any)._horarios = vi.fn(() => [
			{ id: 1, cursoId: 1, cursoNombre: 'Matemáticas Primaria', salonId: 1, salonDescripcion: '1ro Primaria A' },
		]);
		component.selectedHorarioId.set(1);
		expect(component.selectedNivel()).toBe('Primaria');
	});

	it('debe calcular hayJustificaciones cuando hay justificaciones', () => {
		vi.mocked(component as any).asistencia = vi.fn(() => ({
			detalle: [
				{ asistenciaCursoId: 1, fecha: '2026-03-15', estado: 'F', justificacion: 'Enfermedad' },
				{ asistenciaCursoId: 2, fecha: '2026-03-16', estado: 'P', justificacion: null },
			],
		}));
		vi.spyOn(component as any, 'getJustificacionState').mockReturnValue({ kind: 'text', text: 'Enfermedad' } as any);
		expect(component.hayJustificaciones()).toBe(true);
	});

	it('debe calcular hayJustificaciones como false cuando no hay justificaciones', () => {
		vi.mocked(component as any).asistencia = vi.fn(() => ({
			detalle: [
				{ asistenciaCursoId: 1, fecha: '2026-03-15', estado: 'P', justificacion: null },
				{ asistenciaCursoId: 2, fecha: '2026-03-16', estado: 'T', justificacion: null },
			],
		}));
		vi.spyOn(component as any, 'getJustificacionState').mockReturnValue({ kind: 'dash' } as any);
		expect(component.hayJustificaciones()).toBe(false);
	});

	it('debe recargar horarios con onRetryHorarios', () => {
		mockEstudianteFacade.getMiAsistenciaActiva.mockReturnValue(of({ horarios: [] }));
		component.onRetryHorarios();
		expect(mockEstudianteFacade.getMiAsistenciaActiva).toHaveBeenCalled();
	});

	it('debe recargar asistencia con onRetryAsistencia', () => {
		vi.mocked(api.getMiAsistencia).mockReturnValue(of({ cursoId: 1, horarioId: 1, cursoNombre: 'Matemáticas', salonDescripcion: '1ro A', totalPresente: 5, totalTarde: 0, totalFalto: 0, totalClases: 5, detalle: [] }));
		component.selectedHorarioId.set(1);
		component.onRetryAsistencia();
		expect(api.getMiAsistencia).toHaveBeenCalledWith(1);
	});

	it('debe manejar carga de horarios con resumen nulo y múltiples horarios', () => {
		const resolucion = {
			resumen: null,
			horarios: [
				{ id: 1, cursoId: 1, cursoNombre: 'Matemáticas', salonId: 1, salonDescripcion: '1ro A' },
				{ id: 2, cursoId: 2, cursoNombre: 'Ciencias', salonId: 2, salonDescripcion: '2do B' },
			],
		};
		mockEstudianteFacade.getMiAsistenciaActiva.mockReturnValue(of(resolucion));
		component.ngOnInit();
		expect(component._horarios()).toHaveLength(2);
		expect(component.asistencia()).toBeNull();
	});
});
