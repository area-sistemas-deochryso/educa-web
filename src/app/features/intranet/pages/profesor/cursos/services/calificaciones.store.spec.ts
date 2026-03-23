// * Tests for CalificacionesStore — validates grading state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CalificacionesStore } from './calificaciones.store';

// #endregion

// #region Test fixtures
const mockCalificaciones = [
	{ id: 1, nombre: 'Examen 1', peso: 30, tipo: 'examen', numeroSemana: 1, notas: [{ estudianteId: 1, nota: 16 }] },
	{ id: 2, nombre: 'Tarea 1', peso: 20, tipo: 'tarea', numeroSemana: 1, notas: [] },
	{ id: 3, nombre: 'Examen 2', peso: 30, tipo: 'examen', numeroSemana: 2, notas: [{ estudianteId: 1, nota: 14 }] },
	{ id: 4, nombre: 'Proyecto', peso: 20, tipo: 'proyecto', numeroSemana: 3, notas: [] },
] as never[];

const mockPeriodos = [
	{ id: 1, nombre: 'Periodo 1', orden: 1 },
	{ id: 3, nombre: 'Periodo 3', orden: 3 },
	{ id: 2, nombre: 'Periodo 2', orden: 2 },
] as never[];
// #endregion

// #region Tests
describe('CalificacionesStore', () => {
	let store: CalificacionesStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [CalificacionesStore] });
		store = TestBed.inject(CalificacionesStore);
		store.reset();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.calificaciones()).toEqual([]);
			expect(store.periodos()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.saving()).toBe(false);
		});

		it('should have all dialogs closed', () => {
			expect(store.calificacionDialogVisible()).toBe(false);
			expect(store.calificarDialogVisible()).toBe(false);
			expect(store.periodosDialogVisible()).toBe(false);
			expect(store.selectedCalificacion()).toBeNull();
			expect(store.editingCalificacion()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — calificacionesPorSemana
	describe('calificacionesPorSemana', () => {
		it('should group by week number', () => {
			store.setCalificaciones(mockCalificaciones);
			const grouped = store.calificacionesPorSemana();

			expect(grouped.get(1)).toHaveLength(2);
			expect(grouped.get(2)).toHaveLength(1);
			expect(grouped.get(3)).toHaveLength(1);
		});

		it('should count total evaluaciones', () => {
			store.setCalificaciones(mockCalificaciones);
			expect(store.totalEvaluaciones()).toBe(4);
		});
	});
	// #endregion

	// #region CRUD mutations
	describe('CRUD mutations', () => {
		it('should add calificacion', () => {
			store.setCalificaciones(mockCalificaciones);
			store.addCalificacion({ id: 5, nombre: 'Quiz', peso: 10, tipo: 'quiz', numeroSemana: 1, notas: [] } as never);

			expect(store.calificaciones()).toHaveLength(5);
		});

		it('should remove calificacion', () => {
			store.setCalificaciones(mockCalificaciones);
			store.removeCalificacion(2);

			expect(store.calificaciones()).toHaveLength(3);
			expect(store.calificaciones().find((c: never) => (c as { id: number }).id === 2)).toBeUndefined();
		});

		it('should update calificacion notas', () => {
			store.setCalificaciones(mockCalificaciones);
			const newNotas = [{ estudianteId: 1, nota: 20 }, { estudianteId: 2, nota: 15 }] as never;
			store.updateCalificacionNotas(1, newNotas);

			const cal = store.calificaciones().find((c: never) => (c as { id: number }).id === 1) as { notas: unknown[] };
			expect(cal.notas).toHaveLength(2);
		});

		it('should replace calificacion in-place', () => {
			store.setCalificaciones(mockCalificaciones);
			const updated = { id: 1, nombre: 'Examen 1 (Editado)', peso: 35, tipo: 'examen', numeroSemana: 1, notas: [] } as never;
			store.replaceCalificacion(updated);

			const cal = store.calificaciones()[0] as { nombre: string; peso: number };
			expect(cal.nombre).toBe('Examen 1 (Editado)');
			expect(cal.peso).toBe(35);
		});
	});
	// #endregion

	// #region Periodo mutations
	describe('periodo mutations', () => {
		it('should add periodo sorted by orden', () => {
			store.setPeriodos(mockPeriodos);
			store.addPeriodo({ id: 4, nombre: 'Periodo 1.5', orden: 1.5 } as never);

			const periodos = store.periodos() as { orden: number }[];
			expect(periodos[0].orden).toBe(1);
			expect(periodos[1].orden).toBe(1.5);
			expect(periodos[2].orden).toBe(2);
		});

		it('should remove periodo', () => {
			store.setPeriodos(mockPeriodos);
			store.removePeriodo(2);

			expect(store.periodos()).toHaveLength(2);
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialog management', () => {
		it('should open calificacion dialog for create', () => {
			store.openCalificacionDialog();
			expect(store.calificacionDialogVisible()).toBe(true);
			expect(store.editingCalificacion()).toBeNull();
		});

		it('should open calificacion dialog for edit', () => {
			const editing = { id: 1, nombre: 'Examen' } as never;
			store.openCalificacionDialog(editing);
			expect(store.calificacionDialogVisible()).toBe(true);
			expect(store.editingCalificacion()).toEqual(editing);
		});

		it('should close calificacion dialog and clear editing', () => {
			store.openCalificacionDialog({ id: 1 } as never);
			store.closeCalificacionDialog();
			expect(store.calificacionDialogVisible()).toBe(false);
			expect(store.editingCalificacion()).toBeNull();
		});

		it('should open calificar dialog with calificacion', () => {
			store.setCalificaciones(mockCalificaciones);
			store.openCalificarDialog(mockCalificaciones[0] as never);
			expect(store.calificarDialogVisible()).toBe(true);
			expect(store.selectedCalificacion()).toEqual(mockCalificaciones[0]);
		});

		it('should close calificar dialog and clear state', () => {
			store.openCalificarDialog(mockCalificaciones[0] as never);
			store.setGruposForCalificar([{ id: 1 }] as never[]);

			store.closeCalificarDialog();
			expect(store.calificarDialogVisible()).toBe(false);
			expect(store.selectedCalificacion()).toBeNull();
			expect(store.gruposForCalificar()).toEqual([]);
		});

		it('should manage periodos dialog', () => {
			store.openPeriodosDialog();
			expect(store.periodosDialogVisible()).toBe(true);
			store.closePeriodosDialog();
			expect(store.periodosDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Reset
	describe('reset', () => {
		it('should reset to initial state', () => {
			store.setCalificaciones(mockCalificaciones);
			store.setLoading(true);
			store.openCalificacionDialog();

			store.reset();

			expect(store.calificaciones()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.calificacionDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose state', () => {
			store.setCalificaciones(mockCalificaciones);
			const vm = store.vm();

			expect(vm.calificaciones).toHaveLength(4);
			expect(vm.totalEvaluaciones).toBe(4);
			expect(vm.loading).toBe(false);
		});
	});
	// #endregion
});
// #endregion
