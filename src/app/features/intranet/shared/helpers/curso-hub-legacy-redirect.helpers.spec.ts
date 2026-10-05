import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import {
	setupCursoHubLegacyRedirect,
	type CursoHubLegacyRedirect,
} from './curso-hub-legacy-redirect.helpers';

// #region Fixtures
const SLOT_A = { id: 7, cursoId: 24, salonId: 34 } as HorarioProfesorDto;
const SLOT_B = { id: 8, cursoId: 24, salonId: 34 } as HorarioProfesorDto;

interface Setup {
	redirect: CursoHubLegacyRedirect;
	horarios: ReturnType<typeof signal<readonly HorarioProfesorDto[]>>;
	loading: ReturnType<typeof signal<boolean>>;
	loadError: ReturnType<typeof signal<string | null>>;
	query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
	router: { navigate: ReturnType<typeof vi.fn> };
	errorHandler: { showWarning: ReturnType<typeof vi.fn> };
}

function setup(params: Record<string, string>, initial: { horarios?: HorarioProfesorDto[]; loading?: boolean } = {}): Setup {
	const query = new BehaviorSubject(convertToParamMap(params));
	const router = { navigate: vi.fn().mockResolvedValue(true) };
	const errorHandler = { showWarning: vi.fn() };
	const horarios = signal<readonly HorarioProfesorDto[]>(initial.horarios ?? []);
	const loading = signal(initial.loading ?? false);
	const loadError = signal<string | null>(null);

	TestBed.configureTestingModule({
		providers: [
			{ provide: ActivatedRoute, useValue: { queryParamMap: query.asObservable() } },
			{ provide: Router, useValue: router },
			{ provide: ErrorHandlerService, useValue: errorHandler },
		],
	});

	const redirect = TestBed.runInInjectionContext(() =>
		setupCursoHubLegacyRedirect({ rol: 'profesor', horarios, loading, loadError }),
	);
	return { redirect, horarios, loading, loadError, query, router, errorHandler };
}
// #endregion

describe('setupCursoHubLegacyRedirect', () => {
	beforeEach(() => TestBed.resetTestingModule());

	it('does nothing and is not pending without a legacy horarioId', () => {
		const s = setup({});
		TestBed.tick();

		expect(s.redirect.pending()).toBe(false);
		expect(s.router.navigate).not.toHaveBeenCalled();
	});

	it('waits (pending) while the schedules are still loading', () => {
		const s = setup({ horarioId: '7' }, { loading: true });
		TestBed.tick();

		expect(s.redirect.pending()).toBe(true);
		expect(s.router.navigate).not.toHaveBeenCalled();
		expect(s.errorHandler.showWarning).not.toHaveBeenCalled();
	});

	it('redirects to the hub of the pair with the slot once the schedules load, replacing the history entry', () => {
		const s = setup({ horarioId: '7', returnTo: 'salones', tab: 'tareas' }, { loading: true });
		TestBed.tick();

		s.horarios.set([SLOT_B, SLOT_A]);
		s.loading.set(false);
		TestBed.tick();

		expect(s.router.navigate).toHaveBeenCalledTimes(1);
		expect(s.router.navigate).toHaveBeenCalledWith(['/intranet', 'profesor', 'cursos', 24, 34], {
			queryParams: { horarioId: 7 },
			replaceUrl: true,
		});
	});

	it('redirects right away when the horarioId is already in the cached list', () => {
		const s = setup({ horarioId: '7' }, { horarios: [SLOT_A], loading: true });
		TestBed.tick();

		expect(s.router.navigate).toHaveBeenCalledTimes(1);
	});

	it('does not redirect twice if the list changes before the navigation completes', () => {
		const s = setup({ horarioId: '7' }, { horarios: [SLOT_A] });
		TestBed.tick();

		s.horarios.set([SLOT_A, SLOT_B]);
		TestBed.tick();

		expect(s.router.navigate).toHaveBeenCalledTimes(1);
	});

	it('warns and clears the legacy params when the horarioId does not exist after loading', () => {
		const s = setup({ horarioId: '999', returnTo: 'horarios' }, { loading: true });
		TestBed.tick();
		s.horarios.set([SLOT_A]);
		s.loading.set(false);
		TestBed.tick();

		expect(s.errorHandler.showWarning).toHaveBeenCalledTimes(1);
		expect(s.router.navigate).toHaveBeenCalledTimes(1);
		expect(s.router.navigate).toHaveBeenCalledWith([], {
			queryParams: { horarioId: null, tab: null, returnTo: null },
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	});

	it('treats a non-numeric horarioId as inexistent, not as a loop', () => {
		const s = setup({ horarioId: 'abc' }, { loading: true });
		TestBed.tick();
		s.loading.set(false);
		TestBed.tick();

		expect(s.errorHandler.showWarning).toHaveBeenCalledTimes(1);
		expect(s.router.navigate).toHaveBeenCalledTimes(1);
	});

	it('only clears the params, without a warning, when the load failed', () => {
		const s = setup({ horarioId: '7' }, { loading: true });
		TestBed.tick();
		s.loadError.set('boom');
		s.loading.set(false);
		TestBed.tick();

		expect(s.errorHandler.showWarning).not.toHaveBeenCalled();
		expect(s.router.navigate).toHaveBeenCalledTimes(1);
	});

	it('stops being pending once the query is cleared', () => {
		const s = setup({ horarioId: '999' }, { loading: true });
		TestBed.tick();
		expect(s.redirect.pending()).toBe(true);

		s.query.next(convertToParamMap({}));
		TestBed.tick();

		expect(s.redirect.pending()).toBe(false);
	});
});
