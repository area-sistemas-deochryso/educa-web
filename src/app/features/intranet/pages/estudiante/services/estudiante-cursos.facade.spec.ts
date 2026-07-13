// * Tests for EstudianteCursosFacade — validates student course orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EstudianteCursosFacade } from './estudiante-cursos.facade';
import { EstudianteCursosStore } from './estudiante-cursos.store';
import { EstudianteApiService } from './estudiante-api.service';
import { ErrorHandlerService } from '@core/services';
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
	};
}
// #endregion

// #region Tests
describe('EstudianteCursosFacade', () => {
	let facade: EstudianteCursosFacade;
	let store: EstudianteCursosStore;
	let api: ReturnType<typeof createMockApi>;

	beforeEach(() => {
		api = createMockApi();

		TestBed.configureTestingModule({
			providers: [
				EstudianteCursosFacade,
				EstudianteCursosStore,
				{ provide: EstudianteApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
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

	// #region loadContenido
	describe('loadContenido', () => {
		it('should load contenido and open dialog', () => {
			facade.loadContenido(1);

			expect(store.contenido()).toEqual(mockContenido);
			expect(store.contentDialogVisible()).toBe(true);
			expect(store.contentLoading()).toBe(false);
		});

		it('should skip if already loading', () => {
			store.setContentLoading(true);
			facade.loadContenido(1);

			expect(api.getContenido).not.toHaveBeenCalled();
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

	// #region vm
	describe('vm', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
	// #endregion
});
// #endregion
