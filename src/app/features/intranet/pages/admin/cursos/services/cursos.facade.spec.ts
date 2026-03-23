// * Tests for CursosFacade — validates CRUD orchestration and UI commands.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { CursosFacade } from './cursos.facade';
import { CursosStore } from './cursos.store';
import { CursosService } from './cursos.service';
import { GradosService } from './grados.service';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { Curso, Grado, CursosEstadisticas } from './cursos.models';

// #endregion

// #region Mocks
const mockCursos: Curso[] = [
	{ id: 1, nombre: 'Matemática', estado: true, grados: [{ id: 10, nombre: 'Inicial - 3 Años' }] },
	{ id: 2, nombre: 'Comunicación', estado: false, grados: [] },
];

const mockGrados: Grado[] = [
	{ id: 10, nombre: 'Inicial - 3 Años' },
	{ id: 20, nombre: 'Primaria - 1er Grado' },
];

const mockStats: CursosEstadisticas = { totalCursos: 2, cursosActivos: 1, cursosInactivos: 1 };

function createMockApi() {
	return {
		getCursosPaginated: vi.fn().mockReturnValue(of({ data: mockCursos, page: 1, pageSize: 10, total: 2 })),
		getEstadisticas: vi.fn().mockReturnValue(of(mockStats)),
		crearCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		actualizarCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminarCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn((config: { optimistic?: { apply: () => void } }) => {
			config.optimistic?.apply();
		}),
	};
}
// #endregion

// #region Tests
describe('CursosFacade', () => {
	let facade: CursosFacade;
	let store: CursosStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();

		TestBed.configureTestingModule({
			providers: [
				CursosFacade,
				CursosStore,
				{ provide: CursosService, useValue: api },
				{ provide: GradosService, useValue: { getGrados: vi.fn().mockReturnValue(of(mockGrados)) } },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
			],
		});

		facade = TestBed.inject(CursosFacade);
		store = TestBed.inject(CursosStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load cursos, stats, and grados into store', () => {
			facade.loadAll();

			expect(store.items()).toEqual(mockCursos);
			expect(store.estadisticas()).toEqual(mockStats);
			expect(store.grados()).toEqual(mockGrados);
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region UI commands
	describe('UI commands', () => {
		it('should open new dialog', () => {
			facade.openNewDialog();
			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(false);
		});

		it('should open edit dialog with curso data', () => {
			store.setGrados(mockGrados);
			facade.openEditDialog(mockCursos[0]);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.formData().nombre).toBe('Matemática');
			expect(store.selectedItem()).toEqual(mockCursos[0]);
		});

		it('should split grado IDs by nivel when editing', () => {
			store.setGrados(mockGrados);
			const cursoWithGrados: Curso = {
				id: 1, nombre: 'Mat', estado: true,
				grados: [{ id: 10, nombre: 'Inicial - 3 Años' }, { id: 20, nombre: 'Primaria - 1er Grado' }],
			};
			facade.openEditDialog(cursoWithGrados);

			expect(store.selectedInicial()).toContain(10);
			expect(store.selectedPrimaria()).toContain(20);
			expect(store.selectedSecundaria()).toEqual([]);
		});

		it('should close dialog', () => {
			facade.openNewDialog();
			facade.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});

		it('should show/close grados dialog', () => {
			facade.showGrados(mockCursos[0]);
			expect(store.gradosDialogVisible()).toBe(true);

			facade.closeGradosDialog();
			expect(store.gradosDialogVisible()).toBe(false);
		});

		it('should manage confirm dialog', () => {
			facade.openConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(true);
			facade.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region saveCurso (create/update dispatch)
	describe('saveCurso', () => {
		it('should call create when not editing', () => {
			facade.openNewDialog();
			store.setFormData({ nombre: 'Nueva', estado: true });

			facade.saveCurso();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'CREATE' }),
			);
		});

		it('should call update when editing', () => {
			store.setGrados(mockGrados);
			facade.openEditDialog(mockCursos[0]);

			facade.saveCurso();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'UPDATE' }),
			);
		});
	});
	// #endregion

	// #region WAL operations — optimistic apply
	describe('WAL optimistic operations', () => {
		beforeEach(() => {
			store.setItems(mockCursos);
			store.setEstadisticas(mockStats);
		});

		it('should close dialog on create (optimistic)', () => {
			store.openDialog();
			facade.create('Nuevo Curso', [10]);

			expect(store.dialogVisible()).toBe(false);
		});

		it('should update item and close dialog on update (optimistic)', () => {
			store.setGrados(mockGrados);
			facade.update(1, 'Mat Updated', true, [10]);

			expect(store.items()[0].nombre).toBe('Mat Updated');
			expect(store.dialogVisible()).toBe(false);
		});

		it('should toggle estado and update stats (optimistic)', () => {
			facade.toggleEstado(mockCursos[0]); // estado true → false

			expect(store.items()[0].estado).toBe(false);
			expect(store.estadisticas()!.cursosActivos).toBe(0);
			expect(store.estadisticas()!.cursosInactivos).toBe(2);
		});

		it('should remove item and update stats (optimistic)', () => {
			facade.delete(mockCursos[0]); // active curso

			expect(store.items()).toHaveLength(1);
			expect(store.estadisticas()!.totalCursos).toBe(1);
			expect(store.estadisticas()!.cursosActivos).toBe(0);
		});

		it('should decrement inactivos on delete inactive curso', () => {
			facade.delete(mockCursos[1]); // inactive curso

			expect(store.estadisticas()!.cursosInactivos).toBe(0);
		});
	});
	// #endregion

	// #region Form commands
	describe('form commands', () => {
		it('should delegate addGrado/removeGrado to store', () => {
			store.setGrados(mockGrados);
			facade.addGrado(10);
			expect(store.selectedInicial()).toContain(10);

			facade.removeGrado(10);
			expect(store.selectedInicial()).not.toContain(10);
		});

		it('should update form field', () => {
			facade.openNewDialog();
			facade.updateFormField('nombre', 'Test');
			expect(store.formData().nombre).toBe('Test');
		});
	});
	// #endregion

	// #region Filter commands
	describe('filter commands', () => {
		it('should set search term, reset page, and trigger refresh', () => {
			store.setPage(3);
			facade.setSearchTerm('math');

			expect(store.searchTerm()).toBe('math');
			expect(store.page()).toBe(1);
			expect(api.getCursosPaginated).toHaveBeenCalled();
		});

		it('should clear all filters', () => {
			store.setSearchTerm('test');
			store.setFilterEstado(true);
			store.setFilterNivel('Primaria');

			facade.clearFilters();

			expect(store.searchTerm()).toBe('');
			expect(store.filterEstado()).toBeNull();
			expect(store.filterNivel()).toBeNull();
		});
	});
	// #endregion
});
// #endregion
