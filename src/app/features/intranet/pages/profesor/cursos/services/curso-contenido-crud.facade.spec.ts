// * Tests de CursoContenidoCrudFacade — tras registrar, el store refleja el estado que devolvió el BE (P113 F4).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, SwService, WalFacadeHelper } from '@core/services';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoCrudFacade } from './curso-contenido-crud.facade';
import { CursoContenidoEvaluacionFacade } from './curso-contenido-evaluacion.facade';
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

describe('CursoContenidoCrudFacade — crear tarea con evaluación (P118-F2)', () => {
	let facade: CursoContenidoCrudFacade;
	let store: CursoContenidoStore;
	let wal: { execute: ReturnType<typeof vi.fn> };
	let api: Record<string, ReturnType<typeof vi.fn>>;
	const invalidateCache = vi.fn().mockResolvedValue(0);

	const lastConfig = () => wal.execute.mock.lastCall?.[0];
	const request = { titulo: 'Ensayo', descripcion: null, fechaLimite: null, esGrupal: false, tipo: 'TAREA' as const };

	beforeEach(() => {
		wal = { execute: vi.fn() };
		api = {
			crearTarea: vi.fn().mockReturnValue(of({ id: 50 })),
			getCupoPeso: vi.fn().mockReturnValue(of({ pesoUsado: 0.5, cupoRestante: 0.5 })),
		};
		TestBed.configureTestingModule({
			providers: [
				CursoContenidoCrudFacade,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: SwService, useValue: { invalidateCacheByPattern: invalidateCache } },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
			],
		});
		facade = TestBed.inject(CursoContenidoCrudFacade);
		store = TestBed.inject(CursoContenidoStore);
		store.setContenido({ id: 8, semanas: [{ id: 1, archivos: [], tareas: [] }] } as never);
		store.openTareaDialog(null);
	});

	it('con evaluación: una sola petición, esperando al servidor y con el diálogo abierto', () => {
		facade.crearTarea(1, { ...request, evaluacion: { peso: 0.25 } });
		const config = lastConfig();

		expect(wal.execute).toHaveBeenCalledTimes(1);
		expect(config.consistencyLevel).toBe('server-confirmed');
		expect(store.tareaDialogVisible()).toBe(true);

		config.http$();
		expect(api['crearTarea']).toHaveBeenCalledWith(1, expect.objectContaining({ evaluacion: { peso: 0.25 } }));
	});

	it('al confirmar el servidor: agrega la tarea, cierra el diálogo, invalida el cache de calificaciones y avisa para refrescar', async () => {
		const refrescar = vi.fn();
		facade.crearTarea(1, { ...request, evaluacion: { peso: 0.25 } }, refrescar);

		lastConfig().onCommit({ id: 50, titulo: 'Ensayo' });
		await vi.waitFor(() => expect(refrescar).toHaveBeenCalledTimes(1));
		expect(invalidateCache).toHaveBeenCalledWith('/api/Calificacion');

		expect(store.tareaDialogVisible()).toBe(false);
		expect((store.semanas()[0] as { tareas: { id: number }[] }).tareas).toEqual([expect.objectContaining({ id: 50 })]);
	});

	it('peso excedido: el diálogo sigue abierto, explica el cupo y lo vuelve a pedir', () => {
		facade.crearTarea(1, { ...request, evaluacion: { peso: 0.9 } });

		lastConfig().onError(
			new HttpErrorResponse({
				status: 400,
				error: { errorCode: 'EVALUACION_PESO_EXCEDIDO', data: { pesoUsado: 0.8, cupoRestante: 0.2 } },
			}),
		);

		expect(store.tareaDialogVisible()).toBe(true);
		expect(store.tareaDialogError()).toContain('Cupo disponible: 20 %');
		expect(store.saving()).toBe(false);
		expect(api['getCupoPeso']).toHaveBeenCalledWith(8);
	});

	it.each(['EVALUACION_PERIODO_CERRADO', 'EVALUACION_EDIT_WINDOW_EXCEEDED'])('%s: se explica dentro del diálogo, que no se cierra', (errorCode) => {
		facade.crearTarea(1, { ...request, evaluacion: { peso: 0.25 } });

		lastConfig().onError(new HttpErrorResponse({ status: 400, error: { errorCode } }));

		expect(store.tareaDialogVisible()).toBe(true);
		expect(store.tareaDialogError()).toContain('Desactiva «Es calificable»');
	});

	it('sin evaluación: flujo de siempre (optimista, cierra el diálogo)', () => {
		facade.crearTarea(1, request);
		const config = lastConfig();

		expect(config.consistencyLevel).toBeUndefined();
		config.optimistic.apply();
		expect(store.tareaDialogVisible()).toBe(false);
	});

	it('cargarCupoPeso guarda el cupo del curso abierto', async () => {
		TestBed.inject(CursoContenidoEvaluacionFacade).cargarCupoPeso();
		await Promise.resolve();
		await Promise.resolve();

		expect(api['getCupoPeso']).toHaveBeenCalledWith(8);
		expect(store.tareaCupo()).toEqual({ pesoUsado: 0.5, cupoRestante: 0.5 });
	});
});
