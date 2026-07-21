// * Tests for CursosFacade — validates CRUD orchestration and UI commands.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { CursosFacade } from './cursos.facade';
import { CursosStore } from './cursos.store';
import { CursosService } from './cursos.service';
import { GradosService } from './grados.service';
import { ErrorHandlerService, WalFacadeHelper, WalCrossTabRefetchService } from '@core/services';
import type { DestroyRef } from '@angular/core';
import { Curso, Grado, CursosEstadisticas, CursoCompletitud } from '../models';

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

const mockCompletitud: CursoCompletitud[] = [
	{ cursoId: 1, tieneHorario: true, tieneProfesorAsignado: true, cantidadConflictos: 0, horarios: [] },
	{ cursoId: 2, tieneHorario: false, tieneProfesorAsignado: false, cantidadConflictos: 0, horarios: [] },
];

function createMockApi() {
	return {
		getCursos: vi.fn().mockReturnValue(of(mockCursos)),
		getEstadisticas: vi.fn().mockReturnValue(of(mockStats)),
		crearCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		actualizarCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminarCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		getCompletitud: vi.fn().mockReturnValue(of(mockCompletitud)),
	};
}

function createMockWal() {
	return {
		execute: vi.fn((config: { optimistic?: { apply: () => void } }) => {
			config.optimistic?.apply();
		}),
	};
}

function createMockCrossTabRefetch() {
	const subscribers: { resourceType: string; refetchItems: () => void; refetchStats?: () => void }[] = [];
	return {
		subscribe: vi.fn(
			(opts: {
				resourceType: string;
				refetchItems: () => void;
				refetchStats?: () => void;
				destroyRef: DestroyRef;
			}) => {
				subscribers.push({
					resourceType: opts.resourceType,
					refetchItems: opts.refetchItems,
					refetchStats: opts.refetchStats,
				});
			},
		),
		emitCrossTabCommit: (resourceType: string) => {
			for (const s of subscribers) {
				if (s.resourceType === resourceType) {
					s.refetchItems();
					s.refetchStats?.();
				}
			}
		},
	};
}
// #endregion

// #region Tests
describe('CursosFacade', () => {
	let facade: CursosFacade;
	let store: CursosStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;
	let crossTab: ReturnType<typeof createMockCrossTabRefetch>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();
		crossTab = createMockCrossTabRefetch();

		TestBed.configureTestingModule({
			providers: [
				CursosFacade,
				CursosStore,
				{ provide: CursosService, useValue: api },
				{ provide: GradosService, useValue: { getGrados: vi.fn().mockReturnValue(of(mockGrados)) } },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: WalCrossTabRefetchService, useValue: crossTab },
			],
		});

		facade = TestBed.inject(CursosFacade);
		store = TestBed.inject(CursosStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load cursos, stats, grados, and completitud into store', () => {
			facade.loadAll();

			expect(store.items()).toEqual(mockCursos);
			expect(store.estadisticas()).toEqual(mockStats);
			expect(store.grados()).toEqual(mockGrados);
			expect(store.completitudPorCurso().get(1)).toEqual(mockCompletitud[0]);
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
			facade.openNewDialog();
			store.setFormData({ nombre: 'Nuevo Curso', estado: true });

			facade.saveCurso();

			expect(store.dialogVisible()).toBe(false);
		});

		it('should update item and close dialog on update (optimistic)', () => {
			store.setGrados(mockGrados);
			facade.openEditDialog(mockCursos[0]);
			store.setFormData({ nombre: 'Mat Updated', estado: true });

			facade.saveCurso();

			expect(store.items()[0].nombre).toBe('Mat Updated');
			expect(store.dialogVisible()).toBe(false);
		});

		it('should toggle estado and update stats (optimistic)', () => {
			facade.toggleEstado(mockCursos[0]); // estado true → false

			expect(store.items()[0].estado).toBe(false);
			expect(store.estadisticas()!.cursosActivos).toBe(0);
			expect(store.estadisticas()!.cursosInactivos).toBe(2);
		});

		it('should soft-delete: keep item as inactive, total unchanged, activos→inactivos', () => {
			// Cursos BE hace soft-delete (CUR_Estado = false). El registro persiste.
			// totalCursos no cambia. activos -1, inactivos +1.
			facade.delete(mockCursos[0]); // estado: true (curso 1)

			expect(store.items()).toHaveLength(2); // item NO se quita
			const c1 = store.items().find((c) => c.id === 1);
			expect(c1?.estado).toBe(false); // marcado como inactivo
			expect(store.estadisticas()!.totalCursos).toBe(2); // sin cambio
			expect(store.estadisticas()!.cursosActivos).toBe(0); // 1 → 0
			expect(store.estadisticas()!.cursosInactivos).toBe(2); // 1 → 2
		});

		it('should soft-delete inactive curso as no-op on counters', () => {
			// Si ya estaba inactivo, soft-delete no altera contadores ni list.
			facade.delete(mockCursos[1]); // estado: false (curso 2)

			expect(store.items()).toHaveLength(2);
			expect(store.estadisticas()!.totalCursos).toBe(2);
			expect(store.estadisticas()!.cursosActivos).toBe(1);
			expect(store.estadisticas()!.cursosInactivos).toBe(1);
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
			expect(api.getCursos).toHaveBeenCalled();
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

	// #region Cross-tab refetch (F-S06)
	describe('cross-tab refetch on leader commit', () => {
		it('refetches items when another tab commits an entry of the same resourceType', () => {
			api.getCursos.mockClear();

			crossTab.emitCrossTabCommit('cursos');

			expect(api.getCursos).toHaveBeenCalledTimes(1);
		});

		it('ignores commits of other resourceTypes', () => {
			api.getCursos.mockClear();

			crossTab.emitCrossTabCommit('Salon');
			crossTab.emitCrossTabCommit('Vista');

			expect(api.getCursos).not.toHaveBeenCalled();
		});

		it('does not toggle global loading flag (silent refetch)', () => {
			store.setLoading(false);
			api.getCursos.mockClear();

			crossTab.emitCrossTabCommit('cursos');

			expect(store.loading()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
