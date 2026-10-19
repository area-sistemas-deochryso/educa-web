// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';
import { FileViewerService } from '@shared/components';
import { CursoHubContextService } from '@intranet-shared/components';
import { TareasPendientesService } from '@intranet-shared/services';
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
	contenido: null as { id: number; semanaVigente?: number | null } | null,
	semanas: [] as typeof SEMANAS,
	misArchivos: {} as Record<number, unknown[]>,
	misTareaArchivos: {} as Record<number, unknown[]>,
	archivosGrupoSemana: {} as Record<number, unknown[]>,
	archivosGrupoTarea: {} as Record<number, unknown[]>,
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
		loadArchivosGrupoSemana: vi.fn(),
		loadArchivosGrupoTarea: vi.fn(),
		cambiarPublicacionArchivo: vi.fn(),
		cambiarPublicacionTareaArchivo: vi.fn(),
		uploadArchivo: vi.fn(),
		uploadTareaArchivo: vi.fn(),
		eliminarArchivo: vi.fn(),
		eliminarTareaArchivo: vi.fn(),
	};
	const errorHandler = { showWarning: vi.fn() };
	const nuevasIds = signal<ReadonlySet<number>>(new Set());
	const pendientes = { nuevasIds, marcarVista: vi.fn() };

	interface Internals {
		searchQuery: { (): string; set(v: string): void };
		filteredSemanas: () => typeof SEMANAS;
		onAccordionChangeStr(values: string[]): void;
		onRefreshContenido(): void;
		estadoTarea(tarea: { id: number; fechaLimite: string | null }): { kind: string; label: string } | null;
		openArchivo(archivo: { nombreArchivo: string; urlArchivo: string; tipoArchivo: string | null }): void;
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
		nuevasIds.set(new Set());

		TestBed.configureTestingModule({
			providers: [
				{ provide: TareasPendientesService, useValue: pendientes },
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

	describe('archivos', () => {
		it('openArchivo delega en el visor compartido con name, url y mimeType', () => {
			const openSpy = vi.spyOn(TestBed.inject(FileViewerService), 'open').mockImplementation(() => undefined);
			const { component } = create();

			component.openArchivo({ nombreArchivo: 'guia.pdf', urlArchivo: 'https://blob/guia.pdf', tipoArchivo: 'application/pdf' });

			expect(openSpy).toHaveBeenCalledWith({ name: 'guia.pdf', url: 'https://blob/guia.pdf', mimeType: 'application/pdf' });
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

		it('loads the group files of the semana, and of the tareas only when they are grupales', () => {
			const semanas = [
				{
					id: 10,
					numeroSemana: 1,
					titulo: null,
					archivos: [],
					tareas: [
						{ id: 100, titulo: 'Individual', esGrupal: false, fechaLimite: null, archivos: [] },
						{ id: 101, titulo: 'Grupal', esGrupal: true, fechaLimite: null, archivos: [] },
					],
				},
			];
			vm.set({ ...baseVm, contenido: { id: 8 }, semanas: semanas as never });
			const { component } = create();

			component.onAccordionChangeStr(['10']);

			expect(facade.loadArchivosGrupoSemana).toHaveBeenCalledWith(10);
			expect(facade.loadArchivosGrupoTarea).toHaveBeenCalledExactlyOnceWith(101);
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

	describe('semana vigente (P110-F14)', () => {
		const loaded = (semanaVigente?: number | null) =>
			vm.set({ ...baseVm, contenido: { id: 1, semanaVigente }, semanas: SEMANAS });

		it('expande la semana vigente y carga sus archivos como si se abriera a mano', () => {
			loaded(2);
			const { fixture, component } = create();
			fixture.detectChanges();

			expect((component as unknown as { openPanels(): number[] }).openPanels()).toEqual([11]);
			expect(facade.loadMisArchivos).toHaveBeenCalledWith(11);
		});

		it('no expande nada si el BE no devuelve semanaVigente', () => {
			loaded(undefined);
			const { component } = create();

			expect((component as unknown as { openPanels(): number[] }).openPanels()).toEqual([]);
		});

		it('no expande nada si semanaVigente no corresponde a ninguna semana', () => {
			loaded(52);
			const { component } = create();

			expect((component as unknown as { openPanels(): number[] }).openPanels()).toEqual([]);
		});
	});

	describe('tarea nueva (P110-F14)', () => {
		const loaded = () => vm.set({ ...baseVm, contenido: { id: 1, semanaVigente: 1 }, semanas: SEMANAS });
		const esNueva = (c: unknown, id: number) => (c as { esTareaNueva(id: number): boolean }).esTareaNueva(id);

		it('registra como vista la tarea nueva cuando su semana queda expandida', () => {
			nuevasIds.set(new Set([100]));
			loaded();
			create();

			expect(pendientes.marcarVista).toHaveBeenCalledExactlyOnceWith(100);
		});

		it('conserva la marca "Nueva" durante la visita aunque el servicio ya la haya apagado', () => {
			nuevasIds.set(new Set([100]));
			loaded();
			const { component } = create();

			nuevasIds.set(new Set());

			expect(esNueva(component, 100)).toBe(true);
		});

		it('no registra vistas si la semana de la tarea sigue colapsada', () => {
			nuevasIds.set(new Set([100]));
			vm.set({ ...baseVm, contenido: { id: 1, semanaVigente: 2 }, semanas: SEMANAS });
			create();

			expect(pendientes.marcarVista).not.toHaveBeenCalled();
		});

		it('una tarea que no es nueva no lleva marca', () => {
			loaded();
			const { component } = create();

			expect(esNueva(component, 100)).toBe(false);
		});
	});

	describe('estado de la tarea', () => {
		const archivo = { id: 1, nombreArchivo: 'tarea.pdf' };

		it('has no estado until the student files of the tarea are loaded', () => {
			const { component } = create();

			expect(component.estadoTarea({ id: 100, fechaLimite: '2000-01-01' })).toBeNull();
		});

		it('is entregada when the student published a file, even past the due date', () => {
			vm.set({ ...baseVm, misTareaArchivos: { 100: [{ ...archivo, publicado: true }] } });
			const { component } = create();

			expect(component.estadoTarea({ id: 100, fechaLimite: '2000-01-01' })?.kind).toBe('entregada');
		});

		it('is entregada when at least one file is published, even if others are still draft', () => {
			vm.set({
				...baseVm,
				misTareaArchivos: { 100: [{ ...archivo, publicado: false }, { ...archivo, id: 2, publicado: true }] },
			});
			const { component } = create();

			expect(component.estadoTarea({ id: 100, fechaLimite: null })?.kind).toBe('entregada');
		});

		it('is borrador, not entregada, when every uploaded file is still draft', () => {
			vm.set({ ...baseVm, misTareaArchivos: { 100: [{ ...archivo, publicado: false }] } });
			const { component } = create();

			expect(component.estadoTarea({ id: 100, fechaLimite: '2000-01-01' })?.kind).toBe('borrador');
		});

		it('is pendiente with no files and a future or missing due date', () => {
			vm.set({ ...baseVm, misTareaArchivos: { 100: [] } });
			const { component } = create();

			expect(component.estadoTarea({ id: 100, fechaLimite: '2999-12-31T00:00:00' })?.kind).toBe('pendiente');
			expect(component.estadoTarea({ id: 100, fechaLimite: null })?.kind).toBe('pendiente');
		});

		it('is vencida with no files once the due date has passed', () => {
			vm.set({ ...baseVm, misTareaArchivos: { 100: [] } });
			const { component } = create();

			expect(component.estadoTarea({ id: 100, fechaLimite: '2000-01-01T00:00:00' })?.kind).toBe('vencida');
		});
	});
});
