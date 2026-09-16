// * Tests for TeacherFinalClassroomsFacade — validates final grades orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { TeacherFinalClassroomsFacade } from './profesor-final-salones.facade';
import { TeacherFinalClassroomsStore } from './profesor-final-salones.store';
import { TeacherFinalClassroomsApiService } from './profesor-final-salones-api.service';
import { ProfesorCursosApiService } from '../../services/profesor-cursos-api.service';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { AprobarEstudianteDto, AprobacionMasivaDto } from '../models';

// #endregion

// #region Mocks
const mockSalones = [
	{ id: 1, gradoOrden: 1, totalEstudiantes: 25, aprobados: 20, desaprobados: 3, pendientes: 2 },
	{ id: 2, gradoOrden: 5, totalEstudiantes: 30, aprobados: 25, desaprobados: 3, pendientes: 2 },
] as never[];

const mockRendimiento = {
	cursoContenidoId: 10,
	cursoNombre: 'Matemática',
	salonDescripcion: '5to A',
	estudiantes: [],
} as never;

function createMockApi() {
	return {
		getSalonesProfesor: vi.fn().mockReturnValue(of(mockSalones)),
		getPeriodosPorAnio: vi.fn().mockReturnValue(of([])),
		getConfiguracionesPorAnio: vi.fn().mockReturnValue(of([])),
		getEstudiantesPorSalon: vi.fn().mockReturnValue(of([])),
		aprobarEstudiante: vi.fn().mockReturnValue(of(true)),
		aprobarMasivo: vi.fn().mockReturnValue(of({ total: 5, succeeded: 5, failed: 0 })),
		getRendimientoEstudiantes: vi.fn().mockReturnValue(of(mockRendimiento)),
	};
}

function createMockCursosApi() {
	return {
		getContenido: vi.fn().mockReturnValue(of({ id: 10, horarioId: 17 })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn((config: { onCommit?: (data?: never) => void; optimistic?: { apply: () => void } }) => {
			config.optimistic?.apply();
		}),
	};
}
// #endregion

// #region Tests
describe('TeacherFinalClassroomsFacade', () => {
	let facade: TeacherFinalClassroomsFacade;
	let store: TeacherFinalClassroomsStore;
	let api: ReturnType<typeof createMockApi>;
	let cursosApi: ReturnType<typeof createMockCursosApi>;
	let wal: ReturnType<typeof createMockWal>;
	let errorHandler: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		cursosApi = createMockCursosApi();
		wal = createMockWal();
		errorHandler = { showError: vi.fn(), showSuccess: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				TeacherFinalClassroomsFacade,
				TeacherFinalClassroomsStore,
				{ provide: TeacherFinalClassroomsApiService, useValue: api },
				{ provide: ProfesorCursosApiService, useValue: cursosApi },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: WalFacadeHelper, useValue: wal },
			],
		});

		facade = TestBed.inject(TeacherFinalClassroomsFacade);
		store = TestBed.inject(TeacherFinalClassroomsStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load salones, periodos, and configs', () => {
			facade.loadAll();

			expect(store.salones()).toEqual(mockSalones);
			expect(store.loading()).toBe(false);
			expect(store.tableReady()).toBe(true);
			expect(store.statsReady()).toBe(true);
		});
	});
	// #endregion

	// #region loadRendimientoEstudiantes
	describe('loadRendimientoEstudiantes', () => {
		it('should resolve cursoContenidoId from horarioId before loading rendimiento', () => {
			facade.loadRendimientoEstudiantes(17);

			expect(cursosApi.getContenido).toHaveBeenCalledWith(17);
			expect(api.getRendimientoEstudiantes).toHaveBeenCalledWith(10);
			expect(store.salonRendimiento()).toEqual(mockRendimiento);
			expect(store.rendimientoLoading()).toBe(false);
		});

		it('should set an error and null rendimiento when the horario has no contenido', () => {
			cursosApi.getContenido.mockReturnValue(of(null));

			facade.loadRendimientoEstudiantes(99);

			expect(api.getRendimientoEstudiantes).not.toHaveBeenCalled();
			expect(store.salonRendimiento()).toBeNull();
			expect(store.rendimientoError()).toBe('Este curso todavía no tiene contenido registrado');
			expect(store.rendimientoLoading()).toBe(false);
		});
	});
	// #endregion

	// #region aprobarEstudiante
	describe('aprobarEstudiante', () => {
		const dto: AprobarEstudianteDto = {
			estudianteId: 200,
			salonId: 1,
			periodoId: 5,
			estado: 'Aprobado',
			esVacacional: false,
			promedioFinal: 15,
			observacion: null,
		};

		it('should call WAL execute with server-confirmed consistency and the correct payload', () => {
			facade.aprobarEstudiante(dto);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'UPDATE',
					resourceType: 'aprobacionEstudiante',
					resourceId: 200,
					method: 'POST',
					payload: dto,
					consistencyLevel: 'server-confirmed',
				}),
			);
		});

		it('should update the aprobacion and refresh salones on commit', () => {
			store.setAprobaciones([{ estudianteId: 200, estado: 'Pendiente' } as never]);
			wal.execute.mockImplementationOnce((config: { onCommit?: (data: boolean) => void }) => {
				config.onCommit?.(true);
			});

			facade.aprobarEstudiante(dto);

			expect(store.aprobaciones()[0]).toEqual(
				expect.objectContaining({ estado: 'Aprobado', esVacacional: false, promedioFinal: 15 }),
			);
			expect(api.getSalonesProfesor).toHaveBeenCalled();
		});

		it('should show an error when the backend commits but reports failure', () => {
			wal.execute.mockImplementationOnce((config: { onCommit?: (data: boolean) => void }) => {
				config.onCommit?.(false);
			});

			facade.aprobarEstudiante(dto);

			expect(errorHandler.showError).toHaveBeenCalledWith('Error', 'No se pudo aprobar/desaprobar al estudiante');
		});

		it('should show an error on WAL failure', () => {
			wal.execute.mockImplementationOnce((config: { onError?: () => void }) => {
				config.onError?.();
			});

			facade.aprobarEstudiante(dto);

			expect(errorHandler.showError).toHaveBeenCalledWith('Error', 'No se pudo aprobar/desaprobar al estudiante');
		});
	});
	// #endregion

	// #region aprobarMasivo
	describe('aprobarMasivo', () => {
		const dto: AprobacionMasivaDto = {
			salonId: 1,
			periodoId: 5,
			aprobaciones: [{ estudianteId: 200, estado: 'Aprobado', esVacacional: false, promedioFinal: 15, observacion: null } as never],
		};

		it('should call WAL execute with server-confirmed consistency and the correct payload', () => {
			facade.aprobarMasivo(dto);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'CREATE',
					resourceType: 'aprobacionEstudiante',
					method: 'POST',
					payload: dto,
					consistencyLevel: 'server-confirmed',
				}),
			);
			expect(store.aprobacionesLoading()).toBe(true);
		});

		it('should show success, reload aprobaciones and refresh salones on commit', () => {
			store.setSelectedSalonId(1);
			wal.execute.mockImplementationOnce((config: { onCommit?: (data: { total: number; succeeded: number; failed: number }) => void }) => {
				config.onCommit?.({ total: 5, succeeded: 5, failed: 0 });
			});

			facade.aprobarMasivo(dto);

			expect(errorHandler.showSuccess).toHaveBeenCalledWith(
				'Aprobación masiva completada',
				'5 de 5 procesados correctamente',
				5000,
			);
			expect(api.getEstudiantesPorSalon).toHaveBeenCalledWith(1, undefined);
			expect(api.getSalonesProfesor).toHaveBeenCalled();
			expect(store.aprobacionesLoading()).toBe(false);
		});

		it('should report partial failures in the success detail', () => {
			store.setSelectedSalonId(1);
			wal.execute.mockImplementationOnce((config: { onCommit?: (data: { total: number; succeeded: number; failed: number }) => void }) => {
				config.onCommit?.({ total: 5, succeeded: 3, failed: 2 });
			});

			facade.aprobarMasivo(dto);

			expect(errorHandler.showSuccess).toHaveBeenCalledWith(
				'Aprobación masiva completada',
				'3 exitosos, 2 fallidos de 5',
				5000,
			);
		});

		it('should show an error when the backend commits but reports failure', () => {
			wal.execute.mockImplementationOnce((config: { onCommit?: (data: null) => void }) => {
				config.onCommit?.(null);
			});

			facade.aprobarMasivo(dto);

			expect(errorHandler.showError).toHaveBeenCalledWith('Error', 'No se pudo completar la aprobación masiva');
			expect(store.aprobacionesLoading()).toBe(false);
		});

		it('should show an error on WAL failure', () => {
			wal.execute.mockImplementationOnce((config: { onError?: () => void }) => {
				config.onError?.();
			});

			facade.aprobarMasivo(dto);

			expect(errorHandler.showError).toHaveBeenCalledWith('Error', 'No se pudo completar la aprobación masiva');
			expect(store.aprobacionesLoading()).toBe(false);
		});
	});
	// #endregion

	// #region UI commands
	describe('UI commands', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
	// #endregion
});
// #endregion
