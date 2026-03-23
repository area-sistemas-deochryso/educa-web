// * Tests for EstudianteNotasStore — validates grades state + simulator.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EstudianteNotasStore } from './estudiante-notas.store';
import { EstudianteMisNotasDto } from '../../models';

// #endregion

// #region Test fixtures
const mockCursos = [
	{
		cursoNombre: 'Matemática', salonDescripcion: '1A',
		evaluaciones: [
			{ id: 1, nombre: 'Examen 1', nota: 16, peso: 30 },
			{ id: 2, nombre: 'Examen 2', nota: 14, peso: 30 },
			{ id: 3, nombre: 'Trabajo', nota: null, peso: 40 },
		],
		promedios: { general: 15, semana: 15, periodo: 15 },
	},
	{
		cursoNombre: 'Comunicación', salonDescripcion: '1A',
		evaluaciones: [
			{ id: 10, nombre: 'Oral', nota: 18, peso: 50 },
			{ id: 11, nombre: 'Escrito', nota: 12, peso: 50 },
		],
		promedios: { general: 15, semana: 15, periodo: 15 },
	},
] as unknown as EstudianteMisNotasDto[];
// #endregion

// #region Tests
describe('EstudianteNotasStore', () => {
	let store: EstudianteNotasStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [EstudianteNotasStore] });
		store = TestBed.inject(EstudianteNotasStore);
		store.reset();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.cursos()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
			expect(store.selectedCursoIndex()).toBe(0);
			expect(store.vistaActual()).toBe('semana');
			expect(store.simuladorVisible()).toBe(false);
		});

		it('should have no selected curso', () => {
			expect(store.selectedCurso()).toBeNull();
			expect(store.totalCursos()).toBe(0);
		});
	});
	// #endregion

	// #region Computed — selectedCurso
	describe('selectedCurso', () => {
		it('should return curso at index', () => {
			store.setCursos(mockCursos);
			expect(store.selectedCurso()?.cursoNombre).toBe('Matemática');
		});

		it('should change with index', () => {
			store.setCursos(mockCursos);
			store.setSelectedCursoIndex(1);
			expect(store.selectedCurso()?.cursoNombre).toBe('Comunicación');
		});

		it('should return null for out-of-range index', () => {
			store.setCursos(mockCursos);
			store.setSelectedCursoIndex(99);
			expect(store.selectedCurso()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — cursoOptions
	describe('cursoOptions', () => {
		it('should build options with label and value', () => {
			store.setCursos(mockCursos);
			const options = store.cursoOptions();

			expect(options).toHaveLength(2);
			expect(options[0].label).toBe('Matemática - 1A');
			expect(options[0].value).toBe(0);
			expect(options[1].label).toBe('Comunicación - 1A');
			expect(options[1].value).toBe(1);
		});
	});
	// #endregion

	// #region Simulador
	describe('simulador', () => {
		beforeEach(() => {
			store.setCursos(mockCursos);
		});

		it('should open simulador and init simulaciones', () => {
			store.openSimulador();

			expect(store.simuladorVisible()).toBe(true);
			const sims = store.simulaciones()['Matemática'];
			expect(sims).toHaveLength(3);
			expect(sims[0].calificacionId).toBe(1);
			expect(sims[0].notaOriginal).toBe(16);
			expect(sims[0].notaSimulada).toBe(16);
		});

		it('should not reinit simulaciones on second open', () => {
			store.openSimulador();
			store.updateSimulacion('Matemática', 1, 20);
			store.closeSimulador();
			store.openSimulador();

			const sims = store.simulaciones()['Matemática'];
			expect(sims[0].notaSimulada).toBe(20);
		});

		it('should close simulador', () => {
			store.openSimulador();
			store.closeSimulador();
			expect(store.simuladorVisible()).toBe(false);
		});

		it('should update a single nota simulada', () => {
			store.openSimulador();
			store.updateSimulacion('Matemática', 2, 18);

			const sims = store.simulaciones()['Matemática'];
			expect(sims[1].notaSimulada).toBe(18);
			expect(sims[0].notaSimulada).toBe(16);
		});

		it('should reset simulacion to original', () => {
			store.openSimulador();
			store.updateSimulacion('Matemática', 1, 20);
			store.updateSimulacion('Matemática', 2, 20);

			store.resetSimulacion('Matemática');

			const sims = store.simulaciones()['Matemática'];
			expect(sims[0].notaSimulada).toBe(16);
			expect(sims[1].notaSimulada).toBe(14);
		});

		it('should do nothing for unknown curso on update', () => {
			store.openSimulador();
			store.updateSimulacion('NoExiste', 1, 20);
			expect(store.simulaciones()['NoExiste']).toBeUndefined();
		});
	});
	// #endregion

	// #region Vista
	describe('vista', () => {
		it('should change vista actual', () => {
			store.setVistaActual('periodo');
			expect(store.vistaActual()).toBe('periodo');
		});
	});
	// #endregion

	// #region Reset
	describe('reset', () => {
		it('should reset all state', () => {
			store.setCursos(mockCursos);
			store.setSelectedCursoIndex(1);
			store.openSimulador();

			store.reset();

			expect(store.cursos()).toEqual([]);
			expect(store.selectedCursoIndex()).toBe(0);
			expect(store.simuladorVisible()).toBe(false);
			expect(store.simulaciones()).toEqual({});
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose state', () => {
			store.setCursos(mockCursos);
			const vm = store.vm();

			expect(vm.totalCursos).toBe(2);
			expect(vm.isEmpty).toBe(false);
			expect(vm.cursoOptions).toHaveLength(2);
			expect(vm.selectedCurso?.cursoNombre).toBe('Matemática');
		});
	});
	// #endregion
});
// #endregion
