// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EduConfirmationService } from '@edu-ui';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';
import { ProfesorCursoHubCalificacionesComponent } from './profesor-curso-hub-calificaciones.component';
// #endregion

// #region Fixtures
const baseVm = {
	loading: false,
	error: null as string | null,
	contenido: null as { id: number; numeroSemanas: number } | null,
	semanas: [],
};

const baseCalVm = {
	loading: false,
	saving: false,
	calificacionesPorSemana: [],
	periodos: [],
	totalEvaluaciones: 0,
	calificacionConfig: null,
	calificacionDialogVisible: false,
	editingCalificacion: null,
	calificarDialogVisible: false,
	selectedCalificacion: null as { id: number; notas: never[] } | null,
	gruposForCalificar: [],
	periodosDialogVisible: false,
	salonEstudiantes: [] as { estudianteId: number; nombreCompleto: string }[],
};

interface Handlers {
	onRefreshCalificaciones(): void;
	onEliminarEvaluacion(cal: unknown): void;
	onCambiarTipo(cal: unknown): void;
	onSaveCalificaciones(dto: unknown): void;
	onSaveCalificacionesGrupos(dto: unknown): void;
	onCrearEvaluacion(): void;
	onCalificacionDialogVisibleChange(visible: boolean): void;
	estudiantesList(): { id: number; nombre: string }[];
}
// #endregion

describe('ProfesorCursoHubCalificacionesComponent', () => {
	const vm = signal({ ...baseVm });
	const calVm = signal({ ...baseCalVm });
	const uiFacade = { vm };
	const calFacade = {
		vm: calVm,
		openCalificacionDialog: vi.fn(),
		openCalificarDialog: vi.fn(),
		closeCalificacionDialog: vi.fn(),
		eliminarCalificacion: vi.fn(),
		cambiarTipo: vi.fn(),
		calificarLote: vi.fn(),
		calificarGruposLote: vi.fn(),
		resetCalificaciones: vi.fn(),
		resetForHub: vi.fn(),
	};
	const calLoader = { ensure: vi.fn(), refresh: vi.fn(), reset: vi.fn() };
	const confirmation = { confirm: vi.fn() };

	function create() {
		const fixture = TestBed.createComponent(ProfesorCursoHubCalificacionesComponent);
		fixture.detectChanges();
		return { fixture, handlers: fixture.componentInstance as unknown as Handlers };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm });
		calVm.set({ ...baseCalVm });

		TestBed.configureTestingModule({
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: uiFacade },
				{ provide: CalificacionesFacade, useValue: calFacade },
				{ provide: CursoHubCalificacionesLoader, useValue: calLoader },
			],
		});
		TestBed.overrideComponent(ProfesorCursoHubCalificacionesComponent, {
			set: {
				imports: [],
				providers: [{ provide: EduConfirmationService, useValue: confirmation }],
				schemas: [NO_ERRORS_SCHEMA],
			},
		});
	});

	describe('carga', () => {
		it('asks for the calificaciones of the contenido the shell already loaded', () => {
			vm.set({ ...baseVm, contenido: { id: 8, numeroSemanas: 16 } });

			create();

			expect(calLoader.ensure).toHaveBeenCalledWith(8);
		});

		it('does not load anything while there is no contenido (deep link before the shell finished)', () => {
			create();

			expect(calLoader.ensure).not.toHaveBeenCalled();
		});

		it('loads once the contenido arrives', () => {
			const { fixture } = create();

			vm.set({ ...baseVm, contenido: { id: 8, numeroSemanas: 16 } });
			fixture.detectChanges();

			expect(calLoader.ensure).toHaveBeenCalledWith(8);
		});

		it('never resets the shared stores: that belongs to the hub shell', () => {
			vm.set({ ...baseVm, contenido: { id: 8, numeroSemanas: 16 } });
			const { fixture } = create();

			fixture.destroy();

			expect(calLoader.reset).not.toHaveBeenCalled();
			expect(calFacade.resetCalificaciones).not.toHaveBeenCalled();
			expect(calFacade.resetForHub).not.toHaveBeenCalled();
		});

		it('refreshes through the loader', () => {
			vm.set({ ...baseVm, contenido: { id: 8, numeroSemanas: 16 } });
			const { handlers } = create();

			handlers.onRefreshCalificaciones();

			expect(calLoader.refresh).toHaveBeenCalledWith(8);
		});
	});

	describe('estados', () => {
		it('shows the panel when the slot has content', () => {
			vm.set({ ...baseVm, contenido: { id: 8, numeroSemanas: 16 } });
			const { fixture } = create();

			expect(fixture.nativeElement.querySelector('app-calificaciones-panel')).not.toBeNull();
		});

		it('points to Contenido when the slot has none', () => {
			const { fixture } = create();

			expect(fixture.nativeElement.querySelector('app-calificaciones-panel')).toBeNull();
			expect(
				fixture.nativeElement.querySelector('[data-info-anchor="profesor-curso-hub-calificaciones-sin-contenido"]'),
			).not.toBeNull();
		});

		it('shows an error state when the contenido failed to load', () => {
			vm.set({ ...baseVm, error: 'boom' });
			const { fixture } = create();

			expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
		});

		it('keeps the three dialogs in the DOM even without content', () => {
			const { fixture } = create();

			for (const selector of ['app-evaluacion-form-dialog', 'app-calificar-dialog', 'app-periodos-config-dialog']) {
				expect(fixture.nativeElement.querySelector(selector)).not.toBeNull();
			}
		});
	});

	describe('handlers', () => {
		beforeEach(() => vm.set({ ...baseVm, contenido: { id: 8, numeroSemanas: 16 } }));

		it('opens and closes the evaluation dialog through the facade', () => {
			const { handlers } = create();

			handlers.onCrearEvaluacion();
			handlers.onCalificacionDialogVisibleChange(false);

			expect(calFacade.openCalificacionDialog).toHaveBeenCalledOnce();
			expect(calFacade.closeCalificacionDialog).toHaveBeenCalledOnce();
		});

		it('asks for confirmation before deleting an evaluation', () => {
			const { handlers } = create();

			handlers.onEliminarEvaluacion({ id: 5, titulo: 'Examen' });
			expect(calFacade.eliminarCalificacion).not.toHaveBeenCalled();

			confirmation.confirm.mock.calls[0][0].accept();
			expect(calFacade.eliminarCalificacion).toHaveBeenCalledWith(5);
		});

		it('flips the type of the evaluation on confirm', () => {
			const { handlers } = create();

			handlers.onCambiarTipo({ id: 5, titulo: 'Examen', esGrupal: false });
			confirmation.confirm.mock.calls[0][0].accept();

			expect(calFacade.cambiarTipo).toHaveBeenCalledWith(5, { esGrupal: true });
		});

		it('grades individually and by groups with the loaded contenido id', () => {
			calVm.set({ ...baseCalVm, selectedCalificacion: { id: 5, notas: [] } });
			const { handlers } = create();
			const dto = { notas: [] };

			handlers.onSaveCalificaciones(dto);
			handlers.onSaveCalificacionesGrupos(dto);

			expect(calFacade.calificarLote).toHaveBeenCalledWith(5, dto, 8);
			expect(calFacade.calificarGruposLote).toHaveBeenCalledWith(5, dto, 8);
		});

		it('does not grade without a selected evaluation', () => {
			const { handlers } = create();

			handlers.onSaveCalificaciones({ notas: [] });

			expect(calFacade.calificarLote).not.toHaveBeenCalled();
		});

		it('lists the salon students for the grading dialog', () => {
			calVm.set({ ...baseCalVm, salonEstudiantes: [{ estudianteId: 3, nombreCompleto: 'Ana Pérez' }] });
			const { handlers } = create();

			expect(handlers.estudiantesList()).toEqual([{ id: 3, nombre: 'Ana Pérez' }]);
		});
	});
});
