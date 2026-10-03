// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EduConfirmationService } from '@edu-ui';
import { CursoHubContextService } from '@intranet-shared/components';
import type { HorarioProfesorDto } from '../../models';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoContenidoDataFacade } from '../services/curso-contenido-data.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';
import { ProfesorCursoHubInformacionComponent } from './profesor-curso-hub-informacion.component';
// #endregion

// #region Fixtures
const SLOT = { id: 2, cursoId: 24, salonId: 34 } as HorarioProfesorDto;

const contenido = { id: 8, cursoNombre: 'Matemática', salonDescripcion: '3A', numeroSemanas: 16 };

const baseVm = {
	loading: false,
	error: null as string | null,
	contenido: null as typeof contenido | null,
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
	onDeleteContenido(): void;
	onIrACalificaciones(): void;
	onOpenStudentFiles(): void;
}
// #endregion

describe('ProfesorCursoHubInformacionComponent', () => {
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
	const dataFacade = { eliminarContenidoEnHub: vi.fn(), eliminarContenido: vi.fn(), resetForHub: vi.fn() };
	const calLoader = { ensure: vi.fn(), refresh: vi.fn(), reset: vi.fn() };
	const confirmation = { confirm: vi.fn() };
	const router = { navigate: vi.fn().mockResolvedValue(true) };
	const slot = signal<HorarioProfesorDto | null>(SLOT);

	function create() {
		const fixture = TestBed.createComponent(ProfesorCursoHubInformacionComponent);
		fixture.detectChanges();
		return { fixture, handlers: fixture.componentInstance as unknown as Handlers };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm });
		slot.set(SLOT);

		TestBed.configureTestingModule({
			providers: [
				{ provide: CursoContenidoUiFacade, useValue: uiFacade },
				{ provide: CursoContenidoDataFacade, useValue: dataFacade },
				{ provide: CalificacionesFacade, useValue: { vm: calVm } },
				{ provide: CursoHubCalificacionesLoader, useValue: calLoader },
				{ provide: Router, useValue: router },
			],
		});
		TestBed.overrideComponent(ProfesorCursoHubInformacionComponent, {
			set: {
				imports: [],
				providers: [{ provide: EduConfirmationService, useValue: confirmation }],
				schemas: [NO_ERRORS_SCHEMA],
			},
		});
		TestBed.inject(CursoHubContextService).bind(slot);
	});

	it('shows the course data and counters when the slot has content', () => {
		vm.set({ ...baseVm, contenido });
		const { fixture } = create();
		const text = fixture.nativeElement.textContent as string;

		expect(text).toContain('Matemática');
		expect(text).toContain('3A');
		expect(text).toContain('16 semanas');
		expect(fixture.nativeElement.querySelectorAll('.stat-box')).toHaveLength(4);
	});

	it('asks the loader for the calificaciones (counter) and never resets the stores', () => {
		vm.set({ ...baseVm, contenido });
		const { fixture } = create();
		fixture.destroy();

		expect(calLoader.ensure).toHaveBeenCalledWith(8);
		expect(calLoader.reset).not.toHaveBeenCalled();
		expect(dataFacade.resetForHub).not.toHaveBeenCalled();
	});

	it('points to Contenido when the slot has none', () => {
		const { fixture } = create();

		expect(
			fixture.nativeElement.querySelector('[data-info-anchor="profesor-curso-hub-informacion-sin-contenido"]'),
		).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.stat-box')).toBeNull();
	});

	it('keeps the summary dialogs in the DOM even without content', () => {
		const { fixture } = create();

		for (const selector of ['app-archivos-summary-dialog', 'app-tareas-summary-dialog', 'app-student-files-dialog']) {
			expect(fixture.nativeElement.querySelector(selector)).not.toBeNull();
		}
	});

	it('opens the student files summary for the loaded contenido', () => {
		vm.set({ ...baseVm, contenido });
		const { handlers } = create();

		handlers.onOpenStudentFiles();

		expect(uiFacade.openStudentFilesDialog).toHaveBeenCalledWith(8);
	});

	it('goes to the Calificaciones tab keeping the slot and closing the dialog', () => {
		vm.set({ ...baseVm, contenido });
		const { handlers } = create();

		handlers.onIrACalificaciones();

		expect(uiFacade.closeStudentFilesDialog).toHaveBeenCalledOnce();
		expect(router.navigate).toHaveBeenCalledWith(
			['/intranet', 'profesor', 'cursos', 24, 34, 'calificaciones'],
			{ queryParams: { horarioId: 2 }, replaceUrl: true },
		);
	});

	describe('eliminar contenido', () => {
		it('confirms, then deletes through the hub variant (no modal side effects)', () => {
			vm.set({ ...baseVm, contenido });
			const { handlers } = create();

			handlers.onDeleteContenido();
			expect(dataFacade.eliminarContenidoEnHub).not.toHaveBeenCalled();

			confirmation.confirm.mock.calls[0][0].accept();

			expect(dataFacade.eliminarContenidoEnHub).toHaveBeenCalledWith(8);
			expect(dataFacade.eliminarContenido).not.toHaveBeenCalled();
			expect(calLoader.reset).toHaveBeenCalledOnce();
		});

		it('does nothing without a contenido', () => {
			const { handlers } = create();

			handlers.onDeleteContenido();

			expect(confirmation.confirm).not.toHaveBeenCalled();
		});
	});
});
