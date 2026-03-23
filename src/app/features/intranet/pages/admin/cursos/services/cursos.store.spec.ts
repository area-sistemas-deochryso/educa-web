// * Tests for CursosStore — validates curso-specific state including grados management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CursosStore } from './cursos.store';
import { Curso, Grado } from './cursos.models';

// #endregion

// #region Test fixtures
const mockCursos: Curso[] = [
	{ id: 1, nombre: 'Matemática', estado: true, grados: [] },
	{ id: 2, nombre: 'Comunicación', estado: true, grados: [] },
	{ id: 3, nombre: 'Arte', estado: false, grados: [] },
];

const mockGrados: Grado[] = [
	{ id: 10, nombre: 'Inicial - 3 Años' },
	{ id: 11, nombre: 'Inicial - 4 Años' },
	{ id: 20, nombre: 'Primaria - 1er Grado' },
	{ id: 21, nombre: 'Primaria - 2do Grado' },
	{ id: 30, nombre: 'Secundaria - 1er Año' },
	{ id: 31, nombre: 'Secundaria - 2do Año' },
];

const cursoConGrados: Curso = {
	id: 5, nombre: 'Ciencias', estado: true,
	grados: [
		{ id: 20, nombre: 'Primaria - 1er Grado' },
		{ id: 30, nombre: 'Secundaria - 1er Año' },
	],
};
// #endregion

// #region Tests
describe('CursosStore', () => {
	let store: CursosStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [CursosStore],
		});
		store = TestBed.inject(CursosStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have default form data', () => {
			expect(store.formData()).toEqual({ nombre: '', estado: true });
		});

		it('should have default estadisticas', () => {
			expect(store.estadisticas()).toEqual({
				totalCursos: 0, cursosActivos: 0, cursosInactivos: 0,
			});
		});

		it('should have null filter nivel', () => {
			expect(store.filterNivel()).toBeNull();
		});

		it('should have empty grados', () => {
			expect(store.grados()).toEqual([]);
			expect(store.gradosInicial()).toEqual([]);
			expect(store.gradosPrimaria()).toEqual([]);
			expect(store.gradosSecundaria()).toEqual([]);
		});
	});
	// #endregion

	// #region Filter nivel
	describe('filterNivel', () => {
		it('should set filter nivel', () => {
			store.setFilterNivel('Primaria');
			expect(store.filterNivel()).toBe('Primaria');
		});

		it('should clear on clearFiltros', () => {
			store.setFilterNivel('Primaria');
			store.clearFiltros();
			expect(store.filterNivel()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — isFormValid
	describe('isFormValid', () => {
		it('should be invalid with empty nombre', () => {
			expect(store.isFormValid()).toBe(false);
		});

		it('should be valid with non-empty nombre', () => {
			store.setFormData({ nombre: 'Matemática', estado: true });
			expect(store.isFormValid()).toBe(true);
		});

		it('should be invalid with whitespace-only nombre', () => {
			store.setFormData({ nombre: '   ', estado: true });
			expect(store.isFormValid()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — grados por nivel
	describe('grados por nivel', () => {
		beforeEach(() => {
			store.setGrados(mockGrados);
		});

		it('should separate grados by nivel', () => {
			expect(store.gradosInicial()).toHaveLength(2);
			expect(store.gradosPrimaria()).toHaveLength(2);
			expect(store.gradosSecundaria()).toHaveLength(2);
		});

		it('should remove nivel prefix from names', () => {
			const inicial = store.gradosInicial();
			expect(inicial[0].nombre).toBe('- 3 Años');
			expect(inicial[1].nombre).toBe('- 4 Años');
		});

		it('should preserve grado ids', () => {
			const primaria = store.gradosPrimaria();
			expect(primaria[0].id).toBe(20);
			expect(primaria[1].id).toBe(21);
		});
	});
	// #endregion

	// #region Grado selection
	describe('grado selection', () => {
		beforeEach(() => {
			store.setGrados(mockGrados);
		});

		it('should set grade selections', () => {
			store.setGradeSelections([10], [20], [30]);

			expect(store.selectedInicial()).toEqual([10]);
			expect(store.selectedPrimaria()).toEqual([20]);
			expect(store.selectedSecundaria()).toEqual([30]);
		});

		it('should compute allGradosIds', () => {
			store.setGradeSelections([10], [20, 21], [30]);
			expect(store.allGradosIds()).toEqual([10, 20, 21, 30]);
		});

		it('should compute selected grados per nivel', () => {
			store.setGradeSelections([10], [20], []);

			expect(store.selectedGradosInicial()).toHaveLength(1);
			expect(store.selectedGradosInicial()[0].id).toBe(10);
			expect(store.selectedGradosPrimaria()).toHaveLength(1);
			expect(store.selectedGradosSecundaria()).toHaveLength(0);
		});

		it('should compute available grados per nivel', () => {
			store.setGradeSelections([10], [], []);

			expect(store.availableInicial()).toHaveLength(1);
			expect(store.availableInicial()[0].id).toBe(11);
			expect(store.availablePrimaria()).toHaveLength(2);
		});

		it('should compute selectedGradosFull with original grado objects', () => {
			store.setGradeSelections([10], [20], []);
			const full = store.selectedGradosFull();

			expect(full).toHaveLength(2);
			expect(full[0].nombre).toBe('Inicial - 3 Años');
			expect(full[1].nombre).toBe('Primaria - 1er Grado');
		});
	});
	// #endregion

	// #region addGrado / removeGrado
	describe('addGrado / removeGrado', () => {
		beforeEach(() => {
			store.setGrados(mockGrados);
		});

		it('should add grado to correct nivel', () => {
			store.addGrado(10);
			expect(store.selectedInicial()).toContain(10);
			expect(store.selectedPrimaria()).not.toContain(10);

			store.addGrado(20);
			expect(store.selectedPrimaria()).toContain(20);

			store.addGrado(30);
			expect(store.selectedSecundaria()).toContain(30);
		});

		it('should remove grado from correct nivel', () => {
			store.setGradeSelections([10, 11], [20], [30]);

			store.removeGrado(10);
			expect(store.selectedInicial()).toEqual([11]);

			store.removeGrado(20);
			expect(store.selectedPrimaria()).toEqual([]);

			store.removeGrado(30);
			expect(store.selectedSecundaria()).toEqual([]);
		});
	});
	// #endregion

	// #region Grados dialog
	describe('grados dialog', () => {
		it('should open with selected curso', () => {
			store.openGradosDialog(cursoConGrados);

			expect(store.gradosDialogVisible()).toBe(true);
			expect(store.selectedCursoForGrados()).toEqual(cursoConGrados);
		});

		it('should close and clear selected curso', () => {
			store.openGradosDialog(cursoConGrados);
			store.closeGradosDialog();

			expect(store.gradosDialogVisible()).toBe(false);
			expect(store.selectedCursoForGrados()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — cursoGradosNiveles (view dialog)
	describe('cursoGradosNiveles', () => {
		it('should return empty when no curso selected', () => {
			expect(store.cursoGradosNiveles()).toEqual([]);
		});

		it('should group curso grados by nivel (only non-empty)', () => {
			store.openGradosDialog(cursoConGrados);
			const niveles = store.cursoGradosNiveles();

			expect(niveles).toHaveLength(2);
			expect(niveles[0].title).toBe('Primaria');
			expect(niveles[0].grados).toHaveLength(1);
			expect(niveles[1].title).toBe('Secundaria');
			expect(niveles[1].grados).toHaveLength(1);
		});
	});
	// #endregion

	// #region Computed — niveles config (edit dialog)
	describe('niveles config', () => {
		it('should return 3 nivel configs', () => {
			store.setGrados(mockGrados);
			const niveles = store.niveles();

			expect(niveles).toHaveLength(3);
			expect(niveles[0].key).toBe('inicial');
			expect(niveles[1].key).toBe('primaria');
			expect(niveles[2].key).toBe('secundaria');
		});

		it('should include correct grado data per nivel', () => {
			store.setGrados(mockGrados);
			store.setGradeSelections([10], [], []);

			const niveles = store.niveles();

			expect(niveles[0].allGrados).toHaveLength(2);
			expect(niveles[0].selectedGrados).toHaveLength(1);
			expect(niveles[0].availableGrados).toHaveLength(1);
		});
	});
	// #endregion

	// #region Mutaciones — toggleCursoEstado
	describe('toggleCursoEstado', () => {
		it('should toggle curso estado', () => {
			store.setItems(mockCursos);
			store.toggleCursoEstado(1);
			expect(store.items().find((c) => c.id === 1)?.estado).toBe(false);
		});

		it('should do nothing for non-existent id', () => {
			store.setItems(mockCursos);
			store.toggleCursoEstado(999);
			expect(store.items()).toEqual(mockCursos);
		});
	});
	// #endregion

	// #region closeDialog clears grade selections
	describe('closeDialog', () => {
		it('should clear grade selections on close', () => {
			store.setGrados(mockGrados);
			store.setGradeSelections([10], [20], [30]);
			store.openDialog();

			store.closeDialog();

			expect(store.selectedInicial()).toEqual([]);
			expect(store.selectedPrimaria()).toEqual([]);
			expect(store.selectedSecundaria()).toEqual([]);
		});
	});
	// #endregion

	// #region Sub-ViewModels
	describe('sub-viewmodels', () => {
		it('should compose dataVm', () => {
			store.setItems(mockCursos);
			const vm = store.dataVm();
			expect(vm.cursos).toHaveLength(3);
		});

		it('should compose uiVm', () => {
			store.openDialog();
			const vm = store.uiVm();
			expect(vm.dialogVisible).toBe(true);
		});

		it('should compose formVm', () => {
			store.setFormData({ nombre: 'Test', estado: true });
			const vm = store.formVm();
			expect(vm.formData.nombre).toBe('Test');
			expect(vm.isFormValid).toBe(true);
		});

		it('should compose full vm from sub-vms', () => {
			store.setItems(mockCursos);
			const vm = store.vm();
			expect(vm.cursos).toHaveLength(3);
			expect(vm.dialogVisible).toBe(false);
			expect(vm.isFormValid).toBe(false);
		});
	});
	// #endregion
});
// #endregion
