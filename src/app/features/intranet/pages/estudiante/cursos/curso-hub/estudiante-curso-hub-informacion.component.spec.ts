// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CursoHubContextService } from '@intranet-shared/components';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { EstudianteCursoHubInformacionComponent } from './estudiante-curso-hub-informacion.component';
// #endregion

type HubSlot = NonNullable<ReturnType<CursoHubContextService['slot']>>;
const SLOT = { id: 3, cursoId: 24, salonId: 34 } as HubSlot;

describe('EstudianteCursoHubInformacionComponent', () => {
	const vm = signal({
		contentLoading: false,
		contenido: { id: 7 } as { id: number } | null,
		totalArchivos: 2,
		totalTareas: 1,
		semanas: [],
		archivosSummaryDialogVisible: false,
		tareasSummaryDialogVisible: false,
	});
	const slot = signal<HubSlot | null>(SLOT);
	const facade = {
		vm,
		openArchivosSummaryDialog: vi.fn(),
		closeArchivosSummaryDialog: vi.fn(),
		openTareasSummaryDialog: vi.fn(),
		closeTareasSummaryDialog: vi.fn(),
		loadContenidoForHub: vi.fn(),
		resetForHub: vi.fn(),
	};

	interface Internals {
		onIrACalificaciones(): void;
		onOpenArchivosSummary(): void;
	}

	function create() {
		const fixture = TestBed.createComponent(EstudianteCursoHubInformacionComponent);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance as unknown as Internals };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		slot.set(SLOT);
		TestBed.configureTestingModule({
			providers: [provideRouter([]), { provide: EstudianteCursosFacade, useValue: facade }],
		});
		TestBed.overrideComponent(EstudianteCursoHubInformacionComponent, {
			set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
		TestBed.inject(CursoHubContextService).bind(slot);
	});

	it('navigates to the calificaciones tab keeping the slot', () => {
		const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		const { component } = create();

		component.onIrACalificaciones();

		expect(navigate).toHaveBeenCalledWith(['/intranet', 'estudiante', 'cursos', 24, 34, 'calificaciones'], {
			queryParams: { horarioId: 3 },
			replaceUrl: true,
		});
	});

	it('does not navigate before the shell resolved the slot', () => {
		slot.set(null);
		const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
		const { component } = create();

		component.onIrACalificaciones();

		expect(navigate).not.toHaveBeenCalled();
	});

	it('opens the archivos summary through the facade', () => {
		const { component } = create();

		component.onOpenArchivosSummary();

		expect(facade.openArchivosSummaryDialog).toHaveBeenCalledOnce();
	});

	it('closes the summary dialogs but does not reset the store when leaving the tab', () => {
		const { fixture } = create();

		fixture.destroy();

		expect(facade.closeArchivosSummaryDialog).toHaveBeenCalledOnce();
		expect(facade.closeTareasSummaryDialog).toHaveBeenCalledOnce();
		expect(facade.resetForHub).not.toHaveBeenCalled();
		expect(facade.loadContenidoForHub).not.toHaveBeenCalled();
	});
});
