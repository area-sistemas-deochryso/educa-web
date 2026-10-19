// * Tests de CursoContenidoPublicacionFacade — publicar / volver a borrador con actualización optimista y rollback (P113 F4).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoPublicacionFacade } from './curso-contenido-publicacion.facade';
import { CursoContenidoStore } from './curso-contenido.store';
// #endregion

// #region Fixtures
const contenido = () =>
	({
		id: 1,
		semanas: [
			{
				id: 1,
				archivos: [{ id: 100, nombreArchivo: 'clase.pdf', publicado: false }],
				tareas: [{ id: 200, archivos: [{ id: 300, nombreArchivo: 'rubrica.pdf', publicado: false }] }],
			},
		],
	}) as never;
// #endregion

describe('CursoContenidoPublicacionFacade', () => {
	let facade: CursoContenidoPublicacionFacade;
	let store: CursoContenidoStore;
	let wal: { execute: ReturnType<typeof vi.fn> };
	let api: Record<string, ReturnType<typeof vi.fn>>;

	const lastConfig = () => wal.execute.mock.lastCall?.[0];
	const estadoArchivoSemana = () => (store.semanas()[0] as { archivos: { publicado: boolean }[] }).archivos[0].publicado;
	const estadoArchivoTarea = () => (store.semanas()[0] as { tareas: { archivos: { publicado: boolean }[] }[] }).tareas[0].archivos[0].publicado;

	beforeEach(() => {
		wal = { execute: vi.fn() };
		api = {
			cambiarPublicacionArchivo: vi.fn().mockReturnValue(of({})),
			cambiarPublicacionTareaArchivo: vi.fn().mockReturnValue(of({})),
		};
		TestBed.configureTestingModule({
			providers: [
				CursoContenidoPublicacionFacade,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
			],
		});
		facade = TestBed.inject(CursoContenidoPublicacionFacade);
		store = TestBed.inject(CursoContenidoStore);
		store.setContenido(contenido());
	});

	describe('archivo de semana', () => {
		it('publica de forma optimista y envía el PATCH', () => {
			facade.cambiarPublicacionArchivo(1, 100, true);
			const config = lastConfig();

			config.optimistic.apply();
			expect(estadoArchivoSemana()).toBe(true);

			config.http$();
			expect(api['cambiarPublicacionArchivo']).toHaveBeenCalledWith(100, { publicado: true });
		});

		it('revierte al estado anterior si el PATCH falla', () => {
			facade.cambiarPublicacionArchivo(1, 100, true);
			const config = lastConfig();

			config.optimistic.apply();
			config.optimistic.rollback();

			expect(estadoArchivoSemana()).toBe(false);
		});

		it('al confirmar toma el estado que devolvió el BE', () => {
			facade.cambiarPublicacionArchivo(1, 100, true);

			lastConfig().onCommit({ publicado: false });

			expect(estadoArchivoSemana()).toBe(false);
		});
	});

	describe('adjunto de tarea', () => {
		it('publica de forma optimista y envía el PATCH al adjunto', () => {
			facade.cambiarPublicacionTareaArchivo(1, 200, 300, true);
			const config = lastConfig();

			expect(config.resourceType).toBe('tareaArchivo');
			expect(config.endpoint).toContain('/tarea-archivo/300/publicacion');
			config.optimistic.apply();
			expect(estadoArchivoTarea()).toBe(true);

			config.http$();
			expect(api['cambiarPublicacionTareaArchivo']).toHaveBeenCalledWith(300, { publicado: true });
		});

		it('revierte al estado anterior si el PATCH falla', () => {
			facade.cambiarPublicacionTareaArchivo(1, 200, 300, true);
			const config = lastConfig();

			config.optimistic.apply();
			config.optimistic.rollback();

			expect(estadoArchivoTarea()).toBe(false);
		});

		it('volver a borrador actualiza el store y confirma con el dato del BE', () => {
			store.updateArchivoInTarea(1, 200, 300, { publicado: true });
			facade.cambiarPublicacionTareaArchivo(1, 200, 300, false);
			const config = lastConfig();

			config.optimistic.apply();
			expect(estadoArchivoTarea()).toBe(false);

			config.onCommit({ publicado: false });
			expect(estadoArchivoTarea()).toBe(false);
		});
	});
});
