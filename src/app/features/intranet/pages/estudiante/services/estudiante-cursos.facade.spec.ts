// * Tests for EstudianteCursosFacade — validates student course orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EstudianteCursosFacade } from './estudiante-cursos.facade';
import { EstudianteCursosStore } from './estudiante-cursos.store';
import { EstudianteApiService } from './estudiante-api.service';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { SmartNotificationService } from '@core/services/notifications';

// #endregion

// #region Mocks
const mockHorarios = [
	{ id: 1, cursoNombre: 'Mat', salonDescripcion: '1A' },
	{ id: 2, cursoNombre: 'Com', salonDescripcion: '1A' },
] as never[];

const mockContenido = {
	id: 10, horarioId: 1, cursoNombre: 'Mat',
	semanas: [{ id: 1, tareas: [{ id: 100, titulo: 'T1', fechaEntrega: '2026-04-01' }], archivos: [] }],
} as never;

function createMockApi() {
	return {
		getMisHorarios: vi.fn().mockReturnValue(of(mockHorarios)),
		getContenido: vi.fn().mockReturnValue(of(mockContenido)),
		getMisArchivos: vi.fn().mockReturnValue(of([])),
		getMisTareaArchivos: vi.fn().mockReturnValue(of([])),
		getMisNotas: vi.fn().mockReturnValue(of([])),
		getMisNotasCurso: vi.fn().mockReturnValue(of(null)),
		getMiAsistencia: vi.fn().mockReturnValue(of(null)),
		uploadFile: vi.fn().mockReturnValue(of({ url: 'https://blob.test/entrega.pdf' })),
		registrarTareaArchivo: vi.fn(),
		cambiarPublicacionArchivo: vi.fn().mockReturnValue(of({})),
		cambiarPublicacionTareaArchivo: vi.fn().mockReturnValue(of({})),
		getArchivosGrupoSemana: vi.fn().mockReturnValue(of([])),
		getArchivosGrupoTarea: vi.fn().mockReturnValue(of([])),
	};
}
// #endregion

// #region Tests
describe('EstudianteCursosFacade', () => {
	let facade: EstudianteCursosFacade;
	let store: EstudianteCursosStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: { execute: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		wal = { execute: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				EstudianteCursosFacade,
				EstudianteCursosStore,
				{ provide: EstudianteApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: SmartNotificationService, useValue: { saveActividadSnapshot: vi.fn() } },
			],
		});

		facade = TestBed.inject(EstudianteCursosFacade);
		store = TestBed.inject(EstudianteCursosStore);
	});

	// #region loadHorarios
	describe('loadHorarios', () => {
		it('should load horarios into store', () => {
			facade.loadHorarios();

			expect(store.horarios()).toEqual(mockHorarios);
			expect(store.loading()).toBe(false);
		});

		it('should call API on load', () => {
			facade.loadHorarios();
			expect(api.getMisHorarios).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region loadMisArchivos — lazy loading
	describe('loadMisArchivos', () => {
		it('should load archivos for semana', () => {
			facade.loadMisArchivos(1);
			expect(api.getMisArchivos).toHaveBeenCalledWith(1);
		});

		it('should skip if already loaded', () => {
			store.setMisArchivos(1, []);
			facade.loadMisArchivos(1);

			expect(api.getMisArchivos).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region uploadTareaArchivo — INV-T04 (brief 412 Paso 2)
	describe('uploadTareaArchivo', () => {
		it('should show the backend message when the period is closed (TAREA_PERIODO_CERRADO)', () => {
			const errorHandler = TestBed.inject(ErrorHandlerService);
			const httpError = new HttpErrorResponse({
				status: 400,
				error: {
					errorCode: 'TAREA_PERIODO_CERRADO',
					detail: 'No se puede entregar esta tarea: el periodo académico ya está cerrado.',
				},
			});
			api.registrarTareaArchivo.mockReturnValue(throwError(() => httpError));

			facade.uploadTareaArchivo(100, new File(['x'], 'entrega.pdf'));

			expect(errorHandler.showError).toHaveBeenCalledWith(
				expect.any(String),
				'No se puede entregar esta tarea: el periodo académico ya está cerrado.',
			);
		});

		it('should show the generic message for other register errors', () => {
			const errorHandler = TestBed.inject(ErrorHandlerService);
			api.registrarTareaArchivo.mockReturnValue(
				throwError(() => new HttpErrorResponse({ status: 500, error: {} })),
			);

			facade.uploadTareaArchivo(100, new File(['x'], 'entrega.pdf'));

			expect(errorHandler.showError).toHaveBeenCalledWith(expect.any(String), 'No se pudo registrar el archivo');
		});
	});
	// #endregion

	// #region Publicación de archivos propios (P113 F5)
	describe('cambiarPublicacionArchivo', () => {
		const lastConfig = () => wal.execute.mock.lastCall?.[0];
		const estado = () => store.misArchivos()[1][0].publicado;
		beforeEach(() => store.setMisArchivos(1, [{ id: 7, nombreArchivo: 'a.pdf', publicado: false } as never]));

		it('publica de forma optimista y envía el PATCH con el estado pedido', () => {
			facade.cambiarPublicacionArchivo(1, 7, true);
			const config = lastConfig();

			config.optimistic.apply();
			expect(estado()).toBe(true);

			config.http$();
			expect(api.cambiarPublicacionArchivo).toHaveBeenCalledWith(7, { publicado: true });
		});

		it('revierte a borrador si el BE falla', () => {
			facade.cambiarPublicacionArchivo(1, 7, true);
			const config = lastConfig();

			config.optimistic.apply();
			config.optimistic.rollback();

			expect(estado()).toBe(false);
		});

		it('al confirmar toma el estado que devolvió el BE', () => {
			facade.cambiarPublicacionArchivo(1, 7, true);

			lastConfig().onCommit({ id: 7, publicado: false });

			expect(estado()).toBe(false);
		});

		it('avisa al usuario si el BE falla', () => {
			facade.cambiarPublicacionArchivo(1, 7, true);

			lastConfig().onError(new HttpErrorResponse({ status: 500 }));

			expect(TestBed.inject(ErrorHandlerService).showError).toHaveBeenCalled();
		});

		it('ignora un archivo que no está en el store', () => {
			facade.cambiarPublicacionArchivo(1, 999, true);

			expect(wal.execute).not.toHaveBeenCalled();
		});
	});

	describe('cambiarPublicacionTareaArchivo', () => {
		const lastConfig = () => wal.execute.mock.lastCall?.[0];
		const estado = () => store.misTareaArchivos()[100][0].publicado;
		beforeEach(() => store.setMisTareaArchivos(100, [{ id: 3, nombreArchivo: 'e.pdf', publicado: false } as never]));

		it('publica de forma optimista y envía el PATCH', () => {
			facade.cambiarPublicacionTareaArchivo(100, 3, true);
			const config = lastConfig();

			config.optimistic.apply();
			expect(estado()).toBe(true);

			config.http$();
			expect(api.cambiarPublicacionTareaArchivo).toHaveBeenCalledWith(3, { publicado: true });
		});

		it('vuelve a borrador de forma optimista y revierte a publicado si el BE falla', () => {
			store.updateMiTareaArchivo(100, 3, { publicado: true });
			facade.cambiarPublicacionTareaArchivo(100, 3, false);
			const config = lastConfig();

			config.optimistic.apply();
			expect(estado()).toBe(false);

			config.optimistic.rollback();
			expect(estado()).toBe(true);
		});
	});

	describe('archivos del grupo', () => {
		it('carga los de la semana una sola vez', () => {
			facade.loadArchivosGrupoSemana(1);
			facade.loadArchivosGrupoSemana(1);

			expect(api.getArchivosGrupoSemana).toHaveBeenCalledOnce();
			expect(store.archivosGrupoSemana()[1]).toEqual([]);
		});

		it('carga los de la tarea una sola vez y los guarda tal como los devuelve el BE', () => {
			const deCompanero = { id: 50, estudianteNombre: 'Ana', publicado: true };
			api.getArchivosGrupoTarea.mockReturnValue(of([deCompanero]));

			facade.loadArchivosGrupoTarea(100);
			facade.loadArchivosGrupoTarea(100);

			expect(api.getArchivosGrupoTarea).toHaveBeenCalledOnce();
			expect(store.archivosGrupoTarea()[100]).toEqual([deCompanero]);
		});

		it('si falla la carga deja la lista vacía sin romper', () => {
			api.getArchivosGrupoSemana.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

			facade.loadArchivosGrupoSemana(1);

			expect(store.archivosGrupoSemana()[1]).toEqual([]);
		});
	});
	// #endregion

	// #region vm
	describe('vm', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
	// #endregion
});
// #endregion
