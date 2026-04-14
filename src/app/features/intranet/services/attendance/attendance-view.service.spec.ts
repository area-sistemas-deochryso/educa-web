// * Tests para AttendanceViewController — flujo crítico asistencia director/profesor.
// Cubre: cambio de vista día/mes, selección estudiante, cambio de mes, reload, SignalR refresh.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';

import { AttendanceViewController } from './attendance-view.service';
import { AttendanceDataService } from './attendance-data.service';
import { AttendancePdfService } from './attendance-pdf.service';
import { AttendanceStatsService } from './attendance-stats.service';
import { AttendanceSignalRService } from '@core/services';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { AttendanceViewConfig, SelectorContext } from './attendance-view.models';
import { VIEW_MODE } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';
// #endregion

// #region Helpers / mocks
const emptyTable = {
	title: 'Test',
	selectedMonth: 4,
	selectedYear: 2026,
	weeks: [],
	counts: { T: 0, A: 0, F: 0, N: 0, '-': 0, X: 0 },
	columnTotals: [],
	grandTotal: '0/0',
};

function buildProcesadoTables(mes: number, anio: number) {
	return {
		ingresos: { ...emptyTable, title: 'Ingresos', selectedMonth: mes, selectedYear: anio },
		salidas: { ...emptyTable, title: 'Salidas', selectedMonth: mes, selectedYear: anio },
	};
}

function buildEstudiante(id: number, nombre = 'Alumno'): any {
	return {
		estudianteId: id,
		dni: `0000000${id}`,
		nombreCompleto: nombre,
		grado: '4to',
		seccion: 'A',
		asistencias: [],
	};
}

function setup(configOverrides: Partial<AttendanceViewConfig> = {}) {
	const asistenciaRegistrada$ = new Subject<unknown>();
	const ctx: SelectorContext = { grado: '4to', gradoCodigo: 'PRI4', seccion: 'A' };

	const config: AttendanceViewConfig = {
		loadEstudiantes: vi.fn().mockReturnValue(of([buildEstudiante(1, 'Ana'), buildEstudiante(2, 'Beto')])),
		loadDia: vi.fn().mockReturnValue(of({ estudiantes: [buildEstudiante(1, 'Ana')], estadisticas: { total: 1 } })),
		getSelectorContext: vi.fn().mockReturnValue(ctx),
		onMonthChange: vi.fn(),
		getStoredEstudianteId: vi.fn().mockReturnValue(null),
		setStoredEstudianteId: vi.fn(),
		...configOverrides,
	};

	const dataServiceMock: Partial<AttendanceDataService> = {
		createEmptyTable: vi.fn().mockReturnValue(emptyTable),
		processAsistencias: vi
			.fn()
			.mockImplementation((_asistencias, mes: number, anio: number) => buildProcesadoTables(mes, anio)),
	};

	const pdfMock: Partial<AttendancePdfService> = {
		init: vi.fn(),
	};

	const statsMock: Partial<AttendanceStatsService> = {
		monthSubMode: vi.fn().mockReturnValue('mes') as any,
		periodoInicio: vi.fn().mockReturnValue(1) as any,
		periodoFin: vi.fn().mockReturnValue(4) as any,
		monthSubModeOptions: [] as any,
		periodoYear: vi.fn().mockReturnValue(2026) as any,
		maxPeriodoMonth: vi.fn().mockReturnValue(12) as any,
		mesOptionsInicio: vi.fn().mockReturnValue([]) as any,
		mesOptionsFin: vi.fn().mockReturnValue([]) as any,
		isPeriodoValid: vi.fn().mockReturnValue(true) as any,
		pdfLabel: vi.fn().mockReturnValue('abril') as any,
		estadisticasDia: vi.fn().mockReturnValue({}) as any,
		setMonthSubMode: vi.fn(),
		setPeriodoInicio: vi.fn(),
		setPeriodoFin: vi.fn(),
		setSelectedYear: vi.fn(),
		setEstadisticasDia: vi.fn(),
	};

	const signalRMock: Partial<AttendanceSignalRService> = {
		connect: vi.fn().mockResolvedValue(undefined),
		asistenciaRegistrada$: asistenciaRegistrada$.asObservable(),
	};

	const swMock: Partial<SwService> = {
		invalidateCacheByPattern: vi.fn().mockResolvedValue(0),
	};

	TestBed.configureTestingModule({
		providers: [
			AttendanceViewController,
			{ provide: AttendanceDataService, useValue: dataServiceMock },
			{ provide: AttendancePdfService, useValue: pdfMock },
			{ provide: AttendanceStatsService, useValue: statsMock },
			{ provide: AttendanceSignalRService, useValue: signalRMock },
			{ provide: SwService, useValue: swMock },
		],
	});

	const controller = TestBed.inject(AttendanceViewController);
	controller.init(config);

	return { controller, config, ctx, dataServiceMock, statsMock, signalRMock, swMock, asistenciaRegistrada$ };
}
// #endregion

// #region Tests
describe('AttendanceViewController', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// #region init
	describe('init()', () => {
		it('inicializa pdf con el getter de contexto y setup SignalR.connect', () => {
			const { controller, signalRMock } = setup();
			expect((controller.pdf as any).init).toHaveBeenCalledTimes(1);
			expect(signalRMock.connect).toHaveBeenCalled();
		});

		it('empieza en viewMode=Día', () => {
			const { controller } = setup();
			expect(controller.viewMode()).toBe(VIEW_MODE.Dia);
		});
	});
	// #endregion

	// #region setViewMode
	describe('setViewMode', () => {
		it('cambiar a Mes carga estudiantes', () => {
			const { controller, config } = setup();
			controller.setViewMode(VIEW_MODE.Mes);
			expect(controller.viewMode()).toBe(VIEW_MODE.Mes);
			expect(config.loadEstudiantes).toHaveBeenCalled();
			expect(controller.estudiantes()).toHaveLength(2);
		});

		it('cambiar a Día carga asistencia del día', () => {
			const { controller, config } = setup();
			controller.setViewMode(VIEW_MODE.Mes);
			(config.loadEstudiantes as any).mockClear();

			controller.setViewMode(VIEW_MODE.Dia);
			expect(controller.viewMode()).toBe(VIEW_MODE.Dia);
			expect(config.loadDia).toHaveBeenCalled();
		});

		it('no dispara carga si el modo no cambió', () => {
			const { controller, config } = setup();
			(config.loadDia as any).mockClear();
			controller.setViewMode(VIEW_MODE.Dia);
			expect(config.loadDia).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region loadEstudiantes — restauración y selección
	describe('loadEstudiantes', () => {
		it('restaura estudiante desde storage si existe en la lista', () => {
			const { controller, config } = setup({
				getStoredEstudianteId: vi.fn().mockReturnValue(2),
			});
			controller.loadEstudiantes();
			expect(controller.selectedEstudianteId()).toBe(2);
		});

		it('selecciona el primero si storage no coincide', () => {
			const { controller } = setup({
				getStoredEstudianteId: vi.fn().mockReturnValue(999),
			});
			controller.loadEstudiantes();
			expect(controller.selectedEstudianteId()).toBe(1);
		});

		it('no llama API si no hay contexto (selector sin selección)', () => {
			const { controller, config } = setup({
				getSelectorContext: vi.fn().mockReturnValue(null),
			});
			controller.loadEstudiantes();
			expect(config.loadEstudiantes).not.toHaveBeenCalled();
			expect(controller.loading()).toBe(false);
		});

		it('procesa asistencias tras cargar y setea tablas ingresos+salidas', () => {
			const { controller, dataServiceMock } = setup();
			controller.loadEstudiantes();
			expect(dataServiceMock.processAsistencias).toHaveBeenCalled();
			expect(controller.ingresos().title).toBe('Ingresos');
			expect(controller.salidas().title).toBe('Salidas');
			expect(controller.tableReady()).toBe(true);
		});
	});
	// #endregion

	// #region selectEstudiante
	describe('selectEstudiante', () => {
		it('guarda en storage y recarga asistencias', () => {
			const { controller, config, dataServiceMock } = setup();
			controller.loadEstudiantes();
			(dataServiceMock.processAsistencias as any).mockClear();

			controller.selectEstudiante(2);

			expect(controller.selectedEstudianteId()).toBe(2);
			expect(config.setStoredEstudianteId).toHaveBeenCalledWith(2);
			expect(dataServiceMock.processAsistencias).toHaveBeenCalled();
		});

		it('no hace nada si el id es el mismo ya seleccionado', () => {
			const { controller, config } = setup();
			controller.loadEstudiantes();
			(config.setStoredEstudianteId as any).mockClear();

			controller.selectEstudiante(1);
			expect(config.setStoredEstudianteId).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region onIngresosMonthChange / onSalidasMonthChange
	describe('cambio de mes', () => {
		it('onIngresosMonthChange actualiza mes y llama onMonthChange + syncSelectedYear', () => {
			const { controller, config, statsMock } = setup();
			controller.loadEstudiantes();

			controller.onIngresosMonthChange(8);

			expect(controller.ingresos().selectedMonth).toBe(8);
			expect(config.onMonthChange).toHaveBeenCalled();
			expect(statsMock.setSelectedYear).toHaveBeenCalled();
		});

		it('onSalidasMonthChange actualiza mes de salidas sin tocar ingresos', () => {
			const { controller, config } = setup();
			controller.loadEstudiantes();
			const prevIngresos = controller.ingresos().selectedMonth;

			controller.onSalidasMonthChange(7);

			expect(controller.salidas().selectedMonth).toBe(7);
			expect(controller.ingresos().selectedMonth).toBe(prevIngresos);
			expect(config.onMonthChange).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region reload
	describe('reload', () => {
		it('en modo Día llama loadDia', () => {
			const { controller, config } = setup();
			(config.loadDia as any).mockClear();
			controller.reload();
			expect(config.loadDia).toHaveBeenCalled();
		});

		it('en modo Mes llama loadEstudiantes', () => {
			const { controller, config } = setup();
			controller.setViewMode(VIEW_MODE.Mes);
			(config.loadEstudiantes as any).mockClear();
			controller.reload();
			expect(config.loadEstudiantes).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region onFechaDiaChange
	describe('onFechaDiaChange', () => {
		it('actualiza fechaDia y recarga asistencia del día', () => {
			const { controller, config } = setup();
			(config.loadDia as any).mockClear();
			const fecha = new Date(2026, 3, 10);

			controller.onFechaDiaChange(fecha);

			expect(controller.fechaDia()).toEqual(fecha);
			expect(config.loadDia).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region pdfFecha computed
	describe('pdfFecha', () => {
		it('en modo Día devuelve fechaDia', () => {
			const { controller } = setup();
			const fecha = new Date(2026, 3, 15);
			controller.onFechaDiaChange(fecha);
			expect(controller.pdfFecha()).toEqual(fecha);
		});

		it('en modo Mes devuelve primer día del mes/año seleccionado', () => {
			const { controller } = setup();
			controller.setViewMode(VIEW_MODE.Mes);
			controller.onIngresosMonthChange(6);
			const result = controller.pdfFecha();
			expect(result.getMonth()).toBe(5); // 0-indexed
			expect(result.getDate()).toBe(1);
		});
	});
	// #endregion
});
// #endregion
