// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';
import { CursoHubContextService } from '@intranet-shared/components';
import { EstudianteCursosFacade } from '@features/intranet/pages/estudiante/services/estudiante-cursos.facade';
import { EstudianteCursoHubContenidoComponent } from './estudiante-curso-hub-contenido.component';
// #endregion

// #region Fixtures
type HubSlot = NonNullable<ReturnType<CursoHubContextService['slot']>>;
const MON = { id: 1 } as HubSlot;
const WED = { id: 2 } as HubSlot;

const SEMANAS = [
	{
		id: 10,
		numeroSemana: 1,
		titulo: 'Fracciones',
		archivos: [],
		tareas: [{ id: 100, titulo: 'Ejercicios', fechaLimite: null, archivos: [] }],
	},
	{ id: 11, numeroSemana: 2, titulo: null, archivos: [], tareas: [] },
];

const baseVm = {
	contentLoading: false,
	contenido: null as { id: number } | null,
	semanas: [] as typeof SEMANAS,
	misArchivos: {} as Record<number, unknown[]>,
	misTareaArchivos: {} as Record<number, unknown[]>,
};
// #endregion

describe('EstudianteCursoHubContenidoComponent', () => {
	const vm = signal({ ...baseVm });
	const slot = signal<HubSlot | null>(MON);
	const facade = {
		vm,
		loadContenidoForHub: vi.fn(),
		resetForHub: vi.fn(),
		refreshContenido: vi.fn(),
		loadMisArchivos: vi.fn(),
		loadMisTareaArchivos: vi.fn(),
		uploadArchivo: vi.fn(),
		uploadTareaArchivo: vi.fn(),
		eliminarArchivo: vi.fn(),
		eliminarTareaArchivo: vi.fn(),
	};
	const errorHandler = { showWarning: vi.fn() };

	interface Internals {
		searchQuery: { (): string; set(v: string): void };
		filteredSemanas: () => typeof SEMANAS;
		onAccordionChangeStr(values: string[]): void;
		onRefreshContenido(): void;
	}

	function create() {
		const fixture = TestBed.createComponent(EstudianteCursoHubContenidoComponent);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance as unknown as Internals };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm });
		slot.set(MON);

		TestBed.configureTestingModule({
			providers: [
				{ provide: EstudianteCursosFacade, useValue: facade },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		TestBed.overrideComponent(EstudianteCursoHubContenidoComponent, {
			set: { imports: [], providers: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
		TestBed.inject(CursoHubContextService).bind(slot);
	});

	describe('carga', () => {
		it('does not load or reset the store: the hub shell owns that', () => {
			const { fixture } = create();

			fixture.destroy();

			expect(facade.loadContenidoForHub).not.toHaveBeenCalled();
			expect(facade.resetForHub).not.toHaveBeenCalled();
		});

		it('resets the local search/open panels when the slot changes', () => {
			const { fixture, component } = create();
			component.searchQuery.set('algo');

			slot.set(WED);
			fixture.detectChanges();

			expect(component.searchQuery()).toBe('');
		});
	});

	describe('semanas', () => {
		it('filters semanas by title, week number and task title', () => {
			vm.set({ ...baseVm, contenido: { id: 8 }, semanas: SEMANAS });
			const { component } = create();

			component.searchQuery.set('fracc');
			expect(component.filteredSemanas().map((s) => s.id)).toEqual([10]);

			component.searchQuery.set('semana 2');
			expect(component.filteredSemanas().map((s) => s.id)).toEqual([11]);

			component.searchQuery.set('ejercicios');
			expect(component.filteredSemanas().map((s) => s.id)).toEqual([10]);

			component.searchQuery.set('');
			expect(component.filteredSemanas()).toHaveLength(2);
		});

		it('lazy-loads the student files of a semana (and its tareas) when it opens', () => {
			vm.set({ ...baseVm, contenido: { id: 8 }, semanas: SEMANAS });
			const { component } = create();

			component.onAccordionChangeStr(['10']);

			expect(facade.loadMisArchivos).toHaveBeenCalledWith(10);
			expect(facade.loadMisTareaArchivos).toHaveBeenCalledWith(100);
		});

		it('does not reload files for a semana that was already open', () => {
			vm.set({ ...baseVm, contenido: { id: 8 }, semanas: SEMANAS });
			const { component } = create();

			component.onAccordionChangeStr(['10']);
			component.onAccordionChangeStr(['10', '11']);

			expect(facade.loadMisArchivos).toHaveBeenCalledTimes(2);
			expect(facade.loadMisArchivos).toHaveBeenLastCalledWith(11);
		});

		it('refreshes through the facade', () => {
			const { component } = create();

			component.onRefreshContenido();

			expect(facade.refreshContenido).toHaveBeenCalledOnce();
		});
	});
});
