// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { EstudianteCursoHubChipsComponent } from './estudiante-curso-hub-chips.component';
// #endregion

describe('EstudianteCursoHubChipsComponent', () => {
	const baseVm = {
		contentLoading: false,
		contenido: { id: 7 } as { id: number } | null,
		totalArchivos: 2,
		totalTareas: 1,
		semanas: [],
		archivosSummaryDialogVisible: false,
		tareasSummaryDialogVisible: false,
	};
	const vm = signal({ ...baseVm });
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
		onChip(key: string): void;
	}

	function create() {
		const fixture = TestBed.createComponent(EstudianteCursoHubChipsComponent);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance as unknown as Internals };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm });
		TestBed.configureTestingModule({ providers: [{ provide: EstudianteCursosFacade, useValue: facade }] });
		TestBed.overrideComponent(EstudianteCursoHubChipsComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
	});

	it('shows only two chips, archivos and tareas (what the old tab offered to the student)', () => {
		const { fixture } = create();
		const chips = (fixture.debugElement.children[0]?.properties['chips'] ?? []) as { key: string; count: number | null }[];

		expect(chips.map((c) => [c.key, c.count])).toEqual([
			['archivos', 2],
			['tareas', 1],
		]);
	});

	it('renders no chips for a slot without content, but keeps the dialogs in the DOM', () => {
		vm.set({ ...baseVm, contenido: null });
		const { fixture } = create();

		expect(fixture.nativeElement.querySelector('app-curso-hub-chips')).toBeNull();
		expect(fixture.nativeElement.querySelector('app-archivos-summary-dialog')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('app-tareas-summary-dialog')).not.toBeNull();
	});

	it('archivos → opens the files summary through the facade', () => {
		const { component } = create();
		component.onChip('archivos');
		expect(facade.openArchivosSummaryDialog).toHaveBeenCalledOnce();
		expect(facade.openTareasSummaryDialog).not.toHaveBeenCalled();
	});

	it('tareas → opens the tasks summary through the facade', () => {
		const { component } = create();
		component.onChip('tareas');
		expect(facade.openTareasSummaryDialog).toHaveBeenCalledOnce();
		expect(facade.openArchivosSummaryDialog).not.toHaveBeenCalled();
	});

	it('closes the summary dialogs but does not reset the store when the hub goes away', () => {
		const { fixture } = create();

		fixture.destroy();

		expect(facade.closeArchivosSummaryDialog).toHaveBeenCalledOnce();
		expect(facade.closeTareasSummaryDialog).toHaveBeenCalledOnce();
		expect(facade.resetForHub).not.toHaveBeenCalled();
		expect(facade.loadContenidoForHub).not.toHaveBeenCalled();
	});
});
