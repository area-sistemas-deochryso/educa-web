// * Tests de CursoContenidoCrudFacade — tras registrar, el store refleja el estado que devolvió el BE (P113 F4).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoCrudFacade } from './curso-contenido-crud.facade';
import { CursoContenidoStore } from './curso-contenido.store';
// #endregion

describe('CursoContenidoCrudFacade — archivos nuevos del profesor', () => {
	let facade: CursoContenidoCrudFacade;
	let store: CursoContenidoStore;
	let wal: { execute: ReturnType<typeof vi.fn> };
	let api: Record<string, ReturnType<typeof vi.fn>>;

	const file = new File(['x'], 'guia.pdf', { type: 'application/pdf' });
	const lastConfig = () => wal.execute.mock.lastCall?.[0];

	beforeEach(() => {
		wal = { execute: vi.fn() };
		api = {
			uploadFile: vi.fn().mockReturnValue(of({ url: 'https://blob/guia.pdf' })),
			registrarArchivo: vi.fn().mockReturnValue(of({})),
			registrarTareaArchivo: vi.fn().mockReturnValue(of({})),
		};
		TestBed.configureTestingModule({
			providers: [
				CursoContenidoCrudFacade,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
			],
		});
		facade = TestBed.inject(CursoContenidoCrudFacade);
		store = TestBed.inject(CursoContenidoStore);
		store.setContenido({ id: 1, semanas: [{ id: 1, archivos: [], tareas: [{ id: 200, archivos: [] }] }] } as never);
	});

	it('material de semana: el store agrega el archivo con el estado del BE (borrador) y la petición no fija el estado', () => {
		facade.uploadArchivo(1, file);
		const config = lastConfig();

		config.http$();
		expect(api['registrarArchivo'].mock.calls[0][1]).not.toHaveProperty('publicado');

		config.onCommit({ id: 9, nombreArchivo: 'guia.pdf', publicado: false });
		const semana = store.semanas()[0] as { archivos: { id: number; publicado: boolean }[] };
		expect(semana.archivos).toEqual([expect.objectContaining({ id: 9, publicado: false })]);
	});

	it('adjunto de tarea: el store agrega el archivo con el estado del BE (borrador) y la petición no fija el estado', () => {
		facade.uploadTareaArchivo(1, 200, file);
		const config = lastConfig();

		config.http$();
		expect(api['registrarTareaArchivo'].mock.calls[0][1]).not.toHaveProperty('publicado');

		config.onCommit({ id: 11, nombreArchivo: 'guia.pdf', publicado: false });
		const semana = store.semanas()[0] as { tareas: { archivos: { id: number; publicado: boolean }[] }[] };
		expect(semana.tareas[0].archivos).toEqual([expect.objectContaining({ id: 11, publicado: false })]);
	});
});
