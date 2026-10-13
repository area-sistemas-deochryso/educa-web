// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CursoHubContextService } from '@intranet-shared/components';
import type { HorarioProfesorDto } from '../../models';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';
import { ProfesorCursoHubChipsComponent } from './profesor-curso-hub-chips.component';
// #endregion

// #region Fixtures
const SLOT = { id: 2, cursoId: 24, salonId: 34 } as HorarioProfesorDto;

const baseVm = {
	loading: false,
	contenido: null as { id: number } | null,
	semanas: [],
	totalArchivos: 3,
	totalTareas: 1,
	totalArchivosEstudiantes: 4,
	archivosSummaryDialogVisible: false,
	tareasSummaryDialogVisible: false,
	studentFilesDialogVisible: false,
	studentFilesData: null,
	studentFilesLoading: false,
};

interface Handlers {
	onChip(key: string): void;
}

interface ChipView {
	key: string;
	count: number | null;
}
// #endregion

describe('ProfesorCursoHubChipsComponent', () => {
	const vm = signal({ ...baseVm });
	const calVm = signal({ loading: false, totalEvaluaciones: 5, calificaciones: [] });
	const uiFacade = {
		vm,
		openArchivosSummaryDialog: vi.fn(),
		closeArchivosSummaryDialog: vi.fn(),
		openTareasSummaryDialog: vi.fn(),
		closeTareasSummaryDialog: vi.fn(),
		openStudentFilesDialog: vi.fn(),
		closeStudentFilesDialog: vi.fn(),
	};
	const calLoader = { ensure: vi.fn(), refresh: vi.fn(), reset: vi.fn() };
	const router = { navigate: vi.fn().mockResolvedValue(true) };
	const slot = signal<HorarioProfesorDto | null>(SLOT);

	function create() {
		const fixture = TestBed.createComponent(ProfesorCursoHubChipsComponent);
		fixture.detectChanges();
		return { fixture, handlers: fixture.componentInstance as unknown as Handlers };
	}

	/** Chips que el componente le pasa a `app-curso-hub-chips` (el primero que se renderiza). */
	const chipsOf = (fixture: { debugElement: { children: { properties: Record<string, unknown> }[] } }) =>
		(fixture.debugElement.children[0]?.properties['chips'] ?? []) as ChipView[];

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm, contenido: { id: 8 } });
		calVm.set({ loading: false, totalEvaluaciones: 5, calificaciones: [] });
		slot.set(SLOT);

		TestBed.configureTestingModule({
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: uiFacade },
				{ provide: CalificacionesFacade, useValue: { vm: calVm } },
				{ provide: CursoHubCalificacionesLoader, useValue: calLoader },
				{ provide: Router, useValue: router },
			],
		});
		TestBed.overrideComponent(ProfesorCursoHubChipsComponent, {
			set: { schemas: [NO_ERRORS_SCHEMA], imports: [] },
		});
		TestBed.inject(CursoHubContextService).bind(slot);
	});

	it('exposes the four counters of the old Información tab, with their values', () => {
		const { fixture } = create();

		expect(chipsOf(fixture).map((c) => [c.key, c.count])).toEqual([
			['archivos', 3],
			['tareas', 1],
			['adjuntos', 4],
			['calificaciones', 5],
		]);
	});

	it('shows a dash in the Calificaciones chip while they load', () => {
		calVm.set({ loading: true, totalEvaluaciones: 0, calificaciones: [] });
		const { fixture } = create();

		expect(chipsOf(fixture).find((c) => c.key === 'calificaciones')?.count).toBeNull();
	});

	it('renders no chips for a slot without content, but keeps the dialogs in the DOM', () => {
		vm.set({ ...baseVm });
		const { fixture } = create();

		expect(fixture.nativeElement.querySelector('app-curso-hub-chips')).toBeNull();
		for (const selector of ['app-archivos-summary-dialog', 'app-tareas-summary-dialog', 'app-student-files-dialog']) {
			expect(fixture.nativeElement.querySelector(selector)).not.toBeNull();
		}
	});

	it('shows skeletons (not nothing) while the contenido loads, so the title does not jump', () => {
		vm.set({ ...baseVm, loading: true });
		const { fixture } = create();

		expect(fixture.nativeElement.querySelector('app-curso-hub-chips')).not.toBeNull();
	});

	describe('each chip runs the action of the old button', () => {
		it('archivos → opens the files summary', () => {
			const { handlers } = create();
			handlers.onChip('archivos');
			expect(uiFacade.openArchivosSummaryDialog).toHaveBeenCalledOnce();
		});

		it('tareas → opens the tasks summary', () => {
			const { handlers } = create();
			handlers.onChip('tareas');
			expect(uiFacade.openTareasSummaryDialog).toHaveBeenCalledOnce();
		});

		it('adjuntos → opens the student files summary for the loaded contenido', () => {
			const { handlers } = create();
			handlers.onChip('adjuntos');
			expect(uiFacade.openStudentFilesDialog).toHaveBeenCalledWith(8);
		});

		it('adjuntos → does nothing without a contenido', () => {
			vm.set({ ...baseVm });
			const { handlers } = create();
			handlers.onChip('adjuntos');
			expect(uiFacade.openStudentFilesDialog).not.toHaveBeenCalled();
		});

		it('calificaciones → goes to the tab keeping the slot and closing the dialog', () => {
			const { handlers } = create();

			handlers.onChip('calificaciones');

			expect(uiFacade.closeStudentFilesDialog).toHaveBeenCalledOnce();
			expect(router.navigate).toHaveBeenCalledWith(['/intranet', 'profesor', 'cursos', 24, 34, 'calificaciones'], {
				queryParams: { horarioId: 2 },
				replaceUrl: true,
			});
		});
	});

	it('asks the loader for the calificaciones (counter) and never resets the stores', () => {
		const { fixture } = create();
		fixture.destroy();

		expect(calLoader.ensure).toHaveBeenCalledWith(8);
		expect(calLoader.reset).not.toHaveBeenCalled();
	});

	it('does not ask for calificaciones before there is a contenido', () => {
		vm.set({ ...baseVm });
		create();

		expect(calLoader.ensure).not.toHaveBeenCalled();
	});
});
