// * Behavior tests para SchedulesCrudFacade — create/update/toggle/delete/import con WAL optimistic.
// Verifica la cadena completa: comando → apply → onCommit/rollback → store state + stats.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { SchedulesCrudFacade } from './horarios-crud.facade';
import { SchedulesStore } from './horarios.store';
import { SchedulesApiService } from './horarios-api.service';
import { SchedulesDataFacade } from './horarios-data.facade';
import { SchedulesAssignmentService } from './horarios-assignment.service';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import type {
	HorarioResponseDto,
	HorariosEstadisticas,
	HorarioCreateDto,
	HorarioUpdateDto,
	HorarioAsignarProfesorDto,
} from '../models/horario.interface';
import type { ImportarHorarioItem } from '../helpers/horario-import.config';
// #endregion

// #region Fixtures
const mockStats: HorariosEstadisticas = {
	totalHorarios: 3,
	horariosActivos: 2,
	horariosInactivos: 1,
	horariosConProfesor: 2,
	horariosSinProfesor: 1,
};

function buildHorario(overrides: Partial<HorarioResponseDto> = {}): HorarioResponseDto {
	return {
		id: 1,
		diaSemana: 1,
		diaSemanaDescripcion: 'Lunes',
		horaInicio: '08:00',
		horaFin: '09:00',
		estado: true,
		salonId: 10,
		salonDescripcion: '4to A',
		cursoId: 100,
		cursoNombre: 'Matemática',
		profesorId: 200,
		profesorNombreCompleto: 'Prof Ana',
		cantidadEstudiantes: 20,
		estudiantes: null,
		rowVersion: 'v1',
		...overrides,
	};
}

const mockHorarios: HorarioResponseDto[] = [
	buildHorario({ id: 1, estado: true, profesorId: 200 }),
	buildHorario({ id: 2, estado: true, profesorId: null, profesorNombreCompleto: null }),
	buildHorario({ id: 3, estado: false, profesorId: 200 }),
];
// #endregion

// #region Controllable WAL
interface WalConfig {
	operation: string;
	optimistic?: { apply: () => void; rollback: () => void };
	onCommit: (result?: unknown) => void;
	onError: (err: unknown) => void;
}

function createControllableWal() {
	const configs: WalConfig[] = [];
	const execute = vi.fn((config: WalConfig) => {
		configs.push(config);
		config.optimistic?.apply();
	});
	return {
		execute,
		last: () => configs[configs.length - 1],
		commit: (result?: unknown) => configs[configs.length - 1].onCommit(result),
		fail: (err: unknown) => {
			const cfg = configs[configs.length - 1];
			cfg.optimistic?.rollback();
			cfg.onError(err);
		},
	};
}

function createMockApi() {
	return {
		create: vi.fn().mockReturnValue(of({})),
		update: vi.fn().mockReturnValue(of({})),
		delete: vi.fn().mockReturnValue(of(true)),
		toggleEstado: vi.fn().mockReturnValue(of(true)),
		importarHorarios: vi.fn(),
	};
}
// #endregion

describe('SchedulesCrudFacade', () => {
	let facade: SchedulesCrudFacade;
	let store: SchedulesStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createControllableWal>;
	let dataFacade: { silentRefreshAfterCrud: ReturnType<typeof vi.fn>; loadDetalle: ReturnType<typeof vi.fn> };
	let errorHandler: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
	let assignment: Partial<SchedulesAssignmentService>;

	beforeEach(() => {
		api = createMockApi();
		wal = createControllableWal();
		dataFacade = { silentRefreshAfterCrud: vi.fn(), loadDetalle: vi.fn() };
		errorHandler = { showSuccess: vi.fn(), showError: vi.fn() };
		assignment = {
			asignarProfesor: vi.fn(),
			asignarEstudiantes: vi.fn(),
			asignarTodosEstudiantes: vi.fn(),
			desasignarProfesor: vi.fn(),
			desasignarEstudiante: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				SchedulesCrudFacade,
				{ provide: SchedulesApiService, useValue: api },
				{ provide: SchedulesDataFacade, useValue: dataFacade },
				{ provide: SchedulesAssignmentService, useValue: assignment },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});

		facade = TestBed.inject(SchedulesCrudFacade);
		store = TestBed.inject(SchedulesStore);
		store.setHorarios(mockHorarios);
		store.setEstadisticas({ ...mockStats });
	});

	// #region CREATE
	describe('create', () => {
		it('ejecuta WAL con operation CREATE', () => {
			facade.create({
				diaSemana: 2,
				horaInicio: '10:00',
				horaFin: '11:00',
				salonId: 10,
				cursoId: 100,
			} as Partial<HorarioCreateDto> as HorarioCreateDto);

			expect(wal.execute).toHaveBeenCalledTimes(1);
			expect(wal.last().operation).toBe('CREATE');
		});

		it('onCommit incrementa totalHorarios + horariosActivos y refresca', () => {
			facade.create({ diaSemana: 2, horaInicio: '10:00', horaFin: '11:00', salonId: 10, cursoId: 100 } as Partial<HorarioCreateDto> as HorarioCreateDto);
			const before = store.estadisticas()!;

			wal.commit();

			const after = store.estadisticas()!;
			expect(after.totalHorarios).toBe(before.totalHorarios + 1);
			expect(after.horariosActivos).toBe(before.horariosActivos + 1);
			expect(dataFacade.silentRefreshAfterCrud).toHaveBeenCalled();
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});

		it('onError surface mensaje sin tocar stats', () => {
			facade.create({ diaSemana: 2, horaInicio: '10:00', horaFin: '11:00', salonId: 10, cursoId: 100 } as Partial<HorarioCreateDto> as HorarioCreateDto);
			const before = { ...store.estadisticas()! };

			wal.fail(new Error('boom'));

			expect(store.estadisticas()).toEqual(before);
		});
	});
	// #endregion

	// #region UPDATE
	describe('update', () => {
		it('apply aplica mutación quirúrgica local al store', () => {
			facade.update(1, { diaSemana: 5, horaInicio: '14:00', horaFin: '15:00', salonId: 10, cursoId: 100 } as Partial<HorarioUpdateDto> as HorarioUpdateDto);

			const h = store.horarios().find((x) => x.id === 1)!;
			expect(h.diaSemana).toBe(5);
			expect(h.horaInicio).toBe('14:00');
		});

		it('rollback restaura valores previos', () => {
			const original = store.horarios().find((x) => x.id === 1)!;
			facade.update(1, { diaSemana: 5, horaInicio: '14:00', horaFin: '15:00', salonId: 10, cursoId: 100 } as Partial<HorarioUpdateDto> as HorarioUpdateDto);

			wal.fail(new Error('server'));

			const h = store.horarios().find((x) => x.id === 1)!;
			expect(h.diaSemana).toBe(original.diaSemana);
			expect(h.horaInicio).toBe(original.horaInicio);
		});

		it('onCommit actualiza stats horariosSinProfesor cuando se asigna profesor a horario sin uno', () => {
			// id=2 no tiene profesor (profesorId=null) → stats.horariosSinProfesor=1
			const before = store.estadisticas()!.horariosSinProfesor;
			facade.update(2, { diaSemana: 3, horaInicio: '09:00', horaFin: '10:00', salonId: 10, cursoId: 100 } as Partial<HorarioUpdateDto> as HorarioUpdateDto);

			wal.commit({
				diaSemana: 3,
				diaSemanaDescripcion: 'Miércoles',
				horaInicio: '09:00',
				horaFin: '10:00',
				salonId: 10,
				salonDescripcion: '4to A',
				cursoId: 100,
				cursoNombre: 'Matemática',
				profesorId: 200,
				profesorNombreCompleto: 'Prof Ana',
			});

			expect(store.estadisticas()!.horariosSinProfesor).toBe(before - 1);
			expect(dataFacade.silentRefreshAfterCrud).toHaveBeenCalled();
		});

		it('onCommit incrementa horariosSinProfesor cuando se desasigna profesor', () => {
			// id=1 tiene profesor → al quitarlo stats.horariosSinProfesor sube
			const before = store.estadisticas()!.horariosSinProfesor;
			facade.update(1, { diaSemana: 1, horaInicio: '08:00', horaFin: '09:00', salonId: 10, cursoId: 100 } as Partial<HorarioUpdateDto> as HorarioUpdateDto);

			wal.commit({
				diaSemana: 1,
				diaSemanaDescripcion: 'Lunes',
				horaInicio: '08:00',
				horaFin: '09:00',
				salonId: 10,
				salonDescripcion: '4to A',
				cursoId: 100,
				cursoNombre: 'Matemática',
				profesorId: null,
				profesorNombreCompleto: null,
			});

			expect(store.estadisticas()!.horariosSinProfesor).toBe(before + 1);
		});
	});
	// #endregion

	// #region TOGGLE
	describe('toggleEstado', () => {
		it('apply mueve contadores activos↔inactivos según estado actual', () => {
			// id=1 estaba activo → queda inactivo
			const before = store.estadisticas()!;
			facade.toggleEstado(1, true);

			const after = store.estadisticas()!;
			expect(after.horariosActivos).toBe(before.horariosActivos - 1);
			expect(after.horariosInactivos).toBe(before.horariosInactivos + 1);
		});

		it('rollback revierte contadores al estado anterior', () => {
			const before = { ...store.estadisticas()! };
			facade.toggleEstado(1, true);

			wal.fail(new Error('server'));

			expect(store.estadisticas()).toEqual(before);
		});
	});
	// #endregion

	// #region DELETE
	describe('delete', () => {
		it('apply remueve del store y decrementa total + activos (si estaba activo)', () => {
			// id=1 activo con profesor
			const before = store.estadisticas()!;
			facade.delete(1);

			expect(store.horarios().find((h) => h.id === 1)).toBeUndefined();
			const after = store.estadisticas()!;
			expect(after.totalHorarios).toBe(before.totalHorarios - 1);
			expect(after.horariosActivos).toBe(before.horariosActivos - 1);
		});

		it('apply decrementa horariosSinProfesor cuando el horario no tenía profesor', () => {
			// id=2 sin profesor
			const before = store.estadisticas()!.horariosSinProfesor;
			facade.delete(2);
			expect(store.estadisticas()!.horariosSinProfesor).toBe(before - 1);
		});

		it('rollback re-añade el horario y restaura stats', () => {
			const beforeHorarios = store.horarios();
			const beforeStats = { ...store.estadisticas()! };

			facade.delete(1);
			wal.fail(new Error('server'));

			expect(store.horarios()).toHaveLength(beforeHorarios.length);
			expect(store.horarios().find((h) => h.id === 1)).toBeDefined();
			expect(store.estadisticas()).toEqual(beforeStats);
		});
	});
	// #endregion

	// #region CREATE — INV-AS01/AS02 (assignment mode validation)
	describe('create — assignment mode errors', () => {
		it('INV-AS01: backend rejects tutor pleno violation → rollback + error shown', () => {
			facade.create({
				diaSemana: 1,
				horaInicio: '08:00',
				horaFin: '09:00',
				salonId: 10,
				cursoId: 100,
			} as Partial<HorarioCreateDto> as HorarioCreateDto);

			const beforeStats = { ...store.estadisticas()! };
			const httpErr = { status: 422, error: { errorCode: 'INV_AS01_TUTOR_PLENO', message: 'Profesor no es tutor' } };
			wal.fail(httpErr);

			// Stats unchanged (create rollback is no-op since nothing was added)
			expect(store.estadisticas()!.totalHorarios).toBe(beforeStats.totalHorarios);
			expect(errorHandler.showError).toHaveBeenCalled();
		});

		it('INV-AS02: backend rejects profesor-curso violation → rollback + error shown', () => {
			facade.create({
				diaSemana: 2,
				horaInicio: '10:00',
				horaFin: '11:00',
				salonId: 20,
				cursoId: 200,
			} as Partial<HorarioCreateDto> as HorarioCreateDto);

			const httpErr = { status: 422, error: { errorCode: 'INV_AS02_PROFESOR_CURSO', message: 'Sin asignación' } };
			wal.fail(httpErr);

			expect(errorHandler.showError).toHaveBeenCalled();
		});

		it('create succeeds for tutor pleno salon → stats incremented normally', () => {
			facade.create({
				diaSemana: 1,
				horaInicio: '08:00',
				horaFin: '09:00',
				salonId: 10,
				cursoId: 100,
			} as Partial<HorarioCreateDto> as HorarioCreateDto);

			const before = store.estadisticas()!;
			wal.commit();

			expect(store.estadisticas()!.totalHorarios).toBe(before.totalHorarios + 1);
			expect(store.estadisticas()!.horariosActivos).toBe(before.horariosActivos + 1);
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});

		it('create succeeds for por-curso salon → stats incremented normally', () => {
			facade.create({
				diaSemana: 3,
				horaInicio: '14:00',
				horaFin: '15:00',
				salonId: 30,
				cursoId: 300,
			} as Partial<HorarioCreateDto> as HorarioCreateDto);

			const before = store.estadisticas()!;
			wal.commit();

			expect(store.estadisticas()!.totalHorarios).toBe(before.totalHorarios + 1);
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region importarHorarios
	describe('importarHorarios', () => {
		it('success con creados>0 refresca y muestra mensaje', () => {
			api.importarHorarios.mockReturnValue(of({ creados: 5, errores: [] }));

			facade.importarHorarios([{ diaSemana: 1 } as Partial<ImportarHorarioItem> as ImportarHorarioItem]);

			expect(store.importLoading()).toBe(false);
			expect(store.importResult()).toEqual({ creados: 5, errores: [] });
			expect(dataFacade.silentRefreshAfterCrud).toHaveBeenCalled();
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});

		it('success con creados=0 no refresca ni notifica éxito', () => {
			api.importarHorarios.mockReturnValue(of({ creados: 0, errores: [{ fila: 1, mensaje: 'dup' }] }));

			facade.importarHorarios([{ diaSemana: 1 } as Partial<ImportarHorarioItem> as ImportarHorarioItem]);

			expect(dataFacade.silentRefreshAfterCrud).not.toHaveBeenCalled();
			expect(errorHandler.showSuccess).not.toHaveBeenCalled();
			expect(store.importResult()?.creados).toBe(0);
		});
	});
	// #endregion

	// #region Asignaciones delegadas
	describe('asignaciones', () => {
		it('asignarProfesor delega en SchedulesAssignmentService', () => {
			facade.asignarProfesor({ horarioId: 1, profesorId: 200 } as Partial<HorarioAsignarProfesorDto> as HorarioAsignarProfesorDto);
			expect(assignment.asignarProfesor).toHaveBeenCalled();
		});

		it('desasignarEstudiante delega', () => {
			facade.desasignarEstudiante(1, 50);
			expect(assignment.desasignarEstudiante).toHaveBeenCalledWith(1, 50, expect.any(Object));
		});
	});
	// #endregion
});
