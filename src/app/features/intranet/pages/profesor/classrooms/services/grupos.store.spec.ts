// * Tests for GruposStore — validates group management with optimistic mutations.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { GruposStore } from './grupos.store';

// #endregion

// #region Test fixtures
const mockGrupos = [
	{ id: 1, nombre: 'Grupo A', estudiantes: [
		{ id: 10, estudianteId: 100, estudianteNombre: 'Ana López', estudianteDni: '11111111' },
		{ id: 11, estudianteId: 101, estudianteNombre: 'Carlos Ruiz', estudianteDni: '22222222' },
	]},
	{ id: 2, nombre: 'Grupo B', estudiantes: [
		{ id: 20, estudianteId: 200, estudianteNombre: 'Diana Pérez', estudianteDni: '33333333' },
	]},
] as never[];

const mockSinGrupo = [
	{ estudianteId: 300, estudianteNombre: 'Eva García', estudianteDni: '44444444' },
	{ estudianteId: 301, estudianteNombre: 'Fernando Torres', estudianteDni: '55555555' },
] as never[];
// #endregion

// #region Tests
describe('GruposStore', () => {
	let store: GruposStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [GruposStore] });
		store = TestBed.inject(GruposStore);
		store.reset();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.grupos()).toEqual([]);
			expect(store.estudiantesSinGrupo()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.saving()).toBe(false);
			expect(store.noContenido()).toBe(false);
		});
	});
	// #endregion

	// #region Computed
	describe('computed', () => {
		it('should count total grupos', () => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
			expect(store.totalGrupos()).toBe(2);
		});

		it('should count total estudiantes en grupos', () => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
			expect(store.totalEstudiantesEnGrupos()).toBe(3);
		});

		it('should find asignarGrupo by id', () => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
			store.openAsignarDialog(1);
			expect((store.asignarGrupo() as { nombre: string })?.nombre).toBe('Grupo A');
		});

		it('should return null for asignarGrupo when no id', () => {
			expect(store.asignarGrupo()).toBeNull();
		});
	});
	// #endregion

	// #region setGruposData / setNoContenido
	describe('data setup', () => {
		it('should set grupos data and clear loading', () => {
			store.setLoading(true);
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);

			expect(store.grupos()).toHaveLength(2);
			expect(store.estudiantesSinGrupo()).toHaveLength(2);
			expect(store.maxEstudiantesPorGrupo()).toBe(5);
			expect(store.loading()).toBe(false);
			expect(store.noContenido()).toBe(false);
		});

		it('should set no contenido state', () => {
			store.setNoContenido();

			expect(store.grupos()).toEqual([]);
			expect(store.noContenido()).toBe(true);
			expect(store.contenidoId()).toBeNull();
		});
	});
	// #endregion

	// #region CRUD mutations
	describe('CRUD mutations', () => {
		beforeEach(() => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
		});

		it('should add grupo', () => {
			store.addGrupo({ id: 3, nombre: 'Grupo C', estudiantes: [] } as never);
			expect(store.grupos()).toHaveLength(3);
		});

		it('should update grupo nombre', () => {
			store.updateGrupoNombre(1, 'Grupo Alpha');
			expect((store.grupos()[0] as { nombre: string }).nombre).toBe('Grupo Alpha');
		});

		it('should remove grupo and return students to sin-grupo', () => {
			store.removeGrupo(1);

			expect(store.grupos()).toHaveLength(1);
			expect(store.estudiantesSinGrupo()).toHaveLength(4);
			const names = (store.estudiantesSinGrupo() as { estudianteNombre: string }[]).map((e) => e.estudianteNombre);
			expect(names).toContain('Ana López');
			expect(names).toContain('Carlos Ruiz');
		});

		it('should sort sin-grupo students alphabetically after remove', () => {
			store.removeGrupo(1);
			const names = (store.estudiantesSinGrupo() as { estudianteNombre: string }[]).map((e) => e.estudianteNombre);
			expect(names).toEqual([...names].sort());
		});

		it('should do nothing when removing non-existent grupo', () => {
			store.removeGrupo(999);
			expect(store.grupos()).toHaveLength(2);
		});
	});
	// #endregion

	// #region Optimistic student assignment
	describe('assignEstudianteOptimistic', () => {
		beforeEach(() => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
		});

		it('should move student from sin-grupo to grupo', () => {
			store.assignEstudianteOptimistic(300, 1);

			expect(store.estudiantesSinGrupo()).toHaveLength(1);
			const grupo1 = store.grupos()[0] as { estudiantes: { estudianteId: number }[] };
			expect(grupo1.estudiantes).toHaveLength(3);
			expect(grupo1.estudiantes.some((e) => e.estudianteId === 300)).toBe(true);
		});

		it('should do nothing if student not in sin-grupo', () => {
			store.assignEstudianteOptimistic(999, 1);
			expect(store.estudiantesSinGrupo()).toHaveLength(2);
		});
	});
	// #endregion

	// #region Optimistic student removal
	describe('removeEstudianteOptimistic', () => {
		beforeEach(() => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
		});

		it('should move student from grupo to sin-grupo', () => {
			store.removeEstudianteOptimistic(100, 1);

			const grupo1 = store.grupos()[0] as { estudiantes: { estudianteId: number }[] };
			expect(grupo1.estudiantes).toHaveLength(1);
			expect(store.estudiantesSinGrupo()).toHaveLength(3);
		});

		it('should sort sin-grupo after removal', () => {
			store.removeEstudianteOptimistic(100, 1);
			const names = (store.estudiantesSinGrupo() as { estudianteNombre: string }[]).map((e) => e.estudianteNombre);
			expect(names).toEqual([...names].sort());
		});

		it('should do nothing if student not in grupo', () => {
			store.removeEstudianteOptimistic(999, 1);
			const grupo1 = store.grupos()[0] as { estudiantes: unknown[] };
			expect(grupo1.estudiantes).toHaveLength(2);
		});
	});
	// #endregion

	// #region Optimistic student move between groups
	describe('moveEstudianteOptimistic', () => {
		beforeEach(() => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
		});

		it('should move student between groups', () => {
			store.moveEstudianteOptimistic(100, 1, 2);

			const grupo1 = store.grupos()[0] as { estudiantes: unknown[] };
			const grupo2 = store.grupos()[1] as { estudiantes: { estudianteId: number }[] };
			expect(grupo1.estudiantes).toHaveLength(1);
			expect(grupo2.estudiantes).toHaveLength(2);
			expect(grupo2.estudiantes.some((e) => e.estudianteId === 100)).toBe(true);
		});

		it('should do nothing if student not in source grupo', () => {
			store.moveEstudianteOptimistic(999, 1, 2);
			const grupo1 = store.grupos()[0] as { estudiantes: unknown[] };
			expect(grupo1.estudiantes).toHaveLength(2);
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialogs', () => {
		it('should open/close asignar dialog', () => {
			store.openAsignarDialog(1);
			expect(store.asignarDialogVisible()).toBe(true);
			expect(store.asignarGrupoId()).toBe(1);

			store.closeAsignarDialog();
			expect(store.asignarDialogVisible()).toBe(false);
			expect(store.asignarGrupoId()).toBeNull();
		});

		it('should open/close confirm dialog', () => {
			store.openConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(true);
			store.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Reset
	describe('reset', () => {
		it('should reset all state', () => {
			store.setGruposData(mockGrupos as never, mockSinGrupo as never, 5);
			store.openAsignarDialog(1);
			store.reset();

			expect(store.grupos()).toEqual([]);
			expect(store.asignarDialogVisible()).toBe(false);
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
