// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CursoHubContextService } from '@intranet-shared/components';
import { AttendanceCourseFacade } from '../services/attendance-course.facade';
import { ProfesorCursoHubAsistenciaComponent } from './profesor-curso-hub-asistencia.component';
// #endregion

// #region Fixtures
const registro = (horarioId: number, fecha = '2026-10-05') => ({
	horarioId,
	fecha,
	estudiantes: [{ estudianteId: 1, estado: 'P', justificacion: null }],
});

const baseVm = {
	registroData: null as ReturnType<typeof registro> | null,
	registroEstudiantes: [{ estudianteId: 1 }] as unknown[],
	registroLoading: false,
	registroSaving: false,
	registroStats: { total: 1, presentes: 1, tardes: 0, faltas: 0 },
	registroTieneRegistros: true as boolean | undefined,
	registroDirty: false,
	resumen: null as { horarioId: number } | null,
	resumenLoading: false,
	resumenError: null as string | null,
};
// #endregion

describe('ProfesorCursoHubAsistenciaComponent', () => {
	const vm = signal({ ...baseVm });
	const slot = signal<{ id: number; diaSemana: number; diaSemanaDescripcion: string } | null>({
		id: 5,
		diaSemana: 1,
		diaSemanaDescripcion: 'Lunes',
	});
	const facade = {
		vm,
		loadRegistro: vi.fn(),
		loadResumen: vi.fn(),
		registrar: vi.fn(),
		setEstudianteEstado: vi.fn(),
		setEstudianteJustificacion: vi.fn(),
		resetAsistencia: vi.fn(),
	};
	let fechaQuery: string | null = null;

	function create() {
		const fixture = TestBed.createComponent(ProfesorCursoHubAsistenciaComponent);
		fixture.detectChanges();
		return fixture;
	}

	interface Api {
		fecha(): string | null;
		estudiantes(): unknown[];
		stats(): { total: number };
		tieneRegistros(): boolean | undefined;
		resumen(): unknown;
		diaSemana(): number | null;
		diaSemanaDescripcion(): string | null;
		onFechaChange(fecha: string): void;
		onEstadoChange(e: { estudianteId: number; estado: 'P' | 'T' | 'F' }): void;
		onJustificacionChange(e: { estudianteId: number; justificacion: string | null }): void;
		onSave(): void;
		onBuscarResumen(e: { fechaInicio: string; fechaFin: string }): void;
	}
	const api = (fixture: ReturnType<typeof create>) => fixture.componentInstance as unknown as Api;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		vm.set({ ...baseVm });
		slot.set({ id: 5, diaSemana: 1, diaSemanaDescripcion: 'Lunes' });
		fechaQuery = null;
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AttendanceCourseFacade, useValue: facade },
				{ provide: CursoHubContextService, useValue: { slot } },
				{
					provide: ActivatedRoute,
					useValue: { snapshot: { queryParamMap: { get: () => fechaQuery } } },
				},
			],
		});
		TestBed.overrideComponent(ProfesorCursoHubAsistenciaComponent, {
			set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
	});

	describe('carga por franja', () => {
		it('loads today\'s attendance of the resolved slot, even when the slot has no contenido', () => {
			const fixture = create();

			expect(facade.loadRegistro).toHaveBeenCalledExactlyOnceWith(api(fixture).fecha(), 5);
			expect(api(fixture).fecha()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it('does not request anything until the shell resolved a slot', () => {
			slot.set(null);

			create();

			expect(facade.loadRegistro).not.toHaveBeenCalled();
		});

		it('starts from the ?fecha= of the URL', () => {
			fechaQuery = '2026-09-28';

			const fixture = create();

			expect(api(fixture).fecha()).toBe('2026-09-28');
			expect(facade.loadRegistro).toHaveBeenCalledExactlyOnceWith('2026-09-28', 5);
		});

		it('ignores a malformed ?fecha=', () => {
			fechaQuery = '28/09/2026';

			const fixture = create();

			expect(api(fixture).fecha()).not.toBe('28/09/2026');
			expect(api(fixture).fecha()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it('reloads, with a clean store, the same date for the next slot', () => {
			const fixture = create();
			api(fixture).onFechaChange('2026-10-02');
			facade.loadRegistro.mockClear();

			slot.set({ id: 6, diaSemana: 3, diaSemanaDescripcion: 'Miércoles' });
			fixture.detectChanges();

			expect(facade.resetAsistencia).toHaveBeenCalled();
			expect(facade.loadRegistro).toHaveBeenCalledExactlyOnceWith('2026-10-02', 6);
		});

		it('keeps the edited list of this slot (no reload, no reset) when coming back from another tab', () => {
			vm.set({ ...baseVm, registroData: registro(5, '2026-10-02'), registroDirty: true });

			const fixture = create();

			expect(facade.loadRegistro).not.toHaveBeenCalled();
			expect(facade.resetAsistencia).not.toHaveBeenCalled();
			expect(api(fixture).fecha()).toBe('2026-10-02');
		});

		it('does not reload when the shell only refreshes the slot object', () => {
			const fixture = create();
			facade.loadRegistro.mockClear();

			slot.set({ id: 5, diaSemana: 1, diaSemanaDescripcion: 'Lunes' });
			fixture.detectChanges();

			expect(facade.loadRegistro).not.toHaveBeenCalled();
		});

		it('does not reset the store on destroy (the shell owns that)', () => {
			const fixture = create();
			facade.resetAsistencia.mockClear();

			fixture.destroy();

			expect(facade.resetAsistencia).not.toHaveBeenCalled();
		});
	});

	describe('lo que se muestra', () => {
		it('shows the list and the summary that belong to the slot', () => {
			vm.set({ ...baseVm, registroData: registro(5), resumen: { horarioId: 5 } });

			const fixture = create();

			expect(api(fixture).estudiantes()).toHaveLength(1);
			expect(api(fixture).stats().total).toBe(1);
			expect(api(fixture).tieneRegistros()).toBe(true);
			expect(api(fixture).resumen()).toEqual({ horarioId: 5 });
		});

		it('never shows the list or the summary of another slot', () => {
			vm.set({ ...baseVm, registroData: registro(9), resumen: { horarioId: 9 } });

			const fixture = create();

			expect(api(fixture).estudiantes()).toEqual([]);
			expect(api(fixture).stats().total).toBe(0);
			expect(api(fixture).tieneRegistros()).toBeUndefined();
			expect(api(fixture).resumen()).toBeNull();
		});

		it('takes the expected weekday from the slot', () => {
			const fixture = create();

			expect(api(fixture).diaSemana()).toBe(1);
			expect(api(fixture).diaSemanaDescripcion()).toBe('Lunes');
		});
	});

	describe('handlers', () => {
		it('loads the picked date for the slot', () => {
			const fixture = create();
			facade.loadRegistro.mockClear();

			api(fixture).onFechaChange('2026-10-07');

			expect(api(fixture).fecha()).toBe('2026-10-07');
			expect(facade.loadRegistro).toHaveBeenCalledExactlyOnceWith('2026-10-07', 5);
		});

		it('always passes the slot id when saving and searching the summary', () => {
			const fixture = create();

			api(fixture).onSave();
			api(fixture).onBuscarResumen({ fechaInicio: '2026-10-01', fechaFin: '2026-10-31' });

			expect(facade.registrar).toHaveBeenCalledExactlyOnceWith(5);
			expect(facade.loadResumen).toHaveBeenCalledExactlyOnceWith('2026-10-01', '2026-10-31', 5);
		});

		it('forwards the edits of a student to the facade', () => {
			const fixture = create();

			api(fixture).onEstadoChange({ estudianteId: 1, estado: 'F' });
			api(fixture).onJustificacionChange({ estudianteId: 1, justificacion: 'Enfermo' });

			expect(facade.setEstudianteEstado).toHaveBeenCalledWith(1, 'F');
			expect(facade.setEstudianteJustificacion).toHaveBeenCalledWith(1, 'Enfermo');
		});

		it('does nothing without a resolved slot', () => {
			slot.set(null);
			const fixture = create();

			api(fixture).onFechaChange('2026-10-07');
			api(fixture).onSave();
			api(fixture).onBuscarResumen({ fechaInicio: '2026-10-01', fechaFin: '2026-10-31' });

			expect(facade.loadRegistro).not.toHaveBeenCalled();
			expect(facade.registrar).not.toHaveBeenCalled();
			expect(facade.loadResumen).not.toHaveBeenCalled();
		});
	});
});
