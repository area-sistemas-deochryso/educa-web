// * Tests del camino del hub en CursoContenidoDataFacade: carga y creación sin efectos de modal.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, WalCrossTabRefetchService, WalFacadeHelper } from '@core/services';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoDataFacade } from './curso-contenido-data.facade';
import { CursoContenidoStore } from './curso-contenido.store';
// #endregion

// #region Fixtures
const contenido = (id: number, horarioId: number) => ({ id, horarioId, semanas: [] }) as never;
// #endregion

describe('CursoContenidoDataFacade — hub', () => {
	let facade: CursoContenidoDataFacade;
	let store: CursoContenidoStore;
	let api: { getContenido: ReturnType<typeof vi.fn>; crearContenido: ReturnType<typeof vi.fn> };
	let wal: { execute: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = { getContenido: vi.fn().mockReturnValue(of(contenido(8, 1))), crearContenido: vi.fn() };
		wal = { execute: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				CursoContenidoDataFacade,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
			],
		});
		facade = TestBed.inject(CursoContenidoDataFacade);
		store = TestBed.inject(CursoContenidoStore);
	});

	describe('loadContenidoForHub', () => {
		it('loads the slot content without opening any dialog', () => {
			facade.loadContenidoForHub(1, { salonId: 34 });

			expect(store.contenido()?.id).toBe(8);
			expect(store.selectedHorarioId()).toBe(1);
			expect(store.salonId()).toBe(34);
			expect(store.loading()).toBe(false);
			expect(store.contentDialogVisible()).toBe(false);
			expect(store.builderDialogVisible()).toBe(false);
		});

		it('leaves the content null (and no builder dialog) for a slot without content', () => {
			api.getContenido.mockReturnValue(of(null));

			facade.loadContenidoForHub(2);

			expect(store.contenido()).toBeNull();
			expect(store.builderDialogVisible()).toBe(false);
		});

		it('does not ignore a slot switch while a load is in flight', () => {
			const first = new Subject<never>();
			api.getContenido.mockReturnValueOnce(first).mockReturnValueOnce(of(contenido(11, 2)));

			facade.loadContenidoForHub(1);
			expect(store.loading()).toBe(true);
			facade.loadContenidoForHub(2);

			expect(store.selectedHorarioId()).toBe(2);
			expect(store.contenido()?.id).toBe(11);
			expect(store.loading()).toBe(false);
		});

		it('drops the stale response of the previous slot', () => {
			const first = new Subject<never>();
			api.getContenido.mockReturnValueOnce(first).mockReturnValueOnce(of(contenido(11, 2)));

			facade.loadContenidoForHub(1);
			facade.loadContenidoForHub(2);
			first.next(contenido(8, 1));

			expect(store.contenido()?.id).toBe(11);
		});

		it('clears the previous slot content while the new one loads', () => {
			facade.loadContenidoForHub(1);
			api.getContenido.mockReturnValue(new Subject<never>());

			facade.loadContenidoForHub(2);

			expect(store.contenido()).toBeNull();
			expect(store.loading()).toBe(true);
		});
	});

	describe('resetForHub', () => {
		it('clears the shared store and cancels the in-flight load', () => {
			const pending = new Subject<never>();
			api.getContenido.mockReturnValue(pending);
			facade.loadContenidoForHub(1, { salonId: 34 });

			facade.resetForHub();
			pending.next(contenido(8, 1));

			expect(store.contenido()).toBeNull();
			expect(store.selectedHorarioId()).toBeNull();
			expect(store.salonId()).toBeNull();
		});
	});

	describe('crearContenidoEnHub', () => {
		const request = { horarioId: 1, numeroSemanas: 16 };

		function run(step: 'apply' | 'rollback' | 'commit', created = contenido(20, 1)) {
			const config = wal.execute.mock.calls[0][0];
			if (step === 'apply') config.optimistic.apply();
			if (step === 'rollback') config.optimistic.rollback();
			if (step === 'commit') config.onCommit(created);
		}

		it('never opens the content or builder dialogs of the modal', () => {
			facade.loadContenidoForHub(1);
			facade.crearContenidoEnHub(request);

			run('apply');
			run('commit');

			expect(store.contentDialogVisible()).toBe(false);
			expect(store.builderDialogVisible()).toBe(false);
			expect(store.contenido()?.id).toBe(20);
		});

		it('notifies the hub on optimistic apply and rollback', () => {
			const hooks = { onApplied: vi.fn(), onRolledBack: vi.fn() };
			facade.crearContenidoEnHub(request, hooks);

			run('apply');
			run('rollback');

			expect(hooks.onApplied).toHaveBeenCalledOnce();
			expect(hooks.onRolledBack).toHaveBeenCalledOnce();
		});

		it('ignores a commit that arrives after the user switched to another slot', () => {
			api.getContenido.mockReturnValue(of(null));
			facade.loadContenidoForHub(2);
			facade.crearContenidoEnHub(request);

			run('commit', contenido(20, 1));

			expect(store.contenido()).toBeNull();
		});
	});
});
