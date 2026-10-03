// * Tests del camino del hub en CalificacionesFacade: carga latest-wins y reset sin efectos de modal.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, WalCrossTabRefetchService, WalFacadeHelper } from '@core/services';
import { CalificacionConfigService } from '@intranet-shared/services/calificacion-config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CalificacionesFacade } from './calificaciones.facade';
import { CalificacionesStore } from './calificaciones.store';
import { CursoContenidoStore } from './curso-contenido.store';
// #endregion

describe('CalificacionesFacade — hub', () => {
	let facade: CalificacionesFacade;
	let store: CalificacionesStore;
	let api: {
		getCalificaciones: ReturnType<typeof vi.fn>;
		getPeriodos: ReturnType<typeof vi.fn>;
		getEstudiantesSalon: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		api = {
			getCalificaciones: vi.fn().mockReturnValue(of([{ id: 1, titulo: 'A' }])),
			getPeriodos: vi.fn().mockReturnValue(of([])),
			getEstudiantesSalon: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				CalificacionesFacade,
				CalificacionesStore,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: { execute: vi.fn() } },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
				{ provide: CalificacionConfigService, useValue: {} },
			],
		});
		facade = TestBed.inject(CalificacionesFacade);
		store = TestBed.inject(CalificacionesStore);
	});

	it('loads the calificaciones of the contenido', () => {
		facade.loadCalificacionesForHub(8);

		expect(api.getCalificaciones).toHaveBeenCalledWith(8);
		expect(store.calificaciones()).toHaveLength(1);
		expect(store.vm().loading).toBe(false);
	});

	it('drops the stale response of the previous contenido (latest-wins)', () => {
		const first = new Subject<never>();
		api.getCalificaciones.mockReturnValueOnce(first).mockReturnValueOnce(of([{ id: 2, titulo: 'B' }, { id: 3, titulo: 'C' }]));

		facade.loadCalificacionesForHub(8);
		facade.loadCalificacionesForHub(11);
		first.next([{ id: 1, titulo: 'A' }] as never);

		expect(store.calificaciones().map((c) => c.id)).toEqual([2, 3]);
	});

	it('resetForHub cancels the in-flight load and clears the store', () => {
		const pending = new Subject<never>();
		api.getCalificaciones.mockReturnValue(pending);
		facade.loadCalificacionesForHub(8);

		facade.resetForHub();
		pending.next([{ id: 1, titulo: 'A' }] as never);
		pending.complete();

		expect(store.calificaciones()).toEqual([]);
		expect(store.vm().loading).toBe(false);
	});

	it('keeps the modal path working: loadCalificaciones still loads and returns its subscription', () => {
		const subscription = facade.loadCalificaciones(8);

		expect(store.calificaciones()).toHaveLength(1);
		expect(subscription.closed).toBe(true);
	});
});
