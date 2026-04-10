// * Tests for ClassroomsAdminStore — validates salon management state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ClassroomsAdminStore } from './salones-admin.store';

// #endregion

// #region Test fixtures
const mockSalones = [
	{ id: 1, nombre: 'Aula 3A', gradoNombre: 'Inicial 3 Años', gradoOrden: 1, totalEstudiantes: 25, aprobados: 20, desaprobados: 3, pendientes: 2, tutor: 'Prof. Ana' },
	{ id: 2, nombre: 'Aula 4A', gradoNombre: 'Inicial 4 Años', gradoOrden: 2, totalEstudiantes: 28, aprobados: 22, desaprobados: 4, pendientes: 2, tutor: 'Prof. Luis' },
	{ id: 3, nombre: 'Aula 1A', gradoNombre: '1er Grado', gradoOrden: 4, totalEstudiantes: 30, aprobados: 25, desaprobados: 3, pendientes: 2, tutor: 'Prof. Carmen' },
	{ id: 4, nombre: 'Aula 1S', gradoNombre: '1er Año', gradoOrden: 10, totalEstudiantes: 35, aprobados: 28, desaprobados: 5, pendientes: 2, tutor: 'Prof. Rosa' },
];

const mockPeriodos = [
	{ id: 1, nombre: 'Primer Semestre', nivel: 'Inicial' as const, anio: 2026, orden: 1, fechaInicio: '2026-03-01', fechaFin: '2026-07-15', estadoCierre: 'ABIERTO' },
	{ id: 2, nombre: 'Primer Semestre', nivel: 'Primaria' as const, anio: 2026, orden: 1, fechaInicio: '2026-03-01', fechaFin: '2026-07-15', estadoCierre: 'CERRADO' },
];

const mockConfiguraciones = [
	{ id: 1, nivel: 'Inicial' as const, tipoCalificacion: 'LITERAL', notaMinAprobatoria: null, anio: 2026, literales: [] },
	{ id: 2, nivel: 'Primaria' as const, tipoCalificacion: 'VIGESIMAL', notaMinAprobatoria: 11, anio: 2026, literales: [] },
];
// #endregion

// #region Tests
describe('ClassroomsAdminStore', () => {
	let store: ClassroomsAdminStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ClassroomsAdminStore],
		});
		store = TestBed.inject(ClassroomsAdminStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty data', () => {
			expect(store.salones()).toEqual([]);
			expect(store.periodos()).toEqual([]);
			expect(store.configuraciones()).toEqual([]);
		});

		it('should default to Inicial nivel', () => {
			expect(store.selectedNivel()).toBe('Inicial');
		});

		it('should default to current year', () => {
			expect(store.filtroAnio()).toBe(new Date().getFullYear());
		});

		it('should have all dialogs closed', () => {
			expect(store.configDialogVisible()).toBe(false);
			expect(store.cerrarPeriodoDialogVisible()).toBe(false);
			expect(store.salonDialogVisible()).toBe(false);
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — filtrado por nivel
	describe('salonesFiltrados', () => {
		beforeEach(() => {
			store.setSalones(mockSalones as never[]);
		});

		it('should filter Inicial (gradoOrden 1-3)', () => {
			store.setSelectedNivel('Inicial');
			expect(store.salonesFiltrados()).toHaveLength(2);
		});

		it('should filter Primaria (gradoOrden 4-9)', () => {
			store.setSelectedNivel('Primaria');
			expect(store.salonesFiltrados()).toHaveLength(1);
			expect(store.salonesFiltrados()[0].id).toBe(3);
		});

		it('should filter Secundaria (gradoOrden >= 10)', () => {
			store.setSelectedNivel('Secundaria');
			expect(store.salonesFiltrados()).toHaveLength(1);
			expect(store.salonesFiltrados()[0].id).toBe(4);
		});
	});
	// #endregion

	// #region Computed — estadísticas
	describe('estadisticas', () => {
		it('should compute from filtered salones', () => {
			store.setSalones(mockSalones as never[]);
			store.setSelectedNivel('Inicial');

			const stats = store.estadisticas();
			expect(stats.totalSalones).toBe(2);
			expect(stats.totalEstudiantes).toBe(53);
			expect(stats.totalAprobados).toBe(42);
			expect(stats.totalDesaprobados).toBe(7);
			expect(stats.totalPendientes).toBe(4);
		});
	});
	// #endregion

	// #region Computed — periodoActual / configActual
	describe('periodoActual and configActual', () => {
		beforeEach(() => {
			store.setPeriodos(mockPeriodos as never[]);
			store.setConfiguraciones(mockConfiguraciones as never[]);
			store.setFiltroAnio(2026);
		});

		it('should find periodo for selected nivel and year', () => {
			store.setSelectedNivel('Inicial');
			expect(store.periodoActual()?.nombre).toBe('Primer Semestre');
			expect(store.periodoActual()?.estadoCierre).toBe('ABIERTO');
		});

		it('should find config for selected nivel and year', () => {
			store.setSelectedNivel('Primaria');
			expect(store.configActual()?.tipoCalificacion).toBe('VIGESIMAL');
		});

		it('should return null when no match', () => {
			store.setSelectedNivel('Secundaria');
			expect(store.periodoActual()).toBeNull();
			expect(store.configActual()).toBeNull();
		});

		it('should detect closed periodo', () => {
			store.setSelectedNivel('Primaria');
			expect(store.periodoCerrado()).toBe(true);

			store.setSelectedNivel('Inicial');
			expect(store.periodoCerrado()).toBe(false);
		});
	});
	// #endregion

	// #region Computed — selectedSalon
	describe('selectedSalon', () => {
		it('should return salon by id', () => {
			store.setSalones(mockSalones as never[]);
			store.setSelectedSalonId(3);
			expect(store.selectedSalon()?.nombre).toBe('Aula 1A');
		});

		it('should return null when no id selected', () => {
			store.setSalones(mockSalones as never[]);
			expect(store.selectedSalon()).toBeNull();
		});

		it('should return null for non-existent id', () => {
			store.setSalones(mockSalones as never[]);
			store.setSelectedSalonId(999);
			expect(store.selectedSalon()).toBeNull();
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialog management', () => {
		it('should open salon dialog with id', () => {
			store.openSalonDialog(3);
			expect(store.salonDialogVisible()).toBe(true);
			expect(store.selectedSalonId()).toBe(3);
		});

		it('should close salon dialog and clean up', () => {
			store.openSalonDialog(3);
			store.closeSalonDialog();

			expect(store.salonDialogVisible()).toBe(false);
			expect(store.selectedSalonId()).toBeNull();
			expect(store.aprobaciones()).toEqual([]);
			expect(store.salonHorarios()).toEqual([]);
			expect(store.salonAsistencia()).toEqual([]);
			expect(store.salonNotas()).toBeNull();
		});

		it('should manage config dialog', () => {
			store.openConfigDialog();
			expect(store.configDialogVisible()).toBe(true);
			store.closeConfigDialog();
			expect(store.configDialogVisible()).toBe(false);
		});

		it('should manage cerrar periodo dialog', () => {
			store.openCerrarPeriodoDialog();
			expect(store.cerrarPeriodoDialogVisible()).toBe(true);
			store.closeCerrarPeriodoDialog();
			expect(store.cerrarPeriodoDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Mutación quirúrgica — aprobaciones
	describe('updateAprobacion', () => {
		it('should update specific student approval', () => {
			const aprobaciones = [
				{ estudianteId: 1, nombre: 'Ana', estado: 'P' as const },
				{ estudianteId: 2, nombre: 'Luis', estado: 'P' as const },
			];
			store.setAprobaciones(aprobaciones as never[]);

			store.updateAprobacion(1, { estado: 'A' as never });

			const updated = store.aprobaciones() as unknown as { estudianteId: number; estado: string }[];
			expect(updated.find((a) => a.estudianteId === 1)?.estado).toBe('A');
			expect(updated.find((a) => a.estudianteId === 2)?.estado).toBe('P');
		});
	});
	// #endregion

	// #region Sub-ViewModels
	describe('viewmodels', () => {
		it('should compose full vm', () => {
			store.setSalones(mockSalones as never[]);
			store.setSelectedNivel('Inicial');

			const vm = store.vm();
			expect(vm.salones).toHaveLength(2);
			expect(vm.loading).toBe(false);
			expect(vm.selectedNivel).toBe('Inicial');
			expect(vm.estadisticas.totalSalones).toBe(2);
		});
	});
	// #endregion
});
// #endregion
