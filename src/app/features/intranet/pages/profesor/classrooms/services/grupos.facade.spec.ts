// * Tests for GruposFacade — validates group management orchestration with WAL.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { GruposFacade } from './grupos.facade';
import { GruposStore } from './grupos.store';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';

// #endregion

// #region Mocks
const mockGruposResponse = {
	grupos: [{ id: 1, nombre: 'Grupo A', estudiantes: [] }],
	estudiantesSinGrupo: [{ estudianteId: 100, estudianteNombre: 'Ana', estudianteDni: '111' }],
	maxEstudiantesPorGrupo: 5,
};

function createMockApi() {
	return {
		getContenido: vi.fn().mockReturnValue(of({ id: 50, semanas: [] })),
		getGrupos: vi.fn().mockReturnValue(of(mockGruposResponse)),
		crearGrupo: vi.fn().mockReturnValue(of({ id: 2, nombre: 'Nuevo', estudiantes: [] })),
		actualizarGrupo: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminarGrupo: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		asignarEstudiantes: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		removerEstudiante: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		configurarMaxEstudiantes: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
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
describe('GruposFacade', () => {
	let facade: GruposFacade;
	let store: GruposStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();

		TestBed.configureTestingModule({
			providers: [
				GruposFacade,
				GruposStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
			],
		});

		facade = TestBed.inject(GruposFacade);
		store = TestBed.inject(GruposStore);
		store.reset();
	});

	// #region loadGruposForHorario
	describe('loadGruposForHorario', () => {
		it('should load grupos when contenido exists', () => {
			facade.loadGruposForHorario(1);

			expect(api.getContenido).toHaveBeenCalledWith(1);
			expect(store.contenidoId()).toBe(50);
			expect(store.grupos()).toHaveLength(1);
		});

		it('should set noContenido when contenido is null', () => {
			api.getContenido.mockReturnValue(of(null));

			facade.loadGruposForHorario(1);

			expect(store.noContenido()).toBe(true);
		});
	});
	// #endregion

	// #region WAL operations
	describe('WAL CRUD operations', () => {
		beforeEach(() => {
			store.setContenidoId(50);
			store.setGruposData(
				mockGruposResponse.grupos as never,
				mockGruposResponse.estudiantesSinGrupo as never,
				5,
			);
		});

		it('should call WAL execute for crearGrupo', () => {
			facade.crearGrupo('Nuevo Grupo');

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'CREATE', resourceType: 'grupoContenido' }),
			);
		});

		it('should not create grupo without contenidoId', () => {
			store.setContenidoId(null);
			facade.crearGrupo('Test');

			expect(wal.execute).not.toHaveBeenCalled();
		});

		it('should call WAL execute for actualizarGrupo with correct payload', () => {
			facade.actualizarGrupo(1, { nombre: 'Renombrado' });

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'UPDATE',
					resourceType: 'grupoContenido',
					resourceId: 1,
					payload: { nombre: 'Renombrado' },
				}),
			);
			expect(store.grupos()[0].nombre).toBe('Renombrado');
		});

		it('should rollback actualizarGrupo to previous nombre on error', () => {
			api.actualizarGrupo.mockReturnValue(of({ mensaje: 'ok' }));
			wal.execute.mockImplementationOnce((config: { onError?: (err: unknown) => void; optimistic?: { apply: () => void; rollback: () => void } }) => {
				config.optimistic?.apply();
				config.optimistic?.rollback();
				config.onError?.(new Error('fail'));
			});

			facade.actualizarGrupo(1, { nombre: 'Fallido' });

			expect(store.grupos()[0].nombre).toBe('Grupo A');
			expect(store.saving()).toBe(false);
		});

		it('should call WAL execute for eliminarGrupo and remove it optimistically', () => {
			facade.eliminarGrupo(1);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'DELETE', resourceType: 'grupoContenido', resourceId: 1 }),
			);
			expect(store.grupos()).toHaveLength(0);
		});

		it('should rollback eliminarGrupo restoring the snapshot on error', () => {
			wal.execute.mockImplementationOnce((config: { onError?: (err: unknown) => void; optimistic?: { apply: () => void; rollback: () => void } }) => {
				config.optimistic?.apply();
				config.optimistic?.rollback();
				config.onError?.(new Error('fail'));
			});

			facade.eliminarGrupo(1);

			expect(store.grupos()).toHaveLength(1);
			expect(store.grupos()[0].id).toBe(1);
		});

		it('should call WAL execute for asignarEstudiantes with correct payload', () => {
			const dto = { estudianteIds: [100] };
			facade.asignarEstudiantes(1, dto);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'UPDATE', resourceType: 'grupoContenido', resourceId: 1, payload: dto }),
			);
		});

		it('should refetch grupos on asignarEstudiantes commit', () => {
			wal.execute.mockImplementationOnce((config: { onCommit?: () => void; optimistic?: { apply: () => void } }) => {
				config.optimistic?.apply();
				config.onCommit?.();
			});

			facade.asignarEstudiantes(1, { estudianteIds: [100] });

			expect(api.getGrupos).toHaveBeenCalledWith(50);
		});

		it('should call WAL execute for removerEstudiante with DELETE on the estudiante endpoint', () => {
			facade.removerEstudiante(1, 100);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'UPDATE', resourceType: 'grupoContenido', method: 'DELETE', resourceId: 1 }),
			);
		});

		it('should call WAL execute for configurarMaxEstudiantes with correct payload', () => {
			facade.configurarMaxEstudiantes(10);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'UPDATE',
					resourceType: 'grupoContenido',
					resourceId: 50,
					payload: { maxEstudiantesPorGrupo: 10 },
				}),
			);
			expect(store.maxEstudiantesPorGrupo()).toBe(10);
		});

		it('should rollback configurarMaxEstudiantes to previous max on error', () => {
			wal.execute.mockImplementationOnce((config: { onError?: (err: unknown) => void; optimistic?: { apply: () => void; rollback: () => void } }) => {
				config.optimistic?.apply();
				config.optimistic?.rollback();
				config.onError?.(new Error('fail'));
			});

			facade.configurarMaxEstudiantes(10);

			expect(store.maxEstudiantesPorGrupo()).toBe(5);
		});

		it('should not configure max estudiantes without contenidoId', () => {
			store.setContenidoId(null);
			facade.configurarMaxEstudiantes(10);

			expect(wal.execute).not.toHaveBeenCalled();
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
