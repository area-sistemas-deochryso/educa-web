// * Tests for CursoContenidoStore — validates course content with surgical mutations.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CursoContenidoStore } from './curso-contenido.store';

// #endregion

// #region Test fixtures
const mockContenido = {
	cursoId: 10,
	cursoNombre: 'Matemática',
	semanas: [
		{
			id: 1, numero: 1, titulo: 'Semana 1',
			archivos: [{ id: 100, nombre: 'archivo1.pdf' }, { id: 101, nombre: 'archivo2.pdf' }],
			tareas: [{ id: 200, titulo: 'Tarea 1', archivos: [{ id: 300, nombre: 'adjunto.pdf' }] }],
		},
		{
			id: 2, numero: 2, titulo: 'Semana 2',
			archivos: [{ id: 102, nombre: 'archivo3.pdf' }],
			tareas: [{ id: 201, titulo: 'Tarea 2', archivos: [] }],
		},
	],
} as never;
// #endregion

// #region Tests
describe('CursoContenidoStore', () => {
	let store: CursoContenidoStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [CursoContenidoStore] });
		store = TestBed.inject(CursoContenidoStore);
		store.reset();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.contenido()).toBeNull();
			expect(store.loading()).toBe(false);
			expect(store.saving()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('should have all dialogs closed', () => {
			expect(store.contentDialogVisible()).toBe(false);
			expect(store.builderDialogVisible()).toBe(false);
			expect(store.semanaEditDialogVisible()).toBe(false);
			expect(store.tareaDialogVisible()).toBe(false);
		});

		it('should have zero counts', () => {
			expect(store.semanas()).toEqual([]);
			expect(store.totalArchivos()).toBe(0);
			expect(store.totalTareas()).toBe(0);
		});
	});
	// #endregion

	// #region Computed
	describe('computed derivations', () => {
		beforeEach(() => {
			store.setContenido(mockContenido);
		});

		it('should derive semanas', () => {
			expect(store.semanas()).toHaveLength(2);
		});

		it('should count total archivos', () => {
			expect(store.totalArchivos()).toBe(3);
		});

		it('should count total tareas', () => {
			expect(store.totalTareas()).toBe(2);
		});
	});
	// #endregion

	// #region Surgical mutations — semanas
	describe('semana mutations', () => {
		beforeEach(() => {
			store.setContenido(mockContenido);
		});

		it('should update semana', () => {
			store.updateSemana(1, { titulo: 'Semana 1 (Editada)' } as never);
			const sem = store.semanas()[0] as { titulo: string };
			expect(sem.titulo).toBe('Semana 1 (Editada)');
		});

		it('should not crash with null contenido', () => {
			store.setContenido(null);
			store.updateSemana(1, { titulo: 'X' } as never);
			expect(store.contenido()).toBeNull();
		});
	});
	// #endregion

	// #region Surgical mutations — archivos
	describe('archivo mutations', () => {
		beforeEach(() => {
			store.setContenido(mockContenido);
		});

		it('should add archivo to semana', () => {
			store.addArchivoToSemana(1, { id: 103, nombre: 'nuevo.pdf' } as never);
			const sem = store.semanas()[0] as { archivos: unknown[] };
			expect(sem.archivos).toHaveLength(3);
		});

		it('should remove archivo from semana', () => {
			store.removeArchivoFromSemana(1, 100);
			const sem = store.semanas()[0] as { archivos: unknown[] };
			expect(sem.archivos).toHaveLength(1);
		});

		it('should update totalArchivos after mutation', () => {
			store.addArchivoToSemana(1, { id: 103, nombre: 'nuevo.pdf' } as never);
			expect(store.totalArchivos()).toBe(4);
		});
	});
	// #endregion

	// #region Surgical mutations — tareas
	describe('tarea mutations', () => {
		beforeEach(() => {
			store.setContenido(mockContenido);
		});

		it('should add tarea to semana', () => {
			store.addTareaToSemana(1, { id: 202, titulo: 'Tarea 3', archivos: [] } as never);
			const sem = store.semanas()[0] as { tareas: unknown[] };
			expect(sem.tareas).toHaveLength(2);
		});

		it('should update tarea in semana', () => {
			store.updateTareaInSemana(1, 200, { titulo: 'Tarea 1 (Editada)' } as never);
			const sem = store.semanas()[0] as { tareas: { titulo: string }[] };
			expect(sem.tareas[0].titulo).toBe('Tarea 1 (Editada)');
		});

		it('should remove tarea from semana', () => {
			store.removeTareaFromSemana(1, 200);
			const sem = store.semanas()[0] as { tareas: unknown[] };
			expect(sem.tareas).toHaveLength(0);
			expect(store.totalTareas()).toBe(1);
		});
	});
	// #endregion

	// #region Surgical mutations — tarea archivos
	describe('tarea archivo mutations', () => {
		beforeEach(() => {
			store.setContenido(mockContenido);
		});

		it('should add archivo to tarea', () => {
			store.addArchivoToTarea(1, 200, { id: 301, nombre: 'extra.pdf' } as never);
			const sem = store.semanas()[0] as { tareas: { archivos: unknown[] }[] };
			expect(sem.tareas[0].archivos).toHaveLength(2);
		});

		it('should remove archivo from tarea', () => {
			store.removeArchivoFromTarea(1, 200, 300);
			const sem = store.semanas()[0] as { tareas: { archivos: unknown[] }[] };
			expect(sem.tareas[0].archivos).toHaveLength(0);
		});
	});
	// #endregion

	// #region Dialog commands
	describe('dialog commands', () => {
		it('should open/close content dialog', () => {
			store.openContentDialog();
			expect(store.contentDialogVisible()).toBe(true);

			store.setContenido(mockContenido);
			store.closeContentDialog();
			expect(store.contentDialogVisible()).toBe(false);
			expect(store.contenido()).toBeNull();
		});

		it('should open/close builder dialog', () => {
			store.openBuilderDialog();
			expect(store.builderDialogVisible()).toBe(true);
			store.closeBuilderDialog();
			expect(store.builderDialogVisible()).toBe(false);
		});

		it('should open/close semana edit dialog', () => {
			const semana = { id: 1, titulo: 'Sem 1' } as never;
			store.openSemanaEditDialog(semana);
			expect(store.semanaEditDialogVisible()).toBe(true);
			expect(store.selectedSemana()).toEqual(semana);

			store.closeSemanaEditDialog();
			expect(store.semanaEditDialogVisible()).toBe(false);
			expect(store.selectedSemana()).toBeNull();
		});

		it('should open/close tarea dialog', () => {
			const tarea = { id: 200, titulo: 'T1' } as never;
			store.openTareaDialog(tarea);
			expect(store.tareaDialogVisible()).toBe(true);
			expect(store.selectedTarea()).toEqual(tarea);

			store.closeTareaDialog();
			expect(store.tareaDialogVisible()).toBe(false);
			expect(store.selectedTarea()).toBeNull();
		});

		it('should open/close task submissions dialog', () => {
			const tarea = { id: 200, titulo: 'T1' } as never;
			store.openTaskSubmissionsDialog(tarea);
			expect(store.taskSubmissionsDialogVisible()).toBe(true);
			expect(store.taskSubmissionsTarea()).toEqual(tarea);

			store.closeTaskSubmissionsDialog();
			expect(store.taskSubmissionsDialogVisible()).toBe(false);
			expect(store.taskSubmissionsTarea()).toBeNull();
		});
	});
	// #endregion

	// #region Sub-ViewModels
	describe('viewmodels', () => {
		it('should compose dataVm', () => {
			store.setContenido(mockContenido);
			const vm = store.dataVm();
			expect(vm.semanas).toHaveLength(2);
			expect(vm.totalArchivos).toBe(3);
		});

		it('should compose full vm', () => {
			store.setContenido(mockContenido);
			const vm = store.vm();
			expect(vm.semanas).toHaveLength(2);
			expect(vm.contentDialogVisible).toBe(false);
		});
	});
	// #endregion

	// #region Reset
	describe('reset', () => {
		it('should reset all state', () => {
			store.setContenido(mockContenido);
			store.openContentDialog();
			store.setLoading(true);

			store.reset();

			expect(store.contenido()).toBeNull();
			expect(store.contentDialogVisible()).toBe(false);
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
