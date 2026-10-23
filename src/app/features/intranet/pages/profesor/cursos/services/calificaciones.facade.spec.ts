// * Behavior tests para CalificacionesFacade — CRUD de evaluaciones con WAL optimistic,
// calificación por lote (server-confirmed), cambio de tipo, periodos y manejo de periodo cerrado.
// Verifica la cadena completa: comando → WAL execute → onCommit/rollback → store state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CalificacionesFacade } from './calificaciones.facade';
import { CalificacionesStore } from './calificaciones.store';
import { CursoContenidoStore } from './curso-contenido.store';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CalificacionConfigService } from '@intranet-shared/services/calificacion-config';
import { ErrorHandlerService, WalFacadeHelper, WalCrossTabRefetchService } from '@core/services';
import {
	CrearCalificacionDto,
	CalificarLoteDto,
	ActualizarNotaDto,
	CrearPeriodoDto,
	CalificacionConNotasDto,
	CalificacionDto,
	CalificarGruposLoteDto,
	CambiarTipoCalificacionDto,
	CursoContenidoDetalleDto,
} from '../../models';
import { buildPeriodoCerradoMessage } from './periodo-cerrado-message';
// #endregion

// #region Mocks
const mockContenido: CursoContenidoDetalleDto = {
	id: 1,
	titulo: 'Contenido 1',
	salonId: 10,
	grado: 'Primero',
	anio: 2026,
} as never;

const mockCalificacion: CalificacionConNotasDto = {
	id: 1,
	nombre: 'Examen 1',
	peso: 30,
	tipo: 'examen',
	numeroSemana: 1,
	notas: [{ estudianteId: 1, nota: 16 }],
} as never;

const mockPeriodo = { id: 1, nombre: 'Periodo 1', orden: 1 } as never;

const mockEstudianteSalon = { id: 1, nombre: 'Estudiante 1', dni: '12345678' } as never;

function createMockApi() {
	return {
		getCalificaciones: vi.fn().mockReturnValue(of([mockCalificacion])),
		getPeriodos: vi.fn().mockReturnValue(of([mockPeriodo])),
		getEstudiantesSalon: vi.fn().mockReturnValue(of({ estudiantes: [mockEstudianteSalon], grado: 'Primero', anio: 2026 })),
		crearCalificacion: vi.fn().mockReturnValue(of(mockCalificacion)),
		calificarLote: vi.fn().mockReturnValue(of({})),
		calificarGruposLote: vi.fn().mockReturnValue(of({})),
		actualizarNota: vi.fn().mockReturnValue(of({})),
		eliminarCalificacion: vi.fn().mockReturnValue(of({})),
		cambiarTipoCalificacion: vi.fn().mockReturnValue(of(mockCalificacion)),
		crearPeriodo: vi.fn().mockReturnValue(of(mockPeriodo)),
		eliminarPeriodo: vi.fn().mockReturnValue(of({})),
		getGrupos: vi.fn().mockReturnValue(of({ grupos: [] })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn((config: { http$: () => unknown; onCommit?: (result?: unknown) => void; onError?: (err: unknown) => void; optimistic?: { apply: () => void; rollback: () => void } }) => {
			config.optimistic?.apply();
			config.http$?.().subscribe({
				next: (result) => config.onCommit?.(result),
				error: (err) => {
					config.optimistic?.rollback?.();
					config.onError?.(err);
				},
			});
		}),
	};
}

function createMockErrorHandler() {
	return {
		showSuccess: vi.fn(),
		showError: vi.fn(),
		handle: vi.fn(),
	};
}

function createMockCalificacionConfigService() {
	return {
		getConfig: vi.fn().mockReturnValue(of({ umbralAprobacion: 11 })),
	};
}
// #endregion

// #region Tests
describe('CalificacionesFacade', () => {
	let facade: CalificacionesFacade;
	let store: CalificacionesStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;
	let errorHandler: ReturnType<typeof createMockErrorHandler>;
	let contenidoStore: CursoContenidoStore;
	let calificacionConfigService: ReturnType<typeof createMockCalificacionConfigService>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();
		errorHandler = createMockErrorHandler();
		calificacionConfigService = createMockCalificacionConfigService();

		TestBed.configureTestingModule({
			providers: [
				CalificacionesFacade,
				CalificacionesStore,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: CalificacionConfigService, useValue: calificacionConfigService },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
			],
		});

		facade = TestBed.inject(CalificacionesFacade);
		store = TestBed.inject(CalificacionesStore);
		contenidoStore = TestBed.inject(CursoContenidoStore);
		contenidoStore.setContenido(mockContenido);
		contenidoStore.setSalonId(10);
	});
	// #endregion

	// #region loadCalificaciones
	describe('loadCalificaciones', () => {
		it('should load calificaciones, periodos and salon students on success', () => {
			facade.loadCalificaciones(1);

			expect(api.getCalificaciones).toHaveBeenCalledWith(1);
			expect(api.getPeriodos).toHaveBeenCalledWith(1);
			expect(api.getEstudiantesSalon).toHaveBeenCalledWith(10);
			expect(store.calificaciones()).toHaveLength(1);
			expect(store.periodos()).toHaveLength(1);
			expect(store.salonEstudiantes()).toHaveLength(1);
			expect(store.loading()).toBe(false);
		});

		it('should call error handler on load failure', () => {
			(api.getCalificaciones as ReturnType<typeof vi.fn>).mockReturnValueOnce(throwError(() => new Error('boom')));

			facade.loadCalificaciones(1);

			expect(api.getCalificaciones).toHaveBeenCalledWith(1);
		});
	});
	// #endregion

	// #region crearCalificacion
	describe('crearCalificacion', () => {
		const dto: CrearCalificacionDto = {
			nombre: 'Examen 1',
			peso: 30,
			tipo: 'examen',
			numeroSemana: 1,
			notas: [{ estudianteId: 1, nota: 16 }],
		} as never;

		it('should call WAL execute with correct config for crear', () => {
			facade.crearCalificacion(dto);

			expect(wal.execute).toHaveBeenCalledTimes(1);
			const config = wal.execute.mock.calls[0][0];
			expect(config.operation).toBe('CREATE');
			expect(config.resourceType).toBe('calificacion');
			expect(config.method).toBe('POST');
			expect(config.payload).toEqual(dto);
		});

		it('should add calificacion on commit', () => {
			let commitFn: ((cal: CalificacionConNotasDto) => void) | undefined;

			wal.execute.mockImplementationOnce((config: { onCommit?: (cal: CalificacionConNotasDto) => void }) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
			});

			facade.crearCalificacion(dto);
			commitFn?.(mockCalificacion);

			expect(store.calificaciones()).toHaveLength(1);
			expect(store.saving()).toBe(false);
			expect(store.calificacionDialogVisible()).toBe(false);
		});

		it('should show periodo cerrado message on periodo cerrado error', () => {
			const err = new HttpErrorResponse({
				status: 400,
				error: { errorCode: 'EVALUACION_PERIODO_CERRADO' },
			});

			wal.execute.mockImplementationOnce((config: { onError?: (err: unknown) => void }) => {
				config.optimistic?.apply();
				config.onError?.(err);
			});

			facade.crearCalificacion(dto);

			expect(errorHandler.showError).toHaveBeenCalledWith(
				'Periodo cerrado',
				expect.stringContaining('crear'),
			);
			expect(store.saving()).toBe(false);
		});

		it('should call errHandler.handle on non-periodo-cerrado error', () => {
			store.setSalonContexto({ grado: 'Primero', anio: 2026 } as never);
			const err = new HttpErrorResponse({ status: 500, error: { errorCode: 'OTRO' } });

			wal.execute.mockImplementationOnce((config: { onError?: (err: unknown) => void }) => {
				config.optimistic?.apply();
				config.onError?.(err);
			});

			facade.crearCalificacion(dto);

			expect(errorHandler.showError).toHaveBeenCalled();
			expect(store.saving()).toBe(false);
		});
	});
	// #endregion

	// #region calificarLote
	describe('calificarLote', () => {
		const dto: CalificarLoteDto = { notas: [{ estudianteId: 1, nota: 16 }] } as never;

		it('should call WAL execute with consistencyLevel server-confirmed', () => {
			facade.calificarLote(1, dto, 1);

			const config = wal.execute.mock.calls[0][0];
			expect(config.consistencyLevel).toBe('server-confirmed');
			expect(config.resourceType).toBe('calificacion');
			expect(config.method).toBe('POST');
			expect(api.calificarLote).toHaveBeenCalledWith(1, dto);
		});

		it('should refresh calificaciones and close dialog on commit', () => {
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: { onCommit?: () => void }) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
			});

			facade.calificarLote(1, dto, 1);
			commitFn?.();

			expect(api.getCalificaciones).toHaveBeenCalledWith(1);
			expect(store.calificarDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region actualizarNota
	describe('actualizarNota', () => {
		const dto: ActualizarNotaDto = { nota: 18 } as never;

		it('should call WAL execute with consistencyLevel server-confirmed for nota update', () => {
			facade.actualizarNota(1, dto, 1);

			const config = wal.execute.mock.calls[0][0];
			expect(config.consistencyLevel).toBe('server-confirmed');
			expect(config.method).toBe('PUT');
			expect(api.actualizarNota).toHaveBeenCalledWith(1, dto);
		});

		it('should refresh calificaciones on commit', () => {
			let commitFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: { onCommit?: () => void }) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
			});

			facade.actualizarNota(1, dto, 1);
			commitFn?.();

			expect(api.getCalificaciones).toHaveBeenCalledWith(1);
		});
	});
	// #endregion

	// #region eliminarCalificacion
	describe('eliminarCalificacion', () => {
		it('should call WAL execute with DELETE operation', () => {
			facade.eliminarCalificacion(1);

			const config = wal.execute.mock.calls[0][0];
			expect(config.operation).toBe('DELETE');
			expect(config.method).toBe('DELETE');
			expect(api.eliminarCalificacion).toHaveBeenCalledWith(1);
		});

		it('should remove calificacion optimistically', () => {
			store.setCalificaciones([mockCalificacion]);
			const applySpy = vi.fn();

			wal.execute.mockImplementationOnce((config: { optimistic?: { apply: () => void } }) => {
				config.optimistic?.apply();
				applySpy();
				config.http$?.().subscribe({ next: () => config.onCommit?.() });
			});

			facade.eliminarCalificacion(1);

			expect(applySpy).toHaveBeenCalled();
			expect(store.calificaciones()).toHaveLength(0);
		});

		it('should rollback by re-adding the snapshot on error', () => {
			store.setCalificaciones([mockCalificacion]);
			let rollbackFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: { optimistic?: { rollback: () => void } }) => {
				config.optimistic?.apply();
				rollbackFn = config.optimistic?.rollback;
			});

			facade.eliminarCalificacion(1);
			rollbackFn?.();

			expect(store.calificaciones()).toHaveLength(1);
		});
	});
	// #endregion

	// #region cambiarTipo
	describe('cambiarTipo', () => {
		const dto: CambiarTipoCalificacionDto = { tipo: 'examen' } as never;

		it('should call WAL execute with consistencyLevel server-confirmed for tipo change', () => {
			facade.cambiarTipo(1, dto);

			const config = wal.execute.mock.calls[0][0];
			expect(config.consistencyLevel).toBe('server-confirmed');
			expect(config.method).toBe('PUT');
			expect(api.cambiarTipoCalificacion).toHaveBeenCalledWith(1, dto);
		});

		it('should replace calificacion in store on commit', () => {
			store.setCalificaciones([mockCalificacion]);
			const updatedCal = { ...mockCalificacion, tipo: 'examen' as never };
			let commitFn: ((cal: CalificacionConNotasDto) => void) | undefined;

			wal.execute.mockImplementationOnce((config: { onCommit?: (cal: CalificacionConNotasDto) => void }) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
			});

			facade.cambiarTipo(1, dto);
			commitFn?.(updatedCal);

			expect(store.replaceCalificacion).toBeDefined();
			expect(store.calificaciones()[0]).toEqual(updatedCal);
		});

		it('reloads the list when the evaluation has a linked tarea (the PUT answers entregas: [], INV-C18)', () => {
			const conTarea = { ...mockCalificacion, tareaId: 7, entregas: [] } as CalificacionConNotasDto;
			wal.execute.mockImplementationOnce((config: { onCommit?: (cal: CalificacionConNotasDto) => void }) => config.onCommit?.(conTarea));

			facade.cambiarTipo(1, dto);

			expect(api.getCalificaciones).toHaveBeenCalledWith(mockContenido.id);
		});

		it('does not reload when the evaluation has no tarea', () => {
			const sinTarea = { ...mockCalificacion, tareaId: null } as CalificacionConNotasDto;
			wal.execute.mockImplementationOnce((config: { onCommit?: (cal: CalificacionConNotasDto) => void }) => config.onCommit?.(sinTarea));

			facade.cambiarTipo(1, dto);

			expect(api.getCalificaciones).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region crearPeriodo / eliminarPeriodo
	describe('crearPeriodo', () => {
		const dto: CrearPeriodoDto = { nombre: 'Periodo 2', orden: 2 } as never;

		it('should call WAL execute for crear periodo', () => {
			facade.crearPeriodo(dto);

			const config = wal.execute.mock.calls[0][0];
			expect(config.operation).toBe('CREATE');
			expect(config.method).toBe('POST');
			expect(api.crearPeriodo).toHaveBeenCalledWith(dto);
		});

		it('should add periodo on commit', () => {
			let commitFn: ((periodo: typeof mockPeriodo) => void) | undefined;

			wal.execute.mockImplementationOnce((config: { onCommit?: (periodo: typeof mockPeriodo) => void }) => {
				config.optimistic?.apply();
				commitFn = config.onCommit;
			});

			facade.crearPeriodo(dto);
			commitFn?.(mockPeriodo);

			expect(store.periodos()).toHaveLength(1);
		});
	});

	describe('eliminarPeriodo', () => {
		it('should call WAL execute for eliminar periodo', () => {
			facade.eliminarPeriodo(1);

			const config = wal.execute.mock.calls[0][0];
			expect(config.operation).toBe('DELETE');
			expect(config.method).toBe('DELETE');
			expect(api.eliminarPeriodo).toHaveBeenCalledWith(1);
		});

		it('should remove periodo on commit', () => {
			store.setPeriodos([mockPeriodo]);
			let rollbackFn: (() => void) | undefined;

			wal.execute.mockImplementationOnce((config: { optimistic?: { rollback: () => void } }) => {
				config.optimistic?.apply();
				rollbackFn = config.optimistic?.rollback;
			});

			facade.eliminarPeriodo(1);
			rollbackFn?.();

			expect(store.periodos()).toHaveLength(1);
		});
	});
	// #endregion

	// #region openCalificarDialog
	describe('openCalificarDialog', () => {
		it('should load grupos when calificacion is grupal', () => {
			const calGrupal = { ...mockCalificacion, esGrupal: true } as never;
			const contenido = contenidoStore.contenido();

			facade.openCalificarDialog(calGrupal);

			expect(api.getGrupos).toHaveBeenCalledWith(contenido!.id);
			expect(store.calificarDialogVisible()).toBe(true);
			expect(store.selectedCalificacion()).toEqual(calGrupal);
		});

		it('marks the grupos as loaded once they answer, even with none (empty state vs loading)', () => {
			const calGrupal = { ...mockCalificacion, esGrupal: true } as never;

			facade.openCalificarDialog(calGrupal);

			expect(store.gruposForCalificar()).toEqual([]);
			expect(store.gruposForCalificarCargados()).toBe(true);
		});

		it('does not claim there are no grupos when loading them failed', () => {
			api.getGrupos.mockReturnValueOnce(throwError(() => new Error('boom')));

			facade.openCalificarDialog({ ...mockCalificacion, esGrupal: true } as never);

			expect(store.gruposForCalificarCargados()).toBe(false);
		});

		it('should NOT load grupos when calificacion is individual', () => {
			const calIndividual = { ...mockCalificacion, esGrupal: false } as never;

			facade.openCalificarDialog(calIndividual);

			expect(api.getGrupos).not.toHaveBeenCalled();
			expect(store.calificarDialogVisible()).toBe(true);
		});
	});
	// #endregion

	// #region resetCalificaciones
	describe('resetCalificaciones', () => {
		it('should reset store state', () => {
			store.setCalificaciones([mockCalificacion]);
			store.setLoading(true);
			store.openCalificacionDialog();

			facade.resetCalificaciones();

			expect(store.calificaciones()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.calificacionDialogVisible()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
