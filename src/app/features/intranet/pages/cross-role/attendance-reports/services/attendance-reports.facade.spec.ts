// * Tests for AttendanceReportsFacade — valida paso de tipoPersona al api-service
// * y que la validación de salones se skipee cuando tipo = 'P'. Plan 23 Chat 3.B.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { UserProfileService } from '@core/services';
import {
	DirectorAttendanceApiService,
	TeacherAttendanceApiService,
} from '@shared/services/attendance';

import { AttendanceReportsApiService } from './attendance-reports-api.service';
import { AttendanceReportsFacade } from './attendance-reports.facade';
import { AttendanceReportsStore } from './attendance-reports.store';
import type { ReporteFiltrado, TipoPersonaReporte } from '../models';
// #endregion

// #region Mocks
function createMockApi() {
	return {
		getReporte: vi.fn<(filters: unknown) => ReturnType<typeof of>>(),
		descargarPdf: vi.fn(),
		descargarExcel: vi.fn(),
	};
}

function createDirectorApi() {
	return { getSalonesDirector: vi.fn().mockReturnValue(of([])) };
}

function createProfesorApi() {
	return {
		getSalonesProfesor: vi.fn().mockReturnValue(of([])),
		getSalonesProfesorPorHorario: vi.fn().mockReturnValue(of([])),
	};
}

function createUserProfile() {
	return { userRole: () => 'Director' as const };
}

const mockReporte: ReporteFiltrado = {
	nombreSede: 'Sede 1',
	filtroEstado: 'todos',
	filtroEstadoDescripcion: 'Todos',
	rangoTipo: 'dia',
	fechaInicio: '2026-04-20',
	fechaFin: '2026-04-20',
	totalSalones: 0,
	totalEstudiantesGeneral: 0,
	totalFiltrados: 0,
	salones: [],
	estadisticas: { total: 0, tardanza: 0, asistio: 0, falta: 0, justificado: 0, pendiente: 0 },
	tipoPersona: 'E',
};
// #endregion

describe('AttendanceReportsFacade — eje tipoPersona', () => {
	let facade: AttendanceReportsFacade;
	let store: AttendanceReportsStore;
	let api: ReturnType<typeof createMockApi>;

	beforeEach(() => {
		api = createMockApi();
		api.getReporte.mockReturnValue(of(mockReporte));

		TestBed.configureTestingModule({
			providers: [
				AttendanceReportsFacade,
				AttendanceReportsStore,
				{ provide: AttendanceReportsApiService, useValue: api },
				{ provide: DirectorAttendanceApiService, useValue: createDirectorApi() },
				{ provide: TeacherAttendanceApiService, useValue: createProfesorApi() },
				{ provide: UserProfileService, useValue: createUserProfile() },
			],
		});
		facade = TestBed.inject(AttendanceReportsFacade);
		store = TestBed.inject(AttendanceReportsStore);
	});

	describe('generarReporte — pasa tipoPersona al api-service', () => {
		it.each<TipoPersonaReporte>(['E', 'P', 'todos'])(
			'pasa tipoPersona = "%s" al service',
			(tipo) => {
				store.updateFilters({
					tipoPersona: tipo,
					salonesSeleccionados: tipo === 'P' ? [] : ['1ro A'],
				});

				facade.generarReporte();

				expect(api.getReporte).toHaveBeenCalledOnce();
				const filtersArg = api.getReporte.mock.calls[0][0] as { tipoPersona: TipoPersonaReporte };
				expect(filtersArg.tipoPersona).toBe(tipo);
			},
		);
	});

	describe('validación de salones según tipoPersona', () => {
		it('skippea validación de salones cuando tipoPersona = "P" (permite reporte sin salones)', () => {
			store.updateFilters({ tipoPersona: 'P', salonesSeleccionados: [] });

			facade.generarReporte();

			expect(store.error()).toBeNull();
			expect(api.getReporte).toHaveBeenCalledOnce();
		});

		it('exige al menos un salón cuando tipoPersona = "E"', () => {
			store.updateFilters({ tipoPersona: 'E', salonesSeleccionados: [] });

			facade.generarReporte();

			expect(store.error()).toBe('Debe seleccionar al menos un salón.');
			expect(api.getReporte).not.toHaveBeenCalled();
		});

		it('exige al menos un salón cuando tipoPersona = "todos"', () => {
			store.updateFilters({ tipoPersona: 'todos', salonesSeleccionados: [] });

			facade.generarReporte();

			expect(store.error()).toBe('Debe seleccionar al menos un salón.');
			expect(api.getReporte).not.toHaveBeenCalled();
		});
	});
});
