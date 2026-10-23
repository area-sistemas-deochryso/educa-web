// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EduConfirmationService } from '@edu-ui';
import { CursoHubContextService } from '@intranet-shared/components';
import type { HorarioProfesorDto } from '../../models';
import { CursoContenidoCrudFacade } from '../services/curso-contenido-crud.facade';
import { CursoContenidoDataFacade } from '../services/curso-contenido-data.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';
import { ProfesorCursoHubContenidoComponent } from './profesor-curso-hub-contenido.component';
// #endregion

// #region Fixtures
const MON = { id: 1, cursoId: 24, salonId: 34 } as HorarioProfesorDto;
const WED = { id: 2, salonId: 34 } as HorarioProfesorDto;

const baseVm = {
	loading: false,
	error: null as string | null,
	contenido: null as { id: number } | null,
	saving: false,
	semanaEditDialogVisible: false,
	selectedSemana: null as { id: number } | null,
	tareaDialogVisible: false,
	selectedTarea: null as { id: number } | null,
	taskSubmissionsDialogVisible: false,
	taskSubmissionsData: [],
	taskSubmissionsTarea: null,
	taskSubmissionsLoading: false,
	activeSemanaId: null as number | null,
};
// #endregion

describe('ProfesorCursoHubContenidoComponent', () => {
	const vm = signal({ ...baseVm });
	const slot = signal<HorarioProfesorDto | null>(MON);
	const dataFacade = {
		loadContenidoForHub: vi.fn(),
		resetForHub: vi.fn(),
		crearContenidoEnHub: vi.fn(),
		eliminarContenidoEnHub: vi.fn(),
	};
	const calLoader = { ensure: vi.fn(), refresh: vi.fn(), reset: vi.fn() };
	const confirmation = { confirm: vi.fn() };
	const crudFacade = {
		actualizarSemana: vi.fn(),
		crearTarea: vi.fn(),
		actualizarTarea: vi.fn(),
	};
	const uiFacade = {
		vm,
		closeSemanaEditDialog: vi.fn(),
		closeTareaDialog: vi.fn(),
		closeTaskSubmissionsDialog: vi.fn(),
	};

	function create() {
		const fixture = TestBed.createComponent(ProfesorCursoHubContenidoComponent);
		fixture.detectChanges();
		return fixture;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm });
		slot.set(MON);

		TestBed.configureTestingModule({
			providers: [
				{ provide: CursoContenidoDataFacade, useValue: dataFacade },
				{ provide: CursoContenidoCrudFacade, useValue: crudFacade },
				{ provide: CursoContenidoUiFacade, useValue: uiFacade },
				{ provide: CursoHubCalificacionesLoader, useValue: calLoader },
				{ provide: EduConfirmationService, useValue: confirmation },
			],
		});
		TestBed.overrideComponent(ProfesorCursoHubContenidoComponent, {
			set: { imports: [], providers: [], schemas: [NO_ERRORS_SCHEMA] },
		});
		TestBed.inject(CursoHubContextService).bind(slot);
	});

	describe('carga', () => {
		it('only reads the store: loading and reset belong to the hub shell', () => {
			const fixture = create();
			slot.set(WED);
			fixture.detectChanges();
			fixture.destroy();

			expect(dataFacade.loadContenidoForHub).not.toHaveBeenCalled();
			expect(dataFacade.resetForHub).not.toHaveBeenCalled();
		});
	});

	describe('estados', () => {
		it('shows the accordion when the slot has content', () => {
			vm.set({ ...baseVm, contenido: { id: 8 } });
			const fixture = create();

			expect(fixture.nativeElement.querySelector('app-semanas-accordion')).not.toBeNull();
			expect(fixture.nativeElement.querySelector('[data-info-anchor="profesor-curso-hub-sin-contenido"]')).toBeNull();
		});

		it('offers to create the content when the slot has none', () => {
			const fixture = create();

			expect(fixture.nativeElement.querySelector('[data-info-anchor="profesor-curso-hub-sin-contenido"]')).not.toBeNull();
			expect(fixture.nativeElement.querySelector('app-semanas-accordion')).toBeNull();
		});

		it('shows an error state instead of the creation offer when the load failed', () => {
			vm.set({ ...baseVm, error: 'boom' });
			const fixture = create();

			expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
			expect(fixture.nativeElement.querySelector('[data-info-anchor="profesor-curso-hub-sin-contenido"]')).toBeNull();
		});

		it('keeps every dialog in the DOM even without content', () => {
			const fixture = create();
			const el: HTMLElement = fixture.nativeElement;

			for (const tag of ['app-semana-edit-dialog', 'app-tarea-dialog', 'app-student-task-submissions-dialog', 'app-curso-builder-dialog', 'edu-confirm-dialog']) {
				expect(el.querySelector(tag), tag).not.toBeNull();
			}
		});
	});

	describe('handlers', () => {
		const component = (fixture: ReturnType<typeof create>) =>
			fixture.componentInstance as unknown as Record<string, (...args: unknown[]) => void>;

		it('saves the selected semana', () => {
			vm.set({ ...baseVm, selectedSemana: { id: 5 } });
			const request = { titulo: 'T', descripcion: null, mensajeDocente: null };

			component(create()).onSaveSemana(request);

			expect(crudFacade.actualizarSemana).toHaveBeenCalledWith(5, request);
		});

		it('does not save a semana when none is selected', () => {
			component(create()).onSaveSemana({ titulo: null, descripcion: null, mensajeDocente: null });

			expect(crudFacade.actualizarSemana).not.toHaveBeenCalled();
		});

		it('creates a tarea in the active semana', () => {
			vm.set({ ...baseVm, activeSemanaId: 3 });
			const request = { titulo: 'Tarea' };

			component(create()).onCreateTarea(request);

			expect(crudFacade.crearTarea).toHaveBeenCalledWith(3, request);
		});

		it('updates the selected tarea in the active semana', () => {
			vm.set({ ...baseVm, activeSemanaId: 3, selectedTarea: { id: 9 } });
			const request = { titulo: 'Nueva' };

			component(create()).onUpdateTarea(request);

			expect(crudFacade.actualizarTarea).toHaveBeenCalledWith(3, 9, request);
		});

		it('does not create or update a tarea without an active semana', () => {
			const c = component(create());

			c.onCreateTarea({ titulo: 'x' });
			c.onUpdateTarea({ titulo: 'x' });

			expect(crudFacade.crearTarea).not.toHaveBeenCalled();
			expect(crudFacade.actualizarTarea).not.toHaveBeenCalled();
		});

		it('closes each sub-dialog only when it becomes hidden', () => {
			const c = component(create());

			c.onSemanaEditVisibleChange(true);
			c.onTareaVisibleChange(true);
			c.onTaskSubmissionsVisibleChange(true);
			expect(uiFacade.closeSemanaEditDialog).not.toHaveBeenCalled();

			c.onSemanaEditVisibleChange(false);
			c.onTareaVisibleChange(false);
			c.onTaskSubmissionsVisibleChange(false);
			expect(uiFacade.closeSemanaEditDialog).toHaveBeenCalledOnce();
			expect(uiFacade.closeTareaDialog).toHaveBeenCalledOnce();
			expect(uiFacade.closeTaskSubmissionsDialog).toHaveBeenCalledOnce();
		});
	});

	describe('crear contenido', () => {
		const builderVisible = (fixture: ReturnType<typeof create>) =>
			(fixture.componentInstance as unknown as { builderVisible: () => boolean }).builderVisible();

		it('creates the content for the resolved slot through the hub path (no modal)', () => {
			const fixture = create();

			(fixture.componentInstance as unknown as { onCreateContenido(n: number): void }).onCreateContenido(16);

			expect(dataFacade.crearContenidoEnHub).toHaveBeenCalledWith(
				{ horarioId: 1, numeroSemanas: 16 },
				expect.objectContaining({ onApplied: expect.any(Function), onRolledBack: expect.any(Function) }),
			);
		});

		it('closes the builder on optimistic apply and reopens it on rollback', () => {
			const fixture = create();
			const c = fixture.componentInstance as unknown as { onOpenBuilder(): void; onCreateContenido(n: number): void };
			c.onOpenBuilder();
			expect(builderVisible(fixture)).toBe(true);
			c.onCreateContenido(16);
			const hooks = dataFacade.crearContenidoEnHub.mock.calls[0][1];

			hooks.onApplied();
			expect(builderVisible(fixture)).toBe(false);

			hooks.onRolledBack();
			expect(builderVisible(fixture)).toBe(true);
		});
	});

	describe('menú ⋯ y eliminar contenido', () => {
		interface Internals {
			contenidoMenuItems: { label: string; command?: () => void }[];
			onDeleteContenido(): void;
		}

		it('offers «Eliminar todo el contenido» in the ⋯ menu, which asks for confirmation first', () => {
			vm.set({ ...baseVm, contenido: { id: 8 }, totalArchivos: 3, totalTareas: 1 } as typeof baseVm);
			const fixture = create();
			const [item] = (fixture.componentInstance as unknown as Internals).contenidoMenuItems;

			expect(item.label).toBe('Eliminar todo el contenido');
			item.command?.();

			expect(confirmation.confirm).toHaveBeenCalledOnce();
			expect(dataFacade.eliminarContenidoEnHub).not.toHaveBeenCalled();
		});

		it('confirms with a red accept button and the counts of what is lost', () => {
			vm.set({ ...baseVm, contenido: { id: 8 }, totalArchivos: 1, totalTareas: 2 } as typeof baseVm);
			const fixture = create();

			(fixture.componentInstance as unknown as Internals).onDeleteContenido();

			const options = confirmation.confirm.mock.calls[0][0];
			expect(options.acceptButtonSeverity).toBe('danger');
			expect(options.message).toContain('1 archivo y 2 tareas');
		});

		it('deletes through the hub variant (no modal side effects) once confirmed', () => {
			vm.set({ ...baseVm, contenido: { id: 8 } } as typeof baseVm);
			const fixture = create();
			(fixture.componentInstance as unknown as Internals).onDeleteContenido();

			confirmation.confirm.mock.calls[0][0].accept();

			expect(dataFacade.eliminarContenidoEnHub).toHaveBeenCalledWith(8);
			expect(calLoader.reset).toHaveBeenCalledOnce();
		});

		it('does nothing without a contenido', () => {
			const fixture = create();

			(fixture.componentInstance as unknown as Internals).onDeleteContenido();

			expect(confirmation.confirm).not.toHaveBeenCalled();
		});
	});

	describe('calificar desde las entregas', () => {
		it('closes the submissions dialog and opens Calificaciones on that evaluation, ready to grade', () => {
			const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
			const fixture = create();

			(fixture.componentInstance as unknown as { onCalificarDesdeEntregas(id: number): void }).onCalificarDesdeEntregas(42);

			expect(uiFacade.closeTaskSubmissionsDialog).toHaveBeenCalledOnce();
			expect(navigate).toHaveBeenCalledWith(['/intranet', 'profesor', 'cursos', 24, 34, 'calificaciones'], {
				queryParams: { horarioId: 1, evaluacionId: 42, abrir: 'calificar' },
				replaceUrl: true,
			});
		});
	});
});
