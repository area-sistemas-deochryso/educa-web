// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CursoHubContextService } from '@intranet-shared/components';
import { UnsavedChangesPromptService } from '@intranet-shared/services';
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
		canSaveOutsidePanel: vi.fn(),
		setEstudianteEstado: vi.fn(),
		setEstudianteJustificacion: vi.fn(),
		resetAsistencia: vi.fn(),
	};
	const prompt = { confirmProceed: vi.fn() };
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
		fechaResetKey(): number;
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
		facade.canSaveOutsidePanel.mockReturnValue(true);
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AttendanceCourseFacade, useValue: facade },
				{ provide: UnsavedChangesPromptService, useValue: prompt },
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

	describe('cambiar de fecha con ediciones sin guardar', () => {
		const editedList = () => vm.set({ ...baseVm, registroData: registro(5, '2026-10-05'), registroDirty: true });
		const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

		it('asks before replacing the edited list and waits for the answer', () => {
			editedList();
			prompt.confirmProceed.mockReturnValue(new Promise<boolean>(() => undefined));
			const fixture = create();

			api(fixture).onFechaChange('2026-10-07');

			expect(prompt.confirmProceed).toHaveBeenCalledOnce();
			expect(facade.loadRegistro).not.toHaveBeenCalled();
			expect(api(fixture).fecha()).toBe('2026-10-05');
		});

		it('offers to save only when the facade says it is safe outside the panel', () => {
			editedList();
			prompt.confirmProceed.mockReturnValue(new Promise<boolean>(() => undefined));
			facade.canSaveOutsidePanel.mockReturnValue(false);
			const fixture = create();

			api(fixture).onFechaChange('2026-10-07');

			expect(facade.canSaveOutsidePanel).toHaveBeenCalledWith(1);
			expect(prompt.confirmProceed).toHaveBeenCalledWith(expect.objectContaining({ canSave: false }));
		});

		it('saves the list of the slot (not the new date) when the user chooses to save', () => {
			editedList();
			prompt.confirmProceed.mockReturnValue(new Promise<boolean>(() => undefined));
			const fixture = create();
			api(fixture).onFechaChange('2026-10-07');

			prompt.confirmProceed.mock.calls[0][0].save();

			expect(facade.registrar).toHaveBeenCalledExactlyOnceWith(5);
		});

		it('loads the new date once the user proceeds', async () => {
			editedList();
			prompt.confirmProceed.mockResolvedValue(true);
			const fixture = create();

			api(fixture).onFechaChange('2026-10-07');
			await flush();

			expect(api(fixture).fecha()).toBe('2026-10-07');
			expect(facade.loadRegistro).toHaveBeenCalledExactlyOnceWith('2026-10-07', 5);
			expect(api(fixture).fechaResetKey()).toBe(0);
		});

		it('keeps the list and sends the datepicker back to the current date when the user stays', async () => {
			editedList();
			prompt.confirmProceed.mockResolvedValue(false);
			const fixture = create();

			api(fixture).onFechaChange('2026-10-07');
			await flush();

			expect(facade.loadRegistro).not.toHaveBeenCalled();
			expect(api(fixture).fecha()).toBe('2026-10-05');
			expect(api(fixture).fechaResetKey()).toBe(1);
		});

		it('does not ask when the edits belong to another slot', () => {
			vm.set({ ...baseVm, registroData: registro(9), registroDirty: true });
			const fixture = create();
			facade.loadRegistro.mockClear();

			api(fixture).onFechaChange('2026-10-07');

			expect(prompt.confirmProceed).not.toHaveBeenCalled();
			expect(facade.loadRegistro).toHaveBeenCalledExactlyOnceWith('2026-10-07', 5);
		});
	});
});
