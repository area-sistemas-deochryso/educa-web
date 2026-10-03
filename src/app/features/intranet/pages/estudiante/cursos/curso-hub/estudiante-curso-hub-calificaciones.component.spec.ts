// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { EstudianteCursoHubCalificacionesComponent } from './estudiante-curso-hub-calificaciones.component';
// #endregion

const baseVm = {
	contentLoading: false,
	contenido: { id: 7 } as { id: number } | null,
	misNotasCurso: null as unknown,
	misNotasLoading: false,
};

describe('EstudianteCursoHubCalificacionesComponent', () => {
	const vm = signal({ ...baseVm });
	const facade = { vm, loadMisNotasCurso: vi.fn(), refreshMisNotasCurso: vi.fn(), resetForHub: vi.fn() };

	function create() {
		const fixture = TestBed.createComponent(EstudianteCursoHubCalificacionesComponent);
		fixture.detectChanges();
		return fixture;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm });
		TestBed.configureTestingModule({
			providers: [provideRouter([]), { provide: EstudianteCursosFacade, useValue: facade }],
		});
		TestBed.overrideComponent(EstudianteCursoHubCalificacionesComponent, {
			set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
	});

	it('requests the notas once the shell loaded the contenido', () => {
		create();

		expect(facade.loadMisNotasCurso).toHaveBeenCalledOnce();
	});

	it('does not request the notas when there is no contenido', () => {
		vm.set({ ...baseVm, contenido: null });

		create();

		expect(facade.loadMisNotasCurso).not.toHaveBeenCalled();
	});

	it('does not request the notas again when the store already has them', () => {
		vm.set({ ...baseVm, misNotasCurso: { cursoId: 1 } });

		create();

		expect(facade.loadMisNotasCurso).not.toHaveBeenCalled();
	});

	it('does not request the notas while they are loading', () => {
		vm.set({ ...baseVm, misNotasLoading: true });

		create();

		expect(facade.loadMisNotasCurso).not.toHaveBeenCalled();
	});

	it('requests the notas of the next contenido when the shell switches slot', () => {
		const fixture = create();
		facade.loadMisNotasCurso.mockClear();

		vm.set({ ...baseVm, contenido: { id: 8 } });
		fixture.detectChanges();

		expect(facade.loadMisNotasCurso).toHaveBeenCalledOnce();
	});

	it('refreshes through the facade and never resets the store', () => {
		const fixture = create();

		(fixture.componentInstance as unknown as { onRefreshNotas(): void }).onRefreshNotas();
		fixture.destroy();

		expect(facade.refreshMisNotasCurso).toHaveBeenCalledOnce();
		expect(facade.resetForHub).not.toHaveBeenCalled();
	});
});
