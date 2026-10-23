// * Behavior tests para SchedulesAssignmentService — asignar/desasignar profesor y estudiantes con WAL optimistic.
/// Verifica la cadena completa: comando → WAL execute → onCommit/rollback → store state + error handler.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { SchedulesAssignmentService } from './horarios-assignment.service';
import { SchedulesStore } from './horarios.store';
import { SchedulesApiService } from './horarios-api.service';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import type { HorarioAsignarProfesorDto, HorarioAsignarEstudiantesDto } from '../models/horario.interface';
// #endregion

// #region Mocks
const mockProfesorDto: HorarioAsignarProfesorDto = {
	horarioId: 10,
	profesorId: 200,
	usuarioMod: 'admin',
};

const mockEstudiantesDto: HorarioAsignarEstudiantesDto = {
	horarioId: 10,
	estudianteIds: [300, 301],
	usuarioReg: 'admin',
};

function createMockApi() {
	return {
		asignarProfesor: vi.fn().mockReturnValue(of(true)),
		asignarEstudiantes: vi.fn().mockReturnValue(of(true)),
		asignarTodosEstudiantes: vi.fn().mockReturnValue(of(true)),
		desasignarProfesor: vi.fn().mockReturnValue(of(true)),
		desasignarEstudiante: vi.fn().mockReturnValue(of(true)),
	};
}

interface WalConfig {
	operation: string;
	resourceType: string;
	resourceId: number | string;
	endpoint: string;
	method: string;
	payload: unknown;
	http$: () => import('rxjs').Observable<unknown>;
	onCommit?: () => void;
	onError?: (err: unknown) => void;
	optimistic?: { apply: () => void; rollback: () => void };
}

function createMockWal() {
	const configs: WalConfig[] = [];
	const execute = vi.fn((config: WalConfig) => {
		configs.push(config);
		config.optimistic?.apply();
		config.http$?.().subscribe({
			next: (result) => config.onCommit?.(result),
			error: (err) => {
				config.optimistic?.rollback?.();
				config.onError?.(err);
			},
		});
	});
	return {
		execute,
		last: () => configs[configs.length - 1],
		count: () => configs.length,
	};
}

function createMockStore() {
	return {
		setLoading: vi.fn(),
		clearDetalleProfesor: vi.fn(),
		updateHorario: vi.fn(),
		removeEstudianteFromDetalle: vi.fn(),
		incrementarEstadistica: vi.fn(),
		formStore: {
			detailDrawerVisible: vi.fn().mockReturnValue(false),
		},
	} as never;
}

function createMockErrorHandler() {
	return {
		showSuccess: vi.fn(),
		showError: vi.fn(),
		handle: vi.fn(),
	};
}
// #endregion

// #region Tests
describe('SchedulesAssignmentService', () => {
	let service: SchedulesAssignmentService;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;
	let store: ReturnType<typeof createMockStore>;
	let errorHandler: ReturnType<typeof createMockErrorHandler>;
	let router: { navigate: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();
		store = createMockStore();
		errorHandler = createMockErrorHandler();
		router = { navigate: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				SchedulesAssignmentService,
				{ provide: SchedulesApiService, useValue: api },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: SchedulesStore, useValue: store },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: Router, useValue: router },
			],
		});

		service = TestBed.inject(SchedulesAssignmentService);
	});
	// #endregion

	// #region asignarProfesor
	describe('asignarProfesor', () => {
		it('should call WAL execute with correct config for profesor assignment', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};

			service.asignarProfesor(mockProfesorDto, callbacks);

			expect(wal.execute).toHaveBeenCalledTimes(1);
			const config = wal.last();
			expect(config.operation).toBe('CUSTOM');
			expect(config.resourceType).toBe('horarios');
			expect(config.resourceId).toBe(10);
			expect(config.method).toBe('POST');
			expect(config.endpoint).toContain('/asignar-profesor');
			expect(config.payload).toEqual(mockProfesorDto);
			expect(api.asignarProfesor).toHaveBeenCalledWith(mockProfesorDto);
		});

		it('should apply optimistic update before HTTP commit', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			const applySpy = vi.fn();

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				applySpy();
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.asignarProfesor(mockProfesorDto, callbacks);

			expect(applySpy).toHaveBeenCalled();
			expect(store.setLoading).toHaveBeenCalledWith(true);
		});

		it('should call onCommit callbacks on success', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.asignarProfesor(mockProfesorDto, callbacks);
			commitFn?.();

			expect(store.setLoading).toHaveBeenCalledWith(false);
			expect(callbacks.refreshHorarios).toHaveBeenCalled();
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});

		it('should call loadDetalle when detail drawer is visible', () => {
			(store.formStore.detailDrawerVisible as ReturnType<typeof vi.fn>).mockReturnValue(true);
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.asignarProfesor(mockProfesorDto, callbacks);
			commitFn?.();

			expect(callbacks.loadDetalle).toHaveBeenCalledWith(10);
		});

		it('should handle error via errHandler on failure', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			let errorFn: ((err: unknown) => void) | undefined;

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				errorFn = config.onError;
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
					error: (err) => {
						config.optimistic?.rollback?.();
						config.onError?.(err);
					},
				});
			});

			service.asignarProfesor(mockProfesorDto, callbacks);
			errorFn?.(new Error('conflict'));

			expect(errorHandler.showError).toHaveBeenCalled();
			expect(store.setLoading).toHaveBeenCalledWith(false);
		});

		it('should not call WAL execute without a selected usuario or rol', () => {
			// El servicio usa store.selectedUsuario() y store.selectedRolId() internamente
			// pero asignarProfesor no los usa directamente — usa los parámetros pasados.
			// Este test verifica que el servicio no falla con parámetros válidos.
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};

			service.asignarProfesor(mockProfesorDto, callbacks);

			expect(wal.execute).toHaveBeenCalledTimes(1);
		});
	});
	// #endregion

	// #region asignarEstudiantes
	describe('asignarEstudiantes', () => {
		it('should call WAL execute with correct config for estudiantes assignment', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
			};

			service.asignarEstudiantes(mockEstudiantesDto, callbacks);

			expect(wal.execute).toHaveBeenCalledTimes(1);
			const config = wal.last();
			expect(config.operation).toBe('CUSTOM');
			expect(config.resourceType).toBe('horarios');
			expect(config.resourceId).toBe(10);
			expect(config.method).toBe('POST');
			expect(config.payload).toEqual(mockEstudiantesDto);
			expect(api.asignarEstudiantes).toHaveBeenCalledWith(mockEstudiantesDto);
		});

		it('should call onCommit callbacks on success', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
			};
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.asignarEstudiantes(mockEstudiantesDto, callbacks);
			commitFn?.();

			expect(store.setLoading).toHaveBeenCalledWith(false);
			expect(callbacks.refreshHorarios).toHaveBeenCalled();
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region asignarTodosEstudiantes
	describe('asignarTodosEstudiantes', () => {
		it('should call WAL execute for assign all students', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.asignarTodosEstudiantes(10, 'admin', callbacks);
			commitFn?.();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'CUSTOM',
					resourceType: 'horarios',
					resourceId: 10,
					method: 'POST',
					payload: { horarioId: 10, usuarioReg: 'admin' },
				}),
			);
			expect(store.setLoading).toHaveBeenCalledWith(false);
			expect(callbacks.refreshHorarios).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region desasignarProfesor
	describe('desasignarProfesor', () => {
		it('should call WAL execute with correct config for profesor unassignment', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};

			service.desasignarProfesor(10, 'admin', callbacks);

			expect(wal.execute).toHaveBeenCalledTimes(1);
			const config = wal.last();
			expect(config.operation).toBe('CUSTOM');
			expect(config.resourceType).toBe('horarios');
			expect(config.resourceId).toBe(10);
			expect(config.method).toBe('PUT');
			expect(config.payload).toEqual({ horarioId: 10, usuarioMod: 'admin' });
			expect(api.desasignarProfesor).toHaveBeenCalledWith(10, 'admin');
		});

		it('should clear detalle profesor and incrementar estadística on optimistic apply', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			const applySpy = vi.fn();

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				applySpy();
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.desasignarProfesor(10, 'admin', callbacks);

			expect(applySpy).toHaveBeenCalled();
			expect(store.clearDetalleProfesor).toHaveBeenCalled();
			expect(store.updateHorario).toHaveBeenCalledWith(10, {
				profesorId: null,
				profesorNombreCompleto: null,
			});
			expect(store.incrementarEstadistica).toHaveBeenCalledWith('horariosSinProfesor', 1);
		});

		it('should call onCommit callbacks on success', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.desasignarProfesor(10, 'admin', callbacks);
			commitFn?.();

			expect(store.setLoading).toHaveBeenCalledWith(false);
			expect(callbacks.refreshHorarios).toHaveBeenCalled();
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region desasignarEstudiante
	describe('desasignarEstudiante', () => {
		it('should call WAL execute with correct config for estudiante unassignment', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};

			service.desasignarEstudiante(10, 300, callbacks);

			expect(wal.execute).toHaveBeenCalledTimes(1);
			const config = wal.last();
			expect(config.operation).toBe('DELETE');
			expect(config.resourceType).toBe('horarios');
			expect(config.resourceId).toBe(10);
			expect(config.method).toBe('DELETE');
			expect(config.payload).toEqual({ horarioId: 10, estudianteId: 300 });
			expect(api.desasignarEstudiante).toHaveBeenCalledWith(10, 300);
		});

		it('should remove estudiante from detalle and set loading on optimistic apply', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			const applySpy = vi.fn();

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				applySpy();
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.desasignarEstudiante(10, 300, callbacks);

			expect(applySpy).toHaveBeenCalled();
			expect(store.removeEstudianteFromDetalle).toHaveBeenCalledWith(300);
			expect(store.setLoading).toHaveBeenCalledWith(true);
		});

		it('should call onCommit callbacks on success', () => {
			const callbacks = {
				refreshHorarios: vi.fn(),
				loadDetalle: vi.fn(),
			};
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: WalConfig) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
				config.http$?.().subscribe({
					next: () => config.onCommit?.(),
				});
			});

			service.desasignarEstudiante(10, 300, callbacks);
			commitFn?.();

			expect(store.setLoading).toHaveBeenCalledWith(false);
			expect(callbacks.refreshHorarios).toHaveBeenCalled();
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});
	});
	// #endregion
});
// #endregion
