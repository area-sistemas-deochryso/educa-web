// * Plan xrepo-116 F2 — API (params del rango bimestre, endpoints de configuración) y facade (selección,
// * validación, nombre de archivo).
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { downloadBlob } from '@core/helpers';
import { UserProfileService } from '@core/services';
import { DirectorAttendanceApiService, TeacherAttendanceApiService } from '@intranet-shared/services';

import { AttendanceReportsApiService } from './attendance-reports-api.service';
import { AttendanceReportsFacade } from './attendance-reports.facade';
import { AttendanceReportsStore } from './attendance-reports.store';
import { getDefaultFilters, type BimestreAsistencia, type ReporteFiltrado } from '../models';

vi.mock('@core/helpers', async (importOriginal) => ({
	...(await importOriginal<typeof import('@core/helpers')>()),
	downloadBlob: vi.fn(),
}));

const III: BimestreAsistencia = {
	id: 3, anio: 2026, numero: 3, nombre: 'III Bimestre',
	fechaInicio: '2026-08-10T00:00:00', fechaFin: '2026-10-16T00:00:00', rowVersion: 'AQ==',
};
const IV: BimestreAsistencia = {
	id: 4, anio: 2026, numero: 4, nombre: 'IV Bimestre',
	fechaInicio: '2026-10-19T00:00:00', fechaFin: '2026-12-17T00:00:00', rowVersion: 'AQ==',
};

describe('AttendanceReportsApiService — rango bimestre', () => {
	let api: AttendanceReportsApiService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		api = TestBed.inject(AttendanceReportsApiService);
		http = TestBed.inject(HttpTestingController);
	});

	it('envía bimestreId solo con rango bimestre', () => {
		api.getReporte({ ...getDefaultFilters(), rango: 'bimestre', bimestreId: 4, salonesSeleccionados: ['1ro A'] }).subscribe();

		const req = http.expectOne((r) => r.url.endsWith('/api/ReportesAsistencia/datos'));
		expect(req.request.params.get('rango')).toBe('bimestre');
		expect(req.request.params.get('bimestreId')).toBe('4');
		req.flush({});
	});

	it('no manda bimestreId con otro rango aunque haya uno seleccionado', () => {
		api.getReporte({ ...getDefaultFilters(), rango: 'mes', bimestreId: 4, salonesSeleccionados: ['1ro A'] }).subscribe();

		const req = http.expectOne((r) => r.url.endsWith('/api/ReportesAsistencia/datos'));
		expect(req.request.params.has('bimestreId')).toBe(false);
		req.flush({});
	});

	it('getBimestres consulta por año y actualizarBimestre hace PUT con rowVersion', () => {
		api.getBimestres(2026).subscribe();
		const get = http.expectOne((r) => r.url.endsWith('/api/BimestresAsistencia'));
		expect(get.request.params.get('anio')).toBe('2026');
		get.flush([]);

		const payload = { fechaInicio: '2026-08-10', fechaFin: '2026-10-15', rowVersion: 'AQ==' };
		api.actualizarBimestre(3, payload).subscribe();
		const put = http.expectOne((r) => r.url.endsWith('/api/BimestresAsistencia/3'));
		expect(put.request.method).toBe('PUT');
		expect(put.request.body).toEqual(payload);
		put.flush({});
	});
});

describe('AttendanceReportsFacade — rango bimestre', () => {
	let facade: AttendanceReportsFacade;
	let store: AttendanceReportsStore;
	let api: {
		getReporte: ReturnType<typeof vi.fn>;
		getBimestres: ReturnType<typeof vi.fn>;
		actualizarBimestre: ReturnType<typeof vi.fn>;
		descargarPdf: ReturnType<typeof vi.fn>;
		descargarExcel: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		api = {
			getReporte: vi.fn().mockReturnValue(of({})),
			getBimestres: vi.fn().mockReturnValue(of([III, IV])),
			actualizarBimestre: vi.fn(),
			descargarPdf: vi.fn(),
			descargarExcel: vi.fn(),
		};
		TestBed.configureTestingModule({
			providers: [
				AttendanceReportsFacade,
				AttendanceReportsStore,
				{ provide: AttendanceReportsApiService, useValue: api },
				{ provide: DirectorAttendanceApiService, useValue: { getSalonesDirector: vi.fn().mockReturnValue(of([])) } },
				{ provide: TeacherAttendanceApiService, useValue: {} },
				{ provide: UserProfileService, useValue: { userRole: () => 'Director' as const } },
			],
		});
		facade = TestBed.inject(AttendanceReportsFacade);
		store = TestBed.inject(AttendanceReportsStore);
	});

	it('loadBimestres pide el año actual, guarda la lista y preselecciona el vigente', () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 9, 21));
		try {
			facade.loadBimestres();
		} finally {
			vi.useRealTimers();
		}

		expect(api.getBimestres).toHaveBeenCalledWith(2026);
		expect(store.bimestres()).toEqual([III, IV]);
		expect(store.filters().bimestreId).toBe(4);
	});

	it('loadBimestres respeta una selección previa que sigue existiendo', () => {
		store.updateFilters({ bimestreId: 3 });

		facade.loadBimestres();

		expect(store.filters().bimestreId).toBe(3);
	});

	it('generarReporte con rango bimestre sin bimestre elegido no llama al BE', () => {
		store.updateFilters({ rango: 'bimestre', bimestreId: null, salonesSeleccionados: ['1ro A'] });

		facade.generarReporte();

		expect(store.error()).toBe('Debe seleccionar un bimestre.');
		expect(api.getReporte).not.toHaveBeenCalled();
	});

	it('generarReporte con bimestre elegido llama al BE con bimestreId', () => {
		store.updateFilters({ rango: 'bimestre', bimestreId: 3, salonesSeleccionados: ['1ro A'] });

		facade.generarReporte();

		expect((api.getReporte.mock.calls[0][0] as { bimestreId: number }).bimestreId).toBe(3);
	});

	it('actualizarBimestre reemplaza la fila guardada en el store', () => {
		store.setBimestres([III, IV]);
		const editado = { ...III, fechaFin: '2026-10-15T00:00:00', rowVersion: 'Ag==' };
		api.actualizarBimestre.mockReturnValue(of(editado));

		facade.actualizarBimestre(3, { fechaInicio: '2026-08-10', fechaFin: '2026-10-15', rowVersion: 'AQ==' }).subscribe();

		expect(store.bimestres()).toEqual([editado, IV]);
	});

	it('el archivo exportado de un bimestre lleva nombre y rango reales', () => {
		const resultado = {
			filtroEstado: 'todos', rangoTipo: 'bimestre', tipoPersona: 'E',
			nombreBimestre: 'III Bimestre', fechaInicio: '2026-08-10T00:00:00', fechaFin: '2026-10-16T00:00:00',
			salones: [], totalFiltrados: 0,
		} as unknown as ReporteFiltrado;
		store.setResultado(resultado);
		store.updateFilters({ rango: 'bimestre', bimestreId: 3 });
		api.descargarExcel.mockReturnValue(of(new Blob(['x'])));

		facade.exportarExcel();

		expect(vi.mocked(downloadBlob).mock.calls[0][1]).toBe(
			'Reporte_Asistencia_Todos_Bimestre_III_Bimestre_2026-08-10_2026-10-16_Estudiantes.xlsx',
		);
	});
});
