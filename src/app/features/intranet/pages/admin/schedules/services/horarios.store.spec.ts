// * Tests for SchedulesStore — validates schedule management state (largest store).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SchedulesStore } from './horarios.store';
import { SchedulesFormStore } from './horarios-form.store';
import { SchedulesFilterStore } from './horarios-filter.store';
import { SchedulesOptionsStore } from './horarios-options.store';
import { AuthStore } from '@core/store';
import { StorageService } from '@core/services/storage';

// #endregion

// #region Test fixtures
const mockHorarios = [
	{ id: 1, diaSemana: 1, horaInicio: '08:00', horaFin: '09:30', salonId: 10, cursoId: 20, profesorId: 30, estado: true, salonDescripcion: '1A', cursoNombre: 'Mat', profesorNombreCompleto: 'Prof A' },
	{ id: 2, diaSemana: 1, horaInicio: '10:00', horaFin: '11:30', salonId: 10, cursoId: 21, profesorId: null, estado: true, salonDescripcion: '1A', cursoNombre: 'Com', profesorNombreCompleto: null },
	{ id: 3, diaSemana: 2, horaInicio: '08:00', horaFin: '09:30', salonId: 11, cursoId: 20, profesorId: 30, estado: false, salonDescripcion: '2A', cursoNombre: 'Mat', profesorNombreCompleto: 'Prof A' },
	{ id: 4, diaSemana: 3, horaInicio: '14:00', horaFin: '15:30', salonId: 12, cursoId: 22, profesorId: 31, estado: true, salonDescripcion: '3A', cursoNombre: 'Cie', profesorNombreCompleto: 'Prof B' },
] as never[];

const mockSalones = [
	{ salonId: 10, nombreSalon: '1A', grado: '1ro', seccion: 'A', sede: 'Central', totalEstudiantes: 30, estado: true },
	{ salonId: 11, nombreSalon: '2A', grado: '2do', seccion: 'A', sede: 'Central', totalEstudiantes: 28, estado: true },
	{ salonId: 12, nombreSalon: '3A', grado: '3ro', seccion: 'A', sede: 'Central', totalEstudiantes: 0, estado: false },
] as never[];

const mockProfesores = [
	{ id: 30, nombre: 'Juan', apellidos: 'Pérez', dni: '11111111', estado: true },
	{ id: 31, nombre: 'María', apellidos: 'García', dni: '22222222', estado: true },
	{ id: 32, nombre: 'Pedro', apellidos: 'Inactivo', dni: '33333333', estado: false },
] as never[];

const mockCursos = [
	{ id: 20, nombre: 'Matemática', estado: true, grados: [{ nombre: 'PRIMARIA 1er Grado' }] },
	{ id: 21, nombre: 'Comunicación', estado: true, grados: [{ nombre: 'PRIMARIA 2do Grado' }] },
	{ id: 22, nombre: 'Ciencias', estado: false, grados: [] },
] as never[];

const mockStorageService = {
	getUser: () => null,
	hasUserInfo: () => false,
	getPermisos: vi.fn(),
	setPermisos: vi.fn(),
	clearPermisos: vi.fn(),
};
// #endregion

// #region Tests
describe('SchedulesStore', () => {
	let store: SchedulesStore;
	let formStore: SchedulesFormStore;
	let filterStore: SchedulesFilterStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				SchedulesStore,
				SchedulesFormStore,
				SchedulesFilterStore,
				SchedulesOptionsStore,
				AuthStore,
				{ provide: StorageService, useValue: mockStorageService },
			],
		});
		store = TestBed.inject(SchedulesStore);
		formStore = TestBed.inject(SchedulesFormStore);
		filterStore = TestBed.inject(SchedulesFilterStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty data', () => {
			expect(store.horarios()).toEqual([]);
			expect(store.estadisticas()).toBeNull();
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('should have default form data', () => {
			expect(formStore.formData().diaSemana).toBeNull();
			expect(formStore.formData().horaInicio).toBe('07:00');
			expect(formStore.formData().horaFin).toBe('08:00');
		});

		it('should default to lista view', () => {
			expect(filterStore.vistaActual()).toBe('lista');
		});

		it('should have wizard at step 0', () => {
			expect(formStore.wizardStep()).toBe(0);
		});

		it('should have no filters', () => {
			expect(store.vm().filtroSalonId).toBeNull();
			expect(store.vm().filtroProfesorId).toBeNull();
			expect(store.vm().filtroDiaSemana).toBeNull();
			expect(store.vm().filtroEstadoActivo).toBeNull();
			expect(store.vm().hasFilters).toBe(false);
		});
	});
	// #endregion

	// #region CRUD mutations
	describe('CRUD mutations', () => {
		it('should set horarios', () => {
			store.setHorarios(mockHorarios);
			expect(store.horarios()).toHaveLength(4);
		});

		it('should update horario by id', () => {
			store.setHorarios(mockHorarios);
			store.updateHorario(1, { horaInicio: '09:00' } as never);
			expect((store.horarios()[0] as { horaInicio: string }).horaInicio).toBe('09:00');
		});

		it('should toggle horario estado', () => {
			store.setHorarios(mockHorarios);
			store.toggleHorarioEstado(3);
			expect((store.horarios().find((h: never) => (h as { id: number }).id === 3) as { estado: boolean }).estado).toBe(true);
		});

		it('should remove horario', () => {
			store.setHorarios(mockHorarios);
			store.removeHorario(2);
			expect(store.horarios()).toHaveLength(3);
		});

		it('should add horario at beginning', () => {
			store.setHorarios(mockHorarios);
			const nuevo = { id: 99, estado: true } as never;
			store.addHorario(nuevo);
			expect(store.horarios()).toHaveLength(5);
			expect((store.horarios()[0] as { id: number }).id).toBe(99);
		});
	});
	// #endregion

	// #region Computed — estadísticas derivadas
	describe('estadísticas derivadas', () => {
		it('should compute from horarios', () => {
			store.setHorarios(mockHorarios);

			expect(store.totalHorarios()).toBe(4);
			expect(store.horariosActivos()).toBe(3);
			expect(store.horariosInactivos()).toBe(1);
			expect(store.horariosSinProfesor()).toBe(1);
		});
	});
	// #endregion

	// #region Computed — filtros
	describe('horariosFiltrados', () => {
		beforeEach(() => {
			store.setHorarios(mockHorarios);
		});

		it('should return all without filters', () => {
			expect(filterStore.horariosFiltrados()).toHaveLength(4);
		});

		it('should filter by salonId', () => {
			filterStore.setFiltroSalon(10);
			expect(filterStore.horariosFiltrados()).toHaveLength(2);
		});

		it('should filter by profesorId', () => {
			filterStore.setFiltroProfesor(30);
			expect(filterStore.horariosFiltrados()).toHaveLength(2);
		});

		it('should filter by diaSemana in lista view', () => {
			filterStore.setFiltroDiaSemana(1);
			expect(filterStore.horariosFiltrados()).toHaveLength(2);
		});

		it('should NOT filter by diaSemana in semanal view', () => {
			filterStore.setFiltroDiaSemana(1);
			filterStore.setVistaActual('semanal');
			expect(filterStore.horariosFiltrados()).toHaveLength(4);
		});

		it('should filter by estadoActivo', () => {
			filterStore.setFiltroEstadoActivo(false);
			expect(filterStore.horariosFiltrados()).toHaveLength(1);
		});

		it('should combine filters', () => {
			filterStore.setFiltroSalon(10);
			filterStore.setFiltroEstadoActivo(true);
			expect(filterStore.horariosFiltrados()).toHaveLength(2);
		});

		it('should clear all filters', () => {
			filterStore.setFiltroSalon(10);
			filterStore.setFiltroProfesor(30);
			filterStore.setPaginationData(3, 10, 100);

			filterStore.clearFiltros();

			expect(store.vm().filtroSalonId).toBeNull();
			expect(store.vm().filtroProfesorId).toBeNull();
			expect(store.vm().hasFilters).toBe(false);
			expect(filterStore.page()).toBe(1);
		});
	});
	// #endregion

	// #region Computed — dropdown options
	describe('dropdown options', () => {
		it('should filter inactive salones', () => {
			store.setSalonesDisponibles(mockSalones);
			expect(store.salonesOptions()).toHaveLength(2);
		});

		it('should filter inactive profesores', () => {
			store.setProfesoresDisponibles(mockProfesores);
			const opts = store.profesoresOptions();
			expect(opts).toHaveLength(2);
			expect(opts[0].label).toBe('Pérez Juan');
		});

		it('should filter inactive cursos', () => {
			store.setCursosDisponibles(mockCursos);
			expect(store.cursosOptions()).toHaveLength(2);
		});
	});
	// #endregion

	// #region Computed — form validation
	describe('form validation', () => {
		it('should be invalid with empty form at step 0', () => {
			expect(formStore.formValid()).toBe(false);
		});

		it('should be valid with complete step 0 data', () => {
			formStore.setFormData({
				diaSemana: 1,
				horaInicio: '08:00',
				horaFin: '09:30',
				salonId: 10,
				cursoId: 20,
			});
			expect(formStore.formValid()).toBe(true);
		});

		it('should be invalid when horaInicio >= horaFin', () => {
			formStore.setFormData({
				diaSemana: 1,
				horaInicio: '10:00',
				horaFin: '09:00',
				salonId: 10,
				cursoId: 20,
			});
			expect(formStore.formValid()).toBe(false);
		});

		it('should be valid at step 1 (profesor is optional)', () => {
			formStore.nextStep();
			expect(formStore.wizardStep()).toBe(1);
			expect(formStore.formValid()).toBe(true);
		});

		it('should compute hora errors', () => {
			formStore.setFormData({ horaInicio: '10:00', horaFin: '09:00' });
			expect(formStore.horaInicioError()).toBe('La hora de fin debe ser posterior a la hora de inicio');
			expect(formStore.horaFinError()).toBe('La hora de fin debe ser posterior a la hora de inicio');
		});
	});
	// #endregion

	// #region Wizard
	describe('wizard navigation', () => {
		it('should advance and go back steps', () => {
			expect(formStore.wizardStep()).toBe(0);

			formStore.nextStep();
			expect(formStore.wizardStep()).toBe(1);

			formStore.nextStep();
			expect(formStore.wizardStep()).toBe(2);
			expect(formStore.isLastStep()).toBe(true);

			formStore.nextStep();
			expect(formStore.wizardStep()).toBe(2);

			formStore.prevStep();
			expect(formStore.wizardStep()).toBe(1);

			formStore.prevStep();
			expect(formStore.wizardStep()).toBe(0);

			formStore.prevStep();
			expect(formStore.wizardStep()).toBe(0);
		});

		it('should reset wizard', () => {
			formStore.nextStep();
			formStore.nextStep();
			formStore.resetWizard();
			expect(formStore.wizardStep()).toBe(0);
		});

		it('should compute navigation state', () => {
			expect(formStore.canGoPrevStep()).toBe(false);
			expect(formStore.isCreating()).toBe(true);
			expect(formStore.isEditing()).toBe(false);

			formStore.setEditingId(5);
			expect(formStore.isCreating()).toBe(false);
			expect(formStore.isEditing()).toBe(true);
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialog management', () => {
		it('should open and close main dialog', () => {
			formStore.openDialog();
			expect(formStore.dialogVisible()).toBe(true);

			formStore.closeDialog();
			expect(formStore.dialogVisible()).toBe(false);
			expect(formStore.wizardStep()).toBe(0);
			expect(formStore.editingId()).toBeNull();
		});

		it('should open and close detail drawer', () => {
			formStore.openDetailDrawer();
			expect(formStore.detailDrawerVisible()).toBe(true);

			store.closeDetailDrawer();
			expect(formStore.detailDrawerVisible()).toBe(false);
			expect(store.horarioDetalle()).toBeNull();
		});

		it('should open and close curso dialog', () => {
			formStore.openCursoDialog();
			expect(store.vm().cursoDialogVisible).toBe(true);

			formStore.closeCursoDialog();
			expect(store.vm().cursoDialogVisible).toBe(false);
		});
	});
	// #endregion

	// #region Vista switching
	describe('vista switching', () => {
		it('should switch to semanal and clear dia filter', () => {
			filterStore.setFiltroDiaSemana(1);
			filterStore.setVistaActual('semanal');

			expect(filterStore.vistaActual()).toBe('semanal');
			expect(store.vm().filtroDiaSemana).toBeNull();
		});

		it('should keep dia filter when switching to lista', () => {
			filterStore.setFiltroDiaSemana(1);
			filterStore.setVistaActual('lista');

			expect(store.vm().filtroDiaSemana).toBe(1);
		});

		it('should enable semanal view when salon or profesor is filtered', () => {
			expect(filterStore.vistaSemanalHabilitada()).toBe(false);

			filterStore.setFiltroSalon(10);
			expect(filterStore.vistaSemanalHabilitada()).toBe(true);
		});

		it('should enable dia filter only in lista view', () => {
			expect(filterStore.filtroDiaSemanaHabilitado()).toBe(true);

			filterStore.setVistaActual('semanal');
			expect(filterStore.filtroDiaSemanaHabilitado()).toBe(false);
		});
	});
	// #endregion

	// #region Detalle mutations
	describe('detalle mutations', () => {
		const mockDetalle = {
			id: 1,
			profesorId: 30,
			profesorNombreCompleto: 'Prof A',
			profesorDni: '11111111',
			estudiantes: [
				{ id: 1, nombre: 'Est A' },
				{ id: 2, nombre: 'Est B' },
			],
			cantidadEstudiantes: 2,
		} as never;

		it('should clear profesor from detalle', () => {
			store.setHorarioDetalle(mockDetalle);
			store.clearDetalleProfesor();

			const det = store.horarioDetalle() as { profesorId: number | null };
			expect(det.profesorId).toBeNull();
		});

		it('should remove student from detalle', () => {
			store.setHorarioDetalle(mockDetalle);
			store.removeEstudianteFromDetalle(1);

			const det = store.horarioDetalle() as { estudiantes: unknown[]; cantidadEstudiantes: number };
			expect(det.estudiantes).toHaveLength(1);
			expect(det.cantidadEstudiantes).toBe(1);
		});

		it('should handle null detalle gracefully', () => {
			store.clearDetalleProfesor();
			store.removeEstudianteFromDetalle(1);
			expect(store.horarioDetalle()).toBeNull();
		});
	});
	// #endregion

	// #region Sub-ViewModels
	describe('sub-viewmodels', () => {
		it('should compose full vm', () => {
			store.setHorarios(mockHorarios);
			store.setSalonesDisponibles(mockSalones);
			const vm = store.vm();

			expect(vm.horarios).toHaveLength(4);
			expect(vm.isEmpty).toBe(false);
			expect(vm.salonesOptions).toHaveLength(2);
			expect(vm.vistaActual).toBe('lista');
			expect(vm.wizardStep).toBe(0);
		});
	});
	// #endregion

	// #region Estadísticas incrementales
	describe('incrementarEstadistica', () => {
		it('should increment stat field', () => {
			store.setEstadisticas({ totalHorarios: 10, activos: 8, inactivos: 2 } as never);
			store.incrementarEstadistica('totalHorarios' as never, 1);

			const stats = store.estadisticas() as { totalHorarios: number };
			expect(stats.totalHorarios).toBe(11);
		});

		it('should handle null estadisticas', () => {
			store.incrementarEstadistica('totalHorarios' as never, 1);
			expect(store.estadisticas()).toBeNull();
		});
	});
	// #endregion
});
// #endregion
