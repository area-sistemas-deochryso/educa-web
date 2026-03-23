// * Tests for GruposFacade — validates group management orchestration with WAL.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { GruposFacade } from './grupos.facade';
import { GruposStore } from './grupos.store';
import { ProfesorStore } from '../../services/profesor.store';
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
	let profesorStore: ProfesorStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();

		TestBed.configureTestingModule({
			providers: [
				GruposFacade,
				GruposStore,
				ProfesorStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
			],
		});

		facade = TestBed.inject(GruposFacade);
		store = TestBed.inject(GruposStore);
		profesorStore = TestBed.inject(ProfesorStore);
		store.reset();
		profesorStore.reset();
	});

	// #region loadGruposForSalonCurso
	describe('loadGruposForSalonCurso', () => {
		it('should load grupos when horario exists', () => {
			profesorStore.setHorarios([
				{ id: 1, salonId: 100, cursoId: 10, cursoNombre: 'Mat', salonDescripcion: '1A' },
			] as never[]);

			facade.loadGruposForSalonCurso(100, 10);

			expect(api.getContenido).toHaveBeenCalledWith(1);
			expect(store.contenidoId()).toBe(50);
			expect(store.grupos()).toHaveLength(1);
		});

		it('should set noContenido when no horario found', () => {
			facade.loadGruposForSalonCurso(999, 999);

			expect(store.noContenido()).toBe(true);
			expect(api.getContenido).not.toHaveBeenCalled();
		});

		it('should set noContenido when contenido is null', () => {
			profesorStore.setHorarios([
				{ id: 1, salonId: 100, cursoId: 10 },
			] as never[]);
			api.getContenido.mockReturnValue(of(null));

			facade.loadGruposForSalonCurso(100, 10);

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
				expect.objectContaining({ operation: 'CREATE', resourceType: 'GrupoContenido' }),
			);
		});

		it('should not create grupo without contenidoId', () => {
			store.setContenidoId(null);
			facade.crearGrupo('Test');

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
