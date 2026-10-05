// * Tests for AttendanceCourseFacade — validates attendance orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';

import { firstValueFrom } from 'rxjs';

import { AttendanceCourseFacade } from './attendance-course.facade';
import { AttendanceCourseStore } from './attendance-course.store';
import { CursoContenidoStore } from './curso-contenido.store';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { ErrorHandlerService, WalFacadeHelper, WalCrossTabRefetchService } from '@core/services';

// #endregion

// #region Mocks
const mockRegistroData = {
	fecha: '2026-03-21',
	horarioId: 1,
	estudiantes: [
		{ estudianteId: 1, nombre: 'Juan', estado: 'P', justificacion: null },
		{ estudianteId: 2, nombre: 'María', estado: 'F', justificacion: 'Enfermedad' },
	],
};

function createMockApi() {
	return {
		getAsistenciaCursoFecha: vi.fn().mockReturnValue(of(mockRegistroData)),
		getAsistenciaCursoResumen: vi.fn().mockReturnValue(of({ totalClases: 20 })),
		registrarAsistenciaCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn().mockImplementation(async (config: Record<string, unknown>) => {
			const http$ = config['http$'] as () => import('rxjs').Observable<unknown>;
			const onCommit = config['onCommit'] as ((r: unknown) => void) | undefined;
			const onError = config['onError'] as ((e: unknown) => void) | undefined;
			const optimistic = config['optimistic'] as { apply: () => void; rollback: () => void } | undefined;
			optimistic?.apply();
			try {
				const result = await firstValueFrom(http$());
				onCommit?.(result);
			} catch (err) {
				optimistic?.rollback();
				onError?.(err);
			}
		}),
	};
}

function createMockCrossTabRefetch() {
	return { subscribe: vi.fn() };
}
// #endregion

// #region Tests
describe('AttendanceCourseFacade', () => {
	let facade: AttendanceCourseFacade;
	let store: AttendanceCourseStore;
	let contenidoStore: CursoContenidoStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		errorHandler = { showError: vi.fn(), showSuccess: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				AttendanceCourseFacade,
				AttendanceCourseStore,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: WalFacadeHelper, useValue: createMockWal() },
				{ provide: WalCrossTabRefetchService, useValue: createMockCrossTabRefetch() },
			],
		});

		facade = TestBed.inject(AttendanceCourseFacade);
		store = TestBed.inject(AttendanceCourseStore);
		contenidoStore = TestBed.inject(CursoContenidoStore);
		store.reset();
		contenidoStore.reset();
	});

	// #region loadRegistro
	describe('loadRegistro', () => {
		it('should load registro with override horarioId', () => {
			facade.loadRegistro('2026-03-21', 5);

			expect(api.getAsistenciaCursoFecha).toHaveBeenCalledWith(5, '2026-03-21');
			expect(store.registroLoading()).toBe(false);
			expect(store.registroData()).toEqual(mockRegistroData);
		});

		it('should use contenido horarioId when no override', () => {
			contenidoStore.setContenido({ horarioId: 10 } as never);
			facade.loadRegistro('2026-03-21');

			expect(api.getAsistenciaCursoFecha).toHaveBeenCalledWith(10, '2026-03-21');
		});

		it('should do nothing without horarioId', () => {
			facade.loadRegistro('2026-03-21');
			expect(api.getAsistenciaCursoFecha).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region In-flight loads
	describe('in-flight loads', () => {
		it('should ignore the late response of a superseded registro load', () => {
			const slotA = new Subject<unknown>();
			const slotB = new Subject<unknown>();
			api.getAsistenciaCursoFecha.mockReturnValueOnce(slotA).mockReturnValueOnce(slotB);

			facade.loadRegistro('2026-03-21', 1);
			facade.loadRegistro('2026-03-21', 2);
			slotB.next({ ...mockRegistroData, horarioId: 2 });
			slotB.complete();
			slotA.next({ ...mockRegistroData, horarioId: 1 });

			expect(store.registroData()?.horarioId).toBe(2);
		});

		it('should ignore the late response of a superseded resumen load', () => {
			const first = new Subject<unknown>();
			const second = new Subject<unknown>();
			api.getAsistenciaCursoResumen.mockReturnValueOnce(first).mockReturnValueOnce(second);

			facade.loadResumen('2026-03-01', '2026-03-31', 1);
			facade.loadResumen('2026-03-01', '2026-03-31', 2);
			second.next({ horarioId: 2, totalClases: 4 });
			second.complete();
			first.next({ horarioId: 1, totalClases: 9 });

			expect(store.resumen()?.horarioId).toBe(2);
		});

		it('should drop a pending load on reset', () => {
			const pending = new Subject<unknown>();
			api.getAsistenciaCursoFecha.mockReturnValueOnce(pending);
			facade.loadRegistro('2026-03-21', 1);

			facade.resetAsistencia();
			pending.next(mockRegistroData);

			expect(store.registroData()).toBeNull();
		});
	});
	// #endregion

	// #region loadResumen
	describe('loadResumen', () => {
		it('should load resumen', () => {
			facade.loadResumen('2026-03-01', '2026-03-31', 5);

			expect(api.getAsistenciaCursoResumen).toHaveBeenCalledWith(5, '2026-03-01', '2026-03-31');
			expect(store.resumenLoading()).toBe(false);
		});

		it('should do nothing without horarioId', () => {
			facade.loadResumen('2026-03-01', '2026-03-31');
			expect(api.getAsistenciaCursoResumen).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region registrar
	describe('registrar', () => {
		it('should register attendance', async () => {
			store.setRegistroData(mockRegistroData as never);
			facade.registrar(1);
			await vi.waitFor(() => {
				expect(api.registrarAsistenciaCurso).toHaveBeenCalledWith(1, expect.objectContaining({
					fecha: '2026-03-21',
					asistencias: expect.arrayContaining([
						expect.objectContaining({ estudianteId: 1, estado: 'P', justificacion: null }),
						expect.objectContaining({ estudianteId: 2, estado: 'F', justificacion: 'Enfermedad' }),
					]),
				}));
			});
			expect(store.registroSaving()).toBe(false);
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});

		it('should do nothing without data', () => {
			facade.registrar(1);
			expect(api.registrarAsistenciaCurso).not.toHaveBeenCalled();
		});

		it('should refuse to send the list of another slot to this horarioId', () => {
			store.setRegistroData(mockRegistroData as never);

			facade.registrar(2);

			expect(api.registrarAsistenciaCurso).not.toHaveBeenCalled();
		});

		it('should clear the unsaved-changes flag once saved', async () => {
			store.setRegistroData(mockRegistroData as never);
			facade.setEstudianteEstado(1, 'F');
			expect(store.registroDirty()).toBe(true);

			facade.registrar(1);

			await vi.waitFor(() => expect(store.registroDirty()).toBe(false));
		});

		it('should resolve true once the server confirmed the save', async () => {
			store.setRegistroData(mockRegistroData as never);

			await expect(facade.registrar(1)).resolves.toBe(true);
		});

		it('should resolve false when the save fails and keep the edits pending', async () => {
			store.setRegistroData(mockRegistroData as never);
			facade.setEstudianteEstado(1, 'F');
			api.registrarAsistenciaCurso.mockReturnValue(throwError(() => new Error('400')));

			await expect(facade.registrar(1)).resolves.toBe(false);

			expect(store.registroSaving()).toBe(false);
			expect(store.registroDirty()).toBe(true);
		});

		it('should resolve false without sending when there is nothing to send', async () => {
			await expect(facade.registrar(1)).resolves.toBe(false);

			store.setRegistroData(mockRegistroData as never);
			await expect(facade.registrar(2)).resolves.toBe(false);
			expect(api.registrarAsistenciaCurso).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region canSaveOutsidePanel
	describe('canSaveOutsidePanel', () => {
		// mockRegistroData.fecha (2026-03-21) is a Saturday.
		it('is false without a loaded list', () => {
			expect(facade.canSaveOutsidePanel(6)).toBe(false);
		});

		it('is true when the loaded date is the scheduled weekday', () => {
			store.setRegistroData(mockRegistroData as never);

			expect(facade.canSaveOutsidePanel(6)).toBe(true);
		});

		it('is false on an atypical date: only the panel can confirm it', () => {
			store.setRegistroData(mockRegistroData as never);

			expect(facade.canSaveOutsidePanel(1)).toBe(false);
		});

		it('is true when the course has no expected weekday', () => {
			store.setRegistroData(mockRegistroData as never);

			expect(facade.canSaveOutsidePanel(null)).toBe(true);
		});
	});
	// #endregion

	// #region State delegation
	describe('state delegation', () => {
		it('should delegate setEstudianteEstado', () => {
			store.setRegistroData(mockRegistroData as never);
			facade.setEstudianteEstado(1, 'F');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; estado: string }[];
			expect(est.find((e) => e.estudianteId === 1)?.estado).toBe('F');
		});

		it('should delegate setEstudianteJustificacion', () => {
			store.setRegistroData(mockRegistroData as never);
			facade.setEstudianteJustificacion(1, 'Motivo');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; justificacion: string | null }[];
			expect(est.find((e) => e.estudianteId === 1)?.justificacion).toBe('Motivo');
		});

		it('should reset asistencia', () => {
			store.setRegistroData(mockRegistroData as never);
			facade.resetAsistencia();
			expect(store.registroData()).toBeNull();
		});
	});
	// #endregion
});
// #endregion
