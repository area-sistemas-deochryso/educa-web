// * Tests del camino del hub en EstudianteCursosFacade: carga sin abrir el modal.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { SmartNotificationService } from '@core/services/notifications';
import { EstudianteApiService } from './estudiante-api.service';
import { EstudianteCursosFacade } from './estudiante-cursos.facade';
import { EstudianteCursosStore } from './estudiante-cursos.store';
// #endregion

const contenido = (id: number, horarioId: number) => ({ id, horarioId, semanas: [] }) as never;

describe('EstudianteCursosFacade — hub', () => {
	let facade: EstudianteCursosFacade;
	let store: EstudianteCursosStore;
	let api: { getContenido: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = { getContenido: vi.fn().mockReturnValue(of(contenido(8, 1))) };
		TestBed.configureTestingModule({
			providers: [
				EstudianteCursosFacade,
				EstudianteCursosStore,
				{ provide: EstudianteApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
				{ provide: SmartNotificationService, useValue: { saveActividadSnapshot: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: { execute: vi.fn() } },
			],
		});
		facade = TestBed.inject(EstudianteCursosFacade);
		store = TestBed.inject(EstudianteCursosStore);
	});

	it('loads the slot content without opening the modal', () => {
		facade.loadContenidoForHub(1);

		expect(store.contenido()?.id).toBe(8);
		expect(store.contentLoading()).toBe(false);
		expect(store.contentDialogVisible()).toBe(false);
	});

	it('does not ignore a slot switch while a load is in flight and drops the stale response', () => {
		const first = new Subject<never>();
		api.getContenido.mockReturnValueOnce(first).mockReturnValueOnce(of(contenido(11, 2)));

		facade.loadContenidoForHub(1);
		facade.loadContenidoForHub(2);
		first.next(contenido(8, 1));

		expect(store.contenido()?.id).toBe(11);
		expect(store.contentLoading()).toBe(false);
	});

	it('clears the previous slot content and file caches before loading', () => {
		facade.loadContenidoForHub(1);
		store.setMisArchivos(5, [{ id: 1 } as never]);
		api.getContenido.mockReturnValue(new Subject<never>());

		facade.loadContenidoForHub(2);

		expect(store.contenido()).toBeNull();
		expect(store.contentLoading()).toBe(true);
		expect(store.vm().misArchivos).toEqual({});
	});

	it('resetForHub clears the store and cancels the in-flight load', () => {
		const pending = new Subject<never>();
		api.getContenido.mockReturnValue(pending);
		facade.loadContenidoForHub(1);

		facade.resetForHub();
		pending.next(contenido(8, 1));

		expect(store.contenido()).toBeNull();
		expect(store.contentLoading()).toBe(false);
	});
});
