// * Tests for EstudianteCursosStore — validates student course content state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EstudianteCursosStore } from './estudiante-cursos.store';

// #endregion

// #region Test fixtures
const mockContenido = {
	cursoId: 10,
	cursoNombre: 'Matemática',
	semanas: [
		{ id: 1, numero: 1, titulo: 'Semana 1', archivos: [{ id: 1 }, { id: 2 }], tareas: [{ id: 10 }] },
		{ id: 2, numero: 2, titulo: 'Semana 2', archivos: [{ id: 3 }], tareas: [{ id: 20 }, { id: 21 }] },
	],
};
// #endregion

// #region Tests
describe('EstudianteCursosStore', () => {
	let store: EstudianteCursosStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [EstudianteCursosStore] });
		store = TestBed.inject(EstudianteCursosStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty state', () => {
			expect(store.horarios()).toEqual([]);
			expect(store.contenido()).toBeNull();
			expect(store.loading()).toBe(false);
			expect(store.contentLoading()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('should have empty file caches', () => {
			expect(store.misArchivos()).toEqual({});
			expect(store.loadedSemanas()).toEqual([]);
			expect(store.misTareaArchivos()).toEqual({});
			expect(store.loadedTareas()).toEqual([]);
		});

		it('should have dialogs closed', () => {
			expect(store.contentDialogVisible()).toBe(false);
			expect(store.archivosSummaryDialogVisible()).toBe(false);
			expect(store.tareasSummaryDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — semanas, totalArchivos, totalTareas
	describe('computed derivations', () => {
		it('should derive semanas from contenido', () => {
			store.setContenido(mockContenido as never);
			expect(store.semanas()).toHaveLength(2);
		});

		it('should return empty semanas when no contenido', () => {
			expect(store.semanas()).toEqual([]);
		});

		it('should count total archivos across semanas', () => {
			store.setContenido(mockContenido as never);
			expect(store.totalArchivos()).toBe(3);
		});

		it('should count total tareas across semanas', () => {
			store.setContenido(mockContenido as never);
			expect(store.totalTareas()).toBe(3);
		});
	});
	// #endregion

	// #region Student file mutations
	describe('student file mutations', () => {
		it('should set archivos for a semana', () => {
			const archivos = [{ id: 1, nombre: 'file.pdf' }] as never[];
			store.setMisArchivos(1, archivos);

			expect(store.misArchivos()[1]).toEqual(archivos);
			expect(store.loadedSemanas()).toContain(1);
		});

		it('should not duplicate semana in loadedSemanas', () => {
			store.setMisArchivos(1, []);
			store.setMisArchivos(1, []);

			expect(store.loadedSemanas().filter((id) => id === 1)).toHaveLength(1);
		});

		it('should add archivo to existing semana', () => {
			store.setMisArchivos(1, [{ id: 1 }] as never[]);
			store.addMiArchivo(1, { id: 2 } as never);

			expect(store.misArchivos()[1]).toHaveLength(2);
		});

		it('should add archivo to empty semana', () => {
			store.addMiArchivo(5, { id: 10 } as never);
			expect(store.misArchivos()[5]).toHaveLength(1);
		});

		it('should remove archivo by id', () => {
			store.setMisArchivos(1, [{ id: 1 }, { id: 2 }] as never[]);
			store.removeMiArchivo(1, 1);

			expect(store.misArchivos()[1]).toHaveLength(1);
			expect((store.misArchivos()[1][0] as { id: number }).id).toBe(2);
		});
	});
	// #endregion

	// #region Student task file mutations
	describe('student task file mutations', () => {
		it('should set tarea archivos', () => {
			store.setMisTareaArchivos(10, [{ id: 1 }] as never[]);

			expect(store.misTareaArchivos()[10]).toHaveLength(1);
			expect(store.loadedTareas()).toContain(10);
		});

		it('should add tarea archivo', () => {
			store.setMisTareaArchivos(10, [{ id: 1 }] as never[]);
			store.addMiTareaArchivo(10, { id: 2 } as never);

			expect(store.misTareaArchivos()[10]).toHaveLength(2);
		});

		it('should remove tarea archivo', () => {
			store.setMisTareaArchivos(10, [{ id: 1 }, { id: 2 }] as never[]);
			store.removeMiTareaArchivo(10, 1);

			expect(store.misTareaArchivos()[10]).toHaveLength(1);
		});
	});
	// #endregion

	// #region Dialog commands
	describe('dialog commands', () => {
		it('should open and close content dialog', () => {
			store.openContentDialog();
			expect(store.contentDialogVisible()).toBe(true);

			store.closeContentDialog();
			expect(store.contentDialogVisible()).toBe(false);
		});

		it('should clean up state on closeContentDialog', () => {
			store.setContenido(mockContenido as never);
			store.setMisArchivos(1, [{ id: 1 }] as never[]);
			store.openContentDialog();

			store.closeContentDialog();

			expect(store.contenido()).toBeNull();
			expect(store.misArchivos()).toEqual({});
			expect(store.loadedSemanas()).toEqual([]);
			expect(store.misTareaArchivos()).toEqual({});
			expect(store.loadedTareas()).toEqual([]);
		});

		it('should open/close archivos summary dialog', () => {
			store.openArchivosSummaryDialog();
			expect(store.archivosSummaryDialogVisible()).toBe(true);
			store.closeArchivosSummaryDialog();
			expect(store.archivosSummaryDialogVisible()).toBe(false);
		});

		it('should open/close tareas summary dialog', () => {
			store.openTareasSummaryDialog();
			expect(store.tareasSummaryDialogVisible()).toBe(true);
			store.closeTareasSummaryDialog();
			expect(store.tareasSummaryDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region clearLoadedCaches
	describe('clearLoadedCaches', () => {
		it('should clear file caches without affecting other state', () => {
			store.setContenido(mockContenido as never);
			store.setMisArchivos(1, [{ id: 1 }] as never[]);
			store.setMisTareaArchivos(10, [{ id: 1 }] as never[]);

			store.clearLoadedCaches();

			expect(store.misArchivos()).toEqual({});
			expect(store.loadedSemanas()).toEqual([]);
			expect(store.misTareaArchivos()).toEqual({});
			expect(store.loadedTareas()).toEqual([]);
			expect(store.contenido()).not.toBeNull();
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose state', () => {
			store.setContenido(mockContenido as never);
			const vm = store.vm();

			expect(vm.semanas).toHaveLength(2);
			expect(vm.totalArchivos).toBe(3);
			expect(vm.totalTareas).toBe(3);
			expect(vm.loading).toBe(false);
		});
	});
	// #endregion
});
// #endregion
