// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';
// #endregion

describe('CursoHubCalificacionesLoader', () => {
	const calFacade = { loadCalificacionesForHub: vi.fn(), resetForHub: vi.fn() };
	let loader: CursoHubCalificacionesLoader;

	beforeEach(() => {
		vi.clearAllMocks();
		TestBed.configureTestingModule({ providers: [{ provide: CalificacionesFacade, useValue: calFacade }] });
		loader = TestBed.inject(CursoHubCalificacionesLoader);
	});

	it('loads the calificaciones of a contenido once, however many tabs ask for it', () => {
		loader.ensure(8);
		loader.ensure(8);

		expect(calFacade.loadCalificacionesForHub).toHaveBeenCalledOnce();
		expect(calFacade.loadCalificacionesForHub).toHaveBeenCalledWith(8);
	});

	it('loads again for a different contenido', () => {
		loader.ensure(8);
		loader.ensure(11);

		expect(calFacade.loadCalificacionesForHub).toHaveBeenCalledTimes(2);
	});

	it('refresh always reloads', () => {
		loader.ensure(8);
		loader.refresh(8);

		expect(calFacade.loadCalificacionesForHub).toHaveBeenCalledTimes(2);
	});

	it('reset clears the facade and lets the same contenido load again (rollback of a delete)', () => {
		loader.ensure(8);
		loader.reset();
		loader.ensure(8);

		expect(calFacade.resetForHub).toHaveBeenCalledOnce();
		expect(calFacade.loadCalificacionesForHub).toHaveBeenCalledTimes(2);
	});
});
